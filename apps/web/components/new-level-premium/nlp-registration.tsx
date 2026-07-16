"use client"

import { useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
  UserCog,
  UserRound,
  Users,
} from "lucide-react"

type LocaleKey = "tr" | "en" | "de" | "ru"
type PublicRole = "owner" | "tenant" | "staff"

function resolveLocale(value: string): LocaleKey {
  return (["tr", "en", "de", "ru"] as const).includes(value as LocaleKey)
    ? (value as LocaleKey)
    : "tr"
}

const copy = {
  tr: {
    eyebrow: "Erişim kaydı",
    title: "1Çatı hesabınızı buradan başlatın",
    intro:
      "Rolünüzü seçin ve talebinizi gönderin. Meşruiyet kontrolünden sonra erişimi bir yönetici açar. Hiçbir hesap kendiliğinden aktifleşmez.",
    roles: {
      owner: {
        label: "Malik",
        desc: "Doğrulanmış daireniz için hizmetlere, rezervasyonlara, yetkili belgelere ve yönetimle iletişime erişim talep edin.",
      },
      tenant: {
        label: "Kiracı",
        desc: "Malikinizin zaman sınırlı davetiyle erişin.",
      },
      staff: {
        label: "Personel",
        desc: "Ekip erişimi talebi (yönetici onaylı).",
      },
    },
    internalNote:
      "Sorumlu, Muhasebe ve Yönetim rolleri bu genel formdan talep edilemez. Bunları yalnızca mevcut bir yönetici sistem içinden atar.",
    fields: {
      fullName: "Ad soyad",
      email: "E-posta",
      phone: "Telefon (opsiyonel)",
      language: "Tercih edilen dil",
      unit: "Blok ve daire (ör. B3 / 12)",
      proofType: "Kanıt türü",
      proofReference: "Kanıt referansı (TAPU no / sözleşme / rezervasyon no)",
      inviteCode: "Malik davet kodu",
      position: "Pozisyon / ekip",
      staffReference: "Davet eden yönetici / personel referansı",
      idType: "Kimlik türü",
      idNumber: "Kimlik / pasaport numarası",
      issuingCountry: "Veren ülke",
    },
    idOptions: { tc_kimlik: "T.C. Kimlik", passport: "Pasaport" },
    kbsNotice:
      "Bu genel başvuruda inceleme için gereken kimlik bilgileri en aza indirilir ve korunur; ham kimlik belgesi veya selfie yüklemesi kabul edilmez. Kesin saklama ve silme süresi, müşteri ve hukuk tarafından onaylanmış KVKK politikası kesinleştiğinde uygulanacaktır.",
    inviteRecommended: "Önerilen",
    idVerify: {
      review: "Manuel incelemeye alındı",
      hint: "Canlı kimlik sağlayıcısı henüz bağlı değil; korunan kimlik özeti, kanıt referansı ve daire iddiası yönetici tarafından manuel incelenir.",
    },
    proofOptions: {
      tapu: "TAPU (tapu senedi)",
      sales_contract: "Satış sözleşmesi",
      reservation_ref: "Rezervasyon / ödeme referansı",
    },
    ownerHint:
      "Yönetici, korunan kimlik özetinizi ve daire iddianızı satış kaydıyla manuel karşılaştırır. Kapsam onayı kanıt referansına ve ilişki kontrolüne dayanır; otomatik sağlayıcı sonucu üretilmez.",
    tenantHint:
      "En iyi yol, malikinizin panelinden ürettiği tek kullanımlık davet kodudur. Bu kod, doğrulanmış bir malikin kendi dairesi için size kefil olduğu anlamına gelir. Erişim malikin seçtiği süreyle sınırlıdır ve süre dolunca kendiliğinden kapanır. Sorumluluğu tüm kira boyunca malik taşır.",
    staffHint:
      "Personel hesapları her zaman yönetici onayıyla açılır. Servis ve saha verisine dokundukları için otomatik verilmez.",
    consent:
      "Kişisel verilerimin bu talebin değerlendirilmesi için KVKK kapsamında işlenmesini onaylıyorum.",
    submit: "Erişim talebini gönder",
    pending: "Gönderiliyor...",
    successTitle: "Talep alındı",
    successBody:
      "Referans numaranız: {ref}. Meşruiyet kontrolünden sonra bir yönetici erişiminizi açacaktır.",
    trackingKey: "Özel takip anahtarı",
    another: "Yeni talep gönder",
    error: "Talep gönderilemedi. Bilgileri kontrol edip tekrar deneyin.",
  },
  en: {
    eyebrow: "Register for access",
    title: "Start your 1Çatı account here",
    intro:
      "Pick your role and send the request. After a legitimacy check, an administrator opens your access. No account is ever activated on its own.",
    roles: {
      owner: {
        label: "Owner",
        desc: "Request access to services, reservations, authorized documents, and communications with management for your verified unit.",
      },
      tenant: {
        label: "Tenant",
        desc: "Enter with your owner's time-limited invite.",
      },
      staff: { label: "Staff", desc: "Team access request (admin-approved)." },
    },
    internalNote:
      "Manager, Accounting and Admin roles cannot be requested on this public form. Only an existing administrator assigns them from inside the system.",
    fields: {
      fullName: "Full name",
      email: "Email",
      phone: "Phone (optional)",
      language: "Preferred language",
      unit: "Block and unit (e.g. B3 / 12)",
      proofType: "Proof type",
      proofReference: "Proof reference (TAPU no / contract / reservation no)",
      inviteCode: "Owner invite code",
      position: "Position / team",
      staffReference: "Inviting manager / employee reference",
      idType: "Identity document",
      idNumber: "ID / passport number",
      issuingCountry: "Issuing country",
    },
    idOptions: { tc_kimlik: "TC Kimlik", passport: "Passport" },
    kbsNotice:
      "This public intake minimizes and protects the identity details needed for review; it does not accept raw ID-document or selfie uploads. The exact retention and deletion period will be applied only after the client and legal team approve the KVKK policy.",
    inviteRecommended: "Recommended",
    idVerify: {
      review: "Sent to manual review",
      hint: "A live identity provider is not connected; an administrator manually reviews the protected identity summary, evidence reference and unit claim.",
    },
    proofOptions: {
      tapu: "TAPU (title deed)",
      sales_contract: "Sales contract",
      reservation_ref: "Reservation / payment reference",
    },
    ownerHint:
      "An administrator manually compares the protected identity summary and unit claim with the sales record. Scope approval relies on the evidence reference and relationship review; no automatic provider result is produced.",
    tenantHint:
      "The best route is a one-time invite code your owner creates from their dashboard. The code means a verified owner vouches for you on their own unit. Access lasts only for the window the owner sets and closes on its own. The owner carries responsibility for the whole rental period.",
    staffHint:
      "Staff accounts are always opened with admin approval. They touch service and field data, so they are never provisioned automatically.",
    consent:
      "I consent to my personal data being processed under KVKK to evaluate this request.",
    submit: "Send access request",
    pending: "Submitting...",
    successTitle: "Request received",
    successBody:
      "Your reference number: {ref}. After a legitimacy check, an administrator will open your access.",
    trackingKey: "Private tracking key",
    another: "Send another request",
    error: "Request could not be sent. Check the details and try again.",
  },
  de: {
    eyebrow: "Für Zugang registrieren",
    title: "Starten Sie Ihr 1Çatı-Konto hier",
    intro:
      "Rolle wählen und Anfrage senden. Nach einer Legitimitätsprüfung öffnet ein Administrator Ihren Zugang. Kein Konto wird von allein aktiviert.",
    roles: {
      owner: {
        label: "Eigentümer",
        desc: "Beantragen Sie für Ihre verifizierte Einheit Zugriff auf Dienstleistungen, Reservierungen, freigegebene Dokumente und die Kommunikation mit der Verwaltung.",
      },
      tenant: {
        label: "Mieter",
        desc: "Mit der zeitlich begrenzten Einladung Ihres Eigentümers.",
      },
      staff: {
        label: "Mitarbeiter",
        desc: "Team-Zugangsanfrage (Admin-Freigabe).",
      },
    },
    internalNote:
      "Manager-, Buchhaltungs- und Admin-Rollen lassen sich über dieses öffentliche Formular nicht anfragen. Sie vergibt nur ein bestehender Administrator im System.",
    fields: {
      fullName: "Name",
      email: "E-Mail",
      phone: "Telefon (optional)",
      language: "Bevorzugte Sprache",
      unit: "Block und Einheit (z. B. B3 / 12)",
      proofType: "Nachweisart",
      proofReference:
        "Nachweisreferenz (TAPU-Nr. / Vertrag / Reservierungs-Nr.)",
      inviteCode: "Eigentümer-Einladungscode",
      position: "Position / Team",
      staffReference: "Einladender Manager / Mitarbeiterreferenz",
      idType: "Ausweisart",
      idNumber: "Ausweis- / Passnummer",
      issuingCountry: "Ausstellungsland",
    },
    idOptions: { tc_kimlik: "TC Kimlik", passport: "Reisepass" },
    kbsNotice:
      "Diese öffentliche Erfassung minimiert und schützt die für die Prüfung nötigen Identitätsangaben; Uploads roher Ausweisdokumente oder Selfies werden nicht angenommen. Die genaue Aufbewahrungs- und Löschfrist wird erst nach Freigabe der KVKK-Richtlinie durch den Kunden und die Rechtsberatung festgelegt und angewandt.",
    inviteRecommended: "Empfohlen",
    idVerify: {
      review: "Zur manuellen Prüfung",
      hint: "Ein Live-Identitätsanbieter ist nicht verbunden; ein Administrator prüft die geschützte Identitätszusammenfassung, Nachweisreferenz und beanspruchte Einheit manuell.",
    },
    proofOptions: {
      tapu: "TAPU (Grundbuchtitel)",
      sales_contract: "Kaufvertrag",
      reservation_ref: "Reservierungs-/Zahlungsreferenz",
    },
    ownerHint:
      "Ein Administrator gleicht die geschützte Identitätszusammenfassung und den Einheitenanspruch manuell mit dem Verkaufsdatensatz ab. Die Bereichsfreigabe stützt sich auf Nachweisreferenz und Beziehungsprüfung; es entsteht kein automatisches Anbieterergebnis.",
    tenantHint:
      "Am besten nutzen Sie einen Einmal-Einladungscode, den Ihr Eigentümer im Dashboard erzeugt. Der Code bedeutet, dass ein verifizierter Eigentümer für Sie auf seiner eigenen Einheit bürgt. Der Zugang gilt nur für das vom Eigentümer gewählte Fenster und läuft von selbst ab. Die Verantwortung trägt der Eigentümer für die gesamte Mietzeit.",
    staffHint:
      "Mitarbeiterkonten werden immer per Admin-Freigabe geöffnet. Sie berühren Service- und Felddaten und werden deshalb nie automatisch bereitgestellt.",
    consent:
      "Ich willige ein, dass meine personenbezogenen Daten gemäß KVKK zur Prüfung dieser Anfrage verarbeitet werden.",
    submit: "Zugangsanfrage senden",
    pending: "Wird gesendet...",
    successTitle: "Anfrage erhalten",
    successBody:
      "Ihre Referenznummer: {ref}. Nach einer Legitimitätsprüfung öffnet ein Administrator Ihren Zugang.",
    trackingKey: "Privater Tracking-Schlüssel",
    another: "Weitere Anfrage senden",
    error:
      "Anfrage konnte nicht gesendet werden. Angaben prüfen und erneut versuchen.",
  },
  ru: {
    eyebrow: "Регистрация доступа",
    title: "Начните аккаунт 1Çatı здесь",
    intro:
      "Выберите роль и отправьте заявку. После проверки легитимности доступ открывает администратор. Ни один аккаунт не активируется сам.",
    roles: {
      owner: {
        label: "Собственник",
        desc: "Запросите доступ к услугам, бронированиям, разрешённым документам и переписке с управляющей компанией по подтверждённой квартире.",
      },
      tenant: {
        label: "Арендатор",
        desc: "Вход по ограниченному по времени приглашению собственника.",
      },
      staff: {
        label: "Персонал",
        desc: "Запрос доступа для команды (одобрение админа).",
      },
    },
    internalNote:
      "Роли «Менеджер», «Бухгалтерия» и «Администратор» нельзя запросить через эту публичную форму. Их назначает только действующий администратор внутри системы.",
    fields: {
      fullName: "Имя и фамилия",
      email: "Эл. почта",
      phone: "Телефон (необязательно)",
      language: "Предпочитаемый язык",
      unit: "Блок и квартира (напр. B3 / 12)",
      proofType: "Тип подтверждения",
      proofReference: "Ссылка подтверждения (№ TAPU / договор / № брони)",
      inviteCode: "Код приглашения собственника",
      position: "Должность / команда",
      staffReference: "Пригласивший менеджер / ссылка сотрудника",
      idType: "Документ, удостоверяющий личность",
      idNumber: "Номер удостоверения / паспорта",
      issuingCountry: "Страна выдачи",
    },
    idOptions: { tc_kimlik: "TC Kimlik", passport: "Паспорт" },
    kbsNotice:
      "В этой публичной заявке необходимые для проверки идентификационные данные минимизируются и защищаются; загрузка исходных документов и селфи не принимается. Точный срок хранения и удаления будет установлен и применён только после утверждения политики KVKK клиентом и юристами.",
    inviteRecommended: "Рекомендуется",
    idVerify: {
      review: "Отправлено на ручную проверку",
      hint: "Провайдер проверки личности не подключён; администратор вручную проверяет защищённую сводку личности, ссылку на подтверждение и заявленную квартиру.",
    },
    proofOptions: {
      tapu: "TAPU (свидетельство о собственности)",
      sales_contract: "Договор купли-продажи",
      reservation_ref: "Ссылка брони / платежа",
    },
    ownerHint:
      "Администратор вручную сверяет защищённую сводку личности и заявку на квартиру с записью о продаже. Область доступа одобряется по ссылке на подтверждение и проверке связи; автоматический результат провайдера не создаётся.",
    tenantHint:
      "Лучше всего использовать одноразовый код приглашения, который собственник создаёт в своём кабинете. Код означает, что проверенный собственник ручается за вас по своей квартире. Доступ действует только в выбранный собственником период и закрывается сам. Ответственность собственник несёт весь срок аренды.",
    staffHint:
      "Аккаунты персонала всегда открываются с одобрения администратора. Они касаются сервисных и полевых данных, поэтому автоматически не выдаются.",
    consent:
      "Я согласен на обработку моих персональных данных в соответствии с KVKK для рассмотрения этой заявки.",
    submit: "Отправить запрос доступа",
    pending: "Отправка...",
    successTitle: "Заявка получена",
    successBody:
      "Ваш номер обращения: {ref}. После проверки легитимности администратор откроет доступ.",
    trackingKey: "Приватный ключ отслеживания",
    another: "Отправить ещё заявку",
    error: "Не удалось отправить заявку. Проверьте данные и попробуйте снова.",
  },
} satisfies Record<LocaleKey, unknown>

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
const labelClass = "grid gap-2 text-sm font-bold text-card-foreground"

