// Shared, DATA-FREE AI guardrail primitives for both 1Cati AI surfaces
// (/api/ai/chat dashboard + /api/ai/public-chat concierge).
//
// This module intentionally imports nothing from the seed/site-management data
// layer so it can be pulled into the data-blind public route without dragging
// any internal record into that bundle. Everything here is pure string analysis.
//
// Phase 2 of the AI re-architecture turns guardrails from FLAG-ONLY into ACTIONS:
//   * hasStrongPromptInjectionSignal  -> block (skip the LLM gateway) on a clear
//     prompt-injection / jailbreak attempt.
//   * findUngroundedSpecifics         -> detect a unit code / money amount /
//     email / phone in a model reply that is NOT present in the authorized
//     grounding context, so the caller can REDACT it (fall back to the grounded
//     deterministic answer) instead of surfacing an ungrounded specific.
//
// `hasPromptInjectionSignal` (the softer FLAG detector) also lives here so both
// surfaces share one definition. The dashboard evaluation still sets the
// `prompt_injection_probe` flag from it; the STRONG detector is what actually
// blocks. Every strong probe is also a soft probe, so a blocked request always
// keeps its injection flag set (tests assert this).

/**
 * Soft prompt-injection FLAG detector. Kept intentionally broad: it powers the
 * `prompt_injection_probe` safety flag / observability signal, not a hard block.
 */
export function hasPromptInjectionSignal(message: string): boolean {
  return /(ignore|forget) (all )?(previous|above|system|rules|instructions)|system prompt|developer message|jailbreak|bypass|reveal (your )?(prompt|instructions)|act as admin|forget your rules/i.test(
    message
  )
}

/**
 * STRONG prompt-injection / jailbreak detector. When this trips we ACT: skip the
 * LLM gateway entirely and return the grounded deterministic answer plus a short
 * decline note. High precision by design (clear override / exfiltration phrases),
 * and it matches even when the probe is embedded inside a longer benign question
 * (`.test` scans anywhere). Multilingual (en / tr / de / ru) so a translated
 * probe is caught too. Every phrase here is also matched by the soft flag above.
 */
export function hasStrongPromptInjectionSignal(message: string): boolean {
  return (
    // English override / role-swap / exfiltration.
    /\b(ignore|disregard|forget|override|bypass)\b[^.!?\n]{0,40}\b(all|any|the|your|previous|above|prior|earlier)?\s*(previous |above |prior |earlier |your |the |system )?(instruction|instructions|rule|rules|guideline|guidelines|prompt|prompts|guardrail|guardrails|safety|filter|filters|constraint|constraints|directive|directives|context|system prompt)/i.test(
      message
    ) ||
    /\bsystem prompt\b|\bdeveloper (message|mode)\b|\bjailbreak\b|\bdo anything now\b|\bDAN\b/i.test(
      message
    ) ||
    /\breveal (your |the )?(system )?(prompt|instructions|rules|configuration)\b|\b(show|print|repeat|output) (me )?(your |the )?(system )?(prompt|instructions)\b/i.test(
      message
    ) ||
    /\bact as (an? )?(admin|administrator|developer|root|system|dan)\b|\byou are now (a|an|the)\b|\bpretend (you are|to be) (an? )?(admin|administrator|developer|root|system)\b/i.test(
      message
    ) ||
    // Turkish.
    /(önceki|onceki|tüm|tum|yukarıdaki|yukaridaki|sistem)\s+(talimat|talimatlar|kural|kurallar)\w*\s*(ı|i|ları|leri)?\s*(yok say|unut|görmezden gel|gormezden gel|atla|geçersiz|gecersiz)|sistem (istemi|komutu|talimat)|talimatları yok say|kuralları unut/i.test(
      message
    ) ||
    // German.
    /ignorier\w*\s+(alle |die |alle vorherigen |die vorherigen |bisherigen )?(anweisung\w*|regel\w*|system\w*)|vergiss\s+(alle |deine |die )?(anweisung\w*|regel\w*)|system[- ]?prompt|systemanweisung\w*|handle als (admin|administrator|entwickler)/i.test(
      message
    ) ||
    // Russian.
    /(игнорир\w*|забудь\w*|отмени\w*|обойди\w*)\s+(все |всё |предыдущ\w* |выше\w* |систем\w* )?(инструкц\w*|правил\w*|указан\w*|систем\w*)|систем\w* (промпт|запрос|инструкц\w*)|веди себя как (админ|администратор|разработчик)/i.test(
      message
    )
  )
}

const UNIT_CODE_RE = /\b[A-G]-?\d{1,4}(?:\/\d{1,3})?\b/gi
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const PHONE_RE = /\+?\d[\d\s().-]{7,}\d/g
const MONEY_RE =
  /(?:₺|€|\$|\bTRY\b|\bEUR\b|\bUSD\b|\bTL\b)\s?[\d.,]+|[\d.,]+\s?(?:₺|€|\$|TRY|EUR|USD|TL|lira|евро|euro)/gi

function normalizeUnitToken(token: string): string {
  return token.replace(/[^0-9a-z]/gi, "").toUpperCase()
}

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "")
}

function contextDigitRuns(context: string): string[] {
  return (context.match(/\d[\d.,]*\d|\d/g) ?? []).map(onlyDigits).filter(Boolean)
}

function digitRunGrounded(tokenDigits: string, runs: string[]): boolean {
  if (!tokenDigits) return true
  return runs.some((run) => run === tokenDigits || run.includes(tokenDigits))
}

/**
 * Return every "specific" (unit code, money amount, email, phone number) that
 * appears in `reply` but is NOT present in the authorized `context` (today: the
 * deterministic grounding string; Phase 3 will swap this for the RLS retrieval
 * context). A non-empty result means the model surfaced an ungrounded /
 * potentially hallucinated or leaked specific and the caller should REDACT by
 * falling back to the grounded deterministic answer.
 *
 * Emails and phone numbers are treated as ungrounded whenever their exact value
 * is absent from the context (the deterministic context never contains contact
 * PII, so any such value in a reply is unbacked). Unit codes and money amounts
 * are compared against the context so a faithful echo of a grounded figure is
 * allowed while an invented one is caught.
 */
export function findUngroundedSpecifics(reply: string, context: string): string[] {
  if (!reply) return []
  const found: string[] = []
  const contextNormalized = normalizeUnitToken(context)
  const contextLower = context.toLowerCase()
  const runs = contextDigitRuns(context)

  for (const match of reply.match(UNIT_CODE_RE) ?? []) {
    if (!contextNormalized.includes(normalizeUnitToken(match))) found.push(match)
  }
  for (const match of reply.match(EMAIL_RE) ?? []) {
    if (!contextLower.includes(match.toLowerCase())) found.push(match)
  }
  for (const match of reply.match(PHONE_RE) ?? []) {
    const digits = onlyDigits(match)
    if (digits.length >= 7 && !digitRunGrounded(digits, runs)) found.push(match.trim())
  }
  for (const match of reply.match(MONEY_RE) ?? []) {
    const digits = onlyDigits(match)
    if (!digitRunGrounded(digits, runs)) found.push(match.trim())
  }

  return found
}

/** Boolean convenience wrapper over findUngroundedSpecifics. */
export function replyHasUngroundedSpecifics(reply: string, context: string): boolean {
  return findUngroundedSpecifics(reply, context).length > 0
}
