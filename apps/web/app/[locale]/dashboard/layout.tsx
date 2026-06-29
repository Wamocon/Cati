import { getUserProfile } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { UserProvider } from "@/components/user-provider"
import { redirect } from "@/app/navigation"
import { locales, defaultLocale } from "@/i18n"
import { DashboardSidebar } from "./dashboard-sidebar"
import { DashboardTopbar } from "./dashboard-topbar"
import { AiAssistant } from "@/components/ai-assistant"
import { DashboardCommandRibbon } from "@/components/dashboard-command-ribbon"
import { DashboardRouteGuard } from "./dashboard-route-guard"

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
      <div className="dashboard-shell flex min-h-svh min-w-0 bg-background">
        <DashboardSidebar />
        <div className="min-w-0 flex-1">
          <DashboardTopbar />
          <main id="main" className="min-w-0 overflow-x-hidden p-4 pb-28 md:p-6 md:pb-10 lg:p-8 lg:pb-12">
            <DashboardCommandRibbon />
            <DashboardRouteGuard>{children}</DashboardRouteGuard>
          </main>
        </div>
      </div>
      <AiAssistant />
    </UserProvider>
  )
}
