"use client"

import { useLocale } from "next-intl"
import { ArrowUpRight, BarChart3, Brain, CalendarClock, Camera, FileSpreadsheet, Gauge, Languages, ShieldCheck, Sparkles, TrendingUp } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { PieChart } from "@/components/charts/pie-chart"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DashboardSection } from "@/components/dashboard-section"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { Link } from "@/app/navigation"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import {
  aiImageWorkflows,
  aiPremiumRecommendations,
  cashFlow,
  formatTryShort,
  getAiPremiumSummary,
  getDebtAging,
  getFlatStatusDistribution,
  getReportSummary,
  reportCards,
  type AiImageWorkflowRecord,
  type AiRecommendationRecord,
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

function aiVariant(status: AiRecommendationRecord["status"]) {
  if (status === "ready") return "success"
  if (status === "provider_ready") return "info"
  return "warning"
}

function aiLabel(status: AiRecommendationRecord["status"]) {
  if (status === "ready") return "Hazır"
  if (status === "provider_ready") return "Sağlayıcı hazır"
  return "İnsan onayı"
}

function imageVariant(status: AiImageWorkflowRecord["status"]) {
  if (status === "mock_ready") return "success"
  if (status === "provider_ready") return "info"
  return "warning"
}

function imageLabel(status: AiImageWorkflowRecord["status"]) {
  if (status === "mock_ready") return "Demo hazır"
  if (status === "provider_ready") return "Sağlayıcı hazır"
  return "İnsan onayı"
}

export default function ReportsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const summary = getReportSummary()
  const aiSummary = getAiPremiumSummary()
  const debtAging = getDebtAging()
  const statusDistribution = getFlatStatusDistribution()
  const latestCash = cashFlow.at(-1)?.collectedTry ?? 0
  const previousCash = cashFlow.at(-2)?.collectedTry ?? latestCash
  const cashDelta = latestCash - previousCash

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("AI Rapor Merkezi")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {t("Yönetim kurulu, muhasebe, operasyon, güvenlik ve misafir ekipleri için otomatik raporlar ve karar özetleri.")}
        </p>
      </div>

      <div className="rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{t("Haziran kapanis sinyali")}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{formatTryShort(latestCash)}</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("Son aya göre")} {cashDelta >= 0 ? "+" : ""}{formatTryShort(cashDelta)} {t("tahsilat farkı")}. {t("AI raporları sadece öneri üretir; onay insan rolünde kalır.")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Rapor seti")}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Gauge className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Hazır")}</p>
              <AnimatedCounter value={summary.ready} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CalendarClock className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Planlı")}</p>
              <AnimatedCounter value={summary.scheduled} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Brain className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("AI kontrol")}</p>
              <AnimatedCounter value={summary.review} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Faz 14 AI komuta katmanı</h2>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              Aynı dilde asistan, yapılandırılmış öneriler, kaynak bağlantılı özetler ve görsel/kanıt akışları demo için hazırdır. AI finans, iade, erişim veya rol aksiyonlarını doğrudan çalıştırmaz.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">Hazır {aiSummary.ready}</StatusBadge>
            <StatusBadge variant="info">4 dil {aiSummary.multilingual}</StatusBadge>
            <StatusBadge variant="warning">İnsan onayı {aiSummary.humanReview}</StatusBadge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {aiPremiumRecommendations.slice(0, 4).map((item) => (
            <div key={item.id} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{item.mode}</p>
                  <h3 className="mt-1 text-sm font-black text-foreground">{item.title}</h3>
                </div>
                <Brain className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant={aiVariant(item.status)}>{aiLabel(item.status)}</StatusBadge>
                <StatusBadge variant="neutral">{item.confidence}%</StatusBadge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{item.recommendation}</p>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Tahsilat trendi</h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant="success">{formatTryShort(latestCash)}</StatusBadge>
              <a
                href="#report-register"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
              >
                Raporları aç
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <BarChart
            data={cashFlow.map((point) => ({ label: point.label, value: point.collectedTry, color: "var(--primary)" }))}
            ariaLabel="Nakit akışı tahsilat grafiği"
            formatValue={(value) => formatTryShort(value)}
            height={156}
            totalLabel="Toplam"
          />
        </Card3D>

        <Card3D glow={false}>
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Daire dağılımı</h2>
              <p className="mt-1 text-xs text-muted-foreground">Yönetim kuruluna uygun tek bakışlık portföy özeti.</p>
            </div>
            <Link
              href="/dashboard/listings"
              className="inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
            >
              Matris
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <PieChart data={statusDistribution} size={164} ariaLabel="Daire durum dağılımı" totalLabel="toplam" />
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

      <div id="report-register" className="scroll-mt-24">
        <DashboardSection
          title="Rapor register"
          description="Board, finance, operation, access and guest reports stay searchable here; export remains a logged user action."
          icon={FileSpreadsheet}
          info="Use the table options menu to control rows per page, hide noisy columns, reset filters or export the current register as CSV."
          actionHref="/dashboard/reports#ai-automation-register"
          actionLabel="AI register"
          badge={<StatusBadge variant="neutral">{reportCards.length} records</StatusBadge>}
        >
      <DataTable
        data={reportCards}
        pageSize={5}
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
              <DashboardActionMenu
                compact
                label="Rapor aksiyonlari"
                ariaLabel={`${report.id} rapor aksiyonlari`}
                items={[
                  {
                    key: "export",
                    label: "Raporu disa aktar",
                    description: `${report.cadence} / ${report.owner}`,
                    icon: <FileSpreadsheet />,
                    actionType: "report.export.requested",
                    ariaLabel: "Raporu disa aktar",
                    entityTable: "reports",
                    entityExternalId: report.id,
                    title: report.title,
                    metadata: {
                      cadence: report.cadence,
                      owner: report.owner,
                    },
                  },
                ]}
              />
            ),
          },
        ]}
      />
        </DashboardSection>
      </div>

      <div id="ai-automation-register" className="scroll-mt-24">
        <DashboardSection
          title="AI automation register"
          description="Every automation keeps the audience, supported languages and required human approval visible before preparation."
          icon={Brain}
          info="This register is intentionally paginated: AI features should be reviewed by owner, risk and language support instead of scanned as one long wall of rows."
          actionHref="/dashboard/reports#report-register"
          actionLabel="Report register"
          badge={<StatusBadge variant="info">{aiSummary.multilingual} multilingual</StatusBadge>}
        >
      <DataTable
        data={aiPremiumRecommendations}
        pageSize={5}
        searchValue={(item) => `${item.id} ${item.title} ${item.mode} ${item.recommendation} ${item.humanApproval}`}
        columns={[
          { key: "id", header: "AI", sortable: true, render: (item) => item.id },
          { key: "title", header: "Feature", render: (item) => item.title },
          { key: "audience", header: "Audience", sortable: true, render: (item) => item.audience },
          { key: "status", header: "Status", render: (item) => <StatusBadge variant={aiVariant(item.status)}>{aiLabel(item.status)}</StatusBadge> },
          {
            key: "language",
            header: "Language",
            render: (item) => (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                <Languages className="h-3.5 w-3.5 text-primary" />
                {item.languageSupport.join(", ")}
              </span>
            ),
          },
          { key: "approval", header: "Human approval", render: (item) => item.humanApproval },
          {
            key: "prepare",
            header: "Prepare",
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (item) => (
              <DashboardActionMenu
                compact
                label="AI aksiyonlari"
                ariaLabel={`${item.id} AI aksiyonlari`}
                items={[
                  {
                    key: "prepare",
                    label: "AI oneriyi hazirla",
                    description: item.humanApproval,
                    icon: <Sparkles />,
                    actionType: "ai.recommendation.prepare",
                    ariaLabel: "AI oneriyi hazirla",
                    entityTable: "ai_recommendations",
                    entityExternalId: item.id,
                    title: item.title,
                    metadata: { mode: item.mode, status: item.status },
                  },
                ]}
              />
            ),
          },
        ]}
      />
        </DashboardSection>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {aiImageWorkflows.map((item) => (
          <Card3D key={item.id} glow={false}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {item.source === "camera_event" ? <ShieldCheck className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{item.id} - {item.source}</p>
                  <h2 className="mt-1 text-sm font-black text-card-foreground">{item.title}</h2>
                </div>
              </div>
              <StatusBadge variant={imageVariant(item.status)}>{imageLabel(item.status)}</StatusBadge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{item.aiUse}</p>
            <p className="mt-2 text-xs font-semibold text-foreground">{item.guardrail}</p>
          </Card3D>
        ))}
      </div>
    </div>
  )
}
