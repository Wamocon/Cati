"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowRight,
  Building2,
  FileCheck2,
  Home,
  Route,
  ShieldCheck,
  TicketCheck,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { cn } from "@/lib/utils"

type LocaleKey = "tr" | "en" | "de" | "ru"

interface IsometricStep {
  label: string
  title: string
  text: string
  stat: string
  statLabel: string
  icon: LucideIcon
}

interface IsometricSceneLabels {
  blockPrefix: string
  unitRecord: string
  decision: string
  chips: string[]
}

interface IsometricErpWorldProps {
  className?: string
  mode?: "landing" | "dashboard"
  roleLabel?: string
  dashboardMetrics?: Array<[string, string]>
}

const copy = {
  tr: {
    eyebrow: "İşletim haritası",
    title: "Yukarıdan siteye, bloktan daireye, daireden ERP kararına",
    intro:
      "Masterplan, blok, daire içi ve operasyon ekranı aynı işletim modelinde birleşir. Her nokta CRM, finans, servis veya erişim kararına bağlı gerçek kayıt akışını temsil eder.",
    cta: "Canlı çalışma alanına gir",
    secondary: "Daire matrisini aç",
    dashboardTitle: "Rol bazlı işletim haritası",
    controlPlane: "kontrol düzlemi",
    metricRole: "aktif rol",
    metricAliases: {},
    dashboardIntro:
      "Bu kompakt görünüm, aktif rolün hangi daire, servis, belge ve karar akışlarına bağlandığını gösterir.",
    scene: {
      blockPrefix: "Blok",
      unitRecord: "daire kaydı",
      decision: "ERP kararı",
      chips: ["servis", "belge", "depozito", "erişim"],
    },
    steps: [
      {
        label: "Masterplan",
        title: "Site tek modelden başlar",
        text:
          "Blok, yol, sosyal alan, güvenlik ve ortak hizmetler tek portföy kaydına bağlanır.",
        stat: "769",
        statLabel: "daire",
        icon: Building2,
      },
      {
        label: "Blok ve kat",
        title: "Her blok ERP envanterine düşer",
        text:
          "Kat, daire tipi, durum, fiyat, bakım ve erişim sinyali aynı matris içinde okunur.",
        stat: "7",
        statLabel: "blok",
        icon: Home,
      },
      {
        label: "Daire içi",
        title: "Ev deneyimi servis ve belgeye bağlanır",
        text:
          "Showroom, teslim, bakım, depozito, fotoğraf kanıtı ve sözleşme kaydı kopmadan ilerler.",
        stat: "4",
        statLabel: "rol ekranı",
        icon: TicketCheck,
      },
      {
        label: "Karar motoru",
        title: "Finans, erişim ve AI aynı sonuca bakar",
        text:
          "Aidat, borç, rezervasyon, belge ve SLA sinyali rol bazlı aksiyon olarak görünür.",
        stat: "24/7",
        statLabel: "canlı kontrol",
        icon: ShieldCheck,
      },
    ],
  },
  en: {
    eyebrow: "Operating map",
    title: "From aerial site to block, from unit interior to ERP decision",
    intro:
      "The masterplan, building, unit and operating screen share one auditable model. Each point represents a real CRM, finance, service or access decision flow.",
    cta: "Enter live workspace",
    secondary: "Open unit matrix",
    dashboardTitle: "Role-based operating map",
    controlPlane: "control plane",
    metricRole: "active role",
    metricAliases: {
      daire: "units",
      "açık servis": "open service",
      "aktif rol": "active role",
      "açık modül": "open modules",
      "yetkili iş": "allowed work",
    },
    dashboardIntro:
      "This compact view shows which unit, service, document and decision flows are available for the active role.",
    scene: {
      blockPrefix: "Block",
      unitRecord: "unit record",
      decision: "ERP decision",
      chips: ["service", "document", "deposit", "access"],
    },
    steps: [
      {
        label: "Masterplan",
        title: "The site starts as one model",
        text:
          "Blocks, roads, amenities, security and shared services connect to one portfolio record.",
        stat: "769",
        statLabel: "units",
        icon: Building2,
      },
      {
        label: "Block and floor",
        title: "Every building becomes ERP inventory",
        text:
          "Floor, unit type, status, price, maintenance and access signals sit inside one matrix.",
        stat: "7",
        statLabel: "blocks",
        icon: Home,
      },
      {
        label: "Inside the unit",
        title: "Home experience links to service and documents",
        text:
          "Showroom, handover, maintenance, deposit, photo proof and contracts move as one record.",
        stat: "4",
        statLabel: "role views",
        icon: TicketCheck,
      },
      {
        label: "Decision engine",
        title: "Finance, access and AI read the same signal",
        text:
          "Dues, debt, reservations, documents and SLA become role-based actions.",
        stat: "24/7",
        statLabel: "live control",
        icon: ShieldCheck,
      },
    ],
  },
  de: {
    eyebrow: "Betriebskarte",
    title: "Vom Lageplan über den Block bis zur ERP-Entscheidung",
    intro:
      "Lageplan, Gebäude, Einheit und Betriebsebene teilen ein prüfbares Modell. Jeder Punkt steht für einen CRM-, Finanz-, Service- oder Zugangsprozess.",
    cta: "Arbeitsbereich öffnen",
    secondary: "Wohnungsmatrix öffnen",
    dashboardTitle: "Rollenbasierte Betriebskarte",
    controlPlane: "Kontrollebene",
    metricRole: "aktive Rolle",
    metricAliases: {
      daire: "Einheiten",
      "açık servis": "offene Services",
      "aktif rol": "aktive Rolle",
      "açık modül": "offene Module",
      "yetkili iş": "erlaubte Arbeit",
    },
    dashboardIntro:
      "Diese kompakte Ansicht zeigt, welche Einheiten, Services, Dokumente und Entscheidungen für die Rolle offen sind.",
    scene: {
      blockPrefix: "Block",
      unitRecord: "Einheitsakte",
      decision: "ERP-Entscheidung",
      chips: ["Service", "Dokument", "Depot", "Zugang"],
    },
    steps: [
      {
        label: "Masterplan",
        title: "Die Anlage startet als ein Modell",
        text:
          "Blöcke, Wege, Ausstattung, Sicherheit und gemeinsame Services hängen an einem Portfoliodatensatz.",
        stat: "769",
        statLabel: "Einheiten",
        icon: Building2,
      },
      {
        label: "Block und Etage",
        title: "Jedes Gebäude wird ERP-Bestand",
        text:
          "Etage, Einheitstyp, Status, Preis, Wartung und Zugangssignale liegen in einer Matrix.",
        stat: "7",
        statLabel: "Blöcke",
        icon: Home,
      },
      {
        label: "In der Einheit",
        title: "Wohnen verbindet Service und Dokumente",
        text:
          "Showroom, Übergabe, Wartung, Depot, Fotonachweis und Vertrag bleiben ein Verlauf.",
        stat: "4",
        statLabel: "Rollenansichten",
        icon: TicketCheck,
      },
      {
        label: "Entscheidung",
        title: "Finanzen, Zugang und AI lesen dasselbe Signal",
        text:
          "Beiträge, Schulden, Reservierungen, Dokumente und SLA werden rollenbasierte Aktionen.",
        stat: "24/7",
        statLabel: "Live-Kontrolle",
        icon: ShieldCheck,
      },
    ],
  },
  ru: {
    eyebrow: "Операционная карта",
    title: "От генплана к блоку, от квартиры к ERP-решению",
    intro:
      "Генплан, здание, квартира и рабочий экран используют одну проверяемую модель. Каждая точка связана с CRM, финансами, сервисом или доступом.",
    cta: "Открыть рабочую зону",
    secondary: "Открыть матрицу квартир",
    dashboardTitle: "Операционная карта роли",
    controlPlane: "контур управления",
    metricRole: "активная роль",
    metricAliases: {
      daire: "квартиры",
      "açık servis": "открытый сервис",
      "aktif rol": "активная роль",
      "açık modül": "открытые модули",
      "yetkili iş": "доступные задачи",
    },
    dashboardIntro:
      "Компактный вид показывает, какие квартиры, сервисы, документы и решения доступны текущей роли.",
    scene: {
      blockPrefix: "Блок",
      unitRecord: "карточка квартиры",
      decision: "ERP-решение",
      chips: ["сервис", "документ", "депозит", "доступ"],
    },
    steps: [
      {
        label: "Генплан",
        title: "Комплекс начинается с единой модели",
        text:
          "Блоки, дороги, зоны отдыха, безопасность и общие услуги связаны с одной записью портфеля.",
        stat: "769",
        statLabel: "квартир",
        icon: Building2,
      },
      {
        label: "Блок и этаж",
        title: "Каждое здание становится ERP-инвентарем",
        text:
          "Этаж, тип квартиры, статус, цена, сервис и доступ читаются в одной матрице.",
        stat: "7",
        statLabel: "блоков",
        icon: Home,
      },
      {
        label: "Внутри квартиры",
        title: "Жилой опыт связан с сервисом и документами",
        text:
          "Показ, передача, обслуживание, депозит, фото и договоры остаются в одной истории.",
        stat: "4",
        statLabel: "вида роли",
        icon: TicketCheck,
      },
      {
        label: "Решение",
        title: "Финансы, доступ и AI смотрят на один сигнал",
        text:
          "Взносы, долг, бронирования, документы и SLA становятся действиями по роли.",
        stat: "24/7",
        statLabel: "живой контроль",
        icon: ShieldCheck,
      },
    ],
  },
} satisfies Record<
  LocaleKey,
  {
    eyebrow: string
    title: string
    intro: string
    cta: string
    secondary: string
    dashboardTitle: string
    controlPlane: string
    metricRole: string
    metricAliases: Record<string, string>
    dashboardIntro: string
    scene: IsometricSceneLabels
    steps: IsometricStep[]
  }
