import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";
import abiExportPlugin from "./plugins/abi-export/index.js";

const BASE_RPC_URL = process.env.BASE_RPC_URL ?? "https://mainnet.base.org";
const BASE_FORK_BLOCK = Number(process.env.BASE_FORK_BLOCK ?? "49650000");
const useBaseForkDeployAccount = process.env.USE_GOT_DEPLOY_ACCOUNT === "true";

if (!Number.isSafeInteger(BASE_FORK_BLOCK) || BASE_FORK_BLOCK <= 0) {
  throw new Error("BASE_FORK_BLOCK must be a positive safe integer");
}

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, abiExportPlugin],
  // GOTIntent validates an exact calldata suffix. Coverage hooks change the
  // implementation and are therefore excluded from this proxy-sensitive file.
  coverage: {
    skipFiles: ["contracts/core/GOTIntent.sol"],
  },
  solidity: {
    profiles: {
      default: {
        version: "0.8.36",
        settings: {
          evmVersion: "cancun",
        },
      },
      production: {
        version: "0.8.36",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    baseFork: {
      type: "edr-simulated",
      chainType: "op",
      chainId: 8453,
      ...(useBaseForkDeployAccount
        ? {
            accounts: [
              {
                privateKey: configVariable("GOT_DEPLOYER"),
                balance: "10000000000000000000000",
              },
            ],
          }
        : {}),
      forking: {
        url: BASE_RPC_URL,
        blockNumber: BASE_FORK_BLOCK,
      },
    },
    baseForkTip: {
      type: "edr-simulated",
      chainType: "op",
      chainId: 8453,
      forking: {
        url: BASE_RPC_URL,
      },
    },
    base: {
      type: "http",
      chainType: "op",
      url: BASE_RPC_URL,
      chainId: 8453,
      accounts: [configVariable("GOT_DEPLOYER")],
    },
  },
});
