import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/rbac"
import { isAccessProfileEnabled } from "@/lib/auth"

// Sets or clears a local access-profile cookie for role-scoped workspace access.
const noStoreHeaders = { "Cache-Control": "no-store" }

function shouldUseSecureCookie(request: Request) {
  const url = new URL(request.url)
  return (
    url.protocol === "https:" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.CATI_ENV === "production"
  )
}

export async function GET() {
  const enabled = isAccessProfileEnabled()
  const attestation = enabled
    ? process.env.CATI_RELEASE_HARNESS_NONCE?.trim()
    : undefined
  return NextResponse.json(
    { enabled },
    {
      headers: {
        ...noStoreHeaders,
        ...(attestation
          ? { "X-Cati-QA-Attestation": attestation }
          : {}),
      },
    }
  )
}

export async function POST(request: Request) {
  if (!isAccessProfileEnabled()) {
    return NextResponse.json(
      { error: "Access profiles are disabled" },
      { status: 403, headers: noStoreHeaders }
    )
  }

  let body: { role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const role = typeof body.role === "string" ? body.role : "manager"
  if (!isValidRole(role)) {
    return NextResponse.json(
      { error: "Invalid role" },
      { status: 400, headers: noStoreHeaders }
    )
  }

  const response = NextResponse.json(
    { ok: true, role },
    { headers: noStoreHeaders }
  )
  response.cookies.set("access_profile_role", role, {
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
  })

  return response
}

export async function DELETE(request: Request) {
  const response = NextResponse.json(
    { ok: true },
    { headers: noStoreHeaders }
  )
  response.cookies.set("access_profile_role", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
  })
  return response
}
