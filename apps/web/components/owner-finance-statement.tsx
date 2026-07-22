"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ReceiptText,
  ShieldCheck,
  WalletCards,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import { resolveDashboardLocale, toIntlLocale } from "@/lib/operational-copy"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  OwnerFinanceData,
  OwnerFinanceStatementEntry,
  OwnerFinanceUnitStatement,
} from "@/lib/owner-finance-projection"

type RequestState = "loading" | "success" | "error"
type HistoryFilter = "all" | "due" | "paid"
type FetchMode = "initial" | "background" | "page"

const POLL_RECOVERY_MS = 30_000
const DUE_STATUSES = new Set(["open", "partially_paid", "overdue"])

// Calm, business-only copy for the sample/demo state, kept inline so the view
// shows at most a quiet "sample data" note (no polling internals, no "demo").
const ownerSampleCopy = {
  tr: { label: "Örnek veriler", note: "Bu görünümde örnek veriler gösteriliyor." },
  en: { label: "Sample data", note: "This view shows sample data." },
  de: { label: "Beispieldaten", note: "Diese Ansicht zeigt Beispieldaten." },
  ru: { label: "Пример данных", note: "Здесь показаны примерные данные." },
} as const

// Owner-facing balances show in both Lira and Euro via the shared helper.
// Mixed-currency or unknown aggregates fall back to the mixed label. Stored
// amounts are integer minor units (kuruş/cents).
function formatMoney(
  cents: number | null,
  currency: string,
  mixedCurrencyLabel: string
) {
  if (cents === null || currency === "MIXED") {
    return mixedCurrencyLabel
  }
  return formatDualFromCents(cents, currency === "EUR" ? "EUR" : "TRY")
}

function formatDate(value: string | null, locale: string, includeTime = false) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Istanbul",
  }).format(date)
}

function entryStatusVariant(status: string) {
  if (status === "paid") return "success" as const
  if (status === "overdue") return "danger" as const
  if (status === "open" || status === "partially_paid")
    return "warning" as const
  if (status === "draft") return "info" as const
  return "neutral" as const
}

function isPaidHistory(entry: OwnerFinanceStatementEntry) {
  return entry.entryType === "payment" || entry.status === "paid"
}

function summarizeUnits(units: OwnerFinanceUnitStatement[]) {
  const currencies = new Set(units.map((unit) => unit.currency))
  const currency = currencies.size === 1 ? [...currencies][0] : "MIXED"
  const canAggregate =
    currency !== "MIXED" &&
    units.every(
      (unit) =>
        unit.openBalanceCents !== null &&
        unit.overdueBalanceCents !== null &&
        unit.recordedPaymentsCents !== null
    )

  return {
    currency: currencies.size === 0 ? "TRY" : currency,
    unitCount: units.length,
    openBalanceCents: canAggregate
      ? units.reduce((sum, unit) => sum + (unit.openBalanceCents ?? 0), 0)
      : null,
    overdueBalanceCents: canAggregate
      ? units.reduce((sum, unit) => sum + (unit.overdueBalanceCents ?? 0), 0)
      : null,
    recordedPaymentsCents: canAggregate
      ? units.reduce((sum, unit) => sum + (unit.recordedPaymentsCents ?? 0), 0)
      : null,
  }
}

function mergeStatementPages(
  current: OwnerFinanceData,
  next: OwnerFinanceData,
  mode: Exclude<FetchMode, "initial">
): OwnerFinanceData {
  if (
    mode === "page" &&
    current.pagination.snapshotAt !== next.pagination.snapshotAt
  ) {
    throw new Error("Owner statement page changed snapshot.")
  }
  const currentUnits = new Map(current.units.map((unit) => [unit.unitId, unit]))
  const units = next.units.map((unit) => {
    const previousEntries = currentUnits.get(unit.unitId)?.entries ?? []
    const entriesById = new Map(
      [...previousEntries, ...unit.entries].map((entry) => [entry.id, entry])
    )
    return {
      ...unit,
      entries: [...entriesById.values()].sort(
        (left, right) =>
          right.createdAt.localeCompare(left.createdAt) ||
          right.id.localeCompare(left.id)
      ),
    }
  })
  const loadedEntryCount = units.reduce(
    (sum, unit) => sum + unit.entries.length,
    0
  )
  const historyComplete = loadedEntryCount >= next.pagination.totalEntryCount

  return {
    ...next,
    units,
    pagination: {
      ...next.pagination,
      hasMore: historyComplete ? false : next.pagination.hasMore,
      nextCursor: historyComplete ? null : next.pagination.nextCursor,
    },
  }
}

