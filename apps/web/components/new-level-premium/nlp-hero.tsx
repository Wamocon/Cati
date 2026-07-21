import Image from "next/image"
import { ArrowRight, Building2, Megaphone, ShieldCheck } from "lucide-react"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "New Level Premium / Avsallar · 1Çatı ERP",
    title: "Daireyi de, onu yöneten sistemi de alıyorsunuz.",
    intro:
      "New Level Premium'un arkasında 1Çatı duruyor: finans, servis, belge, rezervasyon ve erişimi tek çatı altında toplayan rol bazlı ERP. Satın alırken kurulan güven, mülkiyete geçtikten sonra aynı sistemle sürüyor.",
    ctaWhy: "1Çatı ne sunuyor?",
    ctaRegister: "Erişim için kayıt ol",
    ctaReport: "Bildirim oluştur",
    metrics: [
      ["769", "daire"],
      ["52k m²", "proje alanı"],
      ["900 m", "plaja mesafe"],
      ["3 yıl", "kira garantisi"],
    ],
  },
  en: {
    eyebrow: "New Level Premium / Avsallar · 1Çatı ERP",
    title: "You get the apartment and the system that runs it.",
    intro:
      "Behind New Level Premium sits 1Çatı: the role-based ERP that handles finance, service, documents, reservations and access under one roof. The trust you build while buying stays with you once you own.",
    ctaWhy: "What 1Çatı gives you",
    ctaRegister: "Register for access",
    ctaReport: "Report an issue",
    metrics: [
      ["769", "units"],
      ["52k m²", "land area"],
      ["900 m", "to beach"],
      ["3 yrs", "rental guarantee"],
    ],
  },
  de: {
    eyebrow: "New Level Premium / Avsallar · 1Çatı ERP",
    title: "Sie bekommen die Wohnung und das System dahinter.",
    intro:
      "Hinter New Level Premium steht 1Çatı: das rollenbasierte ERP für Finanzen, Service, Dokumente, Reservierungen und Zutritt unter einem Dach. Das Vertrauen aus dem Kauf bleibt Ihnen auch als Eigentümer erhalten.",
    ctaWhy: "Was 1Çatı bietet",
    ctaRegister: "Für Zugang registrieren",
    ctaReport: "Anliegen melden",
    metrics: [
      ["769", "Einheiten"],
      ["52k m²", "Projektfläche"],
      ["900 m", "zum Strand"],
      ["3 Jahre", "Mietgarantie"],
    ],
  },
  ru: {
    eyebrow: "New Level Premium / Авсаллар · 1Çatı ERP",
    title: "Вы получаете квартиру и систему, которая ею управляет.",
    intro:
      "За «New Level Premium» стоит 1Çatı: ролевая ERP для финансов, сервиса, документов, бронирований и доступа под одной крышей. Доверие, что появилось при покупке, остаётся с вами и после того, как квартира станет вашей.",
    ctaWhy: "Что даёт 1Çatı",
    ctaRegister: "Регистрация доступа",
    ctaReport: "Сообщить о проблеме",
    metrics: [
      ["769", "квартир"],
      ["52k m²", "площадь"],
      ["900 m", "до пляжа"],
      ["3 года", "гарантия аренды"],
    ],
  },
} satisfies Record<
  LocaleKey,
  {
    eyebrow: string
    title: string
    intro: string
    ctaWhy: string
    ctaRegister: string
    ctaReport: string
    metrics: Array<[string, string]>
  }
>

export function NlpHero({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] ?? copy.tr

  return (
    <section className="relative overflow-hidden bg-[#061a17] text-white">
      <div className="absolute inset-0">
        <Image
          src="/new-level-premium/resort-exterior.jpg"
          alt="New Level Premium resort exterior with landscaped residence blocks"
          fill
          loading="eager"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(3,16,14,0.92)_0%,rgba(3,16,14,0.72)_45%,rgba(3,16,14,0.32)_100%)]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />

      <div className="relative z-10 container py-20 md:py-28">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-emerald-100 uppercase backdrop-blur">
          <Building2 className="h-3.5 w-3.5" />
          {t.eyebrow}
        </span>

        <h1 className="mt-6 max-w-3xl text-4xl leading-[1.05] font-black md:text-6xl">
          {t.title}
        </h1>
        <p className="mt-6 max-w-2xl text-base leading-8 text-white/80 md:text-lg">
          {t.intro}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <a
            href="#register"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#061a17] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            {t.ctaRegister}
            <ArrowRight className="h-4 w-4" />
          </a>
          <a
            href="#why"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/16"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-200" />
            {t.ctaWhy}
          </a>
          <a
            href="#report"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/16"
          >
            <Megaphone className="h-4 w-4 text-emerald-200" />
            {t.ctaReport}
          </a>
        </div>

        <div className="mt-12 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {t.metrics.map(([value, label]) => (
            <div
              key={`${value}-${label}`}
              className="flex flex-col justify-center rounded-2xl border border-white/14 bg-white/10 px-4 py-3 backdrop-blur"
            >
              <div className="text-2xl font-black whitespace-nowrap tabular-nums">{value}</div>
              <div className="mt-0.5 text-xs font-semibold text-white/68">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
