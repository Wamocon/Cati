"use client"

import {
  BellRing,
  CalendarCheck2,
  FileText,
  HeartHandshake,
  Languages,
  Mail,
  MessageCircleWarning,
  MessageSquareText,
  RefreshCcw,
  Send,
  Smartphone,
  Users,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import {
  isClientRole,
  isFieldRole,
  visibleCommunicationThreadsForRole,
  visibleGuestLifecycleEventsForRole,
  visibleMessageTemplatesForRole,
  visibleNotificationDeliveriesForRole,
  visibleNotificationRulesForRole,
} from "@/lib/role-scoped-views"
import {
  communicationThreads,
  getCommunicationSummary,
  guestLifecycleEvents,
  messageTemplates,
  notificationDeliveries,
  notificationRules,
  type CommunicationThreadRecord,
  type GuestLifecycleEventRecord,
  type MessageTemplateRecord,
  type NotificationRuleRecord,
} from "@/lib/site-management-data"

const communicationsCopy = {
  tr: {
    title: "İletişim Merkezi",
    introClient: "Portal mesajları, bildirimler ve yönetim yanıtları yetkili hesap ve daire kapsamınıza göre filtrelenir.",
    introField: "Saha ekipleri görev mesajlarını, SLA uyarılarını, rota yanıtlarını ve medya kanıtı takibini finans gürültüsü olmadan görür.",
    introDefault: "Omnichannel gelen kutusu, bildirim kuralları, yeniden gönderim kuyruğu ve çok dilli şablonlar denetimli tek çalışma alanında yönetilir.",
    openThreads: "Açık akışlar",
    urgentFollowUp: "Acil takip",
    activeRules: "Aktif kurallar",
    fourLanguageTemplates: "4 dilli şablon",
    lifecycleTitle: "Misafir yolculuğu deneyimi",
    lifecycleDescription: "Teşekkür, varış öncesi, giriş günü, ilk gece konfor kontrolü, çıkış ve geri bildirim adımları izin, risk ve durdurma kurallarıyla sıralanır.",
    journeySteps: "yolculuk adımı",
    suppressed: "durduruldu",
    antiSpamTitle: "Anti-spam korumaları",
    antiSpamDescription: "Mesajlar sade kalır: her an için tek faydalı temas, tekrarlı konfor kontrolü yok, depozito, servis veya şikayet riski açıkken yorum isteği yok.",
    feedbackScope: "geri bildirim veya telafi anı kapsamda",
    edgeTitle: "Uç durum yönetimi",
    edgeDescription: "İptal edilen rezervasyon, ödenmemiş kayıt, eksik izin, blokeli erişim ve depozito itirazı sistemi otomatik gönderimden inceleme veya sadece portal moduna alır.",
    portalConversations: "Portal görüşmeleri",
    omnichannelInbox: "Omnichannel gelen kutusu",
    inboxDescription: "Her görüşme izin ve dil durumuyla birlikte daire, rezervasyon, finans kalemi, görev veya belge paketiyle ilişkilidir.",
    actions: "Aksiyonlar",
    lifecycleActions: "Yolculuk aksiyonları",
    lifecycleMessagePrepare: "Yolculuk mesajı hazırla",
    lifecycleMessageAria: "Misafir yolculuğu mesajını hazırla",
    communicationActionsAria: "İletişim merkezi aksiyonları",
    broadcastPrepare: "Toplu bildirim hazırla",
    broadcastDescription: "{count} görünür mesaj akışı için taslak.",
    broadcastTitle: "Toplu bildirim taslağı hazırlandı",
    messageActions: "Mesaj aksiyonları",
    replyDraft: "Cevap taslağı hazırla",
    replyDraftAria: "Cevap taslağı hazırla",
    ruleActions: "Kural aksiyonları",
    ruleReview: "Bildirim kuralını incele",
    ruleReviewAria: "Bildirim kuralını incele",
    approvalGateOpen: "Onay kapısı açık.",
    ruleStatusReview: "Kural durumu kontrol edilir.",
    deliveryActions: "Teslim aksiyonları",
    retryDelivery: "Teslimi yeniden dene",
    retryDeliveryAria: "Bildirim teslimini yeniden dene",
    deliveryRetryDescription: "{channel} için {attempts} deneme kaydı.",
    templateActions: "Şablon aksiyonları",
    templateApprovalPrepare: "Şablonu onaya hazırla",
    templateApprovalAria: "Mesaj şablonunu onaya hazırla",
    providerTitle: "Sağlayıcıya hazır simülasyon",
    providerDescription: "SMS, e-posta, push ve portal mesajları şimdilik demo kuyruklarını kullanır; sözleşme ve API anahtarlarından sonra sağlayıcı adaptörleri açılır.",
    providerCount: "yeniden deneme veya manuel inceleme isteyen teslim öğesi",
    approvalTitle: "Onay ve yedek kanal",
    approvalDescription: "Yanlış alıcı, eksik onay, abonelikten çıkış, finans itirazı ve başarısız sağlayıcı olayları yeniden göndermeden önce görünür kalır.",
    approvalCount: "mevcut rol kapsamında onay sorunu",
    notificationRulesTitle: "Bildirim kuralları",
    notificationRulesDescription: "Kurallar üretim gönderiminden önce hedef önizleme, dil modu, onay kapısı ve yedek kanalı içerir.",
    retryCount: "tekrar",
    deliveryQueueTitle: "Teslim ve yeniden deneme kuyruğu",
    deliveryQueueDescription: "Canlı sağlayıcı bağlanmadan önce teslim denemeleri, sağlayıcı modu ve tekrar zamanı izlenir.",
    deliveryCount: "teslim",
    templateLibraryTitle: "Çok dilli şablon kütüphanesi",
    templateLibraryDescription: "TR, EN, DE ve RU şablonları değişken bazlı, onay farkında ve sağlayıcı adaptörlerine hazırdır.",
    approvalCountLabel: "onay",
    qualityGateTitle: "Role güvenli iletişim kalite kapısı",
    qualityGateDescription: "Mevcut demo sözleşmesi {threads} akış, {rules} aktif kural ve {templates} çok dilli şablon izler.",
    phaseReady: "Faz 11 UAT hazır",
  },
  en: {
    title: "Communication Center",
    introClient: "Portal messages, notifications and management replies are filtered to your authorized account and unit scope.",
    introField: "Field teams see task messages, SLA alerts, route replies and media-proof follow-up without finance-only noise.",
    introDefault: "Omnichannel inbox, notification rules, delivery retry queue and multilingual templates are managed in one audited workspace.",
    openThreads: "Open threads",
    urgentFollowUp: "Urgent follow-up",
    activeRules: "Active rules",
    fourLanguageTemplates: "4-language templates",
    lifecycleTitle: "Guest lifecycle experience",
    lifecycleDescription: "Booking thank-you, pre-arrival, arrival, first-night comfort check, checkout and post-stay feedback are sequenced with consent, risk and suppression rules.",
    journeySteps: "journey steps",
    suppressed: "suppressed",
    antiSpamTitle: "Anti-spam guardrails",
    antiSpamDescription: "Messages stay subtle: one useful touch per moment, no repeated comfort check, no public-review ask while deposit, service or complaint risk is open.",
    feedbackScope: "feedback or recovery moments in scope",
    edgeTitle: "Edge-case handling",
    edgeDescription: "Cancelled bookings, unpaid reservations, missing consent, blocked access and deposit disputes switch the system from automated sending to review or portal-only mode.",
    portalConversations: "Portal conversations",
    omnichannelInbox: "Omnichannel inbox",
    inboxDescription: "Every conversation is tied to a unit, booking, finance item, task or document packet with consent and language state.",
    actions: "Actions",
    lifecycleActions: "Lifecycle actions",
    lifecycleMessagePrepare: "Prepare lifecycle message",
    lifecycleMessageAria: "Prepare guest lifecycle message",
    communicationActionsAria: "Communication center actions",
    broadcastPrepare: "Prepare broadcast",
    broadcastDescription: "Draft for {count} visible message streams.",
    broadcastTitle: "Broadcast draft prepared",
    messageActions: "Message actions",
    replyDraft: "Prepare reply draft",
    replyDraftAria: "Prepare reply draft",
    ruleActions: "Rule actions",
    ruleReview: "Review notification rule",
    ruleReviewAria: "Review notification rule",
    approvalGateOpen: "Approval gate is open.",
    ruleStatusReview: "Rule status will be checked.",
    deliveryActions: "Delivery actions",
    retryDelivery: "Retry delivery",
    retryDeliveryAria: "Retry notification delivery",
    deliveryRetryDescription: "{attempts} delivery attempts for {channel}.",
    templateActions: "Template actions",
    templateApprovalPrepare: "Prepare template for approval",
    templateApprovalAria: "Prepare message template for approval",
    providerTitle: "Provider-ready simulation",
    providerDescription: "SMS, email, push and portal messages use demo queues for now; provider adapters open after contracts and API keys are approved.",
    providerCount: "delivery items needing retry or manual review",
    approvalTitle: "Approval and fallback channel",
    approvalDescription: "Wrong recipient, missing consent, unsubscribe, finance dispute and failed provider events stay visible before any resend.",
    approvalCount: "consent issues in current role scope",
    notificationRulesTitle: "Notification rules",
    notificationRulesDescription: "Rules include target preview, language mode, approval gate and fallback channel before production sending.",
    retryCount: "retries",
    deliveryQueueTitle: "Delivery and retry queue",
    deliveryQueueDescription: "Delivery attempts, provider mode and next retry time are tracked before a live provider is connected.",
    deliveryCount: "deliveries",
    templateLibraryTitle: "Multilingual template library",
    templateLibraryDescription: "TR, EN, DE and RU templates are variable-based, approval-aware and ready for provider adapters.",
    approvalCountLabel: "approval",
    qualityGateTitle: "Role-safe communication quality gate",
    qualityGateDescription: "Current demo contract tracks {threads} threads, {rules} active rules and {templates} multilingual templates.",
    phaseReady: "Phase 11 ready for UAT",
  },
  de: {
    title: "Kommunikationszentrale",
    introClient: "Portalnachrichten, Benachrichtigungen und Verwaltungsantworten werden auf Ihr autorisiertes Konto und Ihre Wohnung begrenzt.",
    introField: "Feldteams sehen Aufgabenmeldungen, SLA-Warnungen, Routenantworten und Mediennachweise ohne reine Finanzmeldungen.",
    introDefault: "Omnichannel-Posteingang, Benachrichtigungsregeln, Wiederholungsqueue und mehrsprachige Vorlagen werden in einem auditierten Arbeitsbereich verwaltet.",
    openThreads: "Offene Verläufe",
    urgentFollowUp: "Dringende Nachverfolgung",
    activeRules: "Aktive Regeln",
    fourLanguageTemplates: "4-sprachige Vorlagen",
    lifecycleTitle: "Gäste-Journey",
    lifecycleDescription: "Danke-Nachricht, Voranreise, Ankunft, erste Komfortprüfung, Checkout und Feedback werden mit Einwilligung, Risiko und Sperrregeln sequenziert.",
    journeySteps: "Journey-Schritte",
    suppressed: "unterdrückt",
    antiSpamTitle: "Anti-Spam-Leitplanken",
    antiSpamDescription: "Nachrichten bleiben zurückhaltend: ein nützlicher Kontakt pro Moment, keine wiederholte Komfortprüfung und keine Bewertungsbitte bei offenem Kautions-, Service- oder Beschwerderisiko.",
    feedbackScope: "Feedback- oder Recovery-Momente im Umfang",
    edgeTitle: "Sonderfallsteuerung",
    edgeDescription: "Stornierte Buchungen, unbezahlte Reservierungen, fehlende Einwilligung, gesperrter Zugang und Kautionsstreit wechseln von Automatik zu Prüfung oder Portal-only.",
    portalConversations: "Portalgespräche",
    omnichannelInbox: "Omnichannel-Posteingang",
    inboxDescription: "Jedes Gespräch ist mit Wohnung, Buchung, Finanzposten, Aufgabe oder Dokumentenpaket inklusive Einwilligung und Sprache verbunden.",
    actions: "Aktionen",
    lifecycleActions: "Journey-Aktionen",
    lifecycleMessagePrepare: "Journey-Nachricht vorbereiten",
    lifecycleMessageAria: "Gäste-Journey-Nachricht vorbereiten",
    communicationActionsAria: "Aktionen der Kommunikationszentrale",
    broadcastPrepare: "Broadcast vorbereiten",
    broadcastDescription: "Entwurf für {count} sichtbare Nachrichtenverläufe.",
    broadcastTitle: "Broadcast-Entwurf vorbereitet",
    messageActions: "Nachrichtenaktionen",
    replyDraft: "Antwortentwurf vorbereiten",
    replyDraftAria: "Antwortentwurf vorbereiten",
    ruleActions: "Regelaktionen",
    ruleReview: "Benachrichtigungsregel prüfen",
    ruleReviewAria: "Benachrichtigungsregel prüfen",
    approvalGateOpen: "Freigabeschritt ist aktiv.",
    ruleStatusReview: "Regelstatus wird geprüft.",
    deliveryActions: "Zustellaktionen",
    retryDelivery: "Zustellung erneut versuchen",
    retryDeliveryAria: "Benachrichtigungszustellung erneut versuchen",
    deliveryRetryDescription: "{attempts} Zustellversuche für {channel}.",
    templateActions: "Vorlagenaktionen",
    templateApprovalPrepare: "Vorlage zur Freigabe vorbereiten",
    templateApprovalAria: "Nachrichtenvorlage zur Freigabe vorbereiten",
    providerTitle: "Provider-ready Simulation",
    providerDescription: "SMS, E-Mail, Push und Portalnachrichten nutzen vorerst Demo-Queues; Provider-Adapter werden nach Verträgen und API-Schlüsseln aktiviert.",
    providerCount: "Zustellungen mit Retry oder manueller Prüfung",
    approvalTitle: "Freigabe und Ersatzkanal",
    approvalDescription: "Falscher Empfänger, fehlende Einwilligung, Abmeldung, Finanzwiderspruch und Providerfehler bleiben vor erneutem Versand sichtbar.",
    approvalCount: "Einwilligungsprobleme im aktuellen Rollenbereich",
    notificationRulesTitle: "Benachrichtigungsregeln",
    notificationRulesDescription: "Regeln enthalten Zielvorschau, Sprachmodus, Freigabeschritt und Ersatzkanal vor Produktionsversand.",
    retryCount: "Wiederholungen",
    deliveryQueueTitle: "Zustell- und Wiederholungsqueue",
    deliveryQueueDescription: "Zustellversuche, Provider-Modus und nächste Wiederholung werden vor Live-Provider-Anbindung verfolgt.",
    deliveryCount: "Zustellungen",
    templateLibraryTitle: "Mehrsprachige Vorlagenbibliothek",
    templateLibraryDescription: "TR-, EN-, DE- und RU-Vorlagen sind variablenbasiert, freigabebewusst und provider-ready.",
    approvalCountLabel: "Freigabe",
    qualityGateTitle: "Rollensichere Kommunikationsqualitätsprüfung",
    qualityGateDescription: "Der aktuelle Demo-Vertrag verfolgt {threads} Verläufe, {rules} aktive Regeln und {templates} mehrsprachige Vorlagen.",
    phaseReady: "Phase 11 bereit für UAT",
  },
  ru: {
    title: "Центр коммуникаций",
    introClient: "Сообщения портала, уведомления и ответы управления фильтруются по вашему аккаунту и доступной квартире.",
    introField: "Полевые команды видят сообщения по задачам, SLA-уведомления, ответы по маршрутам и контроль медиа-доказательств без финансового шума.",
    introDefault: "Омниканальный входящий поток, правила уведомлений, очередь повторной доставки и многоязычные шаблоны управляются в одном аудируемом рабочем пространстве.",
    openThreads: "Открытые диалоги",
    urgentFollowUp: "Срочное сопровождение",
    activeRules: "Активные правила",
    fourLanguageTemplates: "Шаблоны на 4 языках",
    lifecycleTitle: "Путь гостя",
    lifecycleDescription: "Благодарность за бронирование, подготовка к приезду, день заезда, первая проверка комфорта, выезд и обратная связь идут с учетом согласий, рисков и правил остановки.",
    journeySteps: "шагов пути",
    suppressed: "остановлено",
    antiSpamTitle: "Антиспам-правила",
    antiSpamDescription: "Сообщения остаются ненавязчивыми: одно полезное касание в нужный момент, без повторных проверок комфорта и без просьбы об отзыве при открытом риске депозита, сервиса или жалобы.",
    feedbackScope: "моментов обратной связи или восстановления",
    edgeTitle: "Обработка исключений",
    edgeDescription: "Отмененные бронирования, неоплаченные резервы, отсутствие согласия, заблокированный доступ и споры по депозиту переводят отправку в режим проверки или только портала.",
    portalConversations: "Диалоги портала",
    omnichannelInbox: "Омниканальный входящий поток",
    inboxDescription: "Каждый диалог связан с квартирой, бронированием, финансовой позицией, задачей или пакетом документов, включая согласие и язык.",
    actions: "Действия",
    lifecycleActions: "Действия по пути гостя",
    lifecycleMessagePrepare: "Подготовить сообщение",
    lifecycleMessageAria: "Подготовить сообщение по пути гостя",
    communicationActionsAria: "Действия центра коммуникаций",
    broadcastPrepare: "Подготовить рассылку",
    broadcastDescription: "Черновик для {count} видимых диалогов.",
    broadcastTitle: "Черновик рассылки подготовлен",
    messageActions: "Действия сообщения",
    replyDraft: "Подготовить черновик ответа",
    replyDraftAria: "Подготовить черновик ответа",
    ruleActions: "Действия правила",
    ruleReview: "Проверить правило уведомления",
    ruleReviewAria: "Проверить правило уведомления",
    approvalGateOpen: "Шаг одобрения активен.",
    ruleStatusReview: "Статус правила будет проверен.",
    deliveryActions: "Действия доставки",
    retryDelivery: "Повторить доставку",
    retryDeliveryAria: "Повторить доставку уведомления",
    deliveryRetryDescription: "{attempts} попыток доставки для {channel}.",
    templateActions: "Действия шаблона",
    templateApprovalPrepare: "Подготовить шаблон к одобрению",
    templateApprovalAria: "Подготовить шаблон сообщения к одобрению",
    providerTitle: "Симуляция готовности провайдера",
    providerDescription: "SMS, email, push и сообщения портала пока используют демо-очереди; адаптеры провайдеров включаются после договоров и API-ключей.",
    providerCount: "доставок для повтора или ручной проверки",
    approvalTitle: "Одобрение и резервный канал",
    approvalDescription: "Неверный получатель, отсутствие согласия, отписка, финансовый спор и ошибка провайдера видны до повторной отправки.",
    approvalCount: "проблем согласия в текущей роли",
    notificationRulesTitle: "Правила уведомлений",
    notificationRulesDescription: "Правила включают предпросмотр цели, язык, шаг одобрения и резервный канал до production-отправки.",
    retryCount: "повторов",
    deliveryQueueTitle: "Очередь доставки и повторов",
    deliveryQueueDescription: "Попытки доставки, режим провайдера и время повтора отслеживаются до подключения live-провайдера.",
    deliveryCount: "доставок",
    templateLibraryTitle: "Многоязычная библиотека шаблонов",
    templateLibraryDescription: "Шаблоны TR, EN, DE и RU основаны на переменных, учитывают одобрение и готовы к адаптерам провайдеров.",
    approvalCountLabel: "одобрение",
    qualityGateTitle: "Контроль качества коммуникаций по ролям",
    qualityGateDescription: "Текущий демо-контракт отслеживает {threads} диалогов, {rules} активных правил и {templates} многоязычных шаблонов.",
    phaseReady: "Фаза 11 готова к UAT",
  },
} as const

function resolveCommunicationsLocale(locale: string): keyof typeof communicationsCopy {
  return locale in communicationsCopy ? (locale as keyof typeof communicationsCopy) : "tr"
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template
  )
}

