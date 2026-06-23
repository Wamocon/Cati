"use client"

import { useTranslations } from "next-intl"
import { BarChart3, Download, FileSpreadsheet } from "lucide-react"
import { useDemoData } from "@/hooks/use-demo-data"
import { Card3D } from "@/components/3d-card"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"

const reports = [
  { name: "Aylik_Komisyon_Raporu.pdf", date: "Haziran 2026" },
  { name: "Emlak_Performans_Analizi.xlsx", date: "Haziran 2026" },
  { name: "EIDS_Durum_Raporu.pdf", date: "Haziran 2026" },
  { name: "Bakim_Maliyet_Raporu.xlsx", date: "Mayıs 2026" },
]

export default function ReportsPage() {
  const t = useTranslations("dashboardModules.reports")
  const { loading, dealStages, monthlyRevenue } = useDemoData()

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>

  const stageData = dealStages.map((d) => ({ label: d.label, value: d.value, color: "var(--primary)" }))
  const revenueData = monthlyRevenue.map((d) => ({ label: d.label, value: d.value, color: "var(--accent)" }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card3D>
          <h3 className="mb-4 text-sm font-bold">{t("charts.pipeline")}</h3>
          <BarChart data={stageData} height={220} />
        </Card3D>
        <Card3D>
          <h3 className="mb-4 text-sm font-bold">{t("charts.revenue")}</h3>
          <PieChart
            data={revenueData.slice(-4).map((d, i) => ({ ...d, color: ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7"][i] }))}
            size={180}
          />
        </Card3D>
      </div>

      <Card3D>
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="font-bold text-card-foreground">{t("generatedReports")}</h3>
        </div>
        <div className="space-y-2">
          {reports.map((r, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{r.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{r.date}</span>
                <button className="rounded-lg p-1.5 hover:bg-muted">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card3D>
    </div>
  )
}
