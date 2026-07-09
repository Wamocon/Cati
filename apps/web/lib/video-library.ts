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

interface LocalizedVideoCopy {
  title: string
  description: string
  category: string
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

const genericChapterLabels: Record<VideoLocale, [string, string, string]> = {
  en: ["Context", "Product workflow", "Result"],
  de: ["Kontext", "Produktablauf", "Ergebnis"],
  tr: ["Bağlam", "Ürün akışı", "Sonuç"],
  ru: ["Контекст", "Рабочий процесс", "Результат"],
}

const storageVideoCopy: Record<
  VideoLocale,
  Record<string, LocalizedVideoCopy>
> = {
  en: {
    "01-cati-90-saniyede": {
      title: "1Cati in 90 Seconds",
      description:
        "A concise business overview of the platform, public story and operating dashboard.",
      category: "Executive summary",
    },
    "02-ceo-yonetim-walkthrough": {
      title: "CEO and Management Walkthrough",
      description:
        "The management view across operations, finance, service, reports and launch decisions.",
      category: "Executive summary",
    },
    "03-egitim-00-izleyici-orientasyonu": {
      title: "Training 00 - Viewer Orientation",
      description:
        "How to follow the series, read demo signals and understand what is ready for UAT.",
      category: "Training start",
    },
    "04-egitim-01-login-roller-veri-guvenligi": {
      title: "Training 01 - Login, Roles and Data Security",
      description:
        "Demo access, role switching, production authentication and permission-aware navigation.",
      category: "Training start",
    },
    "05-egitim-02-dashboard-gunluk-yonetim": {
      title: "Training 02 - Dashboard and Daily Management",
      description:
        "KPIs, service status, finance signals and next operating actions in the daily view.",
      category: "Operations",
    },
    "06-egitim-03-daireler-bloklar-daire-matrisi": {
      title: "Training 03 - Units, Blocks and Apartment Matrix",
      description:
        "Blocks, floors, units, owners, residents, debt, access and service context.",
      category: "Operations",
    },
    "07-egitim-04-insanlar-malikler-kiracilar-personel": {
      title: "Training 04 - People, Owners, Tenants and Staff",
      description:
        "People records, responsibility, role context and operational ownership.",
      category: "Operations",
    },
    "08-egitim-05-servis-ticket-sla-gorevler": {
      title: "Training 05 - Service Tickets, SLA and Tasks",
      description:
        "Ticket intake, SLA priority, assignment, evidence and controlled closure.",
      category: "Operations",
    },
    "09-egitim-06-takvim-rezervasyon-checkin-checkout": {
      title: "Training 06 - Calendar, Reservation, Check-in and Checkout",
      description:
        "Reservation planning, field coordination, arrival checks and departure workflow.",
      category: "Operations",
    },
    "10-egitim-07-finans-odemeler-depozito-kisitlama": {
      title: "Training 07 - Finance, Payments, Deposits and Restrictions",
      description:
        "Dues, collections, debt state, deposits and human-approved restriction decisions.",
      category: "Finance",
    },
    "11-egitim-08-belgeler-yukleme-kanit": {
      title: "Training 08 - Documents, Uploads and Evidence",
      description:
        "Document upload, evidence tracking, review state and auditable records.",
      category: "Documents",
    },
    "12-egitim-09-iletisim-bildirimler": {
      title: "Training 09 - Communication and Notifications",
      description:
        "Linked communication between owners, tenants, staff and management.",
      category: "Communication",
    },
    "13-egitim-10-erisim-compliance-denetim": {
      title: "Training 10 - Access, Compliance and Audit",
      description:
        "Role-based access, compliance state, audit trail and traceable sensitive actions.",
      category: "Security",
    },
    "14-egitim-11-raporlar-yonetim-analizleri": {
      title: "Training 11 - Reports and Management Analytics",
      description:
        "Management reports, operating analytics and decision preparation.",
      category: "Reporting",
    },
    "15-egitim-12-yapay-zeka-asistani-sinirlar": {
      title: "Training 12 - AI Assistant and Guardrails",
      description:
        "AI summaries, recommendations, same-language support and human approval limits.",
      category: "AI",
    },
    "16-egitim-13-mobile-web-pwa-offline-queue": {
      title: "Training 13 - Mobile Web, PWA and Offline Queue",
      description:
        "Mobile field usage, offline queue, retry model and visible sync state.",
      category: "Mobile",
    },
    "17-egitim-14-ayarlar-entegrasyonlar": {
      title: "Training 14 - Settings and Integrations",
      description:
        "Provider-dependent settings, API keys, approvals and activation readiness.",
      category: "Integrations",
    },
    "18-egitim-15-new-level-premium-journey": {
      title: "Training 15 - New Level Premium Journey",
      description:
        "Customer, owner and operation journey for the New Level Premium project context.",
      category: "Customer journey",
    },
    "19-egitim-16-kapanis-live-uat-onay": {
      title: "Training 16 - Closing, Live, UAT and Approval",
      description:
        "Launch readiness, UAT, customer approval, provider dependencies and final controls.",
      category: "Launch",
    },
  },
  de: {
    "01-cati-90-saniyede": {
      title: "1Cati in 90 Sekunden",
      description:
        "Ein kurzer Business-Überblick über Plattform, öffentliche Story und Betriebs-Dashboard.",
      category: "Management-Überblick",
    },
    "02-ceo-yonetim-walkthrough": {
      title: "CEO- und Management-Rundgang",
      description:
        "Die Managementsicht auf Betrieb, Finanzen, Service, Reports und Launch-Entscheidungen.",
      category: "Management-Überblick",
    },
    "03-egitim-00-izleyici-orientasyonu": {
      title: "Schulung 00 - Orientierung für Zuschauer",
      description:
        "Wie die Serie gelesen wird, welche Demo-Signale wichtig sind und was UAT-bereit ist.",
      category: "Schulungsstart",
    },
    "04-egitim-01-login-roller-veri-guvenligi": {
      title: "Schulung 01 - Login, Rollen und Datensicherheit",
      description:
        "Demo-Zugang, Rollenwechsel, produktive Authentifizierung und rechtebasierte Navigation.",
      category: "Schulungsstart",
    },
    "05-egitim-02-dashboard-gunluk-yonetim": {
      title: "Schulung 02 - Dashboard und Tagessteuerung",
      description:
        "KPIs, Servicestatus, Finanzsignale und nächste operative Aktionen in der Tagesansicht.",
      category: "Betrieb",
    },
    "06-egitim-03-daireler-bloklar-daire-matrisi": {
      title: "Schulung 03 - Einheiten, Blöcke und Apartment-Matrix",
      description:
        "Blöcke, Etagen, Einheiten, Eigentümer, Bewohner, Schulden, Zugang und Service-Kontext.",
      category: "Betrieb",
    },
    "07-egitim-04-insanlar-malikler-kiracilar-personel": {
      title: "Schulung 04 - Personen, Eigentümer, Mieter und Personal",
      description:
        "Personenakten, Verantwortung, Rollenkontext und operative Zuständigkeit.",
      category: "Betrieb",
    },
    "08-egitim-05-servis-ticket-sla-gorevler": {
      title: "Schulung 05 - Service-Tickets, SLA und Aufgaben",
      description:
        "Ticketannahme, SLA-Priorität, Zuweisung, Nachweise und kontrollierter Abschluss.",
      category: "Betrieb",
    },
    "09-egitim-06-takvim-rezervasyon-checkin-checkout": {
      title: "Schulung 06 - Kalender, Reservierung, Check-in und Checkout",
      description:
        "Reservierungsplanung, Feldkoordination, Anreiseprüfung und Abreiseprozess.",
      category: "Betrieb",
    },
    "10-egitim-07-finans-odemeler-depozito-kisitlama": {
      title: "Schulung 07 - Finanzen, Zahlungen, Kautionen und Sperren",
      description:
        "Beiträge, Zahlungseingänge, Schuldstatus, Kautionen und menschlich freigegebene Sperrentscheidungen.",
      category: "Finanzen",
    },
    "11-egitim-08-belgeler-yukleme-kanit": {
      title: "Schulung 08 - Dokumente, Uploads und Nachweise",
      description:
        "Dokumentenupload, Nachweisführung, Prüfstatus und revisionsfähige Akten.",
      category: "Dokumente",
    },
    "12-egitim-09-iletisim-bildirimler": {
      title: "Schulung 09 - Kommunikation und Benachrichtigungen",
      description:
        "Verknüpfte Kommunikation zwischen Eigentümern, Mietern, Personal und Management.",
      category: "Kommunikation",
    },
    "13-egitim-10-erisim-compliance-denetim": {
      title: "Schulung 10 - Zugriff, Compliance und Audit",
      description:
        "Rollenbasierter Zugriff, Compliance-Status, Audit-Trail und nachvollziehbare sensible Aktionen.",
      category: "Sicherheit",
    },
    "14-egitim-11-raporlar-yonetim-analizleri": {
      title: "Schulung 11 - Reports und Management-Analysen",
      description:
        "Managementberichte, operative Analysen und Vorbereitung von Entscheidungen.",
      category: "Reporting",
    },
    "15-egitim-12-yapay-zeka-asistani-sinirlar": {
      title: "Schulung 12 - KI-Assistent und Leitplanken",
      description:
        "KI-Zusammenfassungen, Empfehlungen, gleiche Antwortsprache und menschliche Freigabegrenzen.",
      category: "KI",
    },
    "16-egitim-13-mobile-web-pwa-offline-queue": {
      title: "Schulung 13 - Mobile Web, PWA und Offline Queue",
      description:
        "Mobile Feldarbeit, Offline-Warteschlange, Wiederholungsmodell und sichtbarer Sync-Status.",
      category: "Mobil",
    },
    "17-egitim-14-ayarlar-entegrasyonlar": {
      title: "Schulung 14 - Einstellungen und Integrationen",
      description:
        "Provider-abhängige Einstellungen, API-Keys, Freigaben und Aktivierungsbereitschaft.",
      category: "Integrationen",
    },
    "18-egitim-15-new-level-premium-journey": {
      title: "Schulung 15 - New Level Premium Journey",
      description:
        "Kunden-, Eigentümer- und Betriebsreise im Kontext des New Level Premium Projekts.",
      category: "Customer Journey",
    },
    "19-egitim-16-kapanis-live-uat-onay": {
      title: "Schulung 16 - Abschluss, Live, UAT und Freigabe",
      description:
        "Launch-Bereitschaft, UAT, Kundenfreigabe, Provider-Abhängigkeiten und finale Kontrollen.",
      category: "Launch",
    },
  },
  tr: {
    "01-cati-90-saniyede": {
      title: "1Çatı 90 Saniyede",
      description:
        "Platformun iş değerini, dış hikayesini ve operasyon dashboard'unu kısa şekilde gösterir.",
      category: "Yönetim özeti",
    },
    "02-ceo-yonetim-walkthrough": {
      title: "CEO ve Yönetim Turu",
      description:
        "Operasyon, finans, servis, raporlar ve canlıya geçiş kararları için yönetim bakışı.",
      category: "Yönetim özeti",
    },
    "03-egitim-00-izleyici-orientasyonu": {
      title: "Eğitim 00 - İzleyici Orientasyonu",
      description:
        "Serinin nasıl izleneceğini, demo sinyallerini ve UAT için hazır alanları açıklar.",
      category: "Eğitim başlangıcı",
    },
    "04-egitim-01-login-roller-veri-guvenligi": {
      title: "Eğitim 01 - Login, Roller ve Veri Güvenliği",
      description:
        "Demo erişimi, rol değiştirme, üretim kimlik doğrulaması ve yetkiye göre navigasyon.",
      category: "Eğitim başlangıcı",
    },
    "05-egitim-02-dashboard-gunluk-yonetim": {
      title: "Eğitim 02 - Dashboard ve Günlük Yönetim",
      description:
        "Günlük ekranda KPI'lar, servis durumu, finans sinyalleri ve sonraki aksiyonlar.",
      category: "Operasyon",
    },
    "06-egitim-03-daireler-bloklar-daire-matrisi": {
      title: "Eğitim 03 - Daireler, Bloklar ve Daire Matrisi",
      description:
        "Blok, kat, daire, malik, sakin, borç, erişim ve servis bağlamı.",
      category: "Operasyon",
    },
    "07-egitim-04-insanlar-malikler-kiracilar-personel": {
      title: "Eğitim 04 - İnsanlar, Malikler, Kiracılar ve Personel",
      description:
        "Kişi kayıtları, sorumluluk, rol bağlamı ve operasyon sahipliği.",
      category: "Operasyon",
    },
    "08-egitim-05-servis-ticket-sla-gorevler": {
      title: "Eğitim 05 - Servis Ticket, SLA ve Görevler",
      description:
        "Ticket alımı, SLA önceliği, atama, kanıt ve kontrollü kapanış.",
      category: "Operasyon",
    },
    "09-egitim-06-takvim-rezervasyon-checkin-checkout": {
      title: "Eğitim 06 - Takvim, Rezervasyon, Check-in ve Checkout",
      description:
        "Rezervasyon planlama, saha koordinasyonu, giriş kontrolü ve çıkış akışı.",
      category: "Operasyon",
    },
    "10-egitim-07-finans-odemeler-depozito-kisitlama": {
      title: "Eğitim 07 - Finans, Ödemeler, Depozito ve Kısıtlama",
      description:
        "Aidat, tahsilat, borç durumu, depozito ve insan onaylı kısıtlama kararları.",
      category: "Finans",
    },
    "11-egitim-08-belgeler-yukleme-kanit": {
      title: "Eğitim 08 - Belgeler, Yükleme ve Kanıt",
      description:
        "Belge yükleme, kanıt takibi, inceleme durumu ve denetlenebilir kayıtlar.",
      category: "Doküman",
    },
    "12-egitim-09-iletisim-bildirimler": {
      title: "Eğitim 09 - İletişim ve Bildirimler",
      description:
        "Malik, kiracı, personel ve yönetim arasında bağlamlı iletişim.",
      category: "İletişim",
    },
    "13-egitim-10-erisim-compliance-denetim": {
      title: "Eğitim 10 - Erişim, Compliance ve Denetim",
      description:
        "Rol bazlı erişim, compliance durumu, audit trail ve izlenebilir hassas aksiyonlar.",
      category: "Güvenlik",
    },
    "14-egitim-11-raporlar-yonetim-analizleri": {
      title: "Eğitim 11 - Raporlar ve Yönetim Analizleri",
      description:
        "Yönetim raporları, operasyon analizleri ve karar hazırlığı.",
      category: "Raporlama",
    },
    "15-egitim-12-yapay-zeka-asistani-sinirlar": {
      title: "Eğitim 12 - Yapay Zeka Asistanı ve Sınırlar",
      description:
        "AI özetleri, öneriler, aynı dilde destek ve insan onayı sınırları.",
      category: "AI",
    },
    "16-egitim-13-mobile-web-pwa-offline-queue": {
      title: "Eğitim 13 - Mobile Web, PWA ve Offline Queue",
      description:
        "Mobil saha kullanımı, offline kuyruk, tekrar deneme modeli ve görünür senkronizasyon.",
      category: "Mobil",
    },
    "17-egitim-14-ayarlar-entegrasyonlar": {
      title: "Eğitim 14 - Ayarlar ve Entegrasyonlar",
      description:
        "Sağlayıcıya bağlı ayarlar, API anahtarları, onaylar ve aktivasyon hazırlığı.",
      category: "Entegrasyon",
    },
    "18-egitim-15-new-level-premium-journey": {
      title: "Eğitim 15 - New Level Premium Journey",
      description:
        "New Level Premium proje bağlamında müşteri, malik ve operasyon yolculuğu.",
      category: "Müşteri yolculuğu",
    },
    "19-egitim-16-kapanis-live-uat-onay": {
      title: "Eğitim 16 - Kapanış, Live, UAT ve Onay",
      description:
        "Canlıya geçiş hazırlığı, UAT, müşteri onayı, sağlayıcı bağımlılıkları ve final kontrolleri.",
      category: "Kapanış",
    },
  },
  ru: {
    "01-cati-90-saniyede": {
      title: "1Cati за 90 секунд",
      description:
        "Краткий бизнес-обзор платформы, публичной истории и операционного dashboard.",
      category: "Обзор для руководства",
    },
    "02-ceo-yonetim-walkthrough": {
      title: "Обзор для CEO и руководства",
      description:
        "Управленческий взгляд на операции, финансы, сервис, отчеты и решения по запуску.",
      category: "Обзор для руководства",
    },
    "03-egitim-00-izleyici-orientasyonu": {
      title: "Обучение 00 - Ориентация зрителя",
      description:
        "Как смотреть серию, читать demo-сигналы и понимать готовность к UAT.",
      category: "Старт обучения",
    },
    "04-egitim-01-login-roller-veri-guvenligi": {
      title: "Обучение 01 - Вход, роли и безопасность данных",
      description:
        "Demo-доступ, переключение ролей, продуктивная авторизация и навигация по правам.",
      category: "Старт обучения",
    },
    "05-egitim-02-dashboard-gunluk-yonetim": {
      title: "Обучение 02 - Dashboard и ежедневное управление",
      description:
        "KPI, состояние сервиса, финансовые сигналы и следующие операционные действия.",
      category: "Операции",
    },
    "06-egitim-03-daireler-bloklar-daire-matrisi": {
      title: "Обучение 03 - Объекты, блоки и матрица квартир",
      description:
        "Блоки, этажи, квартиры, владельцы, жители, долги, доступ и сервисный контекст.",
      category: "Операции",
    },
    "07-egitim-04-insanlar-malikler-kiracilar-personel": {
      title: "Обучение 04 - Люди, владельцы, арендаторы и персонал",
      description:
        "Карточки людей, ответственность, ролевой контекст и операционное владение.",
      category: "Операции",
    },
    "08-egitim-05-servis-ticket-sla-gorevler": {
      title: "Обучение 05 - Сервисные заявки, SLA и задачи",
      description:
        "Прием заявки, SLA-приоритет, назначение, доказательства и контролируемое закрытие.",
      category: "Операции",
    },
    "09-egitim-06-takvim-rezervasyon-checkin-checkout": {
      title: "Обучение 06 - Календарь, резервации, check-in и checkout",
      description:
        "Планирование резерваций, координация на месте, заезд и выезд.",
      category: "Операции",
    },
    "10-egitim-07-finans-odemeler-depozito-kisitlama": {
      title: "Обучение 07 - Финансы, платежи, депозиты и ограничения",
      description:
        "Взносы, поступления, долги, депозиты и ограничения только после человеческого одобрения.",
      category: "Финансы",
    },
    "11-egitim-08-belgeler-yukleme-kanit": {
      title: "Обучение 08 - Документы, загрузки и доказательства",
      description:
        "Загрузка документов, доказательства, статус проверки и аудируемые записи.",
      category: "Документы",
    },
    "12-egitim-09-iletisim-bildirimler": {
      title: "Обучение 09 - Коммуникация и уведомления",
      description:
        "Связанная коммуникация между владельцами, арендаторами, персоналом и руководством.",
      category: "Коммуникация",
    },
    "13-egitim-10-erisim-compliance-denetim": {
      title: "Обучение 10 - Доступ, compliance и аудит",
      description:
        "Ролевой доступ, compliance-статус, audit trail и отслеживаемые чувствительные действия.",
      category: "Безопасность",
    },
    "14-egitim-11-raporlar-yonetim-analizleri": {
      title: "Обучение 11 - Отчеты и управленческая аналитика",
      description:
        "Управленческие отчеты, операционная аналитика и подготовка решений.",
      category: "Отчетность",
    },
    "15-egitim-12-yapay-zeka-asistani-sinirlar": {
      title: "Обучение 12 - AI-ассистент и ограничения",
      description:
        "AI-резюме, рекомендации, ответы на нужном языке и границы человеческого одобрения.",
      category: "AI",
    },
    "16-egitim-13-mobile-web-pwa-offline-queue": {
      title: "Обучение 13 - Mobile Web, PWA и offline queue",
      description:
        "Мобильная работа, offline queue, повторные попытки и видимый статус синхронизации.",
      category: "Мобильная работа",
    },
    "17-egitim-14-ayarlar-entegrasyonlar": {
      title: "Обучение 14 - Настройки и интеграции",
      description:
        "Настройки провайдеров, API-ключи, согласования и готовность к активации.",
      category: "Интеграции",
    },
    "18-egitim-15-new-level-premium-journey": {
      title: "Обучение 15 - Путь New Level Premium",
      description:
        "Путь клиента, владельца и операций в контексте проекта New Level Premium.",
      category: "Путь клиента",
    },
    "19-egitim-16-kapanis-live-uat-onay": {
      title: "Обучение 16 - Закрытие, Live, UAT и одобрение",
      description:
        "Готовность к запуску, UAT, одобрение клиента, зависимости провайдеров и финальные проверки.",
      category: "Запуск",
    },
  },
}

function getStorageVideoCopy(
  video: FallbackVideoSeed,
  locale: VideoLocale
): LocalizedVideoCopy {
  return (
    storageVideoCopy[locale][video.slug] ??
    storageVideoCopy.en[video.slug] ?? {
      title: video.title,
      description: video.description,
      category: video.category,
    }
  )
}

function getStorageVideoChapters(
  video: FallbackVideoSeed,
  locale: VideoLocale
): VideoChapter[] {
  const [first, second, third] =
    genericChapterLabels[locale] ?? genericChapterLabels.en

  return standardChapters(first, second, third, video.durationSeconds)
}

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
    return createSupabaseStoragePayload(locale, null)
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
    return createSupabaseStoragePayload(locale, null)
  }

  const videos = await Promise.all(
    data.map((row, index) => toVideoLibraryItem(supabase, row, locale, index))
  )

  const publishedVideos = videos.filter((video) => Boolean(video.videoUrl))

  if (publishedVideos.length === 0) {
    return createSupabaseStoragePayload(locale, null)
  }

  return {
    videos,
    source: "supabase",
    bucket: VIDEO_LIBRARY_BUCKET,
    generatedAt: new Date().toISOString(),
    warning: null,
  }
}

