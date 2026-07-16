import { type NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  cancelCommunicationDelivery,
  CommunicationDomainError,
  createCommunicationBroadcast,
  createCommunicationThread,
  getCommunicationsWorkspace,
  LOCAL_ACCESS_PROFILE_ID,
  markCommunicationMessageRead,
  postCommunicationMessage,
  retryCommunicationDelivery,
  saveCommunicationTemplate,
  type CommunicationChannel,
  type CommunicationLocale,
} from "@/lib/communications-repository"
import { hasAnyPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Authorization",
    },
  })
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function trimmed(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

function nullableTrimmed(value: unknown) {
  const result = trimmed(value)
  return result || null
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function uuid(value: unknown) {
  const result = trimmed(value)
  return uuidPattern.test(result) ? result : null
}

function uuidArray(value: unknown, max = 100) {
  if (!Array.isArray(value) || value.length > max) return null
  const values = value.map(uuid)
  return values.every((item): item is string => Boolean(item))
    ? Array.from(new Set(values))
    : null
}

function communicationLocale(value: unknown): CommunicationLocale | null {
  const result = trimmed(value)
  return result === "tr" || result === "en" || result === "de" || result === "ru"
    ? result
    : null
}

function communicationChannel(value: unknown): CommunicationChannel | null {
  const result = trimmed(value)
  return result === "portal" ||
    result === "email" ||
    result === "sms" ||
    result === "whatsapp" ||
    result === "push"
    ? result
    : null
}

function readIdempotencyKey(request: NextRequest) {
  const key = request.headers.get("Idempotency-Key")?.trim() ?? ""
  return key.length >= 8 && key.length <= 200 ? key : null
}

function readExpectedVersion(request: NextRequest) {
  const value = request.headers.get("If-Match")?.trim().replace(/^W\//, "").replaceAll('"', "") ?? ""
  const version = Number(value)
  return Number.isSafeInteger(version) && version > 0 ? version : null
}

function mutationOriginAllowed(request: NextRequest) {
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite === "cross-site") return false
  const origin = request.headers.get("origin")
  if (!origin || fetchSite === "same-origin") return true
  try {
    const originHost = new URL(origin).host.toLowerCase()
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim().toLowerCase()
    return [request.nextUrl.host, request.headers.get("host"), forwardedHost]
      .filter((host): host is string => Boolean(host))
      .map((host) => host.toLowerCase())
      .includes(originHost)
  } catch {
    return false
  }
}

function domainError(error: unknown) {
  if (error instanceof CommunicationDomainError) {
    return privateJson({ error: error.message, code: error.code }, error.status)
  }
  return privateJson(
    {
      error: "The communication workspace is temporarily unavailable.",
      code: "COMM_UNAVAILABLE",
    },
    500
  )
}

async function jsonBody(request: NextRequest, maxBytes = 32_768) {
  try {
    const declaredLength = Number(request.headers.get("content-length"))
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      return { data: null, tooLarge: true }
    }
    if (!request.body) return { data: null, tooLarge: false }
    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBytes) {
        await reader.cancel()
        return { data: null, tooLarge: true }
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return {
      data: asRecord(JSON.parse(new TextDecoder().decode(bytes)) as unknown),
      tooLarge: false,
    }
  } catch {
    return { data: null, tooLarge: false }
  }
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson({ error: "Unauthorized.", code: "COMM_UNAUTHORIZED" }, 401)
  }
  if (!hasAnyPermission(profile.role, "communications", ["view"])) {
    return privateJson(
      { error: "Your role cannot view communications.", code: "COMM_VIEW_FORBIDDEN" },
      403
    )
  }

  const selectedThreadId = uuid(request.nextUrl.searchParams.get("threadId"))
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 75)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.trunc(rawLimit), 1), 100) : 75
  try {
    return privateJson(
      await getCommunicationsWorkspace(profile, {
        selectedThreadId,
        limit,
        useLocalAccessProfile: profile.id === LOCAL_ACCESS_PROFILE_ID,
      })
    )
  } catch (error) {
    return domainError(error)
  }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) {
    return privateJson({ error: "Unauthorized.", code: "COMM_UNAUTHORIZED" }, 401)
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson({ error: "Cross-site request rejected.", code: "COMM_ORIGIN_REJECTED" }, 403)
  }
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) {
    return privateJson(
      { error: "A valid Idempotency-Key header is required.", code: "COMM_IDEMPOTENCY_REQUIRED" },
      400
    )
  }
  const parsed = await jsonBody(request)
  if (parsed.tooLarge) {
    return privateJson({ error: "Request body is too large.", code: "COMM_BODY_TOO_LARGE" }, 413)
  }
  const body = parsed.data
  if (!body) {
    return privateJson({ error: "Request body must be valid JSON.", code: "COMM_JSON_INVALID" }, 400)
  }

  const action = trimmed(body.action)
  const canCreate = hasAnyPermission(profile.role, "communications", ["create"])
  const canUpdate = hasAnyPermission(profile.role, "communications", ["update"])
  if ((action === "mark_read" ? !canUpdate && !canCreate : !canCreate)) {
    return privateJson({ error: "Role cannot perform this command.", code: "COMM_COMMAND_FORBIDDEN" }, 403)
  }
  if (profile.id === LOCAL_ACCESS_PROFILE_ID) {
    return privateJson(
      { error: "Real authentication and the portal database are required.", code: "COMM_DATABASE_REQUIRED" },
      409
    )
  }

  try {
    let command: { replayed: boolean; result: Record<string, unknown> }
    let selectedThreadId: string | null = null

    if (action === "reply") {
      const threadId = uuid(body.threadId)
      const messageBody = trimmed(body.body)
      const locale = communicationLocale(body.locale)
      const channel = communicationChannel(body.channel ?? "portal")
      const documentIds = uuidArray(body.documentIds ?? [], 20)
      const scheduledFor = nullableTrimmed(body.scheduledFor)
      if (
        !threadId || !locale || !channel || !documentIds ||
        messageBody.length < 1 || messageBody.length > 10000 ||
        (scheduledFor && Number.isNaN(new Date(scheduledFor).getTime()))
      ) {
        return privateJson({ error: "Review the message details.", code: "COMM_MESSAGE_INVALID" }, 422)
      }
      selectedThreadId = threadId
      command = await postCommunicationMessage({
        threadId,
        body: messageBody,
        locale,
        channel,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null,
        documentIds,
        idempotencyKey,
      })
    } else if (action === "create_thread") {
      const siteId = uuid(body.siteId)
      const unitId = body.unitId ? uuid(body.unitId) : null
      const subject = trimmed(body.subject)
      const scopeKind = trimmed(body.scopeKind)
      const priority = trimmed(body.priority)
      const locale = communicationLocale(body.locale)
      const assignedProfileId = body.assignedProfileId ? uuid(body.assignedProfileId) : null
      const participantProfileIds = uuidArray(body.participantProfileIds ?? [], 100)
      if (
        !siteId || (body.unitId && !unitId) || !locale || !participantProfileIds ||
        participantProfileIds.length < 1 ||
        subject.length < 1 || subject.length > 240 ||
        !["operational", "finance", "resident", "announcement"].includes(scopeKind) ||
        !["low", "medium", "high", "urgent"].includes(priority)
      ) {
        return privateJson({ error: "Review the thread details.", code: "COMM_THREAD_INVALID" }, 422)
      }
      command = await createCommunicationThread({
        siteId, unitId, subject, scopeKind, priority, locale,
        assignedProfileId, participantProfileIds, idempotencyKey,
      })
      selectedThreadId = typeof command.result.threadId === "string" ? command.result.threadId : null
    } else if (action === "mark_read") {
      const messageId = uuid(body.messageId)
      if (!messageId) {
        return privateJson({ error: "A valid message is required.", code: "COMM_MESSAGE_INVALID" }, 422)
      }
      selectedThreadId = uuid(body.threadId)
      command = await markCommunicationMessageRead({ messageId, idempotencyKey })
    } else if (action === "save_template") {
      const templateId = body.templateId ? uuid(body.templateId) : null
      const siteId = uuid(body.siteId)
      const name = trimmed(body.name)
      const purpose = trimmed(body.purpose)
      const channel = communicationChannel(body.channel)
      const status = trimmed(body.status)
      const expectedVersion = Number(body.expectedVersion)
      const variants = Array.isArray(body.variants)
        ? body.variants.map((entry) => {
            const variant = asRecord(entry)
            return {
              locale: communicationLocale(variant.locale),
              subject: trimmed(variant.subject),
              body: trimmed(variant.body),
            }
          })
        : []
      if (
        !siteId || !channel || name.length < 1 || name.length > 160 ||
        !["operational", "finance", "resident", "announcement"].includes(purpose) ||
        !["draft", "active", "archived"].includes(status) ||
        !Number.isSafeInteger(expectedVersion) || expectedVersion < 0 ||
        variants.length < 1 || variants.some((variant) => !variant.locale || !variant.subject || !variant.body)
      ) {
        return privateJson({ error: "Review the template details.", code: "COMM_TEMPLATE_INVALID" }, 422)
      }
      command = await saveCommunicationTemplate({
        templateId, siteId, name, purpose, channel, status, expectedVersion,
        variants: variants as Array<{ locale: CommunicationLocale; subject: string; body: string }>,
        idempotencyKey,
      })
    } else if (action === "create_broadcast") {
      const templateId = uuid(body.templateId)
      const name = trimmed(body.name)
      const members = Array.isArray(body.members)
        ? body.members.map((entry) => {
            const member = asRecord(entry)
            return {
              profileId: member.profileId ? uuid(member.profileId) : null,
              unitId: member.unitId ? uuid(member.unitId) : null,
              recipientLabel: trimmed(member.recipientLabel),
              locale: communicationLocale(member.locale),
              channel: communicationChannel(member.channel),
            }
          })
        : []
      if (
        !templateId || name.length < 1 || name.length > 160 || members.length < 1 || members.length > 500 ||
        members.some((member) => !member.profileId || !member.recipientLabel || !member.locale || !member.channel)
      ) {
        return privateJson({ error: "Review the broadcast audience.", code: "COMM_BROADCAST_INVALID" }, 422)
      }
      command = await createCommunicationBroadcast({
        templateId,
        name,
        members: members as Array<{
          profileId: string | null
          unitId: string | null
          recipientLabel: string
          locale: CommunicationLocale
          channel: CommunicationChannel
        }>,
        idempotencyKey,
      })
    } else {
      return privateJson({ error: "Unsupported communication command.", code: "COMM_ACTION_INVALID" }, 422)
    }

    const data = await getCommunicationsWorkspace(profile, { selectedThreadId })
    return privateJson({ data, replayed: command.replayed, result: command.result })
  } catch (error) {
    return domainError(error)
  }
}

