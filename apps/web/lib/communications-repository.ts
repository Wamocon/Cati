import { isSupabaseConfigured, type UserProfile } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const LOCAL_ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"
export const COMMUNICATIONS_CONTRACT_VERSION = "portal-communications.v2"

export type CommunicationLocale = "tr" | "en" | "de" | "ru"
export type CommunicationChannel =
  | "portal"
  | "email"
  | "sms"
  | "whatsapp"
  | "push"

export interface CommunicationThreadSummary {
  id: string
  subject: string
  scopeKind: string
  status: string
  priority: string
  locale: CommunicationLocale
  siteId: string | null
  unitId: string | null
  unitLabel: string | null
  assignedProfileId: string | null
  unreadCount: number
  participantCount: number
  lastMessagePreview: string | null
  lastMessageAt: string | null
  version: number
  canReply: boolean
  canManage: boolean
}

export interface CommunicationMessage {
  id: string
  senderProfileId: string | null
  senderLabel: string
  senderRole: string
  body: string
  locale: CommunicationLocale
  channel: CommunicationChannel
  lifecycleState: string
  scheduledFor: string | null
  createdAt: string
  attachments: Array<{ documentId: string; fileUrl: string }>
  readByCurrentUser: boolean
}

export interface CommunicationWorkspace {
  contractVersion: typeof COMMUNICATIONS_CONTRACT_VERSION
  source: "supabase" | "unavailable"
  generatedAt: string
  mutationAvailable: boolean
  unavailableReason: string | null
  roleScope: string
  providerBoundary: {
    portal: "live" | "database_required"
    email: "provider-ready"
    sms: "provider-ready"
    whatsapp: "provider-ready"
    push: "provider-ready"
  }
  realtimeTables: string[]
  summary: {
    openThreads: number
    unreadMessages: number
    failedDeliveries: number
    deadLetters: number
    scheduledMessages: number
  }
  targets: {
    sites: Array<{ id: string; label: string }>
    units: Array<{ id: string; siteId: string; label: string }>
    participants: Array<{
      profileId: string
      displayLabel: string
      role: string
      siteId: string
      unitId: string | null
    }>
  }
  threads: CommunicationThreadSummary[]
  selectedThread: null | {
    thread: CommunicationThreadSummary
    participants: Array<{
      profileId: string
      displayLabel: string
      role: string
      active: boolean
    }>
    messages: CommunicationMessage[]
  }
  templates: Array<{
    id: string
    name: string
    purpose: string
    channel: CommunicationChannel
    status: string
    siteId: string | null
    version: number
    variants: Array<{ locale: CommunicationLocale; subject: string; body: string }>
  }>
  deliveries: Array<{
    id: string
    threadId: string
    messageId: string
    channel: CommunicationChannel
    state: string
    recipientLabel: string
    retryCount: number
    maxRetries: number
    nextRetryAt: string | null
    lastError: string | null
    providerAcknowledgedAt: string | null
    version: number
  }>
  outbox: Array<{
    id: string
    deliveryId: string
    channel: Exclude<CommunicationChannel, "portal">
    status: string
    retryCount: number
    maxRetries: number
    nextRetryAt: string | null
    lastError: string | null
  }>
  preferences: Array<{
    channel: string
    purpose: string
    status: string
    effectiveAt: string
  }>
}

export class CommunicationDomainError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message)
    this.name = "CommunicationDomainError"
  }
}

type DataRecord = Record<string, unknown>

const realtimeTables = [
  "portal_communication_threads",
  "portal_communication_messages",
  "portal_communication_message_receipts",
  "portal_communication_deliveries",
  "portal_communication_outbox",
]

function asRecord(value: unknown): DataRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as DataRecord)
    : {}
}

function asRecords(value: unknown): DataRecord[] {
  return Array.isArray(value) ? value.map(asRecord) : []
}

function text(row: DataRecord, key: string, fallback = "") {
  return typeof row[key] === "string" ? (row[key] as string) : fallback
}

