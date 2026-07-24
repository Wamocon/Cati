"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Gift,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react"
import {
  BookingsList,
  resolveActivitiesLocale,
} from "@/components/activities/activities-catalog"
import { FeatureInfo } from "@/components/feature-info"
import { formatDualFromCents } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type {
  GuardianWorkspace,
  ManagedChildView,
} from "@/lib/guardianship-repository"

type ChildrenLocale = "tr" | "en" | "de" | "ru"

function resolveChildrenLocale(value: string): ChildrenLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface ChildrenCopy {
  title: string
  subtitle: string
  addTitle: string
  nameLabel: string
  namePlaceholder: string
  dobLabel: string
  dobHint: string
  relationLabel: string
  relationParent: string
  relationGuardian: string
  relationDelegate: string
  consentLabel: string
  consentNote: string
  addButton: string
  adding: string
  addSuccess: string
  minorChip: string
  allowanceBalance: string
  recentTitle: string
  noBookings: string
  pendingTitle: string
  approve: string
  decline: string
  working: string
  giveAllowance: string
  amountLabel: string
  quickAmountLabel: string
  reviewAllowance: string
  confirmAllowanceTitle: string
  confirmAllowanceBody: string
  send: string
  sending: string
  allowanceSuccess: string
  cancel: string
  revoke: string
  revokeTitle: string
  revokeBody: string
  revokeConfirm: string
  revoking: string
  revokeSuccess: string
  empty: string
  emptyHint: string
  loading: string
  loadError: string
  retry: string
  refresh: string
  refreshing: string
  genericError: string
}

