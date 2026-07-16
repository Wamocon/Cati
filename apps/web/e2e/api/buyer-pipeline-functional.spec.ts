import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { setAccessRole } from "../support/flows"

const buyerApi = "/api/site-management/buyer-pipeline"

test.describe("Functional tests - authoritative buyer pipeline", () => {
  test("only organization administrators and scoped managers can open the pipeline", async ({
    page,
  }) => {
    for (const role of ["admin", "manager"] as const) {
      await setAccessRole(page, role)
      const response = await page.request.get(buyerApi)
      expect(response.status(), `${role} buyer workspace`).toBe(200)
      expect(response.headers()["cache-control"]).toContain("no-store")
      const payload = await response.json()
      expect(payload).toMatchObject({
        source: "unavailable",
        mutationAvailable: false,
        unavailableReason: "real_auth_required",
        authority: "local_authoritative",
        twentySync: "provider_ready",
      })
      expect(payload.prospects).toEqual([])
    }

    for (const role of ["accountant", "staff", "owner", "tenant"] as const) {
      await setAccessRole(page, role)
      const response = await page.request.get(buyerApi)
      expect(response.status(), `${role} buyer denial`).toBe(403)
      await expect(response.json()).resolves.toMatchObject({
        code: "BUYER_PIPELINE_FORBIDDEN",
      })
    }
  })

  test("a local access profile cannot create a prospect that looks persisted", async ({
    page,
  }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post(buyerApi, {
      headers: { "Idempotency-Key": "buyer-api-contract-0001" },
      data: {
        fullName: "Prospective Buyer",
        email: "buyer@example.test",
        source: "website",
        consentStatus: "granted",
        consentVersion: "kvkk-buyer-2026-07-v1",
        siteId: "11111111-1111-4111-8111-111111111111",
        assignedManagerId: "00000000-0000-0000-0000-000000000000",
      },
    })
    expect(response.status()).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "BUYER_PIPELINE_REAL_AUTH_REQUIRED",
    })
  })

  test("the migration fixes stages, CAS, immutable consent, duplicates, and command replay", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000031_buyer_pipeline.sql"
      ),
      "utf8"
    )
    for (const stage of [
      "new",
      "contacted",
      "qualified",
      "viewing",
      "offer",
      "reservation",
      "due_diligence",
      "won",
      "lost",
    ])
      expect(migration).toContain(`'${stage}'`)
    expect(migration).toContain(
      "CREATE TABLE public.buyer_prospect_stage_events"
    )
    expect(migration).toContain(
      "CREATE TABLE public.buyer_prospect_consent_events"
    )
    expect(migration).toContain("CREATE TABLE public.buyer_prospect_notes")
    expect(migration).toContain(
      "CREATE TABLE public.buyer_prospect_conversion_links"
    )
    expect(migration).toContain("Buyer prospect history is append-only")
    expect(migration).toContain("buyer_consent_events_append_only")
    expect(migration).toContain("buyer_consent_transition_allowed")
    expect(migration).toContain(
      "WHEN 'pending' THEN p_to IN ('pending', 'granted')"
    )
    expect(migration).toContain(
      "WHEN 'granted' THEN p_to IN ('granted', 'withdrawn')"
    )
    expect(migration).toContain("WHEN 'withdrawn' THEN p_to = 'withdrawn'")
    expect(migration).toContain("consent_status IN ('granted', 'withdrawn')")
    expect(migration).toContain("Buyer prospect version conflict")
    expect(migration).toContain("buyer_stage_transition_allowed")
    expect(migration).toContain("buyer_prospects_email_unique")
    expect(migration).toContain("buyer_prospects_phone_unique")
    expect(migration).toContain("public.registration_requests")
    expect(migration).toContain("public.reservations")
    expect(migration).toContain("UNIQUE (prospect_id, target_type)")
    expect(migration).toContain("twenty_sync_status")
    expect(migration).toContain("provider_ready")
    expect(migration).toContain("current_user_can_manage_site")
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.update_buyer_prospect_v1"
    )
    expect(migration).toContain("profile_site_assignments")
    expect(migration).toContain("a.status = 'active'")
    expect(migration).toContain("consent_text_digest ~ '^[0-9a-f]{64}$'")
    expect(migration).toContain(
      "Buyer contact values match different active prospects"
    )
    expect(migration).toContain("UNIQUE (company_id, target_type, target_id)")
    expect(migration).toContain("r.status <> 'rejected'")
    expect(migration).toContain("lower(btrim(COALESCE(r.guest_name, '')))")
    expect(migration).not.toContain("Buyer note command is not initialized")

    expect(migration).toContain(
      "command_type IN ('create', 'transition', 'note', 'update', 'convert')"
    )
    for (const [command, action] of [
      ["create_buyer_prospect_v1", "create"],
      ["transition_buyer_prospect_v1", "transition"],
      ["convert_buyer_prospect_v1", "convert"],
      ["add_buyer_prospect_note_v1", "note"],
      ["update_buyer_prospect_v1", "update"],
    ] as const) {
      const functionStart = migration.indexOf(
        `CREATE OR REPLACE FUNCTION public.${command}`
      )
      expect(functionStart, `${command} exists`).toBeGreaterThanOrEqual(0)
      const nextFunction = migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.",
        functionStart + 1
      )
      const functionSql = migration.slice(
        functionStart,
        nextFunction === -1 ? undefined : nextFunction
      )
      const replayStart = functionSql.indexOf("IF FOUND THEN")
      const replayReturn = functionSql.indexOf("RETURN", replayStart)
      const replayGuard = functionSql.slice(replayStart, replayReturn)
      expect(replayGuard, `${command} replay reloads its prospect`).toContain(
        "SELECT * INTO v_prospect FROM public.buyer_prospects"
      )
      expect(replayGuard, `${command} replay checks current company`).toContain(
        "company_id = v_company_id"
      )
      expect(
        replayGuard,
        `${command} replay checks current authorization`
      ).toContain("public.buyer_prospect_scope_allowed")
      expect(
        replayGuard,
        `${command} replay fails closed after revocation`
      ).toContain("Buyer replay is outside the current authorized scope")
      expect(
        replayGuard,
        `${command} replay ignores a stale expected version`
      ).not.toContain("v_prospect.version <> p_expected_version")
      expect(
        functionSql,
        `${command} uses the shared command ledger`
      ).toContain("SELECT * INTO v_command FROM public.buyer_prospect_commands")
      expect(functionSql, `${command} binds the key to its action`).toContain(
        `v_command.command_type <> '${action}'`
      )
      expect(functionSql, `${command} fingerprints its action`).toContain(
        `'action', '${action}'`
      )
      expect(functionSql, `${command} serializes command-key reuse`).toContain(
        ":buyer-command:"
      )
      expect(functionSql, `${command} persists its command result`).toContain(
        `'${action}', v_fingerprint`
      )
    }

    const createSql = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.create_buyer_prospect_v1"
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.transition_buyer_prospect_v1"
      )
    )
    expect(createSql).toContain("'email:' || v_email")
    expect(createSql).toContain("'phone:' || v_phone")
    expect(createSql).toContain("ORDER BY contact_key")
    expect(createSql).toContain("ORDER BY b.created_at, b.id LIMIT 1")
    expect(createSql).toContain(
      "Buyer contact values match different active prospects"
    )
    expect(createSql).toContain("public.buyer_prospect_consent_events")

    const transitionSql = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.transition_buyer_prospect_v1"
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.convert_buyer_prospect_v1"
      )
    )
    expect(transitionSql).not.toContain("p_target_type")
    expect(transitionSql).not.toContain("p_target_id")
    expect(transitionSql).toContain(
      "length(btrim(COALESCE(p_reason, ''))) > 1000"
    )

    const convertSql = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.convert_buyer_prospect_v1"
      ),
      migration.indexOf("ALTER TABLE public.buyer_prospects")
    )
    expect(convertSql).toContain("'version', v_prospect.version")
    expect(convertSql).not.toContain("'version', v_link.prospect_version")

    const updateSql = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.update_buyer_prospect_v1"
      )
    )
    expect(updateSql).toContain("Buyer consent grant evidence is immutable")
    expect(updateSql).toContain(
      "v_prospect.consent_status = 'pending' AND p_consent_status = 'granted'"
    )
    expect(updateSql).toContain(
      "Buyer consent evidence must be a complete version and digest pair"
    )
    expect(updateSql).toContain(
      "public.buyer_consent_transition_allowed(v_prospect.consent_status, p_consent_status)"
    )
    expect(updateSql).toContain("ELSE consent_version END")
    expect(updateSql).toContain("ELSE consent_text_digest END")
    expect(updateSql).toContain("ELSE consent_accepted_at END")
    expect(updateSql).toContain("v_previous_consent_status")
    expect(updateSql).toContain("public.buyer_prospect_consent_events")
    expect(updateSql).toContain("ORDER BY contact_key")

    const repository = readFileSync(
      resolve(process.cwd(), "lib/buyer-pipeline-repository.ts"),
      "utf8"
    )
    expect(repository).toContain('unavailableReason: "site_scope_required"')
    expect(repository).toContain(
      '.eq("company_id", profile.company_id as string)'
    )
    expect(repository).toContain(
      'supabase.from("units").select("id, site_id, unit_no")'
    )
    expect(repository).toContain('unitsQuery.in("site_id", siteIds)')
    expect(repository).toContain("consentEvidenceRecorded: boolean")
    const prospectContract = repository.slice(
      repository.indexOf("export interface BuyerProspect"),
      repository.indexOf("export interface BuyerInterest")
    )
    expect(prospectContract).not.toContain("consentTextDigest")

    const route = readFileSync(
      resolve(process.cwd(), "app/api/site-management/buyer-pipeline/route.ts"),
      "utf8"
    )
    expect(route).toContain("mutationOriginAllowed(request)")
    expect(route).toContain("MAX_MUTATION_BODY_BYTES = 32 * 1024")
    expect(route).toContain('request.headers.get("content-length")')
    expect(route).toContain("request.body.getReader()")
    expect(route).toContain("size > MAX_MUTATION_BODY_BYTES")
    expect(route).toContain("reader.cancel()")
    expect(route).not.toContain("request.text()")
    expect(route).not.toContain("new TextEncoder()")
    expect(route).toContain('!["pending", "granted"].includes(consentStatus)')
    expect(route).toContain("hasConsentVersion !== hasConsentDigest")
    expect(route).toContain(
      "Consent evidence must be omitted or supplied as a valid version and digest pair."
    )
  })
})
