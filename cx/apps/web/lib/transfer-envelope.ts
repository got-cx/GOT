import type { Transfer } from "@got-cx/sdk"

import { appConfig } from "@/lib/app-config"

export function transferLink(transfer: Transfer): string {
  return `${appConfig.siteUrl.replace(/\/$/, "")}/${transfer.intentAddress}`
}
