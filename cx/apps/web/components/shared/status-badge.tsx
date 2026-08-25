import {
  TransferStatus,
  type SubscriptionStatus,
  type TransferStatus as TransferStatusValue,
} from "@got-cx/sdk"
import { titleCase } from "@/lib/format"

type NameStatus = "pending" | "verified"
export type StatusBadgeStatus =
  TransferStatusValue | SubscriptionStatus | NameStatus

const statusLabels: Partial<Record<StatusBadgeStatus, string>> = {
  [TransferStatus.AddressReady]: "Awaiting",
  [TransferStatus.FundingDetected]: "Funds received",
  [TransferStatus.Partial]: "Partial",
  [TransferStatus.Settled]: "Completed",
  [TransferStatus.Overpaid]: "Completed",
  [TransferStatus.Unresolved]: "Ready to receive",
}

export function StatusBadge({ status }: { status: StatusBadgeStatus }) {
  const positiveStatuses: readonly StatusBadgeStatus[] = [
    TransferStatus.FundingDetected,
    TransferStatus.Overpaid,
    TransferStatus.Settled,
  ]
  const negativeStatuses: readonly StatusBadgeStatus[] = [
    TransferStatus.Failed,
    TransferStatus.Reorged,
  ]
  const positive = positiveStatuses.includes(status)
  const negative = negativeStatuses.includes(status)
  return (
    <span
      className={`inline-flex w-max items-center gap-1.5 text-xs font-medium ${
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : negative
            ? "text-destructive"
            : "text-muted-foreground"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {statusLabels[status] ?? titleCase(status)}
    </span>
  )
}
