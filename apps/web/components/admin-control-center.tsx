"use client"

import { useEffect, useState } from "react"
import {
  ArrowRight,
  Building2,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  History,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { AdminApprovalsInbox } from "@/components/admin-approvals-inbox"
import { ComingSoon } from "@/components/coming-soon"
import { UserAdministrationPanel } from "@/components/user-administration-panel"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

// Business language only. No table names, roles, permission strings, or platform
// internals appear here. This hub speaks to an administrator, not to the schema.
const copy = {
  tr: {
    overview: "Genel bakış",
    open: "Aç",
    noValue: "Yok",
    tiles: {
      people: { label: "Kişiler", desc: "Ekip ve sakinler tek yerde." },
      approvals: { label: "Onay bekleyenler", desc: "İncelemenizi bekleyen istekler." },
      money: { label: "Para", desc: "Aidat, ödeme ve tahsilat." },
      service: { label: "Servis işleri", desc: "Bakım ve saha çalışmaları." },
    },
    sections: {
      people: {
        title: "Kişiler ve erişim",
        desc: "Hesap ekleyin, bilgileri düzenleyin, rol atayın veya erişimi askıya alın.",
      },
      approvals: {
        title: "Onayınız gerekiyor",
        desc: "Onayınızı bekleyen istekleri tek yerden onaylayın veya reddedin.",
      },
      money: {
        title: "Para",
        desc: "Aidat, ödeme, tahsilat ve iade denetimi.",
        outstanding: "Açık bakiye",
        overdue: "Gecikmiş",
        collected: "Bu ay tahsilat",
        openItems: "açık kalem",
        overdueItems: "gecikmiş kalem",
        cta: "Finansı aç",
      },
      property: {
        title: "Mülk ve servisler",
        desc: "Daireler, saha işleri ve etkinlikler.",
        units: "Daireler",
        occupied: "dolu",
        vacant: "boş",
        blocks: "blok",
        floors: "kat",
        serviceJobs: "Açık servis işleri",
        overdue: "gecikmiş",
        activities: "Etkinlikler",
        openUnits: "Daireleri aç",
        openServices: "Servisleri aç",
        openActivities: "Etkinlikleri aç",
      },
      audit: {
        title: "Etkinlik ve denetim",
        desc: "Son yönetici işlemleri.",
        body: "Şu anda görüntülenecek son yönetici işlemi yok.",
      },
    },
  },
  en: {
    overview: "Overview",
    open: "Open",
    noValue: "None",
    tiles: {
      people: { label: "People", desc: "Team and residents in one place." },
      approvals: { label: "Awaiting approval", desc: "Requests waiting for your review." },
      money: { label: "Money", desc: "Dues, payments and collections." },
      service: { label: "Service jobs", desc: "Maintenance and field work." },
    },
    sections: {
      people: {
        title: "People & access",
        desc: "Add accounts, edit details, assign roles or suspend access.",
      },
      approvals: {
        title: "Needs your approval",
        desc: "Approve or decline everything waiting on your review, in one place.",
      },
      money: {
        title: "Money",
        desc: "Dues, payments, collections and refund oversight.",
        outstanding: "Outstanding",
        overdue: "Overdue",
        collected: "Collected this month",
        openItems: "open items",
        overdueItems: "overdue items",
        cta: "Open finance",
      },
      property: {
        title: "Property & services",
        desc: "Units, field work and activities.",
        units: "Units",
        occupied: "occupied",
        vacant: "vacant",
        blocks: "blocks",
        floors: "floors",
        serviceJobs: "Open service jobs",
        overdue: "overdue",
        activities: "Activities",
        openUnits: "Open units",
        openServices: "Open services",
        openActivities: "Open activities",
      },
      audit: {
        title: "Activity & audit",
        desc: "Recent administrator actions.",
        body: "There are no recent administrator actions to show right now.",
      },
    },
  },
  de: {
    overview: "Überblick",
    open: "Öffnen",
    noValue: "Keine",
    tiles: {
      people: { label: "Personen", desc: "Team und Bewohner an einem Ort." },
      approvals: { label: "Warten auf Freigabe", desc: "Anfragen, die auf Ihre Prüfung warten." },
      money: { label: "Finanzen", desc: "Beiträge, Zahlungen und Einzüge." },
      service: { label: "Serviceaufträge", desc: "Wartung und Feldarbeit." },
    },
    sections: {
      people: {
        title: "Personen & Zugang",
        desc: "Konten anlegen, Details bearbeiten, Rollen zuweisen oder Zugang aussetzen.",
      },
      approvals: {
        title: "Ihre Freigabe erforderlich",
        desc: "Alles, was auf Ihre Prüfung wartet, an einem Ort freigeben oder ablehnen.",
      },
      money: {
        title: "Finanzen",
        desc: "Beiträge, Zahlungen, Einzüge und Erstattungsaufsicht.",
        outstanding: "Offener Saldo",
        overdue: "Überfällig",
        collected: "Diesen Monat eingezogen",
        openItems: "offene Posten",
        overdueItems: "überfällige Posten",
        cta: "Finanzen öffnen",
      },
      property: {
        title: "Objekt & Services",
        desc: "Einheiten, Feldarbeit und Aktivitäten.",
        units: "Einheiten",
        occupied: "belegt",
        vacant: "frei",
        blocks: "Blöcke",
        floors: "Etagen",
        serviceJobs: "Offene Serviceaufträge",
        overdue: "überfällig",
        activities: "Aktivitäten",
        openUnits: "Einheiten öffnen",
        openServices: "Services öffnen",
        openActivities: "Aktivitäten öffnen",
      },
      audit: {
        title: "Aktivität & Prüfung",
        desc: "Letzte Administratoraktionen.",
        body: "Derzeit gibt es keine aktuellen Administratoraktionen anzuzeigen.",
      },
    },
  },
  ru: {
    overview: "Обзор",
    open: "Открыть",
    noValue: "Нет",
    tiles: {
      people: { label: "Люди", desc: "Команда и жители в одном месте." },
      approvals: { label: "Ждут согласования", desc: "Запросы, ожидающие вашей проверки." },
      money: { label: "Финансы", desc: "Взносы, платежи и сборы." },
      service: { label: "Сервисные работы", desc: "Обслуживание и полевые работы." },
    },
    sections: {
      people: {
        title: "Люди и доступ",
        desc: "Добавляйте учётные записи, изменяйте данные, назначайте роли или приостанавливайте доступ.",
      },
      approvals: {
        title: "Требуется ваше согласование",
        desc: "Согласуйте или отклоните всё, что ждёт вашей проверки, в одном месте.",
      },
      money: {
        title: "Финансы",
        desc: "Взносы, платежи, сборы и контроль возвратов.",
        outstanding: "Открытый баланс",
        overdue: "Просрочено",
        collected: "Собрано за месяц",
        openItems: "открытых позиций",
        overdueItems: "просроченных позиций",
        cta: "Открыть финансы",
      },
      property: {
        title: "Объекты и услуги",
        desc: "Помещения, полевые работы и мероприятия.",
        units: "Помещения",
        occupied: "занято",
        vacant: "свободно",
        blocks: "блоков",
        floors: "этажей",
        serviceJobs: "Открытые сервисные работы",
        overdue: "просрочено",
        activities: "Мероприятия",
        openUnits: "Открыть помещения",
        openServices: "Открыть услуги",
        openActivities: "Открыть мероприятия",
      },
      audit: {
        title: "Активность и аудит",
        desc: "Последние действия администратора.",
        body: "Сейчас нет недавних действий администратора для показа.",
      },
    },
  },
} as const

type LoadState = "loading" | "ready" | "error"

// Shape of the fields we read from GET /api/site-management/users. We intentionally
// type only what the tile needs so the hub stays decoupled from the full contract.
interface UsersEndpointResponse {
  summary?: { staffTotal?: number; residentTotal?: number }
  administration?: { available?: boolean; users?: unknown[] }
}

// GET /api/site-management/finance: summary is a full-dataset aggregate (it is not
// affected by the row limit), so a minimal limit keeps the payload small while the
// figures stay honest.
interface FinanceEndpointResponse {
  summary?: {
    currency?: string
    openLedgerCents?: number
    overdueLedgerCents?: number
    paidThisMonthCents?: number
    openEntries?: number
    overdueEntries?: number
  }
}

// GET /api/site-management/phase4: likewise the summary counts are aggregates.
interface Phase4EndpointResponse {
  summary?: {
    totalUnits?: number
    occupiedUnits?: number
    vacantUnits?: number
    blockCount?: number
    floorCount?: number
  }
}

// GET /api/site-management/dashboard: the aggregate snapshot. openTickets /
// overdueTickets here are true counts (unlike the ticket-queue summary, which is
// computed over a limited page), so this is the honest source for the service total.
interface DashboardEndpointResponse {
  summary?: { openTickets?: number; overdueTickets?: number }
  recentActions?: unknown[]
}

// GET /api/site-management/activities: the catalog array length is the count of
// bookable extra services available.
interface ActivitiesEndpointResponse {
  catalog?: unknown[]
}

// A recent administrator action reduced to plain business language. We deliberately
// read only human-readable fields (a message/title, an actor label, a timestamp) and
// never the raw action type, entity table, id or status, so no schema text leaks here.
interface AuditItem {
  text: string
  actor: string | null
  /** Raw ISO timestamp; formatted relatively at render so locale changes need no refetch. */
  when: string | null
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return null
}

// Map the snapshot's recent-action rows (which differ between the live and seed
// shapes) onto a safe, plain-language projection. Rows without a human-readable
// description are skipped rather than rendered as raw internals.
function describeActions(rows: unknown[], limit = 5): AuditItem[] {
  const items: AuditItem[] = []
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const text = firstString(row.message, row.title)
    if (!text) continue
    items.push({
      text,
      actor: firstString(row.actor),
      when: firstString(row.created_at, row.createdAt, row.occurredAt),
    })
    if (items.length >= limit) break
  }
  return items
}

