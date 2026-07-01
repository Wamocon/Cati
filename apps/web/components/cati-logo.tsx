import { cn } from "@/lib/utils"

interface CatiLogoMarkProps {
  className?: string
  title?: string
}

export function CatiLogoMark({
  className,
  title = "1Çatı",
}: CatiLogoMarkProps) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 128 128"
      className={cn("h-9 w-9 shrink-0", className)}
    >
      <rect width="128" height="128" rx="28" className="fill-primary" />
      <path
        d="M24 65 64 28l40 37v39a8 8 0 0 1-8 8H32a8 8 0 0 1-8-8Z"
        className="fill-primary-foreground/95"
      />
      <path
        d="M48 112V72h32v40"
        className="fill-primary/85"
      />
      <path d="M43 51h42" className="stroke-primary" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M64 28v84"
        className="stroke-primary"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.24"
      />
    </svg>
  )
}
