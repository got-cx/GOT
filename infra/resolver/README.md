# Public GOT resolver

This standalone Base Mainnet worker automatically processes funded, active
managed Intent Addresses when their immutable resolver policy permits the
configured wallet. It discovers candidates from active Supabase Address
configs plus live `GOTLens` state; it does not depend on Transfer rows or ERC-20
funding events.

For every candidate the worker deserializes and validates `IntentConfig`, derives
the canonical Address with `@got-cx/protocol`, compares it with the stored
Address, requires chain `8453`, and accepts only an open resolver or the exact
configured resolver wallet. Supabase candidates are loaded in bounded,
keyset-paginated pages and GOTLens batches are read sequentially. Immediately
before execution it refreshes that candidate, checks balance and effective
owner again, simulates the exact call, estimates gas, and applies configured
gas policy.

Undeployed Intents use `GOTFactory.deployAndExecute(config)`. Deployed Intents
use `GOTIntent.resolve()`. Transactions are sent sequentially and each receipt
is awaited before the next candidate, preventing nonce races. One candidate's
simulation or receipt failure does not block unrelated candidates.

## Run locally

```sh
cp .env.example .env
npm ci
npm run start -- --dry-run
npm run start
```

Required service variables are `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and
`BASE_RPC_URL`. Live execution also requires `GOT_RESOLVER_PRIVATE_KEY`.
Keyless dry-run uses `GOT_RESOLVER_ADDRESS`; it performs discovery, refresh,
simulation, gas estimation, and decision logging without broadcasting.

Defaults:

- minimum balance: `100000` Base USDC units (0.10 USDC);
- maximum transactions per run: `25`;
- receipt confirmations: `2`;
- GOTLens batch size: `50`;
- candidate page size: `500`.

`RESOLVER_MAX_GAS_COST_WEI` optionally caps estimated native gas cost for each
transaction. Dust below the threshold can accumulate and remains manually
resolvable; these values are hosted infrastructure policy, not protocol rules.

## Separation and security

The resolver writes only to Base. It never inserts Transfer history, funding
state, balances, or settlement state into Supabase. Successful execution emits
`TransferProcessed`; the independent public indexer records it later.

`.github/workflows/resolver.yml` runs asynchronously every five minutes. A fork
can use its own database, RPC, and resolver wallet. Fund the resolver wallet
only for expected Base gas exposure, never reuse it as an owner, treasury, or
application-admin wallet, and never print its private key. Positive-fee Intents
may pay it the protocol-defined execution reward.
