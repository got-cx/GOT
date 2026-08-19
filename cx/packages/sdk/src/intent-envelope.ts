import {
  getAddress,
  isAddress,
  zeroAddress,
  type Address,
  type Hex,
} from "viem"

import { GOT_BASE_CHAIN_ID, GOT_BASE_USDC } from "./protocol"
import type {
  IntentConfig,
  IntentEnvelope,
  IntentEnvelopeRequest,
  SerializedIntentConfig,
  TransferRequest,
} from "./types"

export const INTENT_ENVELOPE_QUERY_PARAM = "intent"
export const INTENT_ENVELOPE_VERSION = 1

const MAX_ENVELOPE_LENGTH = 12_000
const MAX_TEXT_LENGTH = 2_000
const bytes32Pattern = /^0x[0-9a-fA-F]{64}$/
const uintPattern = /^(0|[1-9][0-9]*)$/

type IntentEnvelopeWire = {
  version: 1
  chainId: 8453
  intentAddress: string
  config: SerializedIntentConfig
  request: IntentEnvelopeRequest
}

export class IntentEnvelopeError extends Error {
  override readonly name = "IntentEnvelopeError"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function requireText(
  value: unknown,
  label: string,
  options: { nullable?: boolean; empty?: boolean } = {}
): string | null {
  if (options.nullable && value === null) return null
  if (typeof value !== "string")
    throw new IntentEnvelopeError(`${label} must be text.`)
  if (!options.empty && !value.trim())
    throw new IntentEnvelopeError(`${label} is required.`)
  if (value.length > MAX_TEXT_LENGTH)
    throw new IntentEnvelopeError(`${label} is too long.`)
  return value
}

function requireAddress(value: unknown, label: string): Address {
  if (typeof value !== "string" || !isAddress(value, { strict: false }))
    throw new IntentEnvelopeError(`${label} must be a valid address.`)
  return getAddress(value)
}

function requireBytes32(value: unknown, label: string): Hex {
  if (typeof value !== "string" || !bytes32Pattern.test(value))
    throw new IntentEnvelopeError(`${label} must be 32 bytes.`)
  return value.toLowerCase() as Hex
}

function requireUint(value: unknown, label: string, maximum: bigint): bigint {
  if (typeof value !== "string" || !uintPattern.test(value))
    throw new IntentEnvelopeError(`${label} must be an unsigned integer.`)
  const parsed = BigInt(value)
  if (parsed > maximum)
    throw new IntentEnvelopeError(`${label} is outside its supported range.`)
  return parsed
}

function requireNumber(value: unknown, label: string, maximum: number): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > maximum
  )
    throw new IntentEnvelopeError(`${label} is outside its supported range.`)
  return value
}

function parseConfig(value: unknown): IntentConfig {
  if (!isRecord(value))
    throw new IntentEnvelopeError("Intent configuration is missing.")

  return {
    intentId: requireBytes32(value.intentId, "Intent ID"),
    ownerSource: requireAddress(value.ownerSource, "Owner source"),
    ownerKey: requireBytes32(value.ownerKey, "Owner key"),
    token: requireAddress(value.token, "Token"),
    partner: requireAddress(value.partner, "Partner"),
    authorizedResolver: requireAddress(
      value.authorizedResolver,
      "Authorized resolver"
    ),
    amount: requireUint(value.amount, "Amount", (1n << 128n) - 1n),
    initialDeadline: requireUint(
      value.initialDeadline,
      "Initial deadline",
      (1n << 64n) - 1n
    ),
    period: requireNumber(value.period, "Period", 2 ** 32 - 1),
    feeBps: requireNumber(value.feeBps, "Fee", 10_000),
    metadataHash: requireBytes32(value.metadataHash, "Metadata hash"),
  }
}

function parseRequest(value: unknown): IntentEnvelopeRequest {
  if (!isRecord(value))
    throw new IntentEnvelopeError("Transfer request details are missing.")
  const recipient = requireText(value.recipient, "Recipient")
  const createdAt = requireText(value.createdAt, "Creation date")
  const sender = requireText(value.sender, "Sender", {
    nullable: true,
    empty: true,
  })
  const reference = requireText(value.reference, "Reference", {
    nullable: true,
    empty: true,
  })
  const note = requireText(value.note, "Note", {
    nullable: true,
    empty: true,
  })
  const dueAt = requireText(value.dueAt, "Due date", {
    nullable: true,
    empty: true,
  })
  if (Number.isNaN(Date.parse(createdAt as string)))
    throw new IntentEnvelopeError("Creation date is invalid.")
  if (dueAt !== null && Number.isNaN(Date.parse(dueAt)))
    throw new IntentEnvelopeError("Due date is invalid.")

  return {
    recipient: recipient as string,
    sender,
    reference,
    note,
    dueAt,
    createdAt: createdAt as string,
  }
}

