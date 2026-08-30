import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

const publicRoute = readFileSync(
  new URL("../components/transfers/public-route.tsx", import.meta.url),
  "utf8"
)

describe("public transfer onchain state", () => {
  it("derives the remaining amount from the live Intent snapshot", () => {
    assert.match(publicRoute, /protocol\.readIntentSnapshots/)
    assert.match(publicRoute, /remainingTransferAmount/)
    assert.match(publicRoute, /chainQuery\.data\.totalProcessed/)
    assert.match(publicRoute, /chainQuery\.data\.balance/)
    assert.doesNotMatch(publicRoute, /address\.receivedAmount/)
  })

  it("refreshes the live state immediately before sending", () => {
    assert.match(publicRoute, /await chainQuery\.refetch\(\)/)
    assert.match(publicRoute, /refreshed\.data\.totalProcessed/)
    assert.match(publicRoute, /refreshed\.data\.balance/)
  })
})
