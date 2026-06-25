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
  AlertCircle,
  LayoutDashboard,
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { useUser } from "@/components/user-provider"
import { hasPermission, roleDefinitions, type Resource } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"

interface MenuItem {
  resource: Resource
  href: string
  icon: React.ElementType
}

const menu: MenuItem[] = [
  { resource: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { resource: "listings", href: "/dashboard/listings", icon: Building2 },
  { resource: "leads", href: "/dashboard/leads", icon: Users },
  { resource: "tickets", href: "/dashboard/tickets", icon: TicketCheck },
  { resource: "calendar", href: "/dashboard/calendar", icon: CalendarDays },
  { resource: "eids_compliance", href: "/dashboard/compliance", icon: FileCheck },
  { resource: "finance", href: "/dashboard/finance", icon: CircleDollarSign },
  { resource: "documents", href: "/dashboard/documents", icon: FileText },
  { resource: "reports", href: "/dashboard/reports", icon: BarChart3 },
  { resource: "users", href: "/dashboard/users", icon: UserCog },
  { resource: "settings", href: "/dashboard/settings", icon: Settings },
]

const siteMenuLabels: Record<Resource, string> = {
  dashboard: "Genel Bakış",
  listings: "Daire Matrisi",
  leads: "Sakinler",
  deals: "İş Akışları",
  tickets: "Servis Talepleri",
  calendar: "Rezervasyon",
  eids_compliance: "Erişim & Uyum",
  documents: "Belgeler",
  finance: "Finans & Aidat",
  reports: "Raporlar",
  users: "Kullanıcılar & Roller",
  settings: "Ayarlar",
  communications: "İletişim",
  offline_sync: "Offline Senkron",
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useUser()
  const t = useTranslations("dashboard")
  const roleT = useTranslations("roles")
  const router = useRouter()
  const pathname = usePathname()

  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabelKey = roleDef?.labelKey.replace("roles.", "") ?? user.role
  const roleLabel = roleT(roleLabelKey)

  const isDemo = user.email === "demo@cati.local"

  async function logout() {
    try {
      await fetch("/api/demo-role", { method: "DELETE" })
    } catch {
      // ignore
    }
    router.replace("/login")
  }

  const filteredMenu = menu.filter((item) => hasPermission(user.role, item.resource, "view"))

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
        aria-label={t("openMenu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform border-r border-sidebar-border bg-sidebar/[0.92] shadow-2xl shadow-black/5 backdrop-blur-xl transition-transform duration-200 md:relative md:translate-x-0 md:shadow-none",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <CatiLogoMark className="shadow-lg shadow-primary/20" />
              <span className="min-w-0">
                <span className="block text-lg font-black leading-tight text-sidebar-foreground">1Çatı</span>
                <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                  {clientProfile.clientName} pilot
                </span>
              </span>
            </Link>
            <button
              className="text-muted-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase text-primary">
                {clientProfile.pilotProject}
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">{clientProfile.pilotLocation}</span>
            </div>
            <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-card-foreground">{user.full_name ?? user.email}</p>
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
                  {siteMenuLabels[item.resource]}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-2">
            {isDemo && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("demoNotice")}</span>
              </div>
            )}
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
