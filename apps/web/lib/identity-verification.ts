// Provider-neutral identity verification (IDV) gateway.
//
// Mirrors the local-ai gateway pattern (lib/local-ai.ts): a single
// env-configured provider performs OCR + document-authenticity + selfie-to-ID
// face match + liveness in one call. When no provider is configured (the demo),
// a deterministic SIMULATED result is returned so the automated flow is fully
// visible and testable without any real vendor or credentials.
//
// Maintenance-free by design: the SaaS IDV provider owns document templates,
// new ID types, liveness models and compliance updates — 1Çatı owns none of
// that. Swapping providers is an env change, not a code change.
//
// Env:
//   IDV_API_URL, IDV_API_KEY  — enable the real provider
//   IDV_VERIFY_PATH           — optional, default "/verify"
//   IDV_PROVIDER              — optional provider id passed through

export type IdentityVerificationInput = {
  idType: string
  idNumber: string
  issuingCountry?: string | null
  fullName?: string | null
}

export type IdentityVerificationChecks = {
  documentAuthentic: boolean
  faceMatch: boolean
  liveness: boolean
  notExpired: boolean
}

export type IdentityVerificationResult = {
  status: "verified" | "review" | "rejected"
  score: number // 0..1 confidence
  provider: string
  checks: IdentityVerificationChecks
  reference: string
  simulated: boolean
}

export function isIdvConfigured(): boolean {
  return Boolean(process.env.IDV_API_URL && process.env.IDV_API_KEY)
}

function reference(prefix: string): string {
  return `${prefix}-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

// Deterministic stand-in for the demo: a plausibly-formed ID number verifies,
// an empty/too-short one routes to manual review. No randomness, so the UX and
// the tests are stable.
function simulateVerification(
  input: IdentityVerificationInput
): IdentityVerificationResult {
  const looksValid = input.idNumber.replace(/\s/g, "").length >= 5
  if (!looksValid) {
    return {
      status: "review",
      score: 0.4,
      provider: "simulated",
      checks: { documentAuthentic: false, faceMatch: false, liveness: false, notExpired: true },
      reference: reference("IDV-REVIEW"),
      simulated: true,
    }
  }
  return {
    status: "verified",
    score: 0.96,
    provider: "simulated",
    checks: { documentAuthentic: true, faceMatch: true, liveness: true, notExpired: true },
    reference: reference("IDV-OK"),
    simulated: true,
  }
}

function normalizeProviderResult(
  payload: unknown
): IdentityVerificationResult {
  const p = (payload ?? {}) as Record<string, unknown>
  const checks = (p.checks ?? {}) as Record<string, unknown>
  const rawStatus = typeof p.status === "string" ? p.status : "review"
  const status: IdentityVerificationResult["status"] =
    rawStatus === "verified" || rawStatus === "rejected" ? rawStatus : "review"
  return {
    status,
    score: typeof p.score === "number" ? p.score : status === "verified" ? 1 : 0,
    provider: typeof p.provider === "string" ? p.provider : process.env.IDV_PROVIDER ?? "gateway",
    checks: {
      documentAuthentic: checks.documentAuthentic === true,
      faceMatch: checks.faceMatch === true,
      liveness: checks.liveness === true,
      notExpired: checks.notExpired !== false,
    },
    reference:
      typeof p.reference === "string" && p.reference
        ? p.reference
        : reference("IDV"),
    simulated: false,
  }
}

export async function verifyIdentity(
  input: IdentityVerificationInput
): Promise<IdentityVerificationResult> {
  if (!isIdvConfigured()) {
    return simulateVerification(input)
  }

  try {
    const baseUrl = process.env.IDV_API_URL!.replace(/\/$/, "")
    const path = process.env.IDV_VERIFY_PATH ?? "/verify"
    const response = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.IDV_API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        provider: process.env.IDV_PROVIDER ?? "default",
        document_type: input.idType,
        document_number: input.idNumber,
        issuing_country: input.issuingCountry ?? null,
        full_name: input.fullName ?? null,
      }),
    })
    if (!response.ok) throw new Error(`IDV request failed: ${response.status}`)
    return normalizeProviderResult(await response.json())
  } catch {
    // Never hard-fail the applicant on an IDV outage: fall back to manual review
    // so a human verifies instead of the registration being blocked.
    return {
      status: "review",
      score: 0,
      provider: process.env.IDV_PROVIDER ?? "gateway",
      checks: { documentAuthentic: false, faceMatch: false, liveness: false, notExpired: false },
      reference: reference("IDV-REVIEW"),
      simulated: false,
    }
  }
}
