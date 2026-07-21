import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { canViewInternalFinance } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  AccountantFinanceDomainError,
  LOCAL_ACCESS_PROFILE_ID,
  applyInvoiceCreditOffset,
  getAccountantFinanceOverview,
} from "@/lib/accountant-finance-repository"

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

function hasControlCharacters(value: string) {
  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) < 32) return true
  }
  return false
}

// Accepts a major-unit amount ("48200", "48200.50", "48200,50") and converts it
// to integer minor units, bounded like the manual-payment endpoint.
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

function domainError(error: unknown) {
  if (error instanceof AccountantFinanceDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The accounting finance workspace is temporarily unavailable.",
      code: "ACCOUNTANT_FINANCE_UNAVAILABLE",
    },
    500
  )
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "ACCOUNTANT_FINANCE_UNAUTHORIZED" },
      401
    )
  }
  if (!canViewInternalFinance(profile.role)) {
    return privateJson(
      {
        error: "Your role cannot view the accounting finance workspace.",
        code: "ACCOUNTANT_FINANCE_VIEW_FORBIDDEN",
      },
      403
    )
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 24)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 24

  try {
    return privateJson(
      await getAccountantFinanceOverview(profile, {
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
      { error: "Unauthorized.", code: "ACCOUNTANT_FINANCE_UNAUTHORIZED" },
      401
    )
  }
  if (profile.role !== "admin" && profile.role !== "accountant") {
    return privateJson(
      {
        error: "Only an organization admin or accountant may offset an invoice.",
        code: "ACCOUNTANT_FINANCE_OFFSET_FORBIDDEN",
      },
      403
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      {
        error: "Cross-site request rejected.",
        code: "ACCOUNTANT_FINANCE_ORIGIN_REJECTED",
      },
      403
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await request.json())
  } catch {
    return privateJson(
      {
        error: "Request body must be valid JSON.",
        code: "ACCOUNTANT_FINANCE_JSON_INVALID",
      },
      400
    )
  }

  const invoiceId = trimmedString(body.invoiceId)
  const creditBalanceId = trimmedString(body.creditBalanceId)
  const amountCents = parseAmountToCents(body.amount)
  const reasonRaw = trimmedString(body.reason)
  const reason = reasonRaw ? reasonRaw.slice(0, 500) : null

  const validationErrors: Record<string, string> = {}
  if (!invoiceId || invoiceId.length > 120) {
    validationErrors.invoice = "Select a valid invoice."
  }
  if (!creditBalanceId || creditBalanceId.length > 120) {
    validationErrors.credit = "Select a valid credit balance."
  }
  if (amountCents === null) {
    validationErrors.amount =
      "Enter an amount greater than zero with at most two decimals."
  }
  if (reasonRaw && hasControlCharacters(reasonRaw)) {
    validationErrors.reason = "The reason contains unsupported characters."
  }

  if (Object.keys(validationErrors).length > 0 || amountCents === null) {
    return privateJson(
      {
        error: "Review the highlighted offset details.",
        code: "ACCOUNTANT_FINANCE_VALIDATION_FAILED",
        fields: validationErrors,
      },
      422
    )
  }

  try {
    const result = await applyInvoiceCreditOffset(
      profile,
      { invoiceId, creditBalanceId, amountCents, reason },
      { useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID }
    )
    return privateJson(result, 201)
  } catch (error) {
    return domainError(error)
  }
}
