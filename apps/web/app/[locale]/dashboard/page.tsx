"use client"

import { useMemo } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  Building2,
  CalendarCheck,
  ChevronRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  MessageSquareText,
  Network,
  Route,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { hasPermission, roleDefinitions, type Resource, type Role } from "@/lib/rbac"
import { dashboardRoutes, resourceForDashboardPath } from "@/lib/dashboard-routing"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"
import { StatusBadge } from "@/components/status-badge"
import { LineChart } from "@/components/charts/line-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { GlassCard } from "@/components/glass-card"
import { SiteCommandSimulation } from "@/components/site-command-simulation"
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button"
import { LiveErpSimulation, type SimulationQuickAction } from "@/components/live-erp-simulation"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import { useLiveDashboardSnapshot } from "@/hooks/use-live-dashboard-snapshot"
import {
  dashboardHomeCopy,
  resolveDashboardHomeLocale,
  type DashboardHomeCopy,
  type WorkloadKind,
} from "@/lib/dashboard-home-copy"
import { localizeDashboardTextPart, resolveDashboardLocale } from "@/lib/operational-copy"
import type {
  DashboardSnapshot,
  Phase4SiteData,
} from "@/lib/site-management-repository"
import {
  aiInsights,
  bookings,
  cashFlow,
  type BlockOverview,
  formatTryShort,
  getBlockOverview,
  getFlatStatusDistribution,
  getOccupancyTrend,
  getPhaseDeliverySummary,
  getSummary,
  phaseDeliveryRecords,
  type PhaseDeliveryStatus,
  serviceTickets,
  type SiteSummary,
  siteActivities,
} from "@/lib/site-management-data"

interface Kpi {
  icon: LucideIcon
  label: string
  value: number
  suffix?: string
  helper: string
  color: string
  href: string
}

type FocusedRole = "accountant" | "staff" | "owner" | "tenant"
type RoleWorkspaceCardKey = "calendar" | "communications" | "documents" | "finance" | "reports" | "tickets"

function copyText(
  template: string,
  values: Record<string, string | number> = {}
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] === undefined ? `{${key}}` : String(values[key])
  )
}

const workloadKindClassNames: Record<WorkloadKind, string> = {
  access: "bg-rose-500/75 shadow-rose-500/20",
  booking: "bg-sky-500/75 shadow-sky-500/20",
  finance: "bg-amber-500/80 shadow-amber-500/20",
  service: "bg-teal-500/75 shadow-teal-500/20",
}

const workloadLegendClassNames: Record<WorkloadKind, string> = {
  access: "bg-rose-500",
  booking: "bg-sky-500",
  finance: "bg-amber-500",
  service: "bg-teal-500",
}

