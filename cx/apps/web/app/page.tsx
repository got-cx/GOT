import type { Metadata } from "next"

import { HomePage } from "@/components/home-page"

export const metadata: Metadata = { title: "Global transfers for Everyone" }

export default function Page() {
  return <HomePage />
}
