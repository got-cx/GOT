import type { Metadata } from "next"

import { AddressTabs } from "@/components/addresses/address-tabs"
import { NamesDashboard } from "@/components/dashboard/names-dashboard"
import { PageHeader } from "@/components/shared/page-header"

export const metadata: Metadata = { title: "Names" }

export default function Page() {
  return (
    <div>
      <PageHeader
        title="Addresses"
        description="Intent Addresses and human-readable GOT Names."
      />
      <AddressTabs active="names" />
      <NamesDashboard embedded />
    </div>
  )
}
