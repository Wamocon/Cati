import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const sceneDir = path.resolve(
  process.env.DEMO_SCENE_OUTPUT_DIR ??
    path.join(scriptDir, "../../../qa_output/heygen-platform-intro/scenes")
)
const mp4Dir = path.join(sceneDir, "mp4")
const reviewDir = path.join(mp4Dir, "review")
const expectedSize = { width: 1920, height: 1080 }

async function loadChromium() {
  try {
    const mod = await import("@playwright/test")
    return mod.chromium
  } catch {
    const fallback = pathToFileURL(
      path.resolve(
        "node_modules/.pnpm/@playwright+test@1.61.0/node_modules/@playwright/test/index.mjs"
      )
    ).href
    const mod = await import(fallback)
    return mod.chromium
  }
}

function getClips() {
  return fs
    .readdirSync(mp4Dir)
    .filter((name) => /^\d{2}-.+\.mp4$/i.test(name))
    .sort()
}

async function inspectClip(browser, clipPath, clip) {
  const server = http.createServer((request, response) => {
    if (request.url !== "/video.mp4") {
      response.writeHead(404)
      response.end()
      return
    }

    const stat = fs.statSync(clipPath)
    response.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    })
    fs.createReadStream(clipPath).pipe(response)
  })

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = server.address().port
  const page = await browser.newPage({ viewport: expectedSize })

  try {
    await page.setContent(`
      <video
        id="review-video"
        src="http://127.0.0.1:${port}/video.mp4"
        muted
        playsinline
        controls
      ></video>
    `)
    await page.waitForFunction(
      () => document.querySelector("#review-video")?.readyState >= 1,
      undefined,
      { timeout: 30_000 }
    )

    const metadata = await page.evaluate(() => {
      const video = document.querySelector("#review-video")
      return {
        duration: Number(video?.duration?.toFixed(2) ?? 0),
        width: video?.videoWidth ?? 0,
        height: video?.videoHeight ?? 0,
        canPlay: video?.canPlayType("video/mp4") ?? "",
      }
    })

    await page.evaluate(async () => {
      const video = document.querySelector("#review-video")
      if (!video?.duration) return
      video.currentTime = Math.max(0.1, Math.min(video.duration * 0.55, video.duration - 0.2))
      await new Promise((resolve) => {
        video.onseeked = resolve
      })
    })
    await page.locator("#review-video").screenshot({
      path: path.join(reviewDir, clip.replace(/\.mp4$/i, ".png")),
    })

    return metadata
  } finally {
    await page.close()
    server.close()
  }
}

const chromium = await loadChromium()
const browser = await chromium.launch({ headless: true })

try {
  fs.mkdirSync(reviewDir, { recursive: true })
  const clips = getClips()
  const scenes = []

  for (const clip of clips) {
    const clipPath = path.join(mp4Dir, clip)
    const stat = fs.statSync(clipPath)
    const metadata = await inspectClip(browser, clipPath, clip)
    const issues = []

    if (metadata.width !== expectedSize.width) issues.push("width")
    if (metadata.height !== expectedSize.height) issues.push("height")
    if (!metadata.duration) issues.push("duration")
    if (!stat.size) issues.push("empty file")

    scenes.push({
      clip,
      bytes: stat.size,
      ...metadata,
      issues,
    })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mp4Dir,
    scenes,
    issues: scenes.flatMap((scene) =>
      scene.issues.map((issue) => `${scene.clip}: ${issue}`)
    ),
  }

  fs.writeFileSync(
    path.join(mp4Dir, "mp4-inspection.json"),
    JSON.stringify(report, null, 2)
  )
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
