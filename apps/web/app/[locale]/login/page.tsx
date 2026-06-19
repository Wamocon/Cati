"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/app/navigation"
import { roles, roleDefinitions, type Role } from "@/lib/rbac"
import { ShieldCheck, Loader2, AlertCircle } from "lucide-react"

function RoleButton({
  role,
  label,
  description,
  onClick,
  pending,
}: {
  role: Role
  label: string
  description: string
  onClick: (role: Role) => void
  pending: boolean
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(role)}
      disabled={pending}
      className="flex flex-col gap-0.5 rounded-lg border border-border bg-background p-3 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>
      <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">
        {description}
      </span>
      {pending && (
        <Loader2 className="mt-1 ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />
      )}
    </button>
  )
}

export default function LoginPage() {
  const t = useTranslations("login")
  const roleT = useTranslations("roles")
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function signInAs(role: Role) {
    setActiveRole(role)
    setError(null)
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
      setError(t("demoError"))
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="text-center">
          <h1 className="text-2xl font-black text-card-foreground">
            {t("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <form
          className="mt-8 space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
          }}
        >
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-card-foreground"
            >
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
            <label
              htmlFor="password"
              className="text-sm font-medium text-card-foreground"
            >
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

        <div className="mt-8">
          <p className="mb-1 text-center text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("demoTitle")}
          </p>
          <p className="mb-3 text-center text-xs text-muted-foreground">
            {t("demoDescription")}
          </p>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-500/10 p-2 text-xs text-red-700 dark:border-red-800 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {roles.map((role) => {
              const def = roleDefinitions.find((r) => r.key === role)
              const labelKey = def?.labelKey.replace("roles.", "") ?? role
              const descriptionKey =
                def?.descriptionKey.replace(
                  "roles.descriptions.",
                  "descriptions."
                ) ?? ""
              return (
                <RoleButton
                  key={role}
                  role={role}
                  label={roleT(labelKey)}
                  description={descriptionKey ? roleT(descriptionKey) : ""}
                  onClick={signInAs}
                  pending={isPending && activeRole === role}
                />
              )
            })}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {t("authNote")}
        </p>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("backHome")}
          </Link>
        </div>
      </div>
    </div>
  )
}
