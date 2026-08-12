# GOT Protocol

Solidity implementation of GOT — Global Onchain Transfers — protocol version `0.2`.

GOT provides deterministic intent addresses that can receive an ERC-20 before contract deployment. Once ownership is resolvable, anyone allowed by the intent can atomically deploy the canonical clone and process its entire configured-token balance. The normative design is in [`../docs/SPEC.md`](../docs/SPEC.md).

This iteration implements the core, initial periphery, and the Base Mainnet deployment path. Release address publication remains deferred until the production treasury and GOTName claim verifier are configured and the deployment is executed.

## Contracts

| Contract          | Role                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `GOTFactory`      | Stateless CREATE2 preview, deployment, first execution, and quote helpers                 |
| `GOTIntent`       | One-slot intent implementation with immutable configuration and cumulative fee accounting |
| `GOTName`         | Optional EIP-712 / ERC-1271 name-key owner resolver                                       |
| `GOTSubscription` | Exact-binding adapter for Coinbase/Base Spend Permissions                                 |

Production contracts are split by dependency boundary:

```text
contracts/
├── core/          # Application-neutral protocol primitives, interfaces, and libraries
├── periphery/     # Optional got.cx-oriented names and subscription integrations
└── test/          # Solidity tests and test-only mocks
```

The reusable core never imports periphery code. Periphery contracts may depend only on the core's public interfaces. This keeps `contracts/core/` suitable for independent protocol integrations without pulling in got.cx product logic.

## Integrator ABIs

Every successful Hardhat build refreshes the integration-ready ABI files under `abi/`. The folder contains one plain ABI JSON array per public core or periphery contract/interface plus `abi/manifest.json`, which maps each exported contract name to its source and ABI file. Test contracts, mocks, and internal libraries are excluded.

The ABI exporter is a Hardhat build hook, so both the default and production build profiles update the files. Files removed or renamed in the public contract tree are removed from `abi/` on the next successful build; generated files should not be edited manually.

## Security properties

- The factory has no mutable storage, administrator, pause switch, or upgrade path.
- Every intent field is committed to its CREATE2 address in the canonical 226-byte immutable layout.
- Intent IDs whose first four bytes collide with an implementation function selector are rejected, preserving payable native transfers to deployed clones.
- Intent implementation calls are blocked; clone calls validate the immutable suffix before reading it.
- Direct owners can always settle. Resolver mode uses bounded ERC-165 and owner-resolution calls and fails closed.
- Unresolved ownership cannot settle or recover assets.
- A single packed slot stores the reentrancy lock and cumulative gross processed amount.
- Fees are computed from cumulative totals, making final allocation independent of funding partitions.
- Zero-fee intents transfer the complete configured-token balance to the effective owner.
- The configured token cannot use the recovery path, and successful processing must clear its balance.
- Name claims are domain-separated, expiry-bound, one-time claims authorized by an immutable EOA or ERC-1271 verifier.
- Subscription execution binds the exact factory, configuration hash, intent, token, amount, period, start, and spender. Spend and settlement revert atomically.

The factory also verifies that the implementation's protocol version, immutable layout, treasury, and fee-share constants match its own constructor inputs.

This code is production-oriented but remains **pre-audit**. Do not deploy it with material value before independent review, deterministic release-vector publication, and network-specific dependency validation.

## Token assumptions

The generic core accepts any deployed ERC-20 address, but production applications should allowlist exact-transfer, non-rebasing assets. Fee-on-transfer, rebasing, blacklistable, or otherwise non-standard tokens can produce economic behavior outside the quoted allocation even when ERC-20 calls succeed. The initial deployment profile in the specification is canonical USDC on Base.

Canonical got.cx USDC transfers use `feeBps == 0`. With a blacklistable token, a positive-fee intent synchronously depends on its immutable treasury and partner: if either becomes blocklisted, atomic settlement can fail permanently, and the configured-token recovery path remains intentionally unavailable. Third-party positive-fee integrations must disclose this liveness risk, preflight fixed recipients before funding, and monitor them continuously.

## Install and verify

Requirements: Node.js 22+, npm, and a platform supported by Hardhat 3. Contracts compile with Solidity 0.8.36 and explicitly target Cancun.

```sh
npm install
npm run build
npm run typecheck
npm test
```

Useful focused commands:

```sh
npm run test
npm run test:integration
npm run test:integration:tip
npm run build:production
npm run coverage
```

## Base deployment

The Base profile deploys `GOTIntent` and `GOTFactory` deterministically through CreateX using a fork-mined salt that predicts a factory address beginning with `0x60700`. It then deploys `GOTName` and `GOTSubscription`, verifies every immutable constructor value, and writes the completed addresses and code hashes to `deployments/base.json`.

Before production deployment, set `treasury` and `gotNameClaimVerifier` in `scripts/config.ts`. The canonical Base USDC and Coinbase Spend Permission Manager addresses and runtime code hashes are already pinned. Provide the deployment private key through the Hardhat `GOT_DEPLOYER` configuration variable, then run:

