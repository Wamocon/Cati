import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { UserProvider } from "@/components/user-provider"
import { redirect } from "@/app/navigation"
import { locales, defaultLocale } from "@/i18n"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  type Locale = (typeof locales)[number]
  const locale: Locale = locales.includes(rawLocale as Locale)
    ? (rawLocale as Locale)
    : defaultLocale

  const profile = await getUserProfile()

  if (!profile || !hasPermission(profile.role, "dashboard", "view")) {
    redirect({ href: "/login", locale })
  }

  return <UserProvider initialUser={profile!}>{children}</UserProvider>
}
