import type { Metadata } from "next"

import { RequestCreated } from "@/components/transfers/request-created"

export const metadata: Metadata = { title: "Transfer request ready" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <RequestCreated transferId={id} />
}
