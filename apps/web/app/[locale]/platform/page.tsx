import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileCheck2,
  LineChart,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { DashboardPreview } from "@/components/dashboard-preview"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"

const capabilityIcons = [Building2, UsersRound, ShieldCheck]
const qualityIcons = [CheckCircle2, FileCheck2, LineChart]

const platformCopy = {
  tr: {
    badge: "1Çatı ERP Platform",
    heroTitle: "Emlak satışını, site yönetimini ve servis operasyonunu tek çalışma alanında yönetin.",
    heroBody:
      "1Çatı; CRM, portföy, finans, servis, belge, uyumluluk ve malik raporlamasını Türkiye emlak pazarı için tasarlanmış rol bazlı bir ERP deneyiminde birleştirir.",
    primaryCta: "Çalışma alanına gir",
    secondaryCta: "Ürün akışını incele",
    metrics: [
      { label: "operasyon kaydı", value: "212.298+" },
      { label: "portföy akışı", value: "10.000+" },
      { label: "tamamlanan işlem", value: "6.000+" },
      { label: "rol bazlı ekip", value: "150" },
    ],
    modelEyebrow: "Operasyon modeli",
    modelTitle: "Tek kayıt, net yetki, hızlı aksiyon.",
    modelBody:
      "Ekipler arası kopukluk yerine, her işlem daire, kişi, belge, ödeme ve görev ilişkisiyle görünür hale gelir.",
    capabilities: [
      {
        title: "Portföy ve daire kontrolü",
        text: "Blok, kat, daire, malik, sakin, borç, servis ve erişim durumu tek kayıt üzerinden filtrelenir.",
      },
      {
        title: "CRM ve rol bazlı çalışma",
        text: "Satış, muhasebe, saha, güvenlik, malik ve kiracı ekranları aynı veriye kendi yetki kapsamıyla erişir.",
      },
      {
        title: "Uyumluluk ve denetim",
        text: "EİDS, TAPU, belge, ödeme, erişim ve hassas aksiyonlar izlenebilir karar kayıtlarıyla yönetilir.",
      },
    ],
    modulesTitle: "Temel ERP modülleri",
    platformModules: [
      "CRM, lead ve iletişim merkezi",
      "Daire matrisi ve portföy yönetimi",
      "Servis, saha görevleri ve SLA takibi",
      "Finans defteri, aidat ve tahsilat",
      "Belge kasası, TAPU, KYC ve EİDS kontrolleri",
      "Malik, kiracı, personel ve rol matrisi",
    ],
    integrationsTitle: "Entegrasyon ve otomasyon katmanı",
    integrationModules: [
      "E-posta, SMS, WhatsApp/Telegram ve bildirim sağlayıcıları",
      "Ödeme, banka mutabakatı ve dijital bakiye yükleme akışları",
      "Erişim kontrolü, plaka/kart/bariyer ve sayaç entegrasyonları",
      "AI brifing, risk sıralama, kaynaklı yanıtlar ve insan onaylı aksiyonlar",
    ],
    qualityEyebrow: "Kalite standardı",
    qualityTitle: "Üretim sistemi gibi tasarlanır, kontrol sistemi gibi işletilir.",
    qualityGates: [
      { title: "Güvenilir", text: "TypeScript, üretim build'i, tarayıcı kontrolleri ve rol bazlı testler release öncesi çalıştırılır." },
      { title: "İzlenebilir", text: "Finans, erişim, belge ve veri değişiklikleri aktör, zaman, modül ve gerekçe ile kaydedilir." },
      { title: "Ölçeklenebilir", text: "769 birimlik operasyon verisi, çok dilli ekipler ve büyüyen portföy için modüler yapı kullanılır." },
    ],
  },
  en: {
    badge: "1Çatı ERP Platform",
    heroTitle: "Manage real-estate sales, site management, and service operations in one workspace.",
    heroBody:
      "1Çatı combines CRM, portfolio, finance, service, documents, compliance, and owner reporting in a role-based ERP experience designed for the Turkish real-estate market.",
    primaryCta: "Enter workspace",
    secondaryCta: "Review product flow",
    metrics: [
      { label: "operation records", value: "212,298+" },
      { label: "portfolio flows", value: "10,000+" },
      { label: "completed actions", value: "6,000+" },
      { label: "role-based team", value: "150" },
    ],
    modelEyebrow: "Operating model",
    modelTitle: "One record, clear permission, fast action.",
    modelBody:
      "Instead of disconnected handoffs, every action is visible through its unit, person, document, payment, and task relationship.",
    capabilities: [
      {
        title: "Portfolio and unit control",
        text: "Block, floor, unit, owner, resident, debt, service, and access status are filtered from one record.",
      },
      {
        title: "CRM and role-based work",
        text: "Sales, accounting, field, security, owner, and tenant views access the same data within their permission scope.",
      },
      {
        title: "Compliance and audit",
        text: "EİDS, TAPU, documents, payments, access, and sensitive actions are managed with traceable decision records.",
      },
    ],
    modulesTitle: "Core ERP modules",
    platformModules: [
      "CRM, lead, and communication center",
      "Unit matrix and portfolio management",
      "Service, field tasks, and SLA tracking",
      "Finance ledger, dues, and collections",
      "Document vault, TAPU, KYC, and EİDS checks",
      "Owner, tenant, staff, and role matrix",
    ],
    integrationsTitle: "Integration and automation layer",
    integrationModules: [
      "Email, SMS, WhatsApp/Telegram, and notification providers",
      "Payment, bank reconciliation, and digital balance top-up flows",
      "Access control, license plate, card, barrier, and meter integrations",
      "AI briefings, risk ranking, cited answers, and human-approved actions",
    ],
    qualityEyebrow: "Quality standard",
    qualityTitle: "Designed like a production system, operated like a control system.",
    qualityGates: [
      { title: "Reliable", text: "TypeScript, production build, browser checks, and role-based tests run before release." },
      { title: "Traceable", text: "Finance, access, document, and data changes are recorded with actor, time, module, and reason." },
      { title: "Scalable", text: "A modular structure supports 769 operational units, multilingual teams, and a growing portfolio." },
    ],
  },
  de: {
    badge: "1Çatı ERP-Plattform",
    heroTitle: "Immobilienvertrieb, Site Management und Servicebetrieb in einem Arbeitsbereich steuern.",
    heroBody:
      "1Çatı verbindet CRM, Portfolio, Finanzen, Service, Dokumente, Compliance und Eigentümerberichte in einer rollenbasierten ERP-Erfahrung für den türkischen Immobilienmarkt.",
    primaryCta: "Arbeitsbereich öffnen",
    secondaryCta: "Produktfluss prüfen",
    metrics: [
      { label: "Operationsdatensätze", value: "212.298+" },
      { label: "Portfolioflüsse", value: "10.000+" },
      { label: "abgeschlossene Vorgänge", value: "6.000+" },
      { label: "rollenbasiertes Team", value: "150" },
    ],
    modelEyebrow: "Betriebsmodell",
    modelTitle: "Ein Datensatz, klare Berechtigung, schnelle Aktion.",
    modelBody:
      "Statt getrennter Übergaben wird jeder Vorgang über Einheit, Person, Dokument, Zahlung und Aufgabe sichtbar.",
    capabilities: [
      {
        title: "Portfolio- und Einheitenkontrolle",
        text: "Block, Etage, Einheit, Eigentümer, Bewohner, Schuld, Service und Zugang werden aus einem Datensatz gefiltert.",
      },
      {
        title: "CRM und rollenbasierte Arbeit",
        text: "Vertrieb, Buchhaltung, Außendienst, Sicherheit, Eigentümer und Mieter greifen im eigenen Berechtigungsumfang auf dieselben Daten zu.",
      },
      {
        title: "Compliance und Audit",
        text: "EİDS, TAPU, Dokumente, Zahlungen, Zugang und sensible Aktionen werden mit nachvollziehbaren Entscheidungsprotokollen gesteuert.",
      },
    ],
    modulesTitle: "Kernmodule des ERP",
    platformModules: [
      "CRM, Lead- und Kommunikationszentrum",
      "Wohnungsmatrix und Portfoliomanagement",
      "Service, Feldaufgaben und SLA-Nachverfolgung",
      "Finanzbuch, Beiträge und Zahlungseingänge",
      "Dokumenten-Tresor, TAPU, KYC und EİDS-Prüfungen",
      "Eigentümer-, Mieter-, Personal- und Rollenmatrix",
    ],
    integrationsTitle: "Integrations- und Automatisierungsebene",
    integrationModules: [
      "E-Mail, SMS, WhatsApp/Telegram und Benachrichtigungsanbieter",
      "Zahlungen, Bankabgleich und digitale Saldo-Aufladung",
      "Zugangskontrolle, Kennzeichen, Karte, Schranke und Zählerintegration",
      "KI-Briefings, Risikosortierung, belegte Antworten und menschlich freigegebene Aktionen",
    ],
    qualityEyebrow: "Qualitätsstandard",
    qualityTitle: "Wie ein Produktionssystem entworfen, wie ein Kontrollsystem betrieben.",
    qualityGates: [
      { title: "Zuverlässig", text: "TypeScript, Produktionsbuild, Browserprüfungen und rollenbasierte Tests laufen vor jedem Release." },
      { title: "Nachvollziehbar", text: "Finanz-, Zugangs-, Dokumenten- und Datenänderungen werden mit Akteur, Zeit, Modul und Grund protokolliert." },
      { title: "Skalierbar", text: "Die modulare Struktur unterstützt 769 operative Einheiten, mehrsprachige Teams und wachsendes Portfolio." },
    ],
  },
  ru: {
    badge: "ERP-платформа 1Çatı",
    heroTitle: "Управляйте продажами недвижимости, комплексом и сервисными операциями в одном рабочем пространстве.",
    heroBody:
      "1Çatı объединяет CRM, портфель, финансы, сервис, документы, compliance и отчеты владельцев в ролевой ERP-среде для рынка недвижимости Турции.",
    primaryCta: "Открыть рабочее пространство",
    secondaryCta: "Посмотреть продуктовый поток",
    metrics: [
      { label: "операционных записей", value: "212 298+" },
      { label: "портфельных потоков", value: "10 000+" },
      { label: "завершенных действий", value: "6 000+" },
      { label: "ролевая команда", value: "150" },
    ],
    modelEyebrow: "Операционная модель",
    modelTitle: "Одна запись, понятные права, быстрое действие.",
    modelBody:
      "Вместо разрозненных передач каждое действие видно через связь с юнитом, человеком, документом, оплатой и задачей.",
    capabilities: [
      {
        title: "Контроль портфеля и юнитов",
        text: "Блок, этаж, юнит, владелец, резидент, долг, сервис и доступ фильтруются из одной записи.",
      },
      {
        title: "CRM и работа по ролям",
        text: "Продажи, бухгалтерия, полевая команда, безопасность, владельцы и арендаторы работают с одними данными в своем уровне доступа.",
      },
      {
        title: "Compliance и аудит",
        text: "EİDS, TAPU, документы, оплаты, доступ и чувствительные действия ведутся с прослеживаемыми решениями.",
      },
    ],
    modulesTitle: "Основные ERP-модули",
    platformModules: [
      "CRM, лиды и коммуникационный центр",
      "Матрица юнитов и управление портфелем",
      "Сервис, полевые задачи и контроль SLA",
      "Финансовый журнал, взносы и оплаты",
      "Хранилище документов, TAPU, KYC и проверки EİDS",
      "Матрица владельцев, арендаторов, персонала и ролей",
    ],
    integrationsTitle: "Слой интеграций и автоматизации",
    integrationModules: [
      "E-mail, SMS, WhatsApp/Telegram и провайдеры уведомлений",
      "Оплаты, банковская сверка и цифровое пополнение баланса",
      "Контроль доступа, номера авто, карты, шлагбаумы и счетчики",
      "AI-брифинги, ранжирование рисков, ответы с источниками и действия с одобрением человека",
    ],
    qualityEyebrow: "Стандарт качества",
    qualityTitle: "Проектируется как production-система, управляется как система контроля.",
    qualityGates: [
      { title: "Надежно", text: "TypeScript, production build, браузерные проверки и ролевые тесты выполняются перед релизом." },
      { title: "Прослеживаемо", text: "Изменения финансов, доступа, документов и данных сохраняются с актером, временем, модулем и причиной." },
      { title: "Масштабируемо", text: "Модульная структура поддерживает 769 операционных юнитов, многоязычные команды и растущий портфель." },
    ],
  },
} as const

