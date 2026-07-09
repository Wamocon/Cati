import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/server"

const VIDEO_LIBRARY_TABLE = "video_library"
const DEFAULT_SUPABASE_PUBLIC_ORIGIN = "https://hczmbaqofxyusellxhyp.supabase.co"
export const VIDEO_LIBRARY_BUCKET =
  process.env.SUPABASE_VIDEO_BUCKET ?? "Demo Videos"
const VIDEO_LIBRARY_PREFIX =
  process.env.SUPABASE_VIDEO_PREFIX ?? "tr/heygen-2026-07-09"
const SIGNED_URL_TTL_SECONDS = 60 * 60

export type VideoLocale = "tr" | "en" | "de" | "ru"
export type VideoLibrarySource = "supabase" | "fallback"

export interface VideoCaptionTrack {
  src: string
  label: string
  srclang: string
  default: boolean
}

export interface VideoChapter {
  label: string
  time: number
}

export interface VideoLibraryItem {
  id: string
  slug: string
  sortOrder: number
  title: string
  description: string
  category: string
  durationSeconds: number
  videoUrl: string | null
  thumbnailUrl: string
  captions: VideoCaptionTrack[]
  chapters: VideoChapter[]
  source: VideoLibrarySource
}

export interface VideoLibraryPayload {
  videos: VideoLibraryItem[]
  source: VideoLibrarySource
  bucket: string
  generatedAt: string
  warning: string | null
}

interface FallbackVideoSeed {
  slug: string
  sortOrder: number
  title: string
  description: string
  category: string
  durationSeconds: number
  videoPath: string
  thumbnailPath: string
  chapters: VideoChapter[]
}

interface PendingCaptionTrack {
  path: string | null
  src: string | null
  label: string
  srclang: string
  default: boolean
}

type ServiceRoleClient = NonNullable<ReturnType<typeof createServiceRoleClient>>

const fallbackPlaceholderImage = "/new-level-premium/resort-exterior.jpg"

function videoPath(slug: string) {
  return `${VIDEO_LIBRARY_PREFIX}/videos/${slug}.mp4`
}

function posterPath(slug: string) {
  return `${VIDEO_LIBRARY_PREFIX}/posters/${slug}.png`
}

function standardChapters(
  first: string,
  second: string,
  third: string,
  durationSeconds: number
): VideoChapter[] {
  return [
    { label: first, time: 0 },
    { label: second, time: Math.max(1, Math.round(durationSeconds * 0.34)) },
    { label: third, time: Math.max(2, Math.round(durationSeconds * 0.68)) },
  ]
}

function publicStorageUrl(path: string | null): string | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ??
    DEFAULT_SUPABASE_PUBLIC_ORIGIN

  if (!path) return null

  const encodedBucket = encodeURIComponent(VIDEO_LIBRARY_BUCKET)
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `${supabaseUrl}/storage/v1/object/public/${encodedBucket}/${encodedPath}`
}

