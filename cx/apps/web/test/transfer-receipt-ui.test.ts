import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

describe("onchain Transfer receipt", () => {
  it("navigates with only the transaction hash", () => {
    const transfer = source("components/transfers/public-route.tsx")
    assert.match(transfer, /router\.push\(`\/receipt\/\$\{hash\}`\)/)
    assert.doesNotMatch(transfer, /receiptParams|URLSearchParams/)
  })

  it("loads receipt data from the confirmed Base transaction", () => {
    const page = source("app/receipt/[hash]/page.tsx")
    const receipt = source("components/transfers/receipt.tsx")
    assert.doesNotMatch(page, /searchParams/)
    assert.match(page, /<Receipt transactionHash=\{hash\}/)
    assert.match(receipt, /readUSDCTransferReceipt/)
    assert.match(receipt, /receipt\.amount/)
    assert.match(receipt, /receipt\.intentAddress/)
    assert.match(receipt, /receipt\.sender/)
    assert.match(receipt, /receipt\.confirmedAt/)
  })

  it("supports smart-wallet transactions by decoding the USDC event", () => {
    const protocol = readFileSync(
      new URL("../../../packages/sdk/src/protocol.ts", import.meta.url),
      "utf8"
    )
    assert.match(protocol, /receipt\.logs\.flatMap/)
    assert.match(protocol, /getAddress\(event\.args\.from\)/)
    assert.doesNotMatch(protocol, /transaction\.to/)
  })
})
