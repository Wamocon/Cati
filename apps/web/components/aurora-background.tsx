"use client"

import { cn } from "@/lib/utils"
import { ReactNode } from "react"

interface AuroraBackgroundProps {
  children: ReactNode
  className?: string
  showNoise?: boolean
}

export function AuroraBackground({
  children,
  className,
  showNoise = true,
}: AuroraBackgroundProps) {
  return (
    <div
      className={cn(
        "aurora-bg relative min-h-screen w-full",
        showNoise && "noise-overlay",
        className
      )}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}