const childrenCopy: Record<ChildrenLocale, ChildrenCopy> = {
  en: {
    title: "My children",
    subtitle:
      "Add and supervise your children's accounts, set an allowance, and approve what they ask for.",
    addTitle: "Add a child",
    nameLabel: "Child's name",
    namePlaceholder: "e.g. Elif",
    dobLabel: "Date of birth",
    dobHint: "You declare this yourself; it decides which activities are age-appropriate.",
    relationLabel: "Your relationship",
    relationParent: "Parent",
    relationGuardian: "Guardian",
    relationDelegate: "Delegate",
    consentLabel:
      "I am this child's parent or legal guardian and I consent to managing their account.",
    consentNote:
      "You stay in control: you set the allowance, and paid bookings spend only what you've given. You can revoke access at any time.",
    addButton: "Add child",
    adding: "Adding…",
    addSuccess: "Child account added.",
    minorChip: "Minor",
    allowanceBalance: "Allowance balance",
    recentTitle: "Recent activities",
    noBookings: "No activities booked yet.",
    pendingTitle: "Waiting for your OK",
    approve: "Approve",
    decline: "Not now",
    working: "Working…",
    giveAllowance: "Give allowance",
    amountLabel: "Amount",
    quickAmountLabel: "Quick amounts",
    reviewAllowance: "Review",
    confirmAllowanceTitle: "Confirm allowance",
    confirmAllowanceBody: "Send {amount} to {name}'s allowance?",
    send: "Send allowance",
    sending: "Sending…",
    allowanceSuccess: "Allowance sent.",
    cancel: "Cancel",
    revoke: "Revoke access",
    revokeTitle: "Revoke this account?",
    revokeBody:
      "{name} will no longer be able to sign in. Their booking history stays for your records.",
    revokeConfirm: "Revoke",
    revoking: "Revoking…",
    revokeSuccess: "Access revoked.",
    empty: "You haven't added any children yet.",
    emptyHint: "Use the form above to add your first child account.",
    loading: "Loading your children…",
    loadError: "Your children could not be loaded.",
    retry: "Try again",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    genericError: "Something went wrong. Please try again.",
  },
  tr: {
    title: "Çocuklarım",
    subtitle:
      "Çocuklarınızın hesaplarını ekleyip yönetin, harçlık tanımlayın ve isteklerini onaylayın.",
    addTitle: "Çocuk ekle",
    nameLabel: "Çocuğun adı",
    namePlaceholder: "örn. Elif",
    dobLabel: "Doğum tarihi",
    dobHint: "Bunu siz beyan edersiniz; hangi etkinliklerin yaşa uygun olduğunu belirler.",
    relationLabel: "Yakınlığınız",
    relationParent: "Ebeveyn",
    relationGuardian: "Vasi",
    relationDelegate: "Vekil",
    consentLabel:
      "Bu çocuğun ebeveyni veya yasal vasisiyim ve hesabını yönetmeyi kabul ediyorum.",
    consentNote:
      "Kontrol sizde: harçlığı siz belirlersiniz ve ücretli rezervasyonlar yalnızca verdiğiniz krediyi harcar. Erişimi istediğiniz zaman kaldırabilirsiniz.",
    addButton: "Çocuk ekle",
    adding: "Ekleniyor…",
    addSuccess: "Çocuk hesabı eklendi.",
    minorChip: "Reşit değil",
    allowanceBalance: "Harçlık bakiyesi",
    recentTitle: "Son etkinlikler",
    noBookings: "Henüz etkinlik rezervasyonu yok.",
    pendingTitle: "Onayınızı bekliyor",
    approve: "Onayla",
    decline: "Şimdi değil",
    working: "İşleniyor…",
    giveAllowance: "Harçlık ver",
    amountLabel: "Tutar",
    quickAmountLabel: "Hızlı tutarlar",
    reviewAllowance: "Gözden geçir",
    confirmAllowanceTitle: "Harçlığı onayla",
    confirmAllowanceBody: "{name} için {amount} gönderilsin mi?",
    send: "Harçlık gönder",
    sending: "Gönderiliyor…",
    allowanceSuccess: "Harçlık gönderildi.",
    cancel: "Vazgeç",
    revoke: "Erişimi kaldır",
    revokeTitle: "Bu hesap kaldırılsın mı?",
    revokeBody:
      "{name} artık giriş yapamayacak. Rezervasyon geçmişi kayıtlarınızda kalır.",
    revokeConfirm: "Kaldır",
    revoking: "Kaldırılıyor…",
    revokeSuccess: "Erişim kaldırıldı.",
    empty: "Henüz çocuk eklemediniz.",
    emptyHint: "İlk çocuk hesabınızı eklemek için yukarıdaki formu kullanın.",
    loading: "Çocuklarınız yükleniyor…",
    loadError: "Çocuklarınız yüklenemedi.",
    retry: "Tekrar dene",
    refresh: "Yenile",
    refreshing: "Yenileniyor…",
    genericError: "Bir şeyler ters gitti. Lütfen tekrar deneyin.",
  },
  de: {
    title: "Meine Kinder",
    subtitle:
      "Fügen Sie die Konten Ihrer Kinder hinzu und verwalten Sie sie, legen Sie ein Taschengeld fest und genehmigen Sie ihre Wünsche.",
    addTitle: "Kind hinzufügen",
    nameLabel: "Name des Kindes",
    namePlaceholder: "z. B. Elif",
    dobLabel: "Geburtsdatum",
    dobHint: "Sie geben es selbst an; es entscheidet, welche Aktivitäten altersgerecht sind.",
    relationLabel: "Ihre Beziehung",
    relationParent: "Elternteil",
    relationGuardian: "Vormund",
    relationDelegate: "Bevollmächtigt",
    consentLabel:
      "Ich bin der Elternteil oder gesetzliche Vormund dieses Kindes und stimme der Verwaltung seines Kontos zu.",
    consentNote:
      "Sie behalten die Kontrolle: Sie legen das Taschengeld fest, und kostenpflichtige Buchungen geben nur aus, was Sie gegeben haben. Sie können den Zugang jederzeit widerrufen.",
    addButton: "Kind hinzufügen",
    adding: "Wird hinzugefügt…",
    addSuccess: "Kinderkonto hinzugefügt.",
    minorChip: "Minderjährig",
    allowanceBalance: "Taschengeld-Guthaben",
    recentTitle: "Letzte Aktivitäten",
    noBookings: "Noch keine Aktivitäten gebucht.",
    pendingTitle: "Wartet auf Ihre Freigabe",
    approve: "Genehmigen",
    decline: "Jetzt nicht",
    working: "Wird bearbeitet…",
    giveAllowance: "Taschengeld geben",
    amountLabel: "Betrag",
    quickAmountLabel: "Schnellbeträge",
    reviewAllowance: "Prüfen",
    confirmAllowanceTitle: "Taschengeld bestätigen",
    confirmAllowanceBody: "{amount} an das Taschengeld von {name} senden?",
    send: "Taschengeld senden",
    sending: "Wird gesendet…",
    allowanceSuccess: "Taschengeld gesendet.",
    cancel: "Abbrechen",
    revoke: "Zugang widerrufen",
    revokeTitle: "Dieses Konto widerrufen?",
    revokeBody:
      "{name} kann sich nicht mehr anmelden. Der Buchungsverlauf bleibt für Ihre Unterlagen erhalten.",
    revokeConfirm: "Widerrufen",
    revoking: "Wird widerrufen…",
    revokeSuccess: "Zugang widerrufen.",
    empty: "Sie haben noch keine Kinder hinzugefügt.",
    emptyHint: "Verwenden Sie das Formular oben, um Ihr erstes Kinderkonto hinzuzufügen.",
    loading: "Ihre Kinder werden geladen…",
    loadError: "Ihre Kinder konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    genericError: "Etwas ist schiefgelaufen. Bitte erneut versuchen.",
  },
  ru: {
    title: "Мои дети",
    subtitle:
      "Добавляйте и контролируйте аккаунты детей, устанавливайте карманные средства и одобряйте их запросы.",
    addTitle: "Добавить ребёнка",
    nameLabel: "Имя ребёнка",
    namePlaceholder: "напр. Элиф",
    dobLabel: "Дата рождения",
    dobHint: "Вы указываете её сами; она определяет, какие активности подходят по возрасту.",
    relationLabel: "Ваше отношение",
    relationParent: "Родитель",
    relationGuardian: "Опекун",
    relationDelegate: "Доверенное лицо",
    consentLabel:
      "Я родитель или законный опекун этого ребёнка и согласен управлять его аккаунтом.",
    consentNote:
      "Контроль остаётся у вас: вы устанавливаете карманные средства, а платные бронирования тратят только то, что вы дали. Доступ можно отозвать в любой момент.",
    addButton: "Добавить ребёнка",
    adding: "Добавляем…",
    addSuccess: "Аккаунт ребёнка добавлен.",
    minorChip: "Несовершеннолетний",
    allowanceBalance: "Баланс карманных средств",
    recentTitle: "Последние активности",
    noBookings: "Пока нет забронированных активностей.",
    pendingTitle: "Ждёт вашего одобрения",
    approve: "Одобрить",
    decline: "Не сейчас",
    working: "Обработка…",
    giveAllowance: "Выдать средства",
    amountLabel: "Сумма",
    quickAmountLabel: "Быстрые суммы",
    reviewAllowance: "Проверить",
    confirmAllowanceTitle: "Подтвердите выдачу",
    confirmAllowanceBody: "Отправить {amount} на баланс {name}?",
    send: "Отправить",
    sending: "Отправляем…",
    allowanceSuccess: "Средства отправлены.",
    cancel: "Отмена",
    revoke: "Отозвать доступ",
    revokeTitle: "Отозвать этот аккаунт?",
    revokeBody:
      "{name} больше не сможет войти. История бронирований останется в ваших записях.",
    revokeConfirm: "Отозвать",
    revoking: "Отзываем…",
    revokeSuccess: "Доступ отозван.",
    empty: "Вы ещё не добавили детей.",
    emptyHint: "Используйте форму выше, чтобы добавить первый аккаунт ребёнка.",
    loading: "Загружаем ваших детей…",
    loadError: "Не удалось загрузить ваших детей.",
    retry: "Повторить",
    refresh: "Обновить",
    refreshing: "Обновление…",
    genericError: "Что-то пошло не так. Пожалуйста, попробуйте снова.",
  },
}

