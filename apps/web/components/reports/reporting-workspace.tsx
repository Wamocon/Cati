"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  CalendarRange,
  Check,
  Clock3,
  Database,
  Download,
  FileClock,
  FileSpreadsheet,
  Filter,
  HardDrive,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react"
import { useLocale } from "next-intl"
import {
  getReportingCopy,
  reportFilterStatuses,
  type ReportingCopy,
  type ReportingTypeKey,
} from "@/lib/reporting-copy"
import type {
  ReportArtifactRecord,
  ReportRequestRecord,
  ReportingData,
  ReportType,
} from "@/lib/reporting-repository"
import { FeatureInfo } from "@/components/feature-info"

const reportingApi = "/api/site-management/reports"

// Plain, business-facing copy kept inline so the fallback/empty state never
// leaks internal jargon (Supabase, access profiles, use-case codes, storage
// thresholds). Overrides the corresponding keys from lib/reporting-copy.ts.
type ReportsLocale = "tr" | "en" | "de" | "ru"
type ReportsInlineCopy = {
  kicker: string
  intro: string
  internalEvidence: string
  providerReady: string
  providerBoundary: string
  unavailable: string
  unavailableTitle: string
  realAuthUnavailable: string
  companyUnavailable: string
  unavailableNote: string
  details: string
}

function resolveReportsLocale(value: string): ReportsLocale {
  return value === "en" || value === "de" || value === "ru" ? value : "tr"
}

const reportsInlineCopy: Record<ReportsLocale, ReportsInlineCopy> = {
  tr: {
    kicker: "Operasyon raporları",
    intro: "Yetkili verilerinizden raporlar oluşturun; her özet paylaşılmadan önce insan incelemesinden geçer.",
    internalEvidence: "İstekler, dosyalar ve inceleme geçmişi güvenli biçimde saklanır.",
    providerReady: "Yakında",
    providerBoundary: "Büyük toplu aktarımlar ve harici depolama ileriki bir sürümde sunulacaktır.",
    unavailable: "Henüz kullanılamıyor",
    unavailableTitle: "Raporlar bu önizlemede henüz kullanılamıyor.",
    realAuthUnavailable: "Rapor oluşturma ve geçmiş, hesabınız tümüyle hazır olduğunda burada görünür.",
    companyUnavailable: "Bu hesap, rapor erişimi olan bir kuruluşa henüz bağlı değil.",
    unavailableNote: "Çalışma alanınız hazır olduğunda yetkili raporlarınız burada otomatik olarak yüklenir.",
    details: "Ayrıntılar",
  },
  en: {
    kicker: "Operations reports",
    intro: "Create reports from your authorized data and keep every summary under human review before it is shared.",
    internalEvidence: "Requests, files and their review history are stored securely.",
    providerReady: "Coming soon",
    providerBoundary: "Large bulk exports and external storage will be available in a later release.",
    unavailable: "Not available yet",
    unavailableTitle: "Reports aren't available in this preview yet.",
    realAuthUnavailable: "Report generation and history will appear here once your account is fully set up.",
    companyUnavailable: "This account isn't linked to an organization with report access yet.",
    unavailableNote: "Once your workspace is ready, your authorized reports load here automatically.",
    details: "Details",
  },
  de: {
    kicker: "Betriebsberichte",
    intro: "Erstellen Sie Berichte aus Ihren autorisierten Daten. Jede Zusammenfassung wird vor der Weitergabe von einem Menschen geprüft.",
    internalEvidence: "Anfragen, Dateien und ihre Prüfhistorie werden sicher gespeichert.",
    providerReady: "Bald verfügbar",
    providerBoundary: "Große Massenexporte und externer Speicher folgen in einer späteren Version.",
    unavailable: "Noch nicht verfügbar",
    unavailableTitle: "Berichte sind in dieser Vorschau noch nicht verfügbar.",
    realAuthUnavailable: "Berichtserstellung und Verlauf erscheinen hier, sobald Ihr Konto vollständig eingerichtet ist.",
    companyUnavailable: "Dieses Konto ist noch keiner Organisation mit Berichtszugriff zugeordnet.",
    unavailableNote: "Sobald Ihr Arbeitsbereich bereit ist, werden Ihre autorisierten Berichte hier automatisch geladen.",
    details: "Details",
  },
  ru: {
    kicker: "Операционные отчёты",
    intro: "Создавайте отчёты из ваших разрешённых данных: каждая сводка проходит проверку человеком перед публикацией.",
    internalEvidence: "Запросы, файлы и история их проверки хранятся надёжно.",
    providerReady: "Скоро",
    providerBoundary: "Большой массовый экспорт и внешнее хранилище появятся в следующем выпуске.",
    unavailable: "Пока недоступно",
    unavailableTitle: "Отчёты пока недоступны в этом предпросмотре.",
    realAuthUnavailable: "Создание отчётов и история появятся здесь после полной настройки вашей учётной записи.",
    companyUnavailable: "Эта учётная запись пока не связана с организацией, имеющей доступ к отчётам.",
    unavailableNote: "Как только рабочее пространство будет готово, ваши разрешённые отчёты загрузятся здесь автоматически.",
    details: "Подробности",
  },
}

