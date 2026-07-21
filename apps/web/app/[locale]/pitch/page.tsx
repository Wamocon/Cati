import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Euro,
  FileText,
  Gauge,
  Landmark,
  LockKeyhole,
  MessageSquare,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  TicketCheck,
  UsersRound,
  Wrench,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { ScrollReveal } from "@/components/scroll-reveal"
import { Footer } from "../../sections/footer"
import { Navbar } from "../../sections/navbar"

const demoCopy = {
  tr: {
    eyebrow: "1Çatı Demo Merkezi",
    title: "Müşteriye 15 dakikada net, güvenilir ve satılabilir ERP hikayesi gösterin.",
    body:
      "Bu sayfa demo toplantısı için tek kontrol noktasıdır: teklif mantığı, rol yolları, AI destekli ticket akışı, finans kontrolü, mobil kullanım ve canlı/uat ayrımı aynı yerde anlatılır.",
    primaryCta: "Rol demosunu başlat",
    secondaryCta: "Canlı panele geç",
    consoleTitle: "Demo kontrol akışı",
    consoleSubtitle: "Yönetim, finans, servis ve AI aynı sinyalde",
    stats: [
      { label: "daire modeli", value: "769" },
      { label: "aylık bakım ücreti", value: "€5" },
      { label: "demo dili", value: "4" },
    ],
    consoleSignals: {
      riskTitle: "AI risk sinyali",
      riskSubtitle: "Saatlik ticket yoğunluğu",
      approvalTitle: "Onay kuyruğu",
      queueItems: [
        ["68", "AI ticket önceliklendirme"],
        ["29", "finans erişim kontrolü"],
        ["12", "SLA istisnası"],
      ],
    },
    offerEyebrow: "Müşteri teklifi",
    offerTitle: "Sıfır geliştirme maliyeti. Net aylık bakım modeli.",
    offerBody:
      "Müteahhit yatırım maliyeti üstlenmez. WAMOCON geliştirme, servis, bakım, güvenlik güncellemeleri ve işletme yükünü yönetir. Müşteri tarafında model OpEx olarak kalır.",
    priceLabel: "Kullanıcı başına",
    priceValue: "€5",
    priceUnit: "aylık bakım ve servis",
    priceNote:
      "Geliştirme maliyeti yok. Donanım, ödeme, SMS, banka ve erişim entegrasyonları canlıya alınmadan önce sözleşme ve anahtar onayı gerekir.",
    knockoutsTitle: "7 karar argümanı",
    knockouts: [
      { title: "OpEx, CapEx değil", text: "100k+ başlangıç yükü yerine aylık, ölçülebilir işletme gideri." },
      { title: "ROI aylar içinde", text: "AI triage, servis yönlendirme ve finans görünürlüğü manuel işi azaltır." },
      { title: "Malik ve kiracı memnuniyeti", text: "Fotoğraf, video, sesli ticket ve canlı durum takibi iletişim kaosunu düşürür." },
      { title: "24/7 şeffaflık", text: "Uluslararası malik her an gider, servis, belge ve performans durumunu görür." },
      { title: "Uyumluluk ve risk", text: "Vergi, belge, erişim, rol ve hassas aksiyonlar denetlenebilir kayıt üretir." },
      { title: "Ölçekleme kolay", text: "Yeni site veya kullanıcı eklemek aynı platform, aynı eğitim ve aynı veri modeliyle ilerler." },
      { title: "Bakım bizde", text: "Uptime, güncelleme, güvenlik, destek ve sağlayıcı koordinasyonu müşterinin yükü olmaz." },
    ],
    rolesTitle: "Toplantıda açılacak rol yolları",
    rolesBody:
      "Her rol ayrı yetkiyle aynı veri modelini görür. Demo sırasında müşteri gereksiz menü kalabalığı yerine kendi iş akışını izler.",
    roles: [
      { title: "Yönetici", audience: "Müdür / operasyon", text: "Risk, gelir, servis, ekip ve AI özetleri.", href: "/login/profiles" },
      { title: "Muhasebe", audience: "Finans ekibi", text: "Aidat, borç, tahsilat, kısıt ve defter kayıtları.", href: "/login/profiles" },
      { title: "Saha ekibi", audience: "Teknik servis", text: "SLA, görev, kanıt ve mobil çalışma akışı.", href: "/login/profiles" },
      { title: "Malik", audience: "Uluslararası sahip", text: "Kendi dairesi, belgeleri, servisleri ve bildirimleri.", href: "/login/profiles" },
      { title: "Kiracı", audience: "Resident app", text: "Ticket, rezervasyon, belge ve mesaj görünümü.", href: "/login/profiles" },
      { title: "Admin", audience: "Platform sahibi", text: "Roller, entegrasyonlar, ayarlar ve onay izleri.", href: "/login/profiles" },
    ],
    chaptersTitle: "Demo akışı",
    chaptersBody:
      "Bu sıra konuşmayı dağılmadan yürütür: önce iş değeri, sonra gerçek modüller, en sonda canlıya geçiş koşulları.",
    chapters: [
      { time: "00:00", title: "Teklif ve değer", text: "Sıfır geliştirme maliyeti, €5 bakım modeli ve CFO dostu OpEx.", route: "/pitch", status: "live" },
      { time: "02:00", title: "Login ve yetki", text: "Altı rol, veri gizliliği, üretimde gerçek auth ve demo profilleri.", route: "/login", status: "live" },
      { time: "04:00", title: "Yönetim paneli", text: "Gelir, borç, servis, doluluk, AI risk ve faz haritası.", route: "/dashboard", status: "live" },
      { time: "06:30", title: "Daire matrisi", text: "Blok, kat, daire, malik, sakin, borç ve servis geçmişi.", route: "/dashboard/listings", status: "live" },
      { time: "08:30", title: "Ticket ve AI", text: "AI triage, servis kataloğu, SLA, ekip atama ve insan onayı.", route: "/dashboard/tickets", status: "uat" },
      { time: "10:30", title: "Finans", text: "Aidat, tahsilat, borç kısıtı, depozito ve denetim kaydı.", route: "/dashboard/finance", status: "uat" },
      { time: "14:00", title: "Canlıya geçiş", text: "Güvenli backend, sağlayıcı entegrasyonları, UAT, eğitim ve launch kontrolü.", route: "/dashboard/settings", status: "guarded" },
    ],
    aiTitle: "AI katmanı: hızlı ama kontrollü",
    aiBody:
      "AI; ticket özetler, risk sıralar, cevap taslakları ve günlük briefing üretir. Finans, erişim, iade ve rol değişikliği gibi hassas işler insan onayı olmadan otomatik yapılmaz.",
    aiPoints: [
      "Kullanıcının seçtiği dilde cevap verir.",
      "Ticket, rol, daire, finans ve doküman bağlamını birlikte okur.",
      "Kaynak ve gerekçe gösterir; belirsizse eskalasyon önerir.",
      "Üretimde log, rol bazlı erişim ve denetim iziyle çalışır.",
    ],
    readinessTitle: "Demo öncesi dürüst hazırlık notu",
    readiness: [
      "Vercel üretim deployment hazır.",
      "Güvenli backend bağlantısı canlı ortamda test edilir; gerçek müşteri verisi UAT onayıyla yüklenir.",
      "Jira/GitHub kanıt akışı kuru koşuda temiz; dış sisteme yazma guardrail nedeniyle manuel onay ister.",
      "Ödeme, SMS, banka, erişim ve kamera sağlayıcıları sözleşme/API anahtarı sonrası canlıya alınır.",
    ],
    statusLabels: {
      live: "Canlı",
      uat: "UAT hazır",
      guarded: "Onaylı geçiş",
    },
  },
  en: {
    eyebrow: "1Çatı Demo Center",
    title: "Show a clear, credible, sellable ERP story in 15 minutes.",
    body:
      "This is the meeting control page: offer logic, role paths, AI-assisted ticketing, finance controls, mobile usage and live/UAT boundaries are explained in one place.",
    primaryCta: "Start role demo",
    secondaryCta: "Open live portal",
    consoleTitle: "Demo control flow",
    consoleSubtitle: "Management, finance, service and AI read the same signal",
    stats: [
      { label: "unit model", value: "769" },
      { label: "monthly maintenance fee", value: "€5" },
      { label: "demo languages", value: "4" },
    ],
    consoleSignals: {
      riskTitle: "AI risk signal",
      riskSubtitle: "Ticket volume by hour",
      approvalTitle: "Approval queue",
      queueItems: [
        ["68", "AI ticket triage"],
        ["29", "finance access check"],
        ["12", "SLA exceptions"],
      ],
    },
    offerEyebrow: "Customer offer",
    offerTitle: "Zero development cost. Simple monthly maintenance model.",
    offerBody:
      "The property developer does not carry implementation cost. WAMOCON manages development, service, maintenance, security updates and operational burden. For the customer, the model stays as OpEx.",
    priceLabel: "Per user",
    priceValue: "€5",
    priceUnit: "monthly maintenance and service",
    priceNote:
      "No development cost. Hardware, payment, SMS, bank and access integrations need contract and key approval before production activation.",
    knockoutsTitle: "7 decision arguments",
    knockouts: [
      { title: "OpEx, not CapEx", text: "Replace a 100k+ upfront burden with a monthly, measurable operating cost." },
      { title: "ROI in months", text: "AI triage, service routing and finance visibility reduce manual work." },
      { title: "Owner and tenant satisfaction", text: "Photo, video and voice tickets with live status reduce communication chaos." },
      { title: "24/7 transparency", text: "International owners can see expenses, services, documents and performance at any time." },
      { title: "Compliance and risk", text: "Tax, document, access, role and sensitive actions create traceable records." },
      { title: "Easy scale", text: "New sites or users use the same platform, training model and data structure." },
      { title: "Maintenance handled", text: "Uptime, updates, security, support and provider coordination are not the customer's burden." },
    ],
    rolesTitle: "Role paths to open in the meeting",
    rolesBody:
      "Every role sees the same data model through a different permission lens. The customer watches their workflow instead of a crowded generic menu.",
    roles: [
      { title: "Manager", audience: "Operations lead", text: "Risk, income, service, team and AI summaries.", href: "/login/profiles" },
      { title: "Accounting", audience: "Finance team", text: "Dues, debt, collections, restrictions and ledger entries.", href: "/login/profiles" },
      { title: "Field staff", audience: "Technical service", text: "SLA, tasks, proof and mobile work flow.", href: "/login/profiles" },
      { title: "Owner", audience: "International owner", text: "Own unit, documents, services and notifications.", href: "/login/profiles" },
      { title: "Tenant", audience: "Resident app", text: "Tickets, bookings, documents and messages.", href: "/login/profiles" },
      { title: "Admin", audience: "Platform owner", text: "Roles, integrations, settings and approval traces.", href: "/login/profiles" },
    ],
    chaptersTitle: "Demo run of show",
    chaptersBody:
      "This order keeps the conversation tight: business value first, real modules next, production readiness last.",
    chapters: [
      { time: "00:00", title: "Offer and value", text: "Zero development cost, €5 maintenance model and CFO-friendly OpEx.", route: "/pitch", status: "live" },
      { time: "02:00", title: "Login and permissions", text: "Six roles, data privacy, real production auth and demo profiles.", route: "/login", status: "live" },
      { time: "04:00", title: "Management dashboard", text: "Income, debt, service, occupancy, AI risk and phase map.", route: "/dashboard", status: "live" },
      { time: "06:30", title: "Unit matrix", text: "Blocks, floors, units, owners, residents, debt and service history.", route: "/dashboard/listings", status: "live" },
      { time: "08:30", title: "Ticketing and AI", text: "AI triage, service catalogue, SLA, team assignment and human approval.", route: "/dashboard/tickets", status: "uat" },
      { time: "10:30", title: "Finance", text: "Dues, collections, debt restriction, deposits and audit records.", route: "/dashboard/finance", status: "uat" },
      { time: "14:00", title: "Go-live path", text: "Secure backend, provider integrations, UAT, training and launch control.", route: "/dashboard/settings", status: "guarded" },
    ],
    aiTitle: "AI layer: fast, but controlled",
    aiBody:
      "AI summarizes tickets, ranks risk, drafts replies and prepares daily briefings. Sensitive work such as finance, access, refunds and role changes is never executed automatically without human approval.",
    aiPoints: [
      "Answers in the user's selected language.",
      "Reads ticket, role, unit, finance and document context together.",
      "Shows source and reason; escalates when confidence is low.",
      "Runs with logs, role-based access and audit trail in production.",
    ],
    readinessTitle: "Honest pre-demo readiness note",
    readiness: [
      "Vercel production deployment is ready.",
      "Backend connectivity is tested in the live environment; real customer data is loaded after UAT approval.",
      "Jira/GitHub evidence flow is clean in dry-run; external writes need manual approval because of guardrails.",
      "Payment, SMS, bank, access and camera providers go live after contract/API key approval.",
    ],
    statusLabels: {
      live: "Live",
      uat: "UAT ready",
      guarded: "Guarded launch",
    },
  },
  de: {
    eyebrow: "1Çatı Demo-Zentrum",
    title: "Zeigen Sie in 15 Minuten eine klare, glaubwürdige und verkaufbare ERP-Story.",
    body:
      "Diese Seite ist der Kontrollpunkt für das Meeting: Angebotslogik, Rollenpfade, KI-gestütztes Ticketing, Finanzkontrollen, mobile Nutzung und Live-/UAT-Grenzen werden an einer Stelle erklärt.",
    primaryCta: "Rollendemo starten",
    secondaryCta: "Live-Portal öffnen",
    consoleTitle: "Demo-Kontrollfluss",
    consoleSubtitle: "Management, Finanzen, Service und KI lesen dasselbe Signal",
    stats: [
      { label: "Einheitenmodell", value: "769" },
      { label: "monatliche Wartungsgebühr", value: "€5" },
      { label: "Demo-Sprachen", value: "4" },
    ],
    consoleSignals: {
      riskTitle: "KI-Risikosignal",
      riskSubtitle: "Ticketvolumen pro Stunde",
      approvalTitle: "Freigabewarteschlange",
      queueItems: [
        ["68", "KI-Ticket-Triage"],
        ["29", "Finanz- und Zugangskontrolle"],
        ["12", "SLA-Ausnahmen"],
      ],
    },
    offerEyebrow: "Kundenangebot",
    offerTitle: "Keine Entwicklungskosten. Einfaches monatliches Wartungsmodell.",
    offerBody:
      "Der Bauträger trägt keine Implementierungskosten. WAMOCON übernimmt Entwicklung, Service, Wartung, Sicherheitsupdates und den operativen Aufwand. Für den Kunden bleibt das Modell OpEx.",
    priceLabel: "Pro Nutzer",
    priceValue: "€5",
    priceUnit: "monatliche Wartung und Service",
    priceNote:
      "Keine Entwicklungskosten. Hardware-, Zahlungs-, SMS-, Bank- und Zutrittsintegrationen benötigen vor dem Produktivbetrieb Vertrag und API-Freigabe.",
    knockoutsTitle: "7 Entscheidungsargumente",
    knockouts: [
      { title: "OpEx statt CapEx", text: "100k+ Anfangslast wird durch messbare monatliche Betriebskosten ersetzt." },
      { title: "ROI in Monaten", text: "KI-Triage, Service-Routing und Finanztransparenz reduzieren manuelle Arbeit." },
      { title: "Zufriedene Eigentümer und Mieter", text: "Foto-, Video- und Sprach-Tickets mit Live-Status senken Kommunikationschaos." },
      { title: "24/7 Transparenz", text: "Internationale Eigentümer sehen Kosten, Services, Dokumente und Performance jederzeit." },
      { title: "Compliance und Risiko", text: "Steuer-, Dokument-, Zutritts-, Rollen- und sensible Aktionen erzeugen prüfbare Nachweise." },
      { title: "Einfach skalieren", text: "Neue Anlagen oder Nutzer arbeiten mit derselben Plattform, Schulung und Datenstruktur." },
      { title: "Wartung inklusive", text: "Uptime, Updates, Sicherheit, Support und Provider-Koordination sind nicht Aufgabe des Kunden." },
    ],
    rolesTitle: "Rollenpfade für das Meeting",
    rolesBody:
      "Jede Rolle sieht dasselbe Datenmodell mit anderen Berechtigungen. Der Kunde sieht seinen Arbeitsablauf statt ein überladenes Standardmenü.",
    roles: [
      { title: "Manager", audience: "Betriebsleitung", text: "Risiko, Einnahmen, Service, Team und KI-Zusammenfassungen.", href: "/login/profiles" },
      { title: "Buchhaltung", audience: "Finanzteam", text: "Beiträge, Schulden, Einzüge, Sperren und Buchungen.", href: "/login/profiles" },
      { title: "Außendienst", audience: "Technischer Service", text: "SLA, Aufgaben, Nachweise und mobiler Ablauf.", href: "/login/profiles" },
      { title: "Eigentümer", audience: "Internationaler Eigentümer", text: "Eigene Einheit, Dokumente, Services und Benachrichtigungen.", href: "/login/profiles" },
      { title: "Mieter", audience: "Resident App", text: "Tickets, Buchungen, Dokumente und Nachrichten.", href: "/login/profiles" },
      { title: "Admin", audience: "Plattformbetreiber", text: "Rollen, Integrationen, Einstellungen und Freigabespuren.", href: "/login/profiles" },
    ],
    chaptersTitle: "Demo-Ablauf",
    chaptersBody:
      "Diese Reihenfolge hält das Gespräch klar: zuerst Geschäftswert, dann reale Module, zuletzt Produktionsreife.",
    chapters: [
      { time: "00:00", title: "Angebot und Wert", text: "Keine Entwicklungskosten, €5 Wartungsmodell und CFO-freundliches OpEx.", route: "/pitch", status: "live" },
      { time: "02:00", title: "Login und Rechte", text: "Sechs Rollen, Datenschutz, echte Production-Auth und Demo-Profile.", route: "/login", status: "live" },
      { time: "04:00", title: "Management-Dashboard", text: "Einnahmen, Schulden, Service, Belegung, KI-Risiko und Phasenkarte.", route: "/dashboard", status: "live" },
      { time: "06:30", title: "Einheitenmatrix", text: "Blöcke, Etagen, Einheiten, Eigentümer, Bewohner, Schulden und Servicehistorie.", route: "/dashboard/listings", status: "live" },
      { time: "08:30", title: "Ticketing und KI", text: "KI-Triage, Servicekatalog, SLA, Teamzuweisung und menschliche Freigabe.", route: "/dashboard/tickets", status: "uat" },
      { time: "10:30", title: "Finanzen", text: "Beiträge, Einzüge, Schuldensperren, Kautionen und Audit-Nachweise.", route: "/dashboard/finance", status: "uat" },
      { time: "14:00", title: "Go-live-Pfad", text: "Sicheres Backend, Provider-Integrationen, UAT, Training und Launch-Kontrolle.", route: "/dashboard/settings", status: "guarded" },
    ],
    aiTitle: "KI-Schicht: schnell, aber kontrolliert",
    aiBody:
      "KI fasst Tickets zusammen, priorisiert Risiken, entwirft Antworten und bereitet tägliche Briefings vor. Sensible Vorgänge wie Finanzen, Zutritt, Rückerstattungen und Rollenänderungen werden nie ohne menschliche Freigabe automatisch ausgeführt.",
    aiPoints: [
      "Antwortet in der gewählten Sprache des Nutzers.",
      "Liest Ticket-, Rollen-, Einheiten-, Finanz- und Dokumentkontext gemeinsam.",
      "Zeigt Quelle und Begründung; eskaliert bei Unsicherheit.",
      "Läuft in Production mit Logs, rollenbasiertem Zugriff und Audit-Trail.",
    ],
    readinessTitle: "Ehrlicher Hinweis vor der Demo",
    readiness: [
      "Das Vercel-Production-Deployment ist bereit.",
      "Die Backend-Konnektivität wird in der Live-Umgebung geprüft; echte Kundendaten folgen nach UAT-Freigabe.",
      "Jira/GitHub-Nachweise laufen im Dry-Run sauber; externe Schreibvorgänge brauchen wegen Guardrails manuelle Freigabe.",
      "Payment-, SMS-, Bank-, Zutritts- und Kamera-Provider gehen nach Vertrags- und API-Key-Freigabe live.",
    ],
    statusLabels: {
      live: "Live",
      uat: "UAT-bereit",
      guarded: "Kontrollierter Launch",
    },
  },
  ru: {
    eyebrow: "Демо-центр 1Çatı",
    title: "Покажите понятную, надежную и продающую ERP-историю за 15 минут.",
    body:
      "Это контрольная страница встречи: логика предложения, пути ролей, AI-ticketing, финансы, мобильная работа и границы live/UAT объясняются в одном месте.",
    primaryCta: "Начать демо ролей",
    secondaryCta: "Открыть live-портал",
    consoleTitle: "Демо-контур управления",
    consoleSubtitle: "Управление, финансы, сервис и AI работают по одному сигналу",
    stats: [
      { label: "модель квартир", value: "769" },
      { label: "ежемесячный сервис", value: "€5" },
      { label: "языка демо", value: "4" },
    ],
    consoleSignals: {
      riskTitle: "AI-сигнал риска",
      riskSubtitle: "Объем заявок по часам",
      approvalTitle: "Очередь согласований",
      queueItems: [
        ["68", "AI-триаж заявок"],
        ["29", "проверка финансов и доступа"],
        ["12", "исключения SLA"],
      ],
    },
    offerEyebrow: "Предложение клиенту",
    offerTitle: "Нулевая стоимость разработки. Простая ежемесячная модель обслуживания.",
    offerBody:
      "Застройщик не несет затраты на внедрение. WAMOCON ведет разработку, сервис, обслуживание, обновления безопасности и операционную нагрузку. Для клиента модель остается OpEx.",
    priceLabel: "За пользователя",
    priceValue: "€5",
    priceUnit: "в месяц за обслуживание и сервис",
    priceNote:
      "Без стоимости разработки. Интеграции оборудования, платежей, SMS, банков и доступа включаются после договора и утверждения ключей.",
    knockoutsTitle: "7 аргументов для решения",
    knockouts: [
      { title: "OpEx, не CapEx", text: "Вместо 100k+ upfront-затрат, понятные ежемесячные операционные расходы." },
      { title: "ROI за месяцы", text: "AI-triage, маршрутизация сервиса и прозрачные финансы сокращают ручную работу." },
      { title: "Довольные владельцы и жильцы", text: "Фото, видео и голосовые tickets с live-статусом уменьшают хаос коммуникации." },
      { title: "Прозрачность 24/7", text: "Международные владельцы видят расходы, сервисы, документы и performance в любое время." },
      { title: "Compliance и риски", text: "Налоги, документы, доступ, роли и чувствительные действия оставляют проверяемый след." },
      { title: "Легкое масштабирование", text: "Новые комплексы и пользователи работают на той же платформе, обучении и модели данных." },
      { title: "Обслуживание на нас", text: "Uptime, обновления, безопасность, поддержка и провайдеры не становятся нагрузкой клиента." },
    ],
    rolesTitle: "Ролевые пути для встречи",
    rolesBody:
      "Каждая роль видит одну модель данных через свои права. Клиент смотрит свой процесс, а не перегруженное общее меню.",
    roles: [
      { title: "Менеджер", audience: "Операции", text: "Риски, доходы, сервис, команда и AI-сводки.", href: "/login/profiles" },
      { title: "Бухгалтерия", audience: "Финансы", text: "Взносы, долги, оплаты, ограничения и проводки.", href: "/login/profiles" },
      { title: "Сервисная команда", audience: "Техслужба", text: "SLA, задачи, доказательства и мобильный рабочий процесс.", href: "/login/profiles" },
      { title: "Владелец", audience: "Иностранный владелец", text: "Своя квартира, документы, сервисы и уведомления.", href: "/login/profiles" },
      { title: "Жилец", audience: "Resident app", text: "Tickets, бронирования, документы и сообщения.", href: "/login/profiles" },
      { title: "Админ", audience: "Владелец платформы", text: "Роли, интеграции, настройки и следы согласований.", href: "/login/profiles" },
    ],
    chaptersTitle: "Сценарий демо",
    chaptersBody:
      "Такой порядок держит разговор сфокусированным: сначала бизнес-ценность, затем реальные модули, в конце готовность к production.",
    chapters: [
      { time: "00:00", title: "Предложение и ценность", text: "Нулевая разработка, модель обслуживания €5 и OpEx для CFO.", route: "/pitch", status: "live" },
      { time: "02:00", title: "Логин и права", text: "Шесть ролей, приватность данных, production-auth и demo-профили.", route: "/login", status: "live" },
      { time: "04:00", title: "Панель управления", text: "Доходы, долги, сервис, занятость, AI-риск и карта фаз.", route: "/dashboard", status: "live" },
      { time: "06:30", title: "Матрица квартир", text: "Блоки, этажи, квартиры, владельцы, жильцы, долги и история сервиса.", route: "/dashboard/listings", status: "live" },
      { time: "08:30", title: "Tickets и AI", text: "AI-triage, каталог услуг, SLA, назначение команды и human approval.", route: "/dashboard/tickets", status: "uat" },
      { time: "10:30", title: "Финансы", text: "Взносы, оплаты, debt restrictions, депозиты и audit records.", route: "/dashboard/finance", status: "uat" },
      { time: "14:00", title: "Путь go-live", text: "Безопасный backend, интеграции провайдеров, UAT, training и launch control.", route: "/dashboard/settings", status: "guarded" },
    ],
    aiTitle: "AI-слой: быстро, но под контролем",
    aiBody:
      "AI суммирует tickets, ранжирует риски, готовит ответы и daily briefings. Финансы, доступ, возвраты и смена ролей никогда не выполняются автоматически без human approval.",
    aiPoints: [
      "Отвечает на выбранном пользователем языке.",
      "Читает контекст ticket, роли, квартиры, финансов и документов вместе.",
      "Показывает источник и причину; эскалирует при низкой уверенности.",
      "В production работает с logs, ролевым доступом и audit trail.",
    ],
    readinessTitle: "Честная заметка перед демо",
    readiness: [
      "Vercel production deployment готов.",
      "Backend-connectivity проверяется в live-окружении; реальные данные клиента загружаются после UAT approval.",
      "Jira/GitHub evidence flow чистый в dry-run; внешняя запись требует manual approval из-за guardrails.",
      "Payment, SMS, bank, access и camera providers включаются после contract/API key approval.",
    ],
    statusLabels: {
      live: "Live",
      uat: "UAT ready",
      guarded: "Guarded launch",
    },
  },
} as const

