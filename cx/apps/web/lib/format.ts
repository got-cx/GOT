import type { Money } from "@got-cx/sdk"
import { formatUnits, isAddress, type Address } from "viem"

export const BASE_ACCOUNT_LABEL = "Account"

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

export function shortAddress(value: Address | string, size = 5): string {
  if (value.length <= size * 2 + 3) {
    return value
  }
  return `${value.slice(0, size + 2)}…${value.slice(-size)}`
}

export function humanIdentity(value?: string | null): string {
  if (!value) return "—"
  if (isAddress(value)) return `${BASE_ACCOUNT_LABEL} ${shortAddress(value, 2)}`
  return value
}

export function identityInitial(value?: string | null): string {
  const label = humanIdentity(value)
    .replace(/^(x:|tg:|email:|phone:)/, "")
    .replace(/^@/, "")
    .trim()
  return (label[0] ?? "B").toUpperCase()
}

export function titleCase(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}
