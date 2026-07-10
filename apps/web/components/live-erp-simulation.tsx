"use client"

import { useEffect, useMemo, useState } from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { useLocale } from "next-intl"
import {
  Activity,
  ArrowUpRight,
  Brain,
  Building2,
  Clock3,
  CreditCard,
  DatabaseZap,
  LockKeyhole,
  Radio,
  TicketCheck,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { AnimatedCounter } from "@/components/animated-counter"
import { InfoTooltip } from "@/components/info-tooltip"
import { StatusBadge } from "@/components/status-badge"
import {
  type BlockOverview,
  formatTryShort,
  type SiteSummary,
} from "@/lib/site-management-data"
import { localizeDashboardTextPart, resolveDashboardLocale } from "@/lib/operational-copy"
import { cn } from "@/lib/utils"

type SnapshotSource = "supabase" | "local-seed" | undefined

interface SimulationEvent {
  actor?: string
  href: string
  id: string
  message: string
  type: string
}

interface CriticalTicket {
  assignee: string
  id: string
  label: string
  slaHoursRemaining: number
  title: string
}

export interface SimulationQuickAction {
  href: string
  icon: LucideIcon
  label: string
}

interface LiveErpSimulationProps {
  activityItems?: SimulationEvent[]
  blocks: BlockOverview[]
  criticalTickets?: CriticalTicket[]
  generatedAt?: string
  permittedHrefs?: string[]
  quickActions?: SimulationQuickAction[]
  realtimeState?: "checking" | "connected" | "disabled" | "error"
  requestState?: "idle" | "loading" | "success" | "error"
  roleLabel: string
  source?: SnapshotSource
  summary: SiteSummary
}

const simulationCopy = {
  tr: {
    aria: "Canlı ERP operasyon simülasyonu",
    eyebrow: "Canlı operasyon simülasyonu",
    controlPlane: "kontrol düzlemi",
    infoLabel: "Canlı simülasyon bilgisi",
    infoText:
      "Bu sahne dashboard snapshot ve faz-4 daire verilerinden beslenir. Üretimde Supabase verisini, yerel QA'da ise işaretli seed fallback verisini gösterir.",
    description:
      "Daireler, finans riski, açık servisler ve erişim riski aynı rol bazlı dashboard rotalarından akar.",
    sessionSeed: "oturum verisi",
    sourceLocal: "Yerel seed fallback",
    sourceRealtime: "Supabase realtime",
    sourceSnapshot: "Supabase snapshot",
    units: "Daire",
    occupancy: "{value}% doluluk",
    openService: "Açık servis",
    sla: "{value} SLA",
    debt: "Borç",
    debtUnit: "K TRY",
    accessRisk: "Erişim riski",
    restricted: "kısıtlı",
    blockSelector: "Blok seçici",
    blocks: "{count} blok",
    block: "Blok",
    risk: "risk",
    selectedBlock: "Seçili blok",
    occupied: "dolu",
    blocked: "blokeli",
    eventRail: "Canlı olay akışı",
    empty: "İlk canlı aksiyondan sonra olay akışı burada görünür.",
    actions: {
      listings: "Daire matrisini aç",
      tickets: "Servis kontrolünü aç",
      finance: "Finans kontrolünü aç",
      reports: "AI raporlarını aç",
    },
    events: {
      "ACT-1": {
        actor: "Muhasebe",
        message: "23 daire için otomatik borç hatırlatma kuyruğu hazırlandı.",
        type: "Tahsilat",
      },
      "ACT-2": {
        actor: "Operasyon",
        message: "Bugünkü 2 check-out için depozito hasar kontrolü açıldı.",
        type: "Rezervasyon",
      },
      "ACT-3": {
        actor: "Güvenlik",
        message: "Legal takipteki 15 daire için erişim kısıtlama listesi güncellendi.",
        type: "Erişim",
      },
      "ACT-4": {
        actor: "Teknik",
        message: "Acil asansör talebi teknisyene atandı ve SLA sayacı başladı.",
        type: "Servis",
      },
      "ACT-5": {
        actor: "AI",
        message: "Haziran tahsilat riski yüksek 37 hesap için öncelik skoru üretildi.",
        type: "AI",
      },
    },
  },
  en: {
    aria: "Live ERP operations simulation",
    eyebrow: "Live operation simulation",
    controlPlane: "control plane",
    infoLabel: "Live simulation information",
    infoText:
      "This scene is fed from the dashboard snapshot and phase-4 unit data. In production it reflects Supabase data; in local QA it is clearly marked as seed fallback.",
    description:
      "Units, finance exposure, open services and access risk move through the same role-based dashboard routes.",
    sessionSeed: "session seed",
    sourceLocal: "Local seed fallback",
    sourceRealtime: "Supabase realtime",
    sourceSnapshot: "Supabase snapshot",
    units: "Units",
    occupancy: "{value}% occupied",
    openService: "Open service",
    sla: "{value} SLA",
    debt: "Debt",
    debtUnit: "K TRY",
    accessRisk: "Access risk",
    restricted: "restricted",
    blockSelector: "Block selector",
    blocks: "{count} blocks",
    block: "Block",
    risk: "risk",
    selectedBlock: "Selected block",
    occupied: "occupied",
    blocked: "blocked",
    eventRail: "Realtime event rail",
    empty: "Event stream appears here after the first live action.",
    actions: {
      listings: "Open unit matrix",
      tickets: "Open service control",
      finance: "Open finance control",
      reports: "Open AI reports",
    },
    events: {
      "ACT-1": {
        actor: "Accounting",
        message: "Automatic debt reminder queue prepared for 23 units.",
        type: "Collection",
      },
      "ACT-2": {
        actor: "Operations",
        message: "Deposit damage review opened for today’s 2 check-outs.",
        type: "Reservation",
      },
      "ACT-3": {
        actor: "Security",
        message: "Access restriction list updated for 15 legal-follow-up units.",
        type: "Access",
      },
      "ACT-4": {
        actor: "Technical",
        message: "Urgent elevator request assigned and SLA timer started.",
        type: "Service",
      },
      "ACT-5": {
        actor: "AI",
        message: "Priority score generated for 37 high collection-risk accounts.",
        type: "AI",
      },
    },
  },
  de: {
    aria: "Live-ERP-Operationssimulation",
    eyebrow: "Live-Operationssimulation",
    controlPlane: "Steuerungsebene",
    infoLabel: "Information zur Live-Simulation",
    infoText:
      "Diese Szene nutzt Dashboard-Snapshot und Phase-4-Einheitsdaten. In Produktion zeigt sie Supabase-Daten; in lokaler QA ist Seed-Fallback klar markiert.",
    description:
      "Einheiten, Finanzrisiko, offene Services und Zugangsrisiko laufen über dieselben rollenbasierten Dashboard-Routen.",
    sessionSeed: "Sitzungsdaten",
    sourceLocal: "Lokaler Seed-Fallback",
    sourceRealtime: "Supabase realtime",
    sourceSnapshot: "Supabase snapshot",
    units: "Einheiten",
    occupancy: "{value}% belegt",
    openService: "Offener Service",
    sla: "{value} SLA",
    debt: "Schuld",
    debtUnit: "K TRY",
    accessRisk: "Zugangsrisiko",
    restricted: "beschränkt",
    blockSelector: "Blockauswahl",
    blocks: "{count} Blöcke",
    block: "Block",
    risk: "Risiko",
    selectedBlock: "Ausgewählter Block",
    occupied: "belegt",
    blocked: "blockiert",
    eventRail: "Realtime-Ereignisstrom",
    empty: "Der Ereignisstrom erscheint nach der ersten Live-Aktion.",
    actions: {
      listings: "Einheitenmatrix öffnen",
      tickets: "Servicekontrolle öffnen",
      finance: "Finanzkontrolle öffnen",
      reports: "KI-Berichte öffnen",
    },
    events: {
      "ACT-1": {
        actor: "Buchhaltung",
        message: "Automatische Schuldenerinnerung für 23 Einheiten vorbereitet.",
        type: "Inkasso",
      },
      "ACT-2": {
        actor: "Operations",
        message: "Kautions-Schadensprüfung für die heutigen 2 Check-outs geöffnet.",
        type: "Reservierung",
      },
      "ACT-3": {
        actor: "Sicherheit",
        message: "Zugangssperrliste für 15 rechtlich verfolgte Einheiten aktualisiert.",
        type: "Zugang",
      },
      "ACT-4": {
        actor: "Technik",
        message: "Dringende Aufzugsanfrage zugewiesen und SLA-Timer gestartet.",
        type: "Service",
      },
      "ACT-5": {
        actor: "KI",
        message: "Prioritätsscore für 37 Konten mit hohem Inkassorisiko erstellt.",
        type: "KI",
      },
    },
  },
  ru: {
    aria: "Live ERP операционная симуляция",
    eyebrow: "Live-симуляция операций",
    controlPlane: "контур управления",
    infoLabel: "Информация о live-симуляции",
    infoText:
      "Сцена питается dashboard snapshot и данными юнитов фазы 4. В production она отражает Supabase; в локальной QA помечается как seed fallback.",
    description:
      "Юниты, финансовый риск, открытый сервис и риск доступа проходят через одни и те же ролевые маршруты dashboard.",
    sessionSeed: "данные сессии",
    sourceLocal: "Локальный seed fallback",
    sourceRealtime: "Supabase realtime",
    sourceSnapshot: "Supabase snapshot",
    units: "Юниты",
    occupancy: "{value}% занято",
    openService: "Открытый сервис",
    sla: "{value} SLA",
    debt: "Долг",
    debtUnit: "K TRY",
    accessRisk: "Риск доступа",
    restricted: "ограничено",
    blockSelector: "Выбор блока",
    blocks: "{count} блоков",
    block: "Блок",
    risk: "риск",
    selectedBlock: "Выбранный блок",
    occupied: "занято",
    blocked: "заблокировано",
    eventRail: "Realtime лента событий",
    empty: "Лента событий появится после первого live-действия.",
    actions: {
      listings: "Открыть матрицу юнитов",
      tickets: "Открыть контроль сервиса",
      finance: "Открыть финансовый контроль",
      reports: "Открыть AI-отчеты",
    },
    events: {
      "ACT-1": {
        actor: "Бухгалтерия",
        message: "Очередь автоматических напоминаний о долге подготовлена для 23 юнитов.",
        type: "Оплаты",
      },
      "ACT-2": {
        actor: "Операции",
        message: "Проверка ущерба по депозиту открыта для 2 сегодняшних check-out.",
        type: "Бронирование",
      },
      "ACT-3": {
        actor: "Охрана",
        message: "Список ограничений доступа обновлен для 15 юнитов в legal follow-up.",
        type: "Доступ",
      },
      "ACT-4": {
        actor: "Техника",
        message: "Срочная заявка по лифту назначена, SLA-таймер запущен.",
        type: "Сервис",
      },
      "ACT-5": {
        actor: "AI",
        message: "Приоритетный скор создан для 37 счетов с высоким риском оплаты.",
        type: "AI",
      },
    },
  },
} as const

type SimulationLocale = keyof typeof simulationCopy

function resolveSimulationLocale(locale: string): SimulationLocale {
  return locale in simulationCopy ? (locale as SimulationLocale) : "tr"
}

function copyText(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] === undefined ? `{${key}}` : String(values[key])
  )
}

