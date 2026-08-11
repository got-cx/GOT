import { createRequire } from "node:module";
import type { Address, Hex } from "viem";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as {
  name?: string;
  version?: string;
};

const DEFAULT_EXECUTION_SHARE_BPS = 2_000;
const DEFAULT_PARTNER_SHARE_BPS = 2_500;
const DEFAULT_MAX_FEE_BPS = 1_000;
const DEFAULT_CONFIRMATIONS = 1;
const DEFAULT_PACKAGE_NAME = packageJson.name;
const DEFAULT_PACKAGE_VERSION = packageJson.version;
const DEFAULT_CREATE2_SALT_NAMESPACE = `${DEFAULT_PACKAGE_NAME}-${DEFAULT_PACKAGE_VERSION}`;
const DEFAULT_FACTORY_VANITY_PREFIX = "0x60700";
const DEFAULT_FACTORY_VANITY_SEARCH_LIMIT = 5_000_000;

type ChainKey = "base";

type ChainConfigTemplate = {
  key: ChainKey;
  chainId: number;
  treasury: Address | undefined;
  gotNameClaimVerifier: Address | undefined;
  usdc: Address;
  usdcCodeHash: Hex;
  spendPermissionManager: Address;
  spendPermissionManagerCodeHash: Hex;
  executionShareBps: number;
  partnerShareBps: number;
  maxFeeBps: number;
  confirmations: number;
  create2Salt?: Hex;
  create2SaltNamespace: string;
  factoryVanityPrefix: string;
  factoryVanitySearchLimit: number;
};

type CompleteChainConfig = ChainConfigTemplate & {
  treasury: Address;
  gotNameClaimVerifier: Address;
};

export type DeployConfig = CompleteChainConfig & {
  networkName: string;
};

type ResolveDeployConfigParams = {
  chainId: number;
  networkName: string;
};

const CHAIN_CONFIGS: Record<ChainKey, ChainConfigTemplate> = {
  base: {
    key: "base",
    chainId: 8_453,
    treasury: undefined,
    gotNameClaimVerifier: undefined,
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    usdcCodeHash: "0xa6705a10bb756b5dea144591118be77d7af0c3eee3bf2dfe2583dcb0364fefab",
    spendPermissionManager: "0xf85210B21cC50302F477BA56686d2019dC9b67Ad",
    spendPermissionManagerCodeHash: "0x2e9e272aa2f685632aae292aaf8bca67f22e4494ec831959bc6e9ff071378bea",
    executionShareBps: DEFAULT_EXECUTION_SHARE_BPS,
    partnerShareBps: DEFAULT_PARTNER_SHARE_BPS,
    maxFeeBps: DEFAULT_MAX_FEE_BPS,
    confirmations: DEFAULT_CONFIRMATIONS,
    create2SaltNamespace: DEFAULT_CREATE2_SALT_NAMESPACE,
    factoryVanityPrefix: DEFAULT_FACTORY_VANITY_PREFIX,
    factoryVanitySearchLimit: DEFAULT_FACTORY_VANITY_SEARCH_LIMIT,
  },
};

function resolveChainKey(chainId: number, networkName: string): ChainKey {
  if (networkName === "base" || chainId === CHAIN_CONFIGS.base.chainId) {
    return "base";
  }

  throw new Error(
    `Unsupported deployment chain ${chainId} (${networkName}). Add it to scripts/config.ts before deploying.`,
  );
}

function completeConfigAddresses(
  config: ChainConfigTemplate,
): Pick<CompleteChainConfig, "treasury" | "gotNameClaimVerifier"> {
  const missingFields: string[] = [];
  const { treasury, gotNameClaimVerifier } = config;

  if (treasury === undefined) {
    missingFields.push("treasury");
  }
  if (gotNameClaimVerifier === undefined) {
    missingFields.push("gotNameClaimVerifier");
  }
  if (config.create2SaltNamespace.trim() === "") {
    missingFields.push("create2SaltNamespace");
  }
  if (!/^0x[0-9a-fA-F]{1,40}$/.test(config.factoryVanityPrefix)) {
    missingFields.push("factoryVanityPrefix");
  }
  if (config.factoryVanitySearchLimit <= 0) {
    missingFields.push("factoryVanitySearchLimit");
  }
  if (config.confirmations < 0) {
    missingFields.push("confirmations");
  }

  for (const [name, value] of [
    ["executionShareBps", config.executionShareBps],
    ["partnerShareBps", config.partnerShareBps],
    ["maxFeeBps", config.maxFeeBps],
  ] as const) {
    if (!Number.isInteger(value) || value <= 0 || value >= 10_000) {
      missingFields.push(name);
    }
  }

  if (missingFields.length > 0) {
    throw new Error(`Incomplete deployment config for ${config.key}: ${missingFields.join(", ")}`);
  }

  return {
    treasury: treasury as Address,
    gotNameClaimVerifier: gotNameClaimVerifier as Address,
  };
}

export function getDeployConfig({ chainId, networkName }: ResolveDeployConfigParams): DeployConfig {
  const chainKey = resolveChainKey(chainId, networkName);
  const template = CHAIN_CONFIGS[chainKey];
  const addresses = completeConfigAddresses(template);

  return {
    ...template,
    ...addresses,
    networkName,
  };
}

export function listSupportedChains(): ChainConfigTemplate[] {
  return Object.values(CHAIN_CONFIGS);
}
