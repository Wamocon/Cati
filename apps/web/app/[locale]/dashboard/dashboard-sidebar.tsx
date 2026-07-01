"use client"

import { useState } from "react"
import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
  FileCheck,
  CircleDollarSign,
  FileText,
  BarChart3,
  Menu,
  X,
  UserCog,
  Settings,
  ShieldCheck,
  LayoutDashboard,
  MessageSquareText,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { useUser } from "@/components/user-provider"
import { hasPermission, roleDefinitions, type Resource } from "@/lib/rbac"
import { dashboardRoutes } from "@/lib/dashboard-routing"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import { localizeOperationalValue, resolveDashboardLocale } from "@/lib/unit-matrix-copy"

interface MenuItem {
  resource: Resource
  href: string
  icon: React.ElementType
}

const iconsByResource: Record<Resource, React.ElementType> = {
  dashboard: LayoutDashboard,
  listings: Building2,
  leads: Users,
  deals: Users,
  tickets: TicketCheck,
  calendar: CalendarDays,
  eids_compliance: FileCheck,
  finance: CircleDollarSign,
  documents: FileText,
  reports: BarChart3,
  users: UserCog,
  settings: Settings,
  communications: MessageSquareText,
  offline_sync: ShieldCheck,
}

const menu: MenuItem[] = dashboardRoutes.map((item) => ({
  ...item,
  icon: iconsByResource[item.resource],
}))

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const t = useTranslations("dashboard")
  const roleT = useTranslations("roles")
  const router = useRouter()
  const pathname = usePathname()

  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabelKey = roleDef?.labelKey.replace("roles.", "") ?? user.role
  const roleLabel = roleT(roleLabelKey)
  const userDisplayName = localizeOperationalValue(user.full_name ?? user.email, locale)

  async function logout() {
    try {
      await fetch("/api/access-profile", { method: "DELETE" })
    } catch {
      // ignore
    }
    router.replace("/login")
  }

  const filteredMenu = menu.filter((item) => hasPermission(user.role, item.resource, "view"))
  const mobileMenuId = "dashboard-mobile-sidebar"

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <button
        type="button"
        data-testid="dashboard-menu-toggle"
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
        aria-label={t("openMenu")}
        aria-expanded={mobileOpen}
        aria-controls={mobileMenuId}
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        id={mobileMenuId}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-sidebar-border bg-sidebar/[0.92] shadow-2xl shadow-black/5 backdrop-blur-xl transition-[transform,visibility] duration-200 max-md:pointer-events-none max-md:invisible md:relative md:visible md:pointer-events-auto md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0 max-md:pointer-events-auto max-md:visible" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <CatiLogoMark className="shadow-lg shadow-primary/20" />
              <span className="min-w-0">
                <span className="block text-lg font-black leading-tight text-sidebar-foreground">1Çatı</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                  {clientProfile.clientName}
                </span>
              </span>
            </Link>
            <button
              type="button"
              className="text-muted-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-3">
            <div className="mb-3">
              <p className="text-[10px] font-semibold uppercase text-muted-foreground">{t("activePortfolio")}</p>
              <p className="mt-1 truncate text-sm font-black text-card-foreground">
                {clientProfile.activePortfolio}
              </p>
              <p className="truncate text-xs text-muted-foreground">{clientProfile.activeLocation}</p>
            </div>
            <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {userDisplayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
            </div>
          </div>

          <nav className="mt-5 space-y-1">
            {filteredMenu.map((item) => {
              const Icon = item.icon
              const active =
                item.href === "/dashboard"
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.resource}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/[0.18]"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {t(`menu.${item.resource}`)}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <button
              onClick={logout}
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
