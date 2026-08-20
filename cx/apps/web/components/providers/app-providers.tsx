"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useEffect, useState } from "react"

import { AuthProvider } from "@/components/auth/auth-provider"

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: 30_000,
          },
        },
      })
  )

  useEffect(() => {
    try {
      // Remove data written by the retired browser-backup feature.
      window.localStorage.removeItem("got.intent-envelopes.v1")
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}
