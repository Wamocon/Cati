"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarCheck,
  Clock3,
  CreditCard,
  FileText,
  RefreshCw,
  ShieldCheck,
  TicketCheck,
  Wifi,
  WifiOff,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { StatusBadge } from "@/components/status-badge"
import type {
  FocusedDashboardRole,
  RoleDashboardItem,
  RoleDashboardMetricKey,
  RoleDashboardSnapshot,
} from "@/lib/role-dashboard-repository"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type DashboardLocale = "de" | "en" | "ru" | "tr"
type RequestState = "error" | "loading" | "refreshing" | "success"
type RealtimeState = "checking" | "connected" | "error" | "recovery"

const localeNames: Record<DashboardLocale, string> = {
  de: "de-DE",
  en: "en-US",
  ru: "ru-RU",
  tr: "tr-TR",
}

const copy = {
  en: {
    eyebrow: "Your live workspace",
    sourceLive: "Verified live data",
    sourceQa: "Local QA data",
    qaWarning: "These are controlled demo records and are never mixed with production data.",
    lastUpdated: "Last updated",
    realtime: {
      checking: "Connecting",
      connected: "Live updates on",
      error: "Live channel interrupted",
      recovery: "30-second refresh",
    },
    refresh: "Refresh dashboard",
    loading: "Loading your authorized records…",
    error: "Your dashboard could not be refreshed. Your access scope was not widened.",
    retry: "Try again",
    empty: "Nothing needs attention in your current scope.",
    priority: "What needs attention",
    units: "Your verified units",
    unitEmpty: "No active unit relationship is assigned to this account.",
    scope: {
      accountant: "Company finance records only. Resident conversations and identity data stay hidden.",
      staff: "Only work assigned directly to you or your active team queue.",
      owner: "Only units with an active, verified ownership relationship.",
      tenant: "Only units and modules granted by your active tenancy relationship.",
    },
    metrics: {
      activeReservations: "Active reservations",
      assignedTasks: "Assigned tasks",
      documents: "Available documents",
      openBalance: "Open balance",
      openEntries: "Open entries",
      openTickets: "Open requests",
      overdueBalance: "Overdue balance",
      overdueEntries: "Overdue entries",
      overdueTasks: "Overdue tasks",
      postedEntries: "Posted entries",
      scopedUnits: "My units",
      urgentTickets: "Urgent requests",
    },
  },
  tr: {
    eyebrow: "Canlı çalışma alanınız",
    sourceLive: "Doğrulanmış canlı veri",
    sourceQa: "Yerel QA verisi",
    qaWarning: "Bunlar kontrollü demo kayıtlarıdır ve üretim verileriyle asla karıştırılmaz.",
    lastUpdated: "Son güncelleme",
    realtime: {
      checking: "Bağlanıyor",
      connected: "Canlı güncelleme açık",
      error: "Canlı bağlantı kesildi",
      recovery: "30 saniyelik yenileme",
    },
    refresh: "Paneli yenile",
    loading: "Yetkili kayıtlarınız yükleniyor…",
    error: "Panel yenilenemedi. Erişim kapsamınız genişletilmedi.",
    retry: "Tekrar dene",
    empty: "Mevcut kapsamınızda ilgilenmeniz gereken bir kayıt yok.",
    priority: "İlgilenmeniz gerekenler",
    units: "Doğrulanmış daireleriniz",
    unitEmpty: "Bu hesaba atanmış aktif daire ilişkisi yok.",
    scope: {
      accountant: "Yalnızca şirket finans kayıtları. Sakin görüşmeleri ve kimlik verileri gizli kalır.",
      staff: "Yalnızca size veya aktif ekip kuyruğunuza atanmış işler.",
      owner: "Yalnızca aktif ve doğrulanmış malik ilişkiniz bulunan daireler.",
      tenant: "Yalnızca aktif kiracılık ilişkinizin izin verdiği daire ve modüller.",
    },
    metrics: {
      activeReservations: "Aktif rezervasyon",
      assignedTasks: "Atanmış görev",
      documents: "Erişilebilir belge",
      openBalance: "Açık bakiye",
      openEntries: "Açık kayıt",
      openTickets: "Açık talep",
      overdueBalance: "Gecikmiş bakiye",
      overdueEntries: "Gecikmiş kayıt",
      overdueTasks: "Gecikmiş görev",
      postedEntries: "Muhasebeleşen kayıt",
      scopedUnits: "Dairelerim",
      urgentTickets: "Acil talep",
    },
  },
  de: {
    eyebrow: "Ihr Live-Arbeitsbereich",
    sourceLive: "Verifizierte Live-Daten",
    sourceQa: "Lokale QA-Daten",
    qaWarning: "Dies sind kontrollierte Demo-Datensätze; sie werden nie mit Produktionsdaten vermischt.",
    lastUpdated: "Zuletzt aktualisiert",
    realtime: {
      checking: "Verbindung wird hergestellt",
      connected: "Live-Aktualisierung aktiv",
      error: "Live-Kanal unterbrochen",
      recovery: "Aktualisierung alle 30 Sekunden",
    },
    refresh: "Dashboard aktualisieren",
    loading: "Ihre autorisierten Datensätze werden geladen…",
    error: "Das Dashboard konnte nicht aktualisiert werden. Ihr Zugriff wurde nicht erweitert.",
    retry: "Erneut versuchen",
    empty: "In Ihrem aktuellen Bereich ist nichts offen.",
    priority: "Was Ihre Aufmerksamkeit braucht",
    units: "Ihre verifizierten Einheiten",
    unitEmpty: "Diesem Konto ist keine aktive Einheit zugeordnet.",
    scope: {
      accountant: "Nur Finanzdaten des Unternehmens. Bewohnerchats und Identitätsdaten bleiben verborgen.",
      staff: "Nur Aufgaben, die Ihnen oder Ihrer aktiven Team-Warteschlange zugewiesen sind.",
      owner: "Nur Einheiten mit einer aktiven, verifizierten Eigentümerbeziehung.",
      tenant: "Nur Einheiten und Module Ihrer aktiven Mietbeziehung.",
    },
    metrics: {
      activeReservations: "Aktive Reservierungen",
      assignedTasks: "Zugewiesene Aufgaben",
      documents: "Verfügbare Dokumente",
      openBalance: "Offener Saldo",
      openEntries: "Offene Buchungen",
      openTickets: "Offene Anfragen",
      overdueBalance: "Überfälliger Saldo",
      overdueEntries: "Überfällige Buchungen",
      overdueTasks: "Überfällige Aufgaben",
      postedEntries: "Gebuchte Einträge",
      scopedUnits: "Meine Einheiten",
      urgentTickets: "Dringende Anfragen",
    },
  },
  ru: {
    eyebrow: "Ваше рабочее пространство",
    sourceLive: "Проверенные live-данные",
    sourceQa: "Локальные QA-данные",
    qaWarning: "Это контролируемые демоданные; они никогда не смешиваются с рабочими данными.",
    lastUpdated: "Последнее обновление",
    realtime: {
      checking: "Подключение",
      connected: "Live-обновления включены",
      error: "Live-канал прерван",
      recovery: "Обновление каждые 30 секунд",
    },
    refresh: "Обновить панель",
    loading: "Загружаются доступные вам записи…",
    error: "Панель не обновилась. Область доступа не была расширена.",
    retry: "Повторить",
    empty: "В вашей текущей области нет записей, требующих внимания.",
    priority: "Что требует внимания",
    units: "Ваши подтвержденные объекты",
    unitEmpty: "Для этой учетной записи нет активной связи с объектом.",
    scope: {
      accountant: "Только финансовые записи компании. Переписка жильцов и идентификационные данные скрыты.",
      staff: "Только задачи, назначенные вам или вашей активной очереди команды.",
      owner: "Только объекты с активной подтвержденной связью владельца.",
      tenant: "Только объекты и модули, разрешенные активной арендой.",
    },
    metrics: {
      activeReservations: "Активные бронирования",
      assignedTasks: "Назначенные задачи",
      documents: "Доступные документы",
      openBalance: "Открытый баланс",
      openEntries: "Открытые записи",
      openTickets: "Открытые заявки",
      overdueBalance: "Просроченный баланс",
      overdueEntries: "Просроченные записи",
      overdueTasks: "Просроченные задачи",
      postedEntries: "Проведенные записи",
      scopedUnits: "Мои объекты",
      urgentTickets: "Срочные заявки",
    },
  },
} as const

