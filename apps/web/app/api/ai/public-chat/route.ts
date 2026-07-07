import { NextResponse } from "next/server"
import {
  createPublicAiChatPayload,
  finalizePublicAiChatPayload,
  parsePublicAiChatBody,
  publicAiJsonHeaders,
} from "@/lib/public-ai-chat"

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
  return NextResponse.json(finalized, { headers: publicAiJsonHeaders })
}
