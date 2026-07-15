import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  getManualPaymentWorkspace,
  LOCAL_ACCESS_PROFILE_ID,
  ManualPaymentDomainError,
  postManualPayment,
  reverseManualPayment,
  type ManualPaymentMethod,
} from "@/lib/manual-payment-repository"
import { canViewInternalFinance } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"

export const dynamic = "force-dynamic"

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store, max-age=0",
      vary: "Cookie",
    },
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function trimmedString(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function parseAmountToCents(value: unknown) {
  const amount = trimmedString(value).replace(",", ".")
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

function readIdempotencyKey(request: NextRequest) {
  const key = request.headers.get("idempotency-key")?.trim() ?? ""
  return key.length >= 8 && key.length <= 200 ? key : null
}

function domainError(error: unknown) {
  if (error instanceof ManualPaymentDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The manual payment workspace is temporarily unavailable.",
      code: "MANUAL_PAYMENT_UNAVAILABLE",
    },
    500
  )
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "MANUAL_PAYMENT_UNAUTHORIZED" },
      401
    )
  }
  if (!canViewInternalFinance(profile.role)) {
    return privateJson(
      {
        error: "Your role cannot view the internal payment workspace.",
        code: "MANUAL_PAYMENT_VIEW_FORBIDDEN",
      },
      403
    )
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 50)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 50
  try {
    return privateJson(
      await getManualPaymentWorkspace(profile, {
        limit,
        useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID,
      })
    )
  } catch (error) {
    return domainError(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "MANUAL_PAYMENT_UNAUTHORIZED" },
      401
    )
  }
  if (profile.role !== "admin" && profile.role !== "accountant") {
    return privateJson(
      {
        error: "Only an organization admin or accountant may post a manual payment.",
        code: "MANUAL_PAYMENT_POST_FORBIDDEN",
      },
      403
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      { error: "Cross-site request rejected.", code: "MANUAL_PAYMENT_ORIGIN_REJECTED" },
      403
    )
  }
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) {
    return privateJson(
      {
        error: "A valid Idempotency-Key header is required.",
        code: "MANUAL_PAYMENT_IDEMPOTENCY_REQUIRED",
      },
      400
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await request.json())
  } catch {
    return privateJson(
      { error: "Request body must be valid JSON.", code: "MANUAL_PAYMENT_JSON_INVALID" },
      400
    )
  }

  const unitId = trimmedString(body.unitId)
  const ownerResidentId = trimmedString(body.ownerResidentId)
  const amountCents = parseAmountToCents(body.amount)
  const currency = trimmedString(body.currency).toUpperCase()
  const receivedAtInput = trimmedString(body.receivedAt)
  const receivedAtDate = new Date(receivedAtInput)
  const reference = trimmedString(body.reference)
  const method = trimmedString(body.method) as ManualPaymentMethod
  const businessNote = trimmedString(body.businessNote)

  const validationErrors: Record<string, string> = {}
  if (!unitId || unitId.length > 120) validationErrors.account = "Select a valid unit and owner account."
  if (!ownerResidentId || ownerResidentId.length > 120) validationErrors.account = "Select a valid unit and owner account."
  if (amountCents === null) validationErrors.amount = "Enter an amount greater than zero with at most two decimals."
  if (!/^[A-Z]{3}$/.test(currency)) validationErrors.currency = "Use a three-letter currency code."
  if (
    !receivedAtInput ||
    Number.isNaN(receivedAtDate.getTime()) ||
    receivedAtDate.getTime() > Date.now() + 5 * 60_000 ||
    receivedAtDate.getTime() < Date.now() - 10 * 365.25 * 24 * 60 * 60_000
  ) {
    validationErrors.receivedAt = "Choose a valid received date that is not in the future."
  }
  if (reference.length < 3 || reference.length > 100 || /[\u0000-\u001f]/.test(reference)) {
    validationErrors.reference = "Reference must contain 3 to 100 printable characters."
  }
  if (!["bank_transfer", "cash", "card_terminal", "other"].includes(method)) {
    validationErrors.method = "Choose a supported manual payment method."
  }
  if (businessNote.length < 10 || businessNote.length > 1000) {
    validationErrors.businessNote = "Business note must contain 10 to 1000 characters."
  }

  if (Object.keys(validationErrors).length > 0 || amountCents === null) {
    return privateJson(
      {
        error: "Review the highlighted payment details.",
        code: "MANUAL_PAYMENT_VALIDATION_FAILED",
        fields: validationErrors,
      },
      422
    )
  }

  try {
    const payment = await postManualPayment(
      profile,
      {
        unitId,
        ownerResidentId,
        amountCents,
        currency,
        receivedAt: receivedAtDate.toISOString(),
        reference,
        method,
        businessNote,
        idempotencyKey,
      },
      { useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID }
    )
    return privateJson(payment, payment.replayed ? 200 : 201)
  } catch (error) {
    return domainError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "MANUAL_PAYMENT_UNAUTHORIZED" },
      401
    )
  }
  if (profile.role !== "admin" && profile.role !== "accountant") {
    return privateJson(
      {
        error: "Only an organization admin or accountant may reverse a manual payment.",
        code: "MANUAL_PAYMENT_REVERSE_FORBIDDEN",
      },
      403
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      { error: "Cross-site request rejected.", code: "MANUAL_PAYMENT_ORIGIN_REJECTED" },
      403
    )
  }
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) {
    return privateJson(
      {
        error: "A valid Idempotency-Key header is required.",
        code: "MANUAL_PAYMENT_IDEMPOTENCY_REQUIRED",
      },
      400
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await request.json())
  } catch {
    return privateJson(
      { error: "Request body must be valid JSON.", code: "MANUAL_PAYMENT_JSON_INVALID" },
      400
    )
  }
  const paymentId = trimmedString(body.paymentId)
  const expectedVersion = Number(body.expectedVersion)
  const reason = trimmedString(body.reason)
  if (
    !paymentId ||
    paymentId.length > 120 ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 1 ||
    reason.length < 10 ||
    reason.length > 1000
  ) {
    return privateJson(
      {
        error: "Payment, current version, and a clear reversal reason are required.",
        code: "MANUAL_PAYMENT_REVERSAL_INVALID",
      },
      422
    )
  }

  try {
    return privateJson(
      await reverseManualPayment(
        profile,
        { paymentId, expectedVersion, reason, idempotencyKey },
        { useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID }
      )
    )
  } catch (error) {
    return domainError(error)
  }
}
