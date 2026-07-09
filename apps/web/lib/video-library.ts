import "server-only"

import { createServiceRoleClient } from "@/lib/supabase/server"

const VIDEO_LIBRARY_TABLE = "video_library"
export const VIDEO_LIBRARY_BUCKET =
  process.env.SUPABASE_VIDEO_BUCKET ?? "video-library"
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
  title: string
  description: string
  category: string
  durationSeconds: number
  thumbnailUrl: string
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

const fallbackImages = [
  "/new-level-premium/resort-exterior.jpg",
  "/new-level-premium/masterplan-aerial.jpg",
  "/new-level-premium/site-progress-2026.jpg",
  "/new-level-premium/showroom-bedroom.jpg",
]

const fallbackVideoSeeds: FallbackVideoSeed[] = [
  {
    slug: "overview-command-center",
    title: "ERP operations center",
    description:
      "A complete overview of the 1Cati workspace, navigation, KPIs and live operating flow.",
    category: "Overview",
    durationSeconds: 196,
    thumbnailUrl: fallbackImages[0],
    chapters: [
      { label: "Portfolio context", time: 0 },
      { label: "Live controls", time: 54 },
      { label: "Next actions", time: 128 },
    ],
  },
  {
    slug: "login-roles-rbac",
    title: "Login, demo roles and RBAC",
    description:
      "Shows access profiles, role selection, permission-aware navigation and protected dashboard entry.",
    category: "Access",
    durationSeconds: 174,
    thumbnailUrl: fallbackImages[1],
    chapters: [
      { label: "Login flow", time: 0 },
      { label: "Role profiles", time: 47 },
      { label: "Permission check", time: 118 },
    ],
  },
  {
    slug: "portfolio-dashboard",
    title: "Portfolio dashboard",
    description:
      "Explains how units, service risks, finance signals and owner communication connect in one view.",
    category: "Dashboard",
    durationSeconds: 211,
    thumbnailUrl: fallbackImages[2],
    chapters: [
      { label: "Portfolio status", time: 0 },
      { label: "Risk tiles", time: 70 },
      { label: "Drilldowns", time: 145 },
    ],
  },
  {
    slug: "unit-matrix",
    title: "Apartment and unit matrix",
    description:
      "Walks through blocks, floors, ownership, debt flags, access status and service history.",
    category: "Operations",
    durationSeconds: 188,
    thumbnailUrl: fallbackImages[3],
    chapters: [
      { label: "Block selection", time: 0 },
      { label: "Unit details", time: 52 },
      { label: "Compliance view", time: 127 },
    ],
  },
  {
    slug: "service-ticket-intake",
    title: "Service request intake",
    description:
      "Demonstrates request creation, categorization, photos, notes and customer communication.",
    category: "Service",
    durationSeconds: 203,
    thumbnailUrl: fallbackImages[0],
    chapters: [
      { label: "New request", time: 0 },
      { label: "Evidence", time: 58 },
      { label: "Assignment", time: 139 },
    ],
  },
  {
    slug: "sla-priority-queue",
    title: "SLA and priority queue",
    description:
      "Shows priority rules, blocked orders, service approvals and the operational queue.",
    category: "Service",
    durationSeconds: 221,
    thumbnailUrl: fallbackImages[1],
    chapters: [
      { label: "Queue health", time: 0 },
      { label: "SLA risk", time: 64 },
      { label: "Manager approval", time: 151 },
    ],
  },
  {
    slug: "finance-ledger",
    title: "Finance ledger",
    description:
      "Covers contributions, unit balances, receivables, status badges and audit-ready finance views.",
    category: "Finance",
    durationSeconds: 198,
    thumbnailUrl: fallbackImages[2],
    chapters: [
      { label: "Receivables", time: 0 },
      { label: "Unit balance", time: 61 },
      { label: "Audit trail", time: 140 },
    ],
  },
  {
    slug: "payment-controls",
    title: "Payment controls",
    description:
      "Explains payment status, exception handling, approvals and finance-team handoff controls.",
    category: "Finance",
    durationSeconds: 184,
    thumbnailUrl: fallbackImages[3],
    chapters: [
      { label: "Payment state", time: 0 },
      { label: "Exceptions", time: 55 },
      { label: "Approval handoff", time: 124 },
    ],
  },
  {
    slug: "reservations-calendar",
    title: "Reservations calendar",
    description:
      "Shows shared-area bookings, calendar capacity, conflicts and owner or tenant confirmations.",
    category: "Reservations",
    durationSeconds: 177,
    thumbnailUrl: fallbackImages[0],
    chapters: [
      { label: "Calendar", time: 0 },
      { label: "Capacity", time: 48 },
      { label: "Confirmation", time: 119 },
    ],
  },
  {
    slug: "check-in-check-out",
    title: "Check-in and check-out",
    description:
      "Walks through arrival tasks, departure checks, photo proof and deposit or damage review.",
    category: "Lifecycle",
    durationSeconds: 216,
    thumbnailUrl: fallbackImages[1],
    chapters: [
      { label: "Arrival", time: 0 },
      { label: "Inspection", time: 76 },
      { label: "Closure", time: 159 },
    ],
  },
  {
    slug: "document-vault",
    title: "Document vault",
    description:
      "Demonstrates secure documents, visibility, categories, upload status and retention-ready records.",
    category: "Documents",
    durationSeconds: 190,
    thumbnailUrl: fallbackImages[2],
    chapters: [
      { label: "Folders", time: 0 },
      { label: "Secure access", time: 51 },
      { label: "Records", time: 132 },
    ],
  },
  {
    slug: "owner-tenant-portal",
    title: "Owner and tenant portal",
    description:
      "Shows the lighter portal experience for owners and tenants with services, documents and chat.",
    category: "Portal",
    durationSeconds: 205,
    thumbnailUrl: fallbackImages[3],
    chapters: [
      { label: "Portal home", time: 0 },
      { label: "Requests", time: 63 },
      { label: "Documents", time: 146 },
    ],
  },
  {
    slug: "communication-center",
    title: "Communication center",
    description:
      "Covers owner, tenant and team communication, message history and action-linked context.",
    category: "Communication",
    durationSeconds: 192,
    thumbnailUrl: fallbackImages[0],
    chapters: [
      { label: "Inbox", time: 0 },
      { label: "Context", time: 59 },
      { label: "Follow-up", time: 133 },
    ],
  },
  {
    slug: "compliance-access",
    title: "Compliance and access",
    description:
      "Explains access restrictions, compliance status, legal flags and traceable operations.",
    category: "Compliance",
    durationSeconds: 208,
    thumbnailUrl: fallbackImages[1],
    chapters: [
      { label: "Access state", time: 0 },
      { label: "Legal flags", time: 67 },
      { label: "Traceability", time: 150 },
    ],
  },
  {
    slug: "offline-pwa",
    title: "Offline and mobile work",
    description:
      "Shows how field teams can keep working with mobile-friendly screens and offline-ready flows.",
    category: "Mobile",
    durationSeconds: 181,
    thumbnailUrl: fallbackImages[2],
    chapters: [
      { label: "Field task", time: 0 },
      { label: "Offline state", time: 54 },
      { label: "Sync result", time: 124 },
    ],
  },
  {
    slug: "reports-ai",
    title: "Reports and AI assistance",
    description:
      "Demonstrates report preparation, summaries, AI recommendations and human approval boundaries.",
    category: "AI",
    durationSeconds: 234,
    thumbnailUrl: fallbackImages[3],
    chapters: [
      { label: "Report view", time: 0 },
      { label: "AI summary", time: 82 },
      { label: "Human decision", time: 169 },
    ],
  },
  {
    slug: "public-ai-concierge",
    title: "Public AI concierge",
    description:
      "Explains the public assistant, lead capture, safe answers and handoff into the CRM flow.",
    category: "AI",
    durationSeconds: 173,
    thumbnailUrl: fallbackImages[0],
    chapters: [
      { label: "Visitor question", time: 0 },
      { label: "Safe answer", time: 52 },
      { label: "Lead handoff", time: 118 },
    ],
  },
  {
    slug: "integrations-readiness",
    title: "Integration readiness",
    description:
      "Shows provider-ready placeholders for OAuth, payment, email, SMS, access and document storage.",
    category: "Integrations",
    durationSeconds: 201,
    thumbnailUrl: fallbackImages[1],
    chapters: [
      { label: "Provider status", time: 0 },
      { label: "Contract keys", time: 58 },
      { label: "Activation path", time: 142 },
    ],
  },
  {
    slug: "admin-settings-audit",
    title: "Admin settings and audit",
    description:
      "Covers system settings, role governance, audit evidence and controlled production readiness.",
    category: "Administration",
    durationSeconds: 219,
    thumbnailUrl: fallbackImages[2],
    chapters: [
      { label: "Settings", time: 0 },
      { label: "Roles", time: 69 },
      { label: "Audit", time: 156 },
    ],
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
    return createFallbackPayload(
      "Supabase service credentials are not configured, so local video placeholders are shown."
    )
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
    return createFallbackPayload(
      error
        ? `Supabase video_library could not be loaded: ${error.message}`
        : "No published Supabase videos were found yet."
    )
  }

  const videos = await Promise.all(
    data.map((row, index) => toVideoLibraryItem(supabase, row, locale, index))
  )

  const publishedVideos = videos.filter((video) => Boolean(video.videoUrl))

  if (publishedVideos.length === 0) {
    return createFallbackPayload(
      "Supabase video metadata exists, but no playable video files could be signed."
    )
  }

  return {
    videos,
    source: "supabase",
    bucket: VIDEO_LIBRARY_BUCKET,
    generatedAt: new Date().toISOString(),
    warning: null,
  }
}

function createFallbackPayload(warning: string): VideoLibraryPayload {
  return {
    videos: fallbackVideoSeeds.map((video, index) => ({
      id: `fallback-${index + 1}`,
      slug: video.slug,
      sortOrder: index + 1,
      title: video.title,
      description: video.description,
      category: video.category,
      durationSeconds: video.durationSeconds,
      videoUrl: null,
      thumbnailUrl: video.thumbnailUrl,
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
  const videoPath = readString(row.video_path)
  const thumbnailPath = readString(row.thumbnail_path)
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
    thumbnailUrl: thumbnailUrl ?? fallback?.thumbnailUrl ?? fallbackImages[0],
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

  if (error) return null
  return data?.signedUrl ?? null
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
