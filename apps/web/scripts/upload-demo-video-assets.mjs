import { createClient } from "@supabase/supabase-js"
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "../../..")
const appRoot = path.resolve(__dirname, "..")
const sourceVideoDir = path.resolve(repoRoot, "Videos")
const posterRoot = path.resolve(repoRoot, "qa_output/video-production-tr/semantic-frame-samples")
const outputDir = path.resolve(repoRoot, "qa_output/supabase-demo-video-upload")
const uploadManifestPath = path.join(outputDir, "upload-manifest.json")
const bucket = process.env.SUPABASE_VIDEO_BUCKET ?? "Demo Videos"
const storagePrefix = process.env.SUPABASE_VIDEO_PREFIX ?? "tr/heygen-2026-07-09"
const maxUploadBytes = 200 * 1024 * 1024

const playlist = [
  {
    slug: "01-cati-90-saniyede",
    sourceNumber: "01",
    posterDir: "01-pitch-video-1cati-in-90-saniye",
  },
  {
    slug: "02-ceo-yonetim-walkthrough",
    sourceNumber: "02",
    posterDir: "02-ceo-management-walkthrough",
  },
  {
    slug: "03-egitim-00-izleyici-orientasyonu",
    sourceNumber: "03",
    posterDir: "03-training-00-izleyici-orientasyonu",
  },
  {
    slug: "04-egitim-01-login-roller-veri-guvenligi",
    sourceNumber: "04",
    posterDir: "04-training-01-login-roller-veri-guvenligi",
  },
  {
    slug: "05-egitim-02-dashboard-gunluk-yonetim",
    sourceNumber: "05",
    posterDir: "05-training-02-dashboard-gunluk-yonetim",
  },
  {
    slug: "06-egitim-03-daireler-bloklar-daire-matrisi",
    sourceNumber: "06",
    posterDir: "06-training-03-daireler-bloklar-matris",
  },
  {
    slug: "07-egitim-04-insanlar-malikler-kiracilar-personel",
    sourceNumber: "07",
    posterDir: "07-training-04-insanlar-malik-kiraci-personel",
  },
  {
    slug: "08-egitim-05-servis-ticket-sla-gorevler",
    sourceNumber: "08",
    posterDir: "08-training-05-servis-ticket-sla-gorevler",
  },
  {
    slug: "09-egitim-06-takvim-rezervasyon-checkin-checkout",
    sourceNumber: "09",
    posterDir: "09-training-06-takvim-rezervasyon-checkin-checkout",
  },
  {
    slug: "10-egitim-07-finans-odemeler-depozito-kisitlama",
    sourceNumber: "10",
    posterDir: "10-training-07-finans-odemeler-depozito-kisitlama",
  },
  {
    slug: "11-egitim-08-belgeler-yukleme-kanit",
    sourceNumber: "11",
    posterDir: "11-training-08-belgeler-yukleme-kanit",
  },
  {
    slug: "12-egitim-09-iletisim-bildirimler",
    sourceNumber: "12",
    posterDir: "12-training-09-iletisim-bildirimler",
  },
  {
    slug: "13-egitim-10-erisim-compliance-denetim",
    sourceNumber: "13",
    posterDir: "13-training-10-erisim-compliance-denetim",
  },
  {
    slug: "14-egitim-11-raporlar-yonetim-analizleri",
    sourceNumber: "14",
    posterDir: "14-training-11-raporlar-yonetim-analizleri",
  },
  {
    slug: "15-egitim-12-yapay-zeka-asistani-sinirlar",
    sourceNumber: "15",
    posterDir: "15-training-12-yapay-zeka-asistani-sinirlar",
  },
  {
    slug: "16-egitim-13-mobile-web-pwa-offline-queue",
    sourceNumber: "16",
    posterDir: "16-training-13-mobile-web-pwa-offline-queue",
  },
  {
    slug: "17-egitim-14-ayarlar-entegrasyonlar",
    sourceNumber: "17",
    posterDir: "17-training-14-ayarlar-entegrasyonlar",
  },
  {
    slug: "18-egitim-15-new-level-premium-journey",
    sourceNumber: "18",
    posterDir: "18-training-15-new-level-premium-journey",
  },
  {
    slug: "19-egitim-16-kapanis-live-uat-onay",
    sourceNumber: "19",
    posterDir: "19-training-16-kapanis-live-uat-onay",
  },
]

const env = {
  ...loadEnv(path.join(appRoot, ".env.local")),
  ...process.env,
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

await ensureBucket()

const uploads = []

mkdirSync(outputDir, { recursive: true })

for (const item of playlist) {
  const sourceVideo = findSourceVideo(item.sourceNumber)
  uploads.push(
    await uploadObject({
      localPath: sourceVideo,
      storagePath: `${storagePrefix}/videos/${item.slug}.mp4`,
      contentType: "video/mp4",
    })
  )
  uploads.push(
    await uploadObject({
      localPath: path.join(posterRoot, item.posterDir, "frame-01.png"),
      storagePath: `${storagePrefix}/posters/${item.slug}.png`,
      contentType: "image/png",
    })
  )
}

writeFileSync(
  uploadManifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      bucket,
      storagePrefix,
      publicBaseUrl: `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}`,
      sourceVideoDir,
      posterRoot,
      uploads,
    },
    null,
    2
  )}\n`
)

console.log(`Uploaded ${uploads.length} objects to ${bucket}/${storagePrefix}`)

async function ensureBucket() {
  const options = {
    public: true,
    fileSizeLimit: maxUploadBytes,
    allowedMimeTypes: ["video/mp4", "image/png", "image/jpeg", "image/webp"],
  }
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()
  if (listError) throw listError

  const exists = buckets.some((item) => item.id === bucket)
  const response = exists
    ? await supabase.storage.updateBucket(bucket, options)
    : await supabase.storage.createBucket(bucket, options)

  if (response.error) throw response.error
}

async function uploadObject({
  localPath,
  storagePath,
  contentType,
}) {
  const normalizedStoragePath = storagePath.replaceAll("\\", "/")
  const bytes = readFileSync(localPath)
  const sizeBytes = statSync(localPath).size

  if (sizeBytes > maxUploadBytes) {
    throw new Error(`${localPath} is larger than the configured 200 MB Supabase limit.`)
  }

  const { error } = await supabase.storage.from(bucket).upload(normalizedStoragePath, bytes, {
    cacheControl: "31536000",
    contentType,
    upsert: true,
  })

  if (error) throw error

  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedStoragePath)
  console.log(`Uploaded ${normalizedStoragePath} (${Math.round(sizeBytes / 1024 / 1024)} MB)`)

  return {
    localPath,
    storagePath: normalizedStoragePath,
    contentType,
    sizeBytes,
    publicUrl: data.publicUrl,
  }
}

function findSourceVideo(sourceNumber) {
  const prefix = `Video ${sourceNumber} -`
  const match = readdirSync(sourceVideoDir).find(
    (filename) => filename.startsWith(prefix) && filename.toLowerCase().endsWith(".mp4")
  )

  if (!match) {
    throw new Error(`Could not find source video ${prefix} in ${sourceVideoDir}`)
  }

  return path.join(sourceVideoDir, match)
}

function loadEnv(filePath) {
  const env = {}

  try {
    for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
      if (!match) continue

      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      env[match[1]] = value
    }
  } catch {
    return env
  }

  return env
}
