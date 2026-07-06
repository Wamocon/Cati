import { createRequire } from "node:module"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const webRequire = createRequire(path.join(rootDir, "apps", "web", "package.json"))
const { chromium } = webRequire("@playwright/test")

function parseArgs(argv) {
  const args = {
    baseUrl: "http://127.0.0.1:3104",
    outDir: path.join(rootDir, "quality", "results", "ux-auth-smoke"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    else if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
  }

  return args
}

const args = parseArgs(process.argv.slice(2))
fs.mkdirSync(args.outDir, { recursive: true })
const tempDir = path.join(rootDir, ".tmp", "playwright")
fs.mkdirSync(tempDir, { recursive: true })
process.env.TEMP = tempDir
process.env.TMP = tempDir

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []

page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`))
page.on("console", (message) => {
  if (message.type() === "error") errors.push(`console: ${message.text()}`)
})

await page.goto(new URL("/tr/login", args.baseUrl).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 30000,
})
await page.locator("h1, h2").first().waitFor({ timeout: 10000 })
await page.screenshot({ path: path.join(args.outDir, "tr-login.png"), fullPage: false })

const providerDisclosure = page.locator("details").filter({ hasText: /Google|Yandex ID|magic/i }).first()
await providerDisclosure.locator("summary").click()
await page.getByRole("button", { name: /Google/ }).click()
await page.waitForSelector("dialog[open]", { timeout: 5000 })
const dialogText = await page.locator("dialog[open]").innerText()
await page.screenshot({ path: path.join(args.outDir, "tr-provider-dialog.png"), fullPage: false })
await page.locator("dialog[open] footer button").click()

await page.locator("[data-testid=locale-switcher]").selectOption("de")
await page.waitForURL("**/de/login", { timeout: 10000 })
const deUrl = page.url()
const deHeading = await page.locator("h1, h2").first().innerText()
await page.screenshot({ path: path.join(args.outDir, "de-login.png"), fullPage: false })

await page.goto(new URL("/ru/signup", args.baseUrl).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 30000,
})
await page.locator("h1").first().waitFor({ timeout: 10000 })
const ruSignup = await page.locator("h1").first().innerText()
await page.screenshot({ path: path.join(args.outDir, "ru-signup.png"), fullPage: false })

await browser.close()

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      dialogHasProviderText: /Google|OAuth|Supabase/.test(dialogText),
      deUrl,
      deHeading,
      ruSignup,
      errors,
      screenshots: args.outDir,
    },
    null,
    2
  )
)

if (errors.length > 0) process.exit(1)
