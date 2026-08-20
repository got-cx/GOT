"use client"

import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"

import { formatIdentityLabel, GOT_BASE_USDC, parseGOTLink } from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { QRCodeImage } from "@/components/shared/qr-code"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatMoney, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { transferUSDC } from "@/lib/base-transactions"
import { Button } from "@workspace/ui/components/button"

export function PublicRoute({ route }: { route: string }) {
  const router = useRouter()
  const { account } = useAuth()
  const api = getGOTClient()
  const parsed = useMemo(() => {
    try {
      return { link: parseGOTLink(route), error: null }
    } catch (reason) {
      return {
        link: null,
        error: reason instanceof Error ? reason.message : "Invalid GOT link.",
      }
    }
  }, [route])
  const intentAddress =
    parsed.link?.kind === "intent" ? parsed.link.address : null
  const load = async () => {
    if (!intentAddress) throw new Error("A transfer address is required.")
    return api.transfers.getByIntent(intentAddress)
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["transfer-intent", intentAddress],
    load,
    Boolean(intentAddress)
  )
  const [transferError, setTransferError] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)

  if (parsed.error || !parsed.link)
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage error={parsed.error} />
      </main>
    )

  if (parsed.link.kind === "identity") {
    const label = formatIdentityLabel(parsed.link)
    return (
      <main className="grid min-h-svh place-items-center bg-foreground p-5 text-background">
        <section className="w-full max-w-md rounded-2xl bg-background p-8 text-foreground">
          <Brand />
          <p className="mt-14 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
            REUSABLE RECIPIENT LINK
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.055em]">
            Transfer to {label}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Enter an amount to create a specific deterministic 0x transfer
            address for this recipient.
          </p>
          <Button
            className="mt-8 h-11 w-full"
            render={
              <Link
                href={`/transfers/new/send?recipient=${encodeURIComponent(label)}`}
              />
            }
          >
            Start transfer <ArrowRight data-icon="inline-end" />
          </Button>
          <p className="mt-5 flex justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Onchain. Direct. Non-custodial.
          </p>
        </section>
      </main>
    )
  }

  if (error)
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage error={error} onRetry={retry} />
      </main>
    )
  if (isLoading || !data)
    return <main className="min-h-svh animate-pulse bg-neutral-950" />

  const request = data
  const configurationValid =
    request.chainId === 8453 &&
    request.token.toLowerCase() === GOT_BASE_USDC.toLowerCase() &&
    request.intentAddress.toLowerCase() === parsed.link.address.toLowerCase()
  const alreadySettled =
    request.status === "settled" || request.status === "overpaid"
  const gross = { ...request.value, amount: request.grossQuotedAmount }
  async function transfer() {
    if (!configurationValid) return
    setIsTransferring(true)
    setTransferError(null)
    try {
      const hash = await transferUSDC(
        request.intentAddress,
        request.grossQuotedAmount,
        account
      )
      const receiptParams = new URLSearchParams({ transaction: hash })
      router.push(`/receipt/${encodeURIComponent(request.id)}?${receiptParams}`)
    } catch (reason) {
      setTransferError(
        reason instanceof Error
          ? reason.message
          : "The transfer could not be submitted."
      )
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0b0b0b] text-white">
      <header className="flex h-18 items-center justify-between border-b border-white/15 px-5 sm:px-8">
        <Brand inverse compact />
        <span className="flex items-center gap-2 text-xs text-white/60">
          <span className="size-1.5 rounded-full bg-blue-600" />
          Base network
        </span>
      </header>
      <main className="mx-auto grid w-full max-w-4xl flex-1 items-stretch px-4 py-10 md:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-t-2xl bg-white p-7 text-center text-[#111] md:rounded-l-2xl md:rounded-tr-none md:p-10">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#111] text-sm font-semibold text-white">
            {data.recipient.slice(0, 1).toUpperCase()}
          </span>
          <p className="mt-4 text-sm text-neutral-500">
            Transfer to{" "}
            <strong className="text-[#111]">{data.recipient}</strong>
          </p>
          <h1 className="mt-7 text-5xl font-semibold tracking-[-0.065em] sm:text-6xl">
            {formatMoney(gross, 2).replace(` ${gross.symbol}`, "")}
          </h1>
          <p className="mt-2 text-sm font-medium text-neutral-500">
            USDC · Base 🟦
          </p>
          {(data.note || data.reference) && (
            <div className="mt-8 rounded-lg border border-neutral-200 p-4 text-left">
              <small className="text-neutral-500">
                {data.reference ? "Reference" : "Note"}
              </small>
              <p className="mt-1 text-sm">{data.reference ?? data.note}</p>
              {data.reference && data.note && (
                <p className="mt-2 text-xs text-neutral-500">{data.note}</p>
              )}
            </div>
          )}
          {data.feeAmount !== "0" && (
            <div className="mt-3 flex justify-between rounded-lg bg-neutral-100 p-3 text-xs">
              <span className="text-neutral-500">Execution/service fee</span>
              <strong>
                {formatMoney({ ...data.value, amount: data.feeAmount })}
              </strong>
            </div>
          )}
          {!configurationValid && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
              This link does not match the canonical Base GOT deployment and
              cannot be funded here.
            </p>
          )}
          {transferError && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-xs text-red-700">
              {transferError}
            </p>
          )}
          <Button
            className="mt-5 h-12 w-full bg-[#111] text-white hover:bg-neutral-800"
            disabled={!configurationValid || alreadySettled || isTransferring}
            onClick={() => void transfer()}
          >
            {alreadySettled
              ? "Transfer complete"
              : isTransferring
                ? "Confirming with Base…"
                : `Transfer ${formatMoney(gross)}`}
            <ArrowRight data-icon="inline-end" />
          </Button>
          <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
            <ShieldCheck className="size-3.5" />
            You&apos;ll confirm this transfer in your Base Account
          </p>
        </section>
        <aside className="rounded-b-2xl border border-white/15 p-7 md:rounded-r-2xl md:rounded-bl-none md:border-l-0 md:p-9">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.14em] text-white/45">
                TRANSFER DETAILS
              </p>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.04em]">
                Onchain underneath.
              </h2>
            </div>
            <QRCodeImage value={request.intentAddress} size={86} inverse />
          </div>
          <dl className="mt-8 divide-y divide-white/15 text-xs">
            <div className="flex items-center justify-between gap-4 py-4">
              <dt className="text-white/45">Transfer address</dt>
              <dd className="flex items-center gap-2 font-mono">
                {shortAddress(data.intentAddress)}
                <CopyButton
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                  value={data.intentAddress}
                  label=""
                />
              </dd>
            </div>
            <div className="flex justify-between py-4">
              <dt className="text-white/45">Network</dt>
              <dd>Base · 8453</dd>
            </div>
            <div className="flex justify-between py-4">
              <dt className="text-white/45">Token</dt>
              <dd>USDC</dd>
            </div>
            <div className="flex justify-between py-4">
              <dt className="text-white/45">Status</dt>
              <dd>
                <StatusBadge status={data.status} />
              </dd>
            </div>
          </dl>
          <p className="mt-7 flex gap-2 text-xs text-white/45">
            <ShieldCheck className="size-4" />
            Onchain. Direct. Non-custodial.
          </p>
          {data.transactionHash && (
            <a
              href={`https://basescan.org/tx/${data.transactionHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 text-xs text-white/60 hover:text-white"
            >
              View current transaction <ExternalLink className="size-3.5" />
            </a>
          )}
        </aside>
      </main>
      <footer className="flex h-14 items-center justify-between border-t border-white/15 px-5 text-[11px] text-white/40 sm:px-8">
        <span>
          Powered by <strong className="text-foreground">got.cx</strong>
        </span>
        <span>Global Onchain Transfers</span>
      </footer>
    </div>
  )
}
