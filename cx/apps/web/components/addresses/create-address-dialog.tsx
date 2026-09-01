"use client"

import { createIntent, type IntentMetadata } from "@got-cx/sdk"
import { useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { getAddress } from "viem"

import { BaseAccountButton } from "@/components/auth/base-account-button"
import { useAuth } from "@/components/auth/auth-provider"
import { shortAddress } from "@/lib/format"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  NativeSelect,
  NativeSelectOption,
} from "@workspace/ui/components/native-select"
import { Textarea } from "@workspace/ui/components/textarea"

export type CreateAddressMenuProps = {
  triggerLabel?: string
  triggerClassName?: string
}

export function CreateAddressMenu({
  triggerLabel = "Address an intent",
  triggerClassName = "h-9 px-3",
}: CreateAddressMenuProps = {}) {
  const { account } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [ref, setRef] = useState("")
  const [amount, setAmount] = useState("")
  const [ownerMode, setOwnerMode] = useState<"account" | "custom" | null>(null)
  const [customOwner, setCustomOwner] = useState("")
  const [advanced, setAdvanced] = useState(false)
  const [metadataText, setMetadataText] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const customOwnerMatchesAccount = Boolean(
    account && customOwner.trim().toLowerCase() === account.toLowerCase()
  )
  const selectedOwnerMode = account
    ? customOwnerMatchesAccount
      ? "account"
      : (ownerMode ?? "account")
    : "custom"
  const preview = useMemo(() => {
    if (!ref.trim()) return { intent: null, error: null }
    if (selectedOwnerMode === "custom" && !customOwner.trim()) {
      return { intent: null, error: null }
    }
    try {
      const owner =
        selectedOwnerMode === "account" && account
          ? account
          : getAddress(customOwner.trim())
      const metadata = metadataText.trim()
        ? (JSON.parse(metadataText) as IntentMetadata)
        : undefined
      return {
        intent: createIntent({
          owner,
          ref,
          ...(amount.trim() ? { amount } : {}),
          ...(metadata ? { metadata } : {}),
        }),
        error: null,
      }
    } catch (error) {
      return {
        intent: null,
        error: error instanceof Error ? error.message : "Invalid Intent.",
      }
    }
  }, [account, amount, customOwner, metadataText, ref, selectedOwnerMode])

  async function createAddress() {
    if (!account || !preview.intent) return
    setIsSaving(true)
    setSaveError(null)
    try {
      const created = await getGOTClient().addresses.create({
        owner: preview.intent.config.ownerSource,
        ref: preview.intent.ref,
        ...(amount.trim() ? { amount } : {}),
        ...(preview.intent.metadata
          ? { metadata: preview.intent.metadata }
          : {}),
        intentAddress: preview.intent.address,
      })
      await queryClient.invalidateQueries({
        queryKey: ["got-api", "addresses"],
      })
      setOpen(false)
      setRef("")
      setAmount("")
      setOwnerMode(null)
      setCustomOwner("")
      setMetadataText("")
      router.push(`/dashboard/addresses/${created.intentAddress}`)
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to create the Address."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button type="button" className={triggerClassName} />}
      >
        <Plus data-icon="inline-start" /> {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Address an intent</DialogTitle>
          <DialogDescription>
            Create a deterministic onchain address for your intent.
          </DialogDescription>
        </DialogHeader>
        <>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor={account ? "intent-owner-mode" : "intent-owner"}>
                Owner
              </Label>
              {account && (
                <NativeSelect
                  id="intent-owner-mode"
                  className="w-full"
                  value={selectedOwnerMode}
                  onChange={(event) => {
                    const mode = event.target.value as "account" | "custom"
                    if (mode === "custom" && customOwnerMatchesAccount) {
                      setCustomOwner("")
                    }
                    setOwnerMode(mode)
                    setSaveError(null)
                  }}
                >
                  <NativeSelectOption value="account">
                    My Base Account ({shortAddress(account ?? "", 5)})
                  </NativeSelectOption>
                  <NativeSelectOption value="custom">
                    Custom address
                  </NativeSelectOption>
                </NativeSelect>
              )}
              {selectedOwnerMode === "custom" && (
                <Input
                  id="intent-owner"
                  value={customOwner}
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="0x…"
                  aria-label="Custom owner address"
                  className="font-mono"
                  onChange={(event) => {
                    setCustomOwner(event.target.value)
                    setOwnerMode("custom")
                    setSaveError(null)
                  }}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Funds received by this Intent Address resolve to its owner.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="intent-ref">Reference</Label>
              <Input
                id="intent-ref"
                value={ref}
                maxLength={120}
                placeholder="invoice:1042"
                onChange={(event) => setRef(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="intent-amount">Amount</Label>
              <Input
                id="intent-amount"
                value={amount}
                inputMode="decimal"
                placeholder="Any amount"
                onChange={(event) => setAmount(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for a reusable Address that can receive any amount.
              </p>
            </div>
            <button
              type="button"
              className="w-max text-xs font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setAdvanced((value) => !value)}
            >
              {advanced ? "Hide advanced" : "Advanced"}
            </button>
            {advanced && (
              <div className="grid gap-2">
                <Label htmlFor="intent-metadata">
                  Committed metadata (JSON)
                </Label>
                <Textarea
                  id="intent-metadata"
                  value={metadataText}
                  placeholder={'{\n  "customerId": "customer:123"\n}'}
                  onChange={(event) => setMetadataText(event.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Committed metadata is immutable and participates in the Intent
                  Address derivation.
                </p>
              </div>
            )}
            {(preview.error || saveError) && (
              <p className="text-xs text-destructive" role="alert">
                {saveError ?? preview.error}
              </p>
            )}
            {preview.intent && (
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Intent Address</p>
                <p
                  className="mt-1 font-mono text-sm"
                  title={preview.intent.address}
                >
                  {shortAddress(preview.intent.address, 9)}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Virtual address · Preview
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            {account ? (
              <Button
                disabled={!preview.intent || isSaving}
                onClick={() => void createAddress()}
              >
                {isSaving ? "Creating…" : "Create address"}
              </Button>
            ) : (
              <div className="flex w-full items-center justify-between gap-4">
                <p className="text-xs text-muted-foreground">
                  Sign in to create and save this Address.
                </p>
                <BaseAccountButton compact={false} />
              </div>
            )}
          </DialogFooter>
        </>
      </DialogContent>
    </Dialog>
  )
}
