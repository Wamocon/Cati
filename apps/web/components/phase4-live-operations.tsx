"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2,
  CheckCircle2,
  FileWarning,
  Filter,
  RefreshCw,
  Search,
  UploadCloud,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { localizeBusinessCopy } from "@/lib/business-copy"
import {
  interpolate,
  localizeOperationalValue,
  resolveDashboardLocale,
  unitMatrixCopy,
} from "@/lib/unit-matrix-copy"
import type {
  Phase4SiteData,
  Phase4Unit,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"

const PHASE4_REALTIME_TABLES = [
  "units",
  "service_catalog",
  "service_orders",
  "service_tickets",
  "service_ticket_events",
  "workforce_tasks",
  "media_reports",
  "finance_ledger_entries",
  "client_action_requests",
  "import_batches",
  "import_findings",
]

const numberLocaleByDashboardLocale = {
  de: "de-DE",
  en: "en-US",
  ru: "ru-RU",
  tr: "tr-TR",
} as const

function formatTryFromCents(cents: number, locale: keyof typeof numberLocaleByDashboardLocale) {
  return new Intl.NumberFormat(numberLocaleByDashboardLocale[locale], {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatEurFromCents(cents: number | null, locale: keyof typeof numberLocaleByDashboardLocale) {
  if (cents === null) return "-"
  return new Intl.NumberFormat(numberLocaleByDashboardLocale[locale], {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function badgeVariant(status: string) {
  if (status === "info") return "info" as const
  if (status === "warning") return "warning" as const
  if (status === "error") return "danger" as const
  if (status === "occupied" || status === "clear" || status === "active") {
    return "success" as const
  }
  if (status === "reserved" || status === "minor_debt" || status === "pending") {
    return "warning" as const
  }
  if (status === "blocked" || status === "overdue" || status === "restricted" || status === "source_missing") {
    return "danger" as const
  }
  if (status === "vacant" || status === "available") return "info" as const
  return "neutral" as const
}

function matchesQuery(unit: Phase4Unit, query: string) {
  if (!query.trim()) return true
  const haystack = [
    unit.unitNo,
    unit.blockName,
    unit.floorLabel,
    unit.ownerName,
    unit.residentName,
    unit.paymentStatus,
    unit.occupancyStatus,
    unit.saleStatus,
    unit.priceSource,
    unit.sourceNotes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

  return haystack.includes(query.trim().toLowerCase())
}

function readSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function Phase4LiveOperations() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = unitMatrixCopy[locale]
  const [data, setData] = useState<Phase4SiteData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [previewState, setPreviewState] = useState<RequestState>("idle")
  const [commitState, setCommitState] = useState<RequestState>("idle")
  const [query, setQuery] = useState("")
  const [block, setBlock] = useState("all")
  const [status, setStatus] = useState("all")
  const [debtOnly, setDebtOnly] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  const fetchPhase4 = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/phase4?limit=769", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Operations request failed.")
      const payload = (await response.json()) as Phase4SiteData
      setData(payload)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchPhase4()
    }, 0)
    const handleOperationalChange = () => {
      void fetchPhase4()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", handleOperationalChange)
    }
  }, [fetchPhase4])

  useEffect(() => {
    if (!readSupabasePublicEnv() || data?.source !== "supabase") {
      return
    }

    const supabase = createClient()
    let channel = supabase.channel("phase4-live-operations")

    PHASE4_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchPhase4()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [data?.source, fetchPhase4])

  const blockOptions = useMemo(
    () => data?.blocks.map((item) => item.name).filter(Boolean) ?? [],
    [data]
  )

  const visibleUnits = useMemo(() => {
    const units = data?.units ?? []
    return units.filter((unit) => {
      if (!matchesQuery(unit, query)) return false
      if (block !== "all" && unit.blockName !== block) return false
      if (status !== "all" && unit.occupancyStatus !== status) return false
      if (debtOnly && unit.balanceCents <= 0) return false
      return true
    })
  }, [block, data, debtOnly, query, status])

  async function runImportAction(kind: "preview" | "commit") {
    const setState = kind === "preview" ? setPreviewState : setCommitState
    setState("loading")
    setLastMessage(null)

    try {
      const response = await fetch(
        `/api/site-management/import/${kind === "preview" ? "preview" : "commit"}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchId: data?.importBatches[0]?.id ?? null }),
        }
      )
      const payload = (await response.json()) as {
        message?: string
        phase4?: Phase4SiteData
      }
      if (!response.ok) throw new Error("Import action failed.")
      if (payload.phase4) setData(payload.phase4)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      setLastMessage(payload.message ?? copy.live.requestSaved)
      setState("success")
      window.setTimeout(() => setState("idle"), 1800)
    } catch {
      setLastMessage(copy.live.requestError)
      setState("error")
    }
  }

  const latestActions = data?.recentActions.slice(0, 3) ?? []
  const readiness = data?.importSummary.readinessRate ?? 0

  return (
    <Card3D glow={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black text-card-foreground">
              {copy.live.title}
            </h2>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {copy.live.description}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchPhase4()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={cn("h-4 w-4", requestState === "loading" && "animate-spin")} />
            {copy.live.refresh}
          </button>
          <button
            type="button"
            onClick={() => void runImportAction("preview")}
            disabled={previewState === "loading"}
            data-state={previewState}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/15 disabled:cursor-wait disabled:opacity-70 data-[state=success]:border-emerald-500/50 data-[state=success]:text-emerald-600 data-[state=error]:border-rose-500/50 data-[state=error]:text-rose-600"
          >
            <UploadCloud className="h-4 w-4" />
            {copy.live.preview}
          </button>
          <button
            type="button"
            onClick={() => void runImportAction("commit")}
            disabled={commitState === "loading"}
            data-state={commitState}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-foreground px-3 py-2 text-sm font-bold text-background transition hover:opacity-90 disabled:cursor-wait disabled:opacity-70 data-[state=success]:bg-emerald-600 data-[state=error]:bg-rose-600"
          >
            <CheckCircle2 className="h-4 w-4" />
            {copy.live.commit}
          </button>
        </div>
      </div>

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          [copy.table.unit, data?.summary.totalUnits ?? 0],
          [copy.common.block, data?.summary.blockCount ?? 0],
          [copy.summary.availableForSale, data?.blocks.reduce((sum, item) => sum + item.availableForSale, 0) ?? 0],
          [copy.table.blockFloor, data?.summary.floorCount ?? 0],
          [`${copy.import.ready} ${copy.common.records}`, `${readiness}%`],
          [copy.live.filterMatchedTail, visibleUnits.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 border-y border-border/70 py-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">{copy.filters.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={copy.filters.search}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background px-3">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="sr-only">{copy.common.block}</span>
          <select
            value={block}
            onChange={(event) => setBlock(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
          >
            <option value="all">{copy.common.allBlocks}</option>
            {blockOptions.map((item) => (
              <option key={item} value={item}>
                {copy.common.block} {item}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background px-3">
          <span className="sr-only">{copy.table.status}</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none"
          >
            <option value="all">{copy.common.allStatuses}</option>
            <option value="occupied">{copy.labels.flat.occupied}</option>
            <option value="vacant">{copy.labels.flat.vacant}</option>
            <option value="reserved">{copy.labels.flat.reserved}</option>
            <option value="blocked">{copy.labels.flat.blocked}</option>
          </select>
        </label>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border/70 bg-background px-3 text-sm font-bold text-foreground">
          <input
            type="checkbox"
            checked={debtOnly}
            onChange={(event) => setDebtOnly(event.target.checked)}
            className="h-4 w-4 accent-primary"
          />
          {copy.live.debtOnly}
        </label>
      </div>

      <div className="grid gap-4 pt-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="overflow-hidden rounded-lg border border-border/70">
          <div className="max-h-[420px] overflow-auto">
            <table className="min-w-[980px] w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-muted/90 backdrop-blur">
                <tr>
                  {copy.live.tableHeaders.map((header) => (
                    <th key={header} className="px-3 py-2 text-xs font-black uppercase text-muted-foreground">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {visibleUnits.slice(0, 80).map((unit) => (
                  <tr key={unit.id} className="bg-background/60 transition hover:bg-primary/[0.045]">
                    <td className="px-3 py-2 font-black text-foreground">{unit.unitNo}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {unit.blockName ?? "-"} / {localizeBusinessCopy(unit.floorLabel, locale) || "-"}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={badgeVariant(unit.saleStatus)}>
                        {copy.labels.sale[unit.saleStatus as keyof typeof copy.labels.sale] ?? unit.saleStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <div className="space-y-1">
                        <p className="font-bold">{formatEurFromCents(unit.listPriceEurCents, locale)}</p>
                        {unit.priceSource ? (
                          <p className="max-w-[170px] truncate text-xs text-muted-foreground" title={unit.priceSource}>
                            {unit.priceSource}
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-foreground">{localizeOperationalValue(unit.ownerName, locale)}</td>
                    <td className="px-3 py-2 text-foreground">{localizeOperationalValue(unit.residentName, locale)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge variant={badgeVariant(unit.occupancyStatus)}>
                        {copy.labels.flat[unit.occupancyStatus as keyof typeof copy.labels.flat] ?? unit.occupancyStatus}
                      </StatusBadge>
                    </td>
                    <td className="px-3 py-2">
                      <div className="space-y-1">
                        <p className="font-bold text-foreground">{formatTryFromCents(unit.balanceCents, locale)}</p>
                        <StatusBadge variant={badgeVariant(unit.paymentStatus)}>
                          {copy.labels.payment[unit.paymentStatus as keyof typeof copy.labels.payment] ?? unit.paymentStatus}
                        </StatusBadge>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-foreground">{unit.openTicketCount} {copy.table.open}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-border/70 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
            {interpolate(copy.live.filterMatched, { count: visibleUnits.length })} {copy.live.filterMatchedSuffix}
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-black text-foreground">{copy.live.findingsTitle}</h3>
            </div>
            <div className="mt-3 space-y-2">
              {(data?.importFindings ?? []).slice(0, 4).map((finding) => (
                <div key={finding.id} className="rounded-lg border border-border/60 bg-background/70 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-foreground">{localizeBusinessCopy(finding.area, locale)}</p>
                    <StatusBadge variant={badgeVariant(finding.severity)}>
                      {finding.severity}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {finding.affectedRows} {copy.common.rows}: {localizeBusinessCopy(finding.message, locale)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <h3 className="text-sm font-black text-foreground">{copy.live.auditTitle}</h3>
            <div className="mt-3 space-y-2">
              {latestActions.length > 0 ? (
                latestActions.map((action) => (
                  <div key={String(action.id)} className="rounded-lg bg-background/70 p-2">
                    <p className="text-xs font-bold text-foreground">
                      {String(action.action_type ?? "action")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {String(action.title ?? action.entity_external_id ?? copy.live.auditFallback)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-xs leading-5 text-muted-foreground">
                  {copy.live.auditEmpty}
                </p>
              )}
            </div>
          </div>

          {lastMessage && (
            <p
              className={cn(
                "rounded-lg border px-3 py-2 text-xs font-bold",
                previewState === "error" || commitState === "error"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-600"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
              )}
              aria-live="polite"
            >
              {lastMessage}
            </p>
          )}
        </div>
      </div>
    </Card3D>
  )
}
