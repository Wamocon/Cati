"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useLocale } from "next-intl"
import {
  Download,
  Eye,
  FileArchive,
  FileCheck2,
  FileClock,
  FileText,
  FolderOpen,
  Gavel,
  Inbox,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
} from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { FeatureInfo } from "@/components/feature-info"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { clientProfile } from "@/lib/client-context"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { hasPermission, type Role } from "@/lib/rbac"
import type { DashboardLocale } from "@/lib/unit-matrix-copy"
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

// F11: clientseitiger Größen-Vorabcheck (spiegelt das beworbene Server-Limit).
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

function documentVariant(status: DocumentVaultRecord["status"]) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  if (status === "missing") return "danger"
  return "danger"
}

function documentLabel(status: DocumentVaultRecord["status"], t: (value: string) => string) {
  if (status === "verified") return t("Doğrulandı")
  if (status === "pending") return t("Bekliyor")
  if (status === "missing") return t("Eksik")
  return t("Süresi doldu")
}

function checklistVariant(status: PurchaseDocumentStatus) {
  if (status === "verified") return "success"
  if (status === "pending") return "warning"
  return "danger"
}

function checklistLabel(status: PurchaseDocumentStatus, t: (value: string) => string) {
  if (status === "verified") return t("Doğrulandı")
  if (status === "pending") return t("Bekliyor")
  if (status === "missing") return t("Eksik")
  if (status === "expired") return t("Süresi doldu")
  return t("Reddedildi")
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

// Plain-language wording for governance fields (signature state, storage
// duration) plus first-run empty-state and packet-detail copy. Kept local so the
// stored enum values and shared copy libraries stay untouched.
const docsCopy: Record<
  DashboardLocale,
  {
    readyToHandOver: string
    signature: Record<DocumentPacketRecord["signatureStatus"], string>
    storageDuration: Record<DocumentPacketRecord["retentionClass"], string>
    retentionFieldLabel: string
    retentionFieldHelp: string
    packetOpen: string
    packetClose: string
    packetDetailTitle: string
    packetAudience: string
    packetRelated: string
    packetProgress: string
    packetStorage: string
    packetSignature: string
    packetStatus: string
    packetNext: string
    vaultEmptyTitle: string
    vaultEmptyBodyUpload: string
    vaultEmptyBodyView: string
    vaultEmptyCta: string
  }
> = {
  en: {
    readyToHandOver: "ready to hand over",
    signature: {
      not_required: "No signature needed",
      sent: "Sent for signing",
      signed: "Signed",
      blocked: "On hold",
    },
    storageDuration: {
      legal: "Kept long term (legal)",
      finance: "Kept for accounting",
      service: "Kept for service records",
      guest: "Kept short term (guest)",
    },
    retentionFieldLabel: "How long we keep it",
    retentionFieldHelp: "Sets how long the file stays stored after the case is closed.",
    packetOpen: "Open packet",
    packetClose: "Close packet",
    packetDetailTitle: "Packet details",
    packetAudience: "Who it is for",
    packetRelated: "Linked to",
    packetProgress: "Documents ready",
    packetStorage: "How long we keep it",
    packetSignature: "Signatures",
    packetStatus: "Status",
    packetNext: "Next step",
    vaultEmptyTitle: "No documents yet",
    vaultEmptyBodyUpload: "Upload your first document to start the secure vault.",
    vaultEmptyBodyView: "Documents linked to your record will appear here once they are added.",
    vaultEmptyCta: "Upload your first document",
  },
  tr: {
    readyToHandOver: "teslime hazır",
    signature: {
      not_required: "İmza gerekmiyor",
      sent: "İmzaya gönderildi",
      signed: "İmzalandı",
      blocked: "Beklemede",
    },
    storageDuration: {
      legal: "Uzun süre saklanır (yasal)",
      finance: "Muhasebe için saklanır",
      service: "Servis kaydı için saklanır",
      guest: "Kısa süre saklanır (misafir)",
    },
    retentionFieldLabel: "Ne kadar saklanır",
    retentionFieldHelp: "Dosyanın işlem kapandıktan sonra ne kadar süre saklanacağını belirler.",
    packetOpen: "Paketi aç",
    packetClose: "Paketi kapat",
    packetDetailTitle: "Paket ayrıntıları",
    packetAudience: "Kimin için",
    packetRelated: "Bağlı olduğu",
    packetProgress: "Hazır belgeler",
    packetStorage: "Ne kadar saklanır",
    packetSignature: "İmzalar",
    packetStatus: "Durum",
    packetNext: "Sonraki adım",
    vaultEmptyTitle: "Henüz belge yok",
    vaultEmptyBodyUpload: "Güvenli kasayı başlatmak için ilk belgenizi yükleyin.",
    vaultEmptyBodyView: "Kaydınıza bağlı belgeler eklendiğinde burada görünür.",
    vaultEmptyCta: "İlk belgenizi yükleyin",
  },
  de: {
    readyToHandOver: "übergabebereit",
    signature: {
      not_required: "Keine Unterschrift nötig",
      sent: "Zur Unterschrift gesendet",
      signed: "Unterschrieben",
      blocked: "Angehalten",
    },
    storageDuration: {
      legal: "Langfristig aufbewahrt (rechtlich)",
      finance: "Für die Buchhaltung aufbewahrt",
      service: "Für Serviceunterlagen aufbewahrt",
      guest: "Kurzfristig aufbewahrt (Gast)",
    },
    retentionFieldLabel: "Wie lange wir sie aufbewahren",
    retentionFieldHelp: "Legt fest, wie lange die Datei nach Abschluss des Vorgangs gespeichert bleibt.",
    packetOpen: "Paket öffnen",
    packetClose: "Paket schließen",
    packetDetailTitle: "Paketdetails",
    packetAudience: "Für wen",
    packetRelated: "Verknüpft mit",
    packetProgress: "Fertige Dokumente",
    packetStorage: "Wie lange wir sie aufbewahren",
    packetSignature: "Unterschriften",
    packetStatus: "Status",
    packetNext: "Nächster Schritt",
    vaultEmptyTitle: "Noch keine Dokumente",
    vaultEmptyBodyUpload: "Laden Sie Ihr erstes Dokument hoch, um den sicheren Tresor zu starten.",
    vaultEmptyBodyView: "Mit Ihrem Datensatz verknüpfte Dokumente erscheinen hier, sobald sie hinzugefügt werden.",
    vaultEmptyCta: "Erstes Dokument hochladen",
  },
  ru: {
    readyToHandOver: "готово к передаче",
    signature: {
      not_required: "Подпись не требуется",
      sent: "Отправлено на подпись",
      signed: "Подписано",
      blocked: "Приостановлено",
    },
    storageDuration: {
      legal: "Хранится долго (юридически)",
      finance: "Хранится для бухгалтерии",
      service: "Хранится для сервисных записей",
      guest: "Хранится недолго (гость)",
    },
    retentionFieldLabel: "Как долго мы храним",
    retentionFieldHelp: "Определяет, как долго файл хранится после закрытия дела.",
    packetOpen: "Открыть пакет",
    packetClose: "Закрыть пакет",
    packetDetailTitle: "Детали пакета",
    packetAudience: "Для кого",
    packetRelated: "Связано с",
    packetProgress: "Готовые документы",
    packetStorage: "Как долго мы храним",
    packetSignature: "Подписи",
    packetStatus: "Статус",
    packetNext: "Следующий шаг",
    vaultEmptyTitle: "Документов пока нет",
    vaultEmptyBodyUpload: "Загрузите первый документ, чтобы начать защищённое хранилище.",
    vaultEmptyBodyView: "Документы, связанные с вашей записью, появятся здесь после добавления.",
    vaultEmptyCta: "Загрузить первый документ",
  },
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

function formatUploadSize(sizeBytes: unknown) {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) return "-"
  if (sizeBytes >= 1024 * 1024) return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
  if (sizeBytes >= 1024) return `${Math.ceil(sizeBytes / 1024)} KB`
  return `${sizeBytes} B`
}

function uploadString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : ""
}

