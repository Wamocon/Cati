"use client"

import { useCallback, useMemo, useState } from "react"
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
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TrendingUp,
  Users,
  Wallet,
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
import { TenantAccessLivePanel } from "@/components/tenant-access-live-panel"
import { RoleFocusedLiveDashboard } from "@/components/role-focused-live-dashboard"
import { LiveErpSimulation, type SimulationQuickAction } from "@/components/live-erp-simulation"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import { useLiveDashboardSnapshot } from "@/hooks/use-live-dashboard-snapshot"
import {
  dashboardHomeCopy,
  localizeBackendTerm,
  resolveDashboardHomeLocale,
  type DashboardHomeCopy,
  type DashboardHomeLocale,
  type WorkloadKind,
} from "@/lib/dashboard-home-copy"
import { formatDual } from "@/lib/currency"
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
  valueText?: string
  helper: string
  color: string
  href: string
}

type FocusedRole = "accountant" | "staff" | "owner" | "tenant"
// Additive Phase-1 roles. They render a lean, self-contained foundation
// dashboard (below) instead of the admin OperationsDashboard. They are kept
// separate from FocusedRole on purpose: FocusedRole is wired to the live,
// role-scoped snapshot API + the `as const` roleWorkspaces copy, both of which
// only model the original four business roles. Their bespoke dashboards land in
// later phases; until then this guarantees they never see the admin surface.
type LeanFocusedRole =
  | "guest"
  | "service_provider"
  | "child_owner"
  | "child_tenant"
  | "child_guest"
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
  const [lockedNoticeVisible, setLockedNoticeVisible] = useState(false)
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
        role="button"
        tabIndex={0}
        onClick={() => {
          setLockedNoticeVisible(true)
          window.setTimeout(() => setLockedNoticeVisible(false), 5200)
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          setLockedNoticeVisible(true)
          window.setTimeout(() => setLockedNoticeVisible(false), 5200)
        }}
        title={copy.command.lockedTitle}
      >
        {content}
        {lockedNoticeVisible ? (
          <span
            role="status"
            className="absolute right-3 top-3 z-10 rounded-full border border-amber-500/30 bg-amber-500/95 px-3 py-1 text-xs font-black text-white shadow-lg shadow-amber-500/20"
          >
            {copy.command.locked}
          </span>
        ) : null}
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
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        copyKey: "tickets",
      },
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
  wallet: Wallet,
  activities: Sparkles,
  guardianship: Users,
  vendor_invoices: ReceiptText,
} satisfies Record<Resource, LucideIcon>

