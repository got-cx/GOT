import Link from "next/link"

export function AddressTabs({ active }: { active: "addresses" | "names" }) {
  return (
    <nav
      className="mb-6 flex w-max rounded-lg bg-muted p-1"
      aria-label="Address sections"
    >
      <Link
        href="/dashboard/addresses"
        className={`h-8 rounded-md px-3 py-1.5 text-sm font-medium ${active === "addresses" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
      >
        Intents
      </Link>
      <Link
        href="/dashboard/addresses/names"
        className={`h-8 rounded-md px-3 py-1.5 text-sm font-medium ${active === "names" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
      >
        Names
      </Link>
    </nav>
  )
}
