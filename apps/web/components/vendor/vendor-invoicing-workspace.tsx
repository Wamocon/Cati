"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  Send,
  Trash2,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { ComingSoon } from "@/components/coming-soon"
import { FeatureInfo } from "@/components/feature-info"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  VendorInvoiceView,
  VendorJob,
  VendorWorkspace,
} from "@/lib/vendor-invoice-repository"
import type { VendorSubmissionStatus } from "@/lib/vendor-invoice-data"

// ---------------------------------------------------------------------------
// Locale copy. Self-contained (like wallet-overview.tsx / guest-home) so this new
// surface does not thread page-level strings through messages/*.json. No backend
// or provider names appear here.
// ---------------------------------------------------------------------------

export type VendorLocale = "tr" | "en" | "de" | "ru"

const intlLocales: Record<VendorLocale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
}

export function resolveVendorLocale(value: string): VendorLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface VendorCopy {
  title: string
  subtitle: string
  refresh: string
  refreshing: string
  loading: string
  loadError: string
  retry: string
  notLinkedTitle: string
  notLinkedBody: string
  metricJobs: string
  metricInvoices: string
  metricPending: string
  metricApproved: string
  metricTotal: string
  jobsTitle: string
  jobsEmpty: string
  billJob: string
  quoted: string
  formTitle: string
  invoiceNoLabel: string
  invoiceNoPlaceholder: string
  dueLabel: string
  linkedJob: string
  noLinkedJob: string
  lineDescription: string
  lineDescriptionPlaceholder: string
  lineQty: string
  lineUnitPrice: string
  lineTax: string
  addLine: string
  removeLine: string
  subtotal: string
  tax: string
  total: string
  review: string
  confirmTitle: string
  confirmBody: string
  confirm: string
  cancel: string
  submitting: string
  submitSuccess: string
  submitError: string
  invoicesTitle: string
  invoicesEmpty: string
  colInvoiceNo: string
  colTotal: string
  colStatus: string
  colIssued: string
  colDue: string
  colEfatura: string
  efaturaPending: string
  status: Record<VendorSubmissionStatus, string>
}

