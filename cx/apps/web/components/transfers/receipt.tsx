"use client"

import { Check, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { isHash } from "viem"

import { createGOTProtocolClient } from "@got-cx/sdk"
import { APIMessage } from "@/components/shared/api-message"
import { Brand } from "@/components/shared/brand"
import { CopyButton } from "@/components/shared/copy-button"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { appConfig } from "@/lib/app-config"
import { formatDate, formatMoney, shortAddress } from "@/lib/format"
import { Button } from "@workspace/ui/components/button"

export function Receipt({ transactionHash }: { transactionHash: string }) {
  const hash = isHash(transactionHash) ? transactionHash : null
  const protocol = useMemo(
    () =>
      createGOTProtocolClient(appConfig.baseRpcUrl, appConfig.baseRpcFallback),
    []
  )
  const receiptQuery = useQuery({
    queryKey: ["got-chain", "transfer-receipt", hash],
    queryFn: () => protocol.readUSDCTransferReceipt(hash!),
    enabled: Boolean(hash),
    retry: 2,
  })

  if (!hash) {
    return <ReceiptMessage error="The transaction hash is invalid." />
  }
  if (receiptQuery.error) {
    return (
      <ReceiptMessage
        error={receiptQuery.error.message}
        onRetry={() => void receiptQuery.refetch()}
      />
    )
  }
  if (!receiptQuery.data) {
    return <div className="min-h-svh animate-pulse bg-muted" />
  }

  const receipt = receiptQuery.data
  const amountLabel = formatMoney({
    amount: receipt.amount.toString(),
    decimals: 6,
    symbol: "USDC",
  })
  const receiptText = [
    "GOT transfer receipt",
    amountLabel,
    `From: ${receipt.sender}`,
    `Intent Address: ${receipt.intentAddress}`,
    `Transaction: ${receipt.transactionHash}`,
    `Confirmed: ${receipt.confirmedAt}`,
    "Status: Transfer confirmed",
  ].join("\n")

  return (
    <div className="min-h-svh px-5">
      <header className="mx-auto flex h-18 max-w-5xl items-center justify-between border-b">
        <Brand />
        <span className="text-xs text-muted-foreground">Receipt</span>
      </header>
      <main className="mx-auto my-14 w-full max-w-lg text-center">
        <span className="mx-auto mb-6 grid size-12 place-items-center rounded-full bg-emerald-600 text-white">
          <Check className="size-5" />
        </span>
        <p className="text-[11px] font-semibold tracking-[0.15em] text-muted-foreground">
          TRANSFER CONFIRMED
        </p>
        <h1 className="mt-3 text-5xl font-semibold tracking-[-0.06em]">
          {amountLabel}
        </h1>
        <dl className="mt-8 divide-y rounded-xl border text-left text-sm">
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Status</dt>
            <dd className="font-medium">Confirmed</dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">Date</dt>
            <dd className="font-medium">
              {formatDate(receipt.confirmedAt, true)}
            </dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">From</dt>
            <dd className="font-mono text-xs">
              {shortAddress(receipt.sender)}
            </dd>
          </div>
          <div className="flex justify-between gap-5 px-4 py-3.5">
            <dt className="text-muted-foreground">To</dt>
            <dd className="font-mono text-xs">
              {shortAddress(receipt.intentAddress)}
            </dd>
          </div>
        </dl>
        <CopyButton
          value={receiptText}
          label="Copy receipt"
          className="mt-4 h-10 w-full"
        />
        <OnchainDetails className="mt-5 border-t text-left">
          <dl className="divide-y">
            <div className="flex justify-between gap-5 py-3">
              <dt>Network</dt>
              <dd className="font-medium text-foreground">Base</dd>
            </div>
            <div className="flex justify-between gap-5 py-3">
              <dt>Token</dt>
              <dd className="font-medium text-foreground">USDC</dd>
            </div>
            <div className="flex justify-between gap-5 py-3">
              <dt>Intent Address</dt>
              <dd className="font-mono text-foreground">
                {shortAddress(receipt.intentAddress)}
              </dd>
            </div>
            <div className="flex justify-between gap-5 py-3">
              <dt>Transaction hash</dt>
              <dd className="font-mono text-foreground">
                {shortAddress(receipt.transactionHash)}
              </dd>
            </div>
          </dl>
          <a
            href={`https://basescan.org/tx/${receipt.transactionHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 font-medium text-foreground hover:underline"
          >
            View in block explorer <ExternalLink className="size-3.5" />
          </a>
        </OnchainDetails>
        <Button
          variant="link"
          className="mt-5 text-muted-foreground"
          render={<a href={`/${receipt.intentAddress}`} />}
          nativeButton={false}
        >
          Return to transfer
        </Button>
      </main>
      <footer className="pb-6 text-center text-[11px] text-muted-foreground">
        Global Onchain Transfers, made simple.
      </footer>
    </div>
  )
}

function ReceiptMessage({
  error,
  onRetry,
}: {
  error: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-svh px-5">
      <header className="mx-auto flex h-18 max-w-5xl items-center border-b">
        <Brand />
      </header>
      <main className="mx-auto mt-14 max-w-lg">
        <APIMessage error={error} onRetry={onRetry} />
      </main>
    </div>
  )
}