function serializeConfig(config: IntentConfig): SerializedIntentConfig {
  return {
    ...config,
    amount: config.amount.toString(),
    initialDeadline: config.initialDeadline.toString(),
  }
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function base64UrlToBytes(value: string): Uint8Array {
  if (
    !value ||
    value.length > MAX_ENVELOPE_LENGTH ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  )
    throw new IntentEnvelopeError(
      "The self-contained transfer data is invalid."
    )
  const padded = `${value.replace(/-/g, "+").replace(/_/g, "/")}${"=".repeat(
    (4 - (value.length % 4)) % 4
  )}`
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    throw new IntentEnvelopeError(
      "The self-contained transfer data is invalid."
    )
  }
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

export function createIntentEnvelope(input: {
  intentAddress: Address
  config: IntentConfig
  request: IntentEnvelopeRequest
}): IntentEnvelope {
  return decodeIntentEnvelope(
    encodeIntentEnvelope({
      version: INTENT_ENVELOPE_VERSION,
      chainId: GOT_BASE_CHAIN_ID,
      ...input,
    })
  )
}

export function encodeIntentEnvelope(envelope: IntentEnvelope): string {
  const wire: IntentEnvelopeWire = {
    version: envelope.version,
    chainId: envelope.chainId,
    intentAddress: envelope.intentAddress,
    config: serializeConfig(envelope.config),
    request: envelope.request,
  }
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(wire)))
}

export function decodeIntentEnvelope(payload: string): IntentEnvelope {
  let value: unknown
  try {
    value = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(
        base64UrlToBytes(payload)
      )
    )
  } catch (error) {
    if (error instanceof IntentEnvelopeError) throw error
    throw new IntentEnvelopeError(
      "The self-contained transfer data is invalid."
    )
  }
  if (!isRecord(value))
    throw new IntentEnvelopeError(
      "The self-contained transfer data is invalid."
    )
  if (value.version !== INTENT_ENVELOPE_VERSION)
    throw new IntentEnvelopeError(
      "This transfer-link version is not supported."
    )
  if (value.chainId !== GOT_BASE_CHAIN_ID)
    throw new IntentEnvelopeError("This transfer is not for Base mainnet.")

  const intentAddress = requireAddress(value.intentAddress, "Intent address")
  const config = parseConfig(value.config)
  if (getAddress(config.token) !== GOT_BASE_USDC)
    throw new IntentEnvelopeError(
      "This transfer does not use canonical Base USDC."
    )
  if (getAddress(config.authorizedResolver) === zeroAddress)
    throw new IntentEnvelopeError(
      "This transfer is not restricted to its requesting account."
    )
  if (config.amount === 0n)
    throw new IntentEnvelopeError("Transfer amount must be greater than zero.")

  return {
    version: INTENT_ENVELOPE_VERSION,
    chainId: GOT_BASE_CHAIN_ID,
    intentAddress,
    config,
    request: parseRequest(value.request),
  }
}

export function formatIntentEnvelopeLink(
  envelope: IntentEnvelope,
  origin = "https://got.cx"
): string {
  const url = new URL(`/${envelope.intentAddress}`, origin.replace(/\/$/, ""))
  url.searchParams.set(
    INTENT_ENVELOPE_QUERY_PARAM,
    encodeIntentEnvelope(envelope)
  )
  return url.toString()
}

export function parseIntentEnvelopeLink(input: string): IntentEnvelope {
  const value = input.trim()
  if (!value)
    throw new IntentEnvelopeError("Enter a self-contained transfer link.")
  if (!/^https?:\/\//i.test(value)) return decodeIntentEnvelope(value)

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new IntentEnvelopeError("The transfer link is not a valid URL.")
  }
  const payload = url.searchParams.get(INTENT_ENVELOPE_QUERY_PARAM)
  if (!payload)
    throw new IntentEnvelopeError(
      "The transfer link does not contain recovery data."
    )
  const envelope = decodeIntentEnvelope(payload)
  const routeAddress = url.pathname.split("/").filter(Boolean).at(-1)
  if (
    routeAddress &&
    isAddress(routeAddress, { strict: false }) &&
    getAddress(routeAddress) !== envelope.intentAddress
  ) {
    throw new IntentEnvelopeError(
      "The transfer link address does not match its recovery data."
    )
  }
  return envelope
}

export function transferRequestFromEnvelope(
  envelope: IntentEnvelope
): TransferRequest {
  const amount = envelope.config.amount.toString()
  return {
    id: envelope.intentAddress,
    chainId: envelope.chainId,
    direction: "incoming",
    party: envelope.request.sender ?? "Anyone",
    recipient: envelope.request.recipient,
    sender: envelope.request.sender,
    value: { amount, decimals: 6, symbol: "USDC" },
    recipientTargetAmount: amount,
    grossQuotedAmount: amount,
    processedAmount: "0",
    ownerAmount: amount,
    feeAmount: "0",
    reference: envelope.request.reference,
    note: envelope.request.note,
    createdAt: envelope.request.createdAt,
    dueAt: envelope.request.dueAt,
    status: "address_ready",
    intentAddress: envelope.intentAddress,
    transactionHash: null,
    token: envelope.config.token,
    intentConfig: serializeConfig(envelope.config),
  }
}
