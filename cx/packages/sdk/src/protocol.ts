import {
  GOTFactoryAbi,
  GOTIntentAbi,
  GOTLensAbi,
  baseDeployment,
} from "@got-cx/protocol"
import {
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  fallback,
  getAddress,
  http,
  keccak256,
  parseAbi,
  stringToHex,
  zeroAddress,
  type Address,
  type Hash,
  type Hex,
} from "viem"
import { base } from "viem/chains"

import {
  type ChainId,
  type IntentConfig,
  type SerializedIntentConfig,
} from "./types"

export const GOT_BASE_CHAIN_ID: ChainId = 8453
export const GOT_BASE_USDC = getAddress(baseDeployment.dependencies.usdc)
export const GOT_BASE_FACTORY = getAddress(baseDeployment.contracts.gotFactory)
export const GOT_BASE_NAME = getAddress(baseDeployment.contracts.gotName)
export const GOT_BASE_LENS = getAddress(baseDeployment.contracts.gotLens)

export type GOTIntentChainState = {
  deployed: boolean
  balance: bigint
  totalProcessed: bigint
  authorizedResolver: Address | null
  effectiveOwner: Address | null
}

export type GOTIntentSnapshot = GOTIntentChainState & {
  intentAddress: Address
  config: IntentConfig
}

export type GOTUSDCTransferReceipt = {
  transactionHash: Hash
  sender: Address
  intentAddress: Address
  amount: bigint
  confirmedAt: string
}

const intentIdNamespace = keccak256(stringToHex("GOT_APPLICATION_INTENT_V2"))

type LensSnapshotResult = {
  intentAddress: Address
  configValid: boolean
  deployed: boolean
  canonical: boolean
  balanceRead: boolean
  balance: bigint
  stateRead: boolean
  totalProcessed: bigint
  ownerResolved: boolean
  effectiveOwner: Address
}

const usdcTransferAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 value)",
])

export function deriveIntentId(id: string, account: Address): Hex {
  const normalizedId = id.trim()
  if (!normalizedId) throw new Error("ID is required.")
  if (normalizedId.length > 120)
    throw new Error("ID must be 120 characters or fewer.")

  return keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "address" }, { type: "string" }],
      [intentIdNamespace, getAddress(account), normalizedId]
    )
  )
}

export function remainingTransferAmount(
  target: bigint,
  processed: bigint,
  pendingBalance: bigint
): bigint {
  if (target < 0n || processed < 0n || pendingBalance < 0n) {
    throw new Error("Transfer amounts cannot be negative.")
  }
  // Open-amount Intents have no fixed remainder and stay reusable.
  if (target === 0n) return 0n
  const committed = processed + pendingBalance
  return committed >= target ? 0n : target - committed
}

export function serializeIntentConfig(
  config: IntentConfig
): SerializedIntentConfig {
  return {
    ...config,
    amount: config.amount.toString(),
    initialDeadline: config.initialDeadline.toString(),
  }
}

export function deserializeIntentConfig(
  config: SerializedIntentConfig
): IntentConfig {
  return {
    ...config,
    amount: BigInt(config.amount),
    initialDeadline: BigInt(config.initialDeadline),
  }
}

export function encodeDeployAndExecuteIntent(config: IntentConfig): Hex {
  return encodeFunctionData({
    abi: GOTFactoryAbi,
    functionName: "deployAndExecute",
    args: [config],
  })
}

export function encodeResolveIntent(): Hex {
  return encodeFunctionData({
    abi: GOTIntentAbi,
    functionName: "resolve",
  })
}

export function encodeSettleIntent(): Hex {
  return encodeFunctionData({
    abi: GOTIntentAbi,
    functionName: "settle",
  })
}