const roleIcon: Record<PublicRole, typeof UserRound> = {
  owner: UserRound,
  tenant: KeyRound,
  staff: Users,
}

function IdentityFields({
  form,
  update,
  t,
}: {
  form: {
    idType: string
    idNumber: string
    issuingCountry: string
  }
  update: (key: "idType" | "idNumber" | "issuingCountry", value: string) => void
  t: {
    fields: { idType: string; idNumber: string; issuingCountry: string }
    idOptions: { tc_kimlik: string; passport: string }
    kbsNotice: string
    idVerify: {
      review: string
      hint: string
    }
  }
}) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className={labelClass}>
          {t.fields.idType}
          <select
            value={form.idType}
            onChange={(e) => update("idType", e.target.value)}
            className={inputClass}
          >
            <option value="tc_kimlik">{t.idOptions.tc_kimlik}</option>
            <option value="passport">{t.idOptions.passport}</option>
          </select>
        </label>
        <label className={labelClass}>
          {t.fields.idNumber}
          <input
            value={form.idNumber}
            onChange={(e) => update("idNumber", e.target.value)}
            required
            maxLength={60}
            className={inputClass}
          />
        </label>
        <label className={labelClass}>
          {t.fields.issuingCountry}
          <input
            value={form.issuingCountry}
            onChange={(e) => update("issuingCountry", e.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </label>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-6 font-bold text-amber-900">
        <AlertCircle className="mt-1 h-4 w-4 shrink-0" />
        <span>
          {t.idVerify.review}. {t.idVerify.hint}
        </span>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 p-3 text-xs leading-6 text-foreground/75">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        {t.kbsNotice}
      </p>
    </>
  )
}

