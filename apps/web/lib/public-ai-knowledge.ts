// Public AI concierge knowledge base for the landing pages.
import { resolveChatLanguageFromMessage } from "./language-detection"

//
// Guardrail by construction: this module (and the /api/ai/public-chat route
// that uses it) has NO access to live 1Cati data. The visitor-facing assistant
// knows the product story — what 1Cati is, why it exists, which advantages it
// brings — but it can never surface a balance, a resident, a document or any
// other internal record, because none of that is ever loaded into its context.
// Questions that ask for private data get a polite refusal that points to
// registration or the management contact instead.

export type PublicAiLocale = "tr" | "en" | "de" | "ru"

export type PublicAiTopic =
  | "what-is"
  | "advantages"
  | "registration"
  | "tenant-access"
  | "reporting"
  | "security-kvkk"
  | "finance-features"
  | "service-features"
  | "languages"
  | "project-info"
  | "pricing"
  | "demo"
  | "private-data"
  | "general"

export type PublicAiSourceId =
  | "product-overview"
  | "registration-access"
  | "privacy-security"
  | "finance-service"
  | "new-level-site"
  | "support-handoff"

export interface PublicAiSource {
  id: PublicAiSourceId
  title: string
  section: string
}

export type PublicAiOutcome =
  | "answered"
  | "handoff_recommended"
  | "refused_private_data"
  | "uncertain"

export interface PublicAiAnswer {
  reply: string
  topic: PublicAiTopic
  confidence: number
  outcome: PublicAiOutcome
  shouldEscalate: boolean
  escalationReason: string | null
  sources: PublicAiSource[]
}

export function resolvePublicAiLocale(value: string | null | undefined): PublicAiLocale {
  return (["tr", "en", "de", "ru"] as const).includes(value as PublicAiLocale)
    ? (value as PublicAiLocale)
    : "tr"
}

function messageWithoutBrandToken(message: string): string {
  return message
    .replace(/1\s*[ÇçCc]at[ıiIİ]/g, " ")
    .replace(/\b[ÇçCc]at[ıiIİ]\b/g, " ")
}

export function detectPublicAiLocaleFromMessage(
  message: string
): PublicAiLocale | null {
  const text = messageWithoutBrandToken(message)

  if (/[А-Яа-яЁё]/.test(text)) return "ru"

  if (
    /[çğıİşÇĞİŞ]|\b(nedir|nasıl|nasil|neden|kayıt|kayit|kaydol|malik|kiracı|kiraci|hangi|servis|servisleri|iste|isteyebilir|örnek|ornek|örneğin|ornegin|restoran|tiyatro|etkinlik|gezi|tur|aidat|borç|borc|güvenli|guvenli|fiyat|ücret|ucret|şikayet|sikayet|başvur|basvur|daire|oturuyor|türkçe|turkce)\b/i.test(
      text
    )
  ) {
    return "tr"
  }

  if (
    /[äöüßÄÖÜ]|\b(was|wie|warum|vorteil|nutzen|unterschied|registrier|anmeld|mieter|eigentümer|kosten|preis|datenschutz|sicherheit|konto|zugang|deutsch|gebühr|schulden|saldo|wohnt)\b/i.test(
      text
    )
  ) {
    return "de"
  }

  if (
    /\b(what|how|why|who|do|does|owner|tenant|register|registration|benefit|advantage|price|cost|security|privacy|data|information|details|collect|share|retain|delete|payment|service|demo|language|report|issue|help|safe|is|are)\b/i.test(
      text
    )
  ) {
    return "en"
  }

  return null
}

export function resolvePublicAiResponseLocale(
  message: string,
  fallbackLocale: string | null | undefined
): PublicAiLocale {
  return resolveChatLanguageFromMessage(message, resolvePublicAiLocale(fallbackLocale))
}

