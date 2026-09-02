import type { IntentConfig } from "@got-cx/protocol/intent";
import type { SerializedIntentConfig } from "../types.js";

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isSafeInteger(size) || size <= 0)
    throw new Error("Chunk size must be positive.");
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

export function deserializeIntentConfig(
  config: SerializedIntentConfig,
): IntentConfig {
  return {
    ...config,
    amount: BigInt(config.amount),
    initialDeadline: BigInt(config.initialDeadline),
  };
}
