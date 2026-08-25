"use client"

import {
  ArrowLeft,
  CheckCircle2,
  Ellipsis,
  ExternalLink,
  RefreshCw,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { getAddress, isAddress, type Address, type Hash } from "viem"

import {
  createGOTProtocolClient,
  deserializeIntentConfig,
  transferStatusFromChain,
} from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { CopyButton } from "@/components/shared/copy-button"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { appConfig } from "@/lib/app-config"
import { deployAndResolveIntent, resolveIntent } from "@/lib/base-transactions"
import {
  formatDate,
  formatMoney,
  humanIdentity,
  shortAddress,
} from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { transferLink } from "@/lib/transfer-envelope"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export function TransferDetails({ intentAddress }: { intentAddress: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
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
  const lastSyncAttempt = useRef<string | null>(null)
  const syncMutation = useMutation({
    mutationFn: (id: string) => client.transfers.sync(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["got-api", "transfer-intent", routeAddress],
        }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "overview"] }),
      ])
    },
  })
  const detectedStatus =
    transfer && chainQuery.data
      ? transferStatusFromChain(
          BigInt(transfer.recipientTargetAmount),
          chainQuery.data.totalProcessed,
          chainQuery.data.balance
        )
      : null
  const needsSync = Boolean(
    transfer &&
    chainQuery.data &&
    (detectedStatus !== transfer.status ||
      chainQuery.data.totalProcessed.toString() !== transfer.processedAmount ||
      chainQuery.data.totalProcessed + chainQuery.data.balance >
        BigInt(transfer.fundedAmount))
  )

  useEffect(() => {
    if (!transfer || !chainQuery.data || !needsSync || syncMutation.isPending) {
      return
    }
    const fingerprint = [
      transfer.id,
      detectedStatus,
      chainQuery.data.balance,
      chainQuery.data.totalProcessed,
      chainQuery.dataUpdatedAt,
    ].join(":")
    if (lastSyncAttempt.current === fingerprint) return
    lastSyncAttempt.current = fingerprint
    syncMutation.mutate(transfer.id)
  }, [
    chainQuery.data,
    chainQuery.dataUpdatedAt,
    detectedStatus,
    needsSync,
    syncMutation,
    transfer,
  ])
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [isActing, setIsActing] = useState(false)
  const [transactionHash, setTransactionHash] = useState<Hash | null>(null)
  const [isRemoveOpen, setIsRemoveOpen] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [removeError, setRemoveError] = useState<string | null>(null)

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

  async function removeTransfer() {
    if (!transfer) return
    setIsRemoving(true)
    setRemoveError(null)
    try {
      await client.transfers.remove(transfer.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["got-api", "transfers"] }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "overview"] }),
      ])
      queryClient.removeQueries({
        queryKey: ["got-api", "transfer-intent", routeAddress],
      })
      setIsRemoveOpen(false)
      router.replace("/dashboard/transfers")
    } catch (reason) {
      setRemoveError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove the transfer."
      )
    } finally {
      setIsRemoving(false)
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
    ? transferStatusFromChain(target, chain.totalProcessed, chain.balance)
    : transfer.status
  const configuredResolver = transfer.intentConfig
    ? getAddress(transfer.intentConfig.authorizedResolver)
    : null
  const canResolve =
    transfer.direction === "incoming" &&
    configuredResolver === account &&
    Boolean(chain && chain.balance > 0n && transfer.intentConfig)
  const transferUrl = transferLink(transfer)
  const fromLabel =
    transfer.direction === "incoming"
      ? humanIdentity(transfer.sender ?? transfer.party)
      : "You"
  const toLabel =
    transfer.direction === "incoming"
      ? humanIdentity(transfer.recipient)
      : humanIdentity(transfer.recipient ?? transfer.party)
  const recipientAddress = transfer.intentConfig?.ownerSource ?? null
  const senderAddress =
    transfer.sender && isAddress(transfer.sender, { strict: false })
      ? getAddress(transfer.sender)
      : null
  const latestTransaction = transactionHash ?? transfer.transactionHash

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
        eyebrow={
          <span className="flex items-center gap-3">
            <span>TRANSFER</span>
            <StatusBadge status={currentStatus} />
          </span>
        }
        title={formatMoney(transfer.value, 2)}
        description={`${transfer.direction === "incoming" ? "From" : "To"} ${transfer.direction === "incoming" ? fromLabel : toLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <CopyButton value={transferUrl} label="Copy link" />
            <Button
              size="sm"
              variant="outline"
              render={<a href={transferUrl} target="_blank" rel="noreferrer" />}
              nativeButton={false}
            >
              Open link <ExternalLink data-icon="inline-end" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="More transfer actions"
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-1">
                <DropdownMenuItem
                  variant="destructive"
                  className="py-1 text-sm"
                  onClick={() => setIsRemoveOpen(true)}
                >
                  <Trash2 />
                  Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog
              open={isRemoveOpen}
              onOpenChange={(open) => {
                setIsRemoveOpen(open)
                if (!open) setRemoveError(null)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remove this transfer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes the transfer from got.cx and
                    disables its transfer link. It does not reverse completed
                    transfers or recover funds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {removeError && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {removeError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isRemoving}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isRemoving}
                    onClick={() => void removeTransfer()}
                  >
                    {isRemoving ? "Removing…" : "Remove transfer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      <section className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium">Transfer details</h2>
        <dl className="mt-5 grid gap-x-8 gap-y-5 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs text-muted-foreground">From</dt>
            <dd className="mt-1 font-medium">{fromLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">To</dt>
            <dd className="mt-1 font-medium">{toLabel}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Amount</dt>
            <dd className="mt-1 font-medium">
              {formatMoney(transfer.value, 2)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={currentStatus} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Created</dt>
            <dd className="mt-1 font-medium">
              {formatDate(transfer.createdAt, true)}
            </dd>
          </div>
          {transfer.requestId && (
            <div>
              <dt className="text-xs text-muted-foreground">Transfer ID</dt>
              <dd className="mt-1 flex items-center gap-2 font-medium">
                <span className="max-w-48 truncate">{transfer.requestId}</span>
                <CopyButton value={transfer.requestId} label="Copy" />
              </dd>
            </div>
          )}
          <div>
            <dt className="text-xs text-muted-foreground">Transfer link</dt>
            <dd className="mt-1 flex items-center gap-2">
              <a
                href={transferUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium hover:underline"
              >
                Open link
              </a>
              <CopyButton value={transferUrl} label="Copy" />
            </dd>
          </div>
          {(transfer.note || transfer.reference) && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs text-muted-foreground">Note</dt>
              <dd className="mt-1 max-w-2xl font-medium">
                {transfer.note ?? transfer.reference}
                {transfer.note && transfer.reference
                  ? ` · ${transfer.reference}`
                  : ""}
              </dd>
            </div>
          )}
        </dl>

        {chain && transfer.direction === "incoming" && (
          <div className="mt-6 flex flex-col justify-between gap-4 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center">
            <div>
              <strong className="block text-sm">
                {chain.balance > 0n
                  ? `${formatMoney(
                      {
                        amount: chain.balance.toString(),
                        decimals: 6,
                        symbol: "USDC",
                      },
                      2
                    )} ready to receive`
                  : chain.totalProcessed > 0n
                    ? "Transfer received"
                    : "Waiting for the sender"}
              </strong>
              <span className="mt-1 block text-xs text-muted-foreground">
                {chain.balance > 0n
                  ? "Receive the available funds in your Base Account."
                  : chain.totalProcessed > 0n
                    ? "The funds are in your Base Account."
                    : "Share the transfer link when you’re ready."}
              </span>
            </div>
            {chain.balance > 0n && (
              <Button
                className="h-10"
                disabled={!canResolve || isActing}
                onClick={() => void resolveFunds()}
              >
                {isActing ? "Receiving…" : "Receive funds"}
              </Button>
            )}
          </div>
        )}

        {transactionHash && (
          <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Funds received
          </p>
        )}
        {resolveError && (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {resolveError}
          </p>
        )}
      </section>

      <OnchainDetails className="mt-5 rounded-xl border bg-card px-5">
        <div className="flex items-start justify-between gap-4 border-t pt-4">
          <div>
            <h2 className="font-medium text-foreground">Live onchain state</h2>
            <p className="mt-1 leading-5">
              Read directly from Base.
              {syncMutation.isPending && " Syncing with your activity feed…"}
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
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-destructive">
            {chainQuery.error instanceof Error
              ? chainQuery.error.message
              : "Unable to read Base state."}
          </p>
        ) : !chain ? (
          <div className="mt-4 h-24 animate-pulse rounded-lg bg-muted" />
        ) : (
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <dt>Available balance</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatMoney({
                  amount: chain.balance.toString(),
                  decimals: 6,
                  symbol: "USDC",
                })}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt>Total resolved</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {formatMoney({
                  amount: chain.totalProcessed.toString(),
                  decimals: 6,
                  symbol: "USDC",
                })}
              </dd>
            </div>
            <div className="rounded-lg border p-3">
              <dt>Intent contract</dt>
              <dd className="mt-1 font-semibold text-foreground">
                {chain.deployed ? "Deployed" : "Not deployed"}
              </dd>
            </div>
          </dl>
        )}

        {syncMutation.error && (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-700 dark:text-amber-400">
            The live state could not be synced to the activity feed yet.
          </p>
        )}

        <dl className="mt-5 grid gap-x-8 gap-y-4 border-t pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt>Network</dt>
            <dd className="mt-1 font-medium text-foreground">Base · 8453</dd>
          </div>
          <div>
            <dt>Token</dt>
            <dd className="mt-1 font-medium text-foreground">USDC</dd>
          </div>
          <div>
            <dt>GOT intent address</dt>
            <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
              {shortAddress(transfer.intentAddress, 8)}
              <CopyButton value={transfer.intentAddress} label="Copy" />
            </dd>
          </div>
          {senderAddress && (
            <div>
              <dt>Sender address</dt>
              <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
                {shortAddress(senderAddress, 8)}
                <CopyButton value={senderAddress} label="Copy" />
              </dd>
            </div>
          )}
          {recipientAddress && (
            <div>
              <dt>Recipient address</dt>
              <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
                {shortAddress(recipientAddress, 8)}
                <CopyButton value={recipientAddress} label="Copy" />
              </dd>
            </div>
          )}
          <div>
            <dt>Internal transfer ID</dt>
            <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
              <span className="max-w-48 truncate">{transfer.id}</span>
              <CopyButton value={transfer.id} label="Copy" />
            </dd>
          </div>
          {transfer.intentConfig && (
            <div>
              <dt>Protocol intent ID</dt>
              <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
                {shortAddress(transfer.intentConfig.intentId, 8)}
                <CopyButton
                  value={transfer.intentConfig.intentId}
                  label="Copy"
                />
              </dd>
            </div>
          )}
          {latestTransaction && (
            <div>
              <dt>Transaction hash</dt>
              <dd className="mt-1">
                <a
                  href={`https://basescan.org/tx/${latestTransaction}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 font-mono font-medium text-foreground hover:underline"
                >
                  {shortAddress(latestTransaction, 8)}
                  <ExternalLink className="size-3" />
                </a>
              </dd>
            </div>
          )}
          {transfer.intentConfig && (
            <div>
              <dt>Protocol metadata</dt>
              <dd className="mt-1 font-mono text-foreground">
                {shortAddress(transfer.intentConfig.metadataHash, 8)}
              </dd>
            </div>
          )}
        </dl>
      </OnchainDetails>
    </div>
  )
}
