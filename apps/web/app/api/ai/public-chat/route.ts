import { NextResponse } from "next/server"
import {
  answerPublicAiQuestion,
  getPublicAiSystemPrompt,
  resolvePublicAiLocale,
} from "@/lib/public-ai-knowledge"
import {
  logPublicAiEscalation,
  logPublicAiInterest,
} from "@/lib/site-management-repository"
import { completeWithLocalAi, isLocalAiConfigured } from "@/lib/local-ai"

// Public landing-page concierge. Unlike /api/ai/chat this endpoint is
// deliberately anonymous and data-blind: it never loads a user profile and
// never touches repository data, so it cannot leak internal 1Cati records no
// matter what the visitor asks. Its entire world is the curated product
// knowledge in lib/public-ai-knowledge.ts. Do not add data access here.
export async function POST(request: Request) {
  const startedAt = Date.now()
  let body: { message?: unknown; locale?: unknown; page?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const message = typeof body.message === "string" ? body.message.trim() : ""
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }
  if (message.length > 600) {
    return NextResponse.json({ error: "Message is too long" }, { status: 413 })
  }

  const locale = resolvePublicAiLocale(typeof body.locale === "string" ? body.locale : "tr")
  const page = typeof body.page === "string" ? body.page.slice(0, 120) : null

  const deterministic = answerPublicAiQuestion(message, locale)

  let reply = deterministic.reply
  let source: "public-knowledge" | "local-ai" = "public-knowledge"

  // The private-data guard always answers deterministically — the gateway is
  // never consulted for questions that fish for internal records.
  const canUseLocalAi =
    deterministic.outcome === "answered" &&
    deterministic.confidence >= 0.85 &&
    deterministic.topic !== "private-data"

  if (canUseLocalAi && (await isLocalAiConfigured())) {
    try {
      const completion = await completeWithLocalAi({
        purpose: "fast",
        maxTokens: 380,
        temperature: 0.3,
        messages: [
          { role: "system", content: getPublicAiSystemPrompt(locale) },
          { role: "user", content: message },
        ],
      })
      reply = completion.content
      source = "local-ai"
    } catch {
      // keep the deterministic answer
    }
  }

  const responseMs = Date.now() - startedAt
  let eventReference: string | null = null
  let escalationReference: string | null = null

  // Interest analytics for the internal assistant/team. Never fails the chat.
  try {
    const result = await logPublicAiInterest({
      topic: deterministic.topic,
      language: locale,
      question: message,
      answeredBy: source,
      page,
      outcome: deterministic.outcome,
      confidence: deterministic.confidence,
      shouldEscalate: deterministic.shouldEscalate,
      responseMs,
      sourceIds: deterministic.sources.map((item) => item.id),
    })
    eventReference = result.reference

    if (deterministic.shouldEscalate) {
      const escalation = await logPublicAiEscalation({
        topic: deterministic.topic,
        language: locale,
        answeredBy: source,
        page,
        outcome: deterministic.outcome,
        reason: deterministic.escalationReason,
        confidence: deterministic.confidence,
        responseMs,
        sourceIds: deterministic.sources.map((item) => item.id),
      })
      escalationReference = escalation.reference
    }
  } catch {
    // analytics is best-effort only
  }

  return NextResponse.json({
    reply,
    source,
    topic: deterministic.topic,
    confidence: deterministic.confidence,
    outcome: deterministic.outcome,
    shouldEscalate: deterministic.shouldEscalate,
    escalationReason: deterministic.escalationReason,
    sources: deterministic.sources,
    responseMs,
    eventReference,
    escalationReference,
  })
}
