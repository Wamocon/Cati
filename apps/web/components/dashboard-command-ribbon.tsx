"use client"

import { useMemo, useState } from "react"
import { useLocale } from "next-intl"
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  MessageSquareText,
  PlugZap,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Smartphone,
  TicketCheck,
  Users,
  Wrench,
  X,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { AppDialog } from "@/components/app-dialog"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { hasPermission, type Resource, type Role } from "@/lib/rbac"
import { normalizeSearchText } from "@/lib/search"
import {
  accessControlRecords,
  aiImageWorkflows,
  aiPremiumRecommendations,
  bookingReadinessRecords,
  bookings,
  buyerEligibility,
  communicationThreads,
  depositSettlements,
  documentPackets,
  documentVault,
  flats,
  formatEur,
  formatTry,
  getDebtAccounts,
  guestLifecycleEvents,
  integrationProviders,
  messageTemplates,
  mobileWebCapabilities,
  notificationDeliveries,
  offlineSyncQueue,
  paymentPlans,
  phaseDeliveryRecords,
  purchaseChecklist,
  residents,
  reportCards,
  roleOnboardingPlans,
  serviceCatalogItems,
  serviceOrders,
  serviceTickets,
  viewingPipeline,
  workforceTasks,
} from "@/lib/site-management-data"
import {
  isClientRole,
  isFieldRole,
  visibleCommunicationThreadsForRole,
  visibleBookingReadinessForRole,
  visibleDepositSettlementsForRole,
  visibleDocumentPacketsForRole,
  visibleGuestLifecycleEventsForRole,
  visibleNotificationDeliveriesForRole,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"

type CommandScope =
  | "portfolio"
  | "people"
  | "service"
  | "finance"
  | "calendar"
  | "documents"
  | "communications"
  | "compliance"
  | "mobile"
  | "integrations"
  | "reports"
  | "team"

type Priority = "critical" | "high" | "normal"

interface CommandItem {
  id: string
  title: string
  subtitle: string
  meta: string
  href: string
  resource: Resource
  scope: CommandScope
  priority: Priority
  keywords: string
}

const scopeLabels: Record<CommandScope | "all", string> = {
  all: "Tümü",
  portfolio: "Daire",
  people: "Kişi",
  service: "Servis",
  finance: "Finans",
  calendar: "Takvim",
  documents: "Belge",
  communications: "Mesaj",
  compliance: "Uyum",
  mobile: "Mobil",
  integrations: "Entegrasyon",
  reports: "Rapor",
  team: "Ekip",
}

const ribbonCopy = {
  tr: {
    aria: "Operasyon arama ve filtreleri",
    searchTitle: "Kayıt ara ve filtrele",
    searchHint: "Kategori, arama metni ve takip durumunu seçin.",
    matchedHint: "{count} kayıt eşleşti. Değiştirmek için filtreleri açın.",
    filters: "Filtreler",
    attention: "Takipteki",
    index: "İndeks",
    applied: "Uygulanan",
    appliedResults: "Uygulanan sonuçlar",
    recordsMatched: "{count} kayıt eşleşti",
    adjust: "Düzenle",
    clear: "Temizle",
    noResults: "Eşleşen kayıt yok",
    dialogTitle: "Arama ve filtreler",
    dialogDescription: "Önce eşleşmeleri görün. Dashboard sadece Uygula sonrası değişir.",
    reset: "Sıfırla",
    cancel: "İptal",
    close: "Kapat",
    apply: "Filtreleri uygula",
    searchText: "Arama metni",
    searchPlaceholder: "A-42, malik, talep, borç, belge...",
    clearSearch: "Arama metnini temizle",
    category: "Kategori",
    attentionOnly: "Sadece takip",
    followupRecords: "{count} kayıt takip gerektiriyor",
    on: "Açık",
    off: "Kapalı",
    preview: "Önizleme",
    recordsWillMatch: "{count} kayıt eşleşecek",
    ready: "Hazır",
    noMatch: "Eşleşme yok",
    noPreviewRecords: "Önizleme kaydı yok",
    priorities: { critical: "Acil", high: "Takip", normal: "Normal" },
    scopes: scopeLabels,
  },
  en: {
    aria: "Operational search and filters",
    searchTitle: "Search and filter records",
    searchHint: "Choose category, search text and attention status before results change.",
    matchedHint: "{count} matched records. Open filters to adjust.",
    filters: "Filters",
    attention: "Watching",
    index: "Index",
    applied: "Applied",
    appliedResults: "Applied results",
    recordsMatched: "{count} records matched",
    adjust: "Adjust",
    clear: "Clear",
    noResults: "No records matched",
    dialogTitle: "Search and filters",
    dialogDescription: "Preview matches first. The dashboard changes only after Apply.",
    reset: "Reset",
    cancel: "Cancel",
    close: "Close",
    apply: "Apply filters",
    searchText: "Search text",
    searchPlaceholder: "A-42, owner, ticket, debt, document...",
    clearSearch: "Clear search text",
    category: "Category",
    attentionOnly: "Attention only",
    followupRecords: "{count} records need follow-up",
    on: "On",
    off: "Off",
    preview: "Preview",
    recordsWillMatch: "{count} records will match",
    ready: "Ready",
    noMatch: "No match",
    noPreviewRecords: "No preview records",
    priorities: { critical: "Critical", high: "High", normal: "Normal" },
    scopes: {
      all: "All",
      portfolio: "Units",
      people: "People",
      service: "Service",
      finance: "Finance",
      calendar: "Calendar",
      documents: "Documents",
      communications: "Messages",
      compliance: "Compliance",
      mobile: "Mobile",
      integrations: "Integrations",
      reports: "Reports",
      team: "Team",
    },
  },
  de: {
    aria: "Operationssuche und Filter",
    searchTitle: "Datensätze suchen und filtern",
    searchHint: "Kategorie, Suchtext und Beobachtungsstatus auswählen.",
    matchedHint: "{count} passende Datensätze. Filter öffnen, um anzupassen.",
    filters: "Filter",
    attention: "Beobachtet",
    index: "Index",
    applied: "Aktiv",
    appliedResults: "Aktive Ergebnisse",
    recordsMatched: "{count} Datensätze passen",
    adjust: "Anpassen",
    clear: "Leeren",
    noResults: "Keine passenden Datensätze",
    dialogTitle: "Suche und Filter",
    dialogDescription: "Treffer zuerst prüfen. Das Dashboard ändert sich erst nach Anwenden.",
    reset: "Zurücksetzen",
    cancel: "Abbrechen",
    close: "Schließen",
    apply: "Filter anwenden",
    searchText: "Suchtext",
    searchPlaceholder: "A-42, Eigentümer, Ticket, Schuld, Dokument...",
    clearSearch: "Suchtext löschen",
    category: "Kategorie",
    attentionOnly: "Nur Beobachtete",
    followupRecords: "{count} Datensätze brauchen Nachverfolgung",
    on: "Ein",
    off: "Aus",
    preview: "Vorschau",
    recordsWillMatch: "{count} Datensätze werden passen",
    ready: "Bereit",
    noMatch: "Kein Treffer",
    noPreviewRecords: "Keine Vorschaudatensätze",
    priorities: { critical: "Kritisch", high: "Hoch", normal: "Normal" },
    scopes: {
      all: "Alle",
      portfolio: "Einheiten",
      people: "Personen",
      service: "Service",
      finance: "Finanzen",
      calendar: "Kalender",
      documents: "Dokumente",
      communications: "Nachrichten",
      compliance: "Compliance",
      mobile: "Mobil",
      integrations: "Integrationen",
      reports: "Berichte",
      team: "Team",
    },
  },
  ru: {
    aria: "Операционный поиск и фильтры",
    searchTitle: "Поиск и фильтр записей",
    searchHint: "Выберите категорию, текст поиска и статус наблюдения.",
    matchedHint: "{count} записей найдено. Откройте фильтры для изменения.",
    filters: "Фильтры",
    attention: "В наблюдении",
    index: "Индекс",
    applied: "Применено",
    appliedResults: "Результаты",
    recordsMatched: "{count} записей найдено",
    adjust: "Изменить",
    clear: "Очистить",
    noResults: "Совпадений нет",
    dialogTitle: "Поиск и фильтры",
    dialogDescription: "Сначала проверьте совпадения. Dashboard меняется только после применения.",
    reset: "Сбросить",
    cancel: "Отмена",
    close: "Закрыть",
    apply: "Применить фильтры",
    searchText: "Текст поиска",
    searchPlaceholder: "A-42, владелец, заявка, долг, документ...",
    clearSearch: "Очистить текст поиска",
    category: "Категория",
    attentionOnly: "Только под наблюдением",
    followupRecords: "{count} записей требуют контроля",
    on: "Вкл",
    off: "Выкл",
    preview: "Предпросмотр",
    recordsWillMatch: "{count} записей будет найдено",
    ready: "Готово",
    noMatch: "Нет совпадений",
    noPreviewRecords: "Нет записей для предпросмотра",
    priorities: { critical: "Критично", high: "Высокий", normal: "Норма" },
    scopes: {
      all: "Все",
      portfolio: "Юниты",
      people: "Люди",
      service: "Сервис",
      finance: "Финансы",
      calendar: "Календарь",
      documents: "Документы",
      communications: "Сообщения",
      compliance: "Контроль",
      mobile: "Мобильный",
      integrations: "Интеграции",
      reports: "Отчеты",
      team: "Команда",
    },
  },
} as const

function resolveRibbonLocale(locale: string): keyof typeof ribbonCopy {
  return locale in ribbonCopy ? (locale as keyof typeof ribbonCopy) : "tr"
}

function formatRibbonText(template: string, values: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    values[key] === undefined ? `{${key}}` : String(values[key])
  )
}

