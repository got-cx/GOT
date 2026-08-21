"use client"

import { KeyRound, LogOut } from "lucide-react"
import Link from "next/link"

import { useAuth } from "@/components/auth/auth-provider"
import { shortAddress } from "@/lib/format"
import { Button } from "@workspace/ui/components/button"

type BaseAccountButtonProps = {
  compact?: boolean
  href?: string
}

export function BaseAccountButton({
  compact = true,
  href,
}: BaseAccountButtonProps) {
  const {
    account,
    error,
    isLoading,
    isSigningIn,
    isSigningOut,
    signIn,
    signOut,
  } = useAuth()

  if (isLoading) {
    return (
      <Button variant="outline" disabled>
        {compact ? "…" : "Checking account…"}
      </Button>
    )
  }

  if (account) {
    if (href) {
      return (
        <Button
          variant="outline"
          render={<Link href={href} />}
          nativeButton={false}
          title="Open account"
        >
          <span className="size-2 rounded-full bg-emerald-600" />
          {shortAddress(account)}
        </Button>
      )
    }

    return (
      <Button
        variant="outline"
        onClick={() => void signOut()}
        disabled={isSigningOut}
        title="Sign out"
      >
        <span className="size-2 rounded-full bg-emerald-600" />
        {isSigningOut ? "Signing out…" : shortAddress(account)}
        <LogOut data-icon="inline-end" />
      </Button>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        onClick={() => void signIn()}
        disabled={isSigningIn}
      >
        <KeyRound data-icon="inline-start" />
        {isSigningIn
          ? "Authenticating…"
          : compact
            ? "Sign in"
            : "Continue with Base passkey"}
      </Button>
      {error && !compact && (
        <span className="max-w-64 text-right text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