function formatGeneratedAt(value: string | undefined, locale: SimulationLocale) {
  const copy = simulationCopy[locale]
  if (!value) return copy.sessionSeed
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return copy.sessionSeed
  const dateLocale = locale === "tr" ? "tr-TR" : locale === "de" ? "de-DE" : locale === "ru" ? "ru-RU" : "en-US"
  return new Intl.DateTimeFormat(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date)
}

function localizeStreamMessage(value: string, locale: ReturnType<typeof resolveDashboardLocale>) {
  const localized = localizeDashboardTextPart(value, locale)
  if (localized !== value) return localized
  if (locale !== "tr") return value

  return value
    .replace(/^AI interest - what-is/i, "AI talep sinyali")
    .replace(/^AI interest/i, "AI talep sinyali")
    .replace(/\bwhats\b/i, "WhatsApp")
    .replace(/\baccess update\b/i, "erişim güncelleme")
    .replace(/\bCamera incident lookup request\b/i, "kamera olay inceleme talebi")
    .replace(/\bDeposit hold\b/i, "depozito bekletme")
    .replace(/\bcheckout\b/i, "çıkış")
    .replace(/\bwaiting_approval\b/gi, "onay bekliyor")
    .replace(/\bclient_action_requests\b/gi, "onay kuyruğu")
    .replace(/\bservice_ticket\b/gi, "servis talebi")
    .replace(/\bai_action_logs\b/gi, "AI aksiyon kaydı")
}

