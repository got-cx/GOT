import type { Metadata } from "next"

import { NamesDashboard } from "@/components/names-dashboard"

export const metadata: Metadata = { title: "Names" }

export default function Page() {
  return <NamesDashboard />
}
