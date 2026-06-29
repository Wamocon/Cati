"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

interface SyncBadgeProps {
  lastSync?: Date | null
  className?: string
}

type SnapshotSource = "supabase" | "local-seed"
type RequestState = "idle" | "loading" | "success" | "error"

const DASHBOARD_REALTIME_TABLES = [
  "units",
  "service_catalog",
  "service_orders",
  "service_tickets",
  "service_ticket_events",
  "workforce_tasks",
  "media_reports",
  "finance_ledger_entries",
  "reservations",
  "ai_action_logs",
  "client_action_requests",
  "import_batches",
  "import_findings",
]

interface DashboardHeartbeat {
  source?: SnapshotSource
  generatedAt?: string
  warning?: string
}

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function SyncBadge({ lastSync, className }: SyncBadgeProps) {
  const [heartbeat, setHeartbeat] = useState<DashboardHeartbeat | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("idle")

  const refreshHeartbeat = useCallback(async () => {
    setRequestState("loading")

    try {
      const response = await fetch("/api/site-management/dashboard", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Dashboard heartbeat failed.")
      const payload = (await response.json()) as DashboardHeartbeat
      setHeartbeat(payload)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refreshHeartbeat()
    }, 0)
    const interval = window.setInterval(() => {
      void refreshHeartbeat()
    }, 30000)
    const handleOperationalChange = () => {
      void refreshHeartbeat()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(interval)
      window.removeEventListener("site-management:changed", handleOperationalChange)
    }
  }, [refreshHeartbeat])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || heartbeat?.source !== "supabase") return

    const supabase = createClient()
    let channel = supabase.channel("dashboard-heartbeat")

    DASHBOARD_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void refreshHeartbeat()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [heartbeat?.source, refreshHeartbeat])

  const parsedSyncDate = heartbeat?.generatedAt ? new Date(heartbeat.generatedAt) : null
  const syncDate =
    parsedSyncDate && !Number.isNaN(parsedSyncDate.getTime())
      ? parsedSyncDate
      : lastSync ?? null

  const timeText = syncDate
    ? syncDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "--:--"
  const isLoading = requestState === "loading" && !heartbeat
  const isError = requestState === "error"
  const label = isLoading
    ? "Veri durumu kontrol ediliyor"
    : isError
      ? "Veri yenilenemedi"
      : `Veri güncel - ${timeText}`

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur-sm",
        isError
          ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          : "border-border bg-card/80 text-muted-foreground",
        className
      )}
      title={heartbeat?.warning ?? label}
    >
      {isLoading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
      ) : isError ? (
        <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
      ) : (
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
      )}
      <span>{label}</span>
    </div>
  )
}