const vendorCopy: Record<VendorLocale, VendorCopy> = {
  en: {
    title: "Invoicing",
    subtitle: "Issue invoices for the work assigned to you and track their status.",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    loading: "Loading your workspace…",
    loadError: "Your workspace could not be loaded.",
    retry: "Try again",
    notLinkedTitle: "No vendor is linked to your account",
    notLinkedBody:
      "Ask an administrator to link your account to a vendor profile before issuing invoices.",
    metricJobs: "Assigned jobs",
    metricInvoices: "Invoices",
    metricPending: "Awaiting review",
    metricApproved: "Approved",
    metricTotal: "Total invoiced",
    jobsTitle: "My assigned jobs",
    jobsEmpty: "No jobs are assigned to you yet.",
    billJob: "Bill this job",
    quoted: "Quoted",
    formTitle: "Issue an invoice",
    invoiceNoLabel: "Invoice number",
    invoiceNoPlaceholder: "e.g. SPV-2405",
    dueLabel: "Due date (optional)",
    linkedJob: "Linked job",
    noLinkedJob: "No linked job",
    lineDescription: "Description",
    lineDescriptionPlaceholder: "Work or item",
    lineQty: "Qty",
    lineUnitPrice: "Unit price",
    lineTax: "VAT %",
    addLine: "Add line",
    removeLine: "Remove line",
    subtotal: "Subtotal",
    tax: "VAT",
    total: "Total",
    review: "Review invoice",
    confirmTitle: "Submit this invoice?",
    confirmBody: "Invoice {no} for {total} will be submitted for review.",
    confirm: "Submit invoice",
    cancel: "Cancel",
    submitting: "Submitting…",
    submitSuccess: "Invoice submitted for review.",
    submitError: "The invoice could not be submitted. Review the details and try again.",
    invoicesTitle: "My invoices",
    invoicesEmpty: "You have not issued any invoices yet.",
    colInvoiceNo: "Invoice",
    colTotal: "Total",
    colStatus: "Status",
    colIssued: "Issued",
    colDue: "Due",
    colEfatura: "e-Fatura",
    efaturaPending: "Not issued",
    status: {
      draft: "Draft",
      submitted: "Submitted",
      in_review: "In review",
      approved: "Approved",
      declined: "Declined",
    },
  },
  tr: {
    title: "Faturalandırma",
    subtitle: "Size atanan işler için fatura kesin ve durumlarını takip edin.",
    refresh: "Yenile",
    refreshing: "Yenileniyor…",
    loading: "Çalışma alanınız yükleniyor…",
    loadError: "Çalışma alanınız yüklenemedi.",
    retry: "Tekrar dene",
    notLinkedTitle: "Hesabınıza bağlı bir tedarikçi yok",
    notLinkedBody:
      "Fatura kesmeden önce bir yöneticiden hesabınızı bir tedarikçi profiline bağlamasını isteyin.",
    metricJobs: "Atanan işler",
    metricInvoices: "Faturalar",
    metricPending: "İnceleme bekliyor",
    metricApproved: "Onaylandı",
    metricTotal: "Toplam fatura",
    jobsTitle: "Atanan işlerim",
    jobsEmpty: "Henüz size atanmış iş yok.",
    billJob: "Bu işi faturalandır",
    quoted: "Teklif",
    formTitle: "Fatura kes",
    invoiceNoLabel: "Fatura numarası",
    invoiceNoPlaceholder: "örn. SPV-2405",
    dueLabel: "Vade tarihi (isteğe bağlı)",
    linkedJob: "Bağlı iş",
    noLinkedJob: "Bağlı iş yok",
    lineDescription: "Açıklama",
    lineDescriptionPlaceholder: "İş veya kalem",
    lineQty: "Adet",
    lineUnitPrice: "Birim fiyat",
    lineTax: "KDV %",
    addLine: "Satır ekle",
    removeLine: "Satırı kaldır",
    subtotal: "Ara toplam",
    tax: "KDV",
    total: "Toplam",
    review: "Faturayı gözden geçir",
    confirmTitle: "Bu fatura gönderilsin mi?",
    confirmBody: "{no} numaralı {total} tutarındaki fatura incelemeye gönderilecek.",
    confirm: "Faturayı gönder",
    cancel: "Vazgeç",
    submitting: "Gönderiliyor…",
    submitSuccess: "Fatura incelemeye gönderildi.",
    submitError: "Fatura gönderilemedi. Bilgileri kontrol edip tekrar deneyin.",
    invoicesTitle: "Faturalarım",
    invoicesEmpty: "Henüz fatura kesmediniz.",
    colInvoiceNo: "Fatura",
    colTotal: "Toplam",
    colStatus: "Durum",
    colIssued: "Kesim",
    colDue: "Vade",
    colEfatura: "e-Fatura",
    efaturaPending: "Kesilmedi",
    status: {
      draft: "Taslak",
      submitted: "Gönderildi",
      in_review: "İncelemede",
      approved: "Onaylandı",
      declined: "Reddedildi",
    },
  },
  de: {
    title: "Rechnungsstellung",
    subtitle:
      "Stellen Sie Rechnungen für die Ihnen zugewiesenen Arbeiten und verfolgen Sie ihren Status.",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    loading: "Ihr Arbeitsbereich wird geladen…",
    loadError: "Ihr Arbeitsbereich konnte nicht geladen werden.",
    retry: "Erneut versuchen",
    notLinkedTitle: "Ihrem Konto ist kein Anbieter zugeordnet",
    notLinkedBody:
      "Bitten Sie einen Administrator, Ihr Konto mit einem Anbieterprofil zu verknüpfen, bevor Sie Rechnungen stellen.",
    metricJobs: "Zugewiesene Aufträge",
    metricInvoices: "Rechnungen",
    metricPending: "Wartet auf Prüfung",
    metricApproved: "Genehmigt",
    metricTotal: "Gesamt fakturiert",
    jobsTitle: "Meine zugewiesenen Aufträge",
    jobsEmpty: "Ihnen sind noch keine Aufträge zugewiesen.",
    billJob: "Auftrag abrechnen",
    quoted: "Angebot",
    formTitle: "Rechnung stellen",
    invoiceNoLabel: "Rechnungsnummer",
    invoiceNoPlaceholder: "z. B. SPV-2405",
    dueLabel: "Fälligkeitsdatum (optional)",
    linkedJob: "Verknüpfter Auftrag",
    noLinkedJob: "Kein verknüpfter Auftrag",
    lineDescription: "Beschreibung",
    lineDescriptionPlaceholder: "Arbeit oder Position",
    lineQty: "Menge",
    lineUnitPrice: "Einzelpreis",
    lineTax: "MwSt. %",
    addLine: "Position hinzufügen",
    removeLine: "Position entfernen",
    subtotal: "Zwischensumme",
    tax: "MwSt.",
    total: "Gesamt",
    review: "Rechnung prüfen",
    confirmTitle: "Diese Rechnung einreichen?",
    confirmBody: "Rechnung {no} über {total} wird zur Prüfung eingereicht.",
    confirm: "Rechnung einreichen",
    cancel: "Abbrechen",
    submitting: "Wird eingereicht…",
    submitSuccess: "Rechnung zur Prüfung eingereicht.",
    submitError:
      "Die Rechnung konnte nicht eingereicht werden. Prüfen Sie die Angaben und versuchen Sie es erneut.",
    invoicesTitle: "Meine Rechnungen",
    invoicesEmpty: "Sie haben noch keine Rechnungen gestellt.",
    colInvoiceNo: "Rechnung",
    colTotal: "Gesamt",
    colStatus: "Status",
    colIssued: "Ausgestellt",
    colDue: "Fällig",
    colEfatura: "e-Fatura",
    efaturaPending: "Nicht ausgestellt",
    status: {
      draft: "Entwurf",
      submitted: "Eingereicht",
      in_review: "In Prüfung",
      approved: "Genehmigt",
      declined: "Abgelehnt",
    },
  },
  ru: {
    title: "Выставление счетов",
    subtitle: "Выставляйте счета за назначенные работы и отслеживайте их статус.",
    refresh: "Обновить",
    refreshing: "Обновление…",
    loading: "Загружаем ваше пространство…",
    loadError: "Не удалось загрузить пространство.",
    retry: "Повторить",
    notLinkedTitle: "К вашему аккаунту не привязан поставщик",
    notLinkedBody:
      "Попросите администратора привязать ваш аккаунт к профилю поставщика перед выставлением счетов.",
    metricJobs: "Назначенные работы",
    metricInvoices: "Счета",
    metricPending: "Ожидают проверки",
    metricApproved: "Одобрено",
    metricTotal: "Всего выставлено",
    jobsTitle: "Мои назначенные работы",
    jobsEmpty: "Вам ещё не назначены работы.",
    billJob: "Выставить счёт",
    quoted: "Оценка",
    formTitle: "Выставить счёт",
    invoiceNoLabel: "Номер счёта",
    invoiceNoPlaceholder: "напр. SPV-2405",
    dueLabel: "Срок оплаты (необязательно)",
    linkedJob: "Связанная работа",
    noLinkedJob: "Нет связанной работы",
    lineDescription: "Описание",
    lineDescriptionPlaceholder: "Работа или позиция",
    lineQty: "Кол-во",
    lineUnitPrice: "Цена за ед.",
    lineTax: "НДС %",
    addLine: "Добавить строку",
    removeLine: "Удалить строку",
    subtotal: "Промежуточный итог",
    tax: "НДС",
    total: "Итого",
    review: "Проверить счёт",
    confirmTitle: "Отправить этот счёт?",
    confirmBody: "Счёт {no} на сумму {total} будет отправлен на проверку.",
    confirm: "Отправить счёт",
    cancel: "Отмена",
    submitting: "Отправка…",
    submitSuccess: "Счёт отправлен на проверку.",
    submitError: "Не удалось отправить счёт. Проверьте данные и попробуйте снова.",
    invoicesTitle: "Мои счета",
    invoicesEmpty: "Вы ещё не выставляли счетов.",
    colInvoiceNo: "Счёт",
    colTotal: "Итого",
    colStatus: "Статус",
    colIssued: "Выставлен",
    colDue: "Срок",
    colEfatura: "e-Fatura",
    efaturaPending: "Не выставлен",
    status: {
      draft: "Черновик",
      submitted: "Отправлен",
      in_review: "На проверке",
      approved: "Одобрен",
      declined: "Отклонён",
    },
  },
}

