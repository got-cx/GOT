---
name: got-protocol
description: Integrate GOT Protocol with the @got-cx/protocol TypeScript SDK. Use when an agent needs to create, fund, execute, quote, or monitor deterministic GOT intent addresses on Base; build direct or GOTName-owned transfers; or integrate GOTSubscription recurring transfers.
---

# GOT Protocol

Use `@got-cx/protocol` for GOT Protocol v0.3 integrations. Prefer its typed wagmi actions, deployment maps, ABIs, and name-key helpers over recreating contract calls or addresses.

## Execute with the helper

Use the bundled CLI to inspect deployments and ABIs, derive GOT name keys, read contracts, and prepare unsigned calldata:

```sh
npx @got-cx/protocol <command> [args]
```

If `@got-cx/protocol` is already installed, use `npx got-protocol` instead. Available commands:

- `deployments [chainId]`: print all deployments or one supported deployment.
- `abi factory|intent|name|subscription`: print a contract ABI.
- `name-key <namespace> <identifier>`: normalize an identity and derive its GOTName key.
- `encode <contract> <functionName> <jsonArgs>`: create unsigned calldata for a read or write.
- `read <chainId> <contract> <address|deployment> <functionName> <jsonArgs> [rpcUrl]`: perform a read-only RPC call. Use `deployment` for factory, name, or subscription; always provide an explicit intent clone address.

Examples:

```sh
npx @got-cx/protocol deployments 8453
npx @got-cx/protocol name-key got @alice
npx @got-cx/protocol encode factory quoteGrossAmount '[1000000,30]'
npx @got-cx/protocol read 8453 factory deployment MAX_FEE_BPS '[]'
```

For a write, first run the required reads and simulations, then use `encode`. Send its `data` to the canonical deployment address or explicit intent clone through a wallet-connected tool. Default `value` to `0x0`. The helper never requests private keys, signs, or broadcasts transactions.

## Set up

Install the ESM-only SDK and its peers:

```sh
npm install @got-cx/protocol @wagmi/core viem
```

Create a wagmi Core config for Base (`chainId` 8453). Reads need a transport; writes also need an account or connector.

```ts
import { createConfig, http } from "@wagmi/core";
import { base } from "@wagmi/core/chains";

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
});
```

Import the complete SDK from `@got-cx/protocol`, or use the `/wagmi`, `/deployments`, and `/nameKeys` subpaths. Use `USDCAddressByChainId`, `GOTFactoryAddressByChainId`, `GOTNameAddressByChainId`, and `GOTSubscriptionAddressByChainId` instead of hardcoding Base addresses.

## Create a deterministic intent address

Build one immutable intent configuration and reuse it exactly for previewing, funding, deployment, execution, and indexing.

```ts
import { writeContract } from "@wagmi/core";
import { keccak256, erc20Abi, stringToHex, zeroAddress, zeroHash, type Address } from "viem";
import { USDCAddressByChainId, readGOTFactoryPreviewAddress, writeGOTFactoryDeployAndExecute } from "@got-cx/protocol";

const recipient: Address = "0x...";
const intentConfig = {
  intentId: keccak256(stringToHex("intent:unique-application-id")),
  ownerSource: recipient,
  ownerKey: zeroHash,
  token: USDCAddressByChainId[8453],
  partner: zeroAddress,
  authorizedResolver: zeroAddress,
  amount: 10_000_000n,
  initialDeadline: 0n,
  period: 0,
  feeBps: 0,
  metadataHash: keccak256(stringToHex("metadata:unique-application-id")),
} as const;

const intentAddress = await readGOTFactoryPreviewAddress(config, {
  args: [intentConfig],
});

await writeContract(config, {
  abi: erc20Abi,
  address: intentConfig.token,
  functionName: "transfer",
  args: [intentAddress, intentConfig.amount],
});

await writeGOTFactoryDeployAndExecute(config, {
  args: [intentConfig],
});
```

Follow this order:

1. Choose the final configuration.
2. Call `readGOTFactoryPreviewAddress`.
3. Transfer only the configured ERC-20 to the returned intent address.
4. Call `writeGOTFactoryDeployAndExecute` with the identical configuration.
5. Index `IntentDeployed` and `TransferProcessed` events for finalized results.

`amount` is optional expected application metadata, not a settlement cap. Use a positive value for fixed-amount transfers or `0` for an open-amount, reusable virtual deposit, social-link, or tip intent. Both forms process the complete configured-token balance and can process partial, repeated, late, or excess funding. Recurring subscriptions require a positive `amount`.

## Choose ownership and execution

- For a direct owner, set `ownerSource` to the recipient and `ownerKey` to `zeroHash`.
- For a named route, set `ownerSource` to `GOTNameAddressByChainId[chainId]` and derive `ownerKey` with `deriveNameKeyV1(namespace, identifier)`. Never implement GOT identity normalization locally.
- Set `authorizedResolver` to `zeroAddress` for permissionless resolver execution, or to one resolver contract/account to restrict it. The effective owner can always call `settle` on a deployed intent.
- Use `writeGOTIntentResolve` for resolver execution after deployment. Intent actions require the clone's explicit `address` because every configuration has a different address.

## Quote fees

Treat `feeBps` as basis points: `100` is 1%. Use `readGOTFactoryQuoteGrossAmount` when the owner must receive an exact net amount and `readGOTFactoryQuoteOwnerAmount` when starting from a gross amount. Set `partner` to the integration reward address only when using a positive fee.

## Build subscriptions

Use `GOTSubscription` with Base Spend Permissions. The permission and intent must match exactly: token, amount/allowance, period, start/`initialDeadline`, subscription spender/`authorizedResolver`, factory, config hash, and previewed intent address. Use the exported `GOTSubscription` and `ISpendPermissionManager` ABIs/actions; construct the binding defined by the contracts rather than inventing another encoding.

## Safety rules

- Never fund `GOTIntentImplementationAddressByChainId`; it is the locked shared implementation.
- Never calculate an intent address locally when `readGOTFactoryPreviewAddress` is available.
- Never mutate or reconstruct the configuration between preview and execution.
- Validate unsupported ERC-20 behavior before accepting tokens other than canonical Base USDC.
- Simulate writes and wait for transaction receipts before updating application state.
- Derive product state from finalized balances and events; GOT does not enforce invoice fulfillment or deadlines.

Read the package README for export details and the repository's `protocol/test/WAGMI.ts` for a complete runnable transfer example.
