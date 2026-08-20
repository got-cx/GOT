import type { Address, Hash, Hex } from "viem"

export type ChainId = 8453

export type Money = {
  amount: string
  decimals: number
  symbol: string
}

export type TransferDirection = "incoming" | "outgoing"

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

export type Transfer = {
  id: string
  chainId: ChainId
  direction: TransferDirection
  party: string
  value: Money
  recipientTargetAmount: string
  grossQuotedAmount: string
  fundedAmount: string
  processedAmount: string
  ownerAmount: string
  feeAmount: string
  reference: string | null
  requestId?: string | null
  note: string | null
  createdAt: string
  status: TransferStatus
  intentAddress: Address
  transactionHash: Hash | null
  intentConfig?: SerializedIntentConfig
  recipient?: string
  sender?: string | null
  dueAt?: string | null
}

export type TransferRequest = Transfer & {
  direction: "incoming"
  recipient: string
  sender: string | null
  dueAt: string | null
  token: Address
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
  transferVolume: Money
  transferCount: number
  pendingRequestCount: number
  recentTransfers: Transfer[]
  volumeSeries: Array<{ at: string; amount: string }>
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

type TransferInput = {
  chainId: ChainId
  recipient: string
  recipientTargetAmount: string
  token: Address
  sender?: string
  reference?: string
  note?: string
  dueAt?: string
  intentConfig?: SerializedIntentConfig
}

export type TransferRequestInput = TransferInput & {
  requestId: string
}

export type CreateTransferInput = TransferInput & {
  direction: TransferDirection
  requestId?: string
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
