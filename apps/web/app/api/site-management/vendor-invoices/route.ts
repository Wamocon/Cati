import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile, type UserProfile } from "@/lib/auth"
import { hasAnyRolePermission } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  LOCAL_ACCESS_PROFILE_ID,
  VendorInvoiceDomainError,
  getVendorWorkspace,
  reviewInvoice,
  submitInvoice,
  type ReviewDecision,
  type SubmitInvoiceLineInput,
} from "@/lib/vendor-invoice-repository"

export const dynamic = "force-dynamic"

const MAX_LINES = 200

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

// Accepts a major-unit amount ("500", "500.50", "500,50") and converts it to
// integer minor units. Unlike the wallet parser this allows zero (a discount /
// bundled line); the invoice total is validated separately in the repository.
function parsePriceToCents(value: unknown) {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return null
    const cents = Math.round(value * 100)
    return cents >= 0 && cents <= 1_000_000_000_000 ? cents : null
  }
  const amount = trimmedString(value).replace(",", ".")
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/.exec(amount)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0")
  const cents = whole * 100 + fraction
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1_000_000_000_000) {
    return null
  }
  return cents
}

function parseQuantity(value: unknown) {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value.trim().replace(",", "."))
        : NaN
  if (!Number.isFinite(raw) || raw <= 0 || raw > 1_000_000) return null
  return raw
}

function parseTaxRate(value: unknown) {
  if (value === undefined || value === null || value === "") return 0
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim().replace(",", "."))
        : NaN
  if (!Number.isFinite(raw) || raw < 0 || raw > 100) return null
  return raw
}

interface ParsedLines {
  lines?: SubmitInvoiceLineInput[]
  error?: string
}

function parseLines(value: unknown): ParsedLines {
  if (!Array.isArray(value) || value.length === 0) {
    return { error: "Add at least one invoice line." }
  }
  if (value.length > MAX_LINES) {
    return { error: `An invoice may not exceed ${MAX_LINES} lines.` }
  }
  const lines: SubmitInvoiceLineInput[] = []
  for (const raw of value) {
    const record = asRecord(raw)
    const description = trimmedString(record.description)
    if (description.length > 300 || hasControlCharacters(description)) {
      return { error: "A line description is invalid." }
    }
    const quantity = parseQuantity(record.quantity ?? 1)
    if (quantity === null) {
      return { error: "Each line quantity must be greater than zero." }
    }
    const unitPriceCents = parsePriceToCents(record.unitPrice ?? record.unitPriceCents)
    if (unitPriceCents === null) {
      return { error: "Each line unit price must be a valid amount." }
    }
    const taxRate = parseTaxRate(record.taxRate)
    if (taxRate === null) {
      return { error: "Each line tax rate must be between 0 and 100." }
    }
    lines.push({
      description: description || null,
      quantity,
      unitPriceCents,
      taxRate,
    })
  }
  return { lines }
}

function canViewVendorInvoices(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "vendor_invoices", "view")
}

function canSubmitVendorInvoices(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "vendor_invoices", "create")
}

function canReviewVendorInvoices(profile: UserProfile) {
  return profile.role === "admin" || profile.role === "accountant"
}

