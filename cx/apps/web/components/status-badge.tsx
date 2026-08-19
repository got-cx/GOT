import { titleCase } from "@/lib/format"

export function StatusBadge({ status }: { status: string }) {
  const positive = [
    "active",
    "complete",
    "funding_detected",
    "overpaid",
    "ready_to_resolve",
    "settled",
    "verified",
  ].includes(status.toLowerCase())
  const negative = ["failed", "past_due", "reorged", "revoked"].includes(
    status.toLowerCase()
  )
  return (
    <span
      className={`inline-flex w-max items-center gap-1.5 text-xs font-medium ${
        positive
          ? "text-emerald-700 dark:text-emerald-400"
          : negative
            ? "text-destructive"
            : "text-muted-foreground"
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {titleCase(status)}
    </span>
  )
}
