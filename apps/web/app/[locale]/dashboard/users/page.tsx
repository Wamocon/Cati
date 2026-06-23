"use client"

import { useTranslations } from "next-intl"
import { UserCog } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"

export default function UsersPage() {
  const t = useTranslations("dashboardModules.users")
  const { loading, users } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card3D>
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground uppercase">{t("stats.total")}</p>
            <AnimatedCounter value={users.length} className="text-2xl font-black" />
          </div>
        </div>
      </Card3D>

      <DataTable
        data={users}
        searchKey="name"
        columns={[
          { key: "name", header: t("columns.name"), render: (u) => u.name, sortable: true },
          {
            key: "role",
            header: t("columns.role"),
            render: (u) => <StatusBadge variant="accent">{t(`roles.${u.role}`)}</StatusBadge>,
          },
          { key: "office", header: t("columns.office"), render: (u) => u.office },
          { key: "phone", header: t("columns.phone"), render: (u) => u.phone },
          {
            key: "deals",
            header: t("columns.deals"),
            render: (u) => u.activeDeals,
            sortable: true,
            sortValue: (u) => u.activeDeals,
          },
        ]}
      />
    </div>
  )
}
