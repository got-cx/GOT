"use client"

import {
  ArrowRight,
  Code2,
  Link2,
  ListChecks,
  MoveRight,
  MoveHorizontal,
  QrCode,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useSyncExternalStore } from "react"

import { useAuth } from "@/components/auth/auth-provider"
import { BaseAccountButton } from "@/components/auth/base-account-button"
import { Brand } from "@/components/shared/brand"
import { CreateTransferMenu } from "@/components/transfers/create-transfer-menu"
import { PublicRoute } from "@/components/transfers/public-route"
import { Button } from "@workspace/ui/components/button"

enum TransferHashPrefix {
  Email = "#email:",
  Phone = "#phone:",
}

const transferHashPrefixes = Object.values(TransferHashPrefix)

function subscribeToHashChange(onStoreChange: () => void) {
  window.addEventListener("hashchange", onStoreChange)
  return () => window.removeEventListener("hashchange", onStoreChange)
}

function getHash() {
  return window.location.hash
}

function getServerHash() {
  return ""
}

function isTransferHash(hash: string) {
  const normalizedHash = hash.toLowerCase()
  return transferHashPrefixes.some((prefix) =>
    normalizedHash.startsWith(prefix)
  )
}

const steps = [
  {
    number: "01",
    title: "Create a transfer",
    copy: "Choose who it is for, an amount, and optional context.",
    icon: UserRound,
  },
  {
    number: "02",
    title: "Share a link",
    copy: "Send one simple GOT link or QR code anywhere.",
    icon: Link2,
  },
  {
    number: "03",
    title: "Receive the transfer",
    copy: "Funds move directly onchain to the destination.",
    icon: MoveRight,
  },
] as const

const capabilities = [
  {
    title: "Transfer links",
    copy: "Create and share a link for any transfer.",
    icon: Link2,
  },
  {
    title: "QR transfers",
    copy: "Scan and transfer instantly.",
    icon: QrCode,
  },
  {
    title: "Human-readable recipients",
    copy: "Use names and identities instead of addresses.",
    icon: UserRound,
  },
  {
    title: "Direct transfers",
    copy: "Funds move directly onchain.",
    icon: ShieldCheck,
  },
  {
    title: "Transfer records",
    copy: "Track transfers with human-readable context.",
    icon: ListChecks,
  },
  {
    title: "Integrate GOT",
    copy: "Add transfers with the SDK or API.",
    icon: Code2,
  },
] as const

const audiences = [
  "Apps",
  "Fintech",
  "Games",
  "SaaS",
  "Merchants",
  "Wallets",
  "Platforms",
  "AI agents",
] as const

const landingNavigation = [
  { label: "Transfers", href: "#transfers" },
  { label: "Names", href: "#names" },
  { label: "Developers", href: "#developers" },
] as const

const dashboardNavigation = [
  { label: "Transfers", href: "/dashboard/transfers" },
  { label: "Names", href: "/dashboard/names" },
  { label: "Developers", href: "/dashboard/developers" },
] as const

