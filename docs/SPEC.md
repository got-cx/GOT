# GOT — Global Onchain Transfers

## Final Unified System Implementation Specification v0.2

**System:** GOT  
**Expansion:** Global Onchain Transfers  
**Canonical domain:** `got.cx`  
**System version:** `0.2`  
**Protocol identifier:** `keccak256("GOT_PROTOCOL_V0_2")`  
**Primary launch network:** Base  
**Primary launch asset:** canonical USDC  
**Primary account layer:** Base Account  
**Target protocol networks:** Cancun-compatible Ethereum/EVM networks supporting `CREATE2` and `MCOPY`
**Document revision:** `0.2.3-name-keys`  
**Status:** Review-remediation candidate; independent audit closure pending  
**Date:** 2026-08-07

---

# Executive Summary

GOT is an open system for global onchain transfers.

The system combines:

```text
deterministic intent addresses
    counterfactual ERC20 transfer addresses derived from immutable configuration

GOTName
    optional reusable names and verified identifiers

GOTSubscription
    optional recurring-transfer periphery built around account spend permissions

got.cx
    one user-facing product and developer platform built on GOT Protocol

GOT infrastructure
    indexing, execution, scheduling, verification, webhooks and notifications
```

The deterministic intent address is the protocol’s core primitive. An application can calculate the address before deployment, publish it as a transfer destination, and receive the configured ERC20 at that address while no contract code exists. The canonical implementation can later be deployed and the complete configured-token balance settled atomically.

GOT Protocol is neutral infrastructure. It does not require applications to use `got.cx`, a particular business model, or a mandatory protocol fee.

Version 0.2 makes the following decisions normative:

1. `feeBps` MAY be zero.
2. A zero-fee intent is valid and processes the complete configured-token balance to the effective owner.
3. A positive fee is optional and is split transparently among the protocol treasury, partner and executor.
4. Positive fees continue to use cumulative, split-invariant accounting on gross processed value.
5. Applications that want a recipient to receive an exact invoice amount SHOULD quote the required gross payer amount above that invoice amount.
6. A zero-fee intent does not guarantee economically motivated third-party execution. The payer, owner, application, account abstraction layer or sponsor must cover gas.
7. `got.cx` is only one consumer of GOT Protocol. Its preferred business model is fixed SaaS subscriptions with no additional transfer-volume fee.
8. Third-party integrators MAY configure their own immutable onchain fee through `feeBps` and receive transparent partner rewards.
9. `got.cx` usage limits apply only to hosted software and infrastructure, never to permissionless onchain protocol usage or transfer value.
10. GOT’s own paid SaaS plans SHOULD use `GOTSubscription` onchain as production dogfooding, without requiring subscription revenue sharing with integrators.
11. Canonical v0.2 bytecode targets the Cancun EVM; support for an older hard fork requires a separately versioned build and published code hashes.
12. The canonical got.cx Links Model uses `@`, `x:`, `tg:`, fragment-based `email:`/`phone:`, and direct `0x...` intent-address routes; processed `transferId` values are receipt identifiers, not canonical transfer URLs.

The primary product promise is:

> **Send stablecoins to an account, transfer link or name through one deterministic onchain transfer system.**

The recommended brand line is:

> **Send it. GOT it.**

---

# Table of Contents

1. Canonical Definition
2. Terminology
3. Repository Architecture
4. Goals
5. Non-Goals
6. Normative Language
7. System Architecture
8. Component Boundaries
9. Protocol Constants
10. Intent Configuration
11. Configuration Validation
12. Immutable Argument Encoding
13. Configuration Hash and Deterministic Address
14. Generic Owner Resolver
15. Effective Owner Resolution
16. Unresolved Ownership
17. Factory Interface and Behavior
18. Intent Interface
19. Mutable Storage
20. Authorization
21. Resolver Liveness and Competition
22. Fee Policy
23. Cumulative Fee Accounting
24. Exact Recipient Quotes
25. Processing Algorithm
26. Recovery
27. Core Events
28. Core Errors
29. Core Security Invariants
30. Required Core Tests
31. GOTName Overview
32. Name Keys and Namespaces
33. Public and Private Identifier Modes
34. Claim Verifier Security
35. Claim Authorization
36. Name Transfer
37. GOTName Interface, Events and Errors
38. GOTName Invariants and Tests
39. GOTSubscription Overview
40. Spend Permission Model
41. Subscription Binding
42. Subscription Execution
43. Subscription Cancellation and Failure
44. GOTSubscription Events, Invariants and Tests
45. got.cx Product Role
46. got.cx Business Model
47. Hosted SaaS Limits
48. Base Account Integration
49. Transfer and Invoice Experience
50. Transfer Link Routing
51. Named Transfer and Claim Experience
52. Subscription Product Experience
53. Partner and Integrator Model
54. Developer Platform
55. API Conventions
56. Data Model
57. Transfer State Model
58. Invoice State Model
59. Subscription State Model
60. Indexing and Finality
61. Resolver Infrastructure
62. Subscription Scheduler
63. Name Verification Infrastructure
64. Webhooks
65. Notifications
66. Observability and Operations
67. Privacy
68. Threat Model
69. Independent Audit Scope
70. Deployment Profile
71. Canonical Multichain Deployment
72. Versioning and Migration
73. Release Artifacts
74. Implementation Plan
75. Complete Implementation Checklist
76. Reference Solidity
77. External Standards and Dependencies
78. Canonical Statements
79. v0.2 Change Log
80. Final Decisions

---

# 1. Canonical Definition

GOT is an open-source system and ecosystem for global onchain transfers.

Canonical terminology:

```text
GOT
    the complete open-source system and ecosystem

GOT Protocol
    the onchain contracts, interfaces and protocol rules

deterministic intent address
    the standalone counterfactual transfer primitive

intent address
    shorthand for a deterministic intent address after first definition

GOTIntent
    the canonical Solidity implementation contract for an intent address

GOTFactory
    the stateless canonical factory that previews, deploys and executes intents

GOTName
    the optional name service mapping a reusable bytes32 nameKey to an account

GOTSubscription
    optional periphery for recurring transfers through account spend permissions

got.cx
    a canonical product, interface, API and SDK built on GOT Protocol

resolver
    an account or contract authorized to process an intent address

executor
    the actual account receiving the execution allocation for one processing call

partner
    the immutable integration, distribution or application reward address

owner source
    the immutable direct account or owner resolver committed to an intent

effective owner
    the current account authorized to settle and receive owner proceeds

gross processed value
    the configured-token balance processed by the contract before fee allocation

owner proceeds
    gross processed value minus the total fee delta

recipient target amount
    an application-level net amount that a merchant or recipient expects to receive
```

Public specifications and product language MUST call the primitive a **deterministic intent address** or **intent address**. `GOTIntent` MAY remain the Solidity contract name.

The canonical term is **transfer**, not payment, throughout GOT protocol, APIs, events, IDs, receipts, links and data models. The word “payment” MAY appear when quoting external standards or unavoidable third-party terminology.

---

# 2. Terminology

The protocol distinguishes protocol facts from application interpretations.

```text
Protocol fact
    token balance, intent address, configuration, totalProcessed, fee allocation,
    effective owner, executor and emitted events

Application interpretation
    invoice, order, customer, subscription plan, due date, fulfillment,
    transfer request, transfer link, social identity and accounting status
```

An intent address is not itself an invoice, subscription or customer record.

`amount` in `IntentConfig` is an expected gross transfer amount used by applications and recurring-transfer bindings. It is not a processing cap and does not prevent partial, repeated, late or excess transfers.

When an application displays a net invoice amount and `feeBps > 0`, it SHOULD compute and display a separate gross payer quote so that the expected owner proceeds equal the invoice amount.

---

# 3. Repository Architecture

The canonical public repository SHOULD use:

```text
got/
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
│
├── docs/
│   ├── SPEC.md
│   ├── ARCHITECTURE.md
│   ├── SECURITY_MODEL.md
│   ├── DEPLOYMENTS.md
│   ├── API.md
│   └── ADR/
│
├── protocol/
│   ├── core/
│   │   ├── src/
│   │   │   ├── GOTIntent.sol
│   │   │   ├── GOTFactory.sol
│   │   │   ├── interfaces/
│   │   │   │   ├── IGOTIntent.sol
│   │   │   │   ├── IGOTFactory.sol
│   │   │   │   └── IGOTOwnerResolver.sol
│   │   │   └── libraries/
│   │   ├── test/
│   │   └── script/
│   │
│   └── periphery/
│       ├── name/
│       │   ├── GOTName.sol
│       │   ├── IGOTName.sol
│       │   └── test/
│       ├── subscriptions/
│       │   ├── GOTSubscription.sol
│       │   ├── IGOTSubscription.sol
│       │   └── test/
│       ├── resolvers/
│       ├── routers/
│       └── helpers/
│
├── interface/ = cx
│   ├── web/
│   ├── api/
│   ├── sdk/
│   └── shared/
│
├── infra/
│   ├── indexer/
│   ├── resolver/
│   ├── scheduler/
│   ├── names/
│   │   ├── resolution-api/
│   │   ├── claim-signer/
│   │   └── verifiers/
│   ├── webhooks/
│   ├── notifications/
│   ├── monitoring/
│   └── deployment/
│
└── packages/
    ├── config/
    ├── types/
    ├── deployments/
    └── test-vectors/
```

Dependency direction:

```text
protocol/core
    MUST NOT import protocol/periphery, interface or infra

protocol/periphery
    MAY import protocol/core interfaces

interface
    MAY depend on protocol ABIs, SDK packages and API schemas

infra
    MAY depend on protocol and periphery ABIs and shared packages
```

---

# 4. Goals

GOT v0.2 MUST provide:

- deterministic intent addresses before deployment;
- direct ERC20 transfers to undeployed intent addresses;
- direct ownership without requiring names;
- optional reusable names and verified identifiers;
- immutable intent configuration;
- one-slot mutable accounting per deployed intent;
- cumulative split-invariant fee accounting;
- valid zero-fee intents;
- optional transparent partner and executor rewards;
- direct owner settlement;
- open or restricted resolver execution;
- counterfactual transfers from wallets, smart accounts and exchanges;
- transfer-before-onboarding for named recipients;
- one-time first claim of a reusable name key;
- name migration controlled by the current name owner;
- Base Account onboarding without a custom GOT wallet;
- recurring transfers through revocable Spend Permissions;
- invoices, receipts, transfer links, subscriptions and developer integrations;
- chain-aware indexing, finality handling and reorg recovery;
- signed webhooks and idempotent fulfillment;
- a Base-first reference product while keeping protocol core multichain-capable;
- no custody of user funds by the GOT backend;
- no protocol administrator, pause or upgradeability in canonical core contracts;
- application freedom to monetize with subscriptions, positive onchain fees, both or neither.

---

# 5. Non-Goals

GOT v0.2 MUST NOT require or implement:

