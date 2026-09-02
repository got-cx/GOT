import { loadConfig } from "./config.js";
import { createChainAdapter } from "./lib/chain.js";
import { createDatabaseAdapter } from "./lib/database.js";
import { createTransferIndexer } from "./lib/indexer.js";

const dryRun = process.argv.includes("--dry-run");
const loopToSafeHead = process.argv.includes("--loop-to-safe-head");
const config = loadConfig(dryRun);
const chain = createChainAdapter(config);
const database = createDatabaseAdapter(config);
const run = createTransferIndexer({
  ...chain,
  ...database,
  chainId: config.chainId,
  initialBlock: config.initialBlock,
  maxBlockRange: config.maxBlockRange,
  loopToSafeHead,
  dryRun,
  reportDryRun(rows, toBlock) {
    console.log(
      JSON.stringify(
        { action: "dry-run", rows, cursorWouldAdvanceTo: toBlock.toString() },
        null,
        2,
      ),
    );
  },
});

try {
  const result = await run();
  console.log(
    JSON.stringify(result, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : "Transfer indexing failed.",
  );
  process.exitCode = 1;
}