function statusVariant(status: CommunicationThreadRecord["status"]) {
  if (status === "needs_reply" || status === "blocked") return "danger"
  if (status === "in_progress") return "warning"
  return "success"
}

function statusLabel(status: CommunicationThreadRecord["status"]) {
  if (status === "needs_reply") return "Reply needed"
  if (status === "in_progress") return "In progress"
  if (status === "blocked") return "Blocked"
  return "Ready"
}

function priorityVariant(priority: CommunicationThreadRecord["priority"]) {
  if (priority === "urgent" || priority === "high") return "danger"
  if (priority === "medium") return "warning"
  return "neutral"
}

function ruleVariant(status: NotificationRuleRecord["status"]) {
  if (status === "active") return "success"
  if (status === "review") return "warning"
  return "neutral"
}

function deliveryVariant(status: string) {
  if (status === "delivered" || status === "sent") return "success"
  if (status === "queued" || status === "manual_review") return "warning"
  return "danger"
}

function templateVariant(status: MessageTemplateRecord["approvalStatus"]) {
  if (status === "approved") return "success"
  if (status === "needs_review") return "warning"
  return "neutral"
}

function lifecycleVariant(status: GuestLifecycleEventRecord["status"]) {
  if (status === "sent" || status === "ready") return "success"
  if (status === "queued" || status === "needs_review") return "warning"
  return "neutral"
}