export function createGOTProtocolClient(
  rpcUrl?: string,
  fallbackRpcUrl?: string
) {
  const primaryTransport = http(rpcUrl)
  const transport =
    fallbackRpcUrl && fallbackRpcUrl !== rpcUrl
      ? fallback([primaryTransport, http(fallbackRpcUrl)])
      : primaryTransport
  const client = createPublicClient({
    chain: base,
    transport,
  })

  return {
    chain: base,
    deployment: {
      factory: GOT_BASE_FACTORY,
      lens: GOT_BASE_LENS,
      gotName: GOT_BASE_NAME,
      usdc: GOT_BASE_USDC,
    },
    previewIntent(config: IntentConfig) {
      return client.readContract({
        address: GOT_BASE_FACTORY,
        abi: GOTFactoryAbi,
        functionName: "previewAddress",
        args: [config],
      })
    },
    simulateDeployAndExecute(config: IntentConfig, account: Address) {
      return client.simulateContract({
        account,
        address: GOT_BASE_FACTORY,
        abi: GOTFactoryAbi,
        functionName: "deployAndExecute",
        args: [config],
      })
    },
    async readIntentSnapshots(
      inputs: ReadonlyArray<{
        intentAddress: Address
        config: IntentConfig
      }>,
      options: { blockNumber?: bigint } = {}
    ): Promise<GOTIntentSnapshot[]> {
      if (!inputs.length) return []

      let results: readonly LensSnapshotResult[]
      try {
        results = (await client.readContract({
          address: GOT_BASE_LENS,
          abi: GOTLensAbi,
          functionName: "snapshotMany",
          args: [inputs.map(({ config }) => config)],
          blockNumber: options.blockNumber,
        })) as readonly LensSnapshotResult[]
      } catch (error) {
        throw new Error("Unable to read GOT intent snapshots.", {
          cause: error,
        })
      }
      if (results.length !== inputs.length) {
        throw new Error("The GOT Lens returned an incomplete snapshot batch.")
      }

      return inputs.map(({ intentAddress, config }, index) => {
        const snapshot = results[index]
        if (!snapshot || !snapshot.configValid) {
          throw new Error("Unable to verify the canonical intent address.")
        }
        if (getAddress(snapshot.intentAddress) !== getAddress(intentAddress)) {
          throw new Error(
            "The recovery configuration does not match the intent address."
          )
        }
        if (!snapshot.balanceRead) {
          throw new Error("Unable to read the intent token balance.")
        }
        if (snapshot.deployed && !snapshot.canonical) {
          throw new Error(
            "The deployed contract is not a canonical GOT intent."
          )
        }
        if (snapshot.deployed && !snapshot.stateRead) {
          throw new Error("Unable to read the deployed intent state.")
        }

        return {
          intentAddress: getAddress(intentAddress),
          config,
          deployed: snapshot.deployed,
          balance: snapshot.balance,
          totalProcessed: snapshot.deployed ? snapshot.totalProcessed : 0n,
          authorizedResolver: getAddress(config.authorizedResolver),
          effectiveOwner:
            snapshot.ownerResolved &&
            getAddress(snapshot.effectiveOwner) !== zeroAddress
              ? getAddress(snapshot.effectiveOwner)
              : null,
        }
      })
    },
    simulateResolve(intentAddress: Address, account: Address) {
      return client.simulateContract({
        account,
        address: intentAddress,
        abi: GOTIntentAbi,
        functionName: "resolve",
      })
    },
    simulateSettle(intentAddress: Address, account: Address) {
      return client.simulateContract({
        account,
        address: intentAddress,
        abi: GOTIntentAbi,
        functionName: "settle",
      })
    },
    async readUSDCTransferReceipt(hash: Hash): Promise<GOTUSDCTransferReceipt> {
      const receipt = await client
        .getTransactionReceipt({ hash })
        .catch((error: unknown) => {
          throw new Error("Unable to load the confirmed Base transaction.", {
            cause: error,
          })
        })
      if (receipt.status !== "success") {
        throw new Error("The Base transaction was not successful.")
      }
      const transfers = receipt.logs.flatMap((log) => {
        if (getAddress(log.address) !== GOT_BASE_USDC) return []
        try {
          const event = decodeEventLog({
            abi: usdcTransferAbi,
            data: log.data,
            topics: log.topics,
          })
          return [
            {
              sender: getAddress(event.args.from),
              intentAddress: getAddress(event.args.to),
              amount: event.args.value,
            },
          ]
        } catch {
          return []
        }
      })
      if (transfers.length === 0) {
        throw new Error("The confirmed USDC Transfer event is missing.")
      }
      if (transfers.length > 1) {
        throw new Error(
          "The transaction contains multiple USDC transfers and is not a unique receipt."
        )
      }
      const transfer = transfers[0]!

      let block
      try {
        block = await client.getBlock({ blockHash: receipt.blockHash })
      } catch (error) {
        throw new Error("Unable to load the confirmation block.", {
          cause: error,
        })
      }
      return {
        transactionHash: hash,
        ...transfer,
        confirmedAt: new Date(Number(block.timestamp) * 1_000).toISOString(),
      }
    },
    waitForTransaction(hash: Hex, options: { confirmations?: number } = {}) {
      return client.waitForTransactionReceipt({
        hash,
        confirmations: options.confirmations,
      })
    },
  }
}
