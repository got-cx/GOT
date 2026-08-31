"use client"

import { AtSign, Code2, LayoutDashboard, Menu, RefreshCw } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { BaseAccountButton } from "@/components/auth/base-account-button"
import { useAuth } from "@/components/auth/auth-provider"
import { Brand } from "@/components/shared/brand"
import { Button } from "@workspace/ui/components/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@workspace/ui/components/sheet"

const navigation = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/addresses", label: "Addresses", icon: AtSign },
  { href: "/dashboard/subscriptions", label: "Subscriptions", icon: RefreshCw },
  { href: "/dashboard/developers", label: "Developers", icon: Code2 },
] as const

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { workspace, account, isLoading } = useAuth()
  const [open, setOpen] = useState(false)
  const workspaceName = workspace?.name ?? "Your workspace"
  const plan =
    workspace?.planName ??
    (account ? "Connected" : isLoading ? "Checking account…" : "Sign in")

  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r bg-card px-4 py-5 md:flex">
        <Brand />
        <div className="mt-6 flex items-center gap-2.5 rounded-lg border p-2.5">
          <span className="grid size-8 place-items-center rounded-md bg-foreground text-[10px] font-semibold text-background">
            {workspaceName.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-xs">{workspaceName}</strong>
            <small className="block truncate text-[11px] text-muted-foreground">
              {plan}
            </small>
          </span>
        </div>
        <nav
          className="mt-5 flex flex-col gap-1"
          aria-label="Dashboard navigation"
        >
          {navigation.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                <Icon className="size-4" strokeWidth={1.8} />
                {item.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto flex justify-end border-t pt-4">
          <BaseAccountButton />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Brand />
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="outline" size="icon" />}>
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-72 p-5">
            <SheetTitle className="sr-only">Dashboard navigation</SheetTitle>
            <div className="mb-7">
              <Brand compact />
            </div>
            <nav className="flex flex-col gap-1">
              {navigation.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex h-10 items-center gap-3 rounded-lg px-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-8 flex justify-start border-t pt-4">
              <BaseAccountButton />
            </div>
          </SheetContent>
        </Sheet>
      </header>

      <main className="md:ml-56">
        <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
