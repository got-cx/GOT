import { GOTClient } from "@got-cx/sdk"

import { appConfig } from "@/lib/app-config"

let client: GOTClient | undefined
const tokenStorageKey = "got.api-token"
const tokenListeners = new Set<() => void>()

export function getGOTAPIToken() {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(tokenStorageKey)
    if (stored !== null) return stored || null
  }
  return appConfig.apiToken
}

export function setGOTAPIToken(token: string | null) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(tokenStorageKey, token ?? "")
  for (const listener of tokenListeners) listener()
}

export function getServerGOTAPIToken() {
  return appConfig.apiToken
}

export function subscribeGOTAPIToken(listener: () => void) {
  tokenListeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    tokenListeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

export function getGOTClient(): GOTClient {
  if (client) return client
  client = new GOTClient({
    baseUrl: appConfig.apiUrl,
    getAccessToken: getGOTAPIToken,
  })
  return client
}
