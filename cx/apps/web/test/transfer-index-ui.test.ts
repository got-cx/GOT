import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { describe, it } from "node:test"

function source(path: string) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

describe("indexed Transfer dashboard UI", () => {
  it("shows all four indexed Overview values and recent Transfers", () => {
    const overview = source("components/dashboard/overview-dashboard.tsx")
    assert.match(overview, /data\.received/)
    assert.match(overview, /data\.addressCount/)
    assert.match(overview, /data\.transferCount/)
    assert.match(overview, /data\.subscriptionCount/)
    assert.match(overview, /Recent transfers/)
    assert.match(overview, /data\.recentTransfers/)
  })

  it("uses indexed totals in the Address list and renders Address history", () => {
    const list = source("components/addresses/addresses-dashboard.tsx")
    const details = source("components/addresses/address-details.tsx")
    assert.match(list, /address\.receivedAmount/)
    assert.match(details, /client\.addresses\.transfers/)
    assert.match(details, /showReference=\{false\}/)
  })

  it("links hashes to Basescan and provides the specified empty state", () => {
    const table = source("components/transfers/transfer-table.tsx")
    assert.match(
      table,
      /https:\/\/basescan\.org\/tx\/\$\{transfer\.transactionHash\}/
    )
    assert.match(table, /No transfers yet\./)
    assert.match(
      table,
      /Transfers received by your Intent Addresses will appear here\./
    )
  })
})
