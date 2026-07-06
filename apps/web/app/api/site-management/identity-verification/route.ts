import { NextResponse } from "next/server"
import { verifyIdentity } from "@/lib/identity-verification"

export const dynamic = "force-dynamic"

// Public step of the registration flow: an applicant verifies their identity in
// seconds (OCR + document authenticity + selfie-to-ID match + liveness) via a
// provider-neutral IDV gateway. In the demo (no provider configured) the result
// is deterministically simulated so the automated UX is visible end-to-end.
// This endpoint returns only a verification verdict + reference — never any
// internal data — and is safe to call before an account exists.

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  return trimmed
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const idType = asString(body.idType, 40)
  const idNumber = asString(body.idNumber, 60)
  if (!idType || !idNumber) {
    return NextResponse.json(
      { error: "An identity document type and number are required." },
      { status: 400 }
    )
  }

  try {
    const result = await verifyIdentity({
      idType,
      idNumber,
      issuingCountry: asString(body.issuingCountry, 80),
      fullName: asString(body.fullName, 120),
    })
    return NextResponse.json(result, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: "Verification could not be completed. Please try again." },
      { status: 500 }
    )
  }
}
