"use client"

import { useEffect } from "react"
import { ShieldAlert } from "lucide-react"
import { useLocale } from "next-intl"
import { usePathname, useRouter } from "@/app/navigation"
import { useUser } from "@/components/user-provider"
import { hasPermission } from "@/lib/rbac"
import { resourceForDashboardPath } from "@/lib/dashboard-routing"

const deniedCopy = {
  tr: {
    title: "Bu sayfa rolünüz için kapalı",
    body: "Yetki modeli güvenlik nedeniyle varsayılan olarak erişimi reddeder. Sizin rolünüz için açık olan panele yönlendiriliyorsunuz.",
  },
  en: {
    title: "This page is closed for your role",
    body: "The permission model denies access by default for security. You are being redirected to the dashboard available for your role.",
  },
  de: {
    title: "Diese Seite ist für Ihre Rolle gesperrt",
    body: "Das Berechtigungsmodell verweigert aus Sicherheitsgründen standardmäßig den Zugriff. Sie werden zum für Ihre Rolle freigegebenen Dashboard weitergeleitet.",
  },
  ru: {
    title: "Эта страница закрыта для вашей роли",
    body: "Модель прав по умолчанию запрещает доступ ради безопасности. Вы будете перенаправлены на панель, доступную вашей роли.",
  },
}

export function DashboardRouteGuard({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const resource = resourceForDashboardPath(pathname)
  const allowed = hasPermission(user.role, resource, "view")
  const copy = deniedCopy[locale as keyof typeof deniedCopy] ?? deniedCopy.tr

  useEffect(() => {
    if (!allowed) router.replace("/dashboard")
  }, [allowed, router])

  if (!allowed) {
    return (
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-5 text-amber-800 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <h1 className="text-base font-black">{copy.title}</h1>
            <p className="mt-1 text-sm">{copy.body}</p>
          </div>
        </div>
      </section>
    )
  }

  return children
}