const simulationActionResourceOrder: Resource[] = [
  "listings",
  "tickets",
  "calendar",
  "finance",
  "documents",
  "reports",
  "communications",
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

function isLeanFocusedRole(role: Role): role is LeanFocusedRole {
  return (
    role === "guest" ||
    role === "service_provider" ||
    role === "child_owner" ||
    role === "child_tenant" ||
    role === "child_guest"
  )
}

const foundationRoleCopy: Record<
  DashboardHomeLocale,
  { eyebrow: string; description: string; shortcuts: string; note: string; empty: string }
> = {
  tr: {
    eyebrow: "Çalışma alanınız",
    description:
      "Bu rol için özel panel sonraki aşamada geliyor. Şimdilik yalnızca yetkili olduğunuz modüllere erişebilirsiniz.",
    shortcuts: "Yetkili modüller",
    note: "Yalnızca rolünüze açık sayfalar gösterilir; diğer tüm modüller kapalıdır.",
    empty: "Bu rol için henüz açık bir modül sayfası yok.",
  },
  en: {
    eyebrow: "Your workspace",
    description:
      "A dedicated dashboard for this role arrives in a later phase. For now you can reach only the modules your role is authorized for.",
    shortcuts: "Authorized modules",
    note: "Only pages your role can open are shown; every other module stays closed.",
    empty: "No module page is open for this role yet.",
  },
  de: {
    eyebrow: "Ihr Arbeitsbereich",
    description:
      "Ein eigenes Dashboard für diese Rolle folgt in einer späteren Phase. Vorerst erreichen Sie nur die für Ihre Rolle freigegebenen Module.",
    shortcuts: "Freigegebene Module",
    note: "Es werden nur Seiten angezeigt, die Ihre Rolle öffnen darf; alle anderen Module bleiben geschlossen.",
    empty: "Für diese Rolle ist noch keine Modulseite geöffnet.",
  },
  ru: {
    eyebrow: "Ваше рабочее пространство",
    description:
      "Отдельная панель для этой роли появится на следующем этапе. Пока вам доступны только разрешённые для роли модули.",
    shortcuts: "Разрешённые модули",
    note: "Показаны только страницы, которые может открыть ваша роль; все остальные модули закрыты.",
    empty: "Для этой роли пока нет открытой страницы модуля.",
  },
}

// Lean, self-contained dashboard for the additive Phase-1 roles. It is a pure
// RBAC-gated shortcut grid (no live snapshot fetch, no admin operations surface)
// so these roles get a safe, role-scoped landing until their bespoke dashboards
// are built. Shortcuts are the exact same RBAC-filtered navigation the sidebar
// uses, drawn from dashboardRoutes.
function FoundationRoleDashboard({
  locale,
  role,
  roleLabel,
}: {
  locale: DashboardHomeLocale
  role: LeanFocusedRole
  roleLabel: string
}) {
  const dashboardT = useTranslations("dashboard")
  const text = foundationRoleCopy[locale]
  const cards = dashboardRoutes.filter(
    (route) =>
      route.href !== "/dashboard" && hasPermission(role, route.resource, "view")
  )

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          {text.eyebrow}
        </p>
        <h1 className="mt-1 text-2xl font-black text-foreground md:text-3xl">
          {roleLabel}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          {text.description}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-card-foreground">{text.shortcuts}</h2>
        {cards.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => {
              const label = dashboardT(`menu.${card.resource}`)
              const Icon = simulationActionIcons[card.resource]
              return (
                <CommandLink
                  key={card.href}
                  href={card.href}
                  ariaLabel={label}
                  role={role}
                >
                  <Card3D glow={false}>
                    <div className="flex min-h-10 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-black leading-tight text-card-foreground break-normal hyphens-none">
                        {label}
                      </span>
                      <ChevronRight
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover/command:text-primary"
                      />
                    </div>
                  </Card3D>
                </CommandLink>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{text.empty}</p>
        )}
      </section>

      <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        {text.note}
      </p>
    </div>
  )
}

function GlobalOperationsScene({ copy }: { copy: DashboardHomeCopy }) {
  const workload = copy.globalScene.workload

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.5fr)]">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase text-muted-foreground">
              {workload.eyebrow}
            </p>
            <h2 className="mt-1 text-lg font-black text-card-foreground">
              {workload.title}
            </h2>
          </div>
          <TrendingUp className="h-5 w-5 text-primary" />
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {workload.description}
        </p>
        <div className="mt-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          <span>{workload.scaleLow}</span>
          <span>{workload.scaleHigh}</span>
        </div>
        <div className="mt-3 flex gap-2">
          <div
            aria-hidden="true"
            className="flex h-36 w-7 shrink-0 flex-col justify-between pb-2 text-right text-[9px] font-bold text-muted-foreground/80"
          >
            <span className="leading-none">100</span>
            <span className="leading-none">50</span>
            <span className="leading-none">0</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="relative flex h-36 items-end gap-2 border-b border-border/80 pb-2">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border/50"
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/50"
              />
              {workload.bars.map((bar, index) => (
                <motion.div
                  key={`${bar.time}-${bar.kind}`}
                  className="group relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.04 }}
                  title={`${bar.time} ${bar.label}: ${bar.value} / 100 ${workload.loadUnit}`}
                >
                  <span className="text-[10px] font-black text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                    {bar.value}
                  </span>
                  <span
                    className={cn(
                      "w-full rounded-t-lg shadow-lg transition-opacity hover:opacity-100",
                      workloadKindClassNames[bar.kind]
                    )}
                    style={{ height: `${Math.max(bar.value, 6)}%` }}
                  />
                </motion.div>
              ))}
            </div>
            <div className="mt-1 flex gap-2 text-[9px] font-bold text-muted-foreground">
              {workload.bars.map((bar) => (
                <span key={bar.time} className="min-w-0 flex-1 text-center">
                  {bar.time}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
          {workload.caption}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Object.entries(workload.legend).map(([kind, label]) => (
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
            {workload.peakLabel}
          </p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {workload.peakText}
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
    </section>
  )
}

function RoleFocusedDashboard({
  copy,
  role,
}: {
  copy: DashboardHomeCopy
  role: FocusedRole
}) {
  const config = roleWorkspaceConfig[role]
  const dashboardT = useTranslations("dashboard")
  if (!config) return null

  const workspaceCopy = copy.roleWorkspaces[role]
  // A single grid of real, RBAC-gated shortcuts. Labels are pulled from the
  // exact same source as the sidebar (dashboard.menu.*) so the cards read as
  // navigation, not as duplicated descriptions of it.
  const cards = config.cards.filter((card) =>
    hasPermission(role, card.resource, "view")
  )
  // Balance the shortcut row so a 5-card role (accountant) never leaves a lonely
  // card in a fixed 4-up grid: 5-up on xl, 3-up on lg, 2-up on sm.
  const cardGridClass =
    cards.length === 5
      ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
      : "grid gap-3 sm:grid-cols-2 xl:grid-cols-4"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground md:text-3xl">
          {workspaceCopy.title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          {workspaceCopy.description}
        </p>
      </div>

      <RoleFocusedLiveDashboard role={role} />

      <div className={cardGridClass}>
        {cards.map((card) => {
          const label = dashboardT(`menu.${card.resource}`)
          return (
            <CommandLink
              key={card.href}
              href={card.href}
              ariaLabel={label}
              role={role}
            >
              <Card3D glow={false}>
                <div className="flex min-h-10 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <card.icon aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-black leading-tight text-card-foreground break-normal hyphens-none">
                    {label}
                  </span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover/command:text-primary" />
                </div>
              </Card3D>
            </CommandLink>
          )
        })}
      </div>

      {role === "owner" || role === "tenant" ? <TenantAccessLivePanel /> : null}
    </div>
  )
}

function routeForActivity(type: string) {
  const normalized = type.toLocaleLowerCase("tr-TR")
  if (/(tahsilat|finans|payment|finance|buchhaltung|inkasso)/i.test(normalized)) {
    return "/dashboard/finance"
  }
  if (/(rezervasyon|booking|reservation|calendar|takvim|check-?in|check-?out)/i.test(normalized)) {
    return "/dashboard/calendar"
  }
  if (/(erişim|erisim|access|compliance|security|zugang|güvenlik|guvenlik)/i.test(normalized)) {
    return "/dashboard/compliance"
  }
  if (/(servis|service|ticket|order|task|auftrag|görev|gorev)/i.test(normalized)) {
    return "/dashboard/tickets"
  }
  if (/(ai|ki|report|bericht|rapor)/i.test(normalized)) return "/dashboard/reports"
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
  if (
    entityTable.includes("service_ticket") ||
    entityTable.includes("service_order") ||
    entityTable.includes("workforce_task")
  ) {
    return "/dashboard/tickets"
  }
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
  const permittedDashboardHrefs = useMemo(
    () =>
      dashboardRoutes
        .filter((route) => hasPermission(user.role, route.resource, "view"))
        .map((route) => route.href),
    [user.role]
  )

  if (isFocusedRole(user.role) && roleWorkspaceConfig[user.role]) {
    return <RoleFocusedDashboard copy={copy} role={user.role} />
  }

  // Additive Phase-1 roles get a lean, role-scoped landing instead of the admin
  // operations surface. Safe default until their bespoke dashboards are built.
  if (isLeanFocusedRole(user.role)) {
    return (
      <FoundationRoleDashboard
        locale={locale}
        role={user.role}
        roleLabel={roleLabel}
      />
    )
  }

  return (
    <OperationsDashboard
      copy={copy}
      permittedDashboardHrefs={permittedDashboardHrefs}
      quickActions={quickActions}
      user={user}
      roleLabel={roleLabel}
    />
  )
}

function OperationsDashboard({
  copy,
  permittedDashboardHrefs,
  quickActions,
  user,
  roleLabel,
}: {
  copy: DashboardHomeCopy
  permittedDashboardHrefs: string[]
  quickActions: SimulationQuickAction[]
  user: ReturnType<typeof useUser>
  roleLabel: string
}) {
  const dashboardLocale = resolveDashboardLocale(useLocale())
  const tRecord = useCallback(
    (value: string) => localizeDashboardTextPart(value, dashboardLocale),
    [dashboardLocale]
  )
  const tActivityMessage = useCallback((value: string) => {
    const localized = tRecord(value)
    if (localized !== value) return localized

    let text = value
    if (dashboardLocale === "tr") {
      text = text
        .replace(/^AI interest - what-is/i, "AI talep sinyali")
        .replace(/^AI interest/i, "AI talep sinyali")
        .replace(/\bwhats\b/i, "WhatsApp")
        .replace(/\baccess update\b/i, "erişim güncelleme")
        .replace(/\bCamera incident lookup request\b/i, "kamera olay arama talebi")
        .replace(/\bDeposit hold\b/i, "depozito bekletme")
        .replace(/\bcheckout\b/i, "çıkış")
    }
    // Never let raw backend table names or status enums reach the UI (all locales).
    return localizeBackendTerm(text, dashboardLocale)
  }, [dashboardLocale, tRecord])
  const tActivityType = useCallback(
    (value: string) =>
      tActivityMessage(value)
        .replaceAll("_", " ")
        .toLocaleLowerCase(dashboardLocale === "tr" ? "tr-TR" : dashboardLocale),
    [dashboardLocale, tActivityMessage]
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
    () =>
      mapLiveDistribution(phase4, fallbackStatusDistribution).map((slice) => ({
        ...slice,
        label: tRecord(slice.label),
      })),
    [fallbackStatusDistribution, phase4, tRecord]
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
      valueText: formatDual(summary.totalDebtTry, { short: true }),
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

  // Manager and admin share the same operations surface, but their remit differs:
  // admin owns the whole organization (company scope), a manager owns the sites
  // they are responsible for (site scope). Surface that distinction in the header
  // so the two roles no longer read as byte-identical.
  const isManager = user.role === "manager"
  const scopeCopy = isManager ? copy.scope.manager : copy.scope.admin

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
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-primary">
              {isManager ? (
                <Building2 className="h-3.5 w-3.5" />
              ) : (
                <Network className="h-3.5 w-3.5" />
              )}
              {scopeCopy.badge}
            </span>
            <span className="text-xs text-muted-foreground">{scopeCopy.line}</span>
          </div>
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
        permittedHrefs={permittedDashboardHrefs}
        quickActions={quickActions}
        realtimeState={realtimeState}
        requestState={requestState}
        roleLabel={roleLabel}
        source={snapshot?.source}
        summary={summary}
      />

      <GlobalOperationsScene copy={copy} />

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-bold text-card-foreground">{copy.alerts.title}</h2>
          <p className="text-xs text-muted-foreground">{copy.alerts.subtitle}</p>
        </div>
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
      </section>

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
          <StatusBadge variant={phaseSummary.blocked > 0 ? "warning" : "success"}>
            {copyText(copy.modules.badge, {
              blocked: phaseSummary.blocked,
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
                  title:
                    dashboardLocale === "tr"
                      ? phase.title
                      : `${copy.modules.module} ${phase.phase}`,
                })}
                role={user.role}
              >
              <div className="min-h-full rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">
                      {copy.modules.module} {phase.phase}
                    </p>
                    <h3 className="mt-1 text-sm font-black text-foreground">
                      {dashboardLocale === "tr"
                        ? phase.title
                        : `${copy.modules.module} ${phase.phase}`}
                    </h3>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black", status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {copy.phaseStatus[phase.status]}
                  </span>
                </div>
                {dashboardLocale === "tr" ? (
                  <div data-testid={`phase-delivery-detail-${phase.phase}`}>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {phase.businessOutcome}
                    </p>
                    <p className="mt-3 text-xs font-semibold text-foreground">
                      {copy.modules.howTo}: {phase.userGuide}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {phase.evidence.slice(0, 2).map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
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
                    {kpi.valueText ? (
                      <span className="text-2xl font-black text-card-foreground">{kpi.valueText}</span>
                    ) : (
                      <AnimatedCounter value={kpi.value} className="text-3xl font-black text-card-foreground" />
                    )}
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
              <p className="mt-3 text-[11px] leading-4 text-muted-foreground">
                {copyText(copy.charts.occupancyCaption, {
                  value: summary.occupancyRate,
                })}
              </p>
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
                  <span>{copy.charts.debt}: {formatDual(block.debtTry, { short: true })}</span>
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
                          {tActivityMessage(activity.actor)} - {tActivityType(activity.type)}
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
                  <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "warning"}>
                    {ticket.slaHoursRemaining < 0
                      ? copyText(copy.charts.slaOverdue, {
                          value: Math.abs(ticket.slaHoursRemaining),
                        })
                      : copyText(copy.charts.slaRemaining, {
                          value: ticket.slaHoursRemaining,
                        })}
                  </StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{tRecord(ticket.title)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{localizeBackendTerm(tRecord(ticket.assignee), dashboardLocale)}</p>
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
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{booking.flatNumber}</p>
                  {/* Booking source is metadata, not an SLA status — render it as a
                      subtle muted label so it never reads as a coloured status pill. */}
                  <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    {booking.channel}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{booking.guestName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.charts.depositRisk}: {formatDual(booking.depositTry, { short: true })}</p>
              </div>
              </CommandLink>
            ))}
          </div>
        </Card3D>
      </div>

      <CommandLink href="/dashboard/finance" ariaLabel={copy.charts.financeSummaryAria} role={user.role}>
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
        <div className="mb-4">
          <h2 className="text-sm font-bold text-card-foreground">{copy.charts.financeSummaryTitle}</h2>
          <p className="text-xs text-muted-foreground">{copy.charts.financeSummarySubtitle}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.monthlyExpected}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatDual(summary.monthlyExpectedTry, { short: true })}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.juneCollection}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatDual(cashFlow.at(-1)?.collectedTry ?? 0, { short: true })}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{copy.charts.depositRisk}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatDual(summary.depositExposureTry, { short: true })}</p>
          </div>
        </div>
      </div>
      </CommandLink>
    </div>
  )
}
