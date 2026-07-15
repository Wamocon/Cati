import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { setAccessRole } from "../support/flows"

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/00000000000029_portal_communications.sql"
)

test.describe("persistent portal communications contract", () => {
  test("migration defines normalized participant-secured persistence", () => {
    const migration = readFileSync(migrationPath, "utf8")

    for (const table of [
      "portal_communication_threads",
      "portal_communication_participants",
      "portal_communication_messages",
      "portal_communication_message_receipts",
      "portal_communication_attachments",
      "portal_communication_templates",
      "portal_communication_template_variants",
      "portal_communication_deliveries",
      "portal_communication_outbox",
      "portal_communication_provider_receipts",
      "portal_communication_events",
      "portal_communication_consents",
      "portal_communication_suppressions",
      "portal_communication_audiences",
      "portal_communication_audience_members",
    ]) {
      expect(migration).toContain(`public.${table}`)
    }

    expect(migration).toContain(
      "current_user_can_access_portal_communication_thread"
    )
    expect(migration).toContain("current_user_has_unit_relationship")
    expect(migration).toContain("current_user_has_tenant_module_access")
    expect(migration).toContain("current_user_can_manage_site")
    expect(migration).toContain("assigned_profile_id")
    expect(migration).toContain("scope_kind = 'finance'")
    expect(migration).toContain("FOR UPDATE")
    expect(migration).toContain("SKIP LOCKED")
    expect(migration).toContain("dead_letter")
    expect(migration).toContain("next_retry_at")
    expect(migration).toContain("provider_acknowledged_at")
    expect(migration).toContain("provider_event_id")
    expect(migration).toContain("reject_append_only_mutation")
    expect(migration).toContain("REPLICA IDENTITY FULL")
    expect(migration).toContain("supabase_realtime")
  })

  test("delivery truth has no unacknowledged external sent state", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const repository = readFileSync(
      resolve(process.cwd(), "lib/communications-repository.ts"),
      "utf8"
    )

    expect(migration).not.toMatch(/delivery_state[^\n]+['"]sent['"]/i)
    expect(migration).toContain("provider_acknowledged")
    expect(migration).toContain("provider_message_id IS NOT NULL")
    expect(migration).toContain("provider_acknowledged_at IS NOT NULL")
    expect(repository).toContain("provider-ready")
    expect(repository).not.toContain('providerMode: "live"')
  })

  test("message lifecycle is complete and raw provider evidence is internal", () => {
    const migration = readFileSync(migrationPath, "utf8")

    for (const state of [
      "draft",
      "scheduled",
      "queued",
      "portal_delivered",
      "provider_acknowledged",
      "read",
      "failed",
      "cancelled",
    ]) {
      expect(migration).toContain(`'${state}'`)
    }

    for (const policyName of [
      "portal_communication_outbox_read",
      "portal_communication_provider_receipts_read",
    ]) {
      const policy = migration.match(
        new RegExp(`CREATE POLICY ${policyName}[\\s\\S]*?;`)
      )?.[0]
      expect(policy).toBeTruthy()
      expect(policy).toContain("current_user_profile_role() = 'admin'")
      expect(policy).toContain("current_user_can_manage_site")
      expect(policy).toContain("scope_kind = 'finance'")
      expect(policy).not.toContain(
        "current_user_can_access_portal_communication_thread"
      )
    }
  })

  test("preferences stay least-privilege and gate every external enqueue", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const consentPolicy = migration.match(
      /CREATE POLICY portal_communication_consents_read[\s\S]*?;/
    )?.[0]
    const suppressionPolicy = migration.match(
      /CREATE POLICY portal_communication_suppressions_read[\s\S]*?;/
    )?.[0]

    expect(consentPolicy).toBeTruthy()
    expect(consentPolicy).toContain("profile_id = (SELECT auth.uid())")
    expect(consentPolicy).toContain("current_user_profile_role() = 'admin'")
    expect(consentPolicy).not.toContain("'manager'")
    expect(suppressionPolicy).toContain("current_user_can_manage_site")
    expect(suppressionPolicy).toContain("public.units")
    expect(migration).toContain("Consent or suppression blocked external delivery.")
    expect(migration).toContain("portal_communication_consents")
    expect(migration).toContain("portal_communication_suppressions")
  })

  test("attachments retain only the authorized document identifier", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const attachmentTable = migration.match(
      /CREATE TABLE public\.portal_communication_attachments[\s\S]*?\n\);/
    )?.[0]

    expect(attachmentTable).toBeTruthy()
    expect(attachmentTable).toContain("document_id UUID")
    expect(attachmentTable).not.toMatch(/storage_(?:path|bucket)|file_path/i)
  })

  test("legacy permissive Phase-11 policies are explicitly retired", () => {
    const migration = readFileSync(migrationPath, "utf8")
    expect(migration).toContain('DROP POLICY IF EXISTS "Managers can manage phase 10 11"')
    expect(migration).toContain("message_threads_read_module_scope")
    expect(migration).toContain("notification_deliveries_read_module_scope")
    expect(migration).toContain("legacy_phase11_communications_admin_read")
  })

  test("local access profiles receive an honest unavailable read contract", async ({ page }) => {
    await setAccessRole(page, "owner")
    const response = await page.request.get(
      "/api/site-management/communications?view=workspace"
    )

    expect(response.status()).toBe(200)
    expect(response.headers()["cache-control"]).toContain("no-store")
    await expect(response.json()).resolves.toMatchObject({
      contractVersion: "portal-communications.v2",
      source: "unavailable",
      mutationAvailable: false,
      unavailableReason: "real_auth_required",
      providerBoundary: {
        portal: "database_required",
        email: "provider-ready",
        sms: "provider-ready",
        whatsapp: "provider-ready",
        push: "provider-ready",
      },
    })
  })

  test("write contract requires idempotency before repository mutation", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post(
      "/api/site-management/communications",
      {
        data: {
          action: "reply",
          threadId: "11111111-1111-4111-8111-111111111111",
          body: "Please provide the requested operational detail.",
          locale: "en",
        },
      }
    )

    expect(response.status()).toBe(400)
    await expect(response.json()).resolves.toMatchObject({
      code: "COMM_IDEMPOTENCY_REQUIRED",
    })
  })

  test("route and repository expose bounded command contracts", () => {
    const route = readFileSync(
      resolve(process.cwd(), "app/api/site-management/communications/route.ts"),
      "utf8"
    )
    const repository = readFileSync(
      resolve(process.cwd(), "lib/communications-repository.ts"),
      "utf8"
    )

    expect(route).toContain('"Idempotency-Key"')
    expect(route).toContain('"If-Match"')
    expect(route).toContain('"Cache-Control": "private, no-store"')
    expect(repository).toContain("create_portal_communication_thread_command")
    expect(repository).toContain("post_portal_communication_message_command")
    expect(repository).toContain("mark_portal_communication_message_read_command")
    expect(repository).toContain("retry_portal_communication_delivery_command")
    expect(repository).toContain("cancel_portal_communication_delivery_command")
    expect(repository).toContain("save_portal_communication_template_command")
    expect(repository).toContain("create_portal_communication_broadcast_command")
  })

  test("UC23 sources have no demo-data fallback", () => {
    const sourcePaths = [
      resolve(process.cwd(), "app/api/site-management/communications/route.ts"),
      resolve(process.cwd(), "app/[locale]/dashboard/communications/page.tsx"),
      resolve(process.cwd(), "lib/communications-repository.ts"),
    ]
    const sources = sourcePaths.map((path) => readFileSync(path, "utf8"))

    for (const source of sources) {
      expect(source).not.toContain("site-management-data")
      expect(source).not.toContain("local-demo-contract")
    }

    const localizedSources = [
      resolve(process.cwd(), "components/communications/communications-center.tsx"),
      resolve(process.cwd(), "lib/communications-copy.ts"),
    ].map((path) => readFileSync(path, "utf8"))
    for (const source of localizedSources) {
      for (const marker of ["Ã", "Â", "â€", "Ð", "Ñ"]) {
        expect(source).not.toContain(marker)
      }
    }
  })

  test("idempotency fingerprints use SHA-256 and reject payload reuse", () => {
    const migration = readFileSync(migrationPath, "utf8")
    expect(migration).not.toContain("md5(")
    expect(migration).toContain("extensions.digest")
    expect(migration).toContain("'sha256'")
    expect(migration).toContain("commandFingerprint")
    expect(migration).toContain("Idempotency key payload mismatch.")
    expect(migration.match(/v_command_fingerprint :=/g)?.length).toBeGreaterThanOrEqual(7)
    expect(migration).toContain("actor_profile_id = (SELECT auth.uid())")
    expect(migration).toContain("Current communication scope no longer permits replay.")
    expect(migration).toContain("Current template scope no longer permits replay.")
    expect(migration).toContain("Threadless command replay is not authorized.")
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.portal_communication_sha256(TEXT) FROM PUBLIC"
    )
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.portal_communication_replay_result(UUID, TEXT, TEXT) FROM PUBLIC"
    )
  })

  test("scheduled portal, ambiguous recipients, and stale leases fail closed", () => {
    const migration = readFileSync(migrationPath, "utf8")
    expect(migration).toContain("p_channel = 'portal' AND p_scheduled_for IS NOT NULL")
    expect(migration).toContain("Scheduled portal delivery is not supported")
    expect(migration).toContain("v_recipient_count <> 1")
    expect(migration).toContain("exactly one active, verified recipient")
    expect(migration).not.toMatch(/ORDER BY p\.created_at\s+LIMIT 1/)
    expect(migration).toContain("locked_at < NOW() - INTERVAL '5 minutes'")
    expect(migration).toContain("Worker processing lease expired.")
  })

  test("implicit participants and broadcast members are revalidated before persistence", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const threadCommand = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.create_portal_communication_thread_command"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.post_portal_communication_message_command")
    )
    const broadcastCommand = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.create_portal_communication_broadcast_command"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.claim_portal_communication_outbox")
    )

    expect(threadCommand).toContain("|| ARRAY[(SELECT auth.uid())]")
    expect(threadCommand).toContain("At least one eligible recipient is required.")
    expect(threadCommand).toContain("WHEN p_assigned_profile_id IS NULL")
    expect(threadCommand).toContain("p.role = 'manager'")
    expect(threadCommand).toContain("p.role = 'staff'")
    expect(threadCommand).toContain("p.id = p_assigned_profile_id")
    expect(threadCommand).toContain("p.role = 'accountant' AND p_scope_kind = 'finance'")
    expect(threadCommand).toContain("psa.valid_until > NOW()")

    const validation = broadcastCommand.indexOf(
      "Every broadcast member must match the template company, site, and current relationship."
    )
    const persistence = broadcastCommand.indexOf(
      "INSERT INTO public.portal_communication_audiences"
    )
    expect(validation).toBeGreaterThan(0)
    expect(persistence).toBeGreaterThan(validation)
    expect(broadcastCommand).toContain("p.company_id = v_company_id")
    expect(broadcastCommand).toContain("u.site_id IS DISTINCT FROM v_template.site_id")
    expect(broadcastCommand).toContain("public.profile_has_unit_relationship")
    expect(broadcastCommand).toContain("public.profile_has_tenant_module_access")
    expect(broadcastCommand).toContain("public.profile_site_assignments")
    expect(broadcastCommand).toContain("public.portal_communication_consents")
    expect(broadcastCommand).toContain("public.portal_communication_suppressions")
    expect(broadcastCommand).toContain("Consent or suppression blocked a broadcast recipient.")
  })

  test("staff access is limited to assigned operational threads", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const threadAccess = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.current_user_can_access_portal_communication_thread"
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.current_user_can_manage_portal_communication_template"
      )
    )
    const activeRecipient = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.portal_communication_profile_is_active_recipient"
      ),
      migration.indexOf(
        "ALTER TABLE public.portal_communication_threads ENABLE ROW LEVEL SECURITY"
      )
    )
    const threadCommand = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.create_portal_communication_thread_command"
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.post_portal_communication_message_command"
      )
    )
    const broadcastCommand = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.create_portal_communication_broadcast_command"
      ),
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.claim_portal_communication_outbox"
      )
    )

    expect(threadAccess).toMatch(
      /public\.current_user_profile_role\(\) = 'staff'\s+AND t\.scope_kind = 'operational'\s+AND t\.assigned_profile_id = \(SELECT auth\.uid\(\)\)/
    )
    expect(threadAccess).toContain("p.profile_id = (SELECT auth.uid())")
    expect(threadAccess).toContain("p.active")
    expect(threadAccess).toContain("psa.status = 'active'")

    expect(activeRecipient).toMatch(
      /p\.role = 'staff'\s+AND t\.scope_kind = 'operational'\s+AND t\.assigned_profile_id = p\.id/
    )
    expect(activeRecipient).toContain("participant.active")
    expect(activeRecipient).toContain("psa.status = 'active'")

    expect(threadCommand).toContain(
      "p.role <> 'staff' OR p_scope_kind = 'operational'"
    )
    expect(threadCommand).toMatch(
      /p\.role = 'staff'\s+AND p_scope_kind = 'operational'\s+AND p\.id = p_assigned_profile_id/
    )

    expect(broadcastCommand).toMatch(
      /p\.role = 'staff'\s+AND v_template\.purpose = 'operational'/
    )
  })

  test("outbox claims are fenced and stale attempts propagate delivery truth", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const claimContract = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.claim_portal_communication_outbox"),
      migration.indexOf("CREATE OR REPLACE FUNCTION public.record_portal_communication_provider_receipt")
    )

    expect(migration).toContain("claim_token UUID")
    expect(claimContract).toContain("claim_token = gen_random_uuid()")
    expect(claimContract).toContain("p_worker_id TEXT")
    expect(claimContract).toContain("p_claim_token UUID")
    expect(claimContract).toContain("v_outbox.locked_by IS DISTINCT FROM BTRIM(p_worker_id)")
    expect(claimContract).toContain("v_outbox.claim_token IS DISTINCT FROM p_claim_token")
    expect(claimContract).toContain("the lease may have expired or been replaced")
    expect(claimContract).toContain("UPDATE public.portal_communication_deliveries")
    expect(claimContract).toContain("UPDATE public.portal_communication_messages")
    expect(claimContract).toContain("v_expired.status = 'dead_letter'")
    expect(migration).toContain(
      "complete_portal_communication_outbox_attempt(UUID, TEXT, UUID, BOOLEAN, TEXT, INTEGER)"
    )
  })

  test("provider receipts and threadless events retain immutable scoped identities", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const receiptCommand = migration.slice(
      migration.indexOf("CREATE OR REPLACE FUNCTION public.record_portal_communication_provider_receipt"),
      migration.indexOf("-- 6. Evidence protection")
    )
    const eventPolicy = migration.match(
      /CREATE POLICY portal_communication_events_read[\s\S]*?;\r?\n/
    )?.[0]

    expect(migration).toContain("portal_communication_provider_message_identity_unique")
    expect(receiptCommand).toContain("v_existing_receipt.delivery_id IS DISTINCT FROM v_delivery.id")
    expect(receiptCommand).toContain("v_existing_receipt.provider_message_id IS DISTINCT FROM")
    expect(receiptCommand).toContain("Duplicate provider event identity does not match its original receipt.")
    expect(migration).toContain("protect_portal_communication_provider_identity")
    expect(migration).toContain("Acknowledged provider identity is immutable.")
    expect(eventPolicy).toBeTruthy()
    expect(eventPolicy).toContain("thread_id IS NOT NULL")
    expect(eventPolicy).toContain("thread_id IS NULL")
    expect(eventPolicy).toContain("public.portal_communication_templates")
    expect(eventPolicy).toContain("current_user_can_manage_portal_communication_template")
    expect(eventPolicy).not.toContain("thread_id IS NULL\n      OR")
  })

  test("participant targeting and delivery evidence remain role scoped", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const repository = readFileSync(
      resolve(process.cwd(), "lib/communications-repository.ts"),
      "utf8"
    )
    expect(migration).toContain("Every participant must have an active matching site or unit relationship.")
    expect(migration).toContain("profile_has_unit_relationship")
    expect(migration).toContain("profile_has_tenant_module_access")
    expect(migration).toContain("profile_site_assignments")
    expect(migration).toContain("security_invoker = TRUE")
    expect(migration).toContain("portal_communication_delivery_evidence")
    expect(migration).toContain("REVOKE SELECT ON public.portal_communication_deliveries")
    expect(repository).toContain('profile.role === "admin" || profile.role === "manager" || profile.role === "accountant"')
    expect(repository).toContain('from("portal_communication_delivery_evidence")')
    expect(repository).toContain('from("portal_communication_delivery_status")')
    expect(repository).toContain("const targetSiteIds")
    expect(repository).toContain("profile_site_assignments")
    expect(repository).toContain("COMM_MIGRATION_REQUIRED")
    expect(repository).toContain("COMM_STATE_CONFLICT")
  })

  test("first-thread recipient directory is relationship scoped and fail closed", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const repository = readFileSync(
      resolve(process.cwd(), "lib/communications-repository.ts"),
      "utf8"
    )
    const candidateContract = migration.slice(
      migration.indexOf(
        "CREATE OR REPLACE FUNCTION public.portal_communication_participant_candidates"
      ),
      migration.indexOf("-- 6. Evidence protection")
    )

    expect(candidateContract).toContain("SECURITY DEFINER")
    expect(candidateContract).toContain("p.role IN ('admin', 'manager', 'accountant')")
    expect(candidateContract).toContain("a.role <> 'accountant' OR p.role <> 'staff'")
    expect(candidateContract).toContain("public.current_user_can_manage_site(s.id)")
    expect(candidateContract).toContain("public.profile_site_assignments")
    expect(candidateContract).toContain("public.profile_has_unit_relationship")
    expect(candidateContract).toContain("public.profile_has_tenant_module_access")
    expect(candidateContract).toContain("p.id <> a.id")
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.portal_communication_participant_candidates() FROM PUBLIC"
    )
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.portal_communication_participant_candidates() TO authenticated"
    )
    expect(repository).toContain(
      'supabase.rpc("portal_communication_participant_candidates")'
    )
    expect(repository).toContain("participants: asRecords(candidateResult.data)")
  })

  test("API caps mutation bodies and fails local PATCH closed", () => {
    const route = readFileSync(
      resolve(process.cwd(), "app/api/site-management/communications/route.ts"),
      "utf8"
    )
    expect(route).toContain("request.body.getReader()")
    expect(route).toContain("maxBytes = 32_768")
    expect(route).toContain('request.headers.get("content-length")')
    expect(route).toContain("COMM_BODY_TOO_LARGE")
    expect(route.match(/profile\.id === LOCAL_ACCESS_PROFILE_ID/g)?.length).toBeGreaterThanOrEqual(2)
    expect(route).toContain('Vary: "Cookie, Authorization"')
  })
})
