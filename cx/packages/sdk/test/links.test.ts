import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { formatGOTLink, parseGOTLink } from "../src/links"

const vectors = [
  [
    "@dima",
    "/@dima",
    "0x30a06aaeff91473d7ee33abc0fd5df8035d396a6e08eb8e897dc2f0e7c76017d",
  ],
  [
    "x:@vitalik",
    "/x:@vitalik",
    "0x0461b719c64cee37778c51d241ff9483fd7d9bef4988591915639d1f03cb9e7c",
  ],
  [
    "tg:@dima",
    "/tg:@dima",
    "0x87c11a9c517d43f19d31777500762d8ad70c05e5b504936ff0fd246a34c65cdf",
  ],
  [
    "alice@example.com",
    "/#email:alice@example.com",
    "0x3425d4006b9f3db86dbe07521c674f43120dd17e73e7d338dff954ac5202b822",
  ],
  [
    "+491234567890",
    "/#phone:+491234567890",
    "0x1e5212a74a3334ae59243952efcec237f894f7b448e58ba1bee84764aa369cde",
  ],
] as const

describe("GOT Links Model v1", () => {
  for (const [input, route, nameKey] of vectors) {
    it(`normalizes ${input}`, () => {
      const link = parseGOTLink(input)
      assert.equal(link.kind, "identity")
      assert.equal(link.route, route)
      assert.equal(link.nameKey, nameKey)
      assert.equal(formatGOTLink(link), `https://got.cx${route}`)
    })
  }

  it("keeps a 0x route as an intent address, not a name key", () => {
    const link = parseGOTLink("0x60700c99a58fD21022bf1f4d2b318C663e6F2E27")
    assert.equal(link.kind, "intent")
    assert.equal(link.nameKey, null)
    assert.equal(link.address, "0x60700c99a58fD21022bf1f4d2b318C663e6F2E27")
  })
})
