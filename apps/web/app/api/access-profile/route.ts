import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/rbac"
import { isAccessProfileEnabled } from "@/lib/auth"

// Sets or clears a local access-profile cookie for role-scoped workspace access.
function shouldUseSecureCookie(request: Request) {
  const url = new URL(request.url)
  return (
    url.protocol === "https:" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.CATI_ENV === "production"
  )
}

export async function GET() {
  // Temporary deploy/config diagnostic (booleans + commit SHA only, no secret
  // values) to confirm which commit is live on Vercel and whether the access-
  // profile flags are exactly "true" in the runtime. Remove after verification.
  return NextResponse.json({
    enabled: isAccessProfileEnabled(),
    diag: {
      commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
      vercelEnv: process.env.VERCEL_ENV ?? null,
      nodeEnv: process.env.NODE_ENV ?? null,
      productionDeployment:
        process.env.VERCEL_ENV === "production" ||
        process.env.CATI_ENV === "production",
      remoteDeployment: Boolean(
        process.env.VERCEL_ENV || process.env.VERCEL_URL
      ),
      enableAccessProfiles: process.env.ENABLE_ACCESS_PROFILES === "true",
      allowRemoteAccessProfiles:
        process.env.CATI_ALLOW_REMOTE_ACCESS_PROFILES === "true",
    },
  })
}

export async function POST(request: Request) {
  if (!isAccessProfileEnabled()) {
    return NextResponse.json(
      { error: "Access profiles are disabled" },
      { status: 403 }
    )
  }

  let body: { role?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const role = typeof body.role === "string" ? body.role : "manager"
  if (!isValidRole(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true, role })
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
  const response = NextResponse.json({ ok: true })
  response.cookies.set("access_profile_role", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookie(request),
  })
  return response
}
