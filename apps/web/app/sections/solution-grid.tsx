"use client"

import Image from "next/image"
import { useLocale } from "next-intl"
import { useEffect, useMemo, useRef, useState } from "react"
import { motion, useReducedMotion } from "framer-motion"
import {
  Building2,
  CircleDollarSign,
  FileCheck2,
  Gauge,
  LayoutDashboard,
  MessageSquareText,
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
    eyebrow: "Operasyon akışı",
    title: "Satış, site yönetimi, finans ve servis aynı ERP kaydında buluşur",
    subtitle:
      "Bu bölüm kart listesi değil; Ataberk Estate ekibinin günlük işi nasıl okuduğunu gösterir: kişi, daire, servis, finans, belge ve rol kararları tek kayıt üzerinde farklı akışlar olarak çalışır.",
    primaryCta: "Canlı çalışma alanına gir",
    secondaryCta: "Site modelini incele",
    scrollHint: "Kaydırarak ürün akışlarını aç",
    flowText:
      "Kişi, daire, finans, servis, belge ve AI özetleri, her ekibi tek bir doğrusal akışa zorlamadan birbirine bağlı kalır.",
    liveLabel: "Tek sistem kaydı",
    workspaceLabel: "Bağlantılı çalışma alanı",
    recordLabel: "Operasyon kaydı",
    currentViewLabel: "Güncel görünüm",
    teamAccessLabel: "Ekip erişimi",
    chapters: [
      {
        label: "CRM",
        title: "Lead, malik ve sakin tek kişi profilinde başlar",
        text:
          "WhatsApp, telefon, e-posta ve ofis görüşmeleri aynı kişi kaydında toplanır. Dil, bütçe, kanal, sorumlu ekip ve sonraki aksiyon kaybolmaz.",
        image: "/new-level-premium/resort-exterior.jpg",
        alt: "New Level Premium exterior and shared facilities",
        icon: Users,
        metrics: [
          ["150", "kişi profili"],
          ["4", "dil"],
          ["1", "müşteri kaydı"],
        ],
        modules: [
          ["CRM kaydı", "Lead, malik, kiracı ve misafir ilişkisi"],
          ["İletişim akışı", "WhatsApp, e-posta ve bildirim bağlamı"],
          ["Rol filtresi", "Herkes yalnızca işine gereken ekranı görür"],
        ],
      },
      {
        label: "Daire matrisi",
        title: "Blok, kat ve daire durumu canlı envantere dönüşür",
        text:
          "769 daire, blok-kat mantığı, doluluk, borç, bakım, rezervasyon ve yayın hazırlığı ile birlikte filtrelenir. Excel yerine tek kaynak kullanılır.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium masterplan aerial view",
        icon: Building2,
        metrics: [
          ["769", "daire"],
          ["7", "blok"],
          ["51%", "doluluk"],
        ],
        modules: [
          ["Daire matrisi", "Blok, kat, durum ve fiyat görünürlüğü"],
          ["Portföy hazırlığı", "EİDS, belge ve yayın kontrolü"],
          ["Saha modeli", "Site, sosyal alan ve ortak alan bağlantısı"],
        ],
      },
      {
        label: "Servis",
        title: "Servis talebi sohbetten çıkarak kanıtlı işe dönüşür",
        text:
          "Temizlik, transfer, bakım ve özel talepler termin, sorumlu kişi, fotoğraf kanıtı, borç kontrolü ve kapatma onayı ile takip edilir.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [
          ["89", "açık iş"],
          ["4", "termin riski"],
          ["2", "kanıt adımı"],
        ],
        modules: [
          ["Servis kataloğu", "Fiyat, termin ve ekip ataması"],
          ["Mobil saha", "Foto, not ve durum güncellemesi"],
          ["Takvim", "Giriş, çıkış, temizlik ve ziyaret planı"],
        ],
      },
      {
        label: "Finans",
        title: "Aidat, depozito ve erişim kararı tek kontrol motorunda çalışır",
        text:
          "Tahsilat, borç, depozito, iade, kur farkı ve erişim kısıtı aynı karar zeminine bağlanır. Servis öncesi finans riski görülür.",
        image: "/new-level-premium/showroom-bedroom.jpg",
        alt: "New Level Premium furnished showroom bedroom",
        icon: WalletCards,
        metrics: [
          ["1.4M ₺", "tahsilat"],
          ["6", "erişim kısıtı"],
          ["0", "kopuk tablo"],
        ],
        modules: [
          ["Finans defteri", "Aidat, tahsilat ve bakiye"],
          ["Depozito akışı", "İade, kesinti ve onay"],
          ["Erişim motoru", "QR, kart, plaka ve borç sinyali"],
        ],
      },
      {
        label: "Yönetim AI",
        title: "AI her rol için farklı sonraki aksiyonu açıklar",
        text:
          "Yönetim, muhasebe, saha ekibi, malik ve kiracı aynı veriden farklı cevap alır. Raporlar, belgeler ve denetim izi karar güvenini korur.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [
          ["8", "AI riski"],
          ["15", "modül planı"],
          ["24/7", "rol bağlamı"],
        ],
        modules: [
          ["AI rapor merkezi", "Risk, borç, termin ve aksiyon özeti"],
          ["Belge merkezi", "TAPU, DASK, sözleşme ve kimlik doğrulama"],
          ["Erişim geçmişi", "Kimin hangi karar ve kaydı açabileceği nettir"],
        ],
      },
    ],
  },
  en: {
    eyebrow: "Operational walkthrough",
    title: "Sales, site management, finance and service meet on one ERP record",
    subtitle:
      "This is not a list of cards. It is the operating model Ataberk Estate uses every day: people, units, service, finance, documents and role decisions run as connected workflows on one record.",
    primaryCta: "Enter live workspace",
    secondaryCta: "Review site model",
    scrollHint: "Scroll to open the product flow",
    flowText:
      "People, units, finance, service, documents and AI summaries stay connected without forcing every team into one linear path.",
    liveLabel: "One system record",
    workspaceLabel: "Connected workspace",
    recordLabel: "Operational record",
    currentViewLabel: "Current view",
    teamAccessLabel: "Team access",
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
          "Cleaning, transfer, maintenance and special requests are tracked with response time, assignee, photo proof, debt context and closure approval.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [
          ["89", "open work"],
          ["4", "deadline risks"],
          ["2", "proof steps"],
        ],
        modules: [
          ["Service catalogue", "Price, response time and team assignment"],
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
          "Management, accounting, field staff, owners and tenants receive different answers from the same data. Reports, documents and activity history preserve decision trust.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [
          ["8", "AI risks"],
          ["15", "module plan"],
          ["24/7", "role context"],
        ],
        modules: [
          ["AI report center", "Risk, debt, response time and action summary"],
          ["Document center", "TAPU, DASK, contract and identity check"],
          ["Access history", "Who can open each record and decision is clear"],
        ],
      },
    ],
  },
  de: {
    eyebrow: "Operativer Ablauf",
    title: "Vertrieb, Standortbetrieb, Finanzen und Service treffen sich im ERP-Datensatz",
    subtitle:
      "Nicht als Kartenliste, sondern als Betriebsmodell: Personen, Einheiten, Service, Finanzen, Dokumente und Rollenentscheidungen laufen als verbundene Abläufe.",
    primaryCta: "Arbeitsbereich öffnen",
    secondaryCta: "Standortmodell ansehen",
    scrollHint: "Scrollen, um den Produktfluss zu öffnen",
    flowText:
      "Personen, Einheiten, Finanzen, Service, Dokumente und KI-Zusammenfassungen bleiben verbunden, ohne jedes Team in einen linearen Ablauf zu zwingen.",
    liveLabel: "Ein Systemdatensatz",
    workspaceLabel: "Verbundener Arbeitsbereich",
    recordLabel: "Betriebsdatensatz",
    currentViewLabel: "Aktuelle Ansicht",
    teamAccessLabel: "Teamzugang",
    chapters: [
      {
        label: "CRM",
        title: "Lead, Eigentümer und Bewohner starten als Personenprofil",
        text:
          "WhatsApp, Telefon, E-Mail und Bürogespräche landen in einem Profil. Sprache, Budget, Kanal, Team und nächste Aktion bleiben nachvollziehbar.",
        image: "/new-level-premium/resort-exterior.jpg",
        alt: "New Level Premium exterior and shared facilities",
        icon: Users,
        metrics: [["150", "Profile"], ["4", "Sprachen"], ["1", "Kundensatz"]],
        modules: [["CRM", "Lead, Eigentümer, Mieter und Gast"], ["Kommunikation", "WhatsApp, E-Mail und Benachrichtigung"], ["Rollen", "Nur relevante Arbeit ist sichtbar"]],
      },
      {
        label: "Einheiten",
        title: "Block, Etage und Einheit werden Live-Inventar",
        text:
          "769 Einheiten werden nach Block, Etage, Belegung, Schuld, Wartung, Reservierung und Veröffentlichung gefiltert.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium masterplan aerial view",
        icon: Building2,
        metrics: [["769", "Einheiten"], ["7", "Blöcke"], ["51%", "belegt"]],
        modules: [["Matrix", "Block, Etage, Status und Preis"], ["Portfolio", "EIDS, Dokument und Freigabe"], ["Standort", "Anlage, Fläche und Gemeinschaftsbereich"]],
      },
      {
        label: "Service",
        title: "Service wird belegbare Arbeit statt Chat-Verlauf",
        text:
          "Reinigung, Transfer, Wartung und Sonderwünsche laufen mit Reaktionszeit, Zuständigkeit, Fotobeweis, Schuldbezug und Abschlussfreigabe.",
        image: "/new-level-premium/site-progress-2026.jpg",
        alt: "New Level Premium June 2026 site progress",
        icon: TicketCheck,
        metrics: [["89", "offene Arbeiten"], ["4", "Terminrisiken"], ["2", "Beweisschritte"]],
        modules: [["Katalog", "Preis, Reaktionszeit und Team"], ["Mobil", "Foto, Notiz und Status"], ["Kalender", "Einzug, Auszug, Reinigung und Besuch"]],
      },
      {
        label: "Finanzen",
        title: "Beiträge, Kautionen und Zutritt nutzen eine Kontrolllogik",
        text:
          "Einzug, Schuld, Kaution, Rückgabe, Wechselkurs und Zugriffssperre liegen auf derselben Entscheidungsebene.",
        image: "/new-level-premium/showroom-bedroom.jpg",
        alt: "New Level Premium furnished showroom bedroom",
        icon: WalletCards,
        metrics: [["1.4M ₺", "Einzug"], ["6", "Sperren"], ["0", "Insellisten"]],
        modules: [["Finanzbuch", "Beitrag, Einzug und Saldo"], ["Kaution", "Rückgabe, Abzug und Freigabe"], ["Zutritt", "QR, Karte, Kennzeichen und Schuld"]],
      },
      {
        label: "Management-KI",
        title: "KI erklärt die nächste Aktion je Rolle anders",
        text:
          "Management, Buchhaltung, Feldteam, Eigentümer und Mieter erhalten rollenspezifische Antworten aus denselben Daten.",
        image: "/new-level-premium/masterplan-aerial.jpg",
        alt: "New Level Premium site plan used for management reporting",
        icon: Gauge,
        metrics: [["8", "KI-Risiken"], ["15", "Module"], ["24/7", "Rollenbezug"]],
        modules: [["KI-Berichte", "Risiko, Schuld, Reaktionszeit und Aktion"], ["Dokumente", "TAPU, DASK, Vertrag und Identitätsprüfung"], ["Zugriffsverlauf", "Rollen und Freigaben bleiben sichtbar"]],
      },
    ],
  },
  ru: {
    eyebrow: "Операционный обзор",
    title: "Sales, site work, finance and service share one ERP record",
    subtitle:
      "The public product story shows how people, units, service, finance, documents and role decisions run as connected workflows.",
    primaryCta: "Enter workspace",
    secondaryCta: "Review site model",
    scrollHint: "Scroll to open the product flow",
    flowText:
      "People, units, finance, service, documents and AI summaries stay connected without forcing every team into one linear path.",
    liveLabel: "One system record",
    workspaceLabel: "Connected workspace",
    recordLabel: "Operational record",
    currentViewLabel: "Current view",
    teamAccessLabel: "Team access",
    chapters: [],
  },
} satisfies Record<LocaleKey, {
  eyebrow: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta: string
  scrollHint: string
  flowText: string
  liveLabel: string
  workspaceLabel: string
  recordLabel: string
  currentViewLabel: string
  teamAccessLabel: string
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

const workflowLabels = {
  tr: {
    workspace: "Bağlantılı çalışma alanı",
    record: "Operasyonel kayıt",
    body:
      "Kişiler, daireler, finans, servis, belgeler ve AI özetleri her ekibi tek çizgiye zorlamadan bağlı kalır.",
  },
  en: {
    workspace: "Connected workspace",
    record: "Operational record",
    body:
      "People, units, finance, service, documents and AI summaries stay connected without forcing every team into one linear path.",
  },
  de: {
    workspace: "Vernetzter Arbeitsbereich",
    record: "Betriebsvorgang",
    body:
      "Personen, Einheiten, Finanzen, Service, Dokumente und KI-Zusammenfassungen bleiben verbunden, ohne jedes Team in einen linearen Ablauf zu zwingen.",
  },
  ru: {
    workspace: "Связанное рабочее пространство",
    record: "Операционная запись",
    body:
      "Люди, юниты, финансы, сервис, документы и AI-сводки остаются связанными без принудительного линейного процесса для всех команд.",
  },
} satisfies Record<LocaleKey, { workspace: string; record: string; body: string }>

const chapterIcons = [MessageSquareText, Building2, Smartphone, CircleDollarSign, ShieldCheck]

export function SolutionGrid() {
  const locale = useLocale()
  const localized = copy[(locale as LocaleKey) in copy ? (locale as LocaleKey) : "tr"]
  const labels = workflowLabels[(locale as LocaleKey) in workflowLabels ? (locale as LocaleKey) : "tr"]
  const chapters = useMemo(
    () => (localized.chapters.length > 0 ? localized.chapters : fallbackChapters),
    [localized.chapters]
  )
  const rootRef = useRef<HTMLElement>(null)
  const imageRefs = useRef<Array<HTMLDivElement | null>>([])
  const pageRefs = useRef<Array<HTMLDivElement | null>>([])
  const [activeChapter, setActiveChapter] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)")
    const update = () => setIsMobile(query.matches)
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
  }, [])

  // On mobile the GSAP flipbook is skipped; each stacked card gets a lightweight
  // fade + slide-up reveal instead. Desktop keeps the scroll-driven GSAP flow.
  const mobileReveal = isMobile && !reduceMotion

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
      id="workflows"
      data-testid="solution-grid"
      className="relative scroll-mt-24 bg-[#f4f8f6]"
    >
      <div className="container py-12 md:py-16">
        <ScrollReveal className="grid gap-6 lg:grid-cols-[0.82fr_1fr] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-primary/80">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
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
                  sizes="(min-width: 1024px) 100vw, 1px"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,12,10,0.94)_0%,rgba(2,12,10,0.72)_42%,rgba(2,12,10,0.46)_100%)]" />
                {chapter.image.includes("resort-exterior") ? (
                  <div className="pointer-events-none absolute right-0 bottom-0 h-40 w-72 bg-gradient-to-tl from-[#061613] via-[#061613]/75 to-transparent" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(50,214,189,0.24),transparent_28%),linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:auto,72px_72px,72px_72px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#061613] to-transparent" />

          <div className="relative z-10 container grid gap-8 py-10 lg:min-h-svh lg:grid-cols-[minmax(0,0.78fr)_minmax(520px,1fr)_220px] lg:items-center lg:py-12 xl:grid-cols-[260px_minmax(620px,1fr)_240px]">
            <div className="max-w-lg">
              <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-100/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                {localized.liveLabel}
              </div>
              <h3 className="mt-5 text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl">
                {localized.scrollHint}
              </h3>
              <p className="mt-5 text-sm leading-7 text-white/68 sm:text-base">
                {labels.body}
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
                  <motion.div
                    key={chapter.label}
                    ref={(node) => {
                      pageRefs.current[index] = node
                    }}
                    initial={mobileReveal ? { opacity: 0, y: 24 } : false}
                    whileInView={mobileReveal ? { opacity: 1, y: 0 } : undefined}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={
                      mobileReveal
                        ? {
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1],
                            delay: Math.min(index * 0.06, 0.24),
                          }
                        : undefined
                    }
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
                        sizes="(max-width: 640px) calc(100vw - 2rem), (max-width: 1024px) 720px, 1px"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#071b18]/70 to-transparent" />
                      {chapter.image.includes("resort-exterior") ? (
                        <div className="pointer-events-none absolute right-0 bottom-0 h-24 w-44 bg-gradient-to-tl from-[#071b18] via-[#071b18]/75 to-transparent" />
                      ) : null}
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
                              {labels.workspace}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-emerald-200/20 bg-emerald-200/12 px-3 py-1 text-xs font-black text-emerald-100">
                          {labels.record}
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
                                {localized.currentViewLabel}
                              </p>
                              <p className="mt-1 text-sm font-black text-white">
                                {localized.teamAccessLabel}
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
                  </motion.div>
                )
              })}
            </div>

            <div className="hidden lg:block">
              <div className="relative rounded-[1.75rem] border border-white/14 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl">
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