function createSupabaseStoragePayload(
  locale: VideoLocale,
  warning: string | null
): VideoLibraryPayload {
  const videos = fallbackVideoSeeds.map((video) => {
    const copy = getStorageVideoCopy(video, locale)
    const videoUrl = publicStorageUrl(video.videoPath)
    const thumbnailUrl = publicStorageUrl(video.thumbnailPath)

    return {
      id: `storage-${video.sortOrder}`,
      slug: video.slug,
      sortOrder: video.sortOrder,
      title: copy.title,
      description: copy.description,
      category: copy.category,
      durationSeconds: video.durationSeconds,
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? fallbackPlaceholderImage,
      captions: [],
      chapters: getStorageVideoChapters(video, locale),
      source: videoUrl ? "supabase" : "fallback",
    } satisfies VideoLibraryItem
  })

  if (videos.every((video) => !video.videoUrl)) {
    return createFallbackPayload(
      locale,
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

function createFallbackPayload(
  locale: VideoLocale,
  warning: string
): VideoLibraryPayload {
  return {
    videos: fallbackVideoSeeds.map((video) => {
      const copy = getStorageVideoCopy(video, locale)

      return {
        id: `fallback-${video.sortOrder}`,
        slug: video.slug,
        sortOrder: video.sortOrder,
        title: copy.title,
        description: copy.description,
        category: copy.category,
        durationSeconds: video.durationSeconds,
        videoUrl: null,
        thumbnailUrl: fallbackPlaceholderImage,
        captions: [],
        chapters: getStorageVideoChapters(video, locale),
        source: "fallback",
      }
    }),
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
