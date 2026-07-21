"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useLocale } from "next-intl"
import {
  AlertTriangle,
  BadgeCheck,
  CreditCard,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { hasPermission } from "@/lib/rbac"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import { createClient } from "@/lib/supabase/client"
import { formatDual, formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  PaymentRestrictionData,
  Phase7DepositDecision,
  Phase7PaymentPlan,
  Phase7ReconciliationItem,
  Phase7RestrictionDecision,
} from "@/lib/site-management-repository"

type RequestState = "idle" | "loading" | "success" | "error"

const PHASE7_REALTIME_TABLES = [
  "finance_ledger_entries",
  "payment_transactions",
  "reservations",
  "access_events",
  "client_action_requests",
]

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Both restriction thresholds and deposit figures show in Lira and Euro via the
// shared helper. Ledger amounts are integer minor units (kuruş/cents).
function formatCents(cents: number, currency = "TRY") {
  return formatDualFromCents(cents, currency === "EUR" ? "EUR" : "TRY")
}

function formatEur(value: number) {
  return formatDual(value, { currency: "EUR" })
}

function shortDate(value: string | null, locale = "tr-TR") {
  if (!value) return "-"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(new Date(value))
}

function planVariant(status: string) {
  if (status === "on_track") return "success" as const
  if (status === "due_soon") return "warning" as const
  return "danger" as const
}

function planLabel(status: string) {
  if (status === "on_track") return "Planında"
  if (status === "due_soon") return "Vade yaklaştı"
  if (status === "overdue") return "Gecikti"
  if (status === "blocked") return "Blokeli"
  return status
}

function blockerLabel(value: string) {
  if (value === "No blocker") return "Blokaj yok"
  if (value === "Reservation contract missing") return "Rezervasyon sözleşmesi eksik"
  if (value === "Second installment not verified") return "İkinci taksit doğrulanmadı"
  if (value === "Payment plan signature pending") return "Ödeme planı imzası bekliyor"
  return value
}

function depositVariant(status: string) {
  if (status === "held" || status === "reserved" || status === "pending") return "warning" as const
  if (status === "refund_ready" || status === "released") return "success" as const
  if (status === "deduction_pending" || status === "deducted") return "danger" as const
  return "neutral" as const
}

function depositLabel(status: string) {
  if (status === "held") return "Blokede"
  if (status === "reserved") return "Rezerve"
  if (status === "pending") return "Bekliyor"
  if (status === "refund_ready") return "İade hazır"
  if (status === "released") return "İade edildi"
  if (status === "deduction_pending") return "Kesinti bekliyor"
  if (status === "deducted") return "Kesildi"
  if (status === "not_required") return "Gerekmez"
  return status
}

function restrictionVariant(item: Phase7RestrictionDecision) {
  if (item.riskLevel === "critical") return "danger" as const
  if (item.riskLevel === "high") return "warning" as const
  return "neutral" as const
}

function riskLabel(risk: Phase7RestrictionDecision["riskLevel"]) {
  if (risk === "critical") return "Kritik"
  if (risk === "high") return "Yüksek"
  if (risk === "medium") return "Orta"
  return "Düşük"
}

function reconVariant(item: Phase7ReconciliationItem) {
  if (item.status === "captured" || item.status === "authorized") return "success" as const
  if (item.status === "pending" || item.status === "pending_review") return "warning" as const
  if (item.status === "failed" || item.status === "cancelled") return "danger" as const
  return "neutral" as const
}

function reconLabel(status: string) {
  if (status === "pending_review") return "İnceleme"
  if (status === "pending") return "Bekliyor"
  if (status === "authorized") return "Onaylandı"
  if (status === "captured") return "Tahsil edildi"
  if (status === "failed") return "Hatalı"
  if (status === "cancelled") return "İptal"
  if (status === "refunded") return "İade"
  return status
}

function providerLabel(provider: string) {
  if (provider === "bank-transfer") return "Banka transferi"
  if (provider === "manual-bank") return "Manuel banka"
  return provider
}

function WorkItem({
  children,
  icon: Icon,
}: {
  children: ReactNode
  icon: typeof CreditCard
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-border/70 bg-background/70 p-3 sm:grid-cols-[auto_1fr]">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

function PaymentPlanRow({
  intlLocale,
  plan,
  t,
}: {
  intlLocale: string
  plan: Phase7PaymentPlan
  t: (value: string) => string
}) {
  return (
    <WorkItem icon={CreditCard}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {plan.dealName} / {plan.buyerName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatEur(plan.nextDueEur)} {t("vade")} / {shortDate(plan.nextDueAt, intlLocale)} / {plan.completionPercent}% {t("tamamlandı")}
          </p>
        </div>
        <StatusBadge variant={planVariant(plan.status)}>{t(planLabel(plan.status))}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{t(blockerLabel(plan.approvalBlocker))}</p>
    </WorkItem>
  )
}

function DepositRow({
  intlLocale,
  item,
  t,
}: {
  intlLocale: string
  item: Phase7DepositDecision
  t: (value: string) => string
}) {
  return (
    <WorkItem icon={WalletCards}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {item.unitNo ?? item.reservationId} / {item.guestName ?? t("Misafir")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Çıkış")} {shortDate(item.checkOutAt, intlLocale)} / {formatCents(item.depositCents, item.currency)}
          </p>
        </div>
        <StatusBadge variant={depositVariant(item.depositStatus)}>{t(depositLabel(item.depositStatus))}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{t(item.nextAction)}</p>
    </WorkItem>
  )
}

function RestrictionRow({
  intlLocale,
  item,
  t,
}: {
  intlLocale: string
  item: Phase7RestrictionDecision
  t: (value: string) => string
}) {
  return (
    <WorkItem icon={LockKeyhole}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {item.unitNo ?? item.unitId} / {item.residentName ?? t("Kayıt")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCents(item.balanceCents, item.currency)} / {item.agingBucket} {t("gün")}
          </p>
        </div>
        <StatusBadge variant={restrictionVariant(item)}>{t(riskLabel(item.riskLevel))}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{t(item.suggestedAction)}</p>
    </WorkItem>
  )
}

export function PaymentRestrictionControl() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const [data, setData] = useState<PaymentRestrictionData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const canApproveFinance =
    hasPermission(user.role, "finance", "approve") ||
    hasPermission(user.role, "finance", "manage")

  const fetchControls = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/payment-controls?limit=8", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Payment control request failed.")
      setData((await response.json()) as PaymentRestrictionData)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchControls()
    }, 0)
    const handleOperationalChange = () => {
      void fetchControls()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)

    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", handleOperationalChange)
    }
  }, [fetchControls])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || data?.source !== "supabase") return

    const supabase = createClient()
    let channel = supabase.channel("phase7-payment-controls")

    PHASE7_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchControls()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [data?.source, fetchControls])

  const lastUpdated = data?.generatedAt
    ? new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(data.generatedAt))
    : null

  const attentionChecks = useMemo(
    () => data?.quality.checks.filter((check) => check.status !== "passed") ?? [],
    [data]
  )
  const topPlan = data?.paymentPlans.slice(0, 3) ?? []
  const topDeposits = data?.depositDecisions.slice(0, 3) ?? []
  const topRestrictions = data?.restrictionDecisions.slice(0, 3) ?? []
  const topReconciliation = data?.reconciliation.slice(0, 3) ?? []
  const currency = data?.summary.currency ?? "TRY"
  const summaryCards = [
    {
      label: "Riskli plan",
      value: data?.summary.paymentPlansAtRisk ?? 0,
      Icon: AlertTriangle,
    },
    {
      label: "Depozito kuyruğu",
      value: data?.summary.depositQueue ?? 0,
      Icon: WalletCards,
    },
    {
      label: "Kısıt kararı",
      value: data?.summary.restrictionQueue ?? 0,
      Icon: LockKeyhole,
    },
    {
      label: "Mutabakat",
      value: data?.summary.reconciliationQueue ?? 0,
      Icon: CreditCard,
    },
    {
      label: "Onay kuyruğu",
      value: data?.summary.approvalQueue ?? 0,
      Icon: KeyRound,
    },
  ]

  return (
    <Card3D glow={false} className="overflow-hidden" aria-busy={requestState === "loading"}>
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h2 className="text-base font-black text-card-foreground">
              {t("Ödeme, depozito ve kısıt kontrol merkezi")}
            </h2>
            <StatusBadge variant="accent">Phase 7</StatusBadge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {t("Satış ödeme planı, depozito iadesi, banka mutabakatı ve borca bağlı erişim kısıtı aynı onay kuyruğunda izlenir. Sistem karar önerir; finans ve erişim aksiyonları insan onayıyla kapanır.")}
          </p>
          {lastUpdated && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {t("Son güncelleme")}: {lastUpdated}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchControls()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw className={cn("h-4 w-4", requestState === "loading" && "animate-spin")} />
            {t("Kontrolleri yenile")}
          </button>
          {canApproveFinance && (
            <DashboardActionMenu
              label="Aksiyonlar"
              ariaLabel="Odeme kontrol aksiyonlari"
              buttonClassName="border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              items={[
                {
                  key: "review",
                  label: "Inceleme ac",
                  description: `${data?.summary.approvalQueue ?? 0} onay kaydi takipte.`,
                  icon: <BadgeCheck />,
                  actionType: "finance.reconciliation.create",
                  ariaLabel: "Mutabakat inceleme istegi olustur",
                  entityTable: "payment_transactions",
                  title: "Phase 7 mutabakat inceleme istegi",
                  metadata: {
                    phase: 7,
                    approvalQueue: data?.summary.approvalQueue ?? 0,
                    source: data?.source ?? "unknown",
                  },
                },
              ]}
            />
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {t("Ödeme kontrol verisi şu anda alınamadı. Yenile butonu ile tekrar deneyin veya API durumunu kontrol edin.")}
        </div>
      )}

      {attentionChecks.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {t("Kalite kontrolü dikkat istiyor")}: {attentionChecks.map((check) => check.label).join(", ")}
        </div>
      )}

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">{t(label)}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-foreground">{t("Ödeme planı ve depozito işi")}</h3>
            <StatusBadge variant="warning">
              {t("Açık vade")} {formatEur(data?.summary.openPlanExposureEur ?? 0)}
            </StatusBadge>
          </div>
          {topPlan.map((plan) => <PaymentPlanRow key={plan.id} intlLocale={intlLocale} plan={plan} t={t} />)}
          {topDeposits.map((item) => <DepositRow key={item.id} intlLocale={intlLocale} item={item} t={t} />)}
          {topPlan.length + topDeposits.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("Açık ödeme veya depozito işi bulunamadı.")}
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-foreground">{t("Kısıt ve mutabakat kuyruğu")}</h3>
            <StatusBadge variant="danger">
              {formatCents(data?.summary.depositExposureCents ?? 0, currency)} {t("Depozito")}
            </StatusBadge>
          </div>
          {topRestrictions.map((item) => <RestrictionRow key={item.id} intlLocale={intlLocale} item={item} t={t} />)}
          {topReconciliation.map((item) => (
            <WorkItem key={item.id} icon={CreditCard}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">
                    {t(providerLabel(item.provider))} / {item.providerReference ?? item.id}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCents(item.amountCents, item.currency)} / {shortDate(item.paidAt, intlLocale)}
                  </p>
                </div>
                <StatusBadge variant={reconVariant(item)}>{t(reconLabel(item.status))}</StatusBadge>
              </div>
            </WorkItem>
          ))}
          {topRestrictions.length + topReconciliation.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {t("Kısıt veya mutabakat kuyruğu boş.")}
            </div>
          )}
        </div>
      </div>
    </Card3D>
  )
}
