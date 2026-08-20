import type { Metadata } from "next"

import { TransfersDashboard } from "@/components/transfers/transfers-dashboard"

export const metadata: Metadata = { title: "Transfers" }

export default function Page() {
  return <TransfersDashboard />
}