// Order matters: the private-data guard wins over everything else.
const topicMatchers: Array<[PublicAiTopic, RegExp]> = [
  [
    "private-data",
    /(borcu|borç durumu|bakiyesi|kim oturuyor|kimin|oturan|sakini|telefon numarası|kişisel veri(?:yi|si(?:ni)?|leri(?:ni)?)\s+(?:göster|ver|paylaş|açıkla)|şifre|hesap bilgisi|debt of|balance of|who lives|who owns|resident of|phone number of|password|wer wohnt|schulden von|saldo von|kontostand von|telefonnummer von|passwort|кто живет|кто живёт|долг квартиры|баланс квартиры|телефон владельца|пароль)/i,
  ],
  [
    "registration",
    /(kayıt|kaydol|üye|erişim tale|başvur|register|sign ?up|apply|access request|registrier|anmeld|zugang beantrag|регистрац|зарегистрир|заявк|доступ получ)/i,
  ],
  [
    "tenant-access",
    /(kiracı|davet kodu|süreli erişim|tenant|invite code|time-?boxed|mieter|einladungscode|zeitzugang|арендатор|код приглашени|временн[а-яё]* доступ)/i,
  ],
  [
    "reporting",
    /(bildirim|sorun bildir|arıza|şikayet|report|issue|complaint|qr|meldung|melden|störung|beschwerde|сообщить|жалоб|неисправност|проблем)/i,
  ],
  [
    "security-kvkk",
    /(kvkk|kbs|kimlik|güvenli|gizlilik|veri koruma|security|privacy|identity|gdpr|data protection|sicherheit|datenschutz|ausweis|identität|безопасност|конфиденциальн|персональн[а-яё]* данн|удостоверени)/i,
  ],
  [
    "finance-features",
    /(aidat|ödeme|depozito|fatura|finans|muhasebe|dues|payment|deposit|invoice|finance|accounting|beitrag|zahlung|kaution|rechnung|finanz|buchhaltung|взнос|платеж|платёж|депозит|счет|счёт|финанс|бухгалтер)/i,
  ],
  [
    "service-features",
    /(servis|temizlik|bakım|onarım|talep|spa|restoran|tiyatro|etkinlik|gezi|quad|jeep|sla|service|cleaning|maintenance|repair|request|spa|restaurant|theatre|theater|event|excursion|quad|jeep|reinigung|wartung|reparatur|anfrage|restaurant|theater|veranstaltung|ausflug|сервис|уборк|обслуживани|ремонт|заявк|спа|ресторан|театр|мероприяти|экскурс|джип|квадро)/i,
  ],
  [
    "languages",
    /(dil|dili|türkçe|rusça|language|turkish|russian|sprache|deutsch|türkisch|russisch|язык|языках|турецк|русск)/i,
  ],
  [
    "project-info",
    /(new level|avsallar|daire sayısı|blok|havuz|plaj|otel|olanak|amenit|units|blocks|pool|beach|hotel|wohnung|einheiten|strand|ausstattung|квартир|блок|бассейн|пляж|отел|удобств)/i,
  ],
  [
    "pricing",
    /(fiyat|ücret|maliyet|ne kadar|price|cost|how much|fee|preis|kosten|was kostet|gebühr|цена|стоимост|сколько стоит|тариф)/i,
  ],
  [
    "demo",
    /(demo|deneme|test|canlı|try|live demo|ausprobier|попробовать|демо)/i,
  ],
  [
    "advantages",
    /(neden|avantaj|fayda|fark|why|advantage|benefit|difference|warum|vorteil|nutzen|unterschied|почему|преимуществ|польза|отличи)/i,
  ],
  [
    "what-is",
    /(nedir|ne işe|nasıl çalışır|what is|how does|was ist|wie funktioniert|что такое|как работает)/i,
  ],
]

function normalizePublicIntentText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replaceAll("ı", "i")
    .replaceAll("ß", "ss")
    .replaceAll("ё", "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
}

function isPrivacyPolicyIntent(message: string) {
  const text = normalizePublicIntentText(message)

  // Do not let a negated aside containing the word "data" steal an otherwise
  // clear product intent. Explicit privacy questions with negative wording
  // (for example "won't you delete my data?") still match the retention terms
  // below.
  const privacyAsideNegated =
    /\b(?:(?:not asking (?:about|for)|do not need|don t need|dont need|no need for) (?:any )?(?:(?:personal |user )?data(?: collection| protection)?|privacy(?: information| policy)?|data protection)|(?:do not|don t|dont) need information about privacy)\b/.test(text) ||
    /\b(veri(?:ler)? hakkinda sormuyorum|veri toplama hakkinda sormuyorum|gizlilik hakkinda sormuyorum|veri istemiyorum)\b/.test(text) ||
    /\b(ich frage nicht nach daten|ich frage nicht nach datenschutz|ich brauche keine daten|ich brauche keine datenschutzinformationen)\b/.test(text) ||
    /\b(?:я не спрашиваю о данных|я не спрашиваю о конфиденциальности|мне не нужны данные)\b/.test(text)
  const hasCompetingIntent =
    /\b(register|registration|sign up|price|cost|demo|kayit|fiyat|demo|registrier|preis|kosten|регистрац|цена|демо)\b/.test(
      text
    )
  if (privacyAsideNegated && hasCompetingIntent) return false

  if (
    /\b(kvkk|gdpr|dsgvo|datenschutz|data protection|privacy policy|gizlilik|veri koruma|kisisel verilerin korunmasi|конфиденциальност|защита данных|персональных данных)\b/.test(
      text
    )
  ) {
    return true
  }

  const turkishData =
    /\b(veri(?:m|ler|leri|lerim|lerimi|lerinizi)?|hangi (?:kisisel )?(?:veri(?:leri)?|bilgileri)|veri guvenligi|bilgi(?:m|ler|leri|lerim|lerimi)?|detaylarim|kisisel bilgi(?:lerim|ler)?|kimlik veri(?:m|si|lerim)?)\b/.test(
      text
    )
  const turkishControl =
    /\b(guvende|guvenli|korun\w*|sakla\w*|ne kadar sure tut\w*|tutuyor|tutuyorsunuz|tutma suresi|sil\w*|saklama suresi|topl\w*|paylas\w*|aktar\w*|kullan\w*|isle\w*|sat\w*|ucuncu taraf\w*)\b/.test(text)
  const englishData =
    /\b(my (?:personal )?(?:data|information|details)|personal (?:data|information|details)|(?:user|customer|visitor|resident|identity) (?:data|information|details)|(?:information|details) about me|the (?:data|information|details) i (?:give|provide)(?: you)?|(?:what|which) (?:personal |user )?(?:data|information|details))\b/.test(text)
  const englishControl =
    /\b(safe|secure|protected|encrypt\w*|stor(?:e|ed|ing)|keep|kept|retention|retain(?:ed|ing|s)?|delet(?:e|ed|ing|es)|eras(?:e|ed|ing|es)|collect(?:ed|ing|s)?|gather(?:ed|ing|s)?|process(?:ed|ing|es)?|use(?:d|s|ing)?|share(?:d|s|ing)?|disclos(?:e|ed|ing|es)|transfer(?:red|ring|s)?|sell|sold|third part\w*|how long)\b/.test(text)
  const germanData =
    /\b(meine (?:daten|angaben|informationen)|personliche daten|personenbezogen\w* (?:daten|angaben)|identitatsdaten|nutzerdaten|welche\w* (?:personenbezogen\w* )?(?:daten|angaben|informationen))\b/.test(text)
  const germanControl =
    /\b(sicher|geschutzt|verschlussel\w*|speicher\w*|aufbewahrt|aufbewahrung|speicherdauer|losch\w*|erheb\w*|sammel\w*|teil\w*|weitergeb\w*|geb\w* .* weiter|verarbeit\w*|nutz\w*|verkauf\w*|dritte\w*|wie lange)\b/.test(text)
  const russianData = /(мои данные|личные данные|персональные данные|данные удостоверения|какие (?:персональные )?данные)/.test(text)
  const russianControl =
    /(безопасн|защищен|шифр|хранят|хранение|срок хранения|удал|собира|обрабатыва|использу|переда|делятся|прода|третьим лиц|как долго)/.test(text)

  return (
    (turkishData && turkishControl) ||
    (englishData && englishControl) ||
    (germanData && germanControl) ||
    (russianData && russianControl)
  )
}

