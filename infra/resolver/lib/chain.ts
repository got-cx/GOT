import {
  GOTFactoryAbi,
  GOTIntentAbi,
  GOTLensAbi,
  baseDeployment,
} from "@got-cx/protocol";
import {
  createPublicClient,
  createWalletClient,
  fallback,
  getAddress,
  http,
  zeroAddress,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import type { ResolverConfig } from "../config.js";
import type {
  IntentSnapshot,
  ResolverCandidate,
  Simulation,
} from "../types.js";

type LensResult = {
  intentAddress: Address;
  configValid: boolean;
  deployed: boolean;
  canonical: boolean;
  balanceRead: boolean;
  balance: bigint;
  stateRead: boolean;
  totalProcessed: bigint;
  ownerResolved: boolean;
  effectiveOwner: Address;
};

export function createChainAdapter(config: ResolverConfig) {
  const transport = config.rpcFallback
    ? fallback([http(config.rpcUrl), http(config.rpcFallback)])
    : http(config.rpcUrl);
  const client = createPublicClient({ chain: base, transport });
  const account = config.privateKey
    ? privateKeyToAccount(config.privateKey)
    : undefined;
  const wallet = account
    ? createWalletClient({ account, chain: base, transport })
    : undefined;
  const factory = getAddress(baseDeployment.contracts.gotFactory);
  const lens = getAddress(baseDeployment.contracts.gotLens);

  async function readSnapshots(
    candidates: ResolverCandidate[],
  ): Promise<IntentSnapshot[]> {
    if (!candidates.length) return [];
    const results = (await client.readContract({
      address: lens,
      abi: GOTLensAbi,
      functionName: "snapshotMany",
      args: [candidates.map((candidate) => candidate.config)],
    })) as readonly LensResult[];
    if (results.length !== candidates.length)
      throw new Error("GOTLens returned an incomplete batch.");
    return candidates.map((candidate, index) => {
      const result = results[index]!;
      if (
        !result.configValid ||
        getAddress(result.intentAddress) !== candidate.intentAddress
      ) {
        throw new Error(`GOTLens rejected candidate ${candidate.id}.`);
      }
      if (
        !result.balanceRead ||
        (result.deployed && (!result.canonical || !result.stateRead))
      ) {
        throw new Error(`GOTLens could not verify candidate ${candidate.id}.`);
      }
      return {
        intentAddress: candidate.intentAddress,
        deployed: result.deployed,
        balance: result.balance,
        effectiveOwner:
          result.ownerResolved &&
          getAddress(result.effectiveOwner) !== zeroAddress
            ? getAddress(result.effectiveOwner)
            : null,
      };
    });
  }

  async function simulate(
    candidate: ResolverCandidate,
    snapshot: IntentSnapshot,
  ): Promise<Simulation> {
    const gasPrice = await client.getGasPrice();
    if (snapshot.deployed) {
      await client.simulateContract({
        account: config.resolverAddress,
        address: candidate.intentAddress,
        abi: GOTIntentAbi,
        functionName: "resolve",
      });
      const gas = await client.estimateContractGas({
        account: config.resolverAddress,
        address: candidate.intentAddress,
        abi: GOTIntentAbi,
        functionName: "resolve",
      });
      return { kind: "resolve", gas, gasPrice };
    }
    await client.simulateContract({
      account: config.resolverAddress,
      address: factory,
      abi: GOTFactoryAbi,
      functionName: "deployAndExecute",
      args: [candidate.config],
    });
    const gas = await client.estimateContractGas({
      account: config.resolverAddress,
      address: factory,
      abi: GOTFactoryAbi,
      functionName: "deployAndExecute",
      args: [candidate.config],
    });
    return { kind: "deployAndExecute", gas, gasPrice };
  }

  async function send(candidate: ResolverCandidate, snapshot: IntentSnapshot) {
    if (!wallet) throw new Error("Resolver wallet is unavailable.");
    return snapshot.deployed
      ? wallet.writeContract({
          address: candidate.intentAddress,
          abi: GOTIntentAbi,
          functionName: "resolve",
        })
      : wallet.writeContract({
          address: factory,
          abi: GOTFactoryAbi,
          functionName: "deployAndExecute",
          args: [candidate.config],
        });
  }

  return {
    readSnapshots,
    simulate,
    send,
    async waitForReceipt(hash: `0x${string}`) {
      const receipt = await client.waitForTransactionReceipt({
        hash,
        confirmations: config.confirmations,
      });
      return receipt.status === "success";
    },
  };
}
