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
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"
import { hasPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/client"
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

function formatCents(cents: number, currency = "TRY") {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatEur(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

function shortDate(value: string | null, locale: string) {
  if (!value) return "-"
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
  })
    .formatToParts(new Date(value))
    .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
    .join("")
}

function planVariant(status: string) {
  if (status === "on_track") return "success" as const
  if (status === "due_soon") return "warning" as const
  return "danger" as const
}

function planLabel(status: string, locale: string) {
  if (status === "on_track") return localizeBusinessCopy("Planında", locale)
  if (status === "due_soon") return localizeBusinessCopy("Vade yaklaştı", locale)
  if (status === "overdue") return localizeBusinessCopy("Gecikti", locale)
  if (status === "blocked") return localizeBusinessCopy("Blokeli", locale)
  return status
}

function blockerLabel(value: string, locale: string) {
  if (value === "No blocker") return localizeBusinessCopy("Blokaj yok", locale)
  if (value === "Reservation contract missing") return localizeBusinessCopy("Rezervasyon sözleşmesi eksik", locale)
  if (value === "Installment not verified") return localizeBusinessCopy("Taksit doğrulanmadı", locale)
  if (value === "Payment plan signature pending") return localizeBusinessCopy("Ödeme planı imzası bekliyor", locale)
  return value
}

function depositVariant(status: string) {
  if (status === "held" || status === "reserved" || status === "pending") return "warning" as const
  if (status === "refund_ready" || status === "released") return "success" as const
  if (status === "deduction_pending" || status === "deducted") return "danger" as const
  return "neutral" as const
}

function depositLabel(status: string, locale: string) {
  if (status === "held") return localizeBusinessCopy("Blokede", locale)
  if (status === "reserved") return localizeBusinessCopy("Rezerve", locale)
  if (status === "pending") return localizeBusinessCopy("Bekliyor", locale)
  if (status === "refund_ready") return localizeBusinessCopy("İade hazır", locale)
  if (status === "released") return localizeBusinessCopy("İade edildi", locale)
  if (status === "deduction_pending") return localizeBusinessCopy("Kesinti bekliyor", locale)
  if (status === "deducted") return localizeBusinessCopy("Kesildi", locale)
  if (status === "not_required") return localizeBusinessCopy("Gerekmez", locale)
  return status
}

function restrictionVariant(item: Phase7RestrictionDecision) {
  if (item.riskLevel === "critical") return "danger" as const
  if (item.riskLevel === "high") return "warning" as const
  return "neutral" as const
}

function riskLabel(risk: Phase7RestrictionDecision["riskLevel"], locale: string) {
  if (risk === "critical") return localizeBusinessCopy("Kritik", locale)
  if (risk === "high") return localizeBusinessCopy("Yüksek", locale)
  if (risk === "medium") return localizeBusinessCopy("Orta", locale)
  return localizeBusinessCopy("Düşük", locale)
}

function reconVariant(item: Phase7ReconciliationItem) {
  if (item.status === "captured" || item.status === "authorized") return "success" as const
  if (item.status === "pending" || item.status === "pending_review") return "warning" as const
  if (item.status === "failed" || item.status === "cancelled") return "danger" as const
  return "neutral" as const
}

function reconLabel(status: string, locale: string) {
  if (status === "pending_review") return localizeBusinessCopy("İnceleme", locale)
  if (status === "pending") return localizeBusinessCopy("Bekliyor", locale)
  if (status === "authorized") return localizeBusinessCopy("Onaylandı", locale)
  if (status === "captured") return localizeBusinessCopy("Tahsil edildi", locale)
  if (status === "failed") return localizeBusinessCopy("Hatalı", locale)
  if (status === "cancelled") return localizeBusinessCopy("İptal", locale)
  if (status === "refunded") return localizeBusinessCopy("İade", locale)
  return status
}

function providerLabel(provider: string, locale: string) {
  if (provider === "bank-transfer") return localizeBusinessCopy("Banka transferi", locale)
  if (provider === "manual-bank") return localizeBusinessCopy("Manuel banka", locale)
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

function PaymentPlanRow({ plan, locale }: { plan: Phase7PaymentPlan; locale: string }) {
  return (
    <WorkItem icon={CreditCard}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {plan.dealName.replace("satış planı", localizeBusinessCopy("satış planı", locale))} / {plan.buyerName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatEur(plan.nextDueEur)} {localizeBusinessCopy("vade", locale)} / {shortDate(plan.nextDueAt, locale)} / {plan.completionPercent}% {localizeBusinessCopy("tamamlandı", locale)}
          </p>
        </div>
        <StatusBadge variant={planVariant(plan.status)}>{planLabel(plan.status, locale)}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{blockerLabel(plan.approvalBlocker, locale)}</p>
    </WorkItem>
  )
}

function DepositRow({ item, locale }: { item: Phase7DepositDecision; locale: string }) {
  return (
    <WorkItem icon={WalletCards}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {item.unitNo ?? item.reservationId} / {item.guestName ?? localizeBusinessCopy("Misafir", locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {localizeBusinessCopy("Checkout", locale)} {shortDate(item.checkOutAt, locale)} / {formatCents(item.depositCents, item.currency)}
          </p>
        </div>
        <StatusBadge variant={depositVariant(item.depositStatus)}>{depositLabel(item.depositStatus, locale)}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{localizeBusinessCopy(item.nextAction, locale)}</p>
    </WorkItem>
  )
}

function RestrictionRow({ item, locale }: { item: Phase7RestrictionDecision; locale: string }) {
  return (
    <WorkItem icon={LockKeyhole}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-black text-foreground">
            {item.unitNo ?? item.unitId} / {item.residentName ? localizeOperationalValue(item.residentName, resolveDashboardLocale(locale)) : localizeBusinessCopy("Kayıt", locale)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatCents(item.balanceCents, item.currency)} / {item.agingBucket} {localizeBusinessCopy("gün", locale)}
          </p>
        </div>
        <StatusBadge variant={restrictionVariant(item)}>{riskLabel(item.riskLevel, locale)}</StatusBadge>
      </div>
      <p className="mt-2 text-xs font-semibold text-muted-foreground">{localizeBusinessCopy(item.suggestedAction, locale)}</p>
    </WorkItem>
  )
}

export function PaymentRestrictionControl() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
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

  const lastUpdated = useMemo(() => {
    if (!data?.generatedAt) return null
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(data.generatedAt))
      .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
      .join("")
  }, [data, locale])

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
      label: localizeBusinessCopy("Riskli plan", locale),
      value: data?.summary.paymentPlansAtRisk ?? 0,
      Icon: AlertTriangle,
    },
    {
      label: localizeBusinessCopy("Depozito kuyruğu", locale),
      value: data?.summary.depositQueue ?? 0,
      Icon: WalletCards,
    },
    {
      label: localizeBusinessCopy("Kısıt kararı", locale),
      value: data?.summary.restrictionQueue ?? 0,
      Icon: LockKeyhole,
    },
    {
      label: localizeBusinessCopy("Mutabakat", locale),
      value: data?.summary.reconciliationQueue ?? 0,
      Icon: CreditCard,
    },
    {
      label: localizeBusinessCopy("Onay kuyruğu", locale),
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
              {localizeBusinessCopy("Ödeme, depozito ve kısıt kontrol merkezi", locale)}
            </h2>
            <StatusBadge variant="accent">{localizeBusinessCopy("Phase 7", locale)}</StatusBadge>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            {localizeBusinessCopy(
              "Satış ödeme planı, depozito iadesi, banka mutabakatı ve borca bağlı erişim kısıtı aynı onay kuyruğunda izlenir. Sistem karar önerir; finans ve erişim aksiyonları insan onayıyla kapanır.",
              locale
            )}
          </p>
          {lastUpdated && (
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              {localizeBusinessCopy("Son güncelleme:", locale)} {lastUpdated}
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
            {localizeBusinessCopy("Kontrolleri yenile", locale)}
          </button>
          {canApproveFinance && (
            <DashboardActionButton
              actionType="finance.reconciliation.create"
              ariaLabel={localizeBusinessCopy("Mutabakat inceleme isteği oluştur", locale)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/15"
              entityTable="payment_transactions"
              metadata={{
                phase: 7,
                approvalQueue: data?.summary.approvalQueue ?? 0,
                source: data?.source ?? "unknown",
              }}
              successLabel={localizeBusinessCopy("İnceleme isteği alındı", locale)}
              title={localizeBusinessCopy("Phase 7 mutabakat inceleme isteği", locale)}
            >
              <BadgeCheck className="h-4 w-4" />
              {localizeBusinessCopy("İnceleme aç", locale)}
            </DashboardActionButton>
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="mt-4 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {localizeBusinessCopy(
            "Ödeme kontrol verisi şu anda alınamadı. Yenile butonu ile tekrar deneyin veya API durumunu kontrol edin.",
            locale
          )}
        </div>
      )}

      {attentionChecks.length > 0 && (
        <div role="alert" className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          {localizeBusinessCopy("Kalite kontrolü dikkat istiyor:", locale)} {attentionChecks.map((check) => check.label).join(", ")}
        </div>
      )}

      <div className="grid gap-3 py-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value, Icon }) => (
          <div key={label} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold uppercase text-muted-foreground">{label}</p>
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-foreground">{localizeBusinessCopy("Ödeme planı ve depozito işi", locale)}</h3>
            <StatusBadge variant="warning">
              {localizeBusinessCopy("Açık vade", locale)} {formatEur(data?.summary.openPlanExposureEur ?? 0)}
            </StatusBadge>
          </div>
          {topPlan.map((plan) => <PaymentPlanRow key={plan.id} plan={plan} locale={locale} />)}
          {topDeposits.map((item) => <DepositRow key={item.id} item={item} locale={locale} />)}
          {topPlan.length + topDeposits.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {localizeBusinessCopy("Açık ödeme veya depozito işi bulunamadı.", locale)}
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black text-foreground">{localizeBusinessCopy("Kısıt ve mutabakat kuyruğu", locale)}</h3>
            <StatusBadge variant="danger">
              {formatCents(data?.summary.depositExposureCents ?? 0, currency)} {localizeBusinessCopy("depozito", locale)}
            </StatusBadge>
          </div>
          {topRestrictions.map((item) => <RestrictionRow key={item.id} item={item} locale={locale} />)}
          {topReconciliation.map((item) => (
            <WorkItem key={item.id} icon={CreditCard}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">
                    {providerLabel(item.provider, locale)} / {item.providerReference ?? item.id}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatCents(item.amountCents, item.currency)} / {shortDate(item.paidAt, locale)}
                  </p>
                </div>
                <StatusBadge variant={reconVariant(item)}>{reconLabel(item.status, locale)}</StatusBadge>
              </div>
            </WorkItem>
          ))}
          {topRestrictions.length + topReconciliation.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
              {localizeBusinessCopy("Kısıt veya mutabakat kuyruğu boş.", locale)}
            </div>
          )}
        </div>
      </div>
    </Card3D>
  )
}
