import type { APIAuth, APIAuthToken } from "@got-cx/sdk"
import { getAddress, stringToHex } from "viem"

import { getBaseAccount } from "@/lib/base-account"
import { getGOTClient } from "@/lib/got-client"

async function signAuthenticationChallenge() {
  const provider = (await getBaseAccount()).getProvider()
  const accounts = await provider.request({ method: "eth_requestAccounts" })
  if (!Array.isArray(accounts) || typeof accounts[0] !== "string") {
    throw new Error("Base Account did not return an account address.")
  }

  const address = getAddress(accounts[0])
  const challenge = await getGOTClient().auth.nonce(address)
  const signature = await provider.request({
    method: "personal_sign",
    params: [stringToHex(challenge.message), address],
  })
  if (typeof signature !== "string") {
    throw new Error("Base Account did not return a signature.")
  }

  return {
    address,
    message: challenge.message,
    nonce: challenge.nonce,
    signature,
  }
}

export async function createCookieSession(): Promise<APIAuth> {
  const credentials = await signAuthenticationChallenge()
  return getGOTClient().auth.token({
    ...credentials,
    delivery: "cookie",
  })
}

export async function requestBearerToken(options?: {
  rotate?: boolean
}): Promise<APIAuthToken> {
  const credentials = await signAuthenticationChallenge()
  return getGOTClient().auth.token({
    ...credentials,
    delivery: "bearer",
    rotate: options?.rotate,
  })
}
