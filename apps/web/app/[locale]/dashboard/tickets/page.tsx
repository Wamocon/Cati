"use client"

import { useTranslations } from "next-intl"
import { TicketCheck } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function TicketsPage() {
  const t = useTranslations("dashboardModules.tickets")
  const { loading, tickets } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const open = tickets.filter((t) => t.status !== "closed" && t.status !== "resolved").length
  const urgent = tickets.filter((t) => t.priority === "urgent" && t.status !== "closed").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <TicketCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.total")}</p>
              <AnimatedCounter value={tickets.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.open")}</p>
          <AnimatedCounter value={open} className="text-2xl font-black" />
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.urgent")}</p>
          <AnimatedCounter value={urgent} className="text-2xl font-black" />
        </Card3D>
      </div>

      <DataTable
        data={tickets}
        searchKey="title"
        columns={[
          { key: "title", header: t("columns.title"), render: (ticket) => ticket.title, sortable: true },
          { key: "property", header: t("columns.property"), render: (ticket) => ticket.propertyTitle },
          {
            key: "priority",
            header: t("columns.priority"),
            render: (ticket) => (
              <StatusBadge variant={ticket.priority === "urgent" ? "danger" : ticket.priority === "high" ? "warning" : ticket.priority === "medium" ? "info" : "neutral"}>
                {t(`priorities.${ticket.priority}`)}
              </StatusBadge>
            ),
          },
          {
            key: "status",
            header: t("columns.status"),
            render: (ticket) => (
              <StatusBadge variant={ticket.status === "resolved" || ticket.status === "closed" ? "success" : ticket.status === "in_progress" ? "info" : "warning"}>
                {t(`status.${ticket.status}`)}
              </StatusBadge>
            ),
          },
          { key: "assigned", header: t("columns.assigned"), render: (ticket) => ticket.assignedTo },
          {
            key: "photos",
            header: t("columns.photos"),
            render: (ticket) => ticket.photos,
            sortable: true,
            sortValue: (ticket) => ticket.photos,
          },
        ]}
      />
    </div>
  )
}