export function classifyPublicAiTopic(message: string): PublicAiTopic {
  const privateDataMatcher = topicMatchers.find(([topic]) => topic === "private-data")?.[1]
  if (privateDataMatcher?.test(message)) return "private-data"
  if (isPrivacyPolicyIntent(message)) return "security-kvkk"

  for (const [topic, pattern] of topicMatchers) {
    if (topic === "private-data") continue
    if (pattern.test(message)) return topic
  }
  return "general"
}

type TopicCopy = Record<PublicAiTopic, string>

const answers: Record<PublicAiLocale, TopicCopy> = {
  tr: {
    "what-is":
      "1Çatı, Ataberk Estate'in Yeni Seviye Premium gibi büyük konut sitelerini yönettiği işletim sistemidir. Finans, servis, belge, rezervasyon ve erişim kararları tek kayıtta buluşur; malik, kiracı, personel ve yönetim aynı sistemde, her rol yalnızca kendi kapsamını görerek çalışır.",
    advantages:
      "Fark şurada: satış vaadi günlük operasyona bağlanır. Bakiyenizi telefon etmeden görürsünüz, servis talepleriniz kanıtla kapanır, belgeleriniz doğrulanabilir durumda tek yerde durur ve her erişim kararının gerekçesi vardır. Dört dilde aynı derinlik, her işlem kayıtlı ve izlenebilir.",
    registration:
      "Kayıt bu sayfadan yapılır: rolünüzü seçin (Malik, Kiracı veya Personel), bilgilerinizi girin ve talebi gönderin. Meşruiyet kontrolünden sonra erişimi bir yönetici açar; hiçbir hesap kendiliğinden aktifleşmez. Malik ve kiracı kimliği veri minimizasyonu ve korumalı erişimle doğrulanır; kesin saklama ve silme koşulları onaylı KVKK politikasına bağlıdır ve yönetimden teyit edilmelidir.",
    "tenant-access":
      "Kiracılar için en iyi yol malik davet kodudur: malikiniz panelinden tek kullanımlık, süreli bir kod üretir. Erişim malikin seçtiği süreyle sınırlıdır ve süre dolunca kendiliğinden kapanır. Sorumluluğu kira boyunca malik taşır; bu, sitedeki herkes için güvenli bir zincir oluşturur.",
    reporting:
      "Bir sorun bildirmek için hesap gerekmez. Sayfadaki bildirim formunu kullanın ya da sahadaki QR posterini okutun; konum ve kısa açıklama yeterli. Her bildirim triyaj kuyruğuna düşer, referans numarası alır ve çözülene kadar takip edilir.",
    "security-kvkk":
      "Güvenlik tasarımın merkezinde: veri minimizasyonu, rol bazlı erişim ve işlem kaydı uygulanır; bu asistan kişisel veya finansal veriye erişemez. Kesin saklama ve silme süreleri, müşteri ve hukuk tarafından onaylanmış KVKK politikasına göre belirlenir; sistem şu anda otomatik silme veya yasal süre garantisi vermez. Kendi durumunuz için yönetim ya da KVKK irtibatıyla WhatsApp üzerinden teyit edin.",
    "finance-features":
      "Malikler kendi dairelerinin muhasebe kaydını, ödeme geçmişini ve varsa borç durumunu doğrudan görür; kimsenin özet okumasına gerek kalmaz. Aidat, depozito ve tahsilat tek deftere işlenir, kayıtlı defter girişleri sonradan değiştirilemez. Kişisel finans verileri yalnızca giriş yaptıktan sonra, kendi yetkinizle görünür.",
    "service-features":
      "Servis talebi açarsınız; durumu, SLA süresini ve işin foto/video kanıtını sistemden izlersiniz. Temizlik, bakım, transfer, spa, restoran, tiyatro/etkinlik ve gezi-tur gibi talepler sohbet mesajlarında kaybolmaz; doğru iç ekibe veya dış sağlayıcıya yönlendirilir ve kapatma onayıyla biter.",
    languages:
      "1Çatı dört dilde çalışır: Türkçe, İngilizce, Almanca ve Rusça — hepsi aynı derinlikte. Uluslararası malik tabanı için tasarlandı; siz hangi dilde rahatsanız sistemi o dilde kullanırsınız.",
    "project-info":
      "Yeni Seviye Premium, Avsallar'da 52.000 m² proje alanı üzerinde 7 blok ve 769 daireden oluşur; plaja 900 metre mesafede, 5 yıldızlı otel altyapısı ve 22 sosyal olanak sunar. 1Çatı bu sitenin tamamını tek işletim modelinde yönetir.",
    pricing:
      "Fiyat ve sözleşme koşulları daireye ve pakete göre değişir; bu yüzden en doğru bilgiyi satış ekibi verir. WhatsApp butonundan doğrudan yönetime ulaşabilir ya da kayıt formundan bilgilerinizi bırakabilirsiniz, ekip sizi arar.",
    demo:
      "Kontrollü ve yalnızca sentetik veri kullanan QA/demo ortamında rol seçimiyle farklı kullanıcı akışları incelenebilir. Müşteriye açık veya üretim ortamlarında onaylı kimlik doğrulama gerekir; şifresiz rol değiştirme sunulmaz. Uygun demo erişimini ekipten WhatsApp üzerinden isteyebilirsiniz.",
    "private-data":
      "Bu asistan yalnızca 1Çatı'yı tanıtır; kişisel, finansal veya daireye özel verilere erişimi yoktur ve bunları paylaşamaz. Kendi verilerinizi görmek için kayıt olup erişim aldıktan sonra sisteme girin; acil bir konu için WhatsApp üzerinden yönetime ulaşın.",
    general:
      "Size 1Çatı'yı anlatmak için buradayım: sistemin ne olduğu, avantajları, kayıt, kiracı erişimi, bildirim kanalı, güvenlik ve Yeni Seviye Premium hakkında sorabilirsiniz. Kişisel verilere erişimim yok; bu tür konular için kayıt olun ya da WhatsApp'tan yönetime yazın.",
  },
  en: {
    "what-is":
      "1Çatı is the operating system Ataberk Estate uses to run large residences like New Level Premium. Finance, service, documents, reservations and access decisions meet on one record; owners, tenants, staff and management work in the same system, each role seeing only its own scope.",
    advantages:
      "The difference: the sales promise is wired to daily operations. You see your balance without calling anyone, service requests close with proof, your documents sit verified in one place, and every access decision has a stated reason. Four languages at the same depth, every action logged and traceable.",
    registration:
      "You register right on this page: pick your role (Owner, Tenant or Staff), fill in your details and send the request. After a legitimacy check an administrator opens your access; no account activates on its own. Owner and tenant identity is verified with data minimization and protected access; exact retention and deletion terms depend on the approved KVKK policy and must be confirmed with management.",
    "tenant-access":
      "For tenants the best route is the owner invite code: your owner generates a one-time, time-boxed code from their dashboard. Access lasts only for the window the owner sets and closes on its own. The owner carries responsibility for the whole lease, which keeps the chain of trust intact for everyone.",
    reporting:
      "You don't need an account to report an issue. Use the report form on this page or scan the on-site QR poster; a location and a short note are enough. Every report lands in the triage queue, gets a reference number and is tracked to resolution.",
    "security-kvkk":
      "Security is built around data minimization, role-based access and action logging; this assistant has no access to personal or financial data. Exact retention and deletion periods are governed by a KVKK policy that still requires client and legal approval, so the system does not promise automatic deletion or a legal retention period. Confirm your case with management or the privacy contact on WhatsApp.",
    "finance-features":
      "Owners see their own unit's ledger, payment history and any debt directly; nobody has to read them a summary. Dues, deposits and collections live in one ledger, and posted entries can never be altered afterwards. Personal financial data is visible only after you log in, within your own permissions.",
    "service-features":
      "You open a service request and follow its status, SLA and photo/video proof of the work in the system. Cleaning, maintenance, transfer, spa, restaurant, theatre/event and excursion or tour requests do not get lost in chat threads; they are routed to the right internal team or external provider and end with closure approval.",
    languages:
      "1Çatı works in four languages: Turkish, English, German and Russian, each at the same depth. It was built for an international ownership base, so you use the system in whichever language you are comfortable with.",
    "project-info":
      "New Level Premium in Avsallar spans 52,000 m² with 7 blocks and 769 units, 900 metres from the beach, with 5-star hotel infrastructure and 22 amenities. 1Çatı runs the entire site on one operating model.",
    pricing:
      "Prices and contract terms depend on the unit and package, so the sales team gives the accurate answer. Reach management directly via the WhatsApp button, or leave your details in the registration form and the team will call you.",
    demo:
      "A controlled QA/demo environment that contains only synthetic data may offer role selection for reviewing user journeys. Customer-facing and production environments require approved authentication and never offer passwordless role switching. Ask the team on WhatsApp for the appropriate demo access.",
    "private-data":
      "This assistant only explains 1Çatı; it has no access to personal, financial or unit-specific data and cannot share any. To see your own data, register and log in once your access is opened; for urgent matters contact management via WhatsApp.",
    general:
      "I'm here to explain 1Çatı: what the system is, its advantages, registration, tenant access, the reporting channel, security and New Level Premium. I have no access to personal data; for that, please register or write to management on WhatsApp.",
  },
  de: {
    "what-is":
      "1Çatı ist das Betriebssystem, mit dem Ataberk Estate große Wohnanlagen wie Neues Niveau Premium führt. Finanzen, Service, Dokumente, Reservierungen und Zutrittsentscheidungen treffen sich in einem Datensatz; Eigentümer, Mieter, Personal und Verwaltung arbeiten im selben System, jede Rolle sieht nur ihren eigenen Bereich.",
    advantages:
      "Der Unterschied: Das Verkaufsversprechen ist mit dem täglichen Betrieb verdrahtet. Sie sehen Ihren Saldo ohne Anruf, Serviceanfragen schließen mit Nachweis, Ihre Dokumente liegen verifiziert an einem Ort, und jede Zutrittsentscheidung hat eine Begründung. Vier Sprachen in gleicher Tiefe, jede Aktion protokolliert und nachvollziehbar.",
    registration:
      "Sie registrieren sich direkt auf dieser Seite: Rolle wählen (Eigentümer, Mieter oder Mitarbeiter), Daten eintragen, Anfrage senden. Nach einer Legitimitätsprüfung öffnet ein Administrator Ihren Zugang; kein Konto aktiviert sich von allein. Die Identität von Eigentümern und Mietern wird mit Datenminimierung und geschütztem Zugriff verifiziert; genaue Aufbewahrungs- und Löschregeln hängen von der freigegebenen KVKK-Richtlinie ab und sind mit der Verwaltung zu klären.",
    "tenant-access":
      "Für Mieter ist der Einladungscode des Eigentümers der beste Weg: Ihr Eigentümer erzeugt im Dashboard einen Einmal-Code mit Frist. Der Zugang gilt nur für das gewählte Zeitfenster und läuft von selbst ab. Die Verantwortung trägt der Eigentümer über die gesamte Mietzeit, das hält die Vertrauenskette für alle intakt.",
    reporting:
      "Für eine Meldung brauchen Sie kein Konto. Nutzen Sie das Formular auf dieser Seite oder scannen Sie das QR-Poster vor Ort; Ort und kurze Beschreibung genügen. Jede Meldung landet in der Triage, erhält eine Referenznummer und wird bis zur Lösung verfolgt.",
    "security-kvkk":
      "Sicherheit basiert auf Datenminimierung, rollenbasiertem Zugriff und Aktionsprotokollen; dieser Assistent hat keinen Zugriff auf persönliche oder finanzielle Daten. Genaue Aufbewahrungs- und Löschfristen richten sich nach einer noch durch Kunde und Rechtsprüfung freizugebenden KVKK-Richtlinie; das System verspricht keine automatische Löschung oder gesetzliche Frist. Bitte den Einzelfall per WhatsApp mit Verwaltung oder Datenschutzkontakt klären.",
    "finance-features":
      "Eigentümer sehen Kontostand, Zahlungshistorie und etwaige Schulden ihrer Einheit direkt; niemand muss ihnen eine Zusammenfassung vorlesen. Beiträge, Kautionen und Einzüge stehen in einem Ledger, gebuchte Einträge sind nachträglich unveränderlich. Persönliche Finanzdaten sind erst nach dem Login sichtbar, im Rahmen Ihrer eigenen Rechte.",
    "service-features":
      "Sie stellen eine Serviceanfrage und verfolgen Status, SLA und Foto-/Video-Nachweis der Arbeit im System. Reinigung, Wartung, Transfer, Spa, Restaurant, Theater/Events und Ausflüge oder Touren gehen nicht im Chat verloren; sie werden dem richtigen internen Team oder externen Anbieter zugeordnet und enden mit Abschlussfreigabe.",
    languages:
      "1Çatı arbeitet in vier Sprachen: Türkisch, Englisch, Deutsch und Russisch, jeweils gleich tief. Es wurde für eine internationale Eigentümerbasis gebaut; Sie nutzen das System in der Sprache, in der Sie sich wohlfühlen.",
    "project-info":
      "Neues Niveau Premium in Avsallar umfasst 52.000 m² Projektfläche mit 7 Blöcken und 769 Einheiten, 900 Meter vom Strand, mit 5-Sterne-Hotelinfrastruktur und 22 Annehmlichkeiten. 1Çatı führt die gesamte Anlage in einem Betriebsmodell.",
    pricing:
      "Preise und Vertragskonditionen hängen von Einheit und Paket ab; die genaue Auskunft gibt das Vertriebsteam. Erreichen Sie die Verwaltung direkt über den WhatsApp-Button oder hinterlassen Sie Ihre Daten im Registrierungsformular, das Team meldet sich.",
    demo:
      "Eine kontrollierte QA-/Demo-Umgebung mit ausschließlich synthetischen Daten kann eine Rollenauswahl für die Prüfung der Nutzerwege anbieten. Kunden- und Produktionsumgebungen verlangen eine freigegebene Authentifizierung und bieten keinen passwortlosen Rollenwechsel. Den passenden Demo-Zugang erhalten Sie über das Team per WhatsApp.",
    "private-data":
      "Dieser Assistent erklärt nur 1Çatı; er hat keinen Zugriff auf persönliche, finanzielle oder einheitsbezogene Daten und kann sie nicht weitergeben. Ihre eigenen Daten sehen Sie nach Registrierung und Freischaltung im System; bei dringenden Anliegen erreichen Sie die Verwaltung per WhatsApp.",
    general:
      "Ich bin hier, um Ihnen 1Çatı zu erklären: was das System ist, seine Vorteile, Registrierung, Mieterzugang, Meldekanal, Sicherheit und Neues Niveau Premium. Auf persönliche Daten habe ich keinen Zugriff; dafür registrieren Sie sich bitte oder schreiben der Verwaltung auf WhatsApp.",
  },
  ru: {
    "what-is":
      "1Çatı — операционная система, с помощью которой Ataberk Estate управляет крупными комплексами вроде «Новый уровень Премиум». Финансы, сервис, документы, бронирования и решения о доступе встречаются в одной записи; собственники, арендаторы, персонал и управление работают в одной системе, и каждая роль видит только свою зону.",
    advantages:
      "Отличие в том, что обещание продаж связано с ежедневной работой. Вы видите свой баланс без звонков, заявки закрываются с подтверждением, документы лежат проверенными в одном месте, а у каждого решения о доступе есть причина. Четыре языка с одинаковой глубиной, каждое действие фиксируется и отслеживается.",
    registration:
      "Регистрация прямо на этой странице: выберите роль (Собственник, Арендатор или Персонал), заполните данные и отправьте заявку. После проверки легитимности доступ открывает администратор; ни один аккаунт не активируется сам. Личность собственников и арендаторов проверяется с минимизацией данных и защищённым доступом; точные сроки хранения и удаления зависят от утверждённой политики KVKK и уточняются у управления.",
    "tenant-access":
      "Для арендаторов лучший путь — код приглашения от собственника: он создаёт в кабинете одноразовый код со сроком. Доступ действует только в выбранный период и закрывается сам. Ответственность несёт собственник весь срок аренды, что сохраняет цепочку доверия для всех.",
    reporting:
      "Чтобы сообщить о проблеме, аккаунт не нужен. Используйте форму на этой странице или отсканируйте QR-плакат на территории; достаточно места и короткого описания. Каждое сообщение попадает в очередь триажа, получает номер и отслеживается до решения.",
    "security-kvkk":
      "Безопасность основана на минимизации данных, ролевом доступе и журналировании действий; у этого ассистента нет доступа к личным или финансовым данным. Точные сроки хранения и удаления определяются политикой KVKK, которую ещё должны утвердить клиент и юристы; система не обещает автоматическое удаление или установленный законом срок. Уточните свой случай у управления или контакта по приватности через WhatsApp.",
    "finance-features":
      "Собственники видят реестр своей квартиры, историю платежей и задолженность напрямую; никто не пересказывает им сводку. Взносы, депозиты и сборы ведутся в одном журнале, проведённые записи нельзя изменить задним числом. Личные финансовые данные видны только после входа, в рамках ваших прав.",
    "service-features":
      "Вы создаёте заявку и следите за статусом, SLA и фото/видео-подтверждением работ в системе. Уборка, обслуживание, трансфер, spa, ресторан, театр/мероприятия и экскурсии или туры не теряются в чатах: заявка направляется нужной внутренней команде или внешнему поставщику и закрывается с одобрением.",
    languages:
      "1Çatı работает на четырёх языках: турецком, английском, немецком и русском, с одинаковой глубиной. Система создана для международной базы собственников; пользуйтесь ею на том языке, который вам удобен.",
    "project-info":
      "«Новый уровень Премиум» в Авсалларе занимает 52 000 м², включает 7 блоков и 769 квартир, находится в 900 метрах от пляжа, с инфраструктурой отеля 5* и 22 удобствами. 1Çatı ведёт весь комплекс в одной операционной модели.",
    pricing:
      "Цены и условия договора зависят от квартиры и пакета, точную информацию даёт отдел продаж. Свяжитесь с управлением напрямую через кнопку WhatsApp или оставьте данные в форме регистрации, и команда вам перезвонит.",
    demo:
      "В контролируемой QA/демо-среде только с синтетическими данными может быть доступен выбор роли для проверки пользовательских сценариев. Клиентская и производственная среды требуют утверждённой аутентификации и не допускают переключение ролей без пароля. Подходящий демо-доступ можно запросить у команды через WhatsApp.",
    "private-data":
      "Этот ассистент только рассказывает о 1Çatı; у него нет доступа к личным, финансовым или квартирным данным, и он не может ими делиться. Свои данные вы увидите после регистрации и открытия доступа; по срочным вопросам напишите управлению в WhatsApp.",
    general:
      "Я здесь, чтобы рассказать о 1Çatı: что это за система, её преимущества, регистрация, доступ арендатора, канал сообщений, безопасность и «Новый уровень Премиум». Доступа к личным данным у меня нет; для этого зарегистрируйтесь или напишите управлению в WhatsApp.",
  },
}

