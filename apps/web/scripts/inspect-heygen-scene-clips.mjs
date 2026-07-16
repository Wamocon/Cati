import { chromium } from "@playwright/test"
import fs from "node:fs"
import http from "node:http"
import path from "node:path"

const root = path.resolve(process.cwd(), "../..")
const sceneDir = path.resolve(root, "qa_output/heygen-platform-intro/scenes")
const manifestPath = path.join(sceneDir, "scene-manifest.json")
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))

async function inspectClip(browser, clipPath) {
  const server = http.createServer((request, response) => {
    if (request.url !== "/video.webm") {
      response.writeHead(404)
      response.end()
      return
    }

    const stat = fs.statSync(clipPath)
    response.writeHead(200, {
      "Content-Type": "video/webm",
      "Content-Length": stat.size,
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-store",
    })
    fs.createReadStream(clipPath).pipe(response)
  })

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
  const port = server.address().port
  const page = await browser.newPage()
  await page.setContent(`
    <video
      id="review-video"
      src="http://127.0.0.1:${port}/video.webm"
      muted
      playsinline
    ></video>
  `)
  await page.waitForFunction(
    () => document.querySelector("#review-video")?.readyState >= 1,
    undefined,
    { timeout: 30_000 },
  )
  const metadata = await page.evaluate(() => {
    const video = document.querySelector("#review-video")
    return {
      duration: Number(video?.duration?.toFixed(2) ?? 0),
      width: video?.videoWidth ?? 0,
      height: video?.videoHeight ?? 0,
    }
  })

  await page.close()
  server.close()
  return metadata
}

const browser = await chromium.launch({ headless: true })

try {
  const scenes = []
  for (const scene of manifest.scenes) {
    const clipPath = path.join(sceneDir, scene.clip)
    const stat = fs.statSync(clipPath)
    scenes.push({
      id: scene.id,
      clip: scene.clip,
      bytes: stat.size,
      ...await inspectClip(browser, clipPath),
      issues: scene.issues,
    })
  }

  const report = {
    generatedAt: new Date().toISOString(),
    sceneDir,
    scenes,
    issues: manifest.issues,
  }
  fs.writeFileSync(
    path.join(sceneDir, "scene-inspection.json"),
    JSON.stringify(report, null, 2),
  )
  console.log(JSON.stringify(report, null, 2))
} finally {
  await browser.close()
}
