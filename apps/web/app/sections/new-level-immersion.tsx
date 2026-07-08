"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowRight,
  BedDouble,
  Building2,
  FileCheck2,
  Landmark,
  Map,
  ShieldCheck,
  Waves,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Yeni Seviye Premium / Avsallar",
    title: "Projeyi yukarıdan, binadan, daireden ve ERP akışından okuyun",
    intro:
      "1Çatı, Yeni Seviye Premium gibi büyük bir siteyi sadece görsel portföy olarak değil; daire, hizmet, aidat, rezervasyon, belge ve erişim kararlarıyla birlikte yönetilen ticari operasyon olarak ele alır.",
    ctaPrimary: "Daire matrisini aç",
    ctaSecondary: "Platform akışını incele",
    liveLabel: "Yeni Seviye Premium kontrol gorunumu",
    metrics: [
      ["52k m2", "proje alani"],
      ["900 m", "plaj mesafesi"],
      ["5*", "otel altyapisi"],
      ["3 yil", "kira garantisi"],
    ],
    stages: [
      {
        label: "Masterplan",
        title: "Tüm site tek kontrol düzleminde",
        text:
          "Bloklar, yollar, havuzlar, sosyal alanlar ve güvenlik noktaları ERP’de aynı site modeline bağlanır.",
      },
      {
        label: "Dış yaşam",
        title: "Satış vaadi operasyon verisine dönüşür",
        text:
          "Spor alanı, havuz, peyzaj, servis ve ortak alan vaatleri; görev, SLA, bütçe ve malik iletişimi olarak takip edilir.",
      },
      {
        label: "Saha gerçekliği",
        title: "Render ile güncel saha ayrılır",
        text:
          "Haziran 2026 ilerleme görselleri, daire durumu ve teslim hazırlığı aynı kayıtta karşılaştırılır.",
      },
      {
        label: "Daire ve hizmet",
        title: "Dairenin içinden finans ve servis akışına",
        text:
          "Showroom, evrak, ödeme planı, depozito, temizlik ve erişim kararları rol bazlı ERP ekranlarına akar.",
      },
    ],
  },
  en: {
    eyebrow: "New Level Premium / Avsallar",
    title: "Read the project from aerial plan to apartment to operating record",
    intro:
      "1Çatı treats a large residence like New Level Premium as a commercial operation: units, services, dues, reservations, documents and access decisions connected to one operating record.",
    ctaPrimary: "Open unit matrix",
    ctaSecondary: "Review platform flow",
    liveLabel: "New Level Premium control view",
    metrics: [
      ["52k m2", "land area"],
      ["900 m", "to beach"],
      ["5*", "hotel infrastructure"],
      ["3 yrs", "rental guarantee"],
    ],
    stages: [
      {
        label: "Masterplan",
        title: "The whole site on one control plane",
        text:
          "Blocks, roads, pools, social zones and security points connect to the same site model in the ERP.",
      },
      {
        label: "Resort life",
        title: "The sales promise becomes operating data",
        text:
          "Sports, pool, landscape, service and common-area commitments become tasks, SLA, budget and owner communication.",
      },
      {
        label: "Site reality",
        title: "Render and current site status stay separate",
        text:
          "June 2026 progress media, unit status and handover preparation are compared in the same record.",
      },
      {
        label: "Unit and service",
        title: "From apartment interior to finance and service",
        text:
          "Showroom, documents, payment plan, deposit, cleaning and access decisions flow into role-based ERP screens.",
      },
    ],
  },
  de: {
    eyebrow: "Neues Niveau Premium / Avsallar",
    title: "Vom Lageplan über das Gebäude bis zum ERP-Ablauf",
    intro:
      "1Çatı behandelt Neues Niveau Premium als kommerziellen Betrieb: Einheiten, Services, Beiträge, Reservierungen, Dokumente und Zutritt in einem Arbeitsdatensatz.",
    ctaPrimary: "Wohnungsmatrix öffnen",
    ctaSecondary: "Plattformablauf prüfen",
    liveLabel: "Neues Niveau Premium Kontrollansicht",
    metrics: [
      ["52k m2", "Projektflache"],
      ["900 m", "zum Strand"],
      ["5*", "Hotelstruktur"],
      ["3 Jahre", "Mietgarantie"],
    ],
    stages: [
      {
        label: "Masterplan",
        title: "Die gesamte Anlage auf einer Steuerungsebene",
        text:
          "Blöcke, Wege, Pools, Sozialflächen und Sicherheitspunkte hängen am gleichen Standortmodell.",
      },
      {
        label: "Resortleben",
        title: "Das Verkaufsversprechen wird Betriebsdaten",
        text:
          "Sport, Pool, Landschaft, Service und Gemeinschaftsflächen werden zu Aufgaben, SLA, Budget und Eigentümerkommunikation.",
      },
      {
        label: "Baurealität",
        title: "Rendering und aktueller Status bleiben getrennt",
        text:
          "Medien von Juni 2026, Wohnungsstatus und Übergabevorbereitung werden im selben Datensatz verglichen.",
      },
      {
        label: "Einheit und Service",
        title: "Vom Apartment zu Finanzen und Service",
        text:
          "Showroom, Dokumente, Zahlungsplan, Kaution, Reinigung und Zutritt fließen in rollenbasierte ERP-Ansichten.",
      },
    ],
  },
  ru: {
    eyebrow: "Новый уровень Премиум / Авсаллар",
    title: "От генплана и здания до квартиры и ERP-процесса",
    intro:
      "1Çatı рассматривает «Новый уровень Премиум» как коммерческую операцию: квартиры, сервис, платежи, бронирования, документы и доступ связаны в одной рабочей записи.",
    ctaPrimary: "Открыть матрицу квартир",
    ctaSecondary: "Посмотреть платформу",
    liveLabel: "Контрольный вид «Новый уровень Премиум»",
    metrics: [
      ["52k m2", "site area"],
      ["900 m", "to beach"],
      ["5*", "hotel layer"],
      ["3 yrs", "rental guarantee"],
    ],
    stages: [
      {
        label: "Генплан",
        title: "Весь комплекс на одной панели управления",
        text:
          "Блоки, дороги, бассейны, социальные зоны и охрана привязаны к единой модели объекта.",
      },
      {
        label: "Жизнь комплекса",
        title: "Продажное обещание становится операционными данными",
        text:
          "Спорт, бассейн, ландшафт, сервис и общие зоны превращаются в задачи, SLA, бюджет и коммуникацию с владельцами.",
      },
      {
        label: "Реальный статус",
        title: "Рендер и текущий прогресс разделены",
        text:
          "Фото прогресса за июнь 2026, статус квартир и подготовка передачи сравниваются в одной записи.",
      },
      {
        label: "Квартира и сервис",
        title: "Из квартиры в финансы и сервис",
        text:
          "Шоурум, документы, платежный план, депозит, уборка и доступ переходят в ERP-экраны по ролям.",
      },
    ],
  },
} satisfies Record<LocaleKey, {
  eyebrow: string
  title: string
  intro: string
  ctaPrimary: string
  ctaSecondary: string
  liveLabel: string
  metrics: Array<[string, string]>
  stages: Array<{ label: string; title: string; text: string }>
}>

