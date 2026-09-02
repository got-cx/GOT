import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { zeroAddress, zeroHash, type Address } from "viem";
import type { IntentConfig } from "@got-cx/protocol/intent";
import { createResolver } from "../lib/resolver.js";
import type { IntentSnapshot, ResolverCandidate } from "../types.js";

const resolver = "0x60700c99a58fD21022bf1f4d2b318C663e6F2E27" as Address;
const config: IntentConfig = {
  intentId:
    "0x535f41d712a33e932b4e825647d5a93253e97eda0526f1f0dff6759559154cd4",
  ownerSource: "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76",
  ownerKey: zeroHash,
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  partner: zeroAddress,
  authorizedResolver: zeroAddress,
  amount: 0n,
  initialDeadline: 0n,
  period: 0,
  feeBps: 0,
  metadataHash: zeroHash,
};
const candidate: ResolverCandidate = {
  id: "address-1",
  intentAddress: "0x83a3de04E4E601191213b22d8911e5E121aF369E",
  chainId: 8453,
  config,
};

function snapshot(overrides: Partial<IntentSnapshot> = {}): IntentSnapshot {
  return {
    intentAddress: candidate.intentAddress,
    deployed: false,
    balance: 1_000_000n,
    effectiveOwner: config.ownerSource,
    ...overrides,
  };
}

function harness(
  options: {
    candidates?: ResolverCandidate[];
    pages?: ResolverCandidate[][];
    discovery?: IntentSnapshot[];
    fresh?: IntentSnapshot[];
    dryRun?: boolean;
    maxTransactions?: number;
    maxGasCost?: bigint;
    lensBatchSize?: number;
    simulationFailureFor?: string;
    receiptFailureFor?: string;
  } = {},
) {
  const calls: string[] = [];
  const loadCursors: Array<string | undefined> = [];
  let refreshIndex = 0;
  let pageIndex = 0;
  let activeReads = 0;
  let maxReadConcurrency = 0;
  const candidates = options.candidates ?? [candidate];
  const pages = options.pages ?? [candidates];
  const run = createResolver({
    resolverAddress: resolver,
    dryRun: options.dryRun ?? false,
    minBalance: 100_000n,
    maxTransactions: options.maxTransactions ?? 25,
    maxGasCost: options.maxGasCost,
    lensBatchSize: options.lensBatchSize ?? 50,
    loadCandidates: async (cursor) => {
      loadCursors.push(cursor);
      const current = pages[pageIndex] ?? [];
      pageIndex += 1;
      return {
        candidates: current,
        nextCursor:
          pageIndex < pages.length ? (current.at(-1)?.id ?? null) : null,
      };
    },
    readSnapshots: async (batch) => {
      calls.push(`read:${batch.map((item) => item.id).join(",")}`);
      activeReads += 1;
      maxReadConcurrency = Math.max(maxReadConcurrency, activeReads);
      await new Promise<void>((resolve) => setImmediate(resolve));
      try {
        if (
          batch.length > 1 ||
          calls.filter((call) => call.startsWith("read:")).length === 1
        ) {
          return (
            options.discovery ??
            batch.map((item) => snapshot({ intentAddress: item.intentAddress }))
          );
        }
        const current =
          options.fresh?.[refreshIndex++] ??
          snapshot({ intentAddress: batch[0]!.intentAddress });
        return [current];
      } finally {
        activeReads -= 1;
      }
    },
    simulate: async (item, state) => {
      calls.push(
        `simulate:${item.id}:${state.deployed ? "resolve" : "deploy"}`,
      );
      if (options.simulationFailureFor === item.id)
        throw new Error("simulation failed");
      return {
        kind: state.deployed ? "resolve" : "deployAndExecute",
        gas: 100n,
        gasPrice: 2n,
      };
    },
    send: async (item) => {
      calls.push(`send:${item.id}`);
      return `0x${item.id === "address-1" ? "a" : "b".repeat(64)}` as `0x${string}`;
    },
    waitForReceipt: async (hash) => {
      calls.push(`wait:${hash.slice(0, 6)}`);
      return options.receiptFailureFor !== hash;
    },
  });
  return {
    run,
    calls,
    loadCursors,
    get maxReadConcurrency() {
      return maxReadConcurrency;
    },
  };
}

