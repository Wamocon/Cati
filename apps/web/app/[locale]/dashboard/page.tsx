"use client"

import { motion } from "framer-motion"
import { useTranslations } from "next-intl"
import {
  Building2,
  Users,
  TicketCheck,
  TrendingUp,
  AlertTriangle,
  FileCheck,
  CalendarDays,
  RefreshCw,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { useDemoData } from "@/hooks/use-demo-data"
import { roleDefinitions } from "@/lib/rbac"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"
import { StatusBadge } from "@/components/status-badge"
import { SyncBadge } from "@/components/sync-badge"
import { LineChart } from "@/components/charts/line-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { GlassCard } from "@/components/glass-card"
import { cn } from "@/lib/utils"

interface DashboardAlert {
  icon: LucideIcon
  text: string
  variant: "warning" | "danger"
}

export default function DashboardHomePage() {
  const user = useUser()
  const homeT = useTranslations("dashboardHome")
  const roleT = useTranslations("roles")
  const { loading, summary, leadSources, monthlyRevenue, activities, lastUpdated, refresh, refreshing } = useDemoData()

  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabelKey = roleDef?.labelKey.replace("roles.", "") ?? user.role
  const roleLabel = roleT(roleLabelKey)

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">{homeT("loading")}</p>
      </div>
    )
  }

  const kpis = [
    { icon: Building2, label: homeT("kpi.activeListings"), value: summary.activeListings, suffix: ` / ${summary.totalListings}`, color: "text-primary" },
    { icon: Users, label: homeT("kpi.openLeads"), value: summary.openLeads, suffix: ` (${summary.hotLeads} sıcak)`, color: "text-accent" },
    { icon: TicketCheck, label: homeT("kpi.openTickets"), value: summary.openTickets, suffix: summary.urgentTickets > 0 ? ` (${summary.urgentTickets} acil)` : "", color: "text-teal-600" },
    { icon: TrendingUp, label: homeT("kpi.activeDeals"), value: summary.activeDeals, suffix: ` (${summary.dealsWonThisMonth} kapanan)`, color: "text-emerald-600" },
  ]

  const alerts: DashboardAlert[] = [
    ...(summary.eidsPending > 0
      ? [
          {
            icon: AlertTriangle,
            text: homeT("alerts.eidsPending", { count: summary.eidsPending }),
            variant: "warning" as const,
          },
        ]
      : []),
    ...(summary.eidsExpiring > 0
      ? [
          {
            icon: FileCheck,
            text: homeT("alerts.eidsExpiring", { count: summary.eidsExpiring }),
            variant: "danger" as const,
          },
        ]
      : []),
    ...(summary.urgentTickets > 0
      ? [
          {
            icon: TicketCheck,
            text: homeT("alerts.urgentTickets", { count: summary.urgentTickets }),
            variant: "danger" as const,
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">{homeT("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {homeT("subtitle", { role: roleLabel })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SyncBadge lastSync={lastUpdated} />
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
            {homeT("refresh")}
          </button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                alert.variant === "warning"
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                  : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              )}
            >
              <alert.icon className="h-5 w-5 shrink-0" />
              {alert.text}
            </motion.div>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card3D key={kpi.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                <div className="mt-2 flex items-baseline gap-1">
                  <AnimatedCounter value={kpi.value} className="text-3xl font-black text-card-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{kpi.suffix}</span>
                </div>
              </div>
              <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
            </div>
          </Card3D>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D innerClassName="lg:col-span-2" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-card-foreground">{homeT("charts.revenue")}</h3>
              <p className="text-xs text-muted-foreground">{homeT("charts.revenueSubtitle")}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              +12%
            </div>
          </div>
          <LineChart
            data={monthlyRevenue.map((d) => ({ label: d.label, value: d.value }))}
            formatValue={(v) => `${(v / 1000).toFixed(0)}k €`}
            height={220}
          />
        </Card3D>

        <Card3D>
          <h3 className="mb-1 text-sm font-bold text-card-foreground">{homeT("charts.leadSources")}</h3>
          <p className="mb-4 text-xs text-muted-foreground">{homeT("charts.leadSourcesSubtitle")}</p>
          <PieChart data={leadSources} size={180} />
        </Card3D>
      </div>

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity */}
        <Card3D className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-card-foreground">{homeT("activity.title")}</h3>
            <StatusBadge variant="accent">{homeT("activity.live")}</StatusBadge>
          </div>
          <ul className="space-y-3">
            {activities.slice(0, 6).map((activity, i) => (
              <motion.li
                key={activity.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-3"
              >
                <div className={cn("mt-0.5 h-2 w-2 shrink-0 rounded-full", activity.iconColor)} />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {activity.actor} • {new Date(activity.createdAt).toLocaleDateString("tr-TR")}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </Card3D>

        {/* Quick actions / AI promo */}
        <div className="space-y-4">
          <GlassCard glow className="relative overflow-hidden p-5">
            <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-sm font-bold text-card-foreground">{homeT("ai.title")}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{homeT("ai.description")}</p>
            </div>
          </GlassCard>

          <Card3D>
            <h3 className="mb-3 text-sm font-bold text-card-foreground">{homeT("quickActions.title")}</h3>
            <div className="space-y-2">
              {[
                { icon: CalendarDays, label: homeT("quickActions.viewing") },
                { icon: FileCheck, label: homeT("quickActions.eids") },
                { icon: Zap, label: homeT("quickActions.campaign") },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5"
                >
                  <action.icon className="h-4 w-4 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>
          </Card3D>
        </div>
      </div>
    </div>
  )
}
