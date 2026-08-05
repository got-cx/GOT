# GOT — Global Onchain Transfers

## Unified System Implementation Specification v0.1

**System:** GOT  
**Expansion:** Global Onchain Transfers  
**Canonical domain:** `got.cx`  
**System version:** `0.1`  
**Protocol identifier:** `keccak256("GOT_PROTOCOL_V0_1")`  
**Primary launch network:** Base  
**Primary launch asset:** canonical USDC  
**Primary account layer:** Base Account  
**Target protocol networks:** Ethereum and EVM-compatible networks supporting `CREATE2`  
**Status:** Implementation specification; pre-audit  
**Date:** 2026-07-30  

---

# 1. Canonical Definition

GOT is an open system for global onchain transfers.

It combines:

```text
GOTIntent
    deterministic counterfactual payment addresses

GOTName
    optional reusable names and verified identifiers

got.cx interface
    human and developer payment experience

GOT infrastructure
    indexing, resolution, execution, scheduling, claims and webhooks
```

Canonical terminology:

```text
GOT
    the complete open-source system and ecosystem

GOT Protocol
    the onchain contracts and protocol rules

GOTIntent
    the standalone deterministic intent-address primitive

intent address
    the deterministic counterfactual address created from an IntentConfig

GOTName
    the optional name service that maps a reusable nameKey to an account

got.cx
    the canonical user interface, API, SDK and product surface

resolver
    an account or contract authorized to process a GOTIntent

owner source
    the immutable direct account or owner resolver committed to an intent address

effective owner
    the current account authorized to settle and receive owner proceeds
```

The primary product promise is:

> **Send stablecoins to an account, payment link or name through one deterministic onchain transfer system.**

Recommended brand line:

> **Send it. GOT it.**

---

# 2. Repository Architecture

The canonical public repository SHOULD use this structure:

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
│       │   ├── GOTSubscriptionCollector.sol
│       │   └── test/
│       ├── resolvers/
│       ├── routers/
│       └── helpers/
│
├── interface/
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
│   │       ├── email/
│   │       ├── phone/
│   │       ├── x/
│   │       ├── telegram/
│   │       └── ens/
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

Required dependency direction:

```text
protocol/core
    MUST NOT import protocol/periphery, interface or infra

protocol/periphery
    MAY import protocol/core interfaces

interface
    MAY depend on protocol ABIs, SDK packages and API schemas

infra
    MAY depend on protocol ABIs, periphery ABIs and shared packages
```

---

# 3. System Goals

GOT v0.1 MUST provide:

- deterministic payment addresses before contract deployment;
- direct ERC20 transfers to undeployed intent addresses;
- standalone intent addresses that work without names;
- optional reusable names and verified identifiers;
- immutable intent configuration;
- isolated accounting for each payment intent;
- cumulative split-invariant fee accounting;
- direct owner settlement;
- open or restricted resolver execution;
- immutable partner attribution;
- counterfactual payment from wallets, smart accounts and exchanges;
- payment-before-onboarding for named recipients;
- one-time name claim that resolves all intents sharing the same name key;
- account migration controlled by the current name owner;
- Base Account onboarding without a custom GOT wallet;
- exact revocable periodic stablecoin charges;
- invoices, receipts, payment links and subscriptions;
- chain-aware indexing, finality handling and reorg recovery;
- signed webhooks and idempotent fulfillment;
- a Base-first product while keeping the core multichain-capable;
- no custody of user funds by the GOT backend;
- no protocol administrator, pause or upgradeability in canonical core contracts.

---

# 4. Non-Goals

GOT v0.1 MUST NOT require or implement:

- a protocol token;
- a DAO;
- a custom seed-phrase wallet;
- backend custody of recipient funds;
- an onchain invoice database;
- onchain storage of email addresses, phone numbers or social handles;
- onchain OAuth tokens;
- mutable intent token, amount, fee, partner or resolver configuration;
- upgradeable GOTIntent proxies;
- a core protocol registry;
- protocol-enforced refunds;
- protocol-enforced disputes or chargebacks;
- protocol-enforced product fulfillment;
- generic arbitrary calls from GOTIntent;
- configured-token withdrawal that bypasses canonical accounting;
- cross-chain state synchronization;
- automatic reassignment of claimed names when an external identifier changes control;
- fiat custody or banking services.

Applications MAY implement additional business logic above the protocol.

---

# 5. Normative Language

The words **MUST**, **MUST NOT**, **REQUIRED**, **SHOULD**, **SHOULD NOT**, **MAY**, and **OPTIONAL** are normative.

Conceptual Solidity is informative unless surrounding text explicitly defines required behavior.

The final release commit, compiler configuration, immutable-argument layout, proxy bytecode, deployment salts, interface identifiers, code hashes and deterministic address test vectors become normative release artifacts.

---

# 6. System Architecture

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
owner + treasury + partner + executor
```

Direct ownership:

```text
IntentConfig.ownerSource = Base Account / Safe / EOA / contract
IntentConfig.ownerKey    = 0

GOTIntent.owner()
    = ownerSource
```

Named ownership:

```text
IntentConfig.ownerSource = GOTName
IntentConfig.ownerKey    = reusable nameKey

GOTIntent.owner()
    = GOTName.resolveOwner(intent, nameKey)
```

Before a name is claimed:

```text
GOTName.resolveOwner(...) = address(0)
settlement                 = unavailable
funds                      = remain at the intent address
```

After a name is claimed:

```text
GOTName.resolveOwner(...) = recipient account
settlement                 = available
```

One name claim resolves all existing and future intents using the same `nameKey`.

---

# 7. Component Boundaries

## 7.1 Protocol core

Required contracts:

1. `GOTIntent`
2. `GOTFactory`

Required generic interface:

3. `IGOTOwnerResolver`

The core defines:

- deterministic address derivation;
- immutable intent configuration;
- counterfactual token receipt;
- owner resolution;
- resolver authorization;
- cumulative fee accounting;
- settlement;
- unsupported-asset recovery;
- canonical deployment rules;
- security invariants.

The core does not know about names, email, phone, X, Telegram, OAuth, invoices, subscriptions, Base Account, APIs or webhooks.

## 7.2 Protocol periphery

Initial periphery contracts:

1. `GOTName`
2. `GOTSubscriptionCollector`

Optional future periphery MAY include:

- batch settlement;
- resolver routers;
- multicall helpers;
- gas sponsorship helpers;
- merchant team ownership resolvers;
- ENS ownership resolvers;
- payroll resolvers;
- organization membership resolvers.

## 7.3 Interface

The interface includes:

- `got.cx` web application;
- payment and claim links;
- Base Account connection;
- merchant dashboard;
- invoice and subscription UX;
- name search and claim UX;
- REST API;
- TypeScript SDK;
- receipts and exports;
- webhook management.

## 7.4 Infrastructure

The infrastructure includes:

- chain indexer;
- resolver worker;
- subscription scheduler;
- keeper workers;
- name resolution API;
- identity-verification adapters;
- EIP-712 claim signer;
- webhook dispatcher;
- notification workers;
- monitoring and alerting;
- deterministic deployment tooling.

---

# Part I — GOT Protocol Core

# 8. GOTIntent Overview

`GOTIntent` is a deterministic counterfactual ERC20 payment primitive.

An application can calculate an intent address before deployment and publish it as a payment destination. The configured ERC20 may be transferred to that address while it has no code. A valid caller later deploys the canonical minimal proxy through `GOTFactory` and processes the complete configured-token balance atomically.

Required properties:

- deterministic `CREATE2` address;
- minimal proxy with immutable arguments;
- no deployment required before payment;
- one mutable storage slot;
- immutable configuration;
- cumulative gross processed accounting;
- split-invariant fees;
- effective-owner sovereignty;
- optional owner resolution;
- open or restricted resolver;
- complete-balance processing;
- configured-token protection;
- no admin or upgradeability.

`GOTIntent` MUST work with a direct owner and no name service.

---

# 9. GOT Protocol Constants

The core implementation MUST expose:

```solidity
bytes32 public constant PROTOCOL_VERSION =
    keccak256("GOT_PROTOCOL_V0_1");

uint16 public constant IMMUTABLE_ARGS_LENGTH = 226;

uint256 public constant ERC165_GAS_LIMIT = 30_000;
uint256 public constant OWNER_RESOLVER_GAS_LIMIT = 50_000;

address public immutable TREASURY;
uint16 public immutable EXECUTION_SHARE_BPS;
uint16 public immutable PARTNER_SHARE_BPS;
```

The exact gas limits MUST be confirmed with adversarial tests before release. Changing normative limits after release requires a new protocol version.

`GOTFactory` immutable configuration:

```solidity
address public immutable IMPLEMENTATION;
address public immutable TREASURY;
uint16 public immutable EXECUTION_SHARE_BPS;
uint16 public immutable PARTNER_SHARE_BPS;
uint16 public immutable MAX_FEE_BPS;
```

Required constructor validation:

```solidity
IMPLEMENTATION != address(0);
TREASURY != address(0);

EXECUTION_SHARE_BPS > 0;
EXECUTION_SHARE_BPS < 10_000;

PARTNER_SHARE_BPS > 0;
PARTNER_SHARE_BPS < 10_000;

