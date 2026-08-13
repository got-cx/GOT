import { normalize as normalizeEnsName } from "viem/ens";
import { keccak256, stringToHex, type Hex } from "viem";

declare const canonicalIdentityBrand: unique symbol;

export type CanonicalGOTIdentity = string & { readonly [canonicalIdentityBrand]: true };

export const GOT_NAME_KEY_NORMALIZATION_VERSION = "got-links-v1" as const;

const BUILT_IN_NAMESPACES = new Set(["got", "x", "telegram", "email", "phone", "ens", "github", "domain"]);
const CUSTOM_NAMESPACE = /^custom:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const GOT_HANDLE = /^[\p{L}\p{N}](?:[\p{L}\p{N}._-]{0,62}[\p{L}\p{N}])?$/u;
const HANDLE_PATTERNS: Readonly<Record<string, RegExp>> = {
  x: /^[a-z0-9_]{1,15}$/,
  telegram: /^[a-z0-9_]{1,32}$/,
  github: /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/,
};
const EMAIL_LOCAL_PART = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*$/;
const CUSTOM_IDENTIFIER = /^[A-Za-z0-9](?:[A-Za-z0-9._~-]{0,126}[A-Za-z0-9])?$/;

function normalizeNamespace(namespace: string): string {
  let normalized = namespace.trim().toLowerCase();
  if (normalized === "tg") normalized = "telegram";
  if (BUILT_IN_NAMESPACES.has(normalized) || CUSTOM_NAMESPACE.test(normalized)) return normalized;
  throw new Error("unsupported GOT identity namespace");
}

function normalizeHandle(namespace: string, identifier: string): string {
  let normalized = identifier;
  if (normalized.startsWith("@")) normalized = normalized.slice(1);
  normalized = normalized.toLowerCase().normalize("NFC");
  if (normalized.includes("@")) throw new Error(`invalid ${namespace} handle`);

  if (namespace === "got") {
    if ([...normalized].length > 64 || !GOT_HANDLE.test(normalized)) throw new Error("invalid got handle");
  } else {
    const pattern = HANDLE_PATTERNS[namespace];
    if (pattern === undefined || !pattern.test(normalized)) throw new Error(`invalid ${namespace} handle`);
    if (namespace === "github" && normalized.includes("--")) throw new Error("invalid github handle");
  }
  return normalized;
}

function normalizeDomain(identifier: string): string {
  const unicodeDomain = identifier.toLowerCase().normalize("NFC");
  if (unicodeDomain.endsWith(".") || /[\s/:@?#\\%]/u.test(unicodeDomain)) {
    throw new Error("invalid GOT domain identity");
  }

  let asciiDomain: string;
  try {
    asciiDomain = new URL(`http://${unicodeDomain}`).hostname.toLowerCase();
  } catch {
    throw new Error("invalid GOT domain identity");
  }

  const labels = asciiDomain.split(".");
  if (
    asciiDomain.length > 253 ||
    labels.length < 2 ||
    labels.some((label) => label.length === 0 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  ) {
    throw new Error("invalid GOT domain identity");
  }
  return asciiDomain;
}

function normalizeEmail(identifier: string): string {
  const firstAt = identifier.indexOf("@");
  if (firstAt <= 0 || firstAt !== identifier.lastIndexOf("@")) {
    throw new Error("invalid GOT email identity");
  }

  const localPart = identifier.slice(0, firstAt);
  if (localPart.length > 64 || !EMAIL_LOCAL_PART.test(localPart)) {
    throw new Error("invalid GOT email identity");
  }
  return `${localPart}@${normalizeDomain(identifier.slice(firstAt + 1))}`;
}

/** Builds the injective canonical identity string defined by GOT Links Model v1. */
export function normalizeGOTIdentity(namespace: string, identifier: string): CanonicalGOTIdentity {
  const normalizedNamespace = normalizeNamespace(namespace);
  let normalizedIdentifier = identifier.trim().normalize("NFC");
  if (normalizedIdentifier.length === 0 || normalizedIdentifier.includes(":")) {
    throw new Error("invalid GOT identity identifier");
  }

  if (normalizedNamespace === "got" || normalizedNamespace in HANDLE_PATTERNS) {
    normalizedIdentifier = normalizeHandle(normalizedNamespace, normalizedIdentifier);
  } else if (normalizedNamespace === "email") {
    normalizedIdentifier = normalizeEmail(normalizedIdentifier);
  } else if (normalizedNamespace === "phone") {
    if (!/^\+[1-9]\d{7,14}$/.test(normalizedIdentifier)) {
      throw new Error("GOT phone identities must use E.164");
    }
  } else if (normalizedNamespace === "ens") {
    try {
      normalizedIdentifier = normalizeEnsName(normalizedIdentifier);
    } catch {
      throw new Error("invalid GOT ENS identity");
    }
    if (!normalizedIdentifier.includes(".")) throw new Error("invalid GOT ENS identity");
  } else if (normalizedNamespace === "domain") {
    normalizedIdentifier = normalizeDomain(normalizedIdentifier);
  } else if (!CUSTOM_IDENTIFIER.test(normalizedIdentifier)) {
    throw new Error("invalid GOT custom identity");
  }

  return `${normalizedNamespace}:${normalizedIdentifier}` as CanonicalGOTIdentity;
}

/** Validates that a string is already canonical GOT Links Model v1 data. */
export function parseCanonicalGOTIdentity(value: string): CanonicalGOTIdentity {
  const parts = value.split(":");
  const isCustom = parts[0] === "custom";
  if ((!isCustom && parts.length !== 2) || (isCustom && parts.length !== 3)) {
    throw new Error("invalid canonical GOT identity");
  }

  const namespace = isCustom ? `${parts[0]}:${parts[1]}` : parts[0];
  const identifier = parts.at(-1) ?? "";
  const canonical = normalizeGOTIdentity(namespace, identifier);
  if (canonical !== value) throw new Error("GOT identity is not canonical");
  return canonical;
}

/** Hashes a validated canonical Links Model identity such as `email:alice@example.com`. */
export function deriveIdentifierKey(canonicalIdentity: CanonicalGOTIdentity): Hex {
  return keccak256(stringToHex(canonicalIdentity));
}

/** Normalizes a Links Model namespace/identifier pair and derives its GOTName key. */
export function deriveNameKeyV1(namespace: string, identifier: string): Hex {
  return deriveIdentifierKey(normalizeGOTIdentity(namespace, identifier));
}
