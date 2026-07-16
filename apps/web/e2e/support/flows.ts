import { expect, type Page } from "@playwright/test"

export function dashboardSidebar(page: Page) {
  return page.locator("#dashboard-mobile-sidebar")
}

export async function setAccessRole(page: Page, role: string) {
  const response = await page.request.post("/api/access-profile", { data: { role } })
  expect(response.status(), `access profile for ${role}`).toBe(200)
}

// Clears accumulated local-QA state so serial-suite tests stay isolated and fast.
// 404 only if access profiles are disabled (i.e. not the QA build), which is fine.
export async function resetQaState(page: Page) {
  const response = await page.request.post("/api/site-management/qa-reset")
  expect([200, 404]).toContain(response.status())
}

export async function openDashboardAs(page: Page, role: string, path = "/tr/dashboard") {
  await setAccessRole(page, role)
  await page.goto(path)
  await expect(page.locator("main")).toBeVisible()
}

export async function expectNoBlockingConsoleErrors(page: Page, errors: string[]) {
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  page.on("pageerror", (error) => errors.push(error.message))
}
