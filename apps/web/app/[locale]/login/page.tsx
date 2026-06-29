"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { Link, useRouter } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { createClient } from "@/lib/supabase/client"
import { roleDefinitions, roles, type Role } from "@/lib/rbac"

const pageCopy = {
  tr: {
    eyebrow: "Guvenli ERP erisimi",
    title: "Ataberk Estate operasyon alanina giris",
    intro:
      "CRM, daire matrisi, finans, servis ve belgeler rol bazli yetkiyle acilir. Her aksiyon audit iziyle kaydedilir.",
    email: "E-posta",
    password: "Sifre",
    submit: "Giris yap",
    request: "Erisim talep et",
    back: "Ana sayfa",
    roleTitle: "Yerel QA rol profilleri",
    roleIntro: "Bu alan sadece yetkili yerel ve test ortamlarinda RBAC kontrolu icin kullanilir.",
    locked: "Rol profilleri bu ortamda kapali.",
    authReady: "Supabase kimlik dogrulamasi aktif.",
    authNote: "Kimlik dogrulama anahtarlari bekleniyor. Yetkili ortamda e-posta/sifre ile giris acilir.",
    authError: "Giris basarisiz. E-posta ve sifreyi kontrol edin.",
    accessError: "Rol profili acilamadi. Tekrar deneyin.",
    proof: ["New Level Premium portfoy alani", "Finans, servis ve belge merkezi", "Malik, kiraci ve ekip erisimi"],
  },
  en: {
    eyebrow: "Secure ERP access",
    title: "Sign in to the Ataberk Estate operations workspace",
    intro:
      "CRM, unit matrix, finance, service and documents open through role-based permission. Every sensitive action keeps an audit trail.",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    request: "Request access",
    back: "Home",
    roleTitle: "Local QA role profiles",
    roleIntro: "This area is only for authorized local and test environments to verify RBAC.",
    locked: "Role profiles are disabled in this environment.",
    authReady: "Supabase authentication is active.",
    authNote: "Authentication keys are pending. Email/password access opens in an authorized environment.",
    authError: "Sign-in failed. Check email and password.",
    accessError: "Role profile could not be opened. Try again.",
    proof: ["New Level Premium portfolio workspace", "Finance, service and document center", "Owner, tenant and team access"],
  },
  de: {
    eyebrow: "Sicherer ERP-Zugang",
    title: "Bei Ataberk Estate Operations anmelden",
    intro:
      "CRM, Wohnungsmatrix, Finanzen, Service und Dokumente werden rollenbasiert freigegeben. Sensible Aktionen bleiben auditierbar.",
    email: "E-Mail",
    password: "Passwort",
    submit: "Anmelden",
    request: "Zugang anfragen",
    back: "Startseite",
    roleTitle: "Lokale QA-Rollenprofile",
    roleIntro: "Nur fuer autorisierte lokale und Testumgebungen zur RBAC-Pruefung.",
    locked: "Rollenprofile sind in dieser Umgebung deaktiviert.",
    authReady: "Supabase-Authentifizierung ist aktiv.",
    authNote: "Authentifizierungsschluessel fehlen. E-Mail/Passwort wird in autorisierter Umgebung aktiviert.",
    authError: "Anmeldung fehlgeschlagen. E-Mail und Passwort pruefen.",
    accessError: "Rollenprofil konnte nicht geoeffnet werden. Erneut versuchen.",
    proof: ["New Level Premium portfolio", "Finance, service and document workspace", "Owner, tenant and team access"],
  },
  ru: {
    eyebrow: "Bezopasnyy ERP dostup",
    title: "Vhod v operatsionnoe prostranstvo Ataberk Estate",
    intro:
      "CRM, matrica kvartir, finansy, servis i dokumenty otkryvayutsya po rolyam. Vazhnyye deystviya sokhranyayut audit sled.",
    email: "Email",
    password: "Parol",
    submit: "Voyti",
    request: "Zaprosit dostup",
    back: "Na glavnuyu",
    roleTitle: "Lokalnye QA roli",
    roleIntro: "Tolko dlya avtorizovannykh lokalnykh i testovykh sred proverki RBAC.",
    locked: "Roli otklyucheny v etoy srede.",
    authReady: "Supabase autentifikatsiya aktivna.",
    authNote: "Klyuchi autentifikatsii ozhidayutsya. Email/parol vklyuchaetsya v avtorizovannoy srede.",
    authError: "Vhod ne udalsya. Proverte email i parol.",
    accessError: "Rol ne otkrylas. Poprobuyte eshche raz.",
    proof: ["New Level Premium portfolio workspace", "Finance, service and document center", "Owner, tenant and team access"],
  },
} as const

function roleCopy(role: Role, roleT: ReturnType<typeof useTranslations>) {
  const def = roleDefinitions.find((item) => item.key === role)
  const labelKey = def?.labelKey.replace("roles.", "") ?? role
  const descriptionKey = def?.descriptionKey.replace("roles.descriptions.", "descriptions.") ?? ""
  return {
    label: roleT(labelKey),
    description: descriptionKey ? roleT(descriptionKey) : "",
  }
}

