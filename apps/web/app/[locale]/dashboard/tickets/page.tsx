"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  CreditCard,
  ListChecks,
  PackageCheck,
  RefreshCw,
  Save,
  Send,
  ShieldAlert,
  Sparkles,
  TicketCheck,
  Trash2,
  UserCheck,
  Wrench,
  XCircle,
} from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardSection } from "@/components/dashboard-section"
import { DataTable } from "@/components/data-table"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { ServiceProofPanel } from "@/components/service-proof-panel"
import { PieChart } from "@/components/charts/pie-chart"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
import {
  localizeDashboardText,
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"
import { createClient } from "@/lib/supabase/client"
import { hasAnyPermission } from "@/lib/rbac"
import type { ServiceTicketQueueData } from "@/lib/site-management-repository"
import { resolveTicketRoute, ticketAssigneeOptions } from "@/lib/ticket-routing"
import {
  allowedTicketTransitions,
  deriveDispatchState,
  derivePaymentState,
  isTicketCommand,
  primaryStateFromPersistedStatus,
  ticketCommandLabels,
  ticketPrimaryStateLabels,
  ticketSeverityForPriority,
  type TicketApprovalState,
  type TicketCommand,
  type TicketDispatchState,
  type TicketPaymentState,
  type TicketPrimaryState,
  type TicketSeverity,
  type TicketWorkflowSnapshot,
} from "@/lib/ticket-workflow"
import {
  isClientRole,
  isFieldRole,
  shouldMaskFinance,
  visibleServiceTicketsForRole,
} from "@/lib/role-scoped-views"
import {
  formatTry,
  priorityLabels,
  serviceCatalogItems,
  serviceOrders,
  serviceStatusLabels,
  serviceTickets,
  workforceTasks,
  type ServiceCatalogItem,
  type ServiceOrderRecord,
  type ServicePriority,
  type ServiceTicket,
  type ServiceTicketHistoryEvent,
  type ServiceStatus,
  type WorkforceTaskRecord,
} from "@/lib/site-management-data"

type RequestState = "idle" | "loading" | "success" | "error"
type WorkflowDecision = "approved" | "rejected"

const ticketUnitOptionsByRole = {
  owner: ["A-001", "A-054", "D-023"],
  tenant: ["A-018", "A-023"],
  default: ["A-001", "A-018", "A-023", "B-040", "C-078", "D-087"],
}

const ticketCategoryOptions = [
  "maintenance",
  "cleaning",
  "amenity",
  "security",
  "inspection",
  "concierge",
]

interface WorkflowRequestView {
  id: string
  actionType: string
  title: string
  entityTable: string
  entityExternalId: string
  status: string
  createdAt: string | null
  origin: string
  riskLevel: string
  executionMode: string
  requiresHumanApproval: boolean
  approvalRoles: string[]
  suggestedAssignee: string | null
  requestedByRole: string | null
}

interface TicketWorkflowApiView {
  primaryState: TicketPrimaryState
  stateLabel: string
  approvalState: TicketApprovalState
  dispatchState: TicketDispatchState
  paymentState: TicketPaymentState
  severity: TicketSeverity
  emergency: boolean
  version: string
  allowedTransitions: TicketCommand[]
  allowedTransitionLabels: Partial<Record<TicketCommand, string>>
}

type TicketQueueUiData = ServiceTicketQueueData & {
  availableUnits?: string[]
}

interface OwnerApprovalContextDraft {
  responsibility: "" | "owner" | "shared"
  policyCode: "" | "resident_cost_approval_v1"
  estimatedCostTry: string
  approvalThresholdTry: string
}

const reasonRequiredCommands = new Set<TicketCommand>([
  "wait_for_resident",
  "request_rework",
  "reopen",
  "cancel",
  "request_owner_approval",
  "reject_owner_request",
])

function ticketWorkflowApiView(
  ticket: ServiceTicket
): Partial<TicketWorkflowApiView> {
  const workflow = (ticket as ServiceTicket & { workflow?: unknown }).workflow
  if (!workflow || typeof workflow !== "object" || Array.isArray(workflow))
    return {}
  return workflow as Partial<TicketWorkflowApiView>
}

function ticketWorkflowSnapshot(ticket: ServiceTicket): TicketWorkflowSnapshot {
  const workflow = ticketWorkflowApiView(ticket)
  const primaryState = primaryStateFromPersistedStatus(
    ticket.status,
    workflow.primaryState ?? ticket.workflowState
  )
  const emergency =
    workflow.emergency ??
    ticket.emergency ??
    resolveTicketRoute(ticket).emergency
  const approvalState =
    workflow.approvalState ??
    ticket.approvalStatus ??
    (ticket.status === "waiting_approval" ? "pending_owner" : "not_required")
  const paymentState =
    workflow.paymentState ??
    ticket.paymentWorkflowStatus ??
    derivePaymentState(ticket.debtBlocked && !ticket.paymentVerified, emergency)

  return {
    id: ticket.id,
    primaryState,
    approvalState,
    dispatchState:
      workflow.dispatchState ??
      ticket.dispatchStatus ??
      deriveDispatchState(primaryState, ticket.assignee),
    paymentState,
    severity:
      workflow.severity ??
      ticket.severity ??
      ticketSeverityForPriority(ticket.priority, emergency),
    emergency,
    priority: ticket.priority,
    assignee: ticket.assignee,
    version: workflow.version ?? ticket.version ?? "",
    requesterRole: ticket.requesterRole ?? null,
  }
}

function readString(
  record: Record<string, unknown>,
  key: string,
  fallback = ""
) {
  const value = record[key]
  return typeof value === "string" && value.trim() ? value.trim() : fallback
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter(
        (item): item is string =>
          typeof item === "string" && item.trim().length > 0
      )
    : []
}

function normalizeWorkflowRequest(
  record: Record<string, unknown>,
  index: number
): WorkflowRequestView {
  const metadata = readRecord(record.metadata)
  const workflow = readRecord(record.workflow ?? metadata.workflow)
  const actionType = readString(
    record,
    "actionType",
    readString(record, "action_type", "workflow.request")
  )
  const id = readString(record, "id", `local-workflow-${index}`)
  const title = readString(record, "title", actionType)
  const entityTable = readString(
    record,
    "entityTable",
    readString(record, "entity_table", "client_action_requests")
  )
  const status = readString(
    record,
    "status",
    readString(workflow, "status", "submitted")
  )
  const proposedPayload = readRecord(
    metadata.proposedPayload ?? workflow.proposedPayload
  )
  const requiresHumanApproval =
    workflow.requiresHumanApproval === true ||
    readString(workflow, "executionMode") === "approval_required" ||
    actionType.includes("ticket.create")

  return {
    id,
    actionType,
    title,
    entityTable,
    entityExternalId: readString(
      record,
      "entityExternalId",
      readString(record, "entity_external_id", "")
    ),
    status,
    createdAt:
      readString(record, "createdAt", readString(record, "created_at", "")) ||
      null,
    origin: readString(
      workflow,
      "origin",
      readString(metadata, "origin", "ui")
    ),
    riskLevel: readString(workflow, "riskLevel", "medium"),
    executionMode: readString(
      workflow,
      "executionMode",
      requiresHumanApproval ? "request_only" : "log_only"
    ),
    requiresHumanApproval,
    approvalRoles: readStringArray(workflow.approvalRoles),
    suggestedAssignee: actionType.includes("ticket.create")
      ? resolveTicketRoute({
          title: readString(proposedPayload, "title", title),
          description: readString(proposedPayload, "description") || null,
          category: readString(proposedPayload, "category"),
          priority: readString(proposedPayload, "priority"),
        }).assignee
      : null,
    requestedByRole:
      readString(
        workflow,
        "requestedByRole",
        readString(metadata, "requestedByRole")
      ) || null,
  }
}

function isTicketCreationApproval(item: WorkflowRequestView) {
  return (
    item.entityTable === "service_tickets" &&
    item.actionType === "ticket.create.ai_draft"
  )
}

function workflowStatusLabel(item: WorkflowRequestView) {
  if (
    item.requiresHumanApproval &&
    (item.status === "logged" ||
      item.status === "locally-logged" ||
      item.status === "queued" ||
      item.status === "submitted")
  ) {
    return "submitted"
  }
  return item.status
}

function workflowStatusVariant(status: string) {
  if (status === "approved" || status === "completed") return "success" as const
  if (status === "rejected" || status === "failed") return "danger" as const
  if (status === "submitted" || status === "queued" || status === "logged")
    return "warning" as const
  return "neutral" as const
}

const workflowApprovalCopy = {
  tr: {
    title: "AI ve onay kuyruğu",
    description:
      "AI taslak üretir, sistem riski ve onay rolünü gösterir, yönetici kararı olmadan saha/finans/erişim aksiyonu çalışmaz.",
    aiTitle: "AI servis masası katmanı",
    aiBody:
      "SLA, borç kapısı, medya kanıtı ve ekip kapasitesi aynı bağlamda okunur. AI yalnızca taslak ve öneri üretir.",
    empty: "Henüz onay bekleyen servis aksiyonu yok.",
    approve: "Onayla",
    reject: "Reddet",
    approvers: "Onay rolleri",
    origin: "Kaynak",
    mode: "Mod",
    reviewHint: "Atamayı seçin ve talebi operasyona gönderin.",
    assignTo: "Sorumlu kişi veya ekip",
    approveAndAssign: "Onayla ve ata",
    assignmentSuccess: "Talep onaylandı ve seçilen sorumluya atandı.",
    decisionError: "Karar kaydedilemedi. Lütfen tekrar deneyin.",
  },
  en: {
    title: "AI and approval queue",
    description:
      "AI drafts the request, the system shows risk and approval roles, and no field/finance/access action runs without a manager decision.",
    aiTitle: "AI service desk layer",
    aiBody:
      "SLA, debt gate, media evidence and team capacity are read in one context. AI only creates drafts and recommendations.",
    empty: "No service action is waiting for approval yet.",
    approve: "Approve",
    reject: "Reject",
    approvers: "Approval roles",
    origin: "Origin",
    mode: "Mode",
    reviewHint: "Choose the assignee, then send the request to Operations.",
    assignTo: "Person or team responsible",
    approveAndAssign: "Approve and assign",
    assignmentSuccess:
      "The request was approved and assigned to the selected person or team.",
    decisionError: "The decision could not be saved. Please try again.",
  },
  de: {
    title: "KI- und Freigabewarteschlange",
    description:
      "KI erstellt Entwürfe, das System zeigt Risiko und Freigaberollen, und keine Feld-, Finanz- oder Zugangsaktion läuft ohne Managerentscheidung.",
    aiTitle: "KI-Service-Desk-Schicht",
    aiBody:
      "SLA, Schuldenregel, Mediennachweis und Teamkapazität werden in einem Kontext gelesen. KI erstellt nur Entwürfe und Empfehlungen.",
    empty: "Noch keine Serviceaktion wartet auf Freigabe.",
    approve: "Freigeben",
    reject: "Ablehnen",
    approvers: "Freigaberollen",
    origin: "Quelle",
    mode: "Modus",
    reviewHint:
      "Zuständige Person oder Team auswählen und die Anfrage an den Betrieb weiterleiten.",
    assignTo: "Zuständige Person oder Team",
    approveAndAssign: "Freigeben und zuweisen",
    assignmentSuccess:
      "Die Anfrage wurde freigegeben und der ausgewählten Person oder dem Team zugewiesen.",
    decisionError:
      "Die Entscheidung konnte nicht gespeichert werden. Bitte erneut versuchen.",
  },
  ru: {
    title: "AI и очередь одобрения",
    description:
      "AI готовит черновик, система показывает риск и роли одобрения, а полевые, финансовые и доступные действия не выполняются без решения менеджера.",
    aiTitle: "AI-слой сервис-деска",
    aiBody:
      "SLA, долговой барьер, медиа-доказательства и загрузка команды читаются в одном контексте. AI создает только черновики и рекомендации.",
    empty: "Пока нет сервисных действий, ожидающих одобрения.",
    approve: "Одобрить",
    reject: "Отклонить",
    approvers: "Роли одобрения",
    origin: "Источник",
    mode: "Режим",
    reviewHint: "Выберите исполнителя и передайте заявку в работу.",
    assignTo: "Ответственный сотрудник или команда",
    approveAndAssign: "Одобрить и назначить",
    assignmentSuccess:
      "Заявка одобрена и назначена выбранному сотруднику или команде.",
    decisionError: "Не удалось сохранить решение. Повторите попытку.",
  },
} as const

const workflowDisplayCopy = {
  tr: {
    aiDraft: "AI servis taslağı",
    approvalRequest: "Servis onay talebi",
  },
  en: {
    aiDraft: "AI service draft",
    approvalRequest: "Service approval request",
  },
  de: {
    aiDraft: "KI-Serviceentwurf",
    approvalRequest: "Service-Freigabeanfrage",
  },
  ru: {
    aiDraft: "AI-черновик заявки",
    approvalRequest: "Запрос на согласование сервиса",
  },
} as const

const ticketHistoryCopy = {
  tr: {
    title: "Talep gecmisi",
    description:
      "Talebinizin yonetim ve saha ekibiyle ilerleyisini burada takip edin.",
    empty: "Talep alindi. Yeni bir gelisme oldugunda burada gorunecek.",
    created: "Talep alindi",
    assigned: "Sorumlu ekip belirlendi",
    approval: "Malik karari kaydedildi",
    details: "Talep bilgileri guncellendi",
    workflow: "Talep bir sonraki asamaya ilerledi",
    status: "Talep durumu guncellendi",
    updated: "Talep guncellendi",
  },
  en: {
    title: "Request history",
    description:
      "Follow how your request progresses with management and the service team.",
    empty: "Request received. New progress will appear here.",
    created: "Request received",
    assigned: "Responsible team assigned",
    approval: "Owner decision recorded",
    details: "Request details updated",
    workflow: "Request moved to the next step",
    status: "Request status updated",
    updated: "Request updated",
  },
  de: {
    title: "Anfrageverlauf",
    description:
      "Verfolgen Sie hier den Fortschritt Ihrer Anfrage bei Verwaltung und Serviceteam.",
    empty: "Anfrage eingegangen. Neue Fortschritte erscheinen hier.",
    created: "Anfrage eingegangen",
    assigned: "Zustandiges Team zugewiesen",
    approval: "Eigentumerentscheidung erfasst",
    details: "Anfragedetails aktualisiert",
    workflow: "Anfrage in den nachsten Schritt verschoben",
    status: "Anfragestatus aktualisiert",
    updated: "Anfrage aktualisiert",
  },
  ru: {
    title: "История заявки",
    description:
      "Здесь можно следить за ходом заявки у управляющей и сервисной команды.",
    empty: "Заявка получена. Новые этапы появятся здесь.",
    created: "Заявка получена",
    assigned: "Назначена ответственная команда",
    approval: "Решение владельца сохранено",
    details: "Данные заявки обновлены",
    workflow: "Заявка перешла на следующий этап",
    status: "Статус заявки обновлен",
    updated: "Заявка обновлена",
  },
} as const

function ticketHistoryMessage(
  event: ServiceTicketHistoryEvent,
  locale: keyof typeof ticketHistoryCopy
) {
  const copy = ticketHistoryCopy[locale]
  if (
    event.type === "ticket_created" ||
    event.type === "portal_ticket_created"
  ) {
    return copy.created
  }
  if (event.type === "ticket_assigned") return copy.assigned
  if (event.type === "owner_approval_decided") return copy.approval
  if (event.type === "ticket_details_updated") return copy.details
  if (event.type === "workflow_command") return copy.workflow
  if (event.type === "status_changed") return copy.status
  return copy.updated
}

function ticketHistoryTime(value: string, locale: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}

const SERVICE_OPERATIONS_REALTIME_TABLES = [
  "service_catalog",
  "service_orders",
  "service_tickets",
  "service_ticket_events",
  "workforce_tasks",
  "media_reports",
  "client_action_requests",
]

function hasSupabasePublicEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

function priorityVariant(priority: ServicePriority) {
  if (priority === "urgent") return "danger"
  if (priority === "high") return "warning"
  if (priority === "medium") return "info"
  return "neutral"
}

function statusVariant(status: ServiceStatus) {
  if (status === "closed" || status === "resolved") return "success"
  if (status === "in_progress" || status === "assigned") return "info"
  if (status === "waiting_payment") return "danger"
  return "warning"
}

function servicePriorityLabel(
  priority: ServicePriority,
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  return localizeDashboardText(priorityLabels[priority], locale)
}

function serviceStatusLabel(
  status: ServiceStatus,
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  return localizeDashboardText(serviceStatusLabels[status], locale)
}

function orderVariant(status: ServiceOrderRecord["status"]) {
  if (status === "completed") return "success"
  if (status === "blocked" || status === "payment_pending") return "danger"
  if (status === "assigned" || status === "task_created") return "info"
  return "warning"
}

function paymentDecisionLabel(
  decision: ServiceOrderRecord["paymentDecision"],
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  if (decision === "no_charge") return localizeDashboardText("Ücretsiz", locale)
  if (decision === "post_emergency_review") {
    if (locale === "en") return "Post-emergency human review"
    if (locale === "de") return "Prüfung durch Menschen nach dem Notfalleinsatz"
    if (locale === "ru") return "Проверка человеком после аварийных работ"
    return "Acil müdahale sonrası insan incelemesi"
  }
  if (decision === "collect_before_dispatch")
    return localizeDashboardText("Ödeme önce", locale)
  if (decision === "debit_to_account")
    return localizeDashboardText("Cari hesaba yaz", locale)
  if (decision === "paid_or_debit_approved")
    return localizeDashboardText("Onaylı", locale)
  return localizeDashboardText("Beklet", locale)
}

function emergencyOperationalLabel(
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  if (locale === "en") return "Emergency response"
  if (locale === "de") return "Notfalleinsatz"
  if (locale === "ru") return "Аварийное реагирование"
  return "Acil müdahale"
}

function orderStatusLabel(
  status: ServiceOrderRecord["status"],
  locale: ReturnType<typeof resolveDashboardLocale>
) {
  if (status === "draft") return localizeDashboardText("Taslak", locale)
  if (status === "debt_check")
    return localizeDashboardText("Borç kontrolü", locale)
  if (status === "payment_pending")
    return localizeDashboardText("Ödeme bekliyor", locale)
  if (status === "task_created")
    return localizeDashboardText("Görev açıldı", locale)
  if (status === "assigned") return localizeDashboardText("Atandı", locale)
  if (status === "completed") return localizeDashboardText("Tamamlandı", locale)
  if (status === "blocked") return localizeDashboardText("Blokeli", locale)
  return localizeDashboardText("İptal", locale)
}

function emergencyRouteLabel(item: ServiceCatalogItem) {
  if (item.code === "EMERG-LIFE-SAFETY") return "Gaz, duman, yangın"
  if (item.code === "MAINT-ELEVATOR") return "Asansör"
  if (item.code === "MAINT-ELEC") return "Elektrik"
  if (item.code === "MAINT-SEWER") return "Gider ve kanalizasyon"
  if (item.code === "MAINT-PLUMB") return "Su ve tesisat"
  if (item.code === "SEC-LOCKOUT") return "Kapı ve bariyer"
  if (item.code === "MAINT-HVAC-URGENT") return "Acil klima"
  if (item.code === "AMENITY-SPA-INCIDENT") return "Spa ve havuz"
  if (item.code === "AMENITY-FOOD-EVENT-INCIDENT") return "Restoran ve etkinlik"
  return item.name
}

function emergencyQueueLabel(item: ServiceCatalogItem) {
  if (item.code === "EMERG-LIFE-SAFETY") return "Güvenlik + yönetici"
  if (item.code === "MAINT-ELEVATOR") return "Asansör servisi"
  if (item.code === "MAINT-ELEC") return "Elektrikçi"
  if (item.code === "MAINT-SEWER") return "Tesisat vendor"
  if (item.code === "MAINT-PLUMB") return "Tesisatçı"
  if (item.code === "SEC-LOCKOUT") return "Güvenlik"
  if (item.code === "AMENITY-SPA-INCIDENT") return "Sosyal tesis"
  if (item.code === "AMENITY-FOOD-EVENT-INCIDENT") return "Restoran"
  return item.team
}

function taskReadinessVariant(task: WorkforceTaskRecord) {
  if (task.slaHoursRemaining < 0 || task.managerApprovalRequired)
    return "danger"
  if (task.completionReadiness >= 70) return "success"
  if (task.completionReadiness >= 45) return "info"
  return "warning"
}

function visibleOrdersForTickets(
  orders: ServiceOrderRecord[],
  visibleTickets: ServiceTicket[]
) {
  const visibleTicketIds = new Set(visibleTickets.map((ticket) => ticket.id))
  return orders.filter((order) => visibleTicketIds.has(order.ticketId))
}

function visibleTasksForTickets(
  tasks: WorkforceTaskRecord[],
  visibleTickets: ServiceTicket[]
) {
  const visibleTicketIds = new Set(visibleTickets.map((ticket) => ticket.id))
  return tasks.filter((task) => visibleTicketIds.has(task.ticketId))
}

export default function TicketsPage() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const workflowDisplay = workflowDisplayCopy[locale]
  const portfolioDisplayName = localizeOperationalValue(
    clientProfile.activePortfolio,
    locale
  )
  const displayWorkflowTitle = (item: WorkflowRequestView) => {
    const localized = t(item.title)
    if (localized !== item.title) return localized

    if (item.origin === "ai") {
      const base = item.actionType.includes("ticket.create")
        ? workflowDisplay.aiDraft
        : workflowDisplay.approvalRequest
      const showExternalId =
        item.entityExternalId &&
        !/^(ai-ticket-draft|ticket-request|NLP-OPS)/i.test(
          item.entityExternalId
        )
      return showExternalId ? `${base} - ${item.entityExternalId}` : base
    }

    return item.title === item.actionType
      ? workflowDisplay.approvalRequest
      : localized
  }
  const [queueData, setQueueData] = useState<TicketQueueUiData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [ticketSearchQuery, setTicketSearchQuery] = useState("")
  const [debouncedTicketSearch, setDebouncedTicketSearch] = useState("")
  const [localWorkflowRequests, setLocalWorkflowRequests] = useState<
    WorkflowRequestView[]
  >([])
  const [workflowDecisionState, setWorkflowDecisionState] = useState<
    Record<string, RequestState>
  >({})
  const [workflowAssignees, setWorkflowAssignees] = useState<
    Record<string, string>
  >({})
  const clientView = isClientRole(user.role)
  const operationsView = user.role === "admin" || user.role === "manager"
  const accountantView = user.role === "accountant"
  const canCreateTickets = hasAnyPermission(user.role, "tickets", [
    "create",
    "manage",
  ])
  const fieldView = isFieldRole(user.role)
  const maskFinance = shouldMaskFinance(user.role)
  const fallbackTicketUnitOptions =
    user.role === "owner"
      ? ticketUnitOptionsByRole.owner
      : user.role === "tenant"
        ? ticketUnitOptionsByRole.tenant
        : ticketUnitOptionsByRole.default
  const serverTicketUnitOptions = (queueData?.availableUnits ?? []).filter(
    (unitNo): unitNo is string =>
      typeof unitNo === "string" && unitNo.trim().length > 0
  )
  const ticketUnitOptions =
    queueData?.source === "supabase"
      ? serverTicketUnitOptions
      : fallbackTicketUnitOptions
  const [ticketForm, setTicketForm] = useState({
    title: "",
    unitNo: fallbackTicketUnitOptions[0] ?? "A-001",
    category: "maintenance",
    priority: "medium",
    description: "",
  })
  const [ticketSubmitState, setTicketSubmitState] =
    useState<RequestState>("idle")
  const [ticketEditState, setTicketEditState] = useState<RequestState>("idle")
  const [ticketEditError, setTicketEditError] = useState("")
  const [ticketTransitionState, setTicketTransitionState] =
    useState<RequestState>("idle")
  const [ticketTransitionError, setTicketTransitionError] = useState("")
  const [transitionReasons, setTransitionReasons] = useState<
    Record<string, string>
  >({})
  const [transitionAssignees, setTransitionAssignees] = useState<
    Record<string, string>
  >({})
  const [ownerApprovalContexts, setOwnerApprovalContexts] = useState<
    Record<string, OwnerApprovalContextDraft>
  >({})
  const [selectedTicketId, setSelectedTicketId] = useState("")
  const [selectedProofTaskId, setSelectedProofTaskId] = useState("")
  const ticketSubmissionKey = useRef<string | null>(null)
  const ticketEditKeys = useRef<Record<string, string>>({})
  const ticketTransitionKeys = useRef<Record<string, string>>({})
  const suggestedRoute = resolveTicketRoute(ticketForm)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedTicketSearch(ticketSearchQuery.trim())
    }, 250)
    return () => window.clearTimeout(handle)
  }, [ticketSearchQuery])

  const fetchTickets = useCallback(
    async (searchOverride?: string) => {
      setRequestState("loading")
      try {
        const effectiveSearch = searchOverride?.trim() ?? debouncedTicketSearch
        const query = new URLSearchParams({
          limit: effectiveSearch ? "100" : "50",
        })
        if (effectiveSearch) query.set("q", effectiveSearch)
        const approvalResponsePromise = operationsView
          ? fetch("/api/site-management/actions", { cache: "no-store" }).catch(
              () => null
            )
          : Promise.resolve(null)
        const response = await fetch(
          `/api/site-management/tickets?${query.toString()}`,
          {
            cache: "no-store",
          }
        )
        if (!response.ok) throw new Error("Ticket request failed.")
        let nextQueue = (await response.json()) as TicketQueueUiData
        setQueueData(nextQueue)
        setRequestState("success")
        const approvalResponse = await approvalResponsePromise
        if (approvalResponse?.ok) {
          const approvalPayload = readRecord(await approvalResponse.json())
          const approvalActions = Array.isArray(approvalPayload.actions)
            ? approvalPayload.actions.filter(
                (item): item is Record<string, unknown> =>
                  Boolean(item) &&
                  typeof item === "object" &&
                  !Array.isArray(item)
              )
            : []
          const mergedActions = [
            ...approvalActions,
            ...(nextQueue.recentActions ?? []),
          ].filter((item, index, list) => {
            const id = readString(
              item as Record<string, unknown>,
              "id",
              `action-${index}`
            )
            return (
              list.findIndex(
                (candidate, candidateIndex) =>
                  readString(
                    candidate as Record<string, unknown>,
                    "id",
                    `action-${candidateIndex}`
                  ) === id
              ) === index
            )
          })
          nextQueue = { ...nextQueue, recentActions: mergedActions }
        }
        setQueueData(nextQueue)
        if (nextQueue.source === "supabase") {
          const availableUnits = (nextQueue.availableUnits ?? []).filter(
            (unitNo): unitNo is string =>
              typeof unitNo === "string" && unitNo.trim().length > 0
          )
          setTicketForm((current) => ({
            ...current,
            unitNo: availableUnits.includes(current.unitNo)
              ? current.unitNo
              : (availableUnits[0] ?? ""),
          }))
        }
        setRequestState("success")
      } catch {
        setRequestState("error")
      }
    },
    [debouncedTicketSearch, operationsView]
  )

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchTickets()
    }, 0)

    const handleOperationalChange = (event: Event) => {
      const searchOverride =
        event instanceof CustomEvent &&
        event.detail &&
        typeof event.detail.ticketSearch === "string"
          ? event.detail.ticketSearch
          : undefined
      void fetchTickets(searchOverride)
    }

    window.addEventListener("site-management:changed", handleOperationalChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener(
        "site-management:changed",
        handleOperationalChange
      )
    }
  }, [fetchTickets])

  useEffect(() => {
    if (!hasSupabasePublicEnv() || queueData?.source !== "supabase") return

    const supabase = createClient()
    let channel = supabase.channel("phase-8-9-service-operations")

    SERVICE_OPERATIONS_REALTIME_TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => {
          void fetchTickets()
        }
      )
    })

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [fetchTickets, queueData?.source])

  useEffect(() => {
    const handleActionLogged = (event: Event) => {
      const detail = (event as CustomEvent<Record<string, unknown>>).detail
      if (!detail) return
      const item = normalizeWorkflowRequest(detail, Date.now())
      if (
        item.entityTable !== "service_tickets" &&
        item.entityTable !== "service_catalog" &&
        item.entityTable !== "service_orders" &&
        item.entityTable !== "workforce_tasks" &&
        item.entityTable !== "media_reports"
      ) {
        return
      }
      setLocalWorkflowRequests((current) =>
        [item, ...current.filter((existing) => existing.id !== item.id)].slice(
          0,
          5
        )
      )
    }

    window.addEventListener("site-management:action-logged", handleActionLogged)
    document.documentElement.dataset.ticketActionQueueReady = "true"
    return () => {
      window.removeEventListener(
        "site-management:action-logged",
        handleActionLogged
      )
      delete document.documentElement.dataset.ticketActionQueueReady
    }
  }, [])

  const sourceTickets = queueData?.tickets ?? serviceTickets
  const sourceCatalog = queueData?.catalog ?? serviceCatalogItems
  const sourceOrders = queueData?.orders ?? serviceOrders
  const rawSourceTasks = queueData?.workforceTasks ?? workforceTasks
  const sourceTasks = rawSourceTasks.filter(
    (task, index, tasks) =>
      tasks.findIndex((candidate) => candidate.id === task.id) === index
  )
  const roleVisibleTickets =
    queueData?.source === "supabase"
      ? sourceTickets
      : visibleServiceTicketsForRole(user.role, sourceTickets)
  const visibleTickets = accountantView
    ? roleVisibleTickets.filter((ticket) => {
        const workflow = ticketWorkflowSnapshot(ticket)
        return (
          ticket.debtBlocked ||
          !ticket.paymentVerified ||
          workflow.paymentState === "pending" ||
          workflow.paymentState === "failed" ||
          workflow.paymentState === "refunded"
        )
      })
    : roleVisibleTickets
  const visibleOrders = visibleOrdersForTickets(sourceOrders, visibleTickets)
  const visibleTasks = visibleTasksForTickets(sourceTasks, visibleTickets)
  const selectedProofTask =
    visibleTasks.find((task) => task.id === selectedProofTaskId) ?? null
  const ownerApprovalTickets = visibleTickets.filter(
    (ticket) => ticketWorkflowSnapshot(ticket).approvalState === "pending_owner"
  )
  const open = visibleTickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  ).length
  const overdue = visibleTickets.filter(
    (ticket) => ticket.slaHoursRemaining < 0
  ).length
  const blocked = visibleTickets.filter(
    (ticket) => ticket.debtBlocked && !ticket.emergency
  ).length
  const media = visibleTickets.reduce(
    (sum, ticket) => sum + ticket.mediaCount,
    0
  )
  const activeCatalog = sourceCatalog.filter((item) => item.active)
  const visibleCatalog = clientView ? activeCatalog.slice(0, 4) : activeCatalog
  const emergencyCatalog = activeCatalog
    .filter((item) => item.serviceLevel === "emergency")
    .slice(0, 9)
  const readyOrders = visibleOrders.filter(
    (order) =>
      order.status === "assigned" ||
      order.status === "task_created" ||
      order.paymentDecision === "paid_or_debit_approved" ||
      order.paymentDecision === "no_charge"
  ).length
  const blockedOrders = visibleOrders.filter(
    (order) => order.status === "blocked" || order.debtCheckStatus === "blocked"
  ).length
  const managerApprovalTasks = visibleTasks.filter(
    (task) => task.managerApprovalRequired
  ).length
  const averageReadiness =
    visibleTasks.length > 0
      ? Math.round(
          visibleTasks.reduce(
            (sum, task) => sum + task.completionReadiness,
            0
          ) / visibleTasks.length
        )
      : 0
  const priorityQueue = [...visibleTickets]
    .filter(
      (ticket) =>
        ticket.priority === "urgent" ||
        ticket.slaHoursRemaining < 0 ||
        (ticket.debtBlocked && !ticket.emergency)
    )
    .sort((left, right) => {
      const emergencyOrder =
        Number(right.emergency || right.severity === "P0") -
        Number(left.emergency || left.severity === "P0")
      if (emergencyOrder !== 0) return emergencyOrder

      if (
        (left.emergency || left.severity === "P0") &&
        (right.emergency || right.severity === "P0")
      ) {
        const detectedAtOrder =
          Date.parse(right.openedAt) - Date.parse(left.openedAt)
        if (detectedAtOrder !== 0) return detectedAtOrder
      }

      const priorityOrder =
        Number(right.priority === "urgent") - Number(left.priority === "urgent")
      if (priorityOrder !== 0) return priorityOrder

      const slaOrder = left.slaHoursRemaining - right.slaHoursRemaining
      if (slaOrder !== 0) return slaOrder

      return Date.parse(right.openedAt) - Date.parse(left.openedAt)
    })
    .slice(0, 5)
  const visibleQueue =
    priorityQueue.length > 0 ? priorityQueue : visibleTickets.slice(0, 5)
  const sourceLabel =
    queueData?.source === "supabase" ? "Supabase live" : t("Yerel veri")
  const ticketStatusData = [
    {
      label: "open",
      value: visibleTickets.filter(
        (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
      ).length,
      color: "var(--primary)",
    },
    {
      label: "risk",
      value: visibleTickets.filter(
        (ticket) =>
          ticket.slaHoursRemaining < 0 ||
          (ticket.debtBlocked && !ticket.emergency)
      ).length,
      color: "var(--destructive)",
    },
    {
      label: "closed",
      value: visibleTickets.filter(
        (ticket) => ticket.status === "closed" || ticket.status === "resolved"
      ).length,
      color: "var(--accent)",
    },
  ]
  const workflowRequests = [
    ...localWorkflowRequests,
    ...(queueData?.recentActions ?? []).map((record, index) =>
      normalizeWorkflowRequest(record as Record<string, unknown>, index)
    ),
  ].filter(
    (item, index, list) =>
      list.findIndex((candidate) => candidate.id === item.id) === index
  )
  const approvalQueue = workflowRequests
    .filter(
      (item) =>
        item.actionType !== "ticket.create.request" &&
        (item.requiresHumanApproval || item.executionMode !== "log_only") &&
        (!isTicketCreationApproval(item) ||
          item.actionType === "ticket.create.ai_draft" ||
          item.origin === "ai")
    )
    .slice(0, 5)
  const approvalPending = approvalQueue.filter((item) =>
    ["submitted", "queued", "logged"].includes(workflowStatusLabel(item))
  ).length
  const selectedTicket =
    visibleTickets.find((ticket) => ticket.id === selectedTicketId) ??
    visibleTickets[0] ??
    null
  const selectedTicketHistory: ServiceTicketHistoryEvent[] = selectedTicket
    ? selectedTicket.history?.length
      ? selectedTicket.history
      : [
          {
            id: `${selectedTicket.id}:received`,
            type: "ticket_created",
            message: ticketHistoryCopy[locale].empty,
            occurredAt: selectedTicket.openedAt,
          },
        ]
    : []
  const selectedSnapshot = selectedTicket
    ? ticketWorkflowSnapshot(selectedTicket)
    : null
  const selectedIsTenantTicket =
    user.role === "owner" && selectedTicket?.requesterRole === "tenant"
  const selectedNeedsOwnerDecision =
    selectedIsTenantTicket &&
    selectedSnapshot?.approvalState === "pending_owner"
  const selectedIsRequester = Boolean(
    selectedTicket &&
    clientView &&
    (selectedTicket.requesterRole === user.role ||
      (user.role === "tenant" && !selectedTicket.requesterRole))
  )
  const selectedTransitionContext = {
    isRequester: selectedIsRequester,
    canDecideOwnerApproval: selectedNeedsOwnerDecision,
  }
  const locallyAllowedTransitions = selectedSnapshot
    ? allowedTicketTransitions(
        user.role,
        selectedSnapshot,
        selectedTransitionContext
      )
    : []
  const serverWorkflow = selectedTicket
    ? ticketWorkflowApiView(selectedTicket)
    : {}
  const hasServerTransitionList = Array.isArray(
    serverWorkflow.allowedTransitions
  )
  const serverAllowedTransitions = hasServerTransitionList
    ? (serverWorkflow.allowedTransitions?.filter(isTicketCommand) ?? [])
    : []
  const selectedAllowedTransitions = hasServerTransitionList
    ? locallyAllowedTransitions.filter((command) =>
        serverAllowedTransitions.includes(command)
      )
    : locallyAllowedTransitions
  const canEditTicketMetadata = Boolean(
    selectedSnapshot &&
    (operationsView ||
      (selectedIsRequester &&
        selectedSnapshot.primaryState === "submitted" &&
        selectedSnapshot.approvalState !== "pending_owner"))
  )
  const selectedTransitionReason = selectedTicket
    ? (transitionReasons[selectedTicket.id] ?? "")
    : ""
  const selectedTransitionAssignee = selectedTicket
    ? (transitionAssignees[selectedTicket.id] ??
      resolveTicketRoute(selectedTicket).assignee)
    : "Operations queue"
  const selectedAssigneeIsTriageQueue = [
    "Operations queue",
    "Operations triage queue",
  ].includes(selectedTransitionAssignee)
  const selectedOwnerApprovalContext: OwnerApprovalContextDraft = selectedTicket
    ? (ownerApprovalContexts[selectedTicket.id] ?? {
        responsibility: "",
        policyCode: "",
        estimatedCostTry: String(selectedTicket.estimatedCostTry),
        approvalThresholdTry: "",
      })
    : {
        responsibility: "",
        policyCode: "",
        estimatedCostTry: "",
        approvalThresholdTry: "",
      }
  const ownerApprovalEstimatedCost = Number(
    selectedOwnerApprovalContext.estimatedCostTry
  )
  const ownerApprovalThreshold = Number(
    selectedOwnerApprovalContext.approvalThresholdTry
  )
  const ownerApprovalContextReady = Boolean(
    selectedOwnerApprovalContext.responsibility &&
    selectedOwnerApprovalContext.policyCode &&
    selectedOwnerApprovalContext.estimatedCostTry.trim() &&
    Number.isFinite(ownerApprovalEstimatedCost) &&
    ownerApprovalEstimatedCost >= 0 &&
    selectedOwnerApprovalContext.approvalThresholdTry.trim() &&
    Number.isFinite(ownerApprovalThreshold) &&
    ownerApprovalThreshold >= 0
  )

  function openTicket(ticketId: string) {
    setSelectedTicketId(ticketId)
    window.requestAnimationFrame(() => {
      document
        .getElementById("ticket-details")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  async function submitTicket() {
    setTicketSubmitState("loading")
    try {
      const submittedTitle = ticketForm.title.trim()
      const idempotencyKey =
        ticketSubmissionKey.current ?? `ticket:${window.crypto.randomUUID()}`
      ticketSubmissionKey.current = idempotencyKey
      const response = await fetch("/api/site-management/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(ticketForm),
      })
      const responseBody = readRecord(await response.json().catch(() => ({})))
      if (!response.ok) throw new Error("Ticket create failed.")
      const createdTicket = readRecord(responseBody.ticket)
      const createdTicketId = readString(
        createdTicket,
        "id",
        readString(responseBody, "id")
      )
      ticketSubmissionKey.current = null
      setTicketForm((current) => ({
        ...current,
        title: "",
        description: "",
      }))
      setTicketSubmitState("success")
      setTicketSearchQuery(submittedTitle)
      setDebouncedTicketSearch(submittedTitle)
      await fetchTickets(submittedTitle)
      if (createdTicketId) openTicket(createdTicketId)
      window.dispatchEvent(
        new CustomEvent("site-management:changed", {
          detail: { ticketSearch: submittedTitle },
        })
      )
    } catch {
      setTicketSubmitState("error")
    }
  }

  function readTicketUpdateForm(form: HTMLFormElement) {
    const formData = new FormData(form)
    return {
      title: String(formData.get("title") ?? ""),
      category: String(formData.get("category") ?? "maintenance"),
      priority: String(formData.get("priority") ?? "medium"),
      description: String(formData.get("description") ?? ""),
    }
  }

  async function submitTicketUpdate(
    payload: ReturnType<typeof readTicketUpdateForm>,
    clearDescription = false
  ) {
    if (!selectedTicket) return
    setTicketEditState("loading")
    setTicketEditError("")
    const editKey = `${selectedTicket.id}:${clearDescription ? "clear-description" : "update-details"}`
    const idempotencyKey =
      ticketEditKeys.current[editKey] ?? `ticket:${window.crypto.randomUUID()}`
    ticketEditKeys.current[editKey] = idempotencyKey
    try {
      const response = await fetch("/api/site-management/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          idempotencyKey,
          title: payload.title,
          category: payload.category,
          ...(operationsView ? { priority: payload.priority } : {}),
          ...(selectedSnapshot?.version
            ? { expectedVersion: selectedSnapshot.version }
            : {}),
          clearDescription,
          description: clearDescription ? null : payload.description,
        }),
      })
      const responseBody = readRecord(await response.json().catch(() => ({})))
      if (!response.ok) {
        const message = readString(
          responseBody,
          "error",
          t("Talep bilgileri kaydedilemedi.")
        )
        if (response.status === 409) {
          await fetchTickets()
          throw new Error(
            `${message} ${t("Kayit yenilendi; lutfen tekrar kontrol edin.")}`
          )
        }
        throw new Error(message)
      }
      delete ticketEditKeys.current[editKey]
      setTicketEditState("success")
      await fetchTickets()
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch (error) {
      setTicketEditState("error")
      setTicketEditError(
        error instanceof Error
          ? error.message
          : t("Talep bilgileri kaydedilemedi.")
      )
    }
  }

  async function runTicketTransition(command: TicketCommand) {
    if (!selectedTicket || !selectedSnapshot) return

    const reason = selectedTransitionReason.trim()
    const reasonRequired = reasonRequiredCommands.has(command)
    if (reasonRequired && !reason) {
      setTicketTransitionState("error")
      setTicketTransitionError(t("Bu adim icin bir neden yazin."))
      return
    }
    if (command === "assign" && selectedAssigneeIsTriageQueue) {
      setTicketTransitionState("error")
      setTicketTransitionError(
        t("Atamadan once sorumlu kisi veya ekibi secin.")
      )
      return
    }
    if (command === "request_owner_approval" && !ownerApprovalContextReady) {
      setTicketTransitionState("error")
      setTicketTransitionError(
        t(
          "Malik onayi icin sorumluluk, politika ve gecerli tahmini maliyet zorunludur."
        )
      )
      return
    }

    setTicketTransitionState("loading")
    setTicketTransitionError("")
    const transitionKey = `${selectedTicket.id}:${command}`
    const idempotencyKey =
      ticketTransitionKeys.current[transitionKey] ??
      `ticket:${window.crypto.randomUUID()}`
    ticketTransitionKeys.current[transitionKey] = idempotencyKey

    try {
      const response = await fetch("/api/site-management/tickets", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          command,
          idempotencyKey,
          ...(selectedSnapshot.version
            ? { expectedVersion: selectedSnapshot.version }
            : {}),
          ...(reason ? { reason } : {}),
          ...(command === "assign"
            ? { assignee: selectedTransitionAssignee }
            : {}),
          ...(command === "request_owner_approval"
            ? {
                approvalContext: {
                  responsibility: selectedOwnerApprovalContext.responsibility,
                  policyCode: selectedOwnerApprovalContext.policyCode,
                  estimatedCostCents: Math.round(
                    ownerApprovalEstimatedCost * 100
                  ),
                  ...(selectedOwnerApprovalContext.approvalThresholdTry.trim()
                    ? {
                        approvalThresholdCents: Math.round(
                          ownerApprovalThreshold * 100
                        ),
                      }
                    : {}),
                },
              }
            : {}),
        }),
      })
      const responseBody = readRecord(await response.json().catch(() => ({})))
      if (!response.ok) {
        const message = readString(
          responseBody,
          "error",
          t("Talep adimi kaydedilemedi.")
        )
        if (response.status === 409) {
          await fetchTickets()
          throw new Error(
            `${message} ${t("Kayit yenilendi; lutfen tekrar kontrol edin.")}`
          )
        }
        throw new Error(message)
      }
      delete ticketTransitionKeys.current[transitionKey]
      setTransitionReasons((current) => ({
        ...current,
        [selectedTicket.id]: "",
      }))
      setTicketTransitionState("success")
      await fetchTickets()
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch (error) {
      setTicketTransitionState("error")
      setTicketTransitionError(
        error instanceof Error ? error.message : t("Talep adimi kaydedilemedi.")
      )
    }
  }

  async function decideWorkflow(
    item: WorkflowRequestView,
    status: WorkflowDecision,
    assignee?: string
  ) {
    setWorkflowDecisionState((current) => ({
      ...current,
      [item.id]: "loading",
    }))
    const approvingAiTicket =
      status === "approved" && item.actionType === "ticket.create.ai_draft"
    const idempotencyKey = approvingAiTicket
      ? `ticket-action:${item.id}:approve`
      : null
    try {
      const response = await fetch("/api/site-management/actions", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
        },
        body: JSON.stringify({
          id: item.id,
          status,
          actionType: item.actionType,
          entityTable: item.entityTable,
          ...(approvingAiTicket
            ? {
                assignee,
                expectedVersion: "1",
                idempotencyKey,
              }
            : {}),
        }),
      })
      if (!response.ok) throw new Error("Workflow decision failed.")
      setLocalWorkflowRequests((current) =>
        [
          { ...item, status },
          ...current.filter((request) => request.id !== item.id),
        ].slice(0, 5)
      )
      setWorkflowDecisionState((current) => ({
        ...current,
        [item.id]: "success",
      }))
      await fetchTickets()
      window.dispatchEvent(new CustomEvent("site-management:changed"))
    } catch {
      setWorkflowDecisionState((current) => ({
        ...current,
        [item.id]: "error",
      }))
    }
  }

  const managerIntro = {
    tr: `${portfolioDisplayName} ve diğer Ataberk portföyleri için teknik servis, ödeme doğrulama, fotoğraf/video kanıtı ve SLA takibi aynı iş kuyruğunda yönetilir.`,
    en: `${portfolioDisplayName} and other Ataberk portfolios manage technical service, payment verification, photo/video evidence and SLA follow-up in one work queue.`,
    de: `${portfolioDisplayName} und weitere Ataberk-Portfolios steuern technischen Service, Zahlungsprüfung, Foto-/Videonachweise und SLA-Nachverfolgung in einer Arbeitswarteschlange.`,
    ru: `${portfolioDisplayName} и другие портфели Ataberk ведут технический сервис, проверку оплат, фото/видео-доказательства и SLA-контроль в одной очереди.`,
  }[locale]

  const pageIntro = clientView
    ? t(
        "Yetkili dairenize bağlı servis taleplerini, randevu durumunu, medya kanıtını ve yönetim yanıtlarını tek ekrandan takip edin."
      )
    : fieldView
      ? t(
          "Saha ekibi için atanan servis işleri, SLA önceliği, medya kanıtı ve kapanış adımları aynı iş kuyruğunda yönetilir."
        )
      : accountantView
        ? t(
            "Yalnızca ödeme, borç, iade veya finans kararı gerektiren servis taleplerini inceleyin; operasyon durumunu değiştirmeden finans engelini yönetin."
          )
        : managerIntro
  const approvalCopy = workflowApprovalCopy[locale]

  return (
    <div id="tickets-top" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">
              {t("Servis Talepleri")}
            </h1>
            <StatusBadge
              variant={queueData?.source === "supabase" ? "success" : "warning"}
            >
              {sourceLabel}
            </StatusBadge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {pageIntro}
          </p>
          {queueData?.warning && (
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {queueData.warning}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void fetchTickets()}
            disabled={requestState === "loading"}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:bg-muted disabled:cursor-wait disabled:opacity-70"
          >
            <RefreshCw
              className={
                requestState === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
            />
            {t("Kuyrugu yenile")}
          </button>
          {!clientView && (
            <DashboardActionMenu
              label="Aksiyonlar"
              ariaLabel="Servis talebi aksiyonlari"
              buttonClassName="min-h-10 border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
              items={[
                {
                  key: "sla-review",
                  label: "SLA incelemesi aç",
                  description:
                    "Geciken talep, kanıt ve borç bloklarını yönetime taşır.",
                  icon: <BadgeCheck />,
                  actionType: "tickets.sla.review",
                  ariaLabel: "Servis SLA inceleme isteği oluştur",
                  entityTable: "service_tickets",
                  entityExternalId: "NLP-OPS",
                  title: "Servis SLA ve kanıt kuyruğu incelemesi",
                  metadata: {
                    openTickets: open,
                    overdueTickets: overdue,
                    source: queueData?.source ?? "unknown",
                  },
                },
              ]}
            />
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div
          role="alert"
          className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300"
        >
          {t(
            "Servis talebi verisi şu anda alınamadı. Yerel veriyle devam ediliyor."
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TicketCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Açık talep")}
              </p>
              <AnimatedCounter value={open} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Clock3 className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("SLA dışı")}
              </p>
              <AnimatedCounter
                value={overdue}
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {clientView ? t("Onay bekleyen") : t("Borç blokeli")}
              </p>
              <AnimatedCounter
                value={blocked}
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Medya kanıtı")}
              </p>
              <AnimatedCounter value={media} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <PackageCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Katalog")}
              </p>
              <AnimatedCounter
                value={visibleCatalog.length}
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Siparis")}
              </p>
              <AnimatedCounter
                value={visibleOrders.length}
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Saha gorevi")}
              </p>
              <AnimatedCounter
                value={visibleTasks.length}
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase">
                {t("Hazirlik")}
              </p>
              <AnimatedCounter
                value={averageReadiness}
                suffix="%"
                className="text-2xl font-black"
              />
            </div>
          </div>
        </Card3D>
      </div>

      {user.role === "owner" && ownerApprovalTickets.length > 0 && (
        <DashboardSection
          icon={UserCheck}
          title={t("Kiraci talep onay kuyrugu")}
          description={t(
            "Malik onayi yalnizca yonetici sorumluluk, maliyet ve politika triyajindan sonra ister. Normal girisler ve acil talepler otomatik olarak bekletilmez."
          )}
        >
          <div className="flex flex-col gap-2">
            {ownerApprovalTickets.map((ticket) => (
              <div
                key={ticket.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3"
              >
                <div className="min-w-0 flex-1 p-2">
                  <span className="block text-sm font-black text-foreground">
                    {ticket.title} · {ticket.flatNumber}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {ticket.description || t("Aciklama yok")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => openTicket(ticket.id)}
                  className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-black text-primary-foreground transition hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
                >
                  {t("Incele ve karar ver")}
                </button>
              </div>
            ))}
          </div>
        </DashboardSection>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        {canCreateTickets && !fieldView && (
          <Card3D glow={false}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-black text-card-foreground">
                  {t("Servis talebi olustur")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Daire, kategori, oncelik ve aciklama ile gercek talep kaydi acilir."
                  )}
                </p>
              </div>
              <StatusBadge
                variant={
                  ticketSubmitState === "success"
                    ? "success"
                    : ticketSubmitState === "error"
                      ? "danger"
                      : "info"
                }
              >
                {ticketSubmitState === "loading"
                  ? t("Kaydediliyor")
                  : ticketSubmitState === "success"
                    ? t("Kaydedildi")
                    : t("Portal")}
              </StatusBadge>
            </div>
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                void submitTicket()
              }}
            >
              <label className="block text-xs font-black text-muted-foreground uppercase">
                {t("Konu")}
                <input
                  value={ticketForm.title}
                  onChange={(event) =>
                    setTicketForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  placeholder={t(
                    "Ornek: Sauna rezervasyonu veya klima arizasi"
                  )}
                  maxLength={160}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="block text-xs font-black text-muted-foreground uppercase">
                  {t("Daire")}
                  <select
                    value={ticketForm.unitNo}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        unitNo: event.target.value,
                      }))
                    }
                    disabled={ticketUnitOptions.length === 0}
                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  >
                    {ticketUnitOptions.length === 0 && (
                      <option value="">{t("Yetkili daire bulunamadi")}</option>
                    )}
                    {ticketUnitOptions.map((unitNo) => (
                      <option key={unitNo} value={unitNo}>
                        {unitNo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-black text-muted-foreground uppercase">
                  {t("Kategori")}
                  <select
                    value={ticketForm.category}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        category: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  >
                    {ticketCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {t(category)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-black text-muted-foreground uppercase">
                  {t("Oncelik")}
                  <select
                    value={ticketForm.priority}
                    onChange={(event) =>
                      setTicketForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  >
                    {(["low", "medium", "high", "urgent"] as const).map(
                      (priority) => (
                        <option key={priority} value={priority}>
                          {servicePriorityLabel(priority, locale)}
                        </option>
                      )
                    )}
                  </select>
                </label>
              </div>
              <label className="block text-xs font-black text-muted-foreground uppercase">
                {t("Aciklama")}
                <textarea
                  value={ticketForm.description}
                  onChange={(event) =>
                    setTicketForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="mt-1 min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  placeholder={t(
                    "Sorunu, istenen zamani veya ek bilgiyi yazin."
                  )}
                  maxLength={1200}
                />
              </label>
              {suggestedRoute.emergency && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-800 dark:text-rose-200"
                >
                  <p className="font-black">{t("Acil guvenlik uyarisi")}</p>
                  <p className="mt-1 text-xs leading-5 font-semibold">
                    {t(
                      "Hemen tehlike varsa Turkiye 112 Acil Cagri Merkezini simdi arayin. Duruma gore su 185, elektrik 186 veya dogal gaz 187 hatti da uygun olabilir. 1Cati bu numaralari otomatik olarak aramaz."
                    )}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(["112", "185", "186", "187"] as const).map((number) => (
                      <a
                        key={number}
                        href={`tel:${number}`}
                        className="inline-flex min-h-9 items-center rounded-lg border border-rose-500/25 bg-background px-3 py-1.5 text-xs font-black text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none dark:text-rose-300"
                      >
                        {number}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              <p
                className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground"
                role="status"
              >
                {suggestedRoute.emergency ? t("Acil rota") : t("Otomatik rota")}
                : {t(suggestedRoute.assignee)} - {t(suggestedRoute.reason)}
              </p>
              <button
                type="submit"
                disabled={
                  ticketSubmitState === "loading" ||
                  ticketForm.title.trim().length < 3 ||
                  !ticketForm.unitNo ||
                  ticketUnitOptions.length === 0
                }
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {t("Talep gonder")}
              </button>
            </form>
          </Card3D>
        )}

        <Card3D
          glow={false}
          className={
            fieldView || !canCreateTickets
              ? "scroll-mt-24 xl:col-span-2"
              : "scroll-mt-24"
          }
        >
          <div
            id="ticket-details"
            data-selected-ticket-id={selectedTicket?.id ?? ""}
            className="scroll-mt-24"
          />
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-black text-card-foreground">
                {selectedNeedsOwnerDecision
                  ? t("Talep detaylari ve malik karari")
                  : canEditTicketMetadata
                    ? t("Talep detaylari ve is akisi")
                    : t("Talep detaylari")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedNeedsOwnerDecision
                  ? t(
                      "Kiraci tarafindan gonderilen konu ve aciklamayi inceleyin; ardindan onaylayin veya reddedin."
                    )
                  : accountantView
                    ? t(
                        "Operasyon kaydi salt okunurdur; odeme ve borc durumu finans baglaminda gosterilir."
                      )
                    : fieldView
                      ? t(
                          "Yalnizca size atanan isin izin verilen saha adimlarini kullanin."
                        )
                      : clientView
                        ? t(
                            "Talebinizi takip edin; yalnizca sistemin izin verdigi adimlar gosterilir."
                          )
                        : t(
                            "Durum degisiklikleri denetlenebilir is akisi adimlariyla uygulanir."
                          )}
              </p>
            </div>
            <StatusBadge
              variant={
                ticketEditState === "success"
                  ? "success"
                  : ticketEditState === "error"
                    ? "danger"
                    : "neutral"
              }
            >
              {ticketEditState === "loading"
                ? t("Kaydediliyor")
                : selectedTicket
                  ? selectedTicket.id
                  : t("Bos")}
            </StatusBadge>
          </div>

          {ticketEditState === "error" && ticketEditError && (
            <p
              className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-bold text-rose-700 dark:text-rose-300"
              role="alert"
            >
              {ticketEditError}
            </p>
          )}

          {selectedTicket ? (
            <form
              key={selectedTicket.id}
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault()
                if (!canEditTicketMetadata) return
                void submitTicketUpdate(
                  readTicketUpdateForm(event.currentTarget),
                  false
                )
              }}
            >
              <label className="block text-xs font-black text-muted-foreground uppercase">
                {t("Talep sec")}
                <select
                  value={selectedTicket.id}
                  onChange={(event) => setSelectedTicketId(event.target.value)}
                  className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                >
                  {visibleTickets.map((ticket) => (
                    <option key={ticket.id} value={ticket.id}>
                      {ticket.id} - {ticket.flatNumber} - {t(ticket.title)}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-xs font-black text-muted-foreground uppercase">
                  {t("Konu")}
                  <input
                    name="title"
                    defaultValue={selectedTicket.title}
                    readOnly={!canEditTicketMetadata}
                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                    maxLength={160}
                    required
                  />
                </label>
                <label className="block text-xs font-black text-muted-foreground uppercase">
                  {t("Kategori")}
                  <select
                    name="category"
                    defaultValue={selectedTicket.category}
                    disabled={!canEditTicketMetadata}
                    className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  >
                    {ticketCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {t(category)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {operationsView && (
                <div className="grid gap-3">
                  <label className="block text-xs font-black text-muted-foreground uppercase">
                    {t("Oncelik")}
                    <select
                      name="priority"
                      defaultValue={selectedTicket.priority}
                      className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                    >
                      {(["low", "medium", "high", "urgent"] as const).map(
                        (priority) => (
                          <option
                            key={priority}
                            value={priority}
                            disabled={Boolean(
                              selectedSnapshot?.emergency &&
                              priority !== "urgent"
                            )}
                          >
                            {servicePriorityLabel(priority, locale)}
                          </option>
                        )
                      )}
                    </select>
                    {selectedSnapshot?.emergency && (
                      <span className="mt-1 block text-[11px] font-medium text-rose-700 normal-case dark:text-rose-300">
                        {t("P0 acil talep normal is akisinda dusurulemez.")}
                      </span>
                    )}
                  </label>
                </div>
              )}
              <label className="block text-xs font-black text-muted-foreground uppercase">
                {t("Aciklama")}
                <textarea
                  name="description"
                  defaultValue={selectedTicket.description ?? ""}
                  readOnly={!canEditTicketMetadata}
                  className="mt-1 min-h-24 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  maxLength={1200}
                />
              </label>
              <div
                data-testid="ticket-workflow-summary"
                className="rounded-xl border border-border bg-muted/25 p-3"
              >
                {selectedSnapshot?.emergency && (
                  <div
                    role="alert"
                    className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs leading-5 font-semibold text-rose-800 dark:text-rose-200"
                  >
                    <span className="font-black">{t("Hemen tehlike")}: </span>
                    {t(
                      "112'yi arayin; gerekiyorsa 185, 186 veya 187 hattini kullanin. 1Cati dis kurumlari otomatik aramaz."
                    )}
                    <span className="mt-2 flex flex-wrap gap-2">
                      {(["112", "185", "186", "187"] as const).map((number) => (
                        <a
                          key={number}
                          href={`tel:${number}`}
                          className="rounded-md bg-background px-2 py-1 font-black text-rose-700 dark:text-rose-300"
                        >
                          {number}
                        </a>
                      ))}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge
                    variant={selectedSnapshot?.emergency ? "danger" : "info"}
                  >
                    {selectedSnapshot?.severity ?? "P3"}
                  </StatusBadge>
                  <StatusBadge variant="neutral">
                    {selectedSnapshot
                      ? t(
                          ticketPrimaryStateLabels[
                            selectedSnapshot.primaryState
                          ]
                        )
                      : t("Bilinmiyor")}
                  </StatusBadge>
                  {selectedSnapshot?.approvalState === "pending_owner" && (
                    <StatusBadge variant="warning">
                      {t("Malik onayi bekliyor")}
                    </StatusBadge>
                  )}
                  {selectedSnapshot?.paymentState === "pending" && (
                    <StatusBadge variant="danger">
                      {t("Finans karari bekliyor")}
                    </StatusBadge>
                  )}
                  {selectedSnapshot?.paymentState ===
                    "post_emergency_review" && (
                    <StatusBadge variant="warning">
                      <span data-testid="ticket-post-emergency-review">
                        {paymentDecisionLabel("post_emergency_review", locale)}
                      </span>
                    </StatusBadge>
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {t("Sorumlu")}: {t(selectedTicket.assignee)} · {t("Sevk")}:{" "}
                  {t(selectedSnapshot?.dispatchState ?? "pending")}
                </p>
                {(accountantView || selectedNeedsOwnerDecision) && (
                  <p className="mt-2 text-xs font-semibold text-foreground">
                    {accountantView && (
                      <>
                        {t("Odeme")}:{" "}
                        {selectedSnapshot?.paymentState === "post_emergency_review"
                          ? paymentDecisionLabel("post_emergency_review", locale)
                          : t(selectedSnapshot?.paymentState ?? "pending")}{" "}
                        ·{" "}
                      </>
                    )}
                    {t("Tahmini maliyet")}:{" "}
                    {formatTry(selectedTicket.estimatedCostTry)}
                  </p>
                )}
              </div>

              <div
                data-testid="ticket-history"
                className="rounded-xl border border-border bg-muted/25 p-3"
              >
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div>
                    <h3 className="text-xs font-black tracking-wide text-foreground uppercase">
                      {ticketHistoryCopy[locale].title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticketHistoryCopy[locale].description}
                    </p>
                  </div>
                </div>
                <ol className="mt-3 space-y-2">
                  {selectedTicketHistory.map((event, index) => (
                    <li key={event.id} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                          index === selectedTicketHistory.length - 1
                            ? "bg-primary"
                            : "bg-muted-foreground/35"
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">
                          {ticketHistoryMessage(event, locale)}
                        </p>
                        <time
                          dateTime={event.occurredAt}
                          className="mt-0.5 block text-xs text-muted-foreground"
                        >
                          {ticketHistoryTime(event.occurredAt, locale)}
                        </time>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div
                data-testid="ticket-transition-panel"
                className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3"
              >
                <div>
                  <h3 className="text-xs font-black tracking-wide text-foreground uppercase">
                    {accountantView
                      ? t("Finans gorunumu")
                      : t("Siradaki izinli adimlar")}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {accountantView
                      ? t(
                          "Muhasebe rolu operasyon durumunu degistiremez; yalnizca finans engelli kayitlari gorur."
                        )
                      : selectedAllowedTransitions.length > 0
                        ? t(
                            "Yalnizca rolunuze ve talebin mevcut durumuna uygun adimlar gosterilir."
                          )
                        : t(
                            "Bu talep icin su anda rolunuze atanmis bir is akisi adimi yok."
                          )}
                  </p>
                </div>

                {selectedAllowedTransitions.includes("assign") && (
                  <select
                    aria-label={`${t("Sorumlu kisi veya ekip")}: ${selectedTicket.title}`}
                    value={selectedTransitionAssignee}
                    onChange={(event) =>
                      setTransitionAssignees((current) => ({
                        ...current,
                        [selectedTicket.id]: event.target.value,
                      }))
                    }
                    className="min-h-10 rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                  >
                    {ticketAssigneeOptions.map((assignee) => (
                      <option key={assignee} value={assignee}>
                        {t(assignee)}
                      </option>
                    ))}
                  </select>
                )}

                {selectedAllowedTransitions.includes(
                  "request_owner_approval"
                ) && (
                  <fieldset className="rounded-lg border border-border bg-background/80 p-3">
                    <legend className="px-1 text-xs font-black text-foreground uppercase">
                      {t("Malik onayi politika baglami")}
                    </legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="block text-xs font-black text-muted-foreground uppercase">
                        {t("Maliyet sorumlulugu")}
                        <select
                          value={selectedOwnerApprovalContext.responsibility}
                          onChange={(event) =>
                            setOwnerApprovalContexts((current) => ({
                              ...current,
                              [selectedTicket.id]: {
                                ...selectedOwnerApprovalContext,
                                responsibility: event.target
                                  .value as OwnerApprovalContextDraft["responsibility"],
                              },
                            }))
                          }
                          className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                          required
                        >
                          <option value="">{t("Sorumlulugu secin")}</option>
                          <option value="owner">{t("Malik")}</option>
                          <option value="shared">{t("Paylasimli")}</option>
                        </select>
                      </label>
                      <label className="block text-xs font-black text-muted-foreground uppercase">
                        {t("Onay politikasi")}
                        <select
                          value={selectedOwnerApprovalContext.policyCode}
                          onChange={(event) =>
                            setOwnerApprovalContexts((current) => ({
                              ...current,
                              [selectedTicket.id]: {
                                ...selectedOwnerApprovalContext,
                                policyCode: event.target
                                  .value as OwnerApprovalContextDraft["policyCode"],
                              },
                            }))
                          }
                          className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                          required
                        >
                          <option value="">{t("Politikayi secin")}</option>
                          <option value="resident_cost_approval_v1">
                            {t("Yerlesik maliyet onayi v1")}
                          </option>
                        </select>
                      </label>
                      <label className="block text-xs font-black text-muted-foreground uppercase">
                        {t("Tahmini maliyet (TRY)")}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={selectedOwnerApprovalContext.estimatedCostTry}
                          onChange={(event) =>
                            setOwnerApprovalContexts((current) => ({
                              ...current,
                              [selectedTicket.id]: {
                                ...selectedOwnerApprovalContext,
                                estimatedCostTry: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                          required
                        />
                      </label>
                      <label className="block text-xs font-black text-muted-foreground uppercase">
                        {t("Onay esigi (TRY)")}
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={
                            selectedOwnerApprovalContext.approvalThresholdTry
                          }
                          onChange={(event) =>
                            setOwnerApprovalContexts((current) => ({
                              ...current,
                              [selectedTicket.id]: {
                                ...selectedOwnerApprovalContext,
                                approvalThresholdTry: event.target.value,
                              },
                            }))
                          }
                          className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                          required
                        />
                      </label>
                    </div>
                    <p className="mt-2 text-[11px] font-medium text-muted-foreground">
                      {t(
                        "Politika, sorumluluk, maliyet ve esik denetim kaydina birlikte yazilir; sistem bunlari tahmin etmez."
                      )}
                    </p>
                  </fieldset>
                )}

                {selectedAllowedTransitions.length > 0 && (
                  <label className="block text-xs font-black text-muted-foreground uppercase">
                    {t("Islem notu veya neden")}
                    <textarea
                      value={selectedTransitionReason}
                      onChange={(event) =>
                        setTransitionReasons((current) => ({
                          ...current,
                          [selectedTicket.id]: event.target.value,
                        }))
                      }
                      className="mt-1 min-h-20 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                      maxLength={500}
                      aria-describedby="ticket-transition-help"
                    />
                    <span
                      id="ticket-transition-help"
                      className="mt-1 block text-[11px] font-medium text-muted-foreground normal-case"
                    >
                      {t(
                        "Bekletme, yeniden acma, iptal ve yeniden isleme adimlarinda neden zorunludur."
                      )}
                    </span>
                  </label>
                )}

                <div className="flex flex-wrap gap-2">
                  {selectedAllowedTransitions.map((command) => {
                    const requiresReason = reasonRequiredCommands.has(command)
                    const disabled =
                      ticketTransitionState === "loading" ||
                      (requiresReason && !selectedTransitionReason.trim()) ||
                      (command === "assign" && selectedAssigneeIsTriageQueue) ||
                      (command === "request_owner_approval" &&
                        !ownerApprovalContextReady)
                    const destructive = [
                      "cancel",
                      "reject_owner_request",
                      "request_rework",
                    ].includes(command)

                    return (
                      <button
                        key={command}
                        type="button"
                        data-testid={`ticket-transition-${command}`}
                        onClick={() => void runTicketTransition(command)}
                        disabled={disabled}
                        className={
                          destructive
                            ? "inline-flex min-h-10 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300"
                            : "inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-45"
                        }
                      >
                        {t(
                          serverWorkflow.allowedTransitionLabels?.[command] ??
                            ticketCommandLabels[command]
                        )}
                      </button>
                    )
                  })}
                </div>

                {ticketTransitionState === "loading" && (
                  <p
                    className="text-xs font-bold text-primary"
                    role="status"
                    aria-live="polite"
                  >
                    {t("Is akisi adimi kaydediliyor...")}
                  </p>
                )}
                {ticketTransitionState === "success" && (
                  <p
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-300"
                    role="status"
                    aria-live="polite"
                  >
                    {t("Is akisi adimi kaydedildi.")}
                  </p>
                )}
                {ticketTransitionState === "error" && ticketTransitionError && (
                  <p
                    className="text-xs font-bold text-rose-700 dark:text-rose-300"
                    role="alert"
                  >
                    {ticketTransitionError}
                  </p>
                )}
              </div>

              {canEditTicketMetadata ? (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button
                    type="submit"
                    disabled={ticketEditState === "loading"}
                    className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {t("Degisiklikleri kaydet")}
                  </button>
                  <button
                    type="button"
                    disabled={ticketEditState === "loading"}
                    onClick={(event) => {
                      const form = event.currentTarget.form
                      if (form)
                        void submitTicketUpdate(
                          readTicketUpdateForm(form),
                          true
                        )
                    }}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-2 text-sm font-black text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("Aciklamayi kaldir")}
                  </button>
                </div>
              ) : (
                <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-semibold text-muted-foreground">
                  {t(
                    "Talep bilgileri bu asamada salt okunurdur. Uygun islemi yukaridaki izinli adimlardan secin."
                  )}
                </p>
              )}
            </form>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-4 text-sm font-semibold text-muted-foreground">
              {t("Henuz duzenlenecek servis talebi yok.")}
            </div>
          )}
        </Card3D>
      </div>

      {(user.role === "admin" || user.role === "manager") && (
        <DashboardSection
          title={approvalCopy.title}
          description={approvalCopy.description}
          icon={Sparkles}
          badge={
            <StatusBadge variant={approvalPending > 0 ? "warning" : "success"}>
              {approvalPending} {t("onay")}
            </StatusBadge>
          }
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="rounded-xl border border-border bg-muted/25 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-foreground">
                    {approvalCopy.aiTitle}
                  </h3>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {approvalCopy.aiBody}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <StatusBadge variant="info">AI</StatusBadge>
                    <StatusBadge variant="warning">
                      {t("İnsan onayı")}
                    </StatusBadge>
                    <StatusBadge variant="success">Realtime</StatusBadge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {approvalQueue.length > 0 ? (
                approvalQueue.map((item) => {
                  const status = workflowStatusLabel(item)
                  const isPending = ["submitted", "queued", "logged"].includes(
                    status
                  )
                  const isLoading = workflowDecisionState[item.id] === "loading"
                  const isTicketApproval = isTicketCreationApproval(item)
                  const selectedAssignee =
                    workflowAssignees[item.id] ??
                    item.suggestedAssignee ??
                    "Operations queue"

                  return (
                    <div
                      key={item.id}
                      data-testid="workflow-approval-card"
                      className="rounded-xl border border-border bg-background/70 p-3"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge
                              variant={workflowStatusVariant(status)}
                            >
                              {t(status)}
                            </StatusBadge>
                            <StatusBadge
                              variant={
                                item.riskLevel === "restricted" ||
                                item.riskLevel === "high"
                                  ? "danger"
                                  : "info"
                              }
                            >
                              {t(item.riskLevel)}
                            </StatusBadge>
                          </div>
                          <h3 className="mt-2 truncate text-sm font-black text-foreground">
                            {displayWorkflowTitle(item)}
                          </h3>
                          {isPending && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {approvalCopy.reviewHint}
                            </p>
                          )}
                          {isTicketApproval && isPending && (
                            <label className="mt-3 block text-xs font-black text-foreground">
                              {approvalCopy.assignTo}
                              <select
                                aria-label={`${approvalCopy.assignTo}: ${displayWorkflowTitle(item)}`}
                                value={selectedAssignee}
                                onChange={(event) =>
                                  setWorkflowAssignees((current) => ({
                                    ...current,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                className="mt-1 min-h-10 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground transition outline-none focus:border-primary"
                              >
                                {ticketAssigneeOptions.map((assignee) => (
                                  <option key={assignee} value={assignee}>
                                    {t(assignee)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          {workflowDecisionState[item.id] === "success" && (
                            <p
                              className="mt-2 text-xs font-bold text-emerald-700 dark:text-emerald-300"
                              role="status"
                            >
                              {isTicketApproval
                                ? approvalCopy.assignmentSuccess
                                : t(status)}
                            </p>
                          )}
                          {workflowDecisionState[item.id] === "error" && (
                            <p
                              className="mt-2 text-xs font-bold text-rose-700 dark:text-rose-300"
                              role="alert"
                            >
                              {approvalCopy.decisionError}
                            </p>
                          )}
                        </div>

                        <div className="flex shrink-0 gap-2">
                          <button
                            type="button"
                            disabled={!isPending || isLoading}
                            onClick={() =>
                              void decideWorkflow(
                                item,
                                "approved",
                                selectedAssignee
                              )
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {isTicketApproval
                              ? approvalCopy.approveAndAssign
                              : approvalCopy.approve}
                          </button>
                          <button
                            type="button"
                            disabled={!isPending || isLoading}
                            onClick={() =>
                              void decideWorkflow(item, "rejected")
                            }
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-45 dark:text-rose-300"
                          >
                            <XCircle className="h-4 w-4" />
                            {approvalCopy.reject}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="rounded-xl border border-dashed border-border p-4 text-sm font-semibold text-muted-foreground">
                  {approvalCopy.empty}
                </div>
              )}
            </div>
          </div>
        </DashboardSection>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <DashboardSection
          className="xl:col-span-2"
          title={t("Servis katalogu ve siparis kapisi")}
          description={t(
            "Fiyat, SLA, borç politikası, depozito ve ekip kuralı sipariş oluşmadan önce görünür."
          )}
          info={t(
            "Burada yalnızca en ilgili servis kartları gösterilir. Tam operasyon kuyruğu için aşağıdaki talep tablosunu kullanın."
          )}
          actionHref="#ticket-table"
          actionLabel={t("Tüm talepler")}
          badge={
            <StatusBadge variant={blockedOrders > 0 ? "warning" : "success"}>
              {readyOrders} {t("sevke hazır")}
            </StatusBadge>
          }
        >
          {emergencyCatalog.length > 0 && (
            <div className="mb-4 rounded-xl border border-rose-500/15 bg-rose-500/5 p-3">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <h3 className="min-w-0 text-xs font-black text-foreground">
                    {t("Acil senaryo rotaları")}
                  </h3>
                </div>
                <StatusBadge variant="danger">
                  {emergencyCatalog.length} {t("rota")}
                </StatusBadge>
              </div>
              <div className="flex flex-wrap gap-2">
                {emergencyCatalog.map((item) => (
                  <div
                    key={`emergency-${item.code}`}
                    className="min-w-0 flex-1 basis-36 rounded-lg border border-border bg-background/80 px-3 py-2 sm:basis-44"
                  >
                    <p className="truncate text-xs font-black text-foreground">
                      {t(emergencyRouteLabel(item))}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] font-semibold text-muted-foreground">
                      SLA {item.slaHours} {t("saat")} -{" "}
                      {t(emergencyQueueLabel(item))}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-2">
            {visibleCatalog
              .slice(0, clientView ? 4 : 6)
              .map((item: ServiceCatalogItem) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-muted/25 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          variant={
                            item.serviceLevel === "emergency"
                              ? "danger"
                              : item.serviceLevel === "premium"
                                ? "info"
                                : "neutral"
                          }
                        >
                          {t(item.serviceLevel)}
                        </StatusBadge>
                        <StatusBadge
                          variant={
                            item.debtPolicy === "block_until_clear"
                              ? "warning"
                              : "success"
                          }
                        >
                          {item.debtPolicy === "allow"
                            ? t("Borç esnek")
                            : item.debtPolicy === "manager_review"
                              ? t("Yönetici kontrol")
                              : t("Borç kapalı")}
                        </StatusBadge>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground">
                        {t(item.name)}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {t(item.description)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-foreground">
                        {maskFinance
                          ? `${item.slaHours} ${t("saat")}`
                          : formatTry(item.basePriceTry)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        SLA {item.slaHours} {t("saat")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      {t(item.team)} - {t(item.providerType)}
                    </p>
                    {!fieldView && (
                      <DashboardActionMenu
                        compact
                        label={t("Servis aksiyonlari")}
                        ariaLabel={`${t(item.name)} ${t("Servis aksiyonlari")}`}
                        buttonClassName="border-primary/25 bg-primary/10 text-primary hover:bg-primary/15"
                        items={[
                          {
                            key: "prepare-order",
                            label: t("Siparis hazirla"),
                            description: `${item.team} ${t("ekibi için")} SLA ${item.slaHours} ${t("saat")}.`,
                            icon: <PackageCheck />,
                            actionType: "service_orders.create.prepare",
                            ariaLabel: `${t(item.name)} ${t("siparisi hazirla")}`,
                            entityTable: "service_orders",
                            entityExternalId: item.code,
                            title: `${t(item.name)} ${t("servis siparisi")}`,
                            metadata: {
                              catalogItemId: item.id,
                              priceTry: item.basePriceTry,
                              slaHours: item.slaHours,
                              debtPolicy: item.debtPolicy,
                            },
                          },
                        ]}
                      />
                    )}
                  </div>
                </div>
              ))}
          </div>
        </DashboardSection>

        <Card3D glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">
              {t("Siparis kontrolu")}
            </h2>
            <StatusBadge variant={blockedOrders > 0 ? "danger" : "success"}>
              {blockedOrders} {t("blokeli")}
            </StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleOrders.slice(0, 5).map((order) => (
              <div
                key={order.id}
                data-testid="service-order-card"
                data-ticket-id={order.ticketId}
                data-order-status={order.status}
                data-debt-check-status={order.debtCheckStatus}
                data-payment-decision={order.paymentDecision}
                className="rounded-xl border border-border bg-background/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">
                      {order.orderNo} - {order.flatNumber}
                    </p>
                    <h3 className="mt-1 text-sm font-bold text-foreground">
                      {t(order.catalogItemName)}
                    </h3>
                  </div>
                  <StatusBadge variant={orderVariant(order.status)}>
                    {orderStatusLabel(order.status, locale)}
                  </StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {order.paymentDecision === "no_charge" &&
                  visibleTickets.some(
                    (ticket) => ticket.id === order.ticketId && ticket.emergency
                  ) ? (
                    <span data-testid="service-order-emergency-operational">
                      {emergencyOperationalLabel(locale)}
                    </span>
                  ) : (
                    <span>
                      {paymentDecisionLabel(order.paymentDecision, locale)}
                    </span>
                  )}
                  <span>-</span>
                  <span>{t(order.assignedTeam)}</span>
                  {!maskFinance && (
                    <>
                      <span>-</span>
                      <span>{formatTry(order.quotedPriceTry)}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t(order.nextAction)}
                </p>
              </div>
            ))}
          </div>
        </Card3D>
      </div>

      <DashboardSection
        title={t("Saha gorevleri, SLA ve medya kaniti")}
        description={t(
          "Atama, rota, checklist, medya kanıtı ve yönetici onayı tek görev panosunda takip edilir."
        )}
        info={t(
          "Dashboard ilk altı saha görevini gösterir. Rota çok kayıt içerdiğinde tam iş gücü tablosunu kullanın."
        )}
        actionHref="#workforce-table"
        actionLabel={t("Tüm görevler")}
        badge={
          <div className="flex flex-wrap gap-2">
            <StatusBadge
              variant={managerApprovalTasks > 0 ? "warning" : "success"}
            >
              {managerApprovalTasks} {t("onay")}
            </StatusBadge>
            <StatusBadge variant={overdue > 0 ? "danger" : "success"}>
              {overdue} {t("SLA riski")}
            </StatusBadge>
          </div>
        }
      >
        <div className="grid gap-3 lg:grid-cols-3">
          {visibleTasks.slice(0, 6).map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-border bg-muted/25 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">
                    {task.routeSlot} - {task.flatNumber}
                  </p>
                  <h3 className="mt-1 text-sm font-bold text-foreground">
                    {t(task.title)}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(task.team)} - {t(task.assignee)}
                  </p>
                </div>
                <StatusBadge variant={taskReadinessVariant(task)}>
                  {task.completionReadiness}%
                </StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant={priorityVariant(task.priority)}>
                  {servicePriorityLabel(task.priority, locale)}
                </StatusBadge>
                <StatusBadge variant={statusVariant(task.status)}>
                  {serviceStatusLabel(task.status, locale)}
                </StatusBadge>
                {task.managerApprovalRequired && (
                  <StatusBadge variant="warning">{t("Yönetici")}</StatusBadge>
                )}
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {task.checklist.slice(0, 3).map((item) => (
                  <li key={`${task.id}-${item}`} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{t(item)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {task.mediaCount} {t("medya")} - SLA {task.slaHoursRemaining}{" "}
                  {t("saat")}
                </p>
                {!clientView && (
                  <DashboardActionMenu
                    compact
                    label={t("Gorev aksiyonlari")}
                    ariaLabel={`${task.id} ${t("saha gorev aksiyonlari")}`}
                    items={[
                      {
                        key: "prepare-task",
                        label: t("Gorev aksiyonu hazirla"),
                        description: `${t(task.assignee)} ${t("için medya ve SLA kaydı")}.`,
                        icon: <ListChecks />,
                        actionType: "workforce_tasks.update.prepare",
                        ariaLabel: `${task.id} ${t("saha gorevini hazirla")}`,
                        entityTable: "workforce_tasks",
                        entityExternalId: task.id,
                        title: `${task.id} ${t("saha gorevi")}`,
                        metadata: {
                          ticketId: task.ticketId,
                          assignee: task.assignee,
                          slaHoursRemaining: task.slaHoursRemaining,
                          mediaCount: task.mediaCount,
                        },
                      },
                    ]}
                  />
                )}
              </div>
              {queueData && selectedProofTaskId !== task.id && (
                <ServiceProofPanel
                  ticketId={task.ticketId}
                  workforceTaskId={task.id}
                  role={user.role}
                />
              )}
            </div>
          ))}
        </div>
      </DashboardSection>

      <div className="grid gap-6 lg:grid-cols-3">
        <DashboardSection
          className="lg:col-span-2"
          title={
            clientView ? t("Takipteki talepleriniz") : t("Öncelikli iş kuyruğu")
          }
          description={t(
            "Bu önizlemede yalnızca acil, gecikmiş veya blokeli talepler kalır. Tam talep tablosu aşağıda aranabilir ve sayfalanabilir."
          )}
          info={t(
            "Önizleme listeleri panonun taranabilir kalması için sınırlıdır. Tüm kayıtlar için tam tabloyu kullanın."
          )}
          actionHref="#ticket-table"
          actionLabel={t("Tüm talepler")}
          badge={
            <StatusBadge variant={overdue > 0 ? "danger" : "success"}>
              {overdue} {t("gecikmiş")}
            </StatusBadge>
          }
        >
          <div className="mb-4 rounded-xl border border-border bg-muted/20 p-3">
            <PieChart
              data={ticketStatusData}
              size={132}
              ariaLabel={t("Servis talebi durum dağılımı")}
              totalLabel={t("toplam")}
            />
          </div>
          <div className="space-y-3">
            {visibleQueue.map((ticket) => (
              <div
                key={ticket.id}
                data-testid="ticket-priority-card"
                data-ticket-id={ticket.id}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={priorityVariant(ticket.priority)}>
                        {servicePriorityLabel(ticket.priority, locale)}
                      </StatusBadge>
                      <StatusBadge variant={statusVariant(ticket.status)}>
                        {serviceStatusLabel(ticket.status, locale)}
                      </StatusBadge>
                      {(ticket.emergency || ticket.severity === "P0") && (
                        <StatusBadge variant="danger">
                          <span
                            data-testid="ticket-emergency-indicator"
                            aria-label={t("P0 acil - 112'yi arayin")}
                          >
                            P0 · 112
                          </span>
                        </StatusBadge>
                      )}
                      {ticket.debtBlocked &&
                        !ticket.emergency &&
                        !clientView && (
                          <StatusBadge variant="danger">
                            {t("Finans blokeli")}
                          </StatusBadge>
                        )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {t(ticket.title)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.flatNumber} - {t(ticket.category)}
                      {!clientView && ` - ${t(ticket.assignee)}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {maskFinance
                        ? serviceStatusLabel(ticket.status, locale)
                        : formatTry(ticket.estimatedCostTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      SLA {ticket.slaHoursRemaining} {t("saat")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView
                    ? t("Servis kapsamı")
                    : t("Servis güvenlik kuralı")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? t(
                        "Sadece sizin dairenize veya yetkili kaydınıza bağlı talepler gösterilir."
                      )
                    : t(
                        "Borç blokeli dairelerde teknisyen sahaya çıkmadan önce muhasebe onayı ve ödeme doğrulaması gerekir."
                      )}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView ? t("Kanıt ve yanıt") : t("Saha iş akışı")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? t(
                        "Fotoğraf, açıklama, randevu ve kapanış kararı yönetim ekibiyle aynı kayıt üzerinden paylaşılır."
                      )
                    : t(
                        "Talep, fotoğraf, maliyet, onay, atama ve kapanış kanıtı tek kayıtta tutulur."
                      )}
                </p>
              </div>
            </div>
          </Card3D>
          {!clientView && (
            <Card3D glow={false}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">
                    {fieldView ? t("Günlük rota") : t("AI önerisi")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fieldView
                      ? t(
                          "SLA ve kanıt ihtiyacına göre teknik rota sadeleştirilir; finans tutarları saha görünümünde maskelenir."
                        )
                      : t(
                          "SLA, tahmini maliyet ve borç durumu birlikte skorlanarak günlük teknik rota oluşturulur."
                        )}
                  </p>
                </div>
              </div>
            </Card3D>
          )}
          {!clientView && queueData?.strategy && (
            <Card3D glow={false}>
              <div className="flex items-start gap-3">
                <TicketCheck className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">
                    {t("Ticketing mimarisi")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t(queueData.strategy.systemOfRecord)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t(queueData.strategy.crmRole)}
                  </p>
                </div>
              </div>
            </Card3D>
          )}
        </div>
      </div>

      <DashboardSection
        title={t("Tam servis talebi kaydı")}
        description={t(
          "Dashboard önizlemesini genişletmek yerine tüm servis taleplerini arayın, sıralayın ve sayfalayın."
        )}
        info={t(
          "Bu tam operasyon kuyruğudur. Günlük iş kolay taransın diye üstteki kartlar sınırlı tutulur."
        )}
        actionHref="#tickets-top"
        actionLabel={t("Üst")}
      >
        <div id="ticket-table" className="scroll-mt-24">
          <DataTable
            data={visibleTickets}
            rowKey={(ticket) => ticket.id}
            rowLabel={(ticket) => `${t("Detaylari ac")}: ${ticket.title}`}
            onRowClick={(ticket) => openTicket(ticket.id)}
            searchValue={(ticket) =>
              `${ticket.id} ${ticket.flatNumber} ${ticket.title} ${ticket.description ?? ""} ${ticket.assignee} ${ticket.requester}`
            }
            searchQuery={ticketSearchQuery}
            onSearchQueryChange={setTicketSearchQuery}
            searchPending={
              requestState === "loading" ||
              ticketSearchQuery.trim() !== debouncedTicketSearch
            }
            columns={[
              {
                key: "id",
                header: t("Talep"),
                sortable: true,
                render: (ticket) => ticket.id,
              },
              {
                key: "flat",
                header: t("Daire"),
                sortable: true,
                render: (ticket) => ticket.flatNumber,
              },
              {
                key: "title",
                header: t("Konu"),
                render: (ticket) => t(ticket.title),
              },
              {
                key: "priority",
                header: t("Öncelik"),
                render: (ticket) => (
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge variant={priorityVariant(ticket.priority)}>
                      {servicePriorityLabel(ticket.priority, locale)}
                    </StatusBadge>
                    {(ticket.emergency || ticket.severity === "P0") && (
                      <StatusBadge variant="danger">
                        <span
                          data-testid="ticket-register-emergency-indicator"
                          data-ticket-id={ticket.id}
                        >
                          P0 · 112
                        </span>
                      </StatusBadge>
                    )}
                  </div>
                ),
              },
              {
                key: "status",
                header: t("Durum"),
                render: (ticket) => (
                  <StatusBadge variant={statusVariant(ticket.status)}>
                    {serviceStatusLabel(ticket.status, locale)}
                  </StatusBadge>
                ),
              },
              ...(!clientView
                ? [
                    {
                      key: "assignee",
                      header: t("Sorumlu"),
                      render: (ticket: ServiceTicket) => t(ticket.assignee),
                    },
                  ]
                : []),
              {
                key: "sla",
                header: "SLA",
                sortable: true,
                sortValue: (ticket) => ticket.slaHoursRemaining,
                render: (ticket) => (
                  <StatusBadge
                    variant={ticket.slaHoursRemaining < 0 ? "danger" : "info"}
                  >
                    {ticket.slaHoursRemaining} {t("saat")}
                  </StatusBadge>
                ),
              },
              ...(!clientView
                ? [
                    {
                      key: "payment",
                      header: fieldView ? t("Servis izni") : t("Ödeme"),
                      render: (ticket: ServiceTicket) =>
                        ticket.emergency &&
                        ticket.paymentWorkflowStatus ===
                          "post_emergency_review" ? (
                          <StatusBadge variant="warning">
                            <span
                              data-testid="ticket-register-post-emergency-review"
                              data-ticket-id={ticket.id}
                            >
                              {paymentDecisionLabel(
                                "post_emergency_review",
                                locale
                              )}
                            </span>
                          </StatusBadge>
                        ) : ticket.emergency ? (
                          <StatusBadge variant="info">
                            <span
                              data-testid="ticket-register-emergency-operational"
                              data-ticket-id={ticket.id}
                            >
                              {emergencyOperationalLabel(locale)}
                            </span>
                          </StatusBadge>
                        ) : ticket.debtBlocked ? (
                          <StatusBadge variant="danger">
                            {t("Blokeli")}
                          </StatusBadge>
                        ) : ticket.paymentVerified ? (
                          <StatusBadge variant="success">
                            {t("Onaylı")}
                          </StatusBadge>
                        ) : (
                          <StatusBadge variant="warning">
                            {t("Kontrol")}
                          </StatusBadge>
                        ),
                    },
                  ]
                : []),
              ...(!maskFinance
                ? [
                    {
                      key: "cost",
                      header: t("Maliyet"),
                      sortable: true,
                      sortValue: (ticket: ServiceTicket) =>
                        ticket.estimatedCostTry,
                      render: (ticket: ServiceTicket) =>
                        formatTry(ticket.estimatedCostTry),
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </DashboardSection>

      <DashboardSection
        title={t("Tam saha görev kaydı")}
        description={t(
          "Rota, kontrol listesi, medya, SLA ve onay kayıtları önizleme kartları yoğunlaşınca aranabilir kalır."
        )}
        info={t(
          "Aynı gün çok sayıda teknisyen görevi olduğunda bu kaydı kullanın."
        )}
        actionHref="#ticket-table"
        actionLabel={t("Talepler")}
      >
        <div id="workforce-table" className="scroll-mt-24">
          <DataTable
            data={visibleTasks}
            pageSize={8}
            searchValue={(task) =>
              `${task.id} ${task.ticketId} ${task.flatNumber} ${task.title} ${t(task.team)} ${t(task.assignee)}`
            }
            columns={[
              {
                key: "id",
                header: "Görev",
                sortable: true,
                render: (task) => task.id,
              },
              {
                key: "flat",
                header: t("Daire"),
                sortable: true,
                render: (task) => task.flatNumber,
              },
              { key: "title", header: "İş", render: (task) => task.title },
              {
                key: "team",
                header: "Ekip",
                sortable: true,
                render: (task) => task.team,
              },
              {
                key: "assignee",
                header: t("Sorumlu"),
                sortable: true,
                render: (task) => t(task.assignee),
              },
              {
                key: "readiness",
                header: "Hazır",
                sortable: true,
                sortValue: (task) => task.completionReadiness,
                render: (task) => (
                  <StatusBadge variant={taskReadinessVariant(task)}>
                    {task.completionReadiness}%
                  </StatusBadge>
                ),
              },
              {
                key: "priority",
                header: t("Öncelik"),
                render: (task) => (
                  <StatusBadge variant={priorityVariant(task.priority)}>
                    {servicePriorityLabel(task.priority, locale)}
                  </StatusBadge>
                ),
              },
              {
                key: "sla",
                header: "SLA",
                sortable: true,
                sortValue: (task) => task.slaHoursRemaining,
                render: (task) => `${task.slaHoursRemaining} ${t("saat")}`,
              },
              {
                key: "proof",
                header: t("Kanıt ve yanıt"),
                sticky: "right",
                render: (task) => (
                  <button
                    type="button"
                    data-testid={`workforce-proof-open-${task.id}`}
                    aria-controls="selected-workforce-proof"
                    aria-expanded={selectedProofTaskId === task.id}
                    onClick={() => setSelectedProofTaskId(task.id)}
                    className="inline-flex min-h-9 items-center justify-center rounded-lg border border-border bg-background px-3 py-2 text-xs font-black text-foreground transition hover:border-primary/35 hover:bg-primary/[0.06] focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:outline-none"
                  >
                    {t("Kanıt ve yanıt")}
                  </button>
                ),
              },
            ]}
          />
        </div>
        {selectedProofTask && (
          <section
            id="selected-workforce-proof"
            aria-labelledby="selected-workforce-proof-title"
            className="mt-4 rounded-xl border border-border bg-muted/20 p-4"
          >
            <h3
              id="selected-workforce-proof-title"
              className="mb-3 text-sm font-black text-foreground"
            >
              {selectedProofTask.id} · {t("Kanıt ve yanıt")}
            </h3>
            <ServiceProofPanel
              ticketId={selectedProofTask.ticketId}
              workforceTaskId={selectedProofTask.id}
              role={user.role}
            />
          </section>
        )}
      </DashboardSection>
    </div>
  )
}
