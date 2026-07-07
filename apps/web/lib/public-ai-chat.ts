import {
  answerPublicAiQuestion,
  resolvePublicAiLocale,
  resolvePublicAiResponseLocale,
  type PublicAiLocale,
  type PublicAiOutcome,
  type PublicAiSource,
  type PublicAiTopic,
} from "@/lib/public-ai-knowledge"
import {
  logPublicAiEscalation,
  logPublicAiInterest,
} from "@/lib/site-management-repository"

export type PublicAiChatSource = "public-knowledge" | "local-ai"

export interface PublicAiChatInput {
  message: string
  locale: PublicAiLocale
  page: string | null
}

export interface PublicAiChatPayload {
  reply: string
  language: PublicAiLocale
  source: PublicAiChatSource
  topic: PublicAiTopic
  confidence: number
  outcome: PublicAiOutcome
  shouldEscalate: boolean
  escalationReason: string | null
  sources: PublicAiSource[]
  responseMs: number
  eventReference: string | null
  escalationReference: string | null
}

type PublicAiChatParseResult =
  | { ok: true; value: PublicAiChatInput }
  | { ok: false; error: string; status: number }

type CachedAnswer = ReturnType<typeof answerPublicAiQuestion>

const ANSWER_CACHE_TTL_MS = 5 * 60 * 1000
const ANSWER_CACHE_MAX = 160
const TELEMETRY_BUDGET_MS = 800
const answerCache = new Map<string, { expiresAt: number; answer: CachedAnswer }>()

export const publicAiJsonHeaders = {
  "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
}

export const publicAiStreamHeaders = {
  "Cache-Control": "no-cache, no-transform",
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "X-Accel-Buffering": "no",
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function cacheKey(message: string, locale: PublicAiLocale) {
  return `${locale}:${message.toLocaleLowerCase("tr").replace(/\s+/g, " ")}`
}

function cachedAnswer(message: string, locale: PublicAiLocale): CachedAnswer {
  const key = cacheKey(message, locale)
  const cached = answerCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.answer
  if (cached) answerCache.delete(key)

  const answer = answerPublicAiQuestion(message, locale)
  answerCache.set(key, {
    answer,
    expiresAt: Date.now() + ANSWER_CACHE_TTL_MS,
  })

  if (answerCache.size > ANSWER_CACHE_MAX) {
    const oldestKey = answerCache.keys().next().value
    if (oldestKey) answerCache.delete(oldestKey)
  }

  return answer
}

export function parsePublicAiChatBody(body: unknown): PublicAiChatParseResult {
  const record = asRecord(body)
  const message = typeof record.message === "string" ? record.message.trim() : ""
  if (!message) {
    return { ok: false, error: "Message is required", status: 400 }
  }
  if (message.length > 600) {
    return { ok: false, error: "Message is too long", status: 413 }
  }

  return {
    ok: true,
    value: {
      message,
      locale: resolvePublicAiLocale(
        typeof record.locale === "string" ? record.locale : "tr"
      ),
      page: typeof record.page === "string" ? record.page.slice(0, 120) : null,
    },
  }
}

export function createPublicAiChatPayload(
  input: PublicAiChatInput,
  startedAt = Date.now()
): PublicAiChatPayload {
  const locale = resolvePublicAiResponseLocale(input.message, input.locale)
  const answer = cachedAnswer(input.message, locale)

  return {
    reply: answer.reply,
    language: locale,
    source: "public-knowledge",
    topic: answer.topic,
    confidence: answer.confidence,
    outcome: answer.outcome,
    shouldEscalate: answer.shouldEscalate,
    escalationReason: answer.escalationReason,
    sources: answer.sources,
    responseMs: Date.now() - startedAt,
    eventReference: null,
    escalationReference: null,
  }
}

async function logPublicAiTelemetry(
  input: PublicAiChatInput,
  payload: PublicAiChatPayload
): Promise<Pick<PublicAiChatPayload, "eventReference" | "escalationReference">> {
  let eventReference: string | null = null
  let escalationReference: string | null = null

  const result = await logPublicAiInterest({
    topic: payload.topic,
    language: payload.language,
    question: input.message,
    answeredBy: payload.source,
    page: input.page,
    outcome: payload.outcome,
    confidence: payload.confidence,
    shouldEscalate: payload.shouldEscalate,
    responseMs: payload.responseMs,
    sourceIds: payload.sources.map((item) => item.id),
  })
  eventReference = result.reference

  if (payload.shouldEscalate) {
    const escalation = await logPublicAiEscalation({
      topic: payload.topic,
      language: payload.language,
      answeredBy: payload.source,
      page: input.page,
      outcome: payload.outcome,
      reason: payload.escalationReason,
      confidence: payload.confidence,
      responseMs: payload.responseMs,
      sourceIds: payload.sources.map((item) => item.id),
    })
    escalationReference = escalation.reference
  }

  return { eventReference, escalationReference }
}

export async function finalizePublicAiChatPayload(
  input: PublicAiChatInput,
  payload: PublicAiChatPayload
): Promise<PublicAiChatPayload> {
  const telemetry = logPublicAiTelemetry(input, payload).catch(() => null)
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), TELEMETRY_BUDGET_MS)
  )
  const references = await Promise.race([telemetry, timeout])

  return references ? { ...payload, ...references } : payload
}

export function chunkPublicAiReply(reply: string) {
  const chunks: string[] = []
  const chunkSize = 96
  for (let index = 0; index < reply.length; index += chunkSize) {
    chunks.push(reply.slice(index, index + chunkSize))
  }
  return chunks.length > 0 ? chunks : [reply]
}
