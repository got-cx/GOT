import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { defineConfig } from "hardhat/config";
import abiExportPlugin from "./plugins/abi-export/index.js";

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
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
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
  },
});