function formatRelativeTime(iso: string, locale: LocaleKey): string | null {
  const timestamp = Date.parse(iso)
  if (!Number.isFinite(timestamp)) return null
  const diffMs = timestamp - Date.now()
  const abs = Math.abs(diffMs)
  const minute = 60_000
  const hour = 3_600_000
  const day = 86_400_000
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  if (abs < hour) return rtf.format(Math.round(diffMs / minute), "minute")
  if (abs < day) return rtf.format(Math.round(diffMs / hour), "hour")
  if (abs < 30 * day) return rtf.format(Math.round(diffMs / day), "day")
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(
    timestamp
  )
}

// Real count of people, never fabricated. When the live administration snapshot is
// available we count managed accounts; otherwise we fall back to the directory
// summary (team + residents), which is present in every environment.
function computePeopleCount(payload: UsersEndpointResponse): number | null {
  const admin = payload.administration
  if (admin && admin.available === true && Array.isArray(admin.users)) {
    return admin.users.length
  }
  const summary = payload.summary
  if (
    summary &&
    typeof summary.staffTotal === "number" &&
    typeof summary.residentTotal === "number"
  ) {
    return summary.staffTotal + summary.residentTotal
  }
  return null
}

const tileClass =
  "group flex items-start gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors duration-150 hover:border-primary/40 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"

