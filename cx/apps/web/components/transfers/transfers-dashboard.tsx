"use client"

import { ArrowLeftRight, Search } from "lucide-react"
import { useState } from "react"

import type { TransferDirection } from "@got-cx/sdk"
import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { CreateTransferMenu } from "@/components/transfers/create-transfer-menu"
import { TransferTable } from "@/components/transfers/transfer-table"
import { useAPIResource } from "@/hooks/use-api-resource"
import { getGOTClient } from "@/lib/got-client"
import { Input } from "@workspace/ui/components/input"

type Filter = "all" | TransferDirection

export function TransfersDashboard() {
  const { account, isLoading: isAuthLoading } = useAuth()
  const client = getGOTClient()
  const [filter, setFilter] = useState<Filter>("all")
  const [query, setQuery] = useState("")
  const load = async () => {
    if (!client) throw new Error("GOT API is not configured.")
    return client.transfers.list({
      direction: filter === "all" ? undefined : filter,
      query: query || undefined,
    })
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["transfers", filter, query],
    load,
    Boolean(client && account && !isAuthLoading)
  )

  return (
    <div>
      <PageHeader
        title="Transfers"
        description="Every incoming and outgoing transfer across your account."
        action={account ? <CreateTransferMenu /> : undefined}
      />
      {account && (
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex w-max rounded-lg bg-muted p-1">
            {(["all", "incoming", "outgoing"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`h-7 rounded-md px-3 text-xs font-medium capitalize ${filter === value ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {value}
              </button>
            ))}
          </div>
          <label className="relative w-full sm:max-w-xs">
            <Search className="absolute top-2.5 left-3 size-3.5 text-muted-foreground" />
            <span className="sr-only">Search transfers</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search party, reference, or ID"
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
          description="Incoming and outgoing transfers will appear here after you sign in."
        />
      ) : !client ? (
        <APIMessage />
      ) : error ? (
        <APIMessage error={error} onRetry={retry} />
      ) : isLoading || !data ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : (
        <TransferTable transfers={data.items} />
      )}
    </div>
  )
}