function lifecycleStageLabel(stage: GuestLifecycleEventRecord["stage"]) {
  if (stage === "booking_confirmed") return "Booking"
  if (stage === "pre_arrival") return "Pre-arrival"
  if (stage === "arrival_day") return "Arrival"
  if (stage === "in_stay") return "In-stay"
  if (stage === "checkout") return "Checkout"
  return "Feedback"
}

function lifecycleToneVariant(tone: GuestLifecycleEventRecord["tone"]) {
  if (tone === "risk") return "danger"
  if (tone === "feedback" || tone === "service") return "info"
  if (tone === "warm") return "success"
  return "neutral"
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export default function CommunicationsPage() {
  const copy = communicationsCopy[resolveCommunicationsLocale(useLocale())]
  const user = useUser()
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const visibleThreads = visibleCommunicationThreadsForRole(user.role, communicationThreads)
  const visibleRules = visibleNotificationRulesForRole(user.role, notificationRules)
  const visibleDeliveries = visibleNotificationDeliveriesForRole(user.role, notificationDeliveries)
  const visibleTemplates = visibleMessageTemplatesForRole(user.role, messageTemplates)
  const visibleLifecycle = visibleGuestLifecycleEventsForRole(user.role, guestLifecycleEvents)
  const summary = getCommunicationSummary()
  const urgent = visibleThreads.filter((item) => item.priority === "high" || item.priority === "urgent").length
  const consentIssues = visibleThreads.filter((item) => item.consentStatus !== "ok").length
  const deliveryIssues = visibleDeliveries.filter(
    (item) => item.status === "failed" || item.status === "manual_review"
  ).length
  const feedbackOrRecovery = visibleLifecycle.filter(
    (item) => item.stage === "post_stay_feedback" || item.sentimentSignal === "recovery"
  ).length
  const suppressedLifecycle = visibleLifecycle.filter((item) => item.status === "suppressed").length

  const intro = clientView
    ? copy.introClient
    : fieldView
      ? copy.introField
      : copy.introDefault

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.openThreads}</p>
              <p className="text-2xl font-black">{visibleThreads.length}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BellRing className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.urgentFollowUp}</p>
              <p className="text-2xl font-black">{urgent}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Send className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.activeRules}</p>
              <p className="text-2xl font-black">{visibleRules.filter((rule) => rule.status === "active").length}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Languages className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.fourLanguageTemplates}</p>
              <p className="text-2xl font-black">{visibleTemplates.filter((template) => template.languages.length >= 4).length}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card3D glow={false}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{copy.lifecycleTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.lifecycleDescription}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge variant="info">{visibleLifecycle.length} {copy.journeySteps}</StatusBadge>
              <StatusBadge variant={suppressedLifecycle > 0 ? "warning" : "success"}>
                {suppressedLifecycle} {copy.suppressed}
              </StatusBadge>
            </div>
          </div>
          <DataTable
            data={visibleLifecycle}
            searchValue={(item) => `${item.id} ${item.bookingId} ${item.flatNumber} ${item.guestName} ${item.stage} ${item.title} ${item.body} ${item.edgeCase}`}
            pageSize={8}
            columns={[
              { key: "id", header: "Step", sortable: true, render: (item) => item.id },
              { key: "booking", header: "Booking", sortable: true, render: (item) => item.bookingId },
              { key: "guest", header: clientView ? "Record" : "Guest", render: (item) => item.guestName },
              {
                key: "stage",
                header: "Moment",
                sortable: true,
                render: (item) => lifecycleStageLabel(item.stage),
              },
              { key: "channel", header: "Channel", sortable: true, render: (item) => item.channel },
              {
                key: "tone",
                header: "Tone",
                render: (item) => <StatusBadge variant={lifecycleToneVariant(item.tone)}>{item.tone}</StatusBadge>,
              },
              {
                key: "status",
                header: "Status",
                render: (item) => <StatusBadge variant={lifecycleVariant(item.status)}>{item.status}</StatusBadge>,
              },
              { key: "timing", header: "Timing", render: (item) => item.timing },
              { key: "text", header: "Text", render: (item) => item.body },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: "Action",
                      sticky: "right" as const,
                      render: (item: GuestLifecycleEventRecord) => (
                        <DashboardActionMenu
                          compact
                          label={copy.lifecycleActions}
                          ariaLabel={`${item.id} ${copy.lifecycleActions}`}
                          items={[
                            {
                              key: "message",
                              label: copy.lifecycleMessagePrepare,
                              description: `${item.channel} / ${item.status}`,
                              icon: <CalendarCheck2 />,
                              actionType: "guest_lifecycle.message.prepare",
                              ariaLabel: copy.lifecycleMessageAria,
                              entityTable: "guest_lifecycle_events",
                              entityExternalId: item.id,
                              title: item.title,
                              metadata: {
                                bookingId: item.bookingId,
                                stage: item.stage,
                                channel: item.channel,
                                status: item.status,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <MessageCircleWarning className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.antiSpamTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.antiSpamDescription}
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{feedbackOrRecovery}</p>
                <p className="text-xs text-muted-foreground">{copy.feedbackScope}</p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <CalendarCheck2 className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.edgeTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.edgeDescription}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">
                {clientView ? copy.portalConversations : copy.omnichannelInbox}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.inboxDescription}
              </p>
            </div>
            {!clientView && !fieldView && (
              <DashboardActionMenu
                label={copy.actions}
                ariaLabel={copy.communicationActionsAria}
                items={[
                  {
                    key: "broadcast",
                    label: copy.broadcastPrepare,
                    description: formatCopy(copy.broadcastDescription, { count: visibleThreads.length }),
                    icon: <Send />,
                    actionType: "communication.broadcast.prepare",
                    ariaLabel: copy.broadcastPrepare,
                    entityTable: "communications",
                    entityExternalId: "broadcast",
                    title: copy.broadcastTitle,
                    metadata: { visibleThreads: visibleThreads.length, role: user.role },
                  },
                ]}
              />
            )}
          </div>

          <DataTable
            data={visibleThreads}
            searchValue={(item) => `${item.id} ${item.channel} ${item.audience} ${item.subject} ${item.owner} ${item.relatedEntity} ${item.nextAction}`}
            pageSize={10}
            columns={[
              { key: "id", header: "Thread", sortable: true, render: (item) => item.id },
              { key: "channel", header: "Channel", sortable: true, render: (item) => item.channel },
              ...(!clientView
                ? [
                    {
                      key: "audience",
                      header: "Audience",
                      render: (item: CommunicationThreadRecord) => item.audience,
                    },
                  ]
                : []),
              { key: "subject", header: "Subject", render: (item) => item.subject },
              {
                key: "priority",
                header: "Priority",
                render: (item) => (
                  <StatusBadge variant={priorityVariant(item.priority)}>{item.priority}</StatusBadge>
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (item) => (
                  <StatusBadge variant={statusVariant(item.status)}>{statusLabel(item.status)}</StatusBadge>
                ),
              },
              { key: "language", header: "Lang", sortable: true, render: (item) => item.language.toUpperCase() },
              { key: "next", header: "Next action", render: (item) => item.nextAction },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: "Action",
                      sticky: "right" as const,
                      render: (item: CommunicationThreadRecord) => (
                        <DashboardActionMenu
                          compact
                          label={copy.messageActions}
                          ariaLabel={`${item.id} ${copy.messageActions}`}
                          items={[
                            {
                              key: "reply",
                              label: copy.replyDraft,
                              description: `${item.channel} / ${item.language.toUpperCase()}`,
                              icon: <MessageSquareText />,
                              actionType: "communication.reply.prepare",
                              ariaLabel: copy.replyDraftAria,
                              entityTable: "communications",
                              entityExternalId: item.id,
                              title: item.nextAction,
                              metadata: {
                                relatedEntity: item.relatedEntity,
                                channel: item.channel,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.providerTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.providerDescription}
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{summary.deliveryFailures}</p>
                <p className="text-xs text-muted-foreground">{copy.providerCount}</p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.approvalTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.approvalDescription}
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{consentIssues}</p>
                <p className="text-xs text-muted-foreground">{copy.approvalCount}</p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card3D glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{copy.notificationRulesTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.notificationRulesDescription}
              </p>
            </div>
            <StatusBadge variant={deliveryIssues > 0 ? "warning" : "success"}>{deliveryIssues} {copy.retryCount}</StatusBadge>
          </div>
          <DataTable
            data={visibleRules}
            searchValue={(item) => `${item.id} ${item.trigger} ${item.target} ${item.channel} ${item.owner} ${item.failover}`}
            pageSize={8}
            columns={[
              { key: "id", header: "Kural", sortable: true, render: (item) => item.id },
              { key: "trigger", header: "Tetikleyici", render: (item) => item.trigger },
              { key: "target", header: "Hedef", render: (item) => item.target },
              { key: "channel", header: "Kanal", render: (item) => item.channel },
              {
                key: "status",
                header: "Durum",
                render: (item) => <StatusBadge variant={ruleVariant(item.status)}>{item.status}</StatusBadge>,
              },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: "Aksiyon",
                      sticky: "right" as const,
                      render: (item: NotificationRuleRecord) => (
                        <DashboardActionMenu
                          compact
                          label={copy.ruleActions}
                          ariaLabel={`${item.id} ${copy.ruleActions}`}
                          items={[
                            {
                              key: "review",
                              label: copy.ruleReview,
                              description: item.approvalRequired
                                ? copy.approvalGateOpen
                                : copy.ruleStatusReview,
                              icon: <BellRing />,
                              actionType: "notification.rule.review",
                              ariaLabel: copy.ruleReviewAria,
                              entityTable: "notifications",
                              entityExternalId: item.id,
                              title: item.trigger,
                              metadata: {
                                owner: item.owner,
                                approvalRequired: item.approvalRequired,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>

        <Card3D glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{copy.deliveryQueueTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.deliveryQueueDescription}
              </p>
            </div>
            <StatusBadge variant="info">{visibleDeliveries.length} {copy.deliveryCount}</StatusBadge>
          </div>
          <DataTable
            data={visibleDeliveries}
            searchValue={(item) => `${item.id} ${item.ruleId} ${item.recipient} ${item.channel} ${item.status} ${item.providerMode}`}
            pageSize={8}
            columns={[
              { key: "id", header: "Teslim", sortable: true, render: (item) => item.id },
              { key: "recipient", header: "Alıcı", render: (item) => item.recipient },
              { key: "channel", header: "Kanal", sortable: true, render: (item) => item.channel },
              {
                key: "status",
                header: "Durum",
                render: (item) => <StatusBadge variant={deliveryVariant(item.status)}>{item.status}</StatusBadge>,
              },
              { key: "mode", header: "Mod", render: (item) => item.providerMode },
              { key: "retry", header: "Tekrar", render: (item) => shortDate(item.nextRetryAt) },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: "Aksiyon",
                      sticky: "right" as const,
                      render: (item: (typeof visibleDeliveries)[number]) => (
                        <DashboardActionMenu
                          compact
                          label={copy.deliveryActions}
                          ariaLabel={`${item.id} ${copy.deliveryActions}`}
                          items={[
                            {
                              key: "retry",
                              label: copy.retryDelivery,
                              description: formatCopy(copy.deliveryRetryDescription, {
                                attempts: item.attempts,
                                channel: item.channel,
                              }),
                              icon: <RefreshCcw />,
                              actionType: "notification.delivery.retry",
                              ariaLabel: copy.retryDeliveryAria,
                              entityTable: "notification_deliveries",
                              entityExternalId: item.id,
                              title: item.status,
                              metadata: {
                                ruleId: item.ruleId,
                                attempts: item.attempts,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">{copy.templateLibraryTitle}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.templateLibraryDescription}
            </p>
          </div>
          <StatusBadge variant={summary.pendingApprovals > 0 ? "warning" : "success"}>
            {summary.pendingApprovals} {copy.approvalCountLabel}
          </StatusBadge>
        </div>
        <DataTable
          data={visibleTemplates}
          searchValue={(item) => `${item.id} ${item.title} ${item.useCase} ${item.owner} ${item.preview} ${item.variables.join(" ")}`}
          pageSize={8}
          columns={[
            { key: "id", header: "Template", sortable: true, render: (item) => item.id },
            { key: "title", header: "Title", render: (item) => item.title },
            { key: "useCase", header: "Use case", sortable: true, render: (item) => item.useCase },
            { key: "channel", header: "Channel", render: (item) => item.channel },
            { key: "languages", header: "Languages", render: (item) => item.languages.map((language) => language.toUpperCase()).join(", ") },
            {
              key: "status",
              header: "Approval",
              render: (item) => (
                <StatusBadge variant={templateVariant(item.approvalStatus)}>{item.approvalStatus}</StatusBadge>
              ),
            },
            { key: "preview", header: "Preview", render: (item) => item.preview },
            ...(!clientView && !fieldView
              ? [
                  {
                    key: "action",
                    header: "Action",
                    sticky: "right" as const,
                    render: (item: MessageTemplateRecord) => (
                      <DashboardActionMenu
                        compact
                        label={copy.templateActions}
                        ariaLabel={`${item.id} ${copy.templateActions}`}
                        items={[
                          {
                            key: "approval",
                            label: copy.templateApprovalPrepare,
                            description: item.languages
                              .map((language) => language.toUpperCase())
                              .join(", "),
                            icon: <Languages />,
                            actionType: "message_template.approve.prepare",
                            ariaLabel: copy.templateApprovalAria,
                            entityTable: "message_templates",
                            entityExternalId: item.id,
                            title: item.title,
                            metadata: {
                              useCase: item.useCase,
                              languages: item.languages,
                            },
                          },
                        ]}
                      />
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card3D>

      <Card3D glow={false}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{copy.qualityGateTitle}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCopy(copy.qualityGateDescription, {
                  threads: summary.openThreads,
                  rules: summary.activeRules,
                  templates: summary.multilingualTemplates,
                })}
              </p>
            </div>
          </div>
          <StatusBadge variant="success">{copy.phaseReady}</StatusBadge>
        </div>
      </Card3D>
    </div>
  )
}
