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
  return `${formatted} USDC`
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
        description="Processed GOT transfers will appear here."
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
            <th className="px-4 py-3 font-medium">Received</th>
            <th className="px-4 py-3 font-medium">Processed amount</th>
            <th className="px-4 py-3 font-medium">Processed at</th>
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
              <td className="px-4 py-3 font-medium text-emerald-700 tabular-nums dark:text-emerald-400">
                {transferAmount(transfer.ownerAmount)}
              </td>
              <td className="px-4 py-3 tabular-nums">
                {transferAmount(transfer.processedAmount)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(transfer.blockTimestamp, true)}
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