- a protocol token;
- a DAO;
- a custom seed-phrase wallet;
- backend custody of recipient funds;
- a mandatory protocol fee;
- mandatory use of `got.cx`;
- a mandatory subscription-revenue-sharing program;
- an onchain invoice or customer database;
- raw email, phone or social identifiers in core contracts;
- OAuth tokens or login assertions onchain;
- mutable intent token, amount, fee, partner or resolver configuration;
- upgradeable intent proxies;
- a core protocol registry;
- protocol-enforced refunds, disputes, chargebacks or fulfillment;
- generic arbitrary calls from an intent address;
- configured-token recovery that bypasses canonical fee accounting;
- cross-chain state synchronization;
- automatic reassignment of claimed names when an external identifier changes control;
- fiat custody, card acquiring or banking services;
- guaranteed profitable execution for every zero-fee intent.

Applications MAY implement additional business logic above the protocol.

---

# 6. Normative Language

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, **MAY** and **OPTIONAL** are normative.

Conceptual Solidity is informative unless the surrounding text explicitly defines required behavior.

The final source commit, compiler configuration, immutable-argument layout, proxy bytecode, deployment salts, interface identifiers, code hashes and deterministic address test vectors become normative release artifacts.

---

# 7. System Architecture

```text
User, merchant, application or agent
        |
        | creates immutable IntentConfig
        v
GOTFactory
        |
        | previewAddress(config)
        v
counterfactual intent address
        |
        | receives configured ERC20 before or after deployment
        v
effective owner or resolver
        |
        | deployAndExecute / settle / resolve
        v
GOTIntent
        |
        | cumulative fee allocation
        | owner resolution
        | atomic token distribution
        v
effective owner + treasury + partner + executor
```

Direct ownership:

```text
ownerSource = Base Account / Safe / EOA / contract
ownerKey    = 0
owner()     = ownerSource
```

Named ownership:

```text
ownerSource = GOTName
ownerKey    = reusable nameKey
owner()     = GOTName.resolveOwner(intentAddress, nameKey)
```

Before claim:

```text
owner()    = address(0)
settlement = unavailable
funds      = remain at the intent address
```

After claim:

```text
owner()    = claimed account
settlement = available
```

One name claim resolves every existing and future intent using the same `nameKey`.

---

# 8. Component Boundaries

## 8.1 Protocol core

Required contracts:

1. `GOTIntent`
2. `GOTFactory`

Required generic interface:

3. `IGOTOwnerResolver`

Core responsibilities:

- deterministic address derivation;
- immutable configuration;
- counterfactual token receipt;
- effective-owner resolution;
- resolver authorization;
- cumulative fee accounting;
- settlement;
- unsupported-asset recovery;
- canonical deployment rules;
- security invariants.

The core does not know about names, email, phone, X, Telegram, OAuth, invoices, subscriptions, Base Account, APIs, plan pricing, Supabase, Vercel or webhooks.

## 8.2 Protocol periphery

Initial periphery:

1. `GOTName`
2. `GOTSubscription`

Future periphery MAY include batch settlement, resolver routers, multicall helpers, gas-sponsorship helpers, organization resolvers, ENS resolvers and payroll resolvers.

## 8.3 Interface

The interface includes `got.cx`, transfer links, claim links, account connection, dashboard, invoices, subscriptions, names, SDKs, API keys, receipts, exports and webhook settings.

## 8.4 Infrastructure

Infrastructure includes the indexer, resolver workers, subscription scheduler, name-verification adapters, claim signer, webhook dispatcher, notification workers, monitoring and deterministic deployment tooling.

---

# Part I — GOT Protocol Core

# 9. Protocol Constants

The implementation MUST expose:

```solidity
bytes32 public constant PROTOCOL_VERSION =
    keccak256("GOT_PROTOCOL_V0_2");

uint16 public constant IMMUTABLE_ARGS_LENGTH = 226;

uint256 public constant ERC165_GAS_LIMIT = 30_000;
uint256 public constant OWNER_RESOLVER_GAS_LIMIT = 50_000;

address public immutable TREASURY;
uint16 public immutable EXECUTION_SHARE_BPS;
uint16 public immutable PARTNER_SHARE_BPS;
```

`GOTFactory` immutable configuration:

```solidity
address public immutable IMPLEMENTATION;
address public immutable TREASURY;
uint16 public immutable EXECUTION_SHARE_BPS;
uint16 public immutable PARTNER_SHARE_BPS;
uint16 public immutable MAX_FEE_BPS;
```

Constructor validation:

```solidity
IMPLEMENTATION != address(0);
TREASURY != address(0);

EXECUTION_SHARE_BPS > 0;
EXECUTION_SHARE_BPS < 10_000;

PARTNER_SHARE_BPS > 0;
PARTNER_SHARE_BPS < 10_000;

MAX_FEE_BPS > 0;
MAX_FEE_BPS < 10_000;
```

`MAX_FEE_BPS` SHOULD be materially below 10,000 in the canonical release.

The factory MUST have zero mutable storage. Solidity immutables embedded in bytecode are permitted.

Changing protocol constants, fee allocation order, immutable layout, normative resolver gas limits, clone dispatch behavior, or the canonical `GOTIntent` public/external selector set requires a new protocol version and newly published implementation and factory code hashes.

---

# 10. Intent Configuration

```solidity
struct IntentConfig {
    bytes32 intentId;
    address ownerSource;
    bytes32 ownerKey;
    address token;
    address partner;
    address authorizedResolver;
    uint128 amount;
    uint64 initialDeadline;
    uint32 period;
    uint16 feeBps;
    bytes32 metadataHash;
}
```

Every field is immutable and committed to the deterministic address.

## 10.1 `intentId`

Application-defined unique identifier.

Recommended namespacing:

```solidity
bytes32 intentId = keccak256(
    abi.encode(
        keccak256("GOT_APPLICATION_INTENT_V2"),
        applicationId,
        recordId
    )
);
```

`intentId`, `transferRequestId` and `transferId` are different identifiers. A canonical got.cx transfer URL resolves directly to an intent address and does not introduce a separate protocol-level `transferLinkId`.

The first four bytes of `intentId` MUST NOT equal any public or external function selector exposed by the canonical `GOTIntent` implementation. The immutable-argument proxy appends `intentId` immediately after empty external calldata; rejecting selector prefixes guarantees that a direct native transfer dispatches to the payable fallback instead of a nonpayable function. `previewAddress` MUST reject colliding identifiers. The recommended `keccak256` derivation above makes accidental collisions unlikely, but callers MUST still use factory validation rather than deriving an unchecked address locally.

Canonical processed-transfer identity:

```text
chainId + intentAddress + transactionHash + logIndex
```

Infrastructure SHOULD derive:

```solidity
bytes32 transferId = keccak256(
    abi.encode(
        chainId,
        intentAddress,
        transactionHash,
        logIndex
    )
);
```

## 10.2 `ownerSource`

Immutable direct owner or owner resolver.

```text
Direct mode:
    ownerSource = account
    ownerKey    = 0

Resolver mode:
    ownerSource = IGOTOwnerResolver contract
    ownerKey    = nonzero resolver key
```

## 10.3 `ownerKey`

`bytes32(0)` is reserved for direct mode. A nonzero key activates resolver mode.

## 10.4 `token`

Configured ERC20. The generic protocol has no token registry.

Applications SHOULD allowlist exact-transfer, non-rebasing tokens. The initial got.cx profile supports canonical Base USDC.

## 10.5 `partner`

Optional immutable recipient of the partner allocation.

The partner may represent an application, integration, commerce platform, wallet, developer, distribution partner or referral source.

`address(0)` disables partner allocation. The amount that would otherwise be allocated to a partner remains with the treasury under the canonical split.

## 10.6 `authorizedResolver`

```text
address(0)
    open resolver execution

nonzero
    only the configured resolver may use the resolver path
```

The effective owner may always settle.

## 10.7 `amount`

Expected gross transfer amount in token base units.

It is application metadata committed to the address. It does not cap processing.

Applications MAY separately store a recipient target amount and SHOULD quote a gross payer amount when positive fees apply.

## 10.8 `initialDeadline`

Application-level time reference. The core MUST NOT reject settlement because this timestamp passed.

## 10.9 `period`

```text
0
    one-time application semantics

> 0
    recurring application semantics
```

The core does not itself authorize recurring withdrawals.

## 10.10 `feeBps`

Total fee applied to cumulative gross processed value.

```text
0
    zero-fee intent; all processed configured token goes to effective owner

> 0
    positive fee; cumulative fee is split among executor, partner and treasury
```

## 10.11 `metadataHash`

Commitment to canonical offchain metadata. It MUST NOT reveal secrets or protected personal information.

---

# 11. Configuration Validation

`GOTFactory` MUST validate:

```solidity
config.ownerSource != address(0);
config.token != address(0);
config.amount > 0;
config.feeBps <= MAX_FEE_BPS;
config.period == 0 || config.initialDeadline != 0;
```

Version 0.2 intentionally does not require:

```solidity
config.feeBps > 0
```

Mode validation:

```solidity
if (config.ownerKey == bytes32(0)) {
    // Direct mode.
} else {
    // Resolver mode.
}
```

After deriving the address:

```solidity
config.ownerSource != intentAddress;
config.token != intentAddress;
config.partner == address(0) ||
    config.partner != intentAddress;
config.authorizedResolver == address(0) ||
    config.authorizedResolver != intentAddress;
TREASURY != intentAddress;
```

`deployAndExecute` MUST additionally require that the configured token has deployed code.

Preview MUST remain possible without external calls and before an owner resolver is deployed or available.

When `ownerKey != 0`, execution MUST fail closed unless `ownerSource` supports the required interface and returns valid data.

---

# 12. Immutable Argument Encoding

The canonical immutable layout remains 226 bytes:

| Offset | Size | Field                |
| -----: | ---: | -------------------- |
|    `0` | `32` | `intentId`           |
|   `32` | `20` | `ownerSource`        |
|   `52` | `32` | `ownerKey`           |
|   `84` | `20` | `token`              |
|  `104` | `20` | `partner`            |
|  `124` | `20` | `authorizedResolver` |
|  `144` | `16` | `amount`             |
|  `160` |  `8` | `initialDeadline`    |
|  `168` |  `4` | `period`             |
|  `172` |  `2` | `feeBps`             |
|  `174` | `32` | `metadataHash`       |
|  `206` | `20` | `factory`            |

Canonical encoding:

```solidity
bytes memory immutableArgs = abi.encodePacked(
    config.intentId,
    config.ownerSource,
    config.ownerKey,
    config.token,
    config.partner,
    config.authorizedResolver,
    config.amount,
    config.initialDeadline,
    config.period,
    config.feeBps,
    config.metadataHash,
    address(this)
);
```

Proxy calldata convention:

```text
original calldata
|| immutableArgs[226]
|| uint16_be(226)
```

The implementation MUST validate the immutable suffix before reading fields.

---

# 13. Configuration Hash and Deterministic Address

Canonical configuration hash:

```solidity
bytes32 configHash = keccak256(
    abi.encode(
        config.intentId,
        config.ownerSource,
        config.ownerKey,
        config.token,
        config.partner,
        config.authorizedResolver,
        config.amount,
        config.initialDeadline,
        config.period,
        config.feeBps,
        config.metadataHash
    )
);
```

