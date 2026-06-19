import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/rbac"

// Sets a demo_role cookie so the dashboard can preview a specific RBAC role.
// This endpoint is exposed intentionally for the pre-launch demo; it must be
// disabled or protected once real Supabase authentication is enabled in production.
export async function POST(request: Request) {
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
    sameSite: "lax",
  })

  return response
}
