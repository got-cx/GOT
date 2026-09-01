import type { SubscriptionStatus } from "@got-cx/sdk"
import { titleCase } from "@/lib/format"

type NameStatus = "pending" | "verified"
export type StatusBadgeStatus = SubscriptionStatus | NameStatus

const statusLabels: Partial<Record<StatusBadgeStatus, string>> = {
  verified: "Verified",
  pending: "Pending",
  active: "Active",
}

export function StatusBadge({ status }: { status: StatusBadgeStatus }) {
  const positiveStatuses: readonly StatusBadgeStatus[] = ["verified", "active"]
  const negativeStatuses: readonly StatusBadgeStatus[] = ["failed", "revoked"]
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
