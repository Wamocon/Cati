"use client"

import { useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clipboard,
  Clock3,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { CatiLogoMark } from "@/components/cati-logo"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { createClient } from "@/lib/supabase/client"
import type {
  PublicRegistrationRole,
  RegistrationActivationStatus,
  RegistrationPublicStatus,
} from "@/lib/registration"

type LocaleKey = "tr" | "en" | "de" | "ru"
type View = "request" | "receipt" | "track" | "activate"
type ActivationState = {
  reference: string
  token: string
  redemptionKey: string
}

const copy = {
  en: {
    eyebrow: "Controlled access",
    title: "Request your 1Çatı account",
    intro:
      "Tell us who you are and which unit or work scope you need. An administrator checks the evidence before any access is created.",
    back: "Back to sign in",
    track: "Track a request",
    newRequest: "New request",
    owner: "Owner",
    ownerDesc: "Access to an exactly approved owned unit.",
    tenant: "Tenant",
    tenantDesc: "Time- and unit-scoped resident access.",
    staff: "Staff",
    staffDesc: "Only the approved operational sites.",
    noPrivileged:
      "Manager, accounting and administrator roles cannot be requested publicly.",
    fullName: "Full name",
    email: "Email",
    phone: "Phone (optional)",
    unit: "Claimed block / unit",
    proofType: "Evidence type",
    proofReference: "Evidence or contract reference",
    invite: "Owner invitation code (tenant, optional)",
    position: "Position / team",
    idType: "Identity document",
    idNumber: "Document number",
    country: "Issuing country",
    passport: "Passport",
    tc: "TC Kimlik",
    deed: "Title deed / TAPU",
    contract: "Contract",
    reservation: "Reservation / payment reference",
    consent:
      "I consent to the stated identity and contact data being minimized and protected under KVKK only to review this access request, bind an approved scope, and keep the required audit trail. Exact retention and deletion periods will apply only after the client and legal team approve the KVKK policy.",
    submit: "Send access request",
    sending: "Sending securely…",
    receiptTitle: "Request received",
    receiptIntro:
      "Save both values privately. The reference alone cannot reveal your status.",
    reference: "Reference",
    receiptKey: "Private tracking key",
    copy: "Copy",
    copied: "Copied",
    statusTitle: "Track your request",
    statusIntro: "Enter the reference and private key from your receipt.",
    checkStatus: "Check status",
    lastUpdated: "Last updated",
    next: "Next step",
    activationTitle: "Activate approved access",
    activationIntro:
      "This invitation is one-time, expires automatically and works only with the approved email address.",
    credentialEmail: "Approved email address",
    password: "Create a password",
    activate: "Create secure login & activate",
    complete: "Complete activation",
    confirmEmail:
      "Check your inbox and confirm the email. Then return to this same link to complete activation.",
    providerMissing:
      "Authentication is not configured in this environment. The approval remains safe, but account activation cannot run here.",
    identityProtectionUnavailable:
      "Protected identity intake is not configured in this environment, so your request was not stored. Contact site management or try again after the approved protection setting is enabled.",
    invalidActivationLink:
      "For your security, activation secrets are accepted only from the private invitation link, not from URL query parameters. Ask management for a new invitation if needed.",
    activated: "Access activated. You can now sign in.",
    login: "Go to sign in",
    expired:
      "This activation is expired, revoked or already used. Ask management for a new invitation.",
    error:
      "The operation could not be completed. Check the values and try again.",
    rateLimited:
      "Too many attempts. Please wait a while before trying again.",
    duplicate:
      "A request with these details already exists. Track your existing request instead of creating a new one.",
    notFound:
      "We couldn't find a request matching that reference and key. Please check both values from your receipt.",
    passwordHint: "Use at least 10 characters.",
    roleLegend: "Select your role",
    privateNote:
      "Keep activation and tracking links private. Support will never ask for your password.",
    approvalTitle: "Human approval, exact scope",
    approvalEvidence: "Evidence and versioned consent are recorded.",
    approvalDecision: "A manager may recommend; only an administrator decides.",
    approvalScope:
      "The invitation binds the confirmed email to one approved unit or site set.",
    statusSubmitted: "Submitted",
    statusUnderReview: "Under review",
    statusApproved: "Approved",
    statusRejected: "Rejected",
    statusActivated: "Activated",
    nextAwaitReview: "Await human review",
    nextUseActivation: "Use the private activation invitation",
    nextContactManagement: "Contact site management",
    nextSignIn: "Sign in",
    activationPending: "Pending",
    activationRedeemed: "Used",
    activationRevoked: "Revoked",
    activationExpired: "Expired",
  },
  tr: {
    eyebrow: "Kontrollü erişim",
    title: "1Çatı hesabınızı talep edin",
    intro:
      "Kim olduğunuzu ve gereken daire ya da çalışma kapsamını bildirin. Erişim oluşturulmadan önce kanıtları bir yönetici kontrol eder.",
    back: "Girişe dön",
    track: "Talebi takip et",
    newRequest: "Yeni talep",
    owner: "Malik",
    ownerDesc: "Kesin olarak onaylanan malik dairesine erişim.",
    tenant: "Kiracı",
    tenantDesc: "Süre ve daire kapsamlı sakin erişimi.",
    staff: "Personel",
    staffDesc: "Yalnızca onaylanan operasyon siteleri.",
    noPrivileged:
      "Sorumlu, muhasebe ve yönetici rolleri genel formdan talep edilemez.",
    fullName: "Ad soyad",
    email: "E-posta",
    phone: "Telefon (opsiyonel)",
    unit: "Talep edilen blok / daire",
    proofType: "Kanıt türü",
    proofReference: "Kanıt veya sözleşme referansı",
    invite: "Malik davet kodu (kiracı, opsiyonel)",
    position: "Pozisyon / ekip",
    idType: "Kimlik belgesi",
    idNumber: "Belge numarası",
    country: "Veren ülke",
    passport: "Pasaport",
    tc: "T.C. Kimlik",
    deed: "TAPU",
    contract: "Sözleşme",
    reservation: "Rezervasyon / ödeme referansı",
    consent:
      "Belirtilen kimlik ve iletişim verilerimin yalnızca erişim talebini incelemek, onaylı kapsamı bağlamak ve gerekli denetim kaydını tutmak için KVKK kapsamında asgari ve korumalı şekilde işlenmesini onaylıyorum. Kesin saklama ve silme süreleri ancak müşteri ve hukuk onaylı KVKK politikası yürürlüğe girdikten sonra uygulanacaktır.",
    submit: "Erişim talebini gönder",
    sending: "Güvenli gönderiliyor…",
    receiptTitle: "Talep alındı",
    receiptIntro:
      "İki değeri de özel olarak saklayın. Yalnızca referans durumunuzu göstermez.",
    reference: "Referans",
    receiptKey: "Özel takip anahtarı",
    copy: "Kopyala",
    copied: "Kopyalandı",
    statusTitle: "Talebinizi takip edin",
    statusIntro: "Makbuzdaki referans ve özel anahtarı girin.",
    checkStatus: "Durumu kontrol et",
    lastUpdated: "Son güncelleme",
    next: "Sonraki adım",
    activationTitle: "Onaylı erişimi etkinleştirin",
    activationIntro:
      "Bu davet tek kullanımlıdır, otomatik sona erer ve yalnızca onaylı e-posta ile çalışır.",
    credentialEmail: "Onaylı e-posta adresi",
    password: "Şifre oluşturun",
    activate: "Güvenli giriş oluştur ve etkinleştir",
    complete: "Aktivasyonu tamamla",
    confirmEmail:
      "E-postanızı kontrol edip onaylayın. Ardından aktivasyonu tamamlamak için aynı bağlantıya dönün.",
    providerMissing:
      "Bu ortamda kimlik doğrulama yapılandırılmamış. Onay güvende kalır ancak hesap burada etkinleştirilemez.",
    identityProtectionUnavailable:
      "Bu ortamda korumalı kimlik alımı yapılandırılmadığı için talebiniz kaydedilmedi. Site yönetimiyle iletişime geçin veya onaylı koruma ayarı açıldıktan sonra yeniden deneyin.",
    invalidActivationLink:
      "Güvenliğiniz için aktivasyon sırları URL sorgu parametrelerinden değil, yalnızca özel davet bağlantısından kabul edilir. Gerekirse yönetimden yeni davet isteyin.",
    activated: "Erişim etkinleştirildi. Artık giriş yapabilirsiniz.",
    login: "Girişe git",
    expired:
      "Aktivasyon süresi dolmuş, iptal edilmiş veya kullanılmış. Yeni davet için yönetime başvurun.",
    error: "İşlem tamamlanamadı. Değerleri kontrol edip tekrar deneyin.",
    rateLimited:
      "Çok fazla deneme yapıldı. Lütfen bir süre bekleyip tekrar deneyin.",
    duplicate:
      "Bu bilgilerle bir talep zaten var. Yeni talep oluşturmak yerine mevcut talebinizi takip edin.",
    notFound:
      "Bu referans ve anahtarla eşleşen bir talep bulunamadı. Lütfen makbuzunuzdaki her iki değeri de kontrol edin.",
    passwordHint: "En az 10 karakter kullanın.",
    roleLegend: "Rolünüzü seçin",
    privateNote:
      "Aktivasyon ve takip bağlantılarını gizli tutun. Destek sizden asla şifrenizi istemez.",
    approvalTitle: "İnsan onayı, kesin kapsam",
    approvalEvidence: "Kanıtlar ve sürümlü KVKK onayı kaydedilir.",
    approvalDecision:
      "Sorumlu öneride bulunabilir; kararı yalnızca yönetici verir.",
    approvalScope:
      "Davet, doğrulanan e-postayı yalnızca onaylanan daire veya site kapsamına bağlar.",
    statusSubmitted: "Gönderildi",
    statusUnderReview: "İnceleniyor",
    statusApproved: "Onaylandı",
    statusRejected: "Reddedildi",
    statusActivated: "Etkinleştirildi",
    nextAwaitReview: "İnsan incelemesini bekleyin",
    nextUseActivation: "Özel etkinleştirme davetini kullanın",
    nextContactManagement: "Site yönetimiyle iletişime geçin",
    nextSignIn: "Giriş yapın",
    activationPending: "Bekliyor",
    activationRedeemed: "Kullanıldı",
    activationRevoked: "İptal edildi",
    activationExpired: "Süresi doldu",
  },
  de: {
    eyebrow: "Kontrollierter Zugang",
    title: "1Çatı-Konto anfragen",
    intro:
      "Nennen Sie Identität und benötigte Einheit oder Arbeitsscope. Ein Admin prüft die Nachweise, bevor Zugang entsteht.",
    back: "Zur Anmeldung",
    track: "Anfrage verfolgen",
    newRequest: "Neue Anfrage",
    owner: "Eigentümer",
    ownerDesc: "Zugang zur exakt freigegebenen eigenen Einheit.",
    tenant: "Mieter",
    tenantDesc: "Zeitlich und auf eine Einheit begrenzter Zugang.",
    staff: "Mitarbeiter",
    staffDesc: "Nur freigegebene Einsatzorte.",
    noPrivileged:
      "Manager-, Buchhaltungs- und Admin-Rollen sind öffentlich nicht anfragbar.",
    fullName: "Name",
    email: "E-Mail",
    phone: "Telefon (optional)",
    unit: "Beanspruchter Block / Einheit",
    proofType: "Nachweisart",
    proofReference: "Nachweis- oder Vertragsreferenz",
    invite: "Eigentümer-Einladungscode (optional)",
    position: "Position / Team",
    idType: "Ausweisdokument",
    idNumber: "Dokumentnummer",
    country: "Ausstellungsland",
    passport: "Reisepass",
    tc: "TC Kimlik",
    deed: "Grundbuch / TAPU",
    contract: "Vertrag",
    reservation: "Reservierungs-/Zahlungsreferenz",
    consent:
      "Ich willige ein, dass die angegebenen Identitäts- und Kontaktdaten gemäß KVKK nur zur Prüfung dieses Zugangsantrags, zur Bindung des freigegebenen Umfangs und für die erforderliche Prüfspur minimiert und geschützt verarbeitet werden. Genaue Aufbewahrungs- und Löschfristen gelten erst nach Freigabe der KVKK-Richtlinie durch Kunde und Rechtsberatung.",
    submit: "Zugang anfragen",
    sending: "Sicher übertragen…",
    receiptTitle: "Anfrage erhalten",
    receiptIntro:
      "Beide Werte privat speichern. Die Referenz allein zeigt keinen Status.",
    reference: "Referenz",
    receiptKey: "Privater Tracking-Schlüssel",
    copy: "Kopieren",
    copied: "Kopiert",
    statusTitle: "Anfrage verfolgen",
    statusIntro: "Referenz und privaten Schlüssel aus dem Beleg eingeben.",
    checkStatus: "Status prüfen",
    lastUpdated: "Zuletzt aktualisiert",
    next: "Nächster Schritt",
    activationTitle: "Freigegebenen Zugang aktivieren",
    activationIntro:
      "Diese Einladung ist einmalig, läuft automatisch ab und gilt nur für die freigegebene E-Mail.",
    credentialEmail: "Freigegebene E-Mail-Adresse",
    password: "Passwort erstellen",
    activate: "Sicheren Login erstellen & aktivieren",
    complete: "Aktivierung abschließen",
    confirmEmail:
      "E-Mail im Postfach bestätigen und danach über denselben Link zurückkehren.",
    providerMissing:
      "Authentifizierung ist in dieser Umgebung nicht konfiguriert. Die Freigabe bleibt sicher, aber Aktivierung ist hier nicht möglich.",
    identityProtectionUnavailable:
      "Die geschützte Identitätserfassung ist in dieser Umgebung nicht konfiguriert; die Anfrage wurde daher nicht gespeichert. Wenden Sie sich an die Standortverwaltung oder versuchen Sie es nach Freigabe der Schutzeinstellung erneut.",
    invalidActivationLink:
      "Aktivierungsgeheimnisse werden zu Ihrer Sicherheit nur aus dem privaten Einladungslink und nicht aus URL-Abfrageparametern angenommen. Fordern Sie bei Bedarf eine neue Einladung an.",
    activated: "Zugang aktiviert. Sie können sich anmelden.",
    login: "Zur Anmeldung",
    expired:
      "Aktivierung abgelaufen, widerrufen oder benutzt. Bitte neue Einladung anfordern.",
    error: "Aktion nicht abgeschlossen. Werte prüfen und erneut versuchen.",
    rateLimited:
      "Zu viele Versuche. Bitte warten Sie eine Weile, bevor Sie es erneut versuchen.",
    duplicate:
      "Eine Anfrage mit diesen Angaben existiert bereits. Verfolgen Sie Ihre bestehende Anfrage, statt eine neue zu erstellen.",
    notFound:
      "Wir konnten keine Anfrage zu dieser Referenz und diesem Schlüssel finden. Bitte prüfen Sie beide Werte auf Ihrem Beleg.",
    passwordHint: "Verwenden Sie mindestens 10 Zeichen.",
    roleLegend: "Rolle auswählen",
    privateNote:
      "Aktivierungs- und Tracking-Links privat halten. Der Support fragt nie nach Ihrem Passwort.",
    approvalTitle: "Menschliche Freigabe, exakter Umfang",
    approvalEvidence:
      "Nachweise und versionierte KVKK-Einwilligung werden protokolliert.",
    approvalDecision:
      "Ein Manager kann empfehlen; nur ein Administrator entscheidet.",
    approvalScope:
      "Die Einladung bindet die bestätigte E-Mail an genau eine freigegebene Einheit oder Standortgruppe.",
    statusSubmitted: "Eingereicht",
    statusUnderReview: "In Prüfung",
    statusApproved: "Freigegeben",
    statusRejected: "Abgelehnt",
    statusActivated: "Aktiviert",
    nextAwaitReview: "Menschliche Prüfung abwarten",
    nextUseActivation: "Private Aktivierungseinladung verwenden",
    nextContactManagement: "Standortverwaltung kontaktieren",
    nextSignIn: "Anmelden",
    activationPending: "Ausstehend",
    activationRedeemed: "Verwendet",
    activationRevoked: "Widerrufen",
    activationExpired: "Abgelaufen",
  },
  ru: {
    eyebrow: "Контролируемый доступ",
    title: "Запросить аккаунт 1Çatı",
    intro:
      "Укажите личность и нужную квартиру или рабочую область. До создания доступа администратор проверит подтверждения.",
    back: "Назад ко входу",
    track: "Проверить заявку",
    newRequest: "Новая заявка",
    owner: "Собственник",
    ownerDesc: "Доступ только к точно одобренной квартире.",
    tenant: "Арендатор",
    tenantDesc: "Доступ с ограничением по квартире и сроку.",
    staff: "Персонал",
    staffDesc: "Только одобренные рабочие объекты.",
    noPrivileged:
      "Роли менеджера, бухгалтера и администратора нельзя запросить публично.",
    fullName: "Имя и фамилия",
    email: "Эл. почта",
    phone: "Телефон (необязательно)",
    unit: "Заявленный блок / квартира",
    proofType: "Тип подтверждения",
    proofReference: "Номер документа или договора",
    invite: "Код приглашения собственника (необязательно)",
    position: "Должность / команда",
    idType: "Документ личности",
    idNumber: "Номер документа",
    country: "Страна выдачи",
    passport: "Паспорт",
    tc: "TC Kimlik",
    deed: "TAPU",
    contract: "Договор",
    reservation: "Номер брони / платежа",
    consent:
      "Я согласен на минимизированную и защищённую обработку указанных идентификационных и контактных данных по KVKK только для проверки заявки, привязки одобренной области и обязательного аудита. Точные сроки хранения и удаления применяются только после утверждения политики KVKK клиентом и юристами.",
    submit: "Отправить запрос",
    sending: "Безопасная отправка…",
    receiptTitle: "Заявка принята",
    receiptIntro:
      "Сохраните оба значения приватно. Одного номера недостаточно для просмотра статуса.",
    reference: "Номер заявки",
    receiptKey: "Приватный ключ отслеживания",
    copy: "Копировать",
    copied: "Скопировано",
    statusTitle: "Статус заявки",
    statusIntro: "Введите номер и приватный ключ из квитанции.",
    checkStatus: "Проверить статус",
    lastUpdated: "Обновлено",
    next: "Следующий шаг",
    activationTitle: "Активировать одобренный доступ",
    activationIntro:
      "Приглашение одноразовое, истекает автоматически и работает только с одобренной почтой.",
    credentialEmail: "Одобренная эл. почта",
    password: "Создайте пароль",
    activate: "Создать безопасный вход и активировать",
    complete: "Завершить активацию",
    confirmEmail:
      "Подтвердите письмо и вернитесь по этой же ссылке для завершения.",
    providerMissing:
      "Авторизация в этой среде не настроена. Одобрение сохранено безопасно, но активировать аккаунт здесь нельзя.",
    identityProtectionUnavailable:
      "Защищённый приём идентификационных данных в этой среде не настроен, поэтому заявка не была сохранена. Обратитесь в управляющую компанию или повторите после включения утверждённой защиты.",
    invalidActivationLink:
      "В целях безопасности секрет активации принимается только из приватной ссылки приглашения, а не из параметров URL. При необходимости запросите новое приглашение.",
    activated: "Доступ активирован. Теперь можно войти.",
    login: "Перейти ко входу",
    expired:
      "Активация истекла, отозвана или уже использована. Запросите новое приглашение.",
    error: "Операция не завершена. Проверьте данные и повторите.",
    rateLimited:
      "Слишком много попыток. Пожалуйста, подождите некоторое время и повторите.",
    duplicate:
      "Заявка с этими данными уже существует. Отслеживайте существующую заявку вместо создания новой.",
    notFound:
      "Мы не нашли заявку по этому номеру и ключу. Проверьте оба значения из вашей квитанции.",
    passwordHint: "Используйте не менее 10 символов.",
    roleLegend: "Выберите роль",
    privateNote:
      "Храните ссылки активации и статуса в тайне. Поддержка никогда не спрашивает пароль.",
    approvalTitle: "Ручное одобрение, точная область доступа",
    approvalEvidence: "Подтверждения и версия согласия KVKK фиксируются.",
    approvalDecision:
      "Менеджер может дать рекомендацию; решение принимает только администратор.",
    approvalScope:
      "Приглашение связывает подтверждённый адрес с одной одобренной квартирой или набором объектов.",
    statusSubmitted: "Отправлена",
    statusUnderReview: "На проверке",
    statusApproved: "Одобрена",
    statusRejected: "Отклонена",
    statusActivated: "Активирована",
    nextAwaitReview: "Ожидайте ручной проверки",
    nextUseActivation: "Используйте приватное приглашение для активации",
    nextContactManagement: "Свяжитесь с управляющей компанией",
    nextSignIn: "Войти",
    activationPending: "Ожидает",
    activationRedeemed: "Использована",
    activationRevoked: "Отозвана",
    activationExpired: "Истекла",
  },
} as const

const roleIcons: Record<PublicRegistrationRole, typeof UserRound> = {
  owner: UserRound,
  tenant: KeyRound,
  staff: Users,
}

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-background px-4 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
const labelClass = "grid gap-2 text-sm font-black text-card-foreground"
const activationStorageKey = "cati.registration-activation"

export default function SignupPage() {
  const locale = localeKey(useLocale())
  const t = copy[locale]
  const registrationStatusLabels: Record<
    RegistrationPublicStatus["status"],
    string
  > = {
    submitted: t.statusSubmitted,
    under_review: t.statusUnderReview,
    approved: t.statusApproved,
    rejected: t.statusRejected,
    activated: t.statusActivated,
  }
  const registrationNextStepLabels: Record<
    RegistrationPublicStatus["nextStep"],
    string
  > = {
    await_review: t.nextAwaitReview,
    use_activation_invitation: t.nextUseActivation,
    contact_management: t.nextContactManagement,
    sign_in: t.nextSignIn,
  }
  const activationStatusLabels: Record<
    RegistrationActivationStatus["status"],
    string
  > = {
    pending: t.activationPending,
    redeemed: t.activationRedeemed,
    revoked: t.activationRevoked,
    expired: t.activationExpired,
  }
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const submissionKey = useRef("")
  const [view, setView] = useState<View>("request")
  const [role, setRole] = useState<PublicRegistrationRole>("owner")
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    unitClaim: "",
    proofType: "deed",
    proofReference: "",
    inviteCode: "",
    position: "",
    idType: "tc_kimlik",
    idNumber: "",
    issuingCountry: "Türkiye",
  })
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [receipt, setReceipt] = useState({ reference: "", lookupToken: "" })
  const [publicStatus, setPublicStatus] =
    useState<RegistrationPublicStatus | null>(null)
  const [activation, setActivation] = useState<ActivationState>({
    reference: "",
    token: "",
    redemptionKey: "",
  })
  const [activationStatus, setActivationStatus] =
    useState<RegistrationActivationStatus | null>(null)
  const [credentialEmail, setCredentialEmail] = useState("")
  const [password, setPassword] = useState("")
  const [sessionReady, setSessionReady] = useState(false)
  const [activationMessage, setActivationMessage] = useState("")
  const [completed, setCompleted] = useState(false)
  const [copied, setCopied] = useState("")

  function field<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  useEffect(() => {
    const currentUrl = new URL(window.location.href)
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const queryContainsSecret =
      currentUrl.searchParams.has("reference") ||
      currentUrl.searchParams.has("activation")
    const fragmentReference = fragment.get("reference")?.trim() ?? ""
    const fragmentToken = fragment.get("activation")?.trim() ?? ""
    const fragmentContainsSecret =
      fragment.has("reference") || fragment.has("activation")
    const completeFragment = Boolean(fragmentReference && fragmentToken)
    let stored: ActivationState = {
      reference: "",
      token: "",
      redemptionKey: "",
    }
    try {
      const parsed = JSON.parse(
        window.sessionStorage.getItem(activationStorageKey) ?? "{}"
      ) as {
        reference?: unknown
        token?: unknown
        redemptionKey?: unknown
      }
      stored = {
        reference:
          typeof parsed.reference === "string" ? parsed.reference.trim() : "",
        token: typeof parsed.token === "string" ? parsed.token.trim() : "",
        redemptionKey:
          typeof parsed.redemptionKey === "string"
            ? parsed.redemptionKey.trim()
            : "",
      }
    } catch {
      window.sessionStorage.removeItem(activationStorageKey)
    }
    const reference = completeFragment ? fragmentReference : stored.reference
    const token = completeFragment ? fragmentToken : stored.token
    const redemptionKey = completeFragment
      ? crypto.randomUUID()
      : stored.redemptionKey || (reference && token ? crypto.randomUUID() : "")

    if (queryContainsSecret || (fragmentContainsSecret && !completeFragment)) {
      window.setTimeout(() => setError(t.invalidActivationLink), 0)
    }

    if (queryContainsSecret) {
      currentUrl.searchParams.delete("reference")
      currentUrl.searchParams.delete("activation")
    }
    if (fragmentContainsSecret) currentUrl.hash = ""
    if (queryContainsSecret || fragmentContainsSecret) {
      window.history.replaceState(
        window.history.state,
        "",
        `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`
      )
    }

    if (reference && token) {
      const nextActivation = { reference, token, redemptionKey }
      window.sessionStorage.setItem(
        activationStorageKey,
        JSON.stringify(nextActivation)
      )
      window.setTimeout(() => {
        setActivation(nextActivation)
        setView("activate")
      }, 0)
    }
    if (configured) {
      const supabase = createClient()
      void supabase.auth
        .getSession()
        .then(({ data }) => setSessionReady(Boolean(data.session)))
    }
  }, [configured, t.invalidActivationLink])

  useEffect(() => {
    if (!activation.reference || !activation.token) return
    let active = true
    void fetch("/api/site-management/registration", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "activation_status",
        reference: activation.reference,
        activationToken: activation.token,
      }),
    })
      .then(async (response) => {
        const payload = (await response.json()) as {
          activation?: RegistrationActivationStatus
        }
        if (!response.ok || !payload.activation) throw new Error(t.error)
        if (active) setActivationStatus(payload.activation)
      })
      .catch(() => {
        if (active) setError(t.error)
      })
    return () => {
      active = false
    }
  }, [activation, t.error])

  async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    if (!submissionKey.current) submissionKey.current = crypto.randomUUID()
    try {
      const response = await fetch("/api/site-management/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey.current,
        },
        body: JSON.stringify({
          role,
          fullName: form.fullName,
          email: form.email,
          phone: form.phone || null,
          language: locale,
          unitClaim: role === "staff" ? null : form.unitClaim,
          proofType: role === "staff" ? null : form.proofType,
          proofReference: role === "staff" ? null : form.proofReference,
          inviteCode: role === "tenant" ? form.inviteCode || null : null,
          position: role === "staff" ? form.position : null,
          idType: role === "staff" ? null : form.idType,
          idNumber: role === "staff" ? null : form.idNumber,
          issuingCountry: role === "staff" ? null : form.issuingCountry,
          consent,
          consentLocale: locale,
          source: "signup",
        }),
      })
      const payload = (await response.json()) as {
        reference?: string
        lookupToken?: string
        code?: string
      }
      if (!response.ok) {
        if (payload.code === "REGISTRATION_IDENTITY_PROTECTION_UNAVAILABLE") {
          setError(t.identityProtectionUnavailable)
        } else if (payload.code === "REGISTRATION_RATE_LIMITED" || response.status === 429) {
          setError(t.rateLimited)
        } else if (payload.code?.endsWith("_CONFLICT") || response.status === 409) {
          setError(t.duplicate)
        } else {
          setError(t.error)
        }
        return
      }
      if (!payload.reference || !payload.lookupToken) throw new Error(t.error)
      setReceipt({
        reference: payload.reference,
        lookupToken: payload.lookupToken,
      })
      setView("receipt")
      submissionKey.current = ""
    } catch {
      setError(t.error)
    } finally {
      setPending(false)
    }
  }

  async function trackRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    try {
      const response = await fetch("/api/site-management/registration", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          reference: receipt.reference,
          lookupToken: receipt.lookupToken,
        }),
      })
      const payload = (await response.json()) as {
        status?: RegistrationPublicStatus
        code?: string
      }
      if (!response.ok || !payload.status) {
        setError(
          payload.code === "REGISTRATION_NOT_FOUND" || response.status === 404
            ? t.notFound
            : t.error,
        )
        return
      }
      setPublicStatus(payload.status)
    } catch {
      setError(t.error)
    } finally {
      setPending(false)
    }
  }

  async function redeem() {
    const response = await fetch("/api/site-management/registration", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": activation.redemptionKey,
      },
      body: JSON.stringify({
        action: "activate",
        reference: activation.reference,
        activationToken: activation.token,
      }),
    })
    const payload = (await response.json()) as {
      activation?: { status?: string }
    }
    if (!response.ok || payload.activation?.status !== "activated")
      throw new Error(t.error)
    window.sessionStorage.removeItem(activationStorageKey)
    setCompleted(true)
    setActivationMessage(t.activated)
  }

  async function activateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError("")
    setActivationMessage("")
    try {
      if (!configured) throw new Error(t.providerMissing)
      const supabase = createClient()
      const { data: sessionData } = await supabase.auth.getSession()
      if (sessionData.session) {
        setSessionReady(true)
        await redeem()
        return
      }
      window.sessionStorage.setItem(
        activationStorageKey,
        JSON.stringify(activation)
      )
      const redirect = new URL(`/${locale}/signup`, window.location.origin)
      const { data, error: authError } = await supabase.auth.signUp({
        email: credentialEmail,
        password,
        options: {
          emailRedirectTo: redirect.toString(),
          data: {
            language: locale,
            source: "approved-registration-activation",
          },
        },
      })
      if (authError) throw authError
      if (data.session) {
        setSessionReady(true)
        await redeem()
      } else {
        setActivationMessage(t.confirmEmail)
      }
    } catch {
      setError(t.error)
    } finally {
      setPending(false)
    }
  }

  async function copyValue(name: string, value: string) {
    try {
      await navigator.clipboard?.writeText(value)
      setCopied(name)
      window.setTimeout(() => setCopied(""), 2000)
    } catch {
      // Clipboard is unavailable (insecure origin / in-app browser); the value stays
      // visible so the user can select and copy it by hand.
    }
  }

  const resident = role !== "staff"
  const activationUsable = activationStatus?.status === "pending"

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" className="flex items-center gap-3">
            <CatiLogoMark />
            <span className="text-sm font-black">Ataberk Estate</span>
          </Link>
          <LocaleSwitcher compact />
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:py-14">
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t.back}
            </Link>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setView("request")
                  setError("")
                }}
                className="rounded-lg px-3 py-2 text-xs font-black hover:bg-muted"
              >
                {t.newRequest}
              </button>
              <button
                type="button"
                onClick={() => {
                  setView("track")
                  setError("")
                }}
                className="rounded-lg px-3 py-2 text-xs font-black hover:bg-muted"
              >
                <Search className="mr-1 inline h-3.5 w-3.5" />
                {t.track}
              </button>
            </div>
          </div>
          <p className="mt-8 text-xs font-black tracking-[0.18em] text-primary uppercase">
            {t.eyebrow}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl leading-tight font-black sm:text-5xl">
            {view === "activate"
              ? t.activationTitle
              : view === "track"
                ? t.statusTitle
                : view === "receipt"
                  ? t.receiptTitle
                  : t.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {view === "activate"
              ? t.activationIntro
              : view === "track"
                ? t.statusIntro
                : view === "receipt"
                  ? t.receiptIntro
                  : t.intro}
          </p>

          {error && (
            <div
              className="mt-6 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {view === "request" && (
            <form
              onSubmit={submitRequest}
              className="mt-8 grid gap-5 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.04] sm:p-7"
            >
              <fieldset>
                <legend className="sr-only">{t.roleLegend}</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["owner", "tenant", "staff"] as const).map((item) => {
                    const Icon = roleIcons[item]
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setRole(item)}
                        aria-pressed={role === item}
                        className="rounded-2xl border border-border p-4 text-left transition hover:bg-muted/40 aria-pressed:border-primary aria-pressed:bg-primary/5"
                      >
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="mt-3 block text-sm font-black">
                          {t[item]}
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {t[`${item}Desc` as const]}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
              <p className="rounded-xl bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                {t.noPrivileged}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  {t.fullName}
                  <input
                    value={form.fullName}
                    onChange={(e) => field("fullName", e.target.value)}
                    required
                    maxLength={120}
                    autoComplete="name"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t.email}
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => field("email", e.target.value)}
                    required
                    maxLength={254}
                    autoComplete="email"
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t.phone}
                  <input
                    value={form.phone}
                    onChange={(e) => field("phone", e.target.value)}
                    maxLength={60}
                    autoComplete="tel"
                    className={inputClass}
                  />
                </label>
                {role === "staff" && (
                  <label className={labelClass}>
                    {t.position}
                    <input
                      value={form.position}
                      onChange={(e) => field("position", e.target.value)}
                      required
                      maxLength={120}
                      className={inputClass}
                    />
                  </label>
                )}
              </div>
              {resident && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      {t.unit}
                      <input
                        value={form.unitClaim}
                        onChange={(e) => field("unitClaim", e.target.value)}
                        required
                        maxLength={120}
                        placeholder="B3 / 12"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      {t.proofType}
                      <select
                        value={form.proofType}
                        onChange={(e) => field("proofType", e.target.value)}
                        className={inputClass}
                      >
                        <option value="deed">{t.deed}</option>
                        <option value="contract">{t.contract}</option>
                        <option value="reservation">{t.reservation}</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      {t.proofReference}
                      <input
                        value={form.proofReference}
                        onChange={(e) =>
                          field("proofReference", e.target.value)
                        }
                        required
                        maxLength={160}
                        className={inputClass}
                      />
                    </label>
                    {role === "tenant" && (
                      <label className={labelClass}>
                        {t.invite}
                        <input
                          value={form.inviteCode}
                          onChange={(e) => field("inviteCode", e.target.value)}
                          maxLength={256}
                          className={inputClass}
                        />
                      </label>
                    )}
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className={labelClass}>
                      {t.idType}
                      <select
                        value={form.idType}
                        onChange={(e) => field("idType", e.target.value)}
                        className={inputClass}
                      >
                        <option value="tc_kimlik">{t.tc}</option>
                        <option value="passport">{t.passport}</option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      {t.idNumber}
                      <input
                        value={form.idNumber}
                        onChange={(e) => field("idNumber", e.target.value)}
                        required
                        maxLength={60}
                        autoComplete="off"
                        className={inputClass}
                      />
                    </label>
                    <label className={labelClass}>
                      {t.country}
                      <input
                        value={form.issuingCountry}
                        onChange={(e) =>
                          field("issuingCountry", e.target.value)
                        }
                        maxLength={80}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </>
              )}
              <label className="flex items-start gap-3 rounded-xl border border-border p-4 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4"
                />
                <span>{t.consent}</span>
              </label>
              <button
                type="submit"
                disabled={pending || !consent}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-black text-primary-foreground shadow-lg shadow-primary/20 disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {pending ? t.sending : t.submit}
              </button>
            </form>
          )}

          {view === "receipt" && (
            <div className="mt-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/5 p-6">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              {(["reference", "lookupToken"] as const).map((key) => (
                <div key={key} className="mt-5">
                  <p className="text-xs font-black tracking-wide text-muted-foreground uppercase">
                    {key === "reference" ? t.reference : t.receiptKey}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-background p-3 text-sm">
                      {receipt[key]}
                    </code>
                    <button
                      type="button"
                      onClick={() => void copyValue(key, receipt[key])}
                      className="inline-flex items-center gap-2 rounded-xl border border-border px-3 text-xs font-black"
                    >
                      <Clipboard className="h-4 w-4" />
                      {copied === key ? t.copied : t.copy}
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setView("track")}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-foreground px-4 text-sm font-black text-background"
              >
                <Search className="h-4 w-4" />
                {t.track}
              </button>
            </div>
          )}

          {view === "track" && (
            <form
              onSubmit={trackRequest}
              className="mt-8 grid gap-4 rounded-3xl border border-border bg-card p-6"
            >
              <label className={labelClass}>
                {t.reference}
                <input
                  value={receipt.reference}
                  onChange={(e) =>
                    setReceipt((current) => ({
                      ...current,
                      reference: e.target.value,
                    }))
                  }
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {t.receiptKey}
                <input
                  value={receipt.lookupToken}
                  onChange={(e) =>
                    setReceipt((current) => ({
                      ...current,
                      lookupToken: e.target.value,
                    }))
                  }
                  required
                  autoComplete="off"
                  className={inputClass}
                />
              </label>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-black text-primary-foreground disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                {t.checkStatus}
              </button>
              {publicStatus && (
                <div
                  className="rounded-2xl border border-border bg-muted/30 p-4"
                  role="status"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                      {registrationStatusLabels[publicStatus.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      v{publicStatus.workflowVersion}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    <strong>{t.next}:</strong>{" "}
                    {registrationNextStepLabels[publicStatus.nextStep]}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.lastUpdated}:{" "}
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(publicStatus.lastUpdatedAt))}
                  </p>
                </div>
              )}
            </form>
          )}

          {view === "activate" && (
            <div className="mt-8 rounded-3xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-center gap-3">
                <KeyRound className="h-6 w-6 text-primary" />
                <code className="text-sm">{activation.reference}</code>
                {activationStatus && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-black text-primary">
                    {activationStatusLabels[activationStatus.status]}
                  </span>
                )}
              </div>
              {activationStatus && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {activationStatus.emailMasked} ·{" "}
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(activationStatus.expiresAt))}
                </p>
              )}
              {!configured && (
                <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-900">
                  {t.providerMissing}
                </p>
              )}
              {activationUsable && !completed ? (
                <form onSubmit={activateAccount} className="mt-5 grid gap-4">
                  <label className={labelClass}>
                    {t.credentialEmail}
                    <input
                      type="email"
                      value={credentialEmail}
                      onChange={(e) => setCredentialEmail(e.target.value)}
                      required={!sessionReady}
                      disabled={sessionReady}
                      autoComplete="email"
                      className={inputClass}
                    />
                  </label>
                  {!sessionReady && (
                    <label className={labelClass}>
                      {t.password}
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={10}
                        autoComplete="new-password"
                        aria-describedby="signup-password-hint"
                        className={inputClass}
                      />
                      <span id="signup-password-hint" className="text-xs font-normal text-muted-foreground">
                        {t.passwordHint}
                      </span>
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={pending || !configured}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-black text-primary-foreground disabled:opacity-60"
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    {sessionReady ? t.complete : t.activate}
                  </button>
                </form>
              ) : activationStatus && !completed ? (
                <p className="mt-5 rounded-xl bg-muted p-4 text-sm">
                  {t.expired}
                </p>
              ) : null}
              {activationMessage && (
                <div
                  className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-800"
                  role="status"
                >
                  {activationMessage}
                </div>
              )}
              {completed && (
                <Link
                  href="/login"
                  className="mt-5 inline-flex h-11 items-center rounded-xl bg-foreground px-4 text-sm font-black text-background"
                >
                  {t.login}
                </Link>
              )}
            </div>
          )}
        </section>
        <aside className="h-fit rounded-3xl border border-border bg-muted/30 p-6 lg:sticky lg:top-8">
          <Clock3 className="h-7 w-7 text-primary" />
          <h2 className="mt-4 text-lg font-black">{t.approvalTitle}</h2>
          <ol className="mt-4 grid gap-4 text-sm leading-6 text-muted-foreground">
            <li>
              <strong className="text-foreground">1.</strong>{" "}
              {t.approvalEvidence}
            </li>
            <li>
              <strong className="text-foreground">2.</strong>{" "}
              {t.approvalDecision}
            </li>
            <li>
              <strong className="text-foreground">3.</strong> {t.approvalScope}
            </li>
          </ol>
          <p className="mt-6 flex items-start gap-2 rounded-xl bg-background p-3 text-xs leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            {t.privateNote}
          </p>
        </aside>
      </div>
    </main>
  )
}
