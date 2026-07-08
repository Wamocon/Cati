"use client"

import Image from "next/image"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, ArrowRight, ChevronDown, Loader2, LockKeyhole, ShieldCheck } from "lucide-react"
import { Link, useRouter } from "@/app/navigation"
import { AppDialog } from "@/components/app-dialog"
import { GoogleLogo, MagicLinkLogo, YandexLogo } from "@/components/brand-logos"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { createClient } from "@/lib/supabase/client"
import { roleDefinitions, roles, type Role } from "@/lib/rbac"

const pageCopy = {
  tr: {
    eyebrow: "Güvenli ERP erişimi",
    title: "Ataberk Estate operasyon alanına giriş",
    intro:
      "CRM, daire matrisi, finans, servis ve belgeler rol bazlı yetkiyle açılır. Her aksiyon audit iziyle kaydedilir.",
    email: "E-posta",
    password: "Şifre",
    submit: "Giriş yap",
    request: "Erişim talep et",
    back: "Ana sayfa",
    roleTitle: "Yerel QA rol profilleri",
    roleIntro: "Bu alan sadece yetkili yerel ve test ortamlarında RBAC kontrolü için kullanılır.",
    locked: "Rol profilleri bu ortamda kapalı.",
    authReady: "Supabase kimlik doğrulaması aktif.",
    authNote: "Kimlik doğrulama anahtarları bekleniyor. Yetkili ortamda e-posta/şifre ile giriş açılır.",
    authError: "Giriş başarısız. E-posta ve şifreyi kontrol edin.",
    accessError: "Rol profili açılamadı. Tekrar deneyin.",
    demoButton: "Demo başlat",
    demoHint: "Demo ortamı: Demo başlat'a tıklayın, rol seçin ve ilgili modülleri şifresiz açın.",
    or: "veya",
    providerTitle: "Modern giriş seçenekleri",
    providerSummary: "Diğer giriş yöntemleri",
    providerIntro: "Demo modunda hazırlık gösterilir; canlı bağlantı için sözleşme, OAuth anahtarı ve yönetici onayı gerekir.",
    providerReady: "hazırlık modunda",
    providerDetailsTitle: "Giriş yöntemi hazırlığı",
    openAllProfiles: "Tüm rolleri ayrı sayfada gör",
    close: "Kapat",
    googleNotice: "Google girişi üretim için hazırlanabilir. Canlıya almak için Google OAuth istemcisi ve Supabase provider ayarı gerekir.",
    yandexNotice: "Yandex ID, Rusça konuşan malik/kiracı kitlesi için provider-ready olarak planlandı. Canlıya almak için Yandex OAuth ve redirect onayı gerekir.",
    magicNotice: "Magic link / tek kullanımlık e-posta girişi kontrollü onboarding için hazırlanabilir; kullanıcı yine rol ve portföy onayı bekler.",
    providerDetails: {
      google: "Workspace / Gmail",
      yandex: "Rusça malik/kiracı için uygun",
      magic: "Şifresiz e-posta daveti",
    },
    providerLabels: {
      google: "Google",
      yandex: "Yandex ID",
      magic: "E-posta magic link",
    },
    imageAlt: "Yeni Seviye Premium masterplan ve ERP operasyon bağlamı",
    proof: ["Yeni Seviye Premium portföy alanı", "Finans, servis ve belge merkezi", "Malik, kiracı ve ekip erişimi"],
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
    demoButton: "Start demo",
    demoHint: "Demo environment: click Start demo, choose a role, and open the matching modules without a password.",
    or: "or",
    providerTitle: "Modern sign-in options",
    providerSummary: "Other sign-in methods",
    providerIntro: "Demo mode shows provider readiness; live connection needs contract, OAuth keys and administrator approval.",
    providerReady: "provider-ready",
    providerDetailsTitle: "Sign-in method readiness",
    openAllProfiles: "View all roles on a separate page",
    close: "Close",
    googleNotice: "Google sign-in can be activated for production after Google OAuth client and Supabase provider configuration.",
    yandexNotice: "Yandex ID is planned for Russian-speaking owners and tenants. Production needs Yandex OAuth and approved redirect settings.",
    magicNotice: "Magic link / one-time email sign-in can support controlled onboarding; users still wait for role and portfolio approval.",
    providerDetails: {
      google: "Workspace / Gmail",
      yandex: "RU owner/tenant fit",
      magic: "Passwordless invite",
    },
    providerLabels: {
      google: "Google",
      yandex: "Yandex ID",
      magic: "Email magic link",
    },
    imageAlt: "New Level Premium masterplan and ERP operations context",
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
    roleIntro: "Nur für autorisierte lokale und Testumgebungen zur RBAC-Prüfung.",
    locked: "Rollenprofile sind in dieser Umgebung deaktiviert.",
    authReady: "Supabase-Authentifizierung ist aktiv.",
    authNote: "Authentifizierungsschlüssel fehlen. E-Mail/Passwort wird in autorisierter Umgebung aktiviert.",
    authError: "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.",
    accessError: "Rollenprofil konnte nicht geöffnet werden. Erneut versuchen.",
    demoButton: "Demo starten",
    demoHint: "Demo-Umgebung: Demo starten anklicken, Rolle wählen und passende Module ohne Passwort öffnen.",
    or: "oder",
    providerTitle: "Moderne Anmeldeoptionen",
    providerSummary: "Weitere Anmeldemethoden",
    providerIntro: "Im Demo-Modus wird Provider-Bereitschaft gezeigt; live braucht es Vertrag, OAuth-Keys und Admin-Freigabe.",
    providerReady: "Provider-ready",
    providerDetailsTitle: "Bereitschaft der Anmeldemethode",
    openAllProfiles: "Alle Rollen auf eigener Seite anzeigen",
    close: "Schließen",
    googleNotice: "Google Login kann für Produktion aktiviert werden, sobald Google OAuth Client und Supabase Provider konfiguriert sind.",
    yandexNotice: "Yandex ID ist für russischsprachige Eigentümer und Mieter vorgesehen. Produktion braucht Yandex OAuth und Redirect-Freigabe.",
    magicNotice: "Magic Link / Einmal-E-Mail eignet sich für kontrolliertes Onboarding; Rolle und Portfolio müssen trotzdem freigegeben werden.",
    providerDetails: {
      google: "Workspace / Gmail",
      yandex: "Passend für russischsprachige Eigentümer/Mieter",
      magic: "Passwortlose E-Mail-Einladung",
    },
    providerLabels: {
      google: "Google",
      yandex: "Yandex ID",
      magic: "E-Mail-Magic-Link",
    },
    imageAlt: "Neues Niveau Premium Masterplan und ERP-Operationskontext",
    proof: ["Neues Niveau Premium Portfolio", "Finanz-, Service- und Dokumentenbereich", "Eigentümer-, Mieter- und Teamzugang"],
  },
  ru: {
    eyebrow: "Безопасный ERP-доступ",
    title: "Вход в операционное пространство Ataberk Estate",
    intro:
      "CRM, матрица квартир, финансы, сервис и документы открываются по ролям. Важные действия сохраняют аудиторский след.",
    email: "E-mail",
    password: "Пароль",
    submit: "Войти",
    request: "Запросить доступ",
    back: "На главную",
    roleTitle: "Локальные QA-роли",
    roleIntro: "Только для авторизованных локальных и тестовых сред проверки RBAC.",
    locked: "Ролевые профили отключены в этой среде.",
    authReady: "Аутентификация Supabase активна.",
    authNote: "Ключи аутентификации ожидаются. В авторизованной среде будет доступен вход по e-mail/паролю.",
    authError: "Вход не удался. Проверьте e-mail и пароль.",
    accessError: "Ролевой профиль не открылся. Попробуйте еще раз.",
    demoButton: "Запустить демо",
    demoHint: "Демо-среда: нажмите запуск демо, выберите роль и откройте нужные модули без пароля.",
    or: "или",
    providerTitle: "Современные варианты входа",
    providerSummary: "Другие способы входа",
    providerIntro: "Демо показывает готовность провайдеров; для live нужны договор, OAuth-ключи и одобрение администратора.",
    providerReady: "готово к подключению",
    providerDetailsTitle: "Готовность способа входа",
    openAllProfiles: "Показать все роли на отдельной странице",
    close: "Закрыть",
    googleNotice: "Вход через Google можно включить после настройки Google OAuth Client и Supabase provider.",
    yandexNotice: "Yandex ID запланирован для русскоязычных владельцев и арендаторов. Для live нужны Yandex OAuth и подтвержденные redirect-настройки.",
    magicNotice: "Magic link / одноразовый e-mail подходит для контролируемого onboarding; роль и портфель все равно подтверждает администратор.",
    providerDetails: {
      google: "Workspace / Gmail",
      yandex: "Подходит владельцам/арендаторам на русском",
      magic: "Одноразовая ссылка по e-mail",
    },
    providerLabels: {
      google: "Google",
      yandex: "Yandex ID",
      magic: "Одноразовая ссылка по e-mail",
    },
    imageAlt: "Masterplan «Новый уровень Премиум» и контекст ERP-операций",
    proof: ["Рабочая область «Новый уровень Премиум»", "Финансовый, сервисный и документный центр", "Доступ владельцев, арендаторов и команды"],
  },
} as const

