import { createHmac, randomBytes } from "node:crypto"
import { isSupabaseConfigured, type UserProfile } from "./auth"
import { createClient } from "./supabase/server"
import type {
  PublicRegistrationRole,
  RegistrationActivationSummary,
  RegistrationActivationStatus,
  RegistrationPublicStatus,
  RegistrationRecommendation,
  RegistrationRequestRecord,
  RegistrationRequestEvent,
  RegistrationReviewData,
  RegistrationSubmissionInput,
  RegistrationSubmissionResult,
} from "./registration"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export class RegistrationRepositoryError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "RegistrationRepositoryError"
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

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}

function registrationFromRecord(value: unknown): RegistrationRequestRecord {
  const row = asRecord(value)
  const activationValue = row.activation ?? row.registration_activation_invitations
  const activationRow = Array.isArray(activationValue)
    ? asRecord(activationValue[0])
    : asRecord(activationValue)
  const role = asString(row.requestedRole ?? row.requested_role)
  const status = asString(row.status)
  const recommendation = optionalString(
    row.managerRecommendation ?? row.manager_recommendation
  )
  const activationStatus = asString(activationRow.status)
  const historyValue = row.history ?? row.registration_request_events
  const history: RegistrationRequestEvent[] = (Array.isArray(historyValue) ? historyValue : [])
    .map<RegistrationRequestEvent | null>((value) => {
      const event = asRecord(value)
      const eventType = asString(event.eventType ?? event.event_type)
      if (
        eventType !== "submitted" &&
        eventType !== "manager_recommended" &&
        eventType !== "approved" &&
        eventType !== "rejected" &&
        eventType !== "activated"
      ) return null
      return {
        id: asString(event.id),
        eventType: eventType as RegistrationRequestEvent["eventType"],
        requestVersion: Number(event.requestVersion ?? event.request_version ?? 1),
        actorProfileId: optionalString(event.actorProfileId ?? event.actor_profile_id),
        reason: optionalString(event.reason),
        createdAt: asString(event.createdAt ?? event.created_at),
      }
    })
    .filter((value): value is NonNullable<typeof value> => value !== null)
    .sort((left, right) => left.requestVersion - right.requestVersion)
  const activation: RegistrationActivationSummary | null = asString(activationRow.id)
    ? {
        id: asString(activationRow.id),
        status:
          activationStatus === "redeemed" ||
          activationStatus === "revoked" ||
          activationStatus === "expired"
            ? (activationStatus as RegistrationActivationSummary["status"])
            : new Date(asString(activationRow.expires_at ?? activationRow.expiresAt)).getTime() <= Date.now()
              ? ("expired" as const)
              : ("pending" as const),
        expiresAt: asString(activationRow.expiresAt ?? activationRow.expires_at),
        tokenHint: asString(activationRow.tokenHint ?? activationRow.token_hint),
        redeemedAt: optionalString(activationRow.redeemedAt ?? activationRow.redeemed_at),
        providerMode: "supabase-auth-provider-ready" as const,
      }
    : null

  return {
    id: asString(row.id),
    companyId: asString(row.companyId ?? row.company_id),
    reference: asString(row.reference ?? row.public_reference),
    requestedRole:
      role === "tenant" || role === "staff" ? role : ("owner" as PublicRegistrationRole),
    fullName: asString(row.fullName ?? row.full_name),
    email: asString(row.email),
    emailMasked: asString(row.emailMasked ?? row.email_masked),
    phone: optionalString(row.phone),
    language:
      row.language === "en" || row.language === "de" || row.language === "ru"
        ? row.language
        : "tr",
    unitClaim: optionalString(row.unitClaim ?? row.unit_claim),
    proofType: optionalString(row.proofType ?? row.proof_type),
    proofReference: optionalString(row.proofReference ?? row.proof_reference),
    linkedTenantInvitationId: optionalString(
      row.linkedTenantInvitationId ?? row.linked_tenant_invitation_id
    ),
    position: optionalString(row.position),
    identityType: optionalString(row.identityType ?? row.identity_type),
    identityNumberMasked: optionalString(
      row.identityNumberMasked ?? row.identity_number_masked
    ),
    identityReviewStatus: asString(
      row.identityReviewStatus ?? row.identity_review_status
    ),
    consentVersion: asString(row.consentVersion ?? row.consent_version),
    consentLocale: asString(row.consentLocale ?? row.consent_locale),
    consentAcceptedAt: asString(
      row.consentAcceptedAt ?? row.consent_accepted_at
    ),
    source: asString(row.source),
    status:
      status === "under_review" ||
      status === "approved" ||
      status === "rejected" ||
      status === "activated"
        ? status
        : "submitted",
    managerRecommendation:
      recommendation === "approve" ||
      recommendation === "reject" ||
      recommendation === "more_information"
        ? recommendation
        : null,
    managerRecommendedBy: optionalString(
      row.managerRecommendedBy ?? row.manager_recommended_by
    ),
    managerRecommendedAt: optionalString(
      row.managerRecommendedAt ?? row.manager_recommended_at
    ),
    managerRecommendationReason: optionalString(
      row.managerRecommendationReason ?? row.manager_recommendation_reason
    ),
    approvedUnitId: optionalString(row.approvedUnitId ?? row.approved_unit_id),
    approvedSiteIds: asStringArray(row.approvedSiteIds ?? row.approved_site_ids),
    decidedByProfileId: optionalString(
      row.decidedByProfileId ?? row.decided_by_profile_id
    ),
    decidedAt: optionalString(row.decidedAt ?? row.decided_at),
    decisionReason: optionalString(row.decisionReason ?? row.decision_reason),
    workflowVersion: Number(row.workflowVersion ?? row.workflow_version ?? 1),
    createdAt: asString(row.createdAt ?? row.created_at),
    updatedAt: asString(row.updatedAt ?? row.updated_at),
    activation,
    activationToken: optionalString(row.activationToken),
    codeAvailable: row.codeAvailable === true,
    replayed: row.replayed === true,
    history,
  }
}

