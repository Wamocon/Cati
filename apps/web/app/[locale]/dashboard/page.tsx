"use client"

import { motion } from "framer-motion"
import {
  AlertTriangle,
  ArrowUpRight,
  Brain,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  CreditCard,
  LockKeyhole,
  Route,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  TrendingUp,
  type LucideIcon,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { roleDefinitions } from "@/lib/rbac"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"
import { StatusBadge } from "@/components/status-badge"
import { LineChart } from "@/components/charts/line-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { GlassCard } from "@/components/glass-card"
import { SiteCommandSimulation } from "@/components/site-command-simulation"
import { AtaberkProjectSpotlight } from "@/components/ataberk-project-spotlight"
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import {
  aiInsights,
  bookings,
  cashFlow,
  formatTryShort,
  getBlockOverview,
  getFlatStatusDistribution,
  getOccupancyTrend,
  getPhaseDeliverySummary,
  getSummary,
  phaseDeliveryRecords,
  serviceTickets,
  siteActivities,
} from "@/lib/site-management-data"

interface Kpi {
  icon: LucideIcon
  label: string
  value: number
  suffix?: string
  helper: string
  color: string
}

export default function DashboardHomePage() {
  const user = useUser()
  const summary = getSummary()
  const phaseSummary = getPhaseDeliverySummary()
  const blocks = getBlockOverview()
  const statusDistribution = getFlatStatusDistribution()
  const occupancyTrend = getOccupancyTrend()
  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabel = roleDef?.labelKey.split(".").at(-1)?.replaceAll("_", " ") ?? user.role
  const kpis: Kpi[] = [
    {
      icon: Building2,
      label: "Toplam Daire",
      value: summary.totalFlats,
      suffix: `${summary.occupancyRate}% doluluk`,
      helper: `${summary.vacantFlats} boş, ${summary.maintenanceFlats} bakımda`,
      color: "text-teal-600",
    },
    {
      icon: CreditCard,
      label: "Toplam Borç",
      value: Math.round(summary.totalDebtTry / 1000),
      suffix: "K ₺",
      helper: `${summary.restrictedAccess} erişim kısıtı`,
      color: "text-rose-600",
    },
    {
      icon: TicketCheck,
      label: "Açık Servis",
      value: summary.openTickets,
      suffix: `${summary.overdueTickets} SLA dışı`,
      helper: "Teknik, finans ve depozito işleri",
      color: "text-amber-600",
    },
    {
      icon: CalendarCheck,
      label: "Bugünkü İşler",
      value: summary.activeBookings,
      suffix: `${summary.checkoutsToday} çıkış`,
      helper: "Giriş, çıkış, temizlik, depozito",
      color: "text-sky-600",
    },
  ]

  const alerts = [
    {
      icon: AlertTriangle,
      text: `${summary.aiRiskCount} operasyon riski AI kuyruğunda: borç, SLA ve check-out birlikte takip ediliyor.`,
      variant: "danger" as const,
    },
    {
      icon: LockKeyhole,
      text: `${summary.restrictedAccess} dairede erişim kısıtı var. Finans onayı olmadan servis yönlendirilmemeli.`,
      variant: "warning" as const,
    },
    {
      icon: Clock3,
      text: `${summary.overdueTickets} servis talebi SLA dışına çıktı. Teknik ekip için öncelik listesi hazır.`,
      variant: "warning" as const,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">
            {clientProfile.clientName} Premium CRM Merkezi
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            İlk sürüm {clientProfile.pilotProject} / {clientProfile.pilotLocation} odağıyla satış, proje takibi,
            WhatsApp/Telegram lead akışı, evrak, servis ve AI önceliklendirmeyi tek panelde toplar. Demo veri seti
            operasyonu 769 birim ölçeğinde stres test eder. Aktif rol:{" "}
            <span className="font-semibold text-foreground">{roleLabel}</span>.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={clientProfile.projectArticle}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Proje referansı
          </a>
          <DashboardRefreshButton />
        </div>
      </div>

      <AtaberkProjectSpotlight />

      <div className="grid gap-3 lg:grid-cols-3">
        {alerts.map((alert, index) => (
          <motion.div
            key={alert.text}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={cn(
              "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
              alert.variant === "danger"
                ? "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
                : "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            )}
          >
            <alert.icon className="mt-0.5 h-5 w-5 shrink-0" />
            <span>{alert.text}</span>
          </motion.div>
        ))}
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">Phase 2-9 teslim merkezi</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Satıştan sözleşmeye kadar UX, platform güvenliği, daire modeli, roller, online tur, ödeme planı, belge dosyası ve uygunluk kontrolü tek işletim akışında gösteriliyor.
            </p>
          </div>
          <StatusBadge variant="success">
            {phaseSummary.complete}/{phaseSummary.total} tamamlandı
          </StatusBadge>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {phaseDeliveryRecords.map((phase) => (
            <div key={phase.phase} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Phase {phase.phase}</p>
                  <h3 className="mt-1 text-sm font-black text-foreground">{phase.title}</h3>
                </div>
                <CheckCircle2 className="h-5 w-5 shrink-0 text-teal-600" />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{phase.businessOutcome}</p>
              <p className="mt-3 text-xs font-semibold text-foreground">Nasıl kullanılır: {phase.userGuide}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {phase.evidence.slice(0, 2).map((item) => (
                  <span key={item} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card3D key={kpi.label} glow={false}>
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
        ))}
      </div>

      <SiteCommandSimulation />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Doluluk ve tahsilat sağlığı</h2>
              <p className="text-xs text-muted-foreground">Doluluk oranı, gecikmiş borç ve servis baskısı birlikte okunur.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              Haziran hedefi korunuyor
            </div>
          </div>
          <LineChart data={occupancyTrend} formatValue={(value) => `%${value}`} height={220} />
        </Card3D>

        <Card3D glow={false}>
          <h2 className="mb-1 text-sm font-bold text-card-foreground">Daire durum dağılımı</h2>
          <p className="mb-4 text-xs text-muted-foreground">Operasyon ekibi için canlı portföy kırılımı.</p>
          <PieChart data={statusDistribution} size={184} />
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Blok bazlı operasyon</h2>
            <StatusBadge variant="accent">{blocks.length} blok</StatusBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((block) => (
              <div key={block.block} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">Blok {block.block}</p>
                  <StatusBadge variant={block.blocked > 0 ? "warning" : "success"}>{block.total} daire</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Dolu: {block.occupied}</span>
                  <span>Boş: {block.vacant}</span>
                  <span>Bakım: {block.maintenance}</span>
                  <span>Borç: {formatTryShort(block.debtTry)}</span>
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <GlassCard glow className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-card-foreground">AI operasyon asistanı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Borç, SLA, depozito ve rezervasyon verilerini birleştirerek günlük yapılacakları sıralar.
                </p>
              </div>
            </div>
          </GlassCard>
          {aiInsights.map((insight) => (
            <Card3D key={insight.title} glow={false}>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <h3 className="text-sm font-bold text-card-foreground">{insight.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{insight.detail}</p>
                </div>
              </div>
            </Card3D>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Son operasyon akışı</h2>
            <StatusBadge variant="info">Canlı demo</StatusBadge>
          </div>
          <ul className="space-y-3">
            {siteActivities.map((activity, index) => (
              <motion.li
                key={activity.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 p-3"
              >
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {activity.actor} - {activity.type}
                  </p>
                </div>
              </motion.li>
            ))}
          </ul>
        </Card3D>

        <Card3D glow={false}>
          <h2 className="mb-4 text-sm font-bold text-card-foreground">Bugünkü kritik işler</h2>
          <div className="space-y-3">
            {serviceTickets.slice(0, 3).map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{ticket.flatNumber}</p>
                  <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "warning"}>{ticket.slaHoursRemaining} saat</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{ticket.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ticket.assignee}</p>
              </div>
            ))}
            {bookings.slice(0, 2).map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{booking.flatNumber}</p>
                  <StatusBadge variant="info">{booking.channel}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{booking.guestName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Depozito: {formatTryShort(booking.depositTry)}</p>
              </div>
            ))}
          </div>
        </Card3D>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Aylık beklenen aidat</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.monthlyExpectedTry)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Haziran tahsilat</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(cashFlow.at(-1)?.collectedTry ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Depozito riski</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.depositExposureTry)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
