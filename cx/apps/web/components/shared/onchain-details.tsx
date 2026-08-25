import { ChevronDown, CircleEllipsis } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type OnchainDetailsProps = Omit<React.ComponentProps<"details">, "children"> & {
  children: React.ReactNode
  contentClassName?: string
  inverse?: boolean
  label?: string
}

export function OnchainDetails({
  children,
  className,
  contentClassName,
  inverse = false,
  label = "Onchain details",
  ...detailsProps
}: OnchainDetailsProps) {
  return (
    <details className={cn("group", className)} {...detailsProps}>
      <summary
        className={cn(
          "flex cursor-pointer list-none items-center justify-between gap-3 py-3 text-xs font-medium [&::-webkit-details-marker]:hidden",
          inverse
            ? "text-white/55 hover:text-white"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <span className="flex items-center gap-2">
          <CircleEllipsis className="size-3.5" />
          {label}
        </span>
        <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
      </summary>
      <div
        className={cn(
          "pb-3 text-xs",
          inverse ? "text-white/70" : "text-muted-foreground",
          contentClassName
        )}
      >
        {children}
      </div>
    </details>
  )
}
