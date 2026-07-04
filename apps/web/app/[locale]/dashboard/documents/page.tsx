"use client"

import { useLocale } from "next-intl"
import {
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  FileClock,
  FileText,
  Gavel,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
import { interpolate, localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import { localizeOperationalValue } from "@/lib/unit-matrix-copy"
import {
  isClientRole,
  isFieldRole,
  visibleDocumentsForRole,
} from "@/lib/role-scoped-views"
import {
  documentVault,
  getDocumentSummary,
  getPurchaseChecklistSummary,
  purchaseChecklist,
  type DocumentVaultRecord,
  type PurchaseDocumentStatus,
} from "@/lib/site-management-data"

function documentVariant(status: DocumentVaultRecord["status"]) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  if (status === "missing") return "danger"
  return "danger"
}

function documentLabel(status: DocumentVaultRecord["status"], locale: string) {
  if (status === "verified") return localizeBusinessCopy("Doğrulandı", locale)
  if (status === "pending") return localizeBusinessCopy("Bekliyor", locale)
  if (status === "missing") return localizeBusinessCopy("Eksik", locale)
  return localizeBusinessCopy("Süresi doldu", locale)
}

function retentionRuleLabel(retentionRule: string, locale: string) {
  const sourceMatch = retentionRule.match(/^Kaynak: (.+)$/)
  if (sourceMatch) {
    return interpolate(localizeBusinessCopy("Kaynak: {path}", locale), { path: sourceMatch[1] })
  }
  const reviewMatch = retentionRule.match(/^OCR \/ insan onayı gerekli: (.+)$/)
  if (reviewMatch) {
    return interpolate(localizeBusinessCopy("OCR / insan onayı gerekli: {path}", locale), { path: reviewMatch[1] })
  }
  return localizeBusinessCopy(retentionRule, locale)
}

function checklistVariant(status: PurchaseDocumentStatus) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  return "danger"
}

function checklistLabel(status: PurchaseDocumentStatus, locale: string) {
  if (status === "verified") return localizeBusinessCopy("Doğrulandı", locale)
  if (status === "pending") return localizeBusinessCopy("Bekliyor", locale)
  if (status === "missing") return localizeBusinessCopy("Eksik", locale)
  if (status === "expired") return localizeBusinessCopy("Süresi doldu", locale)
  return localizeBusinessCopy("Reddedildi", locale)
}

function summarizeDocuments(documents: DocumentVaultRecord[]) {
  return {
    total: documents.length,
    verified: documents.filter((document) => document.status === "verified").length,
    pending: documents.filter((document) => document.status === "pending").length,
    missing: documents.filter((document) => document.status === "missing").length,
    expired: documents.filter((document) => document.status === "expired").length,
  }
}