const metricIcons: Record<RoleDashboardMetricKey, LucideIcon> = {
  activeReservations: CalendarCheck,
  assignedTasks: Activity,
  documents: FileText,
  openBalance: CreditCard,
  openEntries: CreditCard,
  openTickets: TicketCheck,
  overdueBalance: AlertTriangle,
  overdueEntries: Clock3,
  overdueTasks: Clock3,
  postedEntries: ShieldCheck,
  scopedUnits: Building2,
  urgentTickets: AlertTriangle,
}

const itemIcons: Record<RoleDashboardItem["kind"], LucideIcon> = {
  booking: CalendarCheck,
  document: FileText,
  finance: CreditCard,
  task: Activity,
  ticket: TicketCheck,
}

function resolveLocale(value: string): DashboardLocale {
  return value === "de" || value === "ru" || value === "tr" ? value : "en"
}

function publicRealtimeConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.NEXT_PUBLIC_ENABLE_REALTIME !== "false"
  )
}

function formatMetric(
  value: number,
  format: "count" | "currency",
  currency: string | undefined,
  locale: DashboardLocale
) {
  if (format === "count") {
    return new Intl.NumberFormat(localeNames[locale], { maximumFractionDigits: 0 }).format(value)
  }

  return new Intl.NumberFormat(localeNames[locale], {
    style: "currency",
    currency: currency === "MIXED" || !currency ? "TRY" : currency,
    maximumFractionDigits: 0,
  }).format(value / 100)
}

