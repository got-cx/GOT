"use client"

import { ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { parseUnits, type Address } from "viem"

import {
  createGOTProtocolClient,
  deserializeIntentConfig,
  formatIdentityLabel,
  parseGOTLink,
  remainingTransferAmount,
  type AddressRecord,
} from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { QRCodeImage } from "@/components/shared/qr-code"
import { useAPIResource } from "@/hooks/use-api-resource"
import { appConfig } from "@/lib/app-config"
import { transferUSDC } from "@/lib/base-transactions"
import { formatMoney } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

function PublicIntentAddress({
  address,
  account,
}: {
  address: AddressRecord
  account: Address | null
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const protocol = useMemo(
    () =>
      createGOTProtocolClient(appConfig.baseRpcUrl, appConfig.baseRpcFallback),
    []
  )
  const [amount, setAmount] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)
  const chainQuery = useQuery({
    queryKey: ["got-chain", "transfer-intent", address.intentAddress],
    queryFn: async () => {
      const [snapshot] = await protocol.readIntentSnapshots([
        {
          intentAddress: address.intentAddress,
          config: deserializeIntentConfig(address.intentConfig),
        },
      ])
      if (!snapshot) throw new Error("The live Intent snapshot is missing.")
      return snapshot
    },
    refetchInterval: 15_000,
  })
  const target =
    chainQuery.data?.config.amount ?? BigInt(address.intentConfig.amount)
  const reusable = target === 0n
  const remaining = chainQuery.data
    ? remainingTransferAmount(
        target,
        chainQuery.data.totalProcessed,
        chainQuery.data.balance
      )
    : 0n
  const transferAmount = reusable
    ? (() => {
        try {
          return parseUnits(amount || "0", 6)
        } catch {
          return 0n
        }
      })()
    : remaining

  async function transfer() {
    if (transferAmount <= 0n) return
    setIsTransferring(true)
    setError(null)
    try {
      const refreshed = await chainQuery.refetch()
      if (refreshed.error || !refreshed.data) {
        throw refreshed.error ?? new Error("Unable to verify the live state.")
      }
      const liveTarget = refreshed.data.config.amount
      const liveTransferAmount =
        liveTarget === 0n
          ? transferAmount
          : remainingTransferAmount(
              liveTarget,
              refreshed.data.totalProcessed,
              refreshed.data.balance
            )
      if (liveTransferAmount <= 0n) {
        throw new Error("This Address has already received its target.")
      }
      const hash = await transferUSDC(
        address.intentAddress,
        liveTransferAmount.toString(),
        account
      )
      const receipt = await protocol.waitForTransaction(hash)
      if (receipt.status !== "success") {
        throw new Error("The transfer wasn’t completed. Please try again.")
      }
      if (liveTarget === 0n) setAmount("")
      void queryClient.invalidateQueries({
        queryKey: ["got-chain", "transfer-intent", address.intentAddress],
      })
      router.push(`/receipt/${hash}`)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "The transfer could not be completed."
      )
    } finally {
      setIsTransferring(false)
    }
  }

  const displayAmount = reusable
    ? amount
    : chainQuery.data
      ? formatMoney({
          amount: remaining.toString(),
          decimals: 6,
          symbol: "USDC",
        }).replace(" USDC", "")
      : "—"
  return (
    <div className="flex min-h-svh flex-col bg-[#0b0b0b] text-white">
      <header className="mx-auto flex h-18 w-full max-w-5xl items-center px-5 sm:px-8">
        <Brand inverse />
      </header>
      <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-8">
        <section className="w-full overflow-hidden rounded-3xl bg-white p-7 text-[#111] sm:p-9">
          <p className="text-[11px] font-semibold tracking-[0.15em] text-neutral-500">
            INTENT ADDRESS
          </p>
          <h1 className="text-md mt-2 font-semibold tracking-[-0.05em]">
            {address.ref}
          </h1>
          <div className="mt-8">
            {reusable ? (
              <label>
                <span className="text-sm font-medium">Amount</span>
                <div className="mt-2 flex items-center gap-3">
                  <Input
                    value={amount}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="h-14 text-2xl"
                    autoFocus={true}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                  <span className="font-medium text-neutral-500">USDC</span>
                </div>
              </label>
            ) : (
              <div className="text-center">
                <strong className="text-5xl tracking-[-0.06em]">
                  {displayAmount}
                </strong>
                <span className="ml-2 text-sm text-neutral-500">USDC</span>
                <p className="mt-2 text-xs text-neutral-500">Remaining</p>
              </div>
            )}
          </div>
          {error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          {chainQuery.error && !error && (
            <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              We couldn&apos;t verify the current onchain state. Please try
              again.
            </p>
          )}
          <Button
            className="mt-4 h-12 w-full bg-[#111] text-white hover:bg-neutral-800"
            disabled={
              !chainQuery.data ||
              Boolean(chainQuery.error) ||
              transferAmount <= 0n ||
              isTransferring
            }
            onClick={() => void transfer()}
          >
            {chainQuery.isLoading
              ? "Checking state…"
              : chainQuery.error
                ? "State unavailable"
                : !reusable && remaining === 0n
                  ? "Target received"
                  : isTransferring
                    ? "Transferring…"
                    : "Transfer"}
            {chainQuery.data && transferAmount > 0n && (
              <ArrowRight data-icon="inline-end" />
            )}
          </Button>
          <div className="mt-4 grid place-items-center border-t">
            <QRCodeImage value={address.intentAddress} size={196} />
            <p className="mt-3 font-mono text-xs text-neutral-500">
              {address.intentAddress}
            </p>
            <CopyButton value={address.intentAddress} label="Copy Address" />
          </div>
        </section>
      </main>
      <footer className="px-5 py-6 text-center text-[11px] text-white/40">
        Powered by got.cx · Address any intent onchain.
      </footer>
    </div>
  )
}

export function PublicRoute({ route }: { route: string }) {
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
  const { data, error, isLoading, retry } = useAPIResource(
    ["transfer-intent", intentAddress],
    async () => {
      if (!intentAddress) throw new Error("An Intent Address is required.")
      return api.addresses.getByIntentAddress(intentAddress)
    },
    Boolean(intentAddress)
  )

  if (parsed.error || !parsed.link) {
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage error={parsed.error} />
      </main>
    )
  }
  if (parsed.link.kind === "identity") {
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage
          error={`${formatIdentityLabel(parsed.link)} does not identify a hosted Intent Address.`}
        />
      </main>
    )
  }
  if (error) {
    return (
      <main className="mx-auto max-w-xl p-6 pt-24">
        <APIMessage error={error} onRetry={retry} />
      </main>
    )
  }
  if (isLoading || !data) {
    return <main className="min-h-svh animate-pulse bg-neutral-950" />
  }
  return <PublicIntentAddress address={data} account={account} />
}