const scopeOrder: CommandScope[] = [
  "portfolio",
  "service",
  "finance",
  "calendar",
  "people",
  "documents",
  "communications",
  "compliance",
  "mobile",
  "integrations",
  "reports",
  "team",
]

const scopeIcon = {
  portfolio: Building2,
  people: Users,
  service: TicketCheck,
  finance: CreditCard,
  calendar: CalendarDays,
  documents: FileText,
  communications: MessageSquareText,
  compliance: ShieldCheck,
  mobile: Smartphone,
  integrations: PlugZap,
  reports: BarChart3,
  team: Wrench,
} satisfies Record<CommandScope, typeof Building2>

function priorityVariant(priority: Priority) {
  if (priority === "critical") return "danger"
  if (priority === "high") return "warning"
  return "neutral"
}

function canView(role: Role, resource: Resource) {
  return hasPermission(role, resource, "view")
}

function buildCommandIndex(role: Role): CommandItem[] {
  const items: CommandItem[] = []
  const clientView = isClientRole(role)
  const fieldView = isFieldRole(role)

  function add(item: CommandItem) {
    if (canView(role, item.resource)) items.push(item)
  }

  if (canView(role, "listings")) {
    flats.forEach((flat) => {
      const hasRisk =
        flat.accessStatus === "restricted" ||
        flat.paymentStatus === "legal" ||
        flat.paymentStatus === "overdue" ||
        flat.serviceOpen > 0

      add({
        id: `flat-${flat.id}`,
        title: flat.displayNumber,
        subtitle: `${flat.block} blok / ${flat.type}`,
        meta: `${flat.saleStatus} / ${flat.accessStatus} / ${formatTry(flat.balanceTry)}`,
        href: "/dashboard/listings",
        resource: "listings",
        scope: "portfolio",
        priority: flat.accessStatus === "restricted" || flat.paymentStatus === "legal" ? "critical" : hasRisk ? "high" : "normal",
        keywords: `${flat.id} ${flat.displayNumber} ${flat.block} ${flat.type} ${flat.ownerName} ${flat.residentName} ${flat.status} ${flat.saleStatus} ${flat.accessStatus} ${flat.paymentStatus}`,
      })
    })
  }

  if (canView(role, "leads")) {
    residents.forEach((resident) => {
      add({
        id: `resident-${resident.id}`,
        title: resident.name,
        subtitle: `${resident.flatNumber} / ${resident.relation}`,
        meta: `${resident.communicationPreference} / risk ${resident.riskScore}`,
        href: "/dashboard/leads",
        resource: "leads",
        scope: "people",
        priority: resident.riskScore >= 70 ? "critical" : resident.riskScore >= 55 ? "high" : "normal",
        keywords: `${resident.id} ${resident.name} ${resident.flatNumber} ${resident.phone} ${resident.email} ${resident.language} ${resident.relation}`,
      })
    })
  }

  if (canView(role, "tickets")) {
    const visibleTickets = visibleServiceTicketsForRole(role, serviceTickets)
    const visibleTicketIds = new Set(visibleTickets.map((ticket) => ticket.id))

    visibleTickets.forEach((ticket) => {
      add({
        id: `ticket-${ticket.id}`,
        title: ticket.title,
        subtitle: `${ticket.id} / ${ticket.flatNumber}`,
        meta: `${ticket.status} / SLA ${ticket.slaHoursRemaining} saat`,
        href: "/dashboard/tickets",
        resource: "tickets",
        scope: "service",
        priority: ticket.priority === "urgent" || ticket.slaHoursRemaining < 0 || ticket.debtBlocked ? "critical" : ticket.priority === "high" ? "high" : "normal",
        keywords: `${ticket.id} ${ticket.flatNumber} ${ticket.title} ${ticket.category} ${ticket.priority} ${ticket.status} ${ticket.assignee} ${ticket.requester}`,
      })
    })

    serviceCatalogItems.forEach((service) => {
      add({
        id: `catalog-${service.id}`,
        title: service.name,
        subtitle: `${service.code} / ${service.team}`,
        meta: `${formatTry(service.basePriceTry)} / SLA ${service.slaHours} saat`,
        href: "/dashboard/tickets",
        resource: "tickets",
        scope: "service",
        priority: service.serviceLevel === "emergency" ? "high" : "normal",
        keywords: `${service.id} ${service.code} ${service.name} ${service.category} ${service.team} ${service.debtPolicy} ${service.providerType}`,
      })
    })

    if (!clientView) {
      serviceOrders
        .filter((order) => visibleTicketIds.has(order.ticketId))
        .forEach((order) => {
          add({
            id: `order-${order.id}`,
            title: order.catalogItemName,
            subtitle: `${order.orderNo} / ${order.flatNumber}`,
            meta: `${order.status} / ${order.nextAction}`,
            href: "/dashboard/tickets",
            resource: "tickets",
            scope: "service",
            priority: order.status === "blocked" || order.debtCheckStatus === "blocked" ? "critical" : order.status === "payment_pending" ? "high" : "normal",
            keywords: `${order.id} ${order.orderNo} ${order.catalogItemName} ${order.flatNumber} ${order.requester} ${order.status} ${order.debtCheckStatus} ${order.assignedTeam}`,
          })
        })

      workforceTasks
        .filter((task) => visibleTicketIds.has(task.ticketId))
        .forEach((task) => {
          add({
            id: `task-${task.id}`,
            title: task.title,
            subtitle: `${task.id} / ${task.flatNumber}`,
            meta: `${task.team} / ${task.assignee} / ${task.completionReadiness}%`,
            href: "/dashboard/tickets",
            resource: "tickets",
            scope: "service",
            priority: task.slaHoursRemaining < 0 || task.managerApprovalRequired ? "critical" : task.priority === "high" || task.priority === "urgent" ? "high" : "normal",
            keywords: `${task.id} ${task.ticketId} ${task.flatNumber} ${task.title} ${task.team} ${task.assignee} ${task.status} ${task.routeSlot} ${task.fieldNote}`,
          })
        })
    }
  }

  if (canView(role, "finance")) {
    getDebtAccounts().forEach((account) => {
      add({
        id: `debt-${account.flatId}`,
        title: account.flatNumber,
        subtitle: account.ownerName,
        meta: `${formatTry(account.balanceTry)} / ${account.agingBucket} gun`,
        href: "/dashboard/finance",
        resource: "finance",
        scope: "finance",
        priority: account.paymentStatus === "legal" ? "critical" : account.paymentStatus === "overdue" ? "high" : "normal",
        keywords: `${account.flatId} ${account.flatNumber} ${account.ownerName} ${account.paymentStatus} ${account.accessStatus} ${account.suggestedAction}`,
      })
    })

    paymentPlans.forEach((plan) => {
      add({
        id: `payment-${plan.id}`,
        title: plan.dealName,
        subtitle: `${plan.buyerName} / ${plan.unitType}`,
        meta: `${formatEur(plan.nextDueEur)} / ${plan.status}`,
        href: "/dashboard/finance",
        resource: "finance",
        scope: "finance",
        priority: plan.status === "blocked" || plan.status === "overdue" ? "critical" : plan.status === "due_soon" ? "high" : "normal",
        keywords: `${plan.id} ${plan.dealName} ${plan.buyerName} ${plan.unitType} ${plan.status} ${plan.approvalBlocker}`,
      })
    })
  }

  if (canView(role, "calendar")) {
    const visibleBookings = clientView ? bookings.slice(0, 4) : bookings
    visibleBookings.forEach((booking) => {
      add({
        id: `booking-${booking.id}`,
        title: booking.guestName,
        subtitle: `${booking.id} / ${booking.flatNumber}`,
        meta: `${booking.status} / ${booking.channel}`,
        href: "/dashboard/calendar",
        resource: "calendar",
        scope: "calendar",
        priority: booking.status === "checkout_today" || booking.status === "move_in_today" ? "critical" : booking.status === "deposit_review" || booking.status === "precheck_pending" ? "high" : "normal",
        keywords: `${booking.id} ${booking.flatNumber} ${booking.guestName} ${booking.channel} ${booking.status} ${booking.depositStatus} ${booking.cleaningStatus}`,
      })
    })

    visibleBookingReadinessForRole(role, bookingReadinessRecords).forEach((record) => {
      add({
        id: `booking-ready-${record.id}`,
        title: record.guestName,
        subtitle: `${record.bookingId} / ${record.flatNumber}`,
        meta: `${record.readinessScore}% / ${record.riskLevel}`,
        href: "/dashboard/calendar",
        resource: "calendar",
        scope: "calendar",
        priority: record.riskLevel === "critical" || record.riskLevel === "high" ? "critical" : record.riskLevel === "medium" ? "high" : "normal",
        keywords: `${record.id} ${record.bookingId} ${record.flatNumber} ${record.guestName} readiness move-in checkout ${record.blocker} ${record.nextAction}`,
      })
    })

    visibleDepositSettlementsForRole(role, depositSettlements).forEach((settlement) => {
      add({
        id: `settlement-${settlement.id}`,
        title: settlement.guestName,
        subtitle: `${settlement.id} / ${settlement.flatNumber}`,
        meta: `${formatTry(settlement.refundTry)} / ${settlement.status}`,
        href: "/dashboard/calendar",
        resource: "calendar",
        scope: "calendar",
        priority: settlement.status === "manager_review" || settlement.status === "evidence_needed" ? "high" : "normal",
        keywords: `${settlement.id} ${settlement.bookingId} ${settlement.flatNumber} ${settlement.guestName} deposit settlement checkout refund deduction ${settlement.status} ${settlement.nextAction}`,
      })
    })

    if (!clientView && !fieldView && canView(role, "leads")) {
      viewingPipeline.forEach((viewing) => {
        add({
          id: `viewing-${viewing.id}`,
          title: viewing.leadName,
          subtitle: `${viewing.id} / ${viewing.preferredUnit}`,
          meta: `${viewing.status} / ${viewing.channel}`,
          href: "/dashboard/calendar",
          resource: "calendar",
          scope: "calendar",
          priority: viewing.status === "follow_up_due" || viewing.status === "no_show" ? "high" : "normal",
          keywords: `${viewing.id} ${viewing.leadName} ${viewing.leadLanguage} ${viewing.buyerGoal} ${viewing.preferredUnit} ${viewing.channel} ${viewing.status} ${viewing.assignedTo}`,
        })
      })
    }
  }

  if (canView(role, "documents")) {
    documentVault.forEach((document) => {
      add({
        id: `document-${document.id}`,
        title: document.name,
        subtitle: `${document.id} / ${document.flatNumber}`,
        meta: `${document.category} / ${document.status}`,
        href: "/dashboard/documents",
        resource: "documents",
        scope: "documents",
        priority: document.status === "missing" || document.status === "expired" ? "critical" : document.status === "pending" ? "high" : "normal",
        keywords: `${document.id} ${document.name} ${document.flatNumber} ${document.ownerName} ${document.category} ${document.status} ${document.retentionRule}`,
      })
    })

    if (!clientView) {
      purchaseChecklist.forEach((document) => {
        add({
          id: `purchase-doc-${document.id}`,
          title: document.documentType,
          subtitle: `${document.dealName} / ${document.buyerName}`,
          meta: `${document.status} / ${document.risk}`,
          href: "/dashboard/documents",
          resource: "documents",
          scope: "documents",
          priority: document.status === "missing" || document.status === "expired" || document.risk === "high" ? "critical" : document.status === "pending" ? "high" : "normal",
          keywords: `${document.id} ${document.dealName} ${document.buyerName} ${document.unitType} ${document.documentType} ${document.status} ${document.owner} ${document.nextAction}`,
        })
      })
    }

    visibleDocumentPacketsForRole(role, documentPackets).forEach((packet) => {
      add({
        id: `document-packet-${packet.id}`,
        title: packet.title,
        subtitle: `${packet.id} / ${packet.relatedEntity}`,
        meta: `${packet.status} / ${packet.retentionClass}`,
        href: "/dashboard/documents",
        resource: "documents",
        scope: "documents",
        priority: packet.status === "missing_items" || packet.signatureStatus === "blocked" ? "critical" : packet.status === "review" || packet.status === "signature_pending" ? "high" : "normal",
        keywords: `${packet.id} ${packet.title} ${packet.audience} ${packet.relatedEntity} document packet signature retention ${packet.status} ${packet.nextAction}`,
      })
    })
  }

  if (canView(role, "communications")) {
    visibleCommunicationThreadsForRole(role, communicationThreads).forEach((thread) => {
      add({
        id: `communication-${thread.id}`,
        title: thread.subject,
        subtitle: `${thread.id} / ${thread.channel}`,
        meta: `${thread.status} / ${thread.priority}`,
        href: "/dashboard/communications",
        resource: "communications",
        scope: "communications",
        priority: thread.status === "blocked" || thread.priority === "urgent" || thread.priority === "high" ? "critical" : thread.status === "needs_reply" ? "high" : "normal",
        keywords: `${thread.id} ${thread.channel} ${thread.audience} ${thread.subject} ${thread.owner} ${thread.relatedEntity} ${thread.language} ${thread.lastMessage} ${thread.nextAction}`,
      })
    })

    visibleNotificationDeliveriesForRole(role, notificationDeliveries).forEach((delivery) => {
      add({
        id: `notification-delivery-${delivery.id}`,
        title: delivery.recipient,
        subtitle: `${delivery.id} / ${delivery.channel}`,
        meta: `${delivery.status} / ${delivery.providerMode}`,
        href: "/dashboard/communications",
        resource: "communications",
        scope: "communications",
        priority: delivery.status === "failed" || delivery.status === "manual_review" ? "critical" : delivery.status === "queued" ? "high" : "normal",
        keywords: `${delivery.id} ${delivery.ruleId} ${delivery.recipient} ${delivery.channel} ${delivery.status} retry provider ${delivery.relatedEntity} ${delivery.providerMode}`,
      })
    })

    visibleGuestLifecycleEventsForRole(role, guestLifecycleEvents).forEach((event) => {
      add({
        id: `guest-lifecycle-${event.id}`,
        title: event.title,
        subtitle: `${event.bookingId} / ${event.flatNumber}`,
        meta: `${event.stage} / ${event.status}`,
        href: "/dashboard/communications",
        resource: "communications",
        scope: "communications",
        priority: event.status === "suppressed" || event.status === "needs_review" || event.sentimentSignal === "recovery" ? "high" : "normal",
        keywords: `${event.id} ${event.bookingId} ${event.flatNumber} ${event.guestName} ${event.stage} ${event.channel} ${event.status} ${event.title} ${event.body} ${event.edgeCase} ${event.nextAction}`,
      })
    })

    if (!clientView && !fieldView) {
      messageTemplates.forEach((template) => {
        add({
          id: `message-template-${template.id}`,
          title: template.title,
          subtitle: `${template.id} / ${template.useCase}`,
          meta: `${template.approvalStatus} / ${template.languages.join(",")}`,
          href: "/dashboard/communications",
          resource: "communications",
          scope: "communications",
          priority: template.approvalStatus === "needs_review" ? "high" : "normal",
          keywords: `${template.id} ${template.title} ${template.useCase} ${template.channel} ${template.owner} multilingual template ${template.languages.join(" ")} ${template.variables.join(" ")} ${template.preview}`,
        })
      })
    }
  }

  if (canView(role, "eids_compliance")) {
    accessControlRecords.forEach((record) => {
      add({
        id: `access-${record.id}`,
        title: record.residentName,
        subtitle: `${record.flatNumber} / ${record.zone}`,
        meta: `${record.credential} / ${record.status}`,
        href: "/dashboard/compliance",
        resource: "eids_compliance",
        scope: "compliance",
        priority: record.riskLevel === "critical" || record.status === "restricted" ? "critical" : record.riskLevel === "high" ? "high" : "normal",
        keywords: `${record.id} ${record.flatNumber} ${record.residentName} ${record.zone} ${record.credential} ${record.status} ${record.reason} ${record.riskLevel}`,
      })
    })

    buyerEligibility.forEach((record) => {
      add({
        id: `eligibility-${record.id}`,
        title: record.buyerName,
        subtitle: `${record.targetUnit} / ${record.nationality}`,
        meta: `${record.status} / ${formatEur(record.declaredBudgetEur)}`,
        href: "/dashboard/compliance",
        resource: "eids_compliance",
        scope: "compliance",
        priority: record.status === "blocked" ? "critical" : record.status === "review_required" || record.status === "partner_review" ? "high" : "normal",
        keywords: `${record.id} ${record.buyerName} ${record.nationality} ${record.buyerGoal} ${record.targetUnit} ${record.status} ${record.legalPartner} ${record.nextAction}`,
      })
    })
  }

  if (canView(role, "offline_sync")) {
    mobileWebCapabilities.forEach((item) => {
      add({
        id: `mobile-capability-${item.id}`,
        title: item.title,
        subtitle: `${item.id} / ${item.surface}`,
        meta: `${item.status} / ${item.priority}`,
        href: "/dashboard/offline",
        resource: "offline_sync",
        scope: "mobile",
        priority: item.status === "needs_device_test" ? "high" : "normal",
        keywords: `${item.id} ${item.title} ${item.audience} ${item.surface} ${item.status} ${item.description} ${item.evidence} ${item.qaSignal}`,
      })
    })

    offlineSyncQueue.forEach((item) => {
      add({
        id: `offline-sync-${item.id}`,
        title: item.action,
        subtitle: `${item.id} / ${item.module}`,
        meta: `${item.role} / ${item.status}`,
        href: "/dashboard/offline",
        resource: "offline_sync",
        scope: "mobile",
        priority: item.status === "conflict" ? "critical" : item.status === "queued" ? "high" : "normal",
        keywords: `${item.id} ${item.role} ${item.module} ${item.action} ${item.status} ${item.device} ${item.retryPolicy} ${item.dataScope} ${item.guardrail}`,
      })
    })
  }

  if (canView(role, "settings")) {
    integrationProviders.forEach((provider) => {
      add({
        id: `integration-${provider.id}`,
        title: provider.provider,
        subtitle: `${provider.id} / ${provider.category}`,
        meta: `${provider.status} / ${provider.mode}`,
        href: "/dashboard/settings",
        resource: "settings",
        scope: "integrations",
        priority: provider.status === "blocked_pending_client" || provider.riskLevel === "high" ? "high" : "normal",
        keywords: `${provider.id} ${provider.category} ${provider.provider} ${provider.mode} ${provider.status} ${provider.idealNow} ${provider.scalePath} ${provider.requiredFromClient} ${provider.fallback}`,
      })
    })
  }

  if (canView(role, "reports")) {
    aiPremiumRecommendations.forEach((item) => {
      add({
        id: `ai-recommendation-${item.id}`,
        title: item.title,
        subtitle: `${item.id} / ${item.mode}`,
        meta: `${item.status} / ${item.confidence}%`,
        href: "/dashboard/reports",
        resource: "reports",
        scope: "reports",
        priority: item.status === "human_review" ? "high" : "normal",
        keywords: `${item.id} ${item.title} ${item.mode} ${item.audience} ${item.status} ${item.languageSupport.join(" ")} ${item.recommendation} ${item.humanApproval} ${item.modelFit}`,
      })
    })

    aiImageWorkflows.forEach((item) => {
      add({
        id: `ai-image-${item.id}`,
        title: item.title,
        subtitle: `${item.id} / ${item.source}`,
        meta: item.status,
        href: "/dashboard/reports",
        resource: "reports",
        scope: "reports",
        priority: item.status === "human_review" ? "high" : "normal",
        keywords: `${item.id} ${item.title} ${item.source} ${item.status} ${item.aiUse} ${item.guardrail} ${item.output}`,
      })
    })

    reportCards.forEach((report) => {
      add({
        id: `report-${report.id}`,
        title: report.title,
        subtitle: `${report.id} / ${report.owner}`,
        meta: `${report.cadence} / ${report.status}`,
        href: "/dashboard/reports",
        resource: "reports",
        scope: "reports",
        priority: report.status === "needs_review" ? "high" : "normal",
        keywords: `${report.id} ${report.title} ${report.cadence} ${report.owner} ${report.status} ${report.metric} ${report.insight}`,
      })
    })

    phaseDeliveryRecords.forEach((phase) => {
      add({
        id: `phase-${phase.phase}`,
        title: `Phase ${phase.phase}: ${phase.title}`,
        subtitle: phase.owner,
        meta: phase.status,
        href: "/dashboard/reports",
        resource: "reports",
        scope: "reports",
        priority: phase.status === "blocked" ? "critical" : phase.status === "planned" ? "high" : "normal",
        keywords: `${phase.phase} ${phase.title} ${phase.status} ${phase.owner} ${phase.businessOutcome} ${phase.userGuide}`,
      })
    })
  }

  if (canView(role, "users")) {
    roleOnboardingPlans.forEach((plan) => {
      add({
        id: `onboarding-${plan.role}`,
        title: plan.title,
        subtitle: `${plan.role} / ${plan.inviteMode}`,
        meta: `${plan.defaultChannel} / onboarding`,
        href: "/signup",
        resource: "users",
        scope: "team",
        priority: plan.productionGate.includes("Requires") || plan.productionGate.includes("hidden") ? "high" : "normal",
        keywords: `${plan.role} ${plan.title} ${plan.audience} ${plan.identityOptions.join(" ")} ${plan.requiredChecks.join(" ")} ${plan.firstRunSteps.join(" ")} ${plan.productionGate}`,
      })
    })

    residents.slice(0, 40).forEach((resident) => {
      add({
        id: `user-resident-${resident.id}`,
        title: resident.name,
        subtitle: `${resident.relation} / ${resident.flatNumber}`,
        meta: `${resident.language.toUpperCase()} / ${resident.communicationPreference}`,
        href: "/dashboard/users",
        resource: "users",
        scope: "team",
        priority: resident.riskScore >= 70 ? "high" : "normal",
        keywords: `${resident.id} ${resident.name} ${resident.relation} ${resident.flatNumber} ${resident.phone} ${resident.email}`,
      })
    })
  }

  return items
}

