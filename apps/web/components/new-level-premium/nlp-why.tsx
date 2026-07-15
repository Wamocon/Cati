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
    title: "Günlük operasyon için kapsamı ve sınırları açık platform.",
    intro:
      "1Çatı, satış vaadini rol bazlı operasyon akışlarına bağlar. Aşağıda hangi özelliklerin yerel demoda doğrulandığı ve hangilerinin üretim girişi, onaylı veri erişimi veya canlı sağlayıcı bağlantısı beklediği açıkça belirtilir.",
    benefits: [
      [
        "Malik finans özeti — yerel doğrulandı",
        "Malik ekranı, yalnızca doğrulanmış daire ilişkisine bağlı bakiye ve ödeme geçmişini gösterir. Gerçek tutarlar üretim girişi, onaylı daire bağlantısı ve canlı finans kayıtları açıldığında gösterilir.",
        Wallet,
      ],
      [
        "Servis akışı — yerel doğrulandı",
        "Talep durumu ve hizmet süresi takibi yerel demoda çalışır. Fotoğraf/video dosyaları, güvenli özel depolama ve dosya taraması canlı kullanım için henüz bağlı değildir.",
        Wrench,
      ],
      [
        "Belge listesi — dosyalar bekliyor",
        "Belge kayıtları ve durumları demoda görülebilir. Yüklenen dosyalar ve “doğrulandı” işareti, güvenli depolama, dosya taraması ve yetkili incelemesi canlı olduğunda kullanılacaktır.",
        FileCheck2,
      ],
      [
        "Erişim kararları — sağlayıcı kapılı",
        "İç kayıttaki gerekçe ve durum gösterilebilir; fiziksel kapı veya kart işlemi, onaylı erişim sağlayıcısı olmadan çalıştırılmaz.",
        KeyRound,
      ],
      [
        "Dört dil — kritik akış kapsamı",
        "Bu genel ürün sayfası ve seçili kritik akışlar TR/EN/DE/RU sunulur. Uygulamanın tamamında eşit dil derinliği hâlâ release QA kapısıdır.",
        Languages,
      ],
      [
        "Portal iletişimi — içeride hazır",
        "Portal mesajlaşması içeride hazırdır; müşteri hesabında kalıcı kullanım üretim girişi ve onaylı veri erişimini bekler. E-posta, SMS, WhatsApp ve push teslimatı henüz bağlı değildir.",
        MessagesSquare,
      ],
      [
        "Genel ürün asistanı — sınırlı kapsam",
        "Genel asistan yalnızca onaylı ürün bilgisini yanıtlar ve hesap verisi kullanmaz. Hesaba özel asistan, güvenli giriş, onaylı veri erişimi ve kaynak kontrollerinden sonra açılacaktır.",
        Sparkles,
      ],
    ],
    footnote:
      "“Yerel doğrulandı” üretimde canlı anlamına gelmez. Teknik release kapıları: üretim Auth, veritabanı göçleri, RLS, gerçek kayıtlar, özel depolama ve onaylı dış sağlayıcılar.",
  },
  en: {
    eyebrow: "Why 1Çatı",
    title: "A platform for daily operations—with scope and limits made clear.",
    intro:
      "1Çatı connects the sales promise to role-based operations. Each capability below says what is verified in the local demo and what still needs production login, approved data access or a live provider connection.",
    benefits: [
      [
        "Owner finance summary — locally verified",
        "The owner workspace shows balance and payment history only for a verified unit relationship. Real figures appear once production login, the approved unit link and live finance records are enabled.",
        Wallet,
      ],
      [
        "Service workflow — locally verified",
        "Request status and service-time tracking work in the local demo. Photo/video files, secure private storage and file scanning are not yet connected for live use.",
        Wrench,
      ],
      [
        "Document list — files pending",
        "Document records and statuses can be demonstrated. Uploaded files and a “verified” mark become available only when secure storage, file scanning and authorized review are live.",
        FileCheck2,
      ],
      [
        "Access decisions — provider-gated",
        "A reason and status from the internal record can be shown; no physical door or card action runs without an approved access provider.",
        KeyRound,
      ],
      [
        "Four languages — critical-flow scope",
        "This public product page and selected critical flows support TR/EN/DE/RU. Equal depth across the whole app remains a release QA gate.",
        Languages,
      ],
      [
        "Portal communication — internally ready",
        "Portal messaging is ready internally; persistent use in a customer account awaits production login and approved data access. Email, SMS, WhatsApp and push delivery are not yet connected.",
        MessagesSquare,
      ],
      [
        "Public product assistant — limited scope",
        "The public assistant answers only approved product information and uses no account data. An account-specific assistant will open only after secure login, approved data access and source checks.",
        Sparkles,
      ],
    ],
    footnote:
      "“Locally verified” does not mean live in production. Technical release gates remain: production Auth, database migrations, RLS, real records, private storage and approved external providers.",
  },
  de: {
    eyebrow: "Warum 1Çatı",
    title:
      "Eine Plattform für den täglichen Betrieb – mit klar benanntem Umfang und Grenzen.",
    intro:
      "1Çatı verbindet das Verkaufsversprechen mit rollenbasierten Abläufen. Jede Fähigkeit unten nennt, was in der lokalen Demo geprüft ist und was noch Produktionsanmeldung, freigegebenen Datenzugriff oder eine Live-Anbindung benötigt.",
    benefits: [
      [
        "Eigentümer-Finanzübersicht – lokal verifiziert",
        "Das Eigentümerportal zeigt Saldo und Zahlungsverlauf nur für eine verifizierte Einheitenbeziehung. Echte Beträge erscheinen nach Produktionsanmeldung, freigegebener Einheitenzuordnung und Aktivierung der Live-Finanzdaten.",
        Wallet,
      ],
      [
        "Serviceablauf – lokal verifiziert",
        "Anfragestatus und Bearbeitungszeit funktionieren in der lokalen Demo. Foto-/Videodateien, sicherer privater Speicher und Dateiprüfung sind für Live-Nutzung noch nicht verbunden.",
        Wrench,
      ],
      [
        "Dokumentenliste – Dateien ausstehend",
        "Dokumenteinträge und Status lassen sich demonstrieren. Uploads und die Kennzeichnung „verifiziert“ sind erst mit sicherem Speicher, Dateiprüfung und autorisierter Freigabe live.",
        FileCheck2,
      ],
      [
        "Zutrittsentscheidungen – Anbieter-Gate",
        "Begründung und Status aus dem internen Datensatz können gezeigt werden; physische Tür- oder Kartenaktionen laufen ohne freigegebenen Zutrittsanbieter nicht.",
        KeyRound,
      ],
      [
        "Vier Sprachen – kritische Abläufe",
        "Diese öffentliche Produktseite und ausgewählte kritische Abläufe gibt es in TR/EN/DE/RU. Gleiche Tiefe in der gesamten App bleibt ein Release-QA-Gate.",
        Languages,
      ],
      [
        "Portal-Kommunikation – intern bereit",
        "Portalnachrichten sind intern vorbereitet; dauerhafte Nutzung im Kundenkonto wartet auf Produktionsanmeldung und freigegebenen Datenzugriff. E-Mail, SMS, WhatsApp und Push sind noch nicht verbunden.",
        MessagesSquare,
      ],
      [
        "Öffentlicher Produktassistent – begrenzt",
        "Der öffentliche Assistent beantwortet nur freigegebene Produktinformationen und nutzt keine Kontodaten. Ein kontobezogener Assistent folgt erst nach sicherer Anmeldung, freigegebenem Datenzugriff und Quellenprüfung.",
        Sparkles,
      ],
    ],
    footnote:
      "„Lokal verifiziert“ bedeutet nicht live in Produktion. Technische Release-Gates bleiben: Produktions-Auth, DB-Migrationen, RLS, echte Datensätze, privater Speicher und freigegebene externe Anbieter.",
  },
  ru: {
    eyebrow: "Почему 1Çatı",
    title:
      "Платформа для ежедневной работы — с честно обозначенными возможностями и ограничениями.",
    intro:
      "1Çatı связывает обещание продаж с ролевыми рабочими процессами. Для каждой возможности ниже указано, что проверено в локальной демоверсии, а что ещё требует защищённого рабочего входа, разрешённого доступа к данным или подключения действующего поставщика.",
    benefits: [
      [
        "Финансы собственника — проверено локально",
        "Кабинет собственника показывает баланс и историю платежей только для подтверждённой связи с квартирой. Реальные суммы появятся после защищённого рабочего входа, одобренной привязки квартиры и подключения актуальных финансовых записей.",
        Wallet,
      ],
      [
        "Сервисный процесс — проверено локально",
        "Статус заявки и срок обработки работают в локальной демоверсии. Фото-/видеофайлы, защищённое приватное хранилище и проверка файлов ещё не подключены для рабочего использования.",
        Wrench,
      ],
      [
        "Список документов — файлы ожидают",
        "Записи документов и статусы можно показать в демоверсии. Загруженные файлы и отметка «подтверждён» станут доступны только после подключения защищённого хранилища, проверки файлов и одобрения сотрудником.",
        FileCheck2,
      ],
      [
        "Решения о доступе — провайдер закрыт",
        "Причину и статус из внутренней записи можно показать; физические действия с дверью или картой не выполняются без одобренного провайдера доступа.",
        KeyRound,
      ],
      [
        "Четыре языка — критические процессы",
        "Эта публичная страница продукта и отдельные критические процессы поддерживают TR/EN/DE/RU. Одинаковая глубина во всём приложении остаётся обязательной проверкой перед выпуском.",
        Languages,
      ],
      [
        "Портальная коммуникация — готова внутри",
        "Сообщения портала подготовлены внутри; постоянная работа в клиентском аккаунте ждёт защищённого рабочего входа и разрешённого доступа к данным. Электронная почта, SMS, WhatsApp и мобильные уведомления ещё не подключены.",
        MessagesSquare,
      ],
      [
        "Публичный продуктовый ассистент — ограничен",
        "Публичный ассистент отвечает только по одобренной информации о продукте и не использует данные аккаунта. Ассистент по аккаунту появится после безопасного входа, разрешённого доступа к данным и проверки источников.",
        Sparkles,
      ],
    ],
    footnote:
      "«Проверено локально» не означает готовность к рабочей эксплуатации. До выпуска требуются защищённая аутентификация, миграции БД, политики RLS, реальные записи, приватное хранилище и одобренные внешние провайдеры.",
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
          <p className="mt-4 text-base leading-8 text-muted-foreground">
            {t.intro}
          </p>
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
              <h3 className="mt-5 text-lg font-black text-card-foreground">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {body}
              </p>
            </ScrollReveal>
          ))}
        </div>

        <p className="mt-8 max-w-3xl text-xs leading-6 text-muted-foreground">
          {t.footnote}
        </p>
      </div>
    </section>
  )
}
