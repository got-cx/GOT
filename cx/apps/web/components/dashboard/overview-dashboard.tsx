"use client"

import { LayoutDashboard } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { CreateAddressMenu } from "@/components/addresses/create-address-menu"
import { TransferTable } from "@/components/transfers/transfer-table"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatMoney } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"

export function OverviewDashboard() {
  const { account, isLoading: isAuthLoading } = useAuth()
  const client = getGOTClient()
  const load = async () => {
    if (!client) throw new Error("GOT API is not configured.")
    return client.overview()
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["overview"],
    load,
    Boolean(client && account && !isAuthLoading)
  )

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Your onchain addresses and recent value activity."
        action={<CreateAddressMenu />}
      />
      {isAuthLoading ? (
        <div className="h-72 animate-pulse rounded-xl border bg-muted" />
      ) : !account ? (
        <EmptyState
          icon={LayoutDashboard}
          title="No transfer activity"
          description="Your transfer metrics and recent activity will appear here after you sign in."
        />
      ) : !client ? (
        <APIMessage />
      ) : error ? (
        <APIMessage error={error} onRetry={retry} />
      ) : isLoading || !data ? (
        <div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Loading overview"
        >
          {[0, 1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : (
        <>
          <section
            className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Workspace metrics"
          >
            <article className="flex min-h-32 flex-col rounded-xl border bg-card p-5">
              <span className="text-sm text-muted-foreground">Received</span>
              <strong className="mt-auto text-2xl tracking-[-0.04em]">
                {formatMoney(data.received, 2)}
              </strong>
            </article>
            <article className="flex min-h-32 flex-col rounded-xl border bg-card p-5">
              <span className="text-sm text-muted-foreground">Addresses</span>
              <strong className="mt-auto text-2xl tracking-[-0.04em]">
                {(data.addressCount ?? 0).toLocaleString()}
              </strong>
            </article>
            <article className="flex min-h-32 flex-col rounded-xl border bg-card p-5">
              <span className="text-sm text-muted-foreground">Transfers</span>
              <strong className="mt-auto text-2xl tracking-[-0.04em]">
                {data.transferCount.toLocaleString()}
              </strong>
            </article>
            <article className="flex min-h-32 flex-col rounded-xl border bg-card p-5">
              <span className="text-sm text-muted-foreground">
                Subscriptions
              </span>
              <strong className="mt-auto text-2xl tracking-[-0.04em]">
                {data.subscriptionCount.toLocaleString()}
              </strong>
            </article>
          </section>
          <section>
            <div className="mb-3">
              <h2 className="text-sm font-medium">Recent transfers</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Incoming Base USDC received by your Intent Addresses
              </p>
            </div>
            <TransferTable transfers={data.recentTransfers} />
          </section>
        </>
      )}
    </div>
  )
}
