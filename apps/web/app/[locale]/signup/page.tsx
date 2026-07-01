"use client"

import Image from "next/image"
import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, ClipboardCheck, Loader2, ShieldCheck, UserRoundCheck } from "lucide-react"
import { Link } from "@/app/navigation"
import { GoogleLogo, MagicLinkLogo, YandexLogo } from "@/components/brand-logos"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { StatusBadge } from "@/components/status-badge"
import { createClient } from "@/lib/supabase/client"
import { roleDefinitions, roles, type Role } from "@/lib/rbac"

const copy = {
  tr: {
    title: "1Çatı erişim talebi",
    intro: "ERP hesabı oluşturma kontrollü ilerler. Talep alınır, rol ve portföy kapsamı onaylandıktan sonra kullanıcı aktif edilir.",
    name: "Ad soyad",
    email: "E-posta",
    role: "Talep edilen rol",
    password: "Şifre",
    company: "Şirket / portföy",
    submit: "Erişim talebini gönder",
    login: "Giriş sayfasına dön",
    providerTitle: "Kimlik seçeneği",
    providerIntro: "Google, Yandex ID ve magic link hazırlık modunda gösterilir; canlı kullanım için OAuth/API anahtarları gerekir.",
    onboardingEyebrow: "Kontrollü onboarding",
    onboardingTitle: "Rol onboarding planı",
    viewRoleProfiles: "Tüm rol profillerini aç",
    whatHappensNext: "Onay adımlarını aç",
    checks: "Gerekli kontroller",
    firstSteps: "İlk kullanım adımları",
    productionGate: "Canlıya geçiş koşulu",
    approvalMode: "onaylı erişim",
    checkItems: ["Daire/portföy eşleşmesi", "Rol ve izin kapsamı", "İletişim ve audit onayı"],
    firstStepItems: ["Profil bilgilerini doğrula", "Yetkili modülleri incele", "İlk yönetici onayını bekle"],
    productionGateText: "Üretim erişimi, rol ve portföy kapsamı yönetici tarafından onaylandıktan sonra açılır.",
    providerNotice: "Provider seçimi talebe not olarak eklenir. Canlı OAuth henüz demo modunda tutulur.",
    success: "Talep alındı. E-posta doğrulaması ve yönetici onayı tamamlandığında erişim açılır.",
    authMissing: "Auth anahtarları bu ortamda kapalı. Talep için info@ataberkestate.com adresine yazın.",
    error: "Talep gönderilemedi. Bilgileri kontrol edip tekrar deneyin.",
    note: "Açık self-service kayıt yerine onaylı erişim kullanılır; bu ERP için daha güvenli yaklaşımdır.",
    sideEyebrow: "Erişim yönetişimi",
    sideTitle: "Üretim erişiminden önce rol, portföy ve audit kontrolü.",
    sideIntro: "Malikler, kiracılar, personel ve finans kullanıcıları aynı ERP görünümünü görmemelidir. Erişim rol ve mülk kapsamıyla başlar.",
  },
  en: {
    title: "Request 1Çatı access",
    intro: "ERP account creation is controlled. The request is recorded, then role and portfolio scope are approved before access opens.",
    name: "Full name",
    email: "Email",
    role: "Requested role",
    password: "Password",
    company: "Company / portfolio",
    submit: "Send access request",
    login: "Back to login",
    providerTitle: "Identity option",
    providerIntro: "Google, Yandex ID and magic link are shown in provider-ready mode; live use needs OAuth/API keys.",
    onboardingEyebrow: "Controlled onboarding",
    onboardingTitle: "Role onboarding plan",
    viewRoleProfiles: "Open all role profiles",
    whatHappensNext: "Open approval steps",
    checks: "Required checks",
    firstSteps: "First-run steps",
    productionGate: "Production gate",
    approvalMode: "approved access",
    checkItems: ["Unit/portfolio match", "Role and permission scope", "Communication and audit approval"],
    firstStepItems: ["Confirm profile details", "Review allowed modules", "Wait for first administrator approval"],
    productionGateText: "Production access opens only after an administrator approves the role and portfolio scope.",
    providerNotice: "Provider choice is recorded as request context. Live OAuth remains in demo mode for now.",
    success: "Request received. Access opens after email verification and administrator approval.",
    authMissing: "Auth keys are disabled in this environment. Contact info@ataberkestate.com for access.",
    error: "Request could not be sent. Check the details and try again.",
    note: "Controlled access is safer than open self-service signup for a business ERP.",
    sideEyebrow: "Access governance",
    sideTitle: "Role, portfolio and audit before production access.",
    sideIntro: "Owners, tenants, staff and finance users should not all see the same ERP. Access starts with the role and the specific property scope.",
  },
  de: {
    title: "1Çatı-Zugang anfragen",
    intro: "ERP-Konten werden kontrolliert erstellt. Rolle und Portfolio werden geprüft, bevor der Zugang freigegeben wird.",
    name: "Name",
    email: "E-Mail",
    role: "Gewünschte Rolle",
    password: "Passwort",
    company: "Firma / Portfolio",
    submit: "Zugangsanfrage senden",
    login: "Zur Anmeldung",
    providerTitle: "Identitätsoption",
    providerIntro: "Google, Yandex ID und Magic Link werden provider-ready angezeigt; live braucht OAuth/API-Keys.",
    onboardingEyebrow: "Kontrolliertes Onboarding",
    onboardingTitle: "Rollen-Onboarding",
    viewRoleProfiles: "Alle Rollenprofile öffnen",
    whatHappensNext: "Freigabeschritte öffnen",
    checks: "Erforderliche Prüfungen",
    firstSteps: "Erste Schritte",
    productionGate: "Produktionsfreigabe",
    approvalMode: "freigegebener Zugang",
    checkItems: ["Wohnungs-/Portfolio-Abgleich", "Rollen- und Berechtigungsumfang", "Kommunikations- und Audit-Freigabe"],
    firstStepItems: ["Profildaten bestätigen", "Freigegebene Module prüfen", "Erste Administratorfreigabe abwarten"],
    productionGateText: "Produktionszugang wird erst nach Administratorfreigabe von Rolle und Portfolio geöffnet.",
    providerNotice: "Provider-Auswahl wird als Kontext gespeichert. Live OAuth bleibt vorerst Demo-Modus.",
    success: "Anfrage erhalten. Zugang folgt nach E-Mail-Bestätigung und Administratorfreigabe.",
    authMissing: "Auth-Schlüssel sind in dieser Umgebung deaktiviert. Bitte info@ataberkestate.com kontaktieren.",
    error: "Anfrage konnte nicht gesendet werden. Angaben prüfen und erneut versuchen.",
    note: "Kontrollierter Zugang ist für ein ERP sicherer als offene Selbstregistrierung.",
    sideEyebrow: "Zugangssteuerung",
    sideTitle: "Rolle, Portfolio und Audit vor Produktionszugang.",
    sideIntro: "Eigentümer, Mieter, Personal und Finanznutzer sollten nicht dieselbe ERP-Ansicht sehen. Der Zugang beginnt mit Rolle und Objektumfang.",
  },
  ru: {
    title: "Запрос доступа к 1Çatı",
    intro: "Создание ERP-аккаунта контролируется. Роль и портфель проверяются до открытия доступа.",
    name: "Имя",
    email: "E-mail",
    role: "Запрашиваемая роль",
    password: "Пароль",
    company: "Компания / портфель",
    submit: "Отправить запрос",
    login: "Назад ко входу",
    providerTitle: "Вариант идентификации",
    providerIntro: "Google, Yandex ID и magic link показаны как provider-ready; для live нужны OAuth/API-ключи.",
    onboardingEyebrow: "Контролируемое подключение",
    onboardingTitle: "Подключение по роли",
    viewRoleProfiles: "Открыть все роли",
    whatHappensNext: "Открыть шаги одобрения",
    checks: "Обязательные проверки",
    firstSteps: "Первые шаги",
    productionGate: "Условие production-доступа",
    approvalMode: "доступ после одобрения",
    checkItems: ["Связь с квартирой/портфелем", "Объем роли и прав", "Согласие на коммуникацию и аудит"],
    firstStepItems: ["Проверить профиль", "Посмотреть доступные модули", "Дождаться первого одобрения администратора"],
    productionGateText: "Production-доступ открывается только после одобрения роли и портфеля администратором.",
    providerNotice: "Выбор провайдера сохраняется как контекст запроса. Live OAuth пока остается в demo-режиме.",
    success: "Запрос получен. Доступ откроется после проверки e-mail и одобрения администратором.",
    authMissing: "Auth-ключи отключены в этой среде. Напишите на info@ataberkestate.com.",
    error: "Запрос не отправлен. Проверьте данные и попробуйте снова.",
    note: "Контролируемый доступ безопаснее открытой регистрации для бизнес-ERP.",
    sideEyebrow: "Управление доступом",
    sideTitle: "Роль, портфель и аудит до production-доступа.",
    sideIntro: "Владельцы, арендаторы, персонал и финансовые пользователи не должны видеть один и тот же ERP. Доступ начинается с роли и конкретного объекта.",
  },
} as const

