"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Building2,
  CheckCircle2,
  Database,
  DoorOpen,
  Eye,
  FileWarning,
  Home,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  UploadCloud,
  WalletCards,
  Wrench,
} from "lucide-react"
import { useLocale } from "next-intl"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { DataTable } from "@/components/data-table"
import { Phase4LiveOperations } from "@/components/phase4-live-operations"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import { clientProfile } from "@/lib/client-context"
import {
  flats,
  formatEur,
  formatTry,
  getBlockOverview,
  getImportSummary,
  getSummary,
  importBatches,
  importFindings,
  type AccessStatus,
  type FlatRecord,
  type FlatStatus,
  type ImportBatch,
  type ImportFinding,
  type PaymentStatus,
} from "@/lib/site-management-data"
import type { NewLevelPremiumSaleStatus } from "@/lib/new-level-premium-data"
import {
  interpolate,
  localizeOperationalValue,
  resolveDashboardLocale,
  unitMatrixCopy,
  type UnitMatrixCopy,
} from "@/lib/unit-matrix-copy"

type UnitSignalFilter = "all" | "occupied" | "vacant" | "restricted" | "debt" | "service"

function flatVariant(status: FlatStatus) {
  if (status === "occupied") return "success"
  if (status === "reserved") return "accent"
  if (status === "vacant") return "info"
  if (status === "maintenance") return "warning"
  return "danger"
}

function accessVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "pending") return "warning"
  if (status === "restricted") return "danger"
  return "neutral"
}

function paymentVariant(status: PaymentStatus) {
  if (status === "clear") return "success"
  if (status === "minor_debt") return "warning"
  if (status === "overdue") return "danger"
  return "danger"
}

function saleVariant(status: NewLevelPremiumSaleStatus) {
  if (status === "available") return "success"
  if (status === "sold") return "neutral"
  if (status === "source_missing") return "warning"
  return "info"
}