export function HomePage() {
  const { account } = useAuth()
  const hash = useSyncExternalStore(
    subscribeToHashChange,
    getHash,
    getServerHash
  )
  const navigation = account ? dashboardNavigation : landingNavigation

  if (isTransferHash(hash)) return <PublicRoute route={hash} />

  return (
    <main className="min-h-svh px-5 sm:px-8">
      <header className="mx-auto flex h-18 max-w-6xl items-center justify-between border-b sm:h-20">
        <Brand compact />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          {navigation.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <BaseAccountButton compact href="/dashboard" />
      </header>

      <section className="mx-auto max-w-5xl py-14 text-center sm:py-24 lg:py-28">
        <p className="mb-5 text-xs font-semibold tracking-[0.16em] text-muted-foreground">
          ONCHAIN TRANSFER SOLUTIONS
        </p>
        <h1 className="text-5xl leading-[0.96] font-semibold tracking-[-0.065em] sm:text-7xl lg:text-[80px]">
          Accept onchain transfers now
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
          Create a transfer link. Share it anywhere. Receive USDC directly
          onchain.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-2 sm:flex-row sm:items-center">
          <CreateTransferMenu triggerClassName="h-11 px-5" />
          <Button
            variant="outline"
            className="h-11 px-5"
            nativeButton={false}
            render={<Link href="#developers" />}
          >
            For builders <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
        <p className="mt-7 font-medium italic">Send it. GOT it.</p>
      </section>

      <section
        id="transfers"
        className="mx-auto max-w-6xl scroll-mt-6 border-y py-12 sm:py-16"
      >
        <div className="mb-10 sm:mb-12">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            HOW IT WORKS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Create · Share · Transfer
          </h2>
        </div>
        <div className="grid md:grid-cols-3">
          {steps.map((item) => {
            const Icon = item.icon
            return (
              <article
                key={item.number}
                className="border-b py-7 last:border-b-0 md:border-r md:border-b-0 md:px-8 md:py-2 md:first:pl-0 md:last:border-r-0"
              >
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.number}</span>
                  <Icon className="size-4" />
                </div>
                <h3 className="mt-9 text-xl font-medium tracking-[-0.03em]">
                  {item.title}
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
                  {item.copy}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto my-16 grid max-w-6xl gap-10 rounded-3xl bg-foreground px-6 py-10 text-background sm:my-24 sm:px-10 sm:py-14 lg:grid-cols-[1.1fr_.9fr] lg:gap-20 lg:px-14">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-background/70">
            A HUMAN TRANSFER EXPERIENCE
          </p>
          <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
            Onchain transfers without the onchain complexity
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-6 text-background/75 sm:text-base sm:leading-7">
            GOT keeps the infrastructure onchain and the experience human.
          </p>
        </div>
        <div className="self-center rounded-2xl border border-background/15 p-5 sm:p-7">
          <p className="text-sm text-background/70">For users</p>
          <p className="mt-3 text-lg font-medium sm:text-xl">
            Name · Amount · Transfer
          </p>
          <div className="my-6 border-t border-background/15" />
          <p className="text-sm text-background/70">
            Infrastructure underneath
          </p>
          <p className="mt-3 text-sm text-background/75">
            Account → Network → Address → Transaction
          </p>
          <p className="mt-7 border-t border-background/15 pt-5 text-sm font-medium">
            Human context first. Onchain details on demand.
          </p>
        </div>
      </section>

      <section
        id="names"
        className="mx-auto max-w-6xl scroll-mt-6 py-8 sm:py-12"
      >
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            WHAT YOU CAN DO
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Everything you need for simple onchain transfers.
          </h2>
        </div>
        <div className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((item) => {
            const Icon = item.icon
            return (
              <article key={item.title} className="border-t py-6">
                <Icon className="size-4 text-muted-foreground" />
                <h3 className="mt-6 font-medium tracking-[-0.02em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.copy}
                </p>
              </article>
            )
          })}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-12 border-y py-14 sm:py-20 lg:grid-cols-2 lg:gap-20">
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            ONE DESTINATION
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Share one destination. Receive from many sources.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Share one simple destination. Transfers can start from compatible
            wallets, exchanges, fintech apps, and other products.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            BUILT FOR PRODUCTS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Onchain transfers for any product.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Give your users a simple way to send and receive value globally
            without building the transfer infrastructure yourself.
          </p>
          <ul
            className="mt-7 flex flex-wrap gap-2"
            aria-label="Example products"
          >
            {audiences.map((audience) => (
              <li
                key={audience}
                className="rounded-full border px-3 py-1.5 text-sm font-medium"
              >
                {audience}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="developers"
        className="mx-auto grid max-w-6xl scroll-mt-6 gap-10 py-16 sm:py-24 lg:grid-cols-[.85fr_1.15fr] lg:gap-20"
      >
        <div>
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            FOR BUILDERS
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            Add onchain transfers to your product.
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Use the GOT SDK or API to create transfer destinations, links, and
            records without building the transfer infrastructure yourself.
          </p>
          <p className="mt-6 text-sm font-medium">
            Onchain. Direct. Non-custodial.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button
              className="h-10 px-4"
              nativeButton={false}
              render={<Link href="/dashboard/developers" />}
            >
              Developer tools <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              variant="outline"
              className="h-10 px-4"
              nativeButton={false}
              render={
                <a
                  href="https://github.com/got-cx/GOT"
                  target="_blank"
                  rel="noreferrer"
                />
              }
            >
              View GitHub
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between border-b pb-4 text-sm text-muted-foreground">
            <span>Transfer flow</span>
            <span>Base · USDC</span>
          </div>
          <ol className="mt-2 divide-y">
            {[
              "Create destination",
              "Share link, QR code, or identifier",
              "Transfer USDC",
              "Funds resolve onchain",
            ].map((item, index) => (
              <li key={item} className="flex items-center gap-4 py-4 text-sm">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-medium">{item}</span>
              </li>
            ))}
          </ol>
          <p className="border-t pt-4 text-sm leading-6 text-muted-foreground">
            Built on Base with an SDK, API, and open protocol.
          </p>
        </div>
      </section>

      <section
        id="protocol"
        className="mx-auto max-w-6xl scroll-mt-6 border-y py-14 sm:py-20"
      >
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
            PRODUCT + PROTOCOL
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] sm:text-4xl">
            A simple product on open infrastructure.
          </h2>
        </div>
        <div className="mt-10 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
          <article className="rounded-2xl border p-6 sm:p-8">
            <p className="text-sm font-medium">GOT protocol 🌐</p>
            <h3 className="mt-10 text-2xl font-semibold tracking-[-0.04em]">
              Global onchain transfers infrastructure.
            </h3>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Open infrastructure for creating and resolving onchain transfer
              destinations.
            </p>
          </article>
          <div
            className="grid place-items-center py-1 text-muted-foreground"
            aria-hidden="true"
          >
            <MoveHorizontal className="size-5 rotate-90 md:rotate-0" />
          </div>
          <article className="rounded-2xl bg-foreground p-6 text-background sm:p-8">
            <p className="text-sm font-medium">got.cx 🐐</p>
            <h3 className="mt-10 text-2xl font-semibold tracking-[-0.04em]">
              Onchain transfer solutions built on GOT.
            </h3>
            <p className="mt-3 text-sm leading-6 text-background/75">
              The product experience for creating, sharing, receiving, and
              managing transfers.
            </p>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-6xl py-16 text-center sm:py-24">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground">
          WHY GOT EXISTS
        </p>
        <h2 className="mx-auto mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.05em] sm:text-5xl">
          Global Onchain Transfers for Everyone
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-7 text-muted-foreground">
          Our mission: Make global onchain transfers simple.
        </p>
        <div className="mx-auto mt-14 max-w-xl border-t pt-12">
          <h2 className="text-3xl font-semibold tracking-[-0.05em]">
            Accept onchain transfers now.
          </h2>
          <div className="mt-6 flex justify-center">
            <CreateTransferMenu triggerClassName="h-11 px-5" />
          </div>
          <p className="mt-6 font-medium italic">Send it. GOT it.</p>
        </div>
      </section>

      <footer className="mx-auto flex min-h-24 max-w-6xl flex-col items-center justify-between gap-3 border-t py-7 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
        <span>
          in <strong className="text-foreground">GOT</strong> we trust
        </span>
        <div className="flex items-center gap-5">
          <a
            href="https://x.com/got_cx"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            📢 Product updates
          </a>
          <a
            href="https://t.me/got_cx_chat"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 hover:text-foreground"
          >
            💬 Support
          </a>
          <span>
            {new Date().getFullYear()} ©{" "}
            <strong className="text-foreground">got.cx</strong>
          </span>
        </div>
      </footer>
    </main>
  )
}
