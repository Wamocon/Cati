import { isSupabaseConfigured } from "@/lib/auth"
import { getLocalManualPaymentLedgerProjection } from "@/lib/manual-payment-repository"
import {
  accessibleUnitsForRole,
  normalizeUnitNo,
} from "@/lib/role-scoped-views"
import { flats } from "@/lib/site-management-data"
import { createClient } from "@/lib/supabase/server"
import {
  aggregateOwnerFinanceUnit,
  buildOwnerFinanceData,
  type OwnerFinanceData,
  type OwnerFinanceStatementEntry,
  type OwnerFinanceUnitAggregate,
} from "@/lib/owner-finance-projection"

export {
  buildOwnerFinanceData,
  OWNER_FINANCE_CONTRACT_VERSION,
} from "@/lib/owner-finance-projection"
export type {
  AuthorizedUnit,
  OwnerFinanceData,
  OwnerFinancePagination,
  OwnerFinanceSource,
  OwnerFinanceStatementEntry,
  OwnerFinanceUnitAggregate,
  OwnerFinanceUnitStatement,
} from "@/lib/owner-finance-projection"

export class OwnerFinanceScopeError extends Error {
  readonly code = "OWNER_FINANCE_UNIT_FORBIDDEN"

  constructor() {
    super(
      "The requested unit is outside the authenticated owner's verified scope."
    )
    this.name = "OwnerFinanceScopeError"
  }
}

interface OwnerFinanceQuery {
  limit?: number
  cursor?: string | null
  snapshotAt?: string | null
  unitNo?: string | null
  useLocalAccessProfile?: boolean
}

interface OwnerFinanceCursor {
  createdAt: string
  id: string
}

interface ValidatedOwnerFinanceWindow {
  cursor: OwnerFinanceCursor | null
  snapshotAt: string | null
}

const OWNER_FINANCE_CURSOR_VERSION = 1
const CURSOR_ID_PATTERN = /^[A-Za-z0-9_-]{1,160}$/
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CANONICAL_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3,6})?(?:Z|[+-]\d{2}:\d{2})$/
const MAX_CLOCK_SKEW_MS = 5_000

export class OwnerFinancePaginationError extends Error {
  readonly code = "OWNER_FINANCE_PAGINATION_INVALID"

