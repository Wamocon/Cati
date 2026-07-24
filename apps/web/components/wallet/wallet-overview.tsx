"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react"
import { ComingSoon } from "@/components/coming-soon"
import { FeatureInfo } from "@/components/feature-info"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  WalletOverview as WalletOverviewPayload,
  WalletSummary,
  WalletTransactionType,
  WalletTransactionView,
} from "@/lib/wallet-repository"

// ---------------------------------------------------------------------------
// Locale copy. Kept self-contained (like role-focused-live-dashboard.tsx) so a
// new dashboard surface does not have to thread page-level strings through the
// shared messages/*.json bundles. No backend / provider names appear here.
// ---------------------------------------------------------------------------

export type WalletLocale = "tr" | "en" | "de" | "ru"

const intlLocales: Record<WalletLocale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
}

export function resolveWalletLocale(value: string): WalletLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface WalletCopy {
  title: string
  subtitle: string
  balanceLabel: string
  demoNote: string
  lowTitle: string
  lowBody: string
  topUpTitle: string
  topUpDemoNote: string
  amountLabel: string
  quickAmountLabel: string
  reviewTopUp: string
  confirmTitle: string
  confirmBody: string
  confirm: string
  cancel: string
  adding: string
  topUpSuccess: string
  topUpError: string
  amountInvalid: string
  managedNote: string
  historyTitle: string
  historyEmpty: string
  refresh: string
  refreshing: string
  loading: string
  loadError: string
  retry: string
  topUpLink: string
  txn: Record<WalletTransactionType, string>
}