Canonical salt:

```solidity
bytes32 salt = keccak256(
    abi.encode(
        PROTOCOL_VERSION,
        configHash
    )
);
```

Canonical address follows EIP-1014:

```solidity
address intentAddress = address(
    uint160(
        uint256(
            keccak256(
                abi.encodePacked(
                    bytes1(0xff),
                    address(factory),
                    salt,
                    keccak256(initCode)
                )
            )
        )
    )
);
```

`chainId` is excluded.

The same canonical deployments and exact configuration SHOULD produce the same hexadecimal intent address across supported EVM chains. State remains chain-local.

---

# 14. Generic Owner Resolver

```solidity
interface IGOTOwnerResolver is IERC165 {
    function resolveOwner(
        address intent,
        bytes32 ownerKey
    ) external view returns (address);
}
```

Possible implementations include `GOTName`, ENS ownership, organization membership, payroll recipients, merchant-team ownership and delayed recovery.

Resolution is one hop. A returned account is final even when it implements the same interface.

---

# 15. Effective Owner Resolution

`GOTIntent` exposes:

```solidity
function owner()
    public
    view
    onlyProxy
    returns (address effectiveOwner);
```

Algorithm:

1. Read `ownerSource` and `ownerKey`.
2. Return `ownerSource` when `ownerKey == 0`.
3. Require resolver code for nonzero key.
4. Probe ERC-165 with bounded gas.
5. Call `resolveOwner(address(this), ownerKey)` with bounded gas.
6. Revert on failure or malformed return data.
7. Return zero as unresolved.
8. Reject the intent address and resolver contract itself as resolved owners.
9. Return the resolved account.

Every state-changing owner-dependent operation MUST resolve exactly once and cache the result before token interactions.

---

# 16. Unresolved Ownership

When `owner() == address(0)`, the intent MAY exist, receive configured tokens, receive unsupported assets and become resolved later.

It MUST NOT settle, resolve, recover unsupported assets, transfer funds to the resolver contract or treat zero as permissionless ownership.

Owner-dependent calls MUST revert with `OwnerUnresolved()`.

---

# 17. Factory Interface and Behavior

```solidity
interface IGOTFactory {
    struct IntentConfig {
        bytes32 intentId;
        address ownerSource;
        bytes32 ownerKey;
        address token;
        address partner;
        address authorizedResolver;
        uint128 amount;
        uint64 initialDeadline;
        uint32 period;
        uint16 feeBps;
        bytes32 metadataHash;
    }

    function configHash(
        IntentConfig calldata config
    ) external pure returns (bytes32);

    function previewAddress(
        IntentConfig calldata config
    ) external view returns (address);

    function quoteOwnerAmount(
        uint256 grossAmount,
        uint16 feeBps
    ) external pure returns (uint256);

    function quoteGrossAmount(
        uint256 recipientAmount,
        uint16 feeBps
    ) external pure returns (uint256);

    function deployAndExecute(
        IntentConfig calldata config
    ) external returns (
        address intentAddress,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward
    );
}
```

The factory MUST:

- have zero mutable storage;
- expose no administrator, pause or upgrade;
- validate configuration;
- reject an `intentId` whose first four bytes collide with a canonical intent function selector;
- derive the canonical address;
- deploy only when code is absent;
- verify the actual deployment address;
- emit `IntentDeployed` once;
- forward the actual external caller as executor;
- atomically execute the first processing call;
- revert deployment when first execution fails.

Owner authority is determined inside the intent from the effective owner, not by comparing the caller to raw `ownerSource`.

---

# 18. Intent Interface

```solidity
interface IGOTIntent {
    function settle() external returns (
        address executor,
        address effectiveOwner,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward
    );

    function resolve() external returns (
        address executor,
        address effectiveOwner,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward
    );

    function executeFor(
        address executor
    ) external returns (
        address authorizedExecutor,
        address effectiveOwner,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward
    );

    function owner() external view returns (address);
    function totalProcessed() external view returns (uint256);

    function intentId() external view returns (bytes32);
    function ownerSource() external view returns (address);
    function ownerKey() external view returns (bytes32);
    function token() external view returns (address);
    function partner() external view returns (address);
    function authorizedResolver() external view returns (address);
    function amount() external view returns (uint128);
    function initialDeadline() external view returns (uint64);
    function period() external view returns (uint32);
    function feeBps() external view returns (uint16);
    function metadataHash() external view returns (bytes32);
    function factory() external view returns (address);

    function recoverERC20(
        address asset
    ) external returns (uint256);

    function recoverNative()
        external returns (uint256);
}
```

No generic arbitrary-call function is permitted.

---

# 19. Mutable Storage

Each deployed intent uses exactly one mutable slot:

```solidity
uint256 private packedState;
```

| Bits    | Meaning                           |
| ------- | --------------------------------- |
| `255`   | execution lock                    |
| `0–254` | cumulative gross `totalProcessed` |

```solidity
uint256 internal constant LOCK_BIT =
    uint256(1) << 255;

uint256 internal constant TOTAL_MASK =
    LOCK_BIT - 1;
```

No mutable owner, name, token, fee, partner, resolver, amount, period or metadata state is stored.

---

# 20. Authorization

## 20.1 Owner settlement

`settle()` requires a nonzero effective owner and `msg.sender == effectiveOwner`.

The owner can always settle independently of resolver policy.

## 20.2 Open resolver

When `authorizedResolver == address(0)`, any valid nonzero account other than the intent may call `resolve()`.

## 20.3 Restricted resolver

When nonzero, only the configured resolver may call the resolver path.

## 20.4 Factory execution

`executeFor(executor)` is callable only by the immutable factory. It rejects zero and self executors, resolves the owner once, authorizes owner or resolver execution and pays the execution allocation to the actual executor.

---

# 21. Resolver Liveness and Competition

A restricted resolver is a deliberate liveness dependency. If it is unavailable, the effective owner remains able to settle.

Applications SHOULD use stable resolver contracts, Safe-controlled resolver accounts, multiple operators behind one address or open execution where liveness is more important than exclusivity.

Open resolver transactions compete through normal transaction ordering. The first successful executor processes the complete available balance. Later competing transactions normally observe zero balance.

A zero-fee intent provides no token-denominated execution allocation. No independent executor is required to execute an economically unprofitable call.

Applications requiring guaranteed latency for zero-fee intents SHOULD use:

- payer-executed atomic funding and settlement;
- owner execution;
- sponsored account-abstraction calls;
- an application-operated resolver;
- bundled or batched execution;
- subscription revenue or another offchain business model to fund gas.

---

# 22. Fee Policy

`feeBps` is optional protocol configuration.

```text
feeBps = 0
    ownerAmount = complete processed balance
    treasuryFee = 0
    partnerReward = 0
    executionReward = 0

feeBps > 0
    complete processed balance is divided by cumulative fee rules
```

The protocol does not require a treasury contribution or partner reward when the fee is zero.

The canonical positive-fee allocation order is:

1. allocate execution share from total fee;
2. calculate non-execution remainder;
3. allocate partner share from non-execution remainder when a partner exists;
4. send the residual to the treasury.

The partner address and fee basis points are immutable per intent.

The canonical got.cx USDC profile MUST use zero-fee intents and fund hosted execution from subscriptions or sponsorship. Another integrator MAY choose a positive fee and receive its partner allocation onchain.

For a blacklistable configured token, every address receiving a nonzero synchronous transfer is a liveness dependency. The effective owner is always a dependency, including for zero-fee intents. For positive-fee intents, the treasury, configured partner and current executor are additional dependencies whenever their cumulative deltas are nonzero. An open executor can sometimes be replaced by another unblocked executor, but the immutable treasury and partner cannot be replaced, and a blocked effective owner prevents settlement under any fee policy. A later token-administrator blocklist can therefore make an already-funded intent permanently unprocessable because allocation is atomic and the configured token cannot use the recovery path. Applications MUST disclose this risk, validate fixed recipients before publishing or funding an address, and monitor them continuously. Preflight checks and zero-fee configuration reduce dependencies but cannot rescue funds after a later blocklist action.

---

# 23. Cumulative Fee Accounting

Let:

```text
T0 = previous cumulative gross totalProcessed
B  = complete configured-token balance observed
T1 = T0 + B
```

Cumulative total fee:

```text
F(T) = floor(T × feeBps / 10,000)
```

Cumulative execution allocation:

```text
E(T) = floor(F(T) × EXECUTION_SHARE_BPS / 10,000)
```

Cumulative non-execution fee:

```text
N(T) = F(T) - E(T)
```

Cumulative partner allocation:

```text
P(T) =
    0, when partner == address(0)

    floor(N(T) × PARTNER_SHARE_BPS / 10,000),
    otherwise
```

Cumulative treasury allocation:

```text
R(T) = N(T) - P(T)
```

Per-execution deltas:

```text
executionReward = E(T1) - E(T0)
partnerReward   = P(T1) - P(T0)
treasuryFee     = R(T1) - R(T0)
totalFeeDelta   = F(T1) - F(T0)
ownerAmount     = B - totalFeeDelta
```

For `feeBps == 0`, every cumulative fee function returns zero.

Per-execution invariant:

```text
B ==
    ownerAmount +
    treasuryFee +
    partnerReward +
    executionReward
```

Split invariance:

```text
processing 10 transfers of 10 units
    produces the same final cumulative allocation as
processing 1 transfer of 100 units
```

The result MUST NOT depend on funding partition, execution frequency, deployment timing, executor identity or effective-owner migration.

---

# 24. Exact Recipient Quotes

The core fee is mathematically charged on gross processed value. Applications MAY present it as an amount added on top of a recipient target.

For desired recipient proceeds `N` and `feeBps = f`, `quoteGrossAmount(N, f)` MUST return the minimum gross amount `G` satisfying:

```text
G - floor(G × f / 10,000) == N
```

For `f == 0`:

```text
G = N
```

Let `d = 10,000 - f`. For `N > 0` and `f > 0`, the exact minimum is:

```text
G = floor((N - 1) × 10,000 / d) + 1
```

This follows because owner proceeds equal `ceil(G × d / 10,000)`. The implementation MUST use overflow-safe full-precision arithmetic and MUST revert when no result is representable in `uint256`.

Example:

```text
Recipient target: 100.00 USDC
Positive fee:      0.30%
Gross payer quote: approximately 100.301 USDC
Owner proceeds:    exactly 100.00 USDC
```

The interface MUST distinguish:

```text
invoice amount
service / execution fee
total to transfer
```

The protocol continues to process the complete balance. Underpayment produces partial owner proceeds. Overpayment produces additional owner proceeds and fee allocation; no configured-token value is stranded merely because it differs from the quoted amount.

For recurring transfers that require an exact owner amount every period, the reference got.cx profile SHOULD use `feeBps == 0`. A third-party integration using positive fees MUST account for cumulative rounding in its recurring-transfer design.

---

# 25. Processing Algorithm

Required order:

