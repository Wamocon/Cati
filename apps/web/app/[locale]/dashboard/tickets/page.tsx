"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  ClipboardCheck,
  Clock3,
  CreditCard,
  ListChecks,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  TicketCheck,
  UserCheck,
  Wrench,
} from "lucide-react"
import { useLocale } from "next-intl"
import { interpolate, localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
import { createClient } from "@/lib/supabase/client"
import type { ServiceTicketQueueData } from "@/lib/site-management-repository"
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
  type ServiceStatus,
  type WorkforceTaskRecord,
} from "@/lib/site-management-data"

type RequestState = "idle" | "loading" | "success" | "error"

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

function orderVariant(status: ServiceOrderRecord["status"]) {
  if (status === "completed") return "success"
  if (status === "blocked" || status === "payment_pending") return "danger"
  if (status === "assigned" || status === "task_created") return "info"
  return "warning"
}

function paymentDecisionLabel(decision: ServiceOrderRecord["paymentDecision"], locale: string) {
  if (decision === "no_charge") return localizeBusinessCopy("Ucretsiz", locale)
  if (decision === "collect_before_dispatch") return localizeBusinessCopy("Odeme once", locale)
  if (decision === "debit_to_account") return localizeBusinessCopy("Cari hesaba yaz", locale)
  if (decision === "paid_or_debit_approved") return localizeBusinessCopy("Onayli", locale)
  return localizeBusinessCopy("Beklet", locale)
}

function orderStatusLabel(status: ServiceOrderRecord["status"], locale: string) {
  if (status === "draft") return localizeBusinessCopy("Taslak", locale)
  if (status === "debt_check") return localizeBusinessCopy("Borc kontrolu", locale)
  if (status === "payment_pending") return localizeBusinessCopy("Odeme bekliyor", locale)
  if (status === "task_created") return localizeBusinessCopy("Gorev acildi", locale)
  if (status === "assigned") return localizeBusinessCopy("Atandi", locale)
  if (status === "completed") return localizeBusinessCopy("Tamamlandi", locale)
  if (status === "blocked") return localizeBusinessCopy("Blokeli", locale)
  return localizeBusinessCopy("Iptal", locale)
}