function nullableText(row: DataRecord, key: string) {
  return typeof row[key] === "string" ? (row[key] as string) : null
}

function integer(row: DataRecord, key: string, fallback = 0) {
  return typeof row[key] === "number" && Number.isFinite(row[key])
    ? Math.trunc(row[key] as number)
    : fallback
}

function boolean(row: DataRecord, key: string, fallback = false) {
  return typeof row[key] === "boolean" ? (row[key] as boolean) : fallback
}

function locale(value: unknown): CommunicationLocale {
  return value === "en" || value === "de" || value === "ru" ? value : "tr"
}

function channel(value: unknown): CommunicationChannel {
  return value === "email" || value === "sms" || value === "whatsapp" || value === "push"
    ? value
    : "portal"
}

function roleScope(profile: UserProfile) {
  const scopes: Record<UserProfile["role"], string> = {
    admin: "organization",
    manager: "managed_sites",
    accountant: "finance",
    staff: "exact_assignments",
    owner: "verified_owner_units",
    tenant: "invited_tenant_units",
    guest: "guest_access",
    service_provider: "vendor_assignments",
    child_owner: "managed_minor",
    child_tenant: "managed_minor",
    child_guest: "managed_minor",
  }
  return scopes[profile.role]
}

function unavailableWorkspace(
  profile: UserProfile,
  reason: string
): CommunicationWorkspace {
  return {
    contractVersion: COMMUNICATIONS_CONTRACT_VERSION,
    source: "unavailable",
    generatedAt: new Date().toISOString(),
    mutationAvailable: false,
    unavailableReason: reason,
    roleScope: roleScope(profile),
    providerBoundary: {
      portal: "database_required",
      email: "provider-ready",
      sms: "provider-ready",
      whatsapp: "provider-ready",
      push: "provider-ready",
    },
    realtimeTables,
    summary: {
      openThreads: 0,
      unreadMessages: 0,
      failedDeliveries: 0,
      deadLetters: 0,
      scheduledMessages: 0,
    },
    targets: { sites: [], units: [], participants: [] },
    threads: [],
    selectedThread: null,
    templates: [],
    deliveries: [],
    outbox: [],
    preferences: [],
  }
}

function repositoryError(error: unknown): CommunicationDomainError {
  const record = asRecord(error)
  const postgresCode = text(record, "code")
  const message = text(record, "message", "Communication command failed.")
  if (postgresCode === "42501") {
    return new CommunicationDomainError(message, "COMM_FORBIDDEN", 403)
  }
  if (postgresCode === "40001" || postgresCode === "23505") {
    return new CommunicationDomainError(message, "COMM_VERSION_CONFLICT", 409)
  }
  if (postgresCode === "55000") {
    return new CommunicationDomainError(message, "COMM_STATE_CONFLICT", 409)
  }
  if (postgresCode === "42P01" || postgresCode === "42883") {
    return new CommunicationDomainError(
      "The persistent communications migration is required.",
      "COMM_MIGRATION_REQUIRED",
      503
    )
  }
  if (postgresCode === "22023" || postgresCode === "23514") {
    return new CommunicationDomainError(message, "COMM_VALIDATION_FAILED", 422)
  }
  return new CommunicationDomainError(
    "The communication workspace is temporarily unavailable.",
    "COMM_REPOSITORY_UNAVAILABLE",
    500
  )
}

function throwIfError(error: unknown) {
  if (error) throw repositoryError(error)
}

