import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile, type UserProfile } from "@/lib/auth"
import { hasAnyRolePermission } from "@/lib/rbac"
import { mutationOriginAllowed } from "@/lib/request-security"
import { LOCAL_ACCESS_PROFILE_ID } from "@/lib/wallet-repository"
import {
  ActivitiesDomainError,
  bookActivity,
  cancelBooking,
  getActivitiesForRole,
  getChildBookings,
  getMyBookings,
} from "@/lib/activities-repository"

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

// Coerce a party size from a number or numeric string into a bounded integer.
function parsePartySize(value: unknown): number | null {
  const raw =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : NaN
  if (!Number.isFinite(raw)) return null
  const size = Math.trunc(raw)
  if (size < 1 || size > 50) return null
  return size
}

function canViewActivities(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "activities", "view")
}

function canBookActivities(profile: UserProfile) {
  return hasAnyRolePermission(profile.roles, "activities", "create")
}

function domainError(error: unknown) {
  if (error instanceof ActivitiesDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The activities workspace is temporarily unavailable.",
      code: "ACTIVITIES_UNAVAILABLE",
    },
    500
  )
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "ACTIVITIES_UNAUTHORIZED" },
      401
    )
  }
  if (!canViewActivities(profile)) {
    return privateJson(
      {
        error: "Your role cannot view the activities catalog.",
        code: "ACTIVITIES_VIEW_FORBIDDEN",
      },
      403
    )
  }

  const useLocalAccessProfile = profile.id === LOCAL_ACCESS_PROFILE_ID

  try {
    const [catalog, myBookings, childBookings] = await Promise.all([
      getActivitiesForRole(profile, { useLocalAccessProfile }),
      getMyBookings(profile, { useLocalAccessProfile }),
      getChildBookings(profile, { useLocalAccessProfile }),
    ])
    return privateJson({
      contractVersion: catalog.contractVersion,
      source: catalog.source,
      generatedAt: catalog.generatedAt,
      ageFiltered: catalog.ageFiltered,
      catalog: catalog.activities,
      myBookings: myBookings.bookings,
      childBookings: childBookings.bookings,
      warning: catalog.warning,
    })
  } catch (error) {
    return domainError(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Unauthorized.", code: "ACTIVITIES_UNAUTHORIZED" },
      401
    )
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      { error: "Cross-site request rejected.", code: "ACTIVITIES_ORIGIN_REJECTED" },
      403
    )
  }

  let body: Record<string, unknown>
  try {
    body = asRecord(await request.json())
  } catch {
    return privateJson(
      { error: "Request body must be valid JSON.", code: "ACTIVITIES_JSON_INVALID" },
      400
    )
  }

  const action = trimmedString(body.action)
  if (action !== "book" && action !== "cancel") {
    return privateJson(
      {
        error: "Choose an activity action: book or cancel.",
        code: "ACTIVITIES_ACTION_INVALID",
      },
      422
    )
  }

  const idempotencyKey = trimmedString(body.idempotencyKey)
  const useLocalAccessProfile = profile.id === LOCAL_ACCESS_PROFILE_ID

  try {
    if (action === "book") {
      if (!canBookActivities(profile)) {
        return privateJson(
          {
            error: "Your role cannot book activities.",
            code: "ACTIVITIES_BOOK_FORBIDDEN",
          },
          403
        )
      }

      const activityId = trimmedString(body.activityId)
      const partySize = parsePartySize(body.partySize ?? 1)
      const scheduledRaw = trimmedString(body.scheduledAt)

      const validationErrors: Record<string, string> = {}
      if (!activityId || activityId.length > 100) {
        validationErrors.activityId = "Select a valid activity."
      }
      if (partySize === null) {
        validationErrors.partySize = "Enter a party size between 1 and 50."
      }
      if (!idempotencyKey || idempotencyKey.length > 200) {
        validationErrors.idempotencyKey = "A valid idempotency key is required."
      }
      if (Object.keys(validationErrors).length > 0 || partySize === null) {
        return privateJson(
          {
            error: "Review the highlighted booking details.",
            code: "ACTIVITIES_VALIDATION_FAILED",
            fields: validationErrors,
          },
          422
        )
      }

      const result = await bookActivity(
        profile,
        {
          activityId,
          partySize,
          scheduledAt: scheduledRaw || null,
          idempotencyKey,
        },
        { useLocalAccessProfile }
      )
      return privateJson(result, 201)
    }

    // action === "cancel"
    const bookingId = trimmedString(body.bookingId)
    const validationErrors: Record<string, string> = {}
    if (!bookingId || bookingId.length > 100) {
      validationErrors.bookingId = "Select a valid booking."
    }
    if (!idempotencyKey || idempotencyKey.length > 200) {
      validationErrors.idempotencyKey = "A valid idempotency key is required."
    }
    if (Object.keys(validationErrors).length > 0) {
      return privateJson(
        {
          error: "Review the highlighted cancellation details.",
          code: "ACTIVITIES_VALIDATION_FAILED",
          fields: validationErrors,
        },
        422
      )
    }

    const result = await cancelBooking(
      profile,
      { bookingId, idempotencyKey },
      { useLocalAccessProfile }
    )
    return privateJson(result, 200)
  } catch (error) {
    return domainError(error)
  }
}
