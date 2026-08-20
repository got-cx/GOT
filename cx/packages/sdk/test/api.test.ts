import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { GOTAPIError, GOTClient } from "../src/api"
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

describe("GOTClient authentication transport", () => {
  it("keeps bearer authentication explicit and omits cookies by default", async () => {
    let request: FetchCall | undefined
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      getAccessToken: () => "got_live_test",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({
          transferVolume: { amount: "0", decimals: 6, symbol: "USDC" },
          transferCount: 0,
          pendingRequestCount: 0,
          recentTransfers: [],
          volumeSeries: [],
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
    const client = new GOTClient({
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
    const client = new GOTClient({
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

describe("GOTClient API errors", () => {
  it("preserves a user-safe API reason and error code", async () => {
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      fetch: async () =>
        jsonResponse(
          {
            error: {
              code: "transfer_id_conflict",
              message:
                "This transfer ID is already in use. Choose a different ID.",
            },
          },
          409
        ),
    })

    await assert.rejects(client.overview(), (error) => {
      assert.ok(error instanceof GOTAPIError)
      assert.equal(error.status, 409)
      assert.equal(error.code, "transfer_id_conflict")
      assert.equal(
        error.message,
        "This transfer ID is already in use. Choose a different ID."
      )
      return true
    })
  })

  it("sends transfer removals as authenticated JSON mutations", async () => {
    let request: FetchCall | undefined
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      credentials: "include",
      fetch: async (input, init) => {
        request = { input, init }
        return new Response(null, { status: 204 })
      },
    })

    await client.transfers.remove("transfer_1")

    assert.ok(request?.init)
    assert.equal(request.input, "https://api.got.cx/transfers/transfer_1")
    assert.equal(request.init.method, "DELETE")
    assert.equal(request.init.credentials, "include")
    assert.equal(
      new Headers(request.init.headers).get("Content-Type"),
      "application/json"
    )
    assert.deepEqual(JSON.parse(request.init.body as string), {})
  })

  it("submits a known funding transaction for verified API recording", async () => {
    let request: FetchCall | undefined
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({ id: "transfer_1" })
      },
    })
    const hash = `0x${"1".repeat(64)}`

    await client.transfers.recordFunding("transfer_1", hash)

    assert.ok(request?.init)
    assert.equal(
      request.input,
      "https://api.got.cx/transfers/transfer_1/funding"
    )
    assert.equal(request.init.method, "POST")
    assert.deepEqual(JSON.parse(request.init.body as string), {
      transactionHash: hash,
    })
  })

  it("requests a server-verified transfer state sync", async () => {
    let request: FetchCall | undefined
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      credentials: "include",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({ id: "transfer_1" })
      },
    })

    await client.transfers.sync("transfer_1")

    assert.ok(request?.init)
    assert.equal(request.input, "https://api.got.cx/transfers/transfer_1/sync")
    assert.equal(request.init.method, "POST")
    assert.equal(request.init.credentials, "include")
    assert.deepEqual(JSON.parse(request.init.body as string), {})
  })

  it("reports transfer state sync without a payload", async () => {
    let request: FetchCall | undefined
    const client = new GOTClient({
      baseUrl: "https://api.got.cx",
      indexerKey: "indexer_test_key",
      fetch: async (input, init) => {
        request = { input, init }
        return jsonResponse({ id: "transfer_1" })
      },
    })
    await client.transfers.sync("transfer_1")

    assert.ok(request?.init)
    assert.equal(request.input, "https://api.got.cx/transfers/transfer_1/sync")
    assert.equal(request.init.method, "POST")
    assert.equal(
      new Headers(request.init.headers).get("X-GOT-Indexer-Key"),
      "indexer_test_key"
    )
    assert.equal(request.init.body, undefined)
  })
})