const identityOptions = [
  { key: "google", label: "Google" },
  { key: "yandex", label: "Yandex ID" },
  { key: "magic", label: "Email magic link" },
] as const

const identityLogos = {
  google: GoogleLogo,
  yandex: YandexLogo,
  magic: MagicLinkLogo,
}

export default function SignupPage() {
  const locale = useLocale()
  const t = copy[(locale as keyof typeof copy) in copy ? (locale as keyof typeof copy) : "en"]
  const roleT = useTranslations("roles")
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("New Level Premium")
  const [role, setRole] = useState<Role>("owner")
  const [identityProvider, setIdentityProvider] = useState<(typeof identityOptions)[number]["key"]>("magic")
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const selectedRoleDefinition = roleDefinitions.find((definition) => definition.key === role)
  const selectedRoleLabel = roleT(selectedRoleDefinition?.labelKey.replace("roles.", "") ?? role)
  const selectedRoleDescription = selectedRoleDefinition?.descriptionKey
    ? roleT(selectedRoleDefinition.descriptionKey.replace("roles.descriptions.", "descriptions."))
    : ""

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!supabaseConfigured) {
      setStatus("error")
      return
    }

    setPending(true)
    setStatus("idle")
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/${locale}/dashboard`,
        data: {
          full_name: fullName,
          requested_role: role,
          requested_identity_provider: identityProvider,
          company,
          source: "1cati-access-request",
        },
      },
    })
    setPending(false)
    setStatus(error ? "error" : "success")
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="grid min-h-svh lg:grid-cols-[minmax(520px,1fr)_minmax(0,0.85fr)]">
        <section className="flex min-h-svh flex-col">
          <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8">
            <Link href="/" className="flex items-center gap-3">
              <CatiLogoMark />
              <span className="text-sm font-black">Ataberk Estate</span>
            </Link>
            <LocaleSwitcher compact />
          </header>

          <div className="flex flex-1 items-center px-5 py-8 sm:px-8">
            <div className="mx-auto w-full max-w-xl">
              <Link href="/login" className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground transition hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                {t.login}
              </Link>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{t.onboardingEyebrow}</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-foreground">{t.title}</h1>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.intro}</p>

              <form onSubmit={submit} className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.05] sm:p-6">
                <div className="rounded-2xl border border-border bg-muted/25 p-3">
                  <div className="flex items-start gap-3">
                    <UserRoundCheck className="mt-0.5 h-5 w-5 text-primary" />
                    <div>
                      <h2 className="text-sm font-black text-card-foreground">{t.providerTitle}</h2>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.providerIntro}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    {identityOptions.map((option) => {
                      const Logo = identityLogos[option.key]
                      return (
                        <button
                          key={option.key}
                          type="button"
                          aria-pressed={identityProvider === option.key}
                          onClick={() => setIdentityProvider(option.key)}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-center text-sm font-black leading-tight text-foreground transition hover:bg-muted aria-pressed:border-primary/40 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                        >
                          <Logo className={option.key === "magic" ? "shrink-0 text-primary" : "shrink-0"} />
                          <span className="min-w-0">{option.label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">{t.providerNotice}</p>
                </div>

                <label className="grid gap-2 text-sm font-bold text-card-foreground">
                  {t.name}
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
                    suppressHydrationWarning
                    className="h-12 rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold text-card-foreground">
                  {t.email}
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    suppressHydrationWarning
                    className="h-12 rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm font-bold text-card-foreground">
                    {t.password}
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                      suppressHydrationWarning
                      className="h-12 rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </label>
                  <label className="grid gap-2 text-sm font-bold text-card-foreground">
                    {t.role}
                    <select
                      value={role}
                      onChange={(event) => setRole(event.target.value as Role)}
                      className="h-12 rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      {roles.map((item) => (
                        <option key={item} value={item}>
                          {roleT(roleDefinitions.find((definition) => definition.key === item)?.labelKey.replace("roles.", "") ?? item)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        <h2 className="text-sm font-black text-card-foreground">{t.onboardingTitle}</h2>
                      </div>
                      <p className="mt-1 text-sm font-bold text-foreground">{selectedRoleLabel}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{selectedRoleDescription}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <StatusBadge variant="info">{t.approvalMode}</StatusBadge>
                      <Link
                        href="/login/profiles"
                        className="inline-flex min-h-7 items-center rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-black text-foreground transition hover:bg-muted"
                      >
                        {t.viewRoleProfiles}
                      </Link>
                    </div>
                  </div>
                  <details className="mt-4 rounded-xl border border-border bg-muted/25 p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-black uppercase text-muted-foreground [&::-webkit-details-marker]:hidden">
                      {t.whatHappensNext}
                      <ChevronDown className="h-4 w-4" />
                    </summary>
                    <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
                      <div>
                        <p className="text-xs font-black uppercase text-muted-foreground">{t.checks}</p>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                          {t.checkItems.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-muted-foreground">{t.firstSteps}</p>
                        <ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">
                          {t.firstStepItems.map((item) => (
                            <li key={item} className="flex gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold leading-5 text-amber-800 dark:text-amber-200">
                      {t.productionGate}: {t.productionGateText}
                    </p>
                  </details>
                </div>
                <label className="grid gap-2 text-sm font-bold text-card-foreground">
                  {t.company}
                  <input
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    required
                    suppressHydrationWarning
                    className="h-12 rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </label>

                {status === "success" && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-700" role="status">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{t.success}</span>
                  </div>
                )}
                {status === "error" && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{supabaseConfigured ? t.error : t.authMissing}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  {t.submit}
                </button>
                <p className="text-xs leading-6 text-muted-foreground">{t.note}</p>
              </form>
            </div>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#061a17] text-white lg:block">
          <Image
            src="/new-level-premium/showroom-bedroom.jpg"
            alt="New Level Premium furnished interior for owner and tenant onboarding"
            fill
            sizes="42vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,16,14,0.2),rgba(3,16,14,0.92))]" />
          <div className="absolute bottom-8 left-8 right-8 rounded-3xl border border-white/14 bg-white/10 p-6 backdrop-blur-xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">{t.sideEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">{t.sideTitle}</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              {t.sideIntro}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
