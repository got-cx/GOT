"use client"

import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  WalletCards,
} from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { getAddress, isAddress, type Address, type Hash } from "viem"

import { createGOTProtocolClient, deserializeIntentConfig } from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { CopyButton } from "@/components/shared/copy-button"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { appConfig } from "@/lib/app-config"
import { deployAndResolveIntent, resolveIntent } from "@/lib/base-transactions"
import { formatDate, formatMoney, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { transferPaymentLink } from "@/lib/transfer-envelope"
import { Button } from "@workspace/ui/components/button"

function liveStatus(
  balance: bigint,
  totalProcessed: bigint,
  target: bigint,
  deployed: boolean
) {
  if (balance > 0n) return "ready_to_resolve"
  if (totalProcessed > target) return "overpaid"
  if (totalProcessed === target && target > 0n) return "settled"
  if (totalProcessed > 0n) return "partial"
  return deployed ? "deployed" : "awaiting_funding"
}

export function TransferDetails({ intentAddress }: { intentAddress: string }) {
  const client = getGOTClient()
  const { account, isLoading: isAuthLoading } = useAuth()
  const protocol = useMemo(
    () => createGOTProtocolClient(appConfig.baseRpcUrl),
    []
  )
  const routeAddress = useMemo<Address | null>(
    () =>
      isAddress(intentAddress, { strict: false })
        ? getAddress(intentAddress)
        : null,
    [intentAddress]
  )
  const transferQuery = useQuery({
    queryKey: ["got-api", "transfer-intent", routeAddress],
    queryFn: () => client.transfers.getByIntent(routeAddress as Address),
    enabled: Boolean(account && !isAuthLoading && routeAddress),
  })
  const transfer = transferQuery.data
  const chainQuery = useQuery({
    queryKey: ["got-chain", "intent", transfer?.intentAddress],
    queryFn: async () => {
      if (!transfer) throw new Error("Transfer data is required.")
      if (transfer.intentConfig) {
        const preview = await protocol.previewIntent(
          deserializeIntentConfig(transfer.intentConfig)
        )
        if (preview !== transfer.intentAddress) {
          throw new Error(
            "The API intent configuration does not derive this address."
          )
        }
      }
      return protocol.readIntentState(transfer.intentAddress)
    },
    enabled: Boolean(transfer),
    refetchInterval: 15_000,
  })
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null)

  async function resolveFunds() {
    if (!transfer?.intentConfig || !chainQuery.data) return
    setIsActing(true)
    setResolveError(null)
    setTransactionHash(null)
    try {
      const hash = chainQuery.data.deployed
        ? await resolveIntent(transfer.intentAddress)
        : await deployAndResolveIntent(
            transfer.intentAddress,
            deserializeIntentConfig(transfer.intentConfig)
          )
      setTransactionHash(hash)
      await protocol.waitForTransaction(hash)
      await chainQuery.refetch()
    } catch (reason) {
      setResolveError(
        reason instanceof Error
          ? reason.message
          : "The intent could not be resolved."
      )
    } finally {
      setIsActing(false)
    }
  }

  if (isAuthLoading) {
    return <div className="h-96 animate-pulse rounded-xl border bg-muted" />
  }
  if (!account) {
    return (
      <APIMessage error="Sign in with your Base Account to view this transfer." />
    )
  }
  if (!routeAddress) {
    return <APIMessage error="This is not a valid Base intent address." />
  }
  if (transferQuery.error) {
    return (
      <APIMessage
        error={
          transferQuery.error instanceof Error
            ? transferQuery.error.message
            : "Unable to load the transfer."
        }
        onRetry={() => void transferQuery.refetch()}
      />
    )
  }
  if (transferQuery.isLoading || !transfer) {
    return <div className="h-96 animate-pulse rounded-xl border bg-muted" />
  }

  const chain = chainQuery.data
  const target = BigInt(transfer.recipientTargetAmount)
  const currentStatus = chain
    ? liveStatus(chain.balance, chain.totalProcessed, target, chain.deployed)
    : transfer.status
  const configuredResolver = transfer.intentConfig
    ? getAddress(transfer.intentConfig.authorizedResolver)
    : null
  const canResolve =
    transfer.direction === "incoming" &&
    configuredResolver === account &&
    Boolean(chain && chain.balance > 0n && transfer.intentConfig)
  const paymentLink = transferPaymentLink(transfer)

  return (
    <div>
      <Link
        href="/dashboard/transfers"
        className="mb-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Transfers
      </Link>
      <PageHeader
        eyebrow="TRANSFER"
        title={formatMoney(transfer.value, 2)}
        description={`${transfer.direction === "incoming" ? "From" : "To"} ${transfer.party}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={currentStatus} />
            <CopyButton value={paymentLink} label="Copy link" />
            <Button
              size="sm"
              variant="outline"
              render={<a href={paymentLink} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              Open link <ExternalLink data-icon="inline-end" />
            </Button>
          </div>
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium">Onchain state</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Read directly from Base. This does not depend on the indexer.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={chainQuery.isFetching}
            onClick={() => void chainQuery.refetch()}
          >
            <RefreshCw
              className={chainQuery.isFetching ? "animate-spin" : ""}
            />
            Refresh
          </Button>
        </div>

        {chainQuery.error ? (
          <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {chainQuery.error instanceof Error
              ? chainQuery.error.message
              : "Unable to read Base state."}
          </p>
        ) : !chain ? (
          <div className="mt-5 h-32 animate-pulse rounded-lg bg-muted" />
        ) : (
          <dl className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-4">
              <dt className="text-[11px] text-muted-foreground">
                Available balance
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatMoney(
                  {
                    amount: chain.balance.toString(),
                    decimals: 6,
                    symbol: "USDC",
                  },
                  2
                )}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-[11px] text-muted-foreground">
                Total resolved
              </dt>
              <dd className="mt-1 text-lg font-semibold">
                {formatMoney(
                  {
                    amount: chain.totalProcessed.toString(),
                    decimals: 6,
                    symbol: "USDC",
                  },
                  2
                )}
              </dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-[11px] text-muted-foreground">Contract</dt>
              <dd className="mt-1 text-lg font-semibold">
                {chain.deployed ? "Deployed" : "Not deployed"}
              </dd>
            </div>
          </dl>
        )}

        {chain && transfer.direction === "incoming" && (
          <div className="mt-5 flex flex-col justify-between gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-center">
            <div>
              <strong className="block text-sm">
                {chain.balance > 0n
                  ? chain.deployed
                    ? "Resolve available USDC"
                    : "Deploy intent and resolve USDC"
                  : chain.totalProcessed > 0n
                    ? "No unresolved balance"
                    : "Waiting for the sender"}
              </strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {chain.deployed
                  ? "The intent contract already exists on Base."
                  : "Deployment occurs only when you choose to receive the funds."}
              </span>
            </div>
            <Button
              disabled={!canResolve || isActing}
              onClick={() => void resolveFunds()}
            >
              {isActing
                ? "Confirming…"
                : chain.deployed
                  ? "Resolve"
                  : "Deploy & resolve"}
            </Button>
          </div>
        )}

        {transactionHash && (
          <a
            href={`https://basescan.org/tx/${transactionHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-xs text-emerald-700 hover:underline dark:text-emerald-400"
          >
            <CheckCircle2 className="size-3.5" />
            View transaction on Basescan
            <ExternalLink className="size-3" />
          </a>
        )}
        {resolveError && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {resolveError}
          </p>
        )}
      </section>

      <section className="mt-5 rounded-xl border bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-muted">
            <WalletCards className="size-4" />
          </span>
          <h2 className="text-sm font-medium">Transfer details</h2>
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Intent address</dt>
            <dd className="mt-1 flex items-center gap-2 font-mono">
              {shortAddress(transfer.intentAddress, 8)}
              <CopyButton value={transfer.intentAddress} label="Copy" />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">ID</dt>
            <dd className="mt-1 flex items-center gap-2 font-mono">
              <span className="max-w-48 truncate">
                {transfer.requestId ?? "—"}
              </span>
              {transfer.requestId && (
                <CopyButton value={transfer.requestId} label="Copy" />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Protocol intent ID</dt>
            <dd className="mt-1 flex items-center gap-2 font-mono">
              {transfer.intentConfig
                ? shortAddress(transfer.intentConfig.intentId, 8)
                : "—"}
              {transfer.intentConfig && (
                <CopyButton
                  value={transfer.intentConfig.intentId}
                  label="Copy"
                />
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">API status</dt>
            <dd className="mt-1">
              <StatusBadge status={transfer.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="mt-1 font-medium">
              {formatDate(transfer.createdAt, true)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Recipient</dt>
            <dd className="mt-1 font-medium">
              {transfer.recipient ?? transfer.party}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="mt-1 font-medium">{transfer.reference ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Network</dt>
            <dd className="mt-1 font-medium">Base</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
