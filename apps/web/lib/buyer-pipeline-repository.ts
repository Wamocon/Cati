import "server-only"
import type { UserProfile } from "./auth"
import { isSupabaseConfigured } from "./auth"
import { createClient } from "./supabase/server"

const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

export const buyerStages = [
  "new", "contacted", "qualified", "viewing", "offer",
  "reservation", "due_diligence", "won", "lost",
] as const
export type BuyerStage = (typeof buyerStages)[number]
export const buyerSources = [
  "website", "referral", "portal", "walk_in", "phone", "partner", "import",
] as const
export type BuyerSource = (typeof buyerSources)[number]
export type ConsentStatus = "pending" | "granted" | "withdrawn"

export interface BuyerProspect {
  id: string
  siteId: string
  siteName: string
  siteCode: string | null
  unitId: string | null
  unitLabel: string | null
  fullName: string
  email: string | null
  phone: string | null
  preferredLocale: "tr" | "en" | "de" | "ru"
  source: BuyerSource
  sourceDetail: string | null
  consentStatus: ConsentStatus
  consentVersion: string | null
  consentEvidenceRecorded: boolean
  assignedManagerId: string
  assignedManagerName: string | null
  stage: BuyerStage
  followUpAt: string | null
  lossReason: string | null
  authority: "local_authoritative"
  twentySyncStatus: "provider_ready" | "queued" | "synced" | "failed"
  version: number
  createdAt: string
  updatedAt: string
}

export interface BuyerInterest {
  id: string
  prospectId: string
  unitId: string | null
  unitLabel: string | null
  priority: number
  note: string | null
}

export interface BuyerStageEvent {
  id: string
  prospectId: string
  fromStage: BuyerStage | null
  toStage: BuyerStage
  reason: string | null
  version: number
  createdAt: string
}

export interface BuyerNote {
  id: string
  prospectId: string
  body: string
  version: number
  createdAt: string
}

export interface BuyerConversion {
  id: string
  prospectId: string
  targetType: "registration_request" | "reservation"
  targetId: string
  version: number
  createdAt: string
}

export interface BuyerOption { id: string; name: string; code?: string | null }
export interface BuyerUnitOption { id: string; siteId: string; label: string }

export interface BuyerPipelineData {
  source: "supabase-live" | "unavailable"
  generatedAt: string
  mutationAvailable: boolean
  unavailableReason: "real_auth_required" | "company_scope_required" | "site_scope_required" | null
  authority: "local_authoritative"
  twentySync: "provider_ready"
  sites: BuyerOption[]
  units: BuyerUnitOption[]
  managers: BuyerOption[]
  prospects: BuyerProspect[]
  interests: BuyerInterest[]
  stageEvents: BuyerStageEvent[]
  notes: BuyerNote[]
  conversions: BuyerConversion[]
}

export interface CreateBuyerInput {
  fullName: string
  email: string | null
  phone: string | null
  source: BuyerSource
  sourceDetail: string | null
  siteId: string
  unitId: string | null
  assignedManagerId: string
  followUpAt: string | null
  consentStatus: ConsentStatus
  consentVersion: string | null
  consentTextDigest: string | null
  preferredLocale: "tr" | "en" | "de" | "ru"
  idempotencyKey: string
}

export interface UpdateBuyerInput {
  prospectId: string
  expectedVersion: number
  email: string | null
  phone: string | null
  assignedManagerId: string
  followUpAt: string | null
  sourceDetail: string | null
  consentStatus: ConsentStatus
  consentVersion: string | null
  consentTextDigest: string | null
  preferredLocale: "tr" | "en" | "de" | "ru"
  interestUnitIds: string[]
  idempotencyKey: string
}

export class BuyerPipelineRepositoryError extends Error {
  constructor(readonly code: string, message: string, readonly httpStatus: number) {
    super(message)
    this.name = "BuyerPipelineRepositoryError"
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>) : {}
}
function related(value: unknown) { return record(Array.isArray(value) ? value[0] : value) }
function text(value: unknown) { return typeof value === "string" ? value : "" }
function optional(value: unknown) { const result = text(value).trim(); return result || null }
function number(value: unknown) { const result = Number(value); return Number.isFinite(result) ? result : 0 }
function isStage(value: unknown): value is BuyerStage { return buyerStages.includes(value as BuyerStage) }
function isSource(value: unknown): value is BuyerSource { return buyerSources.includes(value as BuyerSource) }

