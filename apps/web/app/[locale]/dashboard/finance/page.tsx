"use client"

import { Banknote, CalendarClock, CreditCard, Euro, LockKeyhole, ReceiptText, TrendingDown, WalletCards } from "lucide-react"
import { useLocale } from "next-intl"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { FinanceLiveLedger } from "@/components/finance-live-ledger"
import { PaymentRestrictionControl } from "@/components/payment-restriction-control"
import { StatusBadge } from "@/components/status-badge"
import {
  accessLabels,
  cashFlow,
  formatEur,
  formatEurShort,
  formatTry,
  formatTryShort,
  getDebtAccounts,
  getDebtAging,
  getPaymentPlanSummary,
  getSummary,
  paymentLabels,
  paymentPlans,
  type AccessStatus,
  type PaymentPlanStatus,
  type PaymentStatus,
} from "@/lib/site-management-data"
import { clientProfile } from "@/lib/client-context"
import { localizeBusinessCopy, resolveDashboardLocale, interpolate } from "@/lib/business-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"

function paymentVariant(status: PaymentStatus) {
  if (status === "clear") return "success"
  if (status === "minor_debt") return "warning"
  return "danger"
}

function accessVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "pending") return "warning"
  if (status === "restricted") return "danger"
  return "neutral"
}

function planVariant(status: PaymentPlanStatus) {
  if (status === "on_track") return "success"
  if (status === "due_soon") return "warning"
  return "danger"
}

function planLabel(status: PaymentPlanStatus, locale: string) {
  if (status === "on_track") return localizeBusinessCopy("Planında", locale)
  if (status === "due_soon") return localizeBusinessCopy("Vade yaklaştı", locale)
  if (status === "overdue") return localizeBusinessCopy("Gecikti", locale)
  return localizeBusinessCopy("Blokeli", locale)
}

function blockerLabel(value: string, locale: string) {
  if (value === "No blocker") return localizeBusinessCopy("Blokaj yok", locale)
  if (value === "Reservation contract missing") return localizeBusinessCopy("Rezervasyon sözleşmesi eksik", locale)
  if (value === "Installment not verified") return localizeBusinessCopy("Taksit doğrulanmadı", locale)
  if (value === "Payment plan signature pending") return localizeBusinessCopy("Ödeme planı imzası bekliyor", locale)
  return value
}

function shortDate(date: string, locale: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short" })
    .formatToParts(new Date(date))
    .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
    .join("")
}

