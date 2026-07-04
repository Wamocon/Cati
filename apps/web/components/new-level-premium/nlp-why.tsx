import {
  BadgeCheck,
  FileCheck2,
  KeyRound,
  Languages,
  MessagesSquare,
  Sparkles,
  Wallet,
  Wrench,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Neden 1Çatı",
    title: "Binayı her gün çalıştıran sistem, broşür değil.",
    intro:
      "1Çatı, satış vaadini günlük operasyona bağlar. Her rol yalnızca yetkili olduğu veriyi görür; hiçbir kullanıcı kendi kapsamının dışına çıkamaz.",
    benefits: [
      ["Bakiyeniz, her an, telefon gerekmez", "Dairenizin muhasebe kaydı, ödeme geçmişi ve borç durumu doğrudan görünür. Size okunan bir özet değil.", Wallet],
      ["Kaybolmayan servis talepleri", "Talep açın; durumu, SLA'yı ve işin foto/video kanıtını görün. Sohbette kaybolan bir mesaj değil.", Wrench],
      ["Belgeleriniz, doğrulanabilir", "TAPU, sözleşme ve daire belgeleri tek yerde, net durumla: doğrulandı / bekliyor / süresi doldu.", FileCheck2],
      ["Gerekçeli erişim kararları", "Bir bölge kısıtlıysa nedenini ve çözümünü görürsünüz. Gerekçesiz kapalı bir kapı değil.", KeyRound],
      ["Tek sistem, dört dil", "Türkçe, İngilizce, Almanca, Rusça, hepsi aynı derinlikte. Uluslararası mülkiyet tabanı için tasarlandı.", Languages],
      ["Yönetime doğrudan, kayıtlı hat", "İletişim sistem içinde, kayıtla ilerler. Telefon, e-posta ve mesaj arasında dağılmaz.", MessagesSquare],
      ["Kaynak gösteren asistan", "Yapay zekâ, yalnızca kendi dairenize dair sorulara dayanağıyla cevap verir; yetkiniz dışındaki veriyi asla gösteremez.", Sparkles],
    ],
    footnote: "Yukarıdakilerin tümü mevcut sistemde çalışır. Ödeme, banka ve fiziksel erişim otomasyonu sağlayıcı kararlarına bağlıdır ve 'canlı' olarak sunulmaz.",
  },
  en: {
    eyebrow: "Why 1Çatı",
    title: "The system that runs the building every day, not a brochure.",
    intro:
      "1Çatı connects the sales promise to daily operations. Every role sees only the data it is entitled to; no user can step outside their own scope.",
    benefits: [
      ["Your balance, any time, no phone call", "Your unit's ledger, payment history and debt status show directly. Nobody has to read you a summary.", Wallet],
      ["Service requests that don't disappear", "Submit a request, then follow its status, SLA and photo/video proof of the work. Nothing gets lost in a thread.", Wrench],
      ["Your documents, verifiably", "TAPU, contracts and unit documents in one place with a clear status: verified / pending / expired.", FileCheck2],
      ["Access decisions with a reason", "If a zone is restricted you see why and what resolves it. It is never a locked door with no explanation.", KeyRound],
      ["One system, four languages", "Turkish, English, German and Russian, each with the same depth. Built for an international ownership base.", Languages],
      ["A direct, logged line to management", "Communication happens inside the system, with a record. Nothing is scattered across phone, email and chat.", MessagesSquare],
      ["An assistant that cites its sources", "The AI answers questions about your own unit with its basis, and can never show data outside your permissions.", Sparkles],
    ],
    footnote: "All of the above works in the current system. Payment, bank and physical-access automation depend on provider decisions and are not presented as live.",
  },
  de: {
    eyebrow: "Warum 1Çatı",
    title: "Das System, das das Haus täglich betreibt, keine Broschüre.",
    intro:
      "1Çatı verbindet das Verkaufsversprechen mit dem täglichen Betrieb. Jede Rolle sieht nur die Daten, zu denen sie berechtigt ist; kein Nutzer kann seinen Bereich verlassen.",
    benefits: [
      ["Ihr Saldo, jederzeit, ohne Anruf", "Kontostand, Zahlungshistorie und Schuldenstatus Ihrer Einheit sind direkt sichtbar. Niemand liest Ihnen eine Zusammenfassung vor.", Wallet],
      ["Serviceanfragen, die nicht verschwinden", "Anfrage stellen, dann Status, SLA und Foto-/Video-Nachweis verfolgen. Nichts geht im Chat verloren.", Wrench],
      ["Ihre Dokumente, nachprüfbar", "TAPU, Verträge und Unterlagen an einem Ort mit klarem Status: verifiziert / offen / abgelaufen.", FileCheck2],
      ["Zutrittsentscheidungen mit Begründung", "Ist eine Zone gesperrt, sehen Sie warum und was sie löst. Es ist nie eine Tür ohne Erklärung.", KeyRound],
      ["Ein System, vier Sprachen", "Türkisch, Englisch, Deutsch und Russisch, jeweils gleich tief. Für eine internationale Eigentümerbasis gebaut.", Languages],
      ["Direkte, protokollierte Linie zur Verwaltung", "Kommunikation läuft im System, mit Nachweis. Nichts ist über Telefon, E-Mail und Chat verstreut.", MessagesSquare],
      ["Ein Assistent, der seine Quellen nennt", "Die KI beantwortet Fragen zu Ihrer eigenen Einheit mit Beleg und zeigt nie Daten außerhalb Ihrer Rechte.", Sparkles],
    ],
    footnote: "All dies funktioniert im aktuellen System. Zahlungs-, Bank- und physische Zutrittsautomatisierung hängen von Anbieterentscheidungen ab und werden nicht als 'live' dargestellt.",
  },
  ru: {
    eyebrow: "Почему 1Çatı",
    title: "Система, которая ведёт дом каждый день, а не брошюра.",
    intro:
      "1Çatı связывает обещание продаж с ежедневной работой. Каждая роль видит только положенные ей данные; никто не выходит за пределы своей зоны.",
    benefits: [
      ["Ваш баланс в любой момент, без звонка", "Реестр вашей квартиры, история платежей и статус задолженности видны напрямую. Никто не пересказывает вам сводку.", Wallet],
      ["Заявки, которые не теряются", "Создайте заявку и следите за статусом, SLA и фото/видео-подтверждением работ. Ничего не пропадёт в чате.", Wrench],
      ["Ваши документы, с проверкой", "TAPU, договоры и документы квартиры в одном месте с чётким статусом: подтверждён / ожидает / истёк.", FileCheck2],
      ["Решения о доступе с обоснованием", "Если зона ограничена, вы видите причину и способ решения. Это не запертая дверь без объяснений.", KeyRound],
      ["Одна система, четыре языка", "Турецкий, английский, немецкий и русский, с одинаковой глубиной. Для международной базы собственников.", Languages],
      ["Прямая, фиксируемая связь с управлением", "Общение внутри системы, с записью. Ничего не разбросано по телефону, почте и чатам.", MessagesSquare],
      ["Ассистент, указывающий источники", "ИИ отвечает по вашей квартире с обоснованием и никогда не покажет данные вне ваших прав.", Sparkles],
    ],
    footnote: "Всё вышеперечисленное работает в текущей системе. Автоматизация платежей, банка и физического доступа зависит от решений по поставщикам и не подаётся как «работающая».",
  },
} satisfies Record<
  LocaleKey,
  {
    eyebrow: string
    title: string
    intro: string
    benefits: Array<[string, string, typeof Wallet]>
    footnote: string
  }
>

export function NlpWhy({ locale }: { locale: LocaleKey }) {
  const t = copy[locale] ?? copy.tr

  return (
    <section id="why" className="bg-background py-16 md:py-24">
      <div className="container">
        <ScrollReveal className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-extrabold tracking-[0.16em] text-primary uppercase">
            <BadgeCheck className="h-3.5 w-3.5" />
            {t.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl leading-tight font-black text-foreground md:text-4xl">
            {t.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-muted-foreground">{t.intro}</p>
        </ScrollReveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.benefits.map(([title, body, Icon], index) => (
            <ScrollReveal
              key={title}
              delay={index * 0.04}
              className="h-full rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:shadow-md"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-black text-card-foreground">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{body}</p>
            </ScrollReveal>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-6 text-muted-foreground">{t.footnote}</p>
      </div>
    </section>
  )
}
