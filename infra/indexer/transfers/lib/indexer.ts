import type {
  IndexedBlock,
  IndexedTransferProcessedLog,
  IndexerDependencies,
  IndexerResult,
  TransferInsert,
} from "../types.js";
import { calculateBlockRange } from "./utils.js";

function validateLog(log: IndexedTransferProcessedLog): void {
  const allocated =
    log.ownerAmount + log.treasuryFee + log.partnerReward + log.executionReward;
  if (
    log.processedAmount <= 0n ||
    log.processedAmount !== allocated ||
    log.totalProcessed < log.processedAmount
  ) {
    throw new Error("Base returned an invalid TransferProcessed event.");
  }
}

export function createTransferIndexer(dependencies: IndexerDependencies) {
  async function indexRange(range: { fromBlock: bigint; toBlock: bigint }) {
    const logs = await dependencies.getTransferProcessedLogs(range);
    const candidates = [
      ...new Set(
        logs.map((log) => log.intentAddress.toLowerCase() as `0x${string}`),
      ),
    ];
    const managed = candidates.length
      ? await dependencies.getManagedAddresses(candidates)
      : [];
    const addressIds = new Map(
      managed.map((address) => [
        address.intentAddress.toLowerCase(),
        address.id,
      ]),
    );
    const accepted = logs.filter((log) =>
      addressIds.has(log.intentAddress.toLowerCase()),
    );
    accepted.forEach(validateLog);

    const blocks = new Map<bigint, IndexedBlock>();
    await Promise.all(
      [...new Set(accepted.map((log) => log.blockNumber))].map(
        async (blockNumber) =>
          blocks.set(blockNumber, await dependencies.getBlock(blockNumber)),
      ),
    );
    const rows = accepted.map((log): TransferInsert => {
      const addressId = addressIds.get(log.intentAddress.toLowerCase());
      const block = blocks.get(log.blockNumber);
      if (!addressId || !block)
        throw new Error("Unable to map the TransferProcessed event.");
      if (block.hash.toLowerCase() !== log.blockHash.toLowerCase()) {
        throw new Error("The safe block hash changed during indexing.");
      }
      return {
        addressId,
        chainId: dependencies.chainId,
        transactionHash: log.transactionHash.toLowerCase(),
        logIndex: log.logIndex,
        blockNumber: log.blockNumber.toString(),
        blockHash: block.hash.toLowerCase(),
        blockTimestamp: new Date(Number(block.timestamp) * 1_000).toISOString(),
        executor: log.executor.toLowerCase(),
        effectiveOwner: log.effectiveOwner.toLowerCase(),
        partner: log.partner.toLowerCase(),
        processedAmount: log.processedAmount.toString(),
        ownerAmount: log.ownerAmount.toString(),
        treasuryFee: log.treasuryFee.toString(),
        partnerReward: log.partnerReward.toString(),
        executionReward: log.executionReward.toString(),
        totalProcessed: log.totalProcessed.toString(),
      };
    });

    let persisted = 0;
    if (dependencies.dryRun) {
      dependencies.reportDryRun?.(rows, range.toBlock);
    } else {
      persisted = rows.length ? await dependencies.upsertTransfers(rows) : 0;
      await dependencies.advanceCursor(range.toBlock);
    }
    return {
      candidates: candidates.length,
      managedAddresses: managed.length,
      acceptedLogs: accepted.length,
      persisted,
    };
  }

  return async function run(): Promise<IndexerResult> {
    const [initialCursor, safeHead] = await Promise.all([
      dependencies.getCursor(),
      dependencies.getSafeHead(),
    ]);
    let cursor = initialCursor;
    const result: IndexerResult = {
      fromBlock: null,
      toBlock: null,
      ranges: 0,
      candidates: 0,
      managedAddresses: 0,
      acceptedLogs: 0,
      persisted: 0,
      dryRun: dependencies.dryRun,
    };

    while (true) {
      const range = calculateBlockRange({
        cursor,
        safeHead,
        initialBlock: dependencies.initialBlock,
        maxBlockRange: dependencies.maxBlockRange,
      });
      if (!range) break;

      const indexed = await indexRange(range);
      result.fromBlock ??= range.fromBlock;
      result.toBlock = range.toBlock;
      result.ranges += 1;
      result.candidates += indexed.candidates;
      result.managedAddresses += indexed.managedAddresses;
      result.acceptedLogs += indexed.acceptedLogs;
      result.persisted += indexed.persisted;
      cursor = range.toBlock;

      if (!dependencies.loopToSafeHead || range.toBlock >= safeHead) break;
    }

    return result;
  };
}
