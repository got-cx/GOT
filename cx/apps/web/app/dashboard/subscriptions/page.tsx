import type { Metadata } from "next"

import { SubscriptionsDashboard } from "@/components/subscriptions-dashboard"

export const metadata: Metadata = { title: "Subscriptions" }

export default function Page() {
  return <SubscriptionsDashboard />
}
