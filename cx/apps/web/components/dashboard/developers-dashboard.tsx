"use client"

import { Check, Copy, Eye, RefreshCw } from "lucide-react"
import { useState } from "react"

import {
  GOT_BASE_FACTORY,
  GOT_BASE_NAME,
  GOT_BASE_USDC,
} from "@got-cx/sdk/protocol"
import { CopyButton } from "@/components/shared/copy-button"
import { PageHeader } from "@/components/shared/page-header"
import { appConfig } from "@/lib/app-config"
import { requestBearerToken } from "@/lib/base-auth"
import { shortAddress } from "@/lib/format"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"

const developerTabs = {
  SDK: {
    description:
      "Create deterministic Intent Addresses synchronously in server or browser code.",
    example: `import { createIntent } from "@got-cx/sdk"\n\nconst intent = createIntent({\n  owner: "0x...",\n  ref: "invoice:1042",\n})\n\nconsole.log(intent.address)`,
    subtext:
      "No API, API key, RPC request, wallet connection, or transaction is required.",
  },
  Protocol: {
    description:
      "Use GOTLens state reads, settlement, resolution, and advanced protocol functionality.",
    example: `import { createGOTProtocolClient } from "@got-cx/sdk/protocol"\n\nconst protocol = createGOTProtocolClient(process.env.BASE_RPC_URL)\nconst snapshots = await protocol.readIntentSnapshots(intents)`,
    subtext:
      "Preview the intent address before funding and verify it against the canonical deployment.",
  },
  API: {
    description:
      "Persist Addresses and use managed indexing, history, and reconciliation.",
    example: `import { GOTAPIClient } from "@got-cx/sdk/api"\n\nconst api = new GOTAPIClient({\n  baseUrl: "https://api.got.cx",\n  getAccessToken: () => process.env.GOT_API_TOKEN,\n})\n\nawait api.addresses.create({ ref: "invoice:1042" })`,
    subtext:
      "got.cx verifies every supplied Intent Address against canonical protocol rules.",
  },
} as const

type Tab = keyof typeof developerTabs

function ResponsiveAddress({ address }: { address: string }) {
  return (
    <>
      <span className="sm:hidden">{shortAddress(address)}</span>
      <span className="hidden sm:inline">{address}</span>
    </>
  )
}

