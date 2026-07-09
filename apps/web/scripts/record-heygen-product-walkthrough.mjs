import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3104"
const outputDir =
  process.env.DEMO_OUTPUT_DIR ?? "../../qa_output/heygen-platform-intro/final"
const videoName = "1cati-product-walkthrough-tr-1080p.webm"
const videoPath = path.join(outputDir, videoName)
const reviewDir = path.join(outputDir, "review")
const rawDir = path.join(outputDir, ".raw")

const viewport = { width: 1920, height: 1080 }

const scenes = [
  {
    id: "01-dashboard",
    role: "manager",
    route: "/dashboard",
    label: "Tek operasyon merkezi",
    caption: "Yönetim, finans, servis ve riskler tek ekranda.",
    moves: [
      [520, 360, 900],
      [1130, 360, 900],
      [1550, 420, 900],
    ],
    scrolls: [0.28, 0],
  },
  {
    id: "02-units",
    role: "manager",
    route: "/dashboard/listings",
    label: "769 daire kontrol altında",
    caption: "Blok, kat, daire, malik, borç ve servis bağlamı birlikte görünür.",
    moves: [
      [420, 300, 900],
      [1280, 300, 900],
      [1680, 560, 900],
    ],
    scrolls: [0.18, 0.42],
  },
  {
    id: "03-service",
    role: "manager",
    route: "/dashboard/tickets",
    label: "Servis ve SLA takibi",
    caption: "Talepler öncelik, ekip, SLA ve kanıt akışıyla yönetilir.",
    moves: [
      [440, 330, 900],
      [980, 420, 900],
      [1540, 560, 900],
    ],
    scrolls: [0.24, 0.52],
  },
  {
    id: "04-finance",
    role: "accountant",
    route: "/dashboard/finance",
    label: "Tahsilat, borç ve onay",
    caption: "Aidat, ödeme, borç ve kısıtlama süreçleri izlenebilir olur.",
    moves: [
      [420, 340, 900],
      [980, 360, 900],
      [1500, 520, 900],
    ],
    scrolls: [0.22, 0.55],
  },
  {
    id: "05-ai",
    role: "manager",
    route: "/dashboard",
    label: "AI destekli karar hazırlığı",
    caption: "AI özetler ve riskleri işaretler; kritik karar insanda kalır.",
    moves: [
      [1420, 320, 900],
      [1540, 720, 900],
      [1040, 760, 900],
    ],
    scrolls: [0.58, 0.7],
  },
  {
    id: "06-roles",
    role: "manager",
    route: "/login",
    label: "Rol bazlı erişim",
    caption: "Admin, yönetici, muhasebe, personel, malik ve kiracı farklı alan görür.",
    moves: [
      [560, 340, 900],
      [1040, 520, 900],
      [1500, 620, 900],
    ],
    scrolls: [0.18],
  },
  {
    id: "07-offer",
    role: "manager",
    route: "/pitch",
    label: "Net iş modeli",
    caption: "Geliştirme maliyeti yok; WAMOCON kurar, işletir ve bakımını yapar.",
    moves: [
      [420, 350, 900],
      [1030, 460, 900],
      [1560, 690, 900],
    ],
    scrolls: [0.32, 0.62],
  },
]

fs.mkdirSync(outputDir, { recursive: true })
fs.mkdirSync(reviewDir, { recursive: true })
fs.mkdirSync(rawDir, { recursive: true })

function sceneUrl(route) {
  return `${baseUrl}/tr${route}`
}

async function installOverlays(page, scene) {
  await page.evaluate(({ label, caption }) => {
    document.querySelector("#demo-cursor")?.remove()
    document.querySelector("#demo-label")?.remove()

    const cursor = document.createElement("div")
    cursor.id = "demo-cursor"
    cursor.style.cssText = `
      position: fixed;
      left: 50%;
      top: 50%;
      z-index: 2147483647;
      width: 28px;
      height: 28px;
      pointer-events: none;
      transform: translate(-5px, -5px);
      filter: drop-shadow(0 10px 24px rgba(0,0,0,.45));
    `
    cursor.innerHTML = `
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <path d="M6 3.5 25.5 17 16.8 18.2l5.3 8.7-4.2 2.5-5.1-8.6-5.3 6.8L6 3.5Z" fill="#ffffff" stroke="#063d36" stroke-width="2"/>
      </svg>
    `

    const labelBox = document.createElement("div")
    labelBox.id = "demo-label"
    labelBox.style.cssText = `
      position: fixed;
      left: 38px;
      bottom: 34px;
      z-index: 2147483646;
      max-width: 740px;
      padding: 18px 22px;
      border-radius: 22px;
      background: rgba(2, 27, 24, .82);
      color: white;
      border: 1px solid rgba(165, 243, 218, .35);
      box-shadow: 0 22px 60px rgba(0,0,0,.32);
      backdrop-filter: blur(16px);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    `
    labelBox.innerHTML = `
      <div style="font-weight:800;font-size:28px;line-height:1.08;margin-bottom:6px;letter-spacing:0">${label}</div>
      <div style="font-weight:600;font-size:17px;line-height:1.35;color:rgba(255,255,255,.78);letter-spacing:0">${caption}</div>
    `

    document.body.append(labelBox, cursor)
  }, scene)
}

