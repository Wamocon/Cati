import { NextResponse } from "next/server"
import { isValidRole } from "@/lib/rbac"

export async function POST(request: Request) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Demo sign-in is only available in development" }, { status: 403 })
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
    sameSite: "lax",
  })

  return response
}
