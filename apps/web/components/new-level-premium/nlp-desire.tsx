import { ArrowRight, Sparkles, Check, Minus } from "lucide-react"
import { Link } from "@/app/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Neden premium",
    title: "Sitenizi her gün çalıştıran işletim sistemi.",
    intro:
      "Satıştan mülkiyete kadar aynı sistemi kullanırsınız. Bu bir broşür değil, her gün dönen operasyon. Her rol yalnızca kendi kapsamını görür.",
    standard: "Standart mülk yazılımı",
    premium: "1Çatı · New Level Premium",
    rows: [
      ["Statik panolar", "Her rakamı açıklar, kaynağını gösterir"],
      ["Tek dil", "tr / en / de / ru, dördünde aynı derinlik"],
      ["Elle hazırlanan raporlar", "Talep üzerine rol bazlı özet"],
      ["Veri sızdırabilen 'AI'", "Yetkiyle sınırlı, önce reddeder"],
      ["İşlem yapabilen chatbot", "Sadece önerir; her aksiyon insan onaylı"],
      ["Kimsenin kapatmadığı kalıcı erişim", "Süreli erişim, kendiliğinden sona erer"],
    ],
    ctaDemo: "Canlı demoyu görün",
    demoNote: "Tüm sistemi tek tıkla, şifresiz açın.",
  },
  en: {
    eyebrow: "Why premium",
    title: "The operating system that runs your site every day.",
    intro:
      "You use the same system from sale to ownership. This is a live operation, not a brochure, and every role sees only its own scope.",
    standard: "Standard property software",
    premium: "1Çatı · New Level Premium",
    rows: [
      ["Static dashboards", "Explains every number, cites its source"],
      ["One language", "tr / en / de / ru, same depth in each"],
      ["Reports you build by hand", "On-demand, role-aware summaries"],
      ["'AI' that can leak data", "Permission-scoped, refusal-first"],
      ["Chatbot that can act", "Advises only; every action human-approved"],
      ["Permanent access no one revokes", "Time-boxed access that expires itself"],
    ],
    ctaDemo: "See the live demo",
    demoNote: "Open the whole system in one click, no password.",
  },
  de: {
    eyebrow: "Warum premium",
    title: "Das Betriebssystem, das Ihre Anlage täglich führt.",
    intro:
      "Sie nutzen dasselbe System vom Kauf bis zum Eigentum. Das ist keine Broschüre, sondern laufender Betrieb, in dem jede Rolle nur ihren Bereich sieht.",
    standard: "Standard-Immobiliensoftware",
    premium: "1Çatı · New Level Premium",
    rows: [
      ["Statische Dashboards", "Erklärt jede Zahl, nennt ihre Quelle"],
      ["Eine Sprache", "tr / en / de / ru, überall gleiche Tiefe"],
      ["Manuell gebaute Berichte", "Auf Abruf, rollenbasiert"],
      ["'KI', die Daten leaken kann", "Rechte-begrenzt, verweigert zuerst"],
      ["Chatbot, der handeln kann", "Berät nur; jede Aktion menschlich freigegeben"],
      ["Dauerzugang, den keiner abschaltet", "Zeitzugang, der von selbst endet"],
    ],
    ctaDemo: "Live-Demo ansehen",
    demoNote: "Das ganze System mit einem Klick, ohne Passwort.",
  },
  ru: {
    eyebrow: "Почему премиум",
    title: "Операционная система, которая ведёт ваш комплекс каждый день.",
    intro:
      "Вы используете одну систему от покупки до владения. Это не брошюра, а живая работа, где каждая роль видит только свою зону.",
    standard: "Стандартный софт для недвижимости",
    premium: "1Çatı · New Level Premium",
    rows: [
      ["Статичные панели", "Объясняет каждую цифру, указывает источник"],
      ["Один язык", "tr / en / de / ru, одна глубина в каждом"],
      ["Отчёты вручную", "По запросу, с учётом роли"],
      ["«ИИ», способный слить данные", "Ограничен правами, сначала отказывает"],
      ["Чат-бот, который действует", "Только советует; каждое действие одобряет человек"],
      ["Постоянный доступ, который никто не закрывает", "Срочный доступ, истекает сам"],
    ],
    ctaDemo: "Посмотреть демо",
    demoNote: "Открыть всю систему одним кликом, без пароля.",
  },
} satisfies Record<LocaleKey, unknown>

export function NlpDesire({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] as (typeof copy)["tr"]

  return (
    <section id="desire" className="bg-[#061a17] py-16 text-white md:py-24">
      <div className="container">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-emerald-100 uppercase backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-black md:text-4xl">{t.title}</h2>
          <p className="mt-4 text-base leading-8 text-white/78">{t.intro}</p>
        </ScrollReveal>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/14">
          <div className="grid grid-cols-2 border-b border-white/12 bg-white/[0.04] text-xs font-black uppercase tracking-wide">
            <div className="px-4 py-3 text-white/55 sm:px-6">{t.standard}</div>
            <div className="border-l border-white/12 px-4 py-3 text-emerald-100 sm:px-6">{t.premium}</div>
          </div>
          {t.rows.map(([left, right], i) => (
            <div
              key={left}
              className={
                "grid grid-cols-2 text-sm " + (i % 2 === 1 ? "bg-white/[0.02]" : "")
              }
            >
              <div className="flex items-center gap-2 px-4 py-4 text-white/60 sm:px-6">
                <Minus className="h-4 w-4 shrink-0 text-white/30" />
                <span>{left}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-white/12 px-4 py-4 font-semibold text-white sm:px-6">
                <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>{right}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Link
            href="/login"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-black text-[#061a17] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
          >
            {t.ctaDemo}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <span className="text-xs text-white/60">{t.demoNote}</span>
        </div>
      </div>
    </section>
  )
}
