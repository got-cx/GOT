import {
  deriveNameKeyV1,
  normalizeGOTIdentity,
  type CanonicalGOTIdentity,
} from "@got-cx/protocol/nameKeys"
import { getAddress, isAddress, type Address, type Hex } from "viem"

export type GOTIdentityNamespace = "got" | "x" | "telegram" | "email" | "phone"

export type GOTLink =
  | {
      kind: "intent"
      address: Address
      canonicalIdentity: null
      nameKey: null
      route: `/${Address}`
    }
  | {
      kind: "identity"
      namespace: GOTIdentityNamespace
      identifier: string
      canonicalIdentity: CanonicalGOTIdentity
      nameKey: Hex
      route: string
    }

export class GOTLinkError extends Error {
  override readonly name = "GOTLinkError"
}

function splitIdentity(value: string): [GOTIdentityNamespace, string] {
  if (value.startsWith("x:")) return ["x", value.slice(2)]
  if (value.startsWith("tg:")) return ["telegram", value.slice(3)]
  if (value.startsWith("telegram:")) return ["telegram", value.slice(9)]
  if (value.startsWith("email:")) return ["email", value.slice(6)]
  if (value.startsWith("phone:")) return ["phone", value.slice(6)]
  if (value.startsWith("@")) return ["got", value.slice(1)]
  if (/^\+\d+$/.test(value)) return ["phone", value]
  if (value.includes("@")) return ["email", value]
  return ["got", value]
}

function toRoute(
  namespace: GOTIdentityNamespace,
  canonicalIdentifier: string
): string {
  switch (namespace) {
    case "got":
      return `/@${canonicalIdentifier}`
    case "x":
      return `/x:@${canonicalIdentifier}`
    case "telegram":
      return `/tg:@${canonicalIdentifier}`
    case "email":
      return `/#email:${canonicalIdentifier}`
    case "phone":
      return `/#phone:${canonicalIdentifier}`
  }
}

function unwrapInput(input: string): string {
  const value = input.trim().normalize("NFC")
  if (!value)
    throw new GOTLinkError(
      "Enter a GOT name, social handle, email, phone, or address."
    )

  if (/^https?:\/\//i.test(value)) {
    let url: URL
    try {
      url = new URL(value)
    } catch {
      throw new GOTLinkError("This GOT link is not a valid URL.")
    }
    if (url.hostname !== "got.cx" && url.hostname !== "www.got.cx") {
      throw new GOTLinkError("Only got.cx links are supported.")
    }
    return url.hash
      ? url.hash.slice(1)
      : decodeURIComponent(url.pathname.slice(1))
  }

  return value
    .replace(/^got\.cx\//i, "")
    .replace(/^\//, "")
    .replace(/^#/, "")
}

export function parseGOTLink(input: string): GOTLink {
  const value = unwrapInput(input)

  if (value.startsWith("0x")) {
    if (!isAddress(value, { strict: false })) {
      throw new GOTLinkError(
        "A transfer link must contain a valid 20-byte address."
      )
    }
    const address = getAddress(value)
    return {
      kind: "intent",
      address,
      canonicalIdentity: null,
      nameKey: null,
      route: `/${address}`,
    }
  }

  const [namespace, identifier] = splitIdentity(value)

  try {
    const canonicalIdentity = normalizeGOTIdentity(namespace, identifier)
    const canonicalIdentifier = canonicalIdentity.slice(
      canonicalIdentity.lastIndexOf(":") + 1
    )
    return {
      kind: "identity",
      namespace,
      identifier: canonicalIdentifier,
      canonicalIdentity,
      nameKey: deriveNameKeyV1(namespace, identifier),
      route: toRoute(namespace, canonicalIdentifier),
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "The recipient identifier is invalid."
    throw new GOTLinkError(message)
  }
}

export function formatGOTLink(
  link: GOTLink,
  origin = "https://got.cx"
): string {
  return `${origin.replace(/\/$/, "")}${link.route}`
}

export function formatIdentityLabel(
  link: Extract<GOTLink, { kind: "identity" }>
): string {
  switch (link.namespace) {
    case "got":
      return `@${link.identifier}`
    case "x":
      return `x:@${link.identifier}`
    case "telegram":
      return `tg:@${link.identifier}`
    default:
      return link.identifier
  }
}
