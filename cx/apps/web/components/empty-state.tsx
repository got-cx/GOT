import type { LucideIcon } from "lucide-react"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-xl border bg-card px-6 py-12 text-center">
      <span className="mb-4 grid size-11 place-items-center rounded-xl border bg-muted">
        <Icon className="size-5" strokeWidth={1.7} />
      </span>
      <h2 className="font-medium tracking-[-0.02em]">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
