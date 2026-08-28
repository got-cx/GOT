# got.cx interface

Production Next.js interface for GOT — Global Onchain Transfers.

## Packages

- `apps/web` — public GOT links, transfer flows, receipts, and account dashboard.
- `apps/api` — private product API business logic.
- `packages/sdk` — typed got.cx API client, canonical GOT link parsing, and protocol helpers.
- `packages/ui` — shared shadcn components and design tokens.

The product SDK delegates normalization, name-key derivation, ABIs, and deployment addresses to the published `@got-cx/protocol@0.2.0` package. Base Account connectivity uses `@base-org/account`; users authenticate with the Base passkey flow and never connect a separate browser wallet.

## Configuration

The web app authenticates to the API only with an `HttpOnly`, `Secure`, `SameSite` cookie. Base Account sign-in creates the cookie-backed session; no authentication token is returned to or stored.
The API accepts either the secure session cookie or an `Authorization: Bearer got_live_…` header. Cookie-authenticated browser requests require exact-origin credentialed CORS, origin validation, and JSON-only state-changing endpoints.

For local web development, developers can set `NEXT_PUBLIC_GOT_API_URL` and `NEXT_PUBLIC_GOT_API_TOKEN` to use a custom API endpoint and token. Development token mode sends a bearer header without cookies, while production remains cookie-only.

Transfers use the canonical intent address as a short link. The API stores a compact recovery envelope and product metadata, while live balances and contract state are read directly from Base. Both send and receive flows require a user-defined transfer ID; got.cx combines it with the creating Base Account to derive the protocol `intentId`. The same ID and transfer parameters recreate the same deterministic address.

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
- `/transfers/new/send` and `/transfers/new/request` — authenticated creation flows.
- `/transfers/requests/{id}` — created request summary.
- `/receipt/{transferId}` — indexed transfer receipt.
