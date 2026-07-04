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
  type LucideIcon,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { hasPermission, roleDefinitions, type Resource, type Role } from "@/lib/rbac"
import { resourceForDashboardPath } from "@/lib/dashboard-routing"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"
import { StatusBadge } from "@/components/status-badge"
import { LineChart } from "@/components/charts/line-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { GlassCard } from "@/components/glass-card"
import { SiteCommandSimulation } from "@/components/site-command-simulation"
import { DashboardRefreshButton } from "@/components/dashboard-refresh-button"
import { IsometricErpWorld } from "@/components/isometric-erp-world"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import { localizeBusinessCopy, resolveDashboardLocale, interpolate } from "@/lib/business-copy"
import { useLiveDashboardSnapshot } from "@/hooks/use-live-dashboard-snapshot"
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
  const locale = resolveDashboardLocale(useLocale())
  const resource = resourceForDashboardPath(href)
  const allowed = hasPermission(role, resource, "view")
  const content = typeof children === "function" ? children({ allowed }) : children
  const baseClassName = cn(
    "group/command relative block rounded-xl outline-none transition after:absolute after:inset-0 after:z-20 after:rounded-xl after:content-[''] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    allowed ? "cursor-pointer" : "cursor-not-allowed opacity-65 grayscale-[0.2]",
    className
  )

  if (!allowed) {
    return (
      <div
        aria-disabled="true"
        aria-label={`${ariaLabel} - ${localizeBusinessCopy("rol izni yok", locale)}`}
        className={baseClassName}
        data-access="locked"
        role="group"
        title={localizeBusinessCopy("Bu modül mevcut rol için kapalı", locale)}
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
  const locale = resolveDashboardLocale(useLocale())

  if (!allowed) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border/80 bg-background/70 px-2 py-1 text-[11px] font-black text-muted-foreground">
        {localizeBusinessCopy("Rol kapalı", locale)}
        <LockKeyhole className="h-3 w-3" />
      </span>
    )
  }

  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-current/15 bg-background/50 px-2 py-1 text-[11px] font-black">
      {localizeBusinessCopy("İncele", locale)}
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
    Role,
    {
      title: string
      description: string
      accessNotes: string[]
      cards: Array<{
        href: string
        resource: Resource
        icon: LucideIcon
        title: string
        description: string
      }>
    }
  >
