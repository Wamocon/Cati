import { NextResponse } from "next/server"
import { getUserProfile, isSupabaseConfigured } from "@/lib/auth"
import { hasAnyPermission } from "@/lib/rbac"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

type IntegrationState = "live" | "degraded" | "provider_ready" | "blocked" | "disabled"

type ProviderHealth = {
  id: string
  service: string
  provider: string
  state: IntegrationState
  evidence: string
  nextAction: string
  fallback: string
  checkedAt: string
  latencyMs: number | null
}

function provider(
  checkedAt: string,
  value: Omit<ProviderHealth, "checkedAt" | "latencyMs"> & { latencyMs?: number | null }
): ProviderHealth {
  return { ...value, checkedAt, latencyMs: value.latencyMs ?? null }
}

async function checkSupabase(checkedAt: string): Promise<ProviderHealth> {
  if (!isSupabaseConfigured()) {
    return provider(checkedAt, {
      id: "INT-SUPA-01", service: "Application database and authentication", provider: "Supabase", state: "degraded",
      evidence: "Environment configuration is absent; this session is using a controlled local QA profile.",
      nextAction: "Add approved environment values, run migrations 32–35, then repeat authenticated RLS tests.",
      fallback: "Local QA data is non-authoritative; authoritative commands fail closed.",
    })
  }

  const startedAt = performance.now()
  try {
    const supabase = await createClient()
    const { error } = await supabase.from("sites").select("id").limit(1)
    return provider(checkedAt, {
      id: "INT-SUPA-01", service: "Application database and authentication", provider: "Supabase",
      state: error ? "degraded" : "live",
      evidence: error
        ? `Configured, but the authenticated database probe failed (${error.code ?? "unknown"}).`
        : "Configured and an authenticated database query completed successfully.",
      nextAction: error
        ? "Check deployment values, migration state, authentication, and RLS policies."
        : "Keep RLS, migration, backup, and restore evidence current for each release.",
      fallback: "Fail closed for booking, handover, finance, access, and offline replay commands.",
      latencyMs: Math.round(performance.now() - startedAt),
    })
  } catch {
    return provider(checkedAt, {
      id: "INT-SUPA-01", service: "Application database and authentication", provider: "Supabase", state: "degraded",
      evidence: "Configured, but the server could not complete the database probe.",
      nextAction: "Check deployment values, network reachability, migrations, and Supabase service health.",
      fallback: "Fail closed for authoritative commands.",
      latencyMs: Math.round(performance.now() - startedAt),
    })
  }
}

