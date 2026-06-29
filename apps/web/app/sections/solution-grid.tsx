"use client"

import Image from "next/image"
import { useLocale } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  BadgeCheck,
  Building2,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
  Network,
  ShieldCheck,
  Smartphone,
  TicketCheck,
  Users,
  WalletCards,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Operasyon flipbook",
    title: "Satis, site yonetimi, finans ve servis ayni ERP kaydinda bulusur",
    subtitle:
      "Bu bolum kart listesi degil; Ataberk Estate ekibinin gunluk isi nasil okudugunu gosterir: kisi, daire, servis, finans, belge ve rol kararlari tek kayit uzerinde farkli akislar olarak calisir.",
    primaryCta: "Canli calisma alanina gir",
    secondaryCta: "Site modelini incele",
    scrollHint: "Kaydirarak urun akislarini ac",
    liveLabel: "Tek sistem kaydi",
    chapters: [
      {
        label: "CRM",
        title: "Lead, malik ve sakin tek kisi profilinde baslar",
        text:
          "WhatsApp, telefon, e-posta ve ofis gorusmeleri ayni kisi kaydinda toplanir. Dil, butce, kanal, sorumlu ekip ve sonraki aksiyon kaybolmaz.",
        image: "/new-level-premium/resort-exterior.jpg",
        alt: "New Level Premium exterior and shared facilities",
        icon: Users,
        metrics: [
          ["150", "kisi profili"],
          ["4", "dil"],
          ["1", "musteri kaydi"],
        ],
        modules: [
          ["CRM kaydi", "Lead, malik, kiraci ve misafir iliskisi"],
          ["Iletisim akisi", "WhatsApp, e-posta ve bildirim baglami"],
          ["Rol filtresi", "Herkes yalnizca isine gereken ekrani gorur"],
        ],
      },
      {
        label: "Daire matrisi",
        title: "Blok, kat ve daire durumu canli envantere donusur",
        text:
          "769 daire, blok-kat mantigi, doluluk, borc, bakim, rezervasyon ve yayin hazirligi ile birlikte filtrelenir. Excel yerine tek kaynak kullanilir.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium masterplan aerial view",
        icon: Building2,
        metrics: [
          ["769", "daire"],
          ["7", "blok"],
          ["51%", "doluluk"],
        ],
        modules: [
          ["Daire matrisi", "Blok, kat, durum ve fiyat gorunurlugu"],
          ["Portfoy hazirligi", "EIDS, belge ve yayin kontrolu"],
          ["Saha modeli", "Site, sosyal alan ve ortak alan baglantisi"],
        ],
      },
      {
        label: "Servis",
        title: "Servis talebi sohbetten cikarak kanitli ise donusur",
        text:
          "Temizlik, transfer, bakim ve ozel talepler SLA, sorumlu kisi, fotograf kaniti, borc kontrolu ve kapatma onayi ile takip edilir.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [
          ["89", "acik is"],
          ["4", "SLA riski"],
          ["2", "kanit adimi"],
        ],
        modules: [
          ["Servis katalogu", "Fiyat, SLA ve ekip atamasi"],
          ["Mobil saha", "Foto, not ve durum guncellemesi"],
          ["Takvim", "Giris, cikis, temizlik ve ziyaret plani"],
        ],
      },
      {
        label: "Finans",
        title: "Aidat, depozito ve erisim karari tek kontrol motorunda calisir",
        text:
          "Tahsilat, borc, depozito, iade, kur farki ve erisim kisiti ayni karar zeminine baglanir. Servis oncesi finans riski gorulur.",
        image: "/new-level-premium/showroom-bedroom.jpg",
        alt: "New Level Premium furnished showroom bedroom",
        icon: WalletCards,
        metrics: [
          ["1.4M ₺", "tahsilat"],
          ["6", "erisim kisiti"],
          ["0", "kopuk tablo"],
        ],
        modules: [
          ["Finans defteri", "Aidat, tahsilat ve bakiye"],
          ["Depozito akisi", "Iade, kesinti ve onay"],
          ["Erisim motoru", "QR, kart, plaka ve borc sinyali"],
        ],
      },
      {
        label: "Yonetim AI",
        title: "AI her rol icin farkli sonraki aksiyonu aciklar",
        text:
          "Yonetim, muhasebe, saha ekibi, malik ve kiraci ayni veriden farkli cevap alir. Raporlar, belgeler ve audit izi karar guvenini korur.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [
          ["8", "AI riski"],
          ["15", "modul plani"],
          ["24/7", "rol baglami"],
        ],
        modules: [
          ["AI rapor merkezi", "Risk, borc, SLA ve aksiyon ozeti"],
          ["Belge merkezi", "TAPU, DASK, sozlesme ve KYC"],
          ["Erisim gecmisi", "Kimin hangi karar ve kaydi acabilecegi nettir"],
        ],
      },
    ],
  },
  en: {
    eyebrow: "Operational flipbook",
    title: "Sales, site management, finance and service meet on one ERP record",
    subtitle:
      "This is not a list of cards. It is the operating model Ataberk Estate uses every day: people, units, service, finance, documents and role decisions run as connected workflows on one record.",
    primaryCta: "Enter live workspace",
    secondaryCta: "Review site model",
    scrollHint: "Scroll to open the product flow",
    liveLabel: "One system record",
    chapters: [
      {
        label: "CRM",
        title: "Lead, owner and resident start as one person profile",
        text:
          "WhatsApp, phone, email and office conversations land on the same person record. Language, budget, channel, responsible team and next action do not disappear.",
        image: "/new-level-premium/resort-exterior.jpg",
        alt: "New Level Premium exterior and shared facilities",
        icon: Users,
        metrics: [
          ["150", "people profiles"],
          ["4", "languages"],
          ["1", "customer record"],
        ],
        modules: [
          ["CRM record", "Lead, owner, tenant and guest relation"],
          ["Communication flow", "WhatsApp, email and notification context"],
          ["Role filter", "Each user sees only what their work needs"],
        ],
      },
      {
        label: "Unit matrix",
        title: "Block, floor and unit status become live inventory",
        text:
          "769 units are filtered by block, floor, occupancy, debt, maintenance, reservation and publishing readiness. The spreadsheet becomes one source of truth.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium masterplan aerial view",
        icon: Building2,
        metrics: [
          ["769", "units"],
          ["7", "blocks"],
          ["51%", "occupied"],
        ],
        modules: [
          ["Unit matrix", "Block, floor, status and price visibility"],
          ["Portfolio readiness", "EIDS, document and publish controls"],
          ["Site model", "Property, amenity and common-area linkage"],
        ],
      },
      {
        label: "Service",
        title: "A service request becomes evidence-based work, not chat noise",
        text:
          "Cleaning, transfer, maintenance and special requests are tracked with SLA, assignee, photo proof, debt context and closure approval.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [
          ["89", "open work"],
          ["4", "SLA risks"],
          ["2", "proof steps"],
        ],
        modules: [
          ["Service catalogue", "Price, SLA and team assignment"],
          ["Mobile field", "Photo, note and status update"],
          ["Calendar", "Move-in, checkout, cleaning and visits"],
        ],
      },
      {
        label: "Finance",
        title: "Dues, deposits and access decisions use one control engine",
        text:
          "Collection, debt, deposit, refund, currency exposure and access restriction sit on the same decision layer. Finance risk is visible before service is routed.",
        image: "/new-level-premium/showroom-bedroom.jpg",
        alt: "New Level Premium furnished showroom bedroom",
        icon: WalletCards,
        metrics: [
          ["1.4M ₺", "collected"],
          ["6", "access holds"],
          ["0", "stray sheets"],
        ],
        modules: [
          ["Finance ledger", "Dues, collection and balance"],
          ["Deposit flow", "Refund, deduction and approval"],
          ["Access engine", "QR, card, plate and debt signal"],
        ],
      },
      {
        label: "Management AI",
        title: "AI explains the next action differently for every role",
        text:
          "Management, accounting, field staff, owners and tenants receive different answers from the same data. Reports, documents and audit trails preserve decision trust.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [
          ["8", "AI risks"],
          ["15", "module plan"],
          ["24/7", "role context"],
        ],
        modules: [
          ["AI report center", "Risk, debt, SLA and action summary"],
          ["Document center", "TAPU, DASK, contract and KYC"],
          ["Access history", "Who can open each record and decision is clear"],
        ],
      },
    ],
  },
  de: {
    eyebrow: "Operationales Flipbook",
    title: "Vertrieb, Standortbetrieb, Finanzen und Service treffen sich im ERP-Datensatz",
    subtitle:
      "Nicht als Kartenliste, sondern als Betriebsmodell: Personen, Einheiten, Service, Finanzen, Dokumente und Rollenentscheidungen laufen als verbundene Ablaufe.",
    primaryCta: "Arbeitsbereich offnen",
    secondaryCta: "Standortmodell ansehen",
    scrollHint: "Scrollen, um den Produktfluss zu offnen",
    liveLabel: "Ein Systemdatensatz",
    chapters: [
      {
        label: "CRM",
        title: "Lead, Eigentumer und Bewohner starten als Personenprofil",
        text:
          "WhatsApp, Telefon, E-Mail und Burogesprache landen in einem Profil. Sprache, Budget, Kanal, Team und nachste Aktion bleiben nachvollziehbar.",
        image: "/new-level-premium/resort-exterior.jpg",
        alt: "New Level Premium exterior and shared facilities",
        icon: Users,
        metrics: [["150", "Profile"], ["4", "Sprachen"], ["1", "Kundensatz"]],
        modules: [["CRM", "Lead, Eigentumer, Mieter und Gast"], ["Kommunikation", "WhatsApp, E-Mail und Benachrichtigung"], ["Rollen", "Nur relevante Arbeit ist sichtbar"]],
      },
      {
        label: "Einheiten",
        title: "Block, Etage und Einheit werden Live-Inventar",
        text:
          "769 Einheiten werden nach Block, Etage, Belegung, Schuld, Wartung, Reservierung und Veroffentlichung gefiltert.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium masterplan aerial view",
        icon: Building2,
        metrics: [["769", "Einheiten"], ["7", "Blocke"], ["51%", "belegt"]],
        modules: [["Matrix", "Block, Etage, Status und Preis"], ["Portfolio", "EIDS, Dokument und Freigabe"], ["Standort", "Anlage, Flache und Gemeinschaftsbereich"]],
      },
      {
        label: "Service",
        title: "Service wird belegbare Arbeit statt Chat-Verlauf",
        text:
          "Reinigung, Transfer, Wartung und Sonderwunsche laufen mit SLA, Zustander, Fotobeweis, Schuldbezug und Abschlussfreigabe.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [["89", "offene Arbeiten"], ["4", "SLA-Risiken"], ["2", "Beweisschritte"]],
        modules: [["Katalog", "Preis, SLA und Team"], ["Mobil", "Foto, Notiz und Status"], ["Kalender", "Einzug, Auszug, Reinigung und Besuch"]],
      },
      {
        label: "Finanzen",
        title: "Beitrage, Kautionen und Zutritt nutzen eine Kontrolllogik",
        text:
          "Einzug, Schuld, Kaution, Ruckgabe, Wechselkurs und Zugriffssperre liegen auf derselben Entscheidungsebene.",
        image: "/new-level-premium/showroom-bedroom.jpg",
        alt: "New Level Premium furnished showroom bedroom",
        icon: WalletCards,
        metrics: [["1.4M ₺", "Einzug"], ["6", "Sperren"], ["0", "Insellisten"]],
        modules: [["Ledger", "Beitrag, Einzug und Saldo"], ["Kaution", "Ruckgabe, Abzug und Freigabe"], ["Zutritt", "QR, Karte, Kennzeichen und Schuld"]],
      },
      {
        label: "Management AI",
        title: "AI erklart die nachste Aktion je Rolle anders",
        text:
          "Management, Buchhaltung, Feldteam, Eigentumer und Mieter erhalten rollenspezifische Antworten aus denselben Daten.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [["8", "AI-Risiken"], ["15", "Module"], ["24/7", "Rollenbezug"]],
        modules: [["AI Reports", "Risiko, Schuld, SLA und Aktion"], ["Dokumente", "TAPU, DASK, Vertrag und KYC"], ["Zugriffsverlauf", "Rollen und Freigaben bleiben sichtbar"]],
      },
    ],
  },
  ru: {
    eyebrow: "Operational flipbook",
    title: "Sales, site work, finance and service share one ERP record",
    subtitle:
      "The public product story shows how people, units, service, finance, documents and role decisions run as connected workflows.",
    primaryCta: "Enter workspace",
    secondaryCta: "Review site model",
    scrollHint: "Scroll to open the product flow",
    liveLabel: "One system record",
    chapters: [],
  },
} satisfies Record<LocaleKey, {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  scrollHint: string
  liveLabel: string
  chapters: Array<{
    label: string
    title: string
    text: string
    image: string
    alt: string
    icon: LucideIcon
    metrics: Array<[string, string]>
    modules: Array<[string, string]>
  }>
}>