export function OwnerFinanceStatement() {
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)
  const t = useTranslations("ownerFinance")
  const requestSequence = useRef(0)
  const pageRequestSequence = useRef(0)
  const refreshRequestSequence = useRef(0)
  const [data, setData] = useState<OwnerFinanceData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  const [selectedUnit, setSelectedUnit] = useState("all")
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>("all")

  const fetchStatement = useCallback(
    async (
      mode: FetchMode = "background",
      paginationWindow?: { cursor: string; snapshotAt: string }
    ) => {
      const sequence = ++requestSequence.current
      if (mode === "initial") setRequestState("loading")
      else if (mode === "page") {
        pageRequestSequence.current = sequence
        setLoadingMore(true)
        setLoadMoreError(false)
      } else {
        refreshRequestSequence.current = sequence
        setRefreshing(true)
      }

      try {
        const query = new URLSearchParams({ limit: "100" })
        if (mode === "page") {
          if (!paginationWindow?.cursor || !paginationWindow.snapshotAt) {
            throw new Error(
              "Owner statement page is missing its snapshot cursor."
            )
          }
          query.set("cursor", paginationWindow.cursor)
          query.set("snapshotAt", paginationWindow.snapshotAt)
        }
        const response = await fetch(
          `/api/site-management/owner-finance?${query.toString()}`,
          {
            cache: "no-store",
            headers: { accept: "application/json" },
          }
        )
        if (!response.ok) throw new Error("Owner statement request failed.")
        const nextData = (await response.json()) as OwnerFinanceData
        if (sequence !== requestSequence.current) return
        setData((current) =>
          mode !== "initial" && current
            ? mergeStatementPages(current, nextData, mode)
            : nextData
        )
        setRequestState("success")
      } catch {
        if (sequence !== requestSequence.current) return
        if (mode === "page") setLoadMoreError(true)
        else setRequestState("error")
      } finally {
        if (mode === "page" && pageRequestSequence.current === sequence) {
          setLoadingMore(false)
        }
        if (
          mode === "background" &&
          refreshRequestSequence.current === sequence
        ) {
          setRefreshing(false)
        }
      }
    },
    []
  )

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchStatement("initial")
    }, 0)

    return () => window.clearTimeout(handle)
  }, [fetchStatement])

  useEffect(() => {
    const refreshFromOperationalChange = () => {
      void fetchStatement("background")
    }
    const recoverWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchStatement("background")
      }
    }
    const pollingHandle = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void fetchStatement("background")
      }
    }, POLL_RECOVERY_MS)

    window.addEventListener(
      "site-management:changed",
      refreshFromOperationalChange
    )
    document.addEventListener("visibilitychange", recoverWhenVisible)

    return () => {
      window.clearInterval(pollingHandle)
      window.removeEventListener(
        "site-management:changed",
        refreshFromOperationalChange
      )
      document.removeEventListener("visibilitychange", recoverWhenVisible)
    }
  }, [fetchStatement])

  const effectiveSelectedUnit =
    selectedUnit === "all" ||
    data?.units.some((unit) => unit.unitNo === selectedUnit)
      ? selectedUnit
      : "all"

  const visibleUnits = useMemo(
    () =>
      data?.units.filter(
        (unit) =>
          effectiveSelectedUnit === "all" ||
          unit.unitNo === effectiveSelectedUnit
      ) ?? [],
    [data?.units, effectiveSelectedUnit]
  )
  const selectedSummary = useMemo(
    () => summarizeUnits(visibleUnits),
    [visibleUnits]
  )
  const visibleEntries = useMemo(
    () =>
      visibleUnits
        .flatMap((unit) => unit.entries)
        .filter((entry) => {
          if (historyFilter === "due") return DUE_STATUSES.has(entry.status)
          if (historyFilter === "paid") return isPaidHistory(entry)
          return true
        })
        .sort(
          (left, right) =>
            right.createdAt.localeCompare(left.createdAt) ||
            right.id.localeCompare(left.id)
        ),
    [historyFilter, visibleUnits]
  )

  const lastUpdated = data?.generatedAt
    ? formatDate(data.generatedAt, intlLocale, true)
    : null
  const sourceLabel =
    data?.source === "supabase" ? t("liveSource") : ownerSampleCopy[locale].label
  const sourceNote =
    data?.source === "supabase" ? t("sourceNoteLive") : ownerSampleCopy[locale].note

  if (requestState === "loading" && !data) {
    return (
      <section
        data-testid="owner-finance-page"
        aria-busy="true"
        aria-live="polite"
        className="space-y-4"
      >
        <div className="rounded-2xl border border-border/70 bg-card/70 p-6 shadow-sm">
          <div className="flex items-center gap-3 text-foreground">
            <RefreshCw
              className="h-5 w-5 animate-spin text-primary"
              aria-hidden="true"
            />
            <p className="font-bold">{t("loading")}</p>
          </div>
          <div
            className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            aria-hidden="true"
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-24 animate-pulse rounded-xl bg-muted"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (requestState === "error" && !data) {
    return (
      <section data-testid="owner-finance-page" className="space-y-4">
        <div
          data-testid="owner-finance-error"
          role="alert"
          className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-6 text-rose-800 dark:text-rose-200"
        >
          <div className="flex items-start gap-3">
            <AlertCircle
              className="mt-0.5 h-5 w-5 shrink-0"
              aria-hidden="true"
            />
            <div>
              <h1 className="text-lg font-black">{t("errorTitle")}</h1>
              <p className="mt-1 text-sm leading-6">{t("errorBody")}</p>
              <button
                type="button"
                onClick={() => void fetchStatement("initial")}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-current px-4 py-2 text-sm font-black transition outline-none hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("retry")}
              </button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      data-testid="owner-finance-page"
      aria-busy={refreshing}
      className="space-y-6"
    >
      <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-[linear-gradient(135deg,var(--card),color-mix(in_oklab,var(--primary)_7%,var(--card)))] p-5 shadow-sm sm:p-6">
        <div
          className="absolute -top-14 -right-14 h-40 w-40 rounded-full border border-primary/10 bg-primary/5"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <ReceiptText
                className="h-6 w-6 text-primary"
                aria-hidden="true"
              />
              <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {t("title")}
              </h1>
              <StatusBadge variant="info">{t("readOnly")}</StatusBadge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
              {t("subtitle")}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-muted-foreground">
              <span
                data-testid="owner-finance-last-updated"
                className="inline-flex items-center gap-1.5"
              >
                <ShieldCheck
                  className="h-4 w-4 text-emerald-600"
                  aria-hidden="true"
                />
                {t("verifiedScope")}
              </span>
              <span
                data-testid="owner-finance-source"
                className="inline-flex items-center gap-1.5"
              >
                <CheckCircle2
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                {sourceLabel}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="h-4 w-4" aria-hidden="true" />
                {t("lastUpdated")}: {lastUpdated ?? t("notAvailable")}
              </span>
            </div>
          </div>

          <button
            type="button"
            data-testid="owner-finance-refresh"
            onClick={() => void fetchStatement("background")}
            disabled={refreshing}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background/85 px-4 py-2 text-sm font-black text-foreground shadow-sm transition outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              aria-hidden="true"
            />
            {refreshing ? t("refreshing") : t("refresh")}
          </button>
        </div>
        <p
          data-testid="owner-finance-refresh-policy"
          className="relative mt-4 border-t border-border/60 pt-4 text-xs leading-5 text-muted-foreground"
        >
          {sourceNote}
        </p>
        <span className="sr-only" aria-live="polite">
          {refreshing ? t("refreshing") : ""}
        </span>
      </div>

      {requestState === "error" && data && (
        <div
          role="alert"
          className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-900 dark:text-amber-100"
        >
          {t("backgroundRefreshError")}
        </div>
      )}

      {data?.units.length === 0 ? (
        <div data-testid="owner-finance-empty">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Building2
                className="mt-0.5 h-6 w-6 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {t("noUnitTitle")}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                  {t("noUnitBody")}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                key: "open",
                label: t("openBalance"),
                value: formatMoney(
                  selectedSummary.openBalanceCents,
                  selectedSummary.currency,
                  t("mixedCurrencies")
                ),
                icon: WalletCards,
                tone: "text-amber-600",
              },
              {
                key: "overdue",
                label: t("overdueBalance"),
                value: formatMoney(
                  selectedSummary.overdueBalanceCents,
                  selectedSummary.currency,
                  t("mixedCurrencies")
                ),
                icon: AlertCircle,
                tone: "text-rose-600",
              },
              {
                key: "payments",
                label: t("recordedPayments"),
                value: formatMoney(
                  selectedSummary.recordedPaymentsCents,
                  selectedSummary.currency,
                  t("mixedCurrencies")
                ),
                icon: CheckCircle2,
                tone: "text-emerald-600",
              },
              {
                key: "units",
                label: t("ownedUnits"),
                value: selectedSummary.unitCount,
                icon: Building2,
                tone: "text-primary",
              },
            ].map((item) => {
              const Icon = item.icon
              return (
                <Card3D key={item.key} glow={false}>
                  <div
                    data-testid={`owner-finance-summary-${item.key}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                        {item.label}
                      </p>
                      <p className="mt-2 text-xl font-black text-foreground sm:text-2xl">
                        {item.value}
                      </p>
                    </div>
                    <Icon
                      className={cn("h-6 w-6 shrink-0", item.tone)}
                      aria-hidden="true"
                    />
                  </div>
                </Card3D>
              )
            })}
          </div>

          <Card3D
            glow={false}
            className="overflow-hidden"
            innerClassName="overflow-hidden p-0"
          >
            <div className="border-b border-border/70 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {t("statement")}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t("entryCount", { count: visibleEntries.length })}
                  </p>
                </div>
                <fieldset className="grid gap-3 sm:grid-cols-2">
                  <legend className="sr-only">{t("filters")}</legend>
                  <div>
                    <label
                      htmlFor="owner-finance-unit-filter"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      {t("unitFilter")}
                    </label>
                    <select
                      id="owner-finance-unit-filter"
                      data-testid="owner-finance-unit-filter"
                      value={effectiveSelectedUnit}
                      onChange={(event) => setSelectedUnit(event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <option value="all">{t("allUnits")}</option>
                      {data?.units.map((unit) => (
                        <option key={unit.unitId} value={unit.unitNo}>
                          {t("unitLabel", { unit: unit.unitNo })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="owner-finance-history-filter"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      {t("historyFilter")}
                    </label>
                    <select
                      id="owner-finance-history-filter"
                      data-testid="owner-finance-history-filter"
                      value={historyFilter}
                      onChange={(event) =>
                        setHistoryFilter(event.target.value as HistoryFilter)
                      }
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    >
                      <option value="all">{t("allHistory")}</option>
                      <option value="due">{t("dueHistory")}</option>
                      <option value="paid">{t("paidHistory")}</option>
                    </select>
                  </div>
                </fieldset>
              </div>
            </div>

            {visibleEntries.length === 0 ? (
              <div
                data-testid="owner-finance-no-entries"
                className="p-6 text-center sm:p-10"
              >
                <ReceiptText
                  className="mx-auto h-8 w-8 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-base font-black text-foreground">
                  {t("noEntriesTitle")}
                </h3>
                <p className="mx-auto mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  {t("noEntriesBody")}
                </p>
              </div>
            ) : (
              <div
                id="owner-finance-history-rows"
                className="overflow-x-auto"
                data-testid="owner-finance-rows"
              >
                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                  <caption className="sr-only">{t("tableCaption")}</caption>
                  <thead className="bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-bold sm:px-5">
                        {t("unit")}
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        {t("description")}
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        {t("period")}
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        {t("dueDate")}
                      </th>
                      <th scope="col" className="px-4 py-3 font-bold">
                        {t("statusColumn")}
                      </th>
                      <th
                        scope="col"
                        className="px-4 py-3 text-right font-bold sm:px-5"
                      >
                        {t("amount")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {visibleEntries.map((entry) => {
                      const activityLabelKey =
                        entry.activityKind === "manual_payment_reversal"
                          ? "entryType.manual_payment_reversal"
                          : entry.activityKind === "manual_payment"
                            ? "entryType.manual_payment"
                            : `entryType.${entry.entryType}`
                      const statusLabelKey =
                        entry.activityKind === "manual_payment_reversal"
                          ? "status.reversed"
                          : `status.${entry.status}`

                      return (
                        <tr
                          key={entry.id}
                          data-entry-id={entry.id}
                          data-unit={entry.unitNo}
                          className="bg-card/30 align-top hover:bg-muted/25"
                        >
                          <th
                            scope="row"
                            className="px-4 py-4 font-black whitespace-nowrap text-foreground sm:px-5"
                          >
                            {entry.unitNo}
                          </th>
                          <td className="max-w-sm px-4 py-4">
                            <p className="font-bold text-foreground">
                              {t(activityLabelKey as "entryType.dues")}
                            </p>
                            {entry.description && (
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                                {entry.description}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                            {entry.period ?? t("notAvailable")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-muted-foreground">
                            {formatDate(
                              entry.dueDate ?? entry.paidAt ?? entry.postedAt,
                              intlLocale
                            ) ?? t("notAvailable")}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <StatusBadge
                              variant={entryStatusVariant(entry.status)}
                            >
                              {t(statusLabelKey as "status.paid")}
                            </StatusBadge>
                          </td>
                          <td className="px-4 py-4 text-right font-black whitespace-nowrap text-foreground sm:px-5">
                            {formatMoney(
                              entry.activityKind === "manual_payment_reversal"
                                ? -entry.amountCents
                                : entry.amountCents,
                              entry.currency,
                              t("mixedCurrencies")
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {data?.pagination.hasMore && data.pagination.nextCursor && (
              <div className="border-t border-border/70 p-4 text-center sm:p-5">
                <p
                  id="owner-finance-history-page-status"
                  data-testid="owner-finance-history-page-status"
                  role="status"
                  aria-live="polite"
                  className="text-xs font-semibold text-muted-foreground"
                >
                  {t("historyPageStatus", {
                    loaded: data.units.reduce(
                      (sum, unit) => sum + unit.entries.length,
                      0
                    ),
                    total: data.pagination.totalEntryCount,
                  })}
                </p>
                {loadMoreError && (
                  <p
                    className="mt-2 text-sm font-bold text-rose-700 dark:text-rose-300"
                    role="alert"
                  >
                    {t("loadMoreError")}
                  </p>
                )}
                <button
                  type="button"
                  data-testid="owner-finance-load-more"
                  aria-controls="owner-finance-history-rows"
                  aria-describedby="owner-finance-history-page-status"
                  disabled={loadingMore}
                  onClick={() =>
                    void fetchStatement("page", {
                      cursor: data.pagination.nextCursor ?? "",
                      snapshotAt: data.pagination.snapshotAt,
                    })
                  }
                  className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2 text-sm font-black text-foreground transition outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-65"
                >
                  {loadingMore && (
                    <RefreshCw
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {loadingMore ? t("loadingMore") : t("loadMore")}
                </button>
              </div>
            )}
          </Card3D>
        </>
      )}
    </section>
  )
}