const providerOptions = [
  {
    key: "google",
    label: "Google",
    noticeKey: "googleNotice",
  },
  {
    key: "yandex",
    label: "Yandex ID",
    noticeKey: "yandexNotice",
  },
  {
    key: "magic",
    label: "Email magic link",
    noticeKey: "magicNotice",
  },
] as const

const providerLogos = {
  google: GoogleLogo,
  yandex: YandexLogo,
  magic: MagicLinkLogo,
}

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
  const searchParams = useSearchParams()
  const requestedNext = searchParams.get("next")
  const nextPath = requestedNext?.startsWith("/dashboard") ? requestedNext : "/dashboard"
  const signupHref = nextPath === "/dashboard" ? "/signup" : `/signup?next=${encodeURIComponent(nextPath)}`
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authPending, setAuthPending] = useState(false)
  const [accessProfilesEnabled, setAccessProfilesEnabled] = useState(false)
  const [accessProfileStatusLoaded, setAccessProfileStatusLoaded] = useState(false)
  const [demoRolesOpen, setDemoRolesOpen] = useState(false)
  const [activeRole, setActiveRole] = useState<Role | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [providerNotice, setProviderNotice] = useState<{
    detail: string
    label: string
    notice: string
  } | null>(null)

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

    router.push(nextPath)
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
      router.push(nextPath)
    } catch {
      setActiveRole(null)
      setError(t.accessError)
    }
  }

  async function handleProvider(provider: (typeof providerOptions)[number]) {
    setError(null)
    setProviderNotice({
      detail: t.providerDetails[provider.key],
      label: t.providerLabels[provider.key],
      notice: t[provider.noticeKey],
    })
    if (provider.key !== "google") return
    if (!supabaseConfigured || process.env.NEXT_PUBLIC_ENABLE_LIVE_OAUTH !== "true") return

    const supabase = createClient()
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/${locale}/dashboard` },
    })
    if (oauthError) setError(t.authError)
  }

  return (
    <main id="main" className="min-h-svh bg-[#061a17] text-white">
      <div className="grid min-h-svh lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
        <section className="relative hidden overflow-hidden lg:block">
          <Image
            src="/new-level-premium/masterplan-aerial.jpg"
            alt={t.imageAlt}
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
                <p className="text-xs text-white/65">1Çatı ERP</p>
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
              <span className="text-sm font-black">1Çatı</span>
            </Link>
            <Link href="/" className="hidden text-sm font-bold text-muted-foreground transition hover:text-foreground lg:inline-flex">
              {t.back}
            </Link>
            <div className="flex items-center gap-2">
              <LocaleSwitcher compact />
              <Link
                href={signupHref}
                className="hidden h-10 items-center rounded-full border border-border px-4 text-sm font-bold text-foreground transition hover:bg-muted sm:inline-flex"
              >
                {t.request}
              </Link>
            </div>
          </div>

          <div className="flex flex-1 items-center px-5 py-8 sm:px-8">
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-3xl border border-border bg-card p-5 shadow-2xl shadow-black/[0.06] sm:p-7">
                <div className="mb-7">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t.eyebrow}</p>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-card-foreground">{t.submit}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {supabaseConfigured ? t.authReady : t.authNote}
                  </p>
                </div>

                <section className="mb-6 rounded-2xl border border-primary/15 bg-primary/[0.04] p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-card-foreground">{t.roleTitle}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {accessProfilesEnabled ? t.roleIntro : t.locked}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    data-testid="demo-full-access"
                    aria-expanded={demoRolesOpen}
                    aria-controls="demo-role-menu"
                    onClick={() => setDemoRolesOpen((open) => !open)}
                    disabled={!accessProfileStatusLoaded}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {t.demoButton}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {accessProfilesEnabled ? t.demoHint : t.locked}
                  </p>
                  {demoRolesOpen && (
                    <div
                      id="demo-role-menu"
                      data-testid="demo-role-menu"
                      className="mt-4 rounded-2xl border border-border bg-background p-3"
                    >
                      <div className="grid gap-2 sm:grid-cols-2">
                        {roles.map((role) => {
                          const roleText = roleCopy(role, roleT)
                          return (
                            <button
                              key={role}
                              type="button"
                              data-testid={`demo-role-option-${role}`}
                              onClick={() => signInAs(role)}
                              disabled={!accessProfilesEnabled || !accessProfileStatusLoaded || activeRole === role}
                              title={!accessProfilesEnabled ? t.locked : roleText.description}
                              className="group flex min-h-16 items-start gap-3 rounded-xl border border-border bg-card p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] disabled:cursor-not-allowed disabled:opacity-55"
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
                    </div>
                  )}
                </section>

                <form className="grid gap-4" onSubmit={handlePasswordSignIn}>
                  <div className="grid gap-2">
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
                      suppressHydrationWarning
                      className="h-12 w-full rounded-xl border border-border bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                  <div className="grid gap-2">
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
                      suppressHydrationWarning
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
                </form>

                <div className="my-6 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {t.or}
                  <span className="h-px flex-1 bg-border" />
                </div>

                <section className="rounded-2xl border border-border bg-muted/25 p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-card-foreground">{t.providerSummary}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.providerIntro}</p>
                    </div>
                    <span className="inline-flex w-fit shrink-0 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.1em] text-primary">
                      {t.providerReady}
                    </span>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {providerOptions.map((provider) => {
                      const Logo = providerLogos[provider.key]
                      return (
                        <button
                          key={provider.key}
                          type="button"
                          onClick={() => void handleProvider(provider)}
                          className="flex min-h-14 items-center gap-3 rounded-xl border border-border bg-background p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.04]"
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-white text-primary shadow-sm">
                            <Logo className={provider.key === "magic" ? "text-primary" : undefined} />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black leading-tight text-card-foreground">{t.providerLabels[provider.key]}</span>
                            <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{t.providerDetails[provider.key]}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Link
                    href="/login/profiles"
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-center text-sm font-black text-foreground transition hover:bg-muted"
                  >
                    {t.openAllProfiles}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href={signupHref}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-center text-sm font-black text-foreground transition hover:bg-muted"
                  >
                    {t.request}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
      <AppDialog
        open={Boolean(providerNotice)}
        closeLabel={t.close}
        onOpenChange={(open) => {
          if (!open) setProviderNotice(null)
        }}
        title={providerNotice ? `${providerNotice.label} - ${t.providerDetailsTitle}` : t.providerDetailsTitle}
        description={providerNotice?.detail}
        footer={
          <button
            type="button"
            onClick={() => setProviderNotice(null)}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary/90 sm:w-auto"
          >
            {t.close}
          </button>
        }
      >
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm font-semibold leading-7 text-amber-900 dark:text-amber-100">
          {providerNotice?.notice}
        </div>
      </AppDialog>
    </main>
  )
}
