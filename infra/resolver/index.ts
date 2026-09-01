import { loadConfig } from "./config.js";
import { createChainAdapter } from "./lib/chain.js";
import { createDatabaseAdapter } from "./lib/database.js";
import { createResolver } from "./lib/resolver.js";

const dryRun = process.argv.includes("--dry-run");
const config = loadConfig(dryRun);
const run = createResolver({
  ...createDatabaseAdapter(config),
  ...createChainAdapter(config),
  resolverAddress: config.resolverAddress,
  dryRun,
  minBalance: config.minBalance,
  maxTransactions: config.maxTransactions,
  maxGasCost: config.maxGasCost,
  lensBatchSize: config.lensBatchSize,
  log(entry) {
    console.log(JSON.stringify(entry));
  },
});

try {
  console.log(JSON.stringify(await run()));
} catch (error) {
  console.error(error instanceof Error ? error.message : "Resolver failed.");
  process.exitCode = 1;
}
