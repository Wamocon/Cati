import type { Page, TestInfo } from "@playwright/test"
import fs from "fs"
import path from "path"

export async function screenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
  options?: { fullPage?: boolean }
) {
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

export function collectConsoleIssues(page: Page, issues: string[]) {
  page.on("console", (msg) => {
    const type = msg.type()
    const text = msg.text()
    if (type === "error") {
      // Ignore known Next.js dev warnings / hydration noise that are not app bugs
      if (
        text.includes("middleware-to-proxy") ||
        text.includes("React does not recognize") ||
        text.includes("Extra attributes from the server")
      ) {
        return
      }
      issues.push(`[error] ${text}`)
    }
    if (type === "warning" && text.toLowerCase().includes("failed")) {
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
