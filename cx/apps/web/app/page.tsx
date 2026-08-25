import type { Metadata } from "next"

import { HomePage } from "@/components/home/home-page"

const title = "Accept onchain transfers now."
const description =
  "Create a transfer link. Share it anywhere. Receive USDC directly onchain."
const socialImageAlt = "got.cx — Accept onchain transfers now."

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://got.cx" },
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "got.cx",
    type: "website",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: socialImageAlt,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    site: "@got_cx",
    creator: "@got_cx",
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/twitter-image`,
        width: 1200,
        height: 630,
        alt: socialImageAlt,
      },
    ],
  },
}

export default function Page() {
  return <HomePage />
}
