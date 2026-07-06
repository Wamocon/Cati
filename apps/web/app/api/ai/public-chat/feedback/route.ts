import { NextResponse } from "next/server"
import { logPublicAiFeedback } from "@/lib/site-management-repository"
import { resolvePublicAiLocale } from "@/lib/public-ai-knowledge"

type FeedbackBody = {
  rating?: unknown
  topic?: unknown
  locale?: unknown
  page?: unknown
  outcome?: unknown
  source?: unknown
  confidence?: unknown
  responseMs?: unknown
  sourceIds?: unknown
  chatReference?: unknown
}

function optionalString(value: unknown, maxLength = 120) {
  return typeof value === "string" ? value.slice(0, maxLength) : null
}

function optionalNumber(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function optionalSourceIds(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.slice(0, 80))
    .slice(0, 8)
}

export async function POST(request: Request) {
  let body: FeedbackBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const rating = body.rating === "positive" || body.rating === "negative" ? body.rating : null
  if (!rating) {
    return NextResponse.json({ error: "Rating is required" }, { status: 400 })
  }

  const source =
    body.source === "local-ai" || body.source === "public-knowledge"
      ? body.source
      : null

  try {
    const result = await logPublicAiFeedback({
      rating,
      topic: optionalString(body.topic),
      language: resolvePublicAiLocale(
        typeof body.locale === "string" ? body.locale : "tr"
      ),
      answeredBy: source,
      page: optionalString(body.page),
      outcome: optionalString(body.outcome),
      confidence: optionalNumber(body.confidence),
      responseMs: optionalNumber(body.responseMs),
      sourceIds: optionalSourceIds(body.sourceIds),
      chatReference: optionalString(body.chatReference),
    })

    return NextResponse.json({
      status: "received",
      reference: result.reference,
      source: result.source,
    })
  } catch {
    return NextResponse.json({ error: "Feedback could not be logged" }, { status: 500 })
  }
}
