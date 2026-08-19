import type { Metadata } from "next"

import { DevelopersDashboard } from "@/components/developers-dashboard"

export const metadata: Metadata = { title: "Developers" }

export default function Page() {
  return <DevelopersDashboard />
}
