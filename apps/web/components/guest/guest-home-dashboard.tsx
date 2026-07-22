"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  ChevronRight,
  FileText,
  MessageSquareText,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { Card3D } from "@/components/3d-card"
import {
  WalletBalanceCard,
  resolveWalletLocale,
} from "@/components/wallet/wallet-overview"
import {
  BookingsList,
  resolveActivitiesLocale,
} from "@/components/activities/activities-catalog"
import { formatDualFromCents } from "@/lib/currency"
import { hasPermission, type Resource, type Role } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import type {
  WalletOverview as WalletOverviewPayload,
  WalletSummary,
} from "@/lib/wallet-repository"
import type { ActivityView, BookingView } from "@/lib/activities-repository"

type GuestLocale = "tr" | "en" | "de" | "ru"

function resolveGuestLocale(value: string): GuestLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface GuestCopy {
  welcome: string
  welcomeSub: string
  snapshotTitle: string
  exploreTitle: string
  recentTitle: string
  seeAll: string
  topUp: string
  metricBalance: string
  metricActive: string
  metricSpent: string
  metricAvailable: string
  loading: string
  loadError: string
  retry: string
}

// Brand development names ("New Level Premium") stay verbatim in every locale,
// matching the operational-copy proper-noun convention.
const guestCopy: Record<GuestLocale, GuestCopy> = {
  en: {
    welcome: "Welcome to New Level Premium",
    welcomeSub:
      "Browse experiences, manage your credit, and keep everything in one place.",
    snapshotTitle: "Your snapshot",
    exploreTitle: "Explore",
    recentTitle: "Your recent bookings",
    seeAll: "See all",
    topUp: "Top up",
    metricBalance: "Wallet balance",
    metricActive: "Active bookings",
    metricSpent: "Spent on experiences",
    metricAvailable: "Experiences available",
    loading: "Loading your workspace…",
    loadError: "Your workspace could not be loaded.",
    retry: "Try again",
  },
  tr: {
    welcome: "New Level Premium'a hoş geldiniz",
    welcomeSub:
      "Deneyimleri keşfedin, kredinizi yönetin ve her şey tek yerde olsun.",
    snapshotTitle: "Özetiniz",
    exploreTitle: "Keşfet",
    recentTitle: "Son rezervasyonlarınız",
    seeAll: "Tümünü gör",
    topUp: "Kredi yükle",
    metricBalance: "Cüzdan bakiyesi",
    metricActive: "Aktif rezervasyon",
    metricSpent: "Deneyim harcaması",
    metricAvailable: "Uygun deneyim",
    loading: "Çalışma alanınız yükleniyor…",
    loadError: "Çalışma alanınız yüklenemedi.",
    retry: "Tekrar dene",
  },
  de: {
    welcome: "Willkommen bei New Level Premium",
    welcomeSub:
      "Entdecken Sie Erlebnisse, verwalten Sie Ihr Guthaben und behalten Sie alles an einem Ort.",
    snapshotTitle: "Ihr Überblick",
    exploreTitle: "Entdecken",
    recentTitle: "Ihre letzten Buchungen",
    seeAll: "Alle ansehen",
    topUp: "Aufladen",
    metricBalance: "Guthaben",
    metricActive: "Aktive Buchungen",
    metricSpent: "Ausgaben für Erlebnisse",
    metricAvailable: "Verfügbare Erlebnisse",
    loading: "Ihr Arbeitsbereich wird geladen…",
    loadError: "Ihr Arbeitsbereich konnte nicht geladen werden.",
    retry: "Erneut versuchen",
  },
  ru: {
    welcome: "Добро пожаловать в New Level Premium",
    welcomeSub:
      "Изучайте впечатления, управляйте балансом и держите всё в одном месте.",
    snapshotTitle: "Ваш обзор",
    exploreTitle: "Открыть",
    recentTitle: "Ваши последние бронирования",
    seeAll: "Смотреть все",
    topUp: "Пополнить",
    metricBalance: "Баланс кошелька",
    metricActive: "Активные бронирования",
    metricSpent: "Потрачено на впечатления",
    metricAvailable: "Доступные впечатления",
    loading: "Загружаем ваше пространство…",
    loadError: "Не удалось загрузить пространство.",
    retry: "Повторить",
  },
}

interface ActivitiesResponse {
  ageFiltered: boolean
  catalog: ActivityView[]
  myBookings: BookingView[]
  childBookings: BookingView[]
}

const quickLinks: Array<{ href: string; resource: Resource; icon: LucideIcon }> = [
  { href: "/dashboard/activities", resource: "activities", icon: Sparkles },
  { href: "/dashboard/reports", resource: "reports", icon: BarChart3 },
  { href: "/dashboard/documents", resource: "documents", icon: FileText },
  { href: "/dashboard/communications", resource: "communications", icon: MessageSquareText },
]

