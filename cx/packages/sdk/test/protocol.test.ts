import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { baseDeployment } from "@got-cx/protocol"
import { getAddress } from "viem"

import {
  createGOTProtocolClient,
  deriveIntentId,
  encodeResolveIntent,
  encodeSettleIntent,
  GOT_BASE_LENS,
  remainingTransferAmount,
  transferStatusFromChain,
} from "../src/protocol"
import { TransferStatus } from "../src/types"

const account = "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76"

describe("GOT Lens deployment", () => {
  it("requires the canonical protocol Lens for snapshot reads", () => {
    const client = createGOTProtocolClient()
    assert.equal(GOT_BASE_LENS, getAddress(baseDeployment.contracts.gotLens))
    assert.equal(client.deployment.lens, GOT_BASE_LENS)
    assert.equal("readIntentState" in client, false)
  })

  it("encodes distinct resolver and owner settlement entry points", () => {
    assert.equal(encodeResolveIntent().length, 10)
    assert.equal(encodeSettleIntent().length, 10)
    assert.notEqual(encodeResolveIntent(), encodeSettleIntent())
    assert.equal(typeof createGOTProtocolClient().simulateSettle, "function")
  })
})

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

describe("remaining transfer amount", () => {
  it("subtracts processed and pending funds from the target", () => {
    assert.equal(remainingTransferAmount(100n, 20n, 30n), 50n)
  })

  it("never asks for more once the target is funded", () => {
    assert.equal(remainingTransferAmount(100n, 100n, 0n), 0n)
    assert.equal(remainingTransferAmount(100n, 80n, 30n), 0n)
  })
})

describe("live transfer status", () => {
  it("reports received funding before the intent is resolved", () => {
    assert.equal(
      transferStatusFromChain(100n, 0n, 100n),
      TransferStatus.FundingDetected
    )
    assert.equal(transferStatusFromChain(100n, 0n, 40n), TransferStatus.Partial)
  })

  it("reports processed and overpaid transfers", () => {
    assert.equal(transferStatusFromChain(100n, 40n, 0n), TransferStatus.Partial)
    assert.equal(
      transferStatusFromChain(100n, 100n, 0n),
      TransferStatus.Settled
    )
    assert.equal(
      transferStatusFromChain(100n, 100n, 1n),
      TransferStatus.Overpaid
    )
  })
})