export function DashboardCommandRibbon() {
  const user = useUser()
  const copy = ribbonCopy[resolveRibbonLocale(useLocale())]
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<CommandScope | "all">("all")
  const [attentionOnly, setAttentionOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [draftQuery, setDraftQuery] = useState("")
  const [draftScope, setDraftScope] = useState<CommandScope | "all">("all")
  const [draftAttentionOnly, setDraftAttentionOnly] = useState(false)

  const index = useMemo(() => buildCommandIndex(user.role), [user.role])
  const scopeCounts = useMemo(() => {
    return scopeOrder.map((item) => ({
      scope: item,
      count: index.filter((record) => record.scope === item).length,
    }))
  }, [index])

  const normalizedQuery = normalizeSearchText(query.trim())
  const normalizedDraftQuery = normalizeSearchText(draftQuery.trim())
  const filtered = useMemo(() => {
    return index
      .filter((item) => scope === "all" || item.scope === scope)
      .filter((item) => !attentionOnly || item.priority !== "normal")
      .filter((item) => {
        if (!normalizedQuery) return true
        return normalizeSearchText(`${item.title} ${item.subtitle} ${item.meta} ${item.keywords}`).includes(normalizedQuery)
      })
      .sort((a, b) => {
        const priorityRank = { critical: 0, high: 1, normal: 2 } satisfies Record<Priority, number>
        const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.title.localeCompare(b.title, "tr", { numeric: true, sensitivity: "base" })
      })
  }, [attentionOnly, index, normalizedQuery, scope])

  const draftFiltered = useMemo(() => {
    return index
      .filter((item) => draftScope === "all" || item.scope === draftScope)
      .filter((item) => !draftAttentionOnly || item.priority !== "normal")
      .filter((item) => {
        if (!normalizedDraftQuery) return true
        return normalizeSearchText(`${item.title} ${item.subtitle} ${item.meta} ${item.keywords}`).includes(normalizedDraftQuery)
      })
      .sort((a, b) => {
        const priorityRank = { critical: 0, high: 1, normal: 2 } satisfies Record<Priority, number>
        const priorityDiff = priorityRank[a.priority] - priorityRank[b.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.title.localeCompare(b.title, "tr", { numeric: true, sensitivity: "base" })
      })
  }, [draftAttentionOnly, draftScope, index, normalizedDraftQuery])

  const visibleResults = filtered.slice(0, normalizedQuery || attentionOnly || scope !== "all" ? 8 : 6)
  const previewResults = draftFiltered.slice(0, 6)
  const activeCount = index.filter((item) => item.priority !== "normal").length
  const hasAppliedFilters = Boolean(normalizedQuery || attentionOnly || scope !== "all")
  const appliedSummary = [
    scope !== "all" ? copy.scopes[scope] : null,
    attentionOnly ? copy.attention : null,
    query.trim() ? `"${query.trim()}"` : null,
  ].filter(Boolean)

  function openFilters() {
    setDraftQuery(query)
    setDraftScope(scope)
    setDraftAttentionOnly(attentionOnly)
    setFiltersOpen(true)
  }

  function applyFilters() {
    setQuery(draftQuery.trim())
    setScope(draftScope)
    setAttentionOnly(draftAttentionOnly)
    setFiltersOpen(false)
  }

  function clearDraftFilters() {
    setDraftQuery("")
    setDraftScope("all")
    setDraftAttentionOnly(false)
  }

  function clearAppliedFilters() {
    setQuery("")
    setScope("all")
    setAttentionOnly(false)
  }

  return (
    <>
      <section
        aria-label={copy.aria}
        className="mb-6 rounded-xl border border-border/70 bg-card/84 p-3 shadow-sm backdrop-blur"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <button
            type="button"
            onClick={openFilters}
            className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-left transition hover:border-primary/35 hover:bg-primary/[0.035] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
          >
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-foreground">
                {hasAppliedFilters ? appliedSummary.join(" / ") : copy.searchTitle}
              </span>
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {hasAppliedFilters
                  ? formatRibbonText(copy.matchedHint, { count: filtered.length })
                  : copy.searchHint}
              </span>
            </span>
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" />
          </button>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={openFilters}
              className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border/80 bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            >
              <SlidersHorizontal className="h-4 w-4" />
              {copy.filters}
            </button>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              <Sparkles className="h-4 w-4" />
              {copy.attention} {activeCount}
            </span>
            <span className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border/80 bg-muted/45 px-3 py-1.5 text-xs font-bold text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              {copy.index} {index.length}
            </span>
          </div>
        </div>

        {hasAppliedFilters ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <span className="text-xs font-black uppercase text-muted-foreground">{copy.applied}</span>
            {scope !== "all" ? (
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {copy.scopes[scope]}
              </span>
            ) : null}
            {attentionOnly ? (
              <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                {copy.attention}
              </span>
            ) : null}
            {query.trim() ? (
              <span className="max-w-full truncate rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
                {query.trim()}
              </span>
            ) : null}
            <button
              type="button"
              onClick={clearAppliedFilters}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              {copy.clear}
            </button>
          </div>
        ) : null}

        {hasAppliedFilters ? (
          <div className="mt-3 rounded-lg border border-border/70 bg-background/55 p-3">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">{copy.appliedResults}</p>
                <p className="text-sm font-bold text-foreground">{formatRibbonText(copy.recordsMatched, { count: filtered.length })}</p>
              </div>
              <button
                type="button"
                onClick={openFilters}
                className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {copy.adjust}
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
              {visibleResults.length > 0 ? (
                visibleResults.map((item) => {
                  const Icon = scopeIcon[item.scope]
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="group min-w-0 rounded-lg border border-border/75 bg-card/76 p-3 text-left transition hover:border-primary/35 hover:bg-primary/[0.045] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
                    >
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-black text-foreground">{item.title}</span>
                            <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">{item.subtitle}</span>
                          </span>
                        </div>
                        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                      <div className="mt-2 flex min-w-0 items-center justify-between gap-2">
                        <span className="min-w-0 truncate text-xs text-muted-foreground">{item.meta}</span>
                        <StatusBadge variant={priorityVariant(item.priority)}>{copy.priorities[item.priority]}</StatusBadge>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm font-semibold text-muted-foreground md:col-span-2 xl:col-span-4">
                  {copy.noResults}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>

      <AppDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        size="xl"
        title={copy.dialogTitle}
        closeLabel={copy.close}
        description={copy.dialogDescription}
        footer={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={clearDraftFilters}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              {copy.reset}
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-bold text-foreground transition hover:bg-muted"
              >
                {copy.cancel}
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-black text-primary-foreground shadow-sm transition hover:bg-primary/90"
              >
                {copy.apply}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-black uppercase text-muted-foreground">{copy.searchText}</span>
              <span className="mt-2 flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/45">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  value={draftQuery}
                  onChange={(event) => setDraftQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  suppressHydrationWarning
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foreground outline-none placeholder:text-muted-foreground"
                />
                {draftQuery ? (
                  <button
                    type="button"
                    aria-label={copy.clearSearch}
                    onClick={() => setDraftQuery("")}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </span>
            </label>

            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">{copy.category}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setDraftScope("all")}
                  aria-pressed={draftScope === "all"}
                  className="min-h-12 rounded-lg border border-border bg-background px-3 text-left text-sm font-bold text-foreground transition hover:bg-muted aria-pressed:border-primary/45 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                >
                  <span className="block">{copy.scopes.all}</span>
                  <span className="text-xs text-muted-foreground">{index.length}</span>
                </button>
                {scopeCounts
                  .filter((item) => item.count > 0)
                  .map((item) => {
                    const Icon = scopeIcon[item.scope]
                    return (
                      <button
                        key={item.scope}
                        type="button"
                        onClick={() => setDraftScope(item.scope)}
                        aria-pressed={draftScope === item.scope}
                        className="min-h-12 rounded-lg border border-border bg-background px-3 text-left text-sm font-bold text-foreground transition hover:bg-muted aria-pressed:border-primary/45 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {copy.scopes[item.scope]}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.count}</span>
                      </button>
                    )
                  })}
              </div>
            </div>

            <button
              type="button"
              aria-pressed={draftAttentionOnly}
              onClick={() => setDraftAttentionOnly((value) => !value)}
              className="flex w-full min-h-12 items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 text-left transition hover:bg-muted aria-pressed:border-amber-500/40 aria-pressed:bg-amber-500/10"
            >
              <span>
                <span className="flex items-center gap-2 text-sm font-black text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  {copy.attentionOnly}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  {formatRibbonText(copy.followupRecords, { count: activeCount })}
                </span>
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                {draftAttentionOnly ? copy.on : copy.off}
              </span>
            </button>
          </div>

          <div className="rounded-xl border border-border bg-background/60 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-muted-foreground">{copy.preview}</p>
                <p className="text-sm font-bold text-foreground">
                  {formatRibbonText(copy.recordsWillMatch, { count: draftFiltered.length })}
                </p>
              </div>
              <StatusBadge variant={draftFiltered.length > 0 ? "success" : "warning"}>
                {draftFiltered.length > 0 ? copy.ready : copy.noMatch}
              </StatusBadge>
            </div>
            <div className="space-y-2">
              {previewResults.length > 0 ? (
                previewResults.map((item) => {
                  const Icon = scopeIcon[item.scope]
                  return (
                    <div key={item.id} className="rounded-lg border border-border bg-card p-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-foreground">{item.title}</span>
                          <span className="mt-0.5 block truncate text-xs font-semibold text-muted-foreground">{item.subtitle}</span>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">{item.meta}</span>
                        </span>
                        <StatusBadge variant={priorityVariant(item.priority)}>{copy.priorities[item.priority]}</StatusBadge>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm font-semibold text-muted-foreground">
                  {copy.noPreviewRecords}
                </div>
              )}
            </div>
          </div>
        </div>
      </AppDialog>
    </>
  )
}
