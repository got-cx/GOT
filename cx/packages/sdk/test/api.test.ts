import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { GOTAPIClient, GOTAPIError } from "../src/api"
import type { APIAuth } from "../src/types"

const auth = {
  session: {
    address: "0x0000000000000000000000000000000000000001",
    expiresAt: null,
  },
  workspace: {
    id: "workspace_1",
    name: "Test",
    planName: "Developer",
    account: "0x0000000000000000000000000000000000000001",
  },
} satisfies APIAuth

type FetchCall = {
  input: Parameters<typeof fetch>[0]
  init: Parameters<typeof fetch>[1]
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("GOTAPIClient authentication transport", () => {
  it("keeps bearer authentication explicit and omits cookies by default", async () => {
    let request: FetchCall | undefined
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      getAccessToken: () => "got_live_test",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({
          received: { amount: "0", decimals: 6, symbol: "USDC" },
          processed: { amount: "0", decimals: 6, symbol: "USDC" },
          addressCount: 0,
          transferCount: 0,
          subscriptionCount: 0,
          recentTransfers: [],
        })
      },
    })

    await client.overview()

    assert.ok(request)
    assert.ok(request.init)
    assert.equal(request.input, "https://api.got.cx/overview")
    assert.equal(request.init.credentials, "omit")
    assert.equal(
      new Headers(request.init.headers).get("Authorization"),
      "Bearer got_live_test"
    )
  })

  it("requests cookie delivery without exposing a token in the response", async () => {
    let request: FetchCall | undefined
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse(auth)
      },
    })

    const result = await client.auth.token({
      address: auth.session.address,
      message: "Sign in",
      nonce: "nonce",
      signature: "0xsignature",
      delivery: "cookie",
    })

    assert.deepEqual(result, auth)
    assert.ok(request)
    assert.ok(request.init)
    assert.equal(request.input, "https://api.got.cx/auth/token")
    assert.equal(request.init.credentials, "include")
    assert.equal(JSON.parse(request.init.body as string).delivery, "cookie")
    assert.equal(new Headers(request.init.headers).has("Authorization"), false)
  })

  it("uses credentialed requests for cookie sessions and logout", async () => {
    const requests: FetchCall[] = []
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      credentials: "include",
      fetch: async (input, init) => {
        requests.push({ input, init })
        if (String(input).endsWith("/auth/logout"))
          return new Response(null, { status: 204 })
        return jsonResponse(auth)
      },
    })

    await client.auth.session()
    await client.auth.logout()

    const [sessionRequest, logoutRequest] = requests
    assert.ok(sessionRequest?.init)
    assert.ok(logoutRequest?.init)
    assert.equal(sessionRequest.init.credentials, "include")
    assert.equal(logoutRequest.input, "https://api.got.cx/auth/logout")
    assert.equal(logoutRequest.init.method, "POST")
    assert.equal(logoutRequest.init.credentials, "include")
    assert.equal(
      new Headers(logoutRequest.init.headers).get("Content-Type"),
      "application/json"
    )
    assert.deepEqual(JSON.parse(logoutRequest.init.body as string), {})
  })
})

describe("GOTAPIClient API errors", () => {
  it("constructs the hosted API client", () => {
    assert.ok(new GOTAPIClient({ baseUrl: "https://api.got.cx" }))
  })

  it("creates and looks up persisted Intent Addresses", async () => {
    const requests: FetchCall[] = []
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      fetch: async (input, init) => {
        requests.push({ input, init })
        return jsonResponse({ id: "address_1" })
      },
    })
    await client.addresses.create({ ref: "customer:123" })
    await client.addresses.getByIntentAddress(
      "0x0000000000000000000000000000000000000001"
    )
    assert.equal(requests[0]?.input, "https://api.got.cx/addresses")
    assert.equal(requests[0]?.init?.method, "POST")
    assert.equal(
      requests[1]?.input,
      "https://api.got.cx/addresses/by-intent-address/0x0000000000000000000000000000000000000001"
    )
  })

  it("archives Addresses and keeps remove as a non-destructive alias", async () => {
    const requests: FetchCall[] = []
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      fetch: async (input, init) => {
        requests.push({ input, init })
        return new Response(null, { status: 204 })
      },
    })
    await client.addresses.archive("address_1")
    await client.addresses.remove("address_2")
    assert.deepEqual(
      requests.map((request) => [request.input, request.init?.method]),
      [
        ["https://api.got.cx/addresses/address_1", "DELETE"],
        ["https://api.got.cx/addresses/address_2", "DELETE"],
      ]
    )
  })

  it("preserves a user-safe API reason and error code", async () => {
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      fetch: async () =>
        jsonResponse(
          {
            error: {
              code: "address_conflict",
              message: "This Address conflicts with existing hosted data.",
            },
          },
          409
        ),
    })

    await assert.rejects(client.overview(), (error) => {
      assert.ok(error instanceof GOTAPIError)
      assert.equal(error.status, 409)
      assert.equal(error.code, "address_conflict")
      assert.equal(
        error.message,
        "This Address conflicts with existing hosted data."
      )
      return true
    })
  })

  it("lists indexed Transfers with cursor pagination", async () => {
    let request: FetchCall | undefined
    const client = new GOTAPIClient({
      baseUrl: "https://api.got.cx",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({ items: [], nextCursor: null })
      },
    })

    await client.transfers.list({ cursor: "100|2|3", limit: 10 })

    assert.ok(request?.init)
    assert.equal(
      request.input,
      "https://api.got.cx/transfers?cursor=100%7C2%7C3&limit=10"
    )
    assert.equal(request.init.method, undefined)
  })
})
