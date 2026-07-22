import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile, type UserProfile } from "@/lib/auth"
import { mutationOriginAllowed } from "@/lib/request-security"
import {
  GuardianshipDomainError,
  LOCAL_ACCESS_PROFILE_ID,
  addManagedChild,
  allocateAllowance,
  approveChildRequest,
  canManageGuardianship,
  canViewGuardianship,
  declineChildRequest,
  getGuardianWorkspace,
  revokeGuardianship,
} from "@/lib/guardianship-repository"

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

// Accepts a major-unit amount ("500", "500.50", "500,50") and converts it to
// integer minor units. Mirrors the wallet endpoint parser.
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
  if (error instanceof GuardianshipDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The guardianship workspace is temporarily unavailable.",
      code: "GUARDIANSHIP_UNAVAILABLE",
    },
    500
  )
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "GUARDIANSHIP_UNAUTHORIZED" },
      401
    )
  }
  if (!canViewGuardianship(profile)) {
    return privateJson(
      {
        error: "Your role cannot manage child accounts.",
        code: "GUARDIANSHIP_VIEW_FORBIDDEN",
      },
      403
    )
  }

  try {
    return privateJson(
      await getGuardianWorkspace(profile, {
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
      { error: "Unauthorized.", code: "GUARDIANSHIP_UNAUTHORIZED" },
      401
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      {
        error: "Cross-site request rejected.",
        code: "GUARDIANSHIP_ORIGIN_REJECTED",
      },
      403
    )
  }
  if (!canManageGuardianship(profile)) {
    return privateJson(
      {
        error: "Your role cannot manage child accounts.",
        code: "GUARDIANSHIP_MANAGE_FORBIDDEN",
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
        code: "GUARDIANSHIP_JSON_INVALID",
      },
      400
    )
  }

  const action = trimmedString(body.action)
  const idempotencyKey = trimmedString(body.idempotencyKey)
  const useLocalAccessProfile = profile.id === LOCAL_ACCESS_PROFILE_ID

  try {
    return await dispatchAction(action, {
      profile,
      body,
      idempotencyKey,
      useLocalAccessProfile,
    })
  } catch (error) {
    return domainError(error)
  }
}

async function dispatchAction(
  action: string,
  context: {
    profile: UserProfile
    body: Record<string, unknown>
    idempotencyKey: string
    useLocalAccessProfile: boolean
  }
) {
  const { profile, body, idempotencyKey, useLocalAccessProfile } = context

  if (action === "add-child") {
    const fullName = trimmedString(body.fullName)
    const dateOfBirth = trimmedString(body.dateOfBirth)
    const relation = trimmedString(body.relation) || "parent"
    const consent = body.consent === true

    const validationErrors: Record<string, string> = {}
    if (fullName.length < 2 || fullName.length > 120) {
      validationErrors.fullName = "Enter the child's name (2 to 120 characters)."
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      validationErrors.dateOfBirth = "Enter a date of birth as YYYY-MM-DD."
    }
    if (!consent) {
      validationErrors.consent =
        "Confirm you consent to managing this minor's account."
    }
    if (!idempotencyKey || idempotencyKey.length > 200) {
      validationErrors.idempotencyKey = "A valid idempotency key is required."
    }
    if (Object.keys(validationErrors).length > 0) {
      return privateJson(
        {
          error: "Review the highlighted details.",
          code: "GUARDIANSHIP_VALIDATION_FAILED",
          fields: validationErrors,
        },
        422
      )
    }

    const result = await addManagedChild(
      profile,
      { fullName, dateOfBirth, relation, consent, idempotencyKey },
      { useLocalAccessProfile }
    )
    return privateJson(result, 201)
  }

  if (action === "allowance") {
    const childProfileId = trimmedString(body.childProfileId)
    const amountCents = parseAmountToCents(body.amount)

    const validationErrors: Record<string, string> = {}
    if (!childProfileId || childProfileId.length > 100) {
      validationErrors.childProfileId = "Select a valid child account."
    }
    if (amountCents === null) {
      validationErrors.amount =
        "Enter an amount greater than zero with at most two decimals."
    }
    if (!idempotencyKey || idempotencyKey.length > 200) {
      validationErrors.idempotencyKey = "A valid idempotency key is required."
    }
    if (Object.keys(validationErrors).length > 0 || amountCents === null) {
      return privateJson(
        {
          error: "Review the highlighted allowance details.",
          code: "GUARDIANSHIP_VALIDATION_FAILED",
          fields: validationErrors,
        },
        422
      )
    }

    const result = await allocateAllowance(
      profile,
      childProfileId,
      amountCents,
      idempotencyKey,
      { useLocalAccessProfile }
    )
    return privateJson(result, 201)
  }

  if (action === "approve" || action === "decline") {
    const requestId = trimmedString(body.requestId)
    if (!requestId || requestId.length > 100) {
      return privateJson(
        {
          error: "Select a valid request.",
          code: "GUARDIANSHIP_VALIDATION_FAILED",
          fields: { requestId: "Select a valid request." },
        },
        422
      )
    }
    const result =
      action === "approve"
        ? await approveChildRequest(profile, requestId, { useLocalAccessProfile })
        : await declineChildRequest(profile, requestId, { useLocalAccessProfile })
    return privateJson(result, 200)
  }

  if (action === "revoke") {
    const childProfileId = trimmedString(body.childProfileId)
    if (!childProfileId || childProfileId.length > 100) {
      return privateJson(
        {
          error: "Select a valid child account.",
          code: "GUARDIANSHIP_VALIDATION_FAILED",
          fields: { childProfileId: "Select a valid child account." },
        },
        422
      )
    }
    const result = await revokeGuardianship(profile, childProfileId, {
      useLocalAccessProfile,
    })
    return privateJson(result, 200)
  }

  return privateJson(
    {
      error:
        "Choose a guardianship action: add-child, allowance, approve, decline or revoke.",
      code: "GUARDIANSHIP_ACTION_INVALID",
    },
    422
  )
}
