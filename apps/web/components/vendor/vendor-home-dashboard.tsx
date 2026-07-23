"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { FeatureInfo } from "@/components/feature-info"
import {
  ArrowUpRight,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  Clock3,
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
  SubmissionStatusPill,
  resolveVendorLocale,
} from "@/components/vendor/vendor-invoicing-workspace"
import { formatDualFromCents } from "@/lib/currency"
import { hasPermission, type Resource, type Role } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import type {
  WalletOverview as WalletOverviewPayload,
  WalletSummary,
} from "@/lib/wallet-repository"
import type { VendorWorkspace } from "@/lib/vendor-invoice-repository"

type VendorHomeLocale = "tr" | "en" | "de" | "ru"

function resolveHomeLocale(value: string): VendorHomeLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface HomeCopy {
  welcome: string
  welcomeSub: string
  snapshotTitle: string
  exploreTitle: string
  recentTitle: string
  seeAll: string
  goInvoices: string
  metricBalance: string
  metricJobs: string
  metricPending: string
  metricApproved: string
  loading: string
  loadError: string
  retry: string
  recentEmpty: string
}

const homeCopy: Record<VendorHomeLocale, HomeCopy> = {
  en: {
    welcome: "Your service workspace",
    welcomeSub:
      "See the jobs assigned to you, issue invoices, and track their status in one place.",
    snapshotTitle: "Your snapshot",
    exploreTitle: "Explore",
    recentTitle: "Recent invoices",
    seeAll: "See all",
    goInvoices: "Go to invoicing",
    metricBalance: "Wallet balance",
    metricJobs: "Assigned jobs",
    metricPending: "Awaiting review",
    metricApproved: "Approved",
    loading: "Loading your workspace…",
    loadError: "Your workspace could not be loaded.",
    retry: "Try again",
    recentEmpty: "No invoices yet.",
  },
  tr: {
    welcome: "Hizmet çalışma alanınız",
    welcomeSub:
      "Size atanan işleri görün, fatura kesin ve durumlarını tek yerden takip edin.",
    snapshotTitle: "Özetiniz",
    exploreTitle: "Keşfet",
    recentTitle: "Son faturalar",
    seeAll: "Tümünü gör",
    goInvoices: "Faturalandırmaya git",
    metricBalance: "Cüzdan bakiyesi",
    metricJobs: "Atanan işler",
    metricPending: "İnceleme bekliyor",
    metricApproved: "Onaylandı",
    loading: "Çalışma alanınız yükleniyor…",
    loadError: "Çalışma alanınız yüklenemedi.",
    retry: "Tekrar dene",
    recentEmpty: "Henüz fatura yok.",
  },
  de: {
    welcome: "Ihr Service-Arbeitsbereich",
    welcomeSub:
      "Sehen Sie Ihre zugewiesenen Aufträge, stellen Sie Rechnungen und verfolgen Sie deren Status an einem Ort.",
    snapshotTitle: "Ihr Überblick",
    exploreTitle: "Entdecken",
    recentTitle: "Letzte Rechnungen",
    seeAll: "Alle ansehen",
    goInvoices: "Zur Rechnungsstellung",
    metricBalance: "Guthaben",
    metricJobs: "Zugewiesene Aufträge",
    metricPending: "Wartet auf Prüfung",
    metricApproved: "Genehmigt",
    loading: "Ihr Arbeitsbereich wird geladen…",
    loadError: "Ihr Arbeitsbereich konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    recentEmpty: "Noch keine Rechnungen.",
  },
  ru: {
    welcome: "Ваше рабочее пространство",
    welcomeSub:
      "Смотрите назначенные работы, выставляйте счета и отслеживайте их статус в одном месте.",
    snapshotTitle: "Ваш обзор",
    exploreTitle: "Открыть",
    recentTitle: "Последние счета",
    seeAll: "Смотреть все",
    goInvoices: "Перейти к счетам",
    metricBalance: "Баланс кошелька",
    metricJobs: "Назначенные работы",
    metricPending: "Ожидают проверки",
    metricApproved: "Одобрено",
    loading: "Загружаем ваше пространство…",
    loadError: "Не удалось загрузить пространство.",
    retry: "Повторить",
    recentEmpty: "Пока нет счетов.",
  },
}

