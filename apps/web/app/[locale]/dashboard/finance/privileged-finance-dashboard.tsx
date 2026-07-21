"use client"

import { useLocale } from "next-intl"
import {
  ArrowUpRight,
  Banknote,
  CalendarClock,
  CreditCard,
  Euro,
  LockKeyhole,
  ReceiptText,
  TrendingDown,
  WalletCards,
} from "lucide-react"
import { AccountantFinancePanel } from "@/components/accountant-finance-panel"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { FinanceLiveLedger } from "@/components/finance-live-ledger"
import { ManualPaymentConsole } from "@/components/manual-payment-console"
import { PaymentRestrictionControl } from "@/components/payment-restriction-control"
import { StatusBadge } from "@/components/status-badge"
import {
  accessLabels,
  cashFlow,
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
import { formatDual, formatDualShort } from "@/lib/currency"
import { clientProfile } from "@/lib/client-context"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"

// Maps the Turkish month abbreviations used in the cash-flow seed to a month
// index (0-11) so the latest data point can drive a localized month label.
const TR_MONTH_ABBR_TO_INDEX: Record<string, number> = {
  Oca: 0,
  Şub: 1,
  Mar: 2,
  Nis: 3,
  May: 4,
  Haz: 5,
  Tem: 6,
  Ağu: 7,
  Eyl: 8,
  Eki: 9,
  Kas: 10,
  Ara: 11,
}

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

function planLabel(status: PaymentPlanStatus) {
  if (status === "on_track") return "Planında"
  if (status === "due_soon") return "Vade yaklaştı"
  if (status === "overdue") return "Gecikti"
  return "Blokeli"
}

function shortDate(
  date: string,
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
  }).format(new Date(date))
}

