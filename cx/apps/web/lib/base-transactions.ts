import {
  createGOTProtocolClient,
  encodeDeployAndExecuteIntent,
  encodeResolveIntent,
  encodeSettleIntent,
  GOT_BASE_FACTORY,
  type IntentConfig,
} from "@got-cx/sdk"
import { getAddress, type Address, type Hash } from "viem"

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

export async function deployAndResolveIntent(
  intentAddress: Address,
  config: IntentConfig
): Promise<Hash> {
  const { provider, account: executor } = await getConnectedAccount(
    "Authenticate with the requesting Base Account."
  )
  const protocol = createGOTProtocolClient(
    appConfig.baseRpcUrl,
    appConfig.baseRpcFallback
  )
  const [snapshot] = await protocol.readIntentSnapshots([
    { intentAddress, config },
  ])
  if (!snapshot) throw new Error("The live intent snapshot is missing.")
  const restrictedResolver = getAddress(config.authorizedResolver)
  if (
    executor !== snapshot.effectiveOwner &&
    restrictedResolver !==
      getAddress("0x0000000000000000000000000000000000000000") &&
    executor !== restrictedResolver
  ) {
    throw new Error(
      "Only the current owner or authorized resolver can settle it."
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

export async function resolveIntent(
  intentAddress: Address,
  config: IntentConfig
): Promise<Hash> {
  const { provider, account: executor } = await getConnectedAccount(
    "Authenticate with the requesting Base Account."
  )
  const protocol = createGOTProtocolClient(
    appConfig.baseRpcUrl,
    appConfig.baseRpcFallback
  )
  const [state] = await protocol.readIntentSnapshots([
    { intentAddress, config },
  ])
  if (!state) throw new Error("The live intent snapshot is missing.")
  if (!state.deployed || !state.authorizedResolver) {
    throw new Error("This GOT intent has not been deployed yet.")
  }
  if (
    executor !== state.effectiveOwner &&
    state.authorizedResolver !==
      getAddress("0x0000000000000000000000000000000000000000") &&
    executor !== state.authorizedResolver
  ) {
    throw new Error(
      "Only the account authorized by this request can resolve it."
    )
  }
  const ownerIsExecutor = executor === state.effectiveOwner
  if (ownerIsExecutor) {
    await protocol.simulateSettle(intentAddress, executor)
  } else {
    await protocol.simulateResolve(intentAddress, executor)
  }
  const hash = await provider.request({
    method: "eth_sendTransaction",
    params: [
      {
        from: executor,
        to: intentAddress,
        data: ownerIsExecutor ? encodeSettleIntent() : encodeResolveIntent(),
      },
    ],
  })
  return requireTransactionHash(hash)
}