1. Resolve effective owner exactly once.
2. Revert when unresolved.
3. Validate owner or resolver authority.
4. Read packed state.
5. Revert when lock is active.
6. Set lock.
7. Read the complete configured-token balance.
8. Revert when zero.
9. Check cumulative overflow.
10. Calculate cumulative fee deltas.
11. Store new cumulative total with lock active.
12. Transfer treasury fee when nonzero.
13. Transfer partner reward when nonzero.
14. Transfer execution reward when nonzero.
15. Transfer owner amount to cached effective owner.
16. Verify final configured-token balance is zero.
17. Clear lock.
18. Emit `TransferProcessed`.
19. Return exact values.

When the executor equals the owner, owner proceeds and execution reward MAY be combined into one token transfer while remaining separate in accounting and events.

Any failure reverts the complete operation.

---

# 26. Recovery

## 26.1 Unsupported ERC20

Only the cached effective owner may recover an ERC20 other than the configured token.

The configured token MUST NOT be recoverable outside canonical processing.

## 26.2 Native asset

Only the cached effective owner may recover the complete native balance.

Deployed canonical intents accept direct native transfers through the payable fallback. Factory validation MUST reject `intentId` selector prefixes that would dispatch empty original calldata to a nonpayable intent function.

Callers MUST use a full-gas call. Solidity `send` and `transfer` are not compatible with the deployed clone path because their 2,300-gas stipend cannot cover a cold implementation access and delegation.

## 26.3 Unresolved intent

Recovery is unavailable while owner resolution returns zero.

---

# 27. Core Events

```solidity
event IntentDeployed(
    bytes32 indexed configHash,
    address indexed intentAddress,
    address indexed executor
);

event TransferProcessed(
    address indexed executor,
    address indexed effectiveOwner,
    address indexed partner,
    uint256 processedAmount,
    uint256 ownerAmount,
    uint256 treasuryFee,
    uint256 partnerReward,
    uint256 executionReward,
    uint256 totalProcessed
);

event ERC20Recovered(
    address indexed asset,
    address indexed effectiveOwner,
    uint256 amount
);

event NativeRecovered(
    address indexed effectiveOwner,
    uint256 amount
);
```

Indexers MUST treat the emitted effective owner as authoritative for that operation.

---

# 28. Core Errors

```solidity
error DirectImplementationCall();
error UnauthorizedFactory();
error UnauthorizedOwner();
error UnauthorizedResolver();
error InvalidExecutor();
error InvalidConfiguration();
error InvalidToken();
error InvalidAsset();
error NoFundsAvailable();
error ReentrantExecution();
error TotalProcessedOverflow();
error ConfiguredTokenNotRecoverable();
error UnexpectedDeploymentAddress();
error OwnerUnresolved();
error OwnerResolverUnavailable();
error InvalidOwnerResolver();
error OwnerResolutionFailed();
error InvalidResolvedOwner();
error TokenBalanceNotCleared();
error NativeTransferFailed();
```

---

# 29. Core Security Invariants

**INV-1 — Deterministic identity**  
Exact canonical inputs produce the same address.

**INV-2 — Counterfactual safety**  
Different code or immutable arguments cannot occupy the predicted canonical address through the canonical factory.

**INV-3 — Standalone ownership**  
A direct intent has no GOTName dependency.

**INV-4 — Explicit resolver mode**  
Only nonzero `ownerKey` activates resolver behavior.

**INV-5 — No mutable configuration**  
Configuration never changes after address derivation.

**INV-6 — Unresolved safety**  
Zero owner cannot receive settlement or recovery.

**INV-7 — Fail closed**  
Resolver failure reverts owner-dependent operations.

**INV-8 — One owner read**  
Each state-changing operation uses one cached owner.

**INV-9 — Owner sovereignty**  
The current owner can always settle.

**INV-10 — Resolver isolation**  
Resolver cannot alter owner or configuration.

**INV-11 — Zero-fee correctness**  
When `feeBps == 0`, all fee outputs are zero and owner receives the complete balance.

**INV-12 — Positive-fee invariance**  
Cumulative allocations are partition independent.

**INV-13 — Partner transparency**  
A partner reward can only go to the immutable partner.

**INV-14 — Configured-token protection**  
Configured token cannot bypass processing.

**INV-15 — Complete-balance processing**  
A successful operation clears the configured-token balance.

**INV-16 — Atomic deployment**  
Failed first processing reverts deployment.

**INV-17 — Reentrancy safety**  
Nested processing cannot corrupt accounting.

**INV-18 — Dynamic-owner event correctness**  
The event records the exact cached owner used.

**INV-19 — Native funding selector safety**
Every canonical implementation function selector is rejected as an `intentId` prefix, so empty-calldata native transfers reach the payable fallback.

---

# 30. Required Core Tests

Tests MUST include:

- direct EOA, Safe and smart-account owners;
- undeployed counterfactual smart-account address;
- resolver owner before and after claim;
- resolver returning zero, malformed data, self and resolver address;
- bounded-gas failure;
- zero-fee direct, open-resolver and restricted-resolver execution;
- positive-fee execution with and without partner;
- fee values at 0, 1, maximum and boundary rounding values;
- split invariance under randomized funding partitions;
- exact recipient quote properties;
- partial, repeated, late and excess funding;
- competing resolvers;
- owner and resolver transaction competition;
- first deployment and execution rollback;
- unsupported token and native recovery;
- configured-token recovery rejection;
- fee-on-transfer, rebasing, malicious and reentrant token behavior;
- totalProcessed overflow boundary;
- proxy suffix validation;
- rejection of every implementation selector as an `intentId` prefix and successful native funding for valid identifiers;
- deterministic address vectors across supported chains.

Fuzz properties MUST include:

```text
owner + treasury + partner + executor == gross
zero fee implies owner == gross
all fee outputs are monotonic cumulatively
partitioning does not change cumulative allocation
quoteGrossAmount produces exact target owner proceeds for a fresh intent
```

---

# Part II — GOTName

# 31. GOTName Overview

`GOTName` is optional reusable ownership resolution.

It maps:

```text
bytes32 nameKey -> account
```

An intent configured with:

```text
ownerSource = GOTName
ownerKey    = nameKey
```

resolves to the current account stored for that key.

The contract does not store raw names or provider identifiers.

Required properties:

- immutable verifier;
- one-time first claim;
- support for EOA and ERC-1271 verifier signatures;
- claim before intent deployment;
- account migration by current owner;
- no verifier overwrite;
- no pause;
- no upgradeability;
- permanent ERC-165 support.

---

# 32. Name Keys and Namespaces

GOTName keys use the single canonical identity string defined by GOT Links Model normalization version `got-links-v1`:

```solidity
bytes32 nameKey = keccak256(bytes(canonicalIdentity));
```

Examples are `got:dima`, `x:vitalik`, `telegram:dima`, `email:alice@example.com`, and `phone:+491234567890`. The URL presentation `@` is removed before hashing. Applications MUST NOT ABI-encode the namespace and identifier separately.

The TypeScript package API is the normative normalization implementation:

```ts
import { deriveNameKeyV1, normalizeGOTIdentity } from "@got-cx/protocol";
```

`GOTName.deriveNameKey` only hashes an already-canonical string so Solidity and TypeScript can verify the same vectors. It MUST NOT be used to normalize untrusted text onchain. Frontends, APIs, the claim service, and Safe signer tooling MUST derive keys through `deriveNameKeyV1`, or explicitly canonicalize inputs with `normalizeGOTIdentity` before hashing or calling `GOTName.deriveNameKey`.

Canonical namespace identifiers are:

```text
got
x
telegram
email
phone
ens
github
domain
custom:<application-id>
```

Normalization rules MUST be versioned, deterministic, injective and published. The normative version is `got-links-v1`. Applications MUST NOT silently change normalization rules for an existing namespace version.

## 32.1 Injective Encoding

The `:` separator is unambiguous because identifiers may never contain `:` and the namespace set is closed. Built-in namespaces contain no separator. A custom namespace has exactly the form `custom:<application-id>`, so it contains exactly one separator before the identifier is appended.

Consequently, inputs such as `("custom:shop", "a:b")`, `("custom", "shop:a:b")`, unknown namespaces, and additional custom namespace components are rejected rather than mapped to a key.

## 32.2 Link Normalization

| GOT link                          | Canonical identity        |
| --------------------------------- | ------------------------- |
| `got.cx/@dima`                    | `got:dima`                |
| `got.cx/x:@vitalik`               | `x:vitalik`               |
| `got.cx/tg:@dima`                 | `telegram:dima`           |
| `got.cx/#email:alice@example.com` | `email:alice@example.com` |
| `got.cx/#phone:+491234567890`     | `phone:+491234567890`     |

`got.cx/0x...` is a direct deterministic intent-address route. It is not a GOTName identity and MUST NOT be hashed into a `nameKey`.

All inputs are trimmed and normalized to Unicode NFC at the input boundary. The remaining rules are namespace-specific:

| Namespace                 | Canonical rule                                                                                                                                                                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `got`                     | Remove at most one leading `@`; Unicode lowercase; 1–64 Unicode letters/digits plus internal `.`, `_`, or `-`; no leading/trailing punctuation.                                                                                    |
| `x`                       | Remove at most one leading `@`; lowercase ASCII letters, digits, or `_`; 1–15 characters.                                                                                                                                          |
| `telegram` (`tg` route)   | Canonical namespace is `telegram`; remove at most one leading `@`; lowercase ASCII letters, digits, or `_`; 1–32 characters.                                                                                                       |
| `github`                  | Remove at most one leading `@`; lowercase ASCII letters, digits, or `-`; 1–39 characters; no leading/trailing or consecutive `-`.                                                                                                  |
| `email`                   | Exactly one `@`; ASCII dot-atom local part of at most 64 characters is case-preserving; domain uses the `domain` rules. Quoted and internationalized local parts are unsupported. Provider-specific rewrites are forbidden.        |
| `phone`                   | E.164: `+` followed by 8–15 ASCII digits, starting with a nonzero country-code digit.                                                                                                                                              |
| `ens`                     | ENSIP-15 normalization via the pinned viem normalizer; the result must contain at least two labels.                                                                                                                                |
| `domain`                  | WHATWG/UTS-46 conversion to lowercase ASCII IDNA form, valid DNS labels, at least two labels, and at most 253 characters; trailing root dots are rejected.                                                                         |
| `custom:<application-id>` | Application ID is a lowercase DNS-style label of 1–63 characters. The case-sensitive identifier is 1–128 ASCII URI-unreserved characters (`A-Z`, `a-z`, digits, `.`, `_`, `~`, `-`) with an alphanumeric first and last character. |

Malformed values such as `@@Alice`, `a@@Example.COM`, formatted phone numbers, and noncanonical direct-hash inputs are rejected. These rules are immutable for `got-links-v1`; an incompatible change requires a new published version and migration plan.

## 32.3 Cross-Language Golden Vectors

