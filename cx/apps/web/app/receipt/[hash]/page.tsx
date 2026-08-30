import type { Metadata } from "next"

import { Receipt } from "@/components/transfers/receipt"

export const metadata: Metadata = { title: "Transfer receipt" }

export default async function Page({
  params,
}: {
  params: Promise<{ hash: string }>
}) {
  const { hash } = await params
  return <Receipt transactionHash={hash} />
}