// Quick-amount presets (in whole Lira) that fill the allowance field with one
// tap. The manual input stays available for any other amount.
const QUICK_AMOUNTS = [100, 250, 500, 1000] as const

function newIdempotencyKey(prefix: string) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

function parseAmountToCents(value: string): number | null {
  const amount = value.trim().replace(",", ".")
  const match = /^(0|[1-9]\d{0,10})(?:\.(\d{1,2}))?$/.exec(amount)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? "").padEnd(2, "0") || "0")
  const cents = whole * 100 + fraction
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 1_000_000_000_000) {
    return null
  }
  return cents
}

function apiErrorMessage(value: unknown, fallback: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback
  const record = value as Record<string, unknown>
  return typeof record.error === "string" && record.error.trim()
    ? record.error
    : fallback
}

async function postGuardianship(body: Record<string, unknown>) {
  const response = await fetch("/api/site-management/guardianship", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const payload = (await response.json().catch(() => null)) as unknown
  return { response, payload }
}

// ---------------------------------------------------------------------------
// Add-child form
// ---------------------------------------------------------------------------

function AddChildForm({
  text,
  onAdded,
  onError,
}: {
  text: ChildrenCopy
  onAdded: () => void
  onError: (message: string) => void
}) {
  const [fullName, setFullName] = useState("")
  const [dateOfBirth, setDateOfBirth] = useState("")
  const [relation, setRelation] = useState("parent")
  const [consent, setConsent] = useState(false)
  const [state, setState] = useState<"idle" | "saving">("idle")
  const keyRef = useRef<string | null>(null)

  const canSubmit =
    fullName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth) &&
    consent &&
    state !== "saving"

  async function submit() {
    if (!canSubmit) return
    setState("saving")
    keyRef.current ??= newIdempotencyKey("guardianship-add")
    try {
      const { response, payload } = await postGuardianship({
        action: "add-child",
        fullName,
        dateOfBirth,
        relation,
        consent,
        idempotencyKey: keyRef.current,
      })
      if (!response.ok) {
        onError(apiErrorMessage(payload, text.genericError))
        setState("idle")
        return
      }
      setFullName("")
      setDateOfBirth("")
      setRelation("parent")
      setConsent(false)
      keyRef.current = null
      setState("idle")
      onAdded()
    } catch {
      onError(text.genericError)
      setState("idle")
    }
  }

  return (
    <form
      data-testid="guardianship-add-form"
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <h2 className="flex items-center gap-2 text-sm font-black text-foreground">
        <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
        {text.addTitle}
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="child-full-name"
            className="mb-1.5 block text-xs font-bold text-foreground"
          >
            {text.nameLabel}
          </label>
          <input
            id="child-full-name"
            data-testid="child-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={text.namePlaceholder}
            maxLength={120}
            autoComplete="off"
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>

        <div>
          <label
            htmlFor="child-dob"
            className="mb-1.5 block text-xs font-bold text-foreground"
          >
            {text.dobLabel}
          </label>
          <input
            id="child-dob"
            data-testid="child-dob"
            type="date"
            value={dateOfBirth}
            onChange={(event) => setDateOfBirth(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{text.dobHint}</p>
        </div>

        <div>
          <label
            htmlFor="child-relation"
            className="mb-1.5 block text-xs font-bold text-foreground"
          >
            {text.relationLabel}
          </label>
          <select
            id="child-relation"
            data-testid="child-relation"
            value={relation}
            onChange={(event) => setRelation(event.target.value)}
            className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="parent">{text.relationParent}</option>
            <option value="guardian">{text.relationGuardian}</option>
            <option value="delegate">{text.relationDelegate}</option>
          </select>
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
        <input
          type="checkbox"
          data-testid="child-consent"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary"
        />
        <span className="min-w-0 text-xs leading-5 text-foreground">
          <span className="font-bold">{text.consentLabel}</span>
          <span className="mt-1 block font-medium text-muted-foreground">
            {text.consentNote}
          </span>
        </span>
      </label>

      <button
        type="submit"
        data-testid="child-add-submit"
        disabled={!canSubmit}
        className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
      >
        {state === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        )}
        {state === "saving" ? text.adding : text.addButton}
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Child card
// ---------------------------------------------------------------------------

function ChildCard({
  child,
  text,
  roleLabel,
  activitiesLocale,
  onChanged,
  onError,
}: {
  child: ManagedChildView
  text: ChildrenCopy
  roleLabel: string
  activitiesLocale: "tr" | "en" | "de" | "ru"
  onChanged: (message?: string) => void
  onError: (message: string) => void
}) {
  const [amount, setAmount] = useState("")
  const [allowanceStage, setAllowanceStage] = useState<"idle" | "confirm">("idle")
  const [busy, setBusy] = useState<string | null>(null)
  const [revokeOpen, setRevokeOpen] = useState(false)
  const allowanceKey = useRef<string | null>(null)

  const amountCents = parseAmountToCents(amount)
  const amountId = `allowance-${child.childProfileId}`

  async function sendAllowance() {
    if (amountCents === null || busy) return
    setBusy("allowance")
    allowanceKey.current ??= newIdempotencyKey("guardianship-allowance")
    try {
      const { response, payload } = await postGuardianship({
        action: "allowance",
        childProfileId: child.childProfileId,
        amount,
        idempotencyKey: allowanceKey.current,
      })
      if (!response.ok) {
        onError(apiErrorMessage(payload, text.genericError))
        setBusy(null)
        return
      }
      setAmount("")
      setAllowanceStage("idle")
      allowanceKey.current = null
      setBusy(null)
      onChanged(text.allowanceSuccess)
    } catch {
      onError(text.genericError)
      setBusy(null)
    }
  }

  async function decideRequest(requestId: string, action: "approve" | "decline") {
    if (busy) return
    setBusy(`request-${requestId}`)
    try {
      const { response, payload } = await postGuardianship({ action, requestId })
      if (!response.ok) {
        onError(apiErrorMessage(payload, text.genericError))
        setBusy(null)
        return
      }
      setBusy(null)
      onChanged()
    } catch {
      onError(text.genericError)
      setBusy(null)
    }
  }

  async function revoke() {
    if (busy) return
    setBusy("revoke")
    try {
      const { response, payload } = await postGuardianship({
        action: "revoke",
        childProfileId: child.childProfileId,
      })
      if (!response.ok) {
        onError(apiErrorMessage(payload, text.genericError))
        setBusy(null)
        return
      }
      setBusy(null)
      onChanged(text.revokeSuccess)
    } catch {
      onError(text.genericError)
      setBusy(null)
    }
  }

  return (
    <article
      data-testid="child-card"
      className="flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Users className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-foreground">
              {child.fullName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-black text-primary">
                {roleLabel}
              </span>
              {child.isMinor ? (
                <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                  {text.minorChip}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        {child.pendingApprovals.length > 0 ? (
          <span
            data-testid="child-pending-badge"
            className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:text-amber-300"
          >
            {child.pendingApprovals.length} {text.pendingTitle}
          </span>
        ) : null}
      </header>

      {child.wallet ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
            <Wallet className="h-4 w-4 text-primary" aria-hidden="true" />
            {text.allowanceBalance}
          </span>
          <span className="text-lg font-black text-foreground">
            {child.wallet.balanceLabel}
          </span>
        </div>
      ) : null}

      {child.pendingApprovals.length > 0 ? (
        <section aria-label={text.pendingTitle} className="space-y-2">
          {child.pendingApprovals.map((approval) => (
            <div
              key={approval.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3"
            >
              <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                {approval.title}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  data-testid="child-request-approve"
                  onClick={() => void decideRequest(approval.id, "approve")}
                  disabled={busy !== null}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-55"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {text.approve}
                </button>
                <button
                  type="button"
                  data-testid="child-request-decline"
                  onClick={() => void decideRequest(approval.id, "decline")}
                  disabled={busy !== null}
                  className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-55"
                >
                  {text.decline}
                </button>
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section aria-label={text.recentTitle} className="space-y-2">
        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {text.recentTitle}
        </h4>
        <BookingsList
          bookings={child.recentBookings}
          locale={activitiesLocale}
          limit={3}
          emptyText={text.noBookings}
        />
      </section>

      <div className="mt-auto rounded-xl border border-border bg-muted/20 p-3">
        {allowanceStage === "idle" ? (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (amountCents === null) return
              allowanceKey.current = newIdempotencyKey("guardianship-allowance")
              setAllowanceStage("confirm")
            }}
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor={amountId}
                className="mb-1.5 block text-xs font-bold text-foreground"
              >
                {text.giveAllowance}
              </label>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 focus-within:ring-2 focus-within:ring-primary">
                <span aria-hidden="true" className="text-sm font-black text-muted-foreground">
                  ₺
                </span>
                <input
                  id={amountId}
                  data-testid="child-allowance-amount"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="min-h-11 w-full bg-transparent text-sm font-semibold text-foreground outline-none"
                />
              </div>
              {amountCents !== null ? (
                <p className="mt-1 text-xs font-semibold text-muted-foreground">
                  {formatDualFromCents(amountCents, "TRY")}
                </p>
              ) : null}
              <div
                role="group"
                aria-label={text.quickAmountLabel}
                className="mt-2 flex flex-wrap gap-1.5"
              >
                {QUICK_AMOUNTS.map((value) => {
                  const active = amount.trim() === String(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      data-testid="child-allowance-quick"
                      aria-pressed={active}
                      onClick={() => setAmount(String(value))}
                      className={cn(
                        "inline-flex min-h-9 items-center rounded-lg border px-3 py-1.5 text-xs font-black outline-none transition focus-visible:ring-2 focus-visible:ring-primary",
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:bg-muted"
                      )}
                    >
                      ₺{value}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              type="submit"
              data-testid="child-allowance-review"
              disabled={amountCents === null}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              <Gift className="h-4 w-4" aria-hidden="true" />
              {text.reviewAllowance}
            </button>
          </form>
        ) : (
          <div
            data-testid="child-allowance-confirm"
            className="space-y-3 rounded-lg border border-primary/25 bg-primary/[0.05] p-3"
          >
            <p className="text-sm font-bold text-foreground">
              {text.confirmAllowanceTitle}
            </p>
            <p className="text-sm text-muted-foreground">
              {text.confirmAllowanceBody
                .replace("{amount}", formatDualFromCents(amountCents ?? 0, "TRY"))
                .replace("{name}", child.fullName)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="child-allowance-confirm-send"
                onClick={() => void sendAllowance()}
                disabled={busy === "allowance"}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "allowance" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                )}
                {busy === "allowance" ? text.sending : text.send}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAllowanceStage("idle")
                  allowanceKey.current = null
                }}
                disabled={busy === "allowance"}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {text.cancel}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        {revokeOpen ? (
          <div
            data-testid="child-revoke-confirm"
            className="w-full space-y-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3"
          >
            <p className="text-sm font-bold text-foreground">{text.revokeTitle}</p>
            <p className="text-sm text-muted-foreground">
              {text.revokeBody.replace("{name}", child.fullName)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                data-testid="child-revoke-confirm-button"
                onClick={() => void revoke()}
                disabled={busy === "revoke"}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-black text-white outline-none transition hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              >
                {busy === "revoke" ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                {busy === "revoke" ? text.revoking : text.revokeConfirm}
              </button>
              <button
                type="button"
                onClick={() => setRevokeOpen(false)}
                disabled={busy === "revoke"}
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
              >
                {text.cancel}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            data-testid="child-revoke"
            onClick={() => setRevokeOpen(true)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-rose-600 outline-none transition hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-rose-500 dark:text-rose-400"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            {text.revoke}
          </button>
        )}
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Workspace
// ---------------------------------------------------------------------------

type RequestState = "loading" | "success" | "error"

export function ChildrenWorkspace() {
  const rawLocale = useLocale()
  const locale = resolveChildrenLocale(rawLocale)
  const activitiesLocale = resolveActivitiesLocale(rawLocale)
  const text = childrenCopy[locale]
  const roleT = useTranslations("roles")

  const [data, setData] = useState<GuardianWorkspace | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const fetchWorkspace = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const response = await fetch("/api/site-management/guardianship", {
        cache: "no-store",
        headers: { accept: "application/json" },
      })
      if (!response.ok) throw new Error("Guardianship workspace failed.")
      const payload = (await response.json()) as GuardianWorkspace
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

  const handleChanged = useCallback(
    (message?: string) => {
      setError(null)
      if (message) setBanner(message)
      window.dispatchEvent(new CustomEvent("site-management:changed"))
      void fetchWorkspace()
    },
    [fetchWorkspace]
  )

  const handleError = useCallback((message: string) => {
    setBanner(null)
    setError(message)
  }, [])

  const roleLabelFor = useCallback(
    (role: ManagedChildView["role"]) => {
      try {
        return roleT(role)
      } catch {
        return role
      }
    },
    [roleT]
  )

  return (
    <div data-testid="children-workspace" aria-busy={refreshing} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="text-xl font-black text-foreground md:text-2xl">
              {text.title}
            </h1>
            <FeatureInfo featureKey="guardianship" side="bottom" />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {text.subtitle}
          </p>
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

      {banner ? (
        <div
          role="status"
          data-testid="guardianship-banner"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-800 dark:text-emerald-200"
        >
          {banner}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          data-testid="guardianship-error"
          className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm font-bold text-rose-800 dark:text-rose-200"
        >
          {error}
        </div>
      ) : null}

      <AddChildForm
        text={text}
        onAdded={() => handleChanged(text.addSuccess)}
        onError={handleError}
      />

      {requestState === "loading" && !data ? (
        <div
          aria-busy="true"
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-5 text-sm font-semibold text-muted-foreground shadow-sm"
        >
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
      ) : requestState === "error" && !data ? (
        <div
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
      ) : data && data.children.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.children.map((child) => (
            <ChildCard
              key={child.childProfileId}
              child={child}
              text={text}
              roleLabel={roleLabelFor(child.role)}
              activitiesLocale={activitiesLocale}
              onChanged={handleChanged}
              onError={handleError}
            />
          ))}
        </div>
      ) : (
        <div
          data-testid="children-empty"
          className="rounded-2xl border border-dashed border-border p-8 text-center"
        >
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-sm font-black text-foreground">{text.empty}</p>
          <p className="mt-1 text-sm text-muted-foreground">{text.emptyHint}</p>
        </div>
      )}
    </div>
  )
}