const fallbackVideoSeeds: FallbackVideoSeed[] = [
  {
    slug: "01-cati-90-saniyede",
    sortOrder: 1,
    title: "1Cati 90 Saniyede",
    description:
      "Landing page, business value, demo proof and the operating dashboard in one short management story.",
    category: "Yonetim ozeti",
    durationSeconds: 142,
    videoPath: videoPath("01-cati-90-saniyede"),
    thumbnailPath: posterPath("01-cati-90-saniyede"),
    chapters: standardChapters("Acilis", "Deger kaniti", "Operasyon merkezi", 142),
  },
  {
    slug: "02-ceo-yonetim-walkthrough",
    sortOrder: 2,
    title: "CEO ve Yonetim Walkthrough",
    description:
      "Executive walkthrough for operations, risks, finance, service, reporting and decision readiness.",
    category: "Yonetim ozeti",
    durationSeconds: 428,
    videoPath: videoPath("02-ceo-yonetim-walkthrough"),
    thumbnailPath: posterPath("02-ceo-yonetim-walkthrough"),
    chapters: standardChapters("Yonetim baglami", "Canli panel", "Karar ozeti", 428),
  },
  {
    slug: "03-egitim-00-izleyici-orientasyonu",
    sortOrder: 3,
    title: "Egitim 00 - Izleyici Orientasyonu",
    description:
      "How to follow the training series, what is demo-ready, and how to read the main product areas.",
    category: "Egitim baslangici",
    durationSeconds: 230,
    videoPath: videoPath("03-egitim-00-izleyici-orientasyonu"),
    thumbnailPath: posterPath("03-egitim-00-izleyici-orientasyonu"),
    chapters: standardChapters("Seri mantigi", "Demo merkezi", "Sonraki adim", 230),
  },
  {
    slug: "04-egitim-01-login-roller-veri-guvenligi",
    sortOrder: 4,
    title: "Egitim 01 - Login, Roller ve Veri Guvenligi",
    description:
      "Demo access, role switching, production authentication boundaries and permission-aware navigation.",
    category: "Egitim baslangici",
    durationSeconds: 301,
    videoPath: videoPath("04-egitim-01-login-roller-veri-guvenligi"),
    thumbnailPath: posterPath("04-egitim-01-login-roller-veri-guvenligi"),
    chapters: standardChapters("Giris modeli", "Rol profilleri", "Guvenlik siniri", 301),
  },
  {
    slug: "05-egitim-02-dashboard-gunluk-yonetim",
    sortOrder: 5,
    title: "Egitim 02 - Dashboard ve Gunluk Yonetim",
    description:
      "Daily dashboard view with KPIs, service status, finance signals and next operating actions.",
    category: "Operasyon",
    durationSeconds: 60,
    videoPath: videoPath("05-egitim-02-dashboard-gunluk-yonetim"),
    thumbnailPath: posterPath("05-egitim-02-dashboard-gunluk-yonetim"),
    chapters: standardChapters("Dashboard", "KPI okuma", "Aksiyonlar", 60),
  },
  {
    slug: "06-egitim-03-daireler-bloklar-daire-matrisi",
    sortOrder: 6,
    title: "Egitim 03 - Daireler, Bloklar ve Daire Matrisi",
    description:
      "Blocks, floors, units, owners, residents, debt, access status and service context in one matrix.",
    category: "Operasyon",
    durationSeconds: 235,
    videoPath: videoPath("06-egitim-03-daireler-bloklar-daire-matrisi"),
    thumbnailPath: posterPath("06-egitim-03-daireler-bloklar-daire-matrisi"),
    chapters: standardChapters("Bloklar", "Daire matrisi", "Detay baglami", 235),
  },
  {
    slug: "07-egitim-04-insanlar-malikler-kiracilar-personel",
    sortOrder: 7,
    title: "Egitim 04 - Insanlar, Malikler, Kiracilar ve Personel",
    description:
      "People records for owners, tenants, staff responsibility and role-aware operating context.",
    category: "Operasyon",
    durationSeconds: 193,
    videoPath: videoPath("07-egitim-04-insanlar-malikler-kiracilar-personel"),
    thumbnailPath: posterPath("07-egitim-04-insanlar-malikler-kiracilar-personel"),
    chapters: standardChapters("Kisiler", "Rol baglami", "Operasyon kaydi", 193),
  },
  {
    slug: "08-egitim-05-servis-ticket-sla-gorevler",
    sortOrder: 8,
    title: "Egitim 05 - Servis Ticket, SLA ve Gorevler",
    description:
      "Service ticket classification, SLA priority, assignment, evidence and closure workflow.",
    category: "Operasyon",
    durationSeconds: 327,
    videoPath: videoPath("08-egitim-05-servis-ticket-sla-gorevler"),
    thumbnailPath: posterPath("08-egitim-05-servis-ticket-sla-gorevler"),
    chapters: standardChapters("Ticket alimi", "SLA ve gorev", "Kanita dayali kapanis", 327),
  },
  {
    slug: "09-egitim-06-takvim-rezervasyon-checkin-checkout",
    sortOrder: 9,
    title: "Egitim 06 - Takvim, Rezervasyon, Check-in ve Checkout",
    description:
      "Calendar, reservation, check-in, check-out and field coordination workflow.",
    category: "Operasyon",
    durationSeconds: 204,
    videoPath: videoPath("09-egitim-06-takvim-rezervasyon-checkin-checkout"),
    thumbnailPath: posterPath("09-egitim-06-takvim-rezervasyon-checkin-checkout"),
    chapters: standardChapters("Takvim", "Rezervasyon", "Check-in / check-out", 204),
  },
  {
    slug: "10-egitim-07-finans-odemeler-depozito-kisitlama",
    sortOrder: 10,
    title: "Egitim 07 - Finans, Odemeler, Depozito ve Kisitlama",
    description:
      "Dues, collections, debt status, deposits and human-approved restriction decisions.",
    category: "Finans",
    durationSeconds: 287,
    videoPath: videoPath("10-egitim-07-finans-odemeler-depozito-kisitlama"),
    thumbnailPath: posterPath("10-egitim-07-finans-odemeler-depozito-kisitlama"),
    chapters: standardChapters("Finans ozeti", "Odeme ve borc", "Onayli kisitlama", 287),
  },
  {
    slug: "11-egitim-08-belgeler-yukleme-kanit",
    sortOrder: 11,
    title: "Egitim 08 - Belgeler, Yukleme ve Kanit",
    description:
      "Document upload, evidence tracking, review state and auditable record handling.",
    category: "Dokuman",
    durationSeconds: 212,
    videoPath: videoPath("11-egitim-08-belgeler-yukleme-kanit"),
    thumbnailPath: posterPath("11-egitim-08-belgeler-yukleme-kanit"),
    chapters: standardChapters("Belge alani", "Yukleme ve kanit", "Denetim kaydi", 212),
  },
  {
    slug: "12-egitim-09-iletisim-bildirimler",
    sortOrder: 12,
    title: "Egitim 09 - Iletisim ve Bildirimler",
    description:
      "Owner, tenant, staff and management communication with linked notification context.",
    category: "Iletisim",
    durationSeconds: 212,
    videoPath: videoPath("12-egitim-09-iletisim-bildirimler"),
    thumbnailPath: posterPath("12-egitim-09-iletisim-bildirimler"),
    chapters: standardChapters("Iletisim merkezi", "Bildirimler", "Takip baglami", 212),
  },
  {
    slug: "13-egitim-10-erisim-compliance-denetim",
    sortOrder: 13,
    title: "Egitim 10 - Erisim, Compliance ve Denetim",
    description:
      "Role-based access, compliance status, audit trail and traceable sensitive operations.",
    category: "Guvenlik",
    durationSeconds: 207,
    videoPath: videoPath("13-egitim-10-erisim-compliance-denetim"),
    thumbnailPath: posterPath("13-egitim-10-erisim-compliance-denetim"),
    chapters: standardChapters("Erisim", "Compliance", "Denetim izi", 207),
  },
  {
    slug: "14-egitim-11-raporlar-yonetim-analizleri",
    sortOrder: 14,
    title: "Egitim 11 - Raporlar ve Yonetim Analizleri",
    description:
      "Management reports, operating analytics and decision preparation screens.",
    category: "Raporlama",
    durationSeconds: 192,
    videoPath: videoPath("14-egitim-11-raporlar-yonetim-analizleri"),
    thumbnailPath: posterPath("14-egitim-11-raporlar-yonetim-analizleri"),
    chapters: standardChapters("Raporlar", "Analiz", "Yonetim karari", 192),
  },
  {
    slug: "15-egitim-12-yapay-zeka-asistani-sinirlar",
    sortOrder: 15,
    title: "Egitim 12 - Yapay Zeka Asistani ve Sinirlar",
    description:
      "AI assistant summaries, recommendations, human approval limits and guardrailed usage.",
    category: "AI",
    durationSeconds: 281,
    videoPath: videoPath("15-egitim-12-yapay-zeka-asistani-sinirlar"),
    thumbnailPath: posterPath("15-egitim-12-yapay-zeka-asistani-sinirlar"),
    chapters: standardChapters("AI baglami", "Oneri ve ozet", "Insan onayi", 281),
  },
  {
    slug: "16-egitim-13-mobile-web-pwa-offline-queue",
    sortOrder: 16,
    title: "Egitim 13 - Mobile Web, PWA ve Offline Queue",
    description:
      "Mobile web, field usage, offline queue, retry model and visible sync state.",
    category: "Mobil",
    durationSeconds: 207,
    videoPath: videoPath("16-egitim-13-mobile-web-pwa-offline-queue"),
    thumbnailPath: posterPath("16-egitim-13-mobile-web-pwa-offline-queue"),
    chapters: standardChapters("Mobil kullanim", "Offline kuyruk", "Senkronizasyon", 207),
  },
  {
    slug: "17-egitim-14-ayarlar-entegrasyonlar",
    sortOrder: 17,
    title: "Egitim 14 - Ayarlar ve Entegrasyonlar",
    description:
      "Provider-dependent settings, API keys, production approval and integration readiness.",
    category: "Entegrasyon",
    durationSeconds: 213,
    videoPath: videoPath("17-egitim-14-ayarlar-entegrasyonlar"),
    thumbnailPath: posterPath("17-egitim-14-ayarlar-entegrasyonlar"),
    chapters: standardChapters("Ayarlar", "Saglayici baglanti", "Canliya hazirlik", 213),
  },
  {
    slug: "18-egitim-15-new-level-premium-journey",
    sortOrder: 18,
    title: "Egitim 15 - New Level Premium Journey",
    description:
      "New Level Premium context for the customer, owner and operations journey.",
    category: "Musteri yolculugu",
    durationSeconds: 273,
    videoPath: videoPath("18-egitim-15-new-level-premium-journey"),
    thumbnailPath: posterPath("18-egitim-15-new-level-premium-journey"),
    chapters: standardChapters("Proje baglami", "Yolculuk", "Operasyon sonucu", 273),
  },
  {
    slug: "19-egitim-16-kapanis-live-uat-onay",
    sortOrder: 19,
    title: "Egitim 16 - Kapanis, Live, UAT ve Onay",
    description:
      "Live readiness, UAT, customer approval, provider dependencies and final launch controls.",
    category: "Kapanis",
    durationSeconds: 237,
    videoPath: videoPath("19-egitim-16-kapanis-live-uat-onay"),
    thumbnailPath: posterPath("19-egitim-16-kapanis-live-uat-onay"),
    chapters: standardChapters("Canliya gecis", "UAT ve onay", "Son kontrol", 237),
  },
]

