# GOT Protocol

GOT - Global Onchain Transfers - provides deterministic intent addresses that can receive ERC-20 tokens before an intent contract is deployed. Once ownership is resolvable, an allowed executor can atomically deploy the canonical intent clone and process its configured-token balance.

`@got-cx/protocol` provides type-safe wagmi Core actions, ABIs, Base Mainnet deployment metadata, and name-key utilities for GOT protocol version `0.2`. See the [GOT protocol specification](https://github.com/got-cx/GOT/blob/main/docs/SPEC.md) for the full design.

## Install

```sh
npm install @got-cx/protocol @wagmi/core viem
```

The package is ESM-only and its generated actions use `@wagmi/core`.

### Agent skill 🤖

Install the GOT Protocol skill:

```sh
npx @got-cx/protocol
```

The command writes `.agents/skills/got-protocol/SKILL.md`. To install it elsewhere, run `npx @got-cx/protocol install <project-directory>`.

The installed skill can use the same command to inspect deployments and ABIs, derive name keys, read contracts, and prepare unsigned transaction calldata. Run `npx @got-cx/protocol help` for the command reference.

## Quick start on Base

```ts
import { createConfig, http } from "@wagmi/core";
import { base } from "@wagmi/core/chains";
import { GOTFactoryAddressByChainId, GOTNameAddressByChainId, readGOTFactoryProtocolVersion } from "@got-cx/protocol";

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

const factory = GOTFactoryAddressByChainId[base.id];
const nameResolver = GOTNameAddressByChainId[base.id];
const protocolVersion = await readGOTFactoryProtocolVersion(wagmiConfig, {});
```

The SDK currently supports Base Mainnet (`chainId` `8453`). Calls to deployed protocol contracts select their Base address automatically. Intent clones require an explicit address.

Read calls only require a transport. Write examples below assume the configuration also has a connected wallet/account supplied by your application.

## Package exports

| Import path                              | Contents                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `@got-cx/protocol`                       | Complete SDK: wagmi bindings, deployments, address maps, and name-key utilities |
| `@got-cx/protocol/wagmi`                 | Generated ABIs and read/write/simulate/watch actions                            |
| `@got-cx/protocol/deployments`           | Typed deployment metadata and chain-indexed address maps                        |
| `@got-cx/protocol/nameKeys`              | GOT identity normalization and name-key derivation                              |
| `@got-cx/protocol/abi/<Contract>.json`   | Raw contract or interface ABI                                                   |
| `@got-cx/protocol/deployments/base.json` | Raw Base Mainnet deployment manifest                                            |

Generated names preserve Solidity contract casing. Examples include `GOTFactoryAbi`, `IGOTFactoryAbi`, `readGOTFactoryPreviewAddress`, `writeGOTIntentSettle`, and `watchGOTIntentTransferProcessedEvent`.

## Create and fund an intent

An intent's immutable configuration determines its counterfactual address. Reuse the exact same configuration when previewing, funding, deploying, and indexing it.

The runnable [wagmi SDK example](https://github.com/got-cx/GOT/blob/main/protocol/test/WAGMI.ts) shows how to:

1. Build a direct-owner USDC intent.
2. Preview its counterfactual address.
3. Transfer USDC to that address.
4. Deploy and execute the intent.

Always derive the address with `readGOTFactoryPreviewAddress` before funding. Never transfer user funds to `GOTIntentImplementationAddressByChainId`; that address is the locked shared implementation, not an intent clone.

## Quote fees

Use `readGOTFactoryQuoteGrossAmount` and `readGOTFactoryQuoteOwnerAmount` to quote fees. Fees use basis points: `100` is `1%`. The configuration's `feeBps` must not exceed the factory's `MAX_FEE_BPS`.

## Interact with a deployed intent

Intent addresses are configuration-specific, so pass the clone address to actions such as `readGOTIntentOwner` and `writeGOTIntentSettle`. The direct owner can settle; other callers must satisfy the resolver configuration.

## Named routes with GOTName

Use `normalizeGOTIdentity` and `deriveNameKeyV1` instead of implementing identity normalization locally. Set `ownerSource` to `GOTNameAddressByChainId[chainId]` and `ownerKey` to the derived key.

## Recurring transfers with GOTSubscription

`GOTSubscription` connects a Base Account Spend Permission to an intent. Construct and sign the permission with Coinbase's Spend Permissions tooling, then call `writeGOTSubscriptionExecute`. The permission must match the intent configuration.

## Deployment metadata and raw artifacts

Import typed addresses from `@got-cx/protocol/deployments`. Raw ABIs are available through `@got-cx/protocol/abi/<Contract>.json`, and [`deployments/base.json`](./deployments/base.json) contains the Base deployment details.

## Examples and tests

- [Wagmi SDK usage](https://github.com/got-cx/GOT/blob/main/protocol/test/WAGMI.ts)
- [TypeScript product and integration flows](https://github.com/got-cx/GOT/blob/main/protocol/test/GOTProtocol.ts)
- [TypeScript protocol invariants](https://github.com/got-cx/GOT/blob/main/protocol/test/GOTInvariants.ts)
- [Solidity core tests](https://github.com/got-cx/GOT/blob/main/protocol/contracts/test/GOTCore.t.sol)
- [Solidity GOTName tests](https://github.com/got-cx/GOT/blob/main/protocol/contracts/test/GOTName.t.sol)
- [Solidity subscription tests](https://github.com/got-cx/GOT/blob/main/protocol/contracts/test/GOTSubscription.t.sol)

## Contracts

| Contract          | Purpose                                              |
| ----------------- | ---------------------------------------------------- |
| `GOTFactory`      | Preview and deploy deterministic intents             |
| `GOTIntent`       | Process funds for one immutable configuration        |
| `GOTName`         | Resolve canonical identity keys to owner addresses   |
| `GOTSubscription` | Execute recurring transfers through Spend Permission |

## Safety

- Preview an intent address from its final configuration before funding it.
- Reuse the exact same configuration when deploying or executing the intent.
- Never fund the shared `GOTIntent` implementation address.
- Validate token behavior before integrating tokens other than Base USDC.
- Use the SDK's name normalization and key derivation functions for named routes.

## Contribution

Requires Node.js 22+ and npm.

```sh
npm install
npm run build
npm test
```

**in GOT we trust 🌐**
