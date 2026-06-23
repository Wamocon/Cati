import { cookies } from "next/headers"
import { createClient } from "./supabase/server"
import { Role, roles, isValidRole } from "./rbac"

export interface UserProfile {
  id: string
  email?: string
  full_name?: string | null
  role: Role
  phone?: string | null
  language?: string | null
  office_id?: string | null
  avatar_url?: string | null
}

// Demo fallback used when Supabase auth is not configured.
// Priority:
//   1. demo_role cookie (set by role-selector on the login page)
//   2. NEXT_PUBLIC_DEMO_ROLE env var
//   3. default "manager"
// This is intentionally exposed for pre-launch demos; replace with real auth before go-live.
async function getDemoProfile(): Promise<UserProfile> {
  let demoRole = process.env.NEXT_PUBLIC_DEMO_ROLE ?? "manager"

  try {
    const cookieStore = await cookies()
    const cookieRole = cookieStore.get("demo_role")?.value
    if (cookieRole && isValidRole(cookieRole)) {
      demoRole = cookieRole
    }
  } catch {
    // Cookies may not be available in all contexts; fall back to env/default.
  }

  const role: Role = isValidRole(demoRole) ? demoRole : "manager"

  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "demo@cati.local",
    full_name: "Demo User",
    role,
    phone: null,
    language: "ru",
    office_id: null,
    avatar_url: null,
  }
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function isDemoAuthEnabled(): boolean {
  return !isSupabaseConfigured() || process.env.NEXT_PUBLIC_ENABLE_DEMO_AUTH === "true"
}

/**
 * Returns the current authenticated user profile with a normalized role.
 * Falls back to a demo profile only when Supabase is not configured, unless
 * NEXT_PUBLIC_ENABLE_DEMO_AUTH=true is explicitly set for a staging demo.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    return getDemoProfile()
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return isDemoAuthEnabled() ? getDemoProfile() : null
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      // If no profile exists yet, treat as viewer/client until the trigger runs or admin assigns a role.
      return {
        id: user.id,
        email: user.email,
        role: "viewer",
      }
    }

    const role = isValidRole(profile?.role) ? (profile.role as Role) : "viewer"

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name,
      role,
      phone: profile?.phone,
      language: profile?.language,
      office_id: profile?.office_id,
      avatar_url: profile?.avatar_url,
    }
  } catch {
    return isDemoAuthEnabled() ? getDemoProfile() : null
  }
}

/**
 * Require a profile. Throws a redirect to login if none is found.
 * Use inside Server Components that need a guaranteed user.
 */
export async function requireProfile(): Promise<UserProfile> {
  const profile = await getUserProfile()
  if (!profile) {
    throw new Error("Unauthorized")
  }
  return profile
}

/**
 * Validate that a role string from a form/API is one of the known platform roles.
 */
export function normalizeRole(role: unknown): Role {
  return isValidRole(role) ? role : "viewer"
}

/**
 * List of roles that can be assigned by admins. Platform-only roles are excluded.
 */
export function assignableRoles(): Role[] {
  return roles.filter((r) => r !== "super_admin")
}
