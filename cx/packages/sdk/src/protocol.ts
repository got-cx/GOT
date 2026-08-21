import { GOTFactoryAbi, GOTIntentAbi, baseDeployment } from "@got-cx/protocol"
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  http,
  keccak256,
  parseUnits,
  stringToHex,
  zeroAddress,
  zeroHash,
  type Address,
  type Hex,
} from "viem"
import { base } from "viem/chains"

import { parseGOTLink } from "./links"
import {
  TransferStatus,
  type ChainId,
  type IntentConfig,
  type SerializedIntentConfig,
} from "./types"

export const GOT_BASE_CHAIN_ID: ChainId = 8453
export const GOT_BASE_USDC = getAddress(baseDeployment.dependencies.usdc)
export const GOT_BASE_FACTORY = getAddress(baseDeployment.contracts.gotFactory)
export const GOT_BASE_NAME = getAddress(baseDeployment.contracts.gotName)

const erc20BalanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
] as const

export type GOTIntentChainState = {
  deployed: boolean
  balance: bigint
  totalProcessed: bigint
  authorizedResolver: Address | null
}

export type BuildRequestIntentInput = {
  recipient?: string
  ownerAddress?: Address
  amount: string
  metadata?: string
  intentId?: Hex
  authorizedResolver?: Address
  dueAt?: string
}

function randomHex32(): Hex {
  const bytes = new Uint8Array(32)
  globalThis.crypto.getRandomValues(bytes)
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`
}

export function createIntentId(): Hex {
  return randomHex32()
}

const intentIdNamespace = keccak256(stringToHex("GOT_APPLICATION_INTENT_V2"))

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

export function createIdempotencyKey(): string {
  return globalThis.crypto.randomUUID()
}

export function remainingTransferAmount(
  target: bigint,
  processed: bigint,
  pendingBalance: bigint
): bigint {
  if (target < 0n || processed < 0n || pendingBalance < 0n) {
    throw new Error("Transfer amounts cannot be negative.")
  }
  const committed = processed + pendingBalance
  return committed >= target ? 0n : target - committed
}

export function transferStatusFromChain(
  target: bigint,
  processed: bigint,
  pendingBalance: bigint
): TransferStatus {
  if (target < 0n || processed < 0n || pendingBalance < 0n) {
    throw new Error("Transfer amounts cannot be negative.")
  }
  const funded = processed + pendingBalance
  if (funded > target) return TransferStatus.Overpaid
  if (processed >= target && target > 0n) return TransferStatus.Settled
  if (funded === target && pendingBalance > 0n)
    return TransferStatus.FundingDetected
  if (funded > 0n) return TransferStatus.Partial
  return TransferStatus.AddressReady
}

export function buildRequestIntent(
  input: BuildRequestIntentInput
): IntentConfig {
  if (Boolean(input.recipient) === Boolean(input.ownerAddress))
    throw new Error("Provide one recipient identity or owner address.")
  const recipient = input.recipient ? parseGOTLink(input.recipient) : null
  if (recipient?.kind === "intent")
    throw new Error(
      "A request recipient must be a verified GOT identity, not an intent address."
    )

  return {
    intentId: input.intentId ?? randomHex32(),
    ownerSource: input.ownerAddress ?? GOT_BASE_NAME,
    ownerKey: recipient?.nameKey ?? zeroHash,
    token: GOT_BASE_USDC,
    partner: zeroAddress,
    authorizedResolver: input.authorizedResolver ?? zeroAddress,
    amount: parseUnits(input.amount, 6),
    initialDeadline: input.dueAt
      ? BigInt(Math.floor(new Date(input.dueAt).getTime() / 1000))
      : 0n,
    period: 0,
    feeBps: 0,
    metadataHash: input.metadata
      ? keccak256(stringToHex(input.metadata))
      : zeroHash,
  }
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

export function createGOTProtocolClient(rpcUrl?: string) {
  const client = createPublicClient({ chain: base, transport: http(rpcUrl) })

  return {
    chain: base,
    deployment: {
      factory: GOT_BASE_FACTORY,
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
    async readIntentState(
      intentAddress: Address,
      options: { blockNumber?: bigint } = {}
    ): Promise<GOTIntentChainState> {
      const [
        balanceResult,
        totalProcessedResult,
        authorizedResolverResult,
        factoryResult,
      ] = await client.multicall({
        allowFailure: true,
        blockNumber: options.blockNumber,
        contracts: [
          {
            address: GOT_BASE_USDC,
            abi: erc20BalanceAbi,
            functionName: "balanceOf",
            args: [intentAddress],
          },
          {
            address: intentAddress,
            abi: GOTIntentAbi,
            functionName: "totalProcessed",
          },
          {
            address: intentAddress,
            abi: GOTIntentAbi,
            functionName: "authorizedResolver",
          },
          {
            address: intentAddress,
            abi: GOTIntentAbi,
            functionName: "factory",
          },
        ],
      })
      if (balanceResult.status === "failure") {
        throw new Error("Unable to read the intent USDC balance.")
      }
      if (factoryResult.status === "failure") {
        return {
          deployed: false,
          balance: balanceResult.result,
          totalProcessed: 0n,
          authorizedResolver: null,
        }
      }
      if (getAddress(factoryResult.result) !== GOT_BASE_FACTORY) {
        throw new Error("The deployed contract is not a canonical GOT intent.")
      }
      if (
        totalProcessedResult.status === "failure" ||
        authorizedResolverResult.status === "failure"
      ) {
        throw new Error("Unable to read the deployed GOT intent state.")
      }
      return {
        deployed: true,
        balance: balanceResult.result,
        totalProcessed: totalProcessedResult.result,
        authorizedResolver: getAddress(authorizedResolverResult.result),
      }
    },
    simulateResolve(intentAddress: Address, account: Address) {
      return client.simulateContract({
        account,
        address: intentAddress,
        abi: GOTIntentAbi,
        functionName: "resolve",
      })
    },
    waitForTransaction(hash: Hex) {
      return client.waitForTransactionReceipt({ hash })
    },
  }
}
