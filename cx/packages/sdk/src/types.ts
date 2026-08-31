import type { Address, Hash, Hex } from "viem"

export type ChainId = 8453

export type IntentMetadataValue =
  | string
  | number
  | boolean
  | null
  | IntentMetadataValue[]
  | { [key: string]: IntentMetadataValue }

export type IntentMetadata = { [key: string]: IntentMetadataValue }

export type CreateIntentInput = {
  owner: Address
  ref: string
  amount?: string
  token?: Address
  tokenDecimals?: number
  deadline?: number
  period?: number
  metadata?: IntentMetadata
  partner?: Address
  authorizedResolver?: Address
  feeBps?: number
}

export type CreatedIntent = {
  ref: string
  intentId: Hex
  metadata: IntentMetadata | null
  metadataHash: Hex
  address: Address
  chainId: ChainId
  token: Address
  amount: bigint
  config: IntentConfig
}

export type AddressRecord = {
  id: string
  workspaceId: string
  ref: string
  intentId: Hex
  intentAddress: Address
  chainId: ChainId
  token: Address
  amount: string
  metadata: IntentMetadata | null
  metadataHash: Hex
  intentConfig: SerializedIntentConfig
  ownerSource: Address
  ownerKey: Hex
  receivedAmount: string
  processedAmount: string
  createdAt: string
  updatedAt: string
}

export type AddressList = {
  items: AddressRecord[]
  nextCursor: string | null
}

export type AddressActivity = {
  items: Transfer[]
  nextCursor: string | null
}

export type CreateAddressInput = {
  owner?: Address
  ref: string
  amount?: string
  metadata?: IntentMetadata
  token?: Address
  deadline?: number
  period?: number
  partner?: Address
  authorizedResolver?: Address
  feeBps?: number
  intentAddress?: Address
}

export type Money = {
  amount: string
  decimals: number
  symbol: string
}

export const TransferStatus = {
  Created: "created",
  AddressReady: "address_ready",
  FundingDetected: "funding_detected",
  Unresolved: "unresolved",
  Processing: "processing",
  Settled: "settled",
  Partial: "partial",
  Overpaid: "overpaid",
  Failed: "failed",
  Reorged: "reorged",
  Expired: "expired",
  Canceled: "canceled",
} as const

export type TransferStatus =
  (typeof TransferStatus)[keyof typeof TransferStatus]

/** Canonical GOT TransferProcessed event indexed from Base logs. */
export type Transfer = {
  id: string
  addressId: string
  chainId: ChainId
  tokenAddress: Address
  transactionHash: Hash
  logIndex: number
  /** JSON-safe uint64 representation. */
  blockNumber: string
  blockHash: Hash
  blockTimestamp: string
  executor: Address
  effectiveOwner: Address
  partner: Address
  processedAmount: string
  ownerAmount: string
  treasuryFee: string
  partnerReward: string
  executionReward: string
  totalProcessed: string
  createdAt: string
  ref: string
  intentAddress: Address
}

export type TransferList = {
  items: Transfer[]
  nextCursor: string | null
}

export type NameRecord = {
  id: string
  kind: "got" | "x" | "telegram"
  label: string
  url: string
  destination: Address
  verified: boolean
  nameKey: Hex
  verifiedAt: string | null
}

export type SubscriptionStatus =
  | "draft"
  | "awaiting_approval"
  | "active"
  | "past_due"
  | "paused"
  | "revoked"
  | "ended"
  | "failed"

export type Subscription = {
  id: string
  chainId: ChainId
  name: string
  counterparty: string
  value: Money
  periodSeconds: number
  nextExecutionAt: string | null
  status: SubscriptionStatus
}

export type DashboardOverview = {
  received: Money
  processed: Money
  addressCount: number
  transferCount: number
  subscriptionCount: number
  recentTransfers: Transfer[]
}

export type AccountSession = {
  address: Address
  expiresAt: string | null
}

export type Workspace = {
  id: string
  name: string
  planName: string
  account: Address
}

export type APIAuth = {
  session: AccountSession
  workspace: Workspace
}

export type APIAuthToken = APIAuth & {
  token: string
}

export type IntentConfig = {
  intentId: Hex
  ownerSource: Address
  ownerKey: Hex
  token: Address
  partner: Address
  authorizedResolver: Address
  amount: bigint
  initialDeadline: bigint
  period: number
  feeBps: number
  metadataHash: Hex
}

export type SerializedIntentConfig = {
  intentId: Hex
  ownerSource: Address
  ownerKey: Hex
  token: Address
  partner: Address
  authorizedResolver: Address
  amount: string
  initialDeadline: string
  period: number
  feeBps: number
  metadataHash: Hex
}
