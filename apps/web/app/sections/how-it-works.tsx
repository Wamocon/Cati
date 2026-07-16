"use client"

import { useEffect, useMemo, useRef } from "react"
import Image from "next/image"
import { useLocale } from "next-intl"
import {
  Activity,
  Building2,
  CalendarCheck,
  CircleDollarSign,
  FileText,
  MessageSquareText,
  ShieldCheck,
  TicketCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { CatiLogoMark } from "@/components/cati-logo"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

interface Flow {
  title: string
  text: string
  icon: LucideIcon
  accent: string
}

const copy = {
  tr: {
    eyebrow: "Bagli is akislari",
    title: "Tek ERP kaydi, birden fazla is akisi",
    subtitle:
      "Sistem tek bir dogruluk kaynagi kurar; satis, site yonetimi, finans, servis, rezervasyon ve raporlama kendi akisinda calisir.",
    center: "Ortak ERP kaydi",
    centerKicker: "Proje merkezi",
    centerProject: "Yeni Seviye Premium",
    centerStats: [
      ["769", "daire"],
      ["7", "blok"],
      ["52k", "m2 alan"],
    ],
    flows: [
      {
        title: "Site ve daire modeli",
        text: "Blok, kat, daire, durum, fiyat, belge ve ortak alan verisi ayni envantere baglanir.",
        icon: Building2,
        accent: "bg-teal-500",
      },
      {
        title: "Kisi ve rol baglantisi",
        text: "Malik, kiraci, personel, muhasebe ve yonetim yalnizca gerekli ekrani gorur.",
        icon: Users,
        accent: "bg-sky-500",
      },
      {
        title: "Finans ve karar kapisi",
        text: "Aidat, depozito, borc, mutabakat ve erisim karari ayni kontrol zemininde okunur.",
        icon: CircleDollarSign,
        accent: "bg-amber-500",
      },
      {
        title: "Servis ve saha isi",
        text: "Talep, borc kontrolu, ekip atama, fotograf kaniti ve kapanis raporu birlikte ilerler.",
        icon: TicketCheck,
        accent: "bg-rose-500",
      },
      {
        title: "Rezervasyon ve teslim",
        text: "Musaitlik, depozito, temizlik, kontrol, move-in ve checkout ayni zaman cizelgesine baglanir.",
        icon: CalendarCheck,
        accent: "bg-violet-500",
      },
      {
        title: "Belge, iletisim ve rapor",
        text: "TAPU, DASK, sozlesme, mesaj ve AI ozeti kaynak kayda bagli kalir.",
        icon: FileText,
        accent: "bg-emerald-500",
      },
    ],
  },
  en: {
    eyebrow: "Connected workflows",
    title: "One ERP record, several operating flows",
    subtitle:
      "The platform creates one source of truth while sales, site management, finance, service, booking and reporting keep their own professional workflow.",
    center: "Shared ERP record",
    centerKicker: "Project core",
    centerProject: "New Level Premium",
    centerStats: [
      ["769", "units"],
      ["7", "blocks"],
      ["52k", "sqm site"],
    ],
    flows: [
      {
        title: "Site and unit model",
        text: "Blocks, floors, units, status, price, documents and shared areas connect to one inventory.",
        icon: Building2,
        accent: "bg-teal-500",
      },
      {
        title: "People and role link",
        text: "Owner, tenant, staff, accounting and management see only the workspace their work needs.",
        icon: Users,
        accent: "bg-sky-500",
      },
      {
        title: "Finance decision gate",
        text: "Dues, deposit, debt, reconciliation and access decisions are read on the same control layer.",
        icon: CircleDollarSign,
        accent: "bg-amber-500",
      },
      {
        title: "Service and field work",
        text: "Request, debt check, assignment, photo proof and closure report move together.",
        icon: TicketCheck,
        accent: "bg-rose-500",
      },
      {
        title: "Booking and handover",
        text: "Availability, deposit, cleaning, inspection, move-in and checkout share one timeline.",
        icon: CalendarCheck,
        accent: "bg-violet-500",
      },
      {
        title: "Documents, messages and reports",
        text: "TAPU, DASK, contracts, messages and AI summaries stay source-linked.",
        icon: FileText,
        accent: "bg-emerald-500",
      },
    ],
  },
  de: {
    eyebrow: "Verbundene Abläufe",
    title: "Ein ERP-Datensatz, mehrere Betriebsabläufe",
    subtitle:
      "Die Plattform schafft eine gemeinsame Wahrheit, während Vertrieb, Standortbetrieb, Finanzen, Service, Buchung und Reporting ihre eigenen Abläufe behalten.",
    center: "Gemeinsamer ERP-Datensatz",
    centerKicker: "Projektkern",
    centerProject: "Neues Niveau Premium",
    centerStats: [
      ["769", "Einheiten"],
      ["7", "Blöcke"],
      ["52k", "m2 Areal"],
    ],
    flows: [
      {
        title: "Standort- und Einheitenmodell",
        text: "Blöcke, Etagen, Einheiten, Status, Preise, Dokumente und Gemeinschaftsflächen hängen an einem Inventar.",
        icon: Building2,
        accent: "bg-teal-500",
      },
      {
        title: "Personen- und Rollenbezug",
        text: "Eigentümer, Mieter, Personal, Buchhaltung und Management sehen nur den Arbeitsbereich, den sie brauchen.",
        icon: Users,
        accent: "bg-sky-500",
      },
      {
        title: "Finanz-Entscheidungstor",
        text: "Hausgeld, Kautionen, Schulden, Abgleich und Zugangsentscheidungen laufen auf derselben Kontrollebene.",
        icon: CircleDollarSign,
        accent: "bg-amber-500",
      },
      {
        title: "Service und Außendienst",
        text: "Anfrage, Schuldenprüfung, Zuweisung, Fotobeweis und Abschlussbericht bewegen sich gemeinsam.",
        icon: TicketCheck,
        accent: "bg-rose-500",
      },
      {
        title: "Buchung und Übergabe",
        text: "Verfügbarkeit, Kaution, Reinigung, Prüfung, Einzug und Check-out teilen eine gemeinsame Zeitachse.",
        icon: CalendarCheck,
        accent: "bg-violet-500",
      },
      {
        title: "Dokumente, Nachrichten und Berichte",
        text: "TAPU, DASK, Verträge, Nachrichten und KI-Zusammenfassungen bleiben mit dem Quelldatensatz verbunden.",
        icon: FileText,
        accent: "bg-emerald-500",
      },
    ],
  },
  ru: {
    eyebrow: "Connected workflows",
    title: "One ERP record, several operating flows",
    subtitle:
      "Sales, site management, finance, service, booking and reporting remain connected without becoming one forced linear process.",
    center: "Shared ERP record",
    centerKicker: "Project core",
    centerProject: "Новый уровень Премиум",
    centerStats: [
      ["769", "units"],
      ["7", "blocks"],
      ["52k", "sqm site"],
    ],
    flows: [],
  },
} satisfies Record<
  LocaleKey,
  {
    eyebrow: string
    title: string
    subtitle: string
    center: string
    centerKicker: string
    centerProject: string
    centerStats: Array<[string, string]>
    flows: Flow[]
  }
>

export function HowItWorks() {
  const locale = useLocale()
  const localized = copy[(locale as LocaleKey) in copy ? (locale as LocaleKey) : "tr"]
  const flows = useMemo(
    () => (localized.flows.length > 0 ? localized.flows : copy.en.flows),
    [localized.flows]
  )
  const pathRef = useRef<SVGPathElement>(null)
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const path = pathRef.current
    if (!root || !path) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = `${length}`

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduced) {
      path.style.strokeDashoffset = "0"
      return
    }

    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      gsap.registerPlugin(ScrollTrigger)
      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top 75%",
        end: "bottom 45%",
        scrub: 0.45,
        onUpdate: (self) => {
          gsap.to(path, {
            strokeDashoffset: length * (1 - self.progress),
            duration: 0.08,
            ease: "none",
            overwrite: "auto",
          })
        },
      })
      cleanup = () => trigger.kill()
    })().catch(() => {
      path.style.strokeDashoffset = "0"
    })

    return () => cleanup?.()
  }, [])

  return (
    <section ref={rootRef} id="how-it-works" className="relative overflow-hidden bg-[#f8faf9] py-16 md:py-24">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="relative z-10 container">
        <ScrollReveal className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#ff6b57]/20 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#c94d3e] shadow-sm">
            <MessageSquareText className="h-3.5 w-3.5" />
            {localized.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl font-black tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {localized.title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {localized.subtitle}
          </p>
        </ScrollReveal>

        <div className="relative mt-9 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/86 p-4 shadow-2xl shadow-slate-900/[0.07] md:p-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_50%_0%,rgba(20,184,166,0.16),transparent_58%)]" />
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
            <path
              d="M150 150 C300 70 425 220 500 310 C575 400 705 545 850 470 M150 470 C300 545 425 400 500 310 C575 220 710 70 850 150"
              fill="none"
              stroke="#f3e8e4"
              strokeLinecap="round"
              strokeWidth="18"
            />
            <path
              ref={pathRef}
              d="M150 150 C300 70 425 220 500 310 C575 400 705 545 850 470 M150 470 C300 545 425 400 500 310 C575 220 710 70 850 150"
              fill="none"
              stroke="#ff6b57"
              strokeLinecap="round"
              strokeWidth="6"
            />
          </svg>

          <div className="relative grid gap-4 lg:grid-cols-[1fr_340px_1fr] lg:items-center">
            <div className="grid gap-4">
              {flows.slice(0, 3).map((flow, index) => (
                <FlowCard key={flow.title} flow={flow} index={index} />
              ))}
            </div>

            <div className="relative mx-auto flex min-h-[330px] w-full max-w-[340px] items-center justify-center rounded-[2rem] border border-slate-200 bg-[#f9fbfa] shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
              <div className="absolute inset-6 rounded-[1.6rem] border border-dashed border-slate-300" />
              <div className="absolute inset-10 rounded-[2rem] bg-white shadow-2xl shadow-slate-900/[0.10] [transform:rotateX(56deg)_rotateZ(-45deg)]" />
              <div className="absolute left-7 top-8 h-12 w-12 rounded-2xl border border-teal-200 bg-white/82 shadow-lg shadow-teal-900/10 backdrop-blur">
                <span className="absolute inset-3 rounded-xl bg-teal-500/12" />
                <span className="absolute inset-0 rounded-2xl border border-teal-300/50 motion-safe:animate-ping" />
              </div>
              <div className="absolute bottom-8 right-8 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff6b57]/20 bg-white/86 text-[#ff6b57] shadow-lg shadow-rose-900/10 backdrop-blur">
                <Activity className="h-5 w-5" />
              </div>

              <div className="relative z-10 w-[245px] overflow-hidden rounded-[1.75rem] border border-white bg-white text-left shadow-2xl shadow-slate-900/[0.16]">
                <div className="relative h-28 overflow-hidden">
                  <Image
                    src="/new-level-premium/masterplan-aerial.jpg"
                    alt="New Level Premium masterplan connected to the shared ERP record"
                    fill
                    sizes="245px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,32,28,0.12),rgba(4,32,28,0.78))]" />
                  <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/18 bg-white/14 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_0_5px_rgba(110,231,183,0.18)]" />
                    {localized.centerKicker}
                  </div>
                  <CatiLogoMark className="absolute bottom-4 left-4 h-11 w-11 border border-white/20 shadow-xl shadow-black/20" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{localized.center}</p>
                      <p className="mt-1 text-xs font-semibold text-muted-foreground">
                        {localized.centerProject}
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 shrink-0 text-teal-700" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {localized.centerStats.map(([value, label]) => (
                      <div key={`${value}-${label}`} className="rounded-xl bg-slate-50 px-2 py-2 text-center">
                        <p className="text-sm font-black text-foreground">{value}</p>
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-muted-foreground">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {[82, 64, 91].map((value, index) => (
                      <div key={value} className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={cn("h-full rounded-full", index === 1 ? "bg-[#ff6b57]" : "bg-teal-600")}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {flows.slice(3).map((flow, index) => (
                <FlowCard key={flow.title} flow={flow} index={index + 3} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function FlowCard({ flow, index }: { flow: Flow; index: number }) {
  const Icon = flow.icon
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.08]",
        index % 2 === 0 ? "lg:translate-x-4" : "lg:-translate-x-4"
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-lg", flow.accent)}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">{flow.title}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{flow.text}</p>
        </div>
      </div>
    </div>
  )
}
