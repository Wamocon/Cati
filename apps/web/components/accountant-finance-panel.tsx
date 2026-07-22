"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertCircle,
  ArrowLeftRight,
  Banknote,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coins,
  Landmark,
  Layers,
  ReceiptText,
  RefreshCw,
  Users,
  WalletCards,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import {
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  AccountantFinanceCreditBalance,
  AccountantFinanceInvoice,
  AccountantFinanceOverview,
} from "@/lib/accountant-finance-repository"

type RequestState = "loading" | "success" | "error"
type OffsetState = "idle" | "saving" | "success" | "error"

function statusVariant(status: AccountantFinanceInvoice["status"]) {
  if (status === "paid") return "success" as const
  if (status === "partially_offset") return "warning" as const
  if (status === "void") return "neutral" as const
  return "info" as const
}

function safeApiError(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback
}

export function AccountantFinancePanel() {
  const t = useTranslations("accountantFinance")
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)

  const [data, setData] = useState<AccountantFinanceOverview | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [expandedStatement, setExpandedStatement] = useState<string | null>(null)

  const [offsetInvoiceId, setOffsetInvoiceId] = useState<string | null>(null)
  const [offsetCreditId, setOffsetCreditId] = useState("")
  const [offsetAmount, setOffsetAmount] = useState("")
  const [offsetReason, setOffsetReason] = useState("")
  const [offsetState, setOffsetState] = useState<OffsetState>("idle")
  const [offsetMessage, setOffsetMessage] = useState<string | null>(null)

  const shortDate = useCallback(
    (value: string | null) => {
      if (!value) return "-"
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return "-"
      return new Intl.DateTimeFormat(intlLocale, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date)
    },
    [intlLocale]
  )

  const fetchOverview = useCallback(async (initial = false) => {
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const response = await fetch("/api/site-management/accountant-finance", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("Accounting finance request failed.")
      setData((await response.json()) as AccountantFinanceOverview)
      setRequestState("success")
    } catch {
      setRequestState("error")
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void fetchOverview(true), 0)
    const onChange = () => void fetchOverview()
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [fetchOverview])

  const canOffset = data?.capabilities.canOffset ?? false

  const offsetInvoice = useMemo(
    () => data?.invoices.find((invoice) => invoice.id === offsetInvoiceId) ?? null,
    [data?.invoices, offsetInvoiceId]
  )

  const eligibleCredits = useMemo<AccountantFinanceCreditBalance[]>(() => {
    if (!data || !offsetInvoice) return []
    return data.creditBalances.filter(
      (credit) =>
        credit.currency === offsetInvoice.currency && credit.amountCents > 0
    )
  }, [data, offsetInvoice])

  const selectedCredit = useMemo(
    () => eligibleCredits.find((credit) => credit.id === offsetCreditId) ?? null,
    [eligibleCredits, offsetCreditId]
  )

  const maxOffsetCents = useMemo(() => {
    if (!offsetInvoice || !selectedCredit) return 0
    return Math.min(offsetInvoice.openCents, selectedCredit.amountCents)
  }, [offsetInvoice, selectedCredit])

  function openOffset(invoice: AccountantFinanceInvoice) {
    setOffsetInvoiceId(invoice.id)
    setOffsetCreditId("")
    setOffsetAmount("")
    setOffsetReason("")
    setOffsetState("idle")
    setOffsetMessage(null)
  }

  function closeOffset() {
    setOffsetInvoiceId(null)
    setOffsetState("idle")
    setOffsetMessage(null)
  }

  function selectCredit(creditId: string) {
    setOffsetCreditId(creditId)
    setOffsetState("idle")
    setOffsetMessage(null)
    const credit = eligibleCredits.find((item) => item.id === creditId)
    if (credit && offsetInvoice) {
      const max = Math.min(offsetInvoice.openCents, credit.amountCents)
      setOffsetAmount((max / 100).toString())
    } else {
      setOffsetAmount("")
    }
  }

  async function submitOffset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!offsetInvoice || !selectedCredit || offsetState === "saving") return
    setOffsetState("saving")
    setOffsetMessage(null)
    try {
      const response = await fetch("/api/site-management/accountant-finance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          invoiceId: offsetInvoice.id,
          creditBalanceId: selectedCredit.id,
          amount: offsetAmount,
          reason: offsetReason,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) throw new Error(safeApiError(payload, t("offset.error")))
      setOffsetState("success")
      setOffsetMessage(t("offset.success"))
      setOffsetInvoiceId(null)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      await fetchOverview()
    } catch (error) {
      setOffsetState("error")
      setOffsetMessage(error instanceof Error ? error.message : t("offset.error"))
    }
  }

  if (requestState === "loading" && !data) {
    return (
      <Card3D glow={false}>
        <div
          aria-busy="true"
          aria-live="polite"
          className="flex min-h-24 items-center gap-3"
        >
          <RefreshCw className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <p className="font-bold text-foreground">{t("loading")}</p>
        </div>
      </Card3D>
    )
  }

  if (requestState === "error" && !data) {
    return (
      <Card3D glow={false}>
        <div role="alert" className="flex items-start gap-3 text-rose-700 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-black">{t("loadErrorTitle")}</h2>
            <p className="mt-1 text-sm">{t("loadErrorBody")}</p>
            <button
              type="button"
              onClick={() => void fetchOverview(true)}
              className="mt-3 min-h-11 rounded-lg border border-current px-4 py-2 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </Card3D>
    )
  }

  const overview = data
  if (!overview) return null

  const dual = (cents: number, currency: "TRY" | "EUR") =>
    formatDualFromCents(cents, currency)
  const dualTry = (cents: number) => formatDualFromCents(cents, "TRY")

  // Inline, locale-resolved captions so a zero-value tile reads as an
  // intentional empty state and the bare bank-statement count is never
  // ambiguous. Covers all four locales without touching the shared messages.
  const emptyCopy = {
    open: {
      tr: "Açık sağlayıcı faturası yok",
      en: "No open provider invoices",
      de: "Keine offenen Anbieterrechnungen",
      ru: "Нет открытых счетов поставщиков",
    }[locale],
    credit: {
      tr: "Bekleyen alacak bakiyesi yok",
      en: "No credit balances outstanding",
      de: "Keine offenen Guthaben",
      ru: "Нет непогашенных кредитовых остатков",
    }[locale],
    cost: {
      tr: "Kaydedilen maliyet yok",
      en: "No costs recorded",
      de: "Keine Kosten erfasst",
      ru: "Затраты не записаны",
    }[locale],
    bankLabel: {
      tr: "mutabakata hazır banka ekstresi",
      en: "bank statements on file",
      de: "Bankauszüge vorhanden",
      ru: "банковских выписок в наличии",
    }[locale],
    bankEmpty: {
      tr: "Yüklenen banka ekstresi yok",
      en: "No bank statements loaded",
      de: "Keine Bankauszüge geladen",
      ru: "Банковские выписки не загружены",
    }[locale],
  }

  const kpis: Array<{
    key: string
    label: string
    value: string
    icon: typeof WalletCards
    caption?: string
  }> = [
    {
      key: "open",
      label: t("kpi.openInvoices"),
      value: dualTry(overview.totals.openInvoicesTryCents),
      icon: ReceiptText,
      caption:
        overview.totals.openInvoicesTryCents === 0 ? emptyCopy.open : undefined,
    },
    {
      key: "credit",
      label: t("kpi.creditTotal"),
      value: dualTry(overview.totals.creditTryCents),
      icon: Coins,
      caption:
        overview.totals.creditTryCents === 0 ? emptyCopy.credit : undefined,
    },
    {
      key: "cost",
      label: t("kpi.costTotal"),
      value: dualTry(overview.totals.costTryCents),
      icon: WalletCards,
      caption: overview.totals.costTryCents === 0 ? emptyCopy.cost : undefined,
    },
    {
      key: "bank",
      label: t("kpi.bankStatements"),
      value: String(overview.totals.bankStatementCount),
      icon: Landmark,
      caption:
        overview.totals.bankStatementCount === 0
          ? emptyCopy.bankEmpty
          : emptyCopy.bankLabel,
    },
  ]

  return (
    <Card3D glow={false} className="overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black text-foreground">{t("title")}</h2>
            {overview.capabilities.readOnly && (
              <StatusBadge variant="info">{t("readOnlyBadge")}</StatusBadge>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchOverview()}
          disabled={refreshing}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-black text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-65"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      {offsetMessage && offsetInvoiceId === null && (
        <div
          role={offsetState === "error" ? "alert" : "status"}
          className={cn(
            "mt-4 rounded-xl border p-3 text-sm font-bold",
            offsetState === "error"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          )}
        >
          {offsetMessage}
        </div>
      )}

      <div className="grid gap-3 py-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.key} className="rounded-xl border border-border/70 bg-muted/25 p-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                <p className="text-xs font-bold uppercase text-muted-foreground">{kpi.label}</p>
              </div>
              <p className="mt-1 text-lg font-black leading-tight break-words text-foreground">
                {kpi.value}
              </p>
              {kpi.caption && (
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">
                  {kpi.caption}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* Requirement 1 and 4: provider invoices with a manual offset action. */}
      <section aria-labelledby="acf-invoices-heading" className="mt-2">
        <div className="flex items-center gap-2">
          <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="acf-invoices-heading" className="text-sm font-black text-foreground">
            {t("invoices.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("invoices.subtitle")}</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[46rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-bold">{t("invoices.col.provider")}</th>
                <th className="px-3 py-2 font-bold">{t("invoices.col.block")}</th>
                <th className="px-3 py-2 font-bold">{t("invoices.col.invoiceNo")}</th>
                <th className="px-3 py-2 text-right font-bold">{t("invoices.col.amount")}</th>
                <th className="px-3 py-2 text-right font-bold">{t("invoices.col.open")}</th>
                <th className="px-3 py-2 font-bold">{t("invoices.col.due")}</th>
                <th className="px-3 py-2 font-bold">{t("invoices.col.status")}</th>
                {canOffset && <th className="px-3 py-2 font-bold">{t("invoices.col.action")}</th>}
              </tr>
            </thead>
            <tbody>
              {overview.invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-foreground">{invoice.providerName ?? "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{invoice.block ?? t("invoices.noBlock")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{invoice.invoiceNo}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{dual(invoice.amountCents, invoice.currency)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{dual(invoice.openCents, invoice.currency)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{shortDate(invoice.dueAt)}</td>
                  <td className="px-3 py-2">
                    <StatusBadge variant={statusVariant(invoice.status)}>
                      {t(`status.${invoice.status}`)}
                    </StatusBadge>
                  </td>
                  {canOffset && (
                    <td className="px-3 py-2">
                      {invoice.status === "open" || invoice.status === "partially_offset" ? (
                        <button
                          type="button"
                          onClick={() => openOffset(invoice)}
                          className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-black text-primary outline-none transition hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("invoices.offset")}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {overview.invoices.length === 0 && (
                <tr>
                  <td colSpan={canOffset ? 8 : 7} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("invoices.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {canOffset && offsetInvoice && (
          <form
            onSubmit={submitOffset}
            className="mt-3 rounded-xl border border-primary/25 bg-primary/5 p-4"
          >
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4 text-primary" aria-hidden="true" />
              <h4 className="text-sm font-black text-foreground">{t("offset.title")}</h4>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("offset.invoiceLabel")}: {offsetInvoice.invoiceNo} ({offsetInvoice.providerName ?? "-"}) /{" "}
              {dual(offsetInvoice.openCents, offsetInvoice.currency)}
            </p>

            {eligibleCredits.length === 0 ? (
              <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
                {t("offset.noCredits")}
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="acf-offset-credit" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("offset.creditLabel")}
                  </label>
                  <select
                    id="acf-offset-credit"
                    required
                    value={offsetCreditId}
                    onChange={(event) => selectCredit(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">{t("offset.selectCredit")}</option>
                    {eligibleCredits.map((credit) => (
                      <option key={credit.id} value={credit.id}>
                        {credit.subjectRef} / {dual(credit.amountCents, credit.currency)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="acf-offset-amount" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("offset.amountLabel")}
                  </label>
                  <input
                    id="acf-offset-amount"
                    required
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={offsetAmount}
                    onChange={(event) => {
                      setOffsetAmount(event.target.value)
                      setOffsetState("idle")
                      setOffsetMessage(null)
                    }}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  {selectedCredit && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t("offset.max", { amount: dual(maxOffsetCents, offsetInvoice.currency) })}
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="acf-offset-reason" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("offset.reasonLabel")}
                  </label>
                  <input
                    id="acf-offset-reason"
                    maxLength={500}
                    autoComplete="off"
                    placeholder={t("offset.reasonPlaceholder")}
                    value={offsetReason}
                    onChange={(event) => setOffsetReason(event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
            )}

            {offsetMessage && offsetState === "error" && (
              <p role="alert" className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/10 p-3 text-sm font-bold text-rose-800 dark:text-rose-200">
                {offsetMessage}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={offsetState === "saving" || !selectedCredit}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                {offsetState === "saving" ? (
                  <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                {offsetState === "saving" ? t("offset.submitting") : t("offset.submit")}
              </button>
              <button
                type="button"
                onClick={closeOffset}
                className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 py-2 text-sm font-black text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
              >
                {t("offset.cancel")}
              </button>
            </div>
          </form>
        )}
      </section>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        {/* Requirement 5 and 6: credit and cost by block A-G with a total row. */}
        <section aria-labelledby="acf-block-heading">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 id="acf-block-heading" className="text-sm font-black text-foreground">
              {t("byBlock.title")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("byBlock.subtitle")}</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-bold">{t("byBlock.col.block")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("byBlock.col.credit")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("byBlock.col.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {overview.byBlock.map((row) => (
                  <tr key={row.block} className="border-b border-border/50">
                    <td className="px-3 py-2 font-semibold text-foreground">{row.block}</td>
                    <td className="px-3 py-2 text-right text-foreground">{dualTry(row.creditTryCents)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{dualTry(row.costTryCents)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-black">
                  <td className="px-3 py-2 text-foreground">{t("byBlock.total")}</td>
                  <td className="px-3 py-2 text-right text-foreground">{dualTry(overview.blockTotal.creditTryCents)}</td>
                  <td className="px-3 py-2 text-right text-foreground">{dualTry(overview.blockTotal.costTryCents)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* Requirement 3 and 7: credit and cost for each role. */}
        <section aria-labelledby="acf-role-heading">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" aria-hidden="true" />
            <h3 id="acf-role-heading" className="text-sm font-black text-foreground">
              {t("byRole.title")}
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{t("byRole.subtitle")}</p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
            <table className="w-full min-w-[24rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                  <th className="px-3 py-2 font-bold">{t("byRole.col.role")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("byRole.col.credit")}</th>
                  <th className="px-3 py-2 text-right font-bold">{t("byRole.col.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {overview.byRole.map((row) => (
                  <tr key={row.role} className="border-b border-border/50 last:border-0">
                    <td className="px-3 py-2 font-semibold text-foreground">{t(`role.${row.role}`)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{dualTry(row.creditTryCents)}</td>
                    <td className="px-3 py-2 text-right text-foreground">{dualTry(row.costTryCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Requirement 2: credit balances from service providers. */}
      <section aria-labelledby="acf-provider-heading" className="mt-6">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="acf-provider-heading" className="text-sm font-black text-foreground">
            {t("providerCredits.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("providerCredits.subtitle")}</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[28rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-bold">{t("providerCredits.col.provider")}</th>
                <th className="px-3 py-2 font-bold">{t("providerCredits.col.block")}</th>
                <th className="px-3 py-2 text-right font-bold">{t("providerCredits.col.amount")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.providerCredits.map((credit) => (
                <tr key={credit.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-foreground">{credit.providerName ?? credit.subjectRef}</td>
                  <td className="px-3 py-2 text-muted-foreground">{credit.block ?? t("invoices.noBlock")}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{dual(credit.amountCents, credit.currency)}</td>
                </tr>
              ))}
              {overview.providerCredits.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("providerCredits.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Requirement 8: all bank statements, expandable to their movements. */}
      <section aria-labelledby="acf-bank-heading" className="mt-6">
        <div className="flex items-center gap-2">
          <Landmark className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="acf-bank-heading" className="text-sm font-black text-foreground">
            {t("bank.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("bank.subtitle")}</p>
        <div className="mt-3 space-y-3">
          {overview.bankStatements.map((statement) => {
            const expanded = expandedStatement === statement.id
            return (
              <div key={statement.id} className="rounded-xl border border-border/70 bg-background/70">
                <button
                  type="button"
                  onClick={() => setExpandedStatement(expanded ? null : statement.id)}
                  aria-expanded={expanded}
                  className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-black text-foreground">
                      <Banknote className="h-4 w-4 text-primary" aria-hidden="true" />
                      {statement.bankName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {statement.reference} / {shortDate(statement.statementDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{t("bank.col.closing")}</p>
                      <p className="text-sm font-black text-foreground">
                        {dual(statement.closingBalanceCents, statement.currency)}
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    )}
                  </div>
                </button>
                {expanded && (
                  <div className="border-t border-border/60 px-4 py-3">
                    <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">{t("bank.col.opening")}</p>
                        <p className="text-sm font-bold text-foreground">{dual(statement.openingBalanceCents, statement.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("bank.col.net")}</p>
                        <p className="text-sm font-bold text-foreground">{dual(statement.netCents, statement.currency)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{t("bank.col.closing")}</p>
                        <p className="text-sm font-bold text-foreground">{dual(statement.closingBalanceCents, statement.currency)}</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border/60">
                      <table className="w-full min-w-[30rem] border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                            <th className="px-3 py-2 font-bold">{t("bank.line.date")}</th>
                            <th className="px-3 py-2 font-bold">{t("bank.line.description")}</th>
                            <th className="px-3 py-2 font-bold">{t("bank.line.direction")}</th>
                            <th className="px-3 py-2 text-right font-bold">{t("bank.line.amount")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {statement.lines.map((line) => (
                            <tr key={line.id} className="border-b border-border/40 last:border-0">
                              <td className="px-3 py-2 text-muted-foreground">{shortDate(line.bookedAt)}</td>
                              <td className="px-3 py-2 text-foreground">{line.description}</td>
                              <td className="px-3 py-2">
                                <StatusBadge variant={line.direction === "credit" ? "success" : "warning"}>
                                  {t(`direction.${line.direction}`)}
                                </StatusBadge>
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-foreground">
                                {dual(line.amountCents, statement.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {overview.bankStatements.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t("bank.empty")}
            </div>
          )}
        </div>
      </section>

      {/* Audit trail for requirement 4: recorded invoice/credit offsets. */}
      <section aria-labelledby="acf-offsets-heading" className="mt-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-primary" aria-hidden="true" />
          <h3 id="acf-offsets-heading" className="text-sm font-black text-foreground">
            {t("offsets.title")}
          </h3>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{t("offsets.subtitle")}</p>
        <div className="mt-3 overflow-x-auto rounded-xl border border-border/70">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2 font-bold">{t("offsets.col.invoice")}</th>
                <th className="px-3 py-2 text-right font-bold">{t("offsets.col.amount")}</th>
                <th className="px-3 py-2 font-bold">{t("offsets.col.reason")}</th>
                <th className="px-3 py-2 font-bold">{t("offsets.col.date")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.offsets.map((offset) => (
                <tr key={offset.id} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-foreground">{offset.invoiceNo}</td>
                  <td className="px-3 py-2 text-right font-semibold text-foreground">{dual(offset.amountCents, offset.currency)}</td>
                  <td className="px-3 py-2 text-muted-foreground">{offset.reason ?? "-"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{shortDate(offset.createdAt)}</td>
                </tr>
              ))}
              {overview.offsets.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("offsets.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-6 text-xs text-muted-foreground">{t("approxNote")}</p>
    </Card3D>
  )
}
