// Best-effort AI observability sink. One structured row per AI call is written
// to public.ai_request_traces (migration 52) via the SERVICE ROLE client so it
// bypasses RLS and never depends on the caller's session.
//
// Hard invariant: recording a trace must NEVER change or delay the AI response in
// a way that matters, and must NEVER throw. Every failure (table missing, DB
// down, no service-role key configured) is swallowed. This preserves the
// 5xx-proof guarantee of both AI endpoints.
//
// It stores ONLY metadata -- never the raw prompt, reply, or any PII. Callers
// pass `messageChars` (the input length), not the message text.

import { createServiceRoleClient } from "@/lib/supabase/server"

export type AiTraceSurface = "dashboard" | "public"

export interface AiRequestTraceInput {
  surface: AiTraceSurface
  userId?: string | null
  companyId?: string | null
  role?: string | null
  language?: string | null
  source: string
  model?: string | null
  promptTokens?: number | null
  completionTokens?: number | null
  latencyMs?: number | null
  injectionDetected?: boolean
  grounded?: boolean | null
  outOfScope?: boolean
  refused?: boolean
  messageChars?: number | null
}

function toNullableInt(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : null
}

/**
 * Fire-and-forget insert of a single AI request trace. Resolves quietly on any
 * failure; the caller may `await` it (a single insert) or `void` it. When no
 * service-role client is configured (e.g. the local-seed / e2e environment with
 * Supabase blanked), this is a no-op, so it cannot alter deterministic test
 * behavior.
 */
export async function recordAiRequestTrace(
  input: AiRequestTraceInput
): Promise<void> {
  try {
    const client = createServiceRoleClient()
    if (!client) return

    await client.from("ai_request_traces").insert({
      surface: input.surface,
      user_id: input.userId ?? null,
      company_id: input.companyId ?? null,
      role: input.role ?? null,
      language: input.language ?? null,
      source: input.source,
      model: input.model ?? null,
      prompt_tokens: toNullableInt(input.promptTokens),
      completion_tokens: toNullableInt(input.completionTokens),
      latency_ms: toNullableInt(input.latencyMs),
      injection_detected: input.injectionDetected ?? false,
      grounded: input.grounded ?? null,
      out_of_scope: input.outOfScope ?? false,
      refused: input.refused ?? false,
      message_chars: toNullableInt(input.messageChars),
    })
  } catch {
    // Observability is best-effort and must never affect the AI response.
  }
}
