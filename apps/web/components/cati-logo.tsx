import { cn } from "@/lib/utils"

interface CatiLogoMarkProps {
  className?: string
  title?: string
}

export function CatiLogoMark({
  className,
  title = "1Cati",
}: CatiLogoMarkProps) {
  return (
    <svg
      role="img"
      aria-label={title}
      viewBox="0 0 48 48"
      className={cn("h-9 w-9 shrink-0", className)}
    >
      <rect width="48" height="48" rx="10" className="fill-primary" />
      <path
        d="M12 23.6 24 13l12 10.6v12.1a2.3 2.3 0 0 1-2.3 2.3H14.3a2.3 2.3 0 0 1-2.3-2.3V23.6Z"
        className="fill-primary-foreground/95"
      />
      <path
        d="M9 23.1 24 9.8l15 13.3"
        className="fill-none stroke-primary-foreground"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.2 38V25.8h7.6V38"
        className="fill-none stroke-primary"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35.2" cy="12.8" r="5.2" className="fill-primary-foreground" />
      <path
        d="M34.1 10.4h2.8M33.6 13h3.8M34.2 15.5h2.9"
        className="fill-none stroke-primary"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path d="M14 34.8h20" className="stroke-primary" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M13 23.8 24 14.1l11 9.7v11.6a1.8 1.8 0 0 1-1.8 1.8H14.8a1.8 1.8 0 0 1-1.8-1.8V23.8Z"
        className="fill-primary"
        opacity="0.08"
      />
    </svg>
  )
}