function saleLabel(status: NewLevelPremiumSaleStatus, copy: UnitMatrixCopy) {
  return copy.labels.sale[status]
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

function matchesSignalFilter(flat: FlatRecord, filter: UnitSignalFilter) {
  if (filter === "all") return true
  if (filter === "occupied") return flat.status === "occupied" || flat.status === "reserved"
  if (filter === "vacant") return flat.status === "vacant"
  if (filter === "restricted") return flat.accessStatus === "restricted" || flat.status === "blocked"
  if (filter === "debt") return flat.balanceTry > 0
  return flat.serviceOpen > 0
}

function UnitActionButton({
  actionType,
  children,
  className,
  flat,
  successLabel,
  title,
}: {
  actionType: string
  children: ReactNode
  className?: string
  flat: FlatRecord
  successLabel?: string
  title: string
}) {
  return (
    <DashboardActionButton
      actionType={actionType}
      ariaLabel={title}
      className={className}
      entityExternalId={flat.id}
      entityTable="units"
      metadata={{
        accessStatus: flat.accessStatus,
        balanceTry: flat.balanceTry,
        block: flat.block,
        flatNumber: flat.number,
        paymentStatus: flat.paymentStatus,
        serviceOpen: flat.serviceOpen,
      }}
      successLabel={successLabel}
      title={title}
    >
      {children}
    </DashboardActionButton>
  )
}

export default function ListingsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = unitMatrixCopy[locale]
  const summary = getSummary()
  const importSummary = getImportSummary()
  const blocks = getBlockOverview()
  const [selectedBlock, setSelectedBlock] = useState("all")
  const [selectedSignal, setSelectedSignal] = useState<UnitSignalFilter>("all")
  const [selectedFlatId, setSelectedFlatId] = useState(flats[0]?.id ?? "")

  const filteredFlats = useMemo(
    () =>
      flats.filter((flat) => {
        if (selectedBlock !== "all" && flat.block !== selectedBlock) return false
        return matchesSignalFilter(flat, selectedSignal)
      }),
    [selectedBlock, selectedSignal]
  )

  const matrixPreview = filteredFlats.slice(0, 192)
  const selectedFlat = filteredFlats.find((flat) => flat.id === selectedFlatId) ?? filteredFlats[0] ?? null
  const filtersActive = selectedBlock !== "all" || selectedSignal !== "all"

  const signalCards = [
    {
      key: "all",
      label: copy.metrics.totalLabel,
      value: summary.totalFlats,
      helper: copy.metrics.totalHelper,
      icon: Building2,
      tone: "text-primary",
    },
    {
      key: "occupied",
      label: copy.metrics.occupancyLabel,
      value: `%${summary.occupancyRate}`,
      helper: copy.metrics.occupancyHelper,
      icon: Home,
      tone: "text-teal-600",
    },
    {
      key: "restricted",
      label: copy.metrics.restrictedLabel,
      value: summary.restrictedAccess,
      helper: copy.metrics.restrictedHelper,
      icon: LockKeyhole,
      tone: "text-rose-600",
    },
    {
      key: "debt",
      label: copy.metrics.debtLabel,
      value: formatTry(summary.totalDebtTry),
      helper: copy.metrics.debtHelper,
      icon: WalletCards,
      tone: "text-amber-600",
    },
  ] satisfies Array<{
    helper: string
    icon: typeof Building2
    key: UnitSignalFilter
    label: string
    tone: string
    value: number | string
  }>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{copy.page.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {interpolate(copy.page.subtitle, {
            location: clientProfile.activeLocation,
            portfolio: clientProfile.activePortfolio,
          })}
        </p>
      </div>

      <Card3D glow={false}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">{copy.page.projectScope}</p>
            <h2 className="mt-2 text-xl font-black text-card-foreground">{clientProfile.activePortfolio}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {copy.page.projectBody}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {copy.pillars.map((pillar) => (
              <DashboardActionButton
                key={pillar.title}
                actionType="portfolio.pillar.view"
                ariaLabel={pillar.title}
                className="rounded-xl border border-border/70 bg-muted/40 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                entityTable="units"
                entityExternalId={pillar.title}
                metadata={{ detail: pillar.detail, portfolio: clientProfile.activePortfolio }}
                successLabel={copy.actions.detailOpen}
                title={pillar.title}
              >
                <div className="flex items-center gap-2">
                  <pillar.icon className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">{pillar.title}</h3>
                </div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{pillar.detail}</p>
              </DashboardActionButton>
            ))}
          </div>
        </div>
      </Card3D>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {signalCards.map((metric) => {
          const Icon = metric.icon
          const active = selectedSignal === metric.key

          return (
            <Card3D
              key={metric.key}
              glow={false}
              innerClassName={cn(active && "ring-2 ring-primary/45")}
            >
              <button
                type="button"
                aria-pressed={active}
                className="flex h-full min-h-20 w-full items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setSelectedSignal(metric.key)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className={cn("h-8 w-8 shrink-0", metric.tone)} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{metric.label}</p>
                    {typeof metric.value === "number" ? (
                      <AnimatedCounter value={metric.value} className="text-2xl font-black" />
                    ) : (
                      <p className="text-2xl font-black">{metric.value}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">{metric.helper}</p>
                  </div>
                </div>
                <Eye className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
              </button>
            </Card3D>
          )
        })}
      </div>

      <Phase4LiveOperations />

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">{copy.summary.blockSummaryTitle}</h2>
            <p className="text-xs text-muted-foreground">{copy.summary.blockSummaryDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="accent">{blocks.length} {copy.summary.blocks}</StatusBadge>
            <button
              type="button"
              disabled={!filtersActive}
              onClick={() => {
                setSelectedBlock("all")
                setSelectedSignal("all")
              }}
              className="inline-flex min-h-8 items-center gap-2 rounded-lg border border-border px-3 py-1 text-xs font-bold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {copy.filters.reset}
            </button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {blocks.map((block) => {
            const active = selectedBlock === block.block

            return (
            <button
              key={block.block}
              type="button"
              aria-pressed={active}
              className={cn(
                "rounded-xl border border-border bg-muted/30 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active && "border-primary/60 bg-primary/10"
              )}
              onClick={() => setSelectedBlock((current) => (current === block.block ? "all" : block.block))}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">{copy.common.block} {block.block}</p>
                <span className="text-xs font-semibold text-muted-foreground">{block.total} {copy.summary.units}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge variant={block.priceSourceStatus === "parsed" ? "success" : "warning"}>
                  {block.priceSourceStatus === "parsed" ? copy.summary.priceConnected : copy.summary.priceMissing}
                </StatusBadge>
                {block.minBuyNowEur ? (
                  <StatusBadge variant="info">{formatEur(block.minBuyNowEur)}+</StatusBadge>
                ) : null}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.round((block.occupied / block.total) * 100)}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>{copy.summary.availableForSale} {block.availableForSale}</span>
                <span>{copy.summary.sold} {block.sold}</span>
                <span>{copy.summary.missing} {block.sourceMissing}</span>
                <span>{copy.labels.flat.blocked} {block.blocked}</span>
              </div>
            </button>
            )
          })}
        </div>
      </Card3D>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">{copy.matrix.title}</h2>
            <p className="text-xs text-muted-foreground">
              {interpolate(copy.matrix.description, {
                count: filteredFlats.length,
                preview: matrixPreview.length,
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(copy.labels.flat).map(([status, label]) => (
              <StatusBadge key={status} variant={flatVariant(status as FlatStatus)}>
                {label}
              </StatusBadge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-12 lg:grid-cols-16 xl:grid-cols-24">
          {matrixPreview.map((flat) => {
            const active = selectedFlat?.id === flat.id

            return (
              <button
                key={flat.id}
                type="button"
                aria-label={`${flat.number} ${copy.actions.detailOpen}`}
                aria-pressed={active}
                className={cn(
                  "flex aspect-square min-h-8 items-center justify-center rounded-md border text-[10px] font-bold transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  flat.status === "occupied" && "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
                  flat.status === "vacant" && "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
                  flat.status === "reserved" && "border-primary/20 bg-primary/10 text-primary",
                  flat.status === "maintenance" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                  flat.status === "blocked" && "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300",
                  active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                title={`${flat.number} - ${copy.labels.flat[flat.status]}`}
                onClick={() => setSelectedFlatId(flat.id)}
              >
                {flat.number.split("-")[1]}
              </button>
            )
          })}
        </div>
        {matrixPreview.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm font-semibold text-muted-foreground">
            {copy.matrix.empty}
          </div>
        )}
        {selectedFlat && (
          <div className="mt-5 grid gap-4 border-t border-border/70 pt-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">{copy.matrix.selected}</p>
                  <h3 className="mt-1 text-xl font-black text-foreground">{selectedFlat.number}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {interpolate(copy.selectedUnit.blockSummary, {
                      block: selectedFlat.block,
                      floor: selectedFlat.floorLabel,
                      type: selectedFlat.type,
                    })}
                    {selectedFlat.areaText ? ` · ${selectedFlat.areaText}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge variant={saleVariant(selectedFlat.saleStatus)}>{saleLabel(selectedFlat.saleStatus, copy)}</StatusBadge>
                  <StatusBadge variant={flatVariant(selectedFlat.status)}>{copy.labels.flat[selectedFlat.status]}</StatusBadge>
                  <StatusBadge variant={accessVariant(selectedFlat.accessStatus)}>
                    {copy.labels.access[selectedFlat.accessStatus]}
                  </StatusBadge>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg bg-background/70 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{copy.selectedUnit.listPrice}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedFlat.buyNowEur ? formatEur(selectedFlat.buyNowEur) : copy.selectedUnit.sourcePending}
                  </p>
                </div>
                <div className="rounded-lg bg-background/70 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{copy.selectedUnit.priceSource}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {selectedFlat.priceSource ? selectedFlat.priceSource.replace("6. PRICE LIST 💶\\", "") : selectedFlat.sourceNotes ?? copy.summary.missing}
                  </p>
                </div>
                <div className="rounded-lg bg-background/70 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{copy.selectedUnit.currentDebt}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatTry(selectedFlat.balanceTry)}</p>
                </div>
                <div className="rounded-lg bg-background/70 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">{copy.selectedUnit.openService}</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{selectedFlat.serviceOpen}</p>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <h3 className="text-sm font-black text-foreground">{copy.actions.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {copy.actions.auditDescription}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
                <UnitActionButton
                  actionType="unit.detail.view"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-bold text-foreground hover:bg-muted"
                  flat={selectedFlat}
                  successLabel={copy.actions.detailOpen}
                  title={`${selectedFlat.number} ${copy.actions.detailOpen}`}
                >
                  <Eye className="h-4 w-4" />
                  {copy.actions.detailOpen}
                </UnitActionButton>
                <UnitActionButton
                  actionType="unit.debt.view"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-500/15 dark:text-amber-300"
                  flat={selectedFlat}
                  successLabel={copy.actions.debtOpen}
                  title={`${selectedFlat.number} ${copy.actions.debtOpen}`}
                >
                  <WalletCards className="h-4 w-4" />
                  {copy.actions.debtOpen}
                </UnitActionButton>
                <UnitActionButton
                  actionType="unit.service.view"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/15"
                  flat={selectedFlat}
                  successLabel={copy.actions.serviceHistory}
                  title={`${selectedFlat.number} ${copy.actions.serviceHistory}`}
                >
                  <Wrench className="h-4 w-4" />
                  {copy.actions.serviceHistory}
                </UnitActionButton>
              </div>
            </div>
          </div>
        )}
      </Card3D>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.centerTitle}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.import.centerDescription}
              </p>
            </div>
            <StatusBadge variant={importSummary.rejectedRows === 0 ? "success" : "danger"}>
              %{importSummary.readinessRate} {copy.import.ready}
            </StatusBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [copy.import.totalRows, importSummary.totalRows],
              [copy.import.valid, importSummary.validRows],
              [copy.import.warning, importSummary.warningRows],
              [copy.import.rejected, importSummary.rejectedRows],
            ].map(([label, value]) => (
              <DashboardActionButton
                key={label}
                actionType="import.summary.view"
                ariaLabel={`${label} ${copy.import.summaryOpened}`}
                className="rounded-xl border border-border bg-muted/30 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
                entityExternalId={String(label)}
                entityTable="import_batches"
                metadata={{ label, value }}
                successLabel={copy.import.summaryOpened}
                title={`${label} ${copy.import.summaryOpened}`}
              >
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-black text-foreground">{value}</p>
              </DashboardActionButton>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {importBatches.map((batch) => (
              <DashboardActionButton
                key={batch.id}
                actionType="import.batch.view"
                ariaLabel={`${batch.id} ${copy.import.batchTitle}`}
                className="rounded-xl border border-border bg-background/60 p-4 text-left transition hover:border-primary/50 hover:bg-primary/5"
                entityExternalId={batch.id}
                entityTable="import_batches"
                metadata={{
                  rejectedRows: batch.rejectedRows,
                  source: batch.source,
                  status: batch.status,
                  totalRows: batch.totalRows,
                  validRows: batch.validRows,
                  warningRows: batch.warningRows,
                }}
                successLabel={copy.import.batchOpened}
                title={`${batch.id} ${copy.import.batchTitle}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{batch.id}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{batch.source}</h3>
                  </div>
                  <StatusBadge variant={importStatusVariant(batch.status)}>{importStatusLabel(batch.status, copy)}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {interpolate(copy.import.rowsSummary, {
                    rejected: batch.rejectedRows,
                    total: batch.totalRows,
                    valid: batch.validRows,
                    warning: batch.warningRows,
                  })}
                </p>
              </DashboardActionButton>
            ))}
          </div>
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
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.import.findingSummary}</h2>
                <div className="mt-2 space-y-2">
                  {importFindings.slice(0, 3).map((finding) => (
                    <DashboardActionButton
                      key={finding.id}
                      actionType="import.finding.view"
                      ariaLabel={`${finding.area} ${copy.import.findingOpened}`}
                      className="w-full rounded-lg bg-muted/40 p-2 text-left transition hover:bg-primary/10"
                      entityExternalId={finding.id}
                      entityTable="import_findings"
                      metadata={{
                        affectedRows: finding.affectedRows,
                        area: finding.area,
                        severity: finding.severity,
                      }}
                      successLabel={copy.import.findingOpened}
                      title={`${finding.area} ${copy.import.findingSummary}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{finding.area}</span>
                        <StatusBadge variant={findingVariant(finding.severity)}>{findingLabel(finding.severity, copy)}</StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{finding.affectedRows} {copy.common.rows}</p>
                    </DashboardActionButton>
                  ))}
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={filteredFlats}
        searchValue={(flat) =>
          `${flat.number} ${flat.displayNumber} ${flat.ownerName} ${flat.residentName} ${flat.phone} ${flat.type} ${flat.areaText ?? ""} ${flat.saleStatus} ${flat.priceSource ?? ""}`
        }
        columns={[
          {
            key: "number",
            header: copy.table.unit,
            sortable: true,
            render: (flat) => (
              <button
                type="button"
                onClick={() => setSelectedFlatId(flat.id)}
                className="flex items-center gap-2 rounded-md text-left font-semibold text-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${flat.number} ${copy.actions.detailOpen}`}
              >
                <DoorOpen className="h-4 w-4 text-primary" />
                <span>{flat.number}</span>
              </button>
            ),
          },
          {
            key: "sale",
            header: copy.table.sale,
            sortable: true,
            sortValue: (flat) => flat.saleStatus,
            render: (flat) => <StatusBadge variant={saleVariant(flat.saleStatus)}>{saleLabel(flat.saleStatus, copy)}</StatusBadge>,
          },
          {
            key: "type",
            header: copy.table.typeArea,
            sortable: true,
            render: (flat) => (
              <div className="space-y-1">
                <p className="font-semibold">{flat.type}</p>
                <p className="text-xs text-muted-foreground">{flat.areaText ?? copy.common.sourcePending}</p>
              </div>
            ),
          },
          {
            key: "price",
            header: copy.table.price,
            sortable: true,
            sortValue: (flat) => flat.buyNowEur ?? 0,
            render: (flat) => (
              <div className="space-y-1">
                <p className="font-semibold">{flat.buyNowEur ? formatEur(flat.buyNowEur) : copy.common.sourcePending}</p>
                <p className="text-xs text-muted-foreground">{flat.priceSource ? copy.selectedUnit.priceSourceConnected : flat.sourceNotes ?? copy.common.unknown}</p>
              </div>
            ),
          },
          { key: "owner", header: copy.table.owner, render: (flat) => localizeOperationalValue(flat.ownerName, locale) },
          { key: "resident", header: copy.table.resident, render: (flat) => localizeOperationalValue(flat.residentName, locale) },
          {
            key: "status",
            header: copy.table.status,
            render: (flat) => <StatusBadge variant={flatVariant(flat.status)}>{copy.labels.flat[flat.status]}</StatusBadge>,
          },
          {
            key: "balance",
            header: copy.table.debt,
            sortable: true,
            sortValue: (flat) => flat.balanceTry,
            render: (flat) => (
              <div className="space-y-1">
                <p className="font-semibold">{formatTry(flat.balanceTry)}</p>
                <StatusBadge variant={paymentVariant(flat.paymentStatus)}>{copy.labels.payment[flat.paymentStatus]}</StatusBadge>
              </div>
            ),
          },
          {
            key: "access",
            header: copy.table.access,
            render: (flat) => (
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <StatusBadge variant={accessVariant(flat.accessStatus)}>{copy.labels.access[flat.accessStatus]}</StatusBadge>
              </div>
            ),
          },
          {
            key: "service",
            header: copy.table.service,
            sortable: true,
            sortValue: (flat) => flat.serviceOpen,
            render: (flat) => `${flat.serviceOpen} ${copy.table.open}`,
          },
          {
            key: "actions",
            header: copy.actions.actionColumn,
            sticky: "right",
            cellClassName: "min-w-[210px]",
            render: (flat) => (
              <div className="flex flex-wrap gap-2">
                <UnitActionButton
                  actionType="unit.detail.view"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-muted"
                  flat={flat}
                  successLabel={copy.actions.detailOpen}
                  title={`${flat.number} ${copy.actions.detailOpen}`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  {copy.actions.open}
                </UnitActionButton>
                <UnitActionButton
                  actionType="unit.service.view"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/15"
                  flat={flat}
                  successLabel={copy.actions.serviceHistory}
                  title={`${flat.number} ${copy.actions.serviceHistory}`}
                >
                  <Wrench className="h-3.5 w-3.5" />
                  {copy.actions.service}
                </UnitActionButton>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
