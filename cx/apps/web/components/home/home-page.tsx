"use client"

import { Code2, Globe2, Link2, MoveRight, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { formatIdentityLabel, parseGOTLink, type GOTLink } from "@got-cx/sdk"
import { BaseAccountButton } from "@/components/auth/base-account-button"
import { Brand } from "@/components/shared/brand"
import { CreateTransferMenu } from "@/components/transfers/create-transfer-menu"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

function getSendHref(value: string) {
  const recipient = value.trim()
  if (!recipient) return "/transfers/new/send"

  try {
    const parsed = parseGOTLink(recipient)
    return parsed.kind === "intent"
      ? parsed.route
      : `/transfers/new/send?recipient=${encodeURIComponent(formatIdentityLabel(parsed))}`
  } catch {
    return `/transfers/new/send?recipient=${encodeURIComponent(recipient)}`
  }
}

export function HomePage() {
  const router = useRouter()
  const [recipient, setRecipient] = useState("")
  const [fragmentLink, setFragmentLink] = useState<GOTLink | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function syncFragment() {
      if (!window.location.hash) {
        setFragmentLink(null)
        setError(null)
        return
      }
      try {
        setFragmentLink(parseGOTLink(window.location.hash))
        setError(null)
      } catch (reason) {
        const message =
          reason instanceof Error ? reason.message : "This GOT link is invalid."
        setFragmentLink(null)
        setError(message)
      }
    }

    syncFragment()
    window.addEventListener("hashchange", syncFragment)
    return () => window.removeEventListener("hashchange", syncFragment)
  }, [])

  function continueToTransfer(value: string) {
    try {
      const parsed = parseGOTLink(value)
      setError(null)
      if (parsed.kind === "intent") router.push(parsed.route)
      else
        router.push(
          `/transfers/new/send?recipient=${encodeURIComponent(formatIdentityLabel(parsed))}`
        )
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "This recipient is invalid."
      )
    }
  }

  if (fragmentLink?.kind === "identity") {
    const label = formatIdentityLabel(fragmentLink)
    return (
      <main className="grid min-h-svh place-items-center bg-foreground p-5 text-background">
        <section className="w-full max-w-md rounded-2xl bg-background p-7 text-foreground shadow-2xl sm:p-9">
          <div className="mb-12">
            <Brand />
          </div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
            GOT RECIPIENT LINK
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em]">
            Transfer to {label}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Choose an amount, then confirm the transfer with your Base Account.
          </p>
          <Button
            className="mt-8 h-11 w-full"
            onClick={() => continueToTransfer(label)}
          >
            Continue
          </Button>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Onchain. Direct. Non-custodial.
          </p>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-svh px-5 sm:px-8">
      <header className="mx-auto flex h-20 max-w-6xl items-center justify-between border-b">
        <Brand compact />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="/dashboard/transfers" className="hover:text-foreground">
            Transfers
          </Link>
          <Link href="/dashboard/names" className="hover:text-foreground">
            Names
          </Link>
          <Link href="/dashboard/developers" className="hover:text-foreground">
            Developers
          </Link>
        </nav>
        <BaseAccountButton compact href="/dashboard" />
      </header>

      <section className="mx-auto max-w-4xl py-24 text-center sm:py-32">
        <p className="mb-5 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">
          GLOBAL ONCHAIN TRANSFERS
        </p>
        <h1 className="text-5xl leading-[.95] font-semibold tracking-[-0.065em] sm:text-7xl lg:text-[84px]">
          Send it. GOT it.
        </h1>
        <p className="mx-auto mt-7 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Enter who or what the transfer is for. GOT handles wallets,
          deterministic addresses, and onchain details underneath.
        </p>
        <form
          className="mx-auto mt-9 flex max-w-2xl flex-col gap-2 rounded-xl border bg-card p-2 shadow-[0_18px_50px_rgba(0,0,0,.06)] sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            continueToTransfer(recipient)
          }}
        >
          <label className="flex min-h-11 flex-1 items-center gap-3 px-2">
            <Globe2 className="size-4 text-muted-foreground" />
            <span className="sr-only">Recipient</span>
            <Input
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              className="h-10 border-0 shadow-none focus-visible:ring-0"
              placeholder="Name, social handle, email, phone or 0x…"
            />
          </label>
          <CreateTransferMenu
            triggerClassName="h-11 px-5"
            sendHref={getSendHref(recipient)}
          />
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <p className="mt-4 text-xs text-muted-foreground">
          Supports @name, x:@handle, tg:@handle, email, phone, deterministic 0x
          transfer links.
        </p>
      </section>

      <section className="mx-auto grid max-w-6xl border-y md:grid-cols-3">
        {[
          {
            number: "01",
            title: "Create",
            copy: "Enter a recipient and amount. GOT prepares the deterministic transfer address.",
            icon: Code2,
          },
          {
            number: "02",
            title: "Share",
            copy: "Send one human-readable recipient link or one specific transfer link.",
            icon: Link2,
          },
          {
            number: "03",
            title: "Transfer",
            copy: "Funds move directly on Base. GOT never takes custody.",
            icon: MoveRight,
          },
        ].map((item) => {
          const Icon = item.icon
          return (
            <article
              key={item.number}
              className="border-b py-8 last:border-b-0 md:border-r md:border-b-0 md:px-8 md:first:pl-0 md:last:border-r-0"
            >
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{item.number}</span>
                <Icon className="size-4" />
              </div>
              <h2 className="mt-10 text-xl font-medium tracking-[-0.03em]">
                {item.title}
              </h2>
              <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                {item.copy}
              </p>
            </article>
          )
        })}
      </section>

      <footer className="mx-auto flex h-24 max-w-6xl items-center justify-between text-xs text-muted-foreground">
        <span>Onchain. Direct. Non-custodial.</span>
        <span>
          {new Date().getFullYear()} ©{" "}
          <strong className="text-foreground">got.cx</strong>
        </span>
      </footer>
    </main>
  )
}
