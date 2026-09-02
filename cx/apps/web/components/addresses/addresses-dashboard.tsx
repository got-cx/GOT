"use client"

import { AtSign, Search } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { formatUnits } from "viem"

import { createGOTProtocolClient, deserializeIntentConfig } from "@got-cx/sdk"
import { AddressTabs } from "@/components/addresses/address-tabs"
import { CreateAddressMenu } from "@/components/addresses/create-address-menu"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { appConfig } from "@/lib/app-config"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

const LENS_BATCH_SIZE = 50

function usdcLabel(amount: bigint) {
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(Number(formatUnits(amount, 6)))} USDC`
}

function amountLabel(amount: string) {
  return amount === "0" ? "Any" : usdcLabel(BigInt(amount))
}

export function AddressesDashboard() {
  const { account, isLoading: isAuthLoading } = useAuth()
  const [query, setQuery] = useState("")
  const protocol = useMemo(
    () =>
      createGOTProtocolClient(appConfig.baseRpcUrl, appConfig.baseRpcFallback),
    []
  )
  const result = useInfiniteQuery({
    queryKey: ["got-api", "addresses", query],
    queryFn: ({ pageParam }) =>
      getGOTClient().addresses.list({
        query: query || undefined,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(account && !isAuthLoading),
    refetchInterval: 15_000,
  })
  const addresses = result.data?.pages.flatMap((page) => page.items) ?? []
  const snapshots = useQuery({
    queryKey: [
      "got-chain",
      "address-list",
      addresses.map((address) => address.id).join(","),
    ],
    queryFn: async () => {
      const batches = Array.from(
        { length: Math.ceil(addresses.length / LENS_BATCH_SIZE) },
        (_, index) =>
          addresses.slice(
            index * LENS_BATCH_SIZE,
            (index + 1) * LENS_BATCH_SIZE
          )
      )
      const results = await Promise.all(
        batches.map((batch) =>
          protocol.readIntentSnapshots(
            batch.map((address) => ({
              intentAddress: address.intentAddress,
              config: deserializeIntentConfig(address.intentConfig),
            }))
          )
        )
      )
      return new Map(
        results
          .flat()
          .map((snapshot) => [snapshot.intentAddress.toLowerCase(), snapshot])
      )
    },
    enabled: addresses.length > 0,
    refetchInterval: 15_000,
  })

  return (
    <div>
      <PageHeader
        title="Addresses"
        description="Deterministic onchain addresses for any intent."
        action={<CreateAddressMenu />}
      />
      <AddressTabs active="addresses" />
      {account && (
        <label className="relative mb-4 block w-full sm:max-w-xs">
          <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
          <span className="sr-only">Search Addresses</span>
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search reference or address"
            className="h-9 pl-9"
          />
        </label>
      )}
      {isAuthLoading ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : !account ? (
        <EmptyState
          icon={AtSign}
          title="No Intent Addresses"
          description="Sign in with your Base Account to address an intent."
        />
      ) : result.error ? (
        <APIMessage
          error={
            result.error instanceof Error
              ? result.error.message
              : "Unable to load Addresses."
          }
          onRetry={() => void result.refetch()}
        />
      ) : result.isLoading || !result.data ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : !addresses.length ? (
        <EmptyState
          icon={AtSign}
          title="No Intent Addresses"
          description="Create a reusable Address for a customer, invoice, order, subscription, or agent task."
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Reference</th>
                  <th className="px-4 py-3 font-medium">Intent Address</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">
                    Unresolved
                  </th>
                  <th className="px-4 py-3 text-right font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {addresses.map((address) => {
                  const unresolved = snapshots.data?.get(
                    address.intentAddress.toLowerCase()
                  )?.balance
                  return (
                    <tr key={address.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/dashboard/addresses/${address.intentAddress}`}
                          className="hover:underline"
                        >
                          {address.ref}
                        </Link>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {shortAddress(address.intentAddress, 7)}
                      </td>
                      <td className="px-4 py-3">
                        {amountLabel(address.amount)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right ${unresolved && unresolved > 0n ? "font-medium text-emerald-700 dark:text-emerald-400" : ""}`}
                      >
                        {unresolved === undefined ? "—" : usdcLabel(unresolved)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {amountLabel(address.receivedAmount).replace(
                          "Any",
                          "0 USDC"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {result.hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                disabled={result.isFetchingNextPage}
                onClick={() => void result.fetchNextPage()}
              >
                {result.isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
