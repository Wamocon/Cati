"use client"

import { Building2, CheckCircle2, Database, DoorOpen, FileWarning, Home, KeyRound, LockKeyhole, UploadCloud, WalletCards } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { cn } from "@/lib/utils"
import { clientProfile, clientServicePillars } from "@/lib/client-context"
import {
  accessLabels,
  flats,
  formatTry,
  getBlockOverview,
  getImportSummary,
  getSummary,
  importBatches,
  importFindings,
  paymentLabels,
  statusLabels,
  type AccessStatus,
  type FlatStatus,
  type ImportBatch,
  type ImportFinding,
  type PaymentStatus,
} from "@/lib/site-management-data"

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

function importStatusVariant(status: ImportBatch["status"]) {
  if (status === "validated" || status === "ready_to_apply") return "success"
  return "warning"
}

function importStatusLabel(status: ImportBatch["status"]) {
  if (status === "validated") return "Doğrulandı"
  if (status === "ready_to_apply") return "Uygulamaya hazır"
  return "İnceleme gerekli"
}

function findingVariant(severity: ImportFinding["severity"]) {
  if (severity === "error") return "danger"
  if (severity === "warning") return "warning"
  return "info"
}

function findingLabel(severity: ImportFinding["severity"]) {
  if (severity === "error") return "Hata"
  if (severity === "warning") return "Uyarı"
  return "Bilgi"
}