function TileIcon({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-5 w-5" aria-hidden="true" />
    </span>
  )
}

// A number that is honest about its state: an unobtrusive ellipsis while loading, a
// short "no value" word when the figure is genuinely unavailable, never a fabricated zero.
function displayCount(
  state: LoadState,
  value: number | null | undefined,
  locale: LocaleKey
): string {
  if (state === "loading") return "…"
  if (state !== "ready" || typeof value !== "number") return copy[locale].noValue
  return value.toLocaleString(locale)
}

function displayMoney(
  state: LoadState,
  cents: number | null | undefined,
  currency: string | undefined,
  locale: LocaleKey
): string {
  if (state === "loading") return "…"
  if (state !== "ready" || typeof cents !== "number") return copy[locale].noValue
  return formatDualFromCents(cents, currency === "EUR" ? "EUR" : "TRY")
}

// A deep-link styled as a secondary button, used to open the full workspace for a
// section. Shared by the money and property blocks.
function WorkspaceLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-bold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none"
    >
      {label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>
  )
}

// A compact figure card. `value` is pre-formatted (money or count); `caption` is an
// optional plain-language sub-line and is omitted rather than shown as a bare dash.
function Stat({
  label,
  value,
  caption,
}: {
  label: string
  value: string
  caption?: string | null
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 break-words text-lg font-black leading-tight text-foreground tabular-nums">
        {value}
      </div>
      {caption ? (
        <div className="mt-0.5 text-xs leading-4 text-muted-foreground">{caption}</div>
      ) : null}
    </div>
  )
}

