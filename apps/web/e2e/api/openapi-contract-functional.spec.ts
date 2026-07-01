import { expect, test } from "@playwright/test"
import { apiContracts } from "../support/test-catalog"
import { setAccessRole } from "../support/flows"

test.describe("Functional tests - API contract", () => {
  test("OpenAPI endpoint returns the current API specification", async ({ request }) => {
    const response = await request.get("/api/openapi")
    expect(response.status()).toBe(200)
    const spec = await response.json()
    expect(spec.openapi).toBe("3.2.0")
    expect(spec.info.title).toContain("1Cati")
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(20)
  })

  for (const contract of apiContracts) {
    test(`${contract.method} ${contract.path} returns ${contract.expectedStatus}`, async ({ page }) => {
      if (contract.role) await setAccessRole(page, contract.role)
      const response = await page.request.get(contract.path)
      expect(response.status()).toBe(contract.expectedStatus)
      const contentType = response.headers()["content-type"] ?? ""
      expect(contentType).toContain("application/json")
    })
  }
})
