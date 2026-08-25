import { createSocialPreviewImage } from "@/lib/social-preview"

export const alt = "got.cx — Accept onchain transfers now."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default function Image() {
  return createSocialPreviewImage(size)
}
