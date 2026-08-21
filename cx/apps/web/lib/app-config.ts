export const appConfig = {
  name: "GOT",
  description: "Global Onchain Transfers",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "https://got.cx",
  apiUrl: new URL(
    process.env.NEXT_PUBLIC_GOT_API_URL || "https://api.got.cx"
  ).origin,
  apiToken:
    process.env.NODE_ENV === "development"
      ? process.env.NEXT_PUBLIC_GOT_API_TOKEN || null
      : null,
  baseRpcUrl: process.env.NEXT_PUBLIC_BASE_RPC_URL || undefined,
} as const
