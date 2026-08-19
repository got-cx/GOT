import type { Metadata } from "next"

import { PublicRoute } from "@/components/public-route"

export const metadata: Metadata = { title: "Transfer" }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ route: string }>
  searchParams: Promise<{ intent?: string | string[] }>
}) {
  const { route } = await params
  const { intent } = await searchParams
  return (
    <PublicRoute
      route={decodeURIComponent(route)}
      intentPayload={typeof intent === "string" ? intent : null}
    />
  )
}