function throwDatabaseError(error: unknown): never {
  const row = asRecord(error)
  const dbCode = asString(row.code)
  const message = asString(row.message) || "Registration operation failed."
  if (dbCode === "40001" || /version conflict/i.test(message)) {
    throw new RegistrationRepositoryError("REGISTRATION_VERSION_CONFLICT", message, 409)
  }
  if (dbCode === "42501" || /authority|authentication|outside your organization|confirmed email/i.test(message)) {
    throw new RegistrationRepositoryError("REGISTRATION_FORBIDDEN", message, 403)
  }
  if (dbCode === "P0002" || /not found/i.test(message)) {
    throw new RegistrationRepositoryError("REGISTRATION_NOT_FOUND", message, 404)
  }
  if (dbCode === "23505" || /idempotency|already|multiple resident/i.test(message)) {
    throw new RegistrationRepositoryError("REGISTRATION_CONFLICT", message, 409)
  }
  if (dbCode === "22023" || /invalid|required|must|expired|unsupported|too long/i.test(message)) {
    throw new RegistrationRepositoryError("REGISTRATION_VALIDATION_FAILED", message, 422)
  }
  throw new RegistrationRepositoryError(
    "REGISTRATION_UNAVAILABLE",
    "Registration is temporarily unavailable.",
    503
  )
}

function requireDatabase() {
  if (!isSupabaseConfigured()) {
    throw new RegistrationRepositoryError(
      "REGISTRATION_DATABASE_NOT_CONFIGURED",
      "Registration persistence is not configured in this environment.",
      503
    )
  }
}

function createPrivateReceiptToken(submissionKey: string) {
  const secret =
    process.env.REGISTRATION_RECEIPT_PEPPER ??
    (process.env.NODE_ENV !== "production"
      ? "local-qa-only-registration-receipt-key"
      : null)
  if (!secret) {
    throw new RegistrationRepositoryError(
      "REGISTRATION_RECEIPT_PROTECTION_UNAVAILABLE",
      "Registration receipt protection is not configured.",
      503
    )
  }
  return createHmac("sha256", secret)
    .update(`1cati-registration-receipt:${submissionKey}`)
    .digest("hex")
}

export async function submitRegistration(
  input: RegistrationSubmissionInput
): Promise<RegistrationSubmissionResult> {
  requireDatabase()
  const submissionKey = input.submissionKey?.trim() || randomBytes(18).toString("hex")
  // A dedicated server-only pepper keeps an idempotent retry stable without
  // making the private receipt derivable from caller-controlled input.
  const lookupToken = createPrivateReceiptToken(submissionKey)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("submit_registration_request", {
    p_payload: {
      role: input.role,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone ?? null,
      language: input.language,
      unitClaim: input.unitClaim ?? null,
      proofType: input.proofType ?? null,
      proofReference: input.proofReference ?? null,
      inviteCode: input.inviteCode ?? null,
      position: input.position ?? null,
      idType: input.idType ?? null,
      identityDigest: input.identityDigest ?? null,
      issuingCountry: input.issuingCountry ?? null,
      consent: input.consent,
      consentVersion: input.consentVersion,
      consentTextDigest: input.consentTextDigest,
      consentLocale: input.consentLocale,
      source: input.source,
    },
    p_lookup_token: lookupToken,
    p_submission_key: submissionKey,
  })
  if (error) throwDatabaseError(error)
  const row = asRecord(data)
  return {
    reference: asString(row.reference),
    lookupToken,
    status:
      row.status === "under_review" ||
      row.status === "approved" ||
      row.status === "rejected" ||
      row.status === "activated"
        ? row.status
        : "submitted",
    workflowVersion: Number(row.workflowVersion ?? 1),
    replayed: row.replayed === true,
  }
}

