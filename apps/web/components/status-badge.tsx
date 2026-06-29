"use client"

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

export function StatusBadge({ children, variant = "neutral", className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold leading-4",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
