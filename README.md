# GOT

**Global onchain transfers infrastructure.**

> **Make global onchain transfers simple.**

GOT is open infrastructure for creating and resolving onchain transfer
destinations. [got.cx](https://got.cx) builds on GOT to provide simple transfer
experiences for users, businesses, apps, and developers.

## Understand GOT

### Vision 👀

**Global Onchain Transfers for Everyone.**

### Mission 🎯

**Make global onchain transfers simple.**

### GOT protocol 🌐

**Global onchain transfers infrastructure.**

The open protocol provides reusable transfer destinations and onchain
execution. It is built on Base and supports direct, non-custodial USDC
transfers.

### got.cx product 🐐

**Onchain transfer solutions.**

**Accept onchain transfers now.**

got.cx turns the protocol into practical product experiences for creating,
sharing, receiving, and managing transfers. Create a transfer link, share it or
show its QR code, and let GOT handle the onchain details underneath.

**Human context first. Onchain details on demand.**

### What developers can build

- Transfer links and QR transfer experiences
- Transfer requests with IDs, references, notes, and due dates
- Transfer flows for apps, fintech products, games, and services
- Reusable human-readable transfer destinations
- User deposit destinations
- Recurring transfers using protocol subscriptions
- Automated and agent-initiated transfers through the API and SDK
- Transfer history, status, reporting, and reconciliation workflows

The product and protocol can be used together or independently. Integrators can
use got.cx for its hosted API and product workflows, or integrate directly with
the open protocol.

```text
Create destination
      ↓
Share link / QR / identifier
      ↓
Transfer USDC
      ↓
Funds resolve onchain
```

GOT keeps the default experience focused on recipients, amounts, context, and
transfer status. Technical details such as the Base network, intent addresses,
contract execution, and transaction hashes remain available when they are
needed.

## Build with GOT

### Choose your integration layer

| Resource                                                   | Use it for                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [got.cx SDK](./cx/packages/sdk/README.md)                  | Typed product API access, transfer creation, GOT links, and protocol helpers                  |
| [GOT protocol SDK](./protocol/README.md)                   | Direct protocol reads, writes, deployment metadata, ABIs, and name-key utilities              |
| [GOT protocol CLI](./protocol/README.md)                   | Inspect deployments and ABIs, derive name keys, read contracts, and prepare unsigned calldata |
| [API client guide](./cx/packages/sdk/README.md#api-client) | Server or browser integration with the got.cx API                                             |
| [Protocol contracts](./protocol/contracts)                 | Solidity source for the factory, intents, names, and subscriptions                            |
| [Protocol specification](./docs/SPEC.md)                   | Normative architecture, terminology, security model, and integration behavior                 |
| [Product developer environment](./cx/README.md)            | Run the got.cx web app, API, and workspace packages locally                                   |

### Product SDK quick start

Install the typed got.cx SDK:

```sh
npm install @got-cx/sdk
```

```ts
import { GOTClient } from "@got-cx/sdk";

const got = new GOTClient({
  baseUrl: "https://api.got.cx",
  getAccessToken: () => process.env.GOT_API_TOKEN ?? null,
});

const incoming = await got.transfers.list({ direction: "incoming" });

console.log(incoming.items);
```

Machine API amounts use token base units. See the
[SDK documentation](./cx/packages/sdk/README.md) for the complete request type,
Base chain and USDC constants, authentication, link parsing, errors, and client
surface.

### Protocol SDK quick start

Install the protocol package with its peer dependencies:

```sh
npm install @got-cx/protocol @wagmi/core viem
```

```ts
import { createConfig, http } from "@wagmi/core";
import { base } from "@wagmi/core/chains";
import {
  GOTFactoryAddressByChainId,
  readGOTFactoryTreasury,
} from "@got-cx/protocol";

const config = createConfig({
  chains: [base],
  transports: { [base.id]: http() },
});

const factory = GOTFactoryAddressByChainId[base.id];
const treasury = await readGOTFactoryTreasury(config, {});

console.log(factory, treasury);
```

Continue with the [protocol guide](./protocol/README.md) for deterministic intent
creation, fee quotes, named routes, recurring transfers, deployment metadata,
and safety requirements.

### Integration examples

- [Product and integration flows](./protocol/test/GOTProtocol.ts)
- [Wagmi SDK usage](./protocol/test/WAGMI.ts)
- [Protocol invariants](./protocol/test/GOTInvariants.ts)
- [Base deployment manifest](./protocol/deployments/base.json)

### Repository layout

```text
GOT/
├── cx/                 got.cx web product, API, and product SDK
│   ├── apps/web        landing page, transfer flows, and dashboard
│   ├── apps/api        hosted product API
│   └── packages/sdk    typed product and integration SDK
├── protocol/           contracts, protocol SDK, CLI, tests, and deployments
└── docs/SPEC.md        authoritative GOT protocol specification
```

### Development

Node.js 22 or newer is required.

Run the got.cx workspace:

```sh
cd cx
npm install
npm run dev
npm run typecheck
npm run lint
```

Build and test the protocol:

```sh
cd protocol
npm install
npm run build
npm test
```

Read the product-specific [environment and route documentation](./cx/README.md)
and the protocol [contribution and safety notes](./protocol/README.md) before
changing production flows.

---

**Send it. GOT it.**

[Product updates](https://x.com/got_cx)