const fallbackBySlug = new Map(
  fallbackVideoSeeds.map((video) => [video.slug, video])
)

export function resolveVideoLocale(locale: string): VideoLocale {
  if (locale === "tr" || locale === "de" || locale === "ru") {
    return locale
  }
  return "en"
}

export async function getVideoLibrary(
  localeInput: string
): Promise<VideoLibraryPayload> {
  const locale = resolveVideoLocale(localeInput)
  const supabase = createServiceRoleClient()

  if (!supabase) {
    return createSupabaseStoragePayload(null)
  }

  const { data, error } = await supabase
    .from(VIDEO_LIBRARY_TABLE)
    .select(
      [
        "id",
        "slug",
        "sort_order",
        "title",
        "description",
        "category",
        "duration_seconds",
        "video_path",
        "thumbnail_path",
        "caption_tracks",
        "chapters",
        "is_published",
      ].join(",")
    )
    .eq("is_published", true)
    .order("sort_order", { ascending: true })

  if (error || !Array.isArray(data) || data.length === 0) {
    return createSupabaseStoragePayload(null)
  }

  const videos = await Promise.all(
    data.map((row, index) => toVideoLibraryItem(supabase, row, locale, index))
  )

  const publishedVideos = videos.filter((video) => Boolean(video.videoUrl))

  if (publishedVideos.length === 0) {
    return createSupabaseStoragePayload(null)
  }

  return {
    videos,
    source: "supabase",
    bucket: VIDEO_LIBRARY_BUCKET,
    generatedAt: new Date().toISOString(),
    warning: null,
  }
}

