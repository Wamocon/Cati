"use client"

import { useState } from "react"
import {
  CheckCircle2,
  ChevronDown,
  Database,
  FileWarning,
  PackageOpen,
  UploadCloud,
} from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { FeatureInfo } from "@/components/feature-info"
import { Phase4LiveOperations } from "@/components/phase4-live-operations"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import { localizeDashboardTextPart } from "@/lib/operational-copy"
import {
  getImportSummary,
  importBatches,
  importFindings,
  type ImportBatch,
  type ImportFinding,
} from "@/lib/site-management-data"
import {
  interpolate,
  localizeOperationalValue,
  resolveDashboardLocale,
  unitMatrixCopy,
  type DashboardLocale,
  type UnitMatrixCopy,
} from "@/lib/unit-matrix-copy"

// Plain, friendly copy for the import affordance. Kept local to this page so the
// shared unit-matrix copy (also used by the live operations panel) stays untouched.
const importFlowCopy: Record<
  DashboardLocale,
  {
    startCta: string
    panelTitle: string
    panelIntro: string
    step1: string
    step2: string
    step3: string
    panelNote: string
    emptyTitle: string
    emptyBody: string
    showDetail: string
    hideDetail: string
    preparedBy: string
    checkedOn: string
    recommended: string
    noFindings: string
  }
> = {
  en: {
    startCta: "Start an import",
    panelTitle: "Start an import",
    panelIntro: "Here is how new units reach the matrix above.",
    step1: "Prepare your unit list as an Excel file or price list.",
    step2: "Every row is checked for errors and warnings before anything goes live.",
    step3: "Once the check passes, a manager approves it and the units appear above.",
    panelNote:
      "Imports are set up together with the operations team. Share your file with your operations contact to begin.",
    emptyTitle: "No units imported yet",
    emptyBody: "Start your first import to fill the unit matrix with your own data.",
    showDetail: "Show details",
    hideDetail: "Hide details",
    preparedBy: "Prepared by",
    checkedOn: "Checked on",
    recommended: "Recommended next step",
    noFindings: "No data issues found yet.",
  },
  tr: {
    startCta: "İçe aktarmayı başlat",
    panelTitle: "İçe aktarmayı başlat",
    panelIntro: "Yeni daireler yukarıdaki matrise şöyle ulaşır.",
    step1: "Daire listenizi Excel dosyası veya fiyat listesi olarak hazırlayın.",
    step2: "Her satır, yayına alınmadan önce hata ve uyarılar için kontrol edilir.",
    step3: "Kontrol geçtikten sonra bir yönetici onaylar ve daireler yukarıda görünür.",
    panelNote:
      "İçe aktarma işlemleri operasyon ekibiyle birlikte kurulur. Başlamak için dosyanızı operasyon sorumlunuzla paylaşın.",
    emptyTitle: "Henüz daire içe aktarılmadı",
    emptyBody: "İlk içe aktarmanızı başlatın ve daire matrisini kendi verinizle doldurun.",
    showDetail: "Ayrıntıları göster",
    hideDetail: "Ayrıntıları gizle",
    preparedBy: "Hazırlayan",
    checkedOn: "Kontrol tarihi",
    recommended: "Önerilen sonraki adım",
    noFindings: "Henüz veri sorunu bulunmadı.",
  },
  de: {
    startCta: "Import starten",
    panelTitle: "Import starten",
    panelIntro: "So gelangen neue Wohnungen in die Matrix oben.",
    step1: "Bereiten Sie Ihre Wohnungsliste als Excel-Datei oder Preisliste vor.",
    step2: "Jede Zeile wird auf Fehler und Warnungen geprüft, bevor etwas live geht.",
    step3: "Nach bestandener Prüfung gibt ein Manager frei und die Wohnungen erscheinen oben.",
    panelNote:
      "Importe werden gemeinsam mit dem Betriebsteam eingerichtet. Teilen Sie Ihre Datei mit Ihrer Betriebskontaktperson, um zu starten.",
    emptyTitle: "Noch keine Wohnungen importiert",
    emptyBody:
      "Starten Sie Ihren ersten Import, um die Wohnungsmatrix mit Ihren eigenen Daten zu füllen.",
    showDetail: "Details anzeigen",
    hideDetail: "Details ausblenden",
    preparedBy: "Vorbereitet von",
    checkedOn: "Geprüft am",
    recommended: "Empfohlener nächster Schritt",
    noFindings: "Noch keine Datenprobleme gefunden.",
  },
  ru: {
    startCta: "Начать импорт",
    panelTitle: "Начать импорт",
    panelIntro: "Вот как новые квартиры попадают в матрицу выше.",
    step1: "Подготовьте список квартир в виде файла Excel или прайс-листа.",
    step2: "Каждая строка проверяется на ошибки и предупреждения перед публикацией.",
    step3: "После успешной проверки менеджер подтверждает, и квартиры появляются выше.",
    panelNote:
      "Импорт настраивается вместе с операционной командой. Чтобы начать, передайте файл своему контактному лицу в операциях.",
    emptyTitle: "Квартиры ещё не импортированы",
    emptyBody: "Запустите первый импорт, чтобы заполнить матрицу квартир своими данными.",
    showDetail: "Показать детали",
    hideDetail: "Скрыть детали",
    preparedBy: "Подготовил",
    checkedOn: "Проверено",
    recommended: "Рекомендуемый следующий шаг",
    noFindings: "Проблем с данными пока не найдено.",
  },
}

