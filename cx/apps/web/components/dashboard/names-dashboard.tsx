"use client"

import { UsersRound } from "lucide-react"

import { useAuth } from "@/components/auth/auth-provider"
import { NameClaimActions } from "@/components/dashboard/name-claim-actions"
import { APIMessage } from "@/components/shared/api-message"
import { CopyButton } from "@/components/shared/copy-button"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { useAPIResource } from "@/hooks/use-api-resource"
import { formatDate, shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"

export function NamesDashboard() {
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
      <PageHeader
        title="Names"
        description="Verified identities that resolve to your account."
      />
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
        <div className="overflow-x-auto rounded-xl border bg-card">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1.2fr_1fr_.8fr_.8fr_.7fr] gap-4 border-b bg-muted/50 px-5 py-3 text-[11px] text-muted-foreground">
              <span>Identity</span>
              <span>Base Account</span>
              <span>Verified</span>
              <span>Status</span>
              <span>Link</span>
            </div>
            {data.items.map((name) => (
              <div
                key={name.id}
                className="grid min-h-16 grid-cols-[1.2fr_1fr_.8fr_.8fr_.7fr] items-center gap-4 border-b px-5 text-xs last:border-b-0"
              >
                <span>
                  <strong className="block">{name.label}</strong>
                  <small className="text-muted-foreground capitalize">
                    {name.kind}
                  </small>
                </span>
                <span className="font-mono">
                  {shortAddress(name.destination)}
                </span>
                <span className="text-muted-foreground">
                  {name.verifiedAt ? formatDate(name.verifiedAt) : "—"}
                </span>
                <StatusBadge status={name.verified ? "verified" : "pending"} />
                <CopyButton value={name.url} label="Copy" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
