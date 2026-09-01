import type {
  AddressList,
  AddressRecord,
  APIAuth,
  APIAuthToken,
  CreateAddressInput,
  DashboardOverview,
  NameRecord,
  Subscription,
  Transfer,
  TransferList,
} from "./types"

export type GOTAPIClientOptions = {
  baseUrl: string
  fetch?: typeof globalThis.fetch
  credentials?: RequestCredentials
  getAccessToken?: () => string | null | Promise<string | null>
}

export type AuthTokenDelivery = "bearer" | "cookie"

type SignedAuthChallenge = {
  address: string
  message: string
  nonce: string
  signature: string
  rotate?: boolean
}

export type AuthTokenCredentials = SignedAuthChallenge &
  ({ delivery: "cookie" } | { delivery?: "bearer" })

type AuthTokenResult<TCredentials extends AuthTokenCredentials> =
  TCredentials extends { delivery: "cookie" } ? APIAuth : APIAuthToken

export type ListTransfersOptions = {
  query?: string
  cursor?: string
  limit?: number
}

export class GOTAPIError extends Error {
  override readonly name = "GOTAPIError"

  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message)
  }
}

export class GOTAPIClient {
  readonly #baseUrl: string
  readonly #fetch: typeof globalThis.fetch
  readonly #credentials: RequestCredentials
  readonly #getAccessToken?: GOTAPIClientOptions["getAccessToken"]

  constructor(options: GOTAPIClientOptions) {
    if (!options.baseUrl.trim()) throw new Error("GOT API baseUrl is required")
    this.#baseUrl = options.baseUrl.replace(/\/$/, "")
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis)
    this.#credentials = options.credentials ?? "omit"
    this.#getAccessToken = options.getAccessToken
  }

  async #request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.#getAccessToken?.()
    const headers = new Headers(init.headers)
    headers.set("Accept", "application/json")
    if (init.body) headers.set("Content-Type", "application/json")
    if (token) headers.set("Authorization", `Bearer ${token}`)

    const response = await this.#fetch(`${this.#baseUrl}${path}`, {
      credentials: this.#credentials,
      ...init,
      headers,
    })

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string }
        message?: string
      } | null
      throw new GOTAPIError(
        body?.error?.message ??
          body?.message ??
          `GOT API request failed (${response.status})`,
        response.status,
        body?.error?.code
      )
    }

    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  auth = {
    nonce: (address: string) =>
      this.#request<{
        address: string
        nonce: string
        message: string
        expiresAt: string
      }>("/auth/nonce", {
        method: "POST",
        body: JSON.stringify({ address }),
      }),
    token: <TCredentials extends AuthTokenCredentials>(
      credentials: TCredentials
    ) =>
      this.#request<AuthTokenResult<TCredentials>>("/auth/token", {
        method: "POST",
        ...(credentials.delivery === "cookie"
          ? { credentials: "include" as const }
          : {}),
        body: JSON.stringify(credentials),
      }),
    session: () => this.#request<APIAuth>("/auth/session"),
    logout: () =>
      this.#request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      }),
  }

  overview = () => this.#request<DashboardOverview>("/overview")

  addresses = {
    create: (input: CreateAddressInput) =>
      this.#request<AddressRecord>("/addresses", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    list: (options: { query?: string; cursor?: string } = {}) => {
      const query = new URLSearchParams()
      if (options.query) query.set("query", options.query)
      if (options.cursor) query.set("cursor", options.cursor)
      const suffix = query.size ? `?${query}` : ""
      return this.#request<AddressList>(`/addresses${suffix}`)
    },
    get: (id: string) =>
      this.#request<AddressRecord>(`/addresses/${encodeURIComponent(id)}`),
    getByIntentAddress: (intentAddress: string) =>
      this.#request<AddressRecord>(
        `/addresses/by-intent-address/${encodeURIComponent(intentAddress)}`
      ),
    transfers: (
      id: string,
      options: { cursor?: string; limit?: number } = {}
    ) => {
      const query = new URLSearchParams()
      if (options.cursor) query.set("cursor", options.cursor)
      if (options.limit) query.set("limit", String(options.limit))
      const suffix = query.size ? `?${query}` : ""
      return this.#request<TransferList>(
        `/addresses/${encodeURIComponent(id)}/transfers${suffix}`
      )
    },
    archive: (id: string) =>
      this.#request<void>(`/addresses/${encodeURIComponent(id)}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      }),
    /** @deprecated Use archive(). Address removal is always non-destructive. */
    remove: (id: string) =>
      this.#request<void>(`/addresses/${encodeURIComponent(id)}`, {
        method: "DELETE",
        body: JSON.stringify({}),
      }),
  }

  transfers = {
    list: (options: ListTransfersOptions = {}) => {
      const query = new URLSearchParams()
      if (options.query) query.set("query", options.query)
      if (options.cursor) query.set("cursor", options.cursor)
      if (options.limit) query.set("limit", String(options.limit))
      const suffix = query.size ? `?${query}` : ""
      return this.#request<TransferList>(`/transfers${suffix}`)
    },
    get: (id: string) =>
      this.#request<Transfer>(`/transfers/${encodeURIComponent(id)}`),
  }

  names = {
    list: () => this.#request<{ items: NameRecord[] }>("/names"),
    claim: (identifier: string) =>
      this.#request<{ id: string; status: "pending" }>("/names/claims", {
        method: "POST",
        body: JSON.stringify({ identifier }),
      }),
    startTwitterClaim: () =>
      this.#request<{
        csrfUrl: string
        signInUrl: string
        callbackUrl: string
      }>("/names/claims/x", {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({}),
      }),
  }
  subscriptions = {
    list: () => this.#request<{ items: Subscription[] }>("/subscriptions"),
  }
}