export function GuestHomeDashboard({
  role,
  roleLabel,
}: {
  role: Role
  roleLabel: string
}) {
  const rawLocale = useLocale()
  const locale = resolveGuestLocale(rawLocale)
  const walletLocale = resolveWalletLocale(rawLocale)
  const activitiesLocale = resolveActivitiesLocale(rawLocale)
  const dashboardT = useTranslations("dashboard")
  const text = guestCopy[locale]

  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [activities, setActivities] = useState<ActivitiesResponse | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const requestSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const [walletResult, activitiesResult] = await Promise.allSettled([
        fetch("/api/site-management/wallet?limit=1", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
        fetch("/api/site-management/activities", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
      ])
      if (sequence !== requestSequence.current) return

      let anyLoaded = false
      if (walletResult.status === "fulfilled" && walletResult.value.ok) {
        const payload = (await walletResult.value.json()) as WalletOverviewPayload
        setWallet(payload.wallet)
        anyLoaded = true
      }
      if (activitiesResult.status === "fulfilled" && activitiesResult.value.ok) {
        const payload = (await activitiesResult.value.json()) as ActivitiesResponse
        setActivities(payload)
        anyLoaded = true
      }
      if (sequence === requestSequence.current) {
        setState(anyLoaded ? "ready" : "error")
      }
    } catch {
      if (sequence === requestSequence.current) setState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void load(), 0)
    const onChange = () => void load()
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [load])

  const myBookings = activities?.myBookings ?? []
  const activeBookings = myBookings.filter((booking) => booking.status === "booked").length
  const spentCents = myBookings
    .filter((booking) => booking.status !== "cancelled")
    .reduce((sum, booking) => sum + (booking.amountCents ?? 0), 0)
  const availableCount = activities?.catalog.length ?? 0

  const metrics: Array<{ icon: LucideIcon; label: string; value: string }> = [
    {
      icon: Wallet,
      label: text.metricBalance,
      value: wallet ? formatDualFromCents(wallet.balanceCents, wallet.currency) : "—",
    },
    {
      icon: CalendarCheck,
      label: text.metricActive,
      value: String(activeBookings),
    },
    {
      icon: ReceiptText,
      label: text.metricSpent,
      value: formatDualFromCents(spentCents, "TRY"),
    },
    {
      icon: Sparkles,
      label: text.metricAvailable,
      value: String(availableCount),
    },
  ]

  const links = quickLinks.filter((link) =>
    hasPermission(role, link.resource, "view")
  )

  return (
    <div data-testid="guest-home" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-primary/[0.05] to-transparent p-6 shadow-xl shadow-black/[0.04]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {roleLabel}
          </p>
          <h1 className="mt-3 text-2xl font-black text-foreground md:text-3xl">
            {text.welcome}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            {text.welcomeSub}
          </p>
        </div>
      </div>

      {state === "loading" ? (
        <div
          aria-busy="true"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm font-semibold text-muted-foreground shadow-sm"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
      ) : state === "error" ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-700 dark:text-rose-300"
        >
          <p className="font-black text-foreground">{text.loadError}</p>
          <button
            type="button"
            onClick={() => void load()}
            className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {text.retry}
          </button>
        </div>
      ) : (
        <>
          <section aria-labelledby="guest-snapshot-heading" className="space-y-3">
            <h2 id="guest-snapshot-heading" className="text-sm font-black text-foreground">
              {text.snapshotTitle}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-border bg-background/70 p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <metric.icon aria-hidden="true" className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="mt-1 break-words text-xl font-black text-foreground">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {wallet ? (
              <WalletBalanceCard
                wallet={wallet}
                locale={walletLocale}
                footer={
                  <Link
                    href="/dashboard/wallet"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <Wallet className="h-4 w-4" aria-hidden="true" />
                    {text.topUp}
                  </Link>
                }
              />
            ) : null}

            <section aria-labelledby="guest-explore-heading" className="space-y-3">
              <h2 id="guest-explore-heading" className="text-sm font-black text-foreground">
                {text.exploreTitle}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {links.map((link) => {
                  const label = dashboardT(`menu.${link.resource}`)
                  const Icon = link.icon
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-label={label}
                      className="group/command block rounded-xl outline-none transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <Card3D glow={false}>
                        <div className="flex min-h-10 items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon aria-hidden="true" className="h-5 w-5" />
                          </span>
                          <span className="min-w-0 flex-1 text-sm font-black leading-tight text-card-foreground">
                            {label}
                          </span>
                          <ChevronRight
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover/command:text-primary"
                          />
                        </div>
                      </Card3D>
                    </Link>
                  )
                })}
              </div>
            </section>
          </div>

          <section aria-labelledby="guest-bookings-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="guest-bookings-heading"
                className="flex items-center gap-2 text-sm font-black text-foreground"
              >
                <CalendarCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                {text.recentTitle}
              </h2>
              <Link
                href="/dashboard/activities"
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                {text.seeAll}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            <BookingsList bookings={myBookings} locale={activitiesLocale} limit={3} />
          </section>
        </>
      )}
    </div>
  )
}
