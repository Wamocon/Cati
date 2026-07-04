"use client"

import { useState } from "react"
import { useLocale } from "next-intl"
import { AlertCircle, CheckCircle2, Loader2, Megaphone, QrCode, Send } from "lucide-react"

type LocaleKey = "tr" | "en" | "de" | "ru"

function resolveLocale(value: string): LocaleKey {
  return (["tr", "en", "de", "ru"] as const).includes(value as LocaleKey)
    ? (value as LocaleKey)
    : "tr"
}

const categories = ["cleaning", "technical", "security", "landscaping", "amenity", "noise", "other"] as const

const copy = {
  tr: {
    eyebrow: "Bildirim kanalı",
    title: "Bir sorunu bildirin, hesaba gerek yok",
    intro:
      "Malik, kiracı, misafir, ziyaretçi ya da tedarikçi. Sahadaki herkes hesap açmadan bir gözlemi bildirebilir. Her bildirim doğrulanmamış olarak triyaj kuyruğuna düşer ve çözüme kadar takip edilir.",
    posterLink: "Sahada kullanmak için QR poster",
    categoryLabels: {
      cleaning: "Temizlik",
      technical: "Teknik / arıza",
      security: "Güvenlik",
      landscaping: "Peyzaj / bahçe",
      amenity: "Sosyal alan",
      noise: "Gürültü",
      other: "Diğer",
    },
    fields: {
      category: "Konu",
      zone: "Konum (ör. B blok lobi, havuz, otopark)",
      description: "Kısa açıklama",
      contact: "Geri dönüş için e-posta/telefon (opsiyonel)",
    },
    consent: "Bildirimimin değerlendirilmesi için verdiğim bilgilerin işlenmesini onaylıyorum.",
    submit: "Bildirimi gönder",
    pending: "Gönderiliyor...",
    successTitle: "Bildirim alındı",
    successBody: "Referans: {ref}. Ekip bildirimi triyaj eder, gerekirse iş emrine dönüştürür.",
    another: "Yeni bildirim",
    error: "Bildirim gönderilemedi. Lütfen tekrar deneyin.",
  },
  en: {
    eyebrow: "Report channel",
    title: "Report an issue, no account needed",
    intro:
      "Owners, tenants, guests, visitors and contractors can report something without an account. Anyone on the grounds can flag what they see. Every report lands as unverified in the triage queue and is tracked to resolution.",
    posterLink: "On-site QR poster",
    categoryLabels: {
      cleaning: "Cleaning",
      technical: "Technical / fault",
      security: "Security",
      landscaping: "Landscaping / garden",
      amenity: "Amenity",
      noise: "Noise",
      other: "Other",
    },
    fields: {
      category: "Topic",
      zone: "Location (e.g. Block B lobby, pool, parking)",
      description: "Short description",
      contact: "Email/phone for follow-up (optional)",
    },
    consent: "I agree that the details I provide may be processed to handle this report.",
    submit: "Send report",
    pending: "Submitting...",
    successTitle: "Report received",
    successBody: "Reference: {ref}. The team triages the report and turns it into a work order if needed.",
    another: "New report",
    error: "The report could not be sent. Please try again.",
  },
  de: {
    eyebrow: "Meldekanal",
    title: "Ein Anliegen melden, ohne Konto",
    intro:
      "Eigentümer, Mieter, Gäste, Besucher und Dienstleister können etwas melden, ganz ohne Konto. Jeder auf dem Gelände kann eine Beobachtung weitergeben. Jede Meldung landet unverifiziert in der Triage und wird bis zur Lösung verfolgt.",
    posterLink: "Vor-Ort-QR-Poster",
    categoryLabels: {
      cleaning: "Reinigung",
      technical: "Technik / Störung",
      security: "Sicherheit",
      landscaping: "Grünflächen / Garten",
      amenity: "Gemeinschaftsfläche",
      noise: "Lärm",
      other: "Sonstiges",
    },
    fields: {
      category: "Thema",
      zone: "Ort (z. B. Block B Lobby, Pool, Parkplatz)",
      description: "Kurze Beschreibung",
      contact: "E-Mail/Telefon für Rückmeldung (optional)",
    },
    consent: "Ich bin einverstanden, dass meine Angaben zur Bearbeitung dieser Meldung verarbeitet werden.",
    submit: "Meldung senden",
    pending: "Wird gesendet...",
    successTitle: "Meldung erhalten",
    successBody: "Referenz: {ref}. Das Team prüft die Meldung und macht bei Bedarf einen Arbeitsauftrag daraus.",
    another: "Neue Meldung",
    error: "Die Meldung konnte nicht gesendet werden. Bitte erneut versuchen.",
  },
  ru: {
    eyebrow: "Канал сообщений",
    title: "Сообщить о проблеме, без аккаунта",
    intro:
      "Собственники, арендаторы, гости, посетители и подрядчики могут сообщить о наблюдении без аккаунта. Любой на территории может рассказать о том, что заметил. Каждое сообщение попадает в очередь триажа как непроверенное и отслеживается до решения.",
    posterLink: "QR-плакат для объекта",
    categoryLabels: {
      cleaning: "Уборка",
      technical: "Техника / неисправность",
      security: "Безопасность",
      landscaping: "Ландшафт / сад",
      amenity: "Общая зона",
      noise: "Шум",
      other: "Другое",
    },
    fields: {
      category: "Тема",
      zone: "Место (напр. лобби блока B, бассейн, парковка)",
      description: "Краткое описание",
      contact: "Эл. почта/телефон для ответа (необязательно)",
    },
    consent: "Я согласен, что указанные мной данные будут обработаны для рассмотрения этого сообщения.",
    submit: "Отправить сообщение",
    pending: "Отправка...",
    successTitle: "Сообщение получено",
    successBody: "Ссылка: {ref}. Команда разбирает сообщение и при необходимости создаёт заявку.",
    another: "Новое сообщение",
    error: "Не удалось отправить сообщение. Пожалуйста, попробуйте снова.",
  },
} satisfies Record<LocaleKey, unknown>

