import "dotenv/config";
import { DEFAULT_MAX_BLOCK_RANGE } from "./lib/utils.js";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function positiveBigInt(name: string, fallback?: bigint): bigint | undefined {
  const value = process.env[name]?.trim();
  if (!value) return fallback;
  if (!/^\d+$/.test(value) || BigInt(value) <= 0n)
    throw new Error(`${name} must be positive.`);
  return BigInt(value);
}

export function loadConfig(dryRun: boolean) {
  const maxBlockRange = positiveBigInt(
    "INDEXER_MAX_BLOCKS_PER_RUN",
    DEFAULT_MAX_BLOCK_RANGE,
  )!;
  if (maxBlockRange > DEFAULT_MAX_BLOCK_RANGE) {
    throw new Error("INDEXER_MAX_BLOCKS_PER_RUN cannot exceed 2000.");
  }
  return {
    dryRun,
    chainId: 8453,
    supabaseUrl: required("SUPABASE_URL"),
    supabaseSecretKey: required("SUPABASE_SECRET_KEY"),
    rpcUrl: required("BASE_RPC_URL"),
    rpcFallback: process.env.BASE_RPC_FALLBACK?.trim() || undefined,
    initialBlock: positiveBigInt("INDEXER_START_BLOCK"),
    maxBlockRange,
  };
}

export type IndexerConfig = ReturnType<typeof loadConfig>;
