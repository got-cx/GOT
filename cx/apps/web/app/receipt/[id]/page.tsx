import type { Metadata } from "next"
import { Suspense } from "react"

import { Receipt } from "@/components/transfers/receipt"

export const metadata: Metadata = { title: "Transfer receipt" }

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense fallback={<main className="min-h-svh animate-pulse bg-muted" />}>
      <Receipt transferId={id} />
    </Suspense>
  )
}