const walletCopy: Record<WalletLocale, WalletCopy> = {
  en: {
    title: "Wallet",
    subtitle: "Your credit balance and recent activity.",
    balanceLabel: "Available credit",
    demoNote: "Credit for booking activities and services.",
    lowTitle: "Your credit is running low",
    lowBody: "Top up to keep booking activities and services.",
    topUpTitle: "Add credit",
    topUpDemoNote: "Demo credit, no real payment is taken yet.",
    amountLabel: "Amount",
    quickAmountLabel: "Quick amounts",
    reviewTopUp: "Review top-up",
    confirmTitle: "Confirm top-up",
    confirmBody: "Add {amount} to your wallet?",
    confirm: "Confirm top-up",
    cancel: "Cancel",
    adding: "Adding…",
    topUpSuccess: "Credit added to your wallet.",
    topUpError: "The top-up could not be completed. Review the amount and try again.",
    amountInvalid: "Enter an amount greater than zero with at most two decimals.",
    managedNote: "Top-ups for this account are managed for you.",
    historyTitle: "Recent activity",
    historyEmpty: "No wallet activity yet.",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    loading: "Loading your wallet…",
    loadError: "Your wallet could not be loaded.",
    retry: "Try again",
    topUpLink: "Top up",
    txn: {
      topup: "Top-up",
      spend: "Booking",
      transfer: "Allowance transfer",
      refund: "Refund",
      offset: "Adjustment",
    },
  },
  tr: {
    title: "Cüzdan",
    subtitle: "Kredi bakiyeniz ve son hareketleriniz.",
    balanceLabel: "Kullanılabilir kredi",
    demoNote: "Etkinlik ve hizmet rezervasyonu için kredi.",
    lowTitle: "Krediniz azalıyor",
    lowBody: "Rezervasyona devam etmek için kredi yükleyin.",
    topUpTitle: "Kredi yükle",
    topUpDemoNote: "Demo kredi, henüz gerçek bir ödeme alınmıyor.",
    amountLabel: "Tutar",
    quickAmountLabel: "Hızlı tutarlar",
    reviewTopUp: "Yüklemeyi gözden geçir",
    confirmTitle: "Yüklemeyi onayla",
    confirmBody: "Cüzdanınıza {amount} eklensin mi?",
    confirm: "Yüklemeyi onayla",
    cancel: "Vazgeç",
    adding: "Ekleniyor…",
    topUpSuccess: "Kredi cüzdanınıza eklendi.",
    topUpError: "Yükleme tamamlanamadı. Tutarı kontrol edip tekrar deneyin.",
    amountInvalid: "Sıfırdan büyük, en fazla iki ondalıklı bir tutar girin.",
    managedNote: "Bu hesabın kredi yüklemeleri sizin için yönetilir.",
    historyTitle: "Son hareketler",
    historyEmpty: "Henüz cüzdan hareketi yok.",
    refresh: "Yenile",
    refreshing: "Yenileniyor…",
    loading: "Cüzdanınız yükleniyor…",
    loadError: "Cüzdanınız yüklenemedi.",
    retry: "Tekrar dene",
    topUpLink: "Kredi yükle",
    txn: {
      topup: "Kredi yükleme",
      spend: "Rezervasyon",
      transfer: "Bakiye aktarımı",
      refund: "İade",
      offset: "Düzeltme",
    },
  },
  de: {
    title: "Guthaben",
    subtitle: "Ihr Guthaben und Ihre letzten Bewegungen.",
    balanceLabel: "Verfügbares Guthaben",
    demoNote: "Guthaben für die Buchung von Aktivitäten und Services.",
    lowTitle: "Ihr Guthaben wird knapp",
    lowBody: "Laden Sie auf, um weiter buchen zu können.",
    topUpTitle: "Guthaben aufladen",
    topUpDemoNote: "Demo-Guthaben, es wird noch keine echte Zahlung eingezogen.",
    amountLabel: "Betrag",
    quickAmountLabel: "Schnellbeträge",
    reviewTopUp: "Aufladung prüfen",
    confirmTitle: "Aufladung bestätigen",
    confirmBody: "{amount} zu Ihrem Guthaben hinzufügen?",
    confirm: "Aufladung bestätigen",
    cancel: "Abbrechen",
    adding: "Wird hinzugefügt…",
    topUpSuccess: "Guthaben wurde hinzugefügt.",
    topUpError: "Die Aufladung konnte nicht abgeschlossen werden. Prüfen Sie den Betrag und versuchen Sie es erneut.",
    amountInvalid: "Geben Sie einen Betrag größer als null mit höchstens zwei Nachkommastellen ein.",
    managedNote: "Aufladungen für dieses Konto werden für Sie verwaltet.",
    historyTitle: "Letzte Bewegungen",
    historyEmpty: "Noch keine Guthabenbewegungen.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    loading: "Ihr Guthaben wird geladen…",
    loadError: "Ihr Guthaben konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    topUpLink: "Aufladen",
    txn: {
      topup: "Aufladung",
      spend: "Buchung",
      transfer: "Guthabenübertragung",
      refund: "Erstattung",
      offset: "Korrektur",
    },
  },
  ru: {
    title: "Кошелёк",
    subtitle: "Ваш баланс и последние операции.",
    balanceLabel: "Доступный баланс",
    demoNote: "Средства для бронирования активностей и услуг.",
    lowTitle: "Баланс заканчивается",
    lowBody: "Пополните, чтобы продолжать бронировать.",
    topUpTitle: "Пополнить",
    topUpDemoNote: "Демо-кредит, реальная оплата пока не взимается.",
    amountLabel: "Сумма",
    quickAmountLabel: "Быстрые суммы",
    reviewTopUp: "Проверить пополнение",
    confirmTitle: "Подтвердите пополнение",
    confirmBody: "Добавить {amount} на ваш кошелёк?",
    confirm: "Подтвердить пополнение",
    cancel: "Отмена",
    adding: "Добавляем…",
    topUpSuccess: "Средства добавлены на кошелёк.",
    topUpError: "Пополнение не удалось. Проверьте сумму и попробуйте снова.",
    amountInvalid: "Введите сумму больше нуля не более чем с двумя знаками после запятой.",
    managedNote: "Пополнения этого счёта управляются за вас.",
    historyTitle: "Последние операции",
    historyEmpty: "Пока нет операций по кошельку.",
    refresh: "Обновить",
    refreshing: "Обновление…",
    loading: "Загружаем ваш кошелёк…",
    loadError: "Не удалось загрузить кошелёк.",
    retry: "Повторить",
    topUpLink: "Пополнить",
    txn: {
      topup: "Пополнение",
      spend: "Бронирование",
      transfer: "Перевод средств",
      refund: "Возврат",
      offset: "Корректировка",
    },
  },
}

// Quick-amount presets (in whole Lira) that fill the top-up field with one tap.
// The manual input stays available for any other amount.
const QUICK_AMOUNTS = [100, 250, 500, 1000] as const

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newIdempotencyKey(prefix: string) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

// Mirror of the server parser (app/api/site-management/wallet/route.ts). Used
// only to preview the dual-currency amount before confirming; the server remains
// the single authority for what is accepted.
function parseAmountToCents(value: string): number | null {
  const amount = value.trim().replace(",", ".")
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/.exec(amount)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0")
  const cents = whole * 100 + fraction
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 1_000_000_000_000) {
    return null
  }
  return cents
}

function formatDateTime(value: string, locale: WalletLocale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function apiErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback
}

// ---------------------------------------------------------------------------
// Presentational balance card. Reused by the full WalletOverview, the guest
// home dashboard, and (later) child / kid mode.
// ---------------------------------------------------------------------------

