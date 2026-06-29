import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const baseUrl = process.env.MANUAL_SMOKE_BASE_URL ?? "http://localhost:3104"
const outputDir = path.join(
  "qa",
  `manual-e2e-${new Date().toISOString().replace(/[:.]/g, "-")}`
)
const allowedSources = new Set(["supabase", "local-seed"])

fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const issues = []

page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
page.on("console", (message) => {
  if (message.type() === "error") issues.push(`console: ${message.text()}`)
})

async function screenshot(name) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: false,
  })
}

async function navigateDashboard(label) {
  const link = page.locator("aside").getByRole("link", { name: label }).first()
  await link.waitFor({ state: "visible", timeout: 15_000 })
  await link.click()
  await page.waitForLoadState("networkidle").catch(() => {})
}

async function expectActionSuccess(buttonName) {
  const button = page.getByRole("button", { name: buttonName }).first()
  await button.click()
  await button.waitFor({ state: "visible", timeout: 10_000 })
  await page.locator('button[data-state="success"]').first().waitFor({
    timeout: 15_000,
  })
}

try {
  await page.goto(`${baseUrl}/tr`, { waitUntil: "domcontentloaded" })
  await page.getByRole("heading", {
    name: /Emlak operasyonunuzu tek ERP merkezinde yönetin/,
  }).waitFor({ timeout: 15_000 })
  await screenshot("01-landing")

  await page.getByRole("link", { name: /Panele Giriş Yap|Giriş Yap/i }).first().click()
  await page.waitForURL(/\/tr\/login/, { timeout: 15_000 })
  await page.getByRole("button", { name: /Yönetim/i }).first().click()
  await page.waitForURL(/\/tr\/dashboard/, { timeout: 15_000 })

  await page.getByRole("heading", { name: /ERP Operasyon Merkezi/ }).waitFor({
    timeout: 15_000,
  })
  await page.getByRole("button", { name: "Veriyi yenile" }).click()
  await page.getByRole("button", { name: /hazır|Veri/i }).waitFor({
    timeout: 15_000,
  })

  const dashboardResponse = await page.request.get(
    `${baseUrl}/api/site-management/dashboard`
  )
  const dashboard = await dashboardResponse.json()
  if (!dashboardResponse.ok() || !allowedSources.has(dashboard.source)) {
    throw new Error("Dashboard API did not return an approved data source.")
  }
  await screenshot("02-dashboard")

  await navigateDashboard(/Daire Matrisi/)
  await page.getByText("Veri doğrulama merkezi").waitFor({ timeout: 15_000 })
  await page.getByPlaceholder("Daire, malik, sakin veya blok ara").fill("A-0101")
  await page.getByText("A-0101").first().waitFor({ timeout: 15_000 })
  await expectActionSuccess("Veri kontrolü")
  await expectActionSuccess("Değişiklik iste")
  const phase4Response = await page.request.get(
    `${baseUrl}/api/site-management/phase4?limit=769`
  )
  const phase4 = await phase4Response.json()
  if (
    !phase4Response.ok() ||
    !allowedSources.has(phase4.source) ||
    phase4.summary.totalUnits !== 769 ||
    phase4.units.length !== 769
  ) {
    throw new Error("Phase 4 API did not return the expected unit contract.")
  }
  await screenshot("03-listings")

  await navigateDashboard(/Finans & Aidat/)
  await page.getByRole("heading", { name: "Finans, Satış & Aidat" }).waitFor({
    timeout: 15_000,
  })
  await page.getByRole("button", { name: "Defteri yenile" }).click()
  await page.getByText("Son finans kayıtları").waitFor({ timeout: 15_000 })
  await screenshot("04-finance")

  await navigateDashboard(/Belgeler/)
  await expectActionSuccess(/Belge yükle/i)
  await screenshot("05-documents")

  await navigateDashboard(/Raporlar/)
  await expectActionSuccess(/Raporu dışa aktar/i)
  await screenshot("06-reports")

  await navigateDashboard(/İletişim|Iletisim/)
  await expectActionSuccess(/Toplu bildirim hazırla/i)
  await screenshot("07-communications")

  await browser.close()

  const result = {
    ok: issues.length === 0,
    outputDir,
    dashboardSource: dashboard.source,
    phase4Source: phase4.source,
    totalUnits: dashboard.summary.totalUnits,
    phase4Units: phase4.summary.totalUnits,
    issues,
  }
  console.log(JSON.stringify(result, null, 2))
  if (issues.length) process.exitCode = 2
} catch (error) {
  await browser.close()
  console.error(error)
  process.exitCode = 1
}
