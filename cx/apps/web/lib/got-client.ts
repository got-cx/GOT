import { GOTClient } from "@got-cx/sdk"

import { appConfig } from "@/lib/app-config"

let client: GOTClient | undefined

export function getGOTClient(): GOTClient {
  client ??= new GOTClient({
    baseUrl: appConfig.apiUrl,
    credentials: appConfig.apiToken ? "omit" : "include",
    getAccessToken: () => appConfig.apiToken,
  })
  return client
}
