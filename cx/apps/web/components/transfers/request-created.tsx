"use client"

import { ArrowLeft, Check, ExternalLink } from "lucide-react"
import Link from "next/link"

import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatMoney } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { transferPaymentLink } from "@/lib/transfer-envelope"
import { Button } from "@workspace/ui/components/button"

export function RequestCreated({ transferId }: { transferId: string }) {
  const client = getGOTClient()
  const load = async () => {
    return client.transfers.getByIntent(transferId)
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["transfer-request", transferId],
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

  const transferUrl = transferPaymentLink(data)
  return (
    <div className="min-h-svh px-5">
      <header className="mx-auto flex h-18 max-w-5xl items-center justify-between border-b">
        <Brand />
        <Link
          href="/dashboard/transfers"
          className="flex items-center gap-2 text-xs text-muted-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Transfers
        </Link>
      </header>
      <main className="mx-auto my-16 w-full max-w-lg text-center">
        <span className="mx-auto mb-6 grid size-11 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="size-5" />
        </span>
        <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
          TRANSFER REQUEST CREATED
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">
          Transfer request ready
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Share this deterministic link with the sender.
        </p>
        <div className="mt-8 flex items-center justify-between gap-3 rounded-lg border bg-muted/40 p-2 pl-4 text-left">
          <strong className="min-w-0 truncate font-mono text-xs">
            {transferUrl}
          </strong>
          <CopyButton value={transferUrl} label="Copy link" />
        </div>
        <dl className="mt-4 divide-y rounded-lg border text-left text-sm">
          <div className="flex justify-between px-4 py-3">
            <dt className="text-muted-foreground">Amount</dt>
            <dd className="font-medium">{formatMoney(data.value, 2)}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-muted-foreground">Recipient</dt>
            <dd className="font-medium">{data.recipient}</dd>
          </div>
          <div className="flex justify-between px-4 py-3">
            <dt className="text-muted-foreground">Network</dt>
            <dd className="font-medium">Base</dd>
          </div>
          {data.requestId && (
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="flex items-center gap-2 font-mono text-xs">
                <span className="max-w-52 truncate">{data.requestId}</span>
                <CopyButton value={data.requestId} label="Copy" />
              </dd>
            </div>
          )}
          {data.reference && (
            <div className="flex justify-between px-4 py-3">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-medium">{data.reference}</dd>
            </div>
          )}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Keep the ID with the transfer details to recreate this address.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            render={<a href={transferUrl} />}
            nativeButton={false}
            className="h-10"
          >
            Open transfer page <ExternalLink data-icon="inline-end" />
          </Button>
          <Button
            variant="outline"
            render={<Link href="/transfers/new/request" />}
            nativeButton={false}
            className="h-10"
          >
            Create another request
          </Button>
        </div>
      </main>
    </div>
  )
}