```sh
npm run deploy:base
```

Use `npm run deploy:baseFork` for a local rehearsal against the pinned Base block. After the fork mines a salt, copy its `create2Salt`, `create2GuardedSalt`, constructor arguments, and creation-code hashes into `deployments/base.json`. `npm run deploy:base` requires that prepared salt and verifies that its constructor values still match before sending transactions; it never searches for a new salt on production. `GOTName` and `GOTSubscription` are ordinary deployments and can still have different addresses between the fork and Base.

`npm run test:integration` runs the reproducible deployment-grade suite against Base Mainnet block `49,650,000`. Set `BASE_RPC_URL` to a reliable archival Base RPC endpoint; it defaults to `https://mainnet.base.org`, whose public service may be rate-limited. Override the release block only deliberately with `BASE_FORK_BLOCK`. `npm run test:integration:tip` runs the same assertions at the moving chain tip as a compatibility check.

The fork suite uses canonical Base USDC, Coinbase's deployed Spend Permission Manager with a real counterfactual Coinbase Smart Wallet/ERC-6492 signature, and a freshly deployed 2-of-3 Safe verifier. CREATE2 nonces are derived from fork state and the predicted accounts are verified absent before deployment. Token settlement assertions use balance deltas so unrelated live-state dust cannot make the suite flaky.

Solidity tests cover unit, adversarial, rollback, and fuzz properties. TypeScript/viem tests exercise all numbered core security invariants plus got.cx and third-party business workflows: zero-fee transfers, exact-net partner invoices, reconciliation, named routes, and recurring SaaS subscriptions.

`contracts/core/GOTIntent.sol` is deliberately excluded from Hardhat source instrumentation because injected hooks alter its calldata-sensitive implementation. Coverage runs still execute every intent test against canonical bytecode, but do not report line percentages for that file.

## Constructor configuration

`GOTIntent`:

```text
treasury
executionShareBps
partnerShareBps
```

`GOTFactory`:

```text
implementation
treasury
executionShareBps
partnerShareBps
maxFeeBps
```

The treasury and share values must exactly match the implementation. All basis-point values are strictly between `0` and `10_000`; an individual intent's `feeBps` may be zero and may not exceed `maxFeeBps`.

The published package exports `normalizeGOTIdentity`, `parseCanonicalGOTIdentity`, `deriveIdentifierKey`, and `deriveNameKeyV1` from `@got-cx/protocol` and `@got-cx/protocol/nameKeys`. Applications must use this API rather than reproducing normalization locally.

`GOTName` takes one immutable claim verifier. The production profile should use an independently operated Safe with at least a 2-of-3 threshold. That verifier controls every first claim and must verify both the external identity and destination-account control offchain. Subsequent name transfers are immediate and irreversible; there is no pending-owner acceptance or verifier recovery. Public name keys must hash the GOT Links Model's single canonical identity string according to [Section 32, "Name Keys and Namespaces"](../docs/SPEC.md#32-name-keys-and-namespaces); private routes use independent CSPRNG-generated `bytes32` keys.

Native currency sent to an already deployed intent must use a full-gas call. Solidity `send` and `transfer` generally fail because the clone delegates through a cold implementation and cannot execute within their 2,300-gas stipend.

`GOTSubscription` takes immutable GOT factory and Spend Permission Manager addresses. Its interface is pinned to Coinbase's `coinbase/spend-permissions` commit `e0004e63edc4e17de7aa978293800ac7a16892e5`; deployments must verify the target chain's canonical manager code and address. Permissions require an explicit exclusive `end` greater than `start`; zero does not mean unlimited, while `type(uint48).max` can represent a practically unbounded permission.

## Solidity dependency and clone format

- OpenZeppelin Contracts `5.6.1` for full-precision math, safe ERC-20 operations, EIP-712, ECDSA/ERC-1271 signature checking, CREATE2, and reentrancy guards.
- OpenZeppelin's `Clones` immutable-argument runtime is intentionally not used because it stores arguments in code without appending them to delegated calldata. The small local `GOTClones` library preserves the specification's canonical `calldata || args || uint16(length)` runtime and uses OpenZeppelin `Create2` for prediction and deployment.

Exact versions are recorded in `package-lock.json`.

Both compiler profiles explicitly target Cancun because the pinned OpenZeppelin release uses the Cancun `MCOPY` instruction. Supported networks must therefore be Cancun-compatible; a pre-Cancun release requires separately versioned bytecode and deterministic hashes.

## Next phase

Deployment work should add a Base profile, contract verification, deterministic release vectors, and a published release manifest. Release testing must continue to exercise the exact pinned manager with Coinbase Smart Wallet/ERC-6492 fixtures and the threshold Safe name verifier rather than only local mocks.