export async function getCommunicationsWorkspace(
  profile: UserProfile,
  options: {
    selectedThreadId?: string | null
    limit?: number
    useLocalAccessProfile?: boolean
  } = {}
): Promise<CommunicationWorkspace> {
  if (
    options.useLocalAccessProfile ||
    profile.id === LOCAL_ACCESS_PROFILE_ID ||
    !isSupabaseConfigured()
  ) {
    return unavailableWorkspace(profile, "real_auth_required")
  }
  if (!profile.company_id) {
    return unavailableWorkspace(profile, "organization_profile_required")
  }

  const supabase = await createClient()
  const limit = Math.min(Math.max(Math.trunc(options.limit ?? 75), 1), 100)
  const internalEvidence =
    profile.role === "admin" || profile.role === "manager" || profile.role === "accountant"
  const [threadResult, siteResult, unitResult, candidateResult, templateResult, preferenceResult] =
    await Promise.all([
      supabase
        .from("portal_communication_threads")
        .select("*")
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(limit),
      supabase.from("sites").select("id,name").order("name").limit(250),
      supabase.from("units").select("id,site_id,unit_no").order("unit_no").limit(1000),
      supabase.rpc("portal_communication_participant_candidates"),
      supabase.from("portal_communication_templates").select("*").order("name").limit(100),
      supabase
        .from("portal_communication_consents")
        .select("channel,purpose,status,effective_at")
        .eq("profile_id", profile.id)
        .limit(100),
    ])

  const deliveryResult = internalEvidence
    ? await supabase
        .from("portal_communication_delivery_evidence")
        .select("id,thread_id,message_id,channel,delivery_state,recipient_label,retry_count,max_retries,next_retry_at,last_error,provider_acknowledged_at,version,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100)
    : await supabase
        .from("portal_communication_delivery_status")
        .select("id,thread_id,message_id,channel,delivery_state,provider_acknowledged_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100)
  const outboxResult = internalEvidence
    ? await supabase
        .from("portal_communication_outbox")
        .select("id,delivery_id,channel,status,retry_count,max_retries,next_retry_at,last_error")
        .order("updated_at", { ascending: false })
        .limit(100)
    : { data: [], error: null }
  const now = new Date().toISOString()
  const assignmentResult = profile.role === "manager"
    ? await supabase
        .from("profile_site_assignments")
        .select("site_id")
        .eq("profile_id", profile.id)
        .eq("status", "active")
        .lte("valid_from", now)
        .or(`valid_until.is.null,valid_until.gt.${now}`)
        .limit(250)
    : { data: [], error: null }

  for (const error of [
    threadResult.error,
    siteResult.error,
    unitResult.error,
    candidateResult.error,
    templateResult.error,
    deliveryResult.error,
    outboxResult.error,
    preferenceResult.error,
    assignmentResult.error,
  ]) {
    throwIfError(error)
  }

  const threadRows = asRecords(threadResult.data)
  const threadIds = threadRows.map((row) => text(row, "id")).filter(Boolean)
  const selectedThreadId =
    options.selectedThreadId && threadIds.includes(options.selectedThreadId)
      ? options.selectedThreadId
      : threadIds[0] ?? null

  const messageResult = threadIds.length
    ? await supabase
        .from("portal_communication_messages")
        .select("*")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: true })
        .limit(1000)
    : { data: [], error: null }
  const participantResult = threadIds.length
    ? await supabase
        .from("portal_communication_participants")
        .select("*")
        .in("thread_id", threadIds)
        .limit(1000)
    : { data: [], error: null }
  const receiptResult = threadIds.length
    ? await supabase
        .from("portal_communication_message_receipts")
        .select("message_id,profile_id,read_at")
        .in("thread_id", threadIds)
        .limit(2000)
    : { data: [], error: null }
  const attachmentResult = selectedThreadId
    ? await supabase
        .from("portal_communication_attachments")
        .select("message_id,document_id")
        .eq("thread_id", selectedThreadId)
        .limit(250)
    : { data: [], error: null }
  const templateIds = asRecords(templateResult.data).map((row) => text(row, "id")).filter(Boolean)
  const variantResult = templateIds.length
    ? await supabase
        .from("portal_communication_template_variants")
        .select("template_id,locale,subject,body")
        .in("template_id", templateIds)
        .limit(500)
    : { data: [], error: null }

  for (const error of [
    messageResult.error,
    participantResult.error,
    receiptResult.error,
    attachmentResult.error,
    variantResult.error,
  ]) {
    throwIfError(error)
  }

  const unitRows = asRecords(unitResult.data)
  const unitLabels = new Map(unitRows.map((row) => [text(row, "id"), text(row, "unit_no")]))
  const messageRows = asRecords(messageResult.data)
  const participantRows = asRecords(participantResult.data)
  const receiptRows = asRecords(receiptResult.data)
  const readMessageIds = new Set(
    receiptRows
      .filter((row) => text(row, "profile_id") === profile.id && nullableText(row, "read_at"))
      .map((row) => text(row, "message_id"))
  )
  const managerRole = profile.role === "admin" || profile.role === "manager" || profile.role === "accountant"

  const threads = threadRows.map<CommunicationThreadSummary>((row) => {
    const id = text(row, "id")
    const threadMessages = messageRows.filter((message) => text(message, "thread_id") === id)
    const unreadCount = threadMessages.filter(
      (message) =>
        nullableText(message, "sender_profile_id") !== profile.id &&
        !readMessageIds.has(text(message, "id"))
    ).length
    return {
      id,
      subject: text(row, "subject"),
      scopeKind: text(row, "scope_kind"),
      status: text(row, "status"),
      priority: text(row, "priority"),
      locale: locale(row.locale),
      siteId: nullableText(row, "site_id"),
      unitId: nullableText(row, "unit_id"),
      unitLabel: unitLabels.get(nullableText(row, "unit_id") ?? "") ?? null,
      assignedProfileId: nullableText(row, "assigned_profile_id"),
      unreadCount,
      participantCount: participantRows.filter(
        (participant) => text(participant, "thread_id") === id && boolean(participant, "active")
      ).length,
      lastMessagePreview: nullableText(row, "last_message_preview"),
      lastMessageAt: nullableText(row, "last_message_at"),
      version: integer(row, "version", 1),
      canReply: text(row, "status") === "open",
      canManage: managerRole,
    }
  })

  const attachmentRows = asRecords(attachmentResult.data)
  const selectedSummary = threads.find((thread) => thread.id === selectedThreadId) ?? null
  const selectedThread = selectedSummary
    ? {
        thread: selectedSummary,
        participants: participantRows
          .filter((row) => text(row, "thread_id") === selectedSummary.id)
          .map((row) => ({
            profileId: text(row, "profile_id"),
            displayLabel: text(row, "display_label", "Member"),
            role: text(row, "role_at_add"),
            active: boolean(row, "active"),
          })),
        messages: messageRows
          .filter((row) => text(row, "thread_id") === selectedSummary.id)
          .map<CommunicationMessage>((row) => ({
            id: text(row, "id"),
            senderProfileId: nullableText(row, "sender_profile_id"),
            senderLabel: text(row, "sender_label", "Member"),
            senderRole: text(row, "sender_role"),
            body: text(row, "body"),
            locale: locale(row.locale),
            channel: channel(row.channel),
            lifecycleState: text(row, "lifecycle_state"),
            scheduledFor: nullableText(row, "scheduled_for"),
            createdAt: text(row, "created_at"),
            attachments: attachmentRows
              .filter((attachment) => text(attachment, "message_id") === text(row, "id"))
              .map((attachment) => {
                const documentId = text(attachment, "document_id")
                return {
                  documentId,
                  fileUrl: `/api/site-management/documents/${documentId}/file`,
                }
              }),
            readByCurrentUser: readMessageIds.has(text(row, "id")),
          })),
      }
    : null

  const variantRows = asRecords(variantResult.data)
  const deliveryRows = asRecords(deliveryResult.data)
  const outboxRows = asRecords(outboxResult.data)
  const scheduledMessages = messageRows.filter(
    (row) => text(row, "lifecycle_state") === "scheduled"
  ).length
  const threadSiteIds = new Set(
    threadRows
      .map((row) => nullableText(row, "site_id"))
      .filter((id): id is string => Boolean(id))
  )
  const threadUnitIds = new Set(
    threadRows
      .map((row) => nullableText(row, "unit_id"))
      .filter((id): id is string => Boolean(id))
  )
  // F13: Accountant (roleScope "finance" = firmenweit) erhält wie der Admin alle
  // firmen-sichtbaren Sites als Ziel, sonst gäbe es beim ersten Gespräch keine
  // auswählbare Anlage (Bootstrap-Deadlock). Die RLS erzwingt die echte Grenze.
  const targetSiteIds = profile.role === "admin" || profile.role === "accountant"
    ? new Set(asRecords(siteResult.data).map((row) => text(row, "id")))
    : profile.role === "manager"
      ? new Set([
          ...threadSiteIds,
          ...asRecords(assignmentResult.data)
            .map((row) => text(row, "site_id"))
            .filter(Boolean),
        ])
      : threadSiteIds
  const targetSiteRows = asRecords(siteResult.data).filter((row) =>
    targetSiteIds.has(text(row, "id"))
  )
  const targetUnitRows = unitRows.filter((row) => {
    if (!targetSiteIds.has(text(row, "site_id"))) return false
    return profile.role === "admin" || profile.role === "manager"
      ? true
      : threadUnitIds.has(text(row, "id"))
  })

  return {
    contractVersion: COMMUNICATIONS_CONTRACT_VERSION,
    source: "supabase",
    generatedAt: new Date().toISOString(),
    mutationAvailable: true,
    unavailableReason: null,
    roleScope: roleScope(profile),
    providerBoundary: {
      portal: "live",
      email: "provider-ready",
      sms: "provider-ready",
      whatsapp: "provider-ready",
      push: "provider-ready",
    },
    realtimeTables,
    summary: {
      openThreads: threads.filter((thread) => thread.status === "open").length,
      unreadMessages: threads.reduce((total, thread) => total + thread.unreadCount, 0),
      failedDeliveries: deliveryRows.filter((row) => text(row, "delivery_state") === "failed").length,
      deadLetters: outboxRows.filter((row) => text(row, "status") === "dead_letter").length,
      scheduledMessages,
    },
    targets: {
      sites: targetSiteRows.map((row) => ({ id: text(row, "id"), label: text(row, "name") })),
      units: targetUnitRows.map((row) => ({
        id: text(row, "id"),
        siteId: text(row, "site_id"),
        label: text(row, "unit_no"),
      })),
      participants: asRecords(candidateResult.data)
        .filter((row) => targetSiteIds.has(text(row, "site_id")))
        .map((row) => ({
          profileId: text(row, "profile_id"),
          displayLabel: text(row, "display_label", "Member"),
          role: text(row, "profile_role"),
          siteId: text(row, "site_id"),
          unitId: nullableText(row, "unit_id"),
        })),
    },
    threads,
    selectedThread,
    templates: asRecords(templateResult.data).map((row) => ({
      id: text(row, "id"),
      name: text(row, "name"),
      purpose: text(row, "purpose"),
      channel: channel(row.channel),
      status: text(row, "status"),
      siteId: nullableText(row, "site_id"),
      version: integer(row, "version", 1),
      variants: variantRows
        .filter((variant) => text(variant, "template_id") === text(row, "id"))
        .map((variant) => ({
          locale: locale(variant.locale),
          subject: text(variant, "subject"),
          body: text(variant, "body"),
        })),
    })),
    deliveries: deliveryRows.map((row) => ({
      id: text(row, "id"),
      threadId: text(row, "thread_id"),
      messageId: text(row, "message_id"),
      channel: channel(row.channel),
      state: text(row, "delivery_state"),
      recipientLabel: text(row, "recipient_label", "Portal participant"),
      retryCount: integer(row, "retry_count"),
      maxRetries: integer(row, "max_retries", 5),
      nextRetryAt: nullableText(row, "next_retry_at"),
      lastError: nullableText(row, "last_error"),
      providerAcknowledgedAt: nullableText(row, "provider_acknowledged_at"),
      version: integer(row, "version", 1),
    })),
    outbox: outboxRows.map((row) => ({
      id: text(row, "id"),
      deliveryId: text(row, "delivery_id"),
      channel: channel(row.channel) as Exclude<CommunicationChannel, "portal">,
      status: text(row, "status"),
      retryCount: integer(row, "retry_count"),
      maxRetries: integer(row, "max_retries", 5),
      nextRetryAt: nullableText(row, "next_retry_at"),
      lastError: nullableText(row, "last_error"),
    })),
    preferences: asRecords(preferenceResult.data).map((row) => ({
      channel: text(row, "channel"),
      purpose: text(row, "purpose"),
      status: text(row, "status"),
      effectiveAt: text(row, "effective_at"),
    })),
  }
}

