import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decodeEventLog,
  encodeAbiParameters,
  encodeEventTopics,
  type Hex,
} from "viem";
import { transferProcessedEvent } from "../lib/chain.js";
import { createTransferIndexer } from "../lib/indexer.js";
import {
  calculateBlockRange,
  chunk,
  DEFAULT_MAX_BLOCK_RANGE,
} from "../lib/utils.js";
import type {
  IndexedTransferProcessedLog,
  ManagedAddress,
  TransferInsert,
} from "../types.js";

const managed: ManagedAddress = {
  id: "00000000-0000-4000-8000-000000000001",
  intentAddress: "0x1111111111111111111111111111111111111111",
};

function event(
  overrides: Partial<IndexedTransferProcessedLog> = {},
): IndexedTransferProcessedLog {
  return {
    intentAddress: managed.intentAddress,
    transactionHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    logIndex: 0,
    blockNumber: 1_001n,
    blockHash:
      "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    executor: "0x2222222222222222222222222222222222222222",
    effectiveOwner: "0x3333333333333333333333333333333333333333",
    partner: "0x0000000000000000000000000000000000000000",
    processedAmount: 1_000_000n,
    ownerAmount: 1_000_000n,
    treasuryFee: 0n,
    partnerReward: 0n,
    executionReward: 0n,
    totalProcessed: 1_000_000n,
    ...overrides,
  };
}

function harness(
  options: {
    cursor?: bigint | null;
    logs?: IndexedTransferProcessedLog[];
    addresses?: ManagedAddress[];
    dryRun?: boolean;
    databaseFailure?: boolean;
    loopToSafeHead?: boolean;
    safeHead?: bigint;
  } = {},
) {
  const rows = new Map<string, TransferInsert>();
  const advanced: bigint[] = [];
  let writes = 0;
  let safeHeadReads = 0;
  const run = createTransferIndexer({
    chainId: 8453,
    initialBlock: 900n,
    maxBlockRange: DEFAULT_MAX_BLOCK_RANGE,
    loopToSafeHead: options.loopToSafeHead,
    dryRun: options.dryRun ?? false,
    getCursor: async () =>
      options.cursor === undefined ? 1_000n : options.cursor,
    getSafeHead: async () => {
      safeHeadReads += 1;
      return options.safeHead ?? 10_000n;
    },
    getTransferProcessedLogs: async () => options.logs ?? [event()],
    getManagedAddresses: async (requested) => {
      const wanted = new Set(requested.map((address) => address.toLowerCase()));
      return (options.addresses ?? [managed]).filter((address) =>
        wanted.has(address.intentAddress.toLowerCase()),
      );
    },
    getBlock: async () => ({
      hash: event().blockHash,
      timestamp: 1_700_000_000n,
    }),
    upsertTransfers: async (inserts) => {
      writes += 1;
      if (options.databaseFailure) throw new Error("database failed");
      let inserted = 0;
      for (const row of inserts) {
        const key = `${row.chainId}:${row.transactionHash}:${row.logIndex}`;
        if (!rows.has(key)) {
          rows.set(key, row);
          inserted += 1;
        }
      }
      return inserted;
    },
    advanceCursor: async (block) => {
      advanced.push(block);
    },
  });
  return {
    run,
    rows,
    advanced,
    writes: () => writes,
    safeHeadReads: () => safeHeadReads,
  };
}

