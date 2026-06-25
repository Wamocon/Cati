import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { UserProvider } from "@/components/user-provider"
import { redirect } from "@/app/navigation"
import { locales, defaultLocale } from "@/i18n"
import { DashboardSidebar } from "./dashboard-sidebar"
import { AiAssistant } from "@/components/ai-assistant"
import { DashboardCommandRibbon } from "@/components/dashboard-command-ribbon"

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  type Locale = (typeof locales)[number]
  const locale: Locale = locales.includes(rawLocale as Locale) ? (rawLocale as Locale) : defaultLocale

  const profile = await getUserProfile()

  if (!profile || !hasPermission(profile.role, "dashboard", "view")) {
    redirect({ href: "/login", locale })
  }

  return (
    <UserProvider initialUser={profile!}>
      <div className="dashboard-shell flex min-h-svh bg-background">
        <DashboardSidebar />
        <main id="main" className="flex-1 overflow-x-hidden p-4 pt-16 md:p-6 lg:p-8">
          <DashboardCommandRibbon />
          {children}
        </main>
      </div>
      <AiAssistant />
    </UserProvider>
  )
}