const publicAiSourceCatalog: Record<PublicAiSourceId, PublicAiSource> = {
  "product-overview": {
    id: "product-overview",
    title: "1Cati public product knowledge",
    section: "System purpose, roles and operating model",
  },
  "registration-access": {
    id: "registration-access",
    title: "Registration and access workflow",
    section: "Owner, tenant and staff onboarding rules",
  },
  "privacy-security": {
    id: "privacy-security",
    title: "Security, KVKK and role-boundary notes",
    section: "Private data refusal and retention boundaries",
  },
  "finance-service": {
    id: "finance-service",
    title: "Finance and service operations knowledge",
    section: "Ledger, ticket, SLA and proof workflows",
  },
  "new-level-site": {
    id: "new-level-site",
    title: "New Level Premium project facts",
    section: "Site, amenity and public project details",
  },
  "support-handoff": {
    id: "support-handoff",
    title: "Public support handoff policy",
    section: "WhatsApp, sales, registration and public report routing",
  },
}

const topicSourceIds: Record<PublicAiTopic, PublicAiSourceId[]> = {
  "what-is": ["product-overview", "new-level-site"],
  advantages: ["product-overview", "finance-service", "privacy-security"],
  registration: ["registration-access", "privacy-security", "support-handoff"],
  "tenant-access": ["registration-access", "privacy-security"],
  reporting: ["support-handoff", "finance-service"],
  "security-kvkk": ["privacy-security", "registration-access"],
  "finance-features": ["finance-service", "privacy-security"],
  "service-features": ["finance-service", "support-handoff"],
  languages: ["product-overview"],
  "project-info": ["new-level-site"],
  pricing: ["support-handoff", "new-level-site"],
  demo: ["product-overview", "support-handoff"],
  "private-data": ["privacy-security", "support-handoff"],
  general: ["product-overview", "support-handoff"],
}