export async function PATCH(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return privateJson({ error: "Unauthorized.", code: "COMM_UNAUTHORIZED" }, 401)
  if (!hasAnyPermission(profile.role, "communications", ["update"])) {
    return privateJson({ error: "Role cannot manage delivery work.", code: "COMM_UPDATE_FORBIDDEN" }, 403)
  }
  if (!mutationOriginAllowed(request)) {
    return privateJson({ error: "Cross-site request rejected.", code: "COMM_ORIGIN_REJECTED" }, 403)
  }
  const idempotencyKey = readIdempotencyKey(request)
  if (!idempotencyKey) {
    return privateJson({ error: "A valid Idempotency-Key header is required.", code: "COMM_IDEMPOTENCY_REQUIRED" }, 400)
  }
  const expectedVersion = readExpectedVersion(request)
  if (!expectedVersion) {
    return privateJson({ error: "A current If-Match version is required.", code: "COMM_VERSION_REQUIRED" }, 428)
  }
  const parsed = await jsonBody(request)
  if (parsed.tooLarge) {
    return privateJson({ error: "Request body is too large.", code: "COMM_BODY_TOO_LARGE" }, 413)
  }
  const body = parsed.data
  if (!body) return privateJson({ error: "Request body must be valid JSON.", code: "COMM_JSON_INVALID" }, 400)
  if (profile.id === LOCAL_ACCESS_PROFILE_ID) {
    return privateJson(
      { error: "Real authentication and the portal database are required.", code: "COMM_DATABASE_REQUIRED" },
      409
    )
  }
  const deliveryId = uuid(body.deliveryId)
  if (!deliveryId) return privateJson({ error: "A valid delivery is required.", code: "COMM_DELIVERY_INVALID" }, 422)

  try {
    const action = trimmed(body.action)
    const command = action === "retry_delivery"
      ? await retryCommunicationDelivery({ deliveryId, expectedVersion, idempotencyKey })
      : action === "cancel_delivery" && trimmed(body.reason).length >= 3
        ? await cancelCommunicationDelivery({
            deliveryId,
            expectedVersion,
            reason: trimmed(body.reason),
            idempotencyKey,
          })
        : null
    if (!command) {
      return privateJson({ error: "Review the delivery command.", code: "COMM_DELIVERY_INVALID" }, 422)
    }
    const data = await getCommunicationsWorkspace(profile)
    return privateJson({ data, replayed: command.replayed, result: command.result })
  } catch (error) {
    return domainError(error)
  }
}
