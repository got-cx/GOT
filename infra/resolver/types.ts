import type { Address, Hash, Hex } from "viem";
import type { IntentConfig } from "@got-cx/protocol/intent";

export type SerializedIntentConfig = Omit<
  IntentConfig,
  "amount" | "initialDeadline"
> & {
  amount: string;
  initialDeadline: string;
};

export type ResolverCandidate = {
  id: string;
  intentAddress: Address;
  chainId: number;
  config: IntentConfig;
};

export type ResolverCandidatePage = {
  candidates: ResolverCandidate[];
  nextCursor: string | null;
};

export type IntentSnapshot = {
  intentAddress: Address;
  deployed: boolean;
  balance: bigint;
  effectiveOwner: Address | null;
};

export type Simulation = {
  kind: "deployAndExecute" | "resolve";
  gas: bigint;
  gasPrice: bigint;
};

export type ResolverDependencies = {
  resolverAddress: Address;
  dryRun: boolean;
  minBalance: bigint;
  maxTransactions: number;
  maxGasCost?: bigint;
  lensBatchSize: number;
  loadCandidates(cursor?: string): Promise<ResolverCandidatePage>;
  readSnapshots(candidates: ResolverCandidate[]): Promise<IntentSnapshot[]>;
  simulate(
    candidate: ResolverCandidate,
    snapshot: IntentSnapshot,
  ): Promise<Simulation>;
  send(candidate: ResolverCandidate, snapshot: IntentSnapshot): Promise<Hash>;
  waitForReceipt(hash: Hash): Promise<boolean>;
  log?(entry: Record<string, unknown>): void;
};

export type ResolverResult = {
  loaded: number;
  valid: number;
  discovered: number;
  simulated: number;
  sent: number;
  succeeded: number;
  skipped: number;
  dryRun: boolean;
};

export type ResolverTransaction = {
  to: Address;
  data: Hex;
};
