import { Waves } from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"
import { newLevelPremiumDataset } from "@/lib/new-level-premium-data"

type LocaleKey = "tr" | "en" | "de" | "ru"

const heading = {
  tr: { eyebrow: "Yaşam alanı", title: "5 yıldızlı otel altyapısıyla 22 sosyal olanak", intro: "Havuzlar, su parkları, spor sahaları, amfitiyatro. Her ortak alan aynı site modeline bağlı." },
  en: { eyebrow: "Lifestyle", title: "22 amenities on 5-star hotel infrastructure", intro: "Pools, aquaparks, sports courts, the amphitheatre. Every common area runs on the same site model." },
  de: { eyebrow: "Lebensraum", title: "22 Annehmlichkeiten auf 5-Sterne-Hotelinfrastruktur", intro: "Pools, Aquapark, Sportplätze, Amphitheater. Jede Gemeinschaftsfläche läuft im selben Standortmodell." },
  ru: { eyebrow: "Образ жизни", title: "22 удобства на инфраструктуре 5★ отеля", intro: "Бассейны, аквапарки, спортивные площадки, амфитеатр. Каждая общая зона живёт в единой модели объекта." },
} satisfies Record<LocaleKey, { eyebrow: string; title: string; intro: string }>

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
              className="rounded-2xl border border-border bg-card px-4 py-4 text-sm font-bold text-card-foreground shadow-sm"
            >
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-xs font-black text-primary">
                {amenity.id}
              </span>
              {labelFor(amenity)}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
