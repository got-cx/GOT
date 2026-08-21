import {
  createGOTProtocolClient,
  encodeDeployAndExecuteIntent,
  encodeResolveIntent,
  GOT_BASE_FACTORY,
  type IntentConfig,
} from "@got-cx/sdk"
import { GOT_BASE_USDC } from "@got-cx/sdk/protocol"
import {
  encodeFunctionData,
  getAddress,
  parseAbi,
  type Address,
  type Hash,
} from "viem"

import { appConfig } from "@/lib/app-config"
import { getBaseAccount } from "@/lib/base-account"

async function getConnectedAccount(errorMessage: string) {
  const provider = (await getBaseAccount()).getProvider()
  const accounts = await provider.request({ method: "eth_requestAccounts" })
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error(errorMessage)
  }
  return { provider, account: getAddress(accounts[0]) }
}

function requireTransactionHash(value: unknown): Hash {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error("Base Account did not return a transaction hash.")
  }
  return value as Hash
}

export async function transferUSDC(
  to: Address,
  amount: string,
  expectedAccount?: Address | null
): Promise<Hash> {
  const { provider, account } = await getConnectedAccount(
    "Authenticate with your Base Account to continue."
  )
  if (expectedAccount && account !== expectedAccount) {
    throw new Error("Use the Base Account that is signed in to got.cx.")
  }
  const data = encodeFunctionData({
    abi: parseAbi([
      "function transfer(address to, uint256 amount) returns (bool)",
    ]),
    functionName: "transfer",
    args: [to, BigInt(amount)],
  })
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [{ from: account, to: GOT_BASE_USDC, data }],
  })
  return requireTransactionHash(hash)
}

export async function deployAndResolveIntent(
  intentAddress: Address,
  config: IntentConfig
): Promise<Hash> {
  const { provider, account: executor } = await getConnectedAccount(
    "Authenticate with the requesting Base Account."
  )
  const directOwner = /^0x0{64}$/i.test(config.ownerKey)
    ? getAddress(config.ownerSource)
    : null
  const restrictedResolver = getAddress(config.authorizedResolver)
  if (executor !== directOwner && executor !== restrictedResolver) {
    throw new Error(
      "Only the account that created or currently owns this request can settle it."
    )
  }

  const protocol = createGOTProtocolClient(appConfig.baseRpcUrl)
  const preview = await protocol.previewIntent(config)
  if (preview.toLowerCase() !== intentAddress.toLowerCase()) {
    throw new Error(
      "The recovery configuration does not match this intent address."
    )
  }
  await protocol.simulateDeployAndExecute(config, executor)
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: executor,
        to: GOT_BASE_FACTORY,
        data: encodeDeployAndExecuteIntent(config),
      },
    ],
  })
  return requireTransactionHash(hash)
}

export async function resolveIntent(intentAddress: Address): Promise<Hash> {
  const { provider, account: executor } = await getConnectedAccount(
    "Authenticate with the requesting Base Account."
  )
  const protocol = createGOTProtocolClient(appConfig.baseRpcUrl)
  const state = await protocol.readIntentState(intentAddress)
  if (!state.deployed || !state.authorizedResolver) {
    throw new Error("This GOT intent has not been deployed yet.")
  }
  if (executor !== state.authorizedResolver) {
    throw new Error(
      "Only the account authorized by this request can resolve it."
    )
  }
  await protocol.simulateResolve(intentAddress, executor)
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: executor,
        to: intentAddress,
        data: encodeResolveIntent(),
      },
    ],
  })
  return requireTransactionHash(hash)
}
