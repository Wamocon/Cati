import {
  chunkPublicAiReply,
  createPublicAiChatPayload,
  finalizePublicAiChatPayload,
  parsePublicAiChatBody,
  publicAiStreamHeaders,
} from "@/lib/public-ai-chat"

export const dynamic = "force-dynamic"

function streamLine(
  controller: ReadableStreamDefaultController<Uint8Array>,
  encoder: TextEncoder,
  value: Record<string, unknown>
) {
  controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
}

export async function POST(request: Request) {
  const startedAt = Date.now()
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const parsed = parsePublicAiChatBody(body)
  if (!parsed.ok) {
    return Response.json(
      { error: parsed.error },
      { status: parsed.status }
    )
  }

  const payload = createPublicAiChatPayload(parsed.value, startedAt)
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      streamLine(controller, encoder, {
        type: "meta",
        language: payload.language,
        topic: payload.topic,
        shouldEscalate: payload.shouldEscalate,
      })

      for (const text of chunkPublicAiReply(payload.reply)) {
        streamLine(controller, encoder, { type: "delta", text })
      }

      const finalized = await finalizePublicAiChatPayload(parsed.value, payload)
      streamLine(controller, encoder, { type: "done", payload: finalized })
      controller.close()
    },
  })

  return new Response(stream, { headers: publicAiStreamHeaders })
}
