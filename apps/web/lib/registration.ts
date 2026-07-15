export const publicRegistrationRoles = ["owner", "tenant", "staff"] as const
export type PublicRegistrationRole = (typeof publicRegistrationRoles)[number]

export const registrationStatuses = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "activated",
] as const
export type RegistrationStatus = (typeof registrationStatuses)[number]

export type RegistrationRecommendation =
  | "approve"
  | "reject"
  | "more_information"

export interface RegistrationActivationSummary {
  id: string
  status: "pending" | "redeemed" | "revoked" | "expired"
  expiresAt: string
  tokenHint: string
  redeemedAt: string | null
  providerMode: "supabase-auth-provider-ready"
}

export interface RegistrationRequestEvent {
  id: string
  eventType: "submitted" | "manager_recommended" | "approved" | "rejected" | "activated"
  requestVersion: number
  actorProfileId: string | null
  reason: string | null
  createdAt: string
}

export interface RegistrationRequestRecord {
  id: string
  companyId: string
  reference: string
  requestedRole: PublicRegistrationRole
  fullName: string
  email: string
  emailMasked: string
  phone: string | null
  language: "tr" | "en" | "de" | "ru"
  unitClaim: string | null
  proofType: string | null
  proofReference: string | null
  linkedTenantInvitationId: string | null
  position: string | null
  identityType: string | null
  identityNumberMasked: string | null
  identityReviewStatus: string
  consentVersion: string
  consentLocale: string
  consentAcceptedAt: string
  source: string
  status: RegistrationStatus
  managerRecommendation: RegistrationRecommendation | null
  managerRecommendedBy: string | null
  managerRecommendedAt: string | null
  managerRecommendationReason: string | null
  approvedUnitId: string | null
  approvedSiteIds: string[]
  decidedByProfileId: string | null
  decidedAt: string | null
  decisionReason: string | null
  workflowVersion: number
  createdAt: string
  updatedAt: string
  activation: RegistrationActivationSummary | null
  activationToken?: string | null
  codeAvailable?: boolean
  replayed?: boolean
  history: RegistrationRequestEvent[]
}

export interface RegistrationReviewOption {
  id: string
  label: string
}

export interface RegistrationReviewData {
  source: "supabase" | "unavailable"
  generatedAt: string
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | "database_not_configured" | null
  requests: RegistrationRequestRecord[]
  units: RegistrationReviewOption[]
  sites: RegistrationReviewOption[]
}

export interface RegistrationSubmissionInput {
  role: PublicRegistrationRole
  fullName: string
  email: string
  phone?: string | null
  language: "tr" | "en" | "de" | "ru"
  unitClaim?: string | null
  proofType?: string | null
  proofReference?: string | null
  inviteCode?: string | null
  position?: string | null
  idType?: string | null
  identityDigest?: string | null
  issuingCountry?: string | null
  consent: true
  consentVersion: string
  consentTextDigest: string
  consentLocale: "tr" | "en" | "de" | "ru"
  source: "signup" | "new-level-premium"
  submissionKey?: string | null
}

export interface RegistrationSubmissionResult {
  reference: string
  lookupToken: string
  status: RegistrationStatus
  workflowVersion: number
  replayed: boolean
}

export interface RegistrationPublicStatus {
  reference: string
  requestedRole: PublicRegistrationRole
  status: RegistrationStatus
  identityReviewStatus: string
  workflowVersion: number
  lastUpdatedAt: string
  activationStatus: "pending" | "redeemed" | "revoked" | "expired" | null
  activationExpiresAt: string | null
  nextStep: "await_review" | "use_activation_invitation" | "contact_management" | "sign_in"
}

export interface RegistrationActivationStatus {
  reference: string
  requestedRole: PublicRegistrationRole
  emailMasked: string
  status: "pending" | "redeemed" | "revoked" | "expired"
  expiresAt: string
  providerMode: "supabase-auth-provider-ready"
}
