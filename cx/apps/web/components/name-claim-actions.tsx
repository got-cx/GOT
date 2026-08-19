"use client"

import { AtSign } from "lucide-react"
import { useState } from "react"

import { useAuth } from "@/components/app-providers"
import { getGOTClient } from "@/lib/got-client"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export function NameClaimActions({ onChanged }: { onChanged: () => void }) {
  const { account, signIn } = useAuth()
  const [name, setName] = useState("")
  const [pending, setPending] = useState<"got" | "x" | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  async function claimGOTName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!account) return void signIn()
    setPending("got")
    setMessage(null)
    try {
      await getGOTClient().names.claim(name)
      setName("")
      setMessage("Claim submitted. It will become reusable after verification.")
      onChanged()
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to claim this name."
      )
    } finally {
      setPending(null)
    }
  }

  async function claimXIdentity() {
    if (!account) return void signIn()
    setPending("x")
    setMessage(null)
    try {
      const flow = await getGOTClient().names.startTwitterClaim()
      const csrfResponse = await fetch(flow.csrfUrl, { credentials: "include" })
      if (!csrfResponse.ok)
        throw new Error("Unable to start secure X authorization.")
      const { csrfToken } = (await csrfResponse.json()) as {
        csrfToken?: string
      }
      if (!csrfToken)
        throw new Error("X authorization did not return a CSRF token.")
      const response = await fetch(flow.signInUrl, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          callbackUrl: flow.callbackUrl,
          csrfToken,
          json: "true",
        }),
      })
      const result = (await response.json()) as { url?: string }
      if (!response.ok || !result.url)
        throw new Error("Unable to open X authorization.")
      window.location.assign(result.url)
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to claim the X identity."
      )
      setPending(null)
    }
  }

  return (
    <div className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[1fr_auto]">
      <form
        className="flex gap-2"
        onSubmit={(event) => void claimGOTName(event)}
      >
        <div className="relative flex-1">
          <AtSign className="absolute top-2.5 left-3 size-4 text-muted-foreground" />
          <Input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="yourname"
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={pending !== null || !name.trim()}>
          {pending === "got" ? "Submitting…" : "Claim GOT name"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        disabled={pending !== null}
        onClick={() => void claimXIdentity()}
      >
        {pending === "x" ? "Opening X…" : "Verify X identity"}
      </Button>
      {message && (
        <p className="text-xs text-muted-foreground md:col-span-2">{message}</p>
      )}
    </div>
  )
}