MAX_FEE_BPS > 0;
MAX_FEE_BPS <= 10_000;
```

The factory has zero mutable storage. Solidity immutables embedded in bytecode are permitted.

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

Every field is immutable and committed to the deterministic intent address.

## 10.1 `intentId`

Application-defined unique identifier.

Recommended namespacing:

```solidity
bytes32 intentId = keccak256(
    abi.encode(
        keccak256("GOT_APPLICATION_INTENT_V1"),
        applicationId,
        recordId
    )
);
```

Examples:

```solidity
bytes32 invoiceIntentId = keccak256(
    abi.encode(
        keccak256("GOT_INVOICE_INTENT_V1"),
        merchantId,
        invoiceId
    )
);
```

```solidity
bytes32 transferIntentId = keccak256(
    abi.encode(
        keccak256("GOT_TRANSFER_INTENT_V1"),
        senderRecordId,
        transferId
    )
);
```

```solidity
bytes32 subscriptionIntentId = keccak256(
    abi.encode(
        keccak256("GOT_SUBSCRIPTION_INTENT_V1"),
        merchantId,
        subscriptionId
    )
);
```

## 10.2 `ownerSource`

The immutable source of effective ownership.

Direct mode:

```text
ownerSource = recipient account
ownerKey    = 0
```

Resolver mode:

```text
ownerSource = contract implementing IGOTOwnerResolver
ownerKey    = nonzero resolver-specific key
```

Requirements:

```solidity
ownerSource != address(0);
```

## 10.3 `ownerKey`

The immutable key interpreted by `ownerSource`.

```text
bytes32(0)
    direct-owner mode

nonzero
    owner-resolver mode
```

The zero value is reserved and MUST NOT be interpreted by a resolver.

This explicit mode flag prevents accidental resolver-interface collisions with direct smart accounts.

## 10.4 `token`

The configured ERC20 token.

The generic protocol has no token registry. Applications SHOULD allowlist exact-transfer, non-rebasing ERC20s.

Initial GOT product policy:

```text
Base Mainnet: canonical USDC only
Base Sepolia: approved test USDC only
```

## 10.5 `partner`

Optional immutable recipient of a share of the non-execution protocol fee.

Use cases:

- application;
- integration;
- referral;
- developer;
- commerce platform;
- wallet;
- distribution partner.

`address(0)` disables partner rewards for the intent.

## 10.6 `authorizedResolver`

```text
address(0)
    any valid resolver may process the intent

nonzero
    only the configured resolver may use the resolver path
```

The effective owner may always use `settle()` independently.

## 10.7 `amount`

Expected gross payment amount in token base units.

It does not cap processing. Partial payments, repeated payments, late payments and overpayments remain processable.

## 10.8 `initialDeadline`

Application-level time reference.

The core MUST NOT block processing because a deadline has passed.

Possible application interpretations:

- invoice due date;
- subscription start;
- access expiration reference;
- expected delivery time.

## 10.9 `period`

```text
0
    one-time application semantics

> 0
    recurring application semantics
```

The core does not authorize recurring withdrawals. It only records incoming configured-token processing.

## 10.10 `feeBps`

Total protocol fee applied to cumulative gross processed value.

## 10.11 `metadataHash`

Commitment to canonical offchain metadata.

Personal data, access tokens, secrets and raw external identifiers MUST NOT be included.

---

# 11. Configuration Validation

`GOTFactory` MUST validate:

```solidity
config.ownerSource != address(0);
config.token != address(0);
config.amount > 0;
config.feeBps > 0;
config.feeBps <= MAX_FEE_BPS;
config.period == 0 || config.initialDeadline != 0;
```

Mode validation:

```solidity
if (config.ownerKey == bytes32(0)) {
    // Direct mode.
    // ownerSource may be an EOA, Safe, smart account or contract.
} else {
    // Resolver mode.
    // Preview remains possible without external calls.
}
```

After deriving the intent address:

```solidity
config.ownerSource != intentAddress;
config.token != intentAddress;
config.partner == address(0) ||
    config.partner != intentAddress;
config.authorizedResolver == address(0) ||
    config.authorizedResolver != intentAddress;
TREASURY != intentAddress;
```

`deployAndExecute` MUST additionally require:

```solidity
config.token.code.length > 0;
```

When `ownerKey != 0`, execution MUST fail closed unless `ownerSource`:

- has deployed code;
- supports `IGOTOwnerResolver` through ERC-165;
- returns exactly 32 bytes from `resolveOwner`;
- returns a valid effective owner or zero as unresolved.

The factory MUST NOT require direct owner accounts to have code.

---

# 12. Immutable Argument Encoding

The canonical immutable layout is 226 bytes:

| Offset | Size | Field |
|---:|---:|---|
| `0` | `32` | `intentId` |
| `32` | `20` | `ownerSource` |
| `52` | `32` | `ownerKey` |
| `84` | `20` | `token` |
| `104` | `20` | `partner` |
| `124` | `20` | `authorizedResolver` |
| `144` | `16` | `amount` |
| `160` | `8` | `initialDeadline` |
| `168` | `4` | `period` |
| `172` | `2` | `feeBps` |
| `174` | `32` | `metadataHash` |
| `206` | `20` | `factory` |

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

The implementation MUST validate the immutable-argument suffix before reading offsets.

The final proxy creation code, runtime code, suffix convention and bytecode hashes become normative release artifacts.

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

Canonical address:

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

`chainId` is excluded from address derivation.

The same canonical factory, implementation, proxy bytecode and exact configuration SHOULD produce the same hexadecimal intent address across supported EVM chains.

Balances, owner-resolver mappings and execution state remain chain-local.

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

The interface is generic and belongs to protocol core.

Possible implementations:

- `GOTName`;
- ENS ownership resolver;
- organization membership resolver;
- payroll recipient resolver;
- merchant team resolver;
- delayed recovery resolver.

`GOTIntent` performs one-hop resolution only.

A returned account is treated as final even when that account also implements `IGOTOwnerResolver`.

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

Resolution algorithm:

```text
1. Read ownerSource and ownerKey from immutable arguments.
2. If ownerKey is zero, return ownerSource directly.
3. Require ownerSource to have code.
4. Probe ERC-165 support for IGOTOwnerResolver with bounded gas.
5. If unsupported, revert.
6. Call resolveOwner(address(this), ownerKey) with bounded gas.
7. If the call fails or returns malformed data, revert.
8. If the result is zero, return zero as unresolved.
9. Reject result equal to the intent address.
10. Reject result equal to ownerSource.
11. Return the resolved account.
```

Conceptual implementation:

```solidity
function owner()
    public
    view
    onlyProxy
    returns (address effectiveOwner)
{
    address source = _getArgAddress(OWNER_SOURCE_OFFSET);
    bytes32 key = _getArgBytes32(OWNER_KEY_OFFSET);

    if (key == bytes32(0)) {
        return source;
    }

    if (source.code.length == 0) {
        revert OwnerResolverUnavailable();
    }

    if (!_supportsOwnerResolver(source)) {
        revert InvalidOwnerResolver();
    }

    (bool ok, bytes memory data) = source.staticcall{
        gas: OWNER_RESOLVER_GAS_LIMIT
    }(
        abi.encodeCall(
            IGOTOwnerResolver.resolveOwner,
            (address(this), key)
        )
    );

    if (!ok || data.length != 32) {
        revert OwnerResolutionFailed();
    }

    effectiveOwner = abi.decode(data, (address));

    if (
        effectiveOwner == address(this) ||
        effectiveOwner == source
    ) {
        revert InvalidResolvedOwner();
    }

    // address(0) intentionally means unresolved.
}
```

ERC-165 helper:

```solidity
function _supportsOwnerResolver(
    address source
) internal view returns (bool) {
    (bool ok, bytes memory data) = source.staticcall{
        gas: ERC165_GAS_LIMIT
    }(
        abi.encodeCall(
            IERC165.supportsInterface,
            (type(IGOTOwnerResolver).interfaceId)
        )
    );

    if (!ok || data.length < 32) {
        return false;
    }

    uint256 result;

    assembly ("memory-safe") {
        result := mload(add(data, 0x20))
    }

    return result == 1;
}
```

---

# 16. Unresolved Ownership

When:

```solidity
owner() == address(0)
```

the intent is unresolved.

An unresolved intent MAY:

- exist counterfactually;
- receive configured tokens;
- receive unsupported tokens;
- receive native assets;
- be indexed and displayed;
- become resolved later.

An unresolved intent MUST NOT:

- settle configured tokens;
- process through a resolver;
- recover unsupported ERC20s;
- recover native assets;
- transfer funds to `ownerSource`;
- treat zero as permissionless ownership.

Owner-dependent operations MUST revert with:

```solidity
error OwnerUnresolved();
```

Funds remain at the deterministic intent address until the owner resolves.

---

# 17. One Owner Read Per Operation

Every state-changing owner-dependent operation MUST call `owner()` exactly once before token interactions and cache the result in memory.

Conceptual owner settlement:

```solidity
function settle() external returns (...) {
    address effectiveOwner = owner();

    if (effectiveOwner == address(0)) {
        revert OwnerUnresolved();
    }

    if (msg.sender != effectiveOwner) {
        revert UnauthorizedOwner();
    }

    return _process(
        msg.sender,
        effectiveOwner
    );
}
```

Conceptual factory path:

```solidity
function executeFor(
    address executor
) external onlyFactory returns (...) {
    address effectiveOwner = owner();

    if (effectiveOwner == address(0)) {
        revert OwnerUnresolved();
    }

    if (executor == effectiveOwner) {
        _authorizeOwner(executor, effectiveOwner);
    } else {
        _authorizeResolver(executor);
    }

    return _process(
        executor,
        effectiveOwner
    );
}
```

`_process` MUST NOT resolve the owner again.

---

# 18. GOTFactory Interface

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
    ) external view returns (address intentAddress);

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

`GOTFactory` MUST:

- have zero mutable storage;
- expose no administrator;
- expose no pause;
- expose no upgrade function;
- validate configuration;
- derive the canonical address;
- deploy the canonical proxy only when code is absent;
- verify the actual deployment address;
- emit `IntentDeployed` only once;
- forward the actual external caller as executor;
- atomically execute the first processing operation;
- revert the deployment when first execution fails.

The factory MUST NOT compare `msg.sender` with raw `ownerSource` for owner authority.

Owner authority is determined inside `GOTIntent` from the current effective owner.

---

# 19. GOTIntent Interface

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

    function owner()
        external view returns (address);

    function totalProcessed()
        external view returns (uint256);

    function intentId()
        external view returns (bytes32);

    function ownerSource()
        external view returns (address);

    function ownerKey()
        external view returns (bytes32);

    function token()
        external view returns (address);

    function partner()
        external view returns (address);

    function authorizedResolver()
        external view returns (address);

    function amount()
        external view returns (uint128);

    function initialDeadline()
        external view returns (uint64);

    function period()
        external view returns (uint32);

    function feeBps()
        external view returns (uint16);

    function metadataHash()
        external view returns (bytes32);

    function factory()
        external view returns (address);

    function recoverERC20(
        address asset
    ) external returns (uint256 recoveredAmount);

    function recoverNative()
        external returns (uint256 recoveredAmount);
}
```