export default function DocumentsPage() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const restrictedView = clientView || fieldView
  const visibleDocuments = visibleDocumentsForRole(user.role, documentVault)
  const summary = restrictedView ? summarizeDocuments(visibleDocuments) : getDocumentSummary()
  const purchaseSummary = getPurchaseChecklistSummary()

  const pageIntro = clientView
    ? localizeBusinessCopy(
        "Yetkili dairenize bağlı sözleşme, kimlik, depozito, servis ve uyum belgelerini güvenli portal görünümünde takip edin.",
        locale
      )
    : fieldView
      ? localizeBusinessCopy(
          "Saha operasyonu için yalnızca görev dosyaları, servis kanıtları ve gerekli onay kayıtları gösterilir.",
          locale
        )
      : `${clientProfile.clientName} ${localizeBusinessCopy(
          "satış ve after-sales süreci için TAPU, kimlik, sözleşme, ödeme, depozito, servis, uyum ve proje belgelerini güvenli, denetlenebilir ve işlem bağlantılı yönetin.",
          locale
        )}`

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("TAPU & Belge Kasası", locale)}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
        </div>
        <DashboardActionButton
          actionType="document.upload.requested"
          ariaLabel={localizeBusinessCopy("Belge yükle", locale)}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-sm hover:bg-muted"
          entityTable="documents"
          title="Document upload requested"
          metadata={{ source: "documents-page", role: user.role }}
        >
          <UploadCloud className="h-4 w-4 text-primary" />
          {localizeBusinessCopy("Belge yükle", locale)}
        </DashboardActionButton>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Toplam belge", locale)}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Doğrulandı", locale)}</p>
              <AnimatedCounter value={summary.verified} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Bekleyen", locale)}</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Eksik/Süre doldu", locale)}</p>
              <AnimatedCounter value={summary.missing + summary.expired} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {visibleDocuments.slice(0, 3).map((document) => (
          <Card3D key={document.id} glow={false}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <StatusBadge variant={documentVariant(document.status)}>
                  {documentLabel(document.status, locale)}
                </StatusBadge>
                <h2 className="mt-2 text-sm font-bold text-card-foreground">{localizeBusinessCopy(document.category, locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{retentionRuleLabel(document.retentionRule, locale)}</p>
              </div>
            </div>
          </Card3D>
        ))}
      </div>

      {!restrictedView && (
        <Card3D glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">
                  {localizeBusinessCopy("Satış dosyası, TAPU, KYC ve EIDS kontrolü", locale)}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy(
                  "Satış dosyası; alıcı kimliği, TAPU, EIDS, rezervasyon, satış sözleşmesi ve ödeme planı olmadan sonraki adıma geçmez.",
                  locale
                )}
              </p>
            </div>
            <StatusBadge variant={purchaseSummary.highRisk > 0 ? "danger" : "success"}>
              {interpolate(localizeBusinessCopy("{count} yüksek risk", locale), { count: purchaseSummary.highRisk })}
            </StatusBadge>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Satış belgesi", locale)}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Doğrulandı", locale)}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.verified}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Bekliyor", locale)}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.pending}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Eksik", locale)}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.missing}</p>
            </div>
          </div>
          <DataTable
            data={purchaseChecklist}
            pageSize={6}
            searchValue={(document) =>
              `${document.id} ${document.dealName} ${document.buyerName} ${document.documentType} ${document.nextAction}`
            }
            columns={[
              { key: "id", header: localizeBusinessCopy("Kontrol", locale), sortable: true, render: (document) => document.id },
              { key: "deal", header: localizeBusinessCopy("Deal", locale), render: (document) => document.dealName },
              { key: "buyer", header: localizeBusinessCopy("Alıcı", locale), render: (document) => document.buyerName },
              {
                key: "type",
                header: localizeBusinessCopy("Belge tipi", locale),
                sortable: true,
                render: (document) => localizeBusinessCopy(document.documentType, locale),
              },
              { key: "owner", header: localizeBusinessCopy("Sorumlu", locale), render: (document) => localizeBusinessCopy(document.owner, locale) },
              {
                key: "status",
                header: localizeBusinessCopy("Durum", locale),
                render: (document) => (
                  <StatusBadge variant={checklistVariant(document.status)}>
                    {checklistLabel(document.status, locale)}
                  </StatusBadge>
                ),
              },
              {
                key: "risk",
                header: localizeBusinessCopy("Risk", locale),
                render: (document) => (
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                    {localizeBusinessCopy(document.risk, locale)}
                  </span>
                ),
              },
              {
                key: "next",
                header: localizeBusinessCopy("Sonraki aksiyon", locale),
                render: (document) => localizeBusinessCopy(document.nextAction, locale),
              },
            ]}
          />
        </Card3D>
      )}

      <DataTable
        data={visibleDocuments}
        searchValue={(document) =>
          `${document.id} ${document.flatNumber} ${document.ownerName} ${document.name} ${document.category}`
        }
        columns={[
          { key: "id", header: localizeBusinessCopy("Belge", locale), sortable: true, render: (document) => document.id },
          {
            key: "flat",
            header: localizeBusinessCopy("Daire", locale),
            sortable: true,
            render: (document) => document.flatNumber,
          },
          ...(!clientView
            ? [
                {
                  key: "owner",
                  header: fieldView
                    ? localizeBusinessCopy("Kapsam", locale)
                    : localizeBusinessCopy("Malik", locale),
                  render: (document: DocumentVaultRecord) => localizeOperationalValue(document.ownerName, locale),
                },
              ]
            : []),
          { key: "name", header: localizeBusinessCopy("Dosya", locale), render: (document) => document.name },
          {
            key: "category",
            header: localizeBusinessCopy("Kategori", locale),
            sortable: true,
            render: (document) => localizeBusinessCopy(document.category, locale),
          },
          {
            key: "status",
            header: localizeBusinessCopy("Durum", locale),
            render: (document) => (
              <StatusBadge variant={documentVariant(document.status)}>
                {documentLabel(document.status, locale)}
              </StatusBadge>
            ),
          },
          {
            key: "retention",
            header: localizeBusinessCopy("Kural", locale),
            render: (document) => retentionRuleLabel(document.retentionRule, locale),
          },
          {
            key: "actions",
            header: localizeBusinessCopy("Aksiyon", locale),
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (document) => (
              <div className="flex items-center justify-center gap-1">
                <DashboardActionButton
                  actionType="document.view.requested"
                  ariaLabel={localizeBusinessCopy("Belgeyi görüntüle", locale)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  entityTable="documents"
                  entityExternalId={document.id}
                  title={document.name}
                  metadata={{
                    flatNumber: document.flatNumber,
                    category: document.category,
                    role: user.role,
                  }}
                >
                  <Eye className="h-4 w-4" />
                </DashboardActionButton>
                <DashboardActionButton
                  actionType="document.download.requested"
                  ariaLabel={localizeBusinessCopy("Belgeyi indir", locale)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
                  entityTable="documents"
                  entityExternalId={document.id}
                  title={document.name}
                  metadata={{
                    flatNumber: document.flatNumber,
                    category: document.category,
                    role: user.role,
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