export default function LoginPage() {
  const locale = useLocale()
  const t = pageCopy[(locale as keyof typeof pageCopy) in pageCopy ? (locale as keyof typeof pageCopy) : "en"]
  const roleT = useTranslations("roles")
  const router = useRouter()
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authPending, setAuthPending] = useState(false)
  const [accessProfilesEnabled, setAccessProfilesEnabled] = useState(false)
  const [accessProfileStatusLoaded, setAccessProfileStatusLoaded] = useState(false)
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadAccessProfileState() {
      try {
        const response = await fetch("/api/access-profile", { cache: "no-store" })
        const payload = response.ok ? await response.json() : { enabled: false }
        if (!cancelled) setAccessProfilesEnabled(Boolean(payload.enabled))
      } catch {
        if (!cancelled) setAccessProfilesEnabled(false)
      } finally {
        if (!cancelled) setAccessProfileStatusLoaded(true)
      }
    }

    void loadAccessProfileState()

    return () => {
      cancelled = true
    }
  }, [])

  async function handlePasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabaseConfigured) return

    setAuthPending(true)
    setError(null)
    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setAuthPending(false)

    if (signInError) {
      setError(t.authError)
      return
    }

    router.push("/dashboard")
  }

  async function signInAs(role: Role) {
    if (!accessProfilesEnabled) {
      setError(t.locked)
      return
    }

    setActiveRole(role)
    setError(null)
    try {
      const res = await fetch("/api/access-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error("Role sign-in failed")
      router.push("/dashboard")
    } catch {
      setActiveRole(null)
      setError(t.accessError)
    }
  }

  return (
    <main id="main" className="min-h-svh bg-[#061a17] text-white">
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src="/new-level-premium/masterplan-aerial.jpg"
            alt="New Level Premium masterplan and ERP operations context"
            fill
            sizes="50vw"
            className="object-cover"
            preload
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,16,14,0.15),rgba(3,16,14,0.88)),linear-gradient(90deg,rgba(3,16,14,0.72),rgba(3,16,14,0.1))]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:68px_68px]" />
          <div className="relative z-10 flex min-h-svh flex-col justify-between p-8 xl:p-10">
            <Link href="/" className="inline-flex w-fit items-center gap-3">
              <CatiLogoMark className="shadow-xl shadow-black/20" />
              <div>
                <p className="text-sm font-black">Ataberk Estate</p>
                <p className="text-xs text-white/65">1Cati ERP</p>
              </div>
            </Link>
            <div className="max-w-xl">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-100">{t.eyebrow}</p>
              <h1 className="mt-5 text-5xl font-black leading-[0.98] xl:text-6xl">{t.title}</h1>
              <p className="mt-5 text-base leading-8 text-white/76">{t.intro}</p>
              <div className="mt-8 grid gap-3">
                {t.proof.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/12 bg-white/10 px-4 py-3 backdrop-blur">
                    <ShieldCheck className="h-4 w-4 text-emerald-200" />
                    <span className="text-sm font-bold text-white/86">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-svh flex-col bg-background text-foreground">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3 lg:hidden">
              <CatiLogoMark />
              <span className="text-sm font-black">1Cati</span>
            </Link>
            <Link href="/" className="hidden text-sm font-bold text-muted-foreground transition hover:text-foreground lg:inline-flex">
              {t.back}
            </Link>
            <div className="flex items-center gap-2">
              <LocaleSwitcher compact />
              <Link
                href="/signup"
                className="hidden h-10 items-center rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:bg-muted sm:inline-flex"
              >
                {t.request}
              </Link>
            </div>
          </div>

          <div className="flex flex-1 items-center px-5 py-8 sm:px-8">
            <div className="mx-auto grid w-full max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(340px,0.75fr)]">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-black/[0.06] sm:p-7">
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t.eyebrow}</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-card-foreground">{t.submit}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {supabaseConfigured ? t.authReady : t.authNote}
                  </p>
                </div>

                <form className="space-y-4" onSubmit={handlePasswordSignIn}>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-bold text-card-foreground">
                      {t.email}
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@company.com"
                      autoComplete="email"
                      required={supabaseConfigured}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-bold text-card-foreground">
                      {t.password}
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="********"
                      autoComplete="current-password"
                      required={supabaseConfigured}
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive" role="alert" aria-live="polite">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!supabaseConfigured || authPending}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {authPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                    {t.submit}
                  </button>

                  <Link
                    href="/signup"
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-base font-black text-foreground transition hover:bg-muted sm:hidden"
                  >
                    {t.request}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </form>
              </div>

              <aside className="rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04] sm:p-6">
                <div className="mb-5">
                  <h2 className="text-lg font-black text-card-foreground">{t.roleTitle}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {accessProfilesEnabled ? t.roleIntro : t.locked}
                  </p>
                </div>
                <div className="grid gap-2">
                  {roles.map((role) => {
                    const roleText = roleCopy(role, roleT)
                    return (
                      <button
                        key={role}
                        type="button"
                        onClick={() => signInAs(role)}
                        disabled={!accessProfilesEnabled || !accessProfileStatusLoaded || activeRole === role}
                        className="group flex min-h-16 items-start gap-3 rounded-2xl border border-border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          {activeRole === role ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-black text-card-foreground">{roleText.label}</span>
                          <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{roleText.description}</span>
                        </span>
                      </button>
                    )
                  })}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
