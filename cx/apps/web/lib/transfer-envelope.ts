import {
  createIntentEnvelope,
  deserializeIntentConfig,
  formatIntentEnvelopeLink,
  type IntentEnvelope,
  type Transfer,
} from "@got-cx/sdk"

import { appConfig } from "@/lib/app-config"

export function envelopeFromTransfer(
  transfer: Transfer
): IntentEnvelope | null {
  if (
    transfer.direction !== "incoming" ||
    !transfer.intentConfig ||
    !transfer.recipient
  ) {
    return null
  }

  try {
    return createIntentEnvelope({
      intentAddress: transfer.intentAddress,
      config: deserializeIntentConfig(transfer.intentConfig),
      request: {
        recipient: transfer.recipient,
        sender: transfer.sender ?? null,
        reference: transfer.reference,
        note: transfer.note,
        dueAt: transfer.dueAt ?? null,
        createdAt: transfer.createdAt,
      },
    })
  } catch {
    return null
  }
}

export function transferPaymentLink(transfer: Transfer): string {
  const envelope = envelopeFromTransfer(transfer)
  if (envelope) return formatIntentEnvelopeLink(envelope, appConfig.siteUrl)
  return `${appConfig.siteUrl.replace(/\/$/, "")}/${transfer.intentAddress}`
}
