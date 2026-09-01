import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const intent = readFileSync(
  new URL("../src/intent.ts", import.meta.url),
  "utf8"
)
const protocol = readFileSync(
  new URL("../src/protocol.ts", import.meta.url),
  "utf8"
)
const types = readFileSync(new URL("../src/types.ts", import.meta.url), "utf8")

describe("SDK hardening", () => {
  it("delegates deterministic address derivation to the protocol package", () => {
    assert.match(intent, /deriveIntentAddress.*@got-cx\/protocol/s)
    assert.doesNotMatch(
      intent,
      /getCreate2Address|cloneCreationCode|PROTOCOL_VERSION/
    )
  })

  it("removes request-era and transfer lifecycle helpers", () => {
    assert.doesNotMatch(
      protocol,
      /buildRequestIntent|createIntentId|randomHex32|transferStatusFromChain/
    )
    assert.doesNotMatch(types, /TransferStatus/)
  })

  it("preserves remaining amount and transaction-hash funding receipt helpers", () => {
    assert.match(protocol, /remainingTransferAmount/)
    assert.match(protocol, /readUSDCTransferReceipt/)
  })
})