>

function IsometricScene({
  activeStep,
  compact,
  routePathRef,
  sceneLabels,
}: {
  activeStep: number
  compact: boolean
  routePathRef: React.RefObject<SVGPathElement | null>
  sceneLabels: IsometricSceneLabels
}) {
  const towers = [
    { left: "15%", top: "34%", height: 98, label: "A" },
    { left: "31%", top: "23%", height: 74, label: "B" },
    { left: "50%", top: "36%", height: 112, label: "C" },
    { left: "66%", top: "22%", height: 82, label: "D" },
  ]

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[#f8faf9] shadow-2xl shadow-slate-900/[0.08]",
        compact ? "h-full min-h-[360px] xl:min-h-full" : "min-h-[420px] lg:min-h-[560px]"
      )}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(255,107,87,0.12),transparent_26%),radial-gradient(circle_at_72%_70%,rgba(20,184,166,0.10),transparent_30%)]" />

      <svg
        viewBox="0 0 700 520"
        className="absolute inset-0 h-full w-full"
        role="presentation"
      >
        <defs>
          <filter id="isometric-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.13" />
          </filter>
        </defs>
        <path
          d="M78 392 C160 316 215 348 292 270 C365 196 432 230 504 164 C558 114 603 112 645 72"
          fill="none"
          stroke="#f3e8e4"
          strokeLinecap="round"
          strokeWidth="16"
        />
        <path
          ref={routePathRef}
          d="M78 392 C160 316 215 348 292 270 C365 196 432 230 504 164 C558 114 603 112 645 72"
          fill="none"
          stroke="#ff6b57"
          strokeLinecap="round"
          strokeWidth="7"
        />
        {[0, 1, 2, 3].map((index) => {
          const points = [
            [78, 392],
            [292, 270],
            [504, 164],
            [645, 72],
          ] as const
          const [cx, cy] = points[index]
          return (
            <g key={index} transform={`translate(${cx} ${cy})`}>
              <circle
                r={activeStep >= index ? 16 : 11}
                fill={activeStep >= index ? "#ff6b57" : "#ffffff"}
                stroke={activeStep >= index ? "#ff6b57" : "#cbd5e1"}
                strokeWidth="3"
              />
              <text
                y="4"
                textAnchor="middle"
                className="fill-white text-[12px] font-black"
              >
                {activeStep >= index ? `0${index + 1}` : ""}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative h-[360px] w-[560px] max-w-[84vw] sm:max-w-[96%] [perspective:1200px]">
          <div className="absolute inset-x-10 bottom-10 h-72 rounded-[2rem] border border-white bg-white/80 shadow-[0_38px_80px_rgba(15,23,42,0.10)] sm:inset-x-6 [transform:rotateX(58deg)_rotateZ(-42deg)] [transform-style:preserve-3d]">
            <div className="absolute inset-5 rounded-[1.5rem] border border-slate-200 bg-[#f3f6f4]" />
            <div className="absolute left-[11%] top-[18%] h-[14%] w-[72%] rounded-full border border-dashed border-slate-300" />
            <div className="absolute bottom-[18%] right-[10%] h-[18%] w-[38%] rounded-full border border-dashed border-slate-300" />
          </div>

          {towers.map((tower, index) => (
            <div
              key={tower.label}
              className={cn(
                "absolute w-20 rounded-xl border border-white bg-white shadow-[0_28px_52px_rgba(15,23,42,0.16)] transition-all duration-500",
                activeStep >= 1 ? "opacity-100" : "opacity-75"
              )}
              style={{
                left: tower.left,
                top: tower.top,
                height: tower.height,
                transform: "skewY(-24deg) rotate(-1deg)",
                filter: "drop-shadow(16px 28px 22px rgba(15, 23, 42, 0.11))",
              }}
            >
              <div className="grid h-full grid-cols-3 gap-1 p-3">
                {Array.from({ length: 15 }).map((_, cell) => (
                  <span
                    key={cell}
                    className={cn(
                      "rounded-sm",
                      cell % 4 === 0 ? "bg-[#ffdfd8]" : "bg-teal-100"
                    )}
                  />
                ))}
              </div>
              <span className="absolute -bottom-8 left-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-700 shadow-sm">
                {sceneLabels.blockPrefix} {tower.label}
              </span>
              {index === activeStep && (
                <span className="absolute -right-3 -top-3 h-5 w-5 rounded-full bg-[#ff6b57] shadow-[0_0_0_8px_rgba(255,107,87,0.16)]" />
              )}
            </div>
          ))}

          <div
            className={cn(
              "absolute right-[8%] bottom-[16%] w-44 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_28px_70px_rgba(15,23,42,0.14)] transition-all duration-500",
              activeStep >= 2 ? "translate-y-0 opacity-100" : "translate-y-4 opacity-70"
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-teal-50 p-2 text-teal-700">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-slate-900">A-018</p>
                <p className="text-[10px] font-semibold text-slate-500">{sceneLabels.unitRecord}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sceneLabels.chips.map((item) => (
                <div key={item} className="rounded-lg bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div
            className={cn(
              "absolute left-[6%] bottom-[7%] w-64 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_28px_70px_rgba(15,23,42,0.14)] transition-all duration-500",
              activeStep >= 3 ? "translate-y-0 opacity-100" : "translate-y-5 opacity-70"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{sceneLabels.decision}</p>
              <ShieldCheck className="h-4 w-4 text-teal-700" />
            </div>
            <div className="space-y-2">
              {[82, 64, 91].map((value, index) => (
                <div key={index} className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      index === 1 ? "bg-[#ff6b57]" : "bg-teal-600"
                    )}
                    style={{ width: `${value}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function IsometricErpWorld({
  className,
  mode = "landing",
  roleLabel,
  dashboardMetrics,
}: IsometricErpWorldProps) {
  const locale = useLocale()
  const localized = copy[(locale as LocaleKey) in copy ? (locale as LocaleKey) : "tr"]
  const steps = localized.steps.length > 0 ? localized.steps : copy.en.steps
  const rootRef = useRef<HTMLElement>(null)
  const routePathRef = useRef<SVGPathElement>(null)
  const [activeStep, setActiveStep] = useState(0)
  const compact = mode === "dashboard"

  const metrics = useMemo(
    () =>
      dashboardMetrics ?? [
        [steps[0].stat, steps[0].statLabel],
        [steps[1].stat, steps[1].statLabel],
        [roleLabel ?? "ERP", localized.metricRole],
      ],
    [dashboardMetrics, localized.metricRole, roleLabel, steps]
  )
  const metricAliases: Record<string, string> = localized.metricAliases
  const displayedMetrics = metrics.map(([value, label]) => [
    value,
    metricAliases[label] ?? label,
  ])

  useEffect(() => {
    const root = rootRef.current
    const path = routePathRef.current
    if (!root || !path) return

    const length = path.getTotalLength()
    path.style.strokeDasharray = `${length}`
    path.style.strokeDashoffset = compact ? "0" : `${length}`

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const desktop = window.matchMedia("(min-width: 1024px)").matches
    if (compact || reduced || !desktop) {
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
        start: "top 70%",
        end: "bottom 35%",
        scrub: 0.3,
        onUpdate: (self) => {
          const nextStep = Math.min(
            steps.length - 1,
            Math.floor(self.progress * steps.length)
          )
          setActiveStep(nextStep)
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
  }, [compact, steps.length])

  function jumpToStep(index: number) {
    setActiveStep(index)
    if (compact) return

    const root = rootRef.current
    if (!root) return
    const top = root.getBoundingClientRect().top + window.scrollY
    const range = Math.max(root.offsetHeight - window.innerHeight, 0)
    window.scrollTo({
      top: top + range * ((index + 0.18) / steps.length),
      behavior: "smooth",
    })
  }

  return (
    <section
      ref={rootRef}
      id={compact ? "role-map" : "isometric-flow"}
      className={cn(
        "relative bg-[#f8faf9]",
        compact ? "rounded-2xl" : "overflow-hidden pt-12 pb-6 md:pt-16 md:pb-8 lg:pt-20 lg:pb-8",
        className
      )}
    >
      <div className={cn(compact ? "" : "container")}>
        <div
          className={cn(
            "grid gap-8",
            compact
              ? "items-stretch xl:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)]"
              : "lg:grid-cols-[minmax(0,0.72fr)_minmax(520px,1fr)] lg:items-center"
          )}
        >
          <div className={cn(compact ? "rounded-2xl border border-border bg-card p-4 shadow-xl shadow-black/[0.04]" : "")}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#ff6b57]/20 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#c94d3e] shadow-sm">
              <Route className="h-3.5 w-3.5" />
              {compact ? localized.dashboardTitle : localized.eyebrow}
            </span>
            <h2
              className={cn(
                "mt-5 font-black leading-tight text-foreground",
                compact ? "text-2xl" : "max-w-3xl text-4xl md:text-6xl"
              )}
            >
              {compact ? `${roleLabel ?? "ERP"} ${localized.controlPlane}` : localized.title}
            </h2>
            <p className={cn("max-w-2xl text-sm text-muted-foreground", compact ? "mt-3 leading-6" : "mt-5 leading-7 md:text-base")}>
              {compact ? localized.dashboardIntro : localized.intro}
            </p>

            <div
              className={cn(
                "grid gap-3",
                compact ? "mt-5" : "mt-7",
                compact ? "sm:grid-cols-2" : "sm:grid-cols-3"
              )}
            >
              {displayedMetrics.map(([value, label], index) => (
                <div
                  key={`${value}-${label}`}
                  className={cn(
                    "min-w-0 rounded-2xl border border-border bg-white px-4 py-3 shadow-sm",
                    compact && index === displayedMetrics.length - 1 ? "sm:col-span-2" : ""
                  )}
                >
                  <p className="break-words text-xl font-black leading-tight text-foreground md:text-2xl">{value}</p>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>

            <div className={cn("space-y-2", compact ? "mt-5" : "mt-7")}>
              {steps.map((step, index) => {
                const Icon = step.icon
                const active = activeStep === index
                return (
                  <button
                    key={step.label}
                    type="button"
                    onClick={() => jumpToStep(index)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-2xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff6b57]",
                      compact ? "p-2.5" : "p-3",
                      active
                        ? "border-[#ff6b57]/35 bg-[#fff3f0] shadow-sm"
                        : "border-border bg-white hover:border-[#ff6b57]/30 hover:bg-[#fff8f6]"
                    )}
                  >
                    <span
                      className={cn(
                        "flex shrink-0 items-center justify-center rounded-xl",
                        compact ? "h-9 w-9" : "h-10 w-10",
                        active ? "bg-[#ff6b57] text-white" : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                        0{index + 1} / {step.label}
                      </span>
                      <span className="mt-1 block text-sm font-black text-foreground">
                        {step.title}
                      </span>
                      {active && (
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {step.text}
                        </span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>

            {!compact && (
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-6 text-sm font-black text-background shadow-xl shadow-slate-900/15 transition hover:-translate-y-0.5"
                >
                  {localized.cta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard/listings"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-white px-6 text-sm font-bold text-foreground shadow-sm transition hover:border-[#ff6b57]/30 hover:bg-[#fff8f6]"
                >
                  <FileCheck2 className="h-4 w-4" />
                  {localized.secondary}
                </Link>
              </div>
            )}
          </div>

          <div className={cn("order-first", compact ? "h-full xl:order-none" : "lg:order-none")}>
            <IsometricScene
              activeStep={activeStep}
              compact={compact}
              routePathRef={routePathRef}
              sceneLabels={localized.scene}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
