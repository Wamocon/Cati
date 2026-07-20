import {
  ClipboardCheck,
  Eye,
  Layers,
  LogIn,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  UserCheck,
} from "lucide-react"
import { ScrollReveal } from "@/components/scroll-reveal"

type LocaleKey = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    eyebrow: "Kayıttan sonra",
    likeTitle: "Açık süreç, güvenli, spam yok",
    likeIntro:
      "Kaydınızı gönderdikten sonra ne olacağını tam olarak bilirsiniz.",
    likeSteps: [
      [
        "Manuel kimlik incelemesi",
        "Kimlik belgesi/selfie yüklemesi şu anda kullanılamıyor. Kimlik doğrulama hizmeti de kullanılamadığı için başvuru kanıtlarını bir yönetici manuel inceler",
      ],
      [
        "İnsan onayı",
        "Hiçbir hesap kendiliğinden açılmaz. Bir yönetici onaylar",
      ],
      [
        "Erişiminiz rolünüzle sınırlıdır",
        "Doğrulanmış malikler yalnızca bağlı dairelerini; yetkili kiracılar yalnızca kendilerine açılan sakin hizmetlerini; personel ise yalnızca atanmış işleri görür",
      ],
    ],
    loyaltyTitle: "Yıllarca aynı çatı altında",
    loyaltyIntro: "Girdikten sonra kalmanız için gerçek nedenler:",
    loyaltyItems: [
      [
        "Rol kapsamlı görünüm",
        "Doğrulanmış malikler bağlantılı daire hizmetlerini ve yetkili belgeleri; yetkili kiracılar yalnızca açılmış sakin hizmetlerini; personel yalnızca atanmış işleri görür. Her ekran veri kaynağı durumunu gösterir",
      ],
      [
        "Kontrollü erişim",
        "Süreli kiracı erişimini yalnızca doğrulanmış malik, gerçek kimlik doğrulama ve onaylı veri erişimi etkin olduğunda yönetebilir; kiracı ve personel bu yetkiyi kendileri veremez",
      ],
      [
        "Bağlantılı işlem kayıtları",
        "Rezervasyon, daire ve TAPU referansları yalnızca onaylı bir ilişki bulunduğunda bağlanır; tek ve eksiksiz kayıt olarak sunulmaz",
      ],
      [
        "Hassas işlemler için denetim kaydı",
        "Onay, erişim ve finans gibi doğrulanmış hassas akışlar izlenebilir kayıt bırakır; genel eylem kaydı henüz vaat edilmez",
      ],
    ],
  },
  en: {
    eyebrow: "After you join",
    likeTitle: "Clear process, secure, no spam",
    likeIntro: "You know exactly what happens once you send your request.",
    likeSteps: [
      [
        "Manual identity review",
        "ID/selfie upload is currently unavailable. The identity-verification service is also unavailable, so an administrator reviews the request evidence manually",
      ],
      [
        "Human approval",
        "No account opens itself. An administrator confirms it",
      ],
      [
        "Access is role-scoped",
        "Verified owners see only their linked unit; authorized tenants see only enabled resident services; staff see only assigned work",
      ],
    ],
    loyaltyTitle: "Under one roof for years",
    loyaltyIntro: "Once you're in, real reasons to stay:",
    loyaltyItems: [
      [
        "Role-scoped views",
        "Verified owners see linked-unit services and authorized documents; authorized tenants see only enabled resident services; staff see only assigned work. Each screen shows its source state",
      ],
      [
        "Controlled access",
        "Only a verified owner can manage time-boxed tenant access, and only after real authentication and approved data access are active; tenants and staff cannot grant it themselves",
      ],
      [
        "Connected records",
        "Reservation, unit and title-deed references are linked only where an approved relationship exists; they are not presented as one complete record",
      ],
      [
        "Audited sensitive actions",
        "Verified sensitive flows such as approvals, access and finance leave a traceable record; universal action logging is not yet promised",
      ],
    ],
  },
  de: {
    eyebrow: "Nach der Anmeldung",
    likeTitle: "Klarer Ablauf, sicher, kein Spam",
    likeIntro: "Sie wissen genau, was nach dem Absenden passiert.",
    likeSteps: [
      [
        "Manuelle Identitätsprüfung",
        "Der Upload von Ausweis/Selfie ist derzeit nicht verfügbar. Der Dienst zur Identitätsprüfung ist ebenfalls nicht verfügbar, daher prüft ein Administrator die Anfragenachweise manuell",
      ],
      [
        "Menschliche Freigabe",
        "Kein Konto öffnet sich selbst. Ein Administrator bestätigt es",
      ],
      [
        "Ihr Zugriff ist rollenbezogen",
        "Verifizierte Eigentümer sehen nur ihre verknüpfte Einheit; berechtigte Mieter nur freigegebene Bewohnerfunktionen; Mitarbeitende nur zugewiesene Aufgaben",
      ],
    ],
    loyaltyTitle: "Jahrelang unter einem Dach",
    loyaltyIntro: "Wenn Sie drin sind, echte Gründe zu bleiben:",
    loyaltyItems: [
      [
        "Rollenbezogene Ansichten",
        "Verifizierte Eigentümer sehen Dienstleistungen und freigegebene Dokumente verknüpfter Einheiten; berechtigte Mieter nur freigeschaltete Bewohnerfunktionen; Mitarbeitende nur zugewiesene Aufgaben. Jede Ansicht zeigt ihren Quellenstatus",
      ],
      [
        "Kontrollierter Zugriff",
        "Nur ein verifizierter Eigentümer kann befristeten Mieterzugang verwalten, und erst wenn echte Authentifizierung und freigegebener Datenzugriff aktiv sind; Mieter und Mitarbeitende können ihn nicht selbst erteilen",
      ],
      [
        "Verknüpfte Vorgänge",
        "Reservierungs-, Einheiten- und Grundbuchreferenzen werden nur bei freigegebener Beziehung verknüpft; sie gelten nicht als ein vollständiger Datensatz",
      ],
      [
        "Prüfprotokoll für sensible Vorgänge",
        "Verifizierte sensible Abläufe wie Freigaben, Zutritt und Finanzen hinterlassen eine nachvollziehbare Spur; eine Protokollierung jeder Aktion wird noch nicht zugesagt",
      ],
    ],
  },
  ru: {
    eyebrow: "После регистрации",
    likeTitle: "Понятный процесс, безопасно, без спама",
    likeIntro: "Вы точно знаете, что происходит после отправки заявки.",
    likeSteps: [
      [
        "Ручная проверка личности",
        "Загрузка документа/селфи сейчас недоступна. Сервис проверки личности также недоступен, поэтому администратор вручную проверяет подтверждения заявки",
      ],
      [
        "Одобрение человеком",
        "Ни один аккаунт не открывается сам. Его подтверждает администратор",
      ],
      [
        "Доступ ограничен ролью",
        "Подтверждённые собственники видят только связанную квартиру; авторизованные жильцы, только разрешённые функции; сотрудники, только назначенную работу",
      ],
    ],
    loyaltyTitle: "Годами под одной крышей",
    loyaltyIntro: "Когда вы внутри, есть реальные причины остаться:",
    loyaltyItems: [
      [
        "Представление по роли",
        "Подтверждённые собственники видят услуги и разрешённые документы по связанной квартире; авторизованные жильцы, только открытые им функции; сотрудники, только назначенную работу. Каждый экран показывает источник данных",
      ],
      [
        "Управляемый доступ",
        "Только подтверждённый собственник может управлять ограниченным по времени доступом арендатора, и лишь после включения настоящей аутентификации и разрешённого доступа к данным; жильцы и сотрудники не могут выдать его сами",
      ],
      [
        "Связанные записи",
        "Ссылки на бронирование, квартиру и документ о собственности связываются только при одобренной связи; они не выдаются за одну полную запись",
      ],
      [
        "Аудит критически важных действий",
        "Проверенные критически важные процессы, одобрения, доступ и финансы, оставляют отслеживаемую запись; журналирование каждого действия пока не обещается",
      ],
    ],
  },
} satisfies Record<LocaleKey, unknown>

const likeIcons = [ClipboardCheck, UserCheck, LogIn]
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
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t.likeIntro}
          </p>
          <ol className="mt-6 space-y-3">
            {t.likeSteps.map(([title, body], i) => {
              const Icon = likeIcons[i]
              return (
                <li
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-card-foreground">
                      {title}
                    </p>
                    <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
                      {body}
                    </p>
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
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {t.loyaltyIntro}
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {t.loyaltyItems.map(([title, body], i) => {
              const Icon = loyaltyIcons[i]
              return (
                <div
                  key={title}
                  className="rounded-2xl border border-border bg-card p-4"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="mt-3 text-sm font-black text-card-foreground">
                    {title}
                  </p>
                  <p className="mt-0.5 text-xs leading-6 text-muted-foreground">
                    {body}
                  </p>
                </div>
              )
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
