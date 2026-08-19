import {
  decodeIntentEnvelope,
  encodeIntentEnvelope,
  type IntentEnvelope,
} from "@got-cx/sdk"

const storageKey = "got.intent-envelopes.v1"
const maximumSavedIntents = 100
const changeEvent = "got:intent-envelopes-changed"

export function getSavedIntentEnvelopeSnapshot(): string {
  if (typeof window === "undefined") return "[]"
  return window.localStorage.getItem(storageKey) ?? "[]"
}

export function subscribeSavedIntentEnvelopes(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey) listener()
  }
  window.addEventListener("storage", onStorage)
  window.addEventListener(changeEvent, listener)
  return () => {
    window.removeEventListener("storage", onStorage)
    window.removeEventListener(changeEvent, listener)
  }
}

function notifySavedIntentEnvelopes() {
  window.dispatchEvent(new Event(changeEvent))
}

export function loadSavedIntentEnvelopes(): IntentEnvelope[] {
  return parseSavedIntentEnvelopeSnapshot(getSavedIntentEnvelopeSnapshot())
}

export function parseSavedIntentEnvelopeSnapshot(
  snapshot: string
): IntentEnvelope[] {
  let values: unknown
  try {
    values = JSON.parse(snapshot)
  } catch {
    return []
  }
  if (!Array.isArray(values)) return []

  const envelopes: IntentEnvelope[] = []
  for (const value of values) {
    if (typeof value !== "string") continue
    try {
      envelopes.push(decodeIntentEnvelope(value))
    } catch {
      // Ignore corrupt local entries; imported links remain independently usable.
    }
  }
  return envelopes
}

export function saveIntentEnvelope(envelope: IntentEnvelope) {
  if (typeof window === "undefined") return
  const payload = encodeIntentEnvelope(envelope)
  const existing = loadSavedIntentEnvelopes().filter(
    (saved) =>
      saved.intentAddress.toLowerCase() !== envelope.intentAddress.toLowerCase()
  )
  const values = [
    payload,
    ...existing.map((saved) => encodeIntentEnvelope(saved)),
  ].slice(0, maximumSavedIntents)
  window.localStorage.setItem(storageKey, JSON.stringify(values))
  notifySavedIntentEnvelopes()
}

export function removeSavedIntentEnvelope(intentAddress: string) {
  if (typeof window === "undefined") return
  const values = loadSavedIntentEnvelopes()
    .filter(
      (saved) =>
        saved.intentAddress.toLowerCase() !== intentAddress.toLowerCase()
    )
    .map((saved) => encodeIntentEnvelope(saved))
  window.localStorage.setItem(storageKey, JSON.stringify(values))
  notifySavedIntentEnvelopes()
}
