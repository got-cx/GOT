import type { Transfer } from "@got-cx/sdk"
import { ArrowDownLeft, ArrowUpRight } from "lucide-react"
import Link from "next/link"

import { CopyButton } from "@/components/copy-button"
import { EmptyState } from "@/components/empty-state"
import { StatusBadge } from "@/components/status-badge"
import { formatDate, formatMoney } from "@/lib/format"
import { transferPaymentLink } from "@/lib/transfer-envelope"

export function TransferTable({ transfers }: { transfers: Transfer[] }) {
  if (!transfers.length)
    return (
      <EmptyState
        icon={ArrowDownLeft}
        title="No transfers yet"
        description="Incoming and outgoing transfers will appear here after they are created."
      />
    )

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <div className="min-w-[860px]">
        <div className="grid grid-cols-[1.5fr_1fr_1fr_.9fr_.7fr_.7fr] gap-4 border-b bg-muted/50 px-5 py-3 text-[11px] font-medium text-muted-foreground">
          <span>Party</span>
          <span>Amount</span>
          <span>Reference</span>
          <span>Date</span>
          <span>Status</span>
          <span>Link</span>
        </div>
        {transfers.map((transfer) => {
          const DirectionIcon =
            transfer.direction === "incoming" ? ArrowDownLeft : ArrowUpRight
          const transferUrl = transferPaymentLink(transfer)
          return (
            <div
              key={transfer.id}
              className="grid min-h-16 grid-cols-[1.5fr_1fr_1fr_.9fr_.7fr_.7fr] items-center gap-4 border-b px-5 text-xs last:border-b-0"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg border bg-muted">
                  <DirectionIcon className="size-3.5" />
                </span>
                <span className="min-w-0">
                  <Link
                    href={`/dashboard/transfers/${encodeURIComponent(transfer.intentAddress)}`}
                    className="block truncate font-semibold hover:underline"
                  >
                    {transfer.party}
                  </Link>
                  <small className="text-muted-foreground capitalize">
                    {transfer.direction}
                  </small>
                </span>
              </span>
              <strong>{formatMoney(transfer.value, 2)}</strong>
              <span className="truncate text-muted-foreground">
                {transfer.reference ?? "—"}
              </span>
              <span className="text-muted-foreground">
                {formatDate(transfer.createdAt)}
              </span>
              <StatusBadge status={transfer.status} />
              <CopyButton value={transferUrl} label="Copy" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