| Canonical identity             | Name key                                                             |
| ------------------------------ | -------------------------------------------------------------------- |
| `got:dima`                     | `0x30a06aaeff91473d7ee33abc0fd5df8035d396a6e08eb8e897dc2f0e7c76017d` |
| `x:vitalik`                    | `0x0461b719c64cee37778c51d241ff9483fd7d9bef4988591915639d1f03cb9e7c` |
| `telegram:dima`                | `0x87c11a9c517d43f19d31777500762d8ad70c05e5b504936ff0fd246a34c65cdf` |
| `email:alice@example.com`      | `0x3425d4006b9f3db86dbe07521c674f43120dd17e73e7d338dff954ac5202b822` |
| `phone:+491234567890`          | `0x1e5212a74a3334ae59243952efcec237f894f7b448e58ba1bee84764aa369cde` |
| `github:octocat`               | `0x9b438a8ea6d6a299d7833a3776f46b18a99186160d98ebceeb41028eb3a6a3b7` |
| `ens:alice.eth`                | `0xa96e7a476dbfca9801a9ac0211c2cccdc08ad58e8b3432133d860dc8b5277de4` |
| `domain:xn--bcher-kva.example` | `0x77d0bb7017b33c0b3da8b68bd1da930c492a1aa30837596fe5ad39dda8fbb054` |
| `custom:shop:order-123`        | `0x9271bae65fa0f8dbe2a69fe28f554718563f751ed7c339b9dce87ef532143aab` |

The Solidity and TypeScript test suites MUST assert the same vectors.

Private opaque routes do not use public identity derivation. Applications MUST generate their `bytes32` keys with a cryptographically secure random-number generator and keep the identifier-to-key mapping offchain.

---

# 33. Deterministic and Private Identifier Modes

## 33.1 Deterministic identity mode

Canonical GOT names, social handles, email addresses and phone numbers use the versioned `got-links-v1` normalization rules in Section 32 and are deterministically hashed into `nameKey`.

Public path routes are appropriate for public identifiers such as GOT names and social handles:

```text
got.cx/@dima
got.cx/x:@vitalik
got.cx/tg:@username
```

Email and phone use URL fragments in the canonical Links Model:

```text
got.cx/#email:alice@example.com
got.cx/#phone:+491234567890
```

A fragment is not sent in the initial HTTP request and therefore reduces passive server-log and referrer exposure. It is not cryptographic secrecy: the recipient of the link can read the identifier, browser history may retain it, and the deterministic onchain hash of a low-entropy identifier can be dictionary attacked.

Applications MUST NOT describe fragment-based deterministic email or phone routes as private or secret.

## 33.2 Optional private opaque mode

Applications MAY provide a separate private-link mode when the identifier or route must not be derivable from a public identity.

The application generates a cryptographically random `bytes32` key and uses it directly as the onchain `nameKey`. Any identifier-to-key mapping and verification evidence remain offchain.

An opaque key MAY be transported in a URL fragment so the initial HTTP request does not contain the key. The exact opaque-link presentation is application-defined and is not part of the canonical public GOT Links Model.

Opaque keys MUST NOT be derived from email, phone, social handles or other low-entropy identifiers.

---

# 34. Claim Verifier Security

`GOTName` MUST use an immutable verifier address.

The production verifier SHOULD be a Safe with a minimum 2-of-3 threshold.

Recommended operational separation:

1. verifier operator A validates ownership evidence and records an immutable audit record;
2. verifier operator B independently validates the evidence and proposed account binding;
3. the threshold Safe signature authorizes the EIP-712 claim;
4. no single backend EOA can authorize a claim.

Verification evidence MAY include:

- email magic-link completion;
- X OAuth or signed challenge;
- Telegram validated login;
- domain DNS or HTTP proof;
- ENS ownership;
- account-control signature from the destination account.

The verifier MUST NOT be able to overwrite an already claimed key.

---

# 35. Claim Authorization

```solidity
struct Claim {
    bytes32 nameKey;
    address account;
    uint48 deadline;
}
```

EIP-712 type:

```text
Claim(bytes32 nameKey,address account,uint48 deadline)
```

Claim requirements:

- nonzero `nameKey`;
- nonzero account;
- account not equal to `GOTName`;
- unexpired deadline;
- key not previously claimed;
- valid immutable-verifier signature;
- signature validation through `SignatureChecker` to support EOA and ERC-1271 verifiers.

Claim submission MAY be sponsored. The submitting account does not need to equal the destination account because the verifier signature binds the account.

The immutable verifier has complete authority over first claims. Its offchain signing policy MUST require both fresh identity evidence and cryptographic proof of control over `claimData.account`; the contract does not independently require a destination-account signature.

---

# 36. Name Transfer

After claim, only the current mapped account may transfer the key to another valid account.

```solidity
function transfer(
    bytes32 nameKey,
    address newAccount
) external;
```

The verifier cannot force migration.

This supports user-controlled migration from an EOA to Base Account, Safe or another smart account.

Transfer is an immediate, one-step, irreversible assignment. There is no pending-owner acceptance, cancellation, guardian or verifier recovery. Applications MUST checksum and simulate the destination, warn about incapable contracts and loss of access, and require an explicit confirmation before submitting a transfer.

Applications SHOULD warn users that external identity ownership changes do not automatically change the onchain mapping.

---

# 37. GOTName Interface, Events and Errors

```solidity
interface IGOTName is IGOTOwnerResolver {
    function deriveNameKey(
        string calldata canonicalIdentity
    ) external pure returns (bytes32);

    function accountOf(
        bytes32 nameKey
    ) external view returns (address);

    function claim(
        Claim calldata claimData,
        bytes calldata verifierSignature
    ) external;

    function transfer(
        bytes32 nameKey,
        address newAccount
    ) external;
}
```

The fixed `IGOTName` ERC-165 interface ID is `0x73a79167`. Implementations MUST also support `IGOTOwnerResolver` and `IERC165` independently.

Events:

```solidity
event NameClaimed(
    bytes32 indexed nameKey,
    address indexed account
);

event NameTransferred(
    bytes32 indexed nameKey,
    address indexed previousAccount,
    address indexed newAccount
);
```

Errors:

```solidity
error InvalidNameKey();
error InvalidAccount();
error ClaimExpired();
error AlreadyClaimed();
error NameNotClaimed();
error NoAccountChange();
error InvalidVerifierSignature();
error Unauthorized();
```

---

# 38. GOTName Invariants and Tests

Invariants:

- a key is unclaimed or maps to exactly one current account;
- first claim is authorized by the immutable verifier;
- verifier cannot overwrite a claim;
- only current account can transfer;
- `resolveOwner` equals `accountOf`;
- raw identifiers are absent from contract storage;
- ERC-165 support cannot be disabled.

Tests MUST cover EOA and Safe verifier signatures, threshold-signature fixtures, expired claims, replay, chain/domain separation, claim before intent deployment, claim after funding, transfer, invalid destinations and resolver integration.

---

# Part III — GOTSubscription

# 39. GOTSubscription Overview

`GOTSubscription` is optional Base-oriented periphery for recurring stablecoin transfers.

It combines:

```text
Base Spend Permission
    subscriber authorization and periodic allowance

GOTSubscription
    immutable validation and atomic charge execution

deterministic intent address
    isolated incoming accounting and settlement
```

`GOTSubscription` is the authorized spender. It receives the exact permitted gross amount, forwards it to the predicted intent address and atomically calls the factory.

The initial deployment MUST be immutable, minimal, non-upgradeable and independently audited.

---

# 40. Spend Permission Model

A recurring transfer uses a permission containing at least:

```text
account
spender
token
allowance
period
start
end
salt
extraData
```

For a 29 USDC monthly transfer with no protocol fee:

```text
token      = USDC
spender    = GOTSubscription
allowance  = 29 USDC
period     = billing period
start      = subscription start
end        = required exclusive end
```

The pinned Coinbase Spend Permission Manager requires `start < end`; zero is not an unbounded-expiry sentinel. A product with no user-selected end MUST encode an explicit future timestamp. `type(uint48).max` MAY represent a practically unbounded permission when that policy is clearly disclosed.

Required v0.2 reference policy:

```text
permission.spender   == GOTSubscription
permission.token     == config.token
permission.allowance == config.amount
permission.period    == config.period
permission.end       > permission.start
```

Consequences:

- no more than the allowance can be transferred in one period;
- a second full charge in the same period fails;
- the account owner may revoke;
- unused allowance does not roll over as protocol debt;
- missed periods are application-level overdue state.

The got.cx product SHOULD use `feeBps == 0` for exact recurring merchant proceeds and for its own onchain SaaS subscriptions.

Third-party applications MAY use positive fees, but the permission allowance is the gross charged amount and owner proceeds follow cumulative fee rules.

---

# 41. Subscription Binding

`extraData` SHOULD bind the exact intent:

```solidity
struct SubscriptionBinding {
    bytes32 version;
    address factory;
    bytes32 configHash;
    address intent;
}
```

Canonical version:

```solidity
keccak256("GOT_SUBSCRIPTION_BINDING_V2")
```

Required relationships:

```solidity
permission.spender == address(this);
permission.token == config.token;
config.period > 0;
permission.period == uint48(config.period);
permission.allowance == uint160(config.amount);
config.initialDeadline <= type(uint48).max;
permission.start == uint48(config.initialDeadline);
permission.end > permission.start;
config.authorizedResolver == address(this);
binding.factory == GOT_FACTORY;
binding.configHash == GOT_FACTORY.configHash(config);
binding.intent == GOT_FACTORY.previewAddress(config);
```

The binding MUST prevent arbitrary destination or configuration substitution.

---

# 42. Subscription Execution

Conceptual function:

```solidity
function execute(
    SpendPermission calldata permission,
    bytes calldata approvalSignature,
    IGOTFactory.IntentConfig calldata config
) external nonReentrant returns (
    address intent,
    uint256 processedAmount,
    uint256 ownerAmount,
    uint256 treasuryFee,
    uint256 partnerReward,
    uint256 executionReward
);
```

Required algorithm:

1. Validate permission and exact binding.
2. Predict the canonical intent.
3. Register approval by signature when not already approved.
4. Snapshot token balance.
5. Spend exactly `config.amount`.
6. Verify exact balance increase.
7. Transfer exact gross amount to the intent.
8. Call `deployAndExecute`.
9. Receive any execution reward at `GOTSubscription`.
10. Forward the exact execution reward to `msg.sender`.
11. Verify no unexpected principal remains.
12. Emit the subscription event.

If the owner is unresolved, the entire transaction reverts, including the account spend.

---

# 43. Subscription Cancellation and Failure

The account owner can revoke the Spend Permission through the permission manager.

The spender MAY also revoke where supported.

Application states such as paused, canceled, overdue and trial-ended remain offchain interpretations unless represented by permission validity or revocation.

No rollover is performed by v0.2. Missed periods require a new invoice, a separate catch-up permission or explicit product policy.

Keeper front-running changes only which keeper receives an execution allocation. It cannot change amount, token, recipient, period, partner or fee.

---

# 44. GOTSubscription Events, Invariants and Tests

Event:

```solidity
event SubscriptionTransferProcessed(
    bytes32 indexed intentId,
    address indexed subscriber,
    address indexed intent,
    address executor,
    uint256 processedAmount,
    uint256 ownerAmount,
    uint256 treasuryFee,
    uint256 partnerReward,
    uint256 executionReward
);
```