const quickLinks: Array<{ href: string; resource: Resource; icon: LucideIcon }> = [
  { href: "/dashboard/activities", resource: "activities", icon: Sparkles },
  { href: "/dashboard/vendor-invoices", resource: "vendor_invoices", icon: ReceiptText },
  { href: "/dashboard/reports", resource: "reports", icon: BarChart3 },
  { href: "/dashboard/communications", resource: "communications", icon: MessageSquareText },
]

export function VendorHomeDashboard({
  role,
  roleLabel,
}: {
  role: Role
  roleLabel: string
}) {
  const rawLocale = useLocale()
  const locale = resolveHomeLocale(rawLocale)
  const walletLocale = resolveWalletLocale(rawLocale)
  const vendorLocale = resolveVendorLocale(rawLocale)
  const dashboardT = useTranslations("dashboard")
  const text = homeCopy[locale]

  const [wallet, setWallet] = useState<WalletSummary | null>(null)
  const [workspace, setWorkspace] = useState<VendorWorkspace | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const requestSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current
    try {
      const [walletResult, vendorResult] = await Promise.allSettled([
        fetch("/api/site-management/wallet?limit=1", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
        fetch("/api/site-management/vendor-invoices?limit=5", {
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
      if (vendorResult.status === "fulfilled" && vendorResult.value.ok) {
        const payload = (await vendorResult.value.json()) as VendorWorkspace
        setWorkspace(payload)
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

  const summary = workspace?.summary
  const recentInvoices = workspace?.invoices.slice(0, 4) ?? []

  const metrics: Array<{ icon: LucideIcon; label: string; value: string }> = [
    {
      icon: Wallet,
      label: text.metricBalance,
      value: wallet ? formatDualFromCents(wallet.balanceCents, wallet.currency) : "-",
    },
    {
      icon: Briefcase,
      label: text.metricJobs,
      value: summary ? String(summary.jobCount) : "-",
    },
    {
      icon: Clock3,
      label: text.metricPending,
      value: summary ? String(summary.pendingCount) : "-",
    },
    {
      icon: CheckCircle2,
      label: text.metricApproved,
      value: summary ? String(summary.approvedCount) : "-",
    },
  ]

  const links = quickLinks.filter((link) =>
    hasPermission(role, link.resource, "view")
  )

  return (
    <div data-testid="vendor-home" className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-primary/[0.05] to-transparent p-6 shadow-xl shadow-black/[0.04]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative">
          <p className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-primary">
            <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
            {roleLabel}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground md:text-3xl">
              {text.welcome}
            </h1>
            <FeatureInfo featureKey="dashboard" side="bottom" />
          </div>
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
          <section aria-labelledby="vendor-snapshot-heading" className="space-y-3">
            <h2
              id="vendor-snapshot-heading"
              className="text-sm font-black text-foreground"
            >
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
                    href="/dashboard/vendor-invoices"
                    className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    <ReceiptText className="h-4 w-4" aria-hidden="true" />
                    {text.goInvoices}
                  </Link>
                }
              />
            ) : null}

            <section aria-labelledby="vendor-explore-heading" className="space-y-3">
              <h2
                id="vendor-explore-heading"
                className="text-sm font-black text-foreground"
              >
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

          <section aria-labelledby="vendor-recent-heading" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2
                id="vendor-recent-heading"
                className="flex items-center gap-2 text-sm font-black text-foreground"
              >
                <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
                {text.recentTitle}
              </h2>
              <Link
                href="/dashboard/vendor-invoices"
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-black text-primary outline-none transition hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary"
                )}
              >
                {text.seeAll}
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
            {recentInvoices.length ? (
              <ul className="space-y-2">
                {recentInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">
                        {invoice.invoiceNo}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {invoice.totalLabel}
                      </p>
                    </div>
                    <SubmissionStatusPill
                      status={invoice.submissionStatus}
                      locale={vendorLocale}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {text.recentEmpty}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  )
}