function domainError(error: unknown) {
  if (error instanceof VendorInvoiceDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The vendor invoicing workspace is temporarily unavailable.",
      code: "VENDOR_INVOICE_UNAVAILABLE",
    },
    500
  )
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "VENDOR_INVOICE_UNAUTHORIZED" },
      401
    )
  }
  if (!canViewVendorInvoices(profile)) {
    return privateJson(
      {
        error: "Your role cannot view the vendor invoicing workspace.",
        code: "VENDOR_INVOICE_VIEW_FORBIDDEN",
      },
      403
    )
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 25)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 25

  try {
    return privateJson(
      await getVendorWorkspace(profile, {
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
      { error: "Unauthorized.", code: "VENDOR_INVOICE_UNAUTHORIZED" },
      401
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      {
        error: "Cross-site request rejected.",
        code: "VENDOR_INVOICE_ORIGIN_REJECTED",
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
        code: "VENDOR_INVOICE_JSON_INVALID",
      },
      400
    )
  }

  const action = trimmedString(body.action)
  if (action !== "submit" && action !== "review") {
    return privateJson(
      {
        error: "Choose an action: submit or review.",
        code: "VENDOR_INVOICE_ACTION_INVALID",
      },
      422
    )
  }

  const idempotencyKey = trimmedString(body.idempotencyKey)
  const useLocalAccessProfile = profile.id === LOCAL_ACCESS_PROFILE_ID

  try {
    if (action === "submit") {
      if (!canSubmitVendorInvoices(profile)) {
        return privateJson(
          {
            error: "Your role cannot issue vendor invoices.",
            code: "VENDOR_INVOICE_SUBMIT_FORBIDDEN",
          },
          403
        )
      }

      const invoiceNo = trimmedString(body.invoiceNo)
      const serviceOrderId = trimmedString(body.serviceOrderId)
      const dueAtRaw = trimmedString(body.dueAt)
      const parsedLines = parseLines(body.lines)

      const validationErrors: Record<string, string> = {}
      if (!invoiceNo || invoiceNo.length > 120 || hasControlCharacters(invoiceNo)) {
        validationErrors.invoiceNo =
          "Enter an invoice number of at most 120 characters."
      }
      if (!idempotencyKey || idempotencyKey.length > 200) {
        validationErrors.idempotencyKey = "A valid idempotency key is required."
      }
      if (parsedLines.error) {
        validationErrors.lines = parsedLines.error
      }
      let dueAt: string | null = null
      if (dueAtRaw) {
        const parsed = Date.parse(dueAtRaw)
        if (!Number.isFinite(parsed)) {
          validationErrors.dueAt = "Enter a valid due date."
        } else {
          dueAt = new Date(parsed).toISOString()
        }
      }
      if (Object.keys(validationErrors).length > 0 || !parsedLines.lines) {
        return privateJson(
          {
            error: "Review the highlighted invoice details.",
            code: "VENDOR_INVOICE_VALIDATION_FAILED",
            fields: validationErrors,
          },
          422
        )
      }

      const result = await submitInvoice(
        profile,
        {
          invoiceNo,
          lines: parsedLines.lines,
          serviceOrderId: serviceOrderId || null,
          dueAt,
          idempotencyKey,
        },
        { useLocalAccessProfile }
      )
      return privateJson(result, 201)
    }

    // action === "review"
    if (!canReviewVendorInvoices(profile)) {
      return privateJson(
        {
          error: "Only an admin or accountant may review a vendor invoice.",
          code: "VENDOR_INVOICE_REVIEW_FORBIDDEN",
        },
        403
      )
    }

    const invoiceId = trimmedString(body.invoiceId)
    const decisionRaw = trimmedString(body.decision)
    const reasonRaw = trimmedString(body.reason)
    const validationErrors: Record<string, string> = {}
    if (!invoiceId || invoiceId.length > 100) {
      validationErrors.invoiceId = "Select a valid invoice."
    }
    if (
      decisionRaw !== "approve" &&
      decisionRaw !== "decline" &&
      decisionRaw !== "review"
    ) {
      validationErrors.decision = "Choose approve, decline or review."
    }
    if (!idempotencyKey || idempotencyKey.length > 200) {
      validationErrors.idempotencyKey = "A valid idempotency key is required."
    }
    if (reasonRaw && hasControlCharacters(reasonRaw)) {
      validationErrors.reason = "The reason contains unsupported characters."
    }
    if (Object.keys(validationErrors).length > 0) {
      return privateJson(
        {
          error: "Review the highlighted decision details.",
          code: "VENDOR_INVOICE_VALIDATION_FAILED",
          fields: validationErrors,
        },
        422
      )
    }

    const result = await reviewInvoice(
      profile,
      {
        invoiceId,
        decision: decisionRaw as ReviewDecision,
        reason: reasonRaw ? reasonRaw.slice(0, 500) : null,
        idempotencyKey,
      },
      { useLocalAccessProfile }
    )
    return privateJson(result, 200)
  } catch (error) {
    return domainError(error)
  }
}
