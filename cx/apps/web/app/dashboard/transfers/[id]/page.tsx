import type { Metadata } from "next"

import { TransferDetails } from "@/components/transfer-details"

export const metadata: Metadata = { title: "Transfer" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <TransferDetails intentAddress={id} />
}