function importStatusVariant(status: ImportBatch["status"]) {
  if (status === "validated" || status === "ready_to_apply") return "success"
  return "warning"
}

function importStatusLabel(status: ImportBatch["status"], copy: UnitMatrixCopy) {
  return copy.labels.importStatus[status]
}

function findingVariant(severity: ImportFinding["severity"]) {
  if (severity === "error") return "danger"
  if (severity === "warning") return "warning"
  return "info"
}

function findingLabel(severity: ImportFinding["severity"], copy: UnitMatrixCopy) {
  return copy.labels.finding[severity]
}

export default function ListingsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = unitMatrixCopy[locale]
  const flow = importFlowCopy[locale]
  const tRecord = (value: string) => localizeDashboardTextPart(value, locale)
  const portfolioDisplayName = localizeOperationalValue(clientProfile.activePortfolio, locale)
  const importSummary = getImportSummary()

  const [importPanelOpen, setImportPanelOpen] = useState(false)
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null)
  const [expandedFindingId, setExpandedFindingId] = useState<string | null>(null)

  const hasImports = importBatches.length > 0

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-foreground">{copy.page.title}</h1>
          <FeatureInfo featureKey="listings" side="bottom" />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {interpolate(copy.page.subtitle, {
            location: clientProfile.activeLocation,
            portfolio: portfolioDisplayName,
          })}
        </p>
      </div>

      <Card3D glow={false}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{copy.page.projectScope}</p>
            <h2 className="mt-2 text-xl font-black text-card-foreground">{portfolioDisplayName}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.page.projectBody}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {/* Info-only project pillars: no navigation target, so intentionally
                non-interactive (no audit write, no misleading loading state). */}
            {copy.pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <pillar.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{pillar.title}</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{pillar.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </Card3D>

      {/* The live block/floor/unit matrix, search and table are the single source
          of unit truth for the team. */}
      <Phase4LiveOperations />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.centerTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.import.centerDescription}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasImports ? (
                <StatusBadge variant={importSummary.rejectedRows === 0 ? "success" : "danger"}>
                  %{importSummary.readinessRate} {copy.import.ready}
                </StatusBadge>
              ) : null}
              <button
                type="button"
                aria-expanded={importPanelOpen}
                onClick={() => setImportPanelOpen((current) => !current)}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <UploadCloud className="h-4 w-4" />
                {flow.startCta}
              </button>
            </div>
          </div>

          {importPanelOpen ? (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/4 p-4">
              <h3 className="text-sm font-black text-foreground">{flow.panelTitle}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{flow.panelIntro}</p>
              <ol className="mt-3 space-y-2">
                {[flow.step1, flow.step2, flow.step3].map((step, index) => (
                  <li key={step} className="flex items-start gap-2 text-sm text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-black text-primary">
                      {index + 1}
                    </span>
                    <span className="leading-5">{step}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 rounded-lg bg-muted/50 p-3 text-xs leading-5 text-muted-foreground">
                {flow.panelNote}
              </p>
            </div>
          ) : null}

          {hasImports ? (
            <>
              {/* Summary figures are read-only counters, not actions. */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  [copy.import.totalRows, importSummary.totalRows],
                  [copy.import.valid, importSummary.validRows],
                  [copy.import.warning, importSummary.warningRows],
                  [copy.import.rejected, importSummary.rejectedRows],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl border border-border bg-muted/30 p-3"
                  >
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                    <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {importBatches.map((batch) => {
                  const batchSourceLabel = tRecord(batch.source)
                  const expanded = expandedBatchId === batch.id

                  return (
                    <div
                      key={batch.id}
                      className="rounded-xl border border-border bg-background/60 p-4"
                    >
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() =>
                          setExpandedBatchId((current) => (current === batch.id ? null : batch.id))
                        }
                        className="flex w-full items-start justify-between gap-3 rounded-lg text-left transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-muted-foreground">{batch.id}</p>
                          <h3 className="mt-1 text-sm font-black text-foreground">{batchSourceLabel}</h3>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <StatusBadge variant={importStatusVariant(batch.status)}>{importStatusLabel(batch.status, copy)}</StatusBadge>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-muted-foreground transition",
                              expanded && "rotate-180"
                            )}
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {interpolate(copy.import.rowsSummary, {
                          rejected: batch.rejectedRows,
                          total: batch.totalRows,
                          valid: batch.validRows,
                          warning: batch.warningRows,
                        })}
                      </p>
                      {expanded ? (
                        <dl className="mt-3 grid gap-2 border-t border-border/60 pt-3 text-xs sm:grid-cols-2">
                          <div>
                            <dt className="font-semibold uppercase text-muted-foreground">{flow.preparedBy}</dt>
                            <dd className="mt-0.5 font-semibold text-foreground">{tRecord(batch.importedBy)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold uppercase text-muted-foreground">{flow.checkedOn}</dt>
                            <dd className="mt-0.5 font-semibold text-foreground">{batch.checkedAt}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold uppercase text-muted-foreground">{copy.import.valid}</dt>
                            <dd className="mt-0.5 font-semibold text-foreground">{batch.validRows}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold uppercase text-muted-foreground">{copy.import.warning}</dt>
                            <dd className="mt-0.5 font-semibold text-foreground">{batch.warningRows}</dd>
                          </div>
                        </dl>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <PackageOpen className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-black text-foreground">{flow.emptyTitle}</h3>
              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">{flow.emptyBody}</p>
              <button
                type="button"
                aria-expanded={importPanelOpen}
                onClick={() => setImportPanelOpen(true)}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <UploadCloud className="h-4 w-4" />
                {flow.startCta}
              </button>
            </div>
          )}
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.modelTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.import.modelDescription}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.qualityGate}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.import.qualityDescription}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.findingSummary}</h2>
                <div className="mt-2 space-y-2">
                  {importFindings.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{flow.noFindings}</p>
                  ) : (
                    importFindings.slice(0, 3).map((finding) => {
                      const area = tRecord(finding.area)
                      const expanded = expandedFindingId === finding.id

                      return (
                        <div key={finding.id} className="rounded-lg bg-muted/40 p-2">
                          <button
                            type="button"
                            aria-expanded={expanded}
                            onClick={() =>
                              setExpandedFindingId((current) =>
                                current === finding.id ? null : finding.id
                              )
                            }
                            className="flex w-full items-center justify-between gap-2 text-left transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <span className="min-w-0 text-xs font-semibold text-foreground">{area}</span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              <StatusBadge variant={findingVariant(finding.severity)}>{findingLabel(finding.severity, copy)}</StatusBadge>
                              <ChevronDown
                                className={cn(
                                  "h-3.5 w-3.5 text-muted-foreground transition",
                                  expanded && "rotate-180"
                                )}
                                aria-hidden="true"
                              />
                            </span>
                          </button>
                          <p className="mt-1 text-xs text-muted-foreground">{finding.affectedRows} {copy.common.rows}</p>
                          {expanded ? (
                            <div className="mt-2 space-y-2 border-t border-border/60 pt-2">
                              <p className="text-xs leading-5 text-muted-foreground">{tRecord(finding.message)}</p>
                              <div>
                                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                                  {flow.recommended}
                                </p>
                                <p className="mt-0.5 text-xs leading-5 text-foreground">{tRecord(finding.recommendedAction)}</p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </div>
    </div>
  )
}
