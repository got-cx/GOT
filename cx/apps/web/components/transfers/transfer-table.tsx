import type { Transfer } from "@got-cx/sdk"
import { ArrowDownLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { formatUnits } from "viem"

import { EmptyState } from "@/components/shared/empty-state"
import { formatDate, shortAddress } from "@/lib/format"

function transferAmount(amount: string) {
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(Number(formatUnits(BigInt(amount), 6)))
  return `+${formatted} USDC`
}

export function TransferTable({
  transfers,
  showReference = true,
}: {
  transfers: Transfer[]
  showReference?: boolean
}) {
  if (!transfers.length)
    return (
      <EmptyState
        icon={ArrowDownLeft}
        title="No transfers yet."
        description="Transfers received by your Intent Addresses will appear here."
      />
    )

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            {showReference && (
              <th className="px-4 py-3 font-medium">Reference</th>
            )}
            <th className="px-4 py-3 font-medium">From</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 text-right font-medium">Transaction</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {transfers.map((transfer) => (
            <tr key={transfer.id} className="hover:bg-muted/30">
              {showReference && (
                <td className="px-4 py-3 font-medium">
                  <Link
                    href={`/dashboard/addresses/${transfer.intentAddress}`}
                    className="hover:underline"
                  >
                    {transfer.ref}
                  </Link>
                </td>
              )}
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {shortAddress(transfer.from, 5)}
              </td>
              <td className="px-4 py-3 font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                {transferAmount(transfer.amount)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {transfer.blockTimestamp
                  ? formatDate(transfer.blockTimestamp, true)
                  : "—"}
              </td>
              <td className="px-4 py-3 text-right">
                <a
                  href={`https://basescan.org/tx/${transfer.transactionHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-xs hover:underline"
                  aria-label={`View transaction ${transfer.transactionHash} on Basescan`}
                >
                  {shortAddress(transfer.transactionHash, 5)}
                  <ExternalLink className="size-3" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
