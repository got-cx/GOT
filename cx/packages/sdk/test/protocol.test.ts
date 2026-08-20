import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { deriveIntentId } from "../src/protocol"

const account = "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76"

describe("intent ID derivation", () => {
  it("derives the same ID from the same account and trimmed user ID", () => {
    const derived = deriveIntentId("invoice-2026-001", account)
    assert.equal(
      derived,
      "0xc7e83f20ce54ca8c03d11a6e77053d9ddbf1bde7fef4a320528e23da0d591920"
    )
    assert.equal(deriveIntentId(" invoice-2026-001 ", account), derived)
  })

  it("scopes user IDs to the Base Account", () => {
    assert.notEqual(
      deriveIntentId("invoice-2026-001", account),
      deriveIntentId(
        "invoice-2026-001",
        "0x60700c99a58fD21022bf1f4d2b318C663e6F2E27"
      )
    )
  })

  it("requires a short, non-empty user ID", () => {
    assert.throws(() => deriveIntentId("  ", account), /ID is required/)
    assert.throws(() => deriveIntentId("x".repeat(121), account), /120/)
  })
})
