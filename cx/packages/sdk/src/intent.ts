import {
  baseDeployment,
  GOTIntentImplementationAddressByChainId,
} from "@got-cx/protocol"
import {
  concatHex,
  encodeAbiParameters,
  encodePacked,
  getAddress,
  getCreate2Address,
  isAddress,
  keccak256,
  parseUnits,
  stringToHex,
  toHex,
  zeroAddress,
  zeroHash,
  type Address,
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

const PROTOCOL_VERSION = keccak256(stringToHex("GOT_PROTOCOL_V0_3"))
const FACTORY = getAddress(baseDeployment.contracts.gotFactory)
const IMPLEMENTATION = getAddress(
  GOTIntentImplementationAddressByChainId[GOT_BASE_CHAIN_ID]!
)
const MAX_REF_LENGTH = 120
const MAX_UINT128 = (1n << 128n) - 1n
const MAX_UINT64 = (1n << 64n) - 1n
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

export function hashIntentConfig(config: IntentConfig): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "bytes32" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint128" },
        { type: "uint64" },
        { type: "uint32" },
        { type: "uint16" },
        { type: "bytes32" },
      ],
      [
        config.intentId,
        config.ownerSource,
        config.ownerKey,
        config.token,
        config.partner,
        config.authorizedResolver,
        config.amount,
        config.initialDeadline,
        config.period,
        config.feeBps,
        config.metadataHash,
      ]
    )
  )
}

function cloneCreationCode(config: IntentConfig): Hex {
  const immutableArgs = encodePacked(
    [
      "bytes32",
      "address",
      "bytes32",
      "address",
      "address",
      "address",
      "uint128",
      "uint64",
      "uint32",
      "uint16",
      "bytes32",
      "address",
    ],
    [
      config.intentId,
      config.ownerSource,
      config.ownerKey,
      config.token,
      config.partner,
      config.authorizedResolver,
      config.amount,
      config.initialDeadline,
      config.period,
      config.feeBps,
      config.metadataHash,
      FACTORY,
    ]
  )
  const argsLength = (immutableArgs.length - 2) / 2
  const extraLength = argsLength + 2
  const runtimeLength = 55 + extraLength
  return concatHex([
    "0x61",
    toHex(runtimeLength, { size: 2 }),
    "0x3d81600a3d39f3",
    "0x3d3d3d3d363d3d37",
    "0x61",
    toHex(extraLength, { size: 2 }),
    "0x6037363936",
    "0x61",
    toHex(extraLength, { size: 2 }),
    "0x013d73",
    IMPLEMENTATION,
    "0x5af43d3d93803e603557fd5bf3",
    immutableArgs,
    toHex(argsLength, { size: 2 }),
  ])
}

/** Pure local equivalent of GOTFactory.previewAddress for Protocol v0.3. */
export function deriveIntentAddress(config: IntentConfig): Address {
  validateIntentConfig(config)
  const salt = keccak256(
    encodeAbiParameters(
      [{ type: "bytes32" }, { type: "bytes32" }],
      [PROTOCOL_VERSION, hashIntentConfig(config)]
    )
  )
  return getAddress(
    getCreate2Address({
      from: FACTORY,
      salt,
      bytecodeHash: keccak256(cloneCreationCode(config)),
    })
  )
}

function validateInteger(value: number, field: string, maximum: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
    throw new Error(`${field} is outside the supported range.`)
  }
}

function validateIntentConfig(config: IntentConfig): void {
  if (
    !isAddress(config.ownerSource) ||
    getAddress(config.ownerSource) === zeroAddress
  ) {
    throw new Error("A valid owner is required.")
  }
  if (!isAddress(config.token) || getAddress(config.token) === zeroAddress) {
    throw new Error("A valid token is required.")
  }
  if (config.amount < 0n || config.amount > MAX_UINT128) {
    throw new Error("Amount is outside the protocol uint128 range.")
  }
  if (config.initialDeadline < 0n || config.initialDeadline > MAX_UINT64) {
    throw new Error("Deadline is outside the protocol uint64 range.")
  }
  validateInteger(config.period, "Period", MAX_UINT32)
  validateInteger(config.feeBps, "Fee", MAX_UINT16)
  if (config.feeBps > baseDeployment.constructorArguments.maxFeeBps) {
    throw new Error("Fee exceeds the canonical factory maximum.")
  }
  if (config.period !== 0 && config.initialDeadline === 0n) {
    throw new Error("A recurring Intent requires an initial deadline.")
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
