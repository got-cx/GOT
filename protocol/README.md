# GOT Protocol

Solidity implementation of GOT — Global Onchain Transfers — protocol version `0.2`.

GOT provides deterministic intent addresses that can receive an ERC-20 before contract deployment. Once ownership is resolvable, anyone allowed by the intent can atomically deploy the canonical clone and process its entire configured-token balance. The normative design is in [`../docs/SPEC.md`](../docs/SPEC.md).

This iteration implements the core and initial periphery. Deployment modules, network configuration, release manifests, and address publication are intentionally deferred to the next phase.

## Contracts

| Contract | Role |
| --- | --- |
| `GOTFactory` | Stateless CREATE2 preview, deployment, first execution, and quote helpers |
| `GOTIntent` | One-slot intent implementation with immutable configuration and cumulative fee accounting |
| `GOTName` | Optional EIP-712 / ERC-1271 name-key owner resolver |
| `GOTSubscription` | Exact-binding adapter for Coinbase/Base Spend Permissions |

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

## Install and verify

Requirements: Node.js 22+, npm, and a platform supported by Hardhat 3.

```sh
npm install
npm run build
npm run typecheck
npm test
```

Useful focused commands:

```sh
npm run test:solidity
npm run test:integration
npm run build:production
npm run coverage
```

Solidity tests cover unit, adversarial, rollback, and fuzz properties. TypeScript/viem tests exercise all eighteen numbered core security invariants plus got.cx and third-party business workflows: zero-fee transfers, exact-net partner invoices, reconciliation, named routes, and recurring SaaS subscriptions.

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

`GOTName` takes one immutable claim verifier. The production profile should use a separately operated threshold Safe.

`GOTSubscription` takes immutable GOT factory and Spend Permission Manager addresses. Its interface is pinned to Coinbase's `coinbase/spend-permissions` commit `e0004e63edc4e17de7aa978293800ac7a16892e5`; deployments must verify the target chain's canonical manager code and address.

## Solidity dependency and clone format

- OpenZeppelin Contracts `5.6.1` for full-precision math, safe ERC-20 operations, EIP-712, ECDSA/ERC-1271 signature checking, CREATE2, and reentrancy guards.
- OpenZeppelin's `Clones` immutable-argument runtime is intentionally not used because it stores arguments in code without appending them to delegated calldata. The small local `GOTClones` library preserves the specification's canonical `calldata || args || uint16(length)` runtime and uses OpenZeppelin `Create2` for prediction and deployment.

Exact versions are recorded in `package-lock.json`.

## Next phase

Deployment work should add deterministic implementation/factory deployment, Base Sepolia and Base Mainnet profiles, canonical USDC and Spend Permission Manager verification, published code hashes and deterministic vectors, contract verification, and a release manifest. No deployment script is included in this iteration.
