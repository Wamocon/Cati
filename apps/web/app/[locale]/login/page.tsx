"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/app/navigation"
import { roles, type Role } from "@/lib/rbac"
import { ShieldCheck, Loader2 } from "lucide-react"

function RoleButton({
  role,
  label,
  onClick,
  pending,
}: {
  role: Role
  label: string
  onClick: (role: Role) => void
  pending: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(role)}
      disabled={pending}
      className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
    >
      <ShieldCheck className="h-4 w-4 text-primary" />
      <span className="truncate">{label}</span>
      {pending && <Loader2 className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
    </button>
  )
}

export default function LoginPage() {
  const t = useTranslations("login")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeRole, setActiveRole] = useState<Role | null>(null)

  async function signInAs(role: Role) {
    setActiveRole(role)
    try {
      const res = await fetch("/api/demo-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("Demo sign-in failed")
      startTransition(() => {
        router.push("/dashboard")
      })
    } catch {
      setActiveRole(null)
    }
  }

  const showDemoRoles = process.env.NODE_ENV === "development"

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-black text-card-foreground">{t("title")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form className="mt-8 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-card-foreground">
              {t("email")}
            </label>
            <input
              id="email"
              type="email"
              placeholder={t("emailPlaceholder")}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-card-foreground">
              {t("password")}
            </label>
            <input
              id="password"
              type="password"
              placeholder={t("passwordPlaceholder")}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-primary px-4 py-2 text-base font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t("submit")}
          </button>
        </form>

        {showDemoRoles && (
          <div className="mt-8">
            <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("demoTitle")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {roles.map((role) => (
                <RoleButton
                  key={role}
                  role={role}
                  label={t(`roles.${role}`)}
                  onClick={signInAs}
                  pending={isPending && activeRole === role}
                />
              ))}
            </div>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">{t("authNote")}</p>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground">
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  )
}
