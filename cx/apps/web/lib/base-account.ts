type BaseAccountInstance = ReturnType<
  (typeof import("@base-org/account/browser"))["createBaseAccountSDK"]
>

let instance: Promise<BaseAccountInstance> | null = null

export function getBaseAccount(): Promise<BaseAccountInstance> {
  if (typeof window === "undefined")
    throw new Error("Base Account is only available in the browser.")
  instance ??= import("@base-org/account/browser").then(
    ({ createBaseAccountSDK }) =>
      createBaseAccountSDK({
        appName: "GOT — Global Onchain Transfers",
        appChainIds: [8453],
      })
  )
  return instance
}