export function PrivilegedFinanceDashboard() {
  const locale = resolveDashboardLocale(useLocale())
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const summary = getSummary()
  const accounts = getDebtAccounts()
  const debtAging = getDebtAging()
  const latestCashFlow = cashFlow.at(-1)
  // Derive the collection-card label from the latest data point's month instead
  // of a hardcoded "June", so it stays correct if the series window shifts.
  const latestMonthIndex =
    TR_MONTH_ABBR_TO_INDEX[latestCashFlow?.label ?? ""] ?? new Date().getMonth()
  const latestMonthName = new Intl.DateTimeFormat(toIntlLocale(locale), {
    month: "long",
  }).format(new Date(Date.UTC(2000, latestMonthIndex, 1)))
  const collectionCardLabel = `${latestMonthName} ${t("Tahsilat")}`
  const legalAccounts = accounts.filter(
    (account) => account.paymentStatus === "legal"
  ).length
  const overdueAccounts = accounts.filter(
    (account) => account.paymentStatus === "overdue"
  ).length
  const planSummary = getPaymentPlanSummary()
  // Shared styling so each KPI tile reads as an interactive drill-in link.
  const kpiLinkClass =
    "group/command block rounded-xl outline-none transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const pageIntro = {
    tr: `${clientProfile.clientName} için satış ödemeleri, aidat, borç yaşlandırma, depozito, ödeme doğrulama, kira geliri ve erişim kısıtı kararları aynı finans akışında yönetilir.`,
    en: `${clientProfile.clientName} manages sales payments, dues, debt aging, deposits, payment verification, rental income and access-hold decisions in one finance flow.`,
    de: `${clientProfile.clientName} steuert Verkaufszahlungen, Beiträge, Schuldenalterung, Kautionen, Zahlungsprüfung, Mieteinnahmen und Zugangssperren in einem Finanzfluss.`,
    ru: `${clientProfile.clientName} управляет платежами продаж, взносами, старением долга, депозитами, проверкой оплат, арендным доходом и решениями по доступу в одном финансовом потоке.`,
  }[locale]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">
          {t("Finans, Satış & Aidat")}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {pageIntro}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <a href="#finance-accounts" className={kpiLinkClass} aria-label={t("Toplam borç")}>
          <Card3D glow={false}>
            <div className="flex items-center gap-3">
              <WalletCards className="h-8 w-8 shrink-0 text-rose-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("Toplam borç")}
                </p>
                <p className="text-xl font-black leading-tight break-words">
                  {formatDualShort(summary.totalDebtTry)}
                </p>
              </div>
            </div>
          </Card3D>
        </a>
        <a href="#finance-ledger" className={kpiLinkClass} aria-label={t("Aylık aidat")}>
          <Card3D glow={false}>
            <div className="flex items-center gap-3">
              <ReceiptText className="h-8 w-8 shrink-0 text-teal-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("Aylık aidat")}
                </p>
                <p className="text-xl font-black leading-tight break-words">
                  {formatDualShort(summary.monthlyExpectedTry)}
                </p>
              </div>
            </div>
          </Card3D>
        </a>
        <a href="#finance-cashflow" className={kpiLinkClass} aria-label={collectionCardLabel}>
          <Card3D glow={false}>
            <div className="flex items-center gap-3">
              <Banknote className="h-8 w-8 shrink-0 text-sky-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {collectionCardLabel}
                </p>
                <p className="text-xl font-black leading-tight break-words">
                  {formatDualShort(latestCashFlow?.collectedTry ?? 0)}
                </p>
              </div>
            </div>
          </Card3D>
        </a>
        <a
          href="#finance-restrictions"
          className={kpiLinkClass}
          aria-label={t("Kısıtlı erişim")}
        >
          <Card3D glow={false}>
            <div className="flex items-center gap-3">
              <LockKeyhole className="h-8 w-8 shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  {t("Kısıtlı erişim")}
                </p>
                <AnimatedCounter
                  value={summary.restrictedAccess}
                  className="text-2xl font-black"
                />
              </div>
            </div>
          </Card3D>
        </a>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D
          id="finance-cashflow"
          className="scroll-mt-24 xl:col-span-2"
          glow={false}
        >
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">
                {t("Aylık nakit akışı")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Tahsilat, açık borç ve servis gideri birlikte takip edilir."
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant="success">
                {t("Tahsilat")}{" "}
                {formatDualShort(latestCashFlow?.collectedTry ?? 0)}
              </StatusBadge>
              <a
                href="#finance-accounts"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
              >
                {t("Kayıtları aç")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <BarChart
            data={cashFlow.map((month) => ({
              label: t(month.label),
              value: month.collectedTry,
              color: "var(--primary)",
            }))}
            ariaLabel={t("Tahsilat nakit akışı grafiği")}
            formatValue={(value) => formatDualShort(value)}
            height={250}
            totalLabel={t("Toplam")}
          />
        </Card3D>

        <Card3D glow={false}>
          <h2 className="text-sm font-bold text-card-foreground">
            {t("Borç yaşlandırma")}
          </h2>
          <p className="mt-1 mb-4 text-xs text-muted-foreground">
            {t("Önceliklendirme 90+ gün ve erişim kısıtından başlar.")}
          </p>
          <div className="space-y-3">
            {debtAging.map((bucket) => (
              <div key={bucket.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">
                    {bucket.label} {t("gün")}
                  </span>
                  <span className="text-muted-foreground">
                    {bucket.value > 0
                      ? formatDualShort(bucket.value)
                      : t("Açık kalem yok")}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{
                      width: `${Math.min(100, Math.round((bucket.value / Math.max(summary.totalDebtTry, 1)) * 100 * 3))}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">
                {t("Yasal takip")}
              </p>
              <p className="mt-1 text-xl font-black">{legalAccounts}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("Gecikmiş")}</p>
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
              <h2 className="text-sm font-bold text-card-foreground">
                {t("Ödeme doğrulama")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Banka dekontu, online ödeme, manuel tahsilat ve kasa hareketi aynı hesap kaydına bağlanır."
                )}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-start gap-3">
            <TrendingDown className="mt-0.5 h-5 w-5 text-rose-600" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">
                {t("Borç kısıtlama kuralı")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "90+ gün borçta erişim kısıtı, servis bekletme ve yasal takip önerisi otomatik görünür."
                )}
              </p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-start gap-3">
            <Banknote className="mt-0.5 h-5 w-5 text-teal-600" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">
                {t("Depozito kontrolü")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  "Hasar, temizlik ve iade onayı rezervasyon çıkışıyla finans panelinde kapanır."
                )}
              </p>
            </div>
          </div>
        </Card3D>
      </div>

      <div id="finance-ledger" className="scroll-mt-24">
        <FinanceLiveLedger />
      </div>

      <ManualPaymentConsole />

      <div id="accountant-finance" className="scroll-mt-24">
        <AccountantFinancePanel />
      </div>

      <div id="finance-restrictions" className="scroll-mt-24">
        <PaymentRestrictionControl />
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Euro className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">
                {t("Satış ödeme planı")}
              </h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t(
                "0% taksit akışı; liste fiyatı, peşinat, kalan vade, kur riski ve sözleşme blokajını satıştan önce görünür yapar."
              )}
            </p>
          </div>
          <StatusBadge variant="warning">
            {t("Açık vade")} {formatDualShort(planSummary.openExposureEur, "EUR")}
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t("Plan sayısı")}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {planSummary.total}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t("Planında")}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {planSummary.onTrack}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t("Vade uyarısı")}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {planSummary.dueSoon + planSummary.overdue}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">
              {t("Blokeli")}
            </p>
            <p className="mt-1 text-2xl font-black text-foreground">
              {planSummary.blocked}
            </p>
          </div>
        </div>
        <DataTable
          data={paymentPlans}
          pageSize={6}
          searchValue={(plan) =>
            `${plan.id} ${plan.dealName} ${plan.buyerName} ${plan.unitType} ${plan.approvalBlocker}`
          }
          columns={[
            {
              key: "id",
              header: "Plan",
              sortable: true,
              render: (plan) => plan.id,
            },
            { key: "deal", header: "Deal", render: (plan) => t(plan.dealName) },
            { key: "buyer", header: "Alıcı", render: (plan) => plan.buyerName },
            {
              key: "price",
              header: "Liste",
              sortable: true,
              sortValue: (plan) => plan.listPriceEur,
              render: (plan) => formatDualShort(plan.listPriceEur, "EUR"),
            },
            {
              key: "paid",
              header: "Ödenen",
              sortable: true,
              sortValue: (plan) => plan.paidEur,
              render: (plan) => formatDualShort(plan.paidEur, "EUR"),
            },
            {
              key: "next",
              header: "Sonraki vade",
              render: (plan) => (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatDualShort(plan.nextDueEur, "EUR")} /{" "}
                  {shortDate(plan.nextDueAt, locale)}
                </span>
              ),
            },
            {
              key: "status",
              header: "Durum",
              render: (plan) => (
                <StatusBadge variant={planVariant(plan.status)}>
                  {t(planLabel(plan.status))}
                </StatusBadge>
              ),
            },
            {
              key: "blocker",
              header: "Blokaj",
              render: (plan) => t(plan.approvalBlocker),
            },
          ]}
        />
      </Card3D>

      <div id="finance-accounts" className="scroll-mt-24">
        <DataTable
          data={accounts}
          searchValue={(account) =>
            `${account.flatNumber} ${account.ownerName} ${account.suggestedAction}`
          }
          columns={[
            {
              key: "flat",
              header: "Daire",
              sortable: true,
              render: (account) => account.flatNumber,
            },
            {
              key: "owner",
              header: "Malik",
              render: (account) => t(account.ownerName),
            },
            {
              key: "balance",
              header: "Borç",
              sortable: true,
              sortValue: (account) => account.balanceTry,
              render: (account) => (
                <span className="font-semibold">
                  {formatDual(account.balanceTry)}
                </span>
              ),
            },
            {
              key: "aging",
              header: "Yaş",
              sortable: true,
              render: (account) => `${account.agingBucket} ${t("gün")}`,
            },
            {
              key: "payment",
              header: "Durum",
              render: (account) => (
                <StatusBadge variant={paymentVariant(account.paymentStatus)}>
                  {t(paymentLabels[account.paymentStatus])}
                </StatusBadge>
              ),
            },
            {
              key: "access",
              header: "Erişim",
              render: (account) => (
                <StatusBadge variant={accessVariant(account.accessStatus)}>
                  {t(accessLabels[account.accessStatus])}
                </StatusBadge>
              ),
            },
            {
              key: "action",
              header: "Önerilen aksiyon",
              render: (account) => t(account.suggestedAction),
            },
          ]}
        />
      </div>
    </div>
  )
}
