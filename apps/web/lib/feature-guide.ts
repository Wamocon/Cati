// Localized content registry for the two in-dashboard help systems:
//   1. The "i" info button  (components/feature-info.tsx) reads `title` + `whatItDoes`.
//   2. The "coming soon" badge (components/coming-soon.tsx) reads `title` +
//      `comingSoon.summary` + `comingSoon.whatsNeeded`.
//
// Every string is written in plain, everyday business language for non-technical
// end users, in all four product languages (Turkish is the lead language, then
// English, German and Russian). No technical vocabulary, no placeholder dashes.
//
// This file only holds content. It renders nothing. The components decide where
// and how to show it, and later phases decide which page each key appears on.

export type FeatureGuideLocale = "tr" | "en" | "de" | "ru"

/** A single piece of text provided in each of the four product languages. */
export type LocalizedText = Record<FeatureGuideLocale, string>

/** The "coming soon" explanation for a feature that is not live yet. */
export interface FeatureComingSoon {
  /** What the feature will do, plus an honest note that it is on the way. */
  summary: LocalizedText
  /** What still has to be arranged, in plain words, before it can go live. */
  whatsNeeded: LocalizedText
}

/** One entry in the guide: a module or a feature that we can explain to users. */
export interface FeatureGuideEntry {
  /** Short, friendly heading shown at the top of the popover. */
  title: LocalizedText
  /** One or two plain sentences: what it does and how it helps the day. */
  whatItDoes: LocalizedText
  /** Present only for features that are genuinely not live yet. */
  comingSoon?: FeatureComingSoon
}

/** Resolved, single-language view returned by getFeatureGuide(). */
export interface ResolvedFeatureGuide {
  title: string
  whatItDoes: string
  comingSoon?: {
    summary: string
    whatsNeeded: string
  }
}

const SUPPORTED_LOCALES: readonly FeatureGuideLocale[] = ["tr", "en", "de", "ru"]

/**
 * Narrow any incoming locale string to one of the four supported languages.
 * Turkish is the lead language and is used as the fallback for anything else.
 */
export function resolveFeatureGuideLocale(locale: string): FeatureGuideLocale {
  return SUPPORTED_LOCALES.includes(locale as FeatureGuideLocale)
    ? (locale as FeatureGuideLocale)
    : "tr"
}

// ---------------------------------------------------------------------------
// The registry.
//
// Keys 1-17 are the dashboard modules (every module has `whatItDoes`).
// Keys 18-23 are the not-live features (each carries a `comingSoon` block).
// ---------------------------------------------------------------------------

