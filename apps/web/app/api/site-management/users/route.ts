import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import { hasAnyPermission, isAdmin } from "@/lib/rbac"
import { getPeopleDirectoryData } from "@/lib/site-management-repository"
import {
  assignManagedUserRole,
  createManagedUser,
  getUserAdministration,
  revokeManagedUserRole,
  setManagedUserActive,
  UserAdminError,
} from "@/lib/user-role-admin-repository"
import { mutationOriginAllowed } from "@/lib/request-security"

function originRejected(request: NextRequest) {
  if (mutationOriginAllowed(request)) return null
  return NextResponse.json(
    { error: "Cross-site request rejected.", code: "USER_ADMIN_ORIGIN_REJECTED" },
    { status: 403 }
  )
}

export const dynamic = "force-dynamic"

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function readLimit(value: string | null) {
  const limit = Number(value ?? 80)
  if (!Number.isFinite(limit)) return 80
  return Math.min(Math.max(Math.trunc(limit), 1), 250)
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function errorResponse(error: unknown) {
  if (error instanceof UserAdminError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.httpStatus }
    )
  }
  console.error("User administration command failed.", error)
  return NextResponse.json(
    {
      error: "User administration is temporarily unavailable.",
      code: "USER_ADMIN_UNAVAILABLE",
    },
    { status: 503 }
  )
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  if (!hasAnyPermission(profile.role, "users", ["view"])) {
    return NextResponse.json(
      { error: "Your role is not allowed to view people directory data." },
      { status: 403 }
    )
  }

  try {
    const limit = readLimit(request.nextUrl.searchParams.get("limit"))
    const data = await getPeopleDirectoryData({ limit })

    // Only organization admins receive the user administration payload used by
    // the create/assign/deactivate panel.
    if (isAdmin(profile.role)) {
      let administration
      try {
        administration = await getUserAdministration(profile)
      } catch (adminError) {
        console.error("User administration snapshot failed.", adminError)
      }
      return NextResponse.json({ ...data, administration })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: "People directory data is unavailable." },
      { status: 500 }
    )
  }
}

async function requireAdmin() {
  const profile = await getUserProfile()
  if (!profile) {
    return {
      profile: null,
      response: NextResponse.json(
        { error: "Authentication is required.", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    }
  }
  if (!isAdmin(profile.role)) {
    return {
      profile: null,
      response: NextResponse.json(
        {
          error: "Organization administrator authority is required.",
          code: "USER_ADMIN_FORBIDDEN",
        },
        { status: 403 }
      ),
    }
  }
  return { profile, response: null }
}

async function parseBody(request: NextRequest) {
  const raw = await request.text()
  if (raw.length > 4000) throw new Error("payload too large")
  return asRecord(JSON.parse(raw))
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireAdmin()
  if (!profile) return response
  const rejected = originRejected(request)
  if (rejected) return rejected

  let body: Record<string, unknown>
  try {
    body = await parseBody(request)
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "USER_ADMIN_INVALID_JSON" },
      { status: 400 }
    )
  }

  try {
    const user = await createManagedUser(profile, body)
    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}

export async function PATCH(request: NextRequest) {
  const { profile, response } = await requireAdmin()
  if (!profile) return response
  const rejected = originRejected(request)
  if (rejected) return rejected

  let body: Record<string, unknown>
  try {
    body = await parseBody(request)
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON.", code: "USER_ADMIN_INVALID_JSON" },
      { status: 400 }
    )
  }

  const action = typeof body.action === "string" ? body.action : ""
  const profileId = typeof body.profileId === "string" ? body.profileId : ""

  if (!profileId || !uuidPattern.test(profileId)) {
    return NextResponse.json(
      { error: "A valid user id is required.", code: "USER_ADMIN_PROFILE_INVALID" },
      { status: 400 }
    )
  }

  try {
    let user
    if (action === "assign_role") {
      user = await assignManagedUserRole(profile, profileId, body.role)
    } else if (action === "revoke_role") {
      user = await revokeManagedUserRole(profile, profileId, body.role)
    } else if (action === "set_active") {
      if (typeof body.active !== "boolean") {
        return NextResponse.json(
          { error: "active must be a boolean.", code: "USER_ADMIN_ACTIVE_INVALID" },
          { status: 400 }
        )
      }
      user = await setManagedUserActive(profile, profileId, body.active)
    } else {
      return NextResponse.json(
        {
          error: "Unsupported action. Use assign_role, revoke_role, or set_active.",
          code: "USER_ADMIN_ACTION_INVALID",
        },
        { status: 400 }
      )
    }
    return NextResponse.json({ user })
  } catch (error) {
    return errorResponse(error)
  }
}
