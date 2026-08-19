import type { Metadata } from "next"

import { SettingsDashboard } from "@/components/settings-dashboard"

export const metadata: Metadata = { title: "Settings" }

export default function Page() {
  return <SettingsDashboard />
}