const roleIcons = [Gauge, Euro, Wrench, Landmark, MessageSquare, ShieldCheck]
const chapterIcons = [
  Sparkles,
  LockKeyhole,
  BarChart3,
  Building2,
  TicketCheck,
  Euro,
  CalendarDays,
  ClipboardCheck,
]
const knockoutIcons = [Euro, BarChart3, UsersRound, Gauge, ShieldCheck, Building2, Wrench]

type DemoLocale = keyof typeof demoCopy
type DemoCopy = (typeof demoCopy)[DemoLocale]
type ChapterStatus = keyof DemoCopy["statusLabels"]

function resolveDemoLocale(locale: string): DemoLocale {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function statusClass(status: ChapterStatus) {
  if (status === "live") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
  }
  if (status === "uat") {
    return "border-sky-500/30 bg-sky-500/10 text-sky-700"
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-700"
}

function DemoConsole({ copy }: { copy: DemoCopy }) {
  const barHeights = ["42%", "64%", "54%", "82%", "68%", "90%"]

  return (
    <div
      data-testid="demo-preview"
      className="overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-foreground/10"
    >
      <div className="border-b border-border bg-muted/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-black text-foreground">
              <PlayCircle className="h-4 w-4 text-primary" />
              <span className="break-words">{copy.consoleTitle}</span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {copy.consoleSubtitle}
            </p>
          </div>
          <span className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black text-primary">
            15 min
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {copy.stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-border bg-background p-4">
              <div className="text-2xl font-black text-foreground">{stat.value}</div>
              <div className="mt-1 text-xs font-bold uppercase leading-5 text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-black text-foreground">{copy.consoleSignals.riskTitle}</div>
                <div className="mt-1 text-xs text-muted-foreground">{copy.consoleSignals.riskSubtitle}</div>
              </div>
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="mt-6 flex h-32 items-end gap-2">
              {barHeights.map((height, index) => (
                <div
                  key={`${height}-${index}`}
                  className="flex-1 rounded-t-md bg-primary/25"
                  style={{ height }}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-4">
            <div className="text-sm font-black text-foreground">{copy.consoleSignals.approvalTitle}</div>
            <div className="mt-4 space-y-3">
              {copy.consoleSignals.queueItems.map(([value, label]) => (
                <div key={label} className="flex items-center justify-between gap-3 rounded-md bg-muted/55 px-3 py-2">
                  <span className="text-xs font-bold text-muted-foreground">{label}</span>
                  <span className="text-base font-black text-foreground">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function PitchPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const copy = demoCopy[resolveDemoLocale(locale)]
  const roleItems = copy.roles.map((role, index) => ({
    ...role,
    icon: roleIcons[index],
  }))
  const chapterItems = copy.chapters.map((chapter, index) => ({
    ...chapter,
    icon: chapterIcons[index],
  }))
  const knockoutItems = copy.knockouts.map((item, index) => ({
    ...item,
    icon: knockoutIcons[index],
  }))

  return (
    <>
      <Navbar />
      <div className="h-16" />
      <main id="main" data-testid="demo-center-page" className="relative overflow-hidden">
        <section className="border-b border-border/60 bg-background py-14 sm:py-18 lg:py-20">
          <div className="container grid items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
            <ScrollReveal>
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-black uppercase text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  {copy.eyebrow}
                </div>
                <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.05] text-foreground sm:text-5xl lg:text-6xl">
                  {copy.title}
                </h1>
                <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
                  {copy.body}
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/login/profiles"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90"
                  >
                    {copy.primaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/login?next=/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-black text-foreground transition hover:bg-muted"
                  >
                    {copy.secondaryCta}
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.1} direction="left">
              <DemoConsole copy={copy} />
            </ScrollReveal>
          </div>
        </section>

        <section className="border-b border-border/60 bg-muted/25 py-12 sm:py-16">
          <div className="container grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
            <ScrollReveal>
              <div className="rounded-lg border border-primary/25 bg-card p-6">
                <p className="text-xs font-black uppercase text-primary">{copy.offerEyebrow}</p>
                <h2 className="mt-3 text-3xl font-black leading-tight text-foreground sm:text-4xl">
                  {copy.offerTitle}
                </h2>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{copy.offerBody}</p>
                <div className="mt-6 rounded-lg border border-border bg-background p-5">
                  <div className="text-xs font-black uppercase text-muted-foreground">
                    {copy.priceLabel}
                  </div>
                  <div
                    data-testid="demo-offer-price"
                    className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1"
                  >
                    <span className="text-5xl font-black leading-none text-foreground">
                      {copy.priceValue}
                    </span>
                    <span className="pb-1 text-sm font-bold text-muted-foreground">
                      {copy.priceUnit}
                    </span>
                  </div>
                  <p className="mt-4 text-xs leading-6 text-muted-foreground">
                    {copy.priceNote}
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <div>
              <ScrollReveal>
                <h2 className="text-2xl font-black text-foreground">{copy.knockoutsTitle}</h2>
              </ScrollReveal>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {knockoutItems.map((item, index) => (
                  <ScrollReveal key={item.title} delay={index * 0.03}>
                    <article className="h-full rounded-lg border border-border bg-card p-4">
                      <div className="flex gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <item.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-foreground">{item.title}</h3>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    </article>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-18 lg:py-20">
          <div className="container">
            <ScrollReveal className="max-w-3xl">
              <h2 className="text-3xl font-black text-foreground sm:text-4xl">
                {copy.rolesTitle}
              </h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">{copy.rolesBody}</p>
            </ScrollReveal>

            <div data-testid="demo-role-grid" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {roleItems.map((role, index) => (
                <ScrollReveal key={role.title} delay={index * 0.04}>
                  <Link
                    data-testid="demo-role-link"
                    href={role.href}
                    className="group block h-full rounded-lg border border-border bg-card p-5 transition hover:border-primary/35 hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                        <role.icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </div>
                    <div className="mt-5 min-w-0">
                      <p className="text-xs font-black uppercase text-muted-foreground">
                        {role.audience}
                      </p>
                      <h3 className="mt-1 text-xl font-black text-foreground">{role.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">{role.text}</p>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card py-14 sm:py-18 lg:py-20">
          <div className="container grid gap-8 lg:grid-cols-[0.74fr_1.26fr]">
            <ScrollReveal>
              <div>
                <h2 className="text-3xl font-black text-foreground sm:text-4xl">
                  {copy.chaptersTitle}
                </h2>
                <p className="mt-4 text-base leading-8 text-muted-foreground">
                  {copy.chaptersBody}
                </p>
              </div>
            </ScrollReveal>

            <div data-testid="demo-chapters" className="grid gap-3">
              {chapterItems.map((chapter, index) => (
                <ScrollReveal key={`${chapter.time}-${chapter.title}`} delay={index * 0.03}>
                  <Link
                    data-testid="demo-chapter-card"
                    href={chapter.route}
                    className="grid gap-4 rounded-lg border border-border bg-background p-4 transition hover:border-primary/35 hover:bg-primary/5 sm:grid-cols-[5.25rem_1fr_auto]"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <div className="text-sm font-black text-primary">{chapter.time}</div>
                      <div className="mt-0 flex h-9 w-9 items-center justify-center rounded-md bg-muted text-primary sm:mt-3">
                        <chapter.icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-black text-foreground">{chapter.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{chapter.text}</p>
                    </div>
                    <div className="flex items-start sm:justify-end">
                      <span className={`rounded-md border px-2.5 py-1 text-xs font-black ${statusClass(chapter.status)}`}>
                        {copy.statusLabels[chapter.status]}
                      </span>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 sm:py-18 lg:py-20">
          <div className="container grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <ScrollReveal>
              <div className="rounded-lg border border-border bg-card p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-black text-foreground">{copy.aiTitle}</h2>
                </div>
                <p className="mt-5 text-sm leading-7 text-muted-foreground">{copy.aiBody}</p>
                <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                  {copy.aiPoints.map((point) => (
                    <li key={point} className="flex gap-3 text-sm leading-6 text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08} direction="left">
              <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-700">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-black text-foreground">{copy.readinessTitle}</h2>
                </div>
                <ul className="mt-6 space-y-4">
                  {copy.readiness.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-7 text-muted-foreground">
                      <ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-700" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
