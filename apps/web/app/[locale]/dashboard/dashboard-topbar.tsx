"use client"

import { BriefcaseBusiness, LogOut, ShieldCheck } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { useUser } from "@/components/user-provider"
import { useRouter } from "@/app/navigation"
import { createClient } from "@/lib/supabase/client"
import { clientProfile } from "@/lib/client-context"
import { roleDefinitions } from "@/lib/rbac"
import { localizeOperationalValue, resolveDashboardLocale } from "@/lib/unit-matrix-copy"

export function DashboardTopbar() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const router = useRouter()
  const t = useTranslations("dashboard")
  const roleT = useTranslations("roles")
  const roleDef = roleDefinitions.find((role) => role.key === user.role)
  const roleLabelKey = roleDef?.labelKey.replace("roles.", "") ?? user.role
  const roleLabel = roleT(roleLabelKey)
  const userDisplayName = localizeOperationalValue(user.full_name ?? user.email, locale)

  async function logout() {
    try {
      if (
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        await createClient().auth.signOut()
      }
      await fetch("/api/access-profile", { method: "DELETE" })
    } catch {
      // Session cleanup is best-effort; the redirect below is the user-visible state change.
    }
    router.replace("/login")
  }

  return (
    <header data-testid="dashboard-topbar" className="sticky top-0 z-30 border-b border-border/70 bg-background/86 backdrop-blur-xl">
      <div className="flex min-h-16 min-w-0 items-center justify-between gap-3 px-4 pl-16 md:px-6 md:pl-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-primary/10 text-primary sm:flex">
            <BriefcaseBusiness className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-foreground">
              {clientProfile.activePortfolio}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {clientProfile.activeLocation} · {roleLabel}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <LocaleSwitcher compact />
          <details className="group relative">
            <summary
              className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden"
              title={userDisplayName}
            >
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="hidden max-w-32 truncate sm:inline">{roleLabel}</span>
            </summary>
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-black/10">
              <div className="rounded-xl bg-muted/55 p-3">
                <p className="truncate text-sm font-black text-card-foreground">
                  {userDisplayName}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={logout}
                className="mt-2 flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-bold text-destructive transition hover:bg-destructive/10"
              >
                {t("logout")}
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </details>
          <button
            type="button"
            aria-label={t("logout")}
            onClick={logout}
            className="inline-flex h-10 w-10 items-center justify-center gap-2 rounded-full border border-border bg-card text-xs font-bold text-foreground shadow-sm transition hover:bg-muted md:w-auto md:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">{t("logout")}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
