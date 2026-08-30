import { GOTAPIClient } from "@got-cx/sdk/api"

import { appConfig } from "@/lib/app-config"

let client: GOTAPIClient | undefined

export function getGOTClient(): GOTAPIClient {
  client ??= new GOTAPIClient({
    baseUrl: appConfig.apiUrl,
    credentials: appConfig.apiToken ? "omit" : "include",
    getAccessToken: () => appConfig.apiToken,
  })
  return client
}
