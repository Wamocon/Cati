"use client"

import { CalendarDays, CheckCircle2, Clock, KeyRound, LockKeyhole, MessageCircle, Sparkles, TimerReset, Video, WalletCards } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  accessLabels,
  bookingStatusLabels,
  bookings,
  depositLabels,
  formatTry,
  getViewingSummary,
  type AccessStatus,
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

function viewingLabel(status: ViewingStatus) {
  if (status === "planned") return "Planlandı"
  if (status === "confirmed") return "Onaylandı"
  if (status === "completed") return "Tamamlandı"
  if (status === "follow_up_due") return "Takip gerekli"
  return "Gelmedi"
}

function shortDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(date))
}

export default function CalendarPage() {
  const moveIns = bookings.filter((booking) => booking.status === "move_in_today").length
  const checkouts = bookings.filter((booking) => booking.status === "checkout_today").length
  const depositReviews = bookings.filter((booking) => booking.depositStatus === "deduction_pending").length
  const accessPending = bookings.filter((booking) => booking.accessCodeStatus === "pending" || booking.accessCodeStatus === "restricted").length
  const viewingSummary = getViewingSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Rezervasyon & Giriş-Çıkış</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Web uygulama içinde rezervasyon, check-in, check-out, temizlik, erişim kodu ve depozito süreçlerini yönetir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Aktif kayıt</p>
              <AnimatedCounter value={bookings.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bugün giriş</p>
              <AnimatedCounter value={moveIns} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TimerReset className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bugün çıkış</p>
              <AnimatedCounter value={checkouts} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Depozito kontrol</p>
              <AnimatedCounter value={depositReviews} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Bugünkü operasyon çizelgesi</h2>
            <StatusBadge variant="info">{moveIns + checkouts} aktif iş</StatusBadge>
          </div>
          <div className="space-y-3">
            {bookings
              .filter((booking) => booking.status === "move_in_today" || booking.status === "checkout_today" || booking.status === "deposit_review")
              .map((booking) => (
                <div key={booking.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge variant={bookingVariant(booking.status)}>{bookingStatusLabels[booking.status]}</StatusBadge>
                        <StatusBadge variant={depositVariant(booking.depositStatus)}>{depositLabels[booking.depositStatus]}</StatusBadge>
                        <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>{accessLabels[booking.accessCodeStatus]}</StatusBadge>
                      </div>
                      <h3 className="mt-2 text-sm font-bold text-foreground">
                        {booking.flatNumber} - {booking.guestName}
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {booking.channel} - Giriş {shortDate(booking.checkIn)} - Çıkış {shortDate(booking.checkOut)}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-bold text-foreground">{formatTry(booking.depositTry)}</p>
                      <p className="text-xs text-muted-foreground">Depozito</p>
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
                <h2 className="text-sm font-bold text-card-foreground">Erişim kodu otomasyonu</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Borç, depozito ve kimlik kontrolü tamamlanınca erişim kodu otomatik aktif olur.
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{accessPending}</p>
                <p className="text-xs text-muted-foreground">bekleyen veya kısıtlı kayıt</p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Hasar ve depozito</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Check-out sonrası fotoğraf, servis maliyeti ve depozito kesintisi aynı finans kaydına bağlanır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">AI doluluk önerisi</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Boş daire, bakım durumu ve önceki kanal performansına göre fiyat ve kanal önerisi üretilebilir.
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">Phase 6 - Besichtigung & online tur pipeline</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              New Level Premium satış görüşmeleri dil, alıcı hedefi, kanal, sorumlu danışman ve takip tarihiyle yönetilir.
            </p>
          </div>
          <StatusBadge variant="accent">{viewingSummary.total} aktif görüşme</StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Onaylı tur</p>
            <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.confirmed}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Takip gerekli</p>
            <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.followUpDue}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Online tur</p>
            <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.onlineTours}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">No-show kurtarma</p>
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
            { key: "id", header: "Tur", sortable: true, render: (viewing) => viewing.id },
            { key: "lead", header: "Lead", render: (viewing) => viewing.leadName },
            { key: "goal", header: "Hedef", sortable: true, render: (viewing) => viewing.buyerGoal },
            { key: "unit", header: "İstenen tip", sortable: true, render: (viewing) => viewing.preferredUnit },
            { key: "channel", header: "Kanal", render: (viewing) => (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                {viewing.channel}
              </span>
            ) },
            { key: "status", header: "Durum", render: (viewing) => <StatusBadge variant={viewingVariant(viewing.status)}>{viewingLabel(viewing.status)}</StatusBadge> },
            { key: "follow", header: "Takip", render: (viewing) => shortDate(viewing.followUpDueAt) },
            { key: "action", header: "Sonraki aksiyon", render: (viewing) => viewing.nextAction },
          ]}
        />
      </Card3D>

      <DataTable
        data={bookings}
        searchValue={(booking) => `${booking.id} ${booking.flatNumber} ${booking.guestName} ${booking.channel}`}
        columns={[
          { key: "id", header: "Kayıt", sortable: true, render: (booking) => booking.id },
          { key: "flat", header: "Daire", sortable: true, render: (booking) => booking.flatNumber },
          { key: "guest", header: "Misafir/Sakin", render: (booking) => booking.guestName },
          { key: "channel", header: "Kanal", sortable: true, render: (booking) => booking.channel },
          {
            key: "checkin",
            header: "Giriş",
            sortable: true,
            sortValue: (booking) => booking.checkIn,
            render: (booking) => shortDate(booking.checkIn),
          },
          {
            key: "checkout",
            header: "Çıkış",
            sortable: true,
            sortValue: (booking) => booking.checkOut,
            render: (booking) => shortDate(booking.checkOut),
          },
          {
            key: "status",
            header: "Durum",
            render: (booking) => <StatusBadge variant={bookingVariant(booking.status)}>{bookingStatusLabels[booking.status]}</StatusBadge>,
          },
          {
            key: "deposit",
            header: "Depozito",
            render: (booking) => <StatusBadge variant={depositVariant(booking.depositStatus)}>{depositLabels[booking.depositStatus]}</StatusBadge>,
          },
          {
            key: "access",
            header: "Erişim",
            render: (booking) => <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>{accessLabels[booking.accessCodeStatus]}</StatusBadge>,
          },
          {
            key: "cleaning",
            header: "Temizlik",
            render: (booking) => (
              <span className="inline-flex items-center gap-1 text-xs text-foreground">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {booking.cleaningStatus}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}
