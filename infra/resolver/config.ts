import "dotenv/config";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function nonNegativeBigInt(
  name: string,
  fallback?: bigint,
): bigint | undefined {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (!/^\d+$/.test(value))
    throw new Error(`${name} must be a non-negative integer.`);
  return BigInt(value);
}

function positiveInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`${name} must be positive.`);
  return value;
}

export function loadConfig(dryRun: boolean) {
  const privateKey = process.env.GOT_RESOLVER_PRIVATE_KEY?.trim() as
    Hex | undefined;
  const configuredAddress = process.env.GOT_RESOLVER_ADDRESS?.trim();
  const account = privateKey ? privateKeyToAccount(privateKey) : undefined;
  if (!dryRun && !account)
    throw new Error("GOT_RESOLVER_PRIVATE_KEY is required outside dry-run.");
  if (configuredAddress && !isAddress(configuredAddress, { strict: false })) {
    throw new Error("GOT_RESOLVER_ADDRESS must be a valid address.");
  }
  const resolverAddress =
    account?.address ??
    (configuredAddress ? getAddress(configuredAddress) : undefined);
  if (!resolverAddress)
    throw new Error("GOT_RESOLVER_ADDRESS is required for keyless dry-run.");
  if (
    account &&
    configuredAddress &&
    account.address !== getAddress(configuredAddress)
  ) {
    throw new Error(
      "GOT_RESOLVER_ADDRESS does not match the configured private key.",
    );
  }
  return {
    dryRun,
    chainId: 8453,
    supabaseUrl: required("SUPABASE_URL"),
    supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
    rpcUrl: required("BASE_RPC_URL"),
    rpcFallback: process.env.BASE_RPC_FALLBACK?.trim() || undefined,
    privateKey,
    resolverAddress: resolverAddress as Address,
    minBalance: nonNegativeBigInt("RESOLVER_MIN_BALANCE_BASE_UNITS", 100_000n)!,
    maxTransactions: positiveInteger("RESOLVER_MAX_TXS_PER_RUN", 25),
    maxGasCost: nonNegativeBigInt("RESOLVER_MAX_GAS_COST_WEI"),
    confirmations: positiveInteger("RESOLVER_CONFIRMATIONS", 2),
    lensBatchSize: positiveInteger("RESOLVER_LENS_BATCH_SIZE", 50),
    candidatePageSize: positiveInteger("RESOLVER_CANDIDATE_PAGE_SIZE", 500),
  };
}

export type ResolverConfig = ReturnType<typeof loadConfig>;
