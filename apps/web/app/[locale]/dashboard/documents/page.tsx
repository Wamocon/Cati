"use client"

import { Download, Eye, FileArchive, FileCheck2, FileClock, FileText, Gavel, ShieldAlert, ShieldCheck, UploadCloud } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  documentVault,
  getDocumentSummary,
  getPurchaseChecklistSummary,
  purchaseChecklist,
  type DocumentVaultRecord,
  type PurchaseDocumentStatus,
} from "@/lib/site-management-data"
import { clientProfile } from "@/lib/client-context"

function documentVariant(status: DocumentVaultRecord["status"]) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  if (status === "missing") return "danger"
  return "danger"
}

function documentLabel(status: DocumentVaultRecord["status"]) {
  if (status === "verified") return "Doğrulandı"
  if (status === "pending") return "Bekliyor"
  if (status === "missing") return "Eksik"
  return "Süresi doldu"
}

function checklistVariant(status: PurchaseDocumentStatus) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  return "danger"
}

function checklistLabel(status: PurchaseDocumentStatus) {
  if (status === "verified") return "Doğrulandı"
  if (status === "pending") return "Bekliyor"
  if (status === "missing") return "Eksik"
  if (status === "expired") return "Süresi doldu"
  return "Reddedildi"
}

export default function DocumentsPage() {
  const summary = getDocumentSummary()
  const purchaseSummary = getPurchaseChecklistSummary()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">TAPU & Belge Kasası</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {clientProfile.clientName} satış ve after-sales süreci için TAPU, kimlik, sözleşme, ödeme, depozito,
            servis, uyum ve proje belgelerini güvenli, denetlenebilir ve işlem bağlantılı yönetin.
          </p>
        </div>
        <DashboardActionButton
          actionType="document.upload.requested"
          ariaLabel="Belge yükle"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
          entityTable="documents"
          title="Document upload requested"
          metadata={{ source: "documents-page" }}
        >
          <UploadCloud className="h-4 w-4 text-primary" />
          Belge yükle
        </DashboardActionButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Toplam belge</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Doğrulandı</p>
              <AnimatedCounter value={summary.verified} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bekleyen</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Eksik/Süre doldu</p>
              <AnimatedCounter value={summary.missing + summary.expired} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {documentVault.slice(0, 3).map((document) => (
          <Card3D key={document.id} glow={false}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <StatusBadge variant={documentVariant(document.status)}>{documentLabel(document.status)}</StatusBadge>
                <h2 className="mt-2 text-sm font-bold text-card-foreground">{document.category}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{document.retentionRule}</p>
              </div>
            </div>
          </Card3D>
        ))}
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">Phase 8 - Kaufakte, TAPU, KYC ve EIDS kontrolü</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Satış dosyası; alıcı kimliği, TAPU, EIDS, rezervasyon, satış sözleşmesi ve ödeme planı olmadan sonraki adıma geçmez.
            </p>
          </div>
          <StatusBadge variant={purchaseSummary.highRisk > 0 ? "danger" : "success"}>
            {purchaseSummary.highRisk} yüksek risk
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Satış belgesi</p>
            <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Doğrulandı</p>
            <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.verified}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Bekliyor</p>
            <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.pending}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Eksik</p>
            <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.missing}</p>
          </div>
        </div>
        <DataTable
          data={purchaseChecklist}
          pageSize={6}
          searchValue={(document) => `${document.id} ${document.dealName} ${document.buyerName} ${document.documentType} ${document.nextAction}`}
          columns={[
            { key: "id", header: "Kontrol", sortable: true, render: (document) => document.id },
            { key: "deal", header: "Deal", render: (document) => document.dealName },
            { key: "buyer", header: "Alıcı", render: (document) => document.buyerName },
            { key: "type", header: "Belge tipi", sortable: true, render: (document) => document.documentType },
            { key: "owner", header: "Sorumlu", render: (document) => document.owner },
            {
              key: "status",
              header: "Durum",
              render: (document) => <StatusBadge variant={checklistVariant(document.status)}>{checklistLabel(document.status)}</StatusBadge>,
            },
            {
              key: "risk",
              header: "Risk",
              render: (document) => (
                <span className="inline-flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                  {document.risk}
                </span>
              ),
            },
            { key: "next", header: "Sonraki aksiyon", render: (document) => document.nextAction },
          ]}
        />
      </Card3D>

      <DataTable
        data={documentVault}
        searchValue={(document) => `${document.id} ${document.flatNumber} ${document.ownerName} ${document.name} ${document.category}`}
        columns={[
          { key: "id", header: "Belge", sortable: true, render: (document) => document.id },
          { key: "flat", header: "Daire", sortable: true, render: (document) => document.flatNumber },
          { key: "owner", header: "Malik", render: (document) => document.ownerName },
          { key: "name", header: "Dosya", render: (document) => document.name },
          { key: "category", header: "Kategori", sortable: true, render: (document) => document.category },
          {
            key: "status",
            header: "Durum",
            render: (document) => <StatusBadge variant={documentVariant(document.status)}>{documentLabel(document.status)}</StatusBadge>,
          },
          { key: "retention", header: "Kural", render: (document) => document.retentionRule },
          {
            key: "actions",
            header: "İşlem",
            render: (document) => (
              <div className="flex items-center gap-1">
                <DashboardActionButton
                  actionType="document.view.requested"
                  ariaLabel="Belgeyi görüntüle"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  entityTable="documents"
                  entityExternalId={document.id}
                  title={document.name}
                  metadata={{
                    flatNumber: document.flatNumber,
                    category: document.category,
                  }}
                >
                  <Eye className="h-4 w-4" />
                </DashboardActionButton>
                <DashboardActionButton
                  actionType="document.download.requested"
                  ariaLabel="Belgeyi indir"
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  entityTable="documents"
                  entityExternalId={document.id}
                  title={document.name}
                  metadata={{
                    flatNumber: document.flatNumber,
                    category: document.category,
                  }}
                >
                  <Download className="h-4 w-4" />
                </DashboardActionButton>
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