function CollapsibleSection({
  id,
  Icon,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  id: string
  Icon: LucideIcon
  title: string
  description: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const titleId = `${id}-title`
  const panelId = `${id}-panel`

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <h2 id={titleId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        >
          <TileIcon Icon={Icon} />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-black text-foreground">{title}</span>
            <span className="mt-0.5 block text-sm leading-5 text-muted-foreground">
              {description}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        hidden={!open}
        className="border-t border-border p-5"
      >
        {children}
      </div>
    </section>
  )
}

export function AdminControlCenter({ locale }: { locale: string }) {
  const lk = localeKey(locale)
  const c = copy[lk]

  const [peopleCount, setPeopleCount] = useState<number | null>(null)
  const [peopleState, setPeopleState] = useState<LoadState>("loading")
  const [approvalsCount, setApprovalsCount] = useState<number | null>(null)
  const [approvalsState, setApprovalsState] = useState<LoadState>("loading")

  // Phase 5: live summaries for the money, property and audit sections. Each area
  // tracks its own state so one unavailable feed never blanks the others.
  const [finance, setFinance] = useState<{
    state: LoadState
    summary: FinanceEndpointResponse["summary"] | null
  }>({ state: "loading", summary: null })
  const [property, setProperty] = useState<{
    state: LoadState
    summary: Phase4EndpointResponse["summary"] | null
  }>({ state: "loading", summary: null })
  const [service, setService] = useState<{
    state: LoadState
    summary: DashboardEndpointResponse["summary"] | null
  }>({ state: "loading", summary: null })
  const [activities, setActivities] = useState<{
    state: LoadState
    count: number | null
  }>({ state: "loading", count: null })
  const [audit, setAudit] = useState<{ state: LoadState; items: AuditItem[] }>({
    state: "loading",
    items: [],
  })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/site-management/users?limit=80", {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("unavailable")
        const payload = (await response.json()) as UsersEndpointResponse
        if (cancelled) return
        setPeopleCount(computePeopleCount(payload))
        setPeopleState("ready")
      } catch {
        if (!cancelled) setPeopleState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Real count of items awaiting approval from the same endpoint the inbox uses.
  // Honest number or a short "no value" word; never a fabricated figure.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/site-management/approvals", {
          cache: "no-store",
        })
        if (!response.ok) throw new Error("unavailable")
        const payload = (await response.json()) as { items?: unknown[] }
        if (cancelled) return
        setApprovalsCount(Array.isArray(payload.items) ? payload.items.length : 0)
        setApprovalsState("ready")
      } catch {
        if (!cancelled) setApprovalsState("error")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Phase 5 summaries fetched together so the hub fills in one pass, not in cascade.
  // Each response is validated independently; a missing feed degrades to a "no value" word.
  useEffect(() => {
    let cancelled = false
    async function load<T>(url: string): Promise<T | null> {
      try {
        const response = await fetch(url, { cache: "no-store" })
        if (!response.ok) return null
        return (await response.json()) as T
      } catch {
        return null
      }
    }
    void (async () => {
      const [fin, ph4, dash, act] = await Promise.all([
        load<FinanceEndpointResponse>("/api/site-management/finance?limit=1"),
        load<Phase4EndpointResponse>("/api/site-management/phase4?limit=1"),
        load<DashboardEndpointResponse>("/api/site-management/dashboard"),
        load<ActivitiesEndpointResponse>("/api/site-management/activities"),
      ])
      if (cancelled) return
      setFinance(
        fin?.summary
          ? { state: "ready", summary: fin.summary }
          : { state: "error", summary: null }
      )
      setProperty(
        ph4?.summary
          ? { state: "ready", summary: ph4.summary }
          : { state: "error", summary: null }
      )
      setService(
        dash?.summary
          ? { state: "ready", summary: dash.summary }
          : { state: "error", summary: null }
      )
      setAudit(
        dash && Array.isArray(dash.recentActions)
          ? { state: "ready", items: describeActions(dash.recentActions) }
          : { state: "error", items: [] }
      )
      setActivities(
        act && Array.isArray(act.catalog)
          ? { state: "ready", count: act.catalog.length }
          : { state: "error", count: null }
      )
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const peopleDisplay = displayCount(peopleState, peopleCount, lk)
  const approvalsDisplay = displayCount(approvalsState, approvalsCount, lk)
  const moneyTileDisplay = displayCount(finance.state, finance.summary?.openEntries, lk)
  const serviceTileDisplay = displayCount(
    service.state,
    service.summary?.openTickets,
    lk
  )

  const fin = finance.summary
  const ph4 = property.summary
  const financeReady = finance.state === "ready"
  const propertyReady = property.state === "ready"
  const serviceReady = service.state === "ready"

  const openItemsCaption =
    financeReady && typeof fin?.openEntries === "number"
      ? `${fin.openEntries.toLocaleString(lk)} ${c.sections.money.openItems}`
      : null
  const overdueItemsCaption =
    financeReady && typeof fin?.overdueEntries === "number"
      ? `${fin.overdueEntries.toLocaleString(lk)} ${c.sections.money.overdueItems}`
      : null
  const unitsCaption =
    propertyReady &&
    typeof ph4?.occupiedUnits === "number" &&
    typeof ph4?.vacantUnits === "number"
      ? `${ph4.occupiedUnits.toLocaleString(lk)} ${c.sections.property.occupied} · ${ph4.vacantUnits.toLocaleString(lk)} ${c.sections.property.vacant}`
      : null
  const structureCaption =
    propertyReady &&
    typeof ph4?.blockCount === "number" &&
    typeof ph4?.floorCount === "number"
      ? `${ph4.blockCount.toLocaleString(lk)} ${c.sections.property.blocks} · ${ph4.floorCount.toLocaleString(lk)} ${c.sections.property.floors}`
      : null
  const serviceOverdueCaption =
    serviceReady && typeof service.summary?.overdueTickets === "number"
      ? `${service.summary.overdueTickets.toLocaleString(lk)} ${c.sections.property.overdue}`
      : null

  return (
    <div className="space-y-6">
      {/* At-a-glance overview. Every tile shows a real, aggregate figure (or an honest
          "no value" word); People and Approvals jump in-page, Money and Services deep-link out. */}
      <section aria-labelledby="admin-overview-heading">
        <h2 id="admin-overview-heading" className="sr-only">
          {c.overview}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <a href="#admin-people" className={tileClass}>
            <TileIcon Icon={Users} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.people.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {peopleDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.people.desc}
              </span>
            </span>
          </a>

          {/* Real pending-approval count from the same endpoint as the inbox
              below; jumps to that section rather than fabricating a figure. */}
          <a href="#admin-approvals" className={tileClass}>
            <TileIcon Icon={ClipboardCheck} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.approvals.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {approvalsDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.approvals.desc}
              </span>
            </span>
          </a>

          {/* Money: open finance items awaiting collection (aggregate count). */}
          <Link href="/dashboard/finance" className={tileClass}>
            <TileIcon Icon={CircleDollarSign} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.money.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {moneyTileDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.money.desc}
              </span>
            </span>
          </Link>

          {/* Service jobs: open ticket count from the aggregate snapshot. */}
          <Link href="/dashboard/tickets" className={tileClass}>
            <TileIcon Icon={Wrench} />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {c.tiles.service.label}
              </span>
              <span className="mt-0.5 block text-2xl font-black leading-tight text-foreground">
                {serviceTileDisplay}
              </span>
              <span className="mt-1 block text-xs leading-4 text-muted-foreground">
                {c.tiles.service.desc}
              </span>
            </span>
          </Link>
        </div>
      </section>

      {/* 1. People & access: the fully working Phase 3 section. The panel fetches
          its own data and self-hides for non-admins, so it needs no props. */}
      <CollapsibleSection
        id="admin-people"
        Icon={Users}
        title={c.sections.people.title}
        description={c.sections.people.desc}
        defaultOpen
      >
        <UserAdministrationPanel />
      </CollapsibleSection>

      {/* 2. Needs your approval: the unified inbox. It fetches its own data,
          self-hides for non-admins, and dispatches each decision to the existing
          per-kind endpoint, so it needs no props. */}
      <CollapsibleSection
        id="admin-approvals"
        Icon={ClipboardCheck}
        title={c.sections.approvals.title}
        description={c.sections.approvals.desc}
        defaultOpen
      >
        {/* The assistant only drafts suggestions today; a person approves every
            item here. This quiet badge explains that automatic AI actions are on
            the way, without pulling focus from the inbox itself. */}
        <div className="mb-4">
          <ComingSoon featureKey="ai_automation" side="bottom" />
        </div>
        <AdminApprovalsInbox />
      </CollapsibleSection>

      {/* 3. Money: Phase 5 live oversight: outstanding, overdue and collected-this-
          month figures in dual currency, with a deep-link into finance. */}
      <CollapsibleSection
        id="admin-money"
        Icon={CircleDollarSign}
        title={c.sections.money.title}
        description={c.sections.money.desc}
      >
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label={c.sections.money.outstanding}
              value={displayMoney(
                finance.state,
                fin?.openLedgerCents,
                fin?.currency,
                lk
              )}
              caption={openItemsCaption}
            />
            <Stat
              label={c.sections.money.overdue}
              value={displayMoney(
                finance.state,
                fin?.overdueLedgerCents,
                fin?.currency,
                lk
              )}
              caption={overdueItemsCaption}
            />
            <Stat
              label={c.sections.money.collected}
              value={displayMoney(
                finance.state,
                fin?.paidThisMonthCents,
                fin?.currency,
                lk
              )}
            />
          </div>
          <WorkspaceLink href="/dashboard/finance" label={c.sections.money.cta} />
        </div>
      </CollapsibleSection>

      {/* 4. Property & services: Phase 5 unit, service-job and activity counts,
          each opening its own workspace. */}
      <CollapsibleSection
        id="admin-property"
        Icon={Wrench}
        title={c.sections.property.title}
        description={c.sections.property.desc}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {c.sections.property.units}
            </div>
            <div className="text-2xl font-black leading-none text-foreground tabular-nums">
              {displayCount(property.state, ph4?.totalUnits, lk)}
            </div>
            <div className="min-h-8 space-y-0.5 text-xs leading-4 text-muted-foreground">
              {unitsCaption ? <div>{unitsCaption}</div> : null}
              {structureCaption ? <div>{structureCaption}</div> : null}
            </div>
            <WorkspaceLink
              href="/dashboard/listings"
              label={c.sections.property.openUnits}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Wrench className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {c.sections.property.serviceJobs}
            </div>
            <div className="text-2xl font-black leading-none text-foreground tabular-nums">
              {displayCount(service.state, service.summary?.openTickets, lk)}
            </div>
            <div className="min-h-8 text-xs leading-4 text-muted-foreground">
              {serviceOverdueCaption ?? ""}
            </div>
            <WorkspaceLink
              href="/dashboard/tickets"
              label={c.sections.property.openServices}
            />
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {c.sections.property.activities}
            </div>
            <div className="text-2xl font-black leading-none text-foreground tabular-nums">
              {displayCount(activities.state, activities.count, lk)}
            </div>
            <div className="min-h-8" aria-hidden="true" />
            <WorkspaceLink
              href="/dashboard/activities"
              label={c.sections.property.openActivities}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* 5. Activity & audit: Phase 5 surfaces the most recent admin/system actions
          in plain language. No raw action types, tables, ids or statuses are shown. */}
      <CollapsibleSection
        id="admin-audit"
        Icon={History}
        title={c.sections.audit.title}
        description={c.sections.audit.desc}
      >
        {audit.state === "ready" && audit.items.length > 0 ? (
          <ul className="space-y-3">
            {audit.items.map((item, index) => {
              const when = item.when ? formatRelativeTime(item.when, lk) : null
              return (
                <li
                  key={index}
                  className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <ShieldCheck
                    className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm leading-5 text-foreground">
                      {item.text}
                    </p>
                    {item.actor || when ? (
                      <p className="mt-0.5 text-xs leading-4 text-muted-foreground">
                        {[item.actor, when].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="flex max-w-2xl items-start gap-2 text-sm leading-6 text-muted-foreground">
            <ShieldCheck
              className="mt-0.5 h-4 w-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            {audit.state === "loading" ? "…" : c.sections.audit.body}
          </p>
        )}
      </CollapsibleSection>
    </div>
  )
}