Invariants:

- exact permission binding;
- no arbitrary destination;
- no variable charge amount beyond permission;
- account spend and settlement are atomic;
- unresolved owner rolls back the charge;
- execution reward is forwarded exactly;
- no incremental configured-token balance from the current execution remains; pre-existing unsolicited balances are preserved and may be permanently stranded;
- cancellation prevents future charges.

Tests MUST cover approval-by-signature, ERC-6492 where supported, existing approval, period boundaries, revocation, malformed `extraData`, malicious keeper, unresolved owner, zero and positive fee intents, token balance deltas and reentrancy.

---

# Part IV — got.cx Product

# 45. got.cx Product Role

`got.cx` is a product built on GOT Protocol. It is not privileged by the core and MUST NOT be required for third-party use.

It provides:

- Base Account onboarding;
- direct and named transfers;
- invoices;
- recurring transfers;
- receipts;
- activity and reconciliation;
- API and webhooks;
- hosted resolver and scheduler infrastructure;
- name verification and claim UX;
- SaaS plans and team management.

Another application can integrate the contracts directly, run its own infrastructure and use its own economic model.

---

# 46. got.cx Business Model

The preferred model is subscription-only SaaS pricing with no additional got.cx percentage fee on transfer volume.

Canonical principle:

> **GOT Protocol moves value. got.cx charges for hosted software, organization and automation.**

got.cx plans MAY include Free, Go, Plus, Business and Enterprise.

Paid plans SHOULD be fixed-price recurring subscriptions rather than a tax on money moved.

got.cx’s own paid plan SHOULD be authorized and collected onchain through `GOTSubscription` as dogfooding.

The got.cx SaaS subscription:

- is separate from customer-to-merchant transfers;
- does not require sharing subscription revenue with an integration partner;
- MAY include an optional public referral program offchain in the future;
- SHOULD use a zero-fee intent unless a specific execution design requires otherwise;
- unlocks product features after indexed finality.

No plan may impose an onchain transfer-value ceiling through GOT Protocol.

---

# 47. Hosted SaaS Limits

Limits MAY apply to hosted resources:

- organizations and projects;
- active invoice records;
- active subscription records;
- API requests;
- webhook deliveries;
- automation executions;
- resolver priority;
- retained indexed history;
- exports;
- verification operations;
- notification volume;
- team seats;
- custom domains;
- sponsored gas.

Limits MUST NOT be enforced by changing the protocol’s permissionless ability to receive and settle funds.

When a paid plan expires:

- existing intent addresses remain valid;
- onchain funds remain controlled by protocol rules;
- direct contract interaction remains possible;
- only hosted features, automation, history retention, branding, API access or sponsorship may be reduced.

---

# 48. Base Account Integration

Base Account is the preferred reference account layer for:

- passkey authentication;
- smart-account execution;
- recovery;
- multichain account use;
- spend permissions;
- sponsored transactions where available.

GOT MUST NOT implement a competing custom wallet for v0.2.

The interface SHOULD use capability detection and MUST degrade gracefully for EOA, Safe and other compatible accounts.

Account recovery is controlled by the account system, not GOT Protocol.

---

# 49. Transfer and Invoice Experience

Merchant flow:

```text
merchant signs in
-> enters recipient target amount, asset, customer and description
-> application chooses feeBps and partner
-> application quotes gross payer amount
-> application creates IntentConfig
-> factory predicts intent address
-> application returns transfer link and address
```

Payer display for positive fee:

```text
Invoice amount       100.00 USDC
Execution/service fee  0.30 USDC
Total to transfer    100.30 USDC
```

Payer display for zero fee:

```text
Invoice amount       100.00 USDC
Total to transfer    100.00 USDC
```

The interface MUST not hide a positive fee.

Status is derived from finalized onchain owner proceeds and application target:

```text
OPEN
PARTIAL
SETTLED
OVERPAID
EXPIRED
CANCELED
```

A deadline does not disable protocol settlement.

---

# 50. GOT Links Model and Routing

The canonical got.cx Links Model is:

```text
got.cx/@dima
    GOT name

got.cx/x:@vitalik
    X identity

got.cx/tg:@username
    Telegram identity

got.cx/#email:alice@example.com
    email identity carried in the URL fragment

got.cx/#phone:+491234567890
    phone identity carried in the URL fragment

got.cx/0x...
    deterministic intent address
```

The `@` presentation marker is removed during identity normalization. The `tg` route alias canonicalizes to the `telegram` namespace. Email and phone normalization MUST follow the normative `got-links-v1` rules in Section 32.

The `got.cx/0x...` route MUST contain a valid 20-byte EVM address and represents the deterministic intent address itself. It MUST NOT be interpreted as a `transferId`. A processed `transferId` remains an infrastructure and receipt identifier derived from chain and log coordinates.

On the canonical launch product, `got.cx/0x...` resolves in the Base context. In multichain applications, an address alone does not prove the intended chain; the interface MUST display the selected `chainId` and verify the expected factory, implementation and immutable configuration before asking a payer to fund it.

Fragment routes reduce passive HTTP request and referrer exposure because the fragment is handled client-side. They do not make email or phone secret. The interface MUST not claim cryptographic privacy for deterministic fragment routes.

Applications MAY offer a separate random opaque-link mode as described in Section 33.2, but that mode is not a canonical identity route and MUST NOT replace the deterministic `#email:` or `#phone:` normalization rules when those canonical routes are used.

Routes provide discovery and UX only. The deterministic intent address, selected chain and immutable intent configuration remain authoritative.

---

# 51. Named Transfer and Claim Experience

Named transfer:

```text
payer enters or opens GOT identity link
-> application parses the canonical route
-> application normalizes identity and derives identifierKey
-> creates intent with ownerSource = GOTName
-> payer funds predicted intent address
-> owner may remain unresolved
-> recipient verifies identifier
-> threshold verifier signs claim
-> recipient claims nameKey to Base Account
-> resolver or owner settles all funded intents
```

Direct intent-address transfer:

```text
payer opens got.cx/0x...
-> application resolves the deterministic intent address on the selected chain
-> application verifies canonical factory/code/config context
-> payer transfers the configured asset to the intent address
-> resolver or owner settles according to the immutable intent configuration
```

The claim interface MUST display:

- normalized identifier;
- namespace;
- destination account;
- claim deadline;
- public nature of the resulting mapping;
- irreversible first-claim consequences;
- migration controls after claim.

---

# 52. Subscription Product Experience

Merchant creates:

- plan name;
- gross recurring amount;
- period;
- optional user-selected end, encoded onchain as a required explicit future timestamp;
- recipient intent configuration;
- zero or positive protocol fee;
- cancellation policy and application metadata.

Subscriber signs a Spend Permission.

The application stores the permission and signature securely, tracks periods and schedules execution.

got.cx SHOULD use zero-fee recurring intents by default to make the merchant’s configured recurring amount equal owner proceeds.

got.cx’s own SaaS plans SHOULD use the same flow:

```text
got.cx merchant
-> authorizes fixed monthly USDC permission
-> GOTSubscription charges
-> zero-fee intent settles to GOT treasury
-> indexer activates hosted plan
```

---

# 53. Partner and Integrator Model

The protocol-level `partner` is not a got.cx affiliate database. It is an immutable onchain reward address selected by the application creating the intent.

Third-party integrations MAY:

- set `partner` to their treasury;
- choose `feeBps` based on gas and business economics;
- operate the resolver;
- earn partner and execution allocations onchain;
- charge a subscription offchain or onchain;
- use zero fees and monetize elsewhere;
- expose GOT under their own product interface.

got.cx MAY set:

```text
feeBps = 0
partner = address(0)
```

and monetize through subscriptions.

A marketplace MAY set a positive fee and its partner address.

All positive fee terms MUST be visible before funding and immutable for the intent.

---

# 54. Developer Platform

The developer platform SHOULD provide:

- TypeScript SDK;
- config builders;
- deterministic preview;
- fee quote helpers;
- name-key helpers;
- link builders;
- account and chain validation;
- indexed transfer lookup;
- invoice and subscription APIs;
- webhook signing;
- test vectors;
- local and testnet examples;
- partner analytics derived from onchain events.

The SDK MUST not silently select a nonzero fee or partner.

---

# 55. API Conventions

Canonical base path:

```text
/api/v2
```

Representative endpoints:

```text
POST   /intents
GET    /intents/{intentAddress}
POST   /transfers
GET    /transfers/{transferId}
POST   /invoices
GET    /invoices/{invoiceId}
POST   /subscriptions
GET    /subscriptions/{subscriptionId}
POST   /names/resolve
POST   /names/claims
GET    /partners/{address}/rewards
POST   /webhooks
```

Writes MUST support idempotency keys.

Amounts MUST be strings in token base units in machine APIs.

Every chain-bound record MUST include `chainId`.

The API MUST distinguish `recipientTargetAmount`, `grossQuotedAmount`, `processedAmount`, `ownerAmount` and each fee allocation.

---

# 56. Data Model

Minimum entities:

```text
Organization
Project
Account
Intent
TransferRequest
FundingTransfer
ProcessedTransfer
Invoice
Subscription
SpendPermissionRecord
NameRecord
ClaimEvidence
Partner
WebhookEndpoint
WebhookDelivery
SaaSPlan
SaaSSubscription
UsageCounter
```

Onchain source-of-truth fields MUST be stored with chain, block, transaction, log index and finality status.

Sensitive claim evidence MUST be separated from public indexed records.

---

# 57. Transfer State Model

Application states:

```text
CREATED
ADDRESS_READY
FUNDING_DETECTED
UNRESOLVED
PROCESSING
SETTLED
PARTIAL
OVERPAID
FAILED
REORGED
```

A raw ERC20 transfer is not the same as a processed transfer.

The finalized `TransferProcessed` event is authoritative for owner proceeds and fee allocation.

---

# 58. Invoice State Model

Recommended invoice state derives from cumulative finalized owner proceeds:

```text
DRAFT
OPEN
PARTIAL
SETTLED
OVERPAID
PAST_DUE
CANCELED
```

Application cancellation stops reminders or fulfillment but cannot invalidate the onchain address.

Refunds are separate transfers controlled by the merchant.

---

# 59. Subscription State Model

Recommended states:

```text
DRAFT
AWAITING_APPROVAL
ACTIVE
PAST_DUE
PAUSED
REVOKED
ENDED
FAILED
```

The permission manager is authoritative for approval, spend and revocation.

The scheduler state is operational, not authority over user funds.

---

# Part V — Infrastructure

# 60. Indexing and Finality

The indexer MUST process:

- ERC20 funding events;
- `IntentDeployed`;
- `TransferProcessed`;
- recovery events;
- GOTName claims and transfers;
- subscription executions;
- spend-permission state where available.

It MUST support:

- idempotent replay;
- chain-specific finality;
- reorg rollback;
- duplicate-log prevention;
- backfill;
- cursor recovery;
- contract code-hash validation;
- versioned schemas.

