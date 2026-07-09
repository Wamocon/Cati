import type { Metadata } from "next"
import Image from "next/image"
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  Languages,
  LockKeyhole,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  WalletCards,
  Wrench,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { SiteConcierge } from "@/components/site-concierge"
import { resolveDashboardLocale } from "@/lib/unit-matrix-copy"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"

export const metadata: Metadata = {
  title: "1Cati Demo | Product Walkthrough",
  description:
    "A clear multilingual product demo hub for the 1Cati property-management platform.",
}

const chapterIcons = {
  operations: Building2,
  matrix: Building2,
  service: Wrench,
  finance: WalletCards,
  ai: Sparkles,
  roles: LockKeyhole,
  offer: ShieldCheck,
} as const

const copy = {
  tr: {
    eyebrow: "1Çatı Demo",
    title: "Modern konut projeleri için tek operasyon çatısı",
    body: "Kısa demo akışı; 769 daireyi, servis taleplerini, finans kontrolünü, AI destekli karar hazırlığını ve rol bazlı erişimi tek hikayede gösterir.",
    videoLabel: "Tanıtım videosu",
    videoTitle: "2 dakikada 1Çatı çalışma akışı",
    videoBody:
      "Avatar anlatımı ve gerçek ekran kayıtları birlikte kullanılır. Amaç; müşteriye sistemi hızlı, net ve güvenilir şekilde anlatmaktır.",
    primaryCta: "Canlı paneli aç",
    secondaryCta: "Teklif akışını gör",
    proof: ["769 daire modeli", "Servis + SLA", "Finans kontrolü", "AI öneri, insan onayı"],
    languageTitle: "Dört dilde aynı net hikaye",
    languageBody:
      "Öncelik Türkçe. Aynı akış Rusça, İngilizce ve Almanca sürümlerle desteklenir; her dilde kısa, profesyonel ve bağlama uygun anlatım kullanılır.",
    languages: [
      ["TR", "Türkçe", "Birincil demo dili"],
      ["RU", "Русский", "Malik ve yatırımcı dili"],
      ["EN", "English", "Uluslararası özet"],
      ["DE", "Deutsch", "WAMOCON ve yönetim anlatımı"],
    ],
    chaptersTitle: "Demo bölümleri",
    chaptersBody:
      "Sayfa, uzun üretim listesi yerine müşterinin karar vermesi için gereken bölümleri gösterir.",
    chapters: [
      ["operations", "Operasyon merkezi", "Yönetim, servis, finans ve riskler tek ekranda toplanır."],
      ["matrix", "Daire matrisi", "Blok, kat, malik, borç, erişim ve servis durumu birlikte görünür."],
      ["service", "Servis ve SLA", "Talepler sınıflandırılır, önceliklendirilir ve kanıtla kapatılır."],
      ["finance", "Finans kontrolü", "Aidat, ödeme, borç ve kısıtlama kararları denetlenebilir olur."],
      ["ai", "AI destekli karar", "AI özetler ve önerir; kritik kararlar insan onayıyla ilerler."],
      ["roles", "Rol bazlı erişim", "Yönetici, muhasebe, personel, malik ve kiracı farklı alan görür."],
      ["offer", "Net iş modeli", "Kurulum ve işletim WAMOCON tarafında, maliyet modeli müşteriye nettir."],
    ],
    closingTitle: "Toplantı için hazır anlatım",
    closingBody:
      "Bu sayfa müşteriye önce güven verir, sonra canlı panel veya teklif akışına geçiş için net bir yol açar.",
  },
  en: {
    eyebrow: "1Cati Demo",
    title: "One operating roof for modern residential projects",
    body: "A short demo flow shows 769 units, service tickets, finance control, AI-assisted decision preparation and role-based access in one clear story.",
    videoLabel: "Intro video",
    videoTitle: "The 1Cati workflow in 2 minutes",
    videoBody:
      "Avatar narration and real product footage work together to explain the platform quickly, clearly and credibly.",
    primaryCta: "Open live panel",
    secondaryCta: "View offer flow",
    proof: ["769-unit model", "Service + SLA", "Finance control", "AI recommends, humans approve"],
    languageTitle: "One clear story in four languages",
    languageBody:
      "Turkish comes first. The same flow is supported in Russian, English and German with short, professional and context-aware narration.",
    languages: [
      ["TR", "Türkçe", "Primary demo language"],
      ["RU", "Русский", "Owner and investor audience"],
      ["EN", "English", "International summary"],
      ["DE", "Deutsch", "WAMOCON and management framing"],
    ],
    chaptersTitle: "Demo chapters",
    chaptersBody:
      "A focused chapter overview shows only what helps a customer understand the platform and make a decision.",
    chapters: [
      ["operations", "Operations center", "Management, service, finance and risks come together on one screen."],
      ["matrix", "Unit matrix", "Block, floor, owner, debt, access and service status are visible together."],
      ["service", "Service and SLA", "Requests are classified, prioritized and closed with evidence."],
      ["finance", "Finance control", "Fees, payments, debt and restriction decisions become auditable."],
      ["ai", "AI-assisted decisions", "AI summarizes and recommends; critical decisions move with human approval."],
      ["roles", "Role-based access", "Managers, accounting, staff, owners and tenants see different areas."],
      ["offer", "Clear business model", "Setup and operations stay with WAMOCON while the customer sees a clear cost model."],
    ],
    closingTitle: "A meeting-ready explanation",
    closingBody:
      "This page builds trust first, then gives the visitor a clear path into the live panel or offer flow.",
  },
  de: {
    eyebrow: "1Cati Demo",
    title: "Ein Betriebsdach für moderne Wohnprojekte",
    body: "Der kurze Demo-Ablauf zeigt 769 Einheiten, Service-Tickets, Finanzkontrolle, KI-gestützte Entscheidungsvorbereitung und rollenbasierten Zugriff in einer klaren Geschichte.",
    videoLabel: "Introvideo",
    videoTitle: "Der 1Cati Ablauf in 2 Minuten",
    videoBody:
      "Avatar-Erklärung und echte Produktaufnahmen erklären die Plattform schnell, klar und glaubwürdig.",
    primaryCta: "Live-Panel öffnen",
    secondaryCta: "Angebotslogik ansehen",
    proof: ["769-Einheiten-Modell", "Service + SLA", "Finanzkontrolle", "KI empfiehlt, Menschen geben frei"],
    languageTitle: "Eine klare Geschichte in vier Sprachen",
    languageBody:
      "Türkisch hat Priorität. Derselbe Ablauf wird auf Russisch, Englisch und Deutsch mit kurzer, professioneller und kontextgerechter Sprache unterstützt.",
    languages: [
      ["TR", "Türkçe", "Primäre Demo-Sprache"],
      ["RU", "Русский", "Eigentümer und Investoren"],
      ["EN", "English", "Internationale Kurzfassung"],
      ["DE", "Deutsch", "WAMOCON- und Management-Perspektive"],
    ],
    chaptersTitle: "Demo-Kapitel",
    chaptersBody:
      "Statt einer langen Produktionsliste zeigt diese Seite nur die Kapitel, die Kunden wirklich zum Verstehen und Entscheiden brauchen.",
    chapters: [
      ["operations", "Betriebszentrale", "Verwaltung, Service, Finanzen und Risiken laufen auf einem Bildschirm zusammen."],
      ["matrix", "Wohnungsmatrix", "Block, Etage, Eigentümer, Rückstand, Zugang und Service sind gemeinsam sichtbar."],
      ["service", "Service und SLA", "Anfragen werden klassifiziert, priorisiert und mit Nachweisen abgeschlossen."],
      ["finance", "Finanzkontrolle", "Beiträge, Zahlungen, Rückstände und Sperrentscheidungen werden prüfbar."],
      ["ai", "KI-gestützte Entscheidungen", "KI fasst zusammen und empfiehlt; kritische Entscheidungen bleiben bei Menschen."],
      ["roles", "Rollenbasierter Zugriff", "Management, Buchhaltung, Personal, Eigentümer und Mieter sehen unterschiedliche Bereiche."],
      ["offer", "Klares Geschäftsmodell", "Aufbau und Betrieb liegen bei WAMOCON, während das Kostenmodell klar bleibt."],
    ],
    closingTitle: "Bereit für das Kundengespräch",
    closingBody:
      "Diese Seite schafft zuerst Vertrauen und führt dann klar zum Live-Panel oder zur Angebotslogik.",
  },
  ru: {
    eyebrow: "Демо 1Cati",
    title: "Единый операционный центр для современных жилых проектов",
    body: "Короткий демо-сценарий показывает 769 квартир, сервисные заявки, финансовый контроль, AI-подготовку решений и ролевой доступ в одной понятной истории.",
    videoLabel: "Вводное видео",
    videoTitle: "Рабочий процесс 1Cati за 2 минуты",
    videoBody:
      "Аватарное объяснение и реальные экраны продукта помогают быстро, ясно и убедительно показать платформу.",
    primaryCta: "Открыть live-панель",
    secondaryCta: "Посмотреть модель предложения",
    proof: ["Модель 769 квартир", "Сервис + SLA", "Финансовый контроль", "AI предлагает, человек утверждает"],
    languageTitle: "Одна понятная история на четырех языках",
    languageBody:
      "Сначала турецкая версия. Тот же сценарий поддерживается на русском, английском и немецком с короткой, профессиональной и контекстной подачей.",
    languages: [
      ["TR", "Türkçe", "Основной язык демо"],
      ["RU", "Русский", "Для собственников и инвесторов"],
      ["EN", "English", "Международное резюме"],
      ["DE", "Deutsch", "Формат для WAMOCON и управления"],
    ],
    chaptersTitle: "Разделы демо",
    chaptersBody:
      "Вместо длинного производственного трекера страница показывает только то, что помогает клиенту понять ценность и принять решение.",
    chapters: [
      ["operations", "Операционный центр", "Управление, сервис, финансы и риски собраны на одном экране."],
      ["matrix", "Матрица квартир", "Блок, этаж, владелец, долг, доступ и сервисный статус видны вместе."],
      ["service", "Сервис и SLA", "Заявки классифицируются, получают приоритет и закрываются с доказательствами."],
      ["finance", "Финансовый контроль", "Взносы, платежи, долги и ограничения становятся проверяемыми."],
      ["ai", "AI-поддержка решений", "AI обобщает и предлагает; критические решения утверждает человек."],
      ["roles", "Ролевой доступ", "Менеджеры, бухгалтерия, персонал, владельцы и арендаторы видят разные зоны."],
      ["offer", "Понятная бизнес-модель", "Внедрение и эксплуатация остаются у WAMOCON, а модель затрат понятна клиенту."],
    ],
    closingTitle: "Готово для встречи с клиентом",
    closingBody:
      "Страница сначала создает доверие, а затем ведет посетителя к live-панели или модели предложения.",
  },
} as const

