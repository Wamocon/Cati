"use client"

import {
  CalendarDays,
  CheckCircle2,
  Clock,
  KeyRound,
  LockKeyhole,
  MessageCircle,
  Sparkles,
  TimerReset,
  Video,
  WalletCards,
} from "lucide-react"
import { useLocale } from "next-intl"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import {
  isClientRole,
  isFieldRole,
  shouldMaskFinance,
  visibleBookingsForRole,
} from "@/lib/role-scoped-views"
import {
  accessLabels,
  bookingStatusLabels,
  bookings,
  depositLabels,
  formatTry,
  getViewingSummary,
  type AccessStatus,
  type BookingRecord,
  type BookingStatus,
  type DepositStatus,
  type ViewingStatus,
  viewingPipeline,
} from "@/lib/site-management-data"

function bookingVariant(status: BookingStatus) {
  if (status === "confirmed") return "success"
  if (status === "precheck_pending") return "warning"
  if (status === "move_in_today" || status === "checkout_today") return "info"
  if (status === "deposit_review") return "danger"
  return "neutral"
}

function depositVariant(status: DepositStatus) {
  if (status === "refund_ready") return "success"
  if (status === "held" || status === "reserved") return "info"
  if (status === "deduction_pending") return "danger"
  return "neutral"
}

function accessVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "pending") return "warning"
  if (status === "restricted") return "danger"
  return "neutral"
}

function viewingVariant(status: ViewingStatus) {
  if (status === "completed") return "success"
  if (status === "confirmed" || status === "planned") return "info"
  if (status === "follow_up_due") return "warning"
  return "danger"
}

function viewingLabel(status: ViewingStatus, locale: string) {
  if (status === "planned") return localizeBusinessCopy("Planlandı", locale)
  if (status === "confirmed") return localizeBusinessCopy("Onaylandı", locale)
  if (status === "completed") return localizeBusinessCopy("Tamamlandı", locale)
  if (status === "follow_up_due") return localizeBusinessCopy("Takip gerekli", locale)
  return localizeBusinessCopy("Gelmedi", locale)
}

function shortDate(date: string, locale: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(date))
    .map((part) => (part.type === "month" ? localizeBusinessCopy(part.value, locale) : part.value))
    .join("")
}

function cleaningStatusLabel(status: BookingRecord["cleaningStatus"], locale: string) {
  if (status === "scheduled") return localizeBusinessCopy("Planlandı", locale)
  if (status === "in_progress") return localizeBusinessCopy("İşlemde", locale)
  if (status === "done") return localizeBusinessCopy("Tamamlandı", locale)
  return localizeBusinessCopy("Bloke", locale)
}

function channelLabel(channel: string, locale: string) {
  if (channel === "Phone") return localizeBusinessCopy("Telefon", locale)
  return channel
}