export function NlpRegistration() {
  const locale = resolveLocale(useLocale())
  const t = copy[locale] as (typeof copy)["tr"]

  const [role, setRole] = useState<PublicRole>("owner")
  const emptyForm = {
    fullName: "",
    email: "",
    phone: "",
    unit: "",
    proofType: "tapu",
    proofReference: "",
    inviteCode: "",
    position: "",
    staffReference: "",
    idType: "tc_kimlik",
    idNumber: "",
    issuingCountry: "Türkiye",
  }
  const [form, setForm] = useState(emptyForm)
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [reference, setReference] = useState("")
  const [lookupToken, setLookupToken] = useState("")
  const submissionKey = useRef("")

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus("idle")

    const payload: Record<string, unknown> = {
      role,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone || null,
      language: locale,
      consent,
      source: "new-level-premium",
    }
    if (role === "owner") {
      payload.unitClaim = form.unit || null
      payload.proofType = form.proofType
      payload.proofReference = form.proofReference || null
      payload.idType = form.idType
      payload.idNumber = form.idNumber || null
      payload.issuingCountry = form.issuingCountry || null
    } else if (role === "tenant") {
      payload.unitClaim = form.unit || null
      payload.inviteCode = form.inviteCode || null
      payload.idType = form.idType
      payload.idNumber = form.idNumber || null
      payload.issuingCountry = form.issuingCountry || null
      payload.proofReference = form.proofReference || null
    } else {
      payload.position = form.position || null
      payload.proofReference = form.staffReference || null
    }

    try {
      const response = await fetch("/api/site-management/registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key":
            submissionKey.current ||
            (submissionKey.current = crypto.randomUUID()),
        },
        body: JSON.stringify(payload),
      })
      const data = (await response.json()) as {
        reference?: string
        lookupToken?: string
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? "failed")
      setReference(data.reference ?? "-")
      setLookupToken(data.lookupToken ?? "-")
      submissionKey.current = ""
      setStatus("success")
    } catch {
      setStatus("error")
    } finally {
      setPending(false)
    }
  }

  const roleHint =
    role === "owner"
      ? t.ownerHint
      : role === "tenant"
        ? t.tenantHint
        : t.staffHint

  return (
    <section
      id="register"
      className="scroll-mt-20 bg-background py-16 md:py-24"
    >
      <div className="container max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.eyebrow}
        </span>
        <h2 className="mt-5 text-3xl leading-tight font-black text-foreground md:text-4xl">
          {t.title}
        </h2>
        <p className="mt-4 text-base leading-8 text-muted-foreground">
          {t.intro}
        </p>

        {status === "success" ? (
          <div
            className="mt-8 rounded-3xl border border-emerald-500/25 bg-emerald-500/10 p-6"
            role="status"
          >
            <div className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-lg font-black">{t.successTitle}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-emerald-900/80">
              {t.successBody.replace("{ref}", reference)}
            </p>
            <p className="mt-4 text-xs font-black tracking-wide text-emerald-800 uppercase">
              {t.trackingKey}
            </p>
            <code className="mt-2 block overflow-x-auto rounded-xl bg-white p-3 text-xs text-emerald-950">
              {lookupToken}
            </code>
            <button
              type="button"
              onClick={() => {
                setStatus("idle")
                setConsent(false)
                setForm(emptyForm)
                setLookupToken("")
              }}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-emerald-600/30 bg-white px-5 text-sm font-black text-emerald-700 transition hover:bg-emerald-50"
            >
              {t.another}
            </button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {(["owner", "tenant", "staff"] as const).map((item) => {
                const Icon = roleIcon[item]
                const active = role === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setRole(item)}
                    aria-pressed={active}
                    className={
                      "rounded-2xl border p-4 text-left transition " +
                      (active
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-card hover:border-primary/40")
                    }
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="mt-3 text-base font-black text-card-foreground">
                      {t.roles[item].label}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">
                      {t.roles[item].desc}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-5 text-muted-foreground">
              <Lock className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="flex items-center gap-1">
                <UserCog className="h-3.5 w-3.5" />
                {t.internalNote}
              </span>
            </div>

            <form
              onSubmit={submit}
              className="mt-5 grid gap-4 rounded-3xl border border-border bg-card p-5 shadow-xl shadow-black/[0.05] sm:p-6"
            >
              <p className="rounded-xl bg-primary/5 p-3 text-xs leading-6 text-foreground/80">
                {roleHint}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelClass}>
                  {t.fields.fullName}
                  <input
                    value={form.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    required
                    maxLength={120}
                    className={inputClass}
                  />
                </label>
                <label className={labelClass}>
                  {t.fields.email}
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => update("email", e.target.value)}
                    required
                    maxLength={160}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className={labelClass}>
                {t.fields.phone}
                <input
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  maxLength={60}
                  className={inputClass}
                />
              </label>

              {role === "owner" && (
                <>
                  <label className={labelClass}>
                    {t.fields.unit}
                    <input
                      value={form.unit}
                      onChange={(e) => update("unit", e.target.value)}
                      maxLength={80}
                      className={inputClass}
                    />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className={labelClass}>
                      {t.fields.proofType}
                      <select
                        value={form.proofType}
                        onChange={(e) => update("proofType", e.target.value)}
                        className={inputClass}
                      >
                        <option value="tapu">{t.proofOptions.tapu}</option>
                        <option value="sales_contract">
                          {t.proofOptions.sales_contract}
                        </option>
                        <option value="reservation_ref">
                          {t.proofOptions.reservation_ref}
                        </option>
                      </select>
                    </label>
                    <label className={labelClass}>
                      {t.fields.proofReference}
                      <input
                        value={form.proofReference}
                        onChange={(e) =>
                          update("proofReference", e.target.value)
                        }
                        maxLength={120}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <IdentityFields form={form} update={update} t={t} />
                </>
              )}

              {role === "tenant" && (
                <>
                  <label className={labelClass}>
                    <span className="flex items-center gap-2">
                      {t.fields.inviteCode}
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black tracking-wide text-primary uppercase">
                        {t.inviteRecommended}
                      </span>
                    </span>
                    <input
                      value={form.inviteCode}
                      onChange={(e) => update("inviteCode", e.target.value)}
                      maxLength={60}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    {t.fields.unit}
                    <input
                      value={form.unit}
                      onChange={(e) => update("unit", e.target.value)}
                      maxLength={80}
                      className={inputClass}
                    />
                  </label>
                  <IdentityFields form={form} update={update} t={t} />
                </>
              )}

              {role === "staff" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className={labelClass}>
                    {t.fields.position}
                    <input
                      value={form.position}
                      onChange={(e) => update("position", e.target.value)}
                      maxLength={80}
                      className={inputClass}
                    />
                  </label>
                  <label className={labelClass}>
                    {t.fields.staffReference}
                    <input
                      value={form.staffReference}
                      onChange={(e) => update("staffReference", e.target.value)}
                      maxLength={120}
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              <label className="flex items-start gap-3 text-sm leading-6 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  required
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary/30"
                />
                <span>{t.consent}</span>
              </label>

              {status === "error" && (
                <div
                  className="flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t.error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={pending || !consent}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-black text-primary-foreground shadow-xl shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {pending ? t.pending : t.submit}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
