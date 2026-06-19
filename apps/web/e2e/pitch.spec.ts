import { test, expect } from "@playwright/test"
import { screenshot, collectConsoleIssues, scrollToSection } from "./helpers"

const PITCH_URL = "https://cati-pitch.vercel.app"

test.describe("Pitch deck", () => {
  const issues: string[] = []

  test.beforeEach(({ page }) => {
    collectConsoleIssues(page, issues)
  })

  test("pitch renders all key sections", async ({ page }, testInfo) => {
    await page.goto(PITCH_URL)
    await expect(page.getByRole("heading", { name: /property operating system/ })).toBeVisible()
    await screenshot(page, testInfo, "01-pitch-hero")

    await scrollToSection(page, "section:has-text('Why property management in Turkey is hard')")
    await expect(page.getByText("EİDS authorization is hard to track")).toBeVisible()
    await screenshot(page, testInfo, "02-pitch-problems")

    await scrollToSection(page, "section:has-text('one platform for the entire operation')")
    await expect(page.getByText("EİDS authorization tracking with expiry alerts", { exact: true })).toBeVisible()
    await screenshot(page, testInfo, "03-pitch-solution")

    await scrollToSection(page, "section:has-text('Compliance and trust features')")
    await expect(page.getByText("MVP", { exact: true }).first()).toBeVisible()
    await expect(page.getByText("Roadmap", { exact: true }).first()).toBeVisible()
    await screenshot(page, testInfo, "04-pitch-compliance")

    await scrollToSection(page, "section:has-text('What 1Çatı can and cannot do right now')")
    await expect(page.getByText("Included in MVP")).toBeVisible()
    await expect(page.getByText("On the Roadmap")).toBeVisible()
    await screenshot(page, testInfo, "05-pitch-scope")

    await scrollToSection(page, "section:has-text('10-month implementation plan')")
    await expect(page.getByText("$90,000 over 10 months")).toBeVisible()
    await screenshot(page, testInfo, "06-pitch-roadmap", { fullPage: true })

    expect(issues).toEqual([])
  })
})
