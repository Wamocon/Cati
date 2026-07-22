import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile, type UserProfile } from "@/lib/auth"
import { hasAnyRolePermission } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  LOCAL_ACCESS_PROFILE_ID,
  WalletDomainError,
  getWalletOverview,
  spendFromWallet,
  topUpWallet,
  transferAllowance,
} from "@/lib/wallet-repository"

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

// Accepts a major-unit amount ("500", "500.50", "500,50") and converts it to
// integer minor units, bounded like the accountant / manual-payment endpoints.
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

function canViewWallet(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "wallet", "view") ||
    profile.role === "admin" ||
    profile.role === "accountant"
  )
}

function canFundOrSpend(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "wallet", "create") ||
    profile.role === "admin" ||
    profile.role === "accountant"
  )
}

function canTransfer(profile: UserProfile) {
  return (
    hasAnyRolePermission(profile.roles, "wallet", "create") ||
    profile.role === "admin"
  )
}

function domainError(error: unknown) {
  if (error instanceof WalletDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The wallet workspace is temporarily unavailable.",
      code: "WALLET_UNAVAILABLE",
    },
    500
  )
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson({ error: "Unauthorized.", code: "WALLET_UNAUTHORIZED" }, 401)
  }
  if (!canViewWallet(profile)) {
    return privateJson(
      {
        error: "Your role cannot view the wallet workspace.",
        code: "WALLET_VIEW_FORBIDDEN",
      },
      403
    )
  }

  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 20)
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100)
    : 20

  try {
    return privateJson(
      await getWalletOverview(profile, {
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
    return privateJson({ error: "Unauthorized.", code: "WALLET_UNAUTHORIZED" }, 401)
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      { error: "Cross-site request rejected.", code: "WALLET_ORIGIN_REJECTED" },
      403
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await request.json())
  } catch {
    return privateJson(
      { error: "Request body must be valid JSON.", code: "WALLET_JSON_INVALID" },
      400
    )
  }

  const action = trimmedString(body.action)
  if (action !== "topup" && action !== "spend" && action !== "transfer") {
    return privateJson(
      {
        error: "Choose a wallet action: topup, spend or transfer.",
        code: "WALLET_ACTION_INVALID",
      },
      422
    )
  }

  const amountCents = parseAmountToCents(body.amount)
  const idempotencyKey = trimmedString(body.idempotencyKey)

  const validationErrors: Record<string, string> = {}
  if (amountCents === null) {
    validationErrors.amount =
      "Enter an amount greater than zero with at most two decimals."
  }
  if (!idempotencyKey || idempotencyKey.length > 200) {
    validationErrors.idempotencyKey = "A valid idempotency key is required."
  }

  const useLocalAccessProfile = profile.id === LOCAL_ACCESS_PROFILE_ID

  try {
    if (action === "topup") {
      if (!canFundOrSpend(profile)) {
        return privateJson(
          {
            error: "Your role cannot top up a wallet.",
            code: "WALLET_TOPUP_FORBIDDEN",
          },
          403
        )
      }
      if (Object.keys(validationErrors).length > 0 || amountCents === null) {
        return privateJson(
          {
            error: "Review the highlighted top-up details.",
            code: "WALLET_VALIDATION_FAILED",
            fields: validationErrors,
          },
          422
        )
      }
      const result = await topUpWallet(
        profile,
        { amountCents, idempotencyKey },
        { useLocalAccessProfile }
      )
      return privateJson(result, 201)
    }

    if (action === "spend") {
      if (!canFundOrSpend(profile)) {
        return privateJson(
          {
            error: "Your role cannot spend from a wallet.",
            code: "WALLET_SPEND_FORBIDDEN",
          },
          403
        )
      }
      const operationRaw = trimmedString(body.operation)
      const reasonRaw = trimmedString(body.reason)
      if (operationRaw && (operationRaw.length > 120 || hasControlCharacters(operationRaw))) {
        validationErrors.operation = "The operation label is invalid."
      }
      if (reasonRaw && hasControlCharacters(reasonRaw)) {
        validationErrors.reason = "The reason contains unsupported characters."
      }
      if (Object.keys(validationErrors).length > 0 || amountCents === null) {
        return privateJson(
          {
            error: "Review the highlighted spend details.",
            code: "WALLET_VALIDATION_FAILED",
            fields: validationErrors,
          },
          422
        )
      }
      const result = await spendFromWallet(
        profile,
        {
          amountCents,
          operation: operationRaw || "spend",
          reason: reasonRaw ? reasonRaw.slice(0, 500) : null,
          idempotencyKey,
        },
        { useLocalAccessProfile }
      )
      return privateJson(result, 201)
    }

    // action === "transfer"
    if (!canTransfer(profile)) {
      return privateJson(
        {
          error: "Your role cannot transfer an allowance.",
          code: "WALLET_TRANSFER_FORBIDDEN",
        },
        403
      )
    }
    const toWalletId = trimmedString(body.toWalletId)
    if (!toWalletId || toWalletId.length > 120) {
      validationErrors.toWalletId = "Select a valid destination wallet."
    }
    if (Object.keys(validationErrors).length > 0 || amountCents === null) {
      return privateJson(
        {
          error: "Review the highlighted transfer details.",
          code: "WALLET_VALIDATION_FAILED",
          fields: validationErrors,
        },
        422
      )
    }
    const result = await transferAllowance(
      profile,
      { toWalletId, amountCents, idempotencyKey },
      { useLocalAccessProfile }
    )
    return privateJson(result, 201)
  } catch (error) {
    return domainError(error)
  }
}