export default function ListingsPage() {
  const summary = getSummary()
  const importSummary = getImportSummary()
  const blocks = getBlockOverview()
  const matrixPreview = flats.slice(0, 192)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Proje & Daire Matrisi</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {clientProfile.pilotProject} / {clientProfile.pilotLocation} için satışa uygun birim, malik, müşteri,
          ödeme, evrak, servis ve erişim durumunu aynı çalışma alanında yönetin. Mevcut demo matrisi büyük ölçekli
          operasyonu test etmek için 769 birimle çalışır.
        </p>
      </div>

      <Card3D glow={false}>
        <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-primary">Müşteriye özel pilot</p>
            <h2 className="mt-2 text-xl font-black text-card-foreground">{clientProfile.pilotOffer}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Bu ekran ilk olarak Ataberk Estate satış ekibinin Avsallar projesinde müşteri sorularını hızlı
              yanıtlaması, uygun daireleri filtrelemesi, online tur ve evrak akışını başlatması için konumlandırıldı.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {clientServicePillars.slice(0, 4).map((pillar) => (
              <div key={pillar.title} className="rounded-xl border border-border/70 bg-muted/40 p-3">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Toplam daire</p>
              <AnimatedCounter value={summary.totalFlats} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Home className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Doluluk</p>
              <p className="text-2xl font-black">%{summary.occupancyRate}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Erişim kısıtı</p>
              <AnimatedCounter value={summary.restrictedAccess} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Toplam borç</p>
              <p className="text-2xl font-black">{formatTry(summary.totalDebtTry)}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Blok özeti</h2>
            <p className="text-xs text-muted-foreground">Her blok için doluluk, boşluk, bakım ve borç yükü.</p>
          </div>
          <StatusBadge variant="accent">{blocks.length} blok</StatusBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {blocks.map((block) => (
            <div key={block.block} className="rounded-xl border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-foreground">Blok {block.block}</p>
                <span className="text-xs font-semibold text-muted-foreground">{block.total} daire</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${Math.round((block.occupied / block.total) * 100)}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <span>Dolu {block.occupied}</span>
                <span>Boş {block.vacant}</span>
                <span>Bakım {block.maintenance}</span>
                <span>Blokeli {block.blocked}</span>
              </div>
            </div>
          ))}
        </div>
      </Card3D>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">Görsel daire matrisi</h2>
            <p className="text-xs text-muted-foreground">İlk 192 daire gösteriliyor. Renkler operasyon durumunu temsil eder.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(statusLabels).map(([status, label]) => (
              <StatusBadge key={status} variant={flatVariant(status as FlatStatus)}>
                {label}
              </StatusBadge>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-12 lg:grid-cols-16 xl:grid-cols-24">
          {matrixPreview.map((flat) => (
            <div
              key={flat.id}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md border text-[10px] font-bold",
                flat.status === "occupied" && "border-teal-500/20 bg-teal-500/10 text-teal-700 dark:text-teal-300",
                flat.status === "vacant" && "border-sky-500/20 bg-sky-500/10 text-sky-700 dark:text-sky-300",
                flat.status === "reserved" && "border-primary/20 bg-primary/10 text-primary",
                flat.status === "maintenance" && "border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                flat.status === "blocked" && "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
              )}
              title={`${flat.number} - ${statusLabels[flat.status]}`}
            >
              {flat.number.split("-")[1]}
            </div>
          ))}
        </div>
      </Card3D>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">Import doğrulama merkezi</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Phase 4 için müşteri Excel/listeleri sisteme alınmadan önce satır, uyarı ve hata kontrolü yapılır.
              </p>
            </div>
            <StatusBadge variant={importSummary.rejectedRows === 0 ? "success" : "danger"}>
              %{importSummary.readinessRate} hazır
            </StatusBadge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Toplam satır</p>
              <p className="mt-1 text-2xl font-black text-foreground">{importSummary.totalRows}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Geçerli</p>
              <p className="mt-1 text-2xl font-black text-foreground">{importSummary.validRows}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Uyarı</p>
              <p className="mt-1 text-2xl font-black text-foreground">{importSummary.warningRows}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Red</p>
              <p className="mt-1 text-2xl font-black text-foreground">{importSummary.rejectedRows}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {importBatches.map((batch) => (
              <div key={batch.id} className="rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">{batch.id}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{batch.source}</h3>
                  </div>
                  <StatusBadge variant={importStatusVariant(batch.status)}>{importStatusLabel(batch.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {batch.validRows}/{batch.totalRows} geçerli, {batch.warningRows} uyarı, {batch.rejectedRows} red.
                </p>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Daire veri modeli</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Her kayıt blok, kat, daire, malik, sakin, borç, depozito, erişim ve servis durumuyla bağlıdır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-teal-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Kalite kapısı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Red satırı yoksa import uygulanabilir; uyarılar yönetici onayıyla kapatılır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <FileWarning className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Bulgu özeti</h2>
                <div className="mt-2 space-y-2">
                  {importFindings.slice(0, 3).map((finding) => (
                    <div key={finding.id} className="rounded-lg bg-muted/40 p-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-foreground">{finding.area}</span>
                        <StatusBadge variant={findingVariant(finding.severity)}>{findingLabel(finding.severity)}</StatusBadge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{finding.affectedRows} satır</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={flats}
        searchValue={(flat) => `${flat.number} ${flat.ownerName} ${flat.residentName} ${flat.phone}`}
        columns={[
          {
            key: "number",
            header: "Daire",
            sortable: true,
            render: (flat) => (
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-primary" />
                <span className="font-semibold">{flat.number}</span>
              </div>
            ),
          },
          { key: "type", header: "Tip", sortable: true, render: (flat) => flat.type },
          { key: "owner", header: "Malik", render: (flat) => flat.ownerName },
          { key: "resident", header: "Sakin", render: (flat) => flat.residentName },
          {
            key: "status",
            header: "Durum",
            render: (flat) => <StatusBadge variant={flatVariant(flat.status)}>{statusLabels[flat.status]}</StatusBadge>,
          },
          {
            key: "balance",
            header: "Borç",
            sortable: true,
            sortValue: (flat) => flat.balanceTry,
            render: (flat) => (
              <div className="space-y-1">
                <p className="font-semibold">{formatTry(flat.balanceTry)}</p>
                <StatusBadge variant={paymentVariant(flat.paymentStatus)}>{paymentLabels[flat.paymentStatus]}</StatusBadge>
              </div>
            ),
          },
          {
            key: "access",
            header: "Erişim",
            render: (flat) => (
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                <StatusBadge variant={accessVariant(flat.accessStatus)}>{accessLabels[flat.accessStatus]}</StatusBadge>
              </div>
            ),
          },
          {
            key: "service",
            header: "Servis",
            sortable: true,
            sortValue: (flat) => flat.serviceOpen,
            render: (flat) => `${flat.serviceOpen} açık`,
          },
        ]}
      />
    </div>
  )
}
