"use client"

import { useState, type FormEvent } from "react"
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
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { hasPermission, type Role } from "@/lib/rbac"
import {
  isClientRole,
  isFieldRole,
  visibleDocumentPacketsForRole,
  visibleDocumentsForRole,
} from "@/lib/role-scoped-views"
import {
  documentPackets,
  documentVault,
  getDocumentPacketSummary,
  getDocumentSummary,
  getPurchaseChecklistSummary,
  purchaseChecklist,
  type DocumentPacketRecord,
  type DocumentVaultRecord,
  type PurchaseDocumentStatus,
} from "@/lib/site-management-data"

type UploadState = "idle" | "uploading" | "success" | "error"

const uploadCategories = Array.from(
  new Set(documentVault.map((document) => document.category))
) as DocumentVaultRecord["category"][]

const retentionOptions = [
  { value: "identity", label: "Identity" },
  { value: "legal", label: "Legal" },
  { value: "finance", label: "Finance" },
  { value: "service", label: "Service" },
  { value: "guest", label: "Guest" },
  { value: "general", label: "General" },
]

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

function packetVariant(status: DocumentPacketRecord["status"]) {
  if (status === "complete") return "success"
  if (status === "signature_pending" || status === "review") return "warning"
  return "danger"
}

function signatureVariant(status: DocumentPacketRecord["signatureStatus"]) {
  if (status === "signed" || status === "not_required") return "success"
  if (status === "sent") return "warning"
  return "danger"
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

function DocumentUploadPanel({
  role,
  onUploaded,
  t,
}: {
  role: Role
  onUploaded: () => void
  t: (value: string) => string
}) {
  const [state, setState] = useState<UploadState>("idle")
  const [message, setMessage] = useState("")
  const [fileName, setFileName] = useState("")

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setState("uploading")
    setMessage("")

    try {
      const formData = new FormData(form)
      const response = await fetch("/api/site-management/document-uploads", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.")
      }

      setState("success")
      setMessage(
        `${payload.upload?.originalFilename ?? "Document"} saved for review (${payload.storageMode}).`
      )
      form.reset()
      setFileName("")
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      onUploaded()
    } catch (error) {
      setState("error")
      setMessage(error instanceof Error ? error.message : t("Yükleme başarısız."))
    }
  }

  return (
    <Card3D glow={false}>
      <form className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]" onSubmit={submitUpload}>
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-card-foreground">{t("Güvenli belge yükleme")}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("Dosyalar gizli kalır, metadata veritabanında tutulur ve her yükleme insan incelemesini bekler.")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Başlık")}
              <input
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
                name="title"
                placeholder={t("Pasaport, TAPU, ödeme kanıtı...")}
                maxLength={140}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Kategori")}
              <select
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
                name="category"
                defaultValue={uploadCategories[0] ?? "General"}
              >
                {uploadCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Daire / referans")}
              <input
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
                name="flatNumber"
                placeholder="A-001, BKG-501, SRV-2401"
                maxLength={80}
              />
            </label>
            <label className="text-xs font-semibold text-muted-foreground">
              {t("Saklama sınıfı")}
              <select
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
                name="retentionClass"
                defaultValue={role === "staff" ? "service" : "general"}
              >
                {retentionOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4">
          <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg bg-background px-4 py-5 text-center text-sm text-muted-foreground transition-colors hover:bg-muted">
            <UploadCloud className="mb-2 h-8 w-8 text-primary" />
            <span className="font-semibold text-foreground">
              {fileName || t("PDF, görsel, Word veya Excel dosyası seçin")}
            </span>
            <span className="mt-1 text-xs">{t("Maks. 25 MB. Gizli depolama, inceleme zorunlu.")}</span>
            <input
              className="sr-only"
              name="file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,application/pdf,image/jpeg,image/png,image/webp,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              required
              onChange={(event) => setFileName(event.currentTarget.files?.[0]?.name ?? "")}
            />
          </label>
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-primary"
            name="note"
            placeholder={t("İnceleme ekibi için isteğe bağlı not")}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={state === "uploading"}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
          >
            <UploadCloud className="h-4 w-4" />
            {state === "uploading" ? t("Yükleniyor...") : t("İncelemeye yükle")}
          </button>
          {message ? (
            <p
              className={`mt-2 text-xs font-semibold ${
                state === "error" ? "text-rose-600" : "text-teal-600"
              }`}
              aria-live="polite"
            >
              {message}
            </p>
          ) : null}
        </div>
      </form>
    </Card3D>
  )
}

