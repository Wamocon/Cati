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
} from "lucide-react"
import { useTranslations } from "next-intl"
import { Link, usePathname, useRouter } from "@/app/navigation"
import { useUser } from "@/components/user-provider"
import { hasPermission, roleDefinitions, type Resource } from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface MenuItem {
  resource: Resource
  href: string
  icon: React.ElementType
}

const menu: MenuItem[] = [
  { resource: "listings", href: "/dashboard", icon: Building2 },
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
        className="fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm md:hidden"
        aria-label={t("openMenu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-5">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-teal-600 text-sm font-black text-primary-foreground">
                1Ç
              </div>
              <span className="text-lg font-bold text-card-foreground">1Çatı</span>
            </Link>
            <button
              className="text-muted-foreground md:hidden"
              onClick={() => setMobileOpen(false)}
              aria-label={t("closeMenu")}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-card-foreground">{user.full_name ?? user.email}</p>
              <p className="truncate text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </div>

          <nav className="mt-5 space-y-0.5">
            {filteredMenu.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.resource}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(`menu.${item.resource}`)}
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
              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
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