export function DevelopersDashboard() {
  const [tab, setTab] = useState<Tab>("SDK")
  const [copied, setCopied] = useState(false)
  const [apiToken, setAPIToken] = useState<string | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [isRequestingToken, setIsRequestingToken] = useState(false)
  const [isRegenerateOpen, setIsRegenerateOpen] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(developerTabs[tab].example)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  async function revealAPIToken(rotate = false) {
    setIsRequestingToken(true)
    setTokenError(null)
    try {
      const result = await requestBearerToken({ rotate })
      setAPIToken(result.token)
    } catch (reason) {
      setTokenError(
        reason instanceof Error
          ? reason.message
          : "Unable to issue an API token."
      )
    } finally {
      setIsRequestingToken(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Developers"
        description="Build on deterministic global transfer infrastructure."
      />
      <div className="grid gap-4 md:grid-cols-[170px_1fr]">
        <nav
          className="flex gap-1 overflow-x-auto md:flex-col"
          aria-label="Developer resources"
        >
          {(Object.keys(developerTabs) as Tab[]).map((item) => (
            <button
              type="button"
              key={item}
              onClick={() => setTab(item)}
              className={`h-9 shrink-0 rounded-lg px-3 text-left text-sm ${tab === item ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground"}`}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="grid gap-4">
          {tab === "API" && (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b p-5">
                <h2 className="font-medium">API token</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a bearer token for integrations and automation. The
                  got.cx web session never uses or stores this token.
                </p>
              </div>
              <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                {apiToken ? (
                  <>
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border bg-background px-3 py-2 text-xs">
                      {apiToken}
                    </code>
                    <CopyButton value={apiToken} label="Copy token" />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setAPIToken(null)}
                    >
                      Hide
                    </Button>
                    <AlertDialog
                      open={isRegenerateOpen}
                      onOpenChange={setIsRegenerateOpen}
                    >
                      <AlertDialogTrigger
                        render={
                          <Button
                            type="button"
                            variant="outline"
                            disabled={isRequestingToken}
                          />
                        }
                      >
                        <RefreshCw />
                        {isRequestingToken ? "Regenerating…" : "Regenerate"}
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Regenerate API token?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            The current token will stop working immediately. You
                            will need to replace it in every integration,
                            automation, and local frontend that uses it.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              setIsRegenerateOpen(false)
                              void revealAPIToken(true)
                            }}
                          >
                            Regenerate token
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <>
                    <code
                      aria-hidden="true"
                      className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-background px-3 py-2 text-xs blur-sm select-none"
                    >
                      got_live_7f3a9c2e8b4d6f1a0c5e9b2d8f4a6c3e
                    </code>
                    <Button
                      aria-label="Reveal API token"
                      variant="outline"
                      size="icon"
                      disabled={isRequestingToken}
                      onClick={() => void revealAPIToken()}
                    >
                      <Eye />
                    </Button>
                  </>
                )}
              </div>
              {tokenError && (
                <p
                  className="border-t px-5 py-3 text-xs text-destructive"
                  role="alert"
                >
                  {tokenError}
                </p>
              )}
              <p className="border-t bg-muted/40 px-5 py-3 text-xs text-muted-foreground">
                The revealed value exists only on this page. Copy it to a secret
                manager; leaving the page removes the browser copy. Regenerating
                invalidates the previous token everywhere.
              </p>
            </section>
          )}
          <section className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b p-5">
              <h2 className="font-medium">{tab}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {developerTabs[tab].description}
              </p>
            </div>
            <div className="m-5 overflow-hidden rounded-lg border bg-background text-foreground">
              <div className="flex items-center justify-between border-b px-4 py-2 text-[11px] text-muted-foreground">
                <span>Example</span>
                <Button
                  size="xs"
                  variant="ghost"
                  className="hover:bg-muted hover:text-foreground"
                  onClick={() => void copy()}
                >
                  {copied ? <Check /> : <Copy />}
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <pre className="overflow-x-auto p-5 text-xs leading-6">
                <code>{developerTabs[tab].example}</code>
              </pre>
            </div>
            <div className="border-t bg-muted/40 px-5 py-4 text-xs text-muted-foreground">
              {developerTabs[tab].subtext}
            </div>
          </section>
          {tab === "Protocol" && (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b p-5">
                <h2 className="text-sm font-medium">Canonical Base profile</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Read from the published @got-cx/protocol deployment manifest.
                </p>
              </div>
              <dl className="divide-y text-sm">
                <div className="flex items-center justify-between px-5 py-4">
                  <dt className="text-muted-foreground">Network</dt>
                  <dd className="font-medium">Base · 8453</dd>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <dt className="text-muted-foreground">GOT Factory</dt>
                  <dd className="font-mono text-xs">
                    <ResponsiveAddress address={GOT_BASE_FACTORY} />
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <dt className="text-muted-foreground">GOT Name</dt>
                  <dd className="font-mono text-xs">
                    <ResponsiveAddress address={GOT_BASE_NAME} />
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <dt className="text-muted-foreground">Canonical USDC</dt>
                  <dd className="font-mono text-xs">
                    <ResponsiveAddress address={GOT_BASE_USDC} />
                  </dd>
                </div>
                <div className="flex items-center justify-between px-5 py-4">
                  <dt className="text-muted-foreground">Product API</dt>
                  <dd className="font-mono text-xs">
                    {appConfig.apiUrl ?? "Not configured"}
                  </dd>
                </div>
              </dl>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
