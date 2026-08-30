"use client"

import { ArrowLeftRight, Search } from "lucide-react"
import { useState } from "react"
import { useInfiniteQuery } from "@tanstack/react-query"

import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { TransferTable } from "@/components/transfers/transfer-table"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export function TransfersDashboard() {
  const { account, isLoading: isAuthLoading } = useAuth()
  const client = getGOTClient()
  const [query, setQuery] = useState("")
  const {
    data,
    error,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["got-api", "transfers", query],
    queryFn: ({ pageParam }) =>
      client.transfers.list({
        query: query || undefined,
        cursor: pageParam ?? undefined,
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: Boolean(account && !isAuthLoading),
    refetchInterval: 15_000,
  })
  const transfers = data?.pages.flatMap((page) => page.items) ?? []

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Incoming Base USDC received by your Intent Addresses."
      />
      {account && (
        <div className="mb-4 flex justify-end">
          <label className="relative w-full sm:max-w-xs">
            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
            <span className="sr-only">Search transfers</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search reference, sender, or transaction"
              className="h-9 pl-9"
            />
          </label>
        </div>
      )}
      {isAuthLoading ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : !account ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="No transfers yet"
          description="Incoming transfers will appear here after you sign in."
        />
      ) : error ? (
        <APIMessage
          error={
            error instanceof Error ? error.message : "Unable to load transfers."
          }
          onRetry={() => void refetch()}
        />
      ) : isLoading || !data ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : (
        <>
          <TransferTable transfers={transfers} />
          {hasNextPage && (
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                variant="outline"
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
