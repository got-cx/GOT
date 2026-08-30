"use client"

import {
  Check,
  ChevronDown,
  CircleEllipsis,
  Copy,
  ExternalLink,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { useAuth } from "@/components/auth/auth-provider"
import { Button } from "@workspace/ui/components/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

type BaseAccountButtonProps = {
  compact?: boolean
  href?: string
}

export function BaseAccountButton({
  compact = true,
  href,
}: BaseAccountButtonProps) {
  const [copied, setCopied] = useState(false)
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
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" aria-label="Base Account menu" />}
        >
          <KeyRound data-icon="inline-start" />
          {isSigningOut ? "Signing out…" : "Base Account"}
          <ChevronDown data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 p-1.5">
          {href && (
            <DropdownMenuItem
              className="px-2 py-2"
              render={<Link href={href} />}
            >
              <LayoutDashboard />
              Open dashboard
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            className="px-2 py-2"
            render={
              <a href="https://base.app" target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLink />
            Open in Base App
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-2 py-2"
            render={<Link href="/dashboard/settings" />}
          >
            <Settings />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-2 py-2"
            onClick={() => {
              void navigator.clipboard.writeText(account)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1_500)
            }}
          >
            {copied ? <Check /> : <Copy />}
            {copied ? "Address copied" : "Copy address"}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="px-2 py-2"
            render={
              <a
                href={`https://basescan.org/address/${account}`}
                target="_blank"
                rel="noreferrer"
              />
            }
          >
            <CircleEllipsis />
            Onchain details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="px-2 py-2"
            disabled={isSigningOut}
            onClick={() => void signOut()}
          >
            <LogOut />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
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
            : "Continue with Base"}
      </Button>
      {error && !compact && (
        <span className="max-w-64 text-right text-[11px] text-destructive">
          {error}
        </span>
      )}
    </div>
  )
}
