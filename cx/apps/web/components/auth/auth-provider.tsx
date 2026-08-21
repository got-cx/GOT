"use client"

import {
  GOTAPIError,
  type APIAuth,
  type AccountSession,
  type Workspace,
} from "@got-cx/sdk"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useState } from "react"
import type { Address } from "viem"

import { createCookieSession } from "@/lib/base-auth"
import { getGOTClient } from "@/lib/got-client"

type AuthContextValue = {
  account: Address | null
  workspace: Workspace | null
  session: AccountSession | null
  isLoading: boolean
  isSigningIn: boolean
  isSigningOut: boolean
  error: string | null
  signIn: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const sessionQueryKey = ["auth", "session"] as const

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<APIAuth | null> => {
      try {
        return await getGOTClient().auth.session()
      } catch (error) {
        if (error instanceof GOTAPIError && error.status === 401) return null
        throw error
      }
    },
  })
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const account = data?.session.address ?? null
  const workspace = useMemo<Workspace | null>(
    () => data?.workspace ?? null,
    [data]
  )
  const session = useMemo<AccountSession | null>(
    () => data?.session ?? null,
    [data]
  )

  const signIn = useCallback(async () => {
    setIsSigningIn(true)
    setError(null)
    try {
      const result = await createCookieSession()
      queryClient.setQueryData(sessionQueryKey, result)
      queryClient.removeQueries({ queryKey: ["got-api"] })
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to sign in with Base."
      )
    } finally {
      setIsSigningIn(false)
    }
  }, [queryClient])

  const signOut = useCallback(async () => {
    setIsSigningOut(true)
    setError(null)
    try {
      await getGOTClient().auth.logout()
      queryClient.setQueryData(sessionQueryKey, null)
      queryClient.removeQueries({ queryKey: ["got-api"] })
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to securely sign out."
      )
    } finally {
      setIsSigningOut(false)
    }
  }, [queryClient])

  return (
    <AuthContext.Provider
      value={{
        account,
        workspace,
        session,
        isLoading: isPending,
        isSigningIn,
        isSigningOut,
        error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AuthProvider")
  return value
}
