import { chromium } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const baseUrl = process.env.DEMO_BASE_URL ?? "http://127.0.0.1:3104"
const outputDir =
  process.env.DEMO_SCENE_OUTPUT_DIR ?? "../../qa_output/heygen-platform-intro/scenes"
const reviewDir = path.join(outputDir, "review")
const rawDir = path.join(outputDir, ".raw")
const viewport = { width: 1920, height: 1080 }

const scenes = [
  {
    id: "02-dashboard-control-center",
    route: "/dashboard",
    role: "manager",
    label: "Tek operasyon merkezi",
    caption: "Yönetim, finans, servis ve riskler tek ekranda.",
    narration:
      "1Çatı, yönetim ekibine tüm operasyonu tek ekranda gösterir. Daire sayısı, açık servisler, borç riski ve canlı olay akışı aynı merkezden izlenir.",
    moves: [
      [420, 360, 700],
      [1030, 350, 700],
      [1540, 420, 700],
      [450, 835, 700],
    ],
    scrolls: [0.18],
    holdMs: 1300,
  },
  {
    id: "03-unit-matrix",
    route: "/dashboard/listings",
    role: "manager",
    label: "769 daire kontrol altında",
    caption: "Blok, kat, malik, borç ve servis bağlamı birlikte görünür.",
    narration:
      "Daire matrisi, 769 daireyi gerçek yapısıyla takip eder. Blok, kat, malik, satış, borç, erişim ve servis durumu birlikte görünür.",
    moves: [
      [390, 310, 700],
      [870, 340, 700],
      [1320, 520, 700],
      [1660, 720, 700],
    ],
    scrolls: [0.2, 0.42],
    holdMs: 900,
  },
  {
    id: "04-service-sla",
    route: "/dashboard/tickets",
    role: "manager",
    label: "Acil servis rotaları",
    caption: "Demo akışı; canlıda yönetim takibini hızlandıracak model.",
    narration:
      "Servis tarafında talepler sınıflandırılır. Su kaçağı, gaz, asansör, elektrik veya havuz olayı doğru SLA ve ekip kuyruğuna yönlendirilir. Bu bugün demo ortamında görünür; canlı entegrasyonlarla bildirim, vendor takibi ve görev ataması yönetimin manuel telefon ve WhatsApp yükünü azaltır.",
    moves: [
      [430, 315, 700],
      [1030, 370, 700],
      [1500, 455, 700],
      [1660, 600, 700],
    ],
    scrolls: [0.18, 0.48],
    holdMs: 900,
  },
  {
    id: "05-finance-control",
    route: "/dashboard/finance",
    role: "accountant",
    label: "Tahsilat, borç ve onay",
    caption: "Aidat, ödeme, borç ve kısıtlama kararları izlenebilir olur.",
    narration:
      "Finans ekranı aidatları, ödemeleri, açık borçları ve kısıtlama kararlarını denetlenebilir bir akışta toplar.",
    moves: [
      [430, 320, 700],
      [960, 405, 700],
      [1460, 390, 700],
      [1630, 880, 700],
    ],
    scrolls: [0.22, 0.55],
    holdMs: 900,
  },
  {
    id: "06-ai-decision-layer",
    route: "/dashboard",
    role: "manager",
    label: "AI destekli karar hazırlığı",
    caption: "AI özetler; para, erişim ve rol kararları insanda kalır.",
    narration:
      "AI katmanı riskleri özetler, öncelik önerir ve cevap taslağı hazırlar. Kritik kararlar otomatik değil, insan onayıyla ilerler.",
    moves: [
      [1510, 360, 700],
      [1570, 745, 700],
      [1040, 790, 700],
      [450, 840, 700],
    ],
    scrolls: [0.56, 0.72],
    holdMs: 900,
  },
  {
    id: "07-role-access",
    route: "/login",
    role: "manager",
    label: "Rol bazlı erişim",
    caption: "Admin, yönetici, muhasebe, personel, malik ve kiracı farklı alan görür.",
    narration:
      "Rol bazlı erişim sayesinde herkes yalnızca kendi yetkili alanını görür. Bu, hem güvenlik hem de günlük kullanım kolaylığı sağlar.",
    moves: [
      [360, 380, 700],
      [1020, 460, 700],
      [1500, 520, 700],
      [1300, 640, 700],
    ],
    scrolls: [0.12],
    holdMs: 1100,
  },
  {
    id: "08-offer-model",
    route: "/pitch",
    role: "manager",
    label: "Net iş modeli",
    caption: "Kurulum, işletim ve bakım WAMOCON tarafında kalır.",
    narration:
      "Müşteri ağır geliştirme maliyeti üstlenmez. Sistem WAMOCON tarafından kurulur, işletilir ve aylık bakım modeliyle sürdürülebilir hale gelir.",
    moves: [
      [420, 340, 700],
      [1030, 455, 700],
      [1570, 665, 700],
      [1180, 820, 700],
    ],
    scrolls: [0.32, 0.6],
    holdMs: 900,
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
      max-width: 760px;
      padding: 18px 22px;
      border-radius: 22px;
      background: rgba(2, 27, 24, .84);
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

async function moveCursor(page, x, y, duration = 700) {
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
  await moveCursor(page, x, y, 260)
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
  await page.waitForTimeout(650)
}

async function scrollToRatio(page, ratio) {
  await page.evaluate((value) => {
    const max = Math.max(
      0,
      document.documentElement.scrollHeight - window.innerHeight
    )
    window.scrollTo({ top: max * value, behavior: "smooth" })
  }, ratio)
  await page.waitForTimeout(1300)
}

async function recordScene(browser, scene) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: "tr-TR",
    recordVideo: { dir: rawDir, size: viewport },
  })
  await context.addCookies([
    { url: baseUrl, name: "access_profile_role", value: scene.role },
  ])

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

  await page.goto(sceneUrl(scene.route), {
    waitUntil: "networkidle",
    timeout: 60_000,
  })
  await page.waitForTimeout(1300)
  await page.evaluate(() => window.scrollTo(0, 0))
  await installOverlays(page, scene)
  await page.waitForTimeout(650)

  await page.screenshot({
    path: path.join(reviewDir, `${scene.id}.png`),
    fullPage: false,
  })

  for (const [x, y, duration] of scene.moves) {
    await moveCursor(page, x, y, duration)
    await page.waitForTimeout(320)
  }

  await clickPulse(page, scene.moves.at(-1)[0], scene.moves.at(-1)[1])

  for (const ratio of scene.scrolls) {
    await scrollToRatio(page, ratio)
    await moveCursor(page, 520, 420, 650)
    await page.waitForTimeout(650)
  }

  await page.waitForTimeout(scene.holdMs)
  const video = page.video()
  await context.close()

  if (!video) throw new Error(`No video handle returned for ${scene.id}`)
  const rawPath = await video.path()
  const clipName = `${scene.id}.webm`
  const clipPath = path.join(outputDir, clipName)
  fs.copyFileSync(rawPath, clipPath)

  return {
    ...scene,
    clip: clipName,
    issues,
  }
}

async function record() {
  const browser = await chromium.launch({ headless: true })
  const results = []

  try {
    for (const scene of scenes) {
      results.push(await recordScene(browser, scene))
    }
  } finally {
    await browser.close()
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    viewport,
    scenes: results.map(({ id, route, role, label, caption, narration, clip, issues }) => ({
      id,
      route,
      role,
      label,
      caption,
      narration,
      clip,
      issues,
    })),
    issues: results.flatMap((scene) =>
      scene.issues.map((issue) => `${scene.id}: ${issue}`)
    ),
  }

  fs.writeFileSync(
    path.join(outputDir, "scene-manifest.json"),
    JSON.stringify(manifest, null, 2)
  )

  console.log(JSON.stringify(manifest, null, 2))
}

record().catch((error) => {
  console.error(error)
  process.exit(1)
})