const topicConfidence: Record<PublicAiTopic, number> = {
  "what-is": 0.94,
  advantages: 0.92,
  registration: 0.9,
  "tenant-access": 0.9,
  reporting: 0.88,
  "security-kvkk": 0.9,
  "finance-features": 0.88,
  "service-features": 0.88,
  languages: 0.96,
  "project-info": 0.95,
  pricing: 0.72,
  demo: 0.92,
  "private-data": 0.98,
  general: 0.42,
}

const topicOutcome: Record<PublicAiTopic, PublicAiOutcome> = {
  "what-is": "answered",
  advantages: "answered",
  registration: "answered",
  "tenant-access": "answered",
  reporting: "answered",
  "security-kvkk": "handoff_recommended",
  "finance-features": "answered",
  "service-features": "answered",
  languages: "answered",
  "project-info": "answered",
  pricing: "handoff_recommended",
  demo: "answered",
  "private-data": "refused_private_data",
  general: "uncertain",
}

const escalationCopy: Record<PublicAiLocale, Record<PublicAiOutcome, string | null>> = {
  tr: {
    answered: null,
    handoff_recommended: "Bu konu fiyat/sözleşme kararı gerektirir; satış veya site yönetimiyle WhatsApp üzerinden netleştirilmelidir.",
    refused_private_data: "Bu konu kişisel veya daireye özel veri içerebilir; güvenli yanıt için giriş yapın veya yönetimle WhatsApp üzerinden iletişime geçin.",
    uncertain: "Bilgi tabanında bu soruya güvenli ve net yanıt yok; bir kişinin yanıtlaması daha doğru olur.",
  },
  en: {
    answered: null,
    handoff_recommended: "This needs a price or contract decision, so sales or site management should confirm it on WhatsApp.",
    refused_private_data: "This may involve personal or unit-specific data; please log in or contact management on WhatsApp for a safe answer.",
    uncertain: "The knowledge base does not contain a reliable answer for this; a person should handle it.",
  },
  de: {
    answered: null,
    handoff_recommended: "Das braucht eine Preis- oder Vertragsentscheidung; Vertrieb oder Verwaltung sollten es per WhatsApp bestätigen.",
    refused_private_data: "Das kann persönliche oder einheitsbezogene Daten betreffen; bitte anmelden oder die Verwaltung per WhatsApp kontaktieren.",
    uncertain: "Die Wissensbasis enthält dafür keine verlässliche Antwort; ein Mensch sollte übernehmen.",
  },
  ru: {
    answered: null,
    handoff_recommended: "Для этого нужны цена или договорные условия; отдел продаж или управление должны подтвердить ответ в WhatsApp.",
    refused_private_data: "Это может касаться персональных данных или конкретной квартиры; войдите в систему или напишите управлению в WhatsApp.",
    uncertain: "В базе знаний нет надежного ответа на этот вопрос; лучше передать его человеку.",
  },
}

