"use client"

import { useTranslations } from "next-intl"
import { CircleDollarSign } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { DataTable } from "@/components/data-table"
import { Card3D } from "@/components/3d-card"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"

export default function FinancePage() {
  const t = useTranslations("dashboardModules.finance")
  const { loading, financialHistory, deals } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const totalRevenue = financialHistory.reduce((sum, f) => sum + f.revenueEur, 0)
  const totalCommission = financialHistory.reduce((sum, f) => sum + f.commissionTry, 0)
  const closedDeals = deals.filter((d) => d.stage === "closed_won").length

  const chartData = financialHistory.map((f) => ({
    label: f.month,
    value: f.revenueEur,
    color: "var(--primary)",
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card3D>
          <div className="flex items-center gap-3">
            <CircleDollarSign className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">{t("stats.revenue")}</p>
              <p className="text-2xl font-black">{(totalRevenue / 1_000_000).toFixed(2)}M €</p>
            </div>
          </div>
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.commission")}</p>
          <p className="text-2xl font-black">{(totalCommission / 1_000_000).toFixed(2)}M ₺</p>
        </Card3D>
        <Card3D>
          <p className="text-xs text-muted-foreground uppercase">{t("stats.closedDeals")}</p>
          <AnimatedCounter value={closedDeals} className="text-2xl font-black" />
        </Card3D>
      </div>

      <Card3D>
        <h3 className="mb-4 text-sm font-bold text-card-foreground">{t("chartTitle")}</h3>
        <BarChart data={chartData} formatValue={(v) => `${(v / 1000).toFixed(0)}k €`} height={240} />
      </Card3D>

      <DataTable
        data={financialHistory}
        searchKey="month"
        columns={[
          { key: "month", header: t("columns.month"), render: (f) => f.month, sortable: true },
          {
            key: "revenue",
            header: t("columns.revenue"),
            render: (f) => `${f.revenueEur.toLocaleString("tr-TR")} €`,
            sortable: true,
            sortValue: (f) => f.revenueEur,
          },
          {
            key: "commission",
            header: t("columns.commission"),
            render: (f) => `${f.commissionTry.toLocaleString("tr-TR")} ₺`,
            sortable: true,
            sortValue: (f) => f.commissionTry,
          },
          {
            key: "expenses",
            header: t("columns.expenses"),
            render: (f) => `${f.expensesTry.toLocaleString("tr-TR")} ₺`,
            sortable: true,
            sortValue: (f) => f.expensesTry,
          },
          {
            key: "deals",
            header: t("columns.deals"),
            render: (f) => f.dealsClosed,
            sortable: true,
            sortValue: (f) => f.dealsClosed,
          },
        ]}
      />
    </div>
  )
}