export default async function VideosPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveDashboardLocale(rawLocale)
  const t = copy[locale] ?? copy.tr

  return (
    <>
      <Navbar />
      <div className="h-16" />
      <main id="main" className="bg-background">
        <section className="relative isolate overflow-hidden border-b border-border">
          <Image
            src="/new-level-premium/masterplan-aerial.jpg"
            alt="New Level Premium aerial view"
            fill
            priority
            className="absolute inset-0 -z-20 object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 -z-10 bg-background/88 backdrop-blur-[1px]" />
          <div className="container grid min-h-[620px] items-center gap-10 py-12 sm:py-16 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="max-w-3xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-3 py-1 text-sm font-bold text-foreground backdrop-blur">
                <Eye className="h-4 w-4 text-primary" />
                {t.eyebrow}
              </div>
              <h1 className="text-4xl leading-tight font-black tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {t.title}
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                {t.body}
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/login?next=/dashboard"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
                >
                  {t.primaryCta}
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/pitch"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-background/80 px-5 py-3 text-sm font-black text-foreground backdrop-blur transition-colors hover:bg-muted"
                >
                  {t.secondaryCta}
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-border/70 bg-background/80 p-3 shadow-2xl backdrop-blur">
              <div className="relative aspect-video overflow-hidden rounded-[1.4rem] border border-border bg-slate-950">
                <Image
                  src="/new-level-premium/resort-exterior.jpg"
                  alt="1Cati product demo preview"
                  fill
                  className="object-cover opacity-55"
                  sizes="(min-width: 1024px) 52vw, 100vw"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-950/70 to-primary/20" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="grid place-items-center gap-3 text-center">
                    <div className="grid h-20 w-20 place-items-center rounded-full border border-white/25 bg-white/12 text-white shadow-2xl backdrop-blur">
                      <PlayCircle className="h-10 w-10" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">
                        {t.videoLabel}
                      </p>
                      <p className="mt-2 text-2xl font-black text-white sm:text-3xl">
                        {t.videoTitle}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="absolute right-4 bottom-4 left-4 rounded-2xl border border-white/12 bg-slate-950/72 p-4 text-sm leading-6 text-white/82 backdrop-blur">
                  {t.videoBody}
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {t.proof.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-2 text-sm font-bold text-foreground"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="container grid gap-6 py-10 sm:py-14 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-sm font-bold text-muted-foreground">
              <Languages className="h-4 w-4 text-primary" />
              {t.languageTitle}
            </div>
            <p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">
              {t.languageBody}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {t.languages.map(([code, label, note]) => (
              <article key={code} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{code}</p>
                <h2 className="mt-2 text-lg font-black text-foreground">{label}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{note}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-muted/30">
          <div className="container py-10 sm:py-14">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                {t.chaptersTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                {t.chaptersBody}
              </p>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {t.chapters.map(([id, title, description], index) => {
                const Icon = chapterIcons[id]
                return (
                  <article
                    key={id}
                    className="rounded-3xl border border-border bg-background p-5 shadow-sm transition-colors hover:border-primary/45"
                  >
                    <div className="flex items-start gap-4">
                      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                          {String(index + 1).padStart(2, "0")}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-foreground">{title}</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {description}
                        </p>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="container py-10 sm:py-14">
          <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm sm:p-8 lg:flex lg:items-center lg:justify-between lg:gap-8">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {t.closingTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base">
                {t.closingBody}
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row lg:mt-0">
              <Link
                href="/pitch"
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-background px-5 py-3 text-sm font-black text-foreground transition-colors hover:bg-muted"
              >
                {t.secondaryCta}
              </Link>
              <Link
                href="/login?next=/dashboard"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-black text-primary-foreground transition-colors hover:bg-primary/90"
              >
                {t.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <SiteConcierge page="videos" />
    </>
  )
}
