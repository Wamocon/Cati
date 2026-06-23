"use client"

import { useTranslations } from "next-intl"
import { FileCheck, ShieldAlert } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function CompliancePage() {
  const t = useTranslations("dashboardModules.compliance")
  const { loading, eidsRecords } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const pending = eidsRecords.filter((e) => e.status === "pending").length
  const expiring = eidsRecords.filter((e) => e.status === "expiring").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.tracked")}</p>
              <AnimatedCounter value={eidsRecords.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.pending")}</p>
              <AnimatedCounter value={pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-500" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.expiring")}</p>
              <AnimatedCounter value={expiring} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <DataTable
        data={eidsRecords}
        searchKey="propertyTitle"
        columns={[
          {
            key: "property",
            header: t("columns.property"),
            render: (e) => e.propertyTitle,
            sortable: true,
            sortValue: (e) => e.propertyTitle,
          },
          { key: "owner", header: t("columns.owner"), render: (e) => e.owner, sortable: true },
          {
            key: "status",
            header: t("columns.status"),
            render: (e) => (
              <StatusBadge
                variant={e.status === "authorized" ? "success" : e.status === "expiring" ? "danger" : e.status === "pending" ? "warning" : "neutral"}
              >
                {t(`status.${e.status}`)}
              </StatusBadge>
            ),
          },
          {
            key: "expires",
            header: t("columns.expires"),
            render: (e) => (e.expiresAt ? new Date(e.expiresAt).toLocaleDateString("tr-TR") : "—"),
            sortable: true,
            sortValue: (e) => (e.expiresAt ? new Date(e.expiresAt) : null),
          },
          {
            key: "authorized",
            header: t("columns.authorized"),
            render: (e) => (e.authorizedAt ? new Date(e.authorizedAt).toLocaleDateString("tr-TR") : "—"),
          },
        ]}
      />
    </div>
  )
}