describe("resolver", () => {
  it("skips zero, dust, and owner-unresolved balances", async () => {
    for (const state of [
      snapshot({ balance: 0n }),
      snapshot({ balance: 99_999n }),
      snapshot({ effectiveOwner: null }),
    ]) {
      const test = harness({ discovery: [state] });
      assert.equal((await test.run()).sent, 0);
    }
  });

  it("accepts open and matching restricted resolvers and rejects a different resolver", async () => {
    const restricted = {
      ...candidate,
      id: "restricted",
      config: { ...config, authorizedResolver: resolver },
    };
    // Restricted config produces a different canonical address, so use the known restricted vector.
    restricted.config.intentId =
      "0x5ad0785e8eb5358722d51c03ec10f544144ff6333e364da27979183b6285ba8f";
    restricted.intentAddress = "0x8cad2D6cA6EBCE60564d49a68cdbcA330900651C";
    const other = {
      ...candidate,
      id: "other",
      config: {
        ...config,
        authorizedResolver:
          "0x2222222222222222222222222222222222222222" as Address,
      },
    };
    const test = harness({ candidates: [candidate, restricted, other] });
    const result = await test.run();
    assert.equal(result.valid, 2);
    assert.equal(result.sent, 2);
  });

  it("skips invalid chains and stored/derived Address mismatches", async () => {
    const test = harness({
      candidates: [
        { ...candidate, chainId: 1 },
        {
          ...candidate,
          id: "mismatch",
          intentAddress: "0x1111111111111111111111111111111111111111",
        },
      ],
    });
    assert.equal((await test.run()).valid, 0);
  });

  it("refreshes immediately before execution and chooses deployAndExecute or resolve", async () => {
    const undeployed = harness();
    await undeployed.run();
    assert.deepEqual(undeployed.calls.slice(0, 4), [
      "read:address-1",
      "read:address-1",
      "simulate:address-1:deploy",
      "send:address-1",
    ]);
    const deployed = harness({ fresh: [snapshot({ deployed: true })] });
    await deployed.run();
    assert.ok(deployed.calls.includes("simulate:address-1:resolve"));
  });

  it("skips stale balances and unresolved owners after refresh", async () => {
    for (const fresh of [
      snapshot({ balance: 0n }),
      snapshot({ effectiveOwner: null }),
    ]) {
      const test = harness({ fresh: [fresh] });
      assert.equal((await test.run()).sent, 0);
      assert.equal(
        test.calls.some((call) => call.startsWith("simulate:")),
        false,
      );
    }
  });

  it("enforces gas and per-run transaction limits sequentially", async () => {
    const second = { ...candidate, id: "address-2" };
    const limited = harness({
      candidates: [candidate, second],
      maxTransactions: 1,
    });
    assert.equal((await limited.run()).sent, 1);
    const send = limited.calls.indexOf("send:address-1");
    const wait = limited.calls.findIndex((call) => call.startsWith("wait:"));
    assert.ok(send >= 0 && wait > send);
    const expensive = harness({ maxGasCost: 199n });
    assert.equal((await expensive.run()).sent, 0);
  });

  it("continues after simulation failure", async () => {
    const second = { ...candidate, id: "address-2" };
    const test = harness({
      candidates: [candidate, second],
      simulationFailureFor: "address-1",
    });
    assert.equal((await test.run()).sent, 1);
    assert.ok(test.calls.includes("send:address-2"));
  });

  it("continues after a failed receipt", async () => {
    const second = { ...candidate, id: "address-2" };
    let receipt = 0;
    const calls: string[] = [];
    const run = createResolver({
      resolverAddress: resolver,
      dryRun: false,
      minBalance: 100_000n,
      maxTransactions: 25,
      lensBatchSize: 50,
      loadCandidates: async () => ({
        candidates: [candidate, second],
        nextCursor: null,
      }),
      readSnapshots: async (items) =>
        items.map((item) => snapshot({ intentAddress: item.intentAddress })),
      simulate: async () => ({
        kind: "deployAndExecute",
        gas: 100n,
        gasPrice: 1n,
      }),
      send: async (item) => {
        calls.push(item.id);
        return `0x${"a".repeat(64)}`;
      },
      waitForReceipt: async () => {
        receipt += 1;
        return receipt > 1;
      },
    });
    const result = await run();
    assert.equal(result.sent, 2);
    assert.equal(result.succeeded, 1);
    assert.deepEqual(calls, ["address-1", "address-2"]);
  });

  it("dry-run simulates but never sends", async () => {
    const test = harness({ dryRun: true });
    const result = await test.run();
    assert.equal(result.simulated, 1);
    assert.equal(result.sent, 0);
    assert.equal(
      test.calls.some((call) => call.startsWith("send:")),
      false,
    );
  });

  it("loads keyset pages and reads every RPC batch sequentially", async () => {
    const second = { ...candidate, id: "address-2" };
    const third = { ...candidate, id: "address-3" };
    const test = harness({
      pages: [[candidate], [second], [third]],
      lensBatchSize: 1,
    });
    const result = await test.run();
    assert.equal(result.loaded, 3);
    assert.equal(result.sent, 3);
    assert.deepEqual(test.loadCursors, [undefined, "address-1", "address-2"]);
    assert.equal(test.maxReadConcurrency, 1);
  });

  it("stops loading pages as soon as the transaction limit is reached", async () => {
    const second = { ...candidate, id: "address-2" };
    const test = harness({
      pages: [[candidate], [second]],
      maxTransactions: 1,
    });
    const result = await test.run();
    assert.equal(result.sent, 1);
    assert.deepEqual(test.loadCursors, [undefined]);
  });

  it("queries only active Addresses and contains no Transfer persistence", () => {
    const database = readFileSync(
      new URL("../lib/database.ts", import.meta.url),
      "utf8",
    );
    assert.match(database, /\.is\("archived_at", null\)/);
    assert.match(database, /\.gt\("id", cursor\)/);
    assert.match(database, /\.limit\(config\.candidatePageSize\)/);
    assert.doesNotMatch(database, /from\("transfers"\)/);
  });
});
