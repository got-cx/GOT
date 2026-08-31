"use client"

import { UsersRound } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { NameClaimActions } from "@/components/dashboard/name-claim-actions"
import { APIMessage } from "@/components/shared/api-message"
import { CopyButton } from "@/components/shared/copy-button"
import { EmptyState } from "@/components/shared/empty-state"
import { OnchainDetails } from "@/components/shared/onchain-details"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatDate, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"

export function NamesDashboard({ embedded = false }: { embedded?: boolean }) {
  const { account, isLoading: isAuthLoading } = useAuth()
  const client = getGOTClient()
  const load = async () => {
    if (!client) throw new Error("GOT API is not configured.")
    return client.names.list()
  }
  const { data, error, isLoading, retry } = useAPIResource(
    ["names"],
    load,
    Boolean(client && account && !isAuthLoading)
  )

  return (
    <div>
      {!embedded && (
        <PageHeader
          title="Names"
          description="Verified identities that resolve to your account."
        />
      )}
      {account && <NameClaimActions onChanged={retry} />}
      {isAuthLoading ? (
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      ) : !account ? (
        <EmptyState
          icon={UsersRound}
          title="No verified identities"
          description="Your verified GOT names and social identities will appear here after you sign in."
        />
      ) : !client ? (
        <APIMessage />
      ) : error ? (
        <APIMessage error={error} onRetry={retry} />
      ) : isLoading || !data ? (
        <div className="h-64 animate-pulse rounded-xl border bg-muted" />
      ) : !data.items.length ? (
        <EmptyState
          icon={UsersRound}
          title="No verified identities"
          description="Claim a GOT name or verify an X identity to make your Base Account easier to reach."
        />
      ) : (
        <div className="divide-y overflow-hidden rounded-xl border bg-card">
          {data.items.map((name) => (
            <article key={name.id} className="px-5 py-4">
              <div className="flex items-center justify-between gap-4">
                <span className="min-w-0">
                  <strong className="block truncate text-sm">
                    {name.label}
                  </strong>
                  <small className="mt-0.5 block text-muted-foreground capitalize">
                    {name.kind} identity
                    {name.verifiedAt
                      ? ` · Verified ${formatDate(name.verifiedAt)}`
                      : ""}
                  </small>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <StatusBadge
                    status={name.verified ? "verified" : "pending"}
                  />
                  <CopyButton value={name.url} label="Copy link" />
                </span>
              </div>
              <OnchainDetails className="mt-3 border-t">
                <dl className="grid gap-4 pt-2 sm:grid-cols-2">
                  <div>
                    <dt>Base Account address</dt>
                    <dd className="mt-1 flex items-center gap-2 font-mono text-foreground">
                      {shortAddress(name.destination, 8)}
                      <CopyButton value={name.destination} label="Copy" />
                    </dd>
                  </div>
                  <div>
                    <dt>Name key</dt>
                    <dd className="mt-1 font-mono text-foreground">
                      {shortAddress(name.nameKey, 8)}
                    </dd>
                  </div>
                </dl>
              </OnchainDetails>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
