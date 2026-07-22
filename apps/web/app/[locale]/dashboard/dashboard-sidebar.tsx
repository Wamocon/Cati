"use client"

import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  Building2,
  Users,
  TicketCheck,
  CalendarDays,
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
  Wallet,
  Sparkles,
  ReceiptText,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Link, usePathname } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { useUser } from "@/components/user-provider"
import {
  hasAnyRolePermission,
  isAdmin,
  roleDefinitions,
  type Resource,
} from "@/lib/rbac"
import { dashboardRoutes } from "@/lib/dashboard-routing"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import {
  localizeOperationalValue,
  resolveDashboardLocale,
} from "@/lib/unit-matrix-copy"

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
  wallet: Wallet,
  activities: Sparkles,
  guardianship: Users,
  vendor_invoices: ReceiptText,
}

const menu: MenuItem[] = dashboardRoutes.map((item) => ({
  ...item,
  icon: iconsByResource[item.resource],
}))

// The admin Control Center is a single admin-only hub link. It is intentionally
// NOT a Resource (adding one cascades through every Record<Resource,…> map + SQL,
// see LESSONS-LEARNED #12); its label lives inline and its visibility is gated on
// isAdmin(user.role) below, mirroring how other admin-only UI self-restricts.
const adminControlCenterLabel: Record<"tr" | "en" | "de" | "ru", string> = {
  tr: "Kontrol Merkezi",
  en: "Control Center",
  de: "Kontrollzentrum",
  ru: "Центр управления",
}

const dialogFocusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled])'

function keepFocusInsideDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector)
  ).filter(
    (control) =>
      control.getAttribute("aria-hidden") !== "true" &&
      control.getClientRects().length > 0
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const mobileDialogRef = useRef<HTMLDialogElement>(null)
  const mobileTriggerRef = useRef<HTMLButtonElement>(null)
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null)
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const t = useTranslations("dashboard")
  const roleT = useTranslations("roles")
  const pathname = usePathname()

  const roleDef = roleDefinitions.find((r) => r.key === user.role)
  const roleLabelKey = roleDef?.labelKey.replace("roles.", "") ?? user.role
  const roleLabel = roleT(roleLabelKey)
  const portfolioDisplayName = localizeOperationalValue(
    clientProfile.activePortfolio,
    locale
  )
  const userDisplayName = localizeOperationalValue(
    user.full_name ?? user.email,
    locale
  )

  // Widen navigation to the union of all roles the user holds so a multi-role
  // user sees every panel any of their roles can reach. Single-role users keep
  // the exact same menu as before (roles === [role]).
  const filteredMenu = menu.filter((item) =>
    hasAnyRolePermission(user.roles, item.resource, "view")
  )
  // Single admin-only hub entry (no new Resource). Gated purely on the primary
  // role being admin, consistent with the panel it links to.
  const showAdminControlCenter = isAdmin(user.role)
  const adminControlCenterActive =
    pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")
  const mobileMenuId = "dashboard-mobile-sidebar"
  const mobileMenuTitleId = "dashboard-mobile-sidebar-title"
  const closeMobileMenu = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    const mobileQuery = window.matchMedia("(max-width: 767px)")
    const syncViewport = () => {
      setIsMobileViewport(mobileQuery.matches)
      if (!mobileQuery.matches) closeMobileMenu()
    }

    syncViewport()
    mobileQuery.addEventListener("change", syncViewport)
    return () => mobileQuery.removeEventListener("change", syncViewport)
  }, [closeMobileMenu])

  useEffect(() => {
    const dialog = mobileDialogRef.current
    if (!isMobileViewport || !dialog) return

    if (mobileOpen) {
      if (!dialog.open) dialog.showModal()
      mobileCloseButtonRef.current?.focus()
      return
    }

    if (dialog.open) dialog.close()
  }, [isMobileViewport, mobileOpen])

  const renderSidebarPanel = (mobile: boolean) => (
    <div className="flex h-full min-h-0 flex-col p-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <CatiLogoMark className="shadow-lg shadow-primary/20" />
          <span className="min-w-0">
            <span
              id={mobile ? mobileMenuTitleId : undefined}
              className="block text-lg leading-tight font-black text-sidebar-foreground"
            >
              1Çatı
            </span>
            <span className="block truncate text-[11px] font-semibold text-muted-foreground">
              {clientProfile.clientName}
            </span>
          </span>
        </Link>
        {mobile ? (
          <button
            ref={mobileCloseButtonRef}
            type="button"
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            onClick={closeMobileMenu}
            aria-label={t("closeMenu")}
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <div className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-accent/70 p-3">
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase">
            {t("activePortfolio")}
          </p>
          <p className="mt-1 truncate text-sm font-black text-card-foreground">
            {portfolioDisplayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {clientProfile.activeLocation}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-card-foreground">
              {userDisplayName}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {roleLabel}
            </p>
          </div>
        </div>
      </div>

      <nav
        aria-label={t("openMenu")}
        className="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1"
      >
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
              onClick={mobile ? closeMobileMenu : undefined}
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

        {showAdminControlCenter && (
          <Link
            href="/dashboard/admin"
            onClick={mobile ? closeMobileMenu : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all",
              adminControlCenterActive
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/[0.18]"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
            )}
          >
            <ShieldCheck className="h-4 w-4 shrink-0" />
            {adminControlCenterLabel[locale]}
          </Link>
        )}
      </nav>
    </div>
  )

  return (
    <>
      <button
        ref={mobileTriggerRef}
        type="button"
        data-testid="dashboard-menu-toggle"
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-sm md:hidden"
        aria-label={t("openMenu")}
        aria-expanded={mobileOpen}
        aria-controls={mobileMenuId}
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      {isMobileViewport ? (
        <dialog
          ref={mobileDialogRef}
          id={mobileMenuId}
          aria-labelledby={mobileMenuTitleId}
          onKeyDown={keepFocusInsideDialog}
          onCancel={(event) => {
            event.preventDefault()
            closeMobileMenu()
          }}
          onClose={() => {
            setMobileOpen(false)
            mobileTriggerRef.current?.focus()
          }}
          onPointerDown={(event) => {
            if (event.target !== event.currentTarget) return
            const bounds = event.currentTarget.getBoundingClientRect()
            const inside =
              event.clientX >= bounds.left &&
              event.clientX <= bounds.right &&
              event.clientY >= bounds.top &&
              event.clientY <= bounds.bottom
            if (!inside) closeMobileMenu()
          }}
          className="fixed inset-y-0 left-0 z-[200] m-0 h-dvh max-h-none w-72 max-w-[calc(100vw-2rem)] overflow-hidden border-0 border-r border-sidebar-border bg-sidebar/[0.96] p-0 text-sidebar-foreground shadow-2xl shadow-black/20 backdrop:bg-black/40 backdrop:backdrop-blur-[1px]"
        >
          <aside className="h-full w-full" aria-label={t("openMenu")}>
            {renderSidebarPanel(true)}
          </aside>
        </dialog>
      ) : (
        <aside
          id={mobileMenuId}
          className="sticky top-0 hidden h-svh w-72 self-start overflow-hidden border-r border-sidebar-border bg-sidebar/[0.92] shadow-none backdrop-blur-xl md:block"
        >
          {renderSidebarPanel(false)}
        </aside>
      )}
    </>
  )
}
