import type { Transfer } from "@got-cx/sdk"
import { ArrowDownLeft, ArrowUpRight, Link2 } from "lucide-react"
import Link from "next/link"
import { isAddress } from "viem"

import { CopyButton } from "@/components/shared/copy-button"
import { EmptyState } from "@/components/shared/empty-state"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  formatDate,
  formatMoney,
  humanIdentity,
  shortAddress,
} from "@/lib/format"
import { transferLink } from "@/lib/transfer-envelope"

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
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {transfers.map((transfer) => {
        const incoming = transfer.direction === "incoming"
        const DirectionIcon = incoming ? ArrowDownLeft : ArrowUpRight
        const transferUrl = transferLink(transfer)
        const partyLabel = humanIdentity(transfer.party)
        const context = transfer.note ?? transfer.reference

        return (
          <article
            key={transfer.id}
            className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/40 sm:gap-4 sm:px-5"
          >
            <Link
              href={`/dashboard/transfers/${encodeURIComponent(transfer.intentAddress)}`}
              className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted">
                <DirectionIcon className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate text-sm">{partyLabel}</strong>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {context ??
                    (incoming ? "Incoming transfer" : "Outgoing transfer")}
                </span>
                <span className="mt-1 block text-muted-foreground sm:hidden">
                  {formatDate(transfer.createdAt)}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <strong className="block text-sm tabular-nums">
                  {incoming ? "+" : "−"}
                  {formatMoney(transfer.value, 2)}
                </strong>
                <span className="mt-1 flex justify-end">
                  <StatusBadge status={transfer.status} />
                </span>
              </span>
            </Link>
            <span className="hidden min-w-24 text-right text-xs text-muted-foreground sm:block">
              {formatDate(transfer.createdAt)}
            </span>
            <CopyButton
              value={transferUrl}
              label="Link"
              className="hidden sm:inline-flex"
            >
              <Link2 />
            </CopyButton>
          </article>
        )
      })}
    </div>
  )
}