export const FEATURE_GUIDE: Record<string, FeatureGuideEntry> = {
  // --- Dashboard modules ----------------------------------------------------

  dashboard: {
    title: {
      tr: "Genel bakış",
      en: "Overview",
      de: "Übersicht",
      ru: "Обзор",
    },
    whatItDoes: {
      tr: "Bu ekran, sitenizle ilgili en önemli bilgileri tek bir yerde özetler. Günün nasıl gittiğini bir bakışta görür ve nereye dikkat etmeniz gerektiğini kolayca anlarsınız.",
      en: "This screen brings the most important information about your property together in one place. You can see how the day is going at a glance and quickly understand where your attention is needed.",
      de: "Dieser Bildschirm fasst die wichtigsten Informationen zu Ihrer Immobilie an einer Stelle zusammen. Sie sehen auf einen Blick, wie der Tag läuft, und erkennen schnell, wo Sie eingreifen sollten.",
      ru: "Этот экран собирает самую важную информацию о вашем объекте в одном месте. Вы сразу видите, как идут дела за день, и быстро понимаете, чему стоит уделить внимание.",
    },
  },

  listings: {
    title: {
      tr: "İlanlar",
      en: "Listings",
      de: "Angebote",
      ru: "Объявления",
    },
    whatItDoes: {
      tr: "Satılık ve kiralık daireleri, fiyatlarını ve durumlarını burada listeler ve güncel tutarsınız. Böylece hangi dairelerin boş, dolu veya sunmaya hazır olduğunu her zaman bilirsiniz.",
      en: "Here you list and keep up to date the flats for sale or rent, their prices and their status. This way you always know which units are free, occupied or ready to offer.",
      de: "Hier führen und pflegen Sie die Wohnungen zum Verkauf oder zur Miete mit Preisen und Status. So wissen Sie jederzeit, welche Einheiten frei, belegt oder bereit sind.",
      ru: "Здесь вы ведёте и поддерживаете в актуальном виде квартиры на продажу и в аренду, их цены и статус. Так вы всегда знаете, какие объекты свободны, заняты или готовы к предложению.",
    },
  },

  leads: {
    title: {
      tr: "Aday müşteriler",
      en: "Prospects",
      de: "Interessenten",
      ru: "Потенциальные клиенты",
    },
    whatItDoes: {
      tr: "İlgilenen alıcı ve kiracı adaylarını, iletişim bilgilerini ve hangi aşamada olduklarını burada takip edersiniz. Her adayla zamanında ilgilenir ve hiçbir fırsatı kaçırmazsınız.",
      en: "Here you follow interested buyers and tenants, their contact details and which stage they are at. You stay in touch with every prospect on time and let no opportunity slip away.",
      de: "Hier verfolgen Sie interessierte Käufer und Mieter, ihre Kontaktdaten und in welcher Phase sie sich befinden. So bleiben Sie mit jedem Interessenten rechtzeitig in Kontakt und verpassen keine Gelegenheit.",
      ru: "Здесь вы отслеживаете заинтересованных покупателей и арендаторов, их контакты и этап, на котором они находятся. Вы вовремя связываетесь с каждым и не упускаете ни одной возможности.",
    },
  },

  calendar: {
    title: {
      tr: "Takvim",
      en: "Calendar",
      de: "Kalender",
      ru: "Календарь",
    },
    whatItDoes: {
      tr: "Randevuları, daire gösterimlerini ve planlı işleri tek bir takvimde toplar. Kimin ne zaman nerede olacağını görür ve çakışmaları önceden önlersiniz.",
      en: "It gathers appointments, viewings and planned work in a single calendar. You can see who is where and when, and avoid clashes before they happen.",
      de: "Er bündelt Termine, Besichtigungen und geplante Arbeiten in einem Kalender. Sie sehen, wer wann wo ist, und vermeiden Überschneidungen im Voraus.",
      ru: "Он объединяет встречи, показы и запланированные работы в одном календаре. Вы видите, кто где и когда будет, и заранее избегаете накладок.",
    },
  },

  finance: {
    title: {
      tr: "Finans",
      en: "Finance",
      de: "Finanzen",
      ru: "Финансы",
    },
    whatItDoes: {
      tr: "Aidatları, ödemeleri, gelirleri ve giderleri burada görür ve kaydedersiniz. Hangi dairenin borcu olduğunu ve paranın nereye gittiğini net biçimde takip edersiniz.",
      en: "Here you see and record dues, payments, income and expenses. You can clearly track which unit owes money and where the money is going.",
      de: "Hier sehen und erfassen Sie Beiträge, Zahlungen, Einnahmen und Ausgaben. Sie verfolgen genau, welche Einheit offene Beträge hat und wohin das Geld fließt.",
      ru: "Здесь вы видите и учитываете взносы, платежи, доходы и расходы. Вы чётко отслеживаете, у какой квартиры есть задолженность и куда уходят деньги.",
    },
  },

  documents: {
    title: {
      tr: "Belgeler",
      en: "Documents",
      de: "Dokumente",
      ru: "Документы",
    },
    whatItDoes: {
      tr: "Sözleşmeleri, tapuları, faturaları ve diğer önemli belgeleri güvenli biçimde tek yerde saklarsınız. İhtiyaç duyduğunuzda doğru belgeye hızlıca ulaşırsınız.",
      en: "You keep contracts, title deeds, invoices and other important papers safely in one place. When you need a document, you can find the right one quickly.",
      de: "Sie bewahren Verträge, Grundbuchauszüge, Rechnungen und andere wichtige Unterlagen sicher an einem Ort auf. Wenn Sie ein Dokument brauchen, finden Sie es schnell.",
      ru: "Вы храните договоры, документы на собственность, счета и другие важные бумаги в одном надёжном месте. Когда документ понадобится, вы быстро найдёте нужный.",
    },
  },

  compliance: {
    title: {
      tr: "Uyum",
      en: "Compliance",
      de: "Regelkonformität",
      ru: "Соответствие требованиям",
    },
    whatItDoes: {
      tr: "Kimlik doğrulama ve yasal gereklilikleri burada takip eder, eksik veya süresi geçmiş belgeleri görürsünüz. Böylece sitenizi kurallara uygun ve güvende tutarsınız.",
      en: "Here you track identity checks and legal requirements and see which papers are missing or out of date. This keeps your property in line with the rules and safe.",
      de: "Hier verfolgen Sie Identitätsprüfungen und gesetzliche Vorgaben und sehen, welche Nachweise fehlen oder abgelaufen sind. So halten Sie Ihre Immobilie regelkonform und sicher.",
      ru: "Здесь вы отслеживаете проверки личности и требования закона и видите, какие документы отсутствуют или просрочены. Так ваш объект остаётся в рамках правил и в безопасности.",
    },
  },

  users: {
    title: {
      tr: "Kullanıcılar ve roller",
      en: "Users and roles",
      de: "Benutzer und Rollen",
      ru: "Пользователи и роли",
    },
    whatItDoes: {
      tr: "Ekip üyelerini, ev sahiplerini ve kiracıları buradan ekler ve her birinin neyi görebileceğini belirlersiniz. Herkes yalnızca kendi işine ait bilgilere erişir.",
      en: "Here you add team members, owners and tenants and decide what each of them is allowed to see. Everyone reaches only the information that belongs to their role.",
      de: "Hier fügen Sie Teammitglieder, Eigentümer und Mieter hinzu und legen fest, was jeder sehen darf. Jeder sieht nur die Informationen, die zu seiner Rolle gehören.",
      ru: "Здесь вы добавляете сотрудников, собственников и арендаторов и определяете, что каждому разрешено видеть. Каждый получает доступ только к тем сведениям, которые относятся к его роли.",
    },
  },

  reports: {
    title: {
      tr: "Raporlar",
      en: "Reports",
      de: "Berichte",
      ru: "Отчёты",
    },
    whatItDoes: {
      tr: "Gelir, doluluk, tahsilat ve iş yükü gibi konuları anlaşılır özetler ve grafikler halinde sunar. Kararlarınızı tahmine değil, gerçek rakamlara dayandırırsınız.",
      en: "It presents topics such as income, occupancy, collections and workload as clear summaries and charts. You can base your decisions on real figures instead of guesswork.",
      de: "Er stellt Themen wie Einnahmen, Auslastung, Zahlungseingänge und Arbeitslast als verständliche Zusammenfassungen und Diagramme dar. So treffen Sie Entscheidungen auf Basis echter Zahlen statt Vermutungen.",
      ru: "Он представляет такие темы, как доходы, заполняемость, сборы и нагрузка, в виде понятных сводок и графиков. Вы принимаете решения на основе реальных цифр, а не догадок.",
    },
  },

  tickets: {
    title: {
      tr: "Servis talepleri",
      en: "Service requests",
      de: "Serviceanfragen",
      ru: "Заявки на обслуживание",
    },
    whatItDoes: {
      tr: "Arıza, bakım ve temizlik gibi işleri buradan açar, ekibe atar ve tamamlanana kadar takip edersiniz. Hiçbir talep unutulmaz ve sakinler durumu görebilir.",
      en: "Here you open jobs such as repairs, maintenance and cleaning, assign them to the team and follow them until they are done. No request is forgotten and residents can see the status.",
      de: "Hier eröffnen Sie Aufgaben wie Reparaturen, Wartung und Reinigung, weisen sie dem Team zu und verfolgen sie bis zur Erledigung. Keine Anfrage geht verloren und Bewohner sehen den Stand.",
      ru: "Здесь вы создаёте задачи по ремонту, обслуживанию и уборке, назначаете их команде и ведёте до завершения. Ни одна заявка не теряется, а жильцы видят её статус.",
    },
  },

  communications: {
    title: {
      tr: "İletişim",
      en: "Communication",
      de: "Kommunikation",
      ru: "Общение",
    },
    whatItDoes: {
      tr: "Sakinler, ev sahipleri ve ekiple yazışmalarınızı tek bir yerde toplar. Kimin ne zaman ne söylediğini kaydeder ve önemli mesajların kaybolmasını önler.",
      en: "It keeps your messages with residents, owners and the team in one place. It records who said what and when, so important messages do not get lost.",
      de: "Sie bündelt Ihre Nachrichten mit Bewohnern, Eigentümern und dem Team an einem Ort. Sie hält fest, wer wann was gesagt hat, damit wichtige Nachrichten nicht verloren gehen.",
      ru: "Она собирает вашу переписку с жильцами, собственниками и командой в одном месте. Она фиксирует, кто что и когда сказал, чтобы важные сообщения не терялись.",
    },
  },

  settings: {
    title: {
      tr: "Ayarlar",
      en: "Settings",
      de: "Einstellungen",
      ru: "Настройки",
    },
    whatItDoes: {
      tr: "Şirket bilgileri, dil tercihi ve genel çalışma kuralları gibi ayarları buradan düzenlersiniz. Platformu kendi çalışma biçiminize göre uyarlarsınız.",
      en: "Here you adjust settings such as company details, language preference and general working rules. You shape the platform to match the way you work.",
      de: "Hier passen Sie Einstellungen wie Firmenangaben, Sprachwahl und allgemeine Arbeitsregeln an. So richten Sie die Plattform nach Ihrer Arbeitsweise ein.",
      ru: "Здесь вы настраиваете такие параметры, как данные компании, выбор языка и общие правила работы. Вы подстраиваете платформу под свой стиль работы.",
    },
  },

  wallet: {
    title: {
      tr: "Cüzdan",
      en: "Wallet",
      de: "Guthaben",
      ru: "Кошелёк",
    },
    whatItDoes: {
      tr: "Bakiyenizi görür, para yükler ve ek hizmetlerin ödemesini buradan yaparsınız. Harcamalarınızı tek bir yerden kolayca takip edersiniz.",
      en: "You can see your balance, add funds and pay for extra services from here. You keep track of your spending easily in one place.",
      de: "Sie sehen Ihr Guthaben, laden Geld auf und bezahlen hier zusätzliche Leistungen. So behalten Sie Ihre Ausgaben an einem Ort im Blick.",
      ru: "Вы видите свой баланс, пополняете его и оплачиваете отсюда дополнительные услуги. Вы легко следите за своими расходами в одном месте.",
    },
  },

  activities: {
    title: {
      tr: "Etkinlikler ve ek hizmetler",
      en: "Activities and extra services",
      de: "Aktivitäten und Zusatzleistungen",
      ru: "Мероприятия и дополнительные услуги",
    },
    whatItDoes: {
      tr: "Site içindeki etkinlikleri ve ek hizmetleri burada görür, katılır veya talep edersiniz. Spor, temizlik ya da sosyal etkinlik gibi seçenekleri kolayca değerlendirirsiniz.",
      en: "Here you see the activities and extra services in the community and join or request them. You can easily make use of options such as sports, cleaning or social events.",
      de: "Hier sehen Sie Aktivitäten und Zusatzleistungen in der Anlage und nehmen daran teil oder fordern sie an. Angebote wie Sport, Reinigung oder gesellige Veranstaltungen nutzen Sie mühelos.",
      ru: "Здесь вы видите мероприятия и дополнительные услуги в комплексе и записываетесь на них или заказываете их. Вы легко пользуетесь такими вариантами, как спорт, уборка или общие мероприятия.",
    },
  },

  guardianship: {
    title: {
      tr: "Çocuk hesapları",
      en: "Children's accounts",
      de: "Kinderkonten",
      ru: "Детские аккаунты",
    },
    whatItDoes: {
      tr: "Çocuğunuz için güvenli ve sınırlı bir hesap oluşturur, neyi görüp yapabileceğini siz belirlersiniz. Böylece aileniz platformu birlikte ve güven içinde kullanır.",
      en: "You create a safe, limited account for your child and decide what they can see and do. This way your family uses the platform together with peace of mind.",
      de: "Sie richten für Ihr Kind ein sicheres, eingeschränktes Konto ein und bestimmen, was es sehen und tun darf. So nutzt Ihre Familie die Plattform gemeinsam und mit gutem Gefühl.",
      ru: "Вы создаёте для ребёнка безопасный аккаунт с ограничениями и сами решаете, что он может видеть и делать. Так ваша семья пользуется платформой вместе и спокойно.",
    },
  },

  vendor_invoices: {
    title: {
      tr: "Sağlayıcı faturaları",
      en: "Provider invoices",
      de: "Dienstleisterrechnungen",
      ru: "Счета поставщиков",
    },
    whatItDoes: {
      tr: "Hizmet sağlayıcılar, yaptıkları işler için faturalarını buradan hazırlar ve gönderir. Yönetim, faturaları tek yerde görüp inceleyerek ödemeleri düzenli tutar.",
      en: "Service providers prepare and submit invoices for their completed work here. Management can see and review all invoices in one place and keep payments in order.",
      de: "Dienstleister erstellen und übermitteln hier ihre Rechnungen für erledigte Arbeiten. Die Verwaltung sieht und prüft alle Rechnungen an einem Ort und hält Zahlungen geordnet.",
      ru: "Поставщики услуг готовят и отправляют здесь счета за выполненную работу. Управление видит и проверяет все счета в одном месте и держит платежи в порядке.",
    },
  },

  admin: {
    title: {
      tr: "Kontrol merkezi",
      en: "Control center",
      de: "Kontrollzentrum",
      ru: "Центр управления",
    },
    whatItDoes: {
      tr: "Yöneticinin tüm platformu tek ekrandan yönettiği yerdir. Kişileri, yetkileri, onayları ve genel durumu buradan görür ve düzenlersiniz.",
      en: "This is where the administrator runs the whole platform from a single screen. You can see and manage people, permissions, approvals and the overall status from here.",
      de: "Hier steuert die Verwaltung die gesamte Plattform von einem einzigen Bildschirm aus. Sie sehen und verwalten Personen, Berechtigungen, Freigaben und den Gesamtstatus an einem Ort.",
      ru: "Отсюда администратор управляет всей платформой с одного экрана. Вы видите и настраиваете людей, права, согласования и общее состояние в одном месте.",
    },
  },

  public_reports: {
    title: {
      tr: "Herkese açık sorun bildirimleri",
      en: "Public problem reports",
      de: "Öffentliche Problemmeldungen",
      ru: "Публичные сообщения о проблемах",
    },
    whatItDoes: {
      tr: "Sakinlerin ve ziyaretçilerin QR kod veya afiş üzerinden gönderdiği sorun bildirimlerini burada görür ve incelersiniz. Uygun olanları onaylayıp iş emrine dönüştürür, uygunsuz veya tekrarlı olanları gerekçesiyle geri çevirirsiniz. Böylece gerçek talepler kayda geçer ve doğru ekibe ulaşır.",
      en: "Here you see and review the problem reports that residents and visitors send in through a QR code or poster. You approve the suitable ones and turn them into a work order, and turn down the unsuitable or duplicate ones with a reason. This way genuine requests are recorded and reach the right team.",
      de: "Hier sehen und prüfen Sie die Problemmeldungen, die Bewohner und Besucher über einen QR-Code oder ein Plakat senden. Passende Meldungen geben Sie frei und wandeln sie in einen Auftrag um, unpassende oder doppelte lehnen Sie mit einer Begründung ab. So werden echte Anliegen erfasst und erreichen das richtige Team.",
      ru: "Здесь вы видите и проверяете сообщения о проблемах, которые жильцы и посетители отправляют через QR-код или плакат. Подходящие вы одобряете и превращаете в заявку, а неподходящие или повторные отклоняете с указанием причины. Так реальные обращения фиксируются и попадают к нужной команде.",
    },
  },

  // --- Not-live features (coming soon) --------------------------------------

  payments: {
    title: {
      tr: "Kart ve banka ödemesi",
      en: "Card and bank payments",
      de: "Karten- und Bankzahlung",
      ru: "Оплата картой и через банк",
    },
    whatItDoes: {
      tr: "Bakiye yüklemenizi ve hizmet ödemelerinizi doğrudan kart veya banka ile yapmanızı sağlar. Ödeme yaptığınız anda bakiyeniz kendiliğinden güncellenir.",
      en: "It lets you top up your balance and pay for services directly by card or bank. The moment you pay, your balance updates on its own.",
      de: "Damit laden Sie Ihr Guthaben auf und bezahlen Leistungen direkt per Karte oder Bank. Sobald Sie zahlen, wird Ihr Guthaben von selbst aktualisiert.",
      ru: "С ней вы пополняете баланс и оплачиваете услуги прямо картой или через банк. Как только вы платите, баланс обновляется сам.",
    },
    comingSoon: {
      summary: {
        tr: "Gerçek kart ve banka ödemesi yakında geliyor. Şu anda bakiye yalnızca deneme amaçlı ekleniyor ve gerçek bir tahsilat yapılmıyor.",
        en: "Real card and bank payments are coming soon. For now, balance is added only as a demo and no real charge is taken.",
        de: "Echte Karten- und Bankzahlungen kommen bald. Derzeit wird Guthaben nur zu Demonstrationszwecken hinzugefügt und es erfolgt keine echte Abbuchung.",
        ru: "Настоящая оплата картой и через банк скоро появится. Пока баланс пополняется только в демонстрационном режиме, реальные списания не выполняются.",
      },
      whatsNeeded: {
        tr: "Devreye almak için bir ödeme sağlayıcısı ile sözleşme ve gerekli erişim anahtarları gerekiyor. Bunlar hazır olduğunda ödemeler gerçek olarak çalışacak.",
        en: "To switch it on, we need a contract with a payment provider and the required access keys. Once these are in place, payments will work for real.",
        de: "Zur Freischaltung brauchen wir einen Vertrag mit einem Zahlungsanbieter und die nötigen Zugangsschlüssel. Sobald diese vorliegen, funktionieren Zahlungen echt.",
        ru: "Чтобы включить это, нужны договор с платёжным провайдером и необходимые ключи доступа. Как только они появятся, оплата заработает по-настоящему.",
      },
    },
  },

  e_invoice: {
    title: {
      tr: "Resmi e-Fatura gönderimi",
      en: "Official e-invoice submission",
      de: "Offizielle E-Rechnung",
      ru: "Официальный электронный счёт (e-Fatura)",
    },
    whatItDoes: {
      tr: "Faturaları resmi e-Fatura olarak hazırlar ve yetkili kuruma otomatik iletir. Böylece faturalarınız yasal olarak geçerli ve kayıtlı olur.",
      en: "It prepares invoices as official e-invoices and submits them automatically to the authorities. This makes your invoices legally valid and on record.",
      de: "Sie erstellt Rechnungen als offizielle E-Rechnungen und übermittelt sie automatisch an die Behörde. So sind Ihre Rechnungen rechtlich gültig und erfasst.",
      ru: "Она оформляет счета как официальные электронные счета и автоматически отправляет их в уполномоченный орган. Так ваши счета становятся юридически действительными и учтёнными.",
    },
    comingSoon: {
      summary: {
        tr: "Resmi e-Fatura gönderimi yakında geliyor. Şu anda sağlayıcı faturaları yalnızca kurum içinde hazırlanıp saklanıyor, resmi olarak iletilmiyor.",
        en: "Official e-invoice submission is coming soon. For now, provider invoices are only prepared and kept internally, not officially submitted.",
        de: "Die offizielle E-Rechnungs-Übermittlung kommt bald. Derzeit werden Dienstleisterrechnungen nur intern erstellt und aufbewahrt, aber nicht offiziell übermittelt.",
        ru: "Отправка официального электронного счёта скоро появится. Пока счета поставщиков только готовятся и хранятся внутри, официально они не отправляются.",
      },
      whatsNeeded: {
        tr: "Devreye almak için yetkili bir e-Fatura hizmet ortağı ve resmi mali sertifika gerekiyor. Bunlar sağlandığında faturalar resmi olarak gönderilecek.",
        en: "To switch it on, we need an accredited e-invoice service partner and an official fiscal certificate. Once these are provided, invoices will be submitted officially.",
        de: "Zur Freischaltung brauchen wir einen zugelassenen E-Rechnungs-Dienstleister und ein offizielles Steuerzertifikat. Sobald diese vorliegen, werden Rechnungen offiziell übermittelt.",
        ru: "Чтобы включить это, нужны аккредитованный оператор электронных счетов и официальный налоговый сертификат. Когда они появятся, счета будут отправляться официально.",
      },
    },
  },

  ai_semantic_search: {
    title: {
      tr: "Belgelerde akıllı arama",
      en: "Smart search inside documents",
      de: "Intelligente Dokumentensuche",
      ru: "Умный поиск по документам",
    },
    whatItDoes: {
      tr: "Sözleşme, tapu ve notlar gibi belgelerin içinde anlam bazlı arama yapar ve sorunuza en uygun bölümü bulup gösterir.",
      en: "It searches inside documents such as contracts, title deeds and notes by meaning, and shows the passage that best answers your question.",
      de: "Sie durchsucht Dokumente wie Verträge, Grundbuchauszüge und Notizen nach Bedeutung und zeigt den passendsten Abschnitt zu Ihrer Frage.",
      ru: "Она ищет по смыслу внутри документов, таких как договоры, выписки и заметки, и показывает фрагмент, который лучше всего отвечает на ваш вопрос.",
    },
    comingSoon: {
      summary: {
        tr: "Belgelerin içinde akıllı arama yakında geliyor. Şu anda yardımcı yalnızca yetkiniz dahilindeki kayıtlı verilere göre yanıt veriyor.",
        en: "Smart search inside documents is coming soon. For now, the assistant answers only from the records you are authorized to see.",
        de: "Die intelligente Suche in Dokumenten kommt bald. Derzeit antwortet der Assistent nur anhand der Daten, die Sie sehen dürfen.",
        ru: "Умный поиск по документам скоро появится. Пока помощник отвечает только по данным, которые вам разрешено видеть.",
      },
      whatsNeeded: {
        tr: "Devreye almak için kurum içi yapay zeka servisinin belge gömme (embedding) özelliğini desteklemesi gerekiyor. Bu sağlandığında belge araması açılacak.",
        en: "To switch it on, the on-prem AI service needs to support document embeddings. Once that is available, document search will be enabled.",
        de: "Zur Freischaltung muss der interne KI-Dienst Dokument-Embeddings unterstützen. Sobald das verfügbar ist, wird die Dokumentensuche aktiviert.",
        ru: "Чтобы включить это, внутренний ИИ-сервис должен поддерживать эмбеддинги документов. Когда это станет доступно, поиск по документам будет включён.",
      },
    },
  },

  access_control: {
    title: {
      tr: "Otomatik kapı ve geçiş kontrolü",
      en: "Automatic door and access control",
      de: "Automatische Tür- und Zutrittssteuerung",
      ru: "Автоматический контроль дверей и доступа",
    },
    whatItDoes: {
      tr: "Kapıların ve ortak alanların uygulama üzerinden kendiliğinden açılıp kapanmasını sağlar. Yetkili kişilere geçiş izni verir, gerektiğinde izni anında geri alır.",
      en: "It lets doors and shared areas open and close on their own through the app. It grants access to authorized people and can withdraw it instantly when needed.",
      de: "Damit öffnen und schließen sich Türen und Gemeinschaftsbereiche von selbst über die App. Sie gewährt berechtigten Personen Zutritt und entzieht ihn bei Bedarf sofort.",
      ru: "С ней двери и общие зоны открываются и закрываются сами через приложение. Она даёт доступ уполномоченным людям и при необходимости сразу его отзывает.",
    },
    comingSoon: {
      summary: {
        tr: "Otomatik kapı ve geçiş kontrolü yakında geliyor. Şu anda geçiş izinleri elle veriliyor ve kapılar uygulama üzerinden kendiliğinden açılmıyor.",
        en: "Automatic door and access control is coming soon. For now, access is granted by hand and doors do not open on their own through the app.",
        de: "Die automatische Tür- und Zutrittssteuerung kommt bald. Derzeit wird Zutritt von Hand vergeben und Türen öffnen sich nicht von selbst über die App.",
        ru: "Автоматический контроль дверей и доступа скоро появится. Пока доступ выдаётся вручную, и двери не открываются сами через приложение.",
      },
      whatsNeeded: {
        tr: "Devreye almak için bir kapı donanımı sağlayıcısı ve bu donanımın uygulamaya bağlanması gerekiyor. Bağlantı kurulduğunda geçişler kendiliğinden yönetilecek.",
        en: "To switch it on, we need a door hardware supplier and a connection between that hardware and the app. Once the connection is set up, access will be managed on its own.",
        de: "Zur Freischaltung brauchen wir einen Anbieter für Türtechnik und eine Verbindung dieser Technik mit der App. Ist die Verbindung eingerichtet, wird der Zutritt von selbst gesteuert.",
        ru: "Чтобы включить это, нужны поставщик дверного оборудования и его подключение к приложению. Когда подключение будет готово, доступ будет управляться сам.",
      },
    },
  },

  messaging: {
    title: {
      tr: "WhatsApp, SMS ve e-posta bildirimleri",
      en: "WhatsApp, SMS and email notifications",
      de: "WhatsApp-, SMS- und E-Mail-Benachrichtigungen",
      ru: "Уведомления в WhatsApp, SMS и по электронной почте",
    },
    whatItDoes: {
      tr: "Önemli bilgileri sakinlere ve ekibe WhatsApp, kısa mesaj veya e-posta ile kendiliğinden iletir. Herkes gereken haberi zamanında, beklemeden alır.",
      en: "It sends important information to residents and the team by WhatsApp, text message or email on its own. Everyone receives the news they need on time, without waiting.",
      de: "Sie sendet wichtige Informationen von selbst per WhatsApp, SMS oder E-Mail an Bewohner und Team. So erhält jeder die nötige Nachricht rechtzeitig und ohne Wartezeit.",
      ru: "Она сама отправляет важную информацию жильцам и команде через WhatsApp, SMS или электронную почту. Каждый вовремя получает нужное сообщение, без ожидания.",
    },
    comingSoon: {
      summary: {
        tr: "WhatsApp, SMS ve e-posta bildirimleri yakında geliyor. Şu anda mesajlar yalnızca uygulama içinde görünüyor, dışarıya kendiliğinden gönderilmiyor.",
        en: "WhatsApp, SMS and email notifications are coming soon. For now, messages appear only inside the app and are not sent out on their own.",
        de: "WhatsApp-, SMS- und E-Mail-Benachrichtigungen kommen bald. Derzeit erscheinen Nachrichten nur in der App und werden nicht von selbst nach außen versendet.",
        ru: "Уведомления в WhatsApp, SMS и по электронной почте скоро появятся. Пока сообщения видны только внутри приложения и не отправляются наружу сами.",
      },
      whatsNeeded: {
        tr: "Devreye almak için bir mesajlaşma sağlayıcısı, onaylı gönderici numaraları ve e-posta adresleri gerekiyor. Bunlar hazır olduğunda bildirimler kendiliğinden gidecek.",
        en: "To switch it on, we need a messaging provider along with approved sender numbers and email addresses. Once these are ready, notifications will be sent on their own.",
        de: "Zur Freischaltung brauchen wir einen Nachrichtenanbieter sowie freigegebene Absendernummern und E-Mail-Adressen. Sind diese bereit, werden Benachrichtigungen von selbst versendet.",
        ru: "Чтобы включить это, нужны провайдер сообщений, а также подтверждённые номера отправителя и адреса электронной почты. Когда они будут готовы, уведомления начнут отправляться сами.",
      },
    },
  },

  bank_reconciliation: {
    title: {
      tr: "Otomatik banka mutabakatı",
      en: "Automatic bank reconciliation",
      de: "Automatischer Bankabgleich",
      ru: "Автоматическая банковская сверка",
    },
    whatItDoes: {
      tr: "Banka hareketlerini kendiliğinden alır ve doğru ödemeler ve dairelerle eşleştirir. Kim ödedi, kim ödemedi sorusunu elle uğraşmadan yanıtlarsınız.",
      en: "It brings in bank movements on its own and matches them to the right payments and units. You can answer who has paid and who has not without any manual work.",
      de: "Sie holt Kontobewegungen von selbst ein und ordnet sie den richtigen Zahlungen und Einheiten zu. So beantworten Sie ohne Handarbeit, wer bezahlt hat und wer nicht.",
      ru: "Она сама загружает движения по счёту и сопоставляет их с нужными платежами и квартирами. Вы без ручной работы узнаёте, кто заплатил, а кто нет.",
    },
    comingSoon: {
      summary: {
        tr: "Otomatik banka mutabakatı yakında geliyor. Şu anda banka hareketleri elle giriliyor ve ödemelerle elle eşleştiriliyor.",
        en: "Automatic bank reconciliation is coming soon. For now, bank movements are entered by hand and matched to payments manually.",
        de: "Der automatische Bankabgleich kommt bald. Derzeit werden Kontobewegungen von Hand erfasst und manuell den Zahlungen zugeordnet.",
        ru: "Автоматическая банковская сверка скоро появится. Пока движения по счёту вводятся вручную и вручную сопоставляются с платежами.",
      },
      whatsNeeded: {
        tr: "Devreye almak için bankanızdan gelen bir hesap hareketi bağlantısı gerekiyor. Bu bağlantı kurulduğunda hareketler kendiliğinden alınıp eşleştirilecek.",
        en: "To switch it on, we need a bank data feed from your bank. Once this feed is connected, movements will be brought in and matched on their own.",
        de: "Zur Freischaltung brauchen wir eine Kontodaten-Anbindung Ihrer Bank. Ist diese Anbindung eingerichtet, werden Bewegungen von selbst eingelesen und zugeordnet.",
        ru: "Чтобы включить это, нужен канал банковских данных от вашего банка. Когда он будет подключён, движения будут загружаться и сопоставляться сами.",
      },
    },
  },

  ai_automation: {
    title: {
      tr: "Otomatik yapay zekâ işlemleri",
      en: "Automatic AI actions",
      de: "Automatische KI-Aktionen",
      ru: "Автоматические действия ИИ",
    },
    whatItDoes: {
      tr: "Yapay zekânın önerdiği bazı işlemleri, sizin izninize göre kendiliğinden yürütmesini sağlar. Tekrar eden işleri hızlandırır ve size zaman kazandırır.",
      en: "It lets the assistant carry out some of the actions it suggests on its own, in line with your approval. It speeds up repetitive work and saves you time.",
      de: "Damit führt der Assistent einige der von ihm vorgeschlagenen Aktionen nach Ihrer Freigabe von selbst aus. Das beschleunigt wiederkehrende Aufgaben und spart Ihnen Zeit.",
      ru: "С ней помощник по вашему разрешению сам выполняет некоторые из предложенных действий. Это ускоряет повторяющуюся работу и экономит ваше время.",
    },
    comingSoon: {
      summary: {
        tr: "Otomatik yapay zekâ işlemleri yakında geliyor. Şu anda yapay zekâ yalnızca öneride bulunuyor ve her işlemi bir kişi onaylıyor.",
        en: "Automatic AI actions are coming soon. For now, the assistant only makes suggestions and a person approves every action.",
        de: "Automatische KI-Aktionen kommen bald. Derzeit macht der Assistent nur Vorschläge und eine Person gibt jede Aktion frei.",
        ru: "Автоматические действия ИИ скоро появятся. Пока помощник только предлагает, и каждое действие одобряет человек.",
      },
      whatsNeeded: {
        tr: "Devreye almak için otomatik onayların açılması ve hangi işlemlerin kişi onayı olmadan yapılabileceğine dair net kuralların belirlenmesi gerekiyor.",
        en: "To switch it on, we need automatic approvals to be turned on and clear rules on which actions may run without a person's approval.",
        de: "Zur Freischaltung müssen automatische Freigaben aktiviert und klare Regeln festgelegt werden, welche Aktionen ohne die Freigabe einer Person laufen dürfen.",
        ru: "Чтобы включить это, нужно включить автоматические одобрения и установить чёткие правила, какие действия можно выполнять без одобрения человека.",
      },
    },
  },

  settings_notification_rules: {
    title: {
      tr: "Bildirim kuralları",
      en: "Notification rules",
      de: "Benachrichtigungsregeln",
      ru: "Правила уведомлений",
    },
    whatItDoes: {
      tr: "Borç, son tarih, giriş, çıkış ve eksik belge gibi durumlarda kimin ne zaman uyarı alacağını belirlemenizi sağlar. Böylece önemli hiçbir konu gözden kaçmaz.",
      en: "It lets you decide who gets an alert, and when, for things like dues, deadlines, check-in, check-out and missing documents. This way nothing important is missed.",
      de: "Damit legen Sie fest, wer wann eine Benachrichtigung erhält, etwa bei Beiträgen, Fristen, Check-in, Check-out und fehlenden Dokumenten. So geht nichts Wichtiges verloren.",
      ru: "Позволяет задать, кто и когда получает уведомление о взносах, сроках, заезде, выезде и недостающих документах. Так ничего важного не упускается.",
    },
    comingSoon: {
      summary: {
        tr: "Bildirim kurallarını buradan kendiniz düzenleme özelliği yakında geliyor. Şu anda bu kartta gösterilen kurallar sabittir ve bu ekrandan değiştirilemez.",
        en: "The option to set these notification rules yourself is coming soon. For now, the rules shown on this card are fixed and cannot be changed from this screen.",
        de: "Die Möglichkeit, diese Benachrichtigungsregeln selbst festzulegen, kommt bald. Derzeit sind die auf dieser Karte gezeigten Regeln fest und über diesen Bildschirm nicht änderbar.",
        ru: "Возможность самостоятельно настраивать эти правила уведомлений скоро появится. Пока правила на этой карточке зафиксированы и с этого экрана не меняются.",
      },
      whatsNeeded: {
        tr: "Devreye almak için önce dış bildirim kanallarının (WhatsApp, SMS, e-posta) bağlanması ve kural düzenleme ekranının açılması gerekiyor.",
        en: "To switch it on, the outside notification channels (WhatsApp, SMS, email) need to be connected first, and the rule editor needs to be opened up.",
        de: "Zur Freischaltung müssen zuerst die externen Kanäle (WhatsApp, SMS, E-Mail) verbunden und der Regel-Editor freigeschaltet werden.",
        ru: "Чтобы включить это, сначала нужно подключить внешние каналы (WhatsApp, SMS, e-mail) и открыть редактор правил.",
      },
    },
  },

  settings_security_policy: {
    title: {
      tr: "Güvenlik politikası",
      en: "Security policy",
      de: "Sicherheitsrichtlinie",
      ru: "Политика безопасности",
    },
    whatItDoes: {
      tr: "Kimin hangi bilgileri görebileceğini, hassas finans işlemlerinin nasıl korunacağını ve yapay zekâ kararlarının insan onayından geçmesini düzenler. Amacı verilerinizi güvende tutmaktır.",
      en: "It governs who can see which information, how sensitive finance actions are protected and that AI decisions pass through human approval. Its purpose is to keep your data safe.",
      de: "Sie regelt, wer welche Informationen sehen darf, wie sensible Finanzaktionen geschützt sind und dass KI-Entscheidungen eine menschliche Freigabe durchlaufen. Ihr Zweck ist es, Ihre Daten sicher zu halten.",
      ru: "Определяет, кто какую информацию может видеть, как защищены чувствительные финансовые действия и что решения ИИ проходят одобрение человеком. Она нужна, чтобы сохранить ваши данные в безопасности.",
    },
    comingSoon: {
      summary: {
        tr: "Güvenlik politikasını bu ekrandan düzenleme özelliği yakında geliyor. Şu anda bu kurallar sistem tarafından uygulanır ve bu karttan değiştirilemez.",
        en: "The option to edit the security policy from this screen is coming soon. For now, these rules are applied by the system and cannot be changed from this card.",
        de: "Die Möglichkeit, die Sicherheitsrichtlinie über diesen Bildschirm zu bearbeiten, kommt bald. Derzeit werden diese Regeln vom System angewendet und sind über diese Karte nicht änderbar.",
        ru: "Возможность настраивать политику безопасности с этого экрана скоро появится. Пока эти правила применяются системой и с этой карточки не меняются.",
      },
      whatsNeeded: {
        tr: "Devreye almak için yönetici onaylı bir güvenlik ayarları ekranı ve her değişikliği kayıt altına alan bir onay akışı gerekiyor.",
        en: "To switch it on, we need an admin-approved security settings screen and an approval flow that records every change.",
        de: "Zur Freischaltung brauchen wir einen von der Verwaltung freigegebenen Sicherheitseinstellungs-Bildschirm und einen Freigabeablauf, der jede Änderung protokolliert.",
        ru: "Чтобы включить это, нужны экран настроек безопасности с одобрением администратора и порядок согласования, фиксирующий каждое изменение.",
      },
    },
  },
}

/**
 * Look up one entry and return it already resolved to a single language.
 * Returns null when the key is unknown, so callers can safely skip rendering.
 */
export function getFeatureGuide(
  key: string,
  locale: string
): ResolvedFeatureGuide | null {
  const entry = FEATURE_GUIDE[key]
  if (!entry) return null

  const lang = resolveFeatureGuideLocale(locale)
  const resolved: ResolvedFeatureGuide = {
    title: entry.title[lang],
    whatItDoes: entry.whatItDoes[lang],
  }

  if (entry.comingSoon) {
    resolved.comingSoon = {
      summary: entry.comingSoon.summary[lang],
      whatsNeeded: entry.comingSoon.whatsNeeded[lang],
    }
  }

  return resolved
}

/** Every key that carries a `comingSoon` block, for convenience/tests. */
export function getComingSoonKeys(): string[] {
  return Object.keys(FEATURE_GUIDE).filter((key) => FEATURE_GUIDE[key].comingSoon)
}
