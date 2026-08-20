import type { Money } from "@got-cx/sdk"
import { formatUnits } from "viem"

export function formatMoney(value: Money, minimumFractionDigits = 0): string {
  const amount = formatUnits(BigInt(value.amount), value.decimals)
  const formatter = new Intl.NumberFormat(undefined, {
    minimumFractionDigits,
    maximumFractionDigits: Math.min(value.decimals, 2),
  }) as Intl.NumberFormat & { format(value: string): string }
  return `${formatter.format(amount)} ${value.symbol}`
}

export function formatDate(value: string, withTime = false): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(new Date(value))
}

export function shortAddress(value: string, size = 5): string {
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
