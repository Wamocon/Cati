"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { isPublicSupabaseConfigured } from "@/lib/supabase/public-env"
import type {
  DashboardSnapshot,
  Phase4SiteData,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"
type RealtimeState = "checking" | "connected" | "disabled" | "error"

interface UseLiveDashboardSnapshotOptions {
  includePhase4?: boolean
  refreshIntervalMs?: number
}

export interface LiveDashboardRefreshResult {
  source?: DashboardSnapshot["source"]
  generatedAt?: string
}

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

function hasSupabasePublicEnv() {
  return isPublicSupabaseConfigured()
}

function shouldUseRealtime() {
  return (
    hasSupabasePublicEnv() &&
    process.env.NEXT_PUBLIC_ENABLE_ACCESS_PROFILES !== "true" &&
    process.env.NEXT_PUBLIC_ENABLE_REALTIME !== "false"
  )
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
  })

  if (!response.ok) {
    throw new Error(`${url} failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function useLiveDashboardSnapshot({
  includePhase4 = false,
  refreshIntervalMs = 30000,
}: UseLiveDashboardSnapshotOptions = {}) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null)
  const [phase4, setPhase4] = useState<Phase4SiteData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("idle")
  const [realtimeState, setRealtimeState] = useState<RealtimeState>(() =>
    shouldUseRealtime() ? "checking" : "disabled"
  )
  const abortRef = useRef<AbortController | null>(null)
  const snapshotRef = useRef<DashboardSnapshot | null>(null)

  const refresh = useCallback(async (): Promise<LiveDashboardRefreshResult> => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRequestState((current) => (current === "idle" ? "loading" : current))

    try {
      const nextSnapshot = await fetchJson<DashboardSnapshot>(
        "/api/site-management/dashboard",
        controller.signal
      )
      snapshotRef.current = nextSnapshot
      setSnapshot(nextSnapshot)
      if (nextSnapshot.source !== "supabase") {
        setRealtimeState("disabled")
      }

      if (includePhase4) {
        try {
          const nextPhase4 = await fetchJson<Phase4SiteData>(
            "/api/site-management/phase4?limit=769",
            controller.signal
          )
          setPhase4(nextPhase4)
        } catch {
          setPhase4(null)
        }
      }

      setRequestState("success")
      return {
        source: nextSnapshot.source,
        generatedAt: nextSnapshot.generatedAt,
      }
    } catch (error) {
      if (controller.signal.aborted) {
        return {
          source: snapshotRef.current?.source,
          generatedAt: snapshotRef.current?.generatedAt,
        }
      }

      setRequestState("error")
      throw error
    }
  }, [includePhase4])

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => {
      void refresh()
    }, 0)

    const interval = window.setInterval(() => {
      void refresh()
    }, refreshIntervalMs)

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh()
      }
    }

    const handleOperationalChange = () => {
      void refresh()
    }

    document.addEventListener("visibilitychange", handleVisibility)
    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(initialRefresh)
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibility)
      window.removeEventListener("site-management:changed", handleOperationalChange)
      abortRef.current?.abort()
    }
  }, [refresh, refreshIntervalMs])

  useEffect(() => {
    if (!shouldUseRealtime() || snapshot?.source !== "supabase") {
      return
    }

    const supabase = createClient()
    let channel = supabase.channel("dashboard-live-snapshot")

    DASHBOARD_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void refresh()
        }
      )
    })

    channel.subscribe((subscriptionStatus) => {
      if (subscriptionStatus === "SUBSCRIBED") {
        setRealtimeState("connected")
      } else if (
        subscriptionStatus === "CHANNEL_ERROR" ||
        subscriptionStatus === "TIMED_OUT" ||
        subscriptionStatus === "CLOSED"
      ) {
        setRealtimeState("error")
      }
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [refresh, snapshot?.source])

  return {
    snapshot,
    phase4,
    requestState,
    realtimeState,
    refresh,
    isLoading: requestState === "loading" && !snapshot,
    isLive: snapshot?.source === "supabase" && realtimeState === "connected",
  }
}
