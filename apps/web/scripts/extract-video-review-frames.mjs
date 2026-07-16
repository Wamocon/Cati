import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "@playwright/test";

const root = path.resolve(process.cwd(), "../..");
const videoPath = path.resolve(
  root,
  "qa_output/heygen-platform-intro/final/1cati-product-walkthrough-tr-1080p.webm",
);
const outputDir = path.resolve(
  root,
  "qa_output/heygen-platform-intro/final/video-frames-small",
);

fs.mkdirSync(outputDir, { recursive: true });

const server = http.createServer((request, response) => {
  if (request.url !== "/video.webm") {
    response.writeHead(404);
    response.end();
    return;
  }

  const stat = fs.statSync(videoPath);
  response.writeHead(200, {
    "Content-Type": "video/webm",
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(videoPath).pipe(response);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const videoUrl = `http://127.0.0.1:${address.port}/video.webm`;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({
  viewport: { width: 960, height: 540 },
  deviceScaleFactor: 1,
});

await page.setContent(`
  <html>
    <body style="margin:0;background:#111">
      <video
        id="review-video"
        src="${videoUrl}"
        muted
        playsinline
        style="width:960px;height:540px;object-fit:contain;background:#111"
      ></video>
    </body>
  </html>
`);

await page.waitForFunction(
  () => document.querySelector("#review-video")?.readyState >= 1,
  undefined,
  { timeout: 30_000 },
);

const metadata = await page.evaluate(() => {
  const video = document.querySelector("#review-video");
  return {
    duration: video?.duration ?? 0,
    videoWidth: video?.videoWidth ?? 0,
    videoHeight: video?.videoHeight ?? 0,
  };
});

const times = [6, 18, 35, 52, 70, 88, 106];

for (const second of times) {
  await page.evaluate(
    (time) =>
      new Promise((resolve, reject) => {
        const video = document.querySelector("#review-video");
        if (!video) {
          reject(new Error("Video element missing"));
          return;
        }

        const timeout = setTimeout(
          () => reject(new Error(`Seek timeout at ${time}s`)),
          10_000,
        );
        const onSeeked = () => {
          clearTimeout(timeout);
          video.removeEventListener("seeked", onSeeked);
          resolve();
        };

        video.addEventListener("seeked", onSeeked, { once: true });
        video.currentTime = time;
      }),
    second,
  );

  await page.locator("#review-video").screenshot({
    path: path.join(outputDir, `frame-${String(second).padStart(3, "0")}.png`),
  });
}

await browser.close();
server.close();

console.log(
  JSON.stringify(
    {
      videoPath,
      outputDir,
      metadata,
      frames: fs.readdirSync(outputDir),
    },
    null,
    2,
  ),
);
