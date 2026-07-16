import type { UserProfile } from "./auth"
import { isSupabaseConfigured } from "./auth"
import { createClient } from "./supabase/server"
import {
  tenantAccessScopes,
  type TenantAccessData,
  type TenantAccessInvitation,
  type TenantAccessScope,
} from "./tenant-access"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export class TenantAccessRepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "TenantAccessRepositoryError"
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

function isRealProfile(profile: UserProfile): boolean {
  return isSupabaseConfigured() && profile.id !== ACCESS_PROFILE_ID
}

function invitationFromRecord(value: unknown): TenantAccessInvitation {
  const row = asRecord(value)
  const rawScopes = Array.isArray(row.allowedScopes)
    ? row.allowedScopes
    : Array.isArray(row.allowed_scopes)
      ? row.allowed_scopes
      : []
  const status = asString(row.status)
  return {
    id: asString(row.id),
    companyId: asString(row.companyId ?? row.company_id),
    unitId: asString(row.unitId ?? row.unit_id),
    sponsorOwnerProfileId: asString(
      row.sponsorOwnerProfileId ?? row.sponsor_owner_profile_id
    ),
    createdByProfileId: asString(row.createdByProfileId ?? row.created_by_profile_id),
    tenantName: asString(row.tenantName ?? row.tenant_name),
    emailMasked: asString(row.emailMasked ?? row.email_masked),
    codeHint: asString(row.codeHint ?? row.code_hint),
    allowedScopes: rawScopes.filter(
      (scope): scope is TenantAccessScope =>
        typeof scope === "string" &&
        tenantAccessScopes.includes(scope as TenantAccessScope)
    ),
    accessValidFrom: asString(row.accessValidFrom ?? row.access_valid_from),
    accessValidUntil: asString(row.accessValidUntil ?? row.access_valid_until),
    redeemFrom: asString(row.redeemFrom ?? row.redeem_from),
    redeemUntil: asString(row.redeemUntil ?? row.redeem_until),
    status:
      status === "accepted" || status === "revoked" || status === "expired"
        ? status
        : "pending",
    acceptedProfileId: optionalString(row.acceptedProfileId ?? row.accepted_profile_id),
    acceptedResidentId: optionalString(row.acceptedResidentId ?? row.accepted_resident_id),
    workflowVersion: Number(row.workflowVersion ?? row.workflow_version ?? 1),
    acceptedAt: optionalString(row.acceptedAt ?? row.accepted_at),
    extendedAt: optionalString(row.extendedAt ?? row.extended_at),
    revokedAt: optionalString(row.revokedAt ?? row.revoked_at),
    lastAuditAt: optionalString(row.lastAuditAt ?? row.last_audit_at),
    createdAt: asString(row.createdAt ?? row.created_at),
    updatedAt: asString(row.updatedAt ?? row.updated_at),
    replayed: row.replayed === true,
    inviteCode: optionalString(row.inviteCode),
    codeAvailable: row.codeAvailable === true,
  }
}

function throwTenantAccessDatabaseError(error: unknown): never {
  const record = asRecord(error)
  const dbCode = asString(record.code)
  const message = asString(record.message) || "Tenant access operation failed."
  if (dbCode === "40001" || /version conflict/i.test(message)) {
    throw new TenantAccessRepositoryError("TENANT_ACCESS_VERSION_CONFLICT", message, 409)
  }
  if (dbCode === "42501" || /forbidden|authority|required|outside.*company/i.test(message)) {
    throw new TenantAccessRepositoryError("TENANT_ACCESS_FORBIDDEN", message, 403)
  }
  if (dbCode === "P0002" || /not found/i.test(message)) {
    throw new TenantAccessRepositoryError("TENANT_ACCESS_NOT_FOUND", message, 404)
  }
  if (dbCode === "23505" || /idempotency.*used|already.*accepted/i.test(message)) {
    throw new TenantAccessRepositoryError("TENANT_ACCESS_CONFLICT", message, 409)
  }
  if (dbCode === "22023" || /invalid|must|requires|expired|window|scope|email|code/i.test(message)) {
    throw new TenantAccessRepositoryError("TENANT_ACCESS_VALIDATION_FAILED", message, 422)
  }
  throw new TenantAccessRepositoryError(
    "TENANT_ACCESS_UNAVAILABLE",
    "Tenant access is temporarily unavailable.",
    503
  )
}

