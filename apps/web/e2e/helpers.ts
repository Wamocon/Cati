import type { Page, TestInfo } from "@playwright/test"
import fs from "fs"
import path from "path"

export async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options?: { fullPage?: boolean }
) {
  if (options?.fullPage) {
    await revealFullPage(page)
  }

  const dir = path.join(process.cwd(), "qa")
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const fileName = `${testInfo.title.replace(/\s+/g, "_")}_${name}.png`
  const filePath = path.join(dir, fileName)
  await page.screenshot({
    path: filePath,
    fullPage: options?.fullPage ?? false,
  })
  await testInfo.attach(name, { path: filePath, contentType: "image/png" })
  return filePath
}

async function revealFullPage(page: Page) {
  const viewportHeight = page.viewportSize()?.height ?? 800
  const step = Math.max(320, Math.floor(viewportHeight * 0.75))
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight)

  for (let y = 0; y < pageHeight; y += step) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y)
    await page.waitForTimeout(50)
  }

  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(120)
}

export function collectConsoleIssues(page: Page, issues: string[]) {
  page.on("console", (msg) => {
    const type = msg.type()
    const text = msg.text()
    if (type === "error") {
      // Ignore known Next.js dev warnings / hydration noise that are not app bugs
      if (
        text.includes("middleware-to-proxy") ||
        text.includes("React does not recognize") ||
        text.includes("Extra attributes from the server") ||
        text.includes("A tree hydrated but some attributes") ||
        (text.includes("WebSocket connection") &&
          text.includes("closed before the connection is established")) ||
        // Expected in local-seed: features that require a real Supabase org session
        // (persistent reports, live booking-lifecycle, etc.) return an honest 503/404
        // "unavailable"/"not-configured" contract that the page renders gracefully; the
        // browser still logs the failed fetch, but it is not an app bug.
        (text.includes("Failed to load resource") &&
          (text.includes("503") || text.includes("404")))
      ) {
        return
      }
      issues.push(`[error] ${text}`)
    }
    if (
      type === "warning" &&
      text.toLowerCase().includes("failed") &&
      !(
        text.includes("WebSocket connection") &&
        text.includes("closed before the connection is established")
      )
    ) {
      issues.push(`[warning] ${text}`)
    }
  })
  page.on("pageerror", (err) => {
    issues.push(`[pageerror] ${err.message}`)
  })
}

export async function scrollToSection(page: Page, selector: string) {
  const el = page.locator(selector).first()
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
}
