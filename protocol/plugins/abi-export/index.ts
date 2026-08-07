import type { HardhatPlugin } from "hardhat/types/plugins";

import { definePlugin } from "hardhat/plugins";

const abiExportPlugin: HardhatPlugin = definePlugin({
  id: "got:abi-export",
  hookHandlers: {
    solidity: () => import("./hook-handlers/solidity.js"),
  },
});

export default abiExportPlugin;
