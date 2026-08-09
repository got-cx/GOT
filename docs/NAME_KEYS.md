# GOT Links Model name keys

GOTName keys use the single canonical identity string defined by GOT Links Model normalization version `got-links-v1`:

```solidity
bytes32 identifierKey = keccak256(bytes(canonicalIdentity));
```

Examples are `got:dima`, `x:vitalik`, `telegram:dima`, `email:alice@example.com`, and `phone:+491234567890`. The URL presentation `@` is removed before hashing. Applications MUST NOT ABI-encode the namespace and identifier separately.

The TypeScript package API is the normative normalization implementation:

```ts
import { deriveNameKeyV1, normalizeGOTIdentity } from "@got-cx/protocol";
```

`GOTName.deriveNameKey` only hashes an already-canonical string so Solidity and TypeScript can verify the same vectors. It does not normalize untrusted text onchain. Frontends, APIs, the claim service, and Safe signer tooling MUST use the package normalizer first.

## Injective encoding

The `:` separator is unambiguous because identifiers may never contain `:` and the namespace set is closed. Built-in namespaces contain no separator. A custom namespace has exactly the form `custom:<application-id>`, so it contains exactly one separator before the identifier is appended.

Consequently, inputs such as `("custom:shop", "a:b")`, `("custom", "shop:a:b")`, unknown namespaces, and additional custom namespace components are rejected rather than mapped to a key.

## Link normalization

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

## Cross-language golden vectors

| Canonical identity             | Identifier key                                                       |
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

The Solidity and TypeScript test suites assert the same vectors. Private opaque routes do not use public identity derivation; generate their `bytes32` keys with a cryptographically secure random-number generator and keep the mapping offchain.