function documentedProviders(
  checkedAt: string,
  databaseState: IntegrationState
): ProviderHealth[] {
  const storageConfigured = process.env.DOCUMENT_STORAGE_MODE === "supabase" &&
    Boolean(process.env.SUPABASE_DOCUMENT_BUCKET) && isSupabaseConfigured()
  const twentyConfigured = Boolean(process.env.TWENTY_API_URL && process.env.TWENTY_API_KEY)

  return [
    provider(checkedAt, {
      id: "INT-TKT-09", service: "Internal service tickets", provider: "1Çatı ticketing",
      state: databaseState === "live" ? "live" : "degraded",
      evidence: databaseState === "live" ? "The authenticated database probe succeeded; ticket commands still require record-level verification." : "The database probe is not live, so the internal ticket path is not reported as live.",
      nextAction: "Verify the returned ticket id/version after a hard reload.", fallback: "Manual operations-desk intake.",
    }),
    provider(checkedAt, {
      id: "INT-DOC-10", service: "Private document evidence", provider: "Supabase Storage",
      state: storageConfigured ? "provider_ready" : "blocked",
      evidence: storageConfigured ? "Storage mode and bucket are configured; policy evidence is still required." : "Live storage mode or private bucket configuration is missing.",
      nextAction: "Approve bucket policy, retention, scanning, signed-URL lifetime, and access tests.", fallback: "Reference metadata only; never queue large media offline.",
    }),
    provider(checkedAt, {
      id: "INT-CRM-11", service: "Relationship CRM synchronization", provider: "Twenty CRM",
      state: twentyConfigured ? "provider_ready" : "blocked",
      evidence: twentyConfigured ? "Endpoint credentials exist; no successful sync is claimed by this check." : "Endpoint credentials are missing.",
      nextAction: "Run an approved test-tenant sync with mapping, idempotency, audit, and retry evidence.", fallback: "Internal records remain authoritative.",
    }),
    provider(checkedAt, {
      id: "INT-PAY-02", service: "Payments and deposit collection", provider: "iyzico / PayTR / Param adapter", state: "blocked",
      evidence: "No selected provider contract, sandbox credentials, webhook verification, or refund approval exists.",
      nextAction: "Select a provider and approve card, deposit, refund, webhook, and sandbox policies.", fallback: "Show required/pending/manual only; use accountant-approved bank transfer.",
    }),
    provider(checkedAt, {
      id: "INT-BANK-03", service: "Bank reconciliation", provider: "Statement import / future bank adapter", state: "provider_ready",
      evidence: "Manual import and reconciliation modelling exist; no bank API is connected.",
      nextAction: "Approve bank, file/API format, account scope, and finance sign-off.", fallback: "Accountant-controlled import and manual matching.",
    }),
    provider(checkedAt, {
      id: "INT-SMS-04", service: "SMS reminders", provider: "NetGSM / Twilio adapter", state: "provider_ready",
      evidence: "Templates and retry states may be demonstrated; no delivery provider or receipt is connected.",
      nextAction: "Approve consent, sender identity, contract, credentials, rate limits, and sandbox delivery.", fallback: "Portal notification or manual call task; never claim SMS delivery.",
    }),
    provider(checkedAt, {
      id: "INT-EMAIL-05", service: "Email reminders", provider: "Resend / SMTP adapter", state: "provider_ready",
      evidence: "Message preparation may be demonstrated; no verified sender or delivery receipt is connected.",
      nextAction: "Approve domain, SPF/DKIM/DMARC, templates, retention, suppression, and sandbox delivery.", fallback: "Portal notification and downloadable calendar/document packet.",
    }),
    provider(checkedAt, {
      id: "INT-ACCESS-06", service: "Door, barrier, and key access", provider: "Salto KS / Dormakaba / Hikvision adapter", state: "blocked",
      evidence: "No approved hardware adapter, credential contract, zone policy, or provider credentials exist.",
      nextAction: "Complete provider, human-approval, revocation, audit, and emergency-policy tests.", fallback: "Queue a human security-desk task only after authoritative confirmation.",
    }),
    provider(checkedAt, {
      id: "INT-CAM-07", service: "Camera events", provider: "Hikvision / site camera adapter", state: "disabled",
      evidence: "Live camera ingestion is intentionally disabled for the demo.",
      nextAction: "Obtain legal/privacy approval, purpose limitation, retention, and role scope.", fallback: "Manual incident record with separately approved evidence upload.",
    }),
    provider(checkedAt, {
      id: "INT-ID-08", service: "Google / Yandex sign-in", provider: "Supabase OAuth", state: "provider_ready",
      evidence: "OAuth handoff is supported; provider app credentials and consent evidence are outside this build.",
      nextAction: "Approve provider apps, redirects, domains, consent, and account linking.", fallback: "Email/password or magic link; access profiles are QA-only.",
    }),
    provider(checkedAt, {
      id: "INT-CAL-12", service: "External calendar synchronization", provider: "Google / Outlook / Cal.com OAuth", state: "provider_ready",
      evidence: "Privacy-reduced ICS is in-house; OAuth synchronization is not connected.",
      nextAction: "Approve credentials, scopes, consent, revocation, and conflict policy.", fallback: "Use a revocable opaque ICS feed and import preview without provider tokens.",
    }),
  ]
}

export async function GET() {
  const profile = await getUserProfile()
  if (!profile) return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  if (!hasAnyPermission(profile.role, "settings", ["view"])) {
    return NextResponse.json({ error: "Your role is not allowed to view integration readiness." }, { status: 403 })
  }

  const generatedAt = new Date().toISOString()
  const databaseHealth = await checkSupabase(generatedAt)
  const providers = [
    databaseHealth,
    ...documentedProviders(generatedAt, databaseHealth.state),
  ]
  const summary: Record<IntegrationState, number> = { live: 0, degraded: 0, provider_ready: 0, blocked: 0, disabled: 0 }
  providers.forEach((item) => { summary[item.state] += 1 })

  return NextResponse.json({
    contractVersion: "integration-health.v2", generatedAt,
    source: isSupabaseConfigured() ? "runtime-configuration-and-probe" : "runtime-configuration",
    role: profile.role, summary, providers,
    limitations: [
      "Only Supabase receives an in-request database probe.",
      "Configuration presence is never reported as external-provider delivery success.",
      "Payment/refund, SMS/email delivery, access issuance, camera ingestion, and OAuth remain non-live without provider evidence.",
    ],
  })
}
