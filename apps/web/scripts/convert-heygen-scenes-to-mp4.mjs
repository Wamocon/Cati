import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const sceneDir = path.resolve(
  process.env.DEMO_SCENE_OUTPUT_DIR ??
    path.join(scriptDir, "../../../qa_output/heygen-platform-intro/scenes")
)
const outputDir = path.join(sceneDir, "mp4")
const viewport = { width: 1920, height: 1080 }
const mimeType = "video/mp4;codecs=avc1.42E01E"

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

function getSceneClips() {
  return fs
    .readdirSync(sceneDir)
    .filter((name) => /^\d{2}-.+\.webm$/i.test(name))
    .sort()
}

async function transcodeClip(browser, clipName) {
  const inputPath = path.join(sceneDir, clipName)
  const outputName = clipName.replace(/\.webm$/i, ".mp4")
  const outputPath = path.join(outputDir, outputName)
  const inputBase64 = fs.readFileSync(inputPath).toString("base64")
  const chunks = []

  const page = await browser.newPage({ viewport })
  await page.exposeBinding("pushVideoChunk", (_source, payload) => {
    chunks.push(Buffer.from(payload, "base64"))
  })

  const result = await page.evaluate(
    async ({ inputBase64, mimeType, width, height }) => {
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        return { ok: false, error: `Unsupported MIME type: ${mimeType}` }
      }

      const binary = Uint8Array.from(atob(inputBase64), (char) =>
        char.charCodeAt(0)
      )
      const sourceBlob = new Blob([binary], { type: "video/webm" })
      const video = document.createElement("video")
      video.src = URL.createObjectURL(sourceBlob)
      video.muted = true
      video.playsInline = true
      video.preload = "auto"

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve
        video.onerror = () => reject(new Error("Source video could not load"))
      })

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d", { alpha: false })
      const stream = canvas.captureStream(30)
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000,
      })

      const done = new Promise((resolve) => {
        recorder.onstop = resolve
      })

      recorder.ondataavailable = async (event) => {
        if (!event.data.size) return
        const buffer = await event.data.arrayBuffer()
        let binaryText = ""
        const bytes = new Uint8Array(buffer)
        const chunkSize = 0x8000
        for (let index = 0; index < bytes.length; index += chunkSize) {
          binaryText += String.fromCharCode(
            ...bytes.subarray(index, index + chunkSize)
          )
        }
        await window.pushVideoChunk(btoa(binaryText))
      }

      function draw() {
        ctx.fillStyle = "#ffffff"
        ctx.fillRect(0, 0, width, height)
        ctx.drawImage(video, 0, 0, width, height)
        if (!video.ended) requestAnimationFrame(draw)
      }

      recorder.start(1000)
      draw()
      await video.play()
      await new Promise((resolve) => {
        video.onended = resolve
      })
      recorder.stop()
      await done

      return {
        ok: true,
        duration: video.duration,
        sourceWidth: video.videoWidth,
        sourceHeight: video.videoHeight,
      }
    },
    {
      inputBase64,
      mimeType,
      width: viewport.width,
      height: viewport.height,
    }
  )

  await page.close()

  if (!result.ok) {
    throw new Error(`${clipName}: ${result.error}`)
  }

  fs.writeFileSync(outputPath, Buffer.concat(chunks))

  return {
    input: clipName,
    output: outputName,
    outputPath,
    duration: result.duration,
    width: result.sourceWidth,
    height: result.sourceHeight,
    bytes: fs.statSync(outputPath).size,
  }
}

async function convert() {
  fs.mkdirSync(outputDir, { recursive: true })
  const chromium = await loadChromium()
  const browser = await chromium.launch({ headless: true })
  const clips = getSceneClips()
  const results = []

  try {
    for (const clip of clips) {
      results.push(await transcodeClip(browser, clip))
    }
  } finally {
    await browser.close()
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: sceneDir,
    outputDir,
    mimeType,
    scenes: results,
    issues: results.flatMap((scene) => {
      const issues = []
      if (scene.width !== viewport.width) issues.push(`${scene.output}: width`)
      if (scene.height !== viewport.height) issues.push(`${scene.output}: height`)
      if (!scene.bytes) issues.push(`${scene.output}: empty file`)
      return issues
    }),
  }

  fs.writeFileSync(
    path.join(outputDir, "mp4-manifest.json"),
    JSON.stringify(manifest, null, 2)
  )

  console.log(JSON.stringify(manifest, null, 2))
}

convert().catch((error) => {
  console.error(error)
  process.exit(1)
})
