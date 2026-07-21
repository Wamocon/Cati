"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  History,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"
import {
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import { createClient } from "@/lib/supabase/client"
import { formatDualFromCents } from "@/lib/currency"
import type {
  ManualPaymentMethod,
  ManualPaymentRecord,
  ManualPaymentWorkspace,
} from "@/lib/manual-payment-repository"
import { cn } from "@/lib/utils"

type RequestState = "loading" | "success" | "error"
type MutationState = "idle" | "saving" | "success" | "error"

interface PaymentFormState {
  accountId: string
  amount: string
  currency: string
  receivedAt: string
  reference: string
  method: ManualPaymentMethod
  businessNote: string
}

const POLL_RECOVERY_MS = 30_000
const REALTIME_TABLES = [
  "manual_payment_receipts",
  "manual_payment_reversals",
  "finance_ledger_entries",
  "payment_transactions",
]

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function initialReceivedAt() {
  const now = new Date()
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function initialForm(): PaymentFormState {
  return {
    accountId: "",
    amount: "",
    currency: "TRY",
    receivedAt: initialReceivedAt(),
    reference: "",
    method: "bank_transfer",
    businessNote: "",
  }
}

function newIdempotencyKey(prefix: string) {
  const id = globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

// Show manual-payment amounts in both Lira and Euro via the shared helper.
// Stored amounts are integer minor units (kuruş/cents).
function formatMoney(cents: number, currency: string) {
  return formatDualFromCents(cents, currency === "EUR" ? "EUR" : "TRY")
}

function formatDate(value: string, locale: string, includeTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "Europe/Istanbul",
  }).format(date)
}

function safeApiError(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback
}

export function ManualPaymentConsole() {
  const locale = resolveDashboardLocale(useLocale())
  const intlLocale = toIntlLocale(locale)
  const t = useTranslations("manualPayments")
  const requestSequence = useRef(0)
  const postKey = useRef<string | null>(null)
  const reversalKey = useRef<string | null>(null)
  const [data, setData] = useState<ManualPaymentWorkspace | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [mutationState, setMutationState] = useState<MutationState>("idle")
  const [form, setForm] = useState<PaymentFormState>(initialForm)
  const [message, setMessage] = useState<string | null>(null)
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null)
  const [reversalReason, setReversalReason] = useState("")

  const fetchWorkspace = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const response = await fetch("/api/site-management/manual-payments?limit=50", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("Manual payment workspace failed.")
      const nextData = (await response.json()) as ManualPaymentWorkspace
      if (sequence !== requestSequence.current) return
      setData(nextData)
      setRequestState("success")
      setForm((current) => {
        if (current.accountId || nextData.accounts.length === 0) return current
        return {
          ...current,
          accountId: nextData.accounts[0].id,
          currency: nextData.accounts[0].currency,
        }
      })
    } catch {
      if (sequence === requestSequence.current) setRequestState("error")
    } finally {
      if (sequence === requestSequence.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void fetchWorkspace(true), 0)
    return () => window.clearTimeout(handle)
  }, [fetchWorkspace])

  useEffect(() => {
    const recover = () => {
      if (document.visibilityState === "visible") void fetchWorkspace()
    }
    const operationalChange = () => void fetchWorkspace()
    const poll = window.setInterval(recover, POLL_RECOVERY_MS)
    document.addEventListener("visibilitychange", recover)
    window.addEventListener("site-management:changed", operationalChange)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", recover)
      window.removeEventListener("site-management:changed", operationalChange)
    }
  }, [fetchWorkspace])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || data?.source !== "supabase") return
    const supabase = createClient()
    let channel = supabase.channel("manual-payment-console")
    REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => void fetchWorkspace()
      )
    })
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [data?.source, fetchWorkspace])

  const selectedAccount = useMemo(
    () => data?.accounts.find((account) => account.id === form.accountId) ?? null,
    [data?.accounts, form.accountId]
  )
  const postedCount = data?.payments.filter((payment) => payment.status === "posted").length ?? 0
  const unreconciledCents =
    data?.payments
      .filter(
        (payment) =>
          payment.status === "posted" &&
          payment.reconciliationStatus === "unreconciled"
      )
      .reduce((sum, payment) => sum + payment.amountCents, 0) ?? 0
  const summaryCurrency =
    new Set(data?.payments.map((payment) => payment.currency) ?? []).size === 1
      ? data?.payments[0]?.currency ?? "TRY"
      : "TRY"

  function updateForm<Key extends keyof PaymentFormState>(
    key: Key,
    value: PaymentFormState[Key]
  ) {
    postKey.current = null
    setMessage(null)
    setMutationState("idle")
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedAccount || mutationState === "saving") return
    setMutationState("saving")
    setMessage(null)
    postKey.current ??= newIdempotencyKey("manual-payment")
    try {
      const response = await fetch("/api/site-management/manual-payments", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": postKey.current,
        },
        body: JSON.stringify({
          unitId: selectedAccount.unitId,
          ownerResidentId: selectedAccount.ownerResidentId,
          amount: form.amount,
          currency: form.currency,
          receivedAt: new Date(form.receivedAt).toISOString(),
          reference: form.reference,
          method: form.method,
          businessNote: form.businessNote,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) throw new Error(safeApiError(payload, t("saveError")))
      const payment = payload as ManualPaymentRecord
      setMessage(payment.replayed ? t("replaySuccess") : t("saveSuccess"))
      setMutationState("success")
      postKey.current = null
      setForm((current) => ({
        ...initialForm(),
        accountId: current.accountId,
        currency: current.currency,
      }))
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      await fetchWorkspace()
    } catch (error) {
      setMutationState("error")
      setMessage(error instanceof Error ? error.message : t("saveError"))
    }
  }

  function beginReversal(payment: ManualPaymentRecord) {
    reversalKey.current = null
    setReversingPaymentId(payment.id)
    setReversalReason("")
    setMessage(null)
    setMutationState("idle")
  }

  async function submitReversal(payment: ManualPaymentRecord) {
    if (mutationState === "saving") return
    setMutationState("saving")
    setMessage(null)
    reversalKey.current ??= newIdempotencyKey(`manual-payment-reversal-${payment.id}`)
    try {
      const response = await fetch("/api/site-management/manual-payments", {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "idempotency-key": reversalKey.current,
        },
        body: JSON.stringify({
          paymentId: payment.id,
          expectedVersion: payment.version,
          reason: reversalReason,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) throw new Error(safeApiError(payload, t("reverseError")))
      setMutationState("success")
      setMessage(t("reverseSuccess"))
      setReversingPaymentId(null)
      setReversalReason("")
      reversalKey.current = null
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      await fetchWorkspace()
    } catch (error) {
      setMutationState("error")
      setMessage(error instanceof Error ? error.message : t("reverseError"))
    }
  }

  if (requestState === "loading" && !data) {
    return (
      <Card3D glow={false}>
        <div
          data-testid="manual-payment-console"
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
        <div
          data-testid="manual-payment-console"
          role="alert"
          className="flex items-start gap-3 text-rose-700 dark:text-rose-300"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <h2 className="font-black">{t("loadErrorTitle")}</h2>
            <p className="mt-1 text-sm">{t("loadErrorBody")}</p>
            <button
              type="button"
              onClick={() => void fetchWorkspace(true)}
              className="mt-3 min-h-11 rounded-lg border border-current px-4 py-2 text-sm font-black outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {t("retry")}
            </button>
          </div>
        </div>
      </Card3D>
    )
  }

  return (
    <Card3D
      glow={false}
      className="overflow-hidden"
    >
      <div
        data-testid="manual-payment-console"
        aria-busy={refreshing || mutationState === "saving"}
        className="flex flex-col gap-4 border-b border-border/70 pb-5 lg:flex-row lg:items-start lg:justify-between"
      >
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black text-foreground">{t("title")}</h2>
            <StatusBadge variant="warning">{t("unreconciledBadge")}</StatusBadge>
            {data?.capabilities.readOnly && (
              <StatusBadge variant="info">{t("readOnlyBadge")}</StatusBadge>
            )}
          </div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-amber-600" aria-hidden="true" />
            {t(data?.source === "supabase" ? "liveTruth" : "demoTruth")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetchWorkspace()}
          disabled={refreshing}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-black text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-65"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
          {refreshing ? t("refreshing") : t("refresh")}
        </button>
      </div>

      {message && (
        <div
          role={mutationState === "error" ? "alert" : "status"}
          data-testid="manual-payment-message"
          className={cn(
            "mt-4 rounded-xl border p-3 text-sm font-bold",
            mutationState === "error"
              ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200"
              : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          )}
        >
          {message}
        </div>
      )}

      <div className="grid gap-3 py-5 sm:grid-cols-3">
        <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t("postedCount")}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{postedCount}</p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t("unreconciledTotal")}</p>
          <p className="mt-1 text-2xl font-black text-foreground">
            {formatMoney(unreconciledCents, summaryCurrency)}
          </p>
        </div>
        <div className="rounded-xl border border-border/70 bg-muted/25 p-3">
          <p className="text-xs font-bold uppercase text-muted-foreground">{t("accountCount")}</p>
          <p className="mt-1 text-2xl font-black text-foreground">{data?.accounts.length ?? 0}</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <section aria-labelledby="manual-payment-form-heading">
          <h3 id="manual-payment-form-heading" className="text-sm font-black text-foreground">
            {data?.capabilities.canPost ? t("formTitle") : t("managerTitle")}
          </h3>
          {data?.capabilities.canPost ? (
            <form data-testid="manual-payment-form" onSubmit={submitPayment} className="mt-3 space-y-4 rounded-xl border border-border/70 bg-background/70 p-4">
              <div>
                <label htmlFor="manual-payment-account" className="mb-1.5 block text-xs font-bold text-foreground">
                  {t("account")}
                </label>
                <select
                  id="manual-payment-account"
                  data-testid="manual-payment-account"
                  required
                  value={form.accountId}
                  onChange={(event) => {
                    const account = data?.accounts.find((item) => item.id === event.target.value)
                    updateForm("accountId", event.target.value)
                    if (account) updateForm("currency", account.currency)
                  }}
                  className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">{t("selectAccount")}</option>
                  {data?.accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.unitNo} - {account.ownerName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
                <div>
                  <label htmlFor="manual-payment-amount" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("amount")}
                  </label>
                  <input
                    id="manual-payment-amount"
                    data-testid="manual-payment-amount"
                    required
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={(event) => updateForm("amount", event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="manual-payment-currency" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("currency")}
                  </label>
                  <input
                    id="manual-payment-currency"
                    data-testid="manual-payment-currency"
                    required
                    readOnly
                    aria-readonly="true"
                    maxLength={3}
                    value={form.currency}
                    className="min-h-11 w-full cursor-not-allowed rounded-lg border border-border bg-muted/60 px-3 text-sm font-semibold uppercase text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="manual-payment-date" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("receivedAt")}
                  </label>
                  <input
                    id="manual-payment-date"
                    data-testid="manual-payment-date"
                    required
                    type="datetime-local"
                    value={form.receivedAt}
                    onChange={(event) => updateForm("receivedAt", event.target.value)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="manual-payment-method" className="mb-1.5 block text-xs font-bold text-foreground">
                    {t("method")}
                  </label>
                  <select
                    id="manual-payment-method"
                    data-testid="manual-payment-method"
                    value={form.method}
                    onChange={(event) => updateForm("method", event.target.value as ManualPaymentMethod)}
                    className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {(["bank_transfer", "cash", "card_terminal", "other"] as const).map((method) => (
                      <option key={method} value={method}>{t(`methods.${method}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="manual-payment-reference" className="mb-1.5 block text-xs font-bold text-foreground">
                  {t("reference")}
                </label>
                <input
                  id="manual-payment-reference"
                  data-testid="manual-payment-reference"
                  required
                  minLength={3}
                  maxLength={100}
                  autoComplete="off"
                  value={form.reference}
                  onChange={(event) => updateForm("reference", event.target.value)}
                  className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="manual-payment-note" className="mb-1.5 block text-xs font-bold text-foreground">
                  {t("businessNote")}
                </label>
                <textarea
                  id="manual-payment-note"
                  data-testid="manual-payment-note"
                  required
                  minLength={10}
                  maxLength={1000}
                  rows={3}
                  value={form.businessNote}
                  onChange={(event) => updateForm("businessNote", event.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">{t("noteHelp")}</p>
              </div>
              <button
                type="submit"
                data-testid="manual-payment-submit"
                disabled={mutationState === "saving" || !selectedAccount}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutationState === "saving" ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
                {mutationState === "saving" ? t("saving") : t("submit")}
              </button>
            </form>
          ) : (
            <div data-testid="manual-payment-manager-readonly" className="mt-3 rounded-xl border border-sky-500/20 bg-sky-500/10 p-4">
              <p className="text-sm leading-6 text-sky-900 dark:text-sky-100">{t("managerBody")}</p>
            </div>
          )}
        </section>

        <section aria-labelledby="manual-payment-history-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="manual-payment-history-heading" className="inline-flex items-center gap-2 text-sm font-black text-foreground">
              <History className="h-4 w-4 text-primary" aria-hidden="true" />
              {t("historyTitle")}
            </h3>
            <span className="inline-flex items-center gap-1 text-xs font-bold text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {data?.generatedAt ? formatDate(data.generatedAt, intlLocale, true) : "-"}
            </span>
          </div>
          <div data-testid="manual-payment-history" className="mt-3 space-y-3">
            {data?.payments.map((payment) => (
              <article key={payment.id} data-payment-id={payment.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-foreground">{payment.unitNo} - {payment.ownerName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {payment.reference} / {t(`methods.${payment.method}`)} / {formatDate(payment.receivedAt, intlLocale, true)}
                    </p>
                  </div>
                  <p className="text-base font-black text-foreground">
                    {formatMoney(payment.amountCents, payment.currency)}
                  </p>
                </div>
                <p className="mt-2 text-sm leading-5 text-muted-foreground">{payment.businessNote}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge variant={payment.status === "posted" ? "success" : "neutral"}>
                    {t(`status.${payment.status}`)}
                  </StatusBadge>
                  <StatusBadge variant="warning">{t("unreconciledBadge")}</StatusBadge>
                  <span className="text-xs font-bold text-muted-foreground">v{payment.version}</span>
                </div>
                {payment.reversalReason && (
                  <p className="mt-3 rounded-lg bg-muted/60 p-3 text-xs leading-5 text-muted-foreground">
                    <strong className="text-foreground">{t("reversalReason")}:</strong> {payment.reversalReason}
                  </p>
                )}
                {data.capabilities.canReverse && payment.status === "posted" && (
                  <div className="mt-3 border-t border-border/70 pt-3">
                    {reversingPaymentId === payment.id ? (
                      <div className="space-y-2">
                        <label htmlFor={`reversal-${payment.id}`} className="block text-xs font-bold text-foreground">
                          {t("reversalReason")}
                        </label>
                        <textarea
                          id={`reversal-${payment.id}`}
                          data-testid="manual-payment-reversal-reason"
                          minLength={10}
                          maxLength={1000}
                          rows={2}
                          value={reversalReason}
                          onChange={(event) => {
                            reversalKey.current = null
                            setReversalReason(event.target.value)
                          }}
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            data-testid="manual-payment-reversal-confirm"
                            disabled={mutationState === "saving" || reversalReason.trim().length < 10}
                            onClick={() => void submitReversal(payment)}
                            className="min-h-10 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-black text-rose-700 outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:text-rose-200"
                          >
                            {t("confirmReverse")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setReversingPaymentId(null)}
                            className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-black text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            {t("cancel")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid="manual-payment-reverse"
                        onClick={() => beginReversal(payment)}
                        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-black text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("reverse")}
                      </button>
                    )}
                  </div>
                )}
              </article>
            ))}
            {data?.payments.length === 0 && (
              <div data-testid="manual-payment-empty" className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t("empty")}
              </div>
            )}
          </div>
        </section>
      </div>
      <span className="sr-only" aria-live="polite">
        {refreshing ? t("refreshing") : ""}
      </span>
    </Card3D>
  )
}
