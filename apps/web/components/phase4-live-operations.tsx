"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Building2,
  Clock3,
  Database,
  FileWarning,
  Filter,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { matchesSearchText } from "@/lib/search"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  localizeOperationalValue,
  resolveDashboardLocale,
  unitMatrixCopy,
} from "@/lib/unit-matrix-copy"
import type {
  Phase4SiteData,
  Phase4Unit,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"
type RealtimeState = "checking" | "connected" | "disabled" | "error"

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

const liveMetaCopy = {
  en: {
    sourceLive: "Supabase live data",
    sourceQa: "Local QA seed",
    qaWarning: "This matrix uses controlled demo records; production data is not connected.",
    updated: "Last updated",
    realtime: {
      checking: "Connecting",
      connected: "Realtime connected",
      disabled: "30-second refresh",
      error: "Realtime interrupted",
    },
    loading: "Loading the authorized unit matrix…",
    error: "The unit matrix could not be refreshed. Existing results remain unchanged.",
    matrix: "Live block / floor matrix",
    matrixHint: "Every visible square comes from the same API result as the table below.",
    selected: "Selected unit",
  },
  tr: {
    sourceLive: "Supabase canlı veri",
    sourceQa: "Yerel QA seed",
    qaWarning: "Bu matris kontrollü demo kayıtlarını kullanır; üretim verileri bağlı değildir.",
    updated: "Son güncelleme",
    realtime: {
      checking: "Bağlanıyor",
      connected: "Realtime bağlı",
      disabled: "30 saniyelik yenileme",
      error: "Realtime bağlantısı kesildi",
    },
    loading: "Yetkili daire matrisi yükleniyor…",
    error: "Daire matrisi yenilenemedi. Mevcut sonuçlar değiştirilmedi.",
    matrix: "Canlı blok / kat matrisi",
    matrixHint: "Görünen her kutu aşağıdaki tabloyla aynı API sonucundan gelir.",
    selected: "Seçili daire",
  },
  de: {
    sourceLive: "Supabase-Live-Daten",
    sourceQa: "Lokale QA-Seed-Daten",
    qaWarning: "Diese Matrix nutzt kontrollierte Demo-Daten; Produktionsdaten sind nicht verbunden.",
    updated: "Zuletzt aktualisiert",
    realtime: {
      checking: "Verbindung wird hergestellt",
      connected: "Realtime verbunden",
      disabled: "Aktualisierung alle 30 Sekunden",
      error: "Realtime unterbrochen",
    },
    loading: "Die autorisierte Einheitenmatrix wird geladen…",
    error: "Die Einheitenmatrix konnte nicht aktualisiert werden. Vorhandene Ergebnisse bleiben unverändert.",
    matrix: "Live-Block-/Etagenmatrix",
    matrixHint: "Jedes sichtbare Feld stammt aus demselben API-Ergebnis wie die Tabelle darunter.",
    selected: "Ausgewählte Einheit",
  },
  ru: {
    sourceLive: "Live-данные Supabase",
    sourceQa: "Локальные QA-данные",
    qaWarning: "Эта матрица использует контролируемые демоданные; рабочие данные не подключены.",
    updated: "Последнее обновление",
    realtime: {
      checking: "Подключение",
      connected: "Realtime подключен",
      disabled: "Обновление каждые 30 секунд",
      error: "Realtime прерван",
    },
    loading: "Загружается доступная вам матрица объектов…",
    error: "Матрица объектов не обновилась. Текущие результаты сохранены.",
    matrix: "Live-матрица блоков и этажей",
    matrixHint: "Каждая ячейка получена из того же ответа API, что и таблица ниже.",
    selected: "Выбранный объект",
  },
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

function unitTileTone(status: string) {
  if (status === "occupied") return "border-emerald-500/30 bg-emerald-500/12 text-emerald-800 dark:text-emerald-200"
  if (status === "vacant") return "border-sky-500/30 bg-sky-500/12 text-sky-800 dark:text-sky-200"
  if (status === "reserved") return "border-violet-500/30 bg-violet-500/12 text-violet-800 dark:text-violet-200"
  if (status === "maintenance") return "border-amber-500/30 bg-amber-500/12 text-amber-800 dark:text-amber-200"
  return "border-rose-500/30 bg-rose-500/12 text-rose-800 dark:text-rose-200"
}

function matchesQuery(unit: Phase4Unit, query: string) {
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
  return matchesSearchText(haystack, query)
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
  const metaCopy = liveMetaCopy[locale]
  const [data, setData] = useState<Phase4SiteData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("checking")
  const [query, setQuery] = useState("")
  const [block, setBlock] = useState("all")
  const [status, setStatus] = useState("all")
  const [debtOnly, setDebtOnly] = useState(false)
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null)

  const fetchPhase4 = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/phase4?limit=769", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Operations request failed.")
      const payload = (await response.json()) as Phase4SiteData
      setData(payload)
      setSelectedUnitId((current) => current ?? payload.units[0]?.id ?? null)
      setRequestState("success")
      if (payload.source !== "supabase" || !readSupabasePublicEnv()) {
        setRealtimeState("disabled")
      }
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
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchPhase4()
    }
    const recovery = window.setInterval(() => {
      void fetchPhase4()
    }, 30_000)

    window.addEventListener("site-management:changed", handleOperationalChange)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearTimeout(handle)
      window.clearInterval(recovery)
      window.removeEventListener("site-management:changed", handleOperationalChange)
      document.removeEventListener("visibilitychange", handleVisibility)
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

  const matrixRows = useMemo(() => {
    const grouped = new Map<string, Phase4Unit[]>()
    visibleUnits.forEach((unit) => {
      const key = `${unit.blockName ?? "-"}|||${unit.floorLabel ?? "-"}`
      grouped.set(key, [...(grouped.get(key) ?? []), unit])
    })
    return [...grouped.entries()]
      .map(([key, units]) => {
        const [blockName, floorLabel] = key.split("|||")
        return {
          key,
          blockName,
          floorLabel,
          units: units.sort((left, right) =>
            left.unitNo.localeCompare(right.unitNo, locale, { numeric: true })
          ),
        }
      })
      .sort((left, right) =>
        `${left.blockName}-${left.floorLabel}`.localeCompare(
          `${right.blockName}-${right.floorLabel}`,
          locale,
          { numeric: true }
        )
      )
  }, [locale, visibleUnits])

  const selectedUnit =
    visibleUnits.find((unit) => unit.id === selectedUnitId) ?? visibleUnits[0] ?? null
  const visibleWarning =
    data?.source === "local-seed" ? metaCopy.qaWarning : data?.warning

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
        <div className="flex flex-wrap items-center gap-2">
          <span
            data-testid="unit-matrix-source"
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold",
              data?.source === "supabase"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
          >
            <Database className="h-3.5 w-3.5" />
            {data?.source === "supabase" ? metaCopy.sourceLive : metaCopy.sourceQa}
          </span>
          <span
            data-testid="unit-matrix-realtime"
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground"
          >
            {realtimeState === "connected" ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            {metaCopy.realtime[realtimeState]}
          </span>
          <button
            type="button"
            onClick={() => void fetchPhase4()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={cn("h-4 w-4", requestState === "loading" && "animate-spin")} />
            {copy.live.refresh}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 py-3 text-xs font-semibold text-muted-foreground">
        <Clock3 className="h-3.5 w-3.5" />
        <span data-testid="unit-matrix-freshness">
          {metaCopy.updated}: {data?.generatedAt
            ? new Intl.DateTimeFormat(numberLocaleByDashboardLocale[locale], {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(data.generatedAt))
            : "-"}
        </span>
        {visibleWarning ? (
          <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-700 dark:text-amber-300">
            {visibleWarning}
          </span>
        ) : null}
      </div>

      {requestState === "loading" && !data ? (
        <p className="py-4 text-sm font-semibold text-muted-foreground" aria-live="polite">
          {metaCopy.loading}
        </p>
      ) : null}
      {requestState === "error" ? (
        <p className="my-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-700 dark:text-rose-300" role="alert">
          {metaCopy.error}
        </p>
      ) : null}

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-6">
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
            <option value="maintenance">{copy.labels.flat.maintenance}</option>
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

      <section className="border-b border-border/70 py-4" data-testid="unit-live-matrix">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-sm font-black text-foreground">{metaCopy.matrix}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {metaCopy.matrixHint}
            </p>
          </div>
          <StatusBadge variant="neutral">
            {visibleUnits.length} {copy.common.records}
          </StatusBadge>
        </div>

        {matrixRows.length ? (
          <div className="mt-4 max-h-[34rem] space-y-3 overflow-y-auto pr-1">
            {matrixRows.map((row) => (
              <div
                key={row.key}
                className="grid gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 md:grid-cols-[9rem_minmax(0,1fr)]"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.08em] text-foreground">
                    {copy.common.block} {row.blockName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.floorLabel} · {row.units.length} {copy.summary.units}
                  </p>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(3.2rem,1fr))] gap-1.5">
                  {row.units.map((unit) => (
                    <button
                      key={unit.id}
                      type="button"
                      aria-label={`${unit.unitNo} ${copy.actions.detailOpen}`}
                      aria-pressed={selectedUnit?.id === unit.id}
                      title={`${unit.unitNo} · ${copy.labels.flat[unit.occupancyStatus as keyof typeof copy.labels.flat] ?? unit.occupancyStatus}`}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={cn(
                        "min-h-9 rounded-md border px-1.5 py-1 text-[11px] font-black transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                        unitTileTone(unit.occupancyStatus),
                        selectedUnit?.id === unit.id && "ring-2 ring-primary ring-offset-1 ring-offset-background"
                      )}
                    >
                      {unit.unitNo}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            {copy.common.notFound}
          </p>
        )}

        {selectedUnit ? (
          <div className="mt-4 grid gap-3 rounded-xl border border-primary/20 bg-primary/[0.035] p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{metaCopy.selected}</p>
              <p className="mt-1 text-lg font-black text-foreground">{selectedUnit.unitNo}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{copy.table.blockFloor}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{selectedUnit.blockName ?? "-"} / {selectedUnit.floorLabel ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{copy.table.status}</p>
              <div className="mt-1">
                <StatusBadge variant={badgeVariant(selectedUnit.occupancyStatus)}>
                  {copy.labels.flat[selectedUnit.occupancyStatus as keyof typeof copy.labels.flat] ?? selectedUnit.occupancyStatus}
                </StatusBadge>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{copy.table.debt}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{formatTryFromCents(selectedUnit.balanceCents, locale)}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground">{copy.table.service}</p>
              <p className="mt-1 text-sm font-bold text-foreground">{selectedUnit.openTicketCount} {copy.table.open}</p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 pt-4 xl:grid-cols-[1.3fr_0.7fr]">
        <DataTable
          data={visibleUnits}
          pageSize={20}
          searchValue={(unit) =>
            `${unit.unitNo} ${unit.blockName ?? ""} ${unit.floorLabel ?? ""} ${unit.ownerName ?? ""} ${unit.residentName ?? ""} ${unit.saleStatus} ${unit.occupancyStatus} ${unit.paymentStatus}`
          }
          columns={[
            { key: "unit", header: copy.live.tableHeaders[0], sortable: true, render: (unit) => unit.unitNo },
            {
              key: "block",
              header: copy.live.tableHeaders[1],
              sortable: true,
              render: (unit) => `${unit.blockName ?? "-"} / ${unit.floorLabel ?? "-"}`,
            },
            {
              key: "sale",
              header: copy.live.tableHeaders[2],
              render: (unit) => (
                <StatusBadge variant={badgeVariant(unit.saleStatus)}>
                  {copy.labels.sale[unit.saleStatus as keyof typeof copy.labels.sale] ?? unit.saleStatus}
                </StatusBadge>
              ),
            },
            {
              key: "price",
              header: copy.live.tableHeaders[3],
              sortable: true,
              sortValue: (unit) => unit.listPriceEurCents,
              render: (unit) => (
                <div className="space-y-1">
                  <p className="font-bold">{formatEurFromCents(unit.listPriceEurCents, locale)}</p>
                  {unit.priceSource ? (
                    <p className="max-w-[170px] truncate text-xs text-muted-foreground" title={unit.priceSource}>
                      {unit.priceSource}
                    </p>
                  ) : null}
                </div>
              ),
            },
            { key: "owner", header: copy.live.tableHeaders[4], render: (unit) => localizeOperationalValue(unit.ownerName, locale) },
            { key: "resident", header: copy.live.tableHeaders[5], render: (unit) => localizeOperationalValue(unit.residentName, locale) },
            {
              key: "occupancy",
              header: copy.live.tableHeaders[6],
              render: (unit) => (
                <StatusBadge variant={badgeVariant(unit.occupancyStatus)}>
                  {copy.labels.flat[unit.occupancyStatus as keyof typeof copy.labels.flat] ?? unit.occupancyStatus}
                </StatusBadge>
              ),
            },
            {
              key: "balance",
              header: copy.live.tableHeaders[7],
              sortable: true,
              sortValue: (unit) => unit.balanceCents,
              render: (unit) => (
                <div className="space-y-1">
                  <p className="font-bold text-foreground">{formatTryFromCents(unit.balanceCents, locale)}</p>
                  <StatusBadge variant={badgeVariant(unit.paymentStatus)}>
                    {copy.labels.payment[unit.paymentStatus as keyof typeof copy.labels.payment] ?? unit.paymentStatus}
                  </StatusBadge>
                </div>
              ),
            },
            { key: "tickets", header: copy.live.tableHeaders[8], sortable: true, sortValue: (unit) => unit.openTicketCount, render: (unit) => `${unit.openTicketCount} ${copy.table.open}` },
          ]}
        />

        <div className="min-w-0 space-y-3">
          <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-amber-600" />
              <h3 className="text-sm font-black text-foreground">{copy.live.findingsTitle}</h3>
            </div>
            <div className="mt-3 space-y-2">
              {(data?.importFindings ?? []).slice(0, 4).map((finding) => (
                <div key={finding.id} className="min-w-0 rounded-lg border border-border/60 bg-background/70 p-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-xs font-bold text-foreground">{finding.area}</p>
                    <StatusBadge variant={badgeVariant(finding.severity)}>
                      {finding.severity}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      {finding.affectedRows} {copy.common.rows}: {finding.message}
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
                  <div key={String(action.id)} className="min-w-0 rounded-lg bg-background/70 p-2">
                    <p className="break-words text-xs font-bold text-foreground">
                      {String(action.action_type ?? "action")}
                    </p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">
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

        </div>
      </div>
    </Card3D>
  )
}
