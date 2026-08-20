import type {
  APIAuth,
  APIAuthToken,
  CreateTransferInput,
  DashboardOverview,
  NameRecord,
  Subscription,
  Transfer,
  TransferList,
  TransferRequest,
  TransferRequestInput,
} from "./types"

export type GOTClientOptions = {
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
  direction?: "incoming" | "outgoing"
  query?: string
  cursor?: string
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

export class GOTClient {
  readonly #baseUrl: string
  readonly #fetch: typeof globalThis.fetch
  readonly #credentials: RequestCredentials
  readonly #getAccessToken?: GOTClientOptions["getAccessToken"]

  constructor(options: GOTClientOptions) {
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
      }),
  }

  overview = () => this.#request<DashboardOverview>("/overview")

  transfers = {
    list: (options: ListTransfersOptions = {}) => {
      const query = new URLSearchParams()
      if (options.direction) query.set("direction", options.direction)
      if (options.query) query.set("query", options.query)
      if (options.cursor) query.set("cursor", options.cursor)
      const suffix = query.size ? `?${query}` : ""
      return this.#request<TransferList>(`/transfers${suffix}`)
    },
    get: (id: string) =>
      this.#request<Transfer>(`/transfers/${encodeURIComponent(id)}`),
    getRequest: (id: string) =>
      this.#request<TransferRequest>(`/transfers/${encodeURIComponent(id)}`),
    getByIntent: (intentAddress: string) =>
      this.#request<TransferRequest>(
        `/intents/${encodeURIComponent(intentAddress)}`
      ),
    createRequest: (input: TransferRequestInput, idempotencyKey: string) =>
      this.#request<TransferRequest>("/transfers", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ direction: "incoming", ...input }),
      }),
    create: (input: CreateTransferInput, idempotencyKey: string) =>
      this.#request<Transfer>("/transfers", {
        method: "POST",
        headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify(input),
      }),
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
      }),
  }
  subscriptions = {
    list: () => this.#request<{ items: Subscription[] }>("/subscriptions"),
  }
}