function createSupabaseStoragePayload(warning: string | null): VideoLibraryPayload {
  const videos = fallbackVideoSeeds.map((video) => {
    const videoUrl = publicStorageUrl(video.videoPath)
    const thumbnailUrl = publicStorageUrl(video.thumbnailPath)

    return {
      id: `storage-${video.sortOrder}`,
      slug: video.slug,
      sortOrder: video.sortOrder,
      title: video.title,
      description: video.description,
      category: video.category,
      durationSeconds: video.durationSeconds,
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? fallbackPlaceholderImage,
      captions: [],
      chapters: video.chapters,
      source: videoUrl ? "supabase" : "fallback",
    } satisfies VideoLibraryItem
  })

  if (videos.every((video) => !video.videoUrl)) {
    return createFallbackPayload(
      warning ??
        "Supabase video URLs could not be resolved; local video placeholders are shown."
    )
  }

  return {
    videos,
    source: "supabase",
    bucket: VIDEO_LIBRARY_BUCKET,
    generatedAt: new Date().toISOString(),
    warning,
  }
}

function createFallbackPayload(warning: string): VideoLibraryPayload {
  return {
    videos: fallbackVideoSeeds.map((video) => ({
      id: `fallback-${video.sortOrder}`,
      slug: video.slug,
      sortOrder: video.sortOrder,
      title: video.title,
      description: video.description,
      category: video.category,
      durationSeconds: video.durationSeconds,
      videoUrl: null,
      thumbnailUrl: fallbackPlaceholderImage,
      captions: [],
      chapters: video.chapters,
      source: "fallback",
    })),
    source: "fallback",
    bucket: VIDEO_LIBRARY_BUCKET,
    generatedAt: new Date().toISOString(),
    warning,
  }
}