async function rpcResult(
  data: unknown,
  error: unknown
): Promise<{ replayed: boolean; result: DataRecord }> {
  throwIfError(error)
  const response = asRecord(data)
  return {
    replayed: boolean(response, "replayed"),
    result: asRecord(response.result),
  }
}

export async function createCommunicationThread(input: {
  siteId: string
  unitId: string | null
  subject: string
  scopeKind: string
  priority: string
  locale: CommunicationLocale
  assignedProfileId: string | null
  participantProfileIds: string[]
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_portal_communication_thread_command", {
    p_site_id: input.siteId,
    p_unit_id: input.unitId,
    p_subject: input.subject,
    p_scope_kind: input.scopeKind,
    p_priority: input.priority,
    p_locale: input.locale,
    p_assigned_profile_id: input.assignedProfileId,
    p_participant_profile_ids: input.participantProfileIds,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function postCommunicationMessage(input: {
  threadId: string
  body: string
  locale: CommunicationLocale
  channel: CommunicationChannel
  scheduledFor: string | null
  documentIds: string[]
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("post_portal_communication_message_command", {
    p_thread_id: input.threadId,
    p_body: input.body,
    p_locale: input.locale,
    p_channel: input.channel,
    p_scheduled_for: input.scheduledFor,
    p_document_ids: input.documentIds,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function markCommunicationMessageRead(input: {
  messageId: string
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("mark_portal_communication_message_read_command", {
    p_message_id: input.messageId,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function retryCommunicationDelivery(input: {
  deliveryId: string
  expectedVersion: number
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("retry_portal_communication_delivery_command", {
    p_delivery_id: input.deliveryId,
    p_expected_version: input.expectedVersion,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function cancelCommunicationDelivery(input: {
  deliveryId: string
  expectedVersion: number
  reason: string
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("cancel_portal_communication_delivery_command", {
    p_delivery_id: input.deliveryId,
    p_expected_version: input.expectedVersion,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function saveCommunicationTemplate(input: {
  templateId: string | null
  siteId: string
  name: string
  purpose: string
  channel: CommunicationChannel
  status: string
  expectedVersion: number
  variants: Array<{ locale: CommunicationLocale; subject: string; body: string }>
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("save_portal_communication_template_command", {
    p_template_id: input.templateId,
    p_site_id: input.siteId,
    p_name: input.name,
    p_purpose: input.purpose,
    p_channel: input.channel,
    p_status: input.status,
    p_expected_version: input.expectedVersion,
    p_variants: input.variants,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}

export async function createCommunicationBroadcast(input: {
  templateId: string
  name: string
  members: Array<{
    profileId: string | null
    unitId: string | null
    recipientLabel: string
    locale: CommunicationLocale
    channel: CommunicationChannel
  }>
  idempotencyKey: string
}) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_portal_communication_broadcast_command", {
    p_template_id: input.templateId,
    p_name: input.name,
    p_members: input.members,
    p_idempotency_key: input.idempotencyKey,
  })
  return rpcResult(data, error)
}