function formatTimestamp(value: string, locale: DashboardLocale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(localeNames[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

function readableStatus(value: string, locale: DashboardLocale) {
  const translated: Record<DashboardLocale, Record<string, string>> = {
    en: {
      active: "Active",
      approved: "Approved",
      assigned: "Assigned",
      closed: "Closed",
      confirmed: "Confirmed",
      in_progress: "In progress",
      open: "Open",
      overdue: "Overdue",
      pending: "Pending",
      pending_owner: "Owner review",
      resolved: "Resolved",
      scheduled: "Scheduled",
      urgent: "Urgent",
      verified: "Verified",
    },
    tr: {
      active: "Aktif",
      approved: "Onaylandı",
      assigned: "Atandı",
      closed: "Kapandı",
      confirmed: "Onaylandı",
      in_progress: "İşlemde",
      open: "Açık",
      overdue: "Gecikmiş",
      pending: "Bekliyor",
      pending_owner: "Malik incelemesi",
      resolved: "Çözüldü",
      scheduled: "Planlandı",
      urgent: "Acil",
      verified: "Doğrulandı",
    },
    de: {
      active: "Aktiv",
      approved: "Genehmigt",
      assigned: "Zugewiesen",
      closed: "Geschlossen",
      confirmed: "Bestätigt",
      in_progress: "In Bearbeitung",
      open: "Offen",
      overdue: "Überfällig",
      pending: "Ausstehend",
      pending_owner: "Eigentümerprüfung",
      resolved: "Gelöst",
      scheduled: "Geplant",
      urgent: "Dringend",
      verified: "Verifiziert",
    },
    ru: {
      active: "Активно",
      approved: "Одобрено",
      assigned: "Назначено",
      closed: "Закрыто",
      confirmed: "Подтверждено",
      in_progress: "В работе",
      open: "Открыто",
      overdue: "Просрочено",
      pending: "Ожидает",
      pending_owner: "Проверка владельца",
      resolved: "Решено",
      scheduled: "Запланировано",
      urgent: "Срочно",
      verified: "Проверено",
    },
  }
  return translated[locale][value] ?? value.replaceAll("_", " ")
}

function statusVariant(status: string) {
  if (/urgent|overdue|error|rejected|blocked/i.test(status)) return "danger" as const
  if (/pending|review|waiting|scheduled/i.test(status)) return "warning" as const
  if (/active|approved|closed|confirmed|resolved|verified/i.test(status)) return "success" as const
  return "neutral" as const
}

export function RoleFocusedLiveDashboard({ role }: { role: FocusedDashboardRole }) {
  const locale = resolveLocale(useLocale())
  const text = copy[locale]
  const [snapshot, setSnapshot] = useState<RoleDashboardSnapshot | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [realtimeState, setRealtimeState] = useState<RealtimeState>("checking")
  const abortRef = useRef<AbortController | null>(null)
  const realtimeTableKey =
    snapshot?.source === "supabase" ? snapshot.realtimeTables.join(",") : ""

  const refresh = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRequestState((current) => (current === "success" ? "refreshing" : "loading"))

    try {
      const response = await fetch("/api/site-management/role-dashboard", {
        cache: "no-store",
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`Role dashboard failed with ${response.status}.`)
      const payload = (await response.json()) as RoleDashboardSnapshot
      if (payload.role !== role) throw new Error("Role dashboard scope mismatch.")
      setSnapshot(payload)
      setRequestState("success")
      setRealtimeState(
        payload.source === "supabase" && publicRealtimeConfigured()
          ? "checking"
          : "recovery"
      )
    } catch {
      if (!controller.signal.aborted) setRequestState("error")
    }
  }, [role])

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0)
    const recovery = window.setInterval(() => void refresh(), 30_000)
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    const onOperationalChange = () => void refresh()
    document.addEventListener("visibilitychange", onVisible)
    window.addEventListener("site-management:changed", onOperationalChange)

    return () => {
      window.clearTimeout(initial)
      window.clearInterval(recovery)
      document.removeEventListener("visibilitychange", onVisible)
      window.removeEventListener("site-management:changed", onOperationalChange)
      abortRef.current?.abort()
    }
  }, [refresh])

  useEffect(() => {
    if (!realtimeTableKey || !publicRealtimeConfigured()) {
      return
    }

    const supabase = createClient()
    let channel = supabase.channel(`role-dashboard-${role}`)
    realtimeTableKey.split(",").forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => void refresh()
      )
    })
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") setRealtimeState("connected")
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        setRealtimeState("error")
      }
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [realtimeTableKey, refresh, role])

  const sortedItems = useMemo(
    () => snapshot?.priorityItems.slice().sort((left, right) => {
      const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : 0
      const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : 0
      return rightTime - leftTime
    }) ?? [],
    [snapshot]
  )

  if (!snapshot && requestState === "loading") {
    return (
      <section
        data-testid="role-dashboard-live"
        aria-busy="true"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          {text.loading}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </section>
    )
  }

  if (!snapshot) {
    return (
      <section
        data-testid="role-dashboard-live"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
          <div>
            <p className="font-bold text-foreground">{text.error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background"
            >
              <RefreshCw className="h-4 w-4" />
              {text.retry}
            </button>
          </div>
        </div>
      </section>
    )
  }

  const RealtimeIcon = realtimeState === "connected" ? Wifi : WifiOff
  const visibleWarning =
    snapshot.source === "local-seed" ? text.qaWarning : snapshot.warning

  return (
    <section
      data-testid="role-dashboard-live"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-black/[0.04]"
    >
      <div className="border-b border-border bg-gradient-to-r from-primary/[0.08] via-transparent to-primary/[0.03] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
              {text.eyebrow}
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {text.scope[role]}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              data-testid="role-dashboard-source"
              className={cn(
                "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold",
                snapshot.source === "supabase"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {snapshot.source === "supabase" ? text.sourceLive : text.sourceQa}
            </span>
            <span
              data-testid="role-dashboard-realtime"
              className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground"
            >
              <RealtimeIcon className="h-3.5 w-3.5" />
              {text.realtime[realtimeState]}
            </span>
            <button
              type="button"
              aria-label={text.refresh}
              title={text.refresh}
              onClick={() => void refresh()}
              disabled={requestState === "refreshing"}
              className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", requestState === "refreshing" && "animate-spin")} />
            </button>
          </div>
        </div>
        <p
          data-testid="role-dashboard-freshness"
          className="mt-3 text-xs font-semibold text-muted-foreground"
        >
          {text.lastUpdated}: {formatTimestamp(snapshot.generatedAt, locale)}
        </p>
        {visibleWarning ? (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
            {visibleWarning}
          </p>
        ) : null}
        {requestState === "error" ? (
          <p className="mt-3 text-xs font-semibold text-rose-600" role="status">
            {text.error}
          </p>
        ) : null}
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.metrics.map((metric) => {
            const Icon = metricIcons[metric.key]
            return (
              <Link
                key={metric.key}
                href={metric.href}
                className="group rounded-xl border border-border bg-background/70 p-4 transition hover:border-primary/40 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-muted-foreground transition group-hover:text-primary">↗</span>
                </div>
                <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                  {text.metrics[metric.key]}
                </p>
                <p className="mt-1 break-words text-2xl font-black text-foreground">
                  {formatMetric(metric.value, metric.format, metric.currency, locale)}
                </p>
              </Link>
            )
          })}
        </div>

        {role === "owner" || role === "tenant" ? (
          <div className="mt-5 rounded-xl border border-border bg-muted/25 p-4">
            <h2 className="text-sm font-black text-foreground">{text.units}</h2>
            {snapshot.units.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {snapshot.units.map((unit) => (
                  <span
                    key={unit.id}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground"
                  >
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    {unit.unitNo}
                    <span className="font-medium text-muted-foreground">
                      {readableStatus(unit.occupancyStatus, locale)}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">{text.unitEmpty}</p>
            )}
          </div>
        ) : null}

        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-black text-foreground">{text.priority}</h2>
          </div>
          {sortedItems.length ? (
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {sortedItems.map((item) => {
                const Icon = itemIcons[item.kind]
                return (
                  <Link
                    key={`${item.kind}-${item.id}`}
                    href={item.href}
                    className="flex min-w-0 items-start gap-3 rounded-xl border border-border bg-background/70 p-3 transition hover:border-primary/35 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-start justify-between gap-2">
                        <span className="min-w-0 break-words text-sm font-bold text-foreground">
                          {item.unitNo ? `${item.unitNo} · ` : ""}{item.title}
                        </span>
                        <StatusBadge variant={statusVariant(item.status)}>
                          {readableStatus(item.status, locale)}
                        </StatusBadge>
                      </span>
                      {item.context ? (
                        <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                          {readableStatus(item.context, locale)}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              {text.empty}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
