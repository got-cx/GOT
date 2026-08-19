import assert from "node:assert/strict"
import { describe, it } from "node:test"

import {
  createIntentEnvelope,
  decodeIntentEnvelope,
  encodeIntentEnvelope,
  formatIntentEnvelopeLink,
  parseIntentEnvelopeLink,
  transferRequestFromEnvelope,
} from "../dist/intent-envelope.js"

const config = {
  intentId: `0x${"11".repeat(32)}`,
  ownerSource: "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76",
  ownerKey: `0x${"00".repeat(32)}`,
  token: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  partner: "0x0000000000000000000000000000000000000000",
  authorizedResolver: "0xafE0D4b0C259eb4826e40cD8Bc044759A357CE76",
  amount: 1_000_000n,
  initialDeadline: 0n,
  period: 0,
  feeBps: 0,
  metadataHash: `0x${"22".repeat(32)}`,
}

const intentAddress = "0xc40738b06f4dd0ca5e7638e6b07766faf1ee6b25"

describe("self-contained intent envelopes", () => {
  it("round-trips the complete config and display metadata", () => {
    const envelope = createIntentEnvelope({
      intentAddress,
      config,
      request: {
        recipient: "Díma 🌍",
        sender: null,
        reference: "invoice-1",
        note: "Спасибо",
        dueAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
      },
    })
    const payload = encodeIntentEnvelope(envelope)
    const decoded = decodeIntentEnvelope(payload)

    assert.deepEqual(decoded, envelope)
    assert.equal(decoded.config.intentId, config.intentId)
    assert.equal(decoded.config.authorizedResolver, config.authorizedResolver)
    assert.equal(decoded.request.note, "Спасибо")
  })

  it("formats and parses a recovery link", () => {
    const envelope = createIntentEnvelope({
      intentAddress,
      config,
      request: {
        recipient: config.ownerSource,
        sender: null,
        reference: null,
        note: null,
        dueAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
      },
    })
    const link = formatIntentEnvelopeLink(envelope, "http://localhost:3000")
    const parsed = parseIntentEnvelopeLink(link)

    assert.deepEqual(parsed, envelope)
    assert.match(link, /^http:\/\/localhost:3000\/0x/)
  })

  it("builds an API-independent transfer request", () => {
    const envelope = createIntentEnvelope({
      intentAddress,
      config,
      request: {
        recipient: config.ownerSource,
        sender: null,
        reference: null,
        note: null,
        dueAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
      },
    })
    const request = transferRequestFromEnvelope(envelope)

    assert.equal(request.intentAddress, envelope.intentAddress)
    assert.equal(request.value.amount, "1000000")
    assert.equal(request.intentConfig?.intentId, config.intentId)
  })

  it("rejects malformed recovery data", () => {
    assert.throws(() => decodeIntentEnvelope("not_base64!"), {
      name: "IntentEnvelopeError",
    })
  })

  it("rejects a request that allows permissionless settlement", () => {
    assert.throws(
      () =>
        createIntentEnvelope({
          intentAddress,
          config: {
            ...config,
            authorizedResolver:
              "0x0000000000000000000000000000000000000000",
          },
          request: {
            recipient: config.ownerSource,
            sender: null,
            reference: null,
            note: null,
            dueAt: null,
            createdAt: "2026-08-19T12:00:00.000Z",
          },
        }),
      { name: "IntentEnvelopeError" }
    )
  })

  it("rejects a route address that disagrees with the envelope", () => {
    const envelope = createIntentEnvelope({
      intentAddress,
      config,
      request: {
        recipient: config.ownerSource,
        sender: null,
        reference: null,
        note: null,
        dueAt: null,
        createdAt: "2026-08-19T12:00:00.000Z",
      },
    })
    const payload = encodeIntentEnvelope(envelope)
    assert.throws(
      () =>
        parseIntentEnvelopeLink(
          `https://got.cx/0x0000000000000000000000000000000000000001?intent=${payload}`
        ),
      { name: "IntentEnvelopeError" }
    )
  })
})
