export const OWNER_FINANCE_CONTRACT_VERSION = "owner-finance.v3" as const

export type OwnerFinanceSource = "supabase" | "local-seed"

export interface AuthorizedUnit {
  id: string
  unitNo: string
}

export interface OwnerFinanceStatementEntry {
  id: string
  unitId: string
  unitNo: string
  entryType: string
  period: string | null
  dueDate: string | null
  paidAt: string | null
  postedAt: string | null
  createdAt: string
  status: string
  amountCents: number
  currency: string
  description: string | null
  activityKind: "standard" | "manual_payment" | "manual_payment_reversal"
  reconciliationStatus: "unreconciled" | "reconciled" | null
  manualPaymentId: string | null
  reversesManualPaymentId: string | null
}

export interface OwnerFinanceUnitStatement {
  unitId: string
  unitNo: string
  currency: string
  openBalanceCents: number | null
  overdueBalanceCents: number | null
  recordedPaymentsCents: number | null
  lastPaymentAt: string | null
  entries: OwnerFinanceStatementEntry[]
}

export interface OwnerFinanceUnitAggregate {
  unitId: string
  currency: string
  openBalanceCents: number | null
  overdueBalanceCents: number | null
  recordedPaymentsCents: number | null
  lastPaymentAt: string | null
  entryCount: number
}

export interface OwnerFinancePagination {
  limit: number
  returnedEntryCount: number
  totalEntryCount: number
  hasMore: boolean
  nextCursor: string | null
  snapshotAt: string
}

export interface OwnerFinanceData {
  contractVersion: typeof OWNER_FINANCE_CONTRACT_VERSION
  source: OwnerFinanceSource
  generatedAt: string
  scope: "verified-owner-units"
  summary: {
    currency: string
    unitCount: number
    openBalanceCents: number | null
    overdueBalanceCents: number | null
    recordedPaymentsCents: number | null
    entryCount: number
  }
  units: OwnerFinanceUnitStatement[]
  pagination: OwnerFinancePagination
  warning?: string
}

export interface OwnerFinanceBuildOptions {
  warning?: string
  aggregates?: OwnerFinanceUnitAggregate[]
  pagination?: OwnerFinancePagination
}

const OPEN_LEDGER_STATUSES = new Set(["open", "partially_paid", "overdue"])

function isOpenCharge(entry: OwnerFinanceStatementEntry) {
  return (
    entry.entryType !== "payment" &&
    entry.entryType !== "refund" &&
    OPEN_LEDGER_STATUSES.has(entry.status)
  )
}

function laterTimestamp(left: string | null, right: string | null) {
  if (!left) return right
  if (!right) return left
  return new Date(left).getTime() >= new Date(right).getTime() ? left : right
}

export function aggregateOwnerFinanceUnit(
  unit: AuthorizedUnit,
  entries: OwnerFinanceStatementEntry[]
): OwnerFinanceUnitAggregate {
  const currencies = new Set(
    entries.map((entry) => entry.currency).filter(Boolean)
  )
  const currency =
    currencies.size === 1
      ? [...currencies][0]
      : currencies.size > 1
        ? "MIXED"
        : "TRY"
  const reversedManualPaymentIds = new Set(
    entries
      .filter((entry) => entry.activityKind === "manual_payment_reversal")
      .map((entry) => entry.reversesManualPaymentId)
      .filter((id): id is string => Boolean(id))
  )
  const effectiveManualPayments = entries.filter(
    (entry) =>
      entry.activityKind === "manual_payment" &&
      (!entry.manualPaymentId ||
        !reversedManualPaymentIds.has(entry.manualPaymentId))
  )
  const effectivePayments = entries.filter(
    (entry) =>
      entry.entryType === "payment" &&
      (!entry.manualPaymentId ||
        !reversedManualPaymentIds.has(entry.manualPaymentId))
  )
  const lastPaymentAt = effectivePayments.reduce<string | null>(
    (latest, entry) => laterTimestamp(latest, entry.paidAt ?? entry.createdAt),
    null
  )

  if (currency === "MIXED") {
    return {
      unitId: unit.id,
      currency,
      openBalanceCents: null,
      overdueBalanceCents: null,
      recordedPaymentsCents: null,
      lastPaymentAt,
      entryCount: entries.length,
    }
  }

  const effectiveManualPaymentCents = effectiveManualPayments.reduce(
    (sum, entry) => sum + entry.amountCents,
    0
  )
  const grossOpenBalanceCents = entries
    .filter(isOpenCharge)
    .reduce((sum, entry) => sum + entry.amountCents, 0)
  const grossOverdueBalanceCents = entries
    .filter((entry) => isOpenCharge(entry) && entry.status === "overdue")
    .reduce((sum, entry) => sum + entry.amountCents, 0)

  return {
    unitId: unit.id,
    currency,
    openBalanceCents: Math.max(
      0,
      grossOpenBalanceCents - effectiveManualPaymentCents
    ),
    overdueBalanceCents: Math.max(
      0,
      grossOverdueBalanceCents - effectiveManualPaymentCents
    ),
    recordedPaymentsCents: effectivePayments.reduce(
      (sum, entry) => sum + entry.amountCents,
      0
    ),
    lastPaymentAt,
    entryCount: entries.length,
  }
}

