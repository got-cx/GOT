"use client"

import {
  CheckCircle2,
  Copy,
  Ellipsis,
  ExternalLink,
  Share2,
  Trash2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { formatUnits, type Hash } from "viem"

import { createGOTProtocolClient, deserializeIntentConfig } from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { CopyButton } from "@/components/shared/copy-button"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { PageHeader } from "@/components/shared/page-header"
import { QRCodeImage } from "@/components/shared/qr-code"
import { TransferTable } from "@/components/transfers/transfer-table"
import { appConfig } from "@/lib/app-config"
import { deployAndResolveIntent, resolveIntent } from "@/lib/base-transactions"
import { humanIdentity, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
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

export function AddressDetails({ intentAddress }: { intentAddress: string }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const client = getGOTClient()
  const { account } = useAuth()
  const protocol = useMemo(
    () =>
      createGOTProtocolClient(appConfig.baseRpcUrl, appConfig.baseRpcFallback),
    []
  )
  const [isArchiveOpen, setIsArchiveOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isResolving, setIsResolving] = useState(false)
  const [resolveError, setResolveError] = useState<string | null>(null)
  const [resolveHash, setResolveHash] = useState<Hash | null>(null)
  const addressQuery = useQuery({
    queryKey: ["got-api", "address", intentAddress],
    queryFn: () => client.addresses.getByIntentAddress(intentAddress),
    refetchInterval: 15_000,
  })
  const transfersQuery = useQuery({
    queryKey: ["got-api", "address-transfers", addressQuery.data?.id],
    queryFn: () => client.addresses.transfers(addressQuery.data!.id),
    enabled: Boolean(addressQuery.data?.id),
    refetchInterval: 15_000,
  })
  const chainQuery = useQuery({
    queryKey: ["got-chain", "address", addressQuery.data?.intentAddress],
    queryFn: async () => {
      const address = addressQuery.data
      if (!address) throw new Error("Address data is required.")
      const [snapshot] = await protocol.readIntentSnapshots([
        {
          intentAddress: address.intentAddress,
          config: deserializeIntentConfig(address.intentConfig),
        },
      ])
      if (!snapshot) throw new Error("The live Intent snapshot is missing.")
      return snapshot
    },
    enabled: Boolean(addressQuery.data?.intentConfig),
    refetchInterval: 15_000,
  })
  if (addressQuery.error) {
    return (
      <p className="text-sm text-destructive">{addressQuery.error.message}</p>
    )
  }
  if (!addressQuery.data) {
    return <div className="h-72 animate-pulse rounded-xl border bg-muted" />
  }
  const address = addressQuery.data
  const expectedAmount = chainQuery.data?.config.amount
  const amount =
    expectedAmount === undefined
      ? "—"
      : expectedAmount === 0n
        ? "Any"
        : `${formatUnits(expectedAmount, 6)} USDC`
  const connectedAccountIsOwner =
    account?.toLowerCase() === chainQuery.data?.effectiveOwner?.toLowerCase()
  const ownerLabel = connectedAccountIsOwner
    ? humanIdentity(account)
    : address.ownerSource
  const shareUrl = `${appConfig.siteUrl}/${address.intentAddress}`
  const shareLabel = `${appConfig.siteUrl.replace(/^https?:\/\//, "")}/${shortAddress(address.intentAddress)}`
  const basescanAddressUrl = `https://basescan.org/address/${address.intentAddress}#tokentxns`
  const readyToResolve = Boolean(
    chainQuery.data?.balance && chainQuery.data.effectiveOwner
  )

  async function copyShareUrl() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1_500)
  }

  async function shareAddress() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: address.ref,
          text: `Intent Address for ${address.ref}`,
          url: shareUrl,
        })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        throw error
      }
    }
    await copyShareUrl()
  }

  async function resolveFunds() {
    const chain = chainQuery.data
    if (!chain || chain.balance <= 0n) return
    setIsResolving(true)
    setResolveError(null)
    setResolveHash(null)
    try {
      const config = deserializeIntentConfig(address.intentConfig)
      const hash = chain.deployed
        ? await resolveIntent(address.intentAddress, config)
        : await deployAndResolveIntent(address.intentAddress, config)
      setResolveHash(hash)
      const receipt = await protocol.waitForTransaction(hash, {
        confirmations: 2,
      })
      if (receipt.status !== "success") {
        throw new Error("The resolve transaction did not succeed.")
      }
      await Promise.all([
        chainQuery.refetch(),
        addressQuery.refetch(),
        queryClient.invalidateQueries({ queryKey: ["got-api", "addresses"] }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "overview"] }),
      ])
    } catch (error) {
      setResolveError(
        error instanceof Error ? error.message : "Unable to resolve funds."
      )
    } finally {
      setIsResolving(false)
    }
  }

  async function archiveAddress() {
    setIsArchiving(true)
    setArchiveError(null)
    try {
      await client.addresses.archive(address.id)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["got-api", "addresses"] }),
        queryClient.invalidateQueries({ queryKey: ["got-api", "overview"] }),
      ])
      queryClient.removeQueries({
        queryKey: ["got-api", "address", intentAddress],
      })
      setIsArchiveOpen(false)
      router.replace("/dashboard/addresses")
    } catch (error) {
      setArchiveError(
        error instanceof Error
          ? error.message
          : "Unable to archive the Address."
      )
    } finally {
      setIsArchiving(false)
    }
  }
  return (
    <div>
      <PageHeader
        title={address.ref}
        description="Intent Address"
        action={
          <div className="flex items-center gap-2">
            <Button
              disabled={
                !account ||
                !chainQuery.data ||
                chainQuery.data.balance <= 0n ||
                isResolving
              }
              onClick={() => void resolveFunds()}
            >
              {isResolving ? "Resolving…" : "Resolve funds"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size="icon-sm"
                    variant="outline"
                    aria-label="More Address actions"
                  />
                }
              >
                <Ellipsis />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="mt-1 min-w-40">
                <DropdownMenuItem onClick={() => void copyShareUrl()}>
                  <Copy />
                  {copied ? "Copied" : "Copy link"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void shareAddress()}>
                  <Share2 />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setIsArchiveOpen(true)}
                >
                  <Trash2 />
                  Archive Address
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog
              open={isArchiveOpen}
              onOpenChange={(open) => {
                setIsArchiveOpen(open)
                if (!open) setArchiveError(null)
              }}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive this Address?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the Address from your active got.cx workspace.
                    Its onchain Intent Address, funds, and processed transfer
                    history remain unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {archiveError && (
                  <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                    {archiveError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isArchiving}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isArchiving}
                    onClick={() => void archiveAddress()}
                  >
                    {isArchiving ? "Archiving…" : "Archive Address"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />
      {resolveHash && !resolveError && (
        <p className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="size-3.5" />
          Funds resolved
        </p>
      )}
      {(resolveError || chainQuery.error) && (
        <p className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
          {resolveError ??
            (chainQuery.error instanceof Error
              ? chainQuery.error.message
              : "Unable to read live Address funds.")}
        </p>
      )}
      <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
        <section className="overflow-hidden rounded-xl border bg-card">
          <dl className="divide-y text-sm">
            <div className="px-5 py-4">
              <dt className="text-xs text-muted-foreground">Intent Address</dt>
              <dd className="mt-1 flex items-center gap-2 font-mono">
                <span className="sm:hidden">
                  {shortAddress(address.intentAddress, 8)}
                </span>
                <span className="hidden sm:inline">
                  {address.intentAddress}
                </span>
                <CopyButton
                  value={address.intentAddress}
                  label="Copy Address"
                />
              </dd>
            </div>
            <div className="grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">
                  Expected amount
                </dt>
                <dd className="mt-1 font-medium">{amount}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Current balance
                </dt>
                <dd className="mt-1 font-medium">
                  {chainQuery.data
                    ? `${formatUnits(chainQuery.data.balance, 6)} USDC`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">
                  Total processed
                </dt>
                <dd className="mt-1 font-medium">
                  {chainQuery.data
                    ? `${formatUnits(chainQuery.data.totalProcessed, 6)} USDC`
                    : "—"}
                </dd>
              </div>
            </div>
            <div className="px-5 py-4">
              <dt className="text-xs text-muted-foreground">Effective owner</dt>
              <dd
                className={`mt-1 ${connectedAccountIsOwner ? "font-medium" : "font-mono text-xs"}`}
              >
                {chainQuery.data?.effectiveOwner
                  ? connectedAccountIsOwner
                    ? ownerLabel
                    : chainQuery.data.effectiveOwner
                  : "—"}
              </dd>
            </div>
            <div className="px-5 py-4">
              <dt className="text-xs text-muted-foreground">
                Ready to resolve
              </dt>
              <dd className="mt-1 font-medium">
                {chainQuery.data ? (readyToResolve ? "Yes" : "No") : "—"}
              </dd>
            </div>
            {address.metadata && (
              <div className="px-5 py-4">
                <dt className="text-xs text-muted-foreground">
                  Committed metadata
                </dt>
                <dd className="mt-2">
                  <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
                    {JSON.stringify(address.metadata, null, 2)}
                  </pre>
                </dd>
              </div>
            )}
          </dl>
          <OnchainDetails className="border-t px-5 py-3">
            <pre className="overflow-x-auto py-3 text-xs">
              {JSON.stringify(address.intentConfig, null, 2)}
            </pre>
          </OnchainDetails>
        </section>
        <aside className="grid h-max place-items-center rounded-xl border bg-card p-5 text-center">
          <QRCodeImage value={shareUrl} size={176} />
          <p className="my-3 text-xs text-muted-foreground">{shareLabel}</p>
          <CopyButton value={shareUrl} label="Copy link" />
        </aside>
      </div>
      <section className="mt-8">
        <div className="mb-3 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-sm font-medium">Transfers</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Processed transfers for this Intent Address.
            </p>
          </div>
          <Button
            variant="outline"
            nativeButton={false}
            render={
              <a href={basescanAddressUrl} target="_blank" rel="noreferrer" />
            }
          >
            View on Basescan
            <ExternalLink data-icon="inline-end" />
          </Button>
        </div>
        {transfersQuery.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
            {transfersQuery.error.message}
          </p>
        ) : transfersQuery.isLoading || !transfersQuery.data ? (
          <div className="h-48 animate-pulse rounded-xl border bg-muted" />
        ) : (
          <TransferTable
            transfers={transfersQuery.data.items}
            showReference={false}
          />
        )}
      </section>
    </div>
  )
}
