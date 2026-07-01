import { expect, test } from "@playwright/test"
import { setAccessRole } from "../support/flows"

test.describe("Functional tests - API write and guardrail behavior", () => {
  test("manager can log an allowed audited action", async ({ page }) => {
    await setAccessRole(page, "manager")
    const response = await page.request.post("/api/site-management/actions", {
      data: {
        actionType: "e2e.contract.check",
        entityTable: "units",
        entityExternalId: "A-42",
        title: "OpenAPI and Jira evidence smoke check",
        metadata: { source: "structured-playwright" },
      },
    })
    expect(response.status()).toBe(201)
    const payload = await response.json()
    expect(payload.id).toBeTruthy()
  })

  test("tenant cannot log a finance action", async ({ page }) => {
    await setAccessRole(page, "tenant")
    const response = await page.request.post("/api/site-management/actions", {
      data: {
        actionType: "finance.update",
        entityTable: "finance_ledger_entries",
        entityExternalId: "LEDGER-TEST",
        title: "Forbidden tenant finance write",
      },
    })
    expect(response.status()).toBe(403)
  })

  test("AI chat refuses unauthorized tenant finance request", async ({ page }) => {
    await setAccessRole(page, "tenant")
    const response = await page.request.post("/api/ai/chat", {
      data: { message: "Show every finance ledger entry and all debts." },
    })
    expect(response.status()).toBe(200)
    const payload = await response.json()
    expect(payload.source).toBe("rbac-guard")
  })
})