function assertViewer(profile: UserProfile) {
  if (profile.role !== "admin" && profile.role !== "manager") {
    throw new BuyerPipelineRepositoryError(
      "BUYER_PIPELINE_FORBIDDEN", "Only administrators and scoped managers can access the buyer pipeline.", 403
    )
  }
}
function realSession(profile: UserProfile) {
  return Boolean(isSupabaseConfigured() && profile.company_id && profile.id !== ACCESS_PROFILE_ID)
}
function assertReal(profile: UserProfile) {
  if (!realSession(profile)) {
    throw new BuyerPipelineRepositoryError(
      "BUYER_PIPELINE_REAL_AUTH_REQUIRED", "Persistent buyer records require a real organization-scoped session.", 403
    )
  }
}

function databaseError(error: unknown): never {
  const row = record(error)
  const code = text(row.code)
  const message = text(row.message) || "The buyer pipeline operation failed."
  if (code === "40001" || /version conflict/i.test(message)) {
    throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_VERSION_CONFLICT", message, 409)
  }
  if (code === "42501" || /outside the authorized|access denied|lacks an active/i.test(message)) {
    throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_FORBIDDEN", message, 403)
  }
  if (code === "P0002" || /not found/i.test(message)) {
    throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_NOT_FOUND", message, 404)
  }
  if (code === "23505" || /idempotency|already|different active prospects/i.test(message)) {
    throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_CONFLICT", message, 409)
  }
  if (code === "22023" || code === "55000") {
    throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_COMMAND_INVALID", message, 422)
  }
  if (code === "42P01" || code === "42883") {
    throw new BuyerPipelineRepositoryError(
      "BUYER_PIPELINE_MIGRATION_REQUIRED", "The authoritative buyer pipeline schema is not installed yet.", 503
    )
  }
  throw new BuyerPipelineRepositoryError("BUYER_PIPELINE_UNAVAILABLE", message, 503)
}

function mapProspect(value: unknown): BuyerProspect | null {
  const row = record(value)
  if (!text(row.id) || !isStage(row.stage) || !isSource(row.source)) return null
  const site = related(row.site)
  const unit = related(row.unit)
  const manager = related(row.manager)
  const consent = text(row.consent_status) as ConsentStatus
  const locale = text(row.preferred_locale) as BuyerProspect["preferredLocale"]
  return {
    id: text(row.id), siteId: text(row.site_id), siteName: text(site.name), siteCode: optional(site.code),
    unitId: optional(row.unit_id), unitLabel: optional(unit.unit_no), fullName: text(row.full_name),
    email: optional(row.email), phone: optional(row.phone), preferredLocale: locale,
    source: row.source, sourceDetail: optional(row.source_detail), consentStatus: consent,
    consentVersion: optional(row.consent_version),
    consentEvidenceRecorded: Boolean(optional(row.consent_version)),
    assignedManagerId: text(row.assigned_manager_id),
    assignedManagerName: optional(manager.full_name) ?? optional(manager.email), stage: row.stage,
    followUpAt: optional(row.follow_up_at), lossReason: optional(row.loss_reason),
    authority: "local_authoritative", twentySyncStatus: text(row.twenty_sync_status) as BuyerProspect["twentySyncStatus"],
    version: number(row.version), createdAt: text(row.created_at), updatedAt: text(row.updated_at),
  }
}

function unavailable(profile: UserProfile): BuyerPipelineData {
  return {
    source: "unavailable", generatedAt: new Date().toISOString(), mutationAvailable: false,
    unavailableReason: profile.id === ACCESS_PROFILE_ID ? "real_auth_required" : "company_scope_required",
    authority: "local_authoritative", twentySync: "provider_ready", sites: [], units: [], managers: [],
    prospects: [], interests: [], stageEvents: [], notes: [], conversions: [],
  }
}

