import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  ServiceProofRepositoryError,
  listServiceProofs,
  reviewServiceProof,
  submitServiceProof,
  type ServiceProofMediaType,
} from "@/lib/service-proof-repository"
import {
  consumeRequestRateLimit,
  mutationOriginAllowed,
} from "@/lib/request-security"

export const dynamic = "force-dynamic"

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store, max-age=0")
  response.headers.set("Referrer-Policy", "no-referrer")
  return response
}

function errorResponse(error: unknown) {
  const status =
    error instanceof ServiceProofRepositoryError ? error.status : 500
  const message =
    error instanceof ServiceProofRepositoryError
      ? error.message
      : "Service evidence request failed."
  return noStore(NextResponse.json({ error: message }, { status }))
}

function mutationGuard(request: NextRequest, profileId: string) {
  if (!mutationOriginAllowed(request)) {
    return noStore(
      NextResponse.json(
        { error: "Cross-site request rejected." },
        { status: 403 }
      )
    )
  }
  const rate = consumeRequestRateLimit({
    request,
    scope: "service-proof-mutation",
    subject: profileId,
    limit: 30,
    windowMs: 60 * 60 * 1000,
  })
  if (!rate.allowed) {
    const response = NextResponse.json(
      { error: "Too many evidence updates. Retry after the cooling period." },
      { status: 429 }
    )
    response.headers.set("Retry-After", String(rate.retryAfterSeconds))
    return noStore(response)
  }
  return null
}

function requiredQuery(request: NextRequest, key: string) {
  const value = request.nextUrl.searchParams.get(key)?.trim()
  if (!value) {
    throw new ServiceProofRepositoryError(`${key} is required.`, 400)
  }
  return value
}

function formText(form: FormData, key: string) {
  const value = form.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function idempotencyKey(request: NextRequest, fallback = "") {
  return request.headers.get("Idempotency-Key")?.trim() || fallback.trim()
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile)
    return noStore(
      NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    )

  try {
    const result = await listServiceProofs({
      profile,
      ticketId: requiredQuery(request, "ticketId"),
      workforceTaskId: requiredQuery(request, "workforceTaskId"),
    })
    return noStore(NextResponse.json(result))
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile)
    return noStore(
      NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    )

  const rejected = mutationGuard(request, profile.id)
  if (rejected) return rejected
  const contentLength = Number(request.headers.get("content-length") ?? 0)
  if (Number.isFinite(contentLength) && contentLength > 52 * 1024 * 1024) {
    return noStore(
      NextResponse.json(
        { error: "Evidence request exceeds the 52 MB transport limit." },
        { status: 413 }
      )
    )
  }

  try {
    const form = await request.formData()
    const mediaTypeValue = formText(form, "mediaType")
    if (
      mediaTypeValue !== "photo" &&
      mediaTypeValue !== "video" &&
      mediaTypeValue !== "note"
    ) {
      throw new ServiceProofRepositoryError(
        "Evidence type must be photo, video or note.",
        400
      )
    }
    const fileValue = form.get("file")
    const file =
      fileValue instanceof File && fileValue.size > 0 ? fileValue : null
    const result = await submitServiceProof({
      profile,
      ticketId: formText(form, "ticketId"),
      workforceTaskId: formText(form, "workforceTaskId"),
      mediaType: mediaTypeValue as ServiceProofMediaType,
      note: formText(form, "note"),
      file,
      overrideReason: formText(form, "overrideReason") || null,
      idempotencyKey: idempotencyKey(request, formText(form, "idempotencyKey")),
    })
    return noStore(
      NextResponse.json(result, { status: result.replayed ? 200 : 201 })
    )
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile)
    return noStore(
      NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    )

  const rejected = mutationGuard(request, profile.id)
  if (rejected) return rejected

  try {
    const body = (await request.json()) as Record<string, unknown>
    const decision = body.decision
    if (decision !== "accepted" && decision !== "rejected") {
      throw new ServiceProofRepositoryError(
        "Decision must be accepted or rejected.",
        400
      )
    }
    const evidenceId =
      typeof body.evidenceId === "string" ? body.evidenceId : ""
    const reason = typeof body.reason === "string" ? body.reason : ""
    const expectedVersion = Number(body.expectedVersion)
    const result = await reviewServiceProof({
      profile,
      evidenceId,
      expectedVersion,
      decision,
      reason,
      idempotencyKey: idempotencyKey(
        request,
        typeof body.idempotencyKey === "string" ? body.idempotencyKey : ""
      ),
    })
    return noStore(
      NextResponse.json({
        contractVersion: "service-proof.v1",
        generatedAt: new Date().toISOString(),
        proof: result,
      })
    )
  } catch (error) {
    return errorResponse(error)
  }
}
