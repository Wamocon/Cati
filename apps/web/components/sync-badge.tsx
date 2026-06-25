"use client"

import { useEffect, useState } from "react"
import { Cloud, CheckCircle2, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface SyncBadgeProps {
  lastSync?: Date | null
  className?: string
}

export function SyncBadge({ lastSync, className }: SyncBadgeProps) {
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setSyncing(true)
      setTimeout(() => setSyncing(false), 1200)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const timeText = lastSync
    ? lastSync.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "--:--"

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm",
        className
      )}
    >
      {syncing ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <Cloud className="h-3.5 w-3.5 text-sky-500" />
      )}
      <span>{syncing ? "CRM + yerel AI senkronize ediliyor" : `CRM + yerel AI güncel - ${timeText}`}</span>
      {!syncing && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
    </div>
  )
}