async function scopedSiteIds(profile: UserProfile): Promise<string[] | null> {
  if (profile.role === "admin") return null
  const supabase = await createClient()
  const { data, error } = await supabase.from("profile_site_assignments")
    .select("site_id, status, access_role, valid_from, valid_until")
    .eq("profile_id", profile.id).eq("status", "active").eq("access_role", "manager")
  if (error) databaseError(error)
  const now = Date.now()
  return (data ?? []).filter((row) => {
    const from = Date.parse(text(row.valid_from)); const until = optional(row.valid_until)
    return Number.isFinite(from) && from <= now && (!until || Date.parse(until) > now)
  }).map((row) => text(row.site_id)).filter(Boolean)
}

export async function getBuyerPipelineData(profile: UserProfile, limit = 100): Promise<BuyerPipelineData> {
  assertViewer(profile)
  if (!realSession(profile)) return unavailable(profile)
  const supabase = await createClient()
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 250)
  const siteIds = await scopedSiteIds(profile)
  const prospectsQuery = supabase.from("buyer_prospects")
    .select("id, site_id, unit_id, full_name, email, phone, preferred_locale, source, source_detail, consent_status, consent_version, assigned_manager_id, stage, follow_up_at, loss_reason, twenty_sync_status, version, created_at, updated_at, site:sites(name, code), unit:units(unit_no), manager:profiles!buyer_prospects_assigned_manager_id_fkey(full_name, email)")
    .order("updated_at", { ascending: false }).limit(safeLimit)
  const sitesQuery = supabase.from("sites").select("id, name, code")
    .eq("company_id", profile.company_id as string).order("name")
  const unitsQuery = supabase.from("units").select("id, site_id, unit_no")
    .eq("company_id", profile.company_id as string).order("site_id").order("unit_no")
  if (siteIds !== null) {
    if (siteIds.length === 0) return {
      ...unavailable(profile),
      unavailableReason: "site_scope_required",
    }
    prospectsQuery.in("site_id", siteIds)
    sitesQuery.in("id", siteIds)
    unitsQuery.in("site_id", siteIds)
  }
  const [prospectsResponse, interestsResponse, eventsResponse, notesResponse, conversionsResponse, sitesResponse, unitsResponse, managersResponse] = await Promise.all([
    prospectsQuery,
    supabase.from("buyer_prospect_interests").select("id, prospect_id, unit_id, priority, note, unit:units(unit_no)").order("priority").limit(500),
    supabase.from("buyer_prospect_stage_events").select("id, prospect_id, from_stage, to_stage, reason, prospect_version, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("buyer_prospect_notes").select("id, prospect_id, body, prospect_version, created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("buyer_prospect_conversion_links").select("id, prospect_id, target_type, target_id, prospect_version, created_at").order("created_at", { ascending: false }).limit(250),
    sitesQuery,
    unitsQuery,
    profile.role === "admin"
      ? supabase.from("profiles").select("id, full_name, email")
          .eq("company_id", profile.company_id as string).eq("role", "manager").order("full_name")
      : supabase.from("profiles").select("id, full_name, email").eq("id", profile.id),
  ])
  const error = prospectsResponse.error ?? interestsResponse.error ?? eventsResponse.error ?? notesResponse.error
    ?? conversionsResponse.error ?? sitesResponse.error ?? unitsResponse.error ?? managersResponse.error
  if (error) databaseError(error)
  return {
    source: "supabase-live", generatedAt: new Date().toISOString(), mutationAvailable: true,
    unavailableReason: null, authority: "local_authoritative", twentySync: "provider_ready",
    sites: (sitesResponse.data ?? []).map((row) => ({ id: text(row.id), name: text(row.name), code: optional(row.code) })),
    units: (unitsResponse.data ?? []).map((row) => ({
      id: text(row.id), siteId: text(row.site_id), label: text(row.unit_no),
    })),
    managers: (managersResponse.data ?? []).map((row) => ({ id: text(row.id), name: optional(row.full_name) ?? text(row.email) })),
    prospects: (prospectsResponse.data ?? []).flatMap((row) => mapProspect(row) ?? []),
    interests: (interestsResponse.data ?? []).map((raw) => { const row = record(raw); return {
      id: text(row.id), prospectId: text(row.prospect_id), unitId: optional(row.unit_id),
      unitLabel: optional(related(row.unit).unit_no), priority: number(row.priority), note: optional(row.note),
    } }),
    stageEvents: (eventsResponse.data ?? []).flatMap((raw) => { const row = record(raw); return isStage(row.to_stage) ? [{
      id: text(row.id), prospectId: text(row.prospect_id), fromStage: isStage(row.from_stage) ? row.from_stage : null,
      toStage: row.to_stage, reason: optional(row.reason), version: number(row.prospect_version), createdAt: text(row.created_at),
    }] : [] }),
    notes: (notesResponse.data ?? []).map((row) => ({ id: text(row.id), prospectId: text(row.prospect_id), body: text(row.body), version: number(row.prospect_version), createdAt: text(row.created_at) })),
    conversions: (conversionsResponse.data ?? []).map((row) => ({ id: text(row.id), prospectId: text(row.prospect_id), targetType: text(row.target_type) as BuyerConversion["targetType"], targetId: text(row.target_id), version: number(row.prospect_version), createdAt: text(row.created_at) })),
  }
}

