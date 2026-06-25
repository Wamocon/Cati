"use client"

import { AlertTriangle, Camera, Clock3, CreditCard, ShieldAlert, TicketCheck, Wrench } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  formatTry,
  priorityLabels,
  serviceStatusLabels,
  serviceTickets,
  type ServicePriority,
  type ServiceStatus,
} from "@/lib/site-management-data"
import { clientProfile } from "@/lib/client-context"

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
  const open = serviceTickets.filter((ticket) => ticket.status !== "closed" && ticket.status !== "resolved").length
  const overdue = serviceTickets.filter((ticket) => ticket.slaHoursRemaining < 0).length
  const blocked = serviceTickets.filter((ticket) => ticket.debtBlocked).length
  const media = serviceTickets.reduce((sum, ticket) => sum + ticket.mediaCount, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Servis Talepleri</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {clientProfile.pilotProject} ve diğer Ataberk portföyleri için teknik servis, borç kontrolü, ödeme
          doğrulama, fotoğraf/video kanıtı ve SLA takibi aynı iş kuyruğunda yönetilir.
        </p>
      </div>

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
              <p className="text-xs font-semibold uppercase text-muted-foreground">Borç blokeli</p>
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
            <h2 className="text-sm font-bold text-card-foreground">Öncelikli iş kuyruğu</h2>
            <StatusBadge variant="danger">{overdue} gecikmiş</StatusBadge>
          </div>
          <div className="space-y-3">
            {serviceTickets
              .filter((ticket) => ticket.priority === "urgent" || ticket.slaHoursRemaining < 0 || ticket.debtBlocked)
              .slice(0, 5)
              .map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={priorityVariant(ticket.priority)}>{priorityLabels[ticket.priority]}</StatusBadge>
                        <StatusBadge variant={statusVariant(ticket.status)}>{serviceStatusLabels[ticket.status]}</StatusBadge>
                        {ticket.debtBlocked && <StatusBadge variant="danger">Finans blokeli</StatusBadge>}
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground">{ticket.title}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {ticket.flatNumber} - {ticket.category} - {ticket.assignee}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-foreground">{formatTry(ticket.estimatedCostTry)}</p>
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
                <h2 className="text-sm font-bold text-card-foreground">Servis güvenlik kuralı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Borç blokeli dairelerde teknisyen sahaya çıkmadan önce muhasebe onayı ve ödeme doğrulaması gerekir.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Wrench className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Saha iş akışı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Talep, fotoğraf, maliyet, onay, atama ve kapanış kanıtı tek kayıtta tutulur.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">AI önerisi</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  SLA, tahmini maliyet ve borç durumu birlikte skorlanarak günlük teknik rota oluşturulur.
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={serviceTickets}
        searchValue={(ticket) => `${ticket.id} ${ticket.flatNumber} ${ticket.title} ${ticket.assignee} ${ticket.requester}`}
        columns={[
          { key: "id", header: "Talep", sortable: true, render: (ticket) => ticket.id },
          { key: "flat", header: "Daire", sortable: true, render: (ticket) => ticket.flatNumber },
          { key: "title", header: "Konu", render: (ticket) => ticket.title },
          {
            key: "priority",
            header: "Öncelik",
            render: (ticket) => <StatusBadge variant={priorityVariant(ticket.priority)}>{priorityLabels[ticket.priority]}</StatusBadge>,
          },
          {
            key: "status",
            header: "Durum",
            render: (ticket) => <StatusBadge variant={statusVariant(ticket.status)}>{serviceStatusLabels[ticket.status]}</StatusBadge>,
          },
          { key: "assignee", header: "Sorumlu", render: (ticket) => ticket.assignee },
          {
            key: "sla",
            header: "SLA",
            sortable: true,
            sortValue: (ticket) => ticket.slaHoursRemaining,
            render: (ticket) => (
              <StatusBadge variant={ticket.slaHoursRemaining < 0 ? "danger" : "info"}>{ticket.slaHoursRemaining} saat</StatusBadge>
            ),
          },
          {
            key: "payment",
            header: "Ödeme",
            render: (ticket) =>
              ticket.debtBlocked ? (
                <StatusBadge variant="danger">Blokeli</StatusBadge>
              ) : ticket.paymentVerified ? (
                <StatusBadge variant="success">Onaylı</StatusBadge>
              ) : (
                <StatusBadge variant="warning">Kontrol</StatusBadge>
              ),
          },
          {
            key: "cost",
            header: "Maliyet",
            sortable: true,
            sortValue: (ticket) => ticket.estimatedCostTry,
            render: (ticket) => formatTry(ticket.estimatedCostTry),
          },
        ]}
      />
    </div>
  )
}