const images = [
  {
    src: "/new-level-premium/masterplan-aerial.jpg",
    alt: "New Level Premium aerial masterplan with blocks, pools and forest setting",
    icon: Map,
  },
  {
    src: "/new-level-premium/resort-exterior.jpg",
    alt: "New Level Premium resort exterior render with sport courts and landscaped residence blocks",
    icon: Waves,
  },
  {
    src: "/new-level-premium/site-progress-2026.jpg",
    alt: "New Level Premium June 2026 aerial construction progress photo",
    icon: Building2,
  },
  {
    src: "/new-level-premium/showroom-bedroom.jpg",
    alt: "New Level Premium furnished showroom bedroom interior",
    icon: BedDouble,
  },
]

export function NewLevelImmersion() {
  const locale = useLocale()
  const t = copy[(locale as LocaleKey) in copy ? (locale as LocaleKey) : "tr"]
  const rootRef = useRef<HTMLElement>(null)
  const layerRefs = useRef<Array<HTMLDivElement | null>>([])
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const activeStageRef = useRef(0)
  const stageTransitionRef = useRef<((stageIndex: number) => void) | null>(null)
  const [activeStage, setActiveStage] = useState(0)

  const stages = useMemo(
    () =>
      t.stages.map((stage, index) => ({
        ...stage,
        ...images[index],
      })),
    [t.stages]
  )

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const desktop = window.matchMedia("(min-width: 1280px)").matches
    if (reduced || !desktop) return

    let cleanup: (() => void) | undefined

    void (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ])
      gsap.registerPlugin(ScrollTrigger)

      const layers = layerRefs.current.filter(Boolean)
      const cards = cardRefs.current.filter(Boolean)
      const initialIndex = Math.min(activeStageRef.current, stages.length - 1)
      gsap.set(layers, { autoAlpha: 0, scale: 1.08 })
      gsap.set(layers[initialIndex], { autoAlpha: 1, scale: 1 })
      gsap.set(cards, { autoAlpha: 0, y: 28 })
      gsap.set(cards[initialIndex], { autoAlpha: 1, y: 0 })

      let activeIndex = initialIndex
      const showStage = (nextIndex: number) => {
        if (nextIndex === activeIndex) return
        const previousIndex = activeIndex
        activeIndex = nextIndex
        activeStageRef.current = nextIndex
        setActiveStage(nextIndex)

        gsap.to(layers[previousIndex], {
          autoAlpha: 0,
          scale: 1.12,
          duration: 0.28,
          overwrite: "auto",
        })
        gsap.to(cards[previousIndex], {
          autoAlpha: 0,
          y: -18,
          duration: 0.18,
          overwrite: "auto",
        })
        gsap.to(layers[nextIndex], {
          autoAlpha: 1,
          scale: 1,
          duration: 0.35,
          overwrite: "auto",
        })
        gsap.fromTo(
          cards[nextIndex],
          { autoAlpha: 0, y: 18 },
          { autoAlpha: 1, y: 0, duration: 0.24, overwrite: "auto" }
        )
      }

      stageTransitionRef.current = showStage

      const trigger = ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.4,
        onUpdate: (self) => {
          const nextIndex = Math.min(
            stages.length - 1,
            Math.floor(self.progress * stages.length)
          )
          showStage(nextIndex)
        },
      })

      cleanup = () => {
        stageTransitionRef.current = null
        trigger.kill()
      }
    })().catch(() => undefined)

    return () => cleanup?.()
  }, [stages])

  const jumpToStage = (stageIndex: number) => {
    const nextIndex = Math.max(0, Math.min(stages.length - 1, stageIndex))
    const transitionStage = stageTransitionRef.current

    if (transitionStage) {
      transitionStage(nextIndex)
    } else {
      activeStageRef.current = nextIndex
      setActiveStage(nextIndex)
    }

    const root = rootRef.current
    if (!root) return

    const desktop = window.matchMedia("(min-width: 1280px)").matches
    if (!desktop) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const scrollable = Math.max(0, root.offsetHeight - window.innerHeight)
    const segmentProgress = (nextIndex + 0.5) / stages.length
    const sectionTop = root.getBoundingClientRect().top + window.scrollY

    window.scrollTo({
      top: sectionTop + scrollable * segmentProgress,
      behavior: reduced ? "auto" : "smooth",
    })
  }

  return (
    <section ref={rootRef} id="new-level" data-testid="new-level-section" className="relative bg-[#f7faf8] text-[#061a17]">
      <div className="container pt-8 pb-12 md:pt-10 md:pb-16">
        <ScrollReveal className="max-w-4xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-700/20 bg-white px-3 py-1 text-xs font-extrabold tracking-[0.18em] text-emerald-800 uppercase shadow-sm">
            <Landmark className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 max-w-3xl text-3xl leading-tight font-black text-[#061a17] md:text-5xl">
            {t.title}
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-700 md:text-lg">
            {t.intro}
          </p>
        </ScrollReveal>
      </div>

      <div className="relative xl:min-h-[230svh]">
        <div className="min-h-svh overflow-hidden border-y border-border/60 bg-[#061a17] text-white xl:sticky xl:top-0">
          <div className="absolute inset-0">
            {stages.map((stage, index) => (
              <div
                key={stage.src}
                ref={(node) => {
                  layerRefs.current[index] = node
                }}
                className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  index === activeStage ? "opacity-100" : "opacity-0"
                )}
              >
                <Image
                  src={stage.src}
                  alt={stage.alt}
                  fill
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,16,14,0.82)_0%,rgba(3,16,14,0.48)_42%,rgba(3,16,14,0.14)_100%)]" />
                {stage.src.includes("resort-exterior") ? (
                  <div className="pointer-events-none absolute right-0 bottom-0 h-40 w-72 bg-gradient-to-tl from-[#061a17] via-[#061a17]/75 to-transparent" />
                ) : null}
              </div>
            ))}
          </div>

          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.045)_1px,transparent_1px)] bg-[size:76px_76px] opacity-70" />

          <div className="relative z-10 container grid min-h-svh items-start gap-8 py-14 sm:py-16 xl:grid-cols-[0.92fr_1.08fr] xl:items-center xl:py-10 2xl:py-20">
            <div className="max-w-xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white/90 backdrop-blur">
                <ShieldCheck className="h-4 w-4 text-emerald-200" />
                {t.liveLabel}
              </div>

              <div className="relative space-y-4 xl:min-h-[460px] xl:space-y-0 2xl:min-h-[520px]">
                {stages.map((stage, index) => {
                  const Icon = stage.icon
                  return (
                    <div
                      key={stage.label}
                      data-testid={`new-level-stage-card-${index}`}
                      ref={(node) => {
                        cardRefs.current[index] = node
                      }}
                      className={cn(
                        "relative inset-x-0 top-0 rounded-[1.75rem] border border-white/16 bg-[#061a17]/72 p-6 shadow-2xl shadow-black/30 backdrop-blur-xl transition-opacity duration-300 xl:absolute xl:mb-0 xl:p-8",
                        index === activeStage
                          ? "xl:opacity-100"
                          : "xl:pointer-events-none xl:opacity-0"
                      )}
                    >
                      <div className="flex items-center gap-3 text-sm font-black tracking-[0.18em] text-emerald-100 uppercase">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/12">
                          <Icon className="h-5 w-5" />
                        </span>
                        0{index + 1} / {stage.label}
                      </div>
                      <h3 className="mt-6 text-3xl leading-tight font-black xl:text-4xl 2xl:text-5xl">
                        {stage.title}
                      </h3>
                      <p className="mt-4 max-w-lg text-base leading-7 text-white/78 2xl:leading-8">
                        {stage.text}
                      </p>
                    </div>
                  )
                })}
              </div>

              <div data-testid="new-level-metrics" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {t.metrics.map(([value, label]) => (
                  <div
                    key={`${value}-${label}`}
                    className="rounded-2xl border border-white/14 bg-white/10 px-4 py-3 backdrop-blur"
                  >
                    <div className="text-2xl font-black">{value}</div>
                    <div className="text-xs font-semibold text-white/68">{label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/${locale}/dashboard/listings`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#061a17] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
                >
                  {t.ctaPrimary}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="#platform"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/16"
                >
                  <FileCheck2 className="h-4 w-4" />
                  {t.ctaSecondary}
                </Link>
              </div>
            </div>

            <div className="hidden justify-end xl:flex">
              <div className="relative h-[560px] w-[300px] rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl shadow-black/30 backdrop-blur">
                {stages.map((stage, index) => {
                  const Icon = stage.icon
                  const isActive = activeStage === index
                  return (
                    <button
                      key={stage.label}
                      type="button"
                      onClick={() => jumpToStage(index)}
                      aria-current={isActive ? "step" : undefined}
                      aria-label={`${index + 1}. ${stage.label}`}
                      className={cn(
                        "relative z-20 flex w-full cursor-pointer items-center gap-3 rounded-2xl border-b border-white/10 px-3 py-5 text-left transition last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
                        isActive
                          ? "bg-white/14 text-white shadow-[0_18px_50px_rgba(0,0,0,0.18)] ring-1 ring-white/18"
                          : "text-white/58 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl border transition",
                          isActive
                            ? "border-emerald-100/38 bg-emerald-100/16 text-emerald-100"
                            : "border-white/10 bg-white/10 text-white/58"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div
                          className={cn(
                            "text-xs font-black",
                            isActive ? "text-emerald-100/78" : "text-white/38"
                          )}
                        >
                          0{index + 1}
                        </div>
                        <div className="text-sm font-bold">{stage.label}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