No generic arbitrary-call function is permitted.

---

# 20. Mutable Storage

Each deployed `GOTIntent` uses exactly one mutable storage slot:

```solidity
uint256 private packedState;
```

Layout:

| Bits | Meaning |
|---|---|
| `255` | execution lock |
| `0–254` | cumulative `totalProcessed` |

```solidity
uint256 internal constant LOCK_BIT =
    uint256(1) << 255;

uint256 internal constant TOTAL_MASK =
    LOCK_BIT - 1;
```

Maximum cumulative gross processed value:

```solidity
type(uint255).max
```

No mutable owner, owner key, fee, token, resolver, partner, metadata, amount, deadline or period state is stored.

---

# 21. Authorization

## 21.1 Effective-owner settlement

`settle()` MUST require:

```solidity
address effectiveOwner = owner();
effectiveOwner != address(0);
msg.sender == effectiveOwner;
```

The effective owner can always settle independently of resolver policy.

## 21.2 Open resolver

When:

```solidity
authorizedResolver() == address(0)
```

any valid nonzero account other than the intent itself may call `resolve()`.

## 21.3 Restricted resolver

When:

```solidity
authorizedResolver() != address(0)
```

`resolve()` MUST require:

```solidity
msg.sender == authorizedResolver();
```

## 21.4 Factory execution

`executeFor(executor)` MUST:

- be callable only by the immutable factory;
- reject zero executor;
- reject the intent itself as executor;
- resolve and cache the effective owner;
- authorize the owner or resolver path;
- pay execution reward to the actual executor.

---

# 22. Fee Model

For prior cumulative gross value `T0` and newly observed configured-token balance `B`:

```text
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

Required invariant:

```text
processing 10 transfers of 10 units
    produces the same final cumulative allocations as
processing 1 transfer of 100 units
```

The fee result MUST NOT depend on:

- payment partitioning;
- execution frequency;
- deployment timing;
- resolver identity;
- effective owner changes between operations.

---

# 23. Processing Algorithm

Required order:

```text
1. Resolve effective owner exactly once.
2. Revert when effective owner is zero.
3. Validate owner or resolver authority.
4. Read packed state.
5. Revert when execution lock is active.
6. Set execution lock.
7. Read complete configured-token balance.
8. Revert when balance is zero.
9. Check cumulative overflow.
10. Calculate cumulative allocation deltas.
11. Store new cumulative total with lock active.
12. Transfer treasury fee.
13. Transfer partner reward when nonzero.
14. Transfer execution reward to executor.
15. Transfer owner amount to cached effective owner.
16. Verify final configured-token balance is zero.
17. Clear execution lock.
18. Emit PaymentProcessed.
19. Return exact values.
```

When the executor equals the effective owner, owner amount and execution reward MAY be aggregated into one token transfer while preserving separate accounting and event values.

Any failure MUST revert the complete operation.

---

# 24. Unsupported Asset Recovery

## 24.1 ERC20 recovery

```solidity
function recoverERC20(
    address asset
) external returns (uint256 recoveredAmount);
```

Required behavior:

```solidity
address effectiveOwner = owner();

if (effectiveOwner == address(0)) {
    revert OwnerUnresolved();
}

if (msg.sender != effectiveOwner) {
    revert UnauthorizedOwner();
}

if (asset == address(0)) {
    revert InvalidAsset();
}