> = {
  accountant: {
    title: "Finans Çalışma Alanı",
    description:
      "Bu rol aidat, tahsilat, depozito, belge ve finans raporlarına odaklanır. Operasyon, kullanıcı ve ayar ekranları kapalıdır.",
    accessNotes: [
      "Kullanıcı yönetimi kapalı",
      "Saha işi kapatma operasyon kanıtı olmadan yapılamaz",
    ],
    cards: [
      {
        href: "/dashboard/finance",
        resource: "finance",
        icon: CreditCard,
        title: "Finans & Aidat",
        description: "Aidat, tahsilat, açık bakiye ve finans defteri kontrolleri.",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        title: "Belgeler",
        description: "Ödeme, TAPU, sözleşme ve muhasebe evrakı takibi.",
      },
      {
        href: "/dashboard/reports",
        resource: "reports",
        icon: Brain,
        title: "Raporlar",
        description: "Finans ve tahsilat çıktıları, dışa aktarım ve kontrol raporları.",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        title: "İletişim",
        description: "Finans hatırlatmaları ve ilgili bildirim taslakları.",
      },
    ],
  },
  staff: {
    title: "Saha Ekibi Çalışma Alanı",
    description:
      "Bu rol kendisine atanan servis, görev, rezervasyon, belge ve iletişim akışlarını görür. Finans, kullanıcı yönetimi ve ayarlar kapalıdır.",
    accessNotes: [
      "Finans defteri kapalı",
      "İade, erişim kısıtı ve rol onayı kapalı",
    ],
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        title: "Servis Talepleri",
        description: "Atanan işler, SLA, durum güncelleme ve saha notları.",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        title: "Rezervasyon",
        description: "Giriş, çıkış, gezinti, temizlik ve günlük görev takibi.",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        title: "Belgeler",
        description: "İş kanıtı, fotoğraf ve operasyon dokümanları.",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        title: "İletişim",
        description: "Operasyon ekibiyle mesaj ve bildirim akışı.",
      },
    ],
  },
  owner: {
    title: "Malik Çalışma Alanı",
    description:
      "Bu rol kendi dairesiyle ilgili servis, rezervasyon, belge ve yönetim iletişimini görür. Diğer maliklerin kayıtları ve şirket içi ekranlar kapalıdır.",
    accessNotes: [
      "Sadece kendi dairesi ve yetkili kayıtlar",
      "Diğer malik, personel, rapor ve finans ekranları kapalı",
    ],
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        title: "Servis Talepleri",
        description: "Kendi daireniz için servis talebi açın ve durum takip edin.",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        title: "Rezervasyon",
        description: "Kiralama, giriş-çıkış ve uygunluk takvimi.",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        title: "Belgeler",
        description: "Yetkili olduğunuz sözleşme, TAPU ve operasyon evrakı.",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        title: "İletişim",
        description: "Yönetim ekibiyle güvenli mesajlaşma ve bildirimler.",
      },
    ],
  },
  tenant: {
    title: "Kiracı Çalışma Alanı",
    description:
      "Bu rol yalnızca kendi kullanım alanındaki servis, rezervasyon, belge ve iletişim işlemlerini görür. Daire matrisi, finans defteri, raporlar ve kullanıcı yönetimi kapalıdır.",
    accessNotes: [
      "Sadece yetkili daire ve izin verilen işlemler",
      "Malik kayıtları, raporlar, finans defteri ve diğer daireler kapalı",
    ],
    cards: [
      {
        href: "/dashboard/tickets",
        resource: "tickets",
        icon: TicketCheck,
        title: "Servis Talepleri",
        description: "Bakım talebi oluşturun ve mevcut taleplerin durumunu takip edin.",
      },
      {
        href: "/dashboard/calendar",
        resource: "calendar",
        icon: CalendarCheck,
        title: "Rezervasyon",
        description: "Giriş, çıkış ve yetkili rezervasyon akışları.",
      },
      {
        href: "/dashboard/documents",
        resource: "documents",
        icon: FileText,
        title: "Belgeler",
        description: "Yetkili olduğunuz kira ve operasyon belgeleri.",
      },
      {
        href: "/dashboard/communications",
        resource: "communications",
        icon: MessageSquareText,
        title: "İletişim",
        description: "Yönetim ekibine mesaj gönderin ve bildirimleri takip edin.",
      },
    ],
  },
}

const roleSceneConfig: Partial<
  Record<
    Role,
    {
      eyebrow: string
      title: string
      metric: string
      metricLabel: string
      status: string
      accent: string
      icon: LucideIcon
      bars: Array<{ label: string; value: number }>
      timeline: Array<{ label: string; detail: string }>
    }
  >
> = {
  accountant: {
    eyebrow: "Finans kontrol akışı",
    title: "Tahsilat, belge ve onay tek ekranda",
    metric: "1.4M ₺",
    metricLabel: "bu ay doğrulanan tahsilat",
    status: "Finans verisi açık, operasyon verisi kapalı",
    accent: "from-emerald-500 via-cyan-500 to-amber-400",
    icon: CreditCard,
    bars: [
      { label: "Tahsilat", value: 88 },
      { label: "Depozito", value: 62 },
      { label: "Belge", value: 76 },
    ],
    timeline: [
      { label: "Defter", detail: "Aidat ve bakiye kontrolü" },
      { label: "Belge", detail: "Ödeme/TAPU evrakı" },
      { label: "Rapor", detail: "Finans çıktısı" },
    ],
  },
  staff: {
    eyebrow: "Saha operasyon akışı",
    title: "Atanan işler, SLA ve kanıt üretimi",
    metric: "14",
    metricLabel: "bugün görünür görev",
    status: "Saha kuyruğu açık, finans ve kullanıcı yönetimi kapalı",
    accent: "from-teal-500 via-sky-500 to-lime-400",
    icon: TicketCheck,
    bars: [
      { label: "SLA", value: 72 },
      { label: "Kanıt", value: 84 },
      { label: "Rota", value: 58 },
    ],
    timeline: [
      { label: "Talep", detail: "Atanan servis işi" },
      { label: "Saha", detail: "Fotoğraf ve not" },
      { label: "Kapatma", detail: "Yönetici kontrolü" },
    ],
  },
  owner: {
    eyebrow: "Malik portal akışı",
    title: "Kendi daireniz için net durum görünümü",
    metric: "4",
    metricLabel: "yetkili işlem alanı",
    status: "Sadece kendi dairesi, belge ve iletişim kapsamı",
    accent: "from-cyan-500 via-emerald-500 to-orange-300",
    icon: Building2,
    bars: [
      { label: "Servis", value: 68 },
      { label: "Rezervasyon", value: 54 },
      { label: "Belge", value: 81 },
    ],
    timeline: [
      { label: "Daire", detail: "Yetkili kayıt" },
      { label: "Servis", detail: "Talep ve durum" },
      { label: "Mesaj", detail: "Yönetim iletişimi" },
    ],
  },
  tenant: {
    eyebrow: "Kiracı portal akışı",
    title: "Servis, rezervasyon ve belgeye hızlı erişim",
    metric: "4",
    metricLabel: "açık kullanıcı modülü",
    status: "Daire matrisi, finans ve raporlar kapalı",
    accent: "from-sky-500 via-teal-500 to-amber-300",
    icon: CalendarCheck,
    bars: [
      { label: "Servis", value: 64 },
      { label: "Takvim", value: 71 },
      { label: "Belge", value: 57 },
    ],
    timeline: [
      { label: "Talep", detail: "Bakım veya destek" },
      { label: "Takvim", detail: "Giriş/çıkış akışı" },
      { label: "Belge", detail: "Yetkili evrak" },
    ],
  },
}

