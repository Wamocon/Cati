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
    outDir: path.join(rootDir, "quality", "results", "responsive-overlap-smoke"),
  }

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--base-url") args.baseUrl = argv[++i]
    else if (argv[i] === "--out-dir") args.outDir = path.resolve(argv[++i])
  }

  return args
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

const args = parseArgs(process.argv.slice(2))
fs.mkdirSync(args.outDir, { recursive: true })
const tempDir = path.join(rootDir, ".tmp", "playwright")
fs.mkdirSync(tempDir, { recursive: true })
process.env.TEMP = tempDir
process.env.TMP = tempDir

const browser = await chromium.launch({ headless: true })
const errors = []
const results = []

const specs = [
  { name: "mobile", viewport: { width: 390, height: 844 } },
  { name: "tablet", viewport: { width: 768, height: 1024 } },
  { name: "screenshot-width", viewport: { width: 1365, height: 900 } },
  { name: "wide-desktop", viewport: { width: 1536, height: 960 } },
]

for (const spec of specs) {
  const page = await browser.newPage({ viewport: spec.viewport })
  const pageErrors = []

  page.on("pageerror", (error) => pageErrors.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(`console: ${message.text()}`)
  })

  await page.goto(new URL("/tr", args.baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  })
  await page.locator("[data-testid=public-navbar]").waitFor({ timeout: 10000 })
  await page.waitForTimeout(1500)

  const headerLayout = await page.evaluate(() => {
    const html = document.documentElement
    const header = document.querySelector("[data-testid=public-navbar]")
    const row = header?.querySelector(".container")
    const children = Array.from(row?.children ?? [])
      .map((node, index) => {
        const element = node
        const style = window.getComputedStyle(element)
        const box = element.getBoundingClientRect()
        return {
          index,
          tag: element.tagName.toLowerCase(),
          display: style.display,
          visibility: style.visibility,
          opacity: Number.parseFloat(style.opacity),
          left: box.left,
          right: box.right,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        }
      })
      .filter(
        (box) =>
          box.display !== "none" &&
          box.visibility !== "hidden" &&
          box.opacity > 0.05 &&
          box.width > 1 &&
          box.height > 1
      )

    return {
      scrollOverflow: html.scrollWidth - html.clientWidth,
      children,
      menuVisible:
        window.getComputedStyle(document.querySelector("[data-testid=menu-toggle]")).display !==
        "none",
    }
  })

  const headerOverlaps = []
  for (let i = 0; i < headerLayout.children.length; i++) {
    for (let j = i + 1; j < headerLayout.children.length; j++) {
      if (intersects(headerLayout.children[i], headerLayout.children[j])) {
        headerOverlaps.push([headerLayout.children[i].index, headerLayout.children[j].index])
      }
    }
  }

  await page.screenshot({
    path: path.join(args.outDir, `${spec.name}-header.png`),
    fullPage: false,
  })

  await page.locator("[data-testid=new-level-section]").scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)

  const newLevelLayout = await page.evaluate(() => {
    const visibleCards = Array.from(document.querySelectorAll("[data-testid^=new-level-stage-card]"))
      .map((element) => {
        const style = window.getComputedStyle(element)
        const box = element.getBoundingClientRect()
        return {
          opacity: Number.parseFloat(style.opacity),
          visibility: style.visibility,
          display: style.display,
          top: box.top,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        }
      })
      .filter(
        (box) =>
          box.display !== "none" &&
          box.visibility !== "hidden" &&
          box.opacity > 0.05 &&
          box.width > 1 &&
          box.height > 1
      )

    const metricsBox = document
      .querySelector("[data-testid=new-level-metrics]")
      ?.getBoundingClientRect()

    return {
      visibleCardCount: visibleCards.length,
      cardsBottom: visibleCards.length
        ? Math.max(...visibleCards.map((box) => box.bottom))
        : null,
      metricsTop: metricsBox?.top ?? null,
    }
  })

  await page.screenshot({
    path: path.join(args.outDir, `${spec.name}-new-level.png`),
    fullPage: false,
  })

  const metricsOverlap =
    newLevelLayout.cardsBottom !== null &&
    newLevelLayout.metricsTop !== null &&
    newLevelLayout.metricsTop < newLevelLayout.cardsBottom - 2

  results.push({
    name: spec.name,
    viewport: spec.viewport,
    pageErrors,
    scrollOverflow: headerLayout.scrollOverflow,
    menuVisible: headerLayout.menuVisible,
    headerOverlaps,
    newLevelLayout,
    metricsOverlap,
  })

  await page.close()
}

const dashboardContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
await dashboardContext.addCookies([
  {
    name: "access_profile_role",
    value: "manager",
    url: args.baseUrl,
  },
])
const dashboardPage = await dashboardContext.newPage()
const dashboardPageErrors = []

dashboardPage.on("pageerror", (error) => dashboardPageErrors.push(`pageerror: ${error.message}`))
dashboardPage.on("console", (message) => {
  if (message.type() === "error") dashboardPageErrors.push(`console: ${message.text()}`)
})

await dashboardPage.goto(new URL("/tr/dashboard", args.baseUrl).toString(), {
  waitUntil: "domcontentloaded",
  timeout: 30000,
})
await dashboardPage.locator("[data-testid=dashboard-topbar]").waitFor({ timeout: 10000 })
await dashboardPage.waitForTimeout(1200)

const dashboardLayout = await dashboardPage.evaluate(() => {
  const html = document.documentElement
  const topbar = document.querySelector("[data-testid=dashboard-topbar]")
  const row = topbar?.firstElementChild
  const menu = document.querySelector("[data-testid=dashboard-menu-toggle]")
  const children = Array.from(row?.children ?? [])
    .map((node, index) => {
      const element = node
      const style = window.getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return {
        index,
        tag: element.tagName.toLowerCase(),
        display: style.display,
        visibility: style.visibility,
        opacity: Number.parseFloat(style.opacity),
        left: box.left,
        right: box.right,
        top: box.top,
        bottom: box.bottom,
        width: box.width,
        height: box.height,
      }
    })
    .filter(
      (box) =>
        box.display !== "none" &&
        box.visibility !== "hidden" &&
        box.opacity > 0.05 &&
        box.width > 1 &&
        box.height > 1
    )

  const menuBox = menu?.getBoundingClientRect()
  return {
    scrollOverflow: html.scrollWidth - html.clientWidth,
    children,
    menu:
      menuBox && menuBox.width > 1 && menuBox.height > 1
        ? {
            index: -1,
            tag: "dashboard-menu-toggle",
            left: menuBox.left,
            right: menuBox.right,
            top: menuBox.top,
            bottom: menuBox.bottom,
            width: menuBox.width,
            height: menuBox.height,
          }
        : null,
  }
})

const dashboardBoxes = dashboardLayout.menu
  ? [dashboardLayout.menu, ...dashboardLayout.children]
  : dashboardLayout.children
const dashboardOverlaps = []
for (let i = 0; i < dashboardBoxes.length; i++) {
  for (let j = i + 1; j < dashboardBoxes.length; j++) {
    if (intersects(dashboardBoxes[i], dashboardBoxes[j])) {
      dashboardOverlaps.push([dashboardBoxes[i].index, dashboardBoxes[j].index])
    }
  }
}

await dashboardPage.screenshot({
  path: path.join(args.outDir, "dashboard-mobile-topbar.png"),
  fullPage: false,
})

results.push({
  name: "dashboard-mobile",
  viewport: { width: 390, height: 844 },
  pageErrors: dashboardPageErrors,
  scrollOverflow: dashboardLayout.scrollOverflow,
  menuVisible: Boolean(dashboardLayout.menu),
  headerOverlaps: dashboardOverlaps,
  newLevelLayout: null,
  metricsOverlap: false,
})

await dashboardContext.close()
await browser.close()

for (const result of results) {
  if (result.pageErrors.length > 0) errors.push(`${result.name}: ${result.pageErrors.join("; ")}`)
  if (result.scrollOverflow > 2) errors.push(`${result.name}: horizontal overflow ${result.scrollOverflow}px`)
  if (result.headerOverlaps.length > 0) errors.push(`${result.name}: header overlaps ${JSON.stringify(result.headerOverlaps)}`)
  if (result.metricsOverlap) errors.push(`${result.name}: New Level metrics overlap stage cards`)
}

console.log(
  JSON.stringify(
    {
      ok: errors.length === 0,
      errors,
      results,
      screenshots: args.outDir,
    },
    null,
    2
  )
)

if (errors.length > 0) process.exit(1)