export default function FinancePage() {
  const locale = resolveDashboardLocale(useLocale())
  const summary = getSummary()
  const accounts = getDebtAccounts()
  const debtAging = getDebtAging()
  const latestCashFlow = cashFlow.at(-1)
  const legalAccounts = accounts.filter((account) => account.paymentStatus === "legal").length
  const overdueAccounts = accounts.filter((account) => account.paymentStatus === "overdue").length
  const planSummary = getPaymentPlanSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("Finans, Satış & Aidat", locale)}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {interpolate(
            localizeBusinessCopy(
              "{clientName} için satış ödemeleri, aidat, borç yaşlandırma, depozito, ödeme doğrulama, kira geliri ve erişim kısıtı kararları aynı finans akışında yönetilir.",
              locale
            ),
            { clientName: clientProfile.clientName }
          )}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Toplam borç", locale)}</p>
              <p className="text-2xl font-black">{formatTryShort(summary.totalDebtTry)}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ReceiptText className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Aylık aidat", locale)}</p>
              <p className="text-2xl font-black">{formatTryShort(summary.monthlyExpectedTry)}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Banknote className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Haziran tahsilat", locale)}</p>
              <p className="text-2xl font-black">{formatTryShort(latestCashFlow?.collectedTry ?? 0)}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Kısıtlı erişim", locale)}</p>
              <AnimatedCounter value={summary.restrictedAccess} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Aylık nakit akışı", locale)}</h2>
              <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Tahsilat, açık borç ve servis gideri birlikte takip edilir.", locale)}</p>
            </div>
            <StatusBadge variant="success">
              {interpolate(localizeBusinessCopy("Tahsilat {amount}", locale), { amount: formatTryShort(latestCashFlow?.collectedTry ?? 0) })}
            </StatusBadge>
          </div>
          <BarChart
            data={cashFlow.map((month) => ({ label: localizeBusinessCopy(month.label, locale), value: month.collectedTry, color: "var(--primary)" }))}
            formatValue={(value) => formatTryShort(value)}
            height={250}
          />
        </Card3D>

        <Card3D glow={false}>
          <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Borç yaşlandırma", locale)}</h2>
          <p className="mb-4 mt-1 text-xs text-muted-foreground">{localizeBusinessCopy("Önceliklendirme 90+ gün ve erişim kısıtından başlar.", locale)}</p>
          <div className="space-y-3">
            {debtAging.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {interpolate(localizeBusinessCopy("{days} gün", locale), { days: bucket.label })}
                  </span>
                  <span className="text-muted-foreground">{formatTryShort(bucket.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${Math.min(100, Math.round((bucket.value / Math.max(summary.totalDebtTry, 1)) * 100 * 3))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Yasal takip", locale)}</p>
              <p className="mt-1 text-xl font-black">{legalAccounts}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Gecikmiş", locale)}</p>
              <p className="mt-1 text-xl font-black">{overdueAccounts}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card3D glow={false}>
          <div className="flex items-start gap-3">
            <CreditCard className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Ödeme doğrulama", locale)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy(
                  "Banka dekontu, online ödeme, manuel tahsilat ve kasa hareketi aynı hesap kaydına bağlanır.",
                  locale
                )}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-start gap-3">
            <TrendingDown className="mt-0.5 h-5 w-5 text-rose-600" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Borç kısıtlama kuralı", locale)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy(
                  "90+ gün borçta erişim kısıtı, servis bekletme ve yasal takip önerisi otomatik görünür.",
                  locale
                )}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Depozito kontrolü", locale)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy(
                  "Hasar, temizlik ve iade onayı rezervasyon çıkışıyla finans panelinde kapanır.",
                  locale
                )}
              </p>
            </div>
          </div>
        </Card3D>
      </div>

      <FinanceLiveLedger />

      <PaymentRestrictionControl />

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Satış ödeme planı", locale)}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeBusinessCopy(
                "0% taksit akışı; liste fiyatı, peşinat, kalan vade, kur riski ve sözleşme blokajını satıştan önce görünür yapar.",
                locale
              )}
            </p>
          </div>
          <StatusBadge variant="warning">
            {interpolate(localizeBusinessCopy("Açık vade {amount}", locale), { amount: formatEurShort(planSummary.openExposureEur) })}
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Plan sayısı", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{planSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Planında", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{planSummary.onTrack}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Vade uyarısı", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{planSummary.dueSoon + planSummary.overdue}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Blokeli", locale)}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{planSummary.blocked}</p>
          </div>
        </div>
        <DataTable
          data={paymentPlans}
          pageSize={6}
          searchValue={(plan) => `${plan.id} ${plan.dealName} ${plan.buyerName} ${plan.unitType} ${plan.approvalBlocker}`}
          columns={[
            { key: "id", header: localizeBusinessCopy("Plan", locale), sortable: true, render: (plan) => plan.id },
            { key: "deal", header: localizeBusinessCopy("Deal", locale), render: (plan) => plan.dealName.replace("satış planı", localizeBusinessCopy("satış planı", locale)) },
            { key: "buyer", header: localizeBusinessCopy("Alıcı", locale), render: (plan) => plan.buyerName },
            {
              key: "price",
              header: localizeBusinessCopy("Liste", locale),
              sortable: true,
              sortValue: (plan) => plan.listPriceEur,
              render: (plan) => formatEur(plan.listPriceEur),
            },
            {
              key: "paid",
              header: localizeBusinessCopy("Ödenen", locale),
              sortable: true,
              sortValue: (plan) => plan.paidEur,
              render: (plan) => formatEur(plan.paidEur),
            },
            { key: "next", header: localizeBusinessCopy("Sonraki vade", locale), render: (plan) => (
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                {formatEur(plan.nextDueEur)} / {shortDate(plan.nextDueAt, locale)}
              </span>
            ) },
            {
              key: "status",
              header: localizeBusinessCopy("Durum", locale),
              render: (plan) => <StatusBadge variant={planVariant(plan.status)}>{planLabel(plan.status, locale)}</StatusBadge>,
            },
            { key: "blocker", header: localizeBusinessCopy("Blokaj", locale), render: (plan) => blockerLabel(plan.approvalBlocker, locale) },
          ]}
        />
      </Card3D>

      <DataTable
        data={accounts}
        searchValue={(account) => `${account.flatNumber} ${account.ownerName} ${account.suggestedAction}`}
        columns={[
          { key: "flat", header: localizeBusinessCopy("Daire", locale), sortable: true, render: (account) => account.flatNumber },
          { key: "owner", header: localizeBusinessCopy("Malik", locale), render: (account) => localizeOperationalValue(account.ownerName, locale) },
          {
            key: "balance",
            header: localizeBusinessCopy("Borç", locale),
            sortable: true,
            sortValue: (account) => account.balanceTry,
            render: (account) => <span className="font-semibold">{formatTry(account.balanceTry)}</span>,
          },
          {
            key: "aging",
            header: localizeBusinessCopy("Yaş", locale),
            sortable: true,
            render: (account) => interpolate(localizeBusinessCopy("{days} gün", locale), { days: account.agingBucket }),
          },
          {
            key: "payment",
            header: localizeBusinessCopy("Durum", locale),
            render: (account) => (
              <StatusBadge variant={paymentVariant(account.paymentStatus)}>
                {localizeBusinessCopy(paymentLabels[account.paymentStatus], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "access",
            header: localizeBusinessCopy("Erişim", locale),
            render: (account) => (
              <StatusBadge variant={accessVariant(account.accessStatus)}>
                {localizeBusinessCopy(accessLabels[account.accessStatus], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "action",
            header: localizeBusinessCopy("Önerilen aksiyon", locale),
            render: (account) => localizeBusinessCopy(account.suggestedAction, locale),
          },
        ]}
      />
    </div>
  )
}
