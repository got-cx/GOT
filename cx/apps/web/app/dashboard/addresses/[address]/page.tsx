import type { Metadata } from "next"

import { AddressDetails } from "@/components/addresses/address-details"

export const metadata: Metadata = { title: "Address" }

export default async function Page({
  params,
}: {
  params: Promise<{ address: string }>
}) {
  const { address } = await params
  return <AddressDetails intentAddress={address} />
}
