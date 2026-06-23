import { test, expect } from "@playwright/test"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { screenshot, collectConsoleIssues, scrollToSection } from "./helpers"

const PITCH_URL = pathToFileURL(
  path.resolve(process.cwd(), "../pitch/index.html")
).toString()

test.describe("Pitch deck", () => {
  let issues: string[]

  test.beforeEach(({ page }) => {
    issues = []
    collectConsoleIssues(page, issues)
  })

  test("pitch renders all key sections", async ({ page }, testInfo) => {
    await page.goto(PITCH_URL)
    await expect(
      page.getByRole("heading", {
        name: /property management platform built for Ataberk Estate/,
      })
    ).toBeVisible()
    await screenshot(page, testInfo, "01-pitch-hero")

    await scrollToSection(
      page,
      "section:has-text('Why property management in Turkey is hard')"
    )
    await expect(
      page.getByText("EİDS authorization is hard to track")
    ).toBeVisible()
    await screenshot(page, testInfo, "02-pitch-problems")

    await scrollToSection(
      page,
      "section:has-text('one platform for the entire operation')"
    )
    await expect(
      page.getByText(
        "Manage listings end-to-end: status sync, EİDS tracking, owner agreements",
        { exact: true }
      )
    ).toBeVisible()
    await screenshot(page, testInfo, "03-pitch-solution")

    await scrollToSection(
      page,
      "section:has-text('Compliance and trust features')"
    )
    await expect(page.getByText("MVP", { exact: true }).first()).toBeVisible()
    await expect(
      page.locator("section:has-text('Compliance and trust features') .tag-roadmap").first()
    ).toBeVisible()
    await screenshot(page, testInfo, "04-pitch-compliance")

    await scrollToSection(
      page,
      "section:has-text('What 1Çatı can and cannot do right now')"
    )
    await expect(page.getByText("Included in MVP")).toBeVisible()
    await expect(page.getByText("On the Roadmap")).toBeVisible()
    await screenshot(page, testInfo, "05-pitch-scope")

    await scrollToSection(
      page,
      "section:has-text('10-month implementation plan')"
    )
    await expect(page.getByText("$90,000 over 10 months")).toBeVisible()
    await screenshot(page, testInfo, "06-pitch-roadmap", { fullPage: true })

    expect(issues).toEqual([])
  })

  test("app pitch route connects proposal to the working product", async ({
    page,
  }, testInfo) => {
    await page.goto("/tr/pitch")
    await expect(
      page.getByRole("heading", {
        name: "1Çatı pitch deck for Ataberk Estate",
      })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "Open live portal" })
    ).toBeVisible()
    await expect(
      page.getByRole("link", { name: "View static proposal" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", {
        name: "The pitch is not just software. It is operating leverage.",
      })
    ).toBeVisible()
    await scrollToSection(
      page,
      "section:has-text('Why this deserves approval')"
    )
    await scrollToSection(page, "section:has-text('Product architecture')")
    await expect(page.getByText("Included in the current MVP")).toBeVisible()
    await expect(page.getByText("Roadmap after approval")).toBeVisible()
    await scrollToSection(page, "section:has-text('Roadmap after approval')")
    await expect(
      page.getByRole("heading", {
        name: "Built to survive client scrutiny.",
      })
    ).toBeVisible()
    await scrollToSection(page, "section:has-text('Confidence gates')")
    await scrollToSection(page, "section:has-text('Decision ask')")
    await screenshot(page, testInfo, "07-app-pitch-route", { fullPage: true })

    expect(issues).toEqual([])
  })
})
