import Link from "next/link"
import Image from "next/image"

export function Brand({
  inverse = false,
  compact = false,
  href = "/",
}: {
  inverse?: boolean
  compact?: boolean
  href?: string
}) {
  return (
    <Link
      href={href}
      aria-label={href === "/dashboard" ? "GOT dashboard" : "GOT home"}
      className={`inline-flex items-center gap-2.5 ${inverse ? "text-white" : "text-foreground"}`}
    >
      <span
        aria-hidden="true"
        className={`grid ${compact ? "size-7" : "size-9"} place-items-center`}
      >
        <Image
          src="/got-mark.svg"
          width={40}
          height={40}
          alt=""
          className={inverse ? "invert" : "dark:invert"}
          priority
        />
      </span>
      <span className="flex flex-col">
        <strong
          className={`${compact ? "text-lg" : "text-xl"} leading-none tracking-[-0.055em]`}
        >
          got.cx
        </strong>
        {!compact && (
          <small className="mt-1 text-[6px] leading-none font-semibold tracking-[0.16em]">
            GLOBAL ONCHAIN TRANSFERS
          </small>
        )}
      </span>
    </Link>
  )
}
