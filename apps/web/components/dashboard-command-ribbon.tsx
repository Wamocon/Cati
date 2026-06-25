"use client"

import { Brain, Building2, MapPinned, Sparkles } from "lucide-react"
import { SyncBadge } from "@/components/sync-badge"
import { clientProfile } from "@/lib/client-context"

export function DashboardCommandRibbon() {
  const lastUpdated = new Date("2026-06-25T09:00:00+03:00")

  return (
    <div className="command-ribbon sticky top-0 z-30 mb-5 rounded-xl px-3 py-3 md:px-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-black text-primary-foreground shadow-lg shadow-primary/[0.18]">
            <Building2 className="h-4 w-4" />
            {clientProfile.clientName}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-background/70 px-3 py-2 text-xs font-bold text-foreground">
            <MapPinned className="h-4 w-4 text-primary" />
            {clientProfile.pilotProject} / {clientProfile.pilotLocation}
          </span>
          <span className="inline-flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-200">
            <Sparkles className="h-4 w-4" />
            Ataberk-first, später generalisierbar
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">
            <Brain className="h-3.5 w-3.5" />
            On-prem AI bereit
          </span>
          <SyncBadge lastSync={lastUpdated} />
        </div>
      </div>
    </div>
  )
}
