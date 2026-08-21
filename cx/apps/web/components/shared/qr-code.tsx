"use client"

import QRCode from "qrcode"
import Image from "next/image"
import { useEffect, useState } from "react"

export function QRCodeImage({
  value,
  size = 112,
  inverse = false,
}: {
  value: string
  size?: number
  inverse?: boolean
}) {
  const [source, setSource] = useState<string | null>(null)

  useEffect(() => {
    let current = true
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: inverse
        ? { dark: "#ffffff", light: "#111111" }
        : { dark: "#111111", light: "#ffffff" },
      errorCorrectionLevel: "M",
    })
      .then((result) => {
        if (current) setSource(result)
      })
      .catch(() => undefined)
    return () => {
      current = false
    }
  }, [inverse, size, value])

  return source ? (
    <Image
      unoptimized
      src={source}
      width={size}
      height={size}
      alt="Transfer address QR code"
      className="rounded-md"
    />
  ) : (
    <span
      className="block animate-pulse rounded-md bg-muted"
      style={{ width: size, height: size }}
    />
  )
}
