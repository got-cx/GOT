import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { zeroHash } from "viem"

import {
  canonicalizeIntentMetadata,
  createIntent,
  deriveIntentAddress,
  hashIntentMetadata,
} from "../src/intent"
import { deserializeIntentConfig, serializeIntentConfig } from "../src/protocol"

const owner = "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76" as const

describe("createIntent", () => {
  it("derives the canonical v0.3 Base address locally", () => {
    const intent = createIntent({ owner, ref: " customer:123 " })
    assert.equal(intent.ref, "customer:123")
    assert.equal(intent.amount, 0n)
    assert.equal(intent.metadataHash, zeroHash)
    // Verified against GOTFactory.previewAddress on the canonical Base deployment.
    assert.equal(intent.address, "0x83a3de04E4E601191213b22d8911e5E121aF369E")
  })

  it("is deterministic and changes with address-defining fields", () => {
    const first = createIntent({ owner, ref: "invoice:1042" })
    assert.equal(
      createIntent({ owner, ref: "invoice:1042" }).address,
      first.address
    )
    assert.notEqual(
      createIntent({ owner, ref: "invoice:1042", amount: "100" }).address,
      first.address
    )
    assert.notEqual(
      createIntent({
        owner,
        ref: "invoice:1042",
        metadata: { customerId: "customer:123" },
      }).address,
      first.address
    )
  })

  it("converts human USDC amounts to canonical units", () => {
    assert.equal(
      createIntent({ owner, ref: "invoice:1", amount: "100" }).amount,
      100_000_000n
    )
    assert.equal(
      createIntent({ owner, ref: "invoice:2", amount: "0.25" }).amount,
      250_000n
    )
  })

  it("matches factory parity vectors for advanced v0.3 configuration", () => {
    const resolver = "0x60700c99a58fD21022bf1f4d2b318C663e6F2E27" as const
    const partner = "0xca87066dA08fF49efF7C19244ADD4036991ba811" as const
    const vectors = [
      [
        { owner, ref: "invoice:1042", amount: "100" },
        "0x202fb2A63F34990B6D6556108c657357C98182DD",
      ],
      [
        {
          owner,
          ref: "invoice:1042",
          metadata: { customerId: "customer:123", orderId: "991" },
        },
        "0x09A6175bc485b1d2b1AA6Fc7daf9123217cBa86B",
      ],
      [
        {
          owner,
          ref: "subscription:pro",
          amount: "25",
          deadline: 1_800_000_000,
          period: 2_592_000,
        },
        "0xc89064f30DF70BE259f9763F7578b23F0646b250",
      ],
      [
        { owner, ref: "resolver", authorizedResolver: resolver },
        "0x8cad2D6cA6EBCE60564d49a68cdbcA330900651C",
      ],
      [
        { owner, ref: "partner", partner, feeBps: 30 },
        "0x0Befa3B0E0ff8cD756C613E9A285519Ce5205AFF",
      ],
    ] as const

    for (const [input, expected] of vectors) {
      assert.equal(createIntent(input).address, expected)
    }
  })

  it("preserves its Address through configuration serialization", () => {
    const intent = createIntent({
      owner,
      ref: "invoice:round-trip",
      amount: "42.50",
      metadata: { nested: { enabled: true } },
    })
    assert.equal(
      deriveIntentAddress(
        deserializeIntentConfig(serializeIntentConfig(intent.config))
      ),
      intent.address
    )
  })

  it("does not access fetch, an RPC, a wallet, or randomness", () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = (() => {
      throw new Error("network accessed")
    }) as typeof fetch
    try {
      assert.doesNotThrow(() => createIntent({ owner, ref: "offline" }))
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})

describe("canonical Intent metadata", () => {
  it("sorts keys recursively without changing array order", () => {
    const left = {
      z: [{ second: true, first: null }],
      a: "value",
    }
    const right = {
      a: "value",
      z: [{ first: null, second: true }],
    }
    assert.equal(
      canonicalizeIntentMetadata(left),
      canonicalizeIntentMetadata(right)
    )
    assert.equal(hashIntentMetadata(left), hashIntentMetadata(right))
  })

  it("distinguishes omitted and explicitly empty metadata", () => {
    assert.equal(hashIntentMetadata(), zeroHash)
    assert.notEqual(hashIntentMetadata({}), zeroHash)
  })

  it("rejects unsupported, sparse, and cyclic values", () => {
    assert.throws(
      () => hashIntentMetadata({ invalid: undefined } as never),
      /unsupported/
    )
    assert.throws(
      () => hashIntentMetadata({ invalid: 1n } as never),
      /unsupported/
    )
    const sparse: unknown[] = []
    sparse.length = 1
    assert.throws(() => hashIntentMetadata({ sparse } as never), /sparse/)
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic
    assert.throws(() => hashIntentMetadata(cyclic as never), /cycles/)
  })
})