export function WalletBalanceCard({
  wallet,
  locale,
  footer,
  className,
}: {
  wallet: WalletSummary
  locale: WalletLocale
  footer?: ReactNode
  className?: string
}) {
  const text = walletCopy[locale]
  return (
    <div
      data-testid="wallet-balance"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-primary/[0.05] to-transparent p-5 shadow-xl shadow-black/[0.04]",
        className
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-primary/15 blur-2xl"
      />
      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">
            {text.balanceLabel}
          </p>
          <p className="mt-2 break-words text-3xl font-black text-foreground">
            {formatDualFromCents(wallet.balanceCents, wallet.currency)}
          </p>
          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {text.demoNote}
          </p>
        </div>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Wallet className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>

      {wallet.lowBalance ? (
        <div
          role="status"
          data-testid="wallet-low-balance"
          className="relative mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 text-xs leading-5">
            <span className="block font-black">{text.lowTitle}</span>
            <span className="block font-medium">{text.lowBody}</span>
          </span>
        </div>
      ) : null}

      {footer ? <div className="relative mt-4">{footer}</div> : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// A single transaction row.
// ---------------------------------------------------------------------------

const txnIcon: Record<"in" | "out", LucideIcon> = {
  in: ArrowDownLeft,
  out: ArrowUpRight,
}

function TransactionRow({
  txn,
  locale,
}: {
  txn: WalletTransactionView
  locale: WalletLocale
}) {
  const text = walletCopy[locale]
  const incoming = txn.direction === "in"
  const Icon = txnIcon[txn.direction]
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border bg-background/70 p-3">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          incoming
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "bg-muted text-foreground"
        )}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-foreground">
          {text.txn[txn.type]}
        </span>
        <span className="block text-xs text-muted-foreground">
          {formatDateTime(txn.createdAt, locale)}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-right text-sm font-black",
          incoming ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
        )}
      >
        {incoming ? "+" : "−"}
        {formatDualFromCents(txn.amountCents, txn.currency)}
      </span>
    </li>
  )
}

// ---------------------------------------------------------------------------
// Full wallet workspace (self-contained fetch + top-up + history). Used by the
// wallet page; ready for reuse by child / kid mode in a later phase.
// ---------------------------------------------------------------------------

type RequestState = "loading" | "success" | "error"
type MutationState = "idle" | "saving" | "success" | "error"

