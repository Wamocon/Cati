"use client"

import Image from "next/image"
import { useState } from "react"
import { useLocale } from "next-intl"
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, ShieldCheck } from "lucide-react"
import { Link } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { createClient } from "@/lib/supabase/client"
import { roles, type Role } from "@/lib/rbac"

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
    success: "Talep alındı. E-posta doğrulaması ve yönetici onayı tamamlandığında erişim açılır.",
    authMissing: "Auth anahtarları bu ortamda kapalı. Talep için info@ataberkestate.com adresine yazın.",
    error: "Talep gönderilemedi. Bilgileri kontrol edip tekrar deneyin.",
    note: "Açık self-service kayıt yerine onaylı erişim kullanılır; bu ERP için daha güvenli yaklaşımdır.",
  },
  en: {
    title: "Request 1Cati access",
    intro: "ERP account creation is controlled. The request is recorded, then role and portfolio scope are approved before access opens.",
    name: "Full name",
    email: "Email",
    role: "Requested role",
    password: "Password",
    company: "Company / Portfolio Scope",
    submit: "Send access request",
    login: "Back to login",
    success: "Request received. Access opens after email verification and administrator approval.",
    authMissing: "Auth keys are disabled in this environment. Contact info@ataberkestate.com for access.",
    error: "Request could not be sent. Check the details and try again.",
    note: "Controlled access is safer than open self-service signup for a business ERP.",
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
    success: "Anfrage erhalten. Zugang folgt nach E-Mail-Bestätigung und Administratorfreigabe.",
    authMissing: "Auth-Schlüssel sind in dieser Umgebung deaktiviert. Bitte info@ataberkestate.com kontaktieren.",
    error: "Anfrage konnte nicht gesendet werden. Angaben prüfen und erneut versuchen.",
    note: "Kontrollierter Zugang ist für ein ERP sicherer als offene Selbstregistrierung.",
  },
  ru: {
    title: "Запрос доступа к 1Çatı",
    intro: "Создание учётной записи ERP проходит контролируемо. Заявка регистрируется, роль и объём портфеля подтверждаются, после чего доступ активируется.",
    name: "Имя и фамилия",
    email: "Эл. почта",
    role: "Запрашиваемая роль",
    password: "Пароль",
    company: "Компания / портфель",
    submit: "Отправить запрос на доступ",
    login: "Вернуться к входу",
    success: "Заявка получена. Доступ откроется после подтверждения почты и одобрения администратором.",
    authMissing: "Ключи авторизации отключены в этой среде. По вопросам доступа обращайтесь на info@ataberkestate.com.",
    error: "Заявку не удалось отправить. Проверьте данные и попробуйте снова.",
    note: "Контролируемый доступ безопаснее открытой самостоятельной регистрации для бизнес-ERP.",
  },
} as const

const roleLabels: Record<Role, Record<keyof typeof copy, string>> = {
  admin: { tr: "Yönetim", en: "Administration", de: "Verwaltung", ru: "Администрация" },
  manager: { tr: "Sorumlu", en: "Manager", de: "Verantwortlicher Manager", ru: "Ответственный менеджер" },
  accountant: { tr: "Muhasebe", en: "Accounting", de: "Buchhaltung", ru: "Бухгалтерия" },
  staff: { tr: "Personel", en: "Staff", de: "Mitarbeiter", ru: "Персонал" },
  owner: { tr: "Malik", en: "Owner", de: "Eigentümer", ru: "Собственник" },
  tenant: { tr: "Kiracı", en: "Tenant", de: "Mieter", ru: "Арендатор" },
}

const onboardingLabel: Record<keyof typeof copy, string> = {
  tr: "Kontrollü onboarding",
  en: "Controlled onboarding",
  de: "Kontrolliertes Onboarding",
  ru: "Контролируемый онбординг",
}

const governanceLabel: Record<keyof typeof copy, string> = {
  tr: "Erişim yönetişimi",
  en: "Access governance",
  de: "Zugangskontrolle",
  ru: "Управление доступом",
}

const governanceHeading: Record<keyof typeof copy, string> = {
  tr: "Üretim erişiminden önce rol, portföy ve denetim.",
  en: "Role, portfolio and audit before production access.",
  de: "Rolle, Portfolio und Prüfung vor dem Produktionszugang.",
  ru: "Роль, портфель и проверка перед доступом к продакшену.",
}

const governanceBody: Record<keyof typeof copy, string> = {
  tr: "Malikler, kiracılar, personel ve finans kullanıcıları aynı ERP ekranını görmemelidir. Erişim, rol ve ilgili gayrimenkul/portföy kapsamının tanımlanmasıyla başlar.",
  en: "Owners, tenants, staff and finance users should not all see the same ERP. Access starts with the role and the specific property scope.",
  de: "Eigentümer, Mieter, Mitarbeiter und Finanznutzer sollten nicht dasselbe ERP sehen. Der Zugang beginnt mit der Rolle und dem jeweiligen Objektumfang.",
  ru: "Собственники, арендаторы, персонал и финансовые пользователи не должны видеть одну и ту же ERP-систему. Доступ начинается с определения роли и конкретного объёма портфеля.",
}

export default function SignupPage() {
  const locale = useLocale()
  const localeKey = (locale as keyof typeof copy) in copy ? (locale as keyof typeof copy) : "en"
  const t = copy[localeKey]
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [company, setCompany] = useState("New Level Premium")
  const [role, setRole] = useState<Role>("owner")
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")

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
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">{onboardingLabel[localeKey]}</p>
              <h1 className="mt-3 text-4xl font-black leading-tight text-foreground">{t.title}</h1>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{t.intro}</p>

              <form onSubmit={submit} className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.05] sm:p-6">
                <label className="grid gap-2 text-sm font-bold text-card-foreground">
                  {t.name}
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    required
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
                          {roleLabels[item][localeKey]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="grid gap-2 text-sm font-bold text-card-foreground">
                  {t.company}
                  <input
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    required
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
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100">{governanceLabel[localeKey]}</p>
            <h2 className="mt-3 text-3xl font-black leading-tight">{governanceHeading[localeKey]}</h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              {governanceBody[localeKey]}
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
