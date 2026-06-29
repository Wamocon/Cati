"use client"

import { BarChart3, Brain, CalendarClock, Download, FileSpreadsheet, Gauge, Sparkles, TrendingUp } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  cashFlow,
  formatTryShort,
  getDebtAging,
  getFlatStatusDistribution,
  getReportSummary,
  reportCards,
  type ReportCardRecord,
} from "@/lib/site-management-data"

function reportVariant(status: ReportCardRecord["status"]) {
  if (status === "ready") return "success"
  if (status === "scheduled") return "info"
  return "warning"
}

function reportLabel(status: ReportCardRecord["status"]) {
  if (status === "ready") return "Hazır"
  if (status === "scheduled") return "Planlı"
  return "Kontrol gerekli"
}

export default function ReportsPage() {
  const summary = getReportSummary()
  const debtAging = getDebtAging()
  const statusDistribution = getFlatStatusDistribution()
  const latestCash = cashFlow.at(-1)?.collectedTry ?? 0
  const previousCash = cashFlow.at(-2)?.collectedTry ?? latestCash
  const cashDelta = latestCash - previousCash

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">AI Rapor Merkezi</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Yönetim kurulu, muhasebe, operasyon, güvenlik ve misafir ekipleri için otomatik raporlar ve karar özetleri.
        </p>
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Haziran kapanis sinyali</p>
            <p className="mt-1 text-2xl font-black text-foreground">{formatTryShort(latestCash)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Son aya gore {cashDelta >= 0 ? "+" : ""}{formatTryShort(cashDelta)} tahsilat farki. AI raporlari sadece oneri uretir; onay insan rolunde kalir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Rapor seti</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Gauge className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Hazır</p>
              <AnimatedCounter value={summary.ready} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Planlı</p>
              <AnimatedCounter value={summary.scheduled} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">AI kontrol</p>
              <AnimatedCounter value={summary.review} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Tahsilat trendi</h2>
            <StatusBadge variant="success">{formatTryShort(latestCash)}</StatusBadge>
          </div>
          <BarChart
            data={cashFlow.map((point) => ({ label: point.label, value: point.collectedTry, color: "var(--primary)" }))}
            formatValue={(value) => formatTryShort(value)}
            height={156}
          />
        </Card3D>

        <Card3D glow={false}>
          <h2 className="mb-1 text-sm font-bold text-card-foreground">Daire dağılımı</h2>
          <p className="mb-4 text-xs text-muted-foreground">Yönetim kuruluna uygun tek bakışlık portföy özeti.</p>
          <PieChart data={statusDistribution} size={164} />
        </Card3D>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {debtAging.slice(1).map((bucket) => (
          <Card3D key={bucket.label} glow={false}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{bucket.label} gün borç</h2>
                <p className="mt-1 text-xl font-black text-foreground">{formatTryShort(bucket.value)}</p>
                <p className="mt-1 text-xs text-muted-foreground">AI aksiyon listesinde önceliklendirilir.</p>
              </div>
            </div>
          </Card3D>
        ))}
      </div>

      <DataTable
        data={reportCards}
        searchValue={(report) => `${report.title} ${report.owner} ${report.metric} ${report.insight}`}
        columns={[
          { key: "id", header: "Rapor", sortable: true, render: (report) => report.id },
          { key: "title", header: "Başlık", render: (report) => report.title },
          { key: "cadence", header: "Periyot", sortable: true, render: (report) => report.cadence },
          { key: "owner", header: "Sahip", render: (report) => report.owner },
          {
            key: "status",
            header: "Durum",
            render: (report) => <StatusBadge variant={reportVariant(report.status)}>{reportLabel(report.status)}</StatusBadge>,
          },
          { key: "metric", header: "Metrik", render: (report) => report.metric },
          { key: "insight", header: "AI içgörü", render: (report) => report.insight },
          {
            key: "download",
            header: "Dışa aktar",
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (report) => (
              <DashboardActionButton
                actionType="report.export.requested"
                ariaLabel="Raporu dışa aktar"
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted"
                entityTable="reports"
                entityExternalId={report.id}
                title={report.title}
                metadata={{
                  cadence: report.cadence,
                  owner: report.owner,
                }}
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                <Download className="h-3.5 w-3.5" />
              </DashboardActionButton>
            ),
          },
        ]}
      />
    </div>
  )
}
