"use client"

import { useTranslations } from "next-intl"
import { Building2 } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { formatEur } from "@/lib/demo-data"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function ListingsPage() {
  const t = useTranslations("dashboardModules.listings")
  const { loading, properties } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const active = properties.filter((p) => p.status === "active").length
  const reserved = properties.filter((p) => p.status === "reserved").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.total")}</p>
              <AnimatedCounter value={properties.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.active")}</p>
          <AnimatedCounter value={active} className="text-2xl font-black" />
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.reserved")}</p>
          <AnimatedCounter value={reserved} className="text-2xl font-black" />
        </Card3D>
      </div>

      <DataTable
        data={properties}
        searchKey="title"
        columns={[
          { key: "title", header: t("columns.title"), render: (p) => p.title, sortable: true },
          {
            key: "city",
            header: t("columns.city"),
            render: (p) => `${p.city}, ${p.district}`,
            sortable: true,
            sortValue: (p) => `${p.city} ${p.district}`,
          },
          { key: "type", header: t("columns.type"), render: (p) => t(`types.${p.type}`), sortable: true },
          {
            key: "price",
            header: t("columns.price"),
            render: (p) => formatEur(p.priceEur),
            sortable: true,
            sortValue: (p) => p.priceEur,
          },
          {
            key: "status",
            header: t("columns.status"),
            render: (p) => (
              <StatusBadge
                variant={
                  p.status === "active" ? "success" : p.status === "reserved" ? "warning" : p.status === "sold" ? "accent" : "neutral"
                }
              >
                {t(`status.${p.status}`)}
              </StatusBadge>
            ),
          },
          {
            key: "eids",
            header: t("columns.eids"),
            render: (p) => (
              <StatusBadge
                variant={
                  p.eidsStatus === "authorized" ? "success" : p.eidsStatus === "expiring" ? "warning" : p.eidsStatus === "pending" ? "danger" : "neutral"
                }
              >
                {t(`eids.${p.eidsStatus}`)}
              </StatusBadge>
            ),
          },
        ]}
      />
    </div>
  )
}
