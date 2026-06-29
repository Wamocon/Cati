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

const metrics = [
  { label: "operasyon kaydı", value: "212.298+" },
  { label: "portföy akışı", value: "10.000+" },
  { label: "tamamlanan işlem", value: "6.000+" },
  { label: "rol bazlı ekip", value: "150" },
]

const operatingCapabilities = [
  {
    icon: Building2,
    title: "Portföy ve daire kontrolü",
    text: "Blok, kat, daire, malik, sakin, borç, servis ve erişim durumu tek kayıt üzerinden filtrelenir.",
  },
  {
    icon: UsersRound,
    title: "CRM ve rol bazlı çalışma",
    text: "Satış, muhasebe, saha, güvenlik, malik ve kiracı ekranları aynı veriye kendi yetki kapsamıyla erişir.",
  },
  {
    icon: ShieldCheck,
    title: "Uyumluluk ve denetim",
    text: "EİDS, TAPU, belge, ödeme, erişim ve hassas aksiyonlar izlenebilir karar kayıtlarıyla yönetilir.",
  },
]

const platformModules = [
  "CRM, lead ve iletişim merkezi",
  "Daire matrisi ve portföy yönetimi",
  "Servis, saha görevleri ve SLA takibi",
  "Finans defteri, aidat ve tahsilat",
  "Belge kasası, TAPU, KYC ve EİDS kontrolleri",
  "Malik, kiracı, personel ve rol matrisi",
]

const integrationModules = [
  "E-posta, SMS, WhatsApp/Telegram ve bildirim sağlayıcıları",
  "Ödeme, banka mutabakatı ve dijital bakiye yükleme akışları",
  "Erişim kontrolü, plaka/kart/bariyer ve sayaç entegrasyonları",
  "AI brifing, risk sıralama, kaynaklı yanıtlar ve insan onaylı aksiyonlar",
]

const qualityGates = [
  { icon: CheckCircle2, title: "Güvenilir", text: "TypeScript, üretim build'i, tarayıcı kontrolleri ve rol bazlı testler release öncesi çalıştırılır." },
  { icon: FileCheck2, title: "İzlenebilir", text: "Finans, erişim, belge ve veri değişiklikleri aktör, zaman, modül ve gerekçe ile kaydedilir." },
  { icon: LineChart, title: "Ölçeklenebilir", text: "769 birimlik operasyon verisi, çok dilli ekipler ve büyüyen portföy için modüler yapı kullanılır." },
]

export default function PlatformPage() {
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
                  1Çatı ERP Platform
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                  Emlak satışını, site yönetimini ve servis operasyonunu tek çalışma alanında yönetin.
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  1Çatı; CRM, portföy, finans, servis, belge, uyumluluk ve malik raporlamasını Türkiye emlak pazarı için
                  tasarlanmış rol bazlı bir ERP deneyiminde birleştirir.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    Çalışma alanına gir
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/#platform"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    Ürün akışını incele
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
            {metrics.map((metric) => (
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
              <p className="text-sm font-bold uppercase text-primary">Operasyon modeli</p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                Tek kayıt, net yetki, hızlı aksiyon.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Ekipler arası kopukluk yerine, her işlem daire, kişi, belge, ödeme ve görev ilişkisiyle görünür hale gelir.
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
                <h2 className="text-2xl font-black text-foreground">Temel ERP modülleri</h2>
                <ul className="mt-6 space-y-4">
                  {platformModules.map((item) => (
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
                <h2 className="text-2xl font-black text-foreground">Entegrasyon ve otomasyon katmanı</h2>
                <ul className="mt-6 space-y-4">
                  {integrationModules.map((item) => (
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
              <p className="text-sm font-bold uppercase text-primary">Kalite standardı</p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                Üretim sistemi gibi tasarlanır, kontrol sistemi gibi işletilir.
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