if (asset == token()) {
    revert ConfiguredTokenNotRecoverable();
}
```

The complete unsupported-token balance is transferred to the cached effective owner.

## 24.2 Native recovery

The complete native balance is transferred to the cached effective owner.

## 24.3 Unresolved intents

Recovery is unavailable while owner resolution returns zero.

---

# 25. Core Events

Factory event:

```solidity
event IntentDeployed(
    bytes32 indexed configHash,
    address indexed intentAddress,
    address indexed executor
);
```

Processing event:

```solidity
event PaymentProcessed(
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
```

Recovery events:

```solidity
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

Indexers MUST treat the emitted effective owner as authoritative for that processing operation.

---

# 26. Core Errors

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

# 27. Core Security Invariants

**INV-1 — Deterministic identity**  
The same canonical factory, implementation, proxy bytecode, protocol version and exact configuration produce the same address.

**INV-2 — Counterfactual safety**  
A third party cannot deploy different code or different immutable arguments at the predicted canonical address.

**INV-3 — Standalone direct ownership**  
A direct intent with `ownerKey == 0` does not depend on `GOTName` or any external owner resolver.

**INV-4 — Explicit resolver mode**  
Only a nonzero `ownerKey` activates owner-resolution logic.

**INV-5 — No mutable ownership state**  
`GOTIntent` stores no owner override, name mapping or claim state.

**INV-6 — Resolver correctness**  
Resolver mode returns only the result of the configured owner resolver.

**INV-7 — Unresolved safety**  
A zero resolved owner cannot settle funds to zero or to `ownerSource`.

**INV-8 — Fail closed**  
Unavailable, unsupported, malformed or reverting owner resolution reverts owner-dependent operations.

**INV-9 — One owner read**  
Every state-changing owner-dependent operation uses one cached effective owner.

**INV-10 — Owner sovereignty**  
The current effective owner can always settle independently of resolver policy.

**INV-11 — Resolver isolation**  
A resolver cannot modify configuration, effective ownership or owner allocation.

**INV-12 — Fee invariance**  
Final cumulative allocations do not depend on payment partitioning.

**INV-13 — Configured-token protection**  
The configured token cannot be recovered outside canonical processing.

**INV-14 — Complete-balance processing**  
A successful operation processes the complete observed configured-token balance.

**INV-15 — Atomic deployment**  
Failed first processing reverts proxy deployment.

**INV-16 — Reentrancy protection**  
Nested processing cannot modify accounting.

**INV-17 — Dynamic-owner events**  
Every processing event records the exact cached owner used for transfer.

---

# 28. Required Core Tests

Tests MUST include:

- direct EOA owner;
- direct Safe owner;
- undeployed counterfactual smart account;
- deployed smart account;
- direct owner contract that also exposes unrelated interfaces;
- direct owner with zero owner key;
- resolver mode with a valid owner resolver;
- resolver mode with undeployed resolver;
- resolver mode with unsupported ERC-165 response;
- resolver returning a smart account;
- resolver returning zero;
- resolver reverting;
- resolver returning malformed data;
- resolver returning the intent itself;
- resolver returning itself;
- resolver attempting gas exhaustion;
- owner settlement;
- open resolver execution;
- restricted resolver execution;
- owner settlement despite restricted resolver;
- resolver execution while unresolved reverting;
- resolver execution after resolution succeeding;
- owner mapping changed between transactions;
- cached owner remaining stable during one operation;
- payment before deployment;
- payment after deployment;
- partial payment;
- overpayment;
- repeated payment;
- late payment;
- cumulative rounding boundaries;
- split invariance;
- owner equals executor aggregation;
- resolver competition;
- recovery while unresolved;
- recovery after resolution;
- configured-token recovery rejection;
- hostile ERC20 behavior;
- reentrancy;
- one-slot storage invariant;
- deterministic multichain vectors.

---

# Part II — Protocol Periphery

# 29. GOTName Definition

`GOTName` is the optional reusable name service for GOT.

It maps an opaque `bytes32 nameKey` to an account:

```text
nameKey → account
```

It provides:

- first claim;
- owner resolution;
- account migration;
- one name resolving multiple intents;
- claim before intent deployment;
- permanent protection against verifier overwrite after claim.

`GOTName` does not hold transfer funds and does not execute settlement.

`GOTIntent` remains fully functional without `GOTName`.

---

# 30. GOTName Model

Named intent configuration:

```text
ownerSource = GOTName contract
ownerKey    = nameKey
```

Before claim:

```text
accountOf(nameKey) = address(0)
owner()             = address(0)
```

After claim:

```text
accountOf(nameKey) = recipient account
owner()             = recipient account
```

All intents sharing the same `nameKey` resolve together:

```text
Intent A ─┐
Intent B ─┤
Intent C ─┼── nameKey ── GOTName ── account
Intent D ─┤
Intent E ─┘
```

Claiming the key once resolves every existing and future intent using it.

---

# 31. GOTName Key Model

The onchain contract MUST receive only a `bytes32 nameKey`.

It MUST NOT store or emit:

- raw email;
- raw phone number;
- raw social handle;
- OAuth token;
- verification code;
- provider access token;
- personal profile data.

Canonical logical key:

```solidity
bytes32 nameKey = keccak256(
    abi.encode(
        keccak256("GOT_NAME_V1"),
        namespace,
        identifier
    )
);
```

Where:

```text
namespace
    identifies the verification and canonicalization scheme

identifier
    is a namespace-defined bytes32 value
```

Recommended namespace constants:

```solidity
bytes32 constant NAMESPACE_GOT =
    keccak256("GOT");

bytes32 constant NAMESPACE_EMAIL =
    keccak256("EMAIL");

bytes32 constant NAMESPACE_PHONE =
    keccak256("PHONE_E164");

bytes32 constant NAMESPACE_X =
    keccak256("X_USER_ID");

bytes32 constant NAMESPACE_TELEGRAM =
    keccak256("TELEGRAM_USER_ID");

bytes32 constant NAMESPACE_ENS =
    keccak256("ENS");
```

## 31.1 Public GOT names

A public native GOT name MAY use:

```solidity
identifier = keccak256(
    bytes(normalizedPublicName)
);
```

The normalization algorithm MUST be versioned and published.

## 31.2 Sensitive external identifiers

Email addresses and phone numbers MUST NOT be represented only by an unsalted public hash because likely values can be enumerated.

For sensitive identifiers, infrastructure SHOULD issue an opaque identifier:

```text
canonical private identifier
    → protected resolution record
    → opaque random or keyed identifier
    → onchain nameKey
```

## 31.3 Reassigned external identifiers

Phone numbers, emails and social accounts may change control.

A claimed name MUST NOT automatically move when an external identifier is later reassigned.

Infrastructure SHOULD use a lifecycle epoch or issue a new opaque identifier:

```text
same external string, lifecycle 1 → nameKey A
same external string, lifecycle 2 → nameKey B
```

Old intents remain controlled by the original claimed account. New transfers use the current lifecycle key.

---

# 32. GOTName Interface

```solidity
interface IGOTName is IGOTOwnerResolver {
    struct Claim {
        bytes32 nameKey;
        address account;
        uint48 deadline;
    }

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

---

# 33. GOTName Storage and Immutability

Required storage:

```solidity
mapping(bytes32 nameKey => address account)
    private _accountOf;
```

Verifier:

```solidity
address public immutable CLAIM_VERIFIER;
```

The recommended verifier is an immutable Safe address.

The Safe may rotate its own signers without changing `GOTName`.

`GOTName` MUST:

- be non-upgradeable;
- expose no pause;
- expose no administrator mapping setter;
- expose no function that overwrites a claimed name;
- support EOA and ERC-1271 verifier signatures;
- permanently support `IGOTOwnerResolver` through ERC-165.

---

# 34. GOTName Claim

Claim structure:

```solidity
struct Claim {
    bytes32 nameKey;
    address account;
    uint48 deadline;
}
```

EIP-712 type hash:

```solidity
bytes32 constant CLAIM_TYPEHASH = keccak256(
    "Claim(bytes32 nameKey,address account,uint48 deadline)"
);
```

Domain:

```text
name:               GOTName
version:            1
chainId:            current chain
verifyingContract:  GOTName contract
```

The verifier signature MUST bind:

- exact name key;
- exact destination account;
- deadline;
- chain;
- contract.

Required checks:

```solidity
claimData.nameKey != bytes32(0);
claimData.account != address(0);
claimData.account != address(this);
block.timestamp <= claimData.deadline;
_accountOf[claimData.nameKey] == address(0);
valid verifier signature;
```

Behavior:

```solidity
_accountOf[claimData.nameKey] =
    claimData.account;
```

Anyone MAY submit a valid signed claim because the exact account is signature-bound.

The claim MAY occur before any intent using the key is deployed.

---

# 35. GOTName Resolution

```solidity
function resolveOwner(
    address,
    bytes32 ownerKey
) external view returns (address) {
    return _accountOf[ownerKey];
}
```

The initial implementation may ignore the intent argument.

Before claim, resolution returns zero.

After claim, resolution returns the current mapped account.

---

# 36. GOTName Transfer

```solidity
function transfer(
    bytes32 nameKey,
    address newAccount
) external {
    address current = _accountOf[nameKey];

    if (current == address(0)) {
        revert NameNotClaimed();
    }

    if (msg.sender != current) {
        revert Unauthorized();
    }

    if (
        newAccount == address(0) ||
        newAccount == address(this)
    ) {
        revert InvalidAccount();
    }

    _accountOf[nameKey] = newAccount;

    emit NameTransferred(
        nameKey,
        current,
        newAccount
    );
}
```

Ownership boundary:

```text
Before claim:
    the verifier authorizes the first account

After claim:
    only the current mapped account may transfer the name
```

The verifier MUST NOT be able to overwrite a nonzero mapping.

A transfer changes the effective owner for:

- unsettled balances in existing intents;
- future payments to existing intents;
- future intents using the same key.

Already settled transfers remain unchanged.

The interface MUST warn users before a name transfer.

---

# 37. GOTName Events and Errors

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
error AlreadyClaimed();
error NameNotClaimed();
error ClaimExpired();
error InvalidVerifierSignature();
error Unauthorized();
```

---

# 38. GOTName Claim Infrastructure

Before signing a claim, infrastructure MUST verify:

1. control of the external name or identifier;
2. control of the destination account;
3. exact key derivation;
4. current lifecycle or epoch;
5. claim freshness;
6. absence of an existing onchain claim;
7. rate-limit and abuse policy.

Account proof:

```text
1. Generate a single-use backend nonce.
2. User connects a Base Account or another supported account.
3. User signs typed data or SIWE-equivalent data.
4. Backend verifies EOA, ERC-1271 or counterfactual account signature.
5. Backend consumes the nonce.
```

Namespace verification examples:

```text
GOT public name
    account signature and name availability

Email
    magic link or verified code

Phone
    OTP against canonical E.164 number

X
    OAuth authenticated stable user ID

Telegram
    validated login, Mini App data or bot identity

ENS
    current ENS ownership or authorized resolver proof
```

The signing service MUST:

- reconstruct the exact name key;
- use a short claim deadline;
- never expose signing keys to clients;
- log an immutable audit record;
- reject replayed backend nonces;
- enforce rate limits;
- support emergency signer rotation through the verifier Safe;
- never gain power to overwrite claimed keys.

---

# 39. GOTSubscriptionCollector

`GOTSubscriptionCollector` is optional Base-specific periphery for exact recurring stablecoin charges.

It combines:

```text
Base Spend Permission
    customer authorization

GOTSubscriptionCollector
    exact atomic charge routing

GOTIntent
    isolated incoming accounting and settlement
```

The collector is the authorized spender.

It receives the exact charge from the customer, forwards it to the deterministic subscription intent and atomically executes settlement.

---

# 40. Exact Periodic Permission

For a monthly subscription of 29 USDC:

```text
token      = USDC
spender    = GOTSubscriptionCollector
allowance  = 29 USDC
period     = one month
start      = subscription start
end        = optional end
```

Required v0.1 policy:

```text
permission allowance == exact configured recurring amount
permission period    == intent period
permission token     == intent token
permission spender   == collector
```

Consequences:

- no more than the exact amount can be charged in one period;
- a second exact charge in the same period fails;
- the customer may revoke the permission;
- unused allowance does not roll over;
- missed periods become application-level past-due state.

---

# 41. Subscription Binding

The permission `extraData` SHOULD bind the exact deterministic intent:

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
keccak256("GOT_SUBSCRIPTION_BINDING_V1")
```

Required relationships:

```solidity
permission.spender == address(this);
permission.token == config.token;
config.token == USDC;
config.period > 0;
permission.period == uint48(config.period);
permission.allowance == uint160(config.amount);
config.initialDeadline <= type(uint48).max;
permission.start == uint48(config.initialDeadline);
config.authorizedResolver == address(this);
binding.factory == GOT_FACTORY;
binding.configHash == factory.configHash(config);
binding.intent == factory.previewAddress(config);
```

`config.amount` MUST fit in `uint160`.

---

# 42. Subscription Charge

Conceptual interface:

```solidity
function charge(
    SpendPermission calldata permission,
    bytes calldata approvalSignature,
    IGOTFactory.IntentConfig calldata config
) external returns (
    address intent,
    uint256 processedAmount,
    uint256 ownerAmount,
    uint256 treasuryFee,
    uint256 partnerReward,
    uint256 executionReward
);
```

Required algorithm:

```text
1. Validate permission and exact intent binding.
2. Predict the canonical intent address.
3. Approve the permission by signature when necessary.
4. Snapshot collector token balance.
5. Spend exactly config.amount.
6. Verify exact balance increase.
7. Transfer exact principal to the predicted intent.
8. Call GOTFactory.deployAndExecute(config).
9. Receive execution reward at the collector.
10. Forward exact execution reward to msg.sender.
11. Verify no unexpected principal remains.
12. Emit SubscriptionCharged.
```

The complete charge MUST revert when any step fails.

If a named merchant remains unclaimed:

```text
GOTIntent.owner() = 0
GOTIntent execution reverts
customer spend reverts atomically
customer is not charged
```

The collector MUST:

- be immutable;
- be non-upgradeable;
- use a reentrancy guard;
- expose no arbitrary destination;
- expose no variable amount in v0.1;
- validate exact balance deltas;
- forward the exact keeper reward.

---

# 43. Subscription Events

```solidity
event SubscriptionCharged(
    bytes32 indexed subscriptionId,
    address indexed payer,
    address indexed intent,
    address keeper,
    uint256 grossAmount,
    uint256 ownerAmount,
    uint256 executionReward
);
```

Optional cancellation helpers MAY emit:

```solidity
event SubscriptionCancelled(
    bytes32 indexed subscriptionId,
    address indexed account
);
```

The customer ultimately cancels by revoking the Spend Permission through their account.

---

# Part III — got.cx Interface

# 44. Product Definition

`got.cx` is the canonical interface for GOT.

It enables:

- direct stablecoin transfers;
- deterministic payment addresses;
- payment links;
- transfers to names;
- payment-before-recipient-onboarding;
- name claims;
- invoices;
- subscriptions;
- merchant dashboards;
- receipts;
- API integrations;
- signed webhooks.

GOT is not a wallet.

Base Account provides:

- passkey authentication;
- smart-account execution;
- recovery;
- multichain account support;
- Spend Permissions;
- sponsored transactions where supported.

The interface SHOULD also support external wallets and direct exchange transfers.

---

# 45. Canonical Web Surfaces

Primary domain:

```text
https://got.cx
```

Recommended routes:

```text
got.cx/send
got.cx/receive
got.cx/pay/{paymentId}
got.cx/claim/{claimId}
got.cx/names/{name}
got.cx/invoices/{invoiceId}
got.cx/subscriptions/{subscriptionId}
got.cx/activity
got.cx/developers
```

Recommended subdomains:

```text
docs.got.cx
api.got.cx
status.got.cx
```

URLs MUST use HTTPS.

Public links MUST NOT expose:

- OAuth tokens;
- provider access tokens;
- raw sensitive identifiers;
- internal database IDs with security meaning;
- claim-signing material.

---

# 46. Direct Transfer Flow

```text
1. Recipient supplies an account.
2. GOT creates a direct IntentConfig:
       ownerSource = recipient account
       ownerKey    = 0
3. GOTFactory previews the deterministic intent address.
4. Sender transfers USDC to the address.
5. Recipient or resolver deploys and processes the intent.
6. Receipt and webhook are produced after finality.
```

Direct transfers require no name registration or claim infrastructure.

The payer MAY:

- use Base Account;
- connect another wallet;
- send from an exchange;
- transfer ERC20 directly to the displayed address.

---

# 47. Named Transfer Flow

```text
1. Sender enters a public name or external identifier.
2. GOT resolves the input to a canonical nameKey.
3. GOT creates a named IntentConfig:
       ownerSource = GOTName
       ownerKey    = canonical nameKey
4. GOTFactory previews the deterministic intent address.
5. Sender transfers USDC.
6. If the name is unclaimed, funds remain at the intent address.
7. Recipient verifies the name and destination account.
8. GOTName records nameKey → account.
9. Recipient or resolver processes the intent.
```

The confirmation UI MUST display sufficient recipient context before payment.

For mutable external identifiers, display metadata MAY include:

- current profile name;
- current handle;
- profile image;
- masked email;
- masked phone;
- provider;
- verification state.

Onchain transfers are not automatically reversible.

---

# 48. Name Claim UX

Required user flow:

```text
1. Open canonical claim link.
2. Authenticate the relevant name namespace.
3. Connect or create a Base Account.
4. Prove control of the account.
5. Review the exact name and destination.
6. Submit a sponsored GOTName.claim transaction.
7. Wait for confirmation.
8. Process pending intents or allow resolver automation.
```

The interface MUST clearly distinguish:

- unclaimed;
- claim prepared;
- claim submitted;
- claimed;
- transferred;
- invalid or expired claim.

The interface MUST NOT imply that a raw external identifier is public onchain.

---

# 49. Receive Flow

A user SHOULD be able to receive through:

```text
account
GOT public name
verified email
verified phone
verified X identity
verified Telegram identity
ENS identity
individual payment link
invoice
subscription plan
```

The receive page SHOULD show:

- destination type;
- network;
- asset;
- deterministic address;
- QR code;
- amount when fixed;
- payment status;
- copyable payment link;
- settlement status.

---

# 50. Invoice Flow

Merchant creation:

```text
1. Sign in with Base.
2. Enter customer, amount, due date and description.
3. Select direct account or name recipient.
4. Generate immutable IntentConfig.
5. Predict intent address.
6. Store canonical metadata and metadata hash.
7. Return payment link, address and QR code.
```

Recommended configuration:

```text
ownerSource         = merchant account or GOTName
ownerKey            = 0 or merchant nameKey
token               = canonical USDC
amount              = gross invoice amount
period              = 0
initialDeadline     = due timestamp or 0
partner             = GOT or integration partner
authorizedResolver  = GOT resolver or 0
metadataHash        = hash(canonical invoice metadata)
```

Application-derived states:

```text
DRAFT
OPEN
PARTIAL
PAID
OVERPAID
CANCELLED
EXPIRED
```

Payment state from onchain values:

```text
OPEN
    totalProcessed == 0

PARTIAL
    0 < totalProcessed < amount

PAID
    totalProcessed == amount

OVERPAID
    totalProcessed > amount
```

Cancellation or expiration affects application presentation only. It does not disable core settlement.

---

# 51. Subscription Flow

```text
1. Merchant creates a plan.
2. Customer reviews exact amount and period.
3. Customer signs a Spend Permission.
4. Backend stores permission and intent binding.
5. Scheduler detects a due period.
6. Keeper calls GOTSubscriptionCollector.charge.
7. Collector spends exact USDC amount.
8. Collector forwards funds to the deterministic intent.
9. Collector atomically deploys and processes the intent.
10. Indexer confirms finality.
11. Paid-through state advances.
12. Receipt and webhook are delivered.
```

Application states:

```text
DRAFT
PENDING_APPROVAL
ACTIVE
PAYMENT_DUE
PAYMENT_PROCESSING
PAID
PAST_DUE
CANCELLED
EXPIRED
```

For exact recurring charges:

```solidity
uint256 periodsPaid =
    totalProcessed / amount;

uint256 paidThrough =
    uint256(initialDeadline) +
    periodsPaid * uint256(period);
```

Unused allowance does not become collectible debt in a later period.

Missed charges SHOULD be handled by:

- retry during the same period;
- separate invoice;
- renewed authorization;
- application-level dunning.

---

# 52. Base Account Integration

The interface SHOULD use the current Base Account SDK.

The returned account is the user's primary onchain GOT account.

Direct intent:

```text
ownerSource = Base Account
ownerKey    = 0
```

Named intent:

```text
ownerSource = GOTName
ownerKey    = nameKey
GOTName mapping → Base Account
```

Backend signature verification MUST support:

- EOA signatures;
- ERC-1271 smart-account signatures;
- counterfactual account signatures where required.

The backend MUST NOT assume ordinary ECDSA recovery for every account.

Account recovery that preserves the Base Account address requires no intent or name update.

Moving a claimed name to a new account address requires `GOTName.transfer`.

GOT MAY sponsor:

- first claim;
- first settlement;
- subscription approval;
- subscription cancellation;
- account onboarding transactions.

Gas sponsorship is an interface feature, not a core invariant.

---

# 53. API Surface

Base URL:

```text
https://api.got.cx/v1
```

## 53.1 Intents

```text
POST   /intents
GET    /intents/:id
GET    /intents/:id/payments
POST   /intents/:id/settle
```

## 53.2 Transfers

```text
POST   /transfers
GET    /transfers/:id
POST   /transfers/:id/remind
```

## 53.3 Names

```text
POST   /names/resolve
GET    /names/:nameKey
POST   /names/claims/prepare
POST   /names/claims/submit
GET    /names/claims/:id
POST   /names/:nameKey/transfer/prepare
```

## 53.4 Invoices

```text
POST   /invoices
GET    /invoices/:id
POST   /invoices/:id/cancel
POST   /invoices/:id/remind
GET    /invoices/:id/payments
```

## 53.5 Subscriptions

```text
POST   /subscriptions
GET    /subscriptions/:id
POST   /subscriptions/:id/approve
POST   /subscriptions/:id/cancel
POST   /subscriptions/:id/retry
GET    /subscriptions/:id/payments
```

## 53.6 Webhook endpoints

```text
POST   /webhook-endpoints
GET    /webhook-endpoints
DELETE /webhook-endpoints/:id
POST   /webhook-endpoints/:id/test
```

## 53.7 Activity

```text
GET    /activity
GET    /payments/:id
GET    /receipts/:id
```

API writes MUST be idempotent through an idempotency key.

API responses MUST include:

- chain ID;
- protocol version;
- factory;
- config hash;
- predicted intent address;
- asset;
- amount;
- owner mode;
- finality status.

---

# 54. SDK Surface

Suggested TypeScript API:

```ts
const intent = await got.intents.create({
  owner: merchantAccount,
  amount: "1000",
  currency: "USDC",
  network: "base",
});
```

```ts
const transfer = await got.transfers.create({
  recipient: "email:alice@example.com",
  amount: "100",
  currency: "USDC",
  network: "base",
});
```

```ts
const invoice = await got.invoices.create({
  amount: "1000",
  currency: "USDC",
  recipient: merchantAccount,
  dueAt: "2026-08-30T00:00:00Z",
});
```

```ts
const subscription = await got.subscriptions.create({
  amount: "29",
  currency: "USDC",
  period: "monthly",
  merchant: merchantAccount,
});
```

The SDK MUST expose deterministic preview locally when possible.

Recommended packages:

```text
@gotcx/core
@gotcx/contracts
@gotcx/sdk
@gotcx/react
@gotcx/types
```

---

# 55. Webhooks

Suggested event types:

```text
intent.created
intent.funded
intent.deployed
intent.processed
intent.unresolved
intent.resolved

transfer.detected
transfer.processed
transfer.failed

name.claim_prepared
name.claimed
name.transferred

invoice.payment_detected
invoice.payment_processed
invoice.partially_paid
invoice.paid
invoice.overpaid

subscription.approved
subscription.payment_due
subscription.charged
subscription.past_due
subscription.cancelled
```

Every webhook MUST include:

- event ID;
- event type;
- creation timestamp;
- chain ID;
- protocol version;
- intent address when applicable;
- transaction hash when applicable;
- canonical JSON body;
- HMAC or asymmetric signature;
- replay-protection timestamp.

Merchants MUST be able to retrieve the canonical event through the API.

Retries SHOULD use exponential backoff.

Event IDs and fulfillment MUST be idempotent.

---

# 56. Receipts

A receipt SHOULD include:

- payment ID;
- intent ID;
- intent address;
- chain ID;
- token;
- gross amount;
- effective owner at processing;
- executor;
- treasury fee;
- partner reward;
- execution reward;
- transaction hash;
- block number;
- finality status;
- created timestamp;
- processed timestamp;
- invoice or subscription reference when applicable.

Receipts MUST distinguish:

```text
funds detected
funds processed
transaction confirmed
application fulfilled
```

---

# 57. Interface Security Requirements

The interface MUST:

- show exact chain and asset;
- display deterministic address before payment;
- validate address checksum;
- show recipient context before named payments;
- warn when a name is unclaimed;
- warn that onchain transfers are not automatically reversible;
- never expose secrets in URLs;
- verify API response configuration against local address derivation where possible;
- support phishing-resistant canonical-domain checks;
- enforce CSP and secure headers;
- protect session and OAuth tokens;
- rate-limit claim and payment endpoints;
- provide transaction links to a block explorer;
- clearly separate detected, processed and finalized status.

---

# Part IV — Infrastructure

# 58. Required Services

Initial production services:

1. application API;
2. PostgreSQL or equivalent database;
3. chain indexer;
4. resolver worker;
5. subscription scheduler;
6. keeper workers;
7. name resolution service;
8. namespace verification adapters;
9. EIP-712 claim signer;
10. webhook dispatcher;
11. email and Telegram notification workers;
12. monitoring and alerting;
13. deterministic deployment pipeline.

No infrastructure service may custody configured-token funds.

---

# 59. Data Model

## 59.1 User

```text
id
primary account
createdAt
status
```

## 59.2 Name record

```text
namespace
opaque identifier
nameKey
display value or masked value
lifecycle epoch
verification status
claimed account
claimed transaction
createdAt
updatedAt
```

Sensitive canonical identifiers MUST be encrypted and access-controlled.

## 59.3 Billing account

```text
merchant ID
primary account
optional name keys
branding
notification settings
webhook endpoints
```

## 59.4 Intent

```text
chainId
protocolVersion
factory
config
configHash
predictedAddress
intentType
billingRecordId
owner mode
nameKey when applicable
createdAt
```

## 59.5 Payment

```text
chainId
intentAddress
transactionHash
logIndex
payer when known
executor
effectiveOwner
grossAmount
ownerAmount
treasuryFee
partnerReward
executionReward
confirmationState
```

## 59.6 Name claim

```text
nameKey
namespace
account
claimSignatureHash
claimTransaction
status
createdAt
```

## 59.7 Invoice

```text
invoiceId
merchant
customer reference
intent ID
intent address
amount
due date
status
metadata
createdAt
```

## 59.8 Subscription

```text
subscriptionId
merchant
customer account
permission hash
permission terms
signed approval
intent config
intent address
next due period
status
retry state
```

## 59.9 Webhook delivery

```text
event ID
endpoint
attempt
signature
timestamp
status
response code
next retry
```

---

# 60. Indexer

The indexer MUST key protocol state by:

```text
chainId + factory + intentAddress
```

It MUST handle:

- counterfactual funding before deployment;
- deployment after funding;
- multiple funding transfers;
- multiple processing operations;
- partial payments;
- overpayments;
- owner changes between processing operations;
- GOTName claims before intent deployment;
- GOTName transfers;
- subscription collector events;
- duplicate RPC delivery;
- chain reorgs;
- log replay;
- per-chain finality thresholds.

Application fulfillment MUST be idempotent.

The indexer SHOULD maintain:

```text
observed token balance
deployed status
total processed
effective owner
owner resolution status
payment allocations
finality status
```

An indexer view is not authoritative over onchain contract state.

---

# 61. Resolver Worker

The resolver worker:

```text
1. discovers funded intent addresses;
2. reconstructs exact IntentConfig;
3. verifies canonical address derivation;
4. checks owner resolution;
5. checks resolver authorization;
6. estimates gas and execution reward;
7. submits deployAndExecute or resolve;
8. tracks transaction replacement and finality;
9. retries safe failures;
10. emits operational metrics.
```

For open resolvers, the worker MAY apply a profitability threshold:

```text
expected execution reward
    >
estimated gas cost + safety margin
```

For restricted GOT product intents, the service MAY process regardless of direct profitability according to product policy.

The worker MUST NOT submit when:

- configuration cannot be reconstructed;
- predicted address differs;
- owner is unresolved;
- token is unsupported;
- resolver authorization fails;
- balance is zero;
- chain state is stale.

---

# 62. Name Resolution Service

The name resolution service converts user input into a canonical `nameKey`.

Responsibilities:

- parse namespace;
- canonicalize identifier;
- retrieve stable provider identity where required;
- apply lifecycle epoch;
- return opaque identifier;
- derive exact `nameKey`;
- provide safe display metadata;
- detect claimed or unclaimed state;
- prevent raw sensitive values from appearing onchain.

The service MUST return enough information for the client to confirm the recipient without exposing protected identifier data.

Example logical response:

```json
{
  "namespace": "EMAIL",
  "nameKey": "0x...",
  "display": "a***@example.com",
  "claimed": false,
  "account": null,
  "lifecycle": 1
}
```

The raw resolver database is security-sensitive infrastructure.

---

# 63. Claim Signer

The claim signer MUST:

- accept only verified namespace sessions;
- verify account control;
- derive the key server-side;
- bind exact key, account, deadline, chain and GOTName contract;
- use short deadlines;
- support an immutable Safe as verifier;
- isolate signing infrastructure;
- emit an immutable audit log;
- reject replayed nonces;
- rate-limit attempts;
- never sign for an already claimed name;
- never expose signer keys to web or API clients.

High-value claims MAY require:

- reauthentication;
- delay;
- secondary verification;
- manual risk review;
- user notification.

These are product controls and do not change the immutable `GOTName` contract.

---

# 64. Subscription Scheduler

The scheduler MUST:

- calculate due periods deterministically;
- avoid duplicate jobs;
- verify subscription status;
- verify permission validity;
- verify allowance for the current period;
- verify exact intent binding;
- submit one charge attempt at a time;
- classify failures;
- retry only safe failures;
- stop after cancellation or expiration;
- advance paid-through state only after finality.

Common failures:

- insufficient USDC;
- permission not approved;
- permission revoked;
- allowance already consumed;
- outside permission window;
- unresolved merchant owner;
- invalid binding;
- token pause or blacklist;
- RPC failure;
- chain congestion.

A failed atomic collector transaction MUST NOT mark the customer as charged.

---

# 65. Webhook Dispatcher

The dispatcher MUST:

- sign canonical payloads;
- use idempotent event IDs;
- maintain delivery attempts;
- apply exponential backoff;
- stop or quarantine persistently failing endpoints;
- prevent SSRF;
- restrict unsupported protocols and private network targets;
- expose delivery history;
- allow event retrieval through the API;
- support secret rotation.

Merchant systems SHOULD acknowledge successful delivery with a 2xx response.

---

# 66. Notifications

Supported channels MAY include:

- email;
- Telegram;
- in-app;
- push;
- X direct communication where supported.

Notifications SHOULD cover:

- payment detected;
- payment finalized;
- name claim requested;
- name claimed;
- name transferred;
- invoice due;
- invoice paid;
- subscription charge failed;
- subscription cancelled;
- webhook disabled.

Notifications MUST NOT include full sensitive identifiers unless the recipient has authenticated and policy permits it.

---

# 67. Monitoring

Required metrics:

```text
RPC health
indexer lag
reorg depth
funded unresolved intent count
funded undeployed intent count
resolver success rate
resolver profit and cost
claim success rate
claim rejection rate
subscription charge success rate
webhook delivery success rate
signer service health
contract code hash verification
treasury and partner allocation totals
```

Required alerts:

- canonical contract code mismatch;
- unexpected factory address;
- claim signer anomaly;
- unusual unresolved-fund growth;
- resolver failure spike;
- scheduler duplicate attempts;
- webhook backlog;
- indexer divergence;
- unexpected token balance remaining after processing;
- infrastructure key exposure indicators.

---

# Part V — Economics

# 68. Protocol Fee

Each intent commits an immutable `feeBps`.

The fee is divided into:

```text
execution reward
    compensates the actual executor

partner reward
    rewards the immutable integration or distribution partner

treasury fee
    supports GOT development and operations
```

The cumulative fee model prevents fee manipulation through payment splitting.

The protocol MAY define a maximum fee through immutable factory configuration.

Changing global fee-share parameters requires a new immutable factory version.

---

# 69. Partner Model

The immutable partner address creates a permissionless distribution layer.

Possible partners:

- wallets;
- marketplaces;
- commerce platforms;
- developer tools;
- accounting systems;
- creator platforms;
- payment applications;
- referral partners.

Partner attribution is committed to the intent address and cannot be replaced after creation.

The partner receives a share only when nonzero.

---

# 70. Resolver Market

Open intents permit executor competition.

The execution reward creates an economic incentive to:

- detect funded addresses;
- deploy counterfactual intents;
- process balances;
- pay transaction gas;
- maintain independent automation.

Restricted resolver mode supports application-controlled workflows where:

- service guarantees are required;
- subscription atomicity is required;
- claim timing must be coordinated;
- application policy sponsors execution.

---

# 71. Product Revenue

The GOT product MAY earn revenue from:

- protocol treasury fees;
- partner rewards;
- resolver rewards;
- merchant subscriptions;
- premium invoicing;
- subscription tooling;
- API usage;
- webhook and accounting integrations;
- sponsored gas plans;
- enterprise support.

Product pricing is not a core protocol invariant.

The public protocol MUST remain usable by third-party interfaces and infrastructure.

---

# Part VI — Security and Trust

# 72. Trust Model

## 72.1 Protocol core

Trust minimized:

- immutable contracts;
- no administrator;
- no pause;
- no upgradeability;
- deterministic deployment;
- public source and code hashes.

## 72.2 GOTName before claim

The claim verifier is trusted to authorize the correct first account for an unclaimed key.

## 72.3 GOTName after claim

Only the current mapped account may transfer the name.

The verifier cannot overwrite it.

## 72.4 Name resolution infrastructure

The service is trusted to map user input to the correct namespace, opaque identifier and lifecycle key.

Clients SHOULD display recipient context and MAY independently verify public namespaces.

## 72.5 Base Account

Account authentication, execution and recovery rely on Base Account contracts and services used by the application.

## 72.6 Spend Permissions

Recurring authorization relies on the deployed Spend Permission system and the exact signed permission.

## 72.7 Infrastructure

Indexers, resolvers and webhooks improve usability but do not control direct intent ownership or bypass protocol accounting.

---

# 73. Threat Model

## 73.1 Counterfactual deployment attack

An attacker attempts to deploy different code at a funded predicted address.

Mitigation:

- `CREATE2` commits to factory, salt and exact init code;
- configuration is included in immutable proxy bytecode;
- canonical factory verifies deployment address;
- release artifacts publish bytecode hashes.

## 73.2 Malicious owner resolver

A resolver may return an incorrect account or fail.

Mitigation:

- resolver selection is immutable in each intent;
- resolver mode is explicit through nonzero owner key;
- resolution is bounded;
- malformed resolution fails closed;
- intended resolvers require independent audit.

## 73.3 Claim verifier compromise before claim

A compromised verifier may authorize an attacker for an unclaimed key.

Mitigations:

- verifier Safe;
- signer separation;
- short deadlines;
- account-control proof;
- identity-verification audit logs;
- rate limits;
- user notification;
- risk review for high values;
- limited signer-service access.

## 73.4 Claim verifier compromise after claim

The verifier cannot overwrite a nonzero mapping.

Claimed names remain controlled by their mapped accounts.

## 73.5 External identity compromise

A compromised email, phone or social account may satisfy namespace verification.

Mitigations MAY include:

- recent authentication;
- destination-account proof;
- secondary confirmation;
- risk scoring;
- delay for high-value unclaimed balances;
- user notification.

## 73.6 Identifier reassignment

A phone number, email or social identity changes control.

Mitigation:

- claimed names are not automatically reassigned;
- lifecycle epochs create new keys;
- old intents remain linked to the original claimed account.

## 73.7 Name transfer risk

Transferring a name changes the recipient of unsettled and future payments using that key.

Mitigation:

- only current owner may transfer;
- explicit user warning;
- optional account-level confirmation policy;
- notification;
- full event history.

## 73.8 Token incompatibility

Fee-on-transfer, rebasing, callback-enabled or malicious tokens may break exact-balance assumptions.

Mitigation:

- application token allowlists;
- canonical USDC-only v0.1 product;
- exact balance checks;
- hostile token tests.

## 73.9 Resolver front-running

Open resolvers compete for execution reward.

Only one transaction succeeds. Front-running changes only the valid executor receiving the reward.

## 73.10 Reentrancy

Tokens or recipient contracts attempt nested execution.

Mitigation:

- packed execution lock;
- state update before transfers;
- final balance verification;
- reentrancy tests.

## 73.11 Subscription collector compromise

The collector is an authorized spender.

Mitigation:

- immutable contract;
- exact signed binding;
- exact amount;
- exact period;
- no arbitrary destination;
- atomic charge and settlement;
- independent audit.

## 73.12 Webhook forgery

An attacker sends fake payment notifications.

Mitigation:

- signed canonical payloads;
- replay protection;
- API retrieval;
- transaction and chain references;
- merchant-side signature validation.

---

# 74. Privacy

Onchain data MUST exclude:

- raw email;
- raw phone;
- raw provider usernames when sensitive;
- OAuth tokens;
- login assertions;
- personal messages;
- billing documents;
- customer personal data.

`metadataHash` MAY commit to offchain records but MUST NOT reveal protected content.

Sensitive namespace records MUST be encrypted at rest.

Access MUST follow least privilege.

Retention policies MUST be documented.

Users SHOULD be informed that:

- intent addresses;
- token transfers;
- name keys;
- claims;
- account mappings;
- name transfers;
- settlement events

are public onchain data.

---

# 75. Independent Audit Scope

## 75.1 GOTIntent and GOTFactory

Audit MUST cover:

- immutable argument encoding and decoding;
- proxy bytecode and calldata suffix;
- direct implementation protection;
- `CREATE2` derivation;
- factory statelessness;
- configuration validation;
- direct and resolver ownership modes;
- ERC-165 probing;
- bounded static calls;
- unresolved behavior;
- one-read owner caching;
- factory authority dispatch;
- cumulative fee invariance;
- one-slot state;
- complete-balance processing;
- token transfer ordering;
- final balance check;
- reentrancy;
- recovery;
- atomic first deployment;
- hostile ERC20 behavior;
- deterministic multichain release.

## 75.2 GOTName

Audit MUST cover:

- EIP-712 domain;
- EOA and ERC-1271 verifier signatures;
- exact key and account binding;
- one-time first claim;
- claim before intent deployment;
- no verifier overwrite;
- current-owner transfer;
- invalid account rejection;
- permanent ERC-165 support;
- event correctness;
- no pause or upgradeability.

## 75.3 GOTSubscriptionCollector

Audit MUST cover:

- exact permission binding;
- `extraData` parsing;
- approval-by-signature;
- exact allowance and period;
- exact token;
- atomic spend, transfer and settlement;
- principal balance checks;
- execution-reward forwarding;
- reentrancy;
- cancellation;
- malicious keeper;
- unresolved owner rollback.

---

# Part VII — Deployment and Versioning

# 76. Launch Profile

Initial production:

```text
Chain:       Base Mainnet
Asset:       canonical USDC
Account:     Base Account preferred
Interface:   got.cx
```

Initial testing:

```text
Chain:       Base Sepolia
Asset:       approved test USDC
```

The core SHOULD remain deployable on Ethereum and compatible EVM chains.

---

# 77. Canonical Multichain Deployment

`GOTIntent` implementation and `GOTFactory` SHOULD use identical canonical addresses across supported chains through deterministic deployment.

The release manifest MUST publish:

- implementation address;
- factory address;
- GOTName address;
- subscription collector address where applicable;
- runtime code hashes;
- constructor arguments;
- compiler version;
- EVM version;
- optimizer settings;
- metadata settings;
- deployment salts;
- deterministic deployer address and code hash;
- protocol constants;
- immutable argument layout;
- proxy creation and runtime hashes;
- interface identifiers;
- deterministic address vectors.

Equal hexadecimal addresses across chains do not imply shared:

- balances;
- total processed;
- name claims;
- name ownership;
- subscription permissions;
- events.

---

# 78. Versioning

System version:

```text
GOT Unified System Specification v0.1
```

Component versions MAY evolve independently:

```text
GOT protocol core
GOTName
GOTSubscriptionCollector
got.cx interface
GOT API
GOT infrastructure
```

A core behavioral change requires:

- new protocol identifier;
- new implementation;
- new factory;
- new address namespace;
- new deterministic vectors.

An interface or infrastructure release does not require a new protocol version unless it changes normative onchain behavior.

Canonical contracts MUST NOT be upgraded in place.

---

# 79. Release Artifacts

Every release MUST include:

- verified source;
- SPDX license;
- compiler lockfile;
- dependency lockfile;
- build reproducibility instructions;
- contract ABIs;
- TypeScript types;
- code hashes;
- deployed addresses;
- chain IDs;
- deterministic address test vectors;
- audit reports;
- known limitations;
- security contact;
- deployment transaction references;
- subgraph or indexer schema version;
- API schema version.

---

# Part VIII — Implementation Plan

# 80. Phase 1 — Protocol Core

- implement `IGOTOwnerResolver`;
- implement 226-byte immutable layout;
- implement `GOTIntent`;
- implement `GOTFactory`;
- implement direct mode through zero owner key;
- implement resolver mode through nonzero owner key;
- preserve one-slot storage;
- implement cumulative fee math;
- implement deterministic preview;
- implement atomic deployment and execution;
- add required unit, fuzz and invariant tests;
- publish deterministic vectors.

---

# 81. Phase 2 — GOTName

- implement immutable verifier;
- implement EIP-712 claim;
- implement ERC-1271 verifier support;
- implement one-time claim;
- implement `resolveOwner`;
- implement current-owner transfer;
- publish key derivation rules;
- implement name resolution database;
- implement namespace adapters;
- implement account-control proof;
- sponsor claim transactions;
- add monitoring and audit logs.

---

# 82. Phase 3 — Transfer and Invoice MVP

- Base Account sign-in;
- Base USDC;
- direct transfer creation;
- named transfer creation;
- payment links;
- intent address preview;
- counterfactual payment detection;
- resolver worker;
- name claim UX;
- invoice creation;
- receipts;
- webhooks;
- CSV export;
- activity feed.

---

# 83. Phase 4 — Subscriptions

- integrate Spend Permissions;
- implement `GOTSubscriptionCollector`;
- implement exact recurring permission;
- implement signed intent binding;
- scheduler and keepers;
- retries;
- cancellation;
- receipts;
- subscription webhooks;
- merchant subscription dashboard.

---

# 84. Phase 5 — Integrations and Expansion

- Telegram verification;
- X verification;
- email and phone verification;
- ENS adapter;
- public GOT names;
- developer SDK;
- API keys;
- accounting integrations;
- partner integrations;
- additional EVM deployments;
- independent resolver operators.

---

# 85. Complete Implementation Checklist

## 85.1 Repository

- [ ] one authoritative `docs/SPEC.md`;
- [ ] protocol core separated from periphery;
- [ ] interface separated from infra;
- [ ] core has no periphery dependency;
- [ ] contract ABIs and deployments published;
- [ ] security policy and disclosure contact published.

## 85.2 GOTFactory

- [ ] zero mutable storage;
- [ ] no admin;
- [ ] no pause;
- [ ] no upgrade;
- [ ] exact protocol identifier;
- [ ] exact 226-byte immutable args;
- [ ] canonical config hash;
- [ ] canonical salt;
- [ ] canonical `CREATE2` address;
- [ ] no token-code requirement during preview;
- [ ] token-code requirement during execution;
- [ ] atomic first deployment and execution;
- [ ] actual external executor forwarded;
- [ ] no raw owner-source authority comparison;
- [ ] deterministic vectors published.

## 85.3 GOTIntent

- [ ] direct implementation protection;
- [ ] immutable suffix validation;
- [ ] one mutable slot;
- [ ] zero owner key means direct owner;
- [ ] nonzero owner key means resolver mode;
- [ ] bounded ERC-165 probe;
- [ ] bounded resolver call;
- [ ] unresolved owner handled safely;
- [ ] fail closed on resolver failure;
- [ ] invalid resolved addresses rejected;
- [ ] exactly one owner read per operation;
- [ ] owner settlement always available;
- [ ] open resolver exact;
- [ ] restricted resolver exact;
- [ ] cumulative fee mathematics;
- [ ] execution reward to actual executor;
- [ ] configured token unrecoverable;
- [ ] unsupported assets recover to effective owner;
- [ ] complete balance processed;
- [ ] final token balance verified;
- [ ] reentrancy lock correct;
- [ ] effective owner emitted.

## 85.4 GOTName

- [ ] one onchain contract;
- [ ] one mapping from name key to account;
- [ ] immutable verifier;
- [ ] EOA and ERC-1271 verifier support;
- [ ] EIP-712 domain separation;
- [ ] exact key, account and deadline binding;
- [ ] one-time claim;
- [ ] claim before intent deployment;
- [ ] no verifier overwrite;
- [ ] transfer only by current account;
- [ ] zero and self account rejected;
- [ ] ERC-165 support;
- [ ] no raw identifiers onchain;
- [ ] no upgrade;
- [ ] no pause;
- [ ] no admin mapping setter.

## 85.5 Name Infrastructure

- [ ] namespace definitions;
- [ ] canonicalization rules;
- [ ] opaque identifiers for sensitive namespaces;
- [ ] lifecycle epochs;
- [ ] email verification;
- [ ] phone verification;
- [ ] X stable user ID verification;
- [ ] Telegram stable user ID verification;
- [ ] ENS verification;
- [ ] account-control proof;
- [ ] short claim deadlines;
- [ ] one-time backend nonces;
- [ ] exact key reconstruction;
- [ ] claim signer isolation;
- [ ] audit logs;
- [ ] rate limits;
- [ ] user notifications.

## 85.6 Subscription Collector

- [ ] immutable manager, factory and token;
- [ ] exact spender;
- [ ] exact token;
- [ ] exact allowance;
- [ ] exact period;
- [ ] exact intent binding;
- [ ] authorized resolver equals collector;
- [ ] approval-by-signature;
- [ ] exact balance increase;
- [ ] transfer principal to predicted intent;
- [ ] atomic deploy and execute;
- [ ] forward exact execution reward;
- [ ] reentrancy guard;
- [ ] no arbitrary destination;
- [ ] no variable charge;
- [ ] cancellation and retry handling.

## 85.7 Interface

- [ ] canonical `got.cx` routes;
- [ ] Base Account sign-in;
- [ ] external wallet support;
- [ ] direct transfer UX;
- [ ] named transfer UX;
- [ ] unclaimed warning;
- [ ] claim UX;
- [ ] invoice UX;
- [ ] subscription UX;
- [ ] local address verification;
- [ ] chain and asset display;
- [ ] QR codes;
- [ ] receipts;
- [ ] activity;
- [ ] webhook management;
- [ ] API keys;
- [ ] secure headers;
- [ ] privacy disclosures.

## 85.8 Infrastructure

- [ ] chain-aware indexing;
- [ ] reorg handling;
- [ ] counterfactual funding detection;
- [ ] resolver config reconstruction;
- [ ] resolver profitability policy;
- [ ] subscription scheduler;
- [ ] idempotent jobs;
- [ ] signed webhooks;
- [ ] webhook retries;
- [ ] SSRF protection;
- [ ] notification workers;
- [ ] monitoring;
- [ ] alerts;
- [ ] deterministic deployments;
- [ ] code-hash verification.

## 85.9 Security and Release

- [ ] core audit complete;
- [ ] GOTName audit complete;
- [ ] collector audit complete;
- [ ] compiler pinned;
- [ ] dependencies pinned;
- [ ] source verified;
- [ ] code hashes published;
- [ ] interface IDs published;
- [ ] test vectors published;
- [ ] deployment manifest published;
- [ ] incident response documented;
- [ ] bug bounty prepared.

---

# 86. Reference Contract Skeletons

## 86.1 Owner resolver

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    IERC165
} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IGOTOwnerResolver is IERC165 {
    function resolveOwner(
        address intent,
        bytes32 ownerKey
    ) external view returns (address);
}
```

## 86.2 GOTName

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {
    EIP712
} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {
    SignatureChecker
} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import {
    ERC165
} from "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract GOTName
    is EIP712,
       ERC165,
       IGOTOwnerResolver
{
    struct Claim {
        bytes32 nameKey;
        address account;
        uint48 deadline;
    }

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256(
            "Claim(bytes32 nameKey,address account,uint48 deadline)"
        );

    address public immutable CLAIM_VERIFIER;

    mapping(bytes32 => address)
        private _accountOf;

    constructor(address verifier)
        EIP712("GOTName", "1")
    {
        if (verifier == address(0)) {
            revert InvalidAccount();
        }

        CLAIM_VERIFIER = verifier;
    }

    function accountOf(
        bytes32 nameKey
    ) external view returns (address) {
        return _accountOf[nameKey];
    }

    function resolveOwner(
        address,
        bytes32 ownerKey
    ) external view returns (address) {
        return _accountOf[ownerKey];
    }

    function claim(
        Claim calldata c,
        bytes calldata signature
    ) external {
        if (c.nameKey == bytes32(0)) {
            revert InvalidNameKey();
        }

        if (
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

        bytes32 structHash = keccak256(
            abi.encode(
                CLAIM_TYPEHASH,
                c.nameKey,
                c.account,
                c.deadline
            )
        );

        bytes32 digest =
            _hashTypedDataV4(structHash);

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

        emit NameClaimed(
            c.nameKey,
            c.account
        );
    }

    function transfer(
        bytes32 nameKey,
        address newAccount
    ) external {
        address current = _accountOf[nameKey];

        if (current == address(0)) {
            revert NameNotClaimed();
        }

        if (msg.sender != current) {
            revert Unauthorized();
        }

        if (
            newAccount == address(0) ||
            newAccount == address(this)
        ) {
            revert InvalidAccount();
        }

        _accountOf[nameKey] = newAccount;

        emit NameTransferred(
            nameKey,
            current,
            newAccount
        );
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override returns (bool) {
        return
            interfaceId ==
                type(IGOTOwnerResolver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
```

## 86.3 Owner resolution in GOTIntent

```solidity
function owner()
    public
    view
    onlyProxy
    returns (address effectiveOwner)
{
    address source =
        _getArgAddress(OWNER_SOURCE_OFFSET);

    bytes32 key =
        _getArgBytes32(OWNER_KEY_OFFSET);

    if (key == bytes32(0)) {
        return source;
    }

    if (source.code.length == 0) {
        revert OwnerResolverUnavailable();
    }

    if (!_supportsOwnerResolver(source)) {
        revert InvalidOwnerResolver();
    }

    (bool ok, bytes memory data) =
        source.staticcall{
            gas: OWNER_RESOLVER_GAS_LIMIT
        }(
            abi.encodeCall(
                IGOTOwnerResolver.resolveOwner,
                (address(this), key)
            )
        );

    if (!ok || data.length != 32) {
        revert OwnerResolutionFailed();
    }

    effectiveOwner =
        abi.decode(data, (address));

    if (
        effectiveOwner == address(this) ||
        effectiveOwner == source
    ) {
        revert InvalidResolvedOwner();
    }
}
```

## 86.4 Subscription charge

```solidity
function charge(
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

    uint256 balanceBefore =
        IERC20(USDC).balanceOf(
            address(this)
        );

    SPEND_PERMISSION_MANAGER.spend(
        permission,
        uint160(config.amount)
    );

    uint256 received =
        IERC20(USDC).balanceOf(
            address(this)
        ) - balanceBefore;

    if (received != config.amount) {
        revert IncorrectReceivedAmount();
    }

    IERC20(USDC).safeTransfer(
        intent,
        config.amount
    );

    (
        ,
        uint256 processedAmount,
        uint256 ownerAmount,
        ,
        ,
        uint256 executionReward
    ) = GOT_FACTORY.deployAndExecute(
        config
    );

    if (executionReward != 0) {
        IERC20(USDC).safeTransfer(
            msg.sender,
            executionReward
        );
    }

    emit SubscriptionCharged(
        config.intentId,
        permission.account,
        intent,
        msg.sender,
        processedAmount,
        ownerAmount,
        executionReward
    );
}
```

---

# 87. External Standards and Dependencies

Implementation review MUST cover applicable current specifications and pinned deployments for:

- EIP-1014 / `CREATE2`;
- ERC-1167 minimal proxies;
- minimal proxies with immutable arguments;
- ERC-20;
- ERC-165;
- EIP-712;
- ERC-1271;
- ERC-4337 where used by accounts;
- ERC-6492 where used for counterfactual signatures;
- Base Account;
- Base Spend Permissions;
- canonical USDC deployments;
- X authenticated user identity;
- Telegram validated identity;
- ENS ownership and resolution.

External SDK versions and deployed dependency addresses MUST be pinned in the implementation repository and release manifest.

---

# 88. Canonical Statements

## GOTIntent

> **GOTIntent is a standalone deterministic counterfactual payment address with immutable configuration, cumulative fee accounting and optional effective-owner resolution.**

## GOTName

> **GOTName is an optional reusable name service that maps an opaque name key to an account and resolves every GOTIntent created for that key.**

## Direct transfer

> **A direct GOTIntent works with an account alone and has no dependency on GOTName.**

## Named transfer

> **A named GOTIntent can receive funds before the name is claimed and becomes settleable when GOTName resolves the key to an account.**

## GOT

> **GOT is an open stack for global onchain transfers through deterministic intent addresses, reusable names, interfaces and automated execution infrastructure.**

---

**End of GOT Unified System Implementation Specification v0.1**