function RoleWorkspaceScene({ role }: { role: Role }) {
  const locale = resolveDashboardLocale(useLocale())
  const config = roleSceneConfig[role]
  if (!config) return null

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
                {localizeBusinessCopy(config.eyebrow, locale)}
              </p>
              <h2 className="mt-4 max-w-xl text-2xl font-black leading-tight sm:text-3xl 2xl:text-4xl">
                {localizeBusinessCopy(config.title, locale)}
              </h2>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <Icon className="ml-auto h-5 w-5 text-emerald-200" />
              <p className="mt-3 text-3xl font-black">{config.metric}</p>
              <p className="mt-1 max-w-36 text-xs leading-5 text-white/70">
                {localizeBusinessCopy(config.metricLabel, locale)}
              </p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {config.timeline.map((item, index) => (
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
                <p className="mt-1 text-sm font-black">{localizeBusinessCopy(item.label, locale)}</p>
                <p className="mt-1 text-xs leading-5 text-white/65">{localizeBusinessCopy(item.detail, locale)}</p>
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
                {localizeBusinessCopy("Canlı yetki filtresi", locale)}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {localizeBusinessCopy(config.status, locale)}
              </h2>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Network className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 space-y-4">
            {config.bars.map((bar, index) => (
              <div key={bar.label} className="group">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-card-foreground">{localizeBusinessCopy(bar.label, locale)}</span>
                  <span className="font-black text-primary">{bar.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className={cn("h-full rounded-full bg-gradient-to-r", config.accent)}
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.value}%` }}
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
                {localizeBusinessCopy("Çalışma alanı ritmi", locale)}
              </p>
              <p className="text-xs text-muted-foreground">
                {localizeBusinessCopy("Hover ve kart geçişleri gerçek modül akışlarını gösterir.", locale)}
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
                title={interpolate(localizeBusinessCopy("Gün {day}: {value}%", locale), { day: index + 1, value: height })}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function GlobalOperationsScene({
  roleLabel,
  summary,
}: {
  roleLabel: string
  summary: SiteSummary
}) {
  const locale = resolveDashboardLocale(useLocale())
  const panels = [
    {
      label: localizeBusinessCopy("Canlı daire", locale),
      value: summary.totalFlats,
      helper: interpolate(localizeBusinessCopy("{rate}% doluluk", locale), {
        rate: summary.occupancyRate,
      }),
      icon: Building2,
    },
    {
      label: localizeBusinessCopy("Açık servis", locale),
      value: summary.openTickets,
      helper: interpolate(localizeBusinessCopy("{count} SLA dışı", locale), {
        count: summary.overdueTickets,
      }),
      icon: TicketCheck,
    },
    {
      label: localizeBusinessCopy("Erişim riski", locale),
      value: summary.restrictedAccess,
      helper: localizeBusinessCopy("finans kontrolü", locale),
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
                {localizeBusinessCopy("Operasyon merkezi", locale)}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl 2xl:text-5xl">
                {localizeBusinessCopy("Daire, servis, finans ve rezervasyon aynı kontrol düzleminde", locale)}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                {localizeBusinessCopy("Aktif rol:", locale)} {roleLabel}. {localizeBusinessCopy(
                  "Bu görünüm yönetim ve sorumlu rolü için portföy ölçeğinde risk, iş yükü ve tahsilat sinyallerini birleştirir.",
                  locale
                )}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <p className="text-xs font-black uppercase text-white/60">{localizeBusinessCopy("AI risk", locale)}</p>
              <p className="mt-2 text-4xl font-black">{summary.aiRiskCount}</p>
              <p className="mt-1 text-xs text-white/65">{localizeBusinessCopy("öncelikli aksiyon", locale)}</p>
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
                {localizeBusinessCopy("İş yoğunluğu", locale)}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {localizeBusinessCopy("Saatlik sinyal", locale)}
              </h2>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-6 grid grid-cols-8 items-end gap-2">
            {[42, 64, 52, 88, 70, 96, 61, 78].map((height, index) => (
              <motion.div
                key={index}
                className="rounded-t-lg bg-primary/20 transition-colors hover:bg-primary"
                style={{ height }}
                initial={{ scaleY: 0.1, transformOrigin: "bottom" }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.2 + index * 0.04 }}
                title={interpolate(localizeBusinessCopy("Saat {hour}: {value}%", locale), { hour: index + 9, value: height })}
              />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Network className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-card-foreground">
                {localizeBusinessCopy("Rol bağlantıları aktif", locale)}
              </p>
              <p className="text-xs leading-5 text-muted-foreground">
                {localizeBusinessCopy("Dashboard kartları, API ve AI yanıtları aynı RBAC matrisinden geçer.", locale)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function RoleFocusedDashboard({
  role,
  roleLabel,
}: {
  role: Role
  roleLabel: string
}) {
  const locale = resolveDashboardLocale(useLocale())
  const config = roleWorkspaceConfig[role]
  if (!config) return null

  const cards = config.cards.filter((card) =>
    hasPermission(role, card.resource, "view")
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground md:text-3xl">
          {localizeBusinessCopy(config.title, locale)}
        </h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
          {localizeBusinessCopy(config.description, locale)} {localizeBusinessCopy("Aktif rol:", locale)}{" "}
          <span className="font-semibold text-foreground">{roleLabel}</span>.
        </p>
      </div>

      <IsometricErpWorld
        mode="dashboard"
        roleLabel={roleLabel}
        dashboardMetrics={[
          [String(cards.length), localizeBusinessCopy("açık modül", locale)],
          [role === "staff" ? "14" : "4", localizeBusinessCopy("yetkili iş", locale)],
          [roleLabel, localizeBusinessCopy("aktif rol", locale)],
        ]}
      />

      <RoleWorkspaceScene role={role} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <CommandLink
            key={card.href}
            href={card.href}
            ariaLabel={`${localizeBusinessCopy(card.title, locale)} ${localizeBusinessCopy("ekranını aç", locale)}`}
            role={role}
          >
            <Card3D glow={false}>
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <card.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-card-foreground">
                    {localizeBusinessCopy(card.title, locale)}
                  </h2>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {localizeBusinessCopy(card.description, locale)}
                  </p>
                </div>
              </div>
            </Card3D>
          </CommandLink>
        ))}
      </div>

      <Card3D glow={false}>
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <h2 className="text-sm font-bold text-card-foreground">
              {localizeBusinessCopy("Yetki sınırları", locale)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {localizeBusinessCopy(
                "Bu ekranda şirket geneli daire matrisi, finans defteri, kullanıcı yönetimi ve platform ayarları gösterilmez. Kapalı bir sayfa URL ile açılırsa sistem sizi tekrar kendi çalışma alanınıza döndürür.",
                locale
              )}
            </p>
            {config.accessNotes.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {config.accessNotes.map((constraint) => (
                  <span
                    key={constraint}
                    className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground"
                  >
                    {localizeBusinessCopy(constraint, locale)}
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
      label: unitLabel || serviceTicketUnitByTicketNo.get(ticketNo) || ticketNo || "Ticket",
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
  const roleT = useTranslations("roles")
  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabel = roleDef ? roleT(roleDef.labelKey.replace("roles.", "")) : user.role

  if (roleWorkspaceConfig[user.role]) {
    return <RoleFocusedDashboard role={user.role} roleLabel={roleLabel} />
  }

  return <OperationsDashboard user={user} roleLabel={roleLabel} />
}

function OperationsDashboard({
  user,
  roleLabel,
}: {
  user: ReturnType<typeof useUser>
  roleLabel: string
}) {
  const locale = resolveDashboardLocale(useLocale())
  const {
    snapshot,
    phase4,
    refresh,
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
      index === trend.length - 1 ? { ...point, value: summary.occupancyRate } : point
    )
  }, [summary.occupancyRate])
  const kpis: Kpi[] = [
    {
      icon: Building2,
      label: localizeBusinessCopy("Toplam Daire", locale),
      value: summary.totalFlats,
      suffix: interpolate(localizeBusinessCopy("{rate}% doluluk", locale), {
        rate: summary.occupancyRate,
      }),
      helper: interpolate(
        localizeBusinessCopy("{vacant} boş, {maintenance} bakımda", locale),
        { vacant: summary.vacantFlats, maintenance: summary.maintenanceFlats }
      ),
      color: "text-teal-600",
      href: "/dashboard/listings",
    },
    {
      icon: CreditCard,
      label: localizeBusinessCopy("Toplam Borç", locale),
      value: Math.round(summary.totalDebtTry / 1000),
      suffix: "K ₺",
      helper: interpolate(
        localizeBusinessCopy("{count} erişim kısıtı", locale),
        { count: summary.restrictedAccess }
      ),
      color: "text-rose-600",
      href: "/dashboard/finance",
    },
    {
      icon: TicketCheck,
      label: localizeBusinessCopy("Açık Servis", locale),
      value: summary.openTickets,
      suffix: interpolate(localizeBusinessCopy("{count} SLA dışı", locale), {
        count: summary.overdueTickets,
      }),
      helper: localizeBusinessCopy("Teknik, finans ve depozito işleri", locale),
      color: "text-amber-600",
      href: "/dashboard/tickets",
    },
    {
      icon: CalendarCheck,
      label: localizeBusinessCopy("Bugünkü İşler", locale),
      value: summary.activeBookings,
      suffix: interpolate(localizeBusinessCopy("{count} çıkış", locale), {
        count: summary.checkoutsToday,
      }),
      helper: localizeBusinessCopy("Giriş, çıkış, temizlik, depozito", locale),
      color: "text-sky-600",
      href: "/dashboard/calendar",
    },
  ]

  const alerts = [
    {
      icon: AlertTriangle,
      text: interpolate(
        localizeBusinessCopy(
          "{count} operasyon riski AI kuyruğunda: borç, SLA ve check-out birlikte takip ediliyor.",
          locale
        ),
        { count: summary.aiRiskCount }
      ),
      variant: "danger" as const,
      href: "/dashboard/reports",
    },
    {
      icon: LockKeyhole,
      text: interpolate(
        localizeBusinessCopy(
          "{count} dairede erişim kısıtı var. Finans onayı olmadan servis yönlendirilmemeli.",
          locale
        ),
        { count: summary.restrictedAccess }
      ),
      variant: "warning" as const,
      href: "/dashboard/compliance",
    },
    {
      icon: Clock3,
      text: interpolate(
        localizeBusinessCopy(
          "{count} servis talebi SLA dışına çıktı. Teknik ekip için öncelik listesi hazır.",
          locale
        ),
        { count: summary.overdueTickets }
      ),
      variant: "warning" as const,
      href: "/dashboard/tickets",
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground md:text-3xl">
            {clientProfile.clientName} {localizeBusinessCopy("ERP Operasyon Merkezi", locale)}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {localizeBusinessCopy(
              "Satış, proje takibi, WhatsApp/Telegram lead akışı, evrak, servis, finans ve AI önceliklendirme tek çalışma alanında toplanır. Operasyon görünümü 769 birim ölçeğinde yönetim, kontrol ve takip için çalışır.",
              locale
            )}{" "}
            {localizeBusinessCopy("Aktif rol:", locale)}{" "}
            <span className="font-semibold text-foreground">{roleLabel}</span>.
          </p>
          {requestState === "error" && (
            <p className="mt-3 text-xs font-semibold text-rose-600">
              {localizeBusinessCopy("Veri yenilenemedi. Lütfen tekrar deneyin.", locale)}
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
            {localizeBusinessCopy("Portföy kaynağı", locale)}
          </a>
          <DashboardRefreshButton onRefresh={refresh} />
        </div>
      </div>

      <IsometricErpWorld
        mode="dashboard"
        roleLabel={roleLabel}
        dashboardMetrics={[
          [String(summary.totalFlats), localizeBusinessCopy("daire", locale)],
          [String(summary.openTickets), localizeBusinessCopy("açık servis", locale)],
          [roleLabel, localizeBusinessCopy("aktif rol", locale)],
        ]}
      />

      <GlobalOperationsScene roleLabel={roleLabel} summary={summary} />

      <div className="grid gap-3 lg:grid-cols-3">
        {alerts.map((alert, index) => (
          <CommandLink
            key={alert.text}
            href={alert.href}
            ariaLabel={`${alert.text} ${localizeBusinessCopy("modülüne git", locale)}`}
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
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("ERP modül durumu", locale)}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeBusinessCopy(
                "CRM, daire matrisi, kullanıcı rolleri, finans, servis, saha, rezervasyon, iletişim, mobil PWA, entegrasyon, AI ve güvenlik kontrolleri aynı işletim planında izlenir.",
                locale
              )}
            </p>
          </div>
          <span className="flex shrink-0 items-center gap-2">
          <StatusBadge variant="success">
            {interpolate(
              localizeBusinessCopy(
                "{complete} aktif · {readyForUat} kontrol hazır · {inProgress} yapımda",
                locale
              ),
              {
                complete: phaseSummary.complete,
                readyForUat: phaseSummary.readyForUat,
                inProgress: phaseSummary.inProgress,
              }
            )}
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
                ariaLabel={`${localizeBusinessCopy("Modül", locale)} ${phase.phase} ${localizeBusinessCopy(phase.title, locale)} ${localizeBusinessCopy("ekranını aç", locale)}`}
                role={user.role}
              >
              <div className="min-h-full rounded-xl border border-border bg-muted/30 p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Modül", locale)} {phase.phase}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{localizeBusinessCopy(phase.title, locale)}</h3>
                  </div>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-black", status.className)}>
                    <StatusIcon className="h-3 w-3" />
                    {localizeBusinessCopy(status.label, locale)}
                  </span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{localizeBusinessCopy(phase.businessOutcome, locale)}</p>
                <p className="mt-3 text-xs font-semibold text-foreground">{localizeBusinessCopy("Nasıl kullanılır:", locale)} {localizeBusinessCopy(phase.userGuide, locale)}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {phase.evidence.slice(0, 2).map((item) => (
                    <span key={item} className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary">
                      {localizeBusinessCopy(item, locale)}
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
          <CommandLink key={kpi.label} href={kpi.href} ariaLabel={`${kpi.label} ${localizeBusinessCopy("modülünü aç", locale)}`} role={user.role}>
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
        <CommandLink href="/dashboard/finance" ariaLabel={localizeBusinessCopy("Doluluk ve tahsilat sağlığı detayını aç", locale)} className="xl:col-span-2" role={user.role}>
        <Card3D glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Doluluk ve tahsilat sağlığı", locale)}</h2>
              <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Doluluk oranı, gecikmiş borç ve servis baskısı birlikte okunur.", locale)}</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
              <TrendingUp className="h-4 w-4" />
              {localizeBusinessCopy("Haziran hedefi korunuyor", locale)}
            </div>
          </div>
          <LineChart data={occupancyTrend.map((point) => ({ ...point, label: localizeBusinessCopy(point.label, locale) }))} formatValue={(value) => (locale === "tr" ? `%${value}` : `${value}%`)} height={172} />
        </Card3D>
        </CommandLink>

        <CommandLink href="/dashboard/listings" ariaLabel={localizeBusinessCopy("Daire durum dağılımı detayını aç", locale)} role={user.role}>
        <Card3D glow={false}>
          <h2 className="mb-1 text-sm font-bold text-card-foreground">{localizeBusinessCopy("Daire durum dağılımı", locale)}</h2>
          <p className="mb-4 text-xs text-muted-foreground">{localizeBusinessCopy("Operasyon ekibi için canlı portföy kırılımı.", locale)}</p>
          <PieChart data={statusDistribution.map((item) => ({ ...item, label: localizeBusinessCopy(item.label, locale) }))} size={164} />
        </Card3D>
        </CommandLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Blok bazlı operasyon", locale)}</h2>
            <StatusBadge variant="accent">{interpolate(localizeBusinessCopy("{count} blok", locale), { count: blocks.length })}</StatusBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((block) => (
              <CommandLink
                key={block.block}
                href="/dashboard/listings"
                ariaLabel={`${localizeBusinessCopy("Blok", locale)} ${block.block} ${localizeBusinessCopy("daire matrisi detayını aç", locale)}`}
                role={user.role}
              >
              <div className="min-h-full rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-foreground">{localizeBusinessCopy("Blok", locale)} {block.block}</p>
                  <StatusBadge variant={block.blocked > 0 ? "warning" : "success"}>{interpolate(localizeBusinessCopy("{count} daire", locale), { count: block.total })}</StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>{localizeBusinessCopy("Dolu:", locale)} {block.occupied}</span>
                  <span>{localizeBusinessCopy("Boş:", locale)} {block.vacant}</span>
                  <span>{localizeBusinessCopy("Bakım:", locale)} {block.maintenance}</span>
                  <span>{localizeBusinessCopy("Borç:", locale)} {formatTryShort(block.debtTry)}</span>
                </div>
              </div>
              </CommandLink>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <CommandLink href="/dashboard/reports" ariaLabel={localizeBusinessCopy("AI operasyon asistanı raporlarını aç", locale)} role={user.role}>
          <GlassCard glow className="p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("AI operasyon asistanı", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Borç, SLA, depozito ve rezervasyon verilerini birleştirerek günlük yapılacakları sıralar.", locale)}
                </p>
              </div>
            </div>
          </GlassCard>
          </CommandLink>
          {aiInsights.map((insight) => (
            <CommandLink
              key={insight.title}
              href={routeForInsight(insight.title)}
              ariaLabel={`${localizeBusinessCopy(insight.title, locale)} ${localizeBusinessCopy("detayını aç", locale)}`}
              role={user.role}
            >
              {({ allowed }) => (
                <Card3D glow={false}>
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy(insight.title, locale)}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{localizeBusinessCopy(insight.detail, locale)}</p>
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
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Son operasyon akışı", locale)}</h2>
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
                  ariaLabel={`${localizeBusinessCopy(activity.message, locale)} ${localizeBusinessCopy("detayını aç", locale)}`}
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
                        <p className="text-sm text-foreground">{localizeBusinessCopy(activity.message, locale)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {localizeBusinessCopy(activity.actor, locale)} - {localizeBusinessCopy(activity.type, locale)}
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
          <h2 className="mb-4 text-sm font-bold text-card-foreground">{localizeBusinessCopy("Bugünkü kritik işler", locale)}</h2>
          <div className="space-y-3">
            {criticalTickets.map((ticket) => (
              <CommandLink
                key={`ticket-${ticket.label}`}
                href="/dashboard/tickets"
                ariaLabel={`${ticket.label} ${localizeBusinessCopy("servis talebini aç", locale)}`}
                role={user.role}
              >
              <div className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{ticket.label}</p>
                  <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "warning"}>{interpolate(localizeBusinessCopy("{hours} saat", locale), { hours: ticket.slaHoursRemaining })}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{localizeBusinessCopy(ticket.title, locale)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{ticket.assignee}</p>
              </div>
              </CommandLink>
            ))}
            {bookings.slice(0, 2).map((booking) => (
              <CommandLink
                key={booking.id}
                href="/dashboard/calendar"
                ariaLabel={`${booking.flatNumber} ${localizeBusinessCopy("rezervasyon detayını aç", locale)}`}
                role={user.role}
              >
              <div className="rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-foreground">{booking.flatNumber}</p>
                  <StatusBadge variant="info">{booking.channel}</StatusBadge>
                </div>
                <p className="mt-2 text-sm text-foreground">{booking.guestName}</p>
                <p className="mt-1 text-xs text-muted-foreground">{localizeBusinessCopy("Depozito:", locale)} {formatTryShort(booking.depositTry)}</p>
              </div>
              </CommandLink>
            ))}
          </div>
        </Card3D>
      </div>

      <CommandLink href="/dashboard/finance" ariaLabel={localizeBusinessCopy("Finans özetini aç", locale)} role={user.role}>
      <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/[0.035]">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">{localizeBusinessCopy("Aylık beklenen aidat", locale)}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.monthlyExpectedTry)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{localizeBusinessCopy("Haziran tahsilat", locale)}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(cashFlow.at(-1)?.collectedTry ?? 0)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">{localizeBusinessCopy("Depozito riski", locale)}</p>
            <p className="mt-1 text-lg font-black text-foreground">{formatTryShort(summary.depositExposureTry)}</p>
          </div>
        </div>
      </div>
      </CommandLink>
    </div>
  )
}