  constructor(
    message = "The statement pagination token is invalid or expired."
  ) {
    super(message)
    this.name = "OwnerFinancePaginationError"
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null
}

function asCents(value: unknown) {
  const number = typeof value === "number" ? value : Number(value)
  return Number.isSafeInteger(number) && number >= 0 ? number : 0
}

function asBoolean(value: unknown) {
  return value === true
}

function canonicalTimestamp(value: unknown) {
  if (typeof value !== "string" || !CANONICAL_TIMESTAMP_PATTERN.test(value))
    return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return value
}

function requireCanonicalTimestamp(value: unknown) {
  const canonical = canonicalTimestamp(value)
  if (!canonical) {
    throw new OwnerFinancePaginationError()
  }
  return canonical
}

export function encodeOwnerFinanceCursor(cursor: OwnerFinanceCursor) {
  const createdAt = requireCanonicalTimestamp(cursor.createdAt)
  if (!CURSOR_ID_PATTERN.test(cursor.id)) {
    throw new OwnerFinancePaginationError()
  }
  return Buffer.from(
    JSON.stringify({
      v: OWNER_FINANCE_CURSOR_VERSION,
      createdAt,
      id: cursor.id,
    }),
    "utf8"
  ).toString("base64url")
}

export function decodeOwnerFinanceCursor(encoded: string) {
  if (
    typeof encoded !== "string" ||
    encoded.length < 8 ||
    encoded.length > 512 ||
    !/^[A-Za-z0-9_-]+$/.test(encoded)
  ) {
    throw new OwnerFinancePaginationError()
  }

  try {
    const buffer = Buffer.from(encoded, "base64url")
    if (buffer.toString("base64url") !== encoded) {
      throw new OwnerFinancePaginationError()
    }
    const parsed = JSON.parse(buffer.toString("utf8")) as Record<
      string,
      unknown
    >
    if (
      Object.keys(parsed).sort().join(",") !== "createdAt,id,v" ||
      parsed.v !== OWNER_FINANCE_CURSOR_VERSION ||
      typeof parsed.id !== "string" ||
      !CURSOR_ID_PATTERN.test(parsed.id)
    ) {
      throw new OwnerFinancePaginationError()
    }
    return {
      createdAt: requireCanonicalTimestamp(parsed.createdAt),
      id: parsed.id,
    } satisfies OwnerFinanceCursor
  } catch (error) {
    if (error instanceof OwnerFinancePaginationError) throw error
    throw new OwnerFinancePaginationError()
  }
}

function validateOwnerFinanceWindow(
  cursorValue: string | null | undefined,
  snapshotValue: string | null | undefined
): ValidatedOwnerFinanceWindow {
  const hasCursor = cursorValue !== null && cursorValue !== undefined
  const hasSnapshot = snapshotValue !== null && snapshotValue !== undefined
  if (hasCursor !== hasSnapshot) {
    throw new OwnerFinancePaginationError()
  }
  if (!hasCursor || !hasSnapshot) {
    return { cursor: null, snapshotAt: null }
  }

  const cursor = decodeOwnerFinanceCursor(cursorValue)
  const snapshotAt = requireCanonicalTimestamp(snapshotValue)
  if (new Date(snapshotAt).getTime() > Date.now() + MAX_CLOCK_SKEW_MS) {
    throw new OwnerFinancePaginationError()
  }
  if (new Date(cursor.createdAt).getTime() > new Date(snapshotAt).getTime()) {
    throw new OwnerFinancePaginationError()
  }
  return { cursor, snapshotAt }
}

function safeLimit(value = 40) {
  return Math.min(Math.max(Math.trunc(value), 1), 100)
}

function localOwnerFinanceData({
  limit,
  window,
  unitNo,
}: Required<Pick<OwnerFinanceQuery, "limit">> & {
  window: ValidatedOwnerFinanceWindow
} & Pick<OwnerFinanceQuery, "unitNo">) {
  const ownerScope = accessibleUnitsForRole("owner")
  const requestedUnitNo = normalizeUnitNo(unitNo)

  if (requestedUnitNo && !ownerScope?.has(requestedUnitNo)) {
    throw new OwnerFinanceScopeError()
  }

  const authorizedFlats = flats.filter(
    (flat) =>
      ownerScope?.has(flat.number) &&
      (!requestedUnitNo || flat.number === requestedUnitNo)
  )
  const units = authorizedFlats.map((flat) => ({
    id: flat.id,
    unitNo: flat.number,
  }))
  const baseEntries = authorizedFlats.flatMap<OwnerFinanceStatementEntry>(
    (flat) => {
      const payment: OwnerFinanceStatementEntry = {
        id: `owner-payment-${flat.id}`,
        unitId: flat.id,
        unitNo: flat.number,
        entryType: "payment",
        period: "2026-06",
        dueDate: null,
        paidAt: flat.lastPaymentAt,
        postedAt: flat.lastPaymentAt,
        createdAt: flat.lastPaymentAt,
        status: "paid",
        amountCents: flat.monthlyFeeTry * 100,
        currency: "TRY",
        description: "Recorded dues payment",
        activityKind: "standard",
        reconciliationStatus: null,
        manualPaymentId: null,
        reversesManualPaymentId: null,
      }
      if (flat.balanceTry <= 0) return [payment]

      return [
        {
          id: `owner-charge-${flat.id}`,
          unitId: flat.id,
          unitNo: flat.number,
          entryType: "dues",
          period: "2026-06",
          dueDate: "2026-06-30",
          paidAt: null,
          postedAt: "2026-06-01T09:00:00.000Z",
          createdAt: "2026-06-01T09:00:00.000Z",
          status: flat.paymentStatus === "minor_debt" ? "open" : "overdue",
          amountCents: flat.balanceTry * 100,
          currency: "TRY",
          description: "Outstanding residential dues",
          activityKind: "standard",
          reconciliationStatus: null,
          manualPaymentId: null,
          reversesManualPaymentId: null,
        },
        payment,
      ]
    }
  )
  const unitNoById = new Map(units.map((unit) => [unit.id, unit.unitNo]))
  const manualEntries = getLocalManualPaymentLedgerProjection(
    new Set(units.map((unit) => unit.id))
  ).flatMap<OwnerFinanceStatementEntry>((entry) => {
    const authorizedUnitNo = unitNoById.get(entry.unitId)
    if (!authorizedUnitNo) return []
    const { metadata, ...safeEntry } = entry
    return [
      {
        ...safeEntry,
        unitNo: authorizedUnitNo,
        period: null,
        activityKind:
          metadata.direction === "reversal"
            ? "manual_payment_reversal"
            : "manual_payment",
        reconciliationStatus: metadata.reconciliationStatus ?? null,
        manualPaymentId: metadata.manualPaymentId ?? null,
        reversesManualPaymentId: metadata.reversesManualPaymentId ?? null,
      },
    ]
  })
  const snapshotAt = window.snapshotAt ?? new Date().toISOString()
  const snapshotTime = new Date(snapshotAt).getTime()
  const cursorTime = window.cursor
    ? new Date(window.cursor.createdAt).getTime()
    : null
  const allEntries = [...baseEntries, ...manualEntries]
    .filter((entry) => new Date(entry.createdAt).getTime() <= snapshotTime)
    .sort(
      (left, right) =>
        new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime() || right.id.localeCompare(left.id)
    )

  if (
    window.cursor &&
    !allEntries.some(
      (entry) =>
        entry.id === window.cursor?.id &&
        new Date(entry.createdAt).getTime() === cursorTime
    )
  ) {
    throw new OwnerFinancePaginationError()
  }

  const candidates = allEntries
    .filter(
      (entry) =>
        !window.cursor ||
        new Date(entry.createdAt).getTime() < (cursorTime ?? 0) ||
        (new Date(entry.createdAt).getTime() === cursorTime &&
          entry.id < window.cursor.id)
    )
    .slice(0, limit + 1)
  const entries = candidates.slice(0, limit)
  const hasMore = candidates.length > limit
  const lastEntry = entries.at(-1)
  const aggregates = units.map((unit) =>
    aggregateOwnerFinanceUnit(
      unit,
      allEntries.filter((entry) => entry.unitId === unit.id)
    )
  )
  const returnedEntryCount = entries.length

  return buildOwnerFinanceData("local-seed", units, entries, {
    warning:
      "Local access profiles use deterministic demo statement data. Production reads require authenticated Supabase owner relationships.",
    aggregates,
    pagination: {
      limit,
      returnedEntryCount,
      totalEntryCount: allEntries.length,
      hasMore,
      nextCursor:
        hasMore && lastEntry
          ? encodeOwnerFinanceCursor({
              createdAt: lastEntry.createdAt,
              id: lastEntry.id,
            })
          : null,
      snapshotAt,
    },
  })
}

function normalizeLiveEntries(
  rows: unknown,
  unitNoById: Map<string, string>
): OwnerFinanceStatementEntry[] {
  if (!Array.isArray(rows)) return []

  return rows.flatMap((row) => {
    const record = asRecord(row)
    const unitId = asString(record.unit_id)
    const unitNo = unitNoById.get(unitId)
    const id = asString(record.id)
    if (!id || !unitId || !unitNo) return []

    const metadata = asRecord(record.metadata)
    const source = asString(metadata.source)
    const direction = asString(metadata.direction)
    const activityKind =
      source === "manual_payment_reversal" && direction === "reversal"
        ? "manual_payment_reversal"
        : source === "manual_payment" && direction === "receipt"
          ? "manual_payment"
          : "standard"

    return [
      {
        id,
        unitId,
        unitNo,
        entryType: asString(record.entry_type, "adjustment"),
        period: asNullableString(record.period),
        dueDate: asNullableString(record.due_date),
        paidAt: asNullableString(record.paid_at),
        postedAt: asNullableString(record.posted_at),
        createdAt:
          canonicalTimestamp(record.created_at) ?? new Date(0).toISOString(),
        status: asString(record.status, "open"),
        amountCents: asCents(record.amount_cents),
        currency: asString(record.currency, "TRY"),
        description: asNullableString(record.description),
        activityKind,
        reconciliationStatus:
          metadata.reconciliationStatus === "unreconciled" ||
          metadata.reconciliationStatus === "reconciled"
            ? metadata.reconciliationStatus
            : null,
        manualPaymentId:
          activityKind === "manual_payment"
            ? asNullableString(metadata.manualPaymentId)
            : null,
        reversesManualPaymentId:
          activityKind === "manual_payment_reversal"
            ? asNullableString(metadata.reversesManualPaymentId)
            : null,
      },
    ]
  })
}

function normalizeLiveAggregates(
  rows: unknown,
  authorizedUnitIds: ReadonlySet<string>
): OwnerFinanceUnitAggregate[] {
  if (!Array.isArray(rows)) return []

  return rows.flatMap((row) => {
    const record = asRecord(row)
    const unitId = asString(record.unit_id)
    if (!unitId || !authorizedUnitIds.has(unitId)) return []
    const currency = asString(record.currency, "TRY")
    const mixedCurrency = currency.toUpperCase() === "MIXED"
    return [
      {
        unitId,
        currency,
        openBalanceCents: mixedCurrency
          ? null
          : asCents(record.open_balance_cents),
        overdueBalanceCents: mixedCurrency
          ? null
          : asCents(record.overdue_balance_cents),
        recordedPaymentsCents: mixedCurrency
          ? null
          : asCents(record.recorded_payments_cents),
        lastPaymentAt: asNullableString(record.last_payment_at),
        entryCount: asCents(record.entry_count),
      },
    ]
  })
}

export async function getOwnerFinanceData({
  limit = 40,
  cursor = null,
  snapshotAt = null,
  unitNo = null,
  useLocalAccessProfile = false,
}: OwnerFinanceQuery = {}): Promise<OwnerFinanceData> {
  const boundedLimit = safeLimit(limit)
  const window = validateOwnerFinanceWindow(cursor, snapshotAt)

  if (!isSupabaseConfigured() || useLocalAccessProfile) {
    return localOwnerFinanceData({
      limit: boundedLimit,
      window,
      unitNo,
    })
  }

  const requestedUnitNo = normalizeUnitNo(unitNo)
  if (window.cursor && !UUID_PATTERN.test(window.cursor.id)) {
    throw new OwnerFinancePaginationError()
  }
  const supabase = await createClient()
  const workspaceResponse = await supabase.rpc("owner_finance_workspace", {
    p_unit_no: requestedUnitNo,
    p_limit: boundedLimit,
    p_snapshot_at: window.snapshotAt,
    p_cursor_created_at: window.cursor?.createdAt ?? null,
    p_cursor_id: window.cursor?.id ?? null,
  })
  if (workspaceResponse.error) {
    if (
      workspaceResponse.error.code === "42501" &&
      /outside the authenticated owner scope/i.test(
        workspaceResponse.error.message
      )
    ) {
      throw new OwnerFinanceScopeError()
    }
    if (
      workspaceResponse.error.code === "22023" &&
      /pagination|snapshot|cursor/i.test(workspaceResponse.error.message)
    ) {
      throw new OwnerFinancePaginationError()
    }
    throw workspaceResponse.error
  }

  const workspace = asRecord(workspaceResponse.data)
  if (workspace.contractVersion !== "owner-finance.v2") {
    throw new Error("Owner finance workspace returned an unsupported contract.")
  }
  const rawPagination = asRecord(workspace.pagination)
  const resolvedSnapshotAt = canonicalTimestamp(rawPagination.snapshotAt)
  if (
    !resolvedSnapshotAt ||
    new Date(resolvedSnapshotAt).getTime() > Date.now() + MAX_CLOCK_SKEW_MS ||
    (window.snapshotAt !== null && resolvedSnapshotAt !== window.snapshotAt)
  ) {
    throw new OwnerFinancePaginationError()
  }
  const units = Array.isArray(workspace.units)
    ? workspace.units.flatMap((row) => {
        const record = asRecord(row)
        const id = asString(record.id)
        const authorizedUnitNo = normalizeUnitNo(asString(record.unit_no))
        return id && authorizedUnitNo ? [{ id, unitNo: authorizedUnitNo }] : []
      })
    : []

  if (
    requestedUnitNo &&
    !units.some((unit) => unit.unitNo === requestedUnitNo)
  ) {
    throw new OwnerFinanceScopeError()
  }

  if (units.length === 0) {
    return buildOwnerFinanceData("supabase", [], [], {
      pagination: {
        limit: boundedLimit,
        returnedEntryCount: 0,
        totalEntryCount: 0,
        hasMore: false,
        nextCursor: null,
        snapshotAt: resolvedSnapshotAt,
      },
    })
  }

  const unitNoById = new Map(units.map((unit) => [unit.id, unit.unitNo]))
  if (!Array.isArray(workspace.aggregates)) {
    throw new Error("Owner finance workspace omitted full-ledger aggregates.")
  }
  const aggregates = normalizeLiveAggregates(
    workspace.aggregates,
    new Set(units.map((unit) => unit.id))
  )
  const entries = normalizeLiveEntries(workspace.entries, unitNoById)
  const totalEntryCount = aggregates.reduce(
    (sum, aggregate) => sum + aggregate.entryCount,
    0
  )
  const returnedEntryCount = entries.length
  const hasMore = asBoolean(rawPagination.hasMore)
  if (
    asCents(rawPagination.returnedEntryCount) !== returnedEntryCount ||
    asCents(rawPagination.totalEntryCount) !== totalEntryCount ||
    entries.some(
      (entry) =>
        new Date(entry.createdAt).getTime() >
        new Date(resolvedSnapshotAt).getTime()
    )
  ) {
    throw new Error(
      "Owner finance workspace returned inconsistent snapshot totals."
    )
  }

  const nextCursorRecord = asRecord(rawPagination.nextCursor)
  const nextCursorCreatedAt = canonicalTimestamp(nextCursorRecord.createdAt)
  const nextCursorId = asString(nextCursorRecord.id)
  const lastEntry = entries.at(-1)
  const nextCursor = hasMore
    ? nextCursorCreatedAt &&
      nextCursorId &&
      lastEntry &&
      new Date(lastEntry.createdAt).getTime() ===
        new Date(nextCursorCreatedAt).getTime() &&
      lastEntry.id === nextCursorId &&
      new Date(nextCursorCreatedAt).getTime() <=
        new Date(resolvedSnapshotAt).getTime()
      ? encodeOwnerFinanceCursor({
          createdAt: nextCursorCreatedAt,
          id: nextCursorId,
        })
      : (() => {
          throw new Error(
            "Owner finance workspace returned an invalid next cursor."
          )
        })()
    : null

  return buildOwnerFinanceData("supabase", units, entries, {
    aggregates,
    pagination: {
      limit: boundedLimit,
      returnedEntryCount,
      totalEntryCount,
      hasMore,
      nextCursor,
      snapshotAt: resolvedSnapshotAt,
    },
  })
}