function resolvePlatformLocale(locale: string) {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

export default async function PlatformPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const copy = platformCopy[resolvePlatformLocale(locale)]
  const operatingCapabilities = copy.capabilities.map((capability, index) => ({
    ...capability,
    icon: capabilityIcons[index],
  }))
  const qualityGates = copy.qualityGates.map((gate, index) => ({
    ...gate,
    icon: qualityIcons[index],
  }))

  return (
    <>
      <Navbar />
      <div className="h-16" />
      <main id="main" className="relative overflow-hidden">
        <section className="border-b border-border/60 bg-background py-16 sm:py-20 lg:py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <ScrollReveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.badge}
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                  {copy.heroTitle}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {copy.heroBody}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    {copy.primaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/#platform"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    {copy.secondaryCta}
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} direction="left">
              <div className="relative">
                <div className="absolute inset-x-8 top-8 h-44 rounded-lg bg-primary/10 blur-3xl" />
                <DashboardPreview className="relative shadow-2xl shadow-foreground/10" />
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="bg-muted/30 py-10">
          <div className="container grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.metrics.map((metric) => (
              <ScrollReveal key={metric.label}>
                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="text-3xl font-black text-foreground">{metric.value}</div>
                  <div className="mt-2 text-sm font-medium text-muted-foreground">{metric.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container">
            <ScrollReveal className="max-w-3xl">
              <p className="text-sm font-bold uppercase text-primary">{copy.modelEyebrow}</p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                {copy.modelTitle}
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                {copy.modelBody}
              </p>
            </ScrollReveal>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {operatingCapabilities.map((point, index) => (
                <ScrollReveal key={point.title} delay={index * 0.08}>
                  <article className="h-full rounded-lg border border-border bg-card p-6">
                    <point.icon className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-lg font-black text-foreground">{point.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{point.text}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section id="modules" className="border-y border-border/60 bg-card py-16 sm:py-20">
          <div className="container grid gap-6 lg:grid-cols-2">
            <ScrollReveal>
              <div className="h-full rounded-lg border border-primary/20 bg-primary/5 p-6">
                <h2 className="text-2xl font-black text-foreground">{copy.modulesTitle}</h2>
                <ul className="mt-6 space-y-4">
                  {copy.platformModules.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.1} direction="left">
              <div className="h-full rounded-lg border border-accent/25 bg-accent/5 p-6">
                <h2 className="text-2xl font-black text-foreground">{copy.integrationsTitle}</h2>
                <ul className="mt-6 space-y-4">
                  {copy.integrationModules.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-accent" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section id="quality" className="bg-muted/30 py-16 sm:py-20">
          <div className="container">
            <ScrollReveal className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase text-primary">{copy.qualityEyebrow}</p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                {copy.qualityTitle}
              </h2>
            </ScrollReveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {qualityGates.map((gate, index) => (
                <ScrollReveal key={gate.title} delay={index * 0.08}>
                  <article className="h-full rounded-lg border border-border bg-card p-6">
                    <gate.icon className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-lg font-black text-foreground">{gate.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{gate.text}</p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