export async function getRegistrationPublicStatus(
  reference: string,
  lookupToken: string
): Promise<RegistrationPublicStatus | null> {
  requireDatabase()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_registration_request_status", {
    p_reference: reference,
    p_lookup_token: lookupToken,
  })
  if (error) throwDatabaseError(error)
  return data ? (data as RegistrationPublicStatus) : null
}

export async function getRegistrationActivationStatus(
  reference: string,
  activationToken: string
): Promise<RegistrationActivationStatus | null> {
  requireDatabase()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("get_registration_activation_status", {
    p_reference: reference,
    p_activation_token: activationToken,
  })
  if (error) throwDatabaseError(error)
  return data ? (data as RegistrationActivationStatus) : null
}

function isRealProfile(profile: UserProfile) {
  return isSupabaseConfigured() && profile.id !== ACCESS_PROFILE_ID
}

export async function getRegistrationReviewData(
  profile: UserProfile
): Promise<RegistrationReviewData> {
  if (!isSupabaseConfigured()) {
    return {
      source: "unavailable",
      generatedAt: new Date().toISOString(),
      mutationAvailable: false,
      unavailableReason: "database_not_configured",
      requests: [],
      units: [],
      sites: [],
    }
  }
  if (!isRealProfile(profile)) {
    return {
      source: "unavailable",
      generatedAt: new Date().toISOString(),
      mutationAvailable: false,
      unavailableReason: "real_auth_required",
      requests: [],
      units: [],
      sites: [],
    }
  }

  const supabase = await createClient()
  const workspaceResponse = await supabase.rpc("registration_review_workspace")
  if (workspaceResponse.error) throwDatabaseError(workspaceResponse.error)
  const workspace = asRecord(workspaceResponse.data)
  const requests = Array.isArray(workspace.requests) ? workspace.requests : []
  const units = Array.isArray(workspace.units) ? workspace.units : []
  const sites = Array.isArray(workspace.sites) ? workspace.sites : []

  return {
    source: "supabase",
    generatedAt: new Date().toISOString(),
    mutationAvailable: true,
    unavailableReason: null,
    requests: requests.map(registrationFromRecord),
    units: units.flatMap((value) => {
      const row = asRecord(value)
      const id = asString(row.id)
      if (!id) return []
      return [{
        id,
        label: [asString(row.siteName), asString(row.unitNo)]
          .filter(Boolean)
          .join(" · "),
      }]
    }),
    sites: sites.flatMap((value) => {
      const row = asRecord(value)
      const id = asString(row.id)
      if (!id) return []
      return [{ id, label: asString(row.name) || asString(row.code) }]
    }),
  }
}

export async function recommendRegistration(input: {
  requestId: string
  expectedVersion: number
  recommendation: RegistrationRecommendation
  reason: string
  idempotencyKey: string
}): Promise<RegistrationRequestRecord> {
  requireDatabase()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    "recommend_registration_request_command",
    {
      p_registration_request_id: input.requestId,
      p_expected_version: input.expectedVersion,
      p_recommendation: input.recommendation,
      p_reason: input.reason,
      p_idempotency_key: input.idempotencyKey,
    }
  )
  if (error) throwDatabaseError(error)
  return registrationFromRecord(data)
}

export async function decideRegistration(input: {
  requestId: string
  expectedVersion: number
  decision: "approve" | "reject"
  reason: string
  activationExpiresAt: string | null
  unitId: string | null
  siteIds: string[]
  idempotencyKey: string
}): Promise<RegistrationRequestRecord> {
  requireDatabase()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("decide_registration_request_command", {
    p_registration_request_id: input.requestId,
    p_expected_version: input.expectedVersion,
    p_decision: input.decision,
    p_reason: input.reason,
    p_activation_expires_at: input.activationExpiresAt,
    p_unit_id: input.unitId,
    p_site_ids: input.siteIds,
    p_idempotency_key: input.idempotencyKey,
  })
  if (error) throwDatabaseError(error)
  return registrationFromRecord(data)
}

export async function redeemRegistrationActivation(input: {
  reference: string
  activationToken: string
  idempotencyKey: string
}) {
  requireDatabase()
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(
    "redeem_registration_activation_command",
    {
      p_reference: input.reference,
      p_activation_token: input.activationToken,
      p_idempotency_key: input.idempotencyKey,
    }
  )
  if (error) throwDatabaseError(error)
  return asRecord(data)
}