export default function DocumentsPage() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const restrictedView = clientView || fieldView
  const canUpload = hasPermission(user.role, "documents", "create")
  const visibleDocuments = visibleDocumentsForRole(user.role, documentVault)
  const visiblePackets = visibleDocumentPacketsForRole(user.role, documentPackets)
  const summary = restrictedView ? summarizeDocuments(visibleDocuments) : getDocumentSummary()
  const packetSummary = getDocumentPacketSummary()
  const purchaseSummary = getPurchaseChecklistSummary()

  const pageIntro = clientView
    ? t("Yetkili dairenize bağlı sözleşme, kimlik, depozito, servis ve uyum belgelerini güvenli portal görünümünde takip edin.")
    : fieldView
      ? t("Saha operasyonu için yalnızca görev dosyaları, servis kanıtları ve gerekli onay kayıtları gösterilir.")
      : {
          tr: `${clientProfile.clientName} satış ve after-sales süreci için TAPU, kimlik, sözleşme, ödeme, depozito, servis, uyum ve proje belgelerini güvenli, denetlenebilir ve işlem bağlantılı yönetin.`,
          en: `Manage TAPU, identity, contract, payment, deposit, service, compliance and project documents for ${clientProfile.clientName} sales and after-sales in a secure audited workflow.`,
          de: `Verwalten Sie TAPU-, Identitäts-, Vertrags-, Zahlungs-, Kautions-, Service-, Compliance- und Projektdokumente für Vertrieb und After-Sales von ${clientProfile.clientName} in einem sicheren, auditierbaren Ablauf.`,
          ru: `Управляйте TAPU, документами личности, договорами, оплатами, депозитами, сервисом, соответствием и проектными файлами для продаж и after-sales ${clientProfile.clientName} в защищенном аудируемом процессе.`,
        }[locale]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">{t("TAPU & Belge Kasası")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
        </div>
        <DashboardActionMenu
          label="Aksiyonlar"
          ariaLabel="Belge sayfasi aksiyonlari"
          items={[
            {
              key: "upload",
              label: "Belge yukle",
              description: "Yukleme talebi denetim kaydina eklenir.",
              icon: <UploadCloud />,
              actionType: "document.upload.requested",
              ariaLabel: "Belge yukle",
              entityTable: "documents",
              title: "Document upload requested",
              metadata: { source: "documents-page", role: user.role },
            },
          ]}
        />
      </div>

      {canUpload ? (
        <DocumentUploadPanel role={user.role} t={t} onUploaded={() => undefined} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileArchive className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Toplam belge")}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileCheck2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Doğrulandı")}</p>
              <AnimatedCounter value={summary.verified} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Bekleyen")}</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Eksik/Süre doldu")}</p>
              <AnimatedCounter value={summary.missing + summary.expired} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">Document packet board</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Move-in, checkout, owner statement, KYC/TAPU and service-proof packets track required files, signatures, retention and next action.
            </p>
          </div>
          <StatusBadge variant={packetSummary.missingOrReview > 0 ? "warning" : "success"}>
            {packetSummary.completionRate}% packet completion
          </StatusBadge>
        </div>
        <DataTable
          data={visiblePackets}
          pageSize={8}
          searchValue={(packet) => `${packet.id} ${packet.title} ${packet.audience} ${packet.relatedEntity} ${packet.retentionClass} ${packet.nextAction}`}
          columns={[
            { key: "id", header: "Packet", sortable: true, render: (packet) => packet.id },
            { key: "title", header: "Title", render: (packet) => packet.title },
            { key: "audience", header: "Audience", sortable: true, render: (packet) => packet.audience },
            { key: "related", header: "Related", render: (packet) => packet.relatedEntity },
            {
              key: "progress",
              header: "Progress",
              sortable: true,
              sortValue: (packet) => packet.completedDocuments / Math.max(packet.requiredDocuments, 1),
              render: (packet) => `${packet.completedDocuments}/${packet.requiredDocuments}`,
            },
            {
              key: "status",
              header: "Status",
              render: (packet) => <StatusBadge variant={packetVariant(packet.status)}>{packet.status}</StatusBadge>,
            },
            {
              key: "signature",
              header: "Signature",
              render: (packet) => (
                <StatusBadge variant={signatureVariant(packet.signatureStatus)}>{packet.signatureStatus}</StatusBadge>
              ),
            },
            { key: "next", header: "Next action", render: (packet) => packet.nextAction },
            {
              key: "actions",
              header: "Action",
              sticky: "right",
              headerClassName: "text-center",
              cellClassName: "text-center",
              render: (packet) => (
                <DashboardActionMenu
                  compact
                  label="Paket aksiyonlari"
                  ariaLabel={`${packet.id} belge paketi aksiyonlari`}
                  items={[
                    {
                      key: "prepare",
                      label: "Paketi hazirla",
                      description: `${packet.completedDocuments}/${packet.requiredDocuments} belge tamam.`,
                      icon: <FileText />,
                      actionType: "document.packet.prepare",
                      ariaLabel: "Belge paketini hazirla",
                      entityTable: "document_packets",
                      entityExternalId: packet.id,
                      title: packet.title,
                      metadata: {
                        relatedEntity: packet.relatedEntity,
                        status: packet.status,
                        role: user.role,
                      },
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card3D>

      <div className="grid gap-4 lg:grid-cols-3">
        {visibleDocuments.slice(0, 3).map((document) => (
          <Card3D key={document.id} glow={false}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <StatusBadge variant={documentVariant(document.status)}>
                  {documentLabel(document.status)}
                </StatusBadge>
                <h2 className="mt-2 text-sm font-bold text-card-foreground">{document.category}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{document.retentionRule}</p>
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
                  Satış dosyası, TAPU, KYC ve EIDS kontrolü
                </h2>
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
            searchValue={(document) =>
              `${document.id} ${document.dealName} ${document.buyerName} ${document.documentType} ${document.nextAction}`
            }
            columns={[
              { key: "id", header: "Kontrol", sortable: true, render: (document) => document.id },
              { key: "deal", header: "Deal", render: (document) => document.dealName },
              { key: "buyer", header: "Alıcı", render: (document) => document.buyerName },
              { key: "type", header: "Belge tipi", sortable: true, render: (document) => document.documentType },
              { key: "owner", header: "Sorumlu", render: (document) => document.owner },
              {
                key: "status",
                header: "Durum",
                render: (document) => (
                  <StatusBadge variant={checklistVariant(document.status)}>
                    {checklistLabel(document.status)}
                  </StatusBadge>
                ),
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
      )}

      <DataTable
        data={visibleDocuments}
        searchValue={(document) =>
          `${document.id} ${document.flatNumber} ${document.ownerName} ${document.name} ${document.category}`
        }
        columns={[
          { key: "id", header: "Belge", sortable: true, render: (document) => document.id },
          { key: "flat", header: "Daire", sortable: true, render: (document) => document.flatNumber },
          ...(!clientView
            ? [
                {
                  key: "owner",
                  header: fieldView ? "Kapsam" : "Malik",
                  render: (document: DocumentVaultRecord) => document.ownerName,
                },
              ]
            : []),
          { key: "name", header: "Dosya", render: (document) => document.name },
          { key: "category", header: "Kategori", sortable: true, render: (document) => document.category },
          {
            key: "status",
            header: "Durum",
            render: (document) => (
              <StatusBadge variant={documentVariant(document.status)}>
                {documentLabel(document.status)}
              </StatusBadge>
            ),
          },
          { key: "retention", header: "Kural", render: (document) => document.retentionRule },
          {
            key: "actions",
            header: "İşlem",
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (document) => (
              <DashboardActionMenu
                compact
                label="Belge aksiyonlari"
                ariaLabel={`${document.id} belge aksiyonlari`}
                items={[
                  {
                    key: "view",
                    label: "Belgeyi goruntule",
                    icon: <Eye />,
                    actionType: "document.view.requested",
                    ariaLabel: "Belgeyi goruntule",
                    entityTable: "documents",
                    entityExternalId: document.id,
                    title: document.name,
                    metadata: {
                      flatNumber: document.flatNumber,
                      category: document.category,
                      role: user.role,
                    },
                  },
                  {
                    key: "download",
                    label: "Belgeyi indir",
                    icon: <Download />,
                    actionType: "document.download.requested",
                    ariaLabel: "Belgeyi indir",
                    entityTable: "documents",
                    entityExternalId: document.id,
                    title: document.name,
                    metadata: {
                      flatNumber: document.flatNumber,
                      category: document.category,
                      role: user.role,
                    },
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