function commandKey(purpose: string) {
  const value = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `report-ui:${purpose}:${value}`
}

function dateLabel(value: string | null, locale: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function byteLabel(value: number, locale: string) {
  if (value < 1024) return `${new Intl.NumberFormat(locale).format(value)} B`
  if (value < 1024 * 1024) return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / 1024)} KB`
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value / (1024 * 1024))} MB`
}

function humanize(value: string) {
  return value
    .replace(/^public\./, "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function valueLabel(value: unknown, locale: string) {
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value)
  if (typeof value === "boolean") return value ? "✓" : "-"
  if (typeof value === "string") return value
  if (value == null) return "-"
  return JSON.stringify(value)
}

function statusClass(status: string | null) {
  if (status === "ready" || status === "approved") {
    return "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  }
  if (status === "failed" || status === "rejected") {
    return "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
  }
  if (status === "generating") {
    return "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300"
  }
  return "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function StatusPill({ status, copy }: { status: string | null; copy: ReportingCopy }) {
  const label = status ? copy.statusLabels[status] ?? humanize(status) : "-"
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] ${statusClass(status)}`}>
      {label}
    </span>
  )
}

async function apiMessage(response: Response, fallback: string) {
  try {
    const payload = await response.json() as { error?: unknown }
    return typeof payload.error === "string" && payload.error.trim() ? payload.error : fallback
  } catch {
    return fallback
  }
}

function providerCards(copy: ReportingCopy, ic: ReportsInlineCopy, workspace: ReportingData | null) {
  const live = workspace?.source === "supabase-live"
  return [
    {
      key: "internal",
      icon: Database,
      label: live ? copy.internalLive : copy.internalUnavailable,
      detail: ic.internalEvidence,
      live,
    },
    {
      key: "bulk",
      icon: FileSpreadsheet,
      label: `${copy.bulkExport} · ${ic.providerReady}`,
      detail: ic.providerBoundary,
      live: false,
    },
    {
      key: "storage",
      icon: HardDrive,
      label: `${copy.externalStorage} · ${ic.providerReady}`,
      detail: ic.providerBoundary,
      live: false,
    },
  ]
}

function requestScopeLabel(request: ReportRequestRecord, data: ReportingData, copy: ReportingCopy) {
  if (!request.siteIds.length) return copy.allScope
  const labels = request.siteIds.map((id) => {
    const site = data.sites.find((candidate) => candidate.id === id)
    return site ? `${site.name}${site.code ? ` · ${site.code}` : ""}` : id.slice(0, 8)
  })
  return labels.join(", ")
}

function filterSummary(request: ReportRequestRecord, copy: ReportingCopy) {
  const entries = Object.entries(request.filters).filter(([, value]) => typeof value === "string" && value)
  if (!entries.length) return copy.allStatuses
  return entries.map(([key, value]) => {
    const rendered = key === "status" && typeof value === "string"
      ? copy.statusLabels[value] ?? humanize(value)
      : String(value)
    return `${humanize(key)}: ${rendered}`
  }).join(" · ")
}

export function ReportingWorkspace() {
  const locale = useLocale()
  const copy = getReportingCopy(locale)
  const ic = reportsInlineCopy[resolveReportsLocale(locale)]
  const [workspace, setWorkspace] = useState<ReportingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [reportType, setReportType] = useState<ReportType>("finance_ledger")
  const [selectedSiteIds, setSelectedSiteIds] = useState<string[]>([])
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [sourceStatus, setSourceStatus] = useState("")
  const [saving, setSaving] = useState(false)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewReasons, setReviewReasons] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const loadWorkspace = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true)
    try {
      const response = await fetch(`${reportingApi}?limit=100`, {
        cache: "no-store",
        credentials: "same-origin",
      })
      if (!response.ok) throw new Error(await apiMessage(response, copy.loadError))
      const data = await response.json() as ReportingData
      setWorkspace(data)
      setError(null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.loadError)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [copy.loadError])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void loadWorkspace(true), 0)
    return () => window.clearTimeout(initialLoad)
  }, [loadWorkspace])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadWorkspace(true)
    }, 30_000)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadWorkspace(true)
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [loadWorkspace])

  const pendingReviews = useMemo(
    () => workspace?.artifacts.filter((artifact) => artifact.commentaryStatus === "pending_human_review").length ?? 0,
    [workspace?.artifacts]
  )
  const readyArtifacts = workspace?.artifacts.length ?? 0
  const allowedReportTypes = workspace?.allowedReportTypes ?? []
  const effectiveReportType = allowedReportTypes.includes(reportType)
    ? reportType
    : allowedReportTypes[0] ?? reportType
  const visibleSiteIds = new Set(workspace?.sites.map((site) => site.id) ?? [])
  const effectiveSiteIds = selectedSiteIds.filter((id) => visibleSiteIds.has(id))
  const statusOptions = reportFilterStatuses[effectiveReportType as ReportingTypeKey]
  const canMutate = workspace?.source === "supabase-live" && workspace.mutationAvailable

  function toggleSite(siteId: string) {
    setSelectedSiteIds((current) => current.includes(siteId)
      ? current.filter((id) => id !== siteId)
      : [...current, siteId])
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canMutate || saving) return
    setSaving(true)
    setError(null)
    setNotice(null)
    const filters: Record<string, string> = {}
    if (from) filters.from = `${from}T00:00:00.000Z`
    if (to) filters.to = `${to}T00:00:00.000Z`
    if (sourceStatus) filters.status = sourceStatus
    try {
      const response = await fetch(reportingApi, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": commandKey("create"),
        },
        body: JSON.stringify({ reportType: effectiveReportType, siteIds: effectiveSiteIds, filters }),
      })
      if (!response.ok) throw new Error(await apiMessage(response, copy.mutationError))
      setNotice(copy.requestSuccess)
      await loadWorkspace(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.mutationError)
    } finally {
      setSaving(false)
    }
  }

  async function reviewCommentary(artifact: ReportArtifactRecord, decision: "approved" | "rejected") {
    const reason = (reviewReasons[artifact.id] ?? "").trim()
    if (reason.length < 10) {
      setError(copy.validationError)
      return
    }
    if (!artifact.commentaryVersion || reviewingId) return
    setReviewingId(artifact.id)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(reportingApi, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": commandKey(`review-${decision}`),
          "If-Match": `"${artifact.commentaryVersion}"`,
        },
        body: JSON.stringify({
          artifactId: artifact.id,
          decision,
          reason,
        }),
      })
      if (!response.ok) throw new Error(await apiMessage(response, copy.reviewError))
      setReviewReasons((current) => ({ ...current, [artifact.id]: "" }))
      await loadWorkspace(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : copy.reviewError)
    } finally {
      setReviewingId(null)
    }
  }

  const cards = providerCards(copy, ic, workspace)

  return (
    <section className="relative min-w-0 space-y-6 overflow-x-hidden pb-10" aria-busy={loading || refreshing}>
      <header className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-sm">
        <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" aria-hidden="true" />
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-primary/[0.07] blur-3xl" aria-hidden="true" />
        <div className="relative p-5 sm:p-7 lg:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                <Archive className="h-4 w-4" />
                {ic.kicker}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <h1 className="text-3xl font-black tracking-[-0.035em] text-foreground sm:text-4xl">
                  {copy.title}
                </h1>
                <FeatureInfo featureKey="reports" side="bottom" />
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                {ic.intro}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadWorkspace()}
              disabled={refreshing}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-black text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {copy.refresh}
            </button>
          </div>

          <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 md:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <div key={card.key} className="min-w-0 bg-background/90 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${card.live ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" : "bg-amber-500/10 text-amber-600 dark:text-amber-300"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[0.08em] text-foreground">{card.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{card.detail}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" />
              {copy.lastUpdated}: {dateLabel(workspace?.generatedAt ?? null, locale)}
            </span>
          </div>
        </div>
      </header>

      <div aria-live="polite" className="space-y-2">
        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/[0.07] p-4 text-sm text-rose-800 dark:text-rose-200" role="alert">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {notice && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 text-sm text-emerald-800 dark:text-emerald-200">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-72 items-center justify-center rounded-[2rem] border border-border bg-card">
          <div className="text-center">
            <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-primary" />
            <p className="mt-3 text-sm font-bold text-muted-foreground">{copy.loading}</p>
          </div>
        </div>
      ) : workspace?.source !== "supabase-live" ? (
        <section data-testid="reporting-unavailable" className="relative overflow-hidden rounded-[2rem] border border-amber-500/30 bg-amber-500/[0.055] p-6 sm:p-8">
          <div className="flex max-w-3xl items-start gap-4">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-background text-amber-600 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">{ic.unavailable}</p>
              <h2 className="mt-2 text-xl font-black text-foreground">{ic.unavailableTitle}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {workspace?.unavailableReason === "company_scope_required" ? ic.companyUnavailable : ic.realAuthUnavailable}
              </p>
              <p className="mt-3 text-sm font-semibold leading-6 text-foreground">{ic.unavailableNote}</p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: copy.requests, value: workspace.requests.length, icon: FileClock },
              { label: copy.readyArtifacts, value: readyArtifacts, icon: BadgeCheck },
              { label: copy.pendingReview, value: pendingReviews, icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon
              return (
                <div key={item.label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">{item.label}</p>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="mt-3 text-3xl font-black tracking-tight text-foreground">{new Intl.NumberFormat(locale).format(item.value)}</p>
                </div>
              )
            })}
          </div>

          <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(19rem,0.82fr)_minmax(0,1.45fr)]">
            <form onSubmit={submitReport} className="min-w-0 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-6 xl:self-start" data-testid="report-request-form">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarRange className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-black text-foreground">{copy.requestTitle}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.requestIntro}</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="report-type" className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{copy.reportType}</label>
                  <select
                    id="report-type"
                    value={effectiveReportType}
                    onChange={(event) => {
                      setReportType(event.target.value as ReportType)
                      setSourceStatus("")
                    }}
                    disabled={!canMutate || saving}
                    className="mt-2 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                  >
                    {workspace.allowedReportTypes.map((type) => (
                      <option key={type} value={type}>{copy.typeLabels[type as ReportingTypeKey]}</option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.typeDescriptions[effectiveReportType as ReportingTypeKey]}</p>
                </div>

                <fieldset>
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">{copy.siteScope}</legend>
                    {effectiveSiteIds.length > 0 && (
                      <button type="button" onClick={() => setSelectedSiteIds([])} className="min-h-8 rounded-lg px-2 text-xs font-black text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {copy.clearSites}
                      </button>
                    )}
                  </div>
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto rounded-xl border border-border bg-muted/30 p-2">
                    {workspace.sites.map((site) => (
                      <label key={site.id} className="flex min-h-10 cursor-pointer items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition hover:bg-background">
                        <input
                          type="checkbox"
                          checked={selectedSiteIds.includes(site.id)}
                          onChange={() => toggleSite(site.id)}
                          disabled={!canMutate || saving}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="min-w-0 flex-1 truncate font-bold text-foreground">{site.name}</span>
                        {site.code && <span className="font-mono text-[11px] text-muted-foreground">{site.code}</span>}
                      </label>
                    ))}
                    {!workspace.sites.length && <p className="p-2 text-xs text-muted-foreground">{copy.allAssignedSites}</p>}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{copy.allAssignedSitesHint}</p>
                </fieldset>

                <fieldset className="rounded-2xl border border-border p-4">
                  <legend className="px-1 text-xs font-black uppercase tracking-[0.1em] text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5"><Filter className="h-3.5 w-3.5" />{copy.filters}</span>
                  </legend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="report-from" className="text-xs font-bold text-muted-foreground">{copy.from}</label>
                      <input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} disabled={!canMutate || saving} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" />
                    </div>
                    <div>
                      <label htmlFor="report-to" className="text-xs font-bold text-muted-foreground">{copy.to}</label>
                      <input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} disabled={!canMutate || saving} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60" />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{copy.dateHint}</p>
                  <div className="mt-3">
                    <label htmlFor="report-status" className="text-xs font-bold text-muted-foreground">{copy.status}</label>
                    <select id="report-status" value={sourceStatus} onChange={(event) => setSourceStatus(event.target.value)} disabled={!canMutate || saving} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60">
                      <option value="">{copy.allStatuses}</option>
                      {statusOptions.map((status) => <option key={status} value={status}>{copy.statusLabels[status] ?? humanize(status)}</option>)}
                    </select>
                  </div>
                </fieldset>

                <button type="submit" disabled={!canMutate || saving} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                  {saving ? copy.generating : copy.generate}
                </button>
              </div>
            </form>

            <section className="min-w-0 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileClock className="h-5 w-5" /></span>
                <div>
                  <h2 className="text-lg font-black text-foreground">{copy.historyTitle}</h2>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.historyIntro}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3" aria-label={copy.requests}>
                {workspace.requests.length ? workspace.requests.map((request) => (
                  <article key={request.id} data-testid="report-request-row" className="rounded-2xl border border-border bg-muted/25 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-foreground">{copy.typeLabels[request.reportType as ReportingTypeKey]}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{request.id}</p>
                      </div>
                      <StatusPill status={request.status} copy={copy} />
                    </div>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                      <div><dt className="font-bold text-muted-foreground">{copy.created}</dt><dd className="mt-1 text-foreground">{dateLabel(request.createdAt, locale)}</dd></div>
                      <div><dt className="font-bold text-muted-foreground">{copy.version}</dt><dd className="mt-1 text-foreground">{request.version}</dd></div>
                      <div className="sm:col-span-2"><dt className="font-bold text-muted-foreground">{copy.selectedSites}</dt><dd className="mt-1 break-words text-foreground">{requestScopeLabel(request, workspace, copy)}</dd></div>
                      <div className="sm:col-span-2"><dt className="font-bold text-muted-foreground">{copy.filters}</dt><dd className="mt-1 break-words text-foreground">{filterSummary(request, copy)}</dd></div>
                    </dl>
                    {request.failureMessage && (
                      <p className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] p-3 text-xs text-rose-700 dark:text-rose-300">
                        <span className="font-black">{copy.failure}{request.failureCode ? ` · ${request.failureCode}` : ""}: </span>{request.failureMessage}
                      </p>
                    )}
                  </article>
                )) : (
                  <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{copy.noRequests}</div>
                )}
              </div>
            </section>
          </div>

          <section className="min-w-0 rounded-[2rem] border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{copy.artifacts}</p>
                <h2 className="mt-1 text-xl font-black text-foreground">{copy.readyArtifacts}</h2>
              </div>
              <span className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-border bg-background px-3 text-lg font-black text-foreground">{readyArtifacts}</span>
            </div>

            <div className="mt-5 grid min-w-0 gap-5 2xl:grid-cols-2">
              {workspace.artifacts.length ? workspace.artifacts.map((artifact) => (
                <article key={artifact.id} data-testid="report-artifact-row" className="min-w-0 overflow-hidden rounded-3xl border border-border bg-background">
                  <div className="border-b border-border bg-muted/30 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                          <h3 className="truncate text-sm font-black text-foreground">{artifact.fileName}</h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{copy.typeLabels[artifact.reportType as ReportingTypeKey]} · {new Intl.NumberFormat(locale).format(artifact.rowCount)} {copy.rows.toLocaleLowerCase()}</p>
                      </div>
                      <StatusPill status={artifact.commentaryStatus} copy={copy} />
                    </div>
                  </div>

                  <div className="space-y-5 p-4 sm:p-5">
                    <dl className="grid gap-3 text-xs sm:grid-cols-3">
                      <div><dt className="font-bold text-muted-foreground">{copy.snapshot}</dt><dd className="mt-1 text-foreground">{dateLabel(artifact.snapshotAt, locale)}</dd></div>
                      <div><dt className="font-bold text-muted-foreground">{copy.rows}</dt><dd className="mt-1 font-black text-foreground">{new Intl.NumberFormat(locale).format(artifact.rowCount)}</dd></div>
                      <div><dt className="font-bold text-muted-foreground">CSV</dt><dd className="mt-1 text-foreground">{byteLabel(artifact.byteSize, locale)}</dd></div>
                    </dl>

                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.055] p-4">
                      <div className="flex items-start gap-3">
                        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-300" />
                        <div className="min-w-0 flex-1">
                          <a href={`${reportingApi}/${artifact.id}/download`} download className="inline-flex min-h-9 items-center gap-2 text-sm font-black text-emerald-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-emerald-300" aria-label={`${copy.download}: ${artifact.fileName}`}>
                            <Download className="h-4 w-4" />{copy.download}
                          </a>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.downloadIntegrity}</p>
                        </div>
                      </div>
                    </div>

                    <details className="group rounded-2xl border border-border p-4">
                      <summary className="cursor-pointer list-none text-xs font-black uppercase tracking-[0.1em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                        {ic.details}
                      </summary>
                      <div className="mt-4 space-y-4 text-xs">
                        <dl className="grid gap-2 sm:grid-cols-2">
                          {Object.entries(artifact.metrics).map(([key, value]) => (
                            <div key={key} className="rounded-xl bg-muted/40 p-3"><dt className="font-bold text-muted-foreground">{humanize(key)}</dt><dd className="mt-1 break-words font-black text-foreground">{valueLabel(value, locale)}</dd></div>
                          ))}
                        </dl>
                        <div><p className="font-bold text-muted-foreground">{copy.sourceTables}</p><p className="mt-1 break-words font-mono text-[10px] text-foreground">{artifact.sourceTables.map(humanize).join(" · ")}</p></div>
                        {artifact.limitations.length > 0 && <div><p className="font-bold text-muted-foreground">{copy.limitations}</p><ul className="mt-1 list-disc space-y-1 pl-4 text-foreground">{artifact.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                        <div><p className="font-bold text-muted-foreground">SHA-256</p><code className="mt-1 block truncate rounded-lg bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-foreground" title={artifact.sha256Hex}>{artifact.sha256Hex}</code></div>
                      </div>
                    </details>

                    {artifact.commentary && (
                      <div className="rounded-2xl border border-border bg-muted/25 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-foreground">{copy.commentaryTitle}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{copy.groundedLabel}</span>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground">{artifact.commentary}</p>
                        {Object.keys(artifact.commentaryGrounding).length > 0 && (
                          <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                            {Object.entries(artifact.commentaryGrounding).map(([key, value]) => (
                              <div key={key}><dt className="font-bold text-muted-foreground">{humanize(key)}</dt><dd className="mt-0.5 break-words text-foreground">{valueLabel(value, locale)}</dd></div>
                            ))}
                          </dl>
                        )}
                      </div>
                    )}

                    {artifact.commentaryStatus === "pending_human_review" && artifact.commentaryVersion ? (
                      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-4">
                        <label htmlFor={`review-${artifact.id}`} className="text-xs font-black text-foreground">{copy.reviewReason}</label>
                        <textarea id={`review-${artifact.id}`} value={reviewReasons[artifact.id] ?? ""} onChange={(event) => setReviewReasons((current) => ({ ...current, [artifact.id]: event.target.value }))} minLength={10} maxLength={1000} rows={3} placeholder={copy.reasonPlaceholder} className="mt-2 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                        <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{copy.reasonHint} · {copy.version} {artifact.commentaryVersion}</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          <button type="button" onClick={() => void reviewCommentary(artifact, "approved")} disabled={reviewingId !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 text-xs font-black text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-60"><Check className="h-4 w-4" />{copy.approve}</button>
                          <button type="button" onClick={() => void reviewCommentary(artifact, "rejected")} disabled={reviewingId !== null} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-background px-3 text-xs font-black text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-60 dark:text-rose-300"><X className="h-4 w-4" />{copy.reject}</button>
                        </div>
                      </div>
                    ) : artifact.reviewReason ? (
                      <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground">
                        <span className="font-black">{copy.reviewReason}: </span>{artifact.reviewReason}
                      </div>
                    ) : null}
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground 2xl:col-span-2">{copy.noArtifacts}</div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