function taskReadinessVariant(task: WorkforceTaskRecord) {
  if (task.slaHoursRemaining < 0 || task.managerApprovalRequired) return "danger"
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
  const [queueData, setQueueData] = useState<ServiceTicketQueueData | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const maskFinance = shouldMaskFinance(user.role)
  const fetchTickets = useCallback(async () => {
    setRequestState("loading")
    try {
      const response = await fetch("/api/site-management/tickets?limit=50", {
        cache: "no-store",
      })
      if (!response.ok) throw new Error("Ticket request failed.")
      setQueueData((await response.json()) as ServiceTicketQueueData)
      setRequestState("success")
    } catch {
      setRequestState("error")
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void fetchTickets()
    }, 0)

    const handleOperationalChange = () => {
      void fetchTickets()
    }

    window.addEventListener("site-management:changed", handleOperationalChange)
    return () => {
      window.clearTimeout(handle)
      window.removeEventListener("site-management:changed", handleOperationalChange)
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

  const sourceTickets = queueData?.tickets ?? serviceTickets
  const sourceCatalog = queueData?.catalog ?? serviceCatalogItems
  const sourceOrders = queueData?.orders ?? serviceOrders
  const sourceTasks = queueData?.workforceTasks ?? workforceTasks
  const visibleTickets = visibleServiceTicketsForRole(user.role, sourceTickets)
  const visibleOrders = visibleOrdersForTickets(sourceOrders, visibleTickets)
  const visibleTasks = visibleTasksForTickets(sourceTasks, visibleTickets)
  const open = visibleTickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  ).length
  const overdue = visibleTickets.filter((ticket) => ticket.slaHoursRemaining < 0).length
  const blocked = visibleTickets.filter((ticket) => ticket.debtBlocked).length
  const media = visibleTickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0)
  const activeCatalog = sourceCatalog.filter((item) => item.active)
  const visibleCatalog = clientView ? activeCatalog.slice(0, 4) : activeCatalog
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
  const managerApprovalTasks = visibleTasks.filter((task) => task.managerApprovalRequired).length
  const averageReadiness =
    visibleTasks.length > 0
      ? Math.round(
          visibleTasks.reduce((sum, task) => sum + task.completionReadiness, 0) /
            visibleTasks.length
        )
      : 0
  const priorityQueue = visibleTickets
    .filter(
      (ticket) =>
        ticket.priority === "urgent" ||
        ticket.slaHoursRemaining < 0 ||
        ticket.debtBlocked
    )
    .slice(0, 5)
  const visibleQueue = priorityQueue.length > 0 ? priorityQueue : visibleTickets.slice(0, 5)
  const sourceLabel =
    queueData?.source === "supabase"
      ? localizeBusinessCopy("Supabase live", locale)
      : localizeBusinessCopy("Yerel örnek veri", locale)

  const pageIntro = clientView
    ? localizeBusinessCopy(
        "Yetkili dairenize bağlı servis taleplerini, randevu durumunu, medya kanıtını ve yönetim yanıtlarını tek ekrandan takip edin.",
        locale
      )
    : fieldView
      ? localizeBusinessCopy(
          "Saha ekibi için atanan servis işleri, SLA önceliği, medya kanıtı ve kapanış adımları aynı iş kuyruğunda yönetilir.",
          locale
        )
      : `${clientProfile.activePortfolio} ${localizeBusinessCopy(
          "ve diğer Ataberk portföyleri için teknik servis, ödeme doğrulama, fotoğraf/video kanıtı ve SLA takibi aynı iş kuyruğunda yönetilir.",
          locale
        )}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("Servis Talepleri", locale)}</h1>
            <StatusBadge variant={queueData?.source === "supabase" ? "success" : "warning"}>
              {sourceLabel}
            </StatusBadge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
          {queueData?.warning && (
            <p className="mt-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
              {localizeBusinessCopy(queueData.warning, locale)}
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
            <RefreshCw className={requestState === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            {localizeBusinessCopy("Kuyrugu yenile", locale)}
          </button>
          {!clientView && (
            <DashboardActionButton
              actionType="tickets.sla.review"
              ariaLabel={localizeBusinessCopy("Servis SLA inceleme isteği oluştur", locale)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/15"
              entityTable="service_tickets"
              entityExternalId="NLP-OPS"
              metadata={{
                openTickets: open,
                overdueTickets: overdue,
                source: queueData?.source ?? "unknown",
              }}
              successLabel={localizeBusinessCopy("SLA inceleme istegi alindi", locale)}
              title={localizeBusinessCopy("Servis SLA ve kanit kuyrugu incelemesi", locale)}
            >
              <BadgeCheck className="h-4 w-4" />
              {localizeBusinessCopy("SLA incelemesi aç", locale)}
            </DashboardActionButton>
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          {localizeBusinessCopy("Servis talebi verisi su anda alinamadi. Yerel veriyle devam ediliyor.", locale)}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TicketCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Açık talep", locale)}</p>
              <AnimatedCounter value={open} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Clock3 className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("SLA dışı", locale)}</p>
              <AnimatedCounter value={overdue} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {clientView
                  ? localizeBusinessCopy("Onay bekleyen", locale)
                  : localizeBusinessCopy("Borç blokeli", locale)}
              </p>
              <AnimatedCounter value={blocked} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Medya kanıtı", locale)}</p>
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
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Katalog", locale)}</p>
              <AnimatedCounter value={visibleCatalog.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Siparis", locale)}</p>
              <AnimatedCounter value={visibleOrders.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ListChecks className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Saha gorevi", locale)}</p>
              <AnimatedCounter value={visibleTasks.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Hazırlık", locale)}</p>
              <AnimatedCounter value={averageReadiness} suffix="%" className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Servis kataloğu ve sipariş kapısı", locale)}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy("Fiyat, SLA, borç politikası, depozito ve ekip kuralı sipariş oluşmadan önce görünür.", locale)}
              </p>
            </div>
            <StatusBadge variant={blockedOrders > 0 ? "warning" : "success"}>
              {interpolate(localizeBusinessCopy("{count} sevke hazır", locale), { count: readyOrders })}
            </StatusBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {visibleCatalog.slice(0, clientView ? 4 : 6).map((item: ServiceCatalogItem) => (
              <div key={item.id} className="rounded-xl border border-border bg-muted/25 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={item.serviceLevel === "emergency" ? "danger" : item.serviceLevel === "premium" ? "info" : "neutral"}>
                        {item.serviceLevel}
                      </StatusBadge>
                      <StatusBadge variant={item.debtPolicy === "block_until_clear" ? "warning" : "success"}>
                        {item.debtPolicy === "allow"
                          ? localizeBusinessCopy("Borç esnek", locale)
                          : item.debtPolicy === "manager_review"
                            ? localizeBusinessCopy("Yönetici kontrol", locale)
                            : localizeBusinessCopy("Borc kapali", locale)}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{localizeBusinessCopy(item.name, locale)}</h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{localizeBusinessCopy(item.description, locale)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-foreground">
                      {maskFinance
                        ? interpolate(localizeBusinessCopy("{hours} saat", locale), { hours: item.slaHours })
                        : formatTry(item.basePriceTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interpolate(localizeBusinessCopy("SLA {hours} saat", locale), { hours: item.slaHours })}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground">{localizeBusinessCopy(item.team, locale)} - {localizeBusinessCopy(item.providerType, locale)}</p>
                  {!fieldView && (
                    <DashboardActionButton
                      actionType="service_orders.create.prepare"
                      ariaLabel={interpolate(localizeBusinessCopy("{name} siparişi hazırla", locale), { name: localizeBusinessCopy(item.name, locale) })}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition hover:bg-primary/15"
                      entityTable="service_orders"
                      entityExternalId={item.code}
                      metadata={{
                        catalogItemId: item.id,
                        priceTry: item.basePriceTry,
                        slaHours: item.slaHours,
                        debtPolicy: item.debtPolicy,
                      }}
                      successLabel={localizeBusinessCopy("Siparis hazirligi kayda alindi", locale)}
                      title={interpolate(localizeBusinessCopy("{name} servis siparisi", locale), { name: localizeBusinessCopy(item.name, locale) })}
                    >
                      <PackageCheck className="h-4 w-4" />
                      {localizeBusinessCopy("Hazırla", locale)}
                    </DashboardActionButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <Card3D glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Sipariş kontrolü", locale)}</h2>
            <StatusBadge variant={blockedOrders > 0 ? "danger" : "success"}>
              {interpolate(localizeBusinessCopy("{count} blokeli", locale), { count: blockedOrders })}
            </StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="rounded-xl border border-border bg-background/70 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground">{order.orderNo} - {order.flatNumber}</p>
                    <h3 className="mt-1 text-sm font-bold text-foreground">{localizeBusinessCopy(order.catalogItemName, locale)}</h3>
                  </div>
                  <StatusBadge variant={orderVariant(order.status)}>{orderStatusLabel(order.status, locale)}</StatusBadge>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{paymentDecisionLabel(order.paymentDecision, locale)}</span>
                  <span>-</span>
                  <span>{localizeBusinessCopy(order.assignedTeam, locale)}</span>
                  {!maskFinance && (
                    <>
                      <span>-</span>
                      <span>{formatTry(order.quotedPriceTry)}</span>
                    </>
                  )}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{localizeBusinessCopy(order.nextAction, locale)}</p>
              </div>
            ))}
          </div>
        </Card3D>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Saha görevleri, SLA ve medya kanıtı", locale)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeBusinessCopy("Atama, rota, checklist, medya kanıtı ve yönetici onayı tek görev panosunda takip edilir.", locale)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant={managerApprovalTasks > 0 ? "warning" : "success"}>
              {interpolate(localizeBusinessCopy("{count} onay", locale), { count: managerApprovalTasks })}
            </StatusBadge>
            <StatusBadge variant={overdue > 0 ? "danger" : "success"}>
              {interpolate(localizeBusinessCopy("{count} SLA riski", locale), { count: overdue })}
            </StatusBadge>
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          {visibleTasks.slice(0, 6).map((task) => (
            <div key={task.id} className="rounded-xl border border-border bg-muted/25 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-muted-foreground">{localizeBusinessCopy(task.routeSlot, locale)} - {task.flatNumber}</p>
                  <h3 className="mt-1 text-sm font-bold text-foreground">{localizeBusinessCopy(task.title, locale)}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{localizeBusinessCopy(task.assignee, locale)}</p>
                </div>
                <StatusBadge variant={taskReadinessVariant(task)}>{task.completionReadiness}%</StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant={priorityVariant(task.priority)}>{localizeBusinessCopy(priorityLabels[task.priority], locale)}</StatusBadge>
                <StatusBadge variant={statusVariant(task.status)}>{localizeBusinessCopy(serviceStatusLabels[task.status], locale)}</StatusBadge>
                {task.managerApprovalRequired && <StatusBadge variant="warning">{localizeBusinessCopy("Yonetici", locale)}</StatusBadge>}
              </div>
              <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                {task.checklist.slice(0, 3).map((item) => (
                  <li key={`${task.id}-${item}`} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{localizeBusinessCopy(item, locale)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">{interpolate(localizeBusinessCopy("{count} medya - SLA {sla} saat", locale), { count: task.mediaCount, sla: task.slaHoursRemaining })}</p>
                {!clientView && (
                  <DashboardActionButton
                    actionType="workforce_tasks.assign.prepare"
                    ariaLabel={interpolate(localizeBusinessCopy("{id} saha görevini hazırla", locale), { id: task.id })}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                    entityTable="workforce_tasks"
                    entityExternalId={task.id}
                    metadata={{
                      ticketId: task.ticketId,
                      assignee: task.assignee,
                      slaHoursRemaining: task.slaHoursRemaining,
                      mediaCount: task.mediaCount,
                    }}
                    successLabel={localizeBusinessCopy("Gorev aksiyonu kayda alindi", locale)}
                    title={interpolate(localizeBusinessCopy("{id} saha gorevi", locale), { id: task.id })}
                  >
                    <ListChecks className="h-4 w-4" />
                    {localizeBusinessCopy("Aksiyon", locale)}
                  </DashboardActionButton>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">
              {clientView
                ? localizeBusinessCopy("Takipteki talepleriniz", locale)
                : localizeBusinessCopy("Öncelikli iş kuyruğu", locale)}
            </h2>
            <StatusBadge variant={overdue > 0 ? "danger" : "success"}>
              {interpolate(localizeBusinessCopy("{count} gecikmiş", locale), { count: overdue })}
            </StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleQueue.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={priorityVariant(ticket.priority)}>
                        {localizeBusinessCopy(priorityLabels[ticket.priority], locale)}
                      </StatusBadge>
                      <StatusBadge variant={statusVariant(ticket.status)}>
                        {localizeBusinessCopy(serviceStatusLabels[ticket.status], locale)}
                      </StatusBadge>
                      {ticket.debtBlocked && !clientView && (
                        <StatusBadge variant="danger">{localizeBusinessCopy("Finans blokeli", locale)}</StatusBadge>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{localizeBusinessCopy(ticket.title, locale)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.flatNumber} - {localizeBusinessCopy(ticket.category, locale)}
                      {!clientView && ` - ${localizeBusinessCopy(ticket.assignee, locale)}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {maskFinance ? localizeBusinessCopy(serviceStatusLabels[ticket.status], locale) : formatTry(ticket.estimatedCostTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interpolate(localizeBusinessCopy("SLA {hours} saat", locale), { hours: ticket.slaHoursRemaining })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView
                    ? localizeBusinessCopy("Servis kapsamı", locale)
                    : localizeBusinessCopy("Servis güvenlik kuralı", locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy("Sadece sizin dairenize veya yetkili kaydınıza bağlı talepler gösterilir.", locale)
                    : localizeBusinessCopy("Borç blokeli dairelerde teknisyen sahaya çıkmadan önce muhasebe onayı ve ödeme doğrulaması gerekir.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView
                    ? localizeBusinessCopy("Kanıt ve yanıt", locale)
                    : localizeBusinessCopy("Saha iş akışı", locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy("Fotoğraf, açıklama, randevu ve kapanış kararı yönetim ekibiyle aynı kayıt üzerinden paylaşılır.", locale)
                    : localizeBusinessCopy("Talep, fotoğraf, maliyet, onay, atama ve kapanış kanıtı tek kayıtta tutulur.", locale)}
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
                    {fieldView
                      ? localizeBusinessCopy("Günlük rota", locale)
                      : localizeBusinessCopy("AI önerisi", locale)}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fieldView
                      ? localizeBusinessCopy("SLA ve kanıt ihtiyacına göre teknik rota sadeleştirilir; finans tutarları saha görünümünde maskelenir.", locale)
                      : localizeBusinessCopy("SLA, tahmini maliyet ve borç durumu birlikte skorlanarak günlük teknik rota oluşturulur.", locale)}
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
                  <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Ticketing mimarisi", locale)}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {localizeBusinessCopy(queueData.strategy.systemOfRecord, locale)}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {localizeBusinessCopy(queueData.strategy.crmRole, locale)}
                  </p>
                </div>
              </div>
            </Card3D>
          )}
        </div>
      </div>

      <DataTable
        data={visibleTickets}
        searchValue={(ticket) =>
          `${ticket.id} ${ticket.flatNumber} ${ticket.title} ${ticket.assignee} ${ticket.requester}`
        }
        columns={[
          { key: "id", header: localizeBusinessCopy("Talep", locale), sortable: true, render: (ticket) => ticket.id },
          { key: "flat", header: localizeBusinessCopy("Daire", locale), sortable: true, render: (ticket) => ticket.flatNumber },
          { key: "title", header: localizeBusinessCopy("Konu", locale), render: (ticket) => localizeBusinessCopy(ticket.title, locale) },
          {
            key: "priority",
            header: localizeBusinessCopy("Öncelik", locale),
            render: (ticket) => (
              <StatusBadge variant={priorityVariant(ticket.priority)}>
                {localizeBusinessCopy(priorityLabels[ticket.priority], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "status",
            header: localizeBusinessCopy("Durum", locale),
            render: (ticket) => (
              <StatusBadge variant={statusVariant(ticket.status)}>
                {localizeBusinessCopy(serviceStatusLabels[ticket.status], locale)}
              </StatusBadge>
            ),
          },
          ...(!clientView
            ? [
                {
                  key: "assignee",
                  header: localizeBusinessCopy("Sorumlu", locale),
                  render: (ticket: ServiceTicket) => localizeBusinessCopy(ticket.assignee, locale),
                },
              ]
            : []),
          {
            key: "sla",
            header: "SLA",
            sortable: true,
            sortValue: (ticket) => ticket.slaHoursRemaining,
            render: (ticket) => (
              <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "info"}>
                {interpolate(localizeBusinessCopy("{hours} saat", locale), { hours: ticket.slaHoursRemaining })}
              </StatusBadge>
            ),
          },
          ...(!clientView
            ? [
                {
                  key: "payment",
                  header: fieldView ? localizeBusinessCopy("Servis izni", locale) : localizeBusinessCopy("Ödeme", locale),
                  render: (ticket: ServiceTicket) =>
                    ticket.debtBlocked ? (
                      <StatusBadge variant="danger">{localizeBusinessCopy("Blokeli", locale)}</StatusBadge>
                    ) : ticket.paymentVerified ? (
                      <StatusBadge variant="success">{localizeBusinessCopy("Onaylı", locale)}</StatusBadge>
                    ) : (
                      <StatusBadge variant="warning">{localizeBusinessCopy("Kontrol", locale)}</StatusBadge>
                    ),
                },
              ]
            : []),
          ...(!maskFinance
            ? [
                {
                  key: "cost",
                  header: localizeBusinessCopy("Maliyet", locale),
                  sortable: true,
                  sortValue: (ticket: ServiceTicket) => ticket.estimatedCostTry,
                  render: (ticket: ServiceTicket) => formatTry(ticket.estimatedCostTry),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}
