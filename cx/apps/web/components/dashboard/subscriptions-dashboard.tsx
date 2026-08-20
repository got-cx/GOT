"use client"

import { RefreshCw } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { APIMessage } from "@/components/shared/api-message"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatDate, formatMoney } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"

export function SubscriptionsDashboard() {
  const { account, isLoading: isAuthLoading } = useAuth()
  const client = getGOTClient()
  const load = async () => {
    if (!client) throw new Error("GOT API is not configured.")
    return client.subscriptions.list()
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["subscriptions"],
    load,
    Boolean(client && account && !isAuthLoading)
  )

  return (
    <div>
      <PageHeader
        title="Subscriptions"
        description="Recurring transfers with spend permissions."
      />
      {isAuthLoading ? (
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      ) : !account ? (
        <EmptyState
          icon={RefreshCw}
          title="No active subscriptions"
          description="Your recurring transfers will appear here after you sign in."
        />
      ) : !client ? (
        <APIMessage />
      ) : error ? (
        <APIMessage error={error} onRetry={retry} />
      ) : isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      ) : !data.items.length ? (
        <EmptyState
          icon={RefreshCw}
          title="No active subscriptions"
          description="Create a recurring transfer without handing custody of funds to an intermediary."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_.8fr] gap-4 border-b bg-muted/50 px-5 py-3 text-[11px] text-muted-foreground">
              <span>Subscription</span>
              <span>Amount</span>
              <span>Next transfer</span>
              <span>Status</span>
            </div>
            {data.items.map((subscription) => (
              <div
                key={subscription.id}
                className="grid min-h-16 grid-cols-[1.2fr_1fr_1fr_.8fr] items-center gap-4 border-b px-5 text-xs last:border-b-0"
              >
                <span>
                  <strong className="block">{subscription.name}</strong>
                  <small className="text-muted-foreground">
                    {subscription.counterparty}
                  </small>
                </span>
                <strong>{formatMoney(subscription.value, 2)}</strong>
                <span className="text-muted-foreground">
                  {subscription.nextExecutionAt
                    ? formatDate(subscription.nextExecutionAt)
                    : "—"}
                </span>
                <StatusBadge status={subscription.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
