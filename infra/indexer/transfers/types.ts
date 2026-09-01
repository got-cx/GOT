export type ManagedAddress = { id: string; intentAddress: `0x${string}` };

export type IndexedTransferProcessedLog = {
  intentAddress: `0x${string}`;
  transactionHash: `0x${string}`;
  logIndex: number;
  blockNumber: bigint;
  blockHash: `0x${string}`;
  executor: `0x${string}`;
  effectiveOwner: `0x${string}`;
  partner: `0x${string}`;
  processedAmount: bigint;
  ownerAmount: bigint;
  treasuryFee: bigint;
  partnerReward: bigint;
  executionReward: bigint;
  totalProcessed: bigint;
};

export type IndexedBlock = { hash: `0x${string}`; timestamp: bigint };

export type TransferInsert = {
  addressId: string;
  chainId: number;
  transactionHash: string;
  logIndex: number;
  blockNumber: string;
  blockHash: string;
  blockTimestamp: string;
  executor: string;
  effectiveOwner: string;
  partner: string;
  processedAmount: string;
  ownerAmount: string;
  treasuryFee: string;
  partnerReward: string;
  executionReward: string;
  totalProcessed: string;
};

export type IndexerDependencies = {
  chainId: number;
  initialBlock?: bigint;
  maxBlockRange: bigint;
  loopToSafeHead?: boolean;
  dryRun: boolean;
  getCursor(): Promise<bigint | null>;
  getSafeHead(): Promise<bigint>;
  getTransferProcessedLogs(input: {
    fromBlock: bigint;
    toBlock: bigint;
  }): Promise<IndexedTransferProcessedLog[]>;
  getManagedAddresses(addresses: `0x${string}`[]): Promise<ManagedAddress[]>;
  getBlock(blockNumber: bigint): Promise<IndexedBlock>;
  upsertTransfers(rows: TransferInsert[]): Promise<number>;
  advanceCursor(blockNumber: bigint): Promise<void>;
  reportDryRun?(rows: TransferInsert[], toBlock: bigint): void;
};

export type IndexerResult = {
  fromBlock: bigint | null;
  toBlock: bigint | null;
  ranges: number;
  candidates: number;
  managedAddresses: number;
  acceptedLogs: number;
  persisted: number;
  dryRun: boolean;
};