function summarizeUnit(
  unit: AuthorizedUnit,
  entries: OwnerFinanceStatementEntry[],
  aggregate?: OwnerFinanceUnitAggregate
): OwnerFinanceUnitStatement {
  const totals = aggregate ?? aggregateOwnerFinanceUnit(unit, entries)
  return {
    unitId: unit.id,
    unitNo: unit.unitNo,
    currency: totals.currency,
    openBalanceCents: totals.openBalanceCents,
    overdueBalanceCents: totals.overdueBalanceCents,
    recordedPaymentsCents: totals.recordedPaymentsCents,
    lastPaymentAt: totals.lastPaymentAt,
    entries,
  }
}

export function buildOwnerFinanceData(
  source: OwnerFinanceSource,
  units: AuthorizedUnit[],
  entries: OwnerFinanceStatementEntry[],
  { warning, aggregates = [], pagination }: OwnerFinanceBuildOptions = {}
): OwnerFinanceData {
  const aggregateByUnit = new Map(
    aggregates.map((aggregate) => [aggregate.unitId, aggregate])
  )
  const statements = units.map((unit) =>
    summarizeUnit(
      unit,
      entries.filter((entry) => entry.unitId === unit.id),
      aggregateByUnit.get(unit.id)
    )
  )
  const currencies = new Set(statements.map((statement) => statement.currency))
  const summaryCurrency =
    currencies.size === 1
      ? [...currencies][0]
      : currencies.size > 1
        ? "MIXED"
        : "TRY"
  const canAggregateSummary =
    summaryCurrency !== "MIXED" &&
    statements.every(
      (statement) =>
        statement.openBalanceCents !== null &&
        statement.overdueBalanceCents !== null &&
        statement.recordedPaymentsCents !== null
    )
  const totalEntryCount =
    aggregates.length > 0
      ? aggregates.reduce((sum, aggregate) => sum + aggregate.entryCount, 0)
      : entries.length
  const generatedAt = new Date().toISOString()
  const resolvedPagination = pagination ?? {
    limit: Math.max(entries.length, 1),
    returnedEntryCount: entries.length,
    totalEntryCount,
    hasMore: false,
    nextCursor: null,
    snapshotAt: generatedAt,
  }

  return {
    contractVersion: OWNER_FINANCE_CONTRACT_VERSION,
    source,
    generatedAt,
    scope: "verified-owner-units",
    summary: {
      currency: summaryCurrency,
      unitCount: statements.length,
      openBalanceCents: canAggregateSummary
        ? statements.reduce(
            (sum, statement) => sum + (statement.openBalanceCents ?? 0),
            0
          )
        : null,
      overdueBalanceCents: canAggregateSummary
        ? statements.reduce(
            (sum, statement) => sum + (statement.overdueBalanceCents ?? 0),
            0
          )
        : null,
      recordedPaymentsCents: canAggregateSummary
        ? statements.reduce(
            (sum, statement) => sum + (statement.recordedPaymentsCents ?? 0),
            0
          )
        : null,
      entryCount: totalEntryCount,
    },
    units: statements,
    pagination: resolvedPagination,
    ...(warning ? { warning } : {}),
  }
}
