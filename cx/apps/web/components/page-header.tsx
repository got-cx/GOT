export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string
  description?: string
  eyebrow?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-[-0.04em]">{title}</h1>
        {description && (
          <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}
