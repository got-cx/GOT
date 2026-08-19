import type { Metadata } from "next"

import { RequestCreated } from "@/components/request-created"

export const metadata: Metadata = { title: "Transfer request ready" }

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ intent?: string | string[] }>
}) {
  const { id } = await params
  const { intent } = await searchParams
  return (
    <RequestCreated
      transferId={id}
      intentPayload={typeof intent === "string" ? intent : null}
    />
  )
}
