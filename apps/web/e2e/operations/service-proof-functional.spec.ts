import { expect, test } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { ServiceProofFeed } from "../../lib/service-proof-repository"
import { openDashboardAs, setAccessRole } from "../support/flows"

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../.."
)

function sqlFunction(source: string, name: string) {
  const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}`)
  expect(start, `${name} must be defined`).toBeGreaterThanOrEqual(0)
  const end = source.indexOf("\n$$;", start)
  expect(
    end,
    `${name} must have a complete dollar-quoted body`
  ).toBeGreaterThan(start)
  return source.slice(start, end + 4)
}

interface QueueTask {
  id: string
  ticketId: string
}

async function queueTasks(page: Parameters<typeof setAccessRole>[0]) {
  const response = await page.request.get(
    "/api/site-management/tickets?limit=100"
  )
  expect(response.status()).toBe(200)
  const payload = (await response.json()) as { workforceTasks: QueueTask[] }
  expect(payload.workforceTasks.length).toBeGreaterThan(0)
  return payload.workforceTasks
}

test.describe("Static exploit regressions - service proof database boundary", () => {
  test("same-ticket local staff scope allows own task and hides coworker GET/POST", async () => {
    const repository = await readFile(
      resolve(REPOSITORY_ROOT, "apps/web/lib/service-proof-repository.ts"),
      "utf8"
    )
    const route = await readFile(
      resolve(
        REPOSITORY_ROOT,
        "apps/web/app/api/site-management/service-proofs/route.ts"
      ),
      "utf8"
    )
    const sharedTicketId = "SRV-SHARED-ASSIGNEES"
    const permittedTicketIds = new Set([sharedTicketId])
    const ownTask = {
      id: "TASK-STAFF-A",
      ticketId: sharedTicketId,
      assignee: "Teknik - Ahmet",
    }
    const coworkerTask = {
      id: "TASK-STAFF-B",
      ticketId: sharedTicketId,
      assignee: "Teknik - Banu",
    }
    const matchesLocalContract = (candidate: typeof ownTask) =>
      candidate.ticketId === sharedTicketId &&
      permittedTicketIds.has(candidate.ticketId) &&
      candidate.assignee === "Teknik - Ahmet"

    expect(matchesLocalContract(ownTask)).toBe(true)
    expect(matchesLocalContract(coworkerTask)).toBe(false)
    expect(repository).toMatch(
      /function localServiceProofTaskMatchesScope[\s\S]*?candidate\.id === requested\.workforceTaskId[\s\S]*?candidate\.ticketId === requested\.ticketId[\s\S]*?permittedTicketIds\.has\(candidate\.ticketId\)[\s\S]*?role !== "staff"[\s\S]*?candidate\.assignee\.trim\(\) === LOCAL_QA_STAFF_ASSIGNMENT_LABEL/
    )
    expect(repository).toMatch(
      /const task = queue\.workforceTasks\.find\([\s\S]*?localServiceProofTaskMatchesScope\([\s\S]*?if \(!task\)[\s\S]*?"The task does not belong to the requested ticket\."[\s\S]*?404/
    )
    expect(route).toMatch(
      /function errorResponse[\s\S]*?error instanceof ServiceProofRepositoryError \? error\.status : 500/
    )
    expect(route).toMatch(
      /export async function GET[\s\S]*?listServiceProofs\([\s\S]*?catch \(error\)[\s\S]*?errorResponse\(error\)/
    )
    expect(route).toMatch(
      /export async function POST[\s\S]*?submitServiceProof\([\s\S]*?catch \(error\)[\s\S]*?errorResponse\(error\)/
    )
  })

  test("task, QA, storage and retry boundaries stay fail-closed", async () => {
    const migration = await readFile(
      resolve(
        REPOSITORY_ROOT,
        "supabase/migrations/00000000000027_service_order_evidence.sql"
      ),
      "utf8"
    )
    const repository = await readFile(
      resolve(REPOSITORY_ROOT, "apps/web/lib/service-proof-repository.ts"),
      "utf8"
    )
    const route = await readFile(
      resolve(
        REPOSITORY_ROOT,
        "apps/web/app/api/site-management/service-proofs/route.ts"
      ),
      "utf8"
    )
    const panel = await readFile(
      resolve(REPOSITORY_ROOT, "apps/web/components/service-proof-panel.tsx"),
      "utf8"
    )
    const databaseContract = await readFile(
      resolve(REPOSITORY_ROOT, "supabase/tests/service_proof_security.sql"),
      "utf8"
    )

    const projection = sqlFunction(
      migration,
      "service_evidence_operational_projection"
    )
    const uploadCompletion = sqlFunction(
      migration,
      "complete_service_evidence_upload_command"
    )
    const scanCompletion = sqlFunction(
      migration,
      "record_service_evidence_scan_command"
    )
    const residentList = sqlFunction(
      migration,
      "list_resident_service_evidence"
    )
    const fileAuthorization = sqlFunction(
      migration,
      "authorize_service_evidence_file_access"
    )
    const topicAuthorization = sqlFunction(
      migration,
      "current_user_can_subscribe_service_evidence_topic"
    )
    const broadcastInvalidation = sqlFunction(
      migration,
      "broadcast_service_evidence_changed"
    )
    const exactTaskAssignee = sqlFunction(
      migration,
      "current_user_is_exact_task_assignee"
    )
    const createEvidence = sqlFunction(
      migration,
      "create_service_evidence_command"
    )
    const ticketEvidenceGate = sqlFunction(
      migration,
      "enforce_ticket_service_evidence_gate"
    )

    expect(migration).not.toMatch(/\bmd5\s*\(/i)
    expect(migration).not.toMatch(/RETURNS\s+public\.media_reports/i)
    expect(projection).not.toMatch(
      /'storage_path'|'storage_bucket'|'checksum_sha256'|'request_fingerprint'|'idempotency_key'|'submitted_by_profile_id'|'reviewed_by_profile_id'|'metadata'/
    )

    expect(residentList).toContain("SECURITY DEFINER")
    expect(residentList).toMatch(/v_role NOT IN \('owner', 'tenant'\)/)
    expect(residentList).toMatch(/m\.verification_status = 'accepted'/)
    expect(residentList).not.toMatch(
      /review_reason|override_reason|actor_profile_id|reviewed_by_profile_id|checksum_sha256|request_fingerprint|idempotency_key|event\.payload/
    )
    expect(fileAuthorization).not.toMatch(
      /'storagePath'|'storageBucket'|'mimeType'|'checksumSha256'/
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Company members can read" ON public.media_reports;'
    )
    expect(migration).toMatch(
      /CREATE POLICY service_evidence_select_scope[\s\S]*?current_user_profile_role\(\) IN \('admin', 'manager', 'staff'\)/
    )
    expect(migration).toMatch(
      /CREATE POLICY service_evidence_event_select_scope[\s\S]*?current_user_profile_role\(\) IN \('admin', 'manager', 'staff'\)/
    )
    expect(migration).toContain(
      "REVOKE ALL ON public.media_reports FROM anon, authenticated;"
    )
    expect(migration).toContain(
      "REVOKE ALL ON public.service_evidence_events FROM anon, authenticated;"
    )
    expect(migration).not.toMatch(
      /GRANT SELECT ON public\.(?:media_reports|service_evidence_events) TO authenticated;/
    )
    const evidenceGrant = migration.match(
      /GRANT SELECT \([\s\S]*?\) ON public\.media_reports TO authenticated;/
    )?.[0]
    const eventGrant = migration.match(
      /GRANT SELECT \([\s\S]*?\) ON public\.service_evidence_events TO authenticated;/
    )?.[0]
    expect(evidenceGrant).toBeTruthy()
    expect(eventGrant).toBeTruthy()
    expect(evidenceGrant).not.toMatch(
      /storage_path|storage_bucket|safe_filename|checksum_sha256|request_fingerprint|idempotency_key|submitted_by_profile_id|reviewed_by_profile_id/
    )
    expect(eventGrant).not.toMatch(
      /actor_profile_id|payload|idempotency_key|company_id/
    )

    expect(topicAuthorization).toMatch(/\^service-proof:\[0-9a-f\]\{8\}/)
    expect(topicAuthorization).toMatch(
      /t\.id = w\.ticket_id[\s\S]*?t\.company_id = w\.company_id[\s\S]*?t\.site_id = w\.site_id/
    )
    expect(topicAuthorization).toMatch(
      /WHEN 'admin'[\s\S]*?WHEN 'manager'[\s\S]*?WHEN 'staff'[\s\S]*?WHEN 'owner'[\s\S]*?WHEN 'tenant'/
    )
    expect(topicAuthorization).toContain(
      "public.current_user_is_exact_task_assignee(w.id)"
    )
    expect(topicAuthorization).toContain(
      "public.current_user_can_view_service_ticket(t.id)"
    )
    expect(broadcastInvalidation).toContain(
      "jsonb_build_object('kind', 'changed')"
    )
    expect(broadcastInvalidation).toContain("SECURITY DEFINER")
    expect(broadcastInvalidation).toMatch(
      /'service-proof:' \|\| NEW\.workforce_task_id::TEXT[\s\S]*?TRUE/
    )
    expect(broadcastInvalidation).not.toMatch(
      /storage_path|storage_bucket|checksum|fingerprint|idempotency|profile_id|event\.payload|service_evidence_events/
    )
    const broadcastReadPolicy = migration.match(
      /CREATE POLICY service_evidence_private_broadcast_read[\s\S]*?;/
    )?.[0]
    expect(broadcastReadPolicy).toMatch(
      /FOR SELECT[\s\S]*?extension = 'broadcast'[\s\S]*?realtime\.topic\(\)/
    )
    expect(migration).toMatch(
      /CREATE POLICY service_evidence_private_broadcast_guard[\s\S]*?AS RESTRICTIVE[\s\S]*?realtime\.topic\(\)\) NOT LIKE 'service-proof:%'[\s\S]*?current_user_can_subscribe_service_evidence_topic/
    )
    expect(migration).toMatch(
      /CREATE POLICY service_evidence_private_broadcast_insert_guard[\s\S]*?AS RESTRICTIVE[\s\S]*?FOR INSERT[\s\S]*?TO anon, authenticated[\s\S]*?WITH CHECK \([\s\S]*?realtime\.topic\(\)\) NOT LIKE 'service-proof:%'/
    )
    expect(broadcastReadPolicy).not.toContain("FOR INSERT")
    expect(migration).not.toMatch(
      /ALTER PUBLICATION supabase_realtime ADD TABLE public\.(?:media_reports|service_evidence_events)/
    )
    expect(migration).toContain(
      "ALTER PUBLICATION supabase_realtime DROP TABLE public.service_evidence_events;"
    )
    expect(migration).toContain(
      "ALTER PUBLICATION supabase_realtime DROP TABLE public.media_reports;"
    )
    expect(migration).toMatch(
      /CREATE POLICY service_evidence_object_direct_access_guard[\s\S]*?AS RESTRICTIVE[\s\S]*?FOR ALL[\s\S]*?TO anon, authenticated[\s\S]*?USING \(bucket_id <> 'cati-service-evidence'\)[\s\S]*?WITH CHECK \(bucket_id <> 'cati-service-evidence'\)/
    )

    expect(panel).not.toContain('"postgres_changes"')
    expect(panel).not.toMatch(
      /table:\s*"(?:media_reports|service_evidence_events)"/
    )
    expect(panel).toContain("await supabase.realtime.setAuth()")
    expect(panel).toContain("config: { private: true }")
    expect(panel).toContain('.on("broadcast", { event: "changed" }')
    expect(panel).toContain("isSafeChangedBroadcast(message.payload)")
    expect(panel).toMatch(
      /status === "SUBSCRIBED"[\s\S]*?setRealtimeState\("connected"\)/
    )
    expect(panel).toMatch(
      /status === "CHANNEL_ERROR"[\s\S]*?status === "TIMED_OUT"[\s\S]*?status === "CLOSED"[\s\S]*?setRealtimeState\("fallback"\)/
    )
    expect(panel).toContain("}, 30_000)")
    expect(panel).toContain('data-testid="service-proof-realtime-status"')

    expect(uploadCompletion).toMatch(/auth\.role\(\)[\s\S]*?'service_role'/)
    expect(uploadCompletion).toMatch(/length\(v_key\) < 8/)
    expect(uploadCompletion).toMatch(
      /payload ->> 'uploadStatus' IS DISTINCT FROM v_outcome/
    )
    expect(uploadCompletion).toMatch(
      /upload_status = 'requested'[\s\S]*?virus_scan_status = 'pending'[\s\S]*?verification_status = 'pending'/
    )
    expect(scanCompletion).toMatch(/length\(v_key\) < 8/)
    expect(scanCompletion).toMatch(
      /payload ->> 'virusScanStatus' IS DISTINCT FROM v_status/
    )
    expect(scanCompletion).toMatch(
      /virus_scan_status = 'pending'[\s\S]*?verification_status = 'pending'/
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.complete_service_evidence_upload_command\(UUID, TEXT, TEXT\)[\s\S]*?FROM PUBLIC, anon, authenticated;[\s\S]*?GRANT EXECUTE ON FUNCTION public\.complete_service_evidence_upload_command\(UUID, TEXT, TEXT\)[\s\S]*?TO service_role;/
    )

    expect(repository).toMatch(/\.rpc\(\s*"list_resident_service_evidence"/)
    expect(repository).toContain("visibleServiceTicketsForRole(profile.role")
    expect(repository).toMatch(
      /NODE_ENV !== "production"[\s\S]*?CATI_ENV === "qa"[\s\S]*?CATI_DEMO_DATA_ISOLATED === "true"[\s\S]*?isAccessProfileEnabled\(\)[\s\S]*?profile\.id === LOCAL_PROFILE_ID[\s\S]*?!profile\.company_id/
    )
    expect(repository).not.toContain("hasSupabaseDataPlane")
    expect(repository).not.toMatch(
      /!isSupabaseConfigured\(\) \|\||profile\.id === LOCAL_PROFILE_ID \|\||\|\|\s*!profile\.company_id/
    )
    expect(repository).toContain("permittedTicketIds.has(candidate.ticketId)")
    expect(repository).toContain(
      "candidate.assignee.trim() === LOCAL_QA_STAFF_ASSIGNMENT_LABEL"
    )
    expect(repository).toContain("localTicketScope:")
    expect(repository).toContain("LOCAL_QA_STAFF_ASSIGNMENT_LABEL")
    expect(repository).toContain("ticketIds: [ticketId]")
    expect(repository).not.toContain("bytes && !replayed")
    expect(repository).toContain('uploadStatus === "requested"')
    expect(repository).toContain('uploadStatus !== "stored"')
    expect(repository).toContain(".download(storagePath)")
    expect(repository).toMatch(
      /createHash\("sha256"\)[\s\S]*?\.update\(existingBytes\)[\s\S]*?\.digest\("hex"\)/
    )
    expect(repository).toContain(
      "existingBytes.byteLength !== bytes.byteLength"
    )
    expect(repository).toContain("existingChecksum !== checksum")
    expect(repository).toContain("upsert: false")
    expect(repository).not.toContain("p_outcome: outcome")
    expect(repository).not.toContain('p_outcome: "failed"')
    expect(repository).toMatch(
      /serviceClient\.rpc\(\s*"complete_service_evidence_upload_command"/
    )
    expect(repository).not.toMatch(
      /supabase\.rpc\(\s*"complete_service_evidence_upload_command"/
    )
    expect(route).toContain("mutationOriginAllowed(request)")
    expect(route).toContain("consumeRequestRateLimit")
    expect(route).toContain("52 * 1024 * 1024")

    // A ticket may have multiple workforce tasks assigned to different people.
    // Staff authority is therefore evaluated by the exact task id, never by
    // ticket membership alone, in both authenticated and local QA paths.
    expect(exactTaskAssignee).toMatch(/w\.id = p_workforce_task_id/)
    expect(exactTaskAssignee).toMatch(
      /sm\.id = w\.assigned_staff_member_id[\s\S]*?sm\.profile_id = \(SELECT auth\.uid\(\)\)/
    )
    expect(createEvidence).toContain(
      "public.current_user_is_exact_task_assignee(v_task.id)"
    )

    // One proof on task A must not release task B on the same ticket. Both
    // manager review and resolution use a correlated missing-proof check.
    expect(ticketEvidenceGate).toMatch(
      /workflow_state = 'manager_review'[\s\S]*?w\.requires_media[\s\S]*?w\.status NOT IN \('closed', 'cancelled'\)[\s\S]*?NOT EXISTS[\s\S]*?m\.workforce_task_id = w\.id[\s\S]*?m\.verification_status IN \('pending', 'accepted'\)/
    )
    expect(ticketEvidenceGate).toMatch(
      /workflow_state = 'resolved'[\s\S]*?w\.requires_media[\s\S]*?w\.status NOT IN \('closed', 'cancelled'\)[\s\S]*?NOT EXISTS[\s\S]*?m\.workforce_task_id = w\.id[\s\S]*?m\.verification_status = 'accepted'/
    )
    expect(
      ticketEvidenceGate.match(/m\.workforce_task_id = w\.id/g)
    ).toHaveLength(2)

    // A dropped response after commit must replay the same command. Keys are
    // cleared only after success or when the user changes the command intent.
    expect(panel).toContain(
      "const submitIntentKey = useRef<string | null>(null)"
    )
    expect(panel).toMatch(
      /submitIntentKey\.current \?\? requestKey\("service-proof-submit"\)[\s\S]*?submitIntentKey\.current = idempotencyKey[\s\S]*?uploadWithProgress\([\s\S]*?idempotencyKey/
    )
    expect(panel).toMatch(
      /setMessage\(text\.submitted\)[\s\S]*?submitIntentKey\.current = null/
    )
    expect(panel.match(/invalidateSubmitIntent\(\)/g)).toHaveLength(5)
    expect(panel).toContain("const reviewIntentKeys = useRef(")
    expect(panel).toMatch(
      /expectedVersion: proof\.reviewVersion,[\s\S]*?decision,[\s\S]*?reason: reviewReasons\[proof\.id\]/
    )
    expect(panel).toContain(
      "const idempotencyKey = stableReviewKey(proof, decision)"
    )
    expect(panel).toContain('"Idempotency-Key": idempotencyKey')
    expect(
      panel.match(/reviewIntentKeys\.current\.delete\(proof\.id\)/g)
    ).toHaveLength(2)
    expect(panel).toContain("}, [role, ticketId, workforceTaskId])")

    expect(databaseContract).toContain("SELECT plan(9);")
    expect(databaseContract).toContain(
      "staff A is denied the coworker task on the same ticket"
    )
    expect(databaseContract).toContain(
      "task A proof cannot release task B into manager review"
    )
    expect(databaseContract).toContain(
      "pending task proofs cannot resolve the ticket"
    )
    expect(databaseContract).toContain(
      "one accepted qualifying proof per active task permits resolution"
    )
    expect(databaseContract).toContain(
      "service_evidence_object_direct_access_guard"
    )
    expect(databaseContract).toContain(
      "service_evidence_private_broadcast_insert_guard"
    )
  })
})

test.describe("Functional tests - service-order photo, video and note proof", () => {
  test("assigned QA staff submits one immutable note and manager reviews it exactly once", async ({
    page,
  }) => {
    await setAccessRole(page, "staff")
    const task = (await queueTasks(page))[0]
    await setAccessRole(page, "manager")
    const otherTask = (await queueTasks(page)).find(
      (candidate) => candidate.ticketId !== task.ticketId
    )
    expect(otherTask).toBeTruthy()
    await setAccessRole(page, "staff")
    const unrelatedStaffTaskResponse = await page.request.get(
      `/api/site-management/service-proofs?ticketId=${encodeURIComponent(otherTask!.ticketId)}&workforceTaskId=${encodeURIComponent(otherTask!.id)}`
    )
    expect(unrelatedStaffTaskResponse.status()).toBe(404)

    await setAccessRole(page, "staff")
    const key = `service-proof:e2e:note:${Date.now()}`
    const note =
      "Water valve inspected, seal replaced and the area was left dry."
    const create = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": key },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note,
        },
      }
    )
    expect(create.status(), await create.text()).toBe(201)
    const created = await create.json()
    expect(created.replayed).toBe(false)
    expect(created.proof).toMatchObject({
      ticketId: task.ticketId,
      workforceTaskId: task.id,
      mediaType: "note",
      uploadStatus: "not_required",
      scanStatus: "not_applicable",
      reviewStatus: "pending",
      reviewVersion: 1,
      canOpenFile: false,
    })

    const replay = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": key },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note,
        },
      }
    )
    expect(replay.status()).toBe(200)
    expect((await replay.json()).replayed).toBe(true)

    const crossTicket = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": `service-proof:e2e:cross:${Date.now()}` },
        multipart: {
          ticketId: otherTask!.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note: "This proof must not cross the task and ticket boundary.",
        },
      }
    )
    expect(crossTicket.status()).toBe(404)

    await setAccessRole(page, "manager")
    const list = await page.request.get(
      `/api/site-management/service-proofs?ticketId=${encodeURIComponent(task.ticketId)}&workforceTaskId=${encodeURIComponent(task.id)}`
    )
    expect(list.status()).toBe(200)
    const feed = await list.json()
    const proof = feed.evidence.find(
      (item: { id: string }) => item.id === created.proof.id
    )
    expect(proof.note).toBe(note)
    expect(proof.events).toHaveLength(1)

    const reviewKey = `service-proof:e2e:review:${Date.now()}`
    const review = await page.request.patch(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": reviewKey },
        data: {
          evidenceId: proof.id,
          expectedVersion: proof.reviewVersion,
          decision: "accepted",
          reason:
            "Field note clearly records the repair and safe final condition.",
        },
      }
    )
    expect(review.status(), await review.text()).toBe(200)
    expect((await review.json()).proof).toMatchObject({
      reviewStatus: "accepted",
      reviewVersion: 2,
    })

    const reviewReplay = await page.request.patch(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": reviewKey },
        data: {
          evidenceId: proof.id,
          expectedVersion: proof.reviewVersion,
          decision: "accepted",
          reason:
            "Field note clearly records the repair and safe final condition.",
        },
      }
    )
    expect(reviewReplay.status()).toBe(200)
    expect((await reviewReplay.json()).proof.reviewVersion).toBe(2)
  })

  test("resident feed exposes accepted business truth without internal provenance", async ({
    page,
  }) => {
    await setAccessRole(page, "owner")
    const ownerTasks = await queueTasks(page)
    const task = ownerTasks[0]
    const ownerTicketIds = new Set(ownerTasks.map((item) => item.ticketId))
    await setAccessRole(page, "manager")
    const outsideOwnerTask = (await queueTasks(page)).find(
      (item) => !ownerTicketIds.has(item.ticketId)
    )
    expect(outsideOwnerTask).toBeTruthy()
    const note =
      "Manager recorded the contractor handoff and verified the repaired seal."
    const overrideReason =
      "INTERNAL-OVERRIDE: contractor account was unavailable during the visit."
    const reviewReason =
      "INTERNAL-REVIEW: supervisor checked the completed work against the task."

    const create = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: {
          "Idempotency-Key": `service-proof:e2e:resident-projection:${Date.now()}`,
        },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note,
          overrideReason,
        },
      }
    )
    expect(create.status(), await create.text()).toBe(201)
    const createdProof = (await create.json()).proof

    const review = await page.request.patch(
      "/api/site-management/service-proofs",
      {
        headers: {
          "Idempotency-Key": `service-proof:e2e:resident-review:${Date.now()}`,
        },
        data: {
          evidenceId: createdProof.id,
          expectedVersion: createdProof.reviewVersion,
          decision: "accepted",
          reason: reviewReason,
        },
      }
    )
    expect(review.status(), await review.text()).toBe(200)

    await setAccessRole(page, "owner")
    const response = await page.request.get(
      `/api/site-management/service-proofs?ticketId=${encodeURIComponent(task.ticketId)}&workforceTaskId=${encodeURIComponent(task.id)}`
    )
    expect(response.status(), await response.text()).toBe(200)
    const residentFeed = await response.json()
    const residentProof = residentFeed.evidence.find(
      (candidate: { id: string }) => candidate.id === createdProof.id
    )
    expect(residentProof).toMatchObject({
      note,
      reviewStatus: "accepted",
      canOpenFile: false,
      serviceOrderId: null,
      originalFilename: null,
      submittedByRole: null,
      reviewedAt: null,
      reviewReason: null,
      overrideReason: null,
      events: [],
    })
    const serialized = JSON.stringify(residentFeed)
    expect(serialized).not.toContain(overrideReason)
    expect(serialized).not.toContain(reviewReason)
    expect(serialized).not.toContain('"actorRole":"manager"')

    const outsideScope = await page.request.get(
      `/api/site-management/service-proofs?ticketId=${encodeURIComponent(outsideOwnerTask!.ticketId)}&workforceTaskId=${encodeURIComponent(outsideOwnerTask!.id)}`
    )
    expect(outsideScope.status()).toBe(404)

    await openDashboardAs(page, "owner", "/en/dashboard/tickets")
    const residentPanel = page.getByTestId(`service-proof-panel-${task.id}`)
    await expect(residentPanel).toBeVisible()
    await residentPanel.locator("summary").click()
    await expect(
      residentPanel
        .getByText(
          "View management-approved proof for work completed on your request.",
          { exact: true }
        )
        .last()
    ).toBeVisible()
    await expect(residentPanel.getByText(note).first()).toBeVisible()
    await expect(residentPanel.locator("form")).toHaveCount(0)
  })

  test("roles and provider truth prevent unsafe binary acceptance", async ({
    page,
  }) => {
    await setAccessRole(page, "staff")
    const task = (await queueTasks(page))[0]
    await setAccessRole(page, "manager")

    const crossSite = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: {
          Origin: "https://attacker.invalid",
          "Idempotency-Key": `service-proof:e2e:cross-site:${Date.now()}`,
        },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note: "A cross-site mutation must be rejected before repository execution.",
          overrideReason:
            "This otherwise valid override must never pass the origin gate.",
        },
      }
    )
    expect(crossSite.status()).toBe(403)
    expect((await crossSite.json()).error).toBe("Cross-site request rejected.")

    const missingOverride = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: {
          "Idempotency-Key": `service-proof:e2e:override:${Date.now()}`,
        },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note: "Management note without the mandatory override explanation.",
        },
      }
    )
    expect(missingOverride.status()).toBe(400)

    await setAccessRole(page, "owner")
    const forbidden = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": `service-proof:e2e:owner:${Date.now()}` },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note: "An owner must not impersonate assigned field staff.",
        },
      }
    )
    expect(forbidden.status()).toBe(403)

    await setAccessRole(page, "staff")
    const photoKey = `service-proof:e2e:photo:${Date.now()}`
    const photo = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: { "Idempotency-Key": photoKey },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "photo",
          note: "Photo selected after checking the repaired valve and dry floor.",
          file: {
            name: "repair-proof.png",
            mimeType: "image/png",
            buffer: Buffer.from("validated-demo-metadata-only"),
          },
        },
      }
    )
    expect(photo.status(), await photo.text()).toBe(201)
    const photoProof = (await photo.json()).proof
    expect(photoProof).toMatchObject({
      uploadStatus: "provider_not_connected",
      scanStatus: "not_connected",
      reviewStatus: "pending",
      canOpenFile: false,
    })

    await setAccessRole(page, "manager")
    const unsafeAccept = await page.request.patch(
      "/api/site-management/service-proofs",
      {
        headers: {
          "Idempotency-Key": `service-proof:e2e:unsafe-review:${Date.now()}`,
        },
        data: {
          evidenceId: photoProof.id,
          expectedVersion: photoProof.reviewVersion,
          decision: "accepted",
          reason:
            "This decision must remain blocked until private scan evidence exists.",
        },
      }
    )
    expect(unsafeAccept.status()).toBe(400)
  })

  test("staff completes the accessible note flow in desktop and mobile projects", async ({
    page,
  }, testInfo) => {
    expect(["chromium", "mobile-chrome"]).toContain(testInfo.project.name)
    await openDashboardAs(page, "staff", "/en/dashboard/tickets")
    const firstPanel = page
      .locator('details[data-testid^="service-proof-panel-"]')
      .first()
    await expect(firstPanel).toBeVisible()
    const panelTestId = await firstPanel.getAttribute("data-testid")
    expect(panelTestId).toBeTruthy()
    const panel = page.getByTestId(panelTestId!)
    await panel.locator("summary").click()
    await expect(panel.getByText("New proof")).toBeVisible()
    await panel
      .getByLabel("Work performed and result")
      .fill(
        "Filter cleaned, drainage checked and cooling performance confirmed."
      )
    await panel.getByRole("button", { name: "Send for review" }).click()
    await expect(panel.getByText("Proof was sent for review.")).toBeVisible({
      timeout: 15_000,
    })
    await expect(panel.getByText("Awaiting review").first()).toBeVisible()
  })

  test("committed submit and review responses replay with stable UI idempotency keys", async ({
    page,
  }, testInfo) => {
    const endpoint = "**/api/site-management/service-proofs"
    await setAccessRole(page, "staff")
    const task = (await queueTasks(page))[0]
    const note = `Lost-response replay proof ${testInfo.project.name} ${Date.now()}.`
    const submitKeys: string[] = []
    const submitReplay: boolean[] = []

    await page.route(endpoint, async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue()
        return
      }
      submitKeys.push(route.request().headers()["idempotency-key"] ?? "")
      if (submitKeys.length === 3) {
        // This attempt never reaches the server. Editing the form afterwards
        // is an intentional new command and must rotate the key.
        await route.abort("failed")
        return
      }
      const response = await route.fetch()
      const payload = (await response.json()) as { replayed?: boolean }
      submitReplay.push(payload.replayed === true)
      if (submitKeys.length === 1) {
        expect(response.status()).toBe(201)
        await route.abort("failed")
        return
      }
      await route.fulfill({ response, json: payload })
    })

    await openDashboardAs(page, "staff", "/en/dashboard/tickets")
    const staffPanel = page.getByTestId(`service-proof-panel-${task.id}`)
    await expect(staffPanel).toBeVisible()
    await staffPanel.locator("summary").click()
    await staffPanel.getByLabel("Work performed and result").fill(note)
    await staffPanel.getByRole("button", { name: "Send for review" }).click()
    await expect(
      staffPanel.getByText(
        "Proof could not be sent. Check the details and try again."
      )
    ).toBeVisible()

    // The upstream command committed, but the browser never received it. The
    // unchanged form retries the exact same key and receives the stored result.
    await staffPanel.getByRole("button", { name: "Send for review" }).click()
    await expect(
      staffPanel.getByText("Proof was sent for review.")
    ).toBeVisible()
    expect(submitKeys).toHaveLength(2)
    expect(submitKeys[0]).toBeTruthy()
    expect(submitKeys[1]).toBe(submitKeys[0])
    expect(submitReplay).toEqual([false, true])

    const abandonedNote = `Uncommitted draft ${testInfo.project.name}.`
    const changedNote = `Changed intent ${testInfo.project.name} ${Date.now()}.`
    await staffPanel.getByLabel("Work performed and result").fill(abandonedNote)
    await staffPanel.getByRole("button", { name: "Send for review" }).click()
    await expect(
      staffPanel.getByText(
        "Proof could not be sent. Check the details and try again."
      )
    ).toBeVisible()
    await staffPanel.getByLabel("Work performed and result").fill(changedNote)
    await staffPanel.getByRole("button", { name: "Send for review" }).click()
    await expect(
      staffPanel.getByText("Proof was sent for review.")
    ).toBeVisible()
    expect(submitKeys).toHaveLength(4)
    expect(submitKeys[2]).not.toBe(submitKeys[1])
    expect(submitKeys[3]).not.toBe(submitKeys[2])
    expect(submitReplay).toEqual([false, true, false])
    await page.unroute(endpoint)

    const reviewKeys: string[] = []
    const reviewVersions: number[] = []
    await page.route(endpoint, async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.continue()
        return
      }
      reviewKeys.push(route.request().headers()["idempotency-key"] ?? "")
      if (reviewKeys.length === 3) {
        await route.abort("failed")
        return
      }
      const response = await route.fetch()
      const payload = (await response.json()) as {
        proof?: { reviewVersion?: number }
      }
      reviewVersions.push(payload.proof?.reviewVersion ?? 0)
      if (reviewKeys.length === 1) {
        expect(response.status()).toBe(200)
        await route.abort("failed")
        return
      }
      await route.fulfill({ response, json: payload })
    })

    await openDashboardAs(page, "manager", "/en/dashboard/tickets")
    const workforceTable = page.locator("#workforce-table")
    await workforceTable.getByRole("textbox", { name: "Search" }).fill(task.id)
    await workforceTable
      .locator(`[data-testid="workforce-proof-open-${task.id}"]:visible`)
      .click()
    const managerPanel = page.getByTestId(`service-proof-panel-${task.id}`)
    await expect(managerPanel).toBeVisible()
    await managerPanel.locator("summary").click()
    const proofCard = managerPanel.locator("article").filter({ hasText: note })
    await expect(proofCard).toHaveCount(1)
    await proofCard
      .getByLabel("Decision explanation")
      .fill("Supervisor verified the completed work and its safe final state.")
    await proofCard.getByRole("button", { name: "Accept" }).click()
    await expect(
      proofCard.getByText(
        "The decision could not be saved. Refresh and try again."
      )
    ).toBeVisible()

    await proofCard.getByRole("button", { name: "Accept" }).click()
    await expect(proofCard.getByText("Accepted", { exact: true })).toBeVisible()
    expect(reviewKeys).toHaveLength(2)
    expect(reviewKeys[0]).toBeTruthy()
    expect(reviewKeys[1]).toBe(reviewKeys[0])
    expect(reviewVersions).toEqual([2, 2])

    const changedProofCard = managerPanel
      .locator("article")
      .filter({ hasText: changedNote })
    await expect(changedProofCard).toHaveCount(1)
    await changedProofCard
      .getByLabel("Decision explanation")
      .fill("Initial decision intent before a recoverable network failure.")
    await changedProofCard.getByRole("button", { name: "Accept" }).click()
    await expect(
      changedProofCard.getByText(
        "The decision could not be saved. Refresh and try again."
      )
    ).toBeVisible()
    await changedProofCard
      .getByLabel("Decision explanation")
      .fill("Updated decision intent requests a documented field correction.")
    await changedProofCard
      .getByRole("button", { name: "Request correction" })
      .click()
    await expect(
      changedProofCard.getByText("Correction needed", { exact: true })
    ).toBeVisible()
    expect(reviewKeys).toHaveLength(4)
    expect(reviewKeys[2]).not.toBe(reviewKeys[1])
    expect(reviewKeys[3]).not.toBe(reviewKeys[2])
    expect(reviewVersions).toEqual([2, 2, 2])
    await page.unroute(endpoint)
  })

  test("private live connection fails visibly to automatic polling when Realtime is unavailable", async ({
    page,
  }, testInfo) => {
    await setAccessRole(page, "staff")
    const task = (await queueTasks(page))[0]
    const seedNote = `Polling recovery baseline for ${testInfo.project.name}.`
    const seedResponse = await page.request.post(
      "/api/site-management/service-proofs",
      {
        headers: {
          "Idempotency-Key": `service-proof:e2e:polling:${testInfo.project.name}`,
        },
        multipart: {
          ticketId: task.ticketId,
          workforceTaskId: task.id,
          mediaType: "note",
          note: seedNote,
        },
      }
    )
    const seedText = await seedResponse.text()
    expect([200, 201], seedText).toContain(seedResponse.status())
    const seedPayload = JSON.parse(seedText) as { proof: { id: string } }
    const targetProofId = seedPayload.proof.id

    let proofReads = 0
    const pollingMarker = "30-second recovery refresh confirmed"
    test.setTimeout(70_000)
    await page.route(
      "**/api/site-management/service-proofs?**",
      async (route) => {
        if (route.request().method() !== "GET") {
          await route.continue()
          return
        }
        const response = await route.fetch()
        const body = (await response.json()) as ServiceProofFeed
        const requestUrl = new URL(route.request().url())
        const isTargetTask =
          requestUrl.searchParams.get("ticketId") === task.ticketId &&
          requestUrl.searchParams.get("workforceTaskId") === task.id
        if (isTargetTask) {
          proofReads += 1
          if (proofReads > 1) {
            body.evidence = body.evidence.map((proof) =>
              proof.id === targetProofId
                ? { ...proof, note: pollingMarker }
                : proof
            )
          }
        }
        await route.fulfill({
          response,
          json: { ...body, source: "supabase" },
        })
      }
    )

    await openDashboardAs(page, "staff", "/en/dashboard/tickets")
    const targetPanel = page.getByTestId(`service-proof-panel-${task.id}`)
    await expect(targetPanel).toBeVisible()
    await targetPanel.locator("summary").click()
    const targetProof = targetPanel.getByTestId(
      `service-proof-${targetProofId}`
    )
    await expect(
      targetProof.getByText(seedNote, { exact: true }).first()
    ).toBeVisible()

    const status = targetPanel.getByTestId("service-proof-realtime-status")
    await expect(status).toHaveAttribute("data-state", "fallback", {
      timeout: 15_000,
    })
    await expect(status).toContainText(
      "the list refreshes automatically every 30 seconds"
    )
    await expect(
      targetPanel.getByRole("button", { name: "Refresh" })
    ).toBeVisible()
    expect(proofReads).toBeGreaterThan(0)
    await expect.poll(() => proofReads, { timeout: 40_000 }).toBeGreaterThan(1)
    await expect(targetProof.getByText(pollingMarker)).toBeVisible()
  })

  for (const locale of [
    { code: "tr", title: "İş kanıtı" },
    { code: "en", title: "Work proof" },
    { code: "de", title: "Leistungsnachweis" },
    { code: "ru", title: "Подтверждение работ" },
  ]) {
    test(`task proof control is localized in ${locale.code}`, async ({
      page,
    }) => {
      await openDashboardAs(page, "staff", `/${locale.code}/dashboard/tickets`)
      await expect(
        page
          .locator('details[data-testid^="service-proof-panel-"]')
          .first()
          .getByText(locale.title)
      ).toBeVisible()
    })
  }
})
