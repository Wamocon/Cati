"use client"

import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
  LogOut,
  FileCheck,
  CircleDollarSign,
  CloudOff,
  MessageSquare,
  BarChart3,
  Menu,
  X,
  FileText,
  UserCog,
  Settings,
  ShieldCheck,
  AlertCircle,
} from "lucide-react"
import { useState } from "react"
import { useTranslations } from "next-intl"
import { Link } from "@/app/navigation"
import { useUser } from "@/components/user-provider"
import { hasPermission, type Resource } from "@/lib/rbac"
import { cn } from "@/lib/utils"

interface MenuItem {
  resource: Resource
  href: string
  icon: React.ElementType
}

const menu: MenuItem[] = [
  { resource: "listings", href: "#", icon: Building2 },
  { resource: "leads", href: "#", icon: Users },
  { resource: "tickets", href: "#", icon: TicketCheck },
  { resource: "calendar", href: "#", icon: CalendarDays },
  { resource: "eids_compliance", href: "#", icon: FileCheck },
  { resource: "finance", href: "#", icon: CircleDollarSign },
  { resource: "documents", href: "#", icon: FileText },
  { resource: "reports", href: "#", icon: BarChart3 },
  { resource: "users", href: "#", icon: UserCog },
  { resource: "settings", href: "#", icon: Settings },
]

interface ModuleCard {
  resource: Resource
  labelKey: string
  value: string
  hintKey: string
}

const modules: ModuleCard[] = [
  { resource: "listings", labelKey: "activeListings", value: "0", hintKey: "twentyHint" },
  { resource: "leads", labelKey: "openLeads", value: "0", hintKey: "leadsHint" },
  { resource: "tickets", labelKey: "tickets", value: "0", hintKey: "ticketsHint" },
  { resource: "deals", labelKey: "activeDeals", value: "0", hintKey: "dealsHint" },
]

interface PlaceholderItem {
  labelKey: string
  icon: React.ElementType
}

const placeholders: PlaceholderItem[] = [
  { labelKey: "whatsapp", icon: MessageSquare },
  { labelKey: "voip", icon: Users },
  { labelKey: "ai", icon: BarChart3 },
  { labelKey: "airbnb", icon: CalendarDays },
  { labelKey: "kbs", icon: FileCheck },
  { labelKey: "offline", icon: CloudOff },
]

export default function DashboardPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const user = useUser()
  const t = useTranslations("dashboard")
  const roleT = useTranslations("roles")

  const filteredMenu = menu.filter((item) =>
    hasPermission(user.role, item.resource, "view")
  )

  const filteredModules = modules.filter((item) =>
    hasPermission(user.role, item.resource, "view")
  )

  const isDemo = user.email === "demo@cati.local"

  return (
    <div className="flex min-h-svh bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 transform border-r border-border bg-card transition-transform duration-200 md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col p-6">
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

          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/50 p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-card-foreground">
                {user.full_name ?? user.email}
              </p>
              <p className="truncate text-xs text-muted-foreground">{roleT(user.role)}</p>
            </div>
          </div>

          <nav className="mt-6 space-y-1">
            {filteredMenu.map((item) => (
              <a
                key={item.resource}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <item.icon className="h-4 w-4" />
                {t(`menu.${item.resource}`)}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-2">
            {isDemo && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t("demoNotice")}</span>
              </div>
            )}
            <button className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8">
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground"
            aria-label={t("openMenu")}
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-black text-foreground">{t("title")}</h1>
        </div>

        <h1 className="hidden text-3xl font-black text-foreground md:block">{t("title")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {filteredModules.map((card) => (
            <div
              key={card.resource}
              className="rounded-2xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="text-2xl font-black text-card-foreground">{card.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t(`modules.${card.labelKey}`)}</div>
              <div className="mt-2 text-[10px] text-muted-foreground/70">
                {t(`modules.${card.hintKey}`)}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold text-foreground">{t("roadmapTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("roadmapSubtitle")}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {placeholders.map((item) => (
              <div
                key={item.labelKey}
                className="flex items-center gap-4 rounded-xl border border-dashed border-border bg-card/50 p-4 opacity-70"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <item.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {t(`roadmap.${item.labelKey}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
