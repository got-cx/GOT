"use client"

import { Check, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatDate, formatMoney, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"

export function Receipt({ transferId }: { transferId: string }) {
  const searchParams = useSearchParams()
  const client = getGOTClient()
  const load = async () => {
    return client.transfers.get(transferId)
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["transfer", transferId],
    load
  )

  if (error)
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage error={error} onRetry={retry} />
      </main>
    )
  if (isLoading || !data)
    return (
      <main className="mx-auto mt-24 h-96 max-w-lg animate-pulse rounded-xl border bg-muted" />
    )

  const transaction = data.transactionHash ?? searchParams.get("transaction")
  const complete = data.status === "settled" || data.status === "overpaid"
  const recipient =
    data.direction === "incoming" ? (data.recipient ?? data.party) : data.party
  const receiptText = [
    "GOT transfer receipt",
    formatMoney(data.value, 2),
    `Recipient: ${recipient}`,
    `Transfer ID: ${data.id}`,
    transaction ? `Transaction: ${transaction}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  return (
    <div className="min-h-svh px-5">
      <header className="mx-auto flex h-18 max-w-5xl items-center justify-between border-b">
        <Brand />
        <span className="text-xs text-muted-foreground">Receipt</span>
      </header>
      <main className="mx-auto my-14 w-full max-w-lg text-center">
        <span className="mx-auto mb-6 grid size-12 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="size-5" />
        </span>
        <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
          {complete ? "TRANSFER COMPLETE" : "TRANSFER SUBMITTED"}
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em]">
          {formatMoney(data.value, 2)}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          to <strong className="text-foreground">{recipient}</strong>
        </p>
        <dl className="mt-8 divide-y rounded-xl border text-left text-sm">
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Recipient</dt>
            <dd className="font-medium">{recipient}</dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Network</dt>
            <dd className="font-medium">Base</dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <StatusBadge status={data.status} />
            </dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Transaction</dt>
            <dd className="font-mono text-xs">
              {transaction ? shortAddress(transaction) : "Awaiting indexer"}
            </dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Transfer ID</dt>
            <dd className="font-mono text-xs">{data.id}</dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">{formatDate(data.createdAt, true)}</dd>
          </div>
          {data.reference && (
            <div className="flex justify-between gap-5 px-4 py-3.5">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium">{data.reference}</dd>
            </div>
          )}
        </dl>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {transaction ? (
            <Button
              render={
                <a
                  href={`https://basescan.org/tx/${transaction}`}
                  target="_blank"
                  rel="noreferrer"
                />
              }
              nativeButton={false}
              className="h-10"
            >
              View transaction <ExternalLink data-icon="inline-end" />
            </Button>
          ) : (
            <Button disabled className="h-10">
              Awaiting transaction
            </Button>
          )}
          <CopyButton
            value={receiptText}
            label="Copy receipt"
            className="h-10"
          />
        </div>
        <Button
          variant="link"
          className="mt-5 text-muted-foreground"
          render={<Link href="/dashboard/transfers" />}
          nativeButton={false}
        >
          Return to transfers
        </Button>
      </main>
      <footer className="pb-6 text-center text-[11px] text-muted-foreground">
        Onchain. Direct. Non-custodial.
      </footer>
    </div>
  )
}