const privacyHandoffCopy: Record<PublicAiLocale, string> = {
  tr: "Kesin saklama, silme veya paylaşım koşulları için yönetim ya da KVKK irtibatı WhatsApp üzerinden teyit vermelidir.",
  en: "Management or the privacy contact should confirm the exact retention, deletion or sharing terms on WhatsApp.",
  de: "Verwaltung oder Datenschutzkontakt sollten die genauen Aufbewahrungs-, Lösch- oder Weitergaberegeln per WhatsApp bestätigen.",
  ru: "Точные условия хранения, удаления или передачи данных следует подтвердить у управления или контакта по приватности через WhatsApp.",
}

export function getPublicAiSources(topic: PublicAiTopic): PublicAiSource[] {
  return topicSourceIds[topic].map((id) => publicAiSourceCatalog[id])
}

export function answerPublicAiQuestion(
  message: string,
  locale: PublicAiLocale
): PublicAiAnswer {
  const topic = classifyPublicAiTopic(message)
  const outcome = topicOutcome[topic]
  return {
    reply: answers[locale][topic],
    topic,
    confidence: topicConfidence[topic],
    outcome,
    shouldEscalate: outcome !== "answered",
    escalationReason:
      topic === "security-kvkk"
        ? privacyHandoffCopy[locale]
        : escalationCopy[locale][outcome],
    sources: getPublicAiSources(topic),
  }
}