export async function getTenantAccessData(
  profile: UserProfile
): Promise<TenantAccessData> {
  if (!isRealProfile(profile)) {
    return {
      mutationAvailable: false,
      unavailableReason: "real_auth_required",
      invitations: [],
      units: [],
      sponsors: [],
    }
  }

  const supabase = await createClient()
  const invitationResponse = await supabase
    .from("tenant_access_invitations")
    .select(
      "id, company_id, unit_id, sponsor_owner_profile_id, created_by_profile_id, tenant_name, email_masked, code_hint, allowed_scopes, access_valid_from, access_valid_until, redeem_from, redeem_until, status, accepted_profile_id, accepted_resident_id, workflow_version, accepted_at, extended_at, revoked_at, last_audit_at, created_at, updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(100)
  if (invitationResponse.error) throwTenantAccessDatabaseError(invitationResponse.error)

  const unitsPromise =
    profile.role === "owner" || profile.role === "admin"
      ? supabase
          .from("units")
          .select("id, unit_no, site_id, sites(name, code)")
          .order("unit_no", { ascending: true })
          .limit(1000)
      : Promise.resolve({ data: [], error: null })
  const sponsorsPromise =
    profile.role === "admin" && profile.company_id
      ? supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("company_id", profile.company_id)
          .eq("role", "owner")
          .order("full_name", { ascending: true })
      : Promise.resolve({
          data:
            profile.role === "owner"
              ? [{ id: profile.id, full_name: profile.full_name, email: profile.email }]
              : [],
          error: null,
        })
  const [unitsResponse, sponsorsResponse] = await Promise.all([
    unitsPromise,
    sponsorsPromise,
  ])
  if (unitsResponse.error) throwTenantAccessDatabaseError(unitsResponse.error)
  if (sponsorsResponse.error) throwTenantAccessDatabaseError(sponsorsResponse.error)

  return {
    mutationAvailable: true,
    unavailableReason: null,
    invitations: (invitationResponse.data ?? []).map(invitationFromRecord),
    units: (unitsResponse.data ?? []).flatMap((value) => {
      const unit = asRecord(value)
      const siteValue = Array.isArray(unit.sites) ? unit.sites[0] : unit.sites
      const site = asRecord(siteValue)
      const id = asString(unit.id)
      const unitNo = asString(unit.unit_no)
      const siteId = asString(unit.site_id)
      if (!id || !unitNo || !siteId) return []
      const siteName = asString(site.name)
      const siteCode = asString(site.code)
      return [
        {
          id,
          siteId,
          label: [siteName || siteCode, unitNo].filter(Boolean).join(" · "),
        },
      ]
    }),
    sponsors: (sponsorsResponse.data ?? []).flatMap((value) => {
      const sponsor = asRecord(value)
      const id = asString(sponsor.id)
      if (!id) return []
      return [
        {
          id,
          label:
            optionalString(sponsor.full_name) ??
            optionalString(sponsor.email) ??
            "Unnamed owner",
        },
      ]
    }),
  }
}

export async function createTenantAccessInvitation(
  profile: UserProfile,
  input: {
    unitId: string
    sponsorOwnerProfileId: string
    tenantName: string
    tenantEmail: string
    allowedScopes: TenantAccessScope[]
    accessValidFrom: string
    accessValidUntil: string
    redeemFrom: string
    redeemUntil: string
    idempotencyKey: string
    reason: string
  }
): Promise<TenantAccessInvitation> {
  if (!isRealProfile(profile)) {
    throw new TenantAccessRepositoryError(
      "TENANT_ACCESS_REAL_AUTH_REQUIRED",
      "Tenant invitations require a real authenticated session.",
      403
    )
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    "create_tenant_access_invitation_command",
    {
      p_unit_id: input.unitId,
      p_sponsor_owner_profile_id: input.sponsorOwnerProfileId,
      p_tenant_name: input.tenantName,
      p_tenant_email: input.tenantEmail,
      p_allowed_scopes: input.allowedScopes,
      p_access_valid_from: input.accessValidFrom,
      p_access_valid_until: input.accessValidUntil,
      p_redeem_from: input.redeemFrom,
      p_redeem_until: input.redeemUntil,
      p_idempotency_key: input.idempotencyKey,
      p_reason: input.reason,
    }
  )
  if (error) throwTenantAccessDatabaseError(error)
  return invitationFromRecord(data)
}

export async function mutateTenantAccessInvitation(
  profile: UserProfile,
  input:
    | {
        action: "extend"
        invitationId: string
        expectedVersion: number
        accessValidUntil: string | null
        redeemUntil: string | null
        idempotencyKey: string
        reason: string
      }
    | {
        action: "revoke"
        invitationId: string
        expectedVersion: number
        idempotencyKey: string
        reason: string
      }
    | {
        action: "redeem"
        invitationId: string
        inviteCode: string
        idempotencyKey: string
      }
): Promise<TenantAccessInvitation> {
  if (!isRealProfile(profile)) {
    throw new TenantAccessRepositoryError(
      "TENANT_ACCESS_REAL_AUTH_REQUIRED",
      "Tenant access changes require a real authenticated session.",
      403
    )
  }
  const supabase = await createClient()
  const response =
    input.action === "extend"
      ? await supabase.rpc("extend_tenant_access_invitation_command", {
          p_invitation_id: input.invitationId,
          p_expected_version: input.expectedVersion,
          p_access_valid_until: input.accessValidUntil,
          p_redeem_until: input.redeemUntil,
          p_idempotency_key: input.idempotencyKey,
          p_reason: input.reason,
        })
      : input.action === "revoke"
        ? await supabase.rpc("revoke_tenant_access_invitation_command", {
            p_invitation_id: input.invitationId,
            p_expected_version: input.expectedVersion,
            p_idempotency_key: input.idempotencyKey,
            p_reason: input.reason,
          })
        : await supabase.rpc("redeem_tenant_access_invitation_command", {
            p_invitation_id: input.invitationId,
            p_invite_code: input.inviteCode,
            p_idempotency_key: input.idempotencyKey,
          })
  if (response.error) throwTenantAccessDatabaseError(response.error)
  return invitationFromRecord(response.data)
}
