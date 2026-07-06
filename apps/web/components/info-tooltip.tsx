"use client"

import { Info } from "lucide-react"
import { useId } from "react"
import { cn } from "@/lib/utils"

interface InfoTooltipProps {
  label: string
  text: string
  className?: string
}

export function InfoTooltip({ label, text, className }: InfoTooltipProps) {
  const tooltipId = useId()

  return (
    <span className={cn("group/info relative inline-flex", className)}>
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        <Info className="h-4 w-4" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className="pointer-events-none absolute right-0 top-10 z-30 hidden w-72 rounded-xl border border-border bg-popover p-3 text-left text-xs font-semibold leading-5 text-popover-foreground shadow-2xl shadow-black/12 group-hover/info:block group-focus-within/info:block"
      >
        {text}
      </span>
    </span>
  )
}
