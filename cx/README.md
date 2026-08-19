# got.cx interface

Production Next.js interface for GOT — Global Onchain Transfers.

## Packages

- `apps/web` — public GOT links, transfer flows, receipts, and account dashboard.
- `apps/api` — private product API business logic.
- `packages/sdk` — typed got.cx API client, canonical GOT link parsing, and protocol helpers.
- `packages/ui` — shared shadcn components and design tokens.

The product SDK delegates normalization, name-key derivation, ABIs, and deployment addresses to the published `@got-cx/protocol@0.2.0` package. Base Account connectivity uses `@base-org/account`; users authenticate with the Base passkey flow and never connect a separate browser wallet.

## Configuration

The web app sends a workspace-scoped `got_live_…` bearer token to the API. Base Account sign-in issues and stores that token in the browser, and the Developers dashboard shows it for integrations and automation. Local frontend development against production can set `NEXT_PUBLIC_GOT_API_URL=https://api.got.cx` and `NEXT_PUBLIC_GOT_API_TOKEN`; because this environment variable is shipped to the browser, use a dedicated revocable token.

Configure the X app callback URL as `https://api.got.cx/auth/callback/twitter`. X is an identity-ownership proof only: its NextAuth callback records the claim while the API bearer token remains the got.cx login credential.

Signed-out visitors can open dashboard routes and see each page's native empty state without requesting account data. The interface never substitutes sample records when the API is unavailable.

Incoming transfer requests use a self-contained `intent` query parameter. The envelope carries the complete immutable protocol configuration and display metadata, while the address remains the canonical route. Public funding derives and verifies the address directly against `GOTFactory.previewAddress`; Supabase is an optional index and legacy-link fallback, not a recovery dependency. The requesting browser also keeps the envelope locally and the Transfers dashboard can import any self-contained link.

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
- `/0x…?intent=…` — self-contained deterministic intent request.
- `/transfers/new/send` and `/transfers/new/request` — authenticated creation flows.
- `/transfers/requests/{id}` — created request summary.
- `/receipt/{transferId}` — indexed transfer receipt.