function CommandLink({
  ariaLabel,
  children,
  className,
  href,
  role,
}: {
  ariaLabel: string
  children: React.ReactNode | ((state: { allowed: boolean }) => React.ReactNode)
  className?: string
  href: string
  role: Role
}) {
  const copy = dashboardHomeCopy[resolveDashboardHomeLocale(useLocale())]
  const resource = resourceForDashboardPath(href)
  const allowed = hasPermission(role, resource, "view")
  const content = typeof children === "function" ? children({ allowed }) : children
  const baseClassName = cn(
    "group/command relative block rounded-xl outline-none transition-transform duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    allowed ? "cursor-pointer hover:-translate-y-0.5 active:translate-y-0" : "cursor-not-allowed opacity-65 grayscale-[0.2]",
    className
  )

  if (!allowed) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${ariaLabel} - ${copy.command.lockedAriaSuffix}`}
        className={baseClassName}
        data-access="locked"
        role="group"
        title={copy.command.lockedTitle}
      >
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={baseClassName}
      data-access="open"
    >
      {content}
    </Link>
  )
}

function DrilldownCue({ allowed }: { allowed: boolean }) {
  const copy = dashboardHomeCopy[resolveDashboardHomeLocale(useLocale())]

  if (!allowed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background/70 px-2 py-1 text-[11px] font-black text-muted-foreground">
        {copy.command.locked}
        <LockKeyhole className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-current/15 bg-background/60 px-2 py-1 text-[11px] font-black shadow-sm transition-colors group-hover/command:bg-primary group-hover/command:text-primary-foreground">
      {copy.command.inspect}
      <ChevronRight className="h-3 w-3" />
    </span>
  )
}

const phaseRoutes: Record<number, string> = {
  1: "/dashboard/reports",
  2: "/dashboard",
  3: "/dashboard/settings",
  4: "/dashboard/listings",
  5: "/dashboard/users",
  6: "/dashboard/finance",
  7: "/dashboard/finance",
  8: "/dashboard/tickets",
  9: "/dashboard/tickets",
  10: "/dashboard/calendar",
  11: "/dashboard/communications",
  12: "/dashboard",
  13: "/dashboard/settings",
  14: "/dashboard/reports",
  15: "/dashboard/reports",
}

const phaseStatusMeta: Record<
  PhaseDeliveryStatus,
  { label: string; icon: LucideIcon; className: string }
> = {
  complete: {
    label: "Aktif",
    icon: CheckCircle2,
    className: "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  ready_for_uat: {
    label: "Kontrol hazır",
    icon: ShieldCheck,
    className: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  in_progress: {
    label: "Yapımda",
    icon: Clock3,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  planned: {
    label: "Planlandı",
    icon: Route,
    className: "border-border bg-background/70 text-muted-foreground",
  },
  blocked: {
    label: "Bloke",
    icon: AlertTriangle,
    className: "border-destructive/25 bg-destructive/10 text-destructive",
  },
}

const roleWorkspaceConfig: Partial<
  Record<
    FocusedRole,
    {
      cards: Array<{
        href: string
        resource: Resource
        icon: LucideIcon
        copyKey: RoleWorkspaceCardKey
      }>
    }
  >
> = {
  accountant: {
    cards: [
      {
        href: "/dashboard/finance",
        resource: "finance",
        icon: CreditCard,
        copyKey: "finance",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        copyKey: "documents",
      },
      {
        href: "/dashboard/reports",
        resource: "reports",
        icon: Brain,
        copyKey: "reports",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        copyKey: "communications",
      },
    ],
  },
  staff: {
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        copyKey: "tickets",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        copyKey: "calendar",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        copyKey: "documents",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        copyKey: "communications",
      },
    ],
  },
  owner: {
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        copyKey: "tickets",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        copyKey: "calendar",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        copyKey: "documents",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        copyKey: "communications",
      },
    ],
  },
  tenant: {
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        copyKey: "tickets",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        copyKey: "calendar",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        copyKey: "documents",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        copyKey: "communications",
      },
    ],
  },
}

const roleSceneConfig: Partial<
  Record<
    FocusedRole,
    {
      metric: string
      accent: string
      icon: LucideIcon
      bars: number[]
    }
  >
> = {
  accountant: {
    metric: "1.4M ₺",
    accent: "from-emerald-500 via-cyan-500 to-amber-400",
    icon: CreditCard,
    bars: [88, 62, 76],
  },
  staff: {
    metric: "14",
    accent: "from-teal-500 via-sky-500 to-lime-400",
    icon: TicketCheck,
    bars: [72, 84, 58],
  },
  owner: {
    metric: "4",
    accent: "from-cyan-500 via-emerald-500 to-orange-300",
    icon: Building2,
    bars: [68, 54, 81],
  },
  tenant: {
    metric: "4",
    accent: "from-sky-500 via-teal-500 to-amber-300",
    icon: CalendarCheck,
    bars: [64, 71, 57],
  },
}

const simulationActionIcons = {
  dashboard: BarChart3,
  listings: Building2,
  leads: Users,
  deals: Users,
  tickets: TicketCheck,
  calendar: CalendarCheck,
  documents: FileText,
  eids_compliance: ShieldCheck,
  finance: CreditCard,
  reports: Brain,
  users: Users,
  settings: Network,
  communications: MessageSquareText,
  offline_sync: Network,
} satisfies Record<Resource, LucideIcon>

const simulationActionResourceOrder: Resource[] = [
  "listings",
  "tickets",
  "calendar",
  "finance",
  "documents",
  "reports",
  "communications",
  "offline_sync",
  "users",
  "settings",
  "leads",
  "eids_compliance",
]

function buildSimulationQuickActions(
  role: Role,
  labelForResource: (resource: Resource) => string
): SimulationQuickAction[] {
  const routesByResource = new Map(
    dashboardRoutes.map((route) => [route.resource, route])
  )

  return simulationActionResourceOrder
    .map((resource) => routesByResource.get(resource))
    .filter((route): route is (typeof dashboardRoutes)[number] => Boolean(route))
    .filter((route) => hasPermission(role, route.resource, "view"))
    .slice(0, 4)
    .map((route) => ({
      href: route.href,
      icon: simulationActionIcons[route.resource],
      label: labelForResource(route.resource),
    }))
}

function isFocusedRole(role: Role): role is FocusedRole {
  return role === "accountant" || role === "staff" || role === "owner" || role === "tenant"
}

function RoleWorkspaceScene({ copy, role }: { copy: DashboardHomeCopy; role: FocusedRole }) {
  const config = roleSceneConfig[role]
  if (!config) return null

  const sceneCopy = copy.roleScenes[role]
  const Icon = config.icon

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 text-white shadow-2xl shadow-primary/[0.12]">
        <div className="absolute inset-0 opacity-70 [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", config.accent)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(45,212,191,.22),transparent_34%),linear-gradient(135deg,rgba(15,23,42,.92),rgba(4,47,46,.82)_45%,rgba(17,24,39,.96))]" />
        <motion.div
          aria-hidden="true"
          className="absolute left-12 top-20 h-32 w-[58%] rounded-full border border-dashed border-white/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 26, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-20 top-16 h-24 w-24 rounded-2xl border border-white/15 bg-white/[0.04]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute bottom-0 left-0 right-0 hidden h-28 items-end gap-2 px-8 opacity-70 sm:flex">
          {[42, 72, 54, 88, 62, 76, 48, 66, 92, 58].map((height, index) => (
            <motion.div
              key={index}
              className="min-w-8 flex-1 rounded-t-lg border border-white/10 bg-white/[0.08]"
              initial={{ height: 12 }}
              animate={{ height }}
              transition={{ delay: index * 0.05, duration: 0.7 }}
            />
          ))}
        </div>
        <div className="relative z-10 flex min-h-[350px] flex-col gap-7 p-5 sm:min-h-[360px] sm:p-6 xl:min-h-[340px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
                {sceneCopy.eyebrow}
              </p>
              <h2 className="mt-4 max-w-xl text-2xl font-black leading-tight sm:text-3xl 2xl:text-4xl">
                {sceneCopy.title}
              </h2>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <Icon className="ml-auto h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-3xl font-black">{config.metric}</p>
              <p className="mt-1 max-w-36 text-xs leading-5 text-white/70">
                {sceneCopy.metricLabel}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {sceneCopy.timeline.map((item, index) => (
              <motion.div
                key={item.label}
                className="min-w-0 rounded-xl border border-white/12 bg-white/[0.075] p-3 backdrop-blur transition-colors hover:bg-white/[0.12]"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.08 }}
              >
                <p className="text-[11px] font-black uppercase text-white/55">
                  0{index + 1}
                </p>
                <p className="mt-1 text-sm font-black">{item.label}</p>
                <p className="mt-1 text-xs leading-5 text-white/65">{item.detail}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">
                {copy.roleScenes.common.liveFilterLabel}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {sceneCopy.status}
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Network className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {config.bars.map((value, index) => (
              <div key={sceneCopy.bars[index]} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-card-foreground">{sceneCopy.bars[index]}</span>
                  <span className="font-black text-primary">{value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", config.accent)}
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ delay: 0.2 + index * 0.08, duration: 0.65 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-black text-card-foreground">
                {copy.roleScenes.common.rhythmTitle}
              </p>
              <p className="text-xs text-muted-foreground">
                {copy.roleScenes.common.rhythmDescription}
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-7 items-end gap-1.5">
            {[36, 68, 44, 76, 58, 84, 62].map((height, index) => (
              <motion.div
                key={index}
                className="rounded-t-md bg-primary/20 transition-colors hover:bg-primary/70"
                style={{ height }}
                initial={{ scaleY: 0.2, transformOrigin: "bottom" }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                title={`Gün ${index + 1}: ${height}%`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GlobalOperationsScene({
  copy,
  roleLabel,
  summary,
}: {
  copy: DashboardHomeCopy
  roleLabel: string
  summary: SiteSummary
}) {
  const panels = [
    {
      label: copy.globalScene.panels.liveUnits,
      value: summary.totalFlats,
      helper: copyText(copy.globalScene.panels.occupancy, {
        value: summary.occupancyRate,
      }),
      icon: Building2,
    },
    {
      label: copy.globalScene.panels.openService,
      value: summary.openTickets,
      helper: copyText(copy.globalScene.panels.overdue, {
        value: summary.overdueTickets,
      }),
      icon: TicketCheck,
    },
    {
      label: copy.globalScene.panels.accessRisk,
      value: summary.restrictedAccess,
      helper: copy.globalScene.panels.financeCheck,
      icon: LockKeyhole,
    },
  ]

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 text-white shadow-2xl shadow-primary/[0.14]">
        <Image
          src="/new-level-premium/site-progress-2026.jpg"
          alt="New Level Premium live site progress"
          fill
          priority
          sizes="(min-width: 1280px) 60vw, 100vw"
          className="object-cover opacity-48"
        />
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.06)_1px,transparent_1px)] [background-size:52px_52px]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(3,16,14,.94),rgba(13,78,74,.82)_48%,rgba(28,25,23,.82)),radial-gradient(circle_at_75%_25%,rgba(251,191,36,.16),transparent_30%)]" />
        <motion.div
          aria-hidden="true"
          className="absolute left-[12%] top-[18%] h-44 w-44 rounded-[2rem] border border-white/12 bg-white/[0.045]"
          animate={{ rotate: [0, 3, 0], y: [0, -7, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-[14%] top-[16%] h-32 w-56 rounded-2xl border border-emerald-200/15 bg-emerald-200/[0.06]"
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-x-8 bottom-8 hidden h-px bg-gradient-to-r from-transparent via-emerald-200/30 to-transparent sm:block" />
        <div className="relative z-10 flex min-h-[380px] flex-col gap-7 p-5 sm:min-h-[400px] sm:p-6 xl:min-h-[380px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
                {copy.globalScene.eyebrow}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl 2xl:text-5xl">
                {copy.globalScene.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                {copyText(copy.globalScene.description, { role: roleLabel })}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <p className="text-xs font-black uppercase text-white/60">
                {copy.globalScene.aiRisk}
              </p>
              <p className="mt-2 text-4xl font-black">{summary.aiRiskCount}</p>
              <p className="mt-1 text-xs text-white/65">
                {copy.globalScene.aiRiskHelper}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {panels.map((panel, index) => {
              const Icon = panel.icon
              return (
                <motion.div
                  key={panel.label}
                  className="min-w-0 rounded-xl border border-white/12 bg-white/[0.08] p-3 backdrop-blur transition-colors hover:bg-white/[0.13] sm:p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + index * 0.07 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase text-white/55">
                        {panel.label}
                      </p>
                      <p className="mt-2 text-3xl font-black">
                        <AnimatedCounter value={panel.value} />
                      </p>
                      <p className="mt-1 text-xs text-white/65">{panel.helper}</p>
                    </div>
                    <Icon className="hidden h-5 w-5 shrink-0 text-emerald-200 sm:block" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">
                {copy.globalScene.workload.eyebrow}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {copy.globalScene.workload.title}
              </h2>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {copy.globalScene.workload.description}
          </p>
          <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <span>{copy.globalScene.workload.scaleLow}</span>
            <span>{copy.globalScene.workload.scaleHigh}</span>
          </div>
          <div className="mt-2 flex h-36 items-end gap-2 border-b border-border/80 pb-2">
            {copy.globalScene.workload.bars.map((bar, index) => (
              <motion.div
                key={`${bar.time}-${bar.kind}`}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.04 }}
                title={`${bar.time} ${bar.label}: ${bar.value}% ${copy.globalScene.workload.loadUnit}`}
              >
                <span className="opacity-0 text-[10px] font-black text-foreground transition-opacity group-hover:opacity-100">
                  {bar.value}%
                </span>
                <span
                  className={cn(
                    "w-full rounded-t-lg shadow-lg transition-opacity hover:opacity-100",
                    workloadKindClassNames[bar.kind]
                  )}
                  style={{ height: `${Math.max(bar.value, 18)}%` }}
                />
              </motion.div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1 text-[10px] font-bold text-muted-foreground">
            {copy.globalScene.workload.bars
              .filter((_, index) => index % 2 === 0)
              .map((bar) => (
                <span key={bar.time}>{bar.time}</span>
              ))}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(copy.globalScene.workload.legend).map(([kind, label]) => (
              <div key={kind} className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full",
                    workloadLegendClassNames[kind as WorkloadKind]
                  )}
                />
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/35 p-3">
            <p className="text-xs font-black uppercase text-card-foreground">
              {copy.globalScene.workload.peakLabel}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.globalScene.workload.peakText}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-card-foreground">
                {copy.globalScene.rbacTitle}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {copy.globalScene.rbacDescription}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function RoleFocusedDashboard({
  copy,
  quickActions,
  role,
  roleLabel,
}: {
  copy: DashboardHomeCopy
  quickActions: SimulationQuickAction[]
  role: FocusedRole
  roleLabel: string
}) {
  const config = roleWorkspaceConfig[role]
  if (!config) return null

  const workspaceCopy = copy.roleWorkspaces[role]
  const cards = config.cards.filter((card) =>
    hasPermission(role, card.resource, "view")
  )
  const summary = getSummary()
  const blocks = getBlockOverview()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground md:text-3xl">
          {workspaceCopy.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          {workspaceCopy.description} {copy.erpWorld.activeRole}:{" "}
          <span className="font-semibold text-foreground">{roleLabel}</span>.
        </p>
      </div>

      <LiveErpSimulation
        blocks={blocks}
        criticalTickets={[]}
        quickActions={quickActions}
        realtimeState="disabled"
        requestState="success"
        roleLabel={roleLabel}
        source="local-seed"
        summary={{
          ...summary,
          openTickets: role === "staff" ? summary.openTickets : cards.length,
        }}
      />

      <RoleWorkspaceScene copy={copy} role={role} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const cardCopies = workspaceCopy.cards as Record<
            RoleWorkspaceCardKey,
            { title: string; description: string }
          >
          const cardCopy = cardCopies[card.copyKey]

          return (
            <CommandLink
              key={card.href}
              href={card.href}
              ariaLabel={cardCopy.title}
              role={role}
            >
              <Card3D glow={false}>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-black text-card-foreground">
                      {cardCopy.title}
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {cardCopy.description}
                    </p>
                  </div>
                </div>
              </Card3D>
            </CommandLink>
          )
        })}
      </div>

      <Card3D glow={false}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-card-foreground">
              {copy.roleWorkspaces.common.boundariesTitle}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.roleWorkspaces.common.boundariesBody}
            </p>
            {workspaceCopy.accessNotes.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {workspaceCopy.accessNotes.map((constraint) => (
                  <span
                    key={constraint}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                  >
                    {constraint}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card3D>
    </div>
  )
}

function routeForActivity(type: string) {
  if (type.includes("Tahsilat")) return "/dashboard/finance"
  if (type.includes("Rezervasyon")) return "/dashboard/calendar"
  if (type.includes("Eri")) return "/dashboard/compliance"
  if (type.includes("Servis")) return "/dashboard/tickets"
  if (type.includes("AI")) return "/dashboard/reports"
  return "/dashboard"
}

function routeForInsight(title: string) {
  if (title.includes("Tahsilat")) return "/dashboard/finance"
  if (title.includes("Servis")) return "/dashboard/tickets"
  if (title.includes("Check-out")) return "/dashboard/calendar"
  return "/dashboard/reports"
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const serviceTicketUnitByTicketNo = new Map(
  serviceTickets.map((ticket) => [ticket.id, ticket.flatNumber])
)

function mapLiveSummary(
  snapshot: DashboardSnapshot | null,
  phase4: Phase4SiteData | null,
  fallback: SiteSummary
): SiteSummary {
  const dashboardSummary = snapshot?.summary
  const phaseSummary = phase4?.summary
  const totalFlats =
    phaseSummary?.totalUnits ?? dashboardSummary?.totalUnits ?? fallback.totalFlats
  const occupiedFlats =
    phaseSummary
      ? phaseSummary.occupiedUnits + phaseSummary.reservedUnits
      : dashboardSummary?.occupiedUnits ?? fallback.occupiedFlats
  const vacantFlats =
    phaseSummary?.vacantUnits ?? dashboardSummary?.vacantUnits ?? fallback.vacantFlats
  const blockedFlats =
    phaseSummary?.blockedUnits ?? dashboardSummary?.blockedUnits ?? fallback.blockedFlats
  const totalDebtTry =
    dashboardSummary?.openLedgerCents !== undefined
      ? Math.round(dashboardSummary.openLedgerCents / 100)
      : fallback.totalDebtTry
  const restrictedAccess =
    phase4?.units.filter((unit) => unit.accessStatus === "restricted").length ??
    blockedFlats
  const overdueTickets = dashboardSummary?.overdueTickets ?? fallback.overdueTickets
  const pendingAiActions = dashboardSummary?.pendingAiActions

  return {
    ...fallback,
    totalFlats,
    occupiedFlats,
    vacantFlats,
    blockedFlats,
    occupancyRate: Math.round((occupiedFlats / Math.max(totalFlats, 1)) * 100),
    totalDebtTry,
    openTickets: dashboardSummary?.openTickets ?? fallback.openTickets,
    overdueTickets,
    activeBookings:
      dashboardSummary?.activeReservations ?? fallback.activeBookings,
    restrictedAccess,
    aiRiskCount:
      pendingAiActions !== undefined
        ? pendingAiActions + overdueTickets + restrictedAccess
        : fallback.aiRiskCount,
  }
}

function mapLiveBlocks(phase4: Phase4SiteData | null): BlockOverview[] | null {
  if (!phase4?.blocks.length) return null

  const debtByBlock = new Map<string, number>()
  const maintenanceByBlock = new Map<string, number>()

  phase4.units.forEach((unit) => {
    const blockName = unit.blockName ?? ""
    if (!blockName) return

    debtByBlock.set(
      blockName,
      (debtByBlock.get(blockName) ?? 0) + Math.round(unit.balanceCents / 100)
    )

    if (unit.occupancyStatus === "maintenance") {
      maintenanceByBlock.set(
        blockName,
        (maintenanceByBlock.get(blockName) ?? 0) + 1
      )
    }
  })

  return phase4.blocks.map((block) => ({
    block: block.name,
    total: block.totalUnits,
    availableForSale: block.availableForSale,
    sold: block.soldUnits,
    sourceMissing: block.sourceMissingUnits,
    minBuyNowEur:
      block.minBuyNowEurCents === null
        ? null
        : Math.round(block.minBuyNowEurCents / 100),
    maxBuyNowEur:
      block.maxBuyNowEurCents === null
        ? null
        : Math.round(block.maxBuyNowEurCents / 100),
    priceSourceStatus: block.priceSourceStatus,
    numberingSource: block.numberingSource,
    occupied: block.occupiedUnits,
    vacant: block.vacantUnits,
    blocked: block.blockedUnits,
    maintenance: maintenanceByBlock.get(block.name) ?? 0,
    debtTry: debtByBlock.get(block.name) ?? 0,
  }))
}

function mapLiveDistribution(
  phase4: Phase4SiteData | null,
  fallback: ReturnType<typeof getFlatStatusDistribution>
) {
  if (!phase4?.units.length) return fallback

  const statusOrder = [
    "occupied",
    "vacant",
    "reserved",
    "maintenance",
    "blocked",
  ]
  const counts = phase4.units.reduce<Record<string, number>>((acc, unit) => {
    acc[unit.occupancyStatus] = (acc[unit.occupancyStatus] ?? 0) + 1
    return acc
  }, {})

  return fallback.map((item, index) => ({
    ...item,
    value: counts[statusOrder[index]] ?? 0,
  }))
}

function mapLiveCriticalTickets(snapshot: DashboardSnapshot | null) {
  if (!snapshot?.tickets.length) return null

  return snapshot.tickets.slice(0, 3).map((ticket, index) => {
    const record = asRecord(ticket)
    const ticketNo = asString(
      record.ticket_no,
      asString(record.ticketNo, asString(record.id, `ticket-${index}`))
    )
    const unitLabel = asString(
      record.flat_number,
      asString(record.unit_no, asString(record.unitNo))
    )
    const dueAt = asString(record.sla_due_at)
    const dueDate = dueAt ? new Date(dueAt) : null
    const hoursRemaining =
      dueDate && !Number.isNaN(dueDate.getTime())
        ? Math.round((dueDate.getTime() - Date.now()) / 36e5)
        : asNumber(record.sla_hours_remaining, asNumber(record.slaHoursRemaining, 0))

    return {
      id: ticketNo,
      assignee: asString(record.assignee, asString(record.status, "CRM")),
      label: unitLabel || serviceTicketUnitByTicketNo.get(ticketNo) || "Servis kaydı",
      slaHoursRemaining: hoursRemaining,
      title: asString(record.title, "Operational ticket"),
    }
  })
}

function routeForEntityTable(entityTable: string) {
  if (entityTable.includes("unit") || entityTable.includes("import")) {
    return "/dashboard/listings"
  }
  if (entityTable.includes("service_ticket")) return "/dashboard/tickets"
  if (entityTable.includes("reservation") || entityTable.includes("booking")) {
    return "/dashboard/calendar"
  }
  if (entityTable.includes("finance") || entityTable.includes("ledger")) {
    return "/dashboard/finance"
  }
  if (entityTable.includes("document")) return "/dashboard/documents"
  if (entityTable.includes("access") || entityTable.includes("compliance")) {
    return "/dashboard/compliance"
  }
  if (entityTable.includes("report") || entityTable.includes("ai")) {
    return "/dashboard/reports"
  }
  return "/dashboard"
}

function mapLiveActivities(snapshot: DashboardSnapshot | null) {
  if (!snapshot?.recentActions.length) return null

  return snapshot.recentActions.slice(0, 5).map((action, index) => {
    const record = asRecord(action)
    const actionType = asString(record.action_type, "CRM action")
    const entityTable = asString(record.entity_table, "client_action_requests")
    const externalId = asString(record.entity_external_id)
    const title = asString(record.title)

    return {
      actor: "CRM",
      href: routeForEntityTable(entityTable || actionType),
      id: asString(record.id, `action-${index}`),
      message: title || `${actionType}${externalId ? ` - ${externalId}` : ""}`,
      type: entityTable || actionType,
    }
  })
}

export default function DashboardHomePage() {
  const user = useUser()
  const rawLocale = useLocale()
  const locale = resolveDashboardHomeLocale(rawLocale)
  const copy = dashboardHomeCopy[locale]
  const dashboardT = useTranslations("dashboard")
  const roleT = useTranslations("roles")
  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabel = roleDef ? roleT(roleDef.labelKey.replace("roles.", "")) : user.role
  const quickActions = buildSimulationQuickActions(user.role, (resource) =>
    dashboardT(`menu.${resource}`)
  )

  if (isFocusedRole(user.role) && roleWorkspaceConfig[user.role]) {
    return (
      <RoleFocusedDashboard
        copy={copy}
        quickActions={quickActions}
        role={user.role}
        roleLabel={roleLabel}
      />
    )
  }

  return (
    <OperationsDashboard
      copy={copy}
      quickActions={quickActions}
      user={user}
      roleLabel={roleLabel}
    />
  )
}

function OperationsDashboard({
  copy,
  quickActions,
  user,
  roleLabel,
}: {
  copy: DashboardHomeCopy
  quickActions: SimulationQuickAction[]
  user: ReturnType<typeof useUser>
  roleLabel: string
}) {
  const dashboardLocale = resolveDashboardLocale(useLocale())
  const tRecord = (value: string) => localizeDashboardTextPart(value, dashboardLocale)
  const tActivityMessage = (value: string) => {
    const localized = tRecord(value)
    if (localized !== value) return localized
    if (dashboardLocale !== "tr") return value

    return value
      .replace(/^AI interest - what-is/i, "AI talep sinyali")
      .replace(/^AI interest/i, "AI talep sinyali")
      .replace(/\bwhats\b/i, "WhatsApp")
      .replace(/\baccess update\b/i, "erişim güncelleme")
      .replace(/\bCamera incident lookup request\b/i, "kamera olay arama talebi")
      .replace(/\bDeposit hold\b/i, "depozito bekletme")
      .replace(/\bcheckout\b/i, "çıkış")
      .replace(/\bwaiting_approval\b/gi, "onay bekliyor")
      .replace(/\bclient_action_requests\b/gi, "onay kuyruğu")
      .replace(/\bservice_ticket\b/gi, "servis talebi")
      .replace(/\bai_action_logs\b/gi, "AI aksiyon kaydı")
  }
  const tActivityType = (value: string) =>
    tActivityMessage(value.replaceAll("_", " ")).toLocaleLowerCase(
      dashboardLocale === "tr" ? "tr-TR" : dashboardLocale
    )
  const {
    snapshot,
    phase4,
    refresh,
    realtimeState,
    requestState,
  } = useLiveDashboardSnapshot({ includePhase4: true })
  const fallbackSummary = useMemo(() => getSummary(), [])
  const fallbackBlocks = useMemo(() => getBlockOverview(), [])
  const fallbackStatusDistribution = useMemo(() => getFlatStatusDistribution(), [])
  const summary = useMemo(
    () => mapLiveSummary(snapshot, phase4, fallbackSummary),
    [fallbackSummary, phase4, snapshot]
  )
  const phaseSummary = useMemo(() => getPhaseDeliverySummary(), [])
  const blocks = useMemo(
    () => mapLiveBlocks(phase4) ?? fallbackBlocks,
    [fallbackBlocks, phase4]
  )
  const statusDistribution = useMemo(
    () => mapLiveDistribution(phase4, fallbackStatusDistribution),
    [fallbackStatusDistribution, phase4]
  )
  const criticalTickets = useMemo(
    () =>
      mapLiveCriticalTickets(snapshot) ??
      serviceTickets.slice(0, 3).map((ticket) => ({
        id: ticket.id,
        assignee: ticket.assignee,
        label: ticket.flatNumber,
        slaHoursRemaining: ticket.slaHoursRemaining,
        title: ticket.title,
      })),
    [snapshot]
  )
  const liveActivities = useMemo(() => mapLiveActivities(snapshot), [snapshot])
  const activityItems = useMemo(
    () =>
      liveActivities ??
      siteActivities.map((activity) => ({
        ...activity,
        href: routeForActivity(activity.type),
      })),
    [liveActivities]
  )
  const occupancyTrend = useMemo(() => {
    const trend = getOccupancyTrend()
    return trend.map((point, index) =>
      index === trend.length - 1
        ? { ...point, label: tRecord(point.label), value: summary.occupancyRate }
        : { ...point, label: tRecord(point.label) }
    )
  }, [summary.occupancyRate, tRecord])
  const kpis: Kpi[] = [
    {
      icon: Building2,
      label: copy.kpis.totalUnits,
      value: summary.totalFlats,
      suffix: copyText(copy.kpis.occupancy, { value: summary.occupancyRate }),
      helper: copyText(copy.kpis.unitHelper, {
        maintenance: summary.maintenanceFlats,
        vacant: summary.vacantFlats,
      }),
      color: "text-teal-600",
      href: "/dashboard/listings",
    },
    {
      icon: CreditCard,
      label: copy.kpis.totalDebt,
      value: Math.round(summary.totalDebtTry / 1000),
      suffix: "K ₺",
      helper: copyText(copy.kpis.restricted, { value: summary.restrictedAccess }),
      color: "text-rose-600",
      href: "/dashboard/finance",
    },
    {
      icon: TicketCheck,
      label: copy.kpis.openService,
      value: summary.openTickets,
      suffix: copyText(copy.kpis.overdue, { value: summary.overdueTickets }),
      helper: copy.kpis.serviceHelper,
      color: "text-amber-600",
      href: "/dashboard/tickets",
    },
    {
      icon: CalendarCheck,
      label: copy.kpis.todayWork,
      value: summary.activeBookings,
      suffix: copyText(copy.kpis.checkouts, { value: summary.checkoutsToday }),
      helper: copy.kpis.bookingHelper,
      color: "text-sky-600",
      href: "/dashboard/calendar",
    },
  ]

  const alerts = [
    {
      icon: AlertTriangle,
      text: copyText(copy.alerts.aiRisk, { count: summary.aiRiskCount }),
      variant: "danger" as const,
      href: "/dashboard/reports",
    },
    {
      icon: LockKeyhole,
      text: copyText(copy.alerts.access, { count: summary.restrictedAccess }),
      variant: "warning" as const,
      href: "/dashboard/compliance",
    },
    {
      icon: Clock3,
      text: copyText(copy.alerts.sla, { count: summary.overdueTickets }),
      variant: "warning" as const,
      href: "/dashboard/tickets",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">
            {copyText(copy.hero.title, { client: clientProfile.clientName })}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {copyText(copy.hero.subtitle, {
              role: roleLabel,
              units: summary.totalFlats,
            })}
          </p>
          {requestState === "error" && (
            <p className="mt-3 text-xs font-semibold text-rose-600">
              {copy.hero.refreshError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={clientProfile.portfolioSource}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            {copy.hero.portfolioSource}
          </a>
          <DashboardRefreshButton onRefresh={refresh} />
        </div>
      </div>

      <LiveErpSimulation
        activityItems={activityItems}
        blocks={blocks}
        criticalTickets={criticalTickets}
        generatedAt={snapshot?.generatedAt}
        quickActions={quickActions}
        realtimeState={realtimeState}
        requestState={requestState}
        roleLabel={roleLabel}
        source={snapshot?.source}
        summary={summary}
      />

      <GlobalOperationsScene copy={copy} roleLabel={roleLabel} summary={summary} />

      <div className="grid gap-3 lg:grid-cols-3">
        {alerts.map((alert, index) => (
          <CommandLink
            key={alert.text}
            href={alert.href}
            ariaLabel={alert.text}
            role={user.role}
          >
            {({ allowed }) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
                className={cn(
                  "flex min-h-full items-start gap-3 rounded-xl border px-4 py-3 text-sm transition",
                  allowed && "hover:border-primary/40 hover:bg-primary/[0.035]",
                  alert.variant === "danger"
                    ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                )}
              >
                <alert.icon className="mt-0.5 h-5 w-5 shrink-0" />
                <span className="min-w-0 flex-1">{alert.text}</span>
                <DrilldownCue allowed={allowed} />
              </motion.div>
            )}
          </CommandLink>
        ))}
      </div>

      <details data-testid="module-status-disclosure" className="group rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/[0.04]">
        <summary className="flex cursor-pointer list-none flex-col gap-3 outline-none transition focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
          <div>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">{copy.modules.title}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.modules.description}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
          <StatusBadge variant="success">
            {copyText(copy.modules.badge, {
              complete: phaseSummary.complete,
              progress: phaseSummary.inProgress,
              ready: phaseSummary.readyForUat,
            })}
            </StatusBadge>
            <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-90" />
          </span>
        </summary>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {phaseDeliveryRecords.map((phase) => {
            const status = phaseStatusMeta[phase.status]
            const StatusIcon = status.icon

            return (
              <CommandLink
                key={phase.phase}
                href={phaseRoutes[phase.phase] ?? "/dashboard"}
                ariaLabel={copyText(copy.modules.openAria, {
                  phase: phase.phase,
                  title: phase.title,
                })}
                role={user.role}
              >
              <div className="min-h-full rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {copy.modules.module} {phase.phase}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{phase.title}</h3>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black", status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {copy.phaseStatus[phase.status]}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{phase.businessOutcome}</p>
                <p className="mt-3 text-xs font-semibold text-foreground">
                  {copy.modules.howTo}: {phase.userGuide}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {phase.evidence.slice(0, 2).map((item) => (
                    <span key={item} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              </CommandLink>
            )
          })}
        </div>
      </details>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <CommandLink key={kpi.label} href={kpi.href} ariaLabel={kpi.label} role={user.role}>
            <Card3D glow={false}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{kpi.label}</p>
                  <div className="mt-2 flex flex-wrap items-baseline gap-1">
                    <AnimatedCounter value={kpi.value} className="text-3xl font-black text-card-foreground" />
                    {kpi.suffix && <span className="text-xs font-semibold text-muted-foreground">{kpi.suffix}</span>}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{kpi.helper}</p>
                </div>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted", kpi.color)}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </Card3D>
          </CommandLink>
        ))}
      </div>

      <SiteCommandSimulation
        blocks={blocks}
        summary={summary}
        urgentTicketCount={criticalTickets.length}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <CommandLink href="/dashboard/finance" ariaLabel={copy.charts.occupancyTitle} className="xl:col-span-2" role={user.role}>
          {({ allowed }) => (
            <Card3D glow={false} innerClassName="min-h-full">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">{copy.charts.occupancyTitle}</h2>
                  <p className="text-xs text-muted-foreground">{copy.charts.occupancyDescription}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-600">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1">
                    <TrendingUp className="h-4 w-4" />
                    {copy.charts.trendLabel}
                  </span>
                  <DrilldownCue allowed={allowed} />
                </div>
              </div>
              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{copy.charts.occupancyMetric}</p>
                  <p className="text-base font-black text-foreground">%{summary.occupancyRate}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{copy.charts.accessMetric}</p>
                  <p className="text-base font-black text-foreground">{summary.restrictedAccess}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{copy.charts.slaMetric}</p>
                  <p className="text-base font-black text-foreground">{summary.overdueTickets}</p>
                </div>
              </div>
              <LineChart
                data={occupancyTrend}
                ariaLabel={copy.charts.occupancyTitle}
                formatValue={(value) => `%${value}`}
                height={172}
              />
            </Card3D>
          )}
        </CommandLink>

        <CommandLink href="/dashboard/listings" ariaLabel={copy.charts.statusTitle} role={user.role}>
          {({ allowed }) => (
            <Card3D glow={false} innerClassName="min-h-full">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">{copy.charts.statusTitle}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.charts.statusDescription}</p>
                </div>
                <DrilldownCue allowed={allowed} />
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{copy.charts.totalMetric}</p>
                  <p className="text-base font-black text-foreground">{summary.totalFlats}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/55 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">{copy.charts.vacantMetric}</p>
                  <p className="text-base font-black text-foreground">{summary.vacantFlats}</p>
                </div>
              </div>
              <PieChart data={statusDistribution} size={164} ariaLabel={copy.charts.statusTitle} totalLabel={copy.charts.totalMetric} />
            </Card3D>
          )}
        </CommandLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{copy.charts.blockTitle}</h2>
            <StatusBadge variant="accent">{copyText(copy.charts.blocks, { count: blocks.length })}</StatusBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((block) => (
              <CommandLink
                key={block.block}
                href="/dashboard/listings"
                ariaLabel={`${copy.charts.block} ${block.block}`}
                role={user.role}
              >
              <div className="min-h-full rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{copy.charts.block} {block.block}</p>
                  <StatusBadge variant={block.blocked > 0 ? "warning" : "success"}>{block.total} {copy.charts.units}</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{copy.charts.occupied}: {block.occupied}</span>
                  <span>{copy.charts.vacant}: {block.vacant}</span>
                  <span>{copy.charts.maintenance}: {block.maintenance}</span>
                  <span>{copy.charts.debt}: {formatTryShort(block.debtTry)}</span>
                </div>
              </div>
              </CommandLink>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <CommandLink href="/dashboard/reports" ariaLabel={copy.charts.aiTitle} role={user.role}>
          <GlassCard glow className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.charts.aiTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.charts.aiDescription}
                </p>
              </div>
            </div>
          </GlassCard>
          </CommandLink>
          {aiInsights.map((insight) => (
            <CommandLink
              key={insight.title}
              href={routeForInsight(insight.title)}
              ariaLabel={tRecord(insight.title)}
              role={user.role}
            >
              {({ allowed }) => (
                <Card3D glow={false}>
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-card-foreground">{tRecord(insight.title)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{tRecord(insight.detail)}</p>
                    </div>
                    <DrilldownCue allowed={allowed} />
                  </div>
                </Card3D>
              )}
            </CommandLink>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">{copy.charts.recentFlow}</h2>
          </div>
          <ul className="space-y-3">
            {activityItems.map((activity, index) => (
              <motion.li
                key={activity.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CommandLink
                  href={activity.href}
                  ariaLabel={tActivityMessage(activity.message)}
                  role={user.role}
                >
                  {({ allowed }) => (
                    <div
                      className={cn(
                        "flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 transition",
                        allowed && "hover:border-primary/40 hover:bg-primary/[0.035]"
                      )}
                    >
                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{tActivityMessage(activity.message)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.actor} - {tActivityType(activity.type)}
                        </p>
                      </div>
                      <DrilldownCue allowed={allowed} />
                    </div>
                  )}
                </CommandLink>
              </motion.li>
            ))}
          </ul>
        </Card3D>

        <Card3D glow={false}>
          <h2 className="mb-4 text-sm font-bold text-card-foreground">{copy.charts.criticalToday}</h2>
          <div className="space-y-3">
            {criticalTickets.map((ticket) => (
              <CommandLink
                key={`ticket-${ticket.id}`}
                href="/dashboard/tickets"
                ariaLabel={ticket.label}
                role={user.role}
              >
              <div className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{ticket.label}</p>
                  <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "warning"}>{ticket.slaHoursRemaining}h</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{tRecord(ticket.title)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ticket.assignee}</p>
              </div>
              </CommandLink>
            ))}
            {bookings.slice(0, 2).map((booking) => (
              <CommandLink
                key={booking.id}
                href="/dashboard/calendar"
                ariaLabel={booking.flatNumber}
                role={user.role}
              >
              <div className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{booking.flatNumber}</p>
                  <StatusBadge variant="info">{booking.channel}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{booking.guestName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.charts.depositRisk}: {formatTryShort(booking.depositTry)}</p>
              </div>
              </CommandLink>
            ))}
          </div>
        </Card3D>
      </div>

      <CommandLink href="/dashboard/finance" ariaLabel={copy.charts.financeSummaryAria} role={user.role}>
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.monthlyExpected}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.monthlyExpectedTry)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.juneCollection}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(cashFlow.at(-1)?.collectedTry ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.depositRisk}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.depositExposureTry)}</p>
          </div>
        </div>
      </div>
      </CommandLink>
    </div>
  )
}
