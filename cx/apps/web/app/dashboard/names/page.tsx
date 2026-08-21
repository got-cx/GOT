import type { Metadata } from "next"

import { NamesDashboard } from "@/components/dashboard/names-dashboard"

export const metadata: Metadata = { title: "Names" }

export default function Page() {
  return <NamesDashboard />
}