// Suggested starter questions shown as chips in the concierge widget.
export const publicAiSuggestions: Record<PublicAiLocale, string[]> = {
  tr: [
    "1Çatı nedir?",
    "Malik olarak avantajım ne?",
    "Nasıl kayıt olurum?",
    "Verilerim güvende mi?",
  ],
  en: [
    "What is 1Çatı?",
    "What do I gain as an owner?",
    "How do I register?",
    "Is my data safe?",
  ],
  de: [
    "Was ist 1Çatı?",
    "Was habe ich als Eigentümer davon?",
    "Wie registriere ich mich?",
    "Sind meine Daten sicher?",
  ],
  ru: [
    "Что такое 1Çatı?",
    "Что я получаю как собственник?",
    "Как зарегистрироваться?",
    "Мои данные в безопасности?",
  ],
}

const localeNames: Record<PublicAiLocale, string> = {
  tr: "Turkish",
  en: "English",
  de: "German",
  ru: "Russian",
}

// System prompt for the optional local AI gateway. The model receives ONLY this
// curated product knowledge — no live data is ever loaded into its context —
// and is instructed to refuse anything private. Do not weaken these rules.
export function getPublicAiSystemPrompt(locale: PublicAiLocale): string {
  return [
    "You are the public concierge assistant on the 1Cati / New Level Premium landing page, speaking to prospects and residents who are NOT logged in.",
    `Always answer in ${localeNames[locale]}, in a warm, concise, human tone. No markdown, no tables, no code blocks.`,
    "You may only use the product knowledge below. You have NO access to any internal 1Cati data.",
    "If the product knowledge does not clearly answer the question, say so and recommend WhatsApp handoff instead of guessing.",
    "Ground every answer in these source sections: product overview, registration/access workflow, privacy/security notes, finance/service operations, New Level Premium project facts and public support handoff policy.",
    "HARD RULES: Never state or invent balances, debts, resident names, unit occupancy, documents, phone numbers, passwords or any personal or unit-specific data. If asked, politely explain that you only cover product information and that personal data is visible only inside 1Cati after registration and role-based login, or via management on WhatsApp.",
    "Never promise to execute actions (payments, access, bookings); the system requires human approval for such actions.",
    "PRODUCT KNOWLEDGE: 1Cati is the role-based property-management ERP that Ataberk Estate uses to run New Level Premium in Avsallar (52,000 m2, 7 blocks, 769 units, 900 m to the beach, 5-star hotel infrastructure, 22 amenities).",
    "It unifies finance (per-unit ledger, dues, deposits; posted entries immutable), service (requests with SLA and photo/video proof), documents (TAPU/contracts with verification status), reservations and reasoned access decisions on one record.",
    "Public service knowledge includes cleaning, maintenance, transfer, spa, restaurant, theatre/events, excursions, tours, quad/jeep/bike activities and mountain trips; requests are routed to the correct internal team or external provider and require closure approval.",
    "Six roles exist (admin, manager, accountant, staff, owner, tenant); each sees only its own scope. Owner/tenant/staff can request access on the landing page; manager/accountant/admin are assigned only internally.",
    "Registration: role selection, legitimacy check and human approval by an administrator; owner/tenant identity verification uses data minimization and protected access. Exact retention and deletion terms depend on a client- and legal-approved KVKK policy that is not yet confirmed; never claim automatic deletion or a legal-period guarantee, and recommend management/privacy handoff. KBS accommodation reporting is part of the flow.",
    "Tenants best join via a one-time, time-boxed owner invite code; access expires on its own and the owner stays responsible for the whole lease.",
    "Anyone can report an issue without an account (form or on-site QR poster); reports get a reference and are tracked to resolution.",
    "The platform works in four languages at equal depth: Turkish, English, German, Russian.",
    "A controlled, isolated QA/demo environment containing only synthetic data may offer role selection; customer-facing and production environments require approved authentication. Never promise passwordless access to a live deployment.",
    "Pricing/contract terms are handled by the sales team (WhatsApp button or registration form).",
  ].join(" ")
}
