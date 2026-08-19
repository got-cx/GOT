"use client"

import {
  createGOTProtocolClient,
  encodeDeployAndExecuteIntent,
  encodeResolveIntent,
  GOT_BASE_FACTORY,
  GOTAPIError,
  type APIAuth,
  type AccountSession,
  type IntentConfig,
  type Workspace,
} from "@got-cx/sdk"
import { GOT_BASE_USDC } from "@got-cx/sdk/protocol"
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react"
import {
  encodeFunctionData,
  getAddress,
  parseAbi,
  stringToHex,
  type Address,
  type Hash,
} from "viem"

import { getBaseAccount } from "@/lib/base-account"
import { appConfig } from "@/lib/app-config"
import {
  getGOTAPIToken,
  getGOTClient,
  getServerGOTAPIToken,
  setGOTAPIToken,
  subscribeGOTAPIToken,
} from "@/lib/got-client"

type AuthContextValue = {
  account: Address | null
  workspace: Workspace | null
  session: AccountSession | null
  apiToken: string | null
  isLoading: boolean
  isSigningIn: boolean
  error: string | null
  isConfigured: boolean
  signIn: (options?: { rotateToken?: boolean }) => Promise<void>
  signOut: () => Promise<void>
  transferUSDC: (to: Address, amount: string) => Promise<Hash>
  deployAndResolveIntent: (
    intentAddress: Address,
    config: IntentConfig
  ) => Promise<Hash>
  resolveIntent: (intentAddress: Address) => Promise<Hash>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const sessionQueryKey = ["auth", "session"] as const

function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: sessionQueryKey,
    queryFn: async (): Promise<APIAuth | null> => {
      if (!getGOTAPIToken()) return null
      try {
        return await getGOTClient().auth.session()
      } catch (error) {
        if (error instanceof GOTAPIError && error.status === 401) return null
        throw error
      }
    },
  })
  const apiToken = useSyncExternalStore(
    subscribeGOTAPIToken,
    getGOTAPIToken,
    getServerGOTAPIToken
  )
  const [isSigningIn, setIsSigningIn] = useState(false)
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

  const signIn = useCallback(
    async (options?: { rotateToken?: boolean }) => {
      setIsSigningIn(true)
      setError(null)
      try {
        const provider = (await getBaseAccount()).getProvider()
        const accounts = await provider.request({
          method: "eth_requestAccounts",
        })
        if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
          throw new Error("Base Account did not return an account address.")
        }
        const address = getAddress(accounts[0])
        const challenge = await getGOTClient().auth.nonce(address)
        const signature = await provider.request({
          method: "personal_sign",
          params: [stringToHex(challenge.message), address],
        })
        if (typeof signature !== "string") {
          throw new Error("Base Account did not return a signature.")
        }
        const result = await getGOTClient().auth.token({
          address,
          message: challenge.message,
          nonce: challenge.nonce,
          signature,
          rotate: options?.rotateToken,
        })
        setGOTAPIToken(result.token)
        queryClient.removeQueries({ queryKey: ["got-api"] })
        queryClient.setQueryData(sessionQueryKey, {
          session: result.session,
          workspace: result.workspace,
        })
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to sign in with Base."
        )
      } finally {
        setIsSigningIn(false)
      }
    },
    [queryClient]
  )

  const signOut = useCallback(async () => {
    setGOTAPIToken(null)
    queryClient.setQueryData(sessionQueryKey, null)
    queryClient.removeQueries({ queryKey: ["got-api"] })
  }, [queryClient])

  const transferUSDC = useCallback(
    async (to: Address, amount: string) => {
      const provider = (await getBaseAccount()).getProvider()
      const accounts = await provider.request({ method: "eth_requestAccounts" })
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("Authenticate with your Base Account to continue.")
      }
      if (account && getAddress(accounts[0]) !== account) {
        throw new Error("Use the Base Account that is signed in to got.cx.")
      }
      const data = encodeFunctionData({
        abi: parseAbi([
          "function transfer(address to, uint256 amount) returns (bool)",
        ]),
        functionName: "transfer",
        args: [to, BigInt(amount)],
      })
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [{ from: accounts[0], to: GOT_BASE_USDC, data }],
      })
      if (typeof hash !== "string" || !hash.startsWith("0x")) {
        throw new Error("Base Account did not return a transaction hash.")
      }
      return hash as Hash
    },
    [account]
  )

  const deployAndResolveIntent = useCallback(
    async (intentAddress: Address, config: IntentConfig) => {
      const provider = (await getBaseAccount()).getProvider()
      const accounts = await provider.request({ method: "eth_requestAccounts" })
      if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
        throw new Error("Authenticate with the requesting Base Account.")
      }
      const executor = getAddress(accounts[0])
      const directOwner = /^0x0{64}$/i.test(config.ownerKey)
        ? getAddress(config.ownerSource)
        : null
      const restrictedResolver = getAddress(config.authorizedResolver)
      if (executor !== directOwner && executor !== restrictedResolver) {
        throw new Error(
          "Only the account that created or currently owns this request can settle it."
        )
      }

      const protocol = createGOTProtocolClient(appConfig.baseRpcUrl)
      const preview = await protocol.previewIntent(config)
      if (preview.toLowerCase() !== intentAddress.toLowerCase()) {
        throw new Error(
          "The recovery configuration does not match this intent address."
        )
      }
      await protocol.simulateDeployAndExecute(config, executor)
      const hash = await provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: executor,
            to: GOT_BASE_FACTORY,
            data: encodeDeployAndExecuteIntent(config),
          },
        ],
      })
      if (typeof hash !== "string" || !hash.startsWith("0x")) {
        throw new Error("Base Account did not return a transaction hash.")
      }
      return hash as Hash
    },
    []
  )

  const resolveIntent = useCallback(async (intentAddress: Address) => {
    const provider = (await getBaseAccount()).getProvider()
    const accounts = await provider.request({ method: "eth_requestAccounts" })
    if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
      throw new Error("Authenticate with the requesting Base Account.")
    }
    const executor = getAddress(accounts[0])
    const protocol = createGOTProtocolClient(appConfig.baseRpcUrl)
    const state = await protocol.readIntentState(intentAddress)
    if (!state.deployed || !state.authorizedResolver) {
      throw new Error("This GOT intent has not been deployed yet.")
    }
    if (executor !== state.authorizedResolver) {
      throw new Error(
        "Only the account authorized by this request can resolve it."
      )
    }
    await protocol.simulateResolve(intentAddress, executor)
    const hash = await provider.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: executor,
          to: intentAddress,
          data: encodeResolveIntent(),
        },
      ],
    })
    if (typeof hash !== "string" || !hash.startsWith("0x")) {
      throw new Error("Base Account did not return a transaction hash.")
    }
    return hash as Hash
  }, [])

  return (
    <AuthContext.Provider
      value={{
        account,
        apiToken,
        workspace,
        session,
        isLoading: isPending,
        isSigningIn,
        error,
        isConfigured: true,
        signIn,
        signOut,
        transferUSDC,
        deployAndResolveIntent,
        resolveIntent,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

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

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used within AppProviders")
  return value
}
