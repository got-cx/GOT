import type { Metadata } from "next"

import { AddressesDashboard } from "@/components/addresses/addresses-dashboard"

export const metadata: Metadata = { title: "Addresses" }

export default function Page() {
  return <AddressesDashboard />
}
