"use client"

import { useTranslations } from "next-intl"
import { Users } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function LeadsPage() {
  const t = useTranslations("dashboardModules.leads")
  const { loading, leads } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const hot = leads.filter((l) => l.status === "hot").length
  const newLeads = leads.filter((l) => l.status === "new").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.total")}</p>
              <AnimatedCounter value={leads.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.hot")}</p>
          <AnimatedCounter value={hot} className="text-2xl font-black" />
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.new")}</p>
          <AnimatedCounter value={newLeads} className="text-2xl font-black" />
        </Card3D>
      </div>

      <DataTable
        data={leads}
        searchKey="name"
        columns={[
          { key: "name", header: t("columns.name"), render: (l) => l.name, sortable: true },
          { key: "source", header: t("columns.source"), render: (l) => t(`sources.${l.source}`), sortable: true },
          {
            key: "status",
            header: t("columns.status"),
            render: (l) => (
              <StatusBadge
                variant={l.status === "hot" ? "danger" : l.status === "warm" ? "warning" : l.status === "converted" ? "success" : "neutral"}
              >
                {t(`status.${l.status}`)}
              </StatusBadge>
            ),
          },
          {
            key: "budget",
            header: t("columns.budget"),
            render: (l) => `${l.budgetEur.toLocaleString("tr-TR")} €`,
            sortable: true,
            sortValue: (l) => l.budgetEur,
          },
          { key: "interest", header: t("columns.interest"), render: (l) => l.interest },
          { key: "score", header: t("columns.score"), render: (l) => <span className="font-semibold">{l.score}</span>, sortable: true },
          { key: "agent", header: t("columns.agent"), render: (l) => l.agent },
        ]}
      />
    </div>
  )
}
