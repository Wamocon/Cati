import type { UserProfile } from "./auth"
import { isSupabaseConfigured } from "./auth"
import { isValidRole, type Role } from "./rbac"
import { createClient } from "./supabase/server"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export interface GovernanceMember {
  id: string
  fullName: string
  email: string | null
  role: Role
  officeId: string | null
  siteIds: string[]
  updatedAt: string
  isCurrentActor: boolean
  mutable: boolean
}

export interface GovernanceOfficeOption {
  id: string
  name: string
}

export interface GovernanceSiteOption {
  id: string
  name: string
  code: string
}

export interface GovernanceAdministration {
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | "company_scope_required" | null
  members: GovernanceMember[]
  offices: GovernanceOfficeOption[]
  sites: GovernanceSiteOption[]
}

export interface SetGovernanceMemberAuthorityInput {
  profileId: string
  expectedUpdatedAt: string
  role: Role
  officeId: string | null
  siteIds: string[]
  reason: string
  idempotencyKey: string
}

export class GovernanceRepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "GovernanceRepositoryError"
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function optionalString(value: unknown): string | null {
  const normalized = asString(value).trim()
  return normalized || null
}

function isRealOrganizationAdmin(profile: UserProfile): boolean {
  return Boolean(
    profile.role === "admin" &&
      profile.company_id &&
      profile.id !== ACCESS_PROFILE_ID &&
      isSupabaseConfigured()
  )
}

function unavailableAdministration(profile: UserProfile): GovernanceAdministration {
  return {
    mutationAvailable: false,
    unavailableReason: profile.company_id
      ? "real_auth_required"
      : "company_scope_required",
    members: [],
    offices: [],
    sites: [],
  }
}

function throwGovernanceDatabaseError(error: unknown): never {
  const record = asRecord(error)
  const code = asString(record.code)
  const message = asString(record.message) || "Organization authority update failed."

  if (code === "40001" || /version conflict/i.test(message)) {
    throw new GovernanceRepositoryError("GOVERNANCE_VERSION_CONFLICT", message, 409)
  }
  if (code === "42501" || /may manage their own company|authority is required/i.test(message)) {
    throw new GovernanceRepositoryError("GOVERNANCE_FORBIDDEN", message, 403)
  }
  if (code === "P0002" || /not found/i.test(message)) {
    throw new GovernanceRepositoryError("GOVERNANCE_MEMBER_NOT_FOUND", message, 404)
  }
  if (
    code === "22023" ||
    code === "23505" ||
    /requires|unsupported|outside|archived|cannot|only manager and staff/i.test(message)
  ) {
    throw new GovernanceRepositoryError("GOVERNANCE_VALIDATION_FAILED", message, 422)
  }
  throw new GovernanceRepositoryError(
    "GOVERNANCE_UNAVAILABLE",
    "Organization authority controls are temporarily unavailable.",
    503
  )
}

export async function getGovernanceAdministration(
  profile: UserProfile
): Promise<GovernanceAdministration> {
  if (!isRealOrganizationAdmin(profile)) return unavailableAdministration(profile)

  const supabase = await createClient()
  const [membersResponse, officesResponse, sitesResponse, assignmentsResponse] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, role, office_id, updated_at")
        .eq("company_id", profile.company_id as string)
        .order("full_name", { ascending: true }),
      supabase
        .from("offices")
        .select("id, name")
        .eq("company_id", profile.company_id as string)
        .neq("status", "archived")
        .order("name", { ascending: true }),
      supabase
        .from("sites")
        .select("id, name, code")
        .eq("company_id", profile.company_id as string)
        .neq("status", "archived")
        .order("name", { ascending: true }),
      supabase
        .from("profile_site_assignments")
        .select("profile_id, site_id")
        .eq("company_id", profile.company_id as string)
        .eq("status", "active")
        .lte("valid_from", new Date().toISOString())
        .or(`valid_until.is.null,valid_until.gt.${new Date().toISOString()}`),
    ])

  const firstError =
    membersResponse.error ??
    officesResponse.error ??
    sitesResponse.error ??
    assignmentsResponse.error
  if (firstError) throwGovernanceDatabaseError(firstError)

  const siteIdsByProfile = new Map<string, string[]>()
  for (const rawAssignment of assignmentsResponse.data ?? []) {
    const assignment = asRecord(rawAssignment)
    const profileId = asString(assignment.profile_id)
    const siteId = asString(assignment.site_id)
    if (!profileId || !siteId) continue
    siteIdsByProfile.set(profileId, [
      ...(siteIdsByProfile.get(profileId) ?? []),
      siteId,
    ])
  }

  const members = (membersResponse.data ?? []).flatMap((rawMember) => {
    const member = asRecord(rawMember)
    const id = asString(member.id)
    const role = member.role
    const updatedAt = asString(member.updated_at)
    if (!id || !updatedAt || !isValidRole(role)) return []
    return [
      {
        id,
        fullName: optionalString(member.full_name) ?? optionalString(member.email) ?? "Unnamed member",
        email: optionalString(member.email),
        role,
        officeId: optionalString(member.office_id),
        siteIds: siteIdsByProfile.get(id) ?? [],
        updatedAt,
        isCurrentActor: id === profile.id,
        // Organization admins cannot enter/leave the admin tier; platform
        // provisioning is deliberately separate from this UI.
        mutable: id !== profile.id && role !== "admin",
      } satisfies GovernanceMember,
    ]
  })

  return {
    mutationAvailable: true,
    unavailableReason: null,
    members,
    offices: (officesResponse.data ?? []).flatMap((rawOffice) => {
      const office = asRecord(rawOffice)
      const id = asString(office.id)
      const name = asString(office.name)
      return id && name ? [{ id, name }] : []
    }),
    sites: (sitesResponse.data ?? []).flatMap((rawSite) => {
      const site = asRecord(rawSite)
      const id = asString(site.id)
      const name = asString(site.name)
      const code = asString(site.code)
      return id && name ? [{ id, name, code }] : []
    }),
  }
}

export async function setGovernanceMemberAuthority(
  profile: UserProfile,
  input: SetGovernanceMemberAuthorityInput
): Promise<GovernanceMember> {
  if (!isRealOrganizationAdmin(profile)) {
    throw new GovernanceRepositoryError(
      "GOVERNANCE_REAL_AUTH_REQUIRED",
      "Audited authority changes require a real organization-admin session.",
      403
    )
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("admin_set_company_member_authority", {
    p_profile_id: input.profileId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_role: input.role,
    p_office_id: input.officeId,
    p_site_ids: input.siteIds,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throwGovernanceDatabaseError(error)

  const administration = await getGovernanceAdministration(profile)
  const updated = administration.members.find((member) => member.id === input.profileId)
  if (!updated) {
    throw new GovernanceRepositoryError(
      "GOVERNANCE_MEMBER_NOT_FOUND",
      "The updated organization member is no longer visible.",
      404
    )
  }
  return updated
}
