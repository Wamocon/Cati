"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  BadgeCheck,
  Camera,
  Clock3,
  CreditCard,
  RefreshCw,
  ShieldAlert,
  TicketCheck,
  Wrench,
} from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
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
  serviceStatusLabels,
  serviceTickets,
  type ServicePriority,
  type ServiceTicket,
  type ServiceStatus,
} from "@/lib/site-management-data"

type RequestState = "idle" | "loading" | "success" | "error"

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

export default function TicketsPage() {
  const user = useUser()
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

  const sourceTickets = queueData?.tickets ?? serviceTickets
  const visibleTickets = visibleServiceTicketsForRole(user.role, sourceTickets)
  const open = visibleTickets.filter(
    (ticket) => ticket.status !== "closed" && ticket.status !== "resolved"
  ).length
  const overdue = visibleTickets.filter((ticket) => ticket.slaHoursRemaining < 0).length
  const blocked = visibleTickets.filter((ticket) => ticket.debtBlocked).length
  const media = visibleTickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0)
  const priorityQueue = visibleTickets
    .filter(
      (ticket) =>
        ticket.priority === "urgent" ||
        ticket.slaHoursRemaining < 0 ||
        ticket.debtBlocked
    )
    .slice(0, 5)
  const visibleQueue = priorityQueue.length > 0 ? priorityQueue : visibleTickets.slice(0, 5)
  const sourceLabel = queueData?.source === "supabase" ? "Supabase live" : "Local seed"

  const pageIntro = clientView
    ? "Yetkili dairenize bağlı servis taleplerini, randevu durumunu, medya kanıtını ve yönetim yanıtlarını tek ekrandan takip edin."
    : fieldView
      ? "Saha ekibi için atanan servis işleri, SLA önceliği, medya kanıtı ve kapanış adımları aynı iş kuyruğunda yönetilir."
      : `${clientProfile.activePortfolio} ve diğer Ataberk portföyleri için teknik servis, ödeme doğrulama, fotoğraf/video kanıtı ve SLA takibi aynı iş kuyruğunda yönetilir.`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">Servis Talepleri</h1>
            <StatusBadge variant={queueData?.source === "supabase" ? "success" : "warning"}>
              {sourceLabel}
            </StatusBadge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
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
            <RefreshCw className={requestState === "loading" ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Kuyrugu yenile
          </button>
          {!clientView && (
            <DashboardActionButton
              actionType="tickets.sla.review"
              ariaLabel="Servis SLA inceleme istegi olustur"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary transition hover:bg-primary/15"
              entityTable="service_tickets"
              entityExternalId="NLP-OPS"
              metadata={{
                openTickets: open,
                overdueTickets: overdue,
                source: queueData?.source ?? "unknown",
              }}
              successLabel="SLA inceleme istegi alindi"
              title="Servis SLA ve kanit kuyrugu incelemesi"
            >
              <BadgeCheck className="h-4 w-4" />
              SLA inceleme ac
            </DashboardActionButton>
          )}
        </div>
      </div>

      {requestState === "error" && (
        <div role="alert" className="rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-700 dark:text-rose-300">
          Servis talebi verisi su anda alinamadi. Yerel veriyle devam ediliyor.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TicketCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Açık talep</p>
              <AnimatedCounter value={open} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Clock3 className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">SLA dışı</p>
              <AnimatedCounter value={overdue} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {clientView ? "Onay bekleyen" : "Borç blokeli"}
              </p>
              <AnimatedCounter value={blocked} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Camera className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Medya kanıtı</p>
              <AnimatedCounter value={media} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">
              {clientView ? "Takipteki talepleriniz" : "Öncelikli iş kuyruğu"}
            </h2>
            <StatusBadge variant={overdue > 0 ? "danger" : "success"}>
              {overdue} gecikmiş
            </StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleQueue.map((ticket) => (
              <div key={ticket.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={priorityVariant(ticket.priority)}>
                        {priorityLabels[ticket.priority]}
                      </StatusBadge>
                      <StatusBadge variant={statusVariant(ticket.status)}>
                        {serviceStatusLabels[ticket.status]}
                      </StatusBadge>
                      {ticket.debtBlocked && !clientView && (
                        <StatusBadge variant="danger">Finans blokeli</StatusBadge>
                      )}
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{ticket.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticket.flatNumber} - {ticket.category}
                      {!clientView && ` - ${ticket.assignee}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {maskFinance ? serviceStatusLabels[ticket.status] : formatTry(ticket.estimatedCostTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">SLA {ticket.slaHoursRemaining} saat</p>
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
                  {clientView ? "Servis kapsamı" : "Servis güvenlik kuralı"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? "Sadece sizin dairenize veya yetkili kaydınıza bağlı talepler gösterilir."
                    : "Borç blokeli dairelerde teknisyen sahaya çıkmadan önce muhasebe onayı ve ödeme doğrulaması gerekir."}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView ? "Kanıt ve yanıt" : "Saha iş akışı"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? "Fotoğraf, açıklama, randevu ve kapanış kararı yönetim ekibiyle aynı kayıt üzerinden paylaşılır."
                    : "Talep, fotoğraf, maliyet, onay, atama ve kapanış kanıtı tek kayıtta tutulur."}
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
                    {fieldView ? "Günlük rota" : "AI önerisi"}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fieldView
                      ? "SLA ve kanıt ihtiyacına göre teknik rota sadeleştirilir; finans tutarları saha görünümünde maskelenir."
                      : "SLA, tahmini maliyet ve borç durumu birlikte skorlanarak günlük teknik rota oluşturulur."}
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
                  <h2 className="text-sm font-bold text-card-foreground">Ticketing mimarisi</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {queueData.strategy.systemOfRecord}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {queueData.strategy.crmRole}
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
          { key: "id", header: "Talep", sortable: true, render: (ticket) => ticket.id },
          { key: "flat", header: "Daire", sortable: true, render: (ticket) => ticket.flatNumber },
          { key: "title", header: "Konu", render: (ticket) => ticket.title },
          {
            key: "priority",
            header: "Öncelik",
            render: (ticket) => (
              <StatusBadge variant={priorityVariant(ticket.priority)}>
                {priorityLabels[ticket.priority]}
              </StatusBadge>
            ),
          },
          {
            key: "status",
            header: "Durum",
            render: (ticket) => (
              <StatusBadge variant={statusVariant(ticket.status)}>
                {serviceStatusLabels[ticket.status]}
              </StatusBadge>
            ),
          },
          ...(!clientView
            ? [
                {
                  key: "assignee",
                  header: "Sorumlu",
                  render: (ticket: ServiceTicket) => ticket.assignee,
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
                {ticket.slaHoursRemaining} saat
              </StatusBadge>
            ),
          },
          ...(!clientView
            ? [
                {
                  key: "payment",
                  header: fieldView ? "Servis izni" : "Ödeme",
                  render: (ticket: ServiceTicket) =>
                    ticket.debtBlocked ? (
                      <StatusBadge variant="danger">Blokeli</StatusBadge>
                    ) : ticket.paymentVerified ? (
                      <StatusBadge variant="success">Onaylı</StatusBadge>
                    ) : (
                      <StatusBadge variant="warning">Kontrol</StatusBadge>
                    ),
                },
              ]
            : []),
          ...(!maskFinance
            ? [
                {
                  key: "cost",
                  header: "Maliyet",
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
