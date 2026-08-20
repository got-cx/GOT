"use client"

import { ArrowLeft, ArrowRight, ChevronDown, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"
import { getAddress, isAddress } from "viem"
import { useQueryClient } from "@tanstack/react-query"

import {
  buildRequestIntent,
  createGOTProtocolClient,
  createIdempotencyKey,
  createIntentId,
  GOT_BASE_CHAIN_ID,
  GOT_BASE_USDC,
  parseGOTLink,
  serializeIntentConfig,
} from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { Brand } from "@/components/shared/brand"
import { appConfig } from "@/lib/app-config"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"

export function SendTransferForm() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()
  const {
    account,
    error: authError,
    isLoading: isAuthLoading,
    isSigningIn,
    signIn,
  } = useAuth()
  const api = getGOTClient()
  const protocol = useMemo(
    () => createGOTProtocolClient(appConfig.baseRpcUrl),
    []
  )
  const [intentId] = useState(() => createIntentId())
  const [recipient, setRecipient] = useState(
    searchParams.get("recipient") ?? ""
  )
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [advanced, setAdvanced] = useState(false)
  const [previewAddress, setPreviewAddress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account) {
      await signIn()
      return
    }
    if (!api) {
      setError("The got.cx API is unavailable.")
      return
    }
    setIsSubmitting(true)
    setError(null)
    try {
      const direct = isAddress(recipient, { strict: false })
      if (!direct) parseGOTLink(recipient)
      const config = buildRequestIntent({
        ...(direct ? { ownerAddress: getAddress(recipient) } : { recipient }),
        amount,
        metadata: note ? JSON.stringify({ note }) : undefined,
        intentId,
      })
      const intentAddress = await protocol.previewIntent(config)
      setPreviewAddress(intentAddress)
      const transfer = await api.transfers.create(
        {
          direction: "outgoing",
          chainId: GOT_BASE_CHAIN_ID,
          recipient,
          recipientTargetAmount: config.amount.toString(),
          token: GOT_BASE_USDC,
          note: note || undefined,
          intentConfig: serializeIntentConfig(config),
        },
        createIdempotencyKey()
      )
      if (transfer.intentAddress.toLowerCase() !== intentAddress.toLowerCase())
        throw new Error(
          "The API returned an intent address that does not match the protocol preview."
        )
      void queryClient.invalidateQueries({
        queryKey: ["got-api", "transfers"],
      })
      void queryClient.invalidateQueries({
        queryKey: ["got-api", "overview"],
      })
      router.push(`/${transfer.intentAddress}`)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to create this transfer."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex h-18 max-w-6xl items-center justify-between border-b px-5">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <Brand compact />
        <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <ShieldCheck className="size-4" />
          Secure transfer
        </span>
      </header>
      <main className="mx-auto grid max-w-5xl gap-12 px-5 py-12 md:grid-cols-[1.2fr_.8fr] md:py-16">
        <section>
          <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
            SEND
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">
            Create a transfer
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Enter who it&apos;s for. GOT handles the onchain details.
          </p>
          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => void submit(event)}
          >
            <label className="block text-xs font-medium">
              <span className="mb-2 block">Recipient</span>
              <Input
                required
                value={recipient}
                onChange={(event) => {
                  setRecipient(event.target.value)
                  setPreviewAddress(null)
                }}
                className="h-11"
                placeholder="@name, social, email, phone, or 0x wallet"
              />
              <small className="mt-2 block font-normal text-muted-foreground">
                GOT name, X, Telegram, email, phone, or wallet address
              </small>
            </label>
            <div className="grid gap-4 sm:grid-cols-[1.3fr_.7fr]">
              <label className="block text-xs font-medium">
                <span className="mb-2 block">Amount</span>
                <div className="relative">
                  <Input
                    required
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    inputMode="decimal"
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
                className={`size-4 ${advanced ? "rotate-180" : ""}`}
              />
            </button>
            {advanced && (
              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/40 p-3 text-[11px]">
                <span>
                  <small className="block text-muted-foreground">
                    Protocol fee
                  </small>
                  <strong>0 bps</strong>
                </span>
                <span>
                  <small className="block text-muted-foreground">Partner</small>
                  <strong>None</strong>
                </span>
                <span>
                  <small className="block text-muted-foreground">
                    Settlement
                  </small>
                  <strong>Direct</strong>
                </span>
              </div>
            )}
            {(error || authError) && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {error ?? authError}
              </p>
            )}
            <Button
              type={account ? "submit" : "button"}
              className="h-11 w-full"
              onClick={account ? undefined : () => void signIn()}
              disabled={
                !api ||
                !recipient ||
                !amount ||
                isAuthLoading ||
                isSigningIn ||
                isSubmitting
              }
            >
              {isSigningIn
                ? "Authenticating…"
                : !account
                  ? "Continue with Base passkey"
                  : isSubmitting
                    ? "Creating transfer…"
                    : "Create transfer"}
              <ArrowRight data-icon="inline-end" />
            </Button>
          </form>
        </section>
        <aside className="h-max rounded-xl border bg-muted/40 p-5 md:sticky md:top-8">
          <p className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground">
            TRANSFER PREVIEW
          </p>
          <div className="mt-3 rounded-lg border bg-background p-4">
            <small className="text-muted-foreground">Recipient</small>
            <strong className="mt-1 block truncate">
              {recipient || "Recipient not entered"}
            </strong>
            {previewAddress && (
              <>
                <small className="mt-4 block text-muted-foreground">
                  Deterministic address
                </small>
                <strong className="mt-1 block truncate font-mono text-xs">
                  {previewAddress}
                </strong>
              </>
            )}
          </div>
          <dl className="mt-4 divide-y text-xs">
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Token</dt>
              <dd className="font-medium">USDC</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Network</dt>
              <dd className="font-medium">Base</dd>
            </div>
            <div className="flex justify-between py-3">
              <dt className="text-muted-foreground">Settlement</dt>
              <dd className="font-medium">Direct to recipient</dd>
            </div>
          </dl>
          <p className="mt-3 flex gap-2 text-[11px] leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
            The specific 0x transfer link is created from immutable protocol
            configuration.
          </p>
        </aside>
      </main>
    </div>
  )
}
