import {
  createPublicClient,
  fallback,
  getAddress,
  http,
  parseAbiItem,
} from "viem";
import { base } from "viem/chains";
import type { IndexerConfig } from "../config.js";
import type { IndexedTransferProcessedLog } from "../types.js";

export const transferProcessedEvent = parseAbiItem(
  "event TransferProcessed(address indexed executor, address indexed effectiveOwner, address indexed partner, uint256 processedAmount, uint256 ownerAmount, uint256 treasuryFee, uint256 partnerReward, uint256 executionReward, uint256 totalProcessed)",
);

export function createChainAdapter(config: IndexerConfig) {
  const transport = config.rpcFallback
    ? fallback([http(config.rpcUrl), http(config.rpcFallback)])
    : http(config.rpcUrl);
  const client = createPublicClient({ chain: base, transport });
  return {
    async getSafeHead() {
      return (await client.getBlock({ blockTag: "safe" })).number;
    },
    async getTransferProcessedLogs(input: {
      fromBlock: bigint;
      toBlock: bigint;
    }) {
      const logs = await client.getLogs({
        event: transferProcessedEvent,
        ...input,
        strict: true,
      });
      return logs.map((log): IndexedTransferProcessedLog => {
        if (!log.transactionHash || !log.blockHash)
          throw new Error("Base returned an incomplete log.");
        return {
          intentAddress: getAddress(log.address),
          transactionHash: log.transactionHash,
          logIndex: log.logIndex,
          blockNumber: log.blockNumber,
          blockHash: log.blockHash,
          executor: getAddress(log.args.executor),
          effectiveOwner: getAddress(log.args.effectiveOwner),
          partner: getAddress(log.args.partner),
          processedAmount: log.args.processedAmount,
          ownerAmount: log.args.ownerAmount,
          treasuryFee: log.args.treasuryFee,
          partnerReward: log.args.partnerReward,
          executionReward: log.args.executionReward,
          totalProcessed: log.args.totalProcessed,
        };
      });
    },
    async getBlock(blockNumber: bigint) {
      const block = await client.getBlock({ blockNumber });
      return { hash: block.hash, timestamp: block.timestamp };
    },
  };
}
