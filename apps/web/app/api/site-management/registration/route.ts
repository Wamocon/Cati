import { NextResponse } from "next/server"
import {
  submitRegistrationRequest,
  type RegistrationRequestInput,
} from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

// Only these three roles may ever be requested through a public form.
// Manager / accountant / admin carry site- or finance-wide privileges and are
// assigned internally by an existing admin — never self-service. This is a hard
// server-side gate, not a UI convenience: a client that posts role="admin" is
// rejected here regardless of what the form renders.
const PUBLIC_ROLES = ["owner", "tenant", "staff"] as const
type PublicRole = (typeof PUBLIC_ROLES)[number]

function isPublicRole(value: unknown): value is PublicRole {
  return typeof value === "string" && (PUBLIC_ROLES as readonly string[]).includes(value)
}

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

  if (!isPublicRole(body.role)) {
    return NextResponse.json(
      {
        error:
          "This role cannot be requested here. Manager, accounting and admin access is assigned internally by an administrator.",
      },
      { status: 403 }
    )
  }

  const fullName = asString(body.fullName, 120)
  const email = asString(body.email, 160)
  if (!fullName || !email) {
    return NextResponse.json(
      { error: "Full name and email are required." },
      { status: 400 }
    )
  }
  if (!email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 })
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "KVKK consent is required to submit a request." },
      { status: 400 }
    )
  }

  // Identity is mandatory for residents (owner/tenant): it underpins the
  // KVKK-lawful verification and the KBS reporting duty. Staff are internal and
  // verified through an admin reference instead.
  const idType = asString(body.idType, 40)
  const idNumber = asString(body.idNumber, 60)
  const issuingCountry = asString(body.issuingCountry, 80)
  if ((body.role === "owner" || body.role === "tenant") && (!idType || !idNumber)) {
    return NextResponse.json(
      { error: "An identity document type and number are required for owner and tenant access." },
      { status: 400 }
    )
  }

  const input: RegistrationRequestInput = {
    role: body.role,
    fullName,
    email,
    phone: asString(body.phone, 60),
    language: asString(body.language, 8),
    unitClaim: asString(body.unitClaim, 80),
    proofType: asString(body.proofType, 40),
    proofReference: asString(body.proofReference, 120),
    inviteCode: asString(body.inviteCode, 60),
    position: asString(body.position, 80),
    idType,
    idNumber,
    issuingCountry,
    idVerificationRef: asString(body.idVerificationRef, 60),
    idVerificationStatus: asString(body.idVerificationStatus, 20),
    consent: true,
  }

  try {
    const result = await submitRegistrationRequest(input)
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Request could not be submitted. Please try again." },
      { status: 500 }
    )
  }
}
