import Image from "next/image"
import {
  Gamepad2,
  Mountain,
  Sparkles,
  Theater,
  UtensilsCrossed,
  Waves,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"
import { newLevelPremiumDataset } from "@/lib/new-level-premium-data"

type LocaleKey = "tr" | "en" | "de" | "ru"

const heading = {
  tr: {
    eyebrow: "Yaşam alanı",
    title: "5 yıldızlı otel altyapısıyla 22 sosyal olanak",
    intro:
      "Havuzlar, su parkları, spor sahaları, amfitiyatro. Her ortak alan aynı site modeline bağlı.",
    servicesTitle: "Premium servisler tek akışta",
    servicesIntro:
      "Spa, restoran, etkinlik, tur ve mini kulüp talepleri artık sohbetlerde kaybolmaz; 1Çatı bunları kayıt, sağlayıcı, SLA ve kapanış onayıyla yönetir.",
  },
  en: {
    eyebrow: "Lifestyle",
    title: "22 amenities on 5-star hotel infrastructure",
    intro:
      "Pools, aquaparks, sports courts, the amphitheatre. Every common area runs on the same site model.",
    servicesTitle: "Premium services in one flow",
    servicesIntro:
      "Spa, restaurant, events, tours and mini-club requests no longer disappear in chat; 1Cati manages them with records, providers, SLA and closure approval.",
  },
  de: {
    eyebrow: "Lebensraum",
    title: "22 Annehmlichkeiten auf 5-Sterne-Hotelinfrastruktur",
    intro:
      "Pools, Aquapark, Sportplätze, Amphitheater. Jede Gemeinschaftsfläche läuft im selben Standortmodell.",
    servicesTitle: "Premium-Services in einem Ablauf",
    servicesIntro:
      "Spa, Restaurant, Events, Ausflüge und Mini-Club-Anfragen verschwinden nicht mehr im Chat; 1Cati steuert sie mit Datensatz, Anbieter, SLA und Abschlussfreigabe.",
  },
  ru: {
    eyebrow: "Образ жизни",
    title: "22 удобства на инфраструктуре 5★ отеля",
    intro:
      "Бассейны, аквапарки, спортивные площадки, амфитеатр. Каждая общая зона живёт в единой модели объекта.",
    servicesTitle: "Премиальные сервисы в одном процессе",
    servicesIntro:
      "Spa, ресторан, мероприятия, экскурсии и мини-клуб больше не теряются в чатах; 1Cati ведёт заявку, поставщика, SLA и закрытие с подтверждением.",
  },
} satisfies Record<
  LocaleKey,
  {
    eyebrow: string
    title: string
    intro: string
    servicesTitle: string
    servicesIntro: string
  }
>

const premiumServices = [
  {
    key: "spa",
    icon: Sparkles,
    image: "/new-level-premium/showroom-bedroom.jpg",
    labels: {
      tr: ["Spa & wellness", "Rezervasyon, sağlayıcı ve kullanım onayı"],
      en: ["Spa & wellness", "Reservation, provider and usage approval"],
      de: ["Spa & Wellness", "Reservierung, Anbieter und Nutzungsfreigabe"],
      ru: ["Spa и wellness", "Бронь, поставщик и подтверждение услуги"],
    },
  },
  {
    key: "restaurant",
    icon: UtensilsCrossed,
    image: "/new-level-premium/resort-exterior.jpg",
    labels: {
      tr: ["Restoran", "Masa, misafir ve malik avantajları"],
      en: ["Restaurant", "Table, guest and owner benefits"],
      de: ["Restaurant", "Tisch, Gäste und Eigentümer-Vorteile"],
      ru: ["Ресторан", "Стол, гости и преимущества собственника"],
    },
  },
  {
    key: "events",
    icon: Theater,
    image: "/new-level-premium/masterplan-aerial.jpg",
    labels: {
      tr: ["Tiyatro & etkinlik", "Saha kapasitesi, takvim ve duyuru"],
      en: ["Theatre & events", "Venue capacity, calendar and notice"],
      de: ["Theater & Events", "Kapazität, Kalender und Ankündigung"],
      ru: ["Театр и события", "Вместимость, календарь и уведомление"],
    },
  },
  {
    key: "excursions",
    icon: Mountain,
    image: "/new-level-premium/site-progress-2026.jpg",
    labels: {
      tr: ["Gezi & turlar", "Quad, jeep, bisiklet ve dağ gezileri"],
      en: ["Excursions & tours", "Quad, jeep, bike and mountain trips"],
      de: ["Ausflüge & Touren", "Quad, Jeep, Bike und Bergtouren"],
      ru: ["Экскурсии и туры", "Квадро, джип, велосипед и горы"],
    },
  },
  {
    key: "play",
    icon: Gamepad2,
    image: "/new-level-premium/resort-exterior.jpg",
    labels: {
      tr: ["Mini kulüp & oyun", "Aile kullanımı, zaman dilimi ve güvenlik"],
      en: ["Mini club & play", "Family use, time slot and safety"],
      de: ["Mini-Club & Spielbereich", "Familiennutzung, Zeitfenster und Sicherheit"],
      ru: ["Мини-клуб и игры", "Семейное использование, время и безопасность"],
    },
  },
] as const

export function NlpAmenities({ locale }: { locale: LocaleKey }) {
  const t = heading[locale] ?? heading.tr
  const amenities = newLevelPremiumDataset.amenities
  // The client dataset carries tr/en labels; de/ru fall back to en.
  const labelFor = (a: { tr: string; en: string }) => (locale === "tr" ? a.tr : a.en)

  return (
    <section className="bg-[#f7faf8] py-16 md:py-24">
      <div className="container">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-primary uppercase shadow-sm">
            <Waves className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-black text-foreground md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{t.intro}</p>
        </ScrollReveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {amenities.map((amenity) => (
            <div
              key={amenity.id}
              className="rounded-lg border border-border bg-card px-4 py-4 text-sm font-bold text-card-foreground shadow-sm"
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-black text-primary">
                {amenity.id}
              </span>
              {labelFor(amenity)}
            </div>
          ))}
        </div>

        <ScrollReveal className="mt-14 max-w-3xl">
          <h3 className="text-2xl leading-tight font-black text-foreground md:text-3xl">
            {t.servicesTitle}
          </h3>
          <p className="mt-3 text-base leading-8 text-muted-foreground">
            {t.servicesIntro}
          </p>
        </ScrollReveal>

        <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {premiumServices.map((service) => {
            const Icon = service.icon
            const [title, description] = service.labels[locale] ?? service.labels.tr

            return (
              <article
                key={service.key}
                className="group relative min-h-72 overflow-hidden rounded-lg border border-white/40 bg-card text-white shadow-xl shadow-slate-900/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl focus-within:-translate-y-1"
              >
                <Image
                  src={service.image}
                  alt={`${title} - New Level Premium`}
                  fill
                  sizes="(min-width: 1280px) 20vw, (min-width: 768px) 50vw, 100vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/86 via-black/34 to-black/6" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-white/18 ring-1 ring-white/30 backdrop-blur">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h4 className="text-lg font-black tracking-tight">{title}</h4>
                  <p className="mt-2 text-sm leading-6 text-white/82">{description}</p>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
