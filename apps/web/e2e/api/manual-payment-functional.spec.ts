import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test, type Page } from "@playwright/test"

async function setRole(page: Page, role: string) {
  if (page.url() === "about:blank") await page.goto("/tr/login")
  await page.context().addCookies([
    {
      name: "access_profile_role",
      value: role,
      url: new URL(page.url()).origin,
    },
  ])
}

function uniqueReference(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

test.describe("manual received-payment API", () => {
  test("SQL contract keeps owner projection safe and posting append-only", async () => {
    const ownerMigration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000024_owner_finance_visibility.sql"
      ),
      "utf8"
    )
    const postingMigration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000026_manual_payment_posting.sql"
      ),
      "utf8"
    )

    expect(ownerMigration).toContain("public.owner_finance_workspace")
    expect(ownerMigration).toContain("ARRAY['owner']::TEXT[]")
    expect(ownerMigration).toContain("raw ledger metadata")
    expect(ownerMigration).toContain("WITH authorized_entries AS MATERIALIZED")
    expect(ownerMigration.match(/l\.created_at <= v_snapshot_at/g)?.length ?? 0)
      .toBeGreaterThanOrEqual(3)
    expect(ownerMigration).toContain("'aggregates', v_aggregates")
    expect(ownerMigration).toContain("'pagination', jsonb_build_object")
    expect(ownerMigration).not.toContain("OFFSET v_offset")
    expect(ownerMigration).toContain("p_snapshot_at TIMESTAMPTZ DEFAULT NULL")
    expect(ownerMigration).toContain("(l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)")
    expect(ownerMigration).toContain("'nextCursor', v_next_cursor")
    expect(ownerMigration).toContain("'snapshotAt', v_snapshot_at")
    expect(postingMigration).toContain(
      "v_currency IS DISTINCT FROM v_company_currency"
    )
    expect(postingMigration).toContain("left('REV-' || v_payment.reference, 100)")
    expect(postingMigration).toContain("reversal_of")
    expect(postingMigration).toContain("prevent_finance_journal_mutation")
    expect(postingMigration).toContain(
      "REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions"
    )
    expect(postingMigration).toContain(
      "v_actor_role NOT IN ('admin', 'accountant')"
    )
    expect(postingMigration).not.toContain("md5(")
    expect(
      postingMigration.match(/extensions\.digest\(/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(2)
    expect(
      postingMigration.match(/'sha256'/g)?.length ?? 0
    ).toBeGreaterThanOrEqual(2)
  })

  test("manager is read-only and resident/field roles cannot open the workspace", async ({ page }) => {
    await setRole(page, "manager")
    const managerView = await page.request.get("/api/site-management/manual-payments?limit=5")
    expect(managerView.status()).toBe(200)
    expect((await managerView.json()).capabilities).toEqual({ canPost: false, canReverse: false, readOnly: true })

    const managerPost = await page.request.post("/api/site-management/manual-payments", {
      headers: { "idempotency-key": uniqueReference("manager-denied") }, data: {},
    })
    expect(managerPost.status()).toBe(403)
    expect((await managerPost.json()).code).toBe("MANUAL_PAYMENT_POST_FORBIDDEN")

    for (const role of ["owner", "tenant", "staff"]) {
      await setRole(page, role)
      const response = await page.request.get("/api/site-management/manual-payments")
      expect(response.status(), `${role} internal finance read`).toBe(403)
    }

    await setRole(page, "admin")
    const adminView = await page.request.get(
      "/api/site-management/manual-payments?limit=5"
    )
    expect(adminView.status()).toBe(200)
    expect((await adminView.json()).capabilities).toEqual({
      canPost: true,
      canReverse: true,
      readOnly: false,
    })

    const crossSiteMutation = await page.request.post(
      "/api/site-management/manual-payments",
      {
        headers: {
          "idempotency-key": uniqueReference("cross-site-denied"),
          origin: "https://attacker.invalid",
          "sec-fetch-site": "cross-site",
        },
        data: {},
      }
    )
    expect(crossSiteMutation.status()).toBe(403)
    expect((await crossSiteMutation.json()).code).toBe(
      "MANUAL_PAYMENT_ORIGIN_REJECTED"
    )
  })

  test("accountant posts exactly once, owner sees safe truth, and reversal is optimistic and append-only", async ({ page }) => {
    await setRole(page, "owner")
    const ownerBeforeResponse = await page.request.get("/api/site-management/owner-finance?limit=100")
    expect(ownerBeforeResponse.status()).toBe(200)
    const ownerBefore = await ownerBeforeResponse.json()
    const ownerUnit = ownerBefore.units[0]
    expect(ownerUnit, "owner QA profile needs a verified unit").toBeTruthy()

    await setRole(page, "accountant")
    const workspaceResponse = await page.request.get("/api/site-management/manual-payments?limit=100")
    expect(workspaceResponse.status()).toBe(200)
    const workspace = await workspaceResponse.json()
    const account = workspace.accounts.find((candidate: { unitId: string }) => candidate.unitId === ownerUnit.unitId)
    expect(account, "verified owner unit must resolve to an exact payment account").toBeTruthy()

    const reference = uniqueReference("OWNER-MANUAL")
    const idempotencyKey = uniqueReference("manual-payment-idempotency")
    const body = {
      unitId: account.unitId, ownerResidentId: account.ownerResidentId, amount: "1250.50",
      currency: account.currency, receivedAt: new Date(Date.now() - 60_000).toISOString(),
      reference, method: "bank_transfer",
      businessNote: "Receipt reviewed by accounting; awaiting independent bank reconciliation.",
    }
    const tamperedCurrency = await page.request.post(
      "/api/site-management/manual-payments",
      {
        headers: {
          "idempotency-key": uniqueReference("currency-mismatch"),
        },
        data: { ...body, currency: account.currency === "TRY" ? "USD" : "TRY" },
      }
    )
    expect(tamperedCurrency.status()).toBe(422)
    expect((await tamperedCurrency.json()).code).toBe(
      "MANUAL_PAYMENT_CURRENCY_MISMATCH"
    )

    const createdResponse = await page.request.post("/api/site-management/manual-payments", {
      headers: { "idempotency-key": idempotencyKey }, data: body,
    })
    expect(createdResponse.status()).toBe(201)
    const created = await createdResponse.json()
    expect(created).toMatchObject({ unitId: account.unitId, ownerResidentId: account.ownerResidentId, amountCents: 125050, reference, reconciliationStatus: "unreconciled", status: "posted", version: 1, replayed: false })

    const replayResponse = await page.request.post("/api/site-management/manual-payments", {
      headers: { "idempotency-key": idempotencyKey }, data: body,
    })
    expect(replayResponse.status()).toBe(200)
    expect(await replayResponse.json()).toMatchObject({ id: created.id, replayed: true })

    const conflictingReplay = await page.request.post("/api/site-management/manual-payments", {
      headers: { "idempotency-key": idempotencyKey }, data: { ...body, amount: "1251.00" },
    })
    expect(conflictingReplay.status()).toBe(409)
    expect((await conflictingReplay.json()).code).toBe("MANUAL_PAYMENT_IDEMPOTENCY_CONFLICT")

    await setRole(page, "owner")
    const ownerPostedResponse = await page.request.get("/api/site-management/owner-finance?limit=100")
    expect(ownerPostedResponse.status()).toBe(200)
    const ownerPosted = await ownerPostedResponse.json()
    const postedEntry = ownerPosted.units.flatMap((unit: { entries: unknown[] }) => unit.entries)
      .find((entry: { manualPaymentId?: string }) => entry.manualPaymentId === created.id)
    expect(postedEntry).toMatchObject({ activityKind: "manual_payment", reconciliationStatus: "unreconciled", manualPaymentId: created.id })
    expect(postedEntry).not.toHaveProperty("metadata")
    expect(postedEntry).not.toHaveProperty("provider")
    expect(postedEntry).not.toHaveProperty("rawPayload")
    expect(postedEntry).not.toHaveProperty("providerReference")
    expect(postedEntry).not.toHaveProperty("reference")
    expect(postedEntry).not.toHaveProperty("journalEntryId")

    await setRole(page, "accountant")
    const reversalKey = uniqueReference("manual-reversal-idempotency")
    const reversalBody = { paymentId: created.id, expectedVersion: 1, reason: "Duplicate source receipt identified during accountant review." }
    const reversalResponse = await page.request.patch("/api/site-management/manual-payments", {
      headers: { "idempotency-key": reversalKey }, data: reversalBody,
    })
    expect(reversalResponse.status()).toBe(200)
    expect(await reversalResponse.json()).toMatchObject({ id: created.id, status: "reversed", version: 2, replayed: false })

    const reversalReplay = await page.request.patch("/api/site-management/manual-payments", {
      headers: { "idempotency-key": reversalKey }, data: reversalBody,
    })
    expect(reversalReplay.status()).toBe(200)
    expect(await reversalReplay.json()).toMatchObject({ id: created.id, status: "reversed", version: 2, replayed: true })

    const staleReversal = await page.request.patch("/api/site-management/manual-payments", {
      headers: { "idempotency-key": uniqueReference("stale-manual-reversal") }, data: reversalBody,
    })
    expect(staleReversal.status()).toBe(409)
    expect((await staleReversal.json()).code).toBe("MANUAL_PAYMENT_VERSION_CONFLICT")

    await setRole(page, "owner")
    const ownerReversedResponse = await page.request.get("/api/site-management/owner-finance?limit=100")
    expect(ownerReversedResponse.status()).toBe(200)
    const ownerReversed = await ownerReversedResponse.json()
    const visibleEntries = ownerReversed.units.flatMap((unit: { entries: unknown[] }) => unit.entries)
    expect(visibleEntries.find((entry: { reversesManualPaymentId?: string }) => entry.reversesManualPaymentId === created.id))
      .toMatchObject({ activityKind: "manual_payment_reversal", reversesManualPaymentId: created.id })
  })
})
