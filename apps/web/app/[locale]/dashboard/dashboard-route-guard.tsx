"use client"

import { useEffect } from "react"
import { useLocale } from "next-intl"
import { ShieldAlert } from "lucide-react"
import { usePathname, useRouter } from "@/app/navigation"
import { useUser } from "@/components/user-provider"
import { hasPermission } from "@/lib/rbac"
import { resourceForDashboardPath } from "@/lib/dashboard-routing"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"

export function DashboardRouteGuard({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const pathname = usePathname()
  const router = useRouter()
  const locale = resolveDashboardLocale(useLocale())
  const resource = resourceForDashboardPath(pathname)
  const allowed = hasPermission(user.role, resource, "view")

  useEffect(() => {
    if (!allowed) router.replace("/dashboard")
  }, [allowed, router])

  if (!allowed) {
    return (
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h1 className="text-base font-black">{localizeBusinessCopy("Bu sayfa rolünüz için kapalı", locale)}</h1>
            <p className="mt-1 text-sm">
              {localizeBusinessCopy(
                "Yetki modeli güvenlik nedeniyle varsayılan olarak erişimi reddeder. Sizin rolünüz için açık olan panele yönlendiriliyorsunuz.",
                locale
              )}
            </p>
          </div>
        </div>
      </section>
    )
  }

  return children
}
