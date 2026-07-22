"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { useLocale } from "next-intl"
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  Plane,
  RefreshCw,
  Sparkles,
  ToyBrick,
  Trophy,
  Umbrella,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react"
import { Link } from "@/app/navigation"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { formatDualFromCents } from "@/lib/currency"
import { hasAnyRolePermission } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import type {
  ActivityView,
  BookingStatus,
  BookingView,
} from "@/lib/activities-repository"
import type { WalletOverview as WalletOverviewPayload } from "@/lib/wallet-repository"

// ---------------------------------------------------------------------------
// Locale copy — self-contained, no backend / provider names.
// ---------------------------------------------------------------------------

export type ActivitiesLocale = "tr" | "en" | "de" | "ru"

const intlLocales: Record<ActivitiesLocale, string> = {
  tr: "tr-TR",
  en: "en-US",
  de: "de-DE",
  ru: "ru-RU",
}

export function resolveActivitiesLocale(value: string): ActivitiesLocale {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

interface ActivitiesCopy {
  title: string
  subtitle: string
  creditLabel: string
  book: string
  bookTitle: string
  partySize: string
  total: string
  free: string
  capacity: string
  confirmBook: string
  booking: string
  cancel: string
  close: string
  bookSuccess: string
  bookError: string
  insufficientTitle: string
  insufficientBody: string
  goToWallet: string
  myBookingsTitle: string
  myBookingsEmpty: string
  ageFilteredNote: string
  loading: string
  loadError: string
  retry: string
  refresh: string
  refreshing: string
  catalogEmpty: string
  ageAdult: string
  ageKids: string
  status: Record<BookingStatus, string>
  categories: Record<string, string>
}

const activitiesCopy: Record<ActivitiesLocale, ActivitiesCopy> = {
  en: {
    title: "Activities & Experiences",
    subtitle: "Discover on-site experiences and book them with your wallet credit.",
    creditLabel: "Your credit",
    book: "Book",
    bookTitle: "Book {name}",
    partySize: "How many people?",
    total: "Total",
    free: "Free",
    capacity: "Up to {count}",
    confirmBook: "Confirm booking",
    booking: "Booking…",
    cancel: "Cancel",
    close: "Close",
    bookSuccess: "Booked! You'll find it under your bookings.",
    bookError: "The booking could not be completed. Please try again.",
    insufficientTitle: "Not enough credit",
    insufficientBody: "Top up your wallet to book this experience.",
    goToWallet: "Go to wallet",
    myBookingsTitle: "My bookings",
    myBookingsEmpty: "You have no bookings yet. Explore the experiences above.",
    ageFilteredNote: "Some adult-only experiences are hidden for this account.",
    loading: "Loading activities…",
    loadError: "Activities could not be loaded.",
    retry: "Try again",
    refresh: "Refresh",
    refreshing: "Refreshing…",
    catalogEmpty: "No activities are available right now.",
    ageAdult: "18+",
    ageKids: "For kids",
    status: { booked: "Booked", cancelled: "Cancelled", completed: "Completed" },
    categories: {
      wellness: "Wellness",
      leisure: "Leisure",
      transport: "Transport",
      sports: "Sports",
      kids: "Kids",
    },
  },
  tr: {
    title: "Etkinlikler & Deneyimler",
    subtitle: "Tesis içi deneyimleri keşfedin ve cüzdan kredinizle rezerve edin.",
    creditLabel: "Krediniz",
    book: "Rezerve et",
    bookTitle: "{name} rezerve et",
    partySize: "Kaç kişi?",
    total: "Toplam",
    free: "Ücretsiz",
    capacity: "En fazla {count}",
    confirmBook: "Rezervasyonu onayla",
    booking: "Rezerve ediliyor…",
    cancel: "Vazgeç",
    close: "Kapat",
    bookSuccess: "Rezerve edildi! Rezervasyonlarınızda görebilirsiniz.",
    bookError: "Rezervasyon tamamlanamadı. Lütfen tekrar deneyin.",
    insufficientTitle: "Yeterli kredi yok",
    insufficientBody: "Bu deneyimi rezerve etmek için cüzdanınıza kredi yükleyin.",
    goToWallet: "Cüzdana git",
    myBookingsTitle: "Rezervasyonlarım",
    myBookingsEmpty: "Henüz rezervasyonunuz yok. Yukarıdaki deneyimleri keşfedin.",
    ageFilteredNote: "Bu hesap için yalnızca yetişkinlere özel bazı deneyimler gizlendi.",
    loading: "Etkinlikler yükleniyor…",
    loadError: "Etkinlikler yüklenemedi.",
    retry: "Tekrar dene",
    refresh: "Yenile",
    refreshing: "Yenileniyor…",
    catalogEmpty: "Şu anda uygun etkinlik yok.",
    ageAdult: "18+",
    ageKids: "Çocuklar için",
    status: { booked: "Rezerve", cancelled: "İptal", completed: "Tamamlandı" },
    categories: {
      wellness: "Sağlık",
      leisure: "Keyif",
      transport: "Ulaşım",
      sports: "Spor",
      kids: "Çocuk",
    },
  },
  de: {
    title: "Aktivitäten & Erlebnisse",
    subtitle: "Entdecken Sie Erlebnisse vor Ort und buchen Sie sie mit Ihrem Guthaben.",
    creditLabel: "Ihr Guthaben",
    book: "Buchen",
    bookTitle: "{name} buchen",
    partySize: "Wie viele Personen?",
    total: "Gesamt",
    free: "Kostenlos",
    capacity: "Bis zu {count}",
    confirmBook: "Buchung bestätigen",
    booking: "Wird gebucht…",
    cancel: "Abbrechen",
    close: "Schließen",
    bookSuccess: "Gebucht! Sie finden es unter Ihren Buchungen.",
    bookError: "Die Buchung konnte nicht abgeschlossen werden. Bitte erneut versuchen.",
    insufficientTitle: "Nicht genug Guthaben",
    insufficientBody: "Laden Sie Ihr Guthaben auf, um dieses Erlebnis zu buchen.",
    goToWallet: "Zum Guthaben",
    myBookingsTitle: "Meine Buchungen",
    myBookingsEmpty: "Sie haben noch keine Buchungen. Entdecken Sie die Erlebnisse oben.",
    ageFilteredNote: "Einige Erlebnisse nur für Erwachsene sind für dieses Konto ausgeblendet.",
    loading: "Aktivitäten werden geladen…",
    loadError: "Aktivitäten konnten nicht geladen werden.",
    retry: "Erneut versuchen",
    refresh: "Aktualisieren",
    refreshing: "Wird aktualisiert…",
    catalogEmpty: "Derzeit sind keine Aktivitäten verfügbar.",
    ageAdult: "18+",
    ageKids: "Für Kinder",
    status: { booked: "Gebucht", cancelled: "Storniert", completed: "Abgeschlossen" },
    categories: {
      wellness: "Wellness",
      leisure: "Freizeit",
      transport: "Transfer",
      sports: "Sport",
      kids: "Kinder",
    },
  },
  ru: {
    title: "Активности и впечатления",
    subtitle: "Откройте для себя впечатления на территории и бронируйте их балансом кошелька.",
    creditLabel: "Ваш баланс",
    book: "Забронировать",
    bookTitle: "Забронировать: {name}",
    partySize: "Сколько человек?",
    total: "Итого",
    free: "Бесплатно",
    capacity: "До {count}",
    confirmBook: "Подтвердить бронирование",
    booking: "Бронируем…",
    cancel: "Отмена",
    close: "Закрыть",
    bookSuccess: "Забронировано! Найдёте в своих бронированиях.",
    bookError: "Бронирование не удалось. Пожалуйста, попробуйте снова.",
    insufficientTitle: "Недостаточно средств",
    insufficientBody: "Пополните кошелёк, чтобы забронировать это впечатление.",
    goToWallet: "В кошелёк",
    myBookingsTitle: "Мои бронирования",
    myBookingsEmpty: "У вас пока нет бронирований. Изучите впечатления выше.",
    ageFilteredNote: "Некоторые впечатления только для взрослых скрыты для этого аккаунта.",
    loading: "Загружаем активности…",
    loadError: "Не удалось загрузить активности.",
    retry: "Повторить",
    refresh: "Обновить",
    refreshing: "Обновление…",
    catalogEmpty: "Сейчас нет доступных активностей.",
    ageAdult: "18+",
    ageKids: "Для детей",
    status: { booked: "Забронировано", cancelled: "Отменено", completed: "Завершено" },
    categories: {
      wellness: "Велнес",
      leisure: "Досуг",
      transport: "Трансфер",
      sports: "Спорт",
      kids: "Дети",
    },
  },
}

// ---------------------------------------------------------------------------
// Category visuals — a deterministic gradient + icon stands in when there is no
// real image asset (activity.imageKey points at storage that is not wired yet).
// ---------------------------------------------------------------------------

interface CategoryVisual {
  gradient: string
  icon: LucideIcon
}

const categoryVisuals: Record<string, CategoryVisual> = {
  wellness: { gradient: "from-rose-400/80 via-orange-300/70 to-amber-200/60", icon: Sparkles },
  leisure: { gradient: "from-sky-400/80 via-cyan-300/70 to-teal-200/60", icon: Umbrella },
  transport: { gradient: "from-indigo-400/80 via-blue-300/70 to-sky-200/60", icon: Plane },
  sports: { gradient: "from-emerald-400/80 via-teal-300/70 to-lime-200/60", icon: Trophy },
  kids: { gradient: "from-amber-400/80 via-yellow-300/70 to-orange-200/60", icon: ToyBrick },
}

const fallbackVisual: CategoryVisual = {
  gradient: "from-primary/70 via-primary/40 to-primary/10",
  icon: Sparkles,
}

function visualForCategory(category: string | null): CategoryVisual {
  if (category && categoryVisuals[category]) return categoryVisuals[category]
  return fallbackVisual
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ActivitiesResponse {
  contractVersion: string
  source: "supabase" | "local-seed"
  generatedAt: string
  ageFiltered: boolean
  catalog: ActivityView[]
  myBookings: BookingView[]
  childBookings: BookingView[]
  warning?: string
}

function newIdempotencyKey(prefix: string) {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `${prefix}-${id}`
}

function apiErrorPayload(value: unknown): { error?: string; code?: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const record = value as Record<string, unknown>
  return {
    error: typeof record.error === "string" ? record.error : undefined,
    code: typeof record.code === "string" ? record.code : undefined,
  }
}

function isInsufficientCreditCode(code: string | undefined) {
  return code === "ACTIVITIES_INSUFFICIENT_FUNDS" || code === "WALLET_INSUFFICIENT_FUNDS"
}

function formatWhen(value: string | null, fallback: string, locale: ActivitiesLocale) {
  const source = value ?? fallback
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat(intlLocales[locale], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function priceText(cents: number, currency: ActivityView["currency"], text: ActivitiesCopy) {
  return cents > 0 ? formatDualFromCents(cents, currency) : text.free
}

const bookingStatusVariant: Record<BookingStatus, "info" | "success" | "neutral"> = {
  booked: "info",
  completed: "success",
  cancelled: "neutral",
}

// ---------------------------------------------------------------------------
// Presentational bookings list. Reused by the guest home dashboard.
// ---------------------------------------------------------------------------

export function BookingsList({
  bookings,
  locale,
  limit,
  emptyText,
}: {
  bookings: BookingView[]
  locale: ActivitiesLocale
  limit?: number
  emptyText?: string
}) {
  const text = activitiesCopy[locale]
  const shown = typeof limit === "number" ? bookings.slice(0, limit) : bookings

  if (shown.length === 0) {
    return (
      <p
        data-testid="activities-bookings-empty"
        className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground"
      >
        {emptyText ?? text.myBookingsEmpty}
      </p>
    )
  }

  return (
    <ul data-testid="activities-my-bookings" className="space-y-2">
      {shown.map((booking) => (
        <li
          key={booking.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background/70 p-3"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {booking.activityName ?? "-"}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <CalendarClock className="h-3.5 w-3.5" aria-hidden="true" />
                {formatWhen(booking.scheduledAt, booking.createdAt, locale)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {booking.partySize}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-black text-foreground">
              {booking.amountLabel ?? text.free}
            </span>
            <StatusBadge variant={bookingStatusVariant[booking.status]}>
              {text.status[booking.status]}
            </StatusBadge>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------
// Catalog card
// ---------------------------------------------------------------------------

function AgeChip({ activity, text }: { activity: ActivityView; text: ActivitiesCopy }) {
  if (activity.ageBand === "adult") {
    return (
      <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-black text-white backdrop-blur-sm">
        {text.ageAdult}
      </span>
    )
  }
  if (activity.ageBand === "under_18") {
    return (
      <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-black text-white backdrop-blur-sm">
        {text.ageKids}
      </span>
    )
  }
  return null
}

function ActivityCard({
  activity,
  locale,
  canBook,
  onBook,
}: {
  activity: ActivityView
  locale: ActivitiesLocale
  canBook: boolean
  onBook: (activity: ActivityView) => void
}) {
  const text = activitiesCopy[locale]
  const visual = visualForCategory(activity.category)
  const Icon = visual.icon
  const categoryLabel = activity.category
    ? text.categories[activity.category] ?? activity.category
    : null

  return (
    <article
      data-testid="activity-card"
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-primary/35 hover:shadow-lg hover:shadow-black/[0.06]"
    >
      <div
        aria-hidden="true"
        className={cn(
          "relative flex h-28 items-center justify-center bg-gradient-to-br",
          visual.gradient
        )}
      >
        <Icon className="h-10 w-10 text-white/90 drop-shadow" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {categoryLabel ? (
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-white backdrop-blur-sm">
              {categoryLabel}
            </span>
          ) : null}
          <AgeChip activity={activity} text={text} />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <h3 className="text-sm font-black text-foreground">{activity.name}</h3>
        {activity.description ? (
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {activity.description}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {activity.capacity !== null ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              {text.capacity.replace("{count}", String(activity.capacity))}
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-end justify-between gap-3 pt-1">
          <span className="min-w-0 break-words text-base font-black text-foreground">
            {priceText(activity.priceCents, activity.currency, text)}
          </span>
          {canBook ? (
            <button
              type="button"
              data-testid="activity-book"
              onClick={() => onBook(activity)}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {text.book}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------
// Booking dialog (party size + confirm). Native <dialog> keeps the grid free of
// layout shift and traps focus for keyboard users.
// ---------------------------------------------------------------------------

const dialogFocusableSelector =
  'a[href], button:not([disabled]), input:not([disabled])'

function trapDialogFocus(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return
  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector)
  ).filter((control) => control.getClientRects().length > 0)
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

type MutationState = "idle" | "saving" | "error"

function BookingDialog({
  activity,
  locale,
  walletBalanceCents,
  onClose,
  onBooked,
}: {
  activity: ActivityView
  locale: ActivitiesLocale
  walletBalanceCents: number | null
  onClose: () => void
  onBooked: () => void
}) {
  const text = activitiesCopy[locale]
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const bookKey = useRef<string | null>(null)
  const [partySize, setPartySize] = useState(1)
  const [mutationState, setMutationState] = useState<MutationState>("idle")
  const [message, setMessage] = useState<string | null>(null)
  const [insufficient, setInsufficient] = useState(false)

  const maxParty = activity.capacity ?? 50
  const totalCents = activity.priceCents * partySize
  const clientInsufficient =
    walletBalanceCents !== null && totalCents > walletBalanceCents
  const blocked = insufficient || clientInsufficient

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    closeButtonRef.current?.focus()
  }, [])

  async function confirmBooking() {
    if (mutationState === "saving" || blocked) return
    setMutationState("saving")
    setMessage(null)
    bookKey.current ??= newIdempotencyKey("activity-book")
    try {
      const response = await fetch("/api/site-management/activities", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "book",
          activityId: activity.id,
          partySize,
          idempotencyKey: bookKey.current,
        }),
      })
      const payload = (await response.json().catch(() => null)) as unknown
      if (!response.ok) {
        const { error, code } = apiErrorPayload(payload)
        if (isInsufficientCreditCode(code)) {
          setInsufficient(true)
          setMutationState("idle")
          return
        }
        throw new Error(error ?? text.bookError)
      }
      onBooked()
    } catch (error) {
      setMutationState("error")
      setMessage(error instanceof Error ? error.message : text.bookError)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      data-testid="activity-book-dialog"
      aria-labelledby="activity-book-title"
      onKeyDown={trapDialogFocus}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={onClose}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl shadow-black/30 backdrop:bg-black/40"
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 id="activity-book-title" className="text-base font-black text-foreground">
            {text.bookTitle.replace("{name}", activity.name)}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label={text.close}
            className="rounded-lg p-1.5 text-muted-foreground outline-none transition hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="activity-party-size"
              className="mb-1.5 block text-xs font-bold text-foreground"
            >
              {text.partySize}
            </label>
            <input
              id="activity-party-size"
              data-testid="activity-party-size"
              type="number"
              inputMode="numeric"
              min={1}
              max={maxParty}
              value={partySize}
              onChange={(event) => {
                bookKey.current = null
                setInsufficient(false)
                setMessage(null)
                setMutationState("idle")
                const next = Number(event.target.value)
                if (!Number.isFinite(next)) {
                  setPartySize(1)
                  return
                }
                setPartySize(Math.min(Math.max(Math.trunc(next), 1), maxParty))
              }}
              className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/30 p-3">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {text.total}
            </span>
            <span className="text-lg font-black text-foreground">
              {priceText(totalCents, activity.currency, text)}
            </span>
          </div>

          {blocked ? (
            <div
              role="status"
              data-testid="activity-insufficient"
              className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200"
            >
              <p className="text-sm font-black">{text.insufficientTitle}</p>
              <p className="mt-0.5 text-xs leading-5">{text.insufficientBody}</p>
              <Link
                href="/dashboard/wallet"
                className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/15 px-3 py-1.5 text-xs font-black text-amber-900 outline-none transition hover:bg-amber-500/25 focus-visible:ring-2 focus-visible:ring-amber-500 dark:text-amber-100"
              >
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {text.goToWallet}
              </Link>
            </div>
          ) : null}

          {message ? (
            <p
              role="alert"
              className="rounded-xl border border-rose-500/25 bg-rose-500/10 p-3 text-sm font-bold text-rose-800 dark:text-rose-200"
            >
              {message}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="activity-book-confirm"
              onClick={() => void confirmBooking()}
              disabled={mutationState === "saving" || blocked}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-black text-primary-foreground outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {mutationState === "saving" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {mutationState === "saving" ? text.booking : text.confirmBook}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={mutationState === "saving"}
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
            >
              {text.cancel}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  )
}

// ---------------------------------------------------------------------------
// Full activities workspace.
// ---------------------------------------------------------------------------

type RequestState = "loading" | "success" | "error"

export function ActivitiesCatalog() {
  const locale = resolveActivitiesLocale(useLocale())
  const text = activitiesCopy[locale]
  const user = useUser()
  const canBook = hasAnyRolePermission(user.roles, "activities", "create")
  const [data, setData] = useState<ActivitiesResponse | null>(null)
  const [walletBalanceCents, setWalletBalanceCents] = useState<number | null>(null)
  const [requestState, setRequestState] = useState<RequestState>("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [bookingActivity, setBookingActivity] = useState<ActivityView | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const requestSequence = useRef(0)

  const fetchWorkspace = useCallback(async (initial = false) => {
    const sequence = ++requestSequence.current
    if (initial) setRequestState("loading")
    else setRefreshing(true)
    try {
      const [activitiesResponse, walletResponse] = await Promise.all([
        fetch("/api/site-management/activities", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }),
        // Wallet is used only for the credit chip + friendly pre-check; never
        // let its absence block the catalog.
        fetch("/api/site-management/wallet?limit=1", {
          cache: "no-store",
          headers: { accept: "application/json" },
        }).catch(() => null),
      ])
      if (!activitiesResponse.ok) throw new Error("Activities workspace failed.")
      const payload = (await activitiesResponse.json()) as ActivitiesResponse
      if (sequence !== requestSequence.current) return
      setData(payload)
      setRequestState("success")
      if (walletResponse && walletResponse.ok) {
        const wallet = (await walletResponse.json()) as WalletOverviewPayload
        setWalletBalanceCents(wallet.wallet.balanceCents)
      }
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

  useEffect(() => {
    const recover = () => {
      if (document.visibilityState === "visible") void fetchWorkspace()
    }
    const onChange = () => void fetchWorkspace()
    const poll = window.setInterval(recover, 30_000)
    document.addEventListener("visibilitychange", recover)
    window.addEventListener("site-management:changed", onChange)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener("visibilitychange", recover)
      window.removeEventListener("site-management:changed", onChange)
    }
  }, [fetchWorkspace])

  function handleBooked() {
    setBookingActivity(null)
    setBanner(text.bookSuccess)
    window.dispatchEvent(new CustomEvent("site-management:changed"))
    void fetchWorkspace()
  }

  if (requestState === "loading" && !data) {
    return (
      <div
        data-testid="activities-catalog"
        aria-busy="true"
        className="rounded-2xl border border-border bg-card p-5 shadow-sm"
      >
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
          {text.loading}
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div
        data-testid="activities-catalog"
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

  return (
    <div data-testid="activities-catalog" aria-busy={refreshing} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-base font-black text-foreground">{text.title}</h2>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{text.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {walletBalanceCents !== null ? (
            <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/10 px-3 py-1.5 text-xs font-black text-primary">
              <Wallet className="h-4 w-4" aria-hidden="true" />
              {text.creditLabel}: {formatDualFromCents(walletBalanceCents, "TRY")}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void fetchWorkspace()}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
              aria-hidden="true"
            />
            {refreshing ? text.refreshing : text.refresh}
          </button>
        </div>
      </div>

      {banner ? (
        <div
          role="status"
          data-testid="activities-banner"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-800 dark:text-emerald-200"
        >
          {banner}
        </div>
      ) : null}

      {data.ageFiltered ? (
        <p className="rounded-xl border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
          {text.ageFilteredNote}
        </p>
      ) : null}

      {data.catalog.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.catalog.map((activity) => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              locale={locale}
              canBook={canBook}
              onBook={(selected) => {
                setBanner(null)
                setBookingActivity(selected)
              }}
            />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {text.catalogEmpty}
        </p>
      )}

      <section aria-labelledby="activities-my-bookings-heading" className="space-y-3">
        <h3
          id="activities-my-bookings-heading"
          className="flex items-center gap-2 text-sm font-black text-foreground"
        >
          <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />
          {text.myBookingsTitle}
        </h3>
        <BookingsList bookings={data.myBookings} locale={locale} />
      </section>

      {bookingActivity ? (
        <BookingDialog
          activity={bookingActivity}
          locale={locale}
          walletBalanceCents={walletBalanceCents}
          onClose={() => setBookingActivity(null)}
          onBooked={handleBooked}
        />
      ) : null}
    </div>
  )
}
