import { ArrowRight, KeyRound, Megaphone, Share2, UserPlus } from "lucide-react"
import { Link } from "@/app/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Paylaşın",
    title: "Güveni kendiniz yayın",
    intro:
      "1Çatı'ya girdikten sonra başkalarını güvenle dahil edebilirsiniz. Kontrol her zaman sizde kalır.",
    inviteTitle: "Kiracınızı davet edin",
    inviteBody:
      "Panelinizden tek kullanımlık, süreli bir davet kodu üretin. Kod yalnızca sizin dairenize bağlıdır ve seçtiğiniz sürede kendiliğinden sona erer. Sorumluluk kira boyunca sizde kalır.",
    inviteCta: "Zaman erişimini yönet",
    reportTitle: "Her yerden bildirin",
    reportBody:
      "Sahadaki herkes, misafirler dahil, hesap açmadan bir sorunu bildirebilir. QR posteri yazdırın, ortak alanlara asın. Her bildirim çözülene kadar takip edilir.",
    reportCta: "QR posteri aç",
  },
  en: {
    eyebrow: "Share",
    title: "Spread the trust yourself",
    intro:
      "Once you're in 1Çatı, you can bring others in safely. Control always stays with you.",
    inviteTitle: "Invite your tenant",
    inviteBody:
      "Generate a one-time, time-boxed invite code from your dashboard. The code is tied to your unit only and expires on its own at the window you choose. Responsibility stays with you for the whole lease.",
    inviteCta: "Manage time-boxed access",
    reportTitle: "Report from anywhere",
    reportBody:
      "Anyone on the grounds, guests included, can report an issue without an account. Print the QR poster and put it up in common areas. Every report is tracked until it's resolved.",
    reportCta: "Open the QR poster",
  },
  de: {
    eyebrow: "Teilen",
    title: "Verbreiten Sie das Vertrauen selbst",
    intro:
      "Sobald Sie in 1Çatı sind, holen Sie andere sicher dazu. Die Kontrolle bleibt immer bei Ihnen.",
    inviteTitle: "Laden Sie Ihren Mieter ein",
    inviteBody:
      "Erzeugen Sie aus Ihrem Dashboard einen Einmal-Einladungscode mit Frist. Der Code ist nur an Ihre Einheit gebunden und läuft im gewählten Zeitfenster von selbst ab. Die Verantwortung bleibt über die gesamte Mietzeit bei Ihnen.",
    inviteCta: "Zeitzugang verwalten",
    reportTitle: "Von überall melden",
    reportBody:
      "Jeder auf dem Gelände, auch Gäste, kann ein Anliegen ohne Konto melden. Drucken Sie das QR-Poster und hängen Sie es in Gemeinschaftsbereiche. Jede Meldung wird bis zur Lösung verfolgt.",
    reportCta: "QR-Poster öffnen",
  },
  ru: {
    eyebrow: "Делитесь",
    title: "Распространяйте доверие сами",
    intro:
      "Как только вы в 1Çatı, вы можете безопасно подключать других. Контроль всегда остаётся у вас.",
    inviteTitle: "Пригласите арендатора",
    inviteBody:
      "Создайте в кабинете одноразовый код-приглашение со сроком. Код привязан только к вашей квартире и истекает сам в выбранный период. Ответственность остаётся за вами весь срок аренды.",
    inviteCta: "Управлять доступом",
    reportTitle: "Сообщайте откуда угодно",
    reportBody:
      "Любой на территории, включая гостей, может сообщить о проблеме без аккаунта. Распечатайте QR-плакат и повесьте его в общих зонах. Каждое сообщение отслеживается до решения.",
    reportCta: "Открыть QR-плакат",
  },
} satisfies Record<LocaleKey, unknown>

export function NlpShare({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] as (typeof copy)["tr"]

  return (
    <section id="share" className="bg-[#f7faf8] py-16 md:py-24">
      <div className="container">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-primary uppercase shadow-sm">
            <Share2 className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-black text-foreground md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{t.intro}</p>
        </ScrollReveal>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <ScrollReveal className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <UserPlus className="h-5 w-5" />
            </span>
            <h3 className="mt-5 flex items-start gap-2 text-lg font-black text-card-foreground">
              <KeyRound className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">{t.inviteTitle}</span>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{t.inviteBody}</p>
            <Link
              href="/dashboard/users"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
            >
              {t.inviteCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollReveal>

          <ScrollReveal delay={0.06} className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-sm">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Megaphone className="h-5 w-5" />
            </span>
            <h3 className="mt-5 flex items-start gap-2 text-lg font-black text-card-foreground">
              <Megaphone className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">{t.reportTitle}</span>
            </h3>
            <p className="mt-2 flex-1 text-sm leading-7 text-muted-foreground">{t.reportBody}</p>
            <Link
              href="/new-level-premium#report"
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-black text-foreground transition hover:border-primary/40"
            >
              {t.reportCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
