"use client"

import { ArrowRight, ExternalLink, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createGOTProtocolClient,
  deserializeIntentConfig,
  formatIdentityLabel,
  GOT_BASE_USDC,
  parseGOTLink,
  remainingTransferAmount,
  transferStatusFromChain,
} from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { QRCodeImage } from "@/components/shared/qr-code"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { appConfig } from "@/lib/app-config"
import { transferUSDC } from "@/lib/base-transactions"
import { formatMoney, humanIdentity, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"

export function PublicRoute({ route }: { route: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { account } = useAuth()
  const api = getGOTClient()
  const protocol = useMemo(
    () =>
      createGOTProtocolClient(
        appConfig.baseRpcUrl,
        appConfig.baseRpcFallback
      ),
    []
  )
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
  const chainQuery = useQuery({
    queryKey: ["got-chain", "public-intent", data?.intentAddress],
    queryFn: async () => {
      if (!data?.intentConfig)
        throw new Error("The transfer recovery configuration is missing.")
      const config = deserializeIntentConfig(data.intentConfig)
      const [snapshot] = await protocol.readIntentSnapshots([
        { intentAddress: data.intentAddress, config },
      ])
      if (!snapshot) throw new Error("The live intent snapshot is missing.")
      return snapshot
    },
    enabled: Boolean(data?.intentConfig),
    refetchInterval: 15_000,
  })
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
        <section className="w-full max-w-md rounded-3xl bg-background p-8 text-foreground">
          <Brand />
          <p className="mt-14 text-xs font-medium text-muted-foreground">
            Transfer to
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.055em]">
            {label}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose an amount and add a note. GOT will handle the rest.
          </p>
          <Button
            className="mt-8 h-11 w-full"
            nativeButton={false}
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
            Secure transfer with GOT
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
    request.intentAddress.toLowerCase() === parsed.link.address.toLowerCase() &&
    Boolean(request.intentConfig)
  const target = BigInt(request.recipientTargetAmount)
  const remaining = chainQuery.data
    ? remainingTransferAmount(
        target,
        chainQuery.data.totalProcessed,
        chainQuery.data.balance
      )
    : target
  const amountDue = { ...request.value, amount: remaining.toString() }
  const fullyFunded = Boolean(chainQuery.data && remaining === 0n)
  const currentStatus = chainQuery.data
    ? transferStatusFromChain(
        target,
        chainQuery.data.totalProcessed,
        chainQuery.data.balance
      )
    : data.status
  const recipientLabel = humanIdentity(request.recipient)

  async function transfer() {
    if (!configurationValid) return
    setIsTransferring(true)
    setTransferError(null)
    try {
      const refreshed = await chainQuery.refetch()
      if (refreshed.error || !refreshed.data) {
        throw refreshed.error ?? new Error("Unable to verify the live balance.")
      }
      const currentAmount = remainingTransferAmount(
        target,
        refreshed.data.totalProcessed,
        refreshed.data.balance
      )
      if (currentAmount === 0n) {
        throw new Error("This transfer is already complete.")
      }
      const hash = await transferUSDC(
        request.intentAddress,
        currentAmount.toString(),
        account
      )
      const receipt = await protocol.waitForTransaction(hash)
      if (receipt.status !== "success") {
        throw new Error("The transfer wasn’t completed. Please try again.")
      }
      const fundedTransfer = await api.transfers.recordFunding(request.id, hash)
      queryClient.setQueryData(
        ["got-api", "transfer-intent", request.intentAddress],
        fundedTransfer
      )
      await Promise.all([
        chainQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["got-api", "transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "overview"] }),
      ])
      const receiptParams = new URLSearchParams({ transaction: hash })
      router.push(`/receipt/${encodeURIComponent(request.id)}?${receiptParams}`)
    } catch (reason) {
      setTransferError(
        reason instanceof Error
          ? reason.message
          : "The transfer could not be completed."
      )
    } finally {
      setIsTransferring(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0b0b0b] text-white">
      <header className="mx-auto flex h-18 w-full max-w-5xl items-center px-5 sm:px-8">
        <Brand inverse compact />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-6 sm:px-6 sm:py-10">
        <div className="w-full overflow-hidden rounded-3xl bg-white text-[#111] shadow-2xl shadow-black/20">
          <section className="px-6 py-7 text-center sm:px-8 sm:py-8">
            <div className="flex items-center justify-between gap-4 text-left">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold tracking-[0.15em] text-neutral-500">
                  ONCHAIN TRANSFER
                </p>

                <p className="mt-1 truncate text-sm">
                  <span className="text-neutral-500">to: </span>
                  <strong className="font-semibold">{recipientLabel}</strong>
                </p>
              </div>
              <StatusBadge status={currentStatus} />
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <strong className="text-5xl font-semibold tracking-[-0.065em] sm:text-6xl">
                {formatMoney(amountDue).replace(` ${amountDue.symbol}`, "")}
              </strong>
              <span className="text-sm font-medium text-neutral-500">
                {amountDue.symbol} · Base 🟦
              </span>
            </div>
            {(request.note || request.reference) && (
              <div className="mx-auto mt-5 max-w-sm">
                <p className="text-base leading-6">
                  {request.reference ?? request.note}
                </p>
                {request.reference && request.note && (
                  <p className="mt-1 text-sm text-neutral-500">
                    {request.note}
                  </p>
                )}
              </div>
            )}
            {request.feeAmount !== "0" && (
              <p className="mt-5 text-xs text-neutral-500">
                Service fee:{" "}
                {formatMoney({ ...request.value, amount: request.feeAmount })}
              </p>
            )}
            {!configurationValid && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                This transfer link can&apos;t be verified and can&apos;t be
                completed here.
              </p>
            )}
            {chainQuery.error && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                We couldn&apos;t verify the current transfer status. Please try
                again.
              </p>
            )}
            {transferError && (
              <p className="mt-5 rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {transferError}
              </p>
            )}
            <Button
              className="mt-6 h-12 w-full bg-[#111] text-base text-white hover:bg-neutral-800"
              disabled={
                !configurationValid ||
                !chainQuery.data ||
                Boolean(chainQuery.error) ||
                fullyFunded ||
                isTransferring
              }
              onClick={() => void transfer()}
            >
              {fullyFunded
                ? "Transfer complete"
                : chainQuery.isLoading
                  ? "Checking transfer…"
                  : isTransferring
                    ? "Completing transfer…"
                    : "Transfer"}
              {!fullyFunded && <ArrowRight data-icon="inline-end" />}
            </Button>
            <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-neutral-500">
              <ShieldCheck className="size-3.5" />
              You&apos;ll confirm in your Base Account
            </p>

            <div className="-mx-6 mt-6 -mb-7 bg-[#111] px-6 pt-8 pb-7 text-white sm:-mx-8 sm:-mb-8 sm:px-8 sm:pb-8">
              <div className="mx-auto w-max rounded-2xl border border-white/15 bg-[#111] p-3">
                <QRCodeImage value={request.intentAddress} size={216} inverse />
              </div>
              <p className="mx-auto mt-3 max-w-xs text-xs leading-5 text-white/50">
                Scan in another app or exchange to send {amountDue.symbol} on
                Base
              </p>
              <OnchainDetails
                inverse
                className="mt-5 border-t border-white/15 text-left"
                contentClassName="pb-0"
              >
                <dl className="divide-y divide-white/15 border-t border-white/15">
                  <div className="flex justify-between gap-4 py-3">
                    <dt>Network</dt>
                    <dd className="font-medium text-white">Base · 8453</dd>
                  </div>
                  <div className="flex justify-between gap-4 py-3">
                    <dt>Token</dt>
                    <dd className="font-medium text-white">USDC</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt>GOT intent address</dt>
                    <dd className="flex items-center gap-2 font-mono text-white">
                      {shortAddress(request.intentAddress)}
                      <CopyButton
                        className="border-white/20 bg-transparent text-white hover:bg-white/10"
                        value={request.intentAddress}
                        label="Copy"
                      />
                    </dd>
                  </div>
                  {request.transactionHash && (
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt>Transaction hash</dt>
                      <dd className="flex items-center gap-2 font-mono text-white">
                        {shortAddress(request.transactionHash)}
                        <CopyButton
                          className="border-white/20 bg-transparent text-white hover:bg-white/10"
                          value={request.transactionHash}
                          label="Copy"
                        />
                      </dd>
                    </div>
                  )}
                </dl>
                {request.transactionHash && (
                  <a
                    href={`https://basescan.org/tx/${request.transactionHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 font-medium text-white hover:underline"
                  >
                    View in block explorer <ExternalLink className="size-3.5" />
                  </a>
                )}
              </OnchainDetails>
            </div>
          </section>
        </div>
      </main>
      <footer className="px-5 py-6 text-center text-[11px] text-white/40">
        Powered by got.cx · Global Onchain Transfers
      </footer>
    </div>
  )
}
