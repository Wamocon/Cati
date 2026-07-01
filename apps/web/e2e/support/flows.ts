import { expect, type Page } from "@playwright/test"

export function dashboardSidebar(page: Page) {
  return page.locator("#dashboard-mobile-sidebar")
}

export async function setAccessRole(page: Page, role: string) {
  const response = await page.request.post("/api/access-profile", { data: { role } })
  expect(response.status(), `access profile for ${role}`).toBe(200)
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
