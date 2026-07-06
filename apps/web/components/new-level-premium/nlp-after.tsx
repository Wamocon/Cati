import {
  Eye,
  Layers,
  LogIn,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Kayıttan sonra",
    likeTitle: "Anında, güvenli, spam yok",
    likeIntro: "Kaydınızı gönderdikten sonra ne olacağını tam olarak bilirsiniz.",
    likeSteps: [
      ["Saniyeler içinde doğrulama", "OCR ve selfie eşleştirme, otomatik"],
      ["İnsan onayı", "Hiçbir hesap kendiliğinden açılmaz. Bir yönetici onaylar"],
      ["İçerdesiniz", "Yalnızca kendi daireniz, kendi verileriniz"],
    ],
    loyaltyTitle: "Yıllarca aynı çatı altında",
    loyaltyIntro: "Girdikten sonra kalmanız için gerçek nedenler:",
    loyaltyItems: [
      ["Her zaman güncel", "Bakiye, servis, belge: hepsi canlı veriden"],
      ["Kontrol sizde", "Süreli kiracı erişimini kendiniz yönetirsiniz"],
      ["Tek sistem", "Rezervasyondan tapuya kadar tek kayıt"],
      ["Şeffaflık", "Her işlem kayıtlı ve izlenebilir"],
    ],
  },
  en: {
    eyebrow: "After you join",
    likeTitle: "Instant, secure, no spam",
    likeIntro: "You know exactly what happens once you send your request.",
    likeSteps: [
      ["Verified in seconds", "OCR and selfie match, automatic"],
      ["Human approval", "No account opens itself. An administrator confirms it"],
      ["You're in", "Only your own unit, your own data"],
    ],
    loyaltyTitle: "Under one roof for years",
    loyaltyIntro: "Once you're in, real reasons to stay:",
    loyaltyItems: [
      ["Always current", "Balance, service and documents, from live data"],
      ["You stay in control", "You manage time-boxed tenant access yourself"],
      ["One system", "From reservation to title deed, one record"],
      ["Transparency", "Every action is logged and traceable"],
    ],
  },
  de: {
    eyebrow: "Nach der Anmeldung",
    likeTitle: "Sofort, sicher, kein Spam",
    likeIntro: "Sie wissen genau, was nach dem Absenden passiert.",
    likeSteps: [
      ["In Sekunden verifiziert", "OCR und Selfie-Abgleich, automatisch"],
      ["Menschliche Freigabe", "Kein Konto öffnet sich selbst. Ein Administrator bestätigt es"],
      ["Sie sind drin", "Nur Ihre eigene Einheit, Ihre eigenen Daten"],
    ],
    loyaltyTitle: "Jahrelang unter einem Dach",
    loyaltyIntro: "Wenn Sie drin sind, echte Gründe zu bleiben:",
    loyaltyItems: [
      ["Immer aktuell", "Saldo, Service und Dokumente, aus Live-Daten"],
      ["Sie behalten die Kontrolle", "Sie verwalten den befristeten Mieterzugang selbst"],
      ["Ein System", "Von der Reservierung bis zum Grundbuch, ein Datensatz"],
      ["Transparenz", "Jede Aktion wird protokolliert und ist nachvollziehbar"],
    ],
  },
  ru: {
    eyebrow: "После регистрации",
    likeTitle: "Мгновенно, безопасно, без спама",
    likeIntro: "Вы точно знаете, что происходит после отправки заявки.",
    likeSteps: [
      ["Проверка за секунды", "OCR и сверка селфи, автоматически"],
      ["Одобрение человеком", "Ни один аккаунт не открывается сам. Его подтверждает администратор"],
      ["Вы внутри", "Только ваша квартира, ваши данные"],
    ],
    loyaltyTitle: "Годами под одной крышей",
    loyaltyIntro: "Когда вы внутри, есть реальные причины остаться:",
    loyaltyItems: [
      ["Всегда актуально", "Баланс, сервис и документы из живых данных"],
      ["Контроль у вас", "Вы сами управляете срочным доступом арендатора"],
      ["Одна система", "От брони до свидетельства, одна запись"],
      ["Прозрачность", "Каждое действие фиксируется и отслеживается"],
    ],
  },
} satisfies Record<LocaleKey, unknown>

const likeIcons = [ScanFace, UserCheck, LogIn]
const loyaltyIcons = [RefreshCw, SlidersHorizontal, Layers, Eye]

export function NlpAfter({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] as (typeof copy)["tr"]

  return (
    <section id="after" className="bg-background py-16 md:py-24">
      <div className="container grid gap-10 lg:grid-cols-2">
        <ScrollReveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 text-2xl leading-tight font-black text-foreground md:text-3xl">
            {t.likeTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t.likeIntro}</p>
          <ol className="mt-6 space-y-3">
            {t.likeSteps.map(([title, body], i) => {
              const Icon = likeIcons[i]
              return (
                <li key={title} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-card-foreground">{title}</p>
                    <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{body}</p>
                  </div>
                </li>
              )
            })}
          </ol>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <h2 className="text-2xl leading-tight font-black text-foreground md:text-3xl">
            {t.loyaltyTitle}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{t.loyaltyIntro}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {t.loyaltyItems.map(([title, body], i) => {
              const Icon = loyaltyIcons[i]
              return (
                <div key={title} className="rounded-2xl border border-border bg-card p-4">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-black text-card-foreground">{title}</p>
                  <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{body}</p>
                </div>
              )
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
