import { ShieldCheck } from "lucide-react"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Link } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { StatusBadge } from "@/components/status-badge"
import { isAccessProfileEnabled } from "@/lib/auth"
import { roleDefinitions } from "@/lib/rbac"

const copy = {
  tr: {
    title: "QA rol profilleri",
    intro: "Bu sayfa yerel ve test ortamlarında hangi rolün hangi çalışma alanına gireceğini hızlıca kontrol etmek için ayrılmıştır.",
    back: "Girişe dön",
    responsibilities: "Sorumluluklar",
    constraints: "Sınırlar",
  },
  en: {
    title: "QA role profiles",
    intro: "This page keeps local and test role profiles outside the main sign-in card while still making every profile easy to inspect.",
    back: "Back to sign in",
    responsibilities: "Responsibilities",
    constraints: "Limits",
  },
  de: {
    title: "QA-Rollenprofile",
    intro: "Diese Seite hält lokale Testrollen außerhalb der Anmeldung, macht aber jede Rolle schnell prüfbar.",
    back: "Zur Anmeldung",
    responsibilities: "Verantwortung",
    constraints: "Grenzen",
  },
  ru: {
    title: "QA-роли",
    intro: "Эта страница выносит локальные тестовые роли из основной формы входа, но оставляет все профили доступными для проверки.",
    back: "Назад ко входу",
    responsibilities: "Ответственность",
    constraints: "Ограничения",
  },
} as const

export default async function LoginProfilesPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  if (!isAccessProfileEnabled()) notFound()

  const { locale } = await params
  const t = copy[(locale as keyof typeof copy) in copy ? (locale as keyof typeof copy) : "en"]
  const roleT = await getTranslations("roles")

  return (
    <main className="min-h-svh bg-background px-5 py-6 text-foreground sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/login" className="inline-flex items-center gap-3">
            <CatiLogoMark />
            <span className="text-sm font-black text-foreground">1Çatı</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-10 w-fit items-center justify-center rounded-xl border border-border bg-card px-4 py-2 text-sm font-black text-foreground transition hover:bg-muted"
          >
            {t.back}
          </Link>
        </div>

        <section className="mt-10">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">RBAC</p>
          <h1 className="mt-3 text-3xl font-black leading-tight text-foreground md:text-5xl">
            {t.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground md:text-base">
            {t.intro}
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roleDefinitions.map((role) => {
            const label = roleT(role.labelKey.replace("roles.", ""))
            const description = roleT(role.descriptionKey.replace("roles.descriptions.", "descriptions."))

            return (
              <article key={role.key} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-card-foreground">{label}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge variant="info">{role.scope}</StatusBadge>
                  <StatusBadge variant="neutral">L{role.level}</StatusBadge>
                </div>
                <div className="mt-5 grid gap-4 text-sm">
                  <div>
                    <h3 className="text-xs font-black uppercase text-muted-foreground">{t.responsibilities}</h3>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground">
                      {role.responsibilities.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase text-muted-foreground">{t.constraints}</h3>
                    <ul className="mt-2 space-y-1.5 text-muted-foreground">
                      {role.constraints.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </div>
    </main>
  )
}