const fallbackChapters = copy.en.chapters

const chapterIcons = [MessageSquareText, Building2, Smartphone, CircleDollarSign, ShieldCheck]

export function SolutionGrid() {
  const locale = useLocale()
  const localized = copy[(locale as LocaleKey) in copy ? (locale as LocaleKey) : "tr"]
  const chapters = useMemo(
    () => (localized.chapters.length > 0 ? localized.chapters : fallbackChapters),
    [localized.chapters]
  )
  const rootRef = useRef<HTMLElement>(null)
  const imageRefs = useRef<Array<HTMLDivElement | null>>([])
  const pageRefs = useRef<Array<HTMLDivElement | null>>([])
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const desktop = window.matchMedia("(min-width: 1024px)").matches
    if (reduced || !desktop) return

    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      gsap.registerPlugin(ScrollTrigger)

      const images = imageRefs.current.filter(Boolean)
      const pages = pageRefs.current.filter(Boolean)

      gsap.set(images, { autoAlpha: 0, scale: 1.08 })
      gsap.set(images[0], { autoAlpha: 1, scale: 1 })
      gsap.set(pages, {
        autoAlpha: 0,
        y: 34,
        rotateY: -9,
        transformOrigin: "left center",
      })
      gsap.set(pages[0], { autoAlpha: 1, y: 0, rotateY: 0 })

      let activeIndex = 0
      const showStage = (nextIndex: number) => {
        if (nextIndex === activeIndex) return
        const previousIndex = activeIndex
        activeIndex = nextIndex
        setActiveChapter(nextIndex)

        gsap.to(images[previousIndex], {
          autoAlpha: 0,
          scale: 1.12,
          duration: 0.28,
          overwrite: "auto",
        })
        gsap.to(images[nextIndex], {
          autoAlpha: 1,
          scale: 1,
          duration: 0.35,
          overwrite: "auto",
        })
        gsap.to(pages[previousIndex], {
          autoAlpha: 0,
          y: -24,
          rotateY: 7,
          duration: 0.18,
          overwrite: "auto",
        })
        gsap.fromTo(
          pages[nextIndex],
          { autoAlpha: 0, y: 28, rotateY: -9 },
          { autoAlpha: 1, y: 0, rotateY: 0, duration: 0.28, overwrite: "auto" }
        )
      }

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        onUpdate: (self) => {
          const nextIndex = Math.min(
            chapters.length - 1,
            Math.floor(self.progress * chapters.length)
          )
          showStage(nextIndex)
        },
      })

      cleanup = () => {
        trigger.kill()
      }
    })().catch(() => undefined)

    return () => cleanup?.()
  }, [chapters.length])

  const jumpToChapter = (index: number) => {
    const root = rootRef.current
    if (!root) return
    const top = root.getBoundingClientRect().top + window.scrollY
    const range = Math.max(root.offsetHeight - window.innerHeight, 0)
    const target = top + range * ((index + 0.12) / chapters.length)
    setActiveChapter(index)
    window.scrollTo({ top: target, behavior: "smooth" })
  }

  return (
    <section
      ref={rootRef}
      id="modules"
      data-testid="solution-grid"
      className="relative bg-[#f4f8f6]"
    >
      <div className="container py-12 md:py-16">
        <ScrollReveal className="grid gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-primary shadow-sm">
              <Network className="h-3.5 w-3.5" />
              {localized.eyebrow}
            </span>
            <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              {localized.title}
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-muted-foreground lg:justify-self-end">
            {localized.subtitle}
          </p>
        </ScrollReveal>
      </div>

      <div className="relative lg:min-h-[300svh]">
        <div className="relative overflow-hidden border-y border-border/60 bg-[#061613] text-white lg:sticky lg:top-0 lg:min-h-svh">
          <div className="absolute inset-0 hidden lg:block">
            {chapters.map((chapter, index) => (
              <div
                key={chapter.label}
                ref={(node) => {
                  imageRefs.current[index] = node
                }}
                className={cn("absolute inset-0", index > 0 && "opacity-0")}
              >
                <Image
                  src={chapter.image}
                  alt={chapter.alt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,10,0.94)_0%,rgba(2,12,10,0.72)_42%,rgba(2,12,10,0.46)_100%)]" />
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(50,214,189,0.24),transparent_28%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#061613] to-transparent" />

          <div className="relative z-10 container grid gap-8 py-10 lg:min-h-svh lg:grid-cols-[minmax(0,0.78fr)_minmax(520px,1fr)_220px] lg:items-center lg:py-12 xl:grid-cols-[260px_minmax(620px,1fr)_240px]">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/16 bg-white/10 px-4 py-2 text-xs font-black text-emerald-100 shadow-sm backdrop-blur">
                <BadgeCheck className="h-4 w-4" />
                {localized.liveLabel}
              </div>
              <h3 className="mt-5 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                {localized.scrollHint}
              </h3>
              <p className="mt-5 text-sm leading-7 text-white/68 sm:text-base">
                People, units, finance, service, documents and AI summaries stay connected without forcing every team into one linear path.
              </p>
              <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row lg:flex-col">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-white px-6 text-sm font-black text-[#061613] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  {localized.primaryCta}
                </Link>
                <a
                  href="#new-level"
                  className="inline-flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-white/18 bg-white/10 px-6 text-sm font-bold text-white shadow-sm backdrop-blur transition hover:bg-white/16"
                >
                  <FileCheck2 className="h-4 w-4" />
                  {localized.secondaryCta}
                </a>
              </div>
            </div>

            <div className="relative min-h-[760px] lg:min-h-[540px]">
              {chapters.map((chapter, index) => {
                const ChapterIcon = chapter.icon
                const SignalIcon = chapterIcons[index] ?? ShieldCheck

                return (
                  <div
                    key={chapter.label}
                    ref={(node) => {
                      pageRefs.current[index] = node
                    }}
                    className={cn(
                      "mb-5 rounded-[1.75rem] border border-white/14 bg-[#071b18]/86 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:absolute lg:inset-0 lg:mb-0 lg:p-5",
                      index > 0 && "lg:opacity-0"
                    )}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[1.25rem] border border-white/12 lg:hidden">
                      <Image
                        src={chapter.image}
                        alt={chapter.alt}
                        fill
                        sizes="(max-width: 1024px) 100vw, 1px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071b18]/70 to-transparent" />
                    </div>

                    <div className="grid min-h-full gap-4 lg:grid-rows-[auto_1fr_auto]">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/14 bg-white/10 text-emerald-100">
                            <ChapterIcon className="h-5 w-5" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100/72">
                              0{index + 1} / {chapter.label}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-white/50">
                              Connected workspace
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-emerald-200/20 bg-emerald-200/12 px-3 py-1 text-xs font-black text-emerald-100">
                          Operational record
                        </span>
                      </div>

                      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_200px] lg:items-center">
                        <div>
                          <h4 className="mt-5 max-w-2xl text-3xl font-black leading-tight text-white sm:text-4xl lg:mt-0 lg:text-[2.3rem] xl:text-[2.45rem]">
                            {chapter.title}
                          </h4>
                          <p className="mt-5 max-w-xl text-base leading-8 text-white/72">
                            {chapter.text}
                          </p>
                        </div>

                        <div className="rounded-[1.35rem] border border-white/12 bg-white/[0.075] p-4 shadow-xl shadow-black/20">
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-[0.12em] text-white/48">
                                Current view
                              </p>
                              <p className="mt-1 text-sm font-black text-white">
                                Team access
                              </p>
                            </div>
                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-emerald-100">
                              <SignalIcon className="h-5 w-5" />
                            </span>
                          </div>
                          <div className="space-y-3">
                            {chapter.metrics.map(([value, label]) => (
                              <div
                                key={`${chapter.label}-${value}-${label}`}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/18 px-3 py-2"
                              >
                                <span className="text-xl font-black text-white">{value}</span>
                                <span className="text-right text-xs font-semibold text-white/58">
                                  {label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        {chapter.modules.map(([title, detail]) => (
                          <div
                            key={`${chapter.label}-${title}`}
                            className="rounded-2xl border border-white/10 bg-white/[0.065] p-4"
                          >
                            <div className="mb-4 h-1.5 w-10 rounded-full bg-emerald-200/70" />
                            <h5 className="text-sm font-black text-white">{title}</h5>
                            <p className="mt-2 text-xs leading-5 text-white/58">{detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="hidden lg:block">
              <div className="relative rounded-[1.75rem] border border-white/14 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
                <div className="absolute bottom-7 left-9 top-7 w-px bg-white/14" />
                <div className="space-y-3">
                  {chapters.map((chapter, index) => {
                    const Icon = chapter.icon
                    const isActive = activeChapter === index
                    return (
                      <button
                        key={chapter.label}
                        type="button"
                        onClick={() => jumpToChapter(index)}
                        aria-current={isActive ? "step" : undefined}
                        className={cn(
                          "relative z-10 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                          isActive
                            ? "bg-white/14 text-white"
                            : "text-white/58 hover:bg-white/8 hover:text-white"
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
                            isActive
                              ? "border-emerald-100/36 bg-emerald-100/14 text-emerald-100"
                              : "border-white/12 bg-black/18"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0">
                          <span
                            className={cn(
                              "block text-[11px] font-black",
                              isActive ? "text-emerald-100/76" : "text-white/40"
                            )}
                          >
                            0{index + 1}
                          </span>
                          <span className="block truncate text-sm font-black">
                            {chapter.label}
                          </span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
