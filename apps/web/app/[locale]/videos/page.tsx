import type { Metadata } from "next"
import {
  ArrowDownCircle,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Gauge,
  LayoutDashboard,
  Sparkles,
  TimerReset,
  Video,
} from "lucide-react"

import { SiteConcierge } from "@/components/site-concierge"
import { VideoLibraryPlayer } from "@/components/video-library-player"
import { getVideoLibrary, resolveVideoLocale } from "@/lib/video-library"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Cati Training | 1Cati Property Management ERP",
  description:
    "A client-facing Cati Training page for 1Cati videos, tutorials, product value, role-based workflows and guided walkthroughs.",
}

const pageCopy = {
  en: {
    eyebrow: "Cati Training",
    title:
      "See how 1Cati turns property management into one controlled operating system.",
    body: "This page is built for decision makers and shows how sales, owners, tenants, service, finance, documents, AI and reporting work together inside one role-based ERP workspace.",
    primaryCta: "Start the walkthrough",
    secondaryCta: "Open client portal",
    stats: [
      ["212,298+", "operation records"],
      ["19", "guided business scenarios"],
      ["Approval", "ready for client decision"],
    ],
    proof: {
      eyebrow: "Why this matters now",
      title: "Modern real estate teams win with speed, transparency and data.",
      body: "1Cati makes that promise visible: fewer manual handoffs, cleaner accountability and a single operating view for management, field teams and customers.",
    },
    checklist: [
      "Sales, residents, service, payments and documents in one flow.",
      "Role-based access keeps every user focused on the right work.",
      "The video series is ready for management review, training and UAT.",
    ],
    valueCards: [
      [
        "One operating memory",
        "Portfolio, unit, owner, resident and service context stay connected instead of being split across spreadsheets and chats.",
      ],
      [
        "Faster daily control",
        "Management can see payment signals, SLA risk, pending approvals and next actions without waiting for manual reports.",
      ],
      [
        "AI with boundaries",
        "The assistant supports summaries and recommendations, while financial, access and role decisions stay under human approval.",
      ],
    ],
    playlistIntro: {
      eyebrow: "Guided product walkthrough",
      title: "Start with the business story, then go module by module.",
      body: "The playlist shows the full 1Cati workflow in a practical order: executive overview, login and roles, dashboard, units, people, service, finance, documents, AI, mobile work and launch readiness.",
      steps: ["Executive value", "Operational proof", "UAT readiness"],
    },
  },
  de: {
    eyebrow: "Cati Training",
    title:
      "Sehen Sie, wie 1Cati Immobilienverwaltung zu einem kontrollierten Betriebssystem macht.",
    body: "Diese Seite ist für Entscheider gebaut und zeigt, wie Vertrieb, Eigentümer, Mieter, Service, Finanzen, Dokumente, KI und Reporting in einem rollenbasierten ERP-Arbeitsbereich zusammenlaufen.",
    primaryCta: "Produktführung starten",
    secondaryCta: "Kundenportal öffnen",
    stats: [
      ["212.298+", "Betriebsdatensätze"],
      ["19", "geführte Geschäftsszenarien"],
      ["Freigabe", "bereit für Kundenentscheidung"],
    ],
    proof: {
      eyebrow: "Warum das jetzt zählt",
      title: "Moderne Immobilien-Teams gewinnen mit Tempo, Transparenz und Daten.",
      body: "1Cati macht diesen Anspruch sichtbar: weniger manuelle Übergaben, klare Verantwortlichkeit und eine gemeinsame Betriebsansicht für Management, Außendienst und Kunden.",
    },
    checklist: [
      "Vertrieb, Bewohner, Service, Zahlungen und Dokumente in einem Ablauf.",
      "Rollenbasierter Zugriff hält jeden Nutzer auf die richtige Arbeit fokussiert.",
      "Die Videoserie ist bereit für Management-Review, Schulung und UAT.",
    ],
    valueCards: [
      [
        "Ein operatives Gedächtnis",
        "Portfolio, Einheit, Eigentümer, Bewohner und Service-Kontext bleiben verbunden statt in Tabellen und Chats zu zerfallen.",
      ],
      [
        "Schnellere Tagessteuerung",
        "Das Management sieht Zahlungssignale, SLA-Risiken, offene Freigaben und nächste Schritte ohne manuelle Reports.",
      ],
      [
        "KI mit Leitplanken",
        "Der Assistent unterstützt Zusammenfassungen und Empfehlungen, während Finanz-, Zugangs- und Rollenentscheidungen beim Menschen bleiben.",
      ],
    ],
    playlistIntro: {
      eyebrow: "Geführte Produktführung",
      title: "Beginnen Sie mit der Business-Story und gehen Sie dann Modul für Modul weiter.",
      body: "Die Playlist zeigt den vollständigen 1Cati-Ablauf in sinnvoller Reihenfolge: Management-Überblick, Login und Rollen, Dashboard, Einheiten, Menschen, Service, Finanzen, Dokumente, KI, mobiles Arbeiten und Go-live-Bereitschaft.",
      steps: ["Management-Nutzen", "Operativer Nachweis", "UAT-Bereitschaft"],
    },
  },
  tr: {
    eyebrow: "Cati Training",
    title: "1Çatı ile site yönetimini tek merkezden görün, yönetin ve büyütün.",
    body: "Bu sayfa karar vericiler için hazırlandı ve satış, malik, kiracı, servis, finans, belge, yapay zeka ve raporlamanın tek rol bazlı ERP çalışma alanında nasıl birleştiğini canlı akışlarla gösterir.",
    primaryCta: "Ürün turunu başlat",
    secondaryCta: "Müşteri portalını aç",
    stats: [
      ["212.298+", "operasyon kaydı"],
      ["19", "rehber iş senaryosu"],
      ["Onay", "müşteri kararına hazır"],
    ],
    proof: {
      eyebrow: "Neden şimdi önemli",
      title: "Modern gayrimenkul ekipleri hız, şeffaflık ve veri ile kazanır.",
      body: "1Çatı bu vaadi ekranda görünür yapar: daha az manuel takip, daha net sorumluluk ve yönetim, saha ekipleri ile müşteriler için ortak bir operasyon görünümü.",
    },
    checklist: [
      "Satış, sakinler, servis, ödemeler ve belgeler tek akışta birleşir.",
      "Rol bazlı erişim her kullanıcıyı doğru işe ve doğru bilgiye yönlendirir.",
      "Video serisi yönetim incelemesi, eğitim ve UAT için hazırdır.",
    ],
    valueCards: [
      [
        "Tek operasyon hafızası",
        "Portföy, daire, malik, sakin ve servis geçmişi tablo ve mesajlara dağılmadan aynı bağlamda kalır.",
      ],
      [
        "Daha hızlı günlük kontrol",
        "Yönetim ödeme sinyallerini, SLA riskini, bekleyen onayları ve sonraki aksiyonları manuel rapor beklemeden görür.",
      ],
      [
        "Sınırları net yapay zeka",
        "Asistan özet ve öneriler üretir; finans, erişim ve rol kararları ise insan onayıyla ilerler.",
      ],
    ],
    playlistIntro: {
      eyebrow: "Rehberli ürün turu",
      title: "Önce iş değerini görün, sonra modülleri adım adım inceleyin.",
      body: "Video listesi 1Çatı akışını doğru sırayla gösterir: yönetim özeti, login ve roller, dashboard, daireler, kişiler, servis, finans, belgeler, yapay zeka, mobil çalışma ve canlıya geçiş hazırlığı.",
      steps: ["Yönetim değeri", "Operasyon kanıtı", "UAT hazırlığı"],
    },
  },
  ru: {
    eyebrow: "Cati Training",
    title:
      "Посмотрите, как 1Cati превращает управление недвижимостью в единую операционную систему.",
    body: "Эта страница создана для руководителей: она показывает, как продажи, владельцы, арендаторы, сервис, финансы, документы, ИИ и отчеты работают вместе в одном ERP-пространстве с ролями.",
    primaryCta: "Начать обзор",
    secondaryCta: "Открыть портал",
    stats: [
      ["212 298+", "операционных записей"],
      ["19", "бизнес-сценариев"],
      ["Согласование", "готово к решению клиента"],
    ],
    proof: {
      eyebrow: "Почему это важно сейчас",
      title: "Современные команды недвижимости выигрывают за счет скорости, прозрачности и данных.",
      body: "1Cati показывает это на практике: меньше ручных передач, понятная ответственность и единый операционный обзор для руководства, полевых команд и клиентов.",
    },
    checklist: [
      "Продажи, жители, сервис, платежи и документы объединены в одном процессе.",
      "Ролевой доступ показывает каждому пользователю только нужную работу и данные.",
      "Видеосерия готова для управленческого review, обучения и UAT.",
    ],
    valueCards: [
      [
        "Единая операционная память",
        "Портфель, объект, владелец, житель и сервисная история остаются в одном контексте, а не распадаются по таблицам и чатам.",
      ],
      [
        "Быстрее ежедневный контроль",
        "Руководство видит платежные сигналы, SLA-риски, ожидающие согласования и следующие действия без ручных отчетов.",
      ],
      [
        "ИИ с четкими границами",
        "Ассистент помогает с резюме и рекомендациями, а финансовые, доступные и ролевые решения остаются под контролем человека.",
      ],
    ],
    playlistIntro: {
      eyebrow: "Пошаговый обзор продукта",
      title: "Сначала бизнес-ценность, затем каждый модуль по порядку.",
      body: "Плейлист показывает полный поток 1Cati в логичном порядке: обзор для руководства, вход и роли, dashboard, объекты, люди, сервис, финансы, документы, ИИ, мобильная работа и готовность к запуску.",
      steps: ["Ценность для руководства", "Операционное доказательство", "Готовность к UAT"],
    },
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
  const heroImage =
    library.videos[0]?.thumbnailUrl ?? "/new-level-premium/resort-exterior.jpg"

  return (
    <main id="main" className="min-h-screen overflow-hidden bg-background">
      <Navbar />

      <section className="relative isolate pt-28 pb-8 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,var(--background)),var(--background)_46%,color-mix(in_srgb,#f6a94a_9%,var(--background)))]" />
        <div className="absolute inset-x-0 bottom-0 -z-10 h-px bg-border" />

        <div className="mx-auto grid max-w-[88rem] items-start gap-8 px-4 sm:px-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.43fr)] xl:px-8">
          <div className="min-w-0 max-w-5xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-black tracking-[0.16em] text-primary uppercase shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {copy.eyebrow}
            </span>
            <h1 className="mt-5 max-w-5xl text-[2rem] leading-[1.08] font-black tracking-tight text-balance text-foreground hyphens-none [overflow-wrap:break-word] sm:text-5xl sm:leading-[1.05] lg:text-6xl 2xl:text-7xl">
              {copy.title}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {copy.body}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:-translate-y-0.5 hover:bg-primary/90 sm:w-auto"
                href="#video-library"
              >
                <ArrowDownCircle className="h-5 w-5" aria-hidden="true" />
                {copy.primaryCta}
              </a>
              <a
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 text-sm font-black text-foreground shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:text-primary sm:w-auto"
                href={`/${locale}/login`}
              >
                <Building2 className="h-5 w-5" aria-hidden="true" />
                {copy.secondaryCta}
              </a>
            </div>

            <div className="mt-7 grid gap-3 text-sm leading-6 text-muted-foreground">
              {copy.checklist.map((item) => (
                <div key={item} className="flex gap-3">
                  <CheckCircle2
                    className="mt-0.5 h-5 w-5 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="premium-surface mx-auto w-full max-w-[34rem] min-w-0 rounded-3xl p-4 sm:p-5 xl:max-w-none xl:p-6">
            <div className="relative mb-5 aspect-video overflow-hidden rounded-2xl border border-border bg-muted shadow-sm">
              <div
                aria-label={`${copy.eyebrow} title image`}
                className="absolute inset-0 bg-cover bg-center"
                role="img"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(4, 24, 22, 0.08), rgba(4, 24, 22, 0.5)), url(${heroImage})`,
                }}
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 to-transparent p-4">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-black tracking-[0.14em] text-primary uppercase shadow-sm">
                  <Video className="h-3.5 w-3.5" aria-hidden="true" />
                  {copy.eyebrow}
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 text-xs font-black tracking-[0.16em] text-primary uppercase">
              <TimerReset className="h-4 w-4" aria-hidden="true" />
              {copy.proof.eyebrow}
            </span>
            <h2 className="mt-3 text-xl leading-tight font-black text-foreground hyphens-auto [overflow-wrap:anywhere] sm:text-2xl">
              {copy.proof.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {copy.proof.body}
            </p>
            <div className="mt-6 grid gap-2 rounded-2xl border border-border bg-background/55 p-2">
              {copy.stats.map(([value, label]) => (
                <div
                  key={`${value}-${label}`}
                  className="grid min-w-0 gap-2 rounded-xl bg-card/55 p-3 sm:grid-cols-[minmax(96px,auto)_minmax(0,1fr)] sm:items-center sm:gap-4"
                >
                  <div className="min-w-0 text-2xl leading-none font-black text-foreground">
                    {value}
                  </div>
                  <div className="min-w-0 text-[11px] leading-5 font-black tracking-[0.08em] text-muted-foreground uppercase [overflow-wrap:anywhere] sm:text-xs sm:tracking-[0.1em]">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="mx-auto grid max-w-[88rem] items-stretch gap-4 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-3 lg:px-8">
        {copy.valueCards.map(([title, body], index) => {
          const Icon =
            index === 0 ? LayoutDashboard : index === 1 ? Gauge : BrainCircuit
          return (
            <div
              key={title}
              className="flex min-h-44 flex-col rounded-2xl border border-border bg-card/88 p-5 shadow-sm backdrop-blur"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h2 className="text-base leading-tight font-black text-foreground">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{body}</p>
            </div>
          )
        })}
      </section>

      <section className="border-y border-border bg-card/45 py-10 sm:py-12">
        <div className="mx-auto grid max-w-[88rem] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.42fr)] lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-black tracking-[0.16em] text-primary uppercase">
              <Video className="h-4 w-4" aria-hidden="true" />
              {copy.playlistIntro.eyebrow}
            </span>
            <h2 className="mt-2 max-w-4xl text-[1.75rem] leading-[1.14] font-black text-foreground hyphens-none [overflow-wrap:break-word] sm:text-4xl sm:leading-tight">
              {copy.playlistIntro.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              {copy.playlistIntro.body}
            </p>
          </div>
          <ol className="grid overflow-hidden rounded-2xl border border-border bg-background/78 p-2 shadow-sm sm:grid-cols-3 lg:grid-cols-1">
            {copy.playlistIntro.steps.map((step, index) => (
              <li
                key={step}
                className="flex min-h-16 items-center gap-3 border-border px-4 py-3 sm:border-l sm:first:border-l-0 lg:border-l-0 lg:border-t lg:first:border-t-0"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 text-sm leading-tight font-black text-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <VideoLibraryPlayer library={library} locale={locale} />

      <Footer />
      <div className="hidden sm:block">
        <SiteConcierge page="videos" />
      </div>
    </main>
  )
}