async function moveCursor(page, x, y, duration = 800) {
  await page.evaluate(
    ({ x, y, duration }) =>
      new Promise((resolve) => {
        const cursor = document.querySelector("#demo-cursor")
        if (!cursor) return resolve()
        cursor.style.transition = `left ${duration}ms cubic-bezier(.2,.8,.2,1), top ${duration}ms cubic-bezier(.2,.8,.2,1)`
        cursor.style.left = `${x}px`
        cursor.style.top = `${y}px`
        setTimeout(resolve, duration + 80)
      }),
    { x, y, duration }
  )
}

async function clickPulse(page, x, y) {
  await moveCursor(page, x, y, 300)
  await page.evaluate(
    ({ x, y }) => {
      const pulse = document.createElement("div")
      pulse.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        z-index: 2147483646;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        border: 2px solid rgba(45, 212, 191, .9);
        transform: translate(-50%, -50%) scale(.8);
        pointer-events: none;
        animation: demoPulse 700ms ease-out forwards;
      `
      if (!document.querySelector("#demo-pulse-style")) {
        const style = document.createElement("style")
        style.id = "demo-pulse-style"
        style.textContent =
          "@keyframes demoPulse { to { opacity: 0; transform: translate(-50%, -50%) scale(4); } }"
        document.head.append(style)
      }
      document.body.append(pulse)
      setTimeout(() => pulse.remove(), 800)
    },
    { x, y }
  )
  await page.mouse.click(x, y).catch(() => {})
  await page.waitForTimeout(700)
}

async function scrollToRatio(page, ratio) {
  await page.evaluate((value) => {
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    )
    window.scrollTo({ top: max * value, behavior: "smooth" })
  }, ratio)
  await page.waitForTimeout(1700)
}

async function record() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: "tr-TR",
    recordVideo: { dir: rawDir, size: viewport },
  })
  const page = await context.newPage()
  const issues = []

  page.on("pageerror", (error) => issues.push(`pageerror: ${error.message}`))
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      const text = message.text()
      if (!/favicon|manifest|Failed to load resource/i.test(text)) {
        issues.push(`${message.type()}: ${text}`)
      }
    }
  })

  for (const scene of scenes) {
    await context.clearCookies()
    await context.addCookies([
      { url: baseUrl, name: "access_profile_role", value: scene.role },
    ])

    await page.goto(sceneUrl(scene.route), {
      waitUntil: "networkidle",
      timeout: 60_000,
    })
    await page.waitForTimeout(1400)
    await page.evaluate(() => window.scrollTo(0, 0))
    await installOverlays(page, scene)
    await page.waitForTimeout(800)

    await page.screenshot({
      path: path.join(reviewDir, `${scene.id}.png`),
      fullPage: false,
    })

    for (const [x, y, duration] of scene.moves) {
      await moveCursor(page, x, y, duration)
      await page.waitForTimeout(450)
    }

    await clickPulse(page, scene.moves.at(-1)[0], scene.moves.at(-1)[1])

    for (const ratio of scene.scrolls) {
      await scrollToRatio(page, ratio)
      await moveCursor(
        page,
        460 + Math.round(Math.random() * 220),
        350 + Math.round(Math.random() * 260),
        700
      )
      await page.waitForTimeout(900)
    }
  }

  const video = page.video()
  await context.close()
  await browser.close()

  if (!video) throw new Error("Playwright did not return a video handle")
  const rawPath = await video.path()
  fs.copyFileSync(rawPath, videoPath)

  fs.writeFileSync(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        baseUrl,
        video: videoName,
        viewport,
        scenes: scenes.map(({ id, route, role, label }) => ({
          id,
          route,
          role,
          label,
        })),
        issues,
      },
      null,
      2
    )
  )

  console.log(JSON.stringify({ videoPath, reviewDir, issues }, null, 2))
}

record().catch((error) => {
  console.error(error)
  process.exit(1)
})