No webhook or fulfillment action should be treated as final before the configured finality threshold.

---

# 61. Resolver Infrastructure

Resolver workers:

1. discover funded addresses;
2. verify canonical config and predicted address;
3. estimate gas and execution allocation;
4. choose whether to execute;
5. submit through factory or deployed intent;
6. track inclusion and finality;
7. retry safely;
8. never infer authority from offchain database state alone.

For zero-fee got.cx intents, resolver workers MAY be funded from SaaS subscription revenue or gas sponsorship.

Restricted resolver control SHOULD use Safe or a stable contract with rotating operators.

---

# 62. Subscription Scheduler

The scheduler:

- tracks active permissions;
- computes current spend periods;
- avoids duplicate execution;
- estimates gas;
- submits valid charges;
- retries transient failures;
- stops on revocation or end;
- emits operational alerts;
- treats the permission manager and onchain events as authoritative.

Scheduler compromise cannot increase the approved amount or change the destination when binding validation is correct.

---

# 63. Name Verification Infrastructure

Verification adapters SHOULD support email, phone, X, Telegram, ENS, domains and application-defined namespaces.

The system MUST preserve:

- exact normalized identifier;
- namespace and normalization version;
- challenge nonce;
- verification timestamp;
- destination account proof;
- evidence hash;
- approving operators;
- claim digest and deadline.

The production signer workflow SHOULD require two independent approvals through the verifier Safe.

Supabase MAY store records, but the onchain verifier signature and GOTName state are authoritative for claims.

---

# 64. Webhooks

Canonical events MAY include:

```text
transfer.funding_detected
transfer.processed
transfer.partial
transfer.overpaid
invoice.settled
invoice.past_due
subscription.activated
subscription.processed
subscription.past_due
subscription.revoked
name.claimed
name.transferred
saas_plan.activated
saas_plan.expired
```

Webhook payloads MUST include:

- event ID;
- event type;
- creation timestamp;
- chain ID where applicable;
- transaction and log references;
- canonical JSON payload;
- signature;
- delivery attempt.

Deliveries MUST be idempotent and retryable.

---

# 65. Notifications

Notifications MAY use email, browser push, Telegram and other channels.

Notifications are advisory. They do not determine settlement or permission state.

Sensitive identifiers MUST not be included in public logs or analytics events.

---

# 66. Observability and Operations

Required monitoring:

- RPC health;
- chain lag;
- indexer lag;
- reorg depth;
- resolver profitability and failures;
- zero-fee sponsorship spend;
- scheduler failures;
- claim-signing queue;
- Safe threshold availability;
- webhook failure rate;
- contract code-hash drift;
- unexpected token balances;
- SaaS usage and limits.

Operational runbooks MUST cover key loss, signer unavailability, RPC outage, indexer rebuild, webhook compromise, dependency upgrade and chain incident.

---

# 67. Privacy

Onchain data MUST exclude:

- raw email and phone;
- OAuth tokens;
- login assertions;
- personal messages;
- invoice documents;
- customer personal data;
- secret API keys;
- private transfer descriptions.

`metadataHash` MAY commit to encrypted or access-controlled records.

Users MUST be informed that intent addresses, transfers, name keys, claims, account mappings, name transfers, partners and settlement events are public.

Low-entropy deterministic identifier hashes are discoverable through dictionary attacks. Fragment routing reduces passive HTTP/referrer exposure but does not prevent dictionary attacks or make an identifier secret. Applications requiring actual identifier privacy SHOULD use the separate cryptographically random opaque-key mode described in Section 33.2.

---

# 68. Threat Model

## 68.1 Counterfactual address confusion

Mitigate with canonical config display, deterministic test vectors, chain ID display and factory/code-hash verification.

## 68.2 Resolver compromise

A resolver can choose whether and when to process but cannot redirect owner proceeds or change fees. Owner settlement remains available.

## 68.3 Zero-fee liveness

A zero-fee intent may remain unprocessed when no party pays gas. Product UX must communicate sponsorship or execution responsibility.

## 68.4 Partner substitution

Mitigate by committing partner and fee to the address and displaying them before funding.

## 68.5 Claim verifier compromise

Before first claim, compromised threshold signers may authorize an attacker. Use 2-of-3 Safe, independent evidence review, short deadlines, monitoring and destination account proof.

After claim, the verifier cannot overwrite the mapping.

## 68.6 Social account compromise

Use recent authentication, account-control proof, notifications and risk controls.

## 68.7 GOTSubscription compromise

Mitigate through immutable code, exact binding, exact allowance, no arbitrary destination, reentrancy protection and audit.

## 68.8 Webhook forgery

Use signed canonical payloads, replay protection and API verification.

## 68.9 Token behavior

Reference profile supports canonical USDC. Generic deployments must assess fee-on-transfer, rebasing, callback and blacklist behavior. Canonical got.cx USDC intents use `feeBps == 0`, which removes treasury, partner and executor token transfers but does not eliminate the effective-owner blocklist dependency. Positive-fee integrations additionally accept that a later blocklist of the immutable treasury or partner, or of the selected executor when a reward is due, can prevent atomic settlement. Recipient monitoring and pre-funding checks are required operational controls, not recovery mechanisms.

## 68.10 SaaS account compromise

Hosted dashboard compromise must not grant protocol ownership. Sensitive writes require wallet signatures where authority matters.

---

# 69. Independent Audit Scope

## 69.1 GOTIntent and GOTFactory

Audit:

- immutable encoding;
- proxy runtime and suffix;
- CREATE2 derivation;
- zero-fee behavior;
- positive cumulative fee math;
- quote helpers;
- partner allocation;
- one-slot state;
- owner resolution;
- atomic deployment;
- authorization;
- reentrancy;
- token transfers;
- recovery;
- complete-balance clearing;
- deterministic deployment.

## 69.2 GOTName

Audit EIP-712 domain, EOA/ERC-1271 verifier signatures, threshold Safe fixtures, one-time claim, current-owner transfer, invalid account rejection, ERC-165 and non-upgradeability.

## 69.3 GOTSubscription

Audit exact permission binding, extraData parsing, approval, allowance, period, token, atomic spend and settlement, reward forwarding, cancellation, malicious keeper and unresolved-owner rollback.

## 69.4 Application security

Review account authentication, API authorization, idempotency, claim evidence, webhook signing, secret storage, privacy, data isolation and SaaS limit enforcement.

---

# Part VI — Deployment and Versioning

# 70. Deployment Profile

Initial production:

```text
Chain:       Base Mainnet
Asset:       canonical USDC
Account:     Base Account preferred
Interface:   got.cx
```

Testing:

```text
Chain:       Base Fork
Asset:       canonical USDC
```

Core SHOULD remain deployable on Ethereum and compatible EVM chains.

---

# 71. Canonical Multichain Deployment

`GOTIntent` and `GOTFactory` SHOULD use identical canonical addresses across supported chains through deterministic deployment.

Release manifest MUST publish:

- implementation, factory, GOTName and GOTSubscription addresses;
- runtime and creation code hashes;
- constructor arguments;
- compiler and EVM version;
- optimizer and metadata settings;
- deployment salts;
- deployer address and code hash;
- protocol constants;
- immutable layout;
- interface IDs;
- deterministic vectors;
- supported tokens and dependency addresses.

Equal hexadecimal addresses do not imply shared balances, processed totals, name claims, permissions or events.

---

# 72. Versioning and Migration

System version:

```text
GOT Unified System Specification v0.2
```

Protocol identifier:

```solidity
keccak256("GOT_PROTOCOL_V0_2")
```

The protocol identifier changes because allowing `feeBps == 0` changes normative configuration validation and creates a new deterministic address namespace.

v0.1 intents remain immutable and valid under their original factory and namespace.

New applications SHOULD default to v0.2.

Interfaces MUST display the protocol version for every intent and MUST NOT reinterpret v0.1 fee validation as v0.2 behavior.

Canonical contracts MUST NOT be upgraded in place.

---

# 73. Release Artifacts

Every release MUST include:

- verified source;
- SPDX license;
- compiler and dependency lockfiles;
- reproducible build instructions;
- ABIs and TypeScript types;
- creation and runtime code hashes;
- deployed addresses and chain IDs;
- deterministic vectors;
- quote vectors;
- audit reports;
- known limitations;
- security contact;
- deployment transaction references;
- indexer schema version;
- API schema version;
- name normalization versions;
- external dependency addresses and versions.

---

# Part VII — Implementation

# 74. Implementation Plan

## Phase 1 — Protocol core

- update protocol identifier;
- permit zero fee;
- preserve immutable layout;
- implement zero-fee tests;
- implement quote helpers;
- preserve cumulative positive-fee math;
- publish new deterministic vectors;
- audit.

## Phase 2 — GOTName

- deploy verifier Safe;
- implement EIP-712 claim;
- build two-operator verification workflow;
- publish namespaces and normalization;
- implement deterministic identity keys and optional random opaque-key mode;
- audit.

## Phase 3 — Transfer and invoice MVP

- Base Account sign-in;
- Base USDC;
- direct and named transfer creation;
- canonical GOT link parser and route resolver;
- exact recipient and gross quote display;
- indexer;
- resolver worker;
- receipts, webhooks and CSV export.

## Phase 4 — Subscriptions and SaaS

- integrate Spend Permissions;
- deploy GOTSubscription;
- use zero-fee recurring intents by default;
- implement got.cx onchain SaaS subscriptions;
- activate hosted plans from finalized events;
- add scheduler, cancellation and retries.

## Phase 5 — Ecosystem

- SDK;
- partner analytics;
- third-party integration examples;
- X, Telegram, email, phone, ENS and domain verification;
- additional chains;
- independent resolver operators.

---

# 75. Complete Implementation Checklist

## Repository

- [x] authoritative `docs/SPEC.md`;
- [ ] core/periphery/interface/infra boundaries;
- [ ] security and contribution policies;
- [x] generated ABIs and types;
- [ ] deterministic and quote vectors.

## GOTFactory

- [x] zero mutable storage;
- [x] no admin, pause or upgrade;
- [x] `GOT_PROTOCOL_V0_2`;
- [x] exact 226-byte layout;
- [x] zero fee accepted;
- [x] fee above maximum rejected;
- [x] preview has no external calls;
- [x] all intent function-selector prefixes rejected;
- [x] token code required only at execution;
- [x] atomic deployment and execution;
- [x] exact external executor forwarded;
- [x] quote helpers tested.

## GOTIntent

- [x] direct implementation blocked;
- [x] one mutable slot;
- [x] direct and resolver modes;
- [x] bounded resolver calls;
- [x] unresolved owner safe;
- [x] one owner read;
- [x] owner settlement always available;
- [x] open and restricted resolver exact;
- [x] zero-fee owner receives full balance;
- [x] positive cumulative fee math;
- [x] partner reward to immutable partner;
- [x] configured token protected;
- [x] complete balance cleared;
- [x] lock correct;
- [x] events exact.

## GOTName

