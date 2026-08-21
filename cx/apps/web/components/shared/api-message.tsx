import { AlertCircle, Database } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

export function APIMessage({
  error,
  onRetry,
}: {
  error?: string | null
  onRetry?: () => void
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border bg-card p-8 text-center">
      <span className="mb-4 grid size-10 place-items-center rounded-lg border bg-muted">
        {error ? (
          <AlertCircle className="size-4" />
        ) : (
          <Database className="size-4" />
        )}
      </span>
      <h2 className="text-sm font-medium">
        {error ? "Data could not be loaded" : "Connect the got.cx API"}
      </h2>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-muted-foreground">
        {error ??
          "The got.cx API is unavailable. The interface does not substitute sample transfer data."}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
