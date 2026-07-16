import Image from "next/image"
import { ArrowRight, Heart, Quote } from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Tek çatı",
    title: "Bir topluluk. Tek çatı.",
    body:
      "Yeni Seviye Premium bir yatırım, aynı zamanda yaşayan bir topluluk. 1Çatı, adının anlamına sadık kalarak maliki, kiracıyı, misafiri ve ekibi aynı güvenli çatı altında, dört dilde ve tek bir gerçeklikte buluşturur.",
    testimonialNote: "Gerçek malik ve yatırımcı görüşleri burada yayınlanacak.",
    finalCta: "Erişim için kayıt olun",
    finalNote: "Erişim, doğrulama ve yönetici onayından sonra açılır.",
  },
  en: {
    eyebrow: "One roof",
    title: "One community. One roof.",
    body:
      "New Level Premium is an investment, and it is also a living community. 1Çatı, true to its name (\"one roof\"), brings owner, tenant, guest and team together under one secure roof, in four languages, on one shared truth.",
    testimonialNote: "Real owner and investor voices will be published here.",
    finalCta: "Register for access",
    finalNote: "Access opens after verification and administrator approval.",
  },
  de: {
    eyebrow: "Ein Dach",
    title: "Eine Gemeinschaft. Ein Dach.",
    body:
      "Neues Niveau Premium ist eine Investition und zugleich eine lebendige Gemeinschaft. 1Çatı bringt, seinem Namen treu (\"ein Dach\"), Eigentümer, Mieter, Gast und Team unter einem sicheren Dach zusammen, in vier Sprachen, auf einer gemeinsamen Wahrheit.",
    testimonialNote: "Echte Stimmen von Eigentümern und Investoren erscheinen hier.",
    finalCta: "Für Zugang registrieren",
    finalNote: "Der Zugang wird nach Prüfung und Administratorfreigabe geöffnet.",
  },
  ru: {
    eyebrow: "Одна крыша",
    title: "Одно сообщество. Одна крыша.",
    body:
      "«Новый уровень Премиум» это инвестиция и при этом живое сообщество. 1Çatı, верный своему имени («одна крыша»), объединяет собственника, арендатора, гостя и команду под одной надёжной крышей, на четырёх языках, на единой истине.",
    testimonialNote: "Здесь появятся реальные отзывы собственников и инвесторов.",
    finalCta: "Регистрация доступа",
    finalNote: "Доступ открывается после проверки и одобрения администратором.",
  },
} satisfies Record<LocaleKey, unknown>

export function NlpLove({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] as (typeof copy)["tr"]

  return (
    <section id="love" className="relative overflow-hidden bg-[#061a17] text-white">
      <div className="absolute inset-0">
        <Image
          src="/new-level-premium/masterplan-aerial.jpg"
          alt="New Level Premium aerial masterplan"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,16,14,0.86),rgba(3,16,14,0.94))]" />
      </div>

      <div className="relative z-10 container py-20 text-center md:py-28">
        <ScrollReveal className="mx-auto max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-emerald-100 uppercase backdrop-blur">
            <Heart className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-black md:text-5xl">{t.title}</h2>
          <p className="mt-6 text-base leading-8 text-white/80 md:text-lg">{t.body}</p>

          <div className="mx-auto mt-8 flex max-w-md items-center gap-3 rounded-2xl border border-white/14 bg-white/[0.06] px-5 py-4 text-left text-sm text-white/60 backdrop-blur">
            <Quote className="h-5 w-5 shrink-0 text-emerald-200" />
            <span>{t.testimonialNote}</span>
          </div>

          <div className="mt-10 flex flex-col items-center gap-3">
            <a
              href="#register"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-black text-[#061a17] shadow-lg transition hover:-translate-y-0.5 hover:bg-emerald-50"
            >
              {t.finalCta}
              <ArrowRight className="h-4 w-4" />
            </a>
            <span className="text-xs text-white/60">{t.finalNote}</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