export default function CalendarPage() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const maskFinance = shouldMaskFinance(user.role)
  const visibleBookings = visibleBookingsForRole(user.role, bookings)
  const moveIns = visibleBookings.filter((booking) => booking.status === "move_in_today").length
  const checkouts = visibleBookings.filter((booking) => booking.status === "checkout_today").length
  const depositReviews = visibleBookings.filter(
    (booking) => booking.depositStatus === "deduction_pending"
  ).length
  const accessPending = visibleBookings.filter(
    (booking) =>
      booking.accessCodeStatus === "pending" || booking.accessCodeStatus === "restricted"
  ).length
  const viewingSummary = getViewingSummary()
  const operationSchedule = visibleBookings.filter(
    (booking) =>
      booking.status === "move_in_today" ||
      booking.status === "checkout_today" ||
      booking.status === "deposit_review"
  )
  const visibleSchedule =
    operationSchedule.length > 0 ? operationSchedule : visibleBookings.slice(0, 4)
  const showSalesPipeline = !clientView && !fieldView

  const pageIntro = clientView
    ? localizeBusinessCopy(
        "Yetkili rezervasyon, giriş-çıkış, erişim kodu ve depozito durumunu sadece kendi kaydınız kapsamında takip edin.",
        locale
      )
    : fieldView
      ? localizeBusinessCopy(
          "Saha ekibi için giriş-çıkış, temizlik, erişim ve operasyon görevleri sadeleştirilmiş çizelgede gösterilir.",
          locale
        )
      : localizeBusinessCopy(
          "Web uygulama içinde rezervasyon, check-in, check-out, temizlik, erişim kodu ve depozito süreçlerini yönetin.",
          locale
        )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">
          {localizeBusinessCopy("Rezervasyon & Giriş-Çıkış", locale)}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Aktif kayıt", locale)}
              </p>
              <AnimatedCounter value={visibleBookings.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Bugün giriş", locale)}
              </p>
              <AnimatedCounter value={moveIns} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TimerReset className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Bugün çıkış", locale)}
              </p>
              <AnimatedCounter value={checkouts} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Depozito kontrol", locale)}
              </p>
              <AnimatedCounter value={depositReviews} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">
              {clientView
                ? localizeBusinessCopy("Rezervasyon durumunuz", locale)
                : localizeBusinessCopy("Bugünkü operasyon çizelgesi", locale)}
            </h2>
            <StatusBadge variant="info">
              {moveIns + checkouts} {localizeBusinessCopy("aktif iş", locale)}
            </StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleSchedule.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={bookingVariant(booking.status)}>
                        {localizeBusinessCopy(bookingStatusLabels[booking.status], locale)}
                      </StatusBadge>
                      <StatusBadge variant={depositVariant(booking.depositStatus)}>
                        {localizeBusinessCopy(depositLabels[booking.depositStatus], locale)}
                      </StatusBadge>
                      <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>
                        {localizeBusinessCopy(accessLabels[booking.accessCodeStatus], locale)}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {booking.flatNumber} - {localizeBusinessCopy(booking.guestName, locale)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {channelLabel(booking.channel, locale)} - {localizeBusinessCopy("Giriş", locale)}{" "}
                      {shortDate(booking.checkIn, locale)} -{" "}
                      {localizeBusinessCopy("Çıkış", locale)} {shortDate(booking.checkOut, locale)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {maskFinance
                        ? localizeBusinessCopy(depositLabels[booking.depositStatus], locale)
                        : formatTry(booking.depositTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Depozito", locale)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {localizeBusinessCopy("Erişim kodu", locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy("Erişim durumu yalnızca yetkili kaydınız için gösterilir.", locale)
                    : localizeBusinessCopy(
                        "Borç, depozito ve kimlik kontrolü tamamlanınca erişim kodu onaya hazır hale gelir; aktivasyon insan onayıyla yapılır.",
                        locale
                      )}
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{accessPending}</p>
                <p className="text-xs text-muted-foreground">
                  {localizeBusinessCopy("bekleyen veya kısıtlı kayıt", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView
                    ? localizeBusinessCopy("Kapanış kontrolü", locale)
                    : localizeBusinessCopy("Hasar ve depozito", locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy(
                        "Check-out sonrası hasar, fotoğraf kanıtı ve iade kararı portal kaydına bağlanır.",
                        locale
                      )
                    : localizeBusinessCopy(
                        "Check-out sonrası fotoğraf, servis maliyeti ve depozito kesintisi aynı finans kaydına bağlanır.",
                        locale
                      )}
                </p>
              </div>
            </div>
          </Card3D>
          {!clientView && (
            <Card3D glow={false}>
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-card-foreground">
                    {fieldView
                      ? localizeBusinessCopy("Saha önceliği", locale)
                      : localizeBusinessCopy("AI doluluk önerisi", locale)}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fieldView
                      ? localizeBusinessCopy(
                          "Temizlik, erişim ve çıkış işleri günlük ekip kapasitesine göre sıralanır.",
                          locale
                        )
                      : localizeBusinessCopy(
                          "Boş daire, bakım durumu ve önceki kanal performansına göre fiyat ve kanal önerisi üretilebilir.",
                          locale
                        )}
                  </p>
                </div>
              </div>
            </Card3D>
          )}
        </div>
      </div>

      {showSalesPipeline && (
        <Card3D glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">
                  {localizeBusinessCopy("Gezinti ve online tur akışı", locale)}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {localizeBusinessCopy(
                  "New Level Premium satış görüşmeleri dil, alıcı hedefi, kanal, sorumlu danışman ve takip tarihiyle yönetilir.",
                  locale
                )}
              </p>
            </div>
            <StatusBadge variant="accent">
              {viewingSummary.total} {localizeBusinessCopy("aktif görüşme", locale)}
            </StatusBadge>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Onaylı tur", locale)}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.confirmed}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Takip gerekli", locale)}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.followUpDue}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("Online tur", locale)}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.onlineTours}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {localizeBusinessCopy("No-show kurtarma", locale)}
              </p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.noShow}</p>
            </div>
          </div>
          <DataTable
            data={viewingPipeline}
            pageSize={6}
            searchValue={(viewing) =>
              `${viewing.id} ${viewing.leadName} ${viewing.preferredUnit} ${viewing.channel} ${viewing.assignedTo} ${viewing.nextAction}`
            }
            columns={[
              { key: "id", header: localizeBusinessCopy("Tur", locale), sortable: true, render: (viewing) => viewing.id },
              { key: "lead", header: localizeBusinessCopy("Lead", locale), render: (viewing) => viewing.leadName },
              {
                key: "goal",
                header: localizeBusinessCopy("Hedef", locale),
                sortable: true,
                render: (viewing) => viewing.buyerGoal,
              },
              {
                key: "unit",
                header: localizeBusinessCopy("İstenen tip", locale),
                sortable: true,
                render: (viewing) => viewing.preferredUnit,
              },
              {
                key: "channel",
                header: localizeBusinessCopy("Kanal", locale),
                render: (viewing) => (
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {channelLabel(viewing.channel, locale)}
                  </span>
                ),
              },
              {
                key: "status",
                header: localizeBusinessCopy("Durum", locale),
                render: (viewing) => (
                  <StatusBadge variant={viewingVariant(viewing.status)}>
                    {viewingLabel(viewing.status, locale)}
                  </StatusBadge>
                ),
              },
              {
                key: "follow",
                header: localizeBusinessCopy("Takip", locale),
                render: (viewing) => shortDate(viewing.followUpDueAt, locale),
              },
              {
                key: "action",
                header: localizeBusinessCopy("Sonraki aksiyon", locale),
                render: (viewing) => localizeBusinessCopy(viewing.nextAction, locale),
              },
            ]}
          />
        </Card3D>
      )}

      <DataTable
        data={visibleBookings}
        searchValue={(booking) => `${booking.id} ${booking.flatNumber} ${booking.guestName} ${booking.channel}`}
        columns={[
          { key: "id", header: localizeBusinessCopy("Kayıt", locale), sortable: true, render: (booking) => booking.id },
          {
            key: "flat",
            header: localizeBusinessCopy("Daire", locale),
            sortable: true,
            render: (booking) => booking.flatNumber,
          },
          {
            key: "guest",
            header: clientView
              ? localizeBusinessCopy("Kayıt", locale)
              : localizeBusinessCopy("Misafir/Sakin", locale),
            render: (booking) => localizeBusinessCopy(booking.guestName, locale),
          },
          ...(!clientView
            ? [
                {
                  key: "channel",
                  header: localizeBusinessCopy("Kanal", locale),
                  sortable: true,
                  render: (booking: BookingRecord) => booking.channel,
                },
              ]
            : []),
          {
            key: "checkin",
            header: localizeBusinessCopy("Giriş", locale),
            sortable: true,
            sortValue: (booking) => booking.checkIn,
            render: (booking) => shortDate(booking.checkIn, locale),
          },
          {
            key: "checkout",
            header: localizeBusinessCopy("Çıkış", locale),
            sortable: true,
            sortValue: (booking) => booking.checkOut,
            render: (booking) => shortDate(booking.checkOut, locale),
          },
          {
            key: "status",
            header: localizeBusinessCopy("Durum", locale),
            render: (booking) => (
              <StatusBadge variant={bookingVariant(booking.status)}>
                {localizeBusinessCopy(bookingStatusLabels[booking.status], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "deposit",
            header: localizeBusinessCopy("Depozito", locale),
            render: (booking) => (
              <StatusBadge variant={depositVariant(booking.depositStatus)}>
                {localizeBusinessCopy(depositLabels[booking.depositStatus], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "access",
            header: localizeBusinessCopy("Erişim", locale),
            render: (booking) => (
              <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>
                {localizeBusinessCopy(accessLabels[booking.accessCodeStatus], locale)}
              </StatusBadge>
            ),
          },
          {
            key: "cleaning",
            header: localizeBusinessCopy("Temizlik", locale),
            render: (booking) => (
              <span className="inline-flex items-center gap-1 text-xs text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {cleaningStatusLabel(booking.cleaningStatus, locale)}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}
