import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"
import { setAccessRole } from "../support/flows"

test.describe("Functional tests - compliance cockpit API", () => {
  test("manager receives a truth-labelled, non-mutable demo contract", async ({ page }) => {
    await setAccessRole(page, "manager")

    const response = await page.request.get(
      "/api/site-management/compliance-cases?limit=250"
    )
    expect(response.status()).toBe(200)
    expect(response.headers()["cache-control"]).toContain("no-store")

    const payload = await response.json()
    expect(payload.source).toBe("local-demo-contract")
    expect(payload.mutationAvailable).toBe(false)
    expect(payload.providerBoundary).toEqual({
      accessExecution: "provider_ready_blocked",
      moneyExecution: "separate_finance_approval",
      legalGuarantee: "not_provided",
    })
    expect(payload.cases.length).toBeGreaterThan(0)
    expect(payload.cases.every((item: { externalExecutionAllowed: boolean }) =>
      item.externalExecutionAllowed === false
    )).toBe(true)
  })

  test("tenant is denied the organization compliance API", async ({ page }) => {
    await setAccessRole(page, "tenant")
    const response = await page.request.get(
      "/api/site-management/compliance-cases"
    )
    expect(response.status()).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "COMPLIANCE_FORBIDDEN",
    })
  })

  test("decision contract validates rationale before any mutation", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.patch(
      "/api/site-management/compliance-cases",
      {
        headers: {
          "Idempotency-Key": "compliance-api-contract-001",
          "If-Match": '"1"',
        },
        data: {
          caseId: "11111111-1111-4111-8111-111111111111",
          expectedVersion: 1,
          decision: "approve",
          rationale: "short",
        },
      }
    )

    expect(response.status()).toBe(422)
    await expect(response.json()).resolves.toMatchObject({
      code: "COMPLIANCE_RATIONALE_REQUIRED",
    })
  })

  test("demo access profile cannot impersonate audited decision authority", async ({ page }) => {
    await setAccessRole(page, "admin")
    const response = await page.request.patch(
      "/api/site-management/compliance-cases",
      {
        headers: {
          "Idempotency-Key": "compliance-api-real-auth-001",
          "If-Match": '"1"',
        },
        data: {
          caseId: "11111111-1111-4111-8111-111111111111",
          expectedVersion: 1,
          decision: "approve",
          rationale: "Evidence was reviewed by the organization administrator.",
        },
      }
    )

    expect(response.status()).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      code: "COMPLIANCE_REAL_AUTH_REQUIRED",
    })
  })

  test("decision replay is bound to the original actor, payload and expected version", () => {
    const migration = readFileSync(
      resolve(
        process.cwd(),
        "../../supabase/migrations/00000000000023_compliance_cockpit.sql"
      ),
      "utf8"
    )
    expect(migration).toContain(
      "v_existing.actor_profile_id IS DISTINCT FROM v_actor_id"
    )
    expect(migration).toContain(
      "v_existing.case_version IS DISTINCT FROM p_expected_version + 1"
    )
    expect(migration).toContain(
      "v_existing.rationale IS DISTINCT FROM BTRIM(p_rationale)"
    )
  })
})
