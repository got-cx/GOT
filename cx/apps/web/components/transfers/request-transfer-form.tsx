"use client"

import { ArrowLeft, ArrowRight, ChevronDown, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

import {
  buildRequestIntent,
  createGOTProtocolClient,
  createIdempotencyKey,
  deriveIntentId,
  GOT_BASE_CHAIN_ID,
  GOT_BASE_USDC,
  serializeIntentConfig,
} from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { useAPIResource } from "@/hooks/use-api-resource"
import { appConfig } from "@/lib/app-config"
import { getGOTClient } from "@/lib/got-client"
import { shortAddress } from "@/lib/format"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

export function RequestTransferForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { account } = useAuth()
  const api = getGOTClient()
  const protocol = useMemo(
    () => createGOTProtocolClient(appConfig.baseRpcUrl),
    []
  )
  const [requestId, setRequestId] = useState("")
  const [receiveTo, setReceiveTo] = useState("")
  const [amount, setAmount] = useState("")
  const [sender, setSender] = useState("")
  const [reference, setReference] = useState("")
  const [note, setNote] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [advanced, setAdvanced] = useState(false)
  const [previewAddress, setPreviewAddress] = useState<`0x${string}` | null>(
    null
  )
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  const { data: namesData } = useAPIResource(
    ["names"],
    () => api.names.list(),
    Boolean(api)
  )

  const choices = useMemo(
    () => [
      ...(namesData?.items ?? [])
        .filter((name) => name.verified)
        .map((name) => ({
          value: `identity:${name.label}`,
          label: name.label,
          detail: name.kind,
        })),
      ...(account
        ? [
            {
              value: `wallet:${account}`,
              label: shortAddress(account),
              detail: "Base Account",
            },
          ]
        : []),
    ],
    [account, namesData]
  )
  const selected = receiveTo || choices[0]?.value || ""

  const buildConfig = useCallback(() => {
    if (!account)
      throw new Error("Sign in with the receiving Base Account first.")
    if (!selected)
      throw new Error("Sign in or verify a GOT name before creating a request.")
    const metadata = JSON.stringify({
      reference: reference || undefined,
      note: note || undefined,
      sender: sender || undefined,
    })
    return buildRequestIntent({
      ...(selected.startsWith("wallet:")
        ? { ownerAddress: selected.slice(7) as `0x${string}` }
        : { recipient: selected.slice(9) }),
      amount,
      dueAt: dueAt ? new Date(`${dueAt}T23:59:59`).toISOString() : undefined,
      metadata,
      intentId: deriveIntentId(requestId, account),
      authorizedResolver: account,
    })
  }, [account, amount, dueAt, note, reference, requestId, selected, sender])

  async function preview() {
    setError(null)
    setIsPreviewing(true)
    try {
      setPreviewAddress(await protocol.previewIntent(buildConfig()))
    } catch (reason) {
      setPreviewAddress(null)
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to preview this transfer request."
      )
    } finally {
      setIsPreviewing(false)
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const config = buildConfig()
      const intentAddress =
        previewAddress ?? (await protocol.previewIntent(config))
      const recipientLabel =
        choices.find((choice) => choice.value === selected)?.label ?? selected
      const dueAtValue = dueAt
        ? new Date(`${dueAt}T23:59:59`).toISOString()
        : null
      const indexedRequest = await api.transfers.createRequest(
        {
          chainId: GOT_BASE_CHAIN_ID,
          requestId: requestId.trim(),
          recipient: recipientLabel,
          recipientTargetAmount: config.amount.toString(),
          token: GOT_BASE_USDC,
          sender: sender || undefined,
          reference: reference || undefined,
          note: note || undefined,
          dueAt: dueAtValue ?? undefined,
          intentConfig: serializeIntentConfig(config),
        },
        createIdempotencyKey()
      )
      if (
        indexedRequest.intentAddress.toLowerCase() !==
        intentAddress.toLowerCase()
      )
        throw new Error(
          "The API returned an intent address that does not match the protocol preview."
        )
      void queryClient.invalidateQueries({
        queryKey: ["got-api", "transfers"],
      })
      void queryClient.invalidateQueries({
        queryKey: ["got-api", "overview"],
      })
      router.push(`/transfers/requests/${encodeURIComponent(intentAddress)}`)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create this request."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const recipientLabel =
    choices.find((choice) => choice.value === selected)?.label ??
    "Select a recipient"
  const displayAmount =
    amount && Number.isFinite(Number(amount))
      ? Number(amount).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "—"
  const previewUrl = previewAddress
    ? `${appConfig.siteUrl}/${shortAddress(previewAddress)}`
    : isPreviewing
      ? "Deriving address…"
      : `${appConfig.siteUrl}/0x...`

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-18 max-w-6xl items-center justify-between border-b px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Brand compact />
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <ShieldCheck className="size-4" />
          Secure transfer request
        </span>
      </header>
      <main className="mx-auto grid max-w-5xl gap-12 px-5 py-12 md:grid-cols-[1.2fr_.8fr] md:py-16">
        <section>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
            REQUEST TRANSFER
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">
            Request a transfer
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Create a link someone can use to transfer funds to you.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => void submit(event)}
          >
            <label className="block text-xs font-medium">
              <span className="mb-2 block">Receive to</span>
              <select
                required
                value={selected}
                onChange={(event) => {
                  setReceiveTo(event.target.value)
                  setPreviewAddress(null)
                }}
                className="h-11 w-full rounded-lg border bg-background px-3 text-sm"
              >
                {!choices.length && (
                  <option value="">Sign in or verify a name</option>
                )}
                {choices.map((choice) => (
                  <option key={choice.value} value={choice.value}>
                    {choice.label} · {choice.detail}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-[1.3fr_.7fr]">
              <label className="block text-xs font-medium">
                <span className="mb-2 block">Amount</span>
                <div className="relative">
                  <Input
                    required
                    min="0.000001"
                    step="0.000001"
                    inputMode="decimal"
                    type="number"
                    value={amount}
                    onChange={(event) => {
                      setAmount(event.target.value)
                      setPreviewAddress(null)
                    }}
                    className="h-11 pr-16 text-base"
                    placeholder="0.00"
                  />
                  <span className="absolute top-3 right-3 text-sm text-muted-foreground">
                    USDC
                  </span>
                </div>
              </label>
              <label className="block text-xs font-medium">
                <span className="mb-2 block">Network</span>
                <div className="flex h-11 items-center gap-2 rounded-lg border px-3 text-sm">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Base
                </div>
              </label>
            </div>
            <label className="block text-xs font-medium">
              <span className="mb-2 block">ID</span>
              <Input
                required
                value={requestId}
                onChange={(event) => {
                  setRequestId(event.target.value)
                  setPreviewAddress(null)
                }}
                className="h-11"
                placeholder="e.g. invoice-2026-001"
                maxLength={120}
                autoComplete="off"
              />
            </label>
            <label className="block text-xs font-medium">
              <span className="mb-2 flex justify-between">
                Note{" "}
                <em className="font-normal text-muted-foreground not-italic">
                  Optional
                </em>
              </span>
              <Textarea
                value={note}
                onChange={(event) => {
                  setNote(event.target.value)
                  setPreviewAddress(null)
                }}
                placeholder="What is this transfer for?"
              />
            </label>
            <button
              type="button"
              onClick={() => setAdvanced((value) => !value)}
              className="flex w-full items-center justify-between text-xs text-muted-foreground"
            >
              Advanced options{" "}
              <ChevronDown
                className={`size-4 transition-transform ${advanced ? "rotate-180" : ""}`}
              />
            </button>
            {advanced && (
              <div className="space-y-4 rounded-lg border bg-muted/40 p-3">
                <label className="block text-xs font-medium">
                  <span className="mb-2 flex justify-between">
                    From{" "}
                    <em className="font-normal text-muted-foreground not-italic">
                      Optional
                    </em>
                  </span>
                  <Input
                    value={sender}
                    onChange={(event) => {
                      setSender(event.target.value)
                      setPreviewAddress(null)
                    }}
                    className="h-11"
                    placeholder="Name or email"
                  />
                </label>
                <label className="block text-xs font-medium">
                  <span className="mb-2 flex justify-between">
                    Reference{" "}
                    <em className="font-normal text-muted-foreground not-italic">
                      Optional
                    </em>
                  </span>
                  <Input
                    value={reference}
                    onChange={(event) => {
                      setReference(event.target.value)
                      setPreviewAddress(null)
                    }}
                    className="h-11"
                    placeholder="Reference number"
                  />
                </label>
                <label className="block text-xs font-medium">
                  <span className="mb-2 flex justify-between">
                    Due date{" "}
                    <em className="font-normal text-muted-foreground not-italic">
                      Optional
                    </em>
                  </span>
                  <Input
                    type="date"
                    value={dueAt}
                    onChange={(event) => {
                      setDueAt(event.target.value)
                      setPreviewAddress(null)
                    }}
                    className="h-11"
                  />
                </label>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <span>
                    <small className="block text-muted-foreground">
                      Protocol fee
                    </small>
                    <strong>0 bps</strong>
                  </span>
                  <span>
                    <small className="block text-muted-foreground">Token</small>
                    <strong>Base USDC</strong>
                  </span>
                  <span>
                    <small className="block text-muted-foreground">
                      Settlement
                    </small>
                    <strong>Direct</strong>
                  </span>
                </div>
              </div>
            )}
            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() => void preview()}
                disabled={
                  !amount || !selected || !requestId.trim() || isPreviewing
                }
              >
                {isPreviewing ? "Previewing…" : "Preview"}
              </Button>
              <Button
                type="submit"
                className="h-11"
                disabled={
                  !api ||
                  !amount ||
                  !selected ||
                  !requestId.trim() ||
                  isSubmitting
                }
              >
                {isSubmitting ? "Creating request…" : "Create request"}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </form>
        </section>
        <aside className="h-max rounded-xl border bg-muted/40 p-5 md:sticky md:top-8">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
            TRANSFER PREVIEW
          </p>
          <div className="mt-3 rounded-lg border bg-background p-4">
            <small className="text-muted-foreground">Recipient</small>
            <strong className="mt-1 block truncate">{recipientLabel}</strong>
            <small className="mt-4 block text-muted-foreground">
              Transfer URL
            </small>
            <strong className="mt-1 block font-mono text-xs">
              {previewUrl}
            </strong>
          </div>
          <dl className="mt-4 divide-y text-xs">
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Amount</dt>
              <dd className="font-medium">{displayAmount} USDC</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Network</dt>
              <dd className="font-medium">Base</dd>
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="flex min-w-0 items-center gap-2 font-mono">
                <span className="max-w-28 truncate">{requestId || "—"}</span>
                {requestId && <CopyButton value={requestId} label="Copy" />}
              </dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Settlement</dt>
              <dd className="font-medium">Direct to recipient</dd>
            </div>
          </dl>
          <p className="mt-3 flex gap-2 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            The transfer address is ready to receive USDC
          </p>
        </aside>
      </main>
    </div>
  )
}
