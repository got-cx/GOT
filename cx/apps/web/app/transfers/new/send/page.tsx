import type { Metadata } from "next"
import { Suspense } from "react"

import { SendTransferForm } from "@/components/send-transfer-form"

export const metadata: Metadata = { title: "Create a transfer" }

export default function Page() {
  return (
    <Suspense fallback={<main className="min-h-svh animate-pulse bg-muted" />}>
      <SendTransferForm />
    </Suspense>
  )
}