- [x] immutable 2-of-3 Safe verifier;
- [x] EIP-712 and ERC-1271;
- [x] one-time claim;
- [x] no verifier overwrite;
- [x] current-owner transfer;
- [x] namespace versions;
- [x] deterministic canonical identity mode;
- [ ] optional random opaque private mode;
- [ ] evidence audit logs.

## GOTSubscription

- [x] immutable;
- [x] exact binding;
- [x] exact allowance and period;
- [x] explicit `end > start` compatible with the pinned manager;
- [x] atomic account spend and settlement;
- [x] zero-fee reference profile;
- [x] execution reward forwarding;
- [x] revocation handling;
- [x] no arbitrary destination;
- [x] reentrancy guard.

## got.cx

- [ ] subscription-only default pricing;
- [ ] no hosted transfer-volume fee by default;
- [ ] SaaS limits only;
- [ ] onchain paid-plan dogfooding;
- [ ] protocol access survives plan expiration;
- [ ] fee and gross quote visible;
- [ ] canonical `@`, `x:`, `tg:`, `#email:`, `#phone:` and `0x...` route formats;
- [ ] shared route parser with normalization parity across frontend, API, claim service and signer tooling;
- [ ] API idempotency;
- [ ] signed webhooks;
- [ ] usage counters;
- [ ] privacy controls.

## Infrastructure

- [ ] reorg-safe indexer;
- [ ] funded-address detection;
- [ ] zero-fee sponsor policy;
- [ ] resolver profitability checks;
- [ ] subscription scheduler;
- [ ] threshold claim workflow;
- [ ] monitoring and runbooks;
- [ ] backups and restoration tests.

---

# 76. Reference Solidity

## 76.1 Validation

```solidity
function _validate(
    IntentConfig calldata config
) internal view {
    if (
        config.ownerSource == address(0) ||
        config.token == address(0) ||
        config.amount == 0 ||
        config.feeBps > MAX_FEE_BPS ||
        (
            config.period != 0 &&
            config.initialDeadline == 0
        )
    ) {
        revert InvalidConfiguration();
    }
}
```

## 76.2 Cumulative allocation

```solidity
function _cumulativeFee(
    uint256 total,
    uint16 feeBps_
) internal pure returns (uint256) {
    return Math.mulDiv(
        total,
        feeBps_,
        10_000
    );
}

function _cumulativeExecution(
    uint256 total,
    uint16 feeBps_
) internal view returns (uint256) {
    uint256 totalFee =
        _cumulativeFee(total, feeBps_);

    return Math.mulDiv(
        totalFee,
        EXECUTION_SHARE_BPS,
        10_000
    );
}

function _cumulativePartner(
    uint256 total,
    uint16 feeBps_,
    bool hasPartner
) internal view returns (uint256) {
    if (!hasPartner) return 0;

    uint256 totalFee =
        _cumulativeFee(total, feeBps_);

    uint256 execution =
        Math.mulDiv(
            totalFee,
            EXECUTION_SHARE_BPS,
            10_000
        );

    uint256 nonExecution =
        totalFee - execution;

    return Math.mulDiv(
        nonExecution,
        PARTNER_SHARE_BPS,
        10_000
    );
}
```

## 76.3 Zero-fee fast path

```solidity
if (feeBps_ == 0) {
    ownerAmount = balance;
    treasuryFee = 0;
    partnerReward = 0;
    executionReward = 0;
} else {
    // Calculate cumulative deltas.
}
```

The fast path is optional; observable behavior MUST equal the general cumulative formulas.

## 76.4 Quote helper

```solidity
function quoteOwnerAmount(
    uint256 gross,
    uint16 feeBps_
) public pure returns (uint256) {
    return gross - Math.mulDiv(
        gross,
        feeBps_,
        10_000
    );
}

function quoteGrossAmount(
    uint256 recipientAmount,
    uint16 feeBps_
) public pure returns (uint256 gross) {
    if (feeBps_ >= 10_000) {
        revert InvalidConfiguration();
    }
    if (feeBps_ == 0 || recipientAmount == 0) {
        return recipientAmount;
    }

    gross = Math.mulDiv(
        recipientAmount - 1,
        10_000,
        10_000 - feeBps_
    ) + 1;

    if (
        quoteOwnerAmount(gross, feeBps_) !=
        recipientAmount
    ) {
        revert InvalidConfiguration();
    }
}
```

The closed form is exact and loop-free. Production implementation MUST use overflow-safe full-precision arithmetic.

## 76.5 GOTName claim

```solidity
function claim(
    Claim calldata c,
    bytes calldata signature
) external {
    if (
        c.nameKey == bytes32(0) ||
        c.account == address(0) ||
        c.account == address(this)
    ) {
        revert InvalidAccount();
    }

    if (block.timestamp > c.deadline) {
        revert ClaimExpired();
    }

    if (_accountOf[c.nameKey] != address(0)) {
        revert AlreadyClaimed();
    }

    bytes32 digest = _hashTypedDataV4(
        keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                c.nameKey,
                c.account,
                c.deadline
            )
        )
    );

    if (
        !SignatureChecker.isValidSignatureNow(
            CLAIM_VERIFIER,
            digest,
            signature
        )
    ) {
        revert InvalidVerifierSignature();
    }

    _accountOf[c.nameKey] = c.account;
    emit NameClaimed(c.nameKey, c.account);
}
```

## 76.6 Subscription execution

```solidity
function execute(
    SpendPermission calldata permission,
    bytes calldata approvalSignature,
    IGOTFactory.IntentConfig calldata config
) external nonReentrant returns (...) {
    address intent =
        GOT_FACTORY.previewAddress(config);

    _validateBinding(
        permission,
        config,
        intent
    );

    if (
        !SPEND_PERMISSION_MANAGER
            .isApproved(permission)
    ) {
        SPEND_PERMISSION_MANAGER
            .approveWithSignature(
                permission,
                approvalSignature
            );
    }

    uint256 beforeBalance =
        IERC20(config.token).balanceOf(
            address(this)
        );

    SPEND_PERMISSION_MANAGER.spend(
        permission,
        uint160(config.amount)
    );

    uint256 received =
        IERC20(config.token).balanceOf(
            address(this)
        ) - beforeBalance;

    if (received != config.amount) {
        revert IncorrectReceivedAmount();
    }

    IERC20(config.token).safeTransfer(
        intent,
        config.amount
    );

    (
        ,
        uint256 processedAmount,
        uint256 ownerAmount,
        uint256 treasuryFee,
        uint256 partnerReward,
        uint256 executionReward
    ) = GOT_FACTORY.deployAndExecute(config);

    if (executionReward != 0) {
        IERC20(config.token).safeTransfer(
            msg.sender,
            executionReward
        );
    }

    emit SubscriptionTransferProcessed(
        config.intentId,
        permission.account,
        intent,
        msg.sender,
        processedAmount,
        ownerAmount,
        treasuryFee,
        partnerReward,
        executionReward
    );
}
```

---

# 77. External Standards and Dependencies

Implementation review MUST pin and validate the applicable versions, deployments and behavior of:

- EIP-1014 / `CREATE2`;
- ERC-1167 minimal proxies;
- the selected immutable-arguments proxy implementation;
- ERC-20;
- ERC-165;
- EIP-712;
- ERC-1271;
- ERC-4337 where used by account systems;
- ERC-6492 where used for counterfactual signatures;
- Base Account;
- Base Spend Permissions;
- canonical USDC deployments;
- X, Telegram, email, phone, domain and ENS verification mechanisms.

External SDK versions and deployed dependency addresses MUST be pinned in the repository and release manifest.

---

# 78. Canonical Statements

## Deterministic intent address

> **A deterministic intent address is a standalone counterfactual ERC20 transfer address with immutable configuration, cumulative accounting and optional effective-owner resolution.**

## Zero-fee intent

> **A zero-fee intent is valid and transfers the complete processed balance to the effective owner, but it provides no built-in third-party execution reward.**

## Positive-fee intent

> **A positive-fee intent allocates a transparent cumulative fee among the executor, optional partner and protocol treasury.**

## GOTName

> **GOTName maps a reusable bytes32 name key to an account and can resolve every intent created for that key; canonical identities use deterministic versioned derivation, while explicitly private applications may use random opaque keys.**

## GOTSubscription

> **GOTSubscription binds a revocable account spend permission to an exact deterministic intent and executes the recurring transfer atomically.**

## got.cx

> **got.cx is one product built on GOT Protocol. It monetizes hosted software and automation rather than requiring a percentage of every transfer.**

## Integrators

> **Integrators may use zero fees or configure their own immutable onchain fee and partner reward without depending on got.cx.**

---

# 79. v0.2 Change Log

Changes from Final Unified System Specification v0.1:

1. Protocol identifier changed to `GOT_PROTOCOL_V0_2`.
2. `feeBps == 0` is valid.
3. Removed the minimum-positive-fee configuration invariant.
4. Added normative zero-fee settlement behavior.
5. Clarified that zero-fee intents do not guarantee permissionless execution.
6. Added gross and recipient quote helpers.
7. Clarified fee-on-top invoice presentation while retaining cumulative gross protocol accounting.
8. Clarified that `got.cx` is one product consumer, not a privileged protocol participant.
9. Added subscription-only got.cx business-model requirements.
10. Added SaaS-only hosted limits and prohibited protocol-level volume limits.
11. Added got.cx onchain SaaS subscription dogfooding.
12. Clarified that got.cx does not need to share subscription revenue with integrators.
13. Clarified third-party onchain partner rewards through the intent fee model.
14. Added and synchronized the canonical GOT Links Model: `@`, `x:`, `tg:`, fragment-based `email:`/`phone:`, and direct `0x...` intent-address routes; removed canonical `/t/<transferLinkId>` routing.
15. Added 2-of-3 Safe verifier operations for GOTName.
16. Updated tests, threats, audit scope and deployment artifacts.
17. Merged the complete normative `got-links-v1` name-key normalization, injective encoding rules and cross-language golden vectors into Section 32 so this specification is self-contained.

---

# 80. Final Decisions

The v0.2 implementation MUST follow these final decisions:

```text
Core primitive
    deterministic intent address

Public terminology
    transfer, not payment

Core fee
    optional; zero is valid

Positive fee accounting
    cumulative and split invariant on gross processed value

Fee recipients
    executor, optional partner, treasury

Exact invoice UX
    application quotes gross amount above recipient target

Zero-fee execution
    gas funded by payer, owner, application or sponsor

got.cx economics
    fixed SaaS subscriptions; no additional transfer-volume fee by default

got.cx limits
    hosted SaaS resources only; never onchain transfer value

got.cx protocol status
    one consumer with no privileged core role

got.cx subscription
    onchain through GOTSubscription as dogfooding

Third-party integrators
    free to choose zero fees, positive onchain fees, subscriptions or another model

Partner rewards
    transparent and onchain when configured in a positive-fee intent

Name claims
    deterministic bytes32 identifier keys for canonical identities; optional random opaque keys for explicit private mode; immutable verifier; 2-of-3 Safe recommended

Canonical launch
    Base Mainnet + canonical USDC + Base Account
```

---

**End of GOT Final Unified System Implementation Specification v0.2**