describe("TransferProcessed indexer", () => {
  it("decodes the canonical TransferProcessed event", () => {
    const topics = encodeEventTopics({
      abi: [transferProcessedEvent],
      eventName: "TransferProcessed",
      args: {
        executor: event().executor,
        effectiveOwner: event().effectiveOwner,
        partner: event().partner,
      },
    });
    const data = encodeAbiParameters(
      Array.from({ length: 6 }, () => ({ type: "uint256" as const })),
      [1_000_000n, 1_000_000n, 0n, 0n, 0n, 1_000_000n],
    );
    const decoded = decodeEventLog({
      abi: [transferProcessedEvent],
      eventName: "TransferProcessed",
      topics: topics as [Hex, Hex, Hex, Hex],
      data,
    });
    assert.equal(decoded.args.processedAmount, 1_000_000n);
    assert.equal(decoded.args.effectiveOwner, event().effectiveOwner);
  });

  it("uses the safe head for a fresh cursor by default", () => {
    assert.deepEqual(
      calculateBlockRange({
        cursor: null,
        safeHead: 1_000n,
        maxBlockRange: 2_000n,
      }),
      { fromBlock: 1_000n, toBlock: 1_000n },
    );
  });

  it("honors an explicit start block and preserves an existing cursor", () => {
    assert.deepEqual(
      calculateBlockRange({
        cursor: null,
        safeHead: 1_000n,
        initialBlock: 900n,
        maxBlockRange: 2_000n,
      }),
      { fromBlock: 900n, toBlock: 1_000n },
    );
    assert.deepEqual(
      calculateBlockRange({
        cursor: 950n,
        safeHead: 1_000n,
        initialBlock: 900n,
        maxBlockRange: 2_000n,
      }),
      { fromBlock: 951n, toBlock: 1_000n },
    );
  });

  it("caps each run at 2,000 blocks", () => {
    assert.deepEqual(
      calculateBlockRange({
        cursor: 100n,
        safeHead: 10_000n,
        initialBlock: 1n,
        maxBlockRange: 2_000n,
      }),
      { fromBlock: 101n, toBlock: 2_100n },
    );
  });

  it("loops bounded ranges to one captured safe head when enabled", async () => {
    const test = harness({
      cursor: 1_000n,
      safeHead: 5_500n,
      logs: [],
      loopToSafeHead: true,
    });
    const result = await test.run();
    assert.equal(result.fromBlock, 1_001n);
    assert.equal(result.toBlock, 5_500n);
    assert.equal(result.ranges, 3);
    assert.deepEqual(test.advanced, [3_000n, 5_000n, 5_500n]);
    assert.equal(test.safeHeadReads(), 1);
  });

  it("matches managed emitters, ignores unknown emitters, and maps accounting", async () => {
    const unknown = event({
      intentAddress: "0x4444444444444444444444444444444444444444",
      transactionHash:
        "0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
    });
    const test = harness({ logs: [event(), unknown] });
    const result = await test.run();
    assert.equal(result.acceptedLogs, 1);
    assert.equal(test.rows.size, 1);
    assert.equal([...test.rows.values()][0]?.processedAmount, "1000000");
  });

  it("treats archived Addresses as matchable because matching has no archive state", async () => {
    const archived = { ...managed };
    const test = harness({ addresses: [archived] });
    assert.equal((await test.run()).acceptedLogs, 1);
  });

  it("is idempotent across duplicate runs", async () => {
    const test = harness();
    assert.equal((await test.run()).persisted, 1);
    assert.equal((await test.run()).persisted, 0);
    assert.equal(test.rows.size, 1);
  });

  it("advances only after persistence succeeds", async () => {
    const success = harness();
    await success.run();
    assert.deepEqual(success.advanced, [3_000n]);
    const failed = harness({ databaseFailure: true });
    await assert.rejects(failed.run(), /database failed/);
    assert.deepEqual(failed.advanced, []);
  });

  it("rejects malformed accounting and changed block metadata", async () => {
    const malformed = harness({ logs: [event({ ownerAmount: 1n })] });
    await assert.rejects(malformed.run(), /invalid TransferProcessed/);
    const changed = harness({
      logs: [
        event({
          blockHash:
            "0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
        }),
      ],
    });
    await assert.rejects(changed.run(), /block hash changed/);
  });

  it("performs no writes or cursor advancement in dry-run", async () => {
    const test = harness({ dryRun: true });
    const result = await test.run();
    assert.equal(result.acceptedLogs, 1);
    assert.equal(test.writes(), 0);
    assert.deepEqual(test.advanced, []);
  });

  it("chunks large emitter lookups without losing entries", () => {
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  });
});
