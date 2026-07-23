import { NextResponse } from "next/server"
import {
  createPublicAiChatPayload,
  finalizePublicAiChatPayload,
  parsePublicAiChatBody,
  publicAiJsonHeaders,
} from "@/lib/public-ai-chat"
import { recordAiRequestTrace } from "@/lib/ai-observability"

// Public landing-page concierge. Unlike /api/ai/chat this endpoint is
// deliberately anonymous and data-blind: it never loads a user profile and
// never touches repository data, so it cannot leak internal 1Cati records no
// matter what the visitor asks. Its entire world is the curated product
// knowledge in lib/public-ai-knowledge.ts. Do not add data access here.
export async function POST(request: Request) {
  const startedAt = Date.now()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = parsePublicAiChatBody(body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: parsed.status, headers: publicAiJsonHeaders }
    )
  }

  const payload = createPublicAiChatPayload(parsed.value, startedAt)
  const finalized = await finalizePublicAiChatPayload(parsed.value, payload)

  // Best-effort observability. Records one metadata trace per public AI call (no
  // raw prompt/PII, always anonymous) via the service role client, then returns
  // the UNCHANGED payload. Any failure is swallowed inside recordAiRequestTrace,
  // preserving the endpoint's 5xx-proof, data-blind guarantee.
  await recordAiRequestTrace({
    surface: "public",
    source: finalized.source,
    language: finalized.language,
    latencyMs: finalized.responseMs ?? Date.now() - startedAt,
    injectionDetected: finalized.evaluation.flags.includes("prompt_injection_probe"),
    grounded: finalized.evaluation.grounded,
    outOfScope: finalized.outcome === "uncertain",
    refused: finalized.outcome === "refused_private_data",
    messageChars: parsed.value.message.length,
  })

  return NextResponse.json(finalized, { headers: publicAiJsonHeaders })
}
