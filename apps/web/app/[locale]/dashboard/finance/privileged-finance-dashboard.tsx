"use client"

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react"
import { useLocale } from "next-intl"
import {
  ArrowUpRight,
  Banknote,
  BarChart3,
  CalendarClock,
  Coins,
  CreditCard,
  Euro,
  LockKeyhole,
  ReceiptText,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react"
import { AccountantFinancePanel } from "@/components/accountant-finance-panel"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { LineChart } from "@/components/charts/line-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { FinanceLiveLedger } from "@/components/finance-live-ledger"
import { ManualPaymentConsole } from "@/components/manual-payment-console"
import { PaymentRestrictionControl } from "@/components/payment-restriction-control"
import { StatusBadge } from "@/components/status-badge"
import {
  accessLabels,
  cashFlow,
  getBlockCashFlow,
  getDebtAccounts,
  getDebtAging,
  getPaymentPlanSummary,
  getSummary,
  paymentLabels,
  paymentPlans,
  type AccessStatus,
  type BlockCashFlowSeries,
  type PaymentPlanStatus,
  type PaymentStatus,
} from "@/lib/site-management-data"
import { formatDual, formatDualShort } from "@/lib/currency"
import { clientProfile } from "@/lib/client-context"
import { cn } from "@/lib/utils"
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

const CASH_FLOW_RANGES = [3, 6, 12] as const
type CashFlowRange = (typeof CASH_FLOW_RANGES)[number]
type CashFlowChartType = "bar" | "line"

// Dynamic "Monthly cash flow" graph: building (block) filter, 3/6/12-month
// timeline and a bar<->line toggle, driven by the block-scoped monthly series
// (getBlockCashFlow). Kept as its own client sub-component so the parent stays
// lean and only this graph re-renders on control changes.
function MonthlyCashFlowGraph({
  locale,
}: {
  locale: ReturnType<typeof resolveDashboardLocale>
}) {
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const blockSeries = useMemo<BlockCashFlowSeries[]>(() => getBlockCashFlow(), [])
  const [building, setBuilding] = useState<string>("all")
  const [range, setRange] = useState<CashFlowRange>(6)
  const [chartType, setChartType] = useState<CashFlowChartType>("bar")

  // Localize a Turkish month abbreviation via Intl so all four locales get a
  // correct short month name without extra translation-table entries.
  const monthLabel = (trAbbr: string) => {
    const index = TR_MONTH_ABBR_TO_INDEX[trAbbr]
    if (index === undefined) return trAbbr
    return new Intl.DateTimeFormat(toIntlLocale(locale), { month: "short" }).format(
      new Date(Date.UTC(2000, index, 1))
    )
  }

  const monthly = useMemo(() => {
    const monthCount = blockSeries[0]?.months.length ?? 0
    const combined =
      building === "all"
        ? Array.from({ length: monthCount }, (_, index) => ({
            label: blockSeries[0].months[index].label,
            collectedTry: blockSeries.reduce(
              (sum, series) => sum + series.months[index].collectedTry,
              0
            ),
          }))
        : (blockSeries.find((series) => series.block === building)?.months ?? []).map(
            (point) => ({ label: point.label, collectedTry: point.collectedTry })
          )
    return combined.slice(-range)
  }, [blockSeries, building, range])

  const total = monthly.reduce((sum, month) => sum + month.collectedTry, 0)
  const chartData = monthly.map((month) => ({
    label: monthLabel(month.label),
    value: month.collectedTry,
    color: "var(--primary)",
  }))
  const lineData = chartData.map(({ label, value }) => ({ label, value }))

  const buildingLabel =
    building === "all" ? t("Tümü") : `${t("Blok")} ${building}`
  const chartAriaLabel = `${t("Aylık nakit akışı")} - ${buildingLabel}`
  const selectClass =
    "min-h-9 rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-bold text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
  const toggleButtonClass = (active: boolean) =>
    cn(
      "inline-flex min-h-8 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold transition",
      active
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:bg-muted"
    )

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("Blok")}
            </span>
            <select
              className={selectClass}
              value={building}
              onChange={(event) => setBuilding(event.target.value)}
              aria-label={t("Blok")}
            >
              <option value="all">{t("Tümü")}</option>
              {blockSeries.map((series) => (
                <option key={series.block} value={series.block}>
                  {t("Blok")} {series.block}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("Zaman aralığı")}
            </span>
            <select
              className={selectClass}
              value={range}
              onChange={(event) =>
                setRange(Number(event.target.value) as CashFlowRange)
              }
              aria-label={t("Zaman aralığı")}
            >
              {CASH_FLOW_RANGES.map((months) => (
                <option key={months} value={months}>
                  {t(`Son ${months} ay`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
              {t("Grafik türü")}
            </span>
            <div
              className="inline-flex rounded-lg border border-border bg-background p-0.5"
              role="group"
              aria-label={t("Grafik türü")}
            >
              <button
                type="button"
                aria-pressed={chartType === "bar"}
                onClick={() => setChartType("bar")}
                className={toggleButtonClass(chartType === "bar")}
              >
                <BarChart3 className="h-3.5 w-3.5" />
                {t("Sütun")}
              </button>
              <button
                type="button"
                aria-pressed={chartType === "line"}
                onClick={() => setChartType("line")}
                className={toggleButtonClass(chartType === "line")}
              >
                <TrendingUp className="h-3.5 w-3.5" />
                {t("Çizgi")}
              </button>
            </div>
          </div>
        </div>
        <StatusBadge variant="success">
          {t("Toplam")} {formatDualShort(total)}
        </StatusBadge>
      </div>
      {chartType === "bar" ? (
        <BarChart
          data={chartData}
          ariaLabel={chartAriaLabel}
          formatValue={(value) => formatDualShort(value)}
          height={250}
          totalLabel={t("Toplam")}
        />
      ) : (
        <LineChart
          data={lineData}
          ariaLabel={chartAriaLabel}
          formatValue={(value) => formatDualShort(value)}
          height={250}
        />
      )}
    </div>
  )
}

interface FinanceTabDef {
  id: string
  label: string
  icon: typeof WalletCards
  content: ReactNode
}

// Accessible, keyboard-aware tab strip (WAI-ARIA tabs pattern). Panels stay
// mounted and only toggle the `hidden` attribute, so switching tabs never
// refetches data and every section anchor id stays reachable in the DOM.
function FinanceTabs({
  items,
  activeId,
  onSelect,
  ariaLabel,
}: {
  items: FinanceTabDef[]
  activeId: string
  onSelect: (id: string) => void
  ariaLabel: string
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const focusTabAt = (index: number) => {
    const count = items.length
    if (count === 0) return
    const normalized = ((index % count) + count) % count
    onSelect(items[normalized].id)
    tabRefs.current[normalized]?.focus()
  }

  const handleKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault()
        focusTabAt(index + 1)
        break
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault()
        focusTabAt(index - 1)
        break
      case "Home":
        event.preventDefault()
        focusTabAt(0)
        break
      case "End":
        event.preventDefault()
        focusTabAt(items.length - 1)
        break
      default:
        break
    }
  }

  return (
    <div>
      <div className="overflow-x-auto overscroll-x-contain">
        <div
          role="tablist"
          aria-label={ariaLabel}
          aria-orientation="horizontal"
          className="flex min-w-max gap-1 border-b border-border"
        >
          {items.map((item, index) => {
            const selected = item.id === activeId
            const Icon = item.icon
            return (
              <button
                key={item.id}
                ref={(node) => {
                  tabRefs.current[index] = node
                }}
                type="button"
                role="tab"
                id={`${item.id}-tab`}
                aria-selected={selected}
                aria-controls={`${item.id}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => onSelect(item.id)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  selected
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </button>
            )
          })}
        </div>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${item.id}-panel`}
          aria-labelledby={`${item.id}-tab`}
          hidden={item.id !== activeId}
          className="pt-6"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}

const TAB_LEDGER = "finance-tab-ledger"
const TAB_ACCOUNTS = "finance-tab-accounts"
const TAB_PROVIDERS = "finance-tab-providers"
const TAB_RESTRICTIONS = "finance-tab-restrictions"

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

  // Tabbed navigation state. All panels render eagerly (only `hidden` toggles),
  // so a KPI drill-in just selects the owning tab and then smooth-scrolls to the
  // section anchor, which is always present in the DOM. The double rAF waits for
  // React to commit the tab switch (panel un-hidden) before scrolling.
  const [activeTab, setActiveTab] = useState<string>(TAB_LEDGER)

  const goToSection = (anchorId: string, tabId?: string) => {
    if (tabId) setActiveTab(tabId)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document
          .getElementById(anchorId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    })
  }

  // Inline, locale-resolved copy for tab labels and empty/ambiguous-state
  // captions. Mirrors the existing `pageIntro` pattern so all four locales are
  // covered without editing the shared translation tables.
  const c = {
    tabsAria: {
      tr: "Finans bölümleri",
      en: "Finance sections",
      de: "Finanzbereiche",
      ru: "Финансовые разделы",
    }[locale],
    tabLedger: {
      tr: "Defter & tahsilat",
      en: "Ledger & collection",
      de: "Buch & Inkasso",
      ru: "Реестр и сборы",
    }[locale],
    tabAccounts: {
      tr: "Borç hesapları",
      en: "Debt accounts",
      de: "Schuldkonten",
      ru: "Счета задолженности",
    }[locale],
    tabProviders: {
      tr: "Sağlayıcı & alacaklar",
      en: "Providers & credits",
      de: "Anbieter & Guthaben",
      ru: "Поставщики и кредиты",
    }[locale],
    tabRestrictions: {
      tr: "Kısıt & kontrol",
      en: "Restrictions & controls",
      de: "Sperren & Kontrollen",
      ru: "Ограничения и контроль",
    }[locale],
    legalHint: {
      tr: "90+ gün gecikmede, yasal takipteki hesap sayısı",
      en: "Accounts 90+ days overdue in legal follow-up",
      de: "Konten 90+ Tage überfällig in rechtlicher Verfolgung",
      ru: "Счета с просрочкой 90+ дней на юридическом сопровождении",
    }[locale],
    overdueHint: {
      tr: "Vadesi geçmiş açık bakiyeli hesap sayısı",
      en: "Accounts with past-due open balances",
      de: "Konten mit überfälligen offenen Salden",
      ru: "Счета с просроченными открытыми остатками",
    }[locale],
    noLegal: {
      tr: "Yasal takipte hesap yok",
      en: "No accounts in legal follow-up",
      de: "Keine Konten in rechtlicher Verfolgung",
      ru: "Нет счетов на юридическом сопровождении",
    }[locale],
    noOverdue: {
      tr: "Gecikmiş hesap yok",
      en: "No overdue accounts",
      de: "Keine überfälligen Konten",
      ru: "Нет просроченных счетов",
    }[locale],
    planHint: {
      tr: "Takip edilen aktif satış planı",
      en: "Active sales plans tracked",
      de: "Aktive erfasste Verkaufspläne",
      ru: "Отслеживаемых активных планов продаж",
    }[locale],
    dueWarnHint: {
      tr: "Vadesi yaklaşan + geciken plan sayısı",
      en: "Plans due soon plus overdue",
      de: "Bald fällige plus überfällige Pläne",
      ru: "Планы с близким сроком и просроченные",
    }[locale],
    planEmpty: {
      tr: "Henüz takip edilen satış ödeme planı yok",
      en: "No sales payment plans tracked yet",
      de: "Noch keine Verkaufszahlungspläne erfasst",
      ru: "Планы оплаты продаж пока не отслеживаются",
    }[locale],
    accountsEmpty: {
      tr: "Açık borcu olan daire yok",
      en: "No flats carry an outstanding balance",
      de: "Keine Wohnungen mit offener Schuld",
      ru: "Нет квартир с непогашенной задолженностью",
    }[locale],
  }

  // Shared styling so each KPI tile reads as an interactive drill-in link.
  const kpiLinkClass =
    "group/command block rounded-xl outline-none transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
  const pageIntro = {
    tr: `${clientProfile.clientName} için satış ödemeleri, aidat, borç yaşlandırma, depozito, ödeme doğrulama, kira geliri ve erişim kısıtı kararları aynı finans akışında yönetilir.`,
    en: `${clientProfile.clientName} manages sales payments, dues, debt aging, deposits, payment verification, rental income and access-hold decisions in one finance flow.`,
    de: `${clientProfile.clientName} steuert Verkaufszahlungen, Beiträge, Schuldenalterung, Kautionen, Zahlungsprüfung, Mieteinnahmen und Zugangssperren in einem Finanzfluss.`,
    ru: `${clientProfile.clientName} управляет платежами продаж, взносами, старением долга, депозитами, проверкой оплат, арендным доходом и решениями по доступу в одном финансовом потоке.`,
  }[locale]

  const ledgerPanel = (
    <div className="space-y-6">
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
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {planSummary.total === 0 ? c.planEmpty : c.planHint}
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
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
              {c.dueWarnHint}
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
    </div>
  )

  const accountsPanel = (
    <Card3D id="finance-accounts" className="scroll-mt-24" glow={false}>
      <div className="mb-4">
        <h2 className="text-sm font-bold text-card-foreground">
          {t("Daire bazlı borç hesapları")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "En yüksek borçlu daireler; bakiye, yaşlandırma, ödeme durumu ve erişim kısıtı tek tabloda listelenir."
          )}
        </p>
      </div>
      {accounts.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {c.accountsEmpty}
        </p>
      ) : (
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
      )}
    </Card3D>
  )

  const providersPanel = (
    <div id="accountant-finance" className="scroll-mt-24">
      <AccountantFinancePanel />
    </div>
  )

  const restrictionsPanel = (
    <div id="finance-restrictions" className="scroll-mt-24">
      <PaymentRestrictionControl />
    </div>
  )

  const tabs: FinanceTabDef[] = [
    {
      id: TAB_LEDGER,
      label: c.tabLedger,
      icon: ReceiptText,
      content: ledgerPanel,
    },
    {
      id: TAB_ACCOUNTS,
      label: c.tabAccounts,
      icon: WalletCards,
      content: accountsPanel,
    },
    {
      id: TAB_PROVIDERS,
      label: c.tabProviders,
      icon: Coins,
      content: providersPanel,
    },
    {
      id: TAB_RESTRICTIONS,
      label: c.tabRestrictions,
      icon: LockKeyhole,
      content: restrictionsPanel,
    },
  ]

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
        <a
          href="#finance-accounts"
          onClick={(event) => {
            event.preventDefault()
            goToSection("finance-accounts", TAB_ACCOUNTS)
          }}
          className={kpiLinkClass}
          aria-label={t("Toplam borç")}
        >
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
        <a
          href="#finance-ledger"
          onClick={(event) => {
            event.preventDefault()
            goToSection("finance-ledger", TAB_LEDGER)
          }}
          className={kpiLinkClass}
          aria-label={t("Aylık aidat")}
        >
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
        <a
          href="#finance-cashflow"
          onClick={(event) => {
            event.preventDefault()
            goToSection("finance-cashflow")
          }}
          className={kpiLinkClass}
          aria-label={collectionCardLabel}
        >
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
          onClick={(event) => {
            event.preventDefault()
            goToSection("finance-restrictions", TAB_RESTRICTIONS)
          }}
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
                onClick={(event) => {
                  event.preventDefault()
                  goToSection("finance-accounts", TAB_ACCOUNTS)
                }}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
              >
                {t("Kayıtları aç")}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <MonthlyCashFlowGraph locale={locale} />
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
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {legalAccounts === 0 ? c.noLegal : c.legalHint}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">{t("Gecikmiş")}</p>
              <p className="mt-1 text-xl font-black">{overdueAccounts}</p>
              <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                {overdueAccounts === 0 ? c.noOverdue : c.overdueHint}
              </p>
            </div>
          </div>
        </Card3D>
      </div>

      <FinanceTabs
        items={tabs}
        activeId={activeTab}
        onSelect={setActiveTab}
        ariaLabel={c.tabsAria}
      />
    </div>
  )
}
