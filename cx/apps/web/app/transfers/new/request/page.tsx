import type { Metadata } from "next"

import { RequestTransferForm } from "@/components/transfers/request-transfer-form"

export const metadata: Metadata = { title: "Request a transfer" }

export default function Page() {
  return <RequestTransferForm />
}
