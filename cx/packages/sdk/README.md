# @got-cx/sdk

Typed JavaScript and TypeScript SDK for integrating applications and services
with [got.cx](https://got.cx). It includes:

- A client for the got.cx product API.
- Authentication helpers for bearer tokens and browser sessions.
- GOT link parsing, normalization, and formatting.
- Base network helpers for creating, previewing, and reading payment intents.
- Shared transfer, request, subscription, and authentication types.

The package ships as precompiled ESM and defines no install lifecycle script.
Node.js 22 or newer is required.

## Install

```sh
npm install @got-cx/sdk
```

## API client

Create an API client with a bearer token. Keep production tokens in server-side
environment variables and never expose them in browser bundles.

```ts
import { GOTClient } from "@got-cx/sdk"

const got = new GOTClient({
  baseUrl: "https://api.got.cx",
  getAccessToken: () => process.env.GOT_API_TOKEN ?? null,
})

const overview = await got.overview()
const transfers = await got.transfers.list({ direction: "incoming" })
```

`getAccessToken` may return a string, `null`, or a promise. It is called for
every request, which allows integrations to rotate or refresh credentials
without recreating the client.

### Create a transfer

Every transfer requires a user-defined `transferId`. The API derives the
protocol intent ID from it and the creating account, so retrying an identical
creation is idempotent. Reusing the ID with different details returns a conflict.

```ts
import {
  buildRequestIntent,
  deriveIntentId,
  GOT_BASE_CHAIN_ID,
  GOT_BASE_USDC,
  GOTClient,
  serializeIntentConfig,
} from "@got-cx/sdk"

const got = new GOTClient({
  baseUrl: "https://api.got.cx",
  getAccessToken: () => process.env.GOT_API_TOKEN ?? null,
})

const transferId = "invoice-1042"
const config = buildRequestIntent({
  recipient: "@alice",
  amount: "25.00",
  intentId: deriveIntentId(transferId, accountAddress),
})
const transfer = await got.transfers.create({
  chainId: GOT_BASE_CHAIN_ID,
  direction: "outgoing",
  transferId,
  recipient: "@alice",
  recipientTargetAmount: config.amount.toString(),
  token: GOT_BASE_USDC,
  note: "Consulting services",
  intentConfig: serializeIntentConfig(config),
})

console.log(transfer.id, transfer.intentAddress, transfer.status)
```

### Wallet authentication

Request a challenge, sign its exact `message` with the account wallet, and
exchange the signature for an API token:

```ts
const challenge = await got.auth.nonce(address)
const signature = await wallet.signMessage({ message: challenge.message })

const auth = await got.auth.token({
  address: challenge.address,
  message: challenge.message,
  nonce: challenge.nonce,
  signature,
  delivery: "bearer",
})

console.log(auth.token)
```

For a browser session, configure the API to allow the application's exact
origin and use cookie credentials:

```ts
const got = new GOTClient({
  baseUrl: "https://api.got.cx",
  credentials: "include",
})
```

Use `delivery: "cookie"` when exchanging the signed challenge. The token
response then contains session and workspace data without exposing the bearer
token.

### Errors

Non-successful API responses throw `GOTAPIError` with the HTTP status and, when
provided by the API, a stable application error code.

```ts
import { GOTAPIError } from "@got-cx/sdk"

try {
  await got.transfers.get("missing-transfer")
} catch (error) {
  if (error instanceof GOTAPIError) {
    console.error(error.status, error.code, error.message)
  }
}
```

## GOT links

Normalize GOT names, social handles, email addresses, phone numbers, and intent
addresses into canonical got.cx routes:

```ts
import { formatGOTLink, parseGOTLink } from "@got-cx/sdk/links"

const recipient = parseGOTLink("x:@vitalik")

console.log(recipient.kind) // "identity"
console.log(recipient.canonicalIdentity) // "x:vitalik"
console.log(formatGOTLink(recipient)) // "https://got.cx/x:@vitalik"
```

`parseGOTLink` throws `GOTLinkError` when the supplied identity, address, or URL
is invalid.

## Base protocol helpers

The protocol helpers target Base (`chainId` 8453) and use USDC with six decimal
places. They can build deterministic intent configuration, preview its address,
prepare contract calls, and read live intent state.

```ts
import {
  buildRequestIntent,
  createGOTProtocolClient,
  serializeIntentConfig,
} from "@got-cx/sdk/protocol"

const config = buildRequestIntent({
  recipient: "@alice",
  amount: "25.00",
  metadata: "invoice-1042",
})

const protocol = createGOTProtocolClient(
  process.env.BASE_RPC_URL,
  process.env.BASE_RPC_FALLBACK
)
const intentAddress = await protocol.previewIntent(config)

console.log(intentAddress)
console.log(serializeIntentConfig(config))
```

`simulateDeployAndExecute`, `simulateResolve`, and `simulateSettle` return viem
simulation results that can be passed to a wallet client. `readIntentSnapshots` verifies recovery
envelopes and reads owner, balance, and processing state for the complete page
in one call through the canonical Base `GOTLens` deployment.

The optional second URL is used as a fallback after viem's default retries.

## Client surface

The `GOTClient` currently provides:

- `auth`: nonce, token, session, and logout operations.
- `overview`: workspace dashboard totals and recent transfers.
- `transfers`: list, get, create, create request, remove, and verified funding
  record operations.
- `names`: list and claim GOT identities, including X verification startup.
- `subscriptions`: list workspace subscriptions.

All methods return typed promises. Public types such as `Transfer`,
`TransferRequest`, `TransferList`, `Subscription`, and `APIAuth` are exported
from both the package root and `@got-cx/sdk/types`.

## Entry points

```ts
import { GOTClient } from "@got-cx/sdk/api"
import { parseGOTLink } from "@got-cx/sdk/links"
import { createGOTProtocolClient } from "@got-cx/sdk/protocol"
import type { Transfer } from "@got-cx/sdk/types"
```

Importing from `@got-cx/sdk` exposes the complete public API.

## Security

- Keep bearer tokens on trusted servers.
- Use a dedicated, scoped, revocable token when browser-visible development
  credentials are unavoidable.
- Do not treat a predicted intent address as deployed; verify its chain state
  before relying on contract behavior.
- Preserve the user transfer ID across retries of the same creation.

## License

MIT
