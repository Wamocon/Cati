import type { Metadata } from "next"
import { ArrowDownCircle, Captions, Gauge, ShieldCheck, Video } from "lucide-react"

import { SiteConcierge } from "@/components/site-concierge"
import { VideoLibraryPlayer } from "@/components/video-library-player"
import { getVideoLibrary, resolveVideoLocale } from "@/lib/video-library"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "1Cati Videos | Product Library",
  description:
    "A Supabase-backed video library for 1Cati product demos, walkthroughs and onboarding videos.",
}

const pageCopy = {
  en: {
    eyebrow: "Product video library",
    title: "Watch every 1Cati app video from one polished player.",
    body: "All 19 app videos are rendered from the Supabase video library when storage is configured. Each item has a thumbnail, chapter list, captions, speed control and full player controls.",
    cta: "Open videos",
    stats: [
      ["19", "app videos"],
      ["Supabase", "private media URLs"],
      ["VTT", "subtitle tracks"],
    ],
    featureCards: [
      ["Private storage", "Videos, thumbnails and subtitles are signed server-side."],
      ["Player controls", "Speed, captions, volume, seeking, fullscreen and picture-in-picture."],
      ["Playlist view", "Thumbnails, search and categories keep the full library easy to scan."],
    ],
  },
  de: {
    eyebrow: "Produkt-Videothek",
    title: "Alle 1Cati App-Videos in einem passenden Player.",
    body: "Die 19 App-Videos werden aus der Supabase-Videothek geladen, sobald Storage konfiguriert ist. Jeder Eintrag hat Thumbnail, Kapitel, Untertitel, Tempo und volle Player-Steuerung.",
    cta: "Videos oeffnen",
    stats: [
      ["19", "App-Videos"],
      ["Supabase", "private Media-URLs"],
      ["VTT", "Untertitel"],
    ],
    featureCards: [
      ["Private Ablage", "Videos, Thumbnails und Untertitel werden serverseitig signiert."],
      ["Player-Kontrollen", "Tempo, Untertitel, Lautstaerke, Suche, Vollbild und Bild-im-Bild."],
      ["Playlist-Ansicht", "Thumbnails, Suche und Kategorien machen die Bibliothek scanbar."],
    ],
  },
  tr: {
    eyebrow: "Urun video kutuphanesi",
    title: "Tum 1Cati app videolarini tek player icinde izleyin.",
    body: "Storage ayarlandiginda 19 app videosu Supabase video kutuphanesinden yuklenir. Her kayitta thumbnail, bolumler, altyazi, hiz ve tam player kontrolleri bulunur.",
    cta: "Videolari ac",
    stats: [
      ["19", "app videosu"],
      ["Supabase", "ozel media URL"],
      ["VTT", "altyazi"],
    ],
    featureCards: [
      ["Ozel depolama", "Video, thumbnail ve altyazi URLleri server tarafinda imzalanir."],
      ["Player kontrolleri", "Hiz, altyazi, ses, ileri-geri, tam ekran ve resim icinde resim."],
      ["Playlist gorunumu", "Thumbnail, arama ve kategoriler tum kutuphaneyi kolay okunur tutar."],
    ],
  },
  ru: {
    eyebrow: "Product video library",
    title: "Watch every 1Cati app video from one polished player.",
    body: "All 19 app videos are rendered from the Supabase video library when storage is configured. Each item has a thumbnail, chapter list, captions, speed control and full player controls.",
    cta: "Open videos",
    stats: [
      ["19", "app videos"],
      ["Supabase", "private media URLs"],
      ["VTT", "subtitle tracks"],
    ],
    featureCards: [
      ["Private storage", "Videos, thumbnails and subtitles are signed server-side."],
      ["Player controls", "Speed, captions, volume, seeking, fullscreen and picture-in-picture."],
      ["Playlist view", "Thumbnails, search and categories keep the full library easy to scan."],
    ],
  },
} as const

export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveVideoLocale(rawLocale)
  const copy = pageCopy[locale]
  const library = await getVideoLibrary(locale)

  return (
    <main id="main" className="min-h-screen overflow-hidden bg-background">
      <Navbar />

      <section className="relative isolate pt-28 pb-8 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_16%,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_34%),radial-gradient(circle_at_88%_24%,color-mix(in_srgb,var(--accent)_13%,transparent),transparent_31%),linear-gradient(180deg,var(--background),color-mix(in_srgb,var(--primary)_5%,var(--background)))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-border" />

        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)] lg:px-8">
          <div className="max-w-4xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-black tracking-[0.16em] text-primary uppercase shadow-sm">
              <Video className="h-4 w-4" aria-hidden="true" />
              {copy.eyebrow}
            </span>
            <h1 className="mt-5 max-w-5xl text-4xl leading-[1.05] font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {copy.body}
            </p>
            <a
              className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90"
              href="#video-library"
            >
              <ArrowDownCircle className="h-5 w-5" aria-hidden="true" />
              {copy.cta}
            </a>
          </div>

          <div className="premium-surface grid content-between gap-5 rounded-3xl p-5">
            <div className="grid gap-3">
              {copy.stats.map(([value, label]) => (
                <div
                  key={`${value}-${label}`}
                  className="rounded-2xl border border-border bg-card/76 p-4"
                >
                  <div className="text-2xl font-black text-foreground">{value}</div>
                  <div className="mt-1 text-xs font-black tracking-[0.14em] text-muted-foreground uppercase">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-4 pb-5 sm:px-6 lg:grid-cols-3 lg:px-8">
        {copy.featureCards.map(([title, body], index) => {
          const Icon = index === 0 ? ShieldCheck : index === 1 ? Gauge : Captions
          return (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card/82 p-4 shadow-sm backdrop-blur"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base font-black text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          )
        })}
      </section>

      <VideoLibraryPlayer library={library} locale={locale} />

      <Footer />
      <SiteConcierge page="videos" />
    </main>
  )
}
