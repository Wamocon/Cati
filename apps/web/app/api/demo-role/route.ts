import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/rbac"
import { isDemoAuthEnabled } from "@/lib/auth"

// Sets or clears a demo_role cookie so the dashboard can preview a specific RBAC role.
// This endpoint is exposed intentionally for the pre-launch demo; it must be
// disabled or protected once real Supabase authentication is enabled in production.
export async function POST(request: Request) {
  if (!isDemoAuthEnabled()) {
    return NextResponse.json({ error: "Demo auth is disabled" }, { status: 403 })
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
  response.cookies.set("demo_role", role, {
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set("demo_role", "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
  return response
}
