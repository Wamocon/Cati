// Shared currency formatting for the 1Çatı dashboard.
//
// Single source of truth for Turkish Lira (₺) and Euro (€) display, including
// dual-currency output (a native amount plus its approximate converted value).
// The business requirement is that every monetary figure, in every role, is
// shown in both Lira and Euro.
//
// There is no live FX feed in the product; the TRY<->EUR rate is a configurable
// constant. Override it per environment with NEXT_PUBLIC_EUR_TRY_RATE (client-
// readable). The converted value is always labelled approximate ("~") so it is
// never mistaken for a booked/settled amount.

// 1 EUR = DEFAULT_EUR_TRY_RATE TRY. Demo default; confirm the real rate with the
// client and set NEXT_PUBLIC_EUR_TRY_RATE in the environment.
const DEFAULT_EUR_TRY_RATE = 45

function readConfiguredRate(): number {
  const raw = process.env.NEXT_PUBLIC_EUR_TRY_RATE
  if (!raw) return DEFAULT_EUR_TRY_RATE
  const parsed = Number.parseFloat(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_EUR_TRY_RATE
}

/** Approximate TRY value of 1 EUR. Configurable via NEXT_PUBLIC_EUR_TRY_RATE. */
export const EUR_TRY_RATE = readConfiguredRate()

export type NativeCurrency = "TRY" | "EUR"

export function tryToEur(amountTry: number): number {
  return amountTry / EUR_TRY_RATE
}

export function eurToTry(amountEur: number): number {
  return amountEur * EUR_TRY_RATE
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTryShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M ₺`
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}K ₺`
  return formatTry(amount)
}

export function formatEurShort(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}K €`
  return formatEur(amount)
}

export interface DualOptions {
  /** Native currency of `amount` (default TRY). The other currency is derived. */
  currency?: NativeCurrency
  /** Use M/K abbreviations for large figures. */
  short?: boolean
  /** Marker for the approximate converted value (default "~"). */
  approxPrefix?: string
}

/**
 * Render a monetary amount in both Lira and Euro: the native currency first,
 * then the approximate converted value in parentheses.
 *   formatDual(42024)                    -> "₺42.024 (~934 €)"
 *   formatDual(120000, {currency:"EUR"}) -> "120.000 € (~₺5.400.000)"
 */
export function formatDual(amount: number, options: DualOptions = {}): string {
  const { currency = "TRY", short = false, approxPrefix = "~" } = options
  const fmtTry = short ? formatTryShort : formatTry
  const fmtEur = short ? formatEurShort : formatEur
  if (currency === "EUR") {
    return `${fmtEur(amount)} (${approxPrefix}${fmtTry(eurToTry(amount))})`
  }
  return `${fmtTry(amount)} (${approxPrefix}${fmtEur(tryToEur(amount))})`
}

/** Dual-currency with M/K abbreviations, for dense KPI tiles. */
export function formatDualShort(
  amount: number,
  currency: NativeCurrency = "TRY"
): string {
  return formatDual(amount, { currency, short: true })
}

/** Dual-currency for records that store integer minor units (cents/kuruş). */
export function formatDualFromCents(
  cents: number,
  currency: NativeCurrency = "TRY",
  short = false
): string {
  return formatDual(cents / 100, { currency, short })
}
