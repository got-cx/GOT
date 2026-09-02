# Public TransferProcessed indexer

This standalone worker builds managed got.cx history from canonical GOT
`TransferProcessed` events on Base Mainnet. It never indexes ERC-20 funding,
wallet activity, balances, pending transactions, or an application lifecycle.

The algorithm reads the existing `transfer_processed` cursor, reads Base's
`safe` head, scans one global event range, extracts unique emitter Addresses,
matches only those emitters against Supabase, validates accounting and block
metadata, idempotently upserts accepted rows, and advances the cursor only after
all persistence succeeds. Archived managed Addresses remain matchable because
archival must not erase later canonical history.

Each RPC range scans at most 2,000 blocks. A normal local run processes one
range; `--loop-to-safe-head` keeps processing bounded ranges until it reaches
the Base safe head captured once at startup. Cursor persistence after every
range makes interrupted catch-up resumable. The scheduled GitHub Action enables
this mode because scheduled runs are not guaranteed to start on time.

An existing cursor is never reset. A database without a cursor starts at the
current Base safe head, so a new deployment does not scan historical blocks by
default. Set `INDEXER_START_BLOCK` to a positive block number when intentional
historical backfill is required.

## Run locally

```sh
cp .env.example .env
npm ci
npm run start
npm run start -- --dry-run
npm run start -- --loop-to-safe-head
```

Required variables are `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and
`BASE_RPC_URL`. `BASE_RPC_FALLBACK`, `INDEXER_MAX_BLOCKS_PER_RUN`, and
`INDEXER_START_BLOCK` are optional. Dry-run performs all reads, decoding,
matching, validation, and mapping, then prints intended changes without
upserting Transfers or advancing the cursor.

The database must expose the repository's `addresses`, `transfers`, and
`indexer_cursors` schema plus the monotonic `advance_indexer_cursor` function.
Canonical identity is `(chain_id, transaction_hash, log_index)`.

## Operations and self-hosting

`.github/workflows/transfer-indexer.yml` runs this package every five minutes
with read-only repository permissions and serialized workflow concurrency. The
schedule is asynchronous, not real-time. Forks can supply their own RPC and
Supabase-compatible database and operate the same worker without got.cx APIs.

Keep the Supabase service secret out of logs. A matching emitter proves only
that got.cx manages the canonical derived Address; decoded events still pass the
allocation invariant and safe block-hash checks before persistence.