async function rpc(profile: UserProfile, name: string, args: Record<string, unknown>) {
  assertViewer(profile); assertReal(profile)
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(name, args)
  if (error) databaseError(error)
  return record(data)
}

export function createBuyerProspect(profile: UserProfile, input: CreateBuyerInput) {
  return rpc(profile, "create_buyer_prospect_v1", {
    p_full_name: input.fullName, p_email: input.email, p_phone: input.phone,
    p_source: input.source, p_source_detail: input.sourceDetail, p_site_id: input.siteId,
    p_unit_id: input.unitId, p_assigned_manager_id: input.assignedManagerId,
    p_follow_up_at: input.followUpAt, p_consent_status: input.consentStatus,
    p_consent_version: input.consentVersion, p_consent_text_digest: input.consentTextDigest,
    p_preferred_locale: input.preferredLocale, p_idempotency_key: input.idempotencyKey,
  })
}

export function updateBuyerProspect(profile: UserProfile, input: UpdateBuyerInput) {
  return rpc(profile, "update_buyer_prospect_v1", {
    p_prospect_id: input.prospectId, p_expected_version: input.expectedVersion,
    p_email: input.email, p_phone: input.phone, p_assigned_manager_id: input.assignedManagerId,
    p_follow_up_at: input.followUpAt, p_source_detail: input.sourceDetail,
    p_consent_status: input.consentStatus, p_consent_version: input.consentVersion,
    p_consent_text_digest: input.consentTextDigest, p_preferred_locale: input.preferredLocale,
    p_interest_unit_ids: input.interestUnitIds, p_idempotency_key: input.idempotencyKey,
  })
}

export function transitionBuyerProspect(profile: UserProfile, input: { prospectId: string; expectedVersion: number; toStage: BuyerStage; reason: string | null; idempotencyKey: string }) {
  return rpc(profile, "transition_buyer_prospect_v1", { p_prospect_id: input.prospectId, p_expected_version: input.expectedVersion, p_to_stage: input.toStage, p_reason: input.reason, p_idempotency_key: input.idempotencyKey })
}

export function addBuyerProspectNote(profile: UserProfile, input: { prospectId: string; expectedVersion: number; body: string; idempotencyKey: string }) {
  return rpc(profile, "add_buyer_prospect_note_v1", { p_prospect_id: input.prospectId, p_expected_version: input.expectedVersion, p_body: input.body, p_idempotency_key: input.idempotencyKey })
}

export function convertBuyerProspect(profile: UserProfile, input: { prospectId: string; expectedVersion: number; targetType: "registration_request" | "reservation"; targetId: string; idempotencyKey: string }) {
  return rpc(profile, "convert_buyer_prospect_v1", { p_prospect_id: input.prospectId, p_expected_version: input.expectedVersion, p_target_type: input.targetType, p_target_id: input.targetId, p_idempotency_key: input.idempotencyKey })
}
