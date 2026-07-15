import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { isIdvConfigured } from "@/lib/identity-verification"
import {
  consumeRequestRateLimit,
  mutationOriginAllowed,
} from "@/lib/request-security"

export const dynamic = "force-dynamic"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function privateJson(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  })
}

// Management-only, provider-neutral IDV boundary. Without an approved live
// provider the result is manual review and never claims OCR, face match or
// liveness ran. Raw identity numbers/images are not accepted here; review is
// anchored to an already consented registration request.

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  return trimmed
}

export async function POST(request: NextRequest) {
  if (!mutationOriginAllowed(request)) {
    return privateJson(
      { error: "Cross-site request rejected.", code: "IDV_ORIGIN_REJECTED" },
      403
    )
  }
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson(
      { error: "Authentication is required.", code: "IDV_AUTH_REQUIRED" },
      401
    )
  }
  if (profile.role !== "admin" && profile.role !== "manager") {
    return privateJson(
      { error: "Identity review is limited to management.", code: "IDV_FORBIDDEN" },
      403
    )
  }
  const rate = consumeRequestRateLimit({
    request,
    scope: "identity-verification",
    subject: profile.id,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!rate.allowed) {
    const response = privateJson(
      { error: "Too many identity review attempts.", code: "IDV_RATE_LIMITED" },
      429
    )
    response.headers.set("Retry-After", String(rate.retryAfterSeconds))
    return response
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return privateJson({ error: "Invalid JSON body", code: "IDV_INVALID_JSON" }, 400)
  }

  if (body.idNumber !== undefined || body.idImage !== undefined || body.selfie !== undefined) {
    return privateJson(
      {
        error: "Raw identity numbers and images are not accepted by this endpoint.",
        code: "IDV_RAW_IDENTITY_FORBIDDEN",
      },
      400
    )
  }

  const registrationRequestId = asString(body.registrationRequestId, 40)
  if (!registrationRequestId || !uuidPattern.test(registrationRequestId)) {
    return privateJson(
      {
        error: "A consented registration request is required for identity review.",
        code: "IDV_REGISTRATION_REQUIRED",
      },
      400
    )
  }

  return privateJson(
    {
      status: "manual_review_required",
      provider: isIdvConfigured() ? "adapter_not_approved" : "not_configured",
      simulated: false,
      code: "IDV_PROVIDER_SESSION_REQUIRED",
      message:
        "Use the protected registration evidence review. Live OCR, face match and liveness remain disabled until a provider-hosted consent session is approved.",
    },
    503
  )
}
