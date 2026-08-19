import type { Metadata } from "next"

import { OverviewDashboard } from "@/components/overview-dashboard"

export const metadata: Metadata = { title: "Overview" }

export default function Page() {
  return <OverviewDashboard />
}