function localizeTicketActor(value: string, locale: ReturnType<typeof resolveDashboardLocale>) {
  if (locale !== "tr") return value
  return value
    .replace(/\bwaiting_approval\b/gi, "Onay bekliyor")
    .replace(/\btriage\b/gi, "Ön inceleme")
    .replace(/\bassigned\b/gi, "Atandı")
    .replace(/\bin_progress\b/gi, "İşlemde")
    .replace(/\bopen\b/gi, "Açık")
}

function blockRisk(block: BlockOverview, totalDebtTry: number) {
  const debtScore = Math.round((block.debtTry / Math.max(totalDebtTry, 1)) * 100)
  return Math.min(100, debtScore + block.blocked * 5 + block.maintenance * 3)
}

export function LiveErpSimulation({
  activityItems = [],
  blocks,
  criticalTickets = [],
  generatedAt,
  permittedHrefs,
  quickActions,
  realtimeState = "disabled",
  requestState = "idle",
  roleLabel,
  source,
  summary,
}: LiveErpSimulationProps) {
  const rawLocale = useLocale()
  const locale = resolveSimulationLocale(rawLocale)
  const dashboardLocale = resolveDashboardLocale(rawLocale)
  const copy = simulationCopy[locale]
  const actionItems = useMemo(
    () =>
      quickActions?.slice(0, 4) ?? [
        { href: "/dashboard/listings", icon: DatabaseZap, label: copy.actions.listings },
        { href: "/dashboard/tickets", icon: TicketCheck, label: copy.actions.tickets },
        { href: "/dashboard/finance", icon: CreditCard, label: copy.actions.finance },
        { href: "/dashboard/reports", icon: Brain, label: copy.actions.reports },
      ],
    [
      copy.actions.finance,
      copy.actions.listings,
      copy.actions.reports,
      copy.actions.tickets,
      quickActions,
    ]
  )
  const allowedHrefSet = useMemo(
    () => new Set(permittedHrefs?.length ? permittedHrefs : actionItems.map((item) => item.href)),
    [actionItems, permittedHrefs]
  )
  const resolveMetricHref = (preferredHref: string, fallbackHrefs: string[]) => {
    if (allowedHrefSet.has(preferredHref)) return preferredHref

    return (
      fallbackHrefs.find((href) => allowedHrefSet.has(href)) ??
      actionItems.find((item) => allowedHrefSet.has(item.href))?.href ??
      preferredHref
    )
  }
  const prefersReducedMotion = useReducedMotion()
  const visibleBlocks = useMemo(() => blocks.slice(0, 8), [blocks])
  const [activeBlock, setActiveBlock] = useState(visibleBlocks[0]?.block ?? "")
  const selectedBlock =
    visibleBlocks.find((block) => block.block === activeBlock) ?? visibleBlocks[0]

  const streamEvents = useMemo(() => {
    const localizedActivityItems = activityItems.slice(0, 3).map((event) => ({
      ...event,
      actor: copy.events[event.id as keyof typeof copy.events]?.actor ?? event.actor,
      message: localizeStreamMessage(
        copy.events[event.id as keyof typeof copy.events]?.message ?? event.message,
        dashboardLocale
      ),
      type: localizeStreamMessage(
        copy.events[event.id as keyof typeof copy.events]?.type ?? event.type,
        dashboardLocale
      ),
    }))
    const ticketEvents = criticalTickets.slice(0, 3).map((ticket) => ({
      href: "/dashboard/tickets",
      id: `ticket-${ticket.id}`,
      message: `${ticket.label}: ${localizeStreamMessage(ticket.title, dashboardLocale)}`,
      type: `${ticket.slaHoursRemaining}h SLA`,
      actor: localizeTicketActor(ticket.assignee, dashboardLocale),
    }))

    return [...localizedActivityItems, ...ticketEvents].slice(0, 5)
  }, [activityItems, copy, criticalTickets, dashboardLocale])

  useEffect(() => {
    if (visibleBlocks.length <= 1) return
    const interval = window.setInterval(() => {
      setActiveBlock((current) => {
        const currentIndex = Math.max(
          0,
          visibleBlocks.findIndex((block) => block.block === current)
        )
        return visibleBlocks[(currentIndex + 1) % visibleBlocks.length]?.block ?? current
      })
    }, 4200)

    return () => window.clearInterval(interval)
  }, [visibleBlocks])

  // Gently spotlights one event at a time so the feed reads as "live" without re-fetching.
  const [featuredEventIndex, setFeaturedEventIndex] = useState(0)
  const safeFeaturedEventIndex =
    streamEvents.length > 0 ? featuredEventIndex % streamEvents.length : 0
  useEffect(() => {
    if (prefersReducedMotion || streamEvents.length <= 1) return
    const interval = window.setInterval(() => {
      setFeaturedEventIndex((current) => (current + 1) % streamEvents.length)
    }, 3200)
    return () => window.clearInterval(interval)
  }, [prefersReducedMotion, streamEvents.length])

  const sourceLabel =
    source === "supabase"
      ? realtimeState === "connected"
        ? copy.sourceRealtime
        : copy.sourceSnapshot
      : copy.sourceLocal
  const sourceVariant =
    source === "supabase" && realtimeState === "connected"
      ? "success"
      : source === "supabase"
        ? "info"
        : "warning"

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-border bg-[radial-gradient(circle_at_14%_12%,rgba(20,184,166,0.16),transparent_24%),linear-gradient(135deg,var(--card),color-mix(in_srgb,var(--primary)_7%,var(--card)))] p-4 shadow-2xl shadow-black/[0.05] md:p-5"
      aria-label={copy.aria}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(color-mix(in_srgb,var(--border)_58%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_srgb,var(--border)_58%,transparent)_1px,transparent_1px)] [background-size:38px_38px]" />
      <div className="relative z-10 grid gap-5 xl:grid-cols-[minmax(320px,0.78fr)_minmax(0,1.22fr)]">
        <div className="min-w-0 rounded-2xl border border-border/75 bg-card/86 p-4 shadow-xl shadow-black/[0.04] backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Radio className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
                    {copy.eyebrow}
                  </p>
                  <h2 className="mt-1 text-xl font-black leading-tight text-foreground">
                    {roleLabel} {copy.controlPlane}
                  </h2>
                </div>
                <InfoTooltip
                  label={copy.infoLabel}
                  text={copy.infoText}
                />
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                {copy.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant={sourceVariant}>{sourceLabel}</StatusBadge>
              <StatusBadge variant={requestState === "error" ? "danger" : "neutral"}>
                {formatGeneratedAt(generatedAt, locale)}
              </StatusBadge>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            {[
              {
                href: resolveMetricHref("/dashboard/listings", [
                  "/dashboard/documents",
                  "/dashboard/calendar",
                  "/dashboard/tickets",
                  "/dashboard/communications",
                ]),
                icon: Building2,
                label: copy.units,
                value: summary.totalFlats,
                helper: copyText(copy.occupancy, { value: summary.occupancyRate }),
              },
              {
                href: resolveMetricHref("/dashboard/tickets", [
                  "/dashboard/calendar",
                  "/dashboard/documents",
                  "/dashboard/communications",
                ]),
                icon: TicketCheck,
                label: copy.openService,
                value: summary.openTickets,
                helper: copyText(copy.sla, { value: summary.overdueTickets }),
              },
              {
                href: resolveMetricHref("/dashboard/finance", [
                  "/dashboard/documents",
                  "/dashboard/reports",
                  "/dashboard/communications",
                  "/dashboard/tickets",
                ]),
                icon: CreditCard,
                label: copy.debt,
                value: Math.round(summary.totalDebtTry / 1000),
                helper: copy.debtUnit,
              },
              {
                href: resolveMetricHref("/dashboard/compliance", [
                  "/dashboard/calendar",
                  "/dashboard/tickets",
                  "/dashboard/finance",
                  "/dashboard/documents",
                  "/dashboard/communications",
                ]),
                icon: LockKeyhole,
                label: copy.accessRisk,
                value: summary.restrictedAccess,
                helper: copy.restricted,
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group rounded-xl border border-border bg-background/70 p-3 transition hover:border-primary/45 hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                <div className="flex items-center justify-between gap-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <p className="mt-2 text-[11px] font-bold uppercase text-muted-foreground">
                  {item.label}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <AnimatedCounter value={item.value} className="text-2xl font-black text-foreground" />
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    {item.helper}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-5 rounded-xl border border-border/70 bg-background/65 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground">
                {copy.blockSelector}
              </p>
              <StatusBadge variant="neutral">{copyText(copy.blocks, { count: visibleBlocks.length })}</StatusBadge>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {visibleBlocks.map((block) => {
                const active = block.block === selectedBlock?.block
                const risk = blockRisk(block, summary.totalDebtTry)
                return (
                  <button
                    key={block.block}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setActiveBlock(block.block)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                      active
                        ? "border-primary/55 bg-primary/10 text-primary"
                        : "border-border bg-card hover:border-primary/35"
                    )}
                  >
                    <span className="block text-xs font-black">{copy.block} {block.block}</span>
                    <span className="mt-1 block text-[11px] text-muted-foreground">
                      {copy.risk} {risk}%
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div
          data-testid="erp-simulation-stage"
          className="relative min-h-[460px] overflow-hidden rounded-2xl border border-border bg-[#f8faf9] shadow-inner"
        >
          <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_20%,rgba(20,184,166,.15),transparent_28%),radial-gradient(circle_at_72%_70%,rgba(255,107,87,.13),transparent_30%)]" />
          {/* Ground line with a single subtle shimmer pass — suggests live data, not decoration. */}
          <div className="absolute inset-x-6 top-[54%] h-px bg-gradient-to-r from-transparent via-slate-300/70 to-transparent" />
          {!prefersReducedMotion && (
            <motion.span
              aria-hidden="true"
              className="absolute top-[54%] z-[1] h-px w-28 -mt-px rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
              animate={{ left: ["4%", "78%"], opacity: [0, 1, 1, 0] }}
              transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", times: [0, 0.16, 0.84, 1] }}
            />
          )}

          <div className="absolute inset-0">
            {visibleBlocks.map((block, index) => {
              const risk = blockRisk(block, summary.totalDebtTry)
              const active = selectedBlock?.block === block.block
              const count = visibleBlocks.length
              const left = count > 1 ? 8 + index * (84 / (count - 1)) : 50
              const height = 64 + Math.round((block.occupied / Math.max(block.total, 1)) * 92)
              const alert = risk >= 35

              return (
                <motion.button
                  key={block.block}
                  type="button"
                  onClick={() => setActiveBlock(block.block)}
                  aria-pressed={active}
                  aria-label={`${copy.block} ${block.block}`}
                  className="absolute bottom-[46%] origin-bottom -translate-x-1/2 focus-visible:outline-none"
                  style={{ left: `${left}%` }}
                  initial={false}
                  animate={{ y: active ? -10 : 0 }}
                  transition={{ type: "spring", stiffness: 210, damping: 24 }}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-x-5 -bottom-4 top-2 rounded-[40%] bg-primary/15 blur-2xl"
                    />
                  )}
                  <div
                    className={cn(
                      "relative w-12 overflow-hidden rounded-t-lg border bg-gradient-to-b from-white to-slate-50 shadow-[0_16px_26px_rgba(15,23,42,0.12)] transition-colors sm:w-14",
                      active
                        ? "border-primary/55 ring-2 ring-primary/25"
                        : alert
                          ? "border-rose-200"
                          : "border-slate-200/80"
                    )}
                    style={{ height }}
                  >
                    <div className="grid h-full grid-cols-3 content-start gap-1 p-2">
                      {Array.from({ length: 15 }).map((_, windowIndex) => (
                        <span
                          key={windowIndex}
                          className={cn(
                            "aspect-square rounded-[2px]",
                            windowIndex % 6 === 0 && alert
                              ? "bg-rose-300"
                              : windowIndex % 4 === 0
                                ? "bg-amber-200"
                                : active
                                  ? "bg-teal-200"
                                  : "bg-teal-100"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <span
                    aria-hidden="true"
                    className="mx-auto mt-1 block h-1 w-8 rounded-full bg-slate-900/10 blur-[2px]"
                  />
                  <span
                    className={cn(
                      "mt-0.5 block text-center text-[10px] font-black transition-colors",
                      active ? "text-primary" : "text-slate-400"
                    )}
                  >
                    {block.block}
                  </span>
                </motion.button>
              )
            })}
          </div>

          {selectedBlock && (
            <div className="absolute bottom-5 left-5 right-5 z-20 grid gap-3 lg:h-[18.5rem] lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:items-stretch">
              <div
                data-testid="erp-selected-block-card"
                className="h-full min-h-0 overflow-hidden rounded-2xl border border-white/80 bg-white/90 p-4 shadow-2xl shadow-slate-900/[0.10] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {copy.selectedBlock}
                    </p>
                    <h3 className="mt-1 text-2xl font-black text-slate-950">
                      {copy.block} {selectedBlock.block}
                    </h3>
                  </div>
                  <StatusBadge variant={blockRisk(selectedBlock, summary.totalDebtTry) > 35 ? "warning" : "success"}>
                    {copy.risk} {blockRisk(selectedBlock, summary.totalDebtTry)}%
                  </StatusBadge>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl bg-slate-100 p-3">
                    <p className="font-black text-slate-950">{selectedBlock.total}</p>
                    <p className="text-slate-500">{copy.units.toLowerCase()}</p>
                  </div>
                  <div className="rounded-xl bg-teal-50 p-3">
                    <p className="font-black text-slate-950">{selectedBlock.occupied}</p>
                    <p className="text-slate-500">{copy.occupied}</p>
                  </div>
                  <div className="rounded-xl bg-rose-50 p-3">
                    <p className="font-black text-slate-950">{selectedBlock.blocked}</p>
                    <p className="text-slate-500">{copy.blocked}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="font-black text-slate-950">{formatTryShort(selectedBlock.debtTry)}</p>
                    <p className="text-slate-500">{copy.debt.toLowerCase()}</p>
                  </div>
                </div>
              </div>

              <div
                data-testid="erp-event-rail"
                className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-white/80 bg-slate-950/88 p-4 text-white shadow-2xl shadow-slate-900/[0.16] backdrop-blur"
              >
                {!prefersReducedMotion && (
                  <motion.div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent"
                    animate={{ y: [0, 220, 0], opacity: [0, 0.9, 0] }}
                    transition={{ duration: 4.4, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}
                <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/55">
                    {copy.eventRail}
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-400/15 px-1.5 py-0.5 text-[9px] font-black text-teal-300">
                      <motion.span
                        className="h-1.5 w-1.5 rounded-full bg-teal-300"
                        animate={
                          prefersReducedMotion
                            ? undefined
                            : { opacity: [1, 0.25, 1], scale: [1, 0.8, 1] }
                        }
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                      />
                      LIVE
                    </span>
                  </p>
                  <Activity className="h-4 w-4 text-teal-300" />
                </div>
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {streamEvents.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {streamEvents.map((event, index) => {
                        const featured = index === safeFeaturedEventIndex
                        return (
                          <motion.div
                            key={event.id}
                            initial={{ opacity: 0, x: 16 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -16 }}
                            transition={{
                              duration: 0.35,
                              delay: prefersReducedMotion ? 0 : index * 0.07,
                              ease: "easeOut",
                            }}
                          >
                            <Link
                              href={event.href}
                              className={cn(
                                "block rounded-xl border p-2 transition",
                                featured
                                  ? "border-teal-300/60 bg-teal-300/[0.12] shadow-[0_0_22px_rgba(45,212,191,.22)]"
                                  : "border-white/10 bg-white/[0.06] hover:bg-white/[0.10]"
                              )}
                            >
                              <p className="flex items-start gap-1.5 text-xs font-black text-white">
                                <motion.span
                                  className={cn(
                                    "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                                    featured ? "bg-teal-300" : "bg-white/40"
                                  )}
                                  animate={
                                    featured && !prefersReducedMotion
                                      ? { scale: [1, 1.6, 1], opacity: [1, 0.5, 1] }
                                      : undefined
                                  }
                                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                                />
                                <span className="line-clamp-1">{event.message}</span>
                              </p>
                              <p className="mt-1 flex items-center gap-1 pl-3 text-[11px] text-white/55">
                                <Clock3 className="h-3 w-3" />
                                {event.actor ?? "CRM"} - {event.type}
                              </p>
                            </Link>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-white/[0.06] p-3 text-xs text-white/60">
                      {copy.empty}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {actionItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card/88 px-4 py-2 text-sm font-black text-foreground shadow-sm transition hover:border-primary/40 hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <Icon className="h-4 w-4 text-primary" />
            {label}
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </section>
  )
}
