"use client"

import { cn } from "@/lib/utils"
import { forwardRef, HTMLAttributes } from "react"

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  glow?: boolean
  hover?: boolean
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow = false, hover = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "glass relative overflow-hidden rounded-xl p-6 transition-all duration-300",
          glow &&
            "shadow-[0_0_40px_-12px_color-mix(in_srgb,var(--primary)_30%,transparent)]",
          hover &&
            "hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"
