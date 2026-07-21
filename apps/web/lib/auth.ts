import { cookies } from "next/headers"
import { createClient } from "./supabase/server"
import { Role, roles, isValidRole, roleDefinitions } from "./rbac"
import { accessProfilesEnabledForEnvironment } from "./access-profile-policy"

export interface UserProfile {
  id: string
  email?: string
  full_name?: string | null
  role: Role
  // All business roles held by the user. Primary `role` above always equals the
  // highest-level entry. Single-assignment users have exactly [role], which
  // keeps their effective permissions identical to the pre-multi-role behavior.
  roles: Role[]
  isActive: boolean
  company_id?: string | null
  phone?: string | null
  language?: string | null
  office_id?: string | null
  avatar_url?: string | null
}

/**
 * Normalize a raw role list into distinct valid roles ordered highest-level
 * first. Falls back to [primary] when no valid assignments are present so a
 * single-role user is always represented consistently.
 */
export function normalizeRoleList(value: unknown, primary: Role): Role[] {
  const list = Array.isArray(value) ? value : []
  const valid = list.filter(isValidRole)
  const distinct = Array.from(new Set<Role>([...valid, primary]))
  return distinct.sort(
    (a, b) =>
      (roleDefinitions.find((r) => r.key === b)?.level ?? 0) -
      (roleDefinitions.find((r) => r.key === a)?.level ?? 0)
  )
}

// Access-profile fallback is only for controlled QA review. It must never
// become a production fallback when Supabase is missing or misconfigured.
async function getAccessProfile(): Promise<UserProfile> {
  let accessRole = process.env.ACCESS_PROFILE_ROLE ?? "manager"

  try {
    const cookieStore = await cookies()
    const cookieRole = cookieStore.get("access_profile_role")?.value
    if (cookieRole && isValidRole(cookieRole)) {
      accessRole = cookieRole
    }
  } catch {
    // Cookies may not be available in all contexts; fall back to env/default.
  }

  const role: Role = isValidRole(accessRole) ? accessRole : "manager"
  const displayNames: Record<Role, string> = {
    admin: "Organizasyon Yöneticisi",
    manager: "Site Yöneticisi",
    accountant: "Muhasebe Sorumlusu",
    staff: "Teknik - Ahmet",
    owner: "Demo Malik",
    tenant: "Demo Kiracı",
  }

  return {
    id: "00000000-0000-0000-0000-000000000000",
    email: "access@cati.local",
    full_name: displayNames[role],
    role,
    roles: [role],
    isActive: true,
    company_id: null,
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

export function isAccessProfileEnabled(): boolean {
  return accessProfilesEnabledForEnvironment()
}

/**
 * Returns the current authenticated user profile with a normalized role.
 * Falls back to a QA access profile only when external auth is not configured,
 * unless access profiles are explicitly enabled for a controlled environment.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  if (!isSupabaseConfigured()) {
    if (!isAccessProfileEnabled()) return null
    return getAccessProfile()
  }

  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return isAccessProfileEnabled() ? getAccessProfile() : null
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (profileError) {
      // If no profile exists yet, treat as a limited tenant until the trigger
      // runs or an admin assigns the correct client role.
      return {
        id: user.id,
        email: user.email,
        role: "tenant",
        roles: ["tenant"],
        isActive: true,
        company_id: null,
      }
    }

    const role = isValidRole(profile?.role) ? (profile.role as Role) : "tenant"

    // Read the user's own role assignments (RLS allows own rows). Fall back to
    // the primary role for profiles that predate the assignment table.
    let assignmentRoles: Role[] = [role]
    try {
      const { data: assignments } = await supabase
        .from("profile_role_assignments")
        .select("role")
        .eq("profile_id", user.id)
      if (Array.isArray(assignments)) {
        assignmentRoles = normalizeRoleList(
          assignments.map((row) => (row as { role?: unknown }).role),
          role
        )
      }
    } catch {
      // Assignment table may not be present in older environments; keep [role].
    }

    return {
      id: user.id,
      email: user.email,
      full_name: profile?.full_name,
      role,
      roles: assignmentRoles,
      isActive: profile?.is_active !== false,
      company_id: profile?.company_id,
      phone: profile?.phone,
      language: profile?.language,
      office_id: profile?.office_id,
      avatar_url: profile?.avatar_url,
    }
  } catch {
    return isAccessProfileEnabled() ? getAccessProfile() : null
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
  return isValidRole(role) ? role : "tenant"
}

/**
 * List of roles that can be assigned by admins.
 */
export function assignableRoles(): Role[] {
  return [...roles]
}
