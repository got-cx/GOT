# @got-cx/sdk

Open JavaScript and TypeScript interface to GOT Protocol and the optional
[got.cx](https://got.cx) managed services.

## Create an Intent Address

`createIntent()` is synchronous, deterministic, and entirely local. It does not
need an API, API key, database, RPC request, wallet, or transaction.

```ts
import { createIntent } from "@got-cx/sdk"

const intent = createIntent({
  owner: "0x...",
  ref: "customer:123",
})

console.log(intent.address)
```

An open-amount Intent (`amount` omitted or `"0"`) is reusable and can receive
any number of Transfers. A fixed USDC amount uses human units:

```ts
const intent = createIntent({
  owner: "0x...",
  ref: "invoice:1042",
  amount: "100",
  metadata: {
    customerId: "customer:123",
    orderId: "991",
  },
})
```

Metadata is canonically serialized and hashed into the immutable protocol
configuration. Object key order does not matter; changing metadata, amount, or
any other protocol field changes the Intent Address.

The package also includes:

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

## Hosted API client

Create an API client with a bearer token. Keep production tokens in server-side
environment variables and never expose them in browser bundles.

```ts
import { GOTAPIClient } from "@got-cx/sdk/api"

const got = new GOTAPIClient({
  baseUrl: "https://api.got.cx",
  getAccessToken: () => process.env.GOT_API_TOKEN ?? null,
})

const overview = await got.overview()
const addresses = await got.addresses.list()
```

`getAccessToken` may return a string, `null`, or a promise. It is called for
every request, which allows integrations to rotate or refresh credentials
without recreating the client.

### Create an Address and read its Transfers

Address creation stores the managed Intent Address only. Transfers appear after
the hosted indexer observes canonical GOT `TransferProcessed` logs. Funding
alone does not create an indexed Transfer.

```ts
import { GOTAPIClient } from "@got-cx/sdk"

const got = new GOTAPIClient({
  baseUrl: "https://api.got.cx",
  getAccessToken: () => process.env.GOT_API_TOKEN ?? null,
})

const address = await got.addresses.create({
  ref: "invoice:1042",
  amount: "25.00",
})
const transfers = await got.addresses.transfers(address.id, { limit: 50 })

console.log(address.intentAddress, transfers.items)
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
const got = new GOTAPIClient({
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
configurations and reads owner, balance, and processing state for the complete page
in one call through the canonical Base `GOTLens` deployment.

The optional second URL is used as a fallback after viem's default retries.

## Client surface

The `GOTAPIClient` currently provides:

- `auth`: nonce, token, session, and logout operations.
- `overview`: workspace dashboard totals and recent transfers.
- `addresses`: create, list, get, find by Intent Address, remove, and list
  associated Transfers.
- `transfers`: list and get indexed GOT `TransferProcessed` events.
- `names`: list and claim GOT identities, including X verification startup.
- `subscriptions`: list workspace subscriptions.

All methods return typed promises. Public types such as `Transfer`,
`TransferList`, `Subscription`, and `APIAuth` are exported
from both the package root and `@got-cx/sdk/types`.

## Entry points

```ts
import { GOTAPIClient } from "@got-cx/sdk/api"
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
- Treat indexed Transfers as immutable processing history; current balance still
  comes from Base.

## License

MIT
