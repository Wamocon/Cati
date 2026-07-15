export const tenantAccessScopes = [
  "tickets",
  "calendar",
  "documents",
  "communications",
] as const

export type TenantAccessScope = (typeof tenantAccessScopes)[number]
export type TenantInvitationStatus = "pending" | "accepted" | "revoked" | "expired"

export interface TenantAccessInvitation {
  id: string
  companyId: string
  unitId: string
  sponsorOwnerProfileId: string
  createdByProfileId: string
  tenantName: string
  emailMasked: string
  codeHint: string
  allowedScopes: TenantAccessScope[]
  accessValidFrom: string
  accessValidUntil: string
  redeemFrom: string
  redeemUntil: string
  status: TenantInvitationStatus
  acceptedProfileId: string | null
  acceptedResidentId: string | null
  workflowVersion: number
  acceptedAt: string | null
  extendedAt: string | null
  revokedAt: string | null
  lastAuditAt: string | null
  createdAt: string
  updatedAt: string
  replayed?: boolean
  inviteCode?: string | null
  codeAvailable?: boolean
}

export interface TenantAccessUnitOption {
  id: string
  label: string
  siteId: string
}

export interface TenantAccessSponsorOption {
  id: string
  label: string
}

export interface TenantAccessData {
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | null
  invitations: TenantAccessInvitation[]
  units: TenantAccessUnitOption[]
  sponsors: TenantAccessSponsorOption[]
}
