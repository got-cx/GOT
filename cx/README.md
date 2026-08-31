# got.cx interface

Production interface for GOT — address any intent onchain.

## Packages

- `apps/web` — public GOT links, transfer flows, receipts, and account dashboard.
- `apps/api` — private product API business logic.
- `packages/sdk` — typed got.cx API client, canonical GOT link parsing, and protocol helpers.
- `packages/ui` — shared shadcn components and design tokens.

The product SDK delegates normalization, name-key derivation, ABIs, and deployment addresses to the published `@got-cx/protocol@0.3.0` package. Base Account connectivity uses `@base-org/account`; users authenticate with the Base passkey flow and never connect a separate browser wallet.

## Configuration

The web app authenticates to the API only with an `HttpOnly`, `Secure`, `SameSite` cookie. Base Account sign-in creates the cookie-backed session; no authentication token is returned to or stored.
The API accepts either the secure session cookie or an `Authorization: Bearer got_live_…` header. Cookie-authenticated browser requests require exact-origin credentialed CORS, origin validation, and JSON-only state-changing endpoints.

For local web development, developers can set `NEXT_PUBLIC_GOT_API_URL` and `NEXT_PUBLIC_GOT_API_TOKEN` to use a custom API endpoint and token. Development token mode sends a bearer header without cookies, while production remains cookie-only.

The durable product object is an Intent Address. `createIntent({ owner, ref })`
derives it locally with no got.cx API or RPC request. The managed API persists
canonical recovery data, indexes processed history beneath an Address, and verifies
client-provided Addresses against GOT Protocol v0.3 before storing them. Base
and GOTLens remain authoritative for live intent state; Supabase indexes only
canonical `TransferProcessed` outcomes for managed Addresses.

## Commands

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Canonical routes

- `/{@name}` — reusable GOT name.
- `/x:{@handle}` — reusable X identity.
- `/tg:{@handle}` — reusable Telegram identity.
- `/#email:{address}` and `/#phone:{number}` — fragment-based identity routes.
- `/0x…` — deterministic intent request.
- `/dashboard/addresses` — Intent Addresses and local creation preview.
- `/dashboard/addresses/names` — GOT and social Names.
- `/transfers/new/send` and `/transfers/new/request` — authenticated creation flows.
- `/transfers/requests/{id}` — created request summary.
- `/receipt/{transferId}` — indexed transfer receipt.