function uploadCategory(value: unknown): DocumentVaultRecord["category"] {
  const category = uploadString(value)
  return uploadCategories.includes(category as DocumentVaultRecord["category"])
    ? (category as DocumentVaultRecord["category"])
    : "Uyum"
}

function DocumentUploadPanel({
  role,
  onUploaded,
  t,
  locale,
}: {
  role: Role
  onUploaded: (document: DocumentVaultRecord) => void
  t: (value: string) => string
  locale: DashboardLocale
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

      // F11: Pre-Flight-Größencheck - übergroße Dateien sofort klar ablehnen,
      // statt am Plattform-Limit mit kryptischem Fehler zu scheitern.
      const selectedFile = formData.get("file")
      if (selectedFile instanceof File && selectedFile.size > MAX_UPLOAD_BYTES) {
        setState("error")
        setMessage(
          t("Dosya çok büyük veya yükleme sınırı aşıldı. Lütfen daha küçük bir dosya seçin.")
        )
        return
      }

      const response = await fetch("/api/site-management/document-uploads", {
        method: "POST",
        body: formData,
      })

      // F11: Antwort defensiv lesen - erst Status/Content-Type prüfen, dann JSON
      // parsen. Ein Nicht-JSON-Body (z. B. Plattform-413 "Request Entity Too
      // Large") darf nicht in einen kryptischen JSON.parse-Fehler laufen.
      const contentType = response.headers.get("content-type") ?? ""
      if (!response.ok || !contentType.includes("application/json")) {
        if (response.status === 413) {
          throw new Error(
            t("Dosya çok büyük veya yükleme sınırı aşıldı. Lütfen daha küçük bir dosya seçin.")
          )
        }
        // Nur die eigene JSON-Fehlerantwort der App anzeigen; einen rohen
        // Nicht-JSON-Body (z. B. Proxy/Gateway-HTML bei 5xx) NIE ins UI
        // durchreichen, sondern generisch lokalisiert melden.
        if (contentType.includes("application/json")) {
          let serverMessage = ""
          try {
            serverMessage = String(((await response.json()) as { error?: unknown })?.error ?? "")
          } catch {
            serverMessage = ""
          }
          throw new Error(serverMessage.slice(0, 200) || t("Yükleme başarısız."))
        }
        throw new Error(t("Yükleme başarısız."))
      }

      const payload = await response.json()

      const upload = payload.upload && typeof payload.upload === "object"
        ? (payload.upload as Record<string, unknown>)
        : {}
      const title = uploadString(upload.title) || uploadString(formData.get("title"))
      const originalFilename = uploadString(upload.originalFilename) || fileName || t("Document")
      const flatNumber = uploadString(formData.get("flatNumber")) || "-"

      setState("success")
      setMessage(
        `${originalFilename} ${t("saved for review")} (${payload.storageMode}).`
      )
      form.reset()
      setFileName("")
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      onUploaded({
        id: uploadString(upload.id) || `UPLOAD-${Date.now()}`,
        flatNumber,
        ownerName: "İnceleme ekibi",
        name: title || originalFilename,
        category: uploadCategory(upload.category || formData.get("category")),
        status: "pending",
        size: formatUploadSize(upload.sizeBytes),
        updatedAt: new Date().toISOString().slice(0, 10),
        retentionRule: `OCR / insan onayı gerekli: ${originalFilename}`,
      })
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
                    {t(category)}
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
            {isClientRole(role) ? (
              // Owner/tenant uploads never ask for data-governance jargon; the
              // retention class is defaulted server-side (see document-storage).
              <input type="hidden" name="retentionClass" value="general" />
            ) : (
              <label className="text-xs font-semibold text-muted-foreground">
                {docsCopy[locale].retentionFieldLabel}
                <select
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-primary"
                  name="retentionClass"
                  defaultValue={role === "staff" ? "service" : "general"}
                >
                  {retentionOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {t(option.label)}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-[11px] font-medium leading-4 text-muted-foreground/80">
                  {docsCopy[locale].retentionFieldHelp}
                </span>
              </label>
            )}
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

type DocumentAvailabilityState = "checking" | "available" | "missing"
type DocumentFileActionRecord = Pick<
  DocumentVaultRecord,
  "id" | "flatNumber" | "name" | "status" | "storagePath" | "sourcePath"
> & {
  category: string
}

function DocumentFileActions({
  document,
  role,
  t,
}: {
  document: DocumentFileActionRecord
  role: Role
  t: (value: string) => string
}) {
  const hasCandidateFile =
    document.status === "verified" &&
    Boolean(document.storagePath || document.sourcePath)
  const [availability, setAvailability] = useState<DocumentAvailabilityState>(
    hasCandidateFile ? "checking" : "missing"
  )
  const fileUrl = `/api/site-management/documents/${encodeURIComponent(document.id)}/file`
  const unavailableLabel =
    availability === "checking"
      ? t("Dosya kontrol ediliyor")
      : t("Dosya henüz bağlı değil")

  useEffect(() => {
    if (!hasCandidateFile) {
      return undefined
    }

    const controller = new AbortController()

    async function checkAvailability() {
      try {
        const response = await fetch(`${fileUrl}?mode=availability`, {
          signal: controller.signal,
        })
        const payload = (await response.json().catch(() => ({}))) as {
          available?: unknown
        }

        if (!controller.signal.aborted) {
          setAvailability(response.ok && payload.available === true ? "available" : "missing")
        }
      } catch {
        if (!controller.signal.aborted) {
          setAvailability("missing")
        }
      }
    }

    void checkAvailability()

    return () => controller.abort()
  }, [fileUrl, hasCandidateFile])

  if (availability !== "available") {
    return (
      <span title={unavailableLabel}>
        <DashboardActionMenu
          compact
          label={t("Belge aksiyonlari")}
          ariaLabel={`${document.id} ${unavailableLabel}`}
          items={[
            {
              key: "missing-file",
              label: unavailableLabel,
              actionType: "document.file.unavailable",
              disabled: true,
            },
          ]}
        />
      </span>
    )
  }

  return (
    <DashboardActionMenu
      compact
      label={t("Belge aksiyonlari")}
      ariaLabel={`${document.id} ${t("Belge aksiyonlari")}`}
      items={[
        {
          key: "view",
          label: t("Belgeyi goruntule"),
          icon: <Eye />,
          href: fileUrl,
          target: "_blank",
          actionType: "document.view.requested",
          ariaLabel: t("Belgeyi goruntule"),
          entityTable: "documents",
          entityExternalId: document.id,
          title: document.name,
          metadata: {
            flatNumber: document.flatNumber,
            category: document.category,
            role,
            fileAvailable: true,
          },
        },
        {
          key: "download",
          label: t("Belgeyi indir"),
          icon: <Download />,
          href: `${fileUrl}?disposition=attachment`,
          download: true,
          actionType: "document.download.requested",
          ariaLabel: t("Belgeyi indir"),
          entityTable: "documents",
          entityExternalId: document.id,
          title: document.name,
          metadata: {
            flatNumber: document.flatNumber,
            category: document.category,
            role,
            fileAvailable: true,
          },
        },
      ]}
    />
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
  const [pendingUploads, setPendingUploads] = useState<DocumentVaultRecord[]>([])
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(null)
  const baseVisibleDocuments = visibleDocumentsForRole(user.role, documentVault)
  const visibleDocuments = pendingUploads.length > 0
    ? [...pendingUploads, ...baseVisibleDocuments]
    : baseVisibleDocuments
  const visiblePackets = visibleDocumentPacketsForRole(user.role, documentPackets)
  const selectedPacket = visiblePackets.find((packet) => packet.id === selectedPacketId) ?? null
  const baseSummary = restrictedView ? summarizeDocuments(baseVisibleDocuments) : getDocumentSummary()
  const summary = pendingUploads.length > 0
    ? {
        ...baseSummary,
        total: baseSummary.total + pendingUploads.length,
        pending: baseSummary.pending + pendingUploads.length,
      }
    : baseSummary
  const packetSummary = getDocumentPacketSummary()
  const purchaseSummary = getPurchaseChecklistSummary()
  const localizeRetentionRule = (rule: string) => {
    const sourcePrefix = "Kaynak: "
    const ocrPrefix = "OCR / insan onayı gerekli: "

    if (rule.startsWith(sourcePrefix)) return `${t("Kaynak")}: ${rule.slice(sourcePrefix.length)}`
    if (rule.startsWith(ocrPrefix)) return `${t("OCR / insan onayı gerekli")}: ${rule.slice(ocrPrefix.length)}`
    return t(rule)
  }
  const localizeDocumentOwner = (ownerName: string) => {
    if (ownerName !== "İnceleme ekibi") return ownerName
    return {
      tr: "İnceleme ekibi",
      en: "Review team",
      de: "Prüfungsteam",
      ru: "Команда проверки",
    }[locale]
  }
  const localizedVisibleDocuments = visibleDocuments.map((document) => ({
    ...document,
    ownerName: localizeDocumentOwner(document.ownerName),
    category: t(document.category),
    retentionRule: localizeRetentionRule(document.retentionRule),
  }))
  const localizedVisiblePackets = visiblePackets.map((packet) => ({
    ...packet,
    title: t(packet.title),
    audience: t(packet.audience),
    retentionClass: t(packet.retentionClass),
    nextAction: t(packet.nextAction),
  }))
  const localizedPurchaseChecklist = purchaseChecklist.map((document) => ({
    ...document,
    documentType: t(document.documentType),
    owner: t(document.owner),
    risk: t(document.risk),
    nextAction: t(document.nextAction),
  }))

  const pageIntro = clientView
    ? t("Yetkili dairenize bağlı sözleşme, kimlik, depozito, servis ve uyum belgelerini güvenli portal görünümünde takip edin.")
    : fieldView
      ? t("Saha operasyonu için yalnızca görev dosyaları, servis kanıtları ve gerekli onay kayıtları gösterilir.")
      : {
          tr: `${clientProfile.clientName} satış ve after-sales süreci için TAPU, kimlik, sözleşme, ödeme, depozito, servis, uyum ve proje belgelerini güvenli, denetlenebilir ve işlem bağlantılı yönetin.`,
          en: `Manage title deeds, identity, contract, payment, deposit, service, compliance and project documents for ${clientProfile.clientName} sales and after-sales in a secure audited workflow.`,
          de: `Verwalten Sie Eigentumsurkunden, Identitäts-, Vertrags-, Zahlungs-, Kautions-, Service-, Compliance- und Projektdokumente für Vertrieb und After-Sales von ${clientProfile.clientName} in einem sicheren, auditierbaren Ablauf.`,
          ru: `Управляйте свидетельствами о собственности, документами личности, договорами, оплатами, депозитами, сервисом, соответствием и проектными файлами для продаж и after-sales ${clientProfile.clientName} в защищенном аудируемом процессе.`,
        }[locale]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground">{t("TAPU & Belge Kasası")}</h1>
            <FeatureInfo featureKey="documents" side="bottom" />
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
        </div>
        <DashboardActionMenu
          label={t("Aksiyonlar")}
          ariaLabel={t("Belge sayfasi aksiyonlari")}
          items={[
            {
              key: "upload",
              label: t("Belge yukle"),
              description: t("Yukleme talebi denetim kaydina eklenir."),
              icon: <UploadCloud />,
              actionType: "document.upload.requested",
              ariaLabel: t("Belge yukle"),
              entityTable: "documents",
              title: "Document upload requested",
              metadata: { source: "documents-page", role: user.role },
            },
          ]}
        />
      </div>

      {canUpload ? (
        <div id="document-upload-panel">
          <DocumentUploadPanel
            role={user.role}
            t={t}
            locale={locale}
            onUploaded={(document) =>
              setPendingUploads((current) => [
                document,
                ...current.filter((item) => item.id !== document.id),
              ])
            }
          />
        </div>
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
              <h2 className="text-sm font-bold text-card-foreground">{t("Document packet board")}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Move-in, checkout, owner statement, KYC/TAPU and service-proof packets track required files, signatures, retention and next action.")}
            </p>
          </div>
          <StatusBadge variant={packetSummary.missingOrReview > 0 ? "warning" : "success"}>
            {packetSummary.completionRate}% {docsCopy[locale].readyToHandOver}
          </StatusBadge>
        </div>
        <DataTable
          data={localizedVisiblePackets}
          pageSize={8}
          searchValue={(packet) => `${packet.id} ${packet.title} ${packet.audience} ${packet.relatedEntity} ${packet.retentionClass} ${packet.nextAction}`}
          columns={[
            { key: "id", header: t("Packet"), sortable: true, render: (packet) => packet.id },
            { key: "title", header: t("Title"), render: (packet) => packet.title },
            { key: "audience", header: t("Audience"), sortable: true, render: (packet) => packet.audience },
            { key: "related", header: t("Related"), render: (packet) => packet.relatedEntity },
            {
              key: "progress",
              header: t("Progress"),
              sortable: true,
              sortValue: (packet) => packet.completedDocuments / Math.max(packet.requiredDocuments, 1),
              render: (packet) => `${packet.completedDocuments}/${packet.requiredDocuments}`,
            },
            {
              key: "status",
              header: t("Status"),
              render: (packet) => <StatusBadge variant={packetVariant(packet.status)}>{t(packet.status)}</StatusBadge>,
            },
            {
              key: "signature",
              header: docsCopy[locale].packetSignature,
              render: (packet) => (
                <StatusBadge variant={signatureVariant(packet.signatureStatus)}>
                  {docsCopy[locale].signature[packet.signatureStatus]}
                </StatusBadge>
              ),
            },
            { key: "next", header: t("Next action"), render: (packet) => packet.nextAction },
            {
              key: "actions",
              header: t("Action"),
              headerClassName: "text-right",
              cellClassName: "text-right",
              render: (packet) => {
                const open = packet.id === selectedPacketId
                return (
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setSelectedPacketId(open ? null : packet.id)}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-xs font-black text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                  >
                    <FolderOpen className="h-3.5 w-3.5" aria-hidden="true" />
                    {open ? docsCopy[locale].packetClose : docsCopy[locale].packetOpen}
                  </button>
                )
              },
            },
          ]}
        />

        {selectedPacket ? (
          <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    {docsCopy[locale].packetDetailTitle}
                  </p>
                  <h3 className="mt-0.5 text-sm font-black text-foreground">{t(selectedPacket.title)}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPacketId(null)}
                className="inline-flex min-h-9 items-center rounded-lg border border-border bg-card px-3 py-2 text-xs font-black text-foreground shadow-sm transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
              >
                {docsCopy[locale].packetClose}
              </button>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetAudience}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{t(selectedPacket.audience)}</dd>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetRelated}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">{selectedPacket.relatedEntity}</dd>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetProgress}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {selectedPacket.completedDocuments}/{selectedPacket.requiredDocuments}
                </dd>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetStatus}</dt>
                <dd className="mt-1">
                  <StatusBadge variant={packetVariant(selectedPacket.status)}>{t(selectedPacket.status)}</StatusBadge>
                </dd>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetSignature}</dt>
                <dd className="mt-1">
                  <StatusBadge variant={signatureVariant(selectedPacket.signatureStatus)}>
                    {docsCopy[locale].signature[selectedPacket.signatureStatus]}
                  </StatusBadge>
                </dd>
              </div>
              <div className="rounded-lg bg-background/70 p-3">
                <dt className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetStorage}</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {docsCopy[locale].storageDuration[selectedPacket.retentionClass]}
                </dd>
              </div>
            </dl>
            <div className="mt-3 rounded-lg bg-muted/50 p-3">
              <p className="text-[11px] font-bold uppercase text-muted-foreground">{docsCopy[locale].packetNext}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{t(selectedPacket.nextAction)}</p>
            </div>
          </div>
        ) : null}
      </Card3D>

      <div className="grid gap-4 lg:grid-cols-3">
        {localizedVisibleDocuments.slice(0, 3).map((document) => (
          <Card3D key={document.id} glow={false}>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <StatusBadge variant={documentVariant(document.status)}>
                  {documentLabel(document.status, t)}
                </StatusBadge>
                <h2 className="mt-2 line-clamp-2 text-sm font-bold text-card-foreground">
                  {t(document.name)}
                </h2>
                <p className="mt-1 text-xs font-medium text-muted-foreground">{document.category}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground/80">
                  {document.retentionRule}
                </p>
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
                  {t("Satış dosyası, TAPU, KYC ve EIDS kontrolü")}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Satış dosyası; alıcı kimliği, TAPU, EIDS, rezervasyon, satış sözleşmesi ve ödeme planı olmadan sonraki adıma geçmez.")}
              </p>
            </div>
            <StatusBadge variant={purchaseSummary.highRisk > 0 ? "danger" : "success"}>
              {purchaseSummary.highRisk} {t("yüksek risk")}
            </StatusBadge>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Satış belgesi")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.total}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Doğrulandı")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.verified}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Bekliyor")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.pending}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Eksik")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{purchaseSummary.missing}</p>
            </div>
          </div>
          <DataTable
            data={localizedPurchaseChecklist}
            pageSize={6}
            searchValue={(document) =>
              `${document.id} ${document.dealName} ${document.buyerName} ${document.documentType} ${document.nextAction}`
            }
            columns={[
              { key: "id", header: t("Kontrol"), sortable: true, render: (document) => document.id },
              { key: "deal", header: t("Deal"), render: (document) => document.dealName },
              { key: "buyer", header: t("Alıcı"), render: (document) => document.buyerName },
              { key: "type", header: t("Belge tipi"), sortable: true, render: (document) => document.documentType },
              { key: "owner", header: t("Sorumlu"), render: (document) => document.owner },
              {
                key: "status",
                header: t("Durum"),
                render: (document) => (
                  <StatusBadge variant={checklistVariant(document.status)}>
                    {checklistLabel(document.status, t)}
                  </StatusBadge>
                ),
              },
              {
                key: "risk",
                header: t("Risk"),
                render: (document) => (
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" />
                    {document.risk}
                  </span>
                ),
              },
              { key: "next", header: t("Sonraki aksiyon"), render: (document) => document.nextAction },
            ]}
          />
        </Card3D>
      )}

      {localizedVisibleDocuments.length === 0 ? (
        <Card3D glow={false}>
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Inbox className="mx-auto h-10 w-10 text-muted-foreground" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-black text-foreground">{docsCopy[locale].vaultEmptyTitle}</h2>
            <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-muted-foreground">
              {canUpload ? docsCopy[locale].vaultEmptyBodyUpload : docsCopy[locale].vaultEmptyBodyView}
            </p>
            {canUpload ? (
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("document-upload-panel")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              >
                <UploadCloud className="h-4 w-4" />
                {docsCopy[locale].vaultEmptyCta}
              </button>
            ) : null}
          </div>
        </Card3D>
      ) : (
      <DataTable
        data={localizedVisibleDocuments}
        searchValue={(document) =>
          `${document.id} ${document.flatNumber} ${document.ownerName} ${document.name} ${document.category}`
        }
        columns={[
          { key: "id", header: t("Belge"), sortable: true, render: (document) => document.id },
          { key: "flat", header: t("Daire"), sortable: true, render: (document) => document.flatNumber },
          ...(!clientView
            ? [
                {
                  key: "owner",
                  header: fieldView ? t("Kapsam") : t("Malik"),
                  render: (document: (typeof localizedVisibleDocuments)[number]) => document.ownerName,
                },
              ]
            : []),
          { key: "name", header: t("Dosya"), render: (document) => document.name },
          { key: "category", header: t("Kategori"), sortable: true, render: (document) => document.category },
          {
            key: "status",
            header: t("Durum"),
            render: (document) => (
              <StatusBadge variant={documentVariant(document.status)}>
                {documentLabel(document.status, t)}
              </StatusBadge>
            ),
          },
          { key: "retention", header: t("Kural"), render: (document) => document.retentionRule },
          {
            key: "actions",
            header: t("İşlem"),
            headerClassName: "text-right",
            cellClassName: "text-right",
            render: (document) => (
              <DocumentFileActions document={document} role={user.role} t={t} />
            ),
          },
        ]}
      />
      )}
    </div>
  )
}
