"use client"

import { ArrowLeft, Check, ExternalLink, QrCode, Share2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { QRCodeImage } from "@/components/shared/qr-code"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatMoney, humanIdentity, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { transferLink } from "@/lib/transfer-envelope"
import { Button } from "@workspace/ui/components/button"

export function RequestCreated({ transferId }: { transferId: string }) {
  const [showQR, setShowQR] = useState(false)
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

  const transferUrl = transferLink(data)
  const displayUrl = transferUrl.replace(
    data.intentAddress,
    shortAddress(data.intentAddress)
  )
  const recipient = humanIdentity(data.recipient)
  const shareText = data.note ?? data.reference ?? undefined

  async function share() {
    if (navigator.share) {
      await navigator.share({
        title: `Transfer to ${recipient}`,
        text: shareText,
        url: transferUrl,
      })
      return
    }
    await navigator.clipboard.writeText(transferUrl)
  }

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
          TRANSFER LINK CREATED
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">
          Your transfer link is ready
        </h1>
        <p className="mx-auto mt-3 max-w-sm text-sm text-muted-foreground">
          Share it with the person sending {formatMoney(data.value, 2)} to{" "}
          {recipient}.
        </p>
        <div className="mt-8 rounded-xl bg-muted/60 p-4 text-left">
          <strong className="block truncate text-sm">{displayUrl}</strong>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <CopyButton value={transferUrl} label="Copy link" className="h-10" />
          <Button
            variant="outline"
            className="h-10"
            onClick={() => void share().catch(() => undefined)}
          >
            <Share2 />
            Share
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => setShowQR((value) => !value)}
          >
            <QrCode />
            {showQR ? "Hide QR" : "Show QR"}
          </Button>
        </div>
        {showQR && (
          <div className="mx-auto mt-6 w-max rounded-2xl border bg-white p-3">
            <QRCodeImage value={transferUrl} size={220} />
          </div>
        )}
        {(data.requestId || data.note || data.reference) && (
          <dl className="mt-6 divide-y rounded-xl border px-4 text-left text-sm">
            {data.requestId && (
              <div className="flex items-center justify-between gap-4 py-3.5">
                <dt className="text-muted-foreground">Transfer ID</dt>
                <dd className="flex min-w-0 items-center gap-2 font-medium">
                  <span className="max-w-52 truncate">{data.requestId}</span>
                  <CopyButton value={data.requestId} label="Copy ID" />
                </dd>
              </div>
            )}
            {data.note && (
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-muted-foreground">Note</dt>
                <dd className="max-w-72 text-right font-medium">
                  {data.note}
                </dd>
              </div>
            )}
            {data.reference && (
              <div className="flex justify-between gap-4 py-3.5">
                <dt className="text-muted-foreground">Reference</dt>
                <dd className="max-w-72 text-right font-medium">
                  {data.reference}
                </dd>
              </div>
            )}
          </dl>
        )}
        <OnchainDetails className="mt-6 border-t text-left">
          <dl className="divide-y">
            <div className="flex justify-between py-3">
              <dt>Network</dt>
              <dd className="font-medium text-foreground">Base</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt>Token</dt>
              <dd className="font-medium text-foreground">USDC</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <dt>GOT intent address</dt>
              <dd className="flex items-center gap-2 font-mono text-foreground">
                {shortAddress(data.intentAddress)}
                <CopyButton value={data.intentAddress} label="Copy" />
              </dd>
            </div>
          </dl>
        </OnchainDetails>
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
            Create another link
          </Button>
        </div>
      </main>
    </div>
  )
}
