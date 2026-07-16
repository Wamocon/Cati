import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import {
  classifyPublicReportSafety,
  decidePublicReportTransition,
  PublicReportWorkflowError,
} from "../../lib/public-report"

test.describe("QR-bound account-free public reporting", () => {
  test("deterministic safety rules show 112 without authorizing automation", () => {
    for (const text of [
      "There is active smoke and fire in the garage",
      "Garajda yangın ve yoğun duman var",
      "Im Aufzug ist eine Person eingeschlossen",
      "В лифте застрял человек",
    ]) {
      const result = classifyPublicReportSafety(text)
      expect(result.code, text).not.toBeNull()
      expect(result.requiresEmergencyCall).toBe(true)
      expect(result.emergencyNumber).toBe("112")
      expect(result.autoActionAuthorized).toBe(false)
    }

    expect(classifyPublicReportSafety("There is no fire, only a dirty floor").code).toBeNull()
    expect(classifyPublicReportSafety("Yangın yok, sadece temizlik gerekli").code).toBeNull()
    expect(classifyPublicReportSafety("Kein Feuer, nur eine defekte Lampe").code).toBeNull()
    expect(classifyPublicReportSafety("Пожара нет, нужна уборка").code).toBeNull()
  })

  test("public reports require human review before conversion and terminal states stay terminal", () => {
    expect(decidePublicReportTransition("submitted", "start_review")).toBe("under_review")
    expect(decidePublicReportTransition("under_review", "request_information")).toBe(
      "awaiting_information"
    )
    expect(decidePublicReportTransition("awaiting_information", "start_review")).toBe(
      "under_review"
    )
    expect(decidePublicReportTransition("under_review", "convert")).toBe("converted")

    expect(() => decidePublicReportTransition("submitted", "convert")).toThrow(
      PublicReportWorkflowError
    )
    expect(() => decidePublicReportTransition("converted", "reject")).toThrow(
      PublicReportWorkflowError
    )
    expect(() => decidePublicReportTransition("rejected", "start_review")).toThrow(
      PublicReportWorkflowError
    )
  })

  test("the API rejects abuse locally and fails closed without persistence", async ({ request }) => {
    const spam = await request.post("/api/site-management/public-report", {
      headers: { "Idempotency-Key": "public-report-test-spam-0001" },
      data: {
        qrToken: "qr_test_token_1234567890",
        category: "technical",
        description: "A light is broken near the exact QR location.",
        language: "en",
        consent: true,
        companyWebsite: "https://spam.invalid",
      },
    })
    expect(spam.status()).toBe(422)
    expect((await spam.json()).code).toBe("PUBLIC_REPORT_SPAM_REJECTED")

    const consentMismatch = await request.post("/api/site-management/public-report", {
      headers: { "Idempotency-Key": "public-report-test-consent-0001" },
      data: {
        qrToken: "qr_test_token_1234567890",
        category: "technical",
        description: "A light is broken near the exact QR location.",
        language: "en",
        consent: true,
        consentLocale: "de",
        safetyAcknowledged: false,
        companyWebsite: "",
      },
    })
    expect(consentMismatch.status()).toBe(422)
    expect((await consentMismatch.json()).code).toBe(
      "PUBLIC_REPORT_CONSENT_LOCALE_MISMATCH"
    )

    const unavailable = await request.post("/api/site-management/public-report", {
      headers: { "Idempotency-Key": "public-report-test-unconfigured-0001" },
      data: {
        qrToken: "qr_test_token_1234567890",
        category: "technical",
        description: "A light is broken near the exact QR location.",
        language: "en",
        consent: true,
        consentLocale: "en",
        safetyAcknowledged: false,
        companyWebsite: "",
      },
    })
    expect(unavailable.status()).toBe(503)
    expect((await unavailable.json()).code).toMatch(
      /PUBLIC_REPORT_(DATABASE|SECURITY)_NOT_CONFIGURED/
    )
  })

  test("migration 28 owns the full private-receipt, RLS, abuse and conversion boundary", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000028_public_qr_reporting.sql"
      ),
      "utf8"
    )

    expect(migration).toContain("CREATE TABLE public.public_report_qr_placements")
    expect(migration).toContain("CREATE TABLE public.public_problem_reports")
    expect(migration).toContain("CREATE TABLE public.public_problem_report_events")
    expect(migration).toContain("tracking_token_digest")
    expect(migration).not.toMatch(/\n\s*tracking_token\s+TEXT/i)
    expect(migration).toContain("submission_payload_digest")
    expect(migration).toContain("abuse_agent_digest")
    expect(migration).toContain("duplicate_fingerprint")
    expect(migration).toContain("possible_duplicate_of")
    expect(migration).toContain("pg_advisory_xact_lock")
    expect(migration.indexOf("'public-report-abuse:'")).toBeGreaterThan(-1)
    expect(migration.indexOf("'public-report-duplicate:'")).toBeGreaterThan(
      migration.indexOf("'public-report-abuse:'")
    )
    expect(migration).toContain("PUBLIC_REPORT_RATE_LIMITED")
    expect(migration).toContain("PUBLIC_REPORT_SUBMIT_SERVICE_ROLE_REQUIRED")
    expect(migration).toContain("PUBLIC_REPORT_IDENTITY_DATA_FORBIDDEN")
    expect(migration).toContain("current_user_can_manage_site")
    expect(migration).toContain("p_expected_version")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("converted_ticket_id UUID UNIQUE")
    expect(migration).toContain("public.create_service_ticket_command(")
    expect(migration).toContain("'public-report:' || v_report.id::TEXT")
    expect(migration).toContain("CREATE TRIGGER protect_public_problem_report_events")
    expect(migration).toContain("ALTER PUBLICATION supabase_realtime ADD TABLE public.public_problem_reports")
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.get_public_problem_report_status")
    expect(migration).not.toMatch(/GRANT\s+(SELECT|INSERT|UPDATE|DELETE)[\s\S]{0,80}public\.public_problem_reports\s+TO\s+anon/i)
    expect(migration).toContain("external_execution_allowed BOOLEAN NOT NULL DEFAULT FALSE")
    expect(migration).toContain("CHECK (NOT external_execution_allowed)")
    expect(migration).toContain("submit_public_problem_report(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role")
    expect(migration).not.toMatch(/submit_public_problem_report\([^;]+\) TO anon, authenticated/)
    expect(migration).toContain("v_consent_locale IS DISTINCT FROM v_language")
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.anonymize_due_public_problem_report_v1")
    expect(migration).toContain("(SELECT auth.role()) IS DISTINCT FROM 'service_role'")
    expect(migration).toContain("v_report.retention_command_key IS DISTINCT FROM v_key")
    expect(migration).toContain("No cron")
    expect(migration).toContain("TO service_role")
    expect(migration).toContain("FROM PUBLIC, anon, authenticated")
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.manage_public_report_qr_placement_command")
    expect(migration).toContain("'commandFingerprint', v_command_fingerprint")
    expect(migration).toContain("current_user_can_manage_site(v_result.site_id)")
    expect(migration).toContain("UNIQUE (company_id, actor_profile_id, idempotency_key)")
    expect(migration).toContain("AND e.actor_profile_id = v_actor_id")
    expect(migration).toContain("'expectedVersion', p_expected_version")
    expect(migration).toContain("'requestedPublicMessage', v_requested_public_message")
    expect(migration).not.toContain("'main_entrance'")
  })

  test("consent copy and abuse telemetry have one server-authoritative contract", () => {
    const contract = readFileSync(resolve(process.cwd(), "lib/public-report.ts"), "utf8")
    const copy = readFileSync(resolve(process.cwd(), "lib/public-report-copy.ts"), "utf8")
    const repository = readFileSync(
      resolve(process.cwd(), "lib/public-report-repository.ts"),
      "utf8"
    )
    const api = readFileSync(
      resolve(process.cwd(), "app/api/site-management/public-report/route.ts"),
      "utf8"
    )
    const envExample = readFileSync(
      resolve(process.cwd(), ".env.example"),
      "utf8"
    )

    expect(contract).toContain("PUBLIC_REPORT_CONSENT_VERSION")
    expect(contract).toContain("PUBLIC_REPORT_CONSENT_TEXT")
    for (const locale of ["tr", "en", "de", "ru"]) {
      expect(copy).toContain(`PUBLIC_REPORT_CONSENT_TEXT.${locale}`)
    }
    expect(repository).toContain("PUBLIC_REPORT_CONSENT_TEXT[input.consentLocale]")
    expect(repository).toContain("createServiceRoleClient")
    expect(repository).toContain("callServiceRpc<Omit<PublicReportReceipt")
    expect(repository).not.toContain("const consentText =")
    expect(repository).toContain('hmac(secret, "abuse-ip", context.abuseSource)')
    expect(repository).toContain('hmac(secret, "abuse-agent", context.agentSource)')
    expect(api).toContain('request.headers.get("x-vercel-forwarded-for")')
    expect(api).toContain('return "trusted-edge-address-unavailable"')
    expect(api).toContain("Never mix attacker-controlled")
    expect(api).toContain("agentSource:")
    expect(api).toContain("body.consentLocale !== body.language")
    expect(api).toContain("request.body.getReader()")
    expect(api).toContain("reader.cancel()")
    expect(api).toContain("MAX_PUBLIC_REPORT_BODY_BYTES")
    expect(api).not.toContain("await request.text()")
    expect(api).not.toContain("await request.json()")
    expect(api).not.toContain('].join("|")')
    expect(envExample).toContain("PUBLIC_REPORT_SECURITY_SECRET=")
  })

  test("tracking secrets stay out of URLs and poster origins are constrained", () => {
    const tracker = readFileSync(
      resolve(process.cwd(), "components/public-report-tracker.tsx"),
      "utf8"
    )
    const api = readFileSync(
      resolve(process.cwd(), "app/api/site-management/public-report/route.ts"),
      "utf8"
    )
    const poster = readFileSync(
      resolve(process.cwd(), "app/[locale]/new-level-premium/report-poster/page.tsx"),
      "utf8"
    )

    expect(tracker).not.toContain("URLSearchParams")
    expect(tracker).not.toMatch(
      /(?:href|router\.(?:push|replace)|location\.(?:href|search))[^\n;]*trackingToken/
    )
    expect(tracker).not.toMatch(/(?:localStorage|sessionStorage)/)
    expect(tracker).toContain('method: "POST"')
    expect(api).not.toContain('params.get("trackingToken")')
    expect(api).toContain('body.action === "track"')
    expect(poster).toContain("NEXT_PUBLIC_APP_URL")
    expect(poster).toContain("NEXT_PUBLIC_SITE_URL")
    expect(poster).toContain("^[a-z0-9.-]+\\.vercel\\.app$")
    expect(poster).toContain("/${locale}/report/${encodeURIComponent(token)}")
    expect(poster).not.toContain("new-level-premium#report")
  })
})