async function toVideoLibraryItem(
  supabase: ServiceRoleClient,
  rawRow: unknown,
  locale: VideoLocale,
  index: number
): Promise<VideoLibraryItem> {
  const row = asRecord(rawRow)
  const slug = readString(row.slug) ?? `video-${index + 1}`
  const fallback = fallbackBySlug.get(slug) ?? fallbackVideoSeeds[index]
  const videoPath = readString(row.video_path) ?? fallback?.videoPath ?? null
  const thumbnailPath = readString(row.thumbnail_path) ?? fallback?.thumbnailPath ?? null
  const [videoUrl, thumbnailUrl, captions] = await Promise.all([
    signStoragePath(supabase, videoPath),
    signStoragePath(supabase, thumbnailPath),
    signCaptionTracks(supabase, normalizeCaptionTracks(row.caption_tracks)),
  ])

  return {
    id: readString(row.id) ?? slug,
    slug,
    sortOrder: readNumber(row.sort_order) ?? index + 1,
    title: resolveLocalizedText(row.title, locale, fallback?.title ?? slug),
    description: resolveLocalizedText(
      row.description,
      locale,
      fallback?.description ?? "Product video"
    ),
    category: resolveLocalizedText(row.category, locale, fallback?.category ?? "Video"),
    durationSeconds:
      readNumber(row.duration_seconds) ?? fallback?.durationSeconds ?? 0,
    videoUrl,
    thumbnailUrl:
      thumbnailUrl ??
      (fallback ? publicStorageUrl(fallback.thumbnailPath) : null) ??
      fallbackPlaceholderImage,
    captions,
    chapters: normalizeChapters(row.chapters, locale, fallback?.chapters ?? []),
    source: "supabase",
  }
}

async function signCaptionTracks(
  supabase: ServiceRoleClient,
  tracks: PendingCaptionTrack[]
): Promise<VideoCaptionTrack[]> {
  const signedTracks = await Promise.all(
    tracks.map(async (track) => {
      const src = track.src ?? (await signStoragePath(supabase, track.path))
      if (!src) return null

      return {
        src,
        label: track.label,
        srclang: track.srclang,
        default: track.default,
      }
    })
  )

  return signedTracks.filter((track): track is VideoCaptionTrack => Boolean(track))
}

async function signStoragePath(
  supabase: ServiceRoleClient,
  path: string | null
): Promise<string | null> {
  if (!path) return null
  if (/^https?:\/\//i.test(path) || path.startsWith("/")) return path

  const { data, error } = await supabase.storage
    .from(VIDEO_LIBRARY_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) return publicStorageUrl(path)
  return data?.signedUrl ?? publicStorageUrl(path)
}

function normalizeCaptionTracks(value: unknown): PendingCaptionTrack[] {
  if (!Array.isArray(value)) return []

  return value
    .map((track): PendingCaptionTrack | null => {
      const record = asRecord(track)
      const srclang = readString(record.srclang) ?? readString(record.lang)
      const label = readString(record.label) ?? srclang?.toUpperCase()

      if (!srclang || !label) return null

      return {
        path: readString(record.path),
        src: readString(record.src),
        label,
        srclang,
        default: readBoolean(record.default) ?? false,
      }
    })
    .filter((track): track is PendingCaptionTrack => Boolean(track))
}

function normalizeChapters(
  value: unknown,
  locale: VideoLocale,
  fallback: VideoChapter[]
): VideoChapter[] {
  if (!Array.isArray(value)) return fallback

  const chapters = value
    .map((chapter): VideoChapter | null => {
      const record = asRecord(chapter)
      const time = readNumber(record.time) ?? readNumber(record.time_seconds)
      const label = resolveLocalizedText(record.label, locale, "")

      if (!label || typeof time !== "number") return null
      return { label, time }
    })
    .filter((chapter): chapter is VideoChapter => Boolean(chapter))

  return chapters.length > 0 ? chapters : fallback
}

function resolveLocalizedText(
  value: unknown,
  locale: VideoLocale,
  fallback: string
): string {
  if (typeof value === "string" && value.trim()) return value

  const record = asRecord(value)
  const localized = readString(record[locale])
  const english = readString(record.en)
  const turkish = readString(record.tr)
  const firstString = Object.values(record).find(
    (item): item is string => typeof item === "string" && item.trim().length > 0
  )

  return localized ?? english ?? turkish ?? firstString ?? fallback
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }
  return value as Record<string, unknown>
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null
}
