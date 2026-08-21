import type { Metadata } from "next"

import { PublicRoute } from "@/components/transfers/public-route"

export const metadata: Metadata = { title: "Transfer" }

export default async function Page({
  params,
}: {
  params: Promise<{ route: string }>
}) {
  const { route } = await params
  return <PublicRoute route={decodeURIComponent(route)} />
}
