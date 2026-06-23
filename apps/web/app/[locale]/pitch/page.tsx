import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Database,
  FileCheck2,
  LineChart,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { DashboardPreview } from "@/components/dashboard-preview"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"
import { TopBar } from "../../sections/top-bar"

const metrics = [
  { label: "database records", value: "212,298+" },
  { label: "active listing workflow", value: "10,000+" },
  { label: "completed transactions", value: "6,000+" },
  { label: "operational team", value: "150" },
]

const decisionPoints = [
  {
    icon: Database,
    title: "Unify the operating data",
    text: "Leads, listings, EIDS status, documents, owner reporting, payments, and tickets need one source of truth instead of chat, spreadsheets, drives, and portals.",
  },
  {
    icon: ShieldCheck,
    title: "Make compliance visible",
    text: "The platform separates MVP controls from roadmap automations, so Ataberk can act now without overpromising official integrations that depend on external systems.",
  },
  {
    icon: LineChart,
    title: "Turn service into margin",
    text: "Fast follow-up, documented handovers, owner transparency, and fewer manual checks compound into better conversion, fewer disputes, and higher repeat business.",
  },
]

const liveScope = [
  "Role-based dashboard for 10 operating profiles",
  "Demo-safe auth fallback and Supabase-ready sign-in",
  "Listing, lead, ticket, compliance, finance, document, report, user, and calendar modules",
  "Localized Turkish-first web experience with English, German, and Russian fallbacks",
]

const roadmapScope = [
  "Official EIDS, KBS/e-GUEST, Title Deed, and notary API automation when integrations are available",
  "Production Supabase data model, storage, realtime updates, and audit trails",
  "Twenty CRM self-hosting extension for Ataberk-specific property objects",
  "Owner portal, field mobile workflow, and advanced multi-currency financial reporting",
]

const operatingLayers = [
  "Demand capture",
  "Property control",
  "Compliance desk",
  "Owner service",
]

const qualityGates = [
  { icon: CheckCircle2, title: "Buildable", text: "TypeScript, lint, production build, and Playwright journeys stay in the release checklist." },
  { icon: LockKeyhole, title: "Governed", text: "Supabase mode disables local demo cookies unless explicitly enabled for staging." },
  { icon: FileCheck2, title: "Auditable", text: "MVP and roadmap claims are labeled so the proposal remains credible with decision makers." },
]

export default function PitchPage() {
  return (
    <>
      <TopBar />
      <Navbar />
      <div className="h-[104px]" />
      <main id="main" className="relative overflow-hidden">
        <section className="border-b border-border/60 bg-background py-16 sm:py-20 lg:py-24">
          <div className="container grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
            <ScrollReveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Executive pitch route
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                  1Çatı pitch deck for Ataberk Estate
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  A board-ready case for consolidating property sales, after-sales service, compliance, finance, and owner reporting into one Turkish-first operating platform.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    Open live portal
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="https://cati-pitch.vercel.app"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-bold text-foreground transition hover:bg-muted"
                  >
                    View static proposal
                  </a>
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
                  <div className="text-3xl font-black text-foreground">
                    {metric.value}
                  </div>
                  <div className="mt-2 text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container">
            <ScrollReveal className="max-w-3xl">
              <p className="text-sm font-bold uppercase text-primary">
                Why this deserves approval
              </p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                The pitch is not just software. It is operating leverage.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                Ataberk already has the demand, market credibility, multilingual staff, and property volume. 1Çatı turns that scale into a controlled system with fewer manual gaps and clearer accountability.
              </p>
            </ScrollReveal>
            <div className="mt-10 grid gap-4 lg:grid-cols-3">
              {decisionPoints.map((point, index) => (
                <ScrollReveal key={point.title} delay={index * 0.08}>
                  <article className="h-full rounded-lg border border-border bg-card p-6">
                    <point.icon className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-lg font-black text-foreground">
                      {point.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {point.text}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card py-16 sm:py-20">
          <div className="container grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <ScrollReveal>
              <p className="text-sm font-bold uppercase text-primary">
                Product architecture
              </p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                Four operational layers, one accountable workflow.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                The deck now connects the commercial promise to actual product surfaces: the public website, login, dashboard, role model, CRM modules, and the compliance roadmap.
              </p>
            </ScrollReveal>
            <ScrollReveal delay={0.1} direction="left">
              <div className="perspective-1000 min-h-[360px] overflow-hidden rounded-lg border border-border bg-muted/30 p-8">
                <div className="preserve-3d mx-auto mt-8 w-full max-w-md [transform:rotateX(58deg)_rotateZ(-34deg)]">
                  {operatingLayers.map((layer, index) => (
                    <div
                      key={layer}
                      className="mb-4 flex h-20 items-center justify-between rounded-lg border border-border bg-card px-5 shadow-xl shadow-foreground/10 [transform:translateZ(28px)]"
                    >
                      <span className="text-sm font-black text-foreground">
                        {layer}
                      </span>
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        0{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container grid gap-6 lg:grid-cols-2">
            <ScrollReveal>
              <div className="h-full rounded-lg border border-primary/20 bg-primary/5 p-6">
                <div className="flex items-center gap-3 text-primary">
                  <Building2 className="h-6 w-6" />
                  <h2 className="text-2xl font-black text-foreground">
                    Included in the current MVP
                  </h2>
                </div>
                <ul className="mt-6 space-y-4">
                  {liveScope.map((item) => (
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
                <div className="flex items-center gap-3 text-accent">
                  <CalendarClock className="h-6 w-6" />
                  <h2 className="text-2xl font-black text-foreground">
                    Roadmap after approval
                  </h2>
                </div>
                <ul className="mt-6 space-y-4">
                  {roadmapScope.map((item) => (
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

        <section className="bg-muted/30 py-16 sm:py-20">
          <div className="container">
            <ScrollReveal className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-bold uppercase text-primary">
                Confidence gates
              </p>
              <h2 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">
                Built to survive client scrutiny.
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                The product story now maps to working software, guarded authentication, clear scope, and release checks instead of being a disconnected sales page.
              </p>
            </ScrollReveal>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {qualityGates.map((gate, index) => (
                <ScrollReveal key={gate.title} delay={index * 0.08}>
                  <article className="h-full rounded-lg border border-border bg-card p-6">
                    <gate.icon className="h-7 w-7 text-primary" />
                    <h3 className="mt-5 text-lg font-black text-foreground">
                      {gate.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {gate.text}
                    </p>
                  </article>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 sm:py-20">
          <div className="container">
            <ScrollReveal>
              <div className="rounded-lg border border-border bg-foreground p-8 text-background sm:p-10">
                <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-sm font-bold uppercase text-background/70">
                      Decision ask
                    </p>
                    <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                      Approve the 10-month implementation and move from demo to governed MVP.
                    </h2>
                    <p className="mt-4 max-w-3xl text-sm leading-7 text-background/75">
                      The proposal remains honest: deliver the operating core first, then automate official integrations as technical access becomes available.
                    </p>
                  </div>
                  <Link
                    href="/login"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-background px-5 text-sm font-bold text-foreground transition hover:bg-background/90"
                  >
                    Review demo roles
                    <UsersRound className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