export function WalletOverview() {
  const locale = resolveWalletLocale(useLocale())
  const text = walletCopy[locale]
  const [data, setData] = useState<WalletOverviewPayload | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [amount, setAmount] = useState("")
  const [stage, setStage] = useState<"idle" | "confirm">("idle")
  const [mutationState, setMutationState] = useState<MutationState>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const requestSequence = useRef(0)
  const topUpKey = useRef<string | null>(null)

  const fetchWallet = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const response = await fetch("/api/site-management/wallet?limit=25", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("Wallet workspace failed.")
      const payload = (await response.json()) as WalletOverviewPayload
      if (sequence !== requestSequence.current) return
      setData(payload)
      setRequestState("success")
    } catch {
      if (sequence === requestSequence.current) setRequestState("error")
    } finally {
      if (sequence === requestSequence.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void fetchWallet(true), 0)
    return () => window.clearTimeout(handle)
  }, [fetchWallet])

  useEffect(() => {
    const recover = () => {
      if (document.visibilityState === "visible") void fetchWallet()
    }
    const onChange = () => void fetchWallet()
    const poll = window.setInterval(recover, 30_000)
    document.addEventListener("visibilitychange", recover)
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", recover)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [fetchWallet])

  const amountCents = parseAmountToCents(amount)
  const canReview = amountCents !== null && mutationState !== "saving"
  const currency = data?.wallet.currency ?? "TRY"

  function resetTopUp() {
    topUpKey.current = null
    setStage("idle")
    setMutationState("idle")
    setMessage(null)
    setAmount("")
  }

  async function confirmTopUp() {
    if (amountCents === null || mutationState === "saving") return
    setMutationState("saving")
    setMessage(null)
    topUpKey.current ??= newIdempotencyKey("wallet-topup")
    try {
      const response = await fetch("/api/site-management/wallet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "topup",
          amount,
          idempotencyKey: topUpKey.current,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) throw new Error(apiErrorMessage(payload, text.topUpError))
      setMutationState("success")
      setMessage(text.topUpSuccess)
      setStage("idle")
      setAmount("")
      topUpKey.current = null
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      await fetchWallet()
    } catch (error) {
      setMutationState("error")
      setMessage(error instanceof Error ? error.message : text.topUpError)
    }
  }

  if (requestState === "loading" && !data) {
    return (
      <div
        data-testid="wallet-overview"
        aria-busy="true"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
        <div className="mt-5 h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!data) {
    return (
      <div
        data-testid="wallet-overview"
        role="alert"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-700 dark:text-rose-300"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black text-foreground">{text.loadError}</p>
            <button
              type="button"
              onClick={() => void fetchWallet(true)}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {text.retry}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canTopUp = data.capabilities.canTopUp

  return (
    <div
      data-testid="wallet-overview"
      aria-busy={refreshing || mutationState === "saving"}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black text-foreground">{text.title}</h2>
            <FeatureInfo featureKey="wallet" side="bottom" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{text.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchWallet()}
          disabled={refreshing}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
            aria-hidden="true"
          />
          {refreshing ? text.refreshing : text.refresh}
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-4">
          <WalletBalanceCard wallet={data.wallet} locale={locale} />

          {message ? (
            <div
              role={mutationState === "error" ? "alert" : "status"}
              data-testid="wallet-message"
              className={cn(
                "rounded-xl border p-3 text-sm font-bold",
                mutationState === "error"
                  ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                  : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
              )}
            >
              {message}
            </div>
          ) : null}

          {canTopUp ? (
            <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                {text.topUpTitle}
                <ComingSoon featureKey="payments" variant="inline" />
              </h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {text.topUpDemoNote}
              </p>

              {stage === "idle" ? (
                <form
                  data-testid="wallet-topup-form"
                  className="mt-3 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    if (!canReview) {
                      setMessage(text.amountInvalid)
                      setMutationState("error")
                      return
                    }
                    topUpKey.current = newIdempotencyKey("wallet-topup")
                    setMessage(null)
                    setMutationState("idle")
                    setStage("confirm")
                  }}
                >
                  <div>
                    <label
                      htmlFor="wallet-topup-amount"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      {text.amountLabel}
                    </label>
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary">
                      <span aria-hidden="true" className="text-sm font-black text-muted-foreground">
                        ₺
                      </span>
                      <input
                        id="wallet-topup-amount"
                        data-testid="wallet-topup-amount"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="0.00"
                        value={amount}
                        onChange={(event) => {
                          topUpKey.current = null
                          setMessage(null)
                          setMutationState("idle")
                          setAmount(event.target.value)
                        }}
                        className="min-h-11 w-full bg-transparent text-sm font-semibold text-foreground outline-none"
                      />
                    </div>
                    {amountCents !== null ? (
                      <p className="mt-1.5 text-xs font-semibold text-muted-foreground">
                        {formatDualFromCents(amountCents, currency)}
                      </p>
                    ) : null}
                  </div>
                  <div
                    role="group"
                    aria-label={text.quickAmountLabel}
                    className="flex flex-wrap gap-2"
                  >
                    {QUICK_AMOUNTS.map((value) => {
                      const active = amount.trim() === String(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          data-testid="wallet-quick-amount"
                          aria-pressed={active}
                          onClick={() => {
                            topUpKey.current = null
                            setMessage(null)
                            setMutationState("idle")
                            setAmount(String(value))
                          }}
                          className={cn(
                            "inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-xs font-black outline-none transition focus-visible:ring-2 focus-visible:ring-primary",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-foreground hover:bg-muted"
                          )}
                        >
                          ₺{value}
                        </button>
                      )
                    })}
                  </div>
                  <button
                    type="submit"
                    data-testid="wallet-topup-review"
                    disabled={!canReview}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    {text.reviewTopUp}
                  </button>
                </form>
              ) : (
                <div
                  data-testid="wallet-topup-confirm-panel"
                  className="mt-3 space-y-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-3"
                >
                  <p className="text-sm font-bold text-foreground">
                    {text.confirmTitle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {text.confirmBody.replace(
                      "{amount}",
                      formatDualFromCents(amountCents ?? 0, currency)
                    )}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      data-testid="wallet-topup-confirm"
                      onClick={() => void confirmTopUp()}
                      disabled={mutationState === "saving"}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                    >
                      {mutationState === "saving" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      )}
                      {mutationState === "saving" ? text.adding : text.confirm}
                    </button>
                    <button
                      type="button"
                      onClick={resetTopUp}
                      disabled={mutationState === "saving"}
                      className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                    >
                      {text.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
              {text.managedNote}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h3 className="flex items-center gap-2 text-sm font-black text-foreground">
            <History className="h-4 w-4 text-primary" aria-hidden="true" />
            {text.historyTitle}
          </h3>
          {data.transactions.length ? (
            <ul data-testid="wallet-history" className="mt-3 space-y-2">
              {data.transactions.map((txn) => (
                <TransactionRow key={txn.id} txn={txn} locale={locale} />
              ))}
            </ul>
          ) : (
            <div
              data-testid="wallet-history-empty"
              className="mt-3 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground"
            >
              {text.historyEmpty}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
