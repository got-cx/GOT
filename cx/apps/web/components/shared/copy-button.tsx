"use client"

import { Check, Copy } from "lucide-react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"

export function CopyButton({
  value,
  label = "Copy",
  className,
  variant = "outline",
  children,
}: {
  value: string
  label?: string
  className?: string
  variant?:
    "default" | "outline" | "secondary" | "ghost" | "destructive" | "link"
  children?: React.ReactNode
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Button
      variant={variant}
      size="sm"
      className={className}
      onClick={() => void copy()}
    >
      {copied ? <Check /> : (children ?? <Copy />)}
      {copied ? "Copied" : label}
    </Button>
  )
}
