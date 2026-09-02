import { deriveIntentAddress } from "@got-cx/protocol/intent"
import {
  getAddress,
  keccak256,
  parseUnits,
  stringToHex,
  zeroAddress,
  zeroHash,
  type Hex,
} from "viem"

import { deriveIntentId, GOT_BASE_CHAIN_ID, GOT_BASE_USDC } from "./protocol"
import type {
  CreateIntentInput,
  CreatedIntent,
  IntentConfig,
  IntentMetadata,
  IntentMetadataValue,
} from "./types"

const MAX_REF_LENGTH = 120
const MAX_UINT32 = 2 ** 32 - 1
const MAX_UINT16 = 2 ** 16 - 1

function canonicalizeValue(
  value: unknown,
  seen: Set<object>,
  path: string
): string {
  if (value === null) return "null"
  if (typeof value === "string" || typeof value === "boolean") {
    return JSON.stringify(value)
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Metadata ${path} must contain a finite number.`)
    }
    return JSON.stringify(value)
  }
  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    throw new Error(`Metadata ${path} contains an unsupported value.`)
  }
  if (typeof value !== "object") {
    throw new Error(`Metadata ${path} contains an unsupported value.`)
  }
  if (seen.has(value)) throw new Error("Metadata must not contain cycles.")
  seen.add(value)
  try {
    if (Array.isArray(value)) {
      const entries: string[] = []
      for (let index = 0; index < value.length; index += 1) {
        if (!(index in value)) {
          throw new Error(`Metadata ${path}[${index}] must not be sparse.`)
        }
        entries.push(canonicalizeValue(value[index], seen, `${path}[${index}]`))
      }
      return `[${entries.join(",")}]`
    }

    const prototype = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Metadata ${path} must contain only plain objects.`)
    }
    const record = value as Record<string, unknown>
    return `{${Object.keys(record)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonicalizeValue(record[key], seen, `${path}.${key}`)}`
      )
      .join(",")}}`
  } finally {
    seen.delete(value)
  }
}

/** Canonical JSON used for immutable Intent metadata hashing. */
export function canonicalizeIntentMetadata(metadata: IntentMetadata): string {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    throw new Error("Metadata must be an object.")
  }
  return canonicalizeValue(metadata, new Set(), "metadata")
}

export function hashIntentMetadata(metadata?: IntentMetadata): Hex {
  return metadata === undefined
    ? zeroHash
    : keccak256(stringToHex(canonicalizeIntentMetadata(metadata)))
}

function validateInteger(value: number, field: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} is outside the supported range.`)
  }
}

export function normalizeIntentRef(ref: string): string {
  if (typeof ref !== "string") throw new Error("ref is required.")
  const normalized = ref.trim()
  if (!normalized) throw new Error("ref is required.")
  if (normalized.length > MAX_REF_LENGTH) {
    throw new Error(`ref must be ${MAX_REF_LENGTH} characters or fewer.`)
  }
  return normalized
}

/** Creates a canonical Intent and derives its Address synchronously and locally. */
export function createIntent(input: CreateIntentInput): CreatedIntent {
  if (!input || typeof input !== "object") {
    throw new Error("Intent input is required.")
  }
  const owner = getAddress(input.owner)
  const ref = normalizeIntentRef(input.ref)
  const token = getAddress(input.token ?? GOT_BASE_USDC)
  const decimals = input.tokenDecimals ?? 6
  validateInteger(decimals, "Token decimals", 255)
  const amount = parseUnits(input.amount?.trim() || "0", decimals)
  const deadline = input.deadline ?? 0
  const period = input.period ?? 0
  const feeBps = input.feeBps ?? 0
  validateInteger(deadline, "Deadline", Number.MAX_SAFE_INTEGER)
  validateInteger(period, "Period", MAX_UINT32)
  validateInteger(feeBps, "Fee", MAX_UINT16)

  const metadataHash = hashIntentMetadata(input.metadata)
  const config: IntentConfig = {
    intentId: deriveIntentId(ref, owner),
    ownerSource: owner,
    ownerKey: zeroHash,
    token,
    partner: getAddress(input.partner ?? zeroAddress),
    authorizedResolver: getAddress(input.authorizedResolver ?? zeroAddress),
    amount,
    initialDeadline: BigInt(deadline),
    period,
    feeBps,
    metadataHash,
  }
  const address = deriveIntentAddress(config)
  return {
    ref,
    intentId: config.intentId,
    metadata: input.metadata ?? null,
    metadataHash,
    address,
    chainId: GOT_BASE_CHAIN_ID,
    token,
    amount,
    config,
  }
}

export type { IntentMetadataValue }
export { deriveIntentAddress }
