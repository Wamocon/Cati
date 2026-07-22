import { redirect } from "next/navigation"
import { AdminControlCenter } from "@/components/admin-control-center"
import { getUserProfile } from "@/lib/auth"
import { isAdmin } from "@/lib/rbac"

// Header copy is kept inline per-locale, matching the dashboard-page convention
// (see users/page.tsx). Turkish leads; en is the fallback for other locales.
const copy = {
  tr: {
    title: "Kontrol Merkezi",
    subtitle:
      "Yönetim işlerinizi tek yerden yürütün: kişiler ve erişim, onaylar, para ve servisler.",
  },
  en: {
    title: "Control Center",
    subtitle:
      "Run your admin work from one place: people and access, approvals, money and services.",
  },
  de: {
    title: "Kontrollzentrum",
    subtitle:
      "Führen Sie Ihre Verwaltungsaufgaben an einem Ort aus: Personen und Zugang, Freigaben, Finanzen und Services.",
  },
  ru: {
    title: "Центр управления",
    subtitle:
      "Управляйте администрированием в одном месте: люди и доступ, согласования, финансы и услуги.",
  },
} as const

function resolveLocale(locale: string): keyof typeof copy {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

export default async function AdminControlCenterPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  // Server-side guard (defense-in-depth). The embedded panel also self-hides for
  // non-admins, but the route itself must never render for a non-admin.
  const profile = await getUserProfile()
  if (!profile || !isAdmin(profile.role)) {
    redirect(`/${locale}/dashboard`)
  }

  const t = copy[resolveLocale(locale)]

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-foreground">{t.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t.subtitle}</p>
      </header>

      <AdminControlCenter locale={locale} />
    </div>
  )
}
