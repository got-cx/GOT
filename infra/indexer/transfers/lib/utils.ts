export const ADDRESS_QUERY_BATCH_SIZE = 250;
export const DEFAULT_MAX_BLOCK_RANGE = 2_000n;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (!Number.isSafeInteger(size) || size <= 0)
    throw new Error("Chunk size must be positive.");
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function calculateBlockRange(input: {
  cursor: bigint | null;
  safeHead: bigint;
  initialBlock?: bigint;
  maxBlockRange: bigint;
}): { fromBlock: bigint; toBlock: bigint } | null {
  const fromBlock =
    input.cursor === null
      ? (input.initialBlock ?? input.safeHead)
      : input.cursor + 1n;
  if (fromBlock > input.safeHead) return null;
  const boundedEnd = fromBlock + input.maxBlockRange - 1n;
  return {
    fromBlock,
    toBlock: boundedEnd < input.safeHead ? boundedEnd : input.safeHead,
  };
}
