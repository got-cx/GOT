import type { Metadata } from "next"
import { headers } from "next/headers"
import { connection } from "next/server"
import { GeistMono } from "geist/font/mono"
import { GeistSans } from "geist/font/sans"

import "@workspace/ui/globals.css"
import { AppProviders } from "@/components/app-providers"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"

export const metadata: Metadata = {
  title: {
    default: "GOT — Global Onchain Transfers",
    template: "%s · got.cx",
  },
  description: "Global onchain transfers through one deterministic link.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://got.cx"),
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await connection()
  const nonce = (await headers()).get("x-nonce") ?? undefined

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        GeistMono.variable,
        "font-sans",
        GeistSans.variable
      )}
    >
      <body>
        <ThemeProvider nonce={nonce}>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
      </body>
    </html>
  )
}