const inputClass =
  "h-12 w-full rounded-xl border border-border bg-background px-4 text-base font-normal focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
const labelClass = "grid gap-2 text-sm font-bold text-card-foreground"

export function NlpReport() {
  const locale = resolveLocale(useLocale())
  const t = copy[locale] as (typeof copy)["tr"]

  const [category, setCategory] = useState<(typeof categories)[number]>("technical")
  const [zone, setZone] = useState("")
  const [description, setDescription] = useState("")
  const [contact, setContact] = useState("")
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [reference, setReference] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setStatus("idle")
    try {
      const response = await fetch("/api/site-management/public-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          zone,
          description,
          contact: contact || null,
          language: locale,
          consent,
        }),
      })
      const data = (await response.json()) as { reference?: string; error?: string }
      if (!response.ok) throw new Error(data.error ?? "failed")
      setReference(data.reference ?? "n/a")
      setStatus("success")
    } catch {
      setStatus("error")
    } finally {
      setPending(false)
    }
  }

  return (
    <section id="report" className="scroll-mt-20 bg-[#061a17] py-16 text-white md:py-24">
      <div className="container max-w-3xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-emerald-100 uppercase backdrop-blur">
          <Megaphone className="h-3.5 w-3.5" />
          {t.eyebrow}
        </span>
        <h2 className="mt-5 text-3xl leading-tight font-black md:text-4xl">{t.title}</h2>
        <p className="mt-4 text-base leading-8 text-white/78">{t.intro}</p>
        <a
          href={`/${locale}/new-level-premium/report-poster`}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur transition hover:bg-white/16"
        >
          <QrCode className="h-4 w-4 text-emerald-200" />
          {t.posterLink}
        </a>

        {status === "success" ? (
          <div className="mt-8 rounded-3xl border border-emerald-300/30 bg-emerald-400/10 p-6" role="status">
            <div className="flex items-center gap-2 text-emerald-100">
              <CheckCircle2 className="h-5 w-5" />
              <span className="text-lg font-black">{t.successTitle}</span>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/80">
              {t.successBody.replace("{ref}", reference)}
            </p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle")
                setConsent(false)
                setZone("")
                setDescription("")
                setContact("")
              }}
              className="mt-5 inline-flex h-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 px-5 text-sm font-black text-white transition hover:bg-white/16"
            >
              {t.another}
            </button>
          </div>
        ) : (
          <form
            onSubmit={submit}
            className="mt-8 grid gap-4 rounded-3xl border border-white/14 bg-white/10 p-5 backdrop-blur-xl sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass + " text-white"}>
                {t.fields.category}
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as (typeof categories)[number])}
                  className={inputClass + " text-[#061a17]"}
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {t.categoryLabels[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass + " text-white"}>
                {t.fields.zone}
                <input
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  required
                  maxLength={80}
                  className={inputClass + " text-[#061a17]"}
                />
              </label>
            </div>

            <label className={labelClass + " text-white"}>
              {t.fields.description}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={1200}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-base font-normal text-[#061a17] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>

            <label className={labelClass + " text-white"}>
              {t.fields.contact}
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                maxLength={160}
                className={inputClass + " text-[#061a17]"}
              />
            </label>

            <label className="flex items-start gap-3 text-sm leading-6 text-white/78">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
                className="mt-1 h-4 w-4 rounded border-white/30 text-emerald-400 focus:ring-emerald-300/30"
              />
              <span>{t.consent}</span>
            </label>

            {status === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-100" role="alert">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{t.error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={pending || !consent}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 text-base font-black text-[#061a17] shadow-xl transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {pending ? t.pending : t.submit}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
