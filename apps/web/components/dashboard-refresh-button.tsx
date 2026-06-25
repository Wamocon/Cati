"use client"

import { useState } from "react"
import { RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardRefreshButtonProps {
  className?: string
}

type RefreshState = "idle" | "loading" | "success" | "error"

export function DashboardRefreshButton({ className }: DashboardRefreshButtonProps) {
  const [state, setState] = useState<RefreshState>("idle")
  const [source, setSource] = useState<string | null>(null)

  async function refreshDashboard() {
    setState("loading")
    setSource(null)

    try {
      const response = await fetch("/api/site-management/dashboard", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Dashboard refresh failed.")

      const payload = (await response.json()) as { source?: string }
      setSource(payload.source ?? "backend")
      setState("success")
    } catch {
      setState("error")
    }
  }

  const statusLabel =
    state === "loading"
      ? "Yenileniyor"
      : state === "success"
        ? `${source ?? "Veri"} hazır`
        : state === "error"
          ? "Tekrar deneyin"
          : "Veriyi yenile"

  return (
    <button
      type="button"
      onClick={refreshDashboard}
      disabled={state === "loading"}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-wait disabled:opacity-70",
        className
      )}
      aria-live="polite"
    >
      <RefreshCw className={cn("h-3.5 w-3.5", state === "loading" && "animate-spin")} />
      {statusLabel}
    </button>
  )
}
