"use client"

import { useLocale } from "next-intl"
import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Info,
  type LucideIcon,
} from "lucide-react"
import {
  localizeDashboardText,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { cn } from "@/lib/utils"

type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral" | "accent"

interface StatusBadgeProps {
  children: React.ReactNode
  variant?: StatusVariant
  className?: string
}

const variants: Record<StatusVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
  danger: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  info: "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400",
  neutral: "bg-muted text-muted-foreground border-border",
  accent: "bg-primary/10 text-primary border-primary/20",
}

// Status must never be conveyed by colour alone (WCAG 1.4.1). Each semantic
// variant carries a distinct icon *shape* (check / triangle / circle) next to
// its text, so the meaning survives greyscale and colour-blind rendering.
// "neutral" and "accent" are informational count chips, not states, so they
// stay icon-free. The icon is decorative — the text remains the source of truth.
const variantIcons: Partial<Record<StatusVariant, LucideIcon>> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: CircleAlert,
  info: Info,
}

export function StatusBadge({ children, variant = "neutral", className }: StatusBadgeProps) {
  const locale = resolveDashboardLocale(useLocale())
  const displayChildren =
    typeof children === "string" ? localizeDashboardText(children, locale) : children
  const Icon = variantIcons[variant]

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-4",
        variants[variant],
        className
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="h-3 w-3 shrink-0" /> : null}
      {displayChildren}
    </span>
  )
}