// ---------------------------------------------------------------------------
// Submission-status pill (icon + tone). Reused by the vendor home snapshot.
// ---------------------------------------------------------------------------

const submissionMeta: Record<
  VendorSubmissionStatus,
  { icon: LucideIcon; className: string }
> = {
  draft: {
    icon: FileText,
    className: "border-border bg-muted/50 text-muted-foreground",
  },
  submitted: {
    icon: Send,
    className: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  in_review: {
    icon: Clock3,
    className:
      "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  approved: {
    icon: CheckCircle2,
    className:
      "border-teal-500/25 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  },
  declined: {
    icon: XCircle,
    className: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  },
}

export function SubmissionStatusPill({
  status,
  locale,
}: {
  status: VendorSubmissionStatus
  locale: VendorLocale
}) {
  const meta = submissionMeta[status]
  const Icon = meta.icon
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-black",
        meta.className
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {vendorCopy[locale].status[status]}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newIdempotencyKey(prefix: string) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

/** Mirror of the server price parser; allows zero. Returns integer minor units
 * or null. Used only for the live preview; the server remains the authority. */
function parsePriceToCents(value: string): number | null {
  const amount = value.trim().replace(",", ".")
  if (amount === "") return 0
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/.exec(amount)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0")
  const cents = whole * 100 + fraction
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1_000_000_000_000) {
    return null
  }
  return cents
}

function parseQuantity(value: string): number | null {
  const raw = value.trim().replace(",", ".")
  if (raw === "") return null
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000) return null
  return parsed
}

function parseTaxRate(value: string): number | null {
  const raw = value.trim().replace(",", ".")
  if (raw === "") return 0
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) return null
  return parsed
}

function formatDate(value: string | null, locale: VendorLocale) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function apiErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback
}

interface LineDraft {
  key: string
  description: string
  quantity: string
  unitPrice: string
  taxRate: string
}

function emptyLine(): LineDraft {
  return {
    key: newIdempotencyKey("line"),
    description: "",
    quantity: "1",
    unitPrice: "",
    taxRate: "20",
  }
}

interface LineTotals {
  subtotalCents: number
  taxCents: number
  totalCents: number
  valid: boolean
}

function computeTotals(lines: LineDraft[]): LineTotals {
  let subtotalCents = 0
  let taxCents = 0
  let valid = true
  for (const line of lines) {
    const qty = parseQuantity(line.quantity)
    const unit = parsePriceToCents(line.unitPrice)
    const rate = parseTaxRate(line.taxRate)
    if (qty === null || unit === null || rate === null) {
      valid = false
      continue
    }
    const net = Math.round(qty * unit)
    subtotalCents += net
    taxCents += Math.round((net * rate) / 100)
  }
  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    valid: valid && subtotalCents > 0,
  }
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

type RequestState = "loading" | "success" | "error"
type MutationState = "idle" | "saving" | "success" | "error"

export function VendorInvoicingWorkspace() {
  const locale = resolveVendorLocale(useLocale())
  const text = vendorCopy[locale]
  const [data, setData] = useState<VendorWorkspace | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const requestSequence = useRef(0)

  const [invoiceNo, setInvoiceNo] = useState("")
  const [dueAt, setDueAt] = useState("")
  const [linkedJob, setLinkedJob] = useState<VendorJob | null>(null)
  const [lines, setLines] = useState<LineDraft[]>(() => [emptyLine()])
  const [stage, setStage] = useState<"idle" | "confirm">("idle")
  const [mutationState, setMutationState] = useState<MutationState>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const submitKey = useRef<string | null>(null)

  const fetchWorkspace = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const response = await fetch("/api/site-management/vendor-invoices?limit=50", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("Vendor workspace failed.")
      const payload = (await response.json()) as VendorWorkspace
      if (sequence !== requestSequence.current) return
      setData(payload)
      setRequestState("success")
    } catch {
      if (sequence === requestSequence.current) setRequestState("error")
    } finally {
      if (sequence === requestSequence.current) setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => void fetchWorkspace(true), 0)
    return () => window.clearTimeout(handle)
  }, [fetchWorkspace])

  const totals = computeTotals(lines)
  const currency = data?.summary.currency ?? "TRY"
  const canReview =
    invoiceNo.trim().length > 0 && totals.valid && mutationState !== "saving"

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setMessage(null)
    setMutationState("idle")
    submitKey.current = null
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line))
    )
  }

  function addLine() {
    setLines((current) => [...current, emptyLine()])
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((line) => line.key !== key)
    )
  }

  function billJob(job: VendorJob) {
    setLinkedJob(job)
    setInvoiceNo((current) => current || `SPV-${job.orderNo ?? ""}`.replace(/-$/, ""))
    setLines([
      {
        key: newIdempotencyKey("line"),
        description: job.title ?? "",
        quantity: "1",
        unitPrice: (job.quotedPriceCents / 100).toString(),
        taxRate: "20",
      },
    ])
    setMessage(null)
    setMutationState("idle")
    setStage("idle")
    submitKey.current = null
    if (typeof document !== "undefined") {
      document
        .getElementById("vendor-invoice-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  function resetForm() {
    setInvoiceNo("")
    setDueAt("")
    setLinkedJob(null)
    setLines([emptyLine()])
    setStage("idle")
    setMutationState("idle")
    submitKey.current = null
  }

  async function confirmSubmit() {
    if (!canReview) return
    setMutationState("saving")
    setMessage(null)
    submitKey.current ??= newIdempotencyKey("vendor-invoice")
    try {
      const response = await fetch("/api/site-management/vendor-invoices", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          invoiceNo: invoiceNo.trim(),
          dueAt: dueAt || null,
          serviceOrderId: linkedJob?.id ?? null,
          idempotencyKey: submitKey.current,
          lines: lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
          })),
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) throw new Error(apiErrorMessage(payload, text.submitError))
      setMutationState("success")
      setMessage(text.submitSuccess)
      resetForm()
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      await fetchWorkspace()
    } catch (error) {
      setMutationState("error")
      setMessage(error instanceof Error ? error.message : text.submitError)
    }
  }

  if (requestState === "loading" && !data) {
    return (
      <div
        data-testid="vendor-invoicing-workspace"
        aria-busy="true"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
        <div className="mt-5 h-28 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (!data) {
    return (
      <div
        data-testid="vendor-invoicing-workspace"
        role="alert"
        className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-rose-700 dark:text-rose-300"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-black text-foreground">{text.loadError}</p>
            <button
              type="button"
              onClick={() => void fetchWorkspace(true)}
              className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-bold text-background outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {text.retry}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const canSubmit = data.capabilities.canSubmit && data.vendorLinked
  const metrics = [
    { label: text.metricJobs, value: String(data.summary.jobCount) },
    { label: text.metricInvoices, value: String(data.summary.invoiceCount) },
    { label: text.metricPending, value: String(data.summary.pendingCount) },
    { label: text.metricApproved, value: String(data.summary.approvedCount) },
    {
      label: text.metricTotal,
      value: formatDualFromCents(data.summary.totalInvoicedCents, currency),
    },
  ]

  return (
    <div
      data-testid="vendor-invoicing-workspace"
      aria-busy={refreshing || mutationState === "saving"}
      className="space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black text-foreground">{text.title}</h2>
            <FeatureInfo featureKey="vendor_invoices" side="bottom" />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{text.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchWorkspace()}
          disabled={refreshing}
          className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
            aria-hidden="true"
          />
          {refreshing ? text.refreshing : text.refresh}
        </button>
      </div>

      {!data.vendorLinked ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-800 dark:text-amber-200"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="font-black text-foreground">{text.notLinkedTitle}</p>
            <p className="mt-1 text-sm">{text.notLinkedBody}</p>
          </div>
        </div>
      ) : null}

      <section aria-label={text.title} className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-border bg-background/70 p-4"
          >
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              {metric.label}
            </p>
            <p className="mt-1 break-words text-lg font-black text-foreground">
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section aria-labelledby="vendor-jobs-heading" className="space-y-3">
          <h3
            id="vendor-jobs-heading"
            className="flex items-center gap-2 text-sm font-black text-foreground"
          >
            <Briefcase className="h-4 w-4 text-primary" aria-hidden="true" />
            {text.jobsTitle}
          </h3>
          {data.jobs.length ? (
            <ul data-testid="vendor-jobs-list" className="space-y-2">
              {data.jobs.map((job) => (
                <li key={job.id}>
                  <Card3D glow={false}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-[0.06em] text-muted-foreground">
                          {job.orderNo ?? "-"}
                        </p>
                        <p className="mt-1 text-sm font-bold text-card-foreground">
                          {job.title ?? "-"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {text.quoted}: {job.quotedLabel}
                        </p>
                      </div>
                      {canSubmit ? (
                        <button
                          type="button"
                          onClick={() => billJob(job)}
                          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary outline-none transition hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <ReceiptText className="h-3.5 w-3.5" aria-hidden="true" />
                          {text.billJob}
                        </button>
                      ) : null}
                    </div>
                  </Card3D>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {text.jobsEmpty}
            </p>
          )}
        </section>

        {canSubmit ? (
          <section
            id="vendor-invoice-form"
            aria-labelledby="vendor-invoice-form-heading"
            className="rounded-2xl border border-border bg-card p-4 shadow-sm"
          >
            <h3
              id="vendor-invoice-form-heading"
              className="flex items-center gap-2 text-sm font-black text-foreground"
            >
              <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
              {text.formTitle}
              <ComingSoon featureKey="e_invoice" variant="inline" />
            </h3>

            {message ? (
              <div
                role={mutationState === "error" ? "alert" : "status"}
                data-testid="vendor-invoice-message"
                className={cn(
                  "mt-3 rounded-xl border p-3 text-sm font-bold",
                  mutationState === "error"
                    ? "border-rose-500/25 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                    : "border-emerald-500/25 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                )}
              >
                {message}
              </div>
            ) : null}

            {stage === "idle" ? (
              <form
                data-testid="vendor-invoice-form-fields"
                className="mt-3 space-y-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (!canReview) {
                    setMessage(text.submitError)
                    setMutationState("error")
                    return
                  }
                  submitKey.current = newIdempotencyKey("vendor-invoice")
                  setMessage(null)
                  setMutationState("idle")
                  setStage("confirm")
                }}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="vendor-invoice-no"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      {text.invoiceNoLabel}
                    </label>
                    <input
                      id="vendor-invoice-no"
                      data-testid="vendor-invoice-no"
                      value={invoiceNo}
                      autoComplete="off"
                      placeholder={text.invoiceNoPlaceholder}
                      onChange={(event) => {
                        submitKey.current = null
                        setMessage(null)
                        setMutationState("idle")
                        setInvoiceNo(event.target.value)
                      }}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="vendor-invoice-due"
                      className="mb-1.5 block text-xs font-bold text-foreground"
                    >
                      {text.dueLabel}
                    </label>
                    <input
                      id="vendor-invoice-due"
                      type="date"
                      value={dueAt}
                      onChange={(event) => setDueAt(event.target.value)}
                      className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>

                <p className="text-xs font-semibold text-muted-foreground">
                  {text.linkedJob}:{" "}
                  <span className="text-foreground">
                    {linkedJob ? linkedJob.orderNo ?? linkedJob.title : text.noLinkedJob}
                  </span>
                </p>

                <div className="space-y-2">
                  {lines.map((line, index) => {
                    const lineNet =
                      (parseQuantity(line.quantity) ?? 0) *
                      (parsePriceToCents(line.unitPrice) ?? 0)
                    return (
                      <div
                        key={line.key}
                        className="rounded-xl border border-border bg-background/60 p-3"
                      >
                        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_5rem_7rem_5rem_auto] sm:items-end">
                          <div>
                            <label
                              htmlFor={`line-desc-${line.key}`}
                              className="mb-1 block text-[11px] font-bold text-muted-foreground"
                            >
                              {text.lineDescription}
                            </label>
                            <input
                              id={`line-desc-${line.key}`}
                              value={line.description}
                              autoComplete="off"
                              placeholder={text.lineDescriptionPlaceholder}
                              onChange={(event) =>
                                updateLine(line.key, { description: event.target.value })
                              }
                              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`line-qty-${line.key}`}
                              className="mb-1 block text-[11px] font-bold text-muted-foreground"
                            >
                              {text.lineQty}
                            </label>
                            <input
                              id={`line-qty-${line.key}`}
                              inputMode="decimal"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.key, { quantity: event.target.value })
                              }
                              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`line-price-${line.key}`}
                              className="mb-1 block text-[11px] font-bold text-muted-foreground"
                            >
                              {text.lineUnitPrice}
                            </label>
                            <input
                              id={`line-price-${line.key}`}
                              inputMode="decimal"
                              placeholder="0.00"
                              value={line.unitPrice}
                              onChange={(event) =>
                                updateLine(line.key, { unitPrice: event.target.value })
                              }
                              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <div>
                            <label
                              htmlFor={`line-tax-${line.key}`}
                              className="mb-1 block text-[11px] font-bold text-muted-foreground"
                            >
                              {text.lineTax}
                            </label>
                            <input
                              id={`line-tax-${line.key}`}
                              inputMode="decimal"
                              value={line.taxRate}
                              onChange={(event) =>
                                updateLine(line.key, { taxRate: event.target.value })
                              }
                              className="min-h-10 w-full rounded-lg border border-border bg-background px-2.5 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => removeLine(line.key)}
                            disabled={lines.length <= 1}
                            aria-label={`${text.removeLine} ${index + 1}`}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center self-end rounded-lg border border-border text-muted-foreground outline-none transition hover:bg-muted hover:text-rose-600 focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                        <p className="mt-1.5 text-right text-[11px] font-semibold text-muted-foreground">
                          {formatDualFromCents(Math.round(lineNet), currency)}
                        </p>
                      </div>
                    )
                  })}
                </div>

                <button
                  type="button"
                  onClick={addLine}
                  className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-xs font-black text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {text.addLine}
                </button>

                <dl className="space-y-1 rounded-xl border border-border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-muted-foreground">{text.subtotal}</dt>
                    <dd className="font-bold text-foreground">
                      {formatDualFromCents(totals.subtotalCents, currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="font-semibold text-muted-foreground">{text.tax}</dt>
                    <dd className="font-bold text-foreground">
                      {formatDualFromCents(totals.taxCents, currency)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-1">
                    <dt className="font-black text-foreground">{text.total}</dt>
                    <dd
                      data-testid="vendor-invoice-total"
                      className="font-black text-foreground"
                    >
                      {formatDualFromCents(totals.totalCents, currency)}
                    </dd>
                  </div>
                </dl>

                <button
                  type="submit"
                  data-testid="vendor-invoice-review"
                  disabled={!canReview}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {text.review}
                </button>
              </form>
            ) : (
              <div
                data-testid="vendor-invoice-confirm-panel"
                className="mt-3 space-y-3 rounded-xl border border-primary/25 bg-primary/[0.05] p-3"
              >
                <p className="text-sm font-bold text-foreground">{text.confirmTitle}</p>
                <p className="text-sm text-muted-foreground">
                  {text.confirmBody
                    .replace("{no}", invoiceNo.trim())
                    .replace(
                      "{total}",
                      formatDualFromCents(totals.totalCents, currency)
                    )}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    data-testid="vendor-invoice-submit"
                    onClick={() => void confirmSubmit()}
                    disabled={mutationState === "saving"}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
                  >
                    {mutationState === "saving" ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Send className="h-4 w-4" aria-hidden="true" />
                    )}
                    {mutationState === "saving" ? text.submitting : text.confirm}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStage("idle")}
                    disabled={mutationState === "saving"}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
                  >
                    {text.cancel}
                  </button>
                </div>
              </div>
            )}
          </section>
        ) : null}
      </div>

      <section aria-labelledby="vendor-invoices-heading" className="space-y-3">
        <h3
          id="vendor-invoices-heading"
          className="flex items-center gap-2 text-sm font-black text-foreground"
        >
          <ReceiptText className="h-4 w-4 text-primary" aria-hidden="true" />
          {text.invoicesTitle}
        </h3>
        {data.invoices.length ? (
          <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
            <table data-testid="vendor-invoices-table" className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-black uppercase tracking-[0.06em] text-muted-foreground">
                  <th className="px-4 py-3">{text.colInvoiceNo}</th>
                  <th className="px-4 py-3">{text.colTotal}</th>
                  <th className="px-4 py-3">{text.colStatus}</th>
                  <th className="px-4 py-3">{text.colIssued}</th>
                  <th className="px-4 py-3">{text.colDue}</th>
                  <th className="px-4 py-3">{text.colEfatura}</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice: VendorInvoiceView) => (
                  <tr key={invoice.id} className="border-b border-border/70 last:border-0">
                    <td className="px-4 py-3 font-black text-foreground">
                      {invoice.invoiceNo}
                    </td>
                    <td className="px-4 py-3 font-bold text-foreground">
                      {invoice.totalLabel}
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionStatusPill
                        status={invoice.submissionStatus}
                        locale={locale}
                      />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(invoice.issuedAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(invoice.dueAt, locale)}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-muted-foreground">
                      {invoice.externalRef ?? text.efaturaPending}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {text.invoicesEmpty}
          </p>
        )}
      </section>
    </div>
  )
}
