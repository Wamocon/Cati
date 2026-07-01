"use client"

import { useLocale } from "next-intl"
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  KeyRound,
  ListChecks,
  LockKeyhole,
  MessageCircle,
  Sparkles,
  ShieldCheck,
  TimerReset,
  Video,
  WalletCards,
} from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DashboardSection } from "@/components/dashboard-section"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { PieChart } from "@/components/charts/pie-chart"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
  toIntlLocale,
} from "@/lib/operational-copy"
import {
  isClientRole,
  isFieldRole,
  shouldMaskFinance,
  visibleAccessHandoffsForRole,
  visibleBookingsForRole,
  visibleBookingReadinessForRole,
  visibleDepositSettlementsForRole,
  visibleTurnoverTasksForRole,
} from "@/lib/role-scoped-views"
import {
  accessHandoffs,
  accessLabels,
  bookingReadinessRecords,
  bookingStatusLabels,
  bookings,
  depositSettlements,
  depositLabels,
  formatTry,
  getBookingOperationsSummary,
  getViewingSummary,
  priorityLabels,
  turnoverTasks,
  type AccessStatus,
  type BookingRecord,
  type BookingStatus,
  type DepositStatus,
  type DepositSettlementRecord,
  type ServicePriority,
  type TurnoverTaskRecord,
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

function viewingLabel(status: ViewingStatus, t: (value: string) => string) {
  if (status === "planned") return t("Planlandı")
  if (status === "confirmed") return t("Onaylandı")
  if (status === "completed") return t("Tamamlandı")
  if (status === "follow_up_due") return t("Takip gerekli")
  return t("Gelmedi")
}

function riskVariant(risk: "low" | "medium" | "high" | "critical") {
  if (risk === "critical" || risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function taskStatusVariant(status: TurnoverTaskRecord["status"]) {
  if (status === "ready") return "success"
  if (status === "blocked") return "danger"
  if (status === "in_progress") return "warning"
  return "neutral"
}

function settlementVariant(status: DepositSettlementRecord["status"]) {
  if (status === "closed" || status === "finance_ready") return "success"
  if (status === "manager_review" || status === "evidence_needed") return "warning"
  return "neutral"
}

function priorityVariant(priority: ServicePriority) {
  if (priority === "urgent" || priority === "high") return "danger"
  if (priority === "medium") return "warning"
  return "neutral"
}

function shortDate(date: string, locale: ReturnType<typeof resolveDashboardLocale>) {
  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export default function CalendarPage() {
  const user = useUser()
  const locale = resolveDashboardLocale(useLocale())
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const formatDate = (date: string) => shortDate(date, locale)
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const maskFinance = shouldMaskFinance(user.role)
  const visibleBookings = visibleBookingsForRole(user.role, bookings)
  const visibleReadiness = visibleBookingReadinessForRole(user.role, bookingReadinessRecords)
  const visibleTurnoverTasks = visibleTurnoverTasksForRole(user.role, turnoverTasks)
  const visibleAccessHandoffs = visibleAccessHandoffsForRole(user.role, accessHandoffs)
  const visibleSettlements = visibleDepositSettlementsForRole(user.role, depositSettlements)
  const bookingOpsSummary = getBookingOperationsSummary()
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
    (operationSchedule.length > 0 ? operationSchedule : visibleBookings).slice(0, 4)
  const showSalesPipeline = !clientView && !fieldView
  const readinessAverage =
    visibleReadiness.length > 0
      ? Math.round(
          visibleReadiness.reduce((sum, record) => sum + record.readinessScore, 0) /
            visibleReadiness.length
        )
      : 0
  const blockedTurnover = visibleTurnoverTasks.filter((task) => task.status === "blocked").length
  const openSettlements = visibleSettlements.filter((settlement) => settlement.status !== "closed").length
  const readinessRiskData = [
    {
      label: "low",
      value: visibleReadiness.filter((record) => record.riskLevel === "low").length,
      color: "var(--primary)",
    },
    {
      label: "medium",
      value: visibleReadiness.filter((record) => record.riskLevel === "medium").length,
      color: "var(--accent)",
    },
    {
      label: "high",
      value: visibleReadiness.filter((record) => record.riskLevel === "high" || record.riskLevel === "critical").length,
      color: "var(--destructive)",
    },
  ]
  const turnoverStatusData = [
    {
      label: "ready",
      value: visibleTurnoverTasks.filter((task) => task.status === "ready").length,
      color: "var(--primary)",
    },
    {
      label: "progress",
      value: visibleTurnoverTasks.filter((task) => task.status === "in_progress").length,
      color: "var(--accent)",
    },
    {
      label: "blocked",
      value: blockedTurnover,
      color: "var(--destructive)",
    },
  ]

  const pageIntro = clientView
    ? t("Yetkili rezervasyon, giriş-çıkış, erişim kodu ve depozito durumunu sadece kendi kaydınız kapsamında takip edin.")
    : fieldView
      ? t("Saha ekibi için giriş-çıkış, temizlik, erişim ve operasyon görevleri sadeleştirilmiş çizelgede gösterilir.")
      : t("Web uygulama içinde rezervasyon, check-in, check-out, temizlik, erişim kodu ve depozito süreçlerini yönetin.")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("Rezervasyon & Giriş-Çıkış")}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{pageIntro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Aktif kayıt")}</p>
              <AnimatedCounter value={visibleBookings.length} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Bugün giriş")}</p>
              <AnimatedCounter value={moveIns} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <TimerReset className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Bugün çıkış")}</p>
              <AnimatedCounter value={checkouts} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Depozito kontrol")}</p>
              <AnimatedCounter value={depositReviews} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DashboardSection
          icon={ClipboardCheck}
          title={t("Giriş hazırlığı komuta panosu")}
          description={t("Kimlik, ödeme/depozito, temizlik, erişim ve karşılama mesajı kontrolleri misafir girmeden önce takip edilir.")}
          info={t("Bu panel bilinçli olarak kısa tutulur. Hazırlık kuyruğu büyüdüğünde aşağıdaki tam rezervasyon tablosunu kullanın.")}
          actionHref="/dashboard/calendar#reservations-table"
          actionLabel={t("Tüm rezervasyonlar")}
          badge={
            <StatusBadge variant={readinessAverage >= 80 ? "success" : readinessAverage >= 60 ? "warning" : "danger"}>
              {readinessAverage}% {t("hazır")}
            </StatusBadge>
          }
        >
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Sistem kuyruğu")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{bookingOpsSummary.totalBookings}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Bloke/risk")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{visibleReadiness.filter((record) => record.riskLevel === "high" || record.riskLevel === "critical").length}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Erişim bekliyor")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{visibleAccessHandoffs.filter((handoff) => handoff.status === "pending" || handoff.status === "restricted").length}</p>
            </div>
          </div>
          <div className="mb-4 rounded-xl border border-border bg-muted/20 p-3">
            <PieChart data={readinessRiskData} size={132} ariaLabel={t("Giriş hazırlığı risk dağılımı")} totalLabel={t("toplam")} />
          </div>
          <DataTable
            data={visibleReadiness}
            pageSize={4}
            searchValue={(record) => `${record.id} ${record.bookingId} ${record.flatNumber} ${record.guestName} ${record.blocker} ${record.nextAction}`}
            columns={[
              { key: "id", header: t("Kuyruk"), sortable: true, render: (record) => record.id },
              { key: "flat", header: t("Daire"), sortable: true, render: (record) => record.flatNumber },
              { key: "guest", header: clientView ? t("Kayıt") : t("Misafir"), render: (record) => record.guestName },
              {
                key: "score",
                header: t("Hazır"),
                sortable: true,
                sortValue: (record) => record.readinessScore,
                render: (record) => `${record.readinessScore}%`,
              },
              {
                key: "risk",
                header: t("Risk"),
                render: (record) => <StatusBadge variant={riskVariant(record.riskLevel)}>{t(record.riskLevel)}</StatusBadge>,
              },
              { key: "next", header: t("Sonraki aksiyon"), render: (record) => record.nextAction },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: t("Aksiyon"),
                      sticky: "right" as const,
                      render: (record: (typeof visibleReadiness)[number]) => (
                        <DashboardActionMenu
                          compact
                          label={t("Rezervasyon aksiyonlari")}
                          ariaLabel={`${record.bookingId} ${t("Rezervasyon aksiyonlari")}`}
                          items={[
                            {
                              key: "move-in",
                              label: t("Move-in hazırlığı"),
                              description: `${record.flatNumber} ${t("için hazırlık skoru")} ${record.readinessScore}%.`,
                              icon: <ListChecks />,
                              actionType: "reservations.move_in.prepare",
                              ariaLabel: t("Move-in hazırlığını hazırla"),
                              entityTable: "reservations",
                              entityExternalId: record.bookingId,
                              title: record.nextAction,
                              metadata: {
                                flatNumber: record.flatNumber,
                                readinessScore: record.readinessScore,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </DashboardSection>

        <DashboardSection
          icon={ShieldCheck}
          title={t("Çıkış, erişim ve mutabakat kontrolü")}
          description={t("Temizlik, medya kanıtı, erişim iptali ve depozito hesabı tek operasyon görünümünde izlenir.")}
          info={t("Burada yalnızca sıradaki devir işleri gösterilir. Tam sayfalı devir tablosuna başlıktan ulaşabilirsiniz.")}
          actionHref="/dashboard/calendar#turnover-table"
          actionLabel={t("Tüm devir işleri")}
          badge={
            <StatusBadge variant={blockedTurnover > 0 ? "danger" : "success"}>
              {blockedTurnover} {t("bloke")}
            </StatusBadge>
          }
        >
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold uppercase text-muted-foreground">{t("Devir SLA")}</h3>
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">{visibleTurnoverTasks.length}</p>
              <p className="text-xs text-muted-foreground">{t("temizlik, kanıt ve hesap kapama işleri")}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-center gap-2">
                <WalletCards className="h-4 w-4 text-rose-600" />
                <h3 className="text-xs font-bold uppercase text-muted-foreground">{t("Açık mutabakat")}</h3>
              </div>
              <p className="mt-2 text-2xl font-black text-foreground">{openSettlements}</p>
              <p className="text-xs text-muted-foreground">
                {maskFinance ? t("finans gizli") : formatTry(visibleSettlements.reduce((sum, item) => sum + item.refundTry, 0))} {t("iade riski")}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-muted/20 p-3">
            <PieChart data={turnoverStatusData} size={132} ariaLabel={t("Devir görev durumu dağılımı")} totalLabel={t("toplam")} />
          </div>
          <div className="mt-4 space-y-3">
            {visibleTurnoverTasks.slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={taskStatusVariant(task.status)}>{task.status}</StatusBadge>
                      <StatusBadge variant={priorityVariant(task.priority)}>
                        {t(priorityLabels[task.priority])}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">{task.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.flatNumber} - {task.owner} - {t("son tarih")} {formatDate(task.dueAt)}
                    </p>
                  </div>
                  {!clientView && (
                    <DashboardActionMenu
                      compact
                      label={t("Devir aksiyonlari")}
                      ariaLabel={`${task.id} ${t("Devir aksiyonlari")}`}
                      items={[
                        {
                          key: "turnover",
                          label: t("Devir aksiyonu hazırla"),
                          description: `${task.progress}% ${t("ilerleme ile kayda al")}.`,
                          icon: <ClipboardCheck />,
                          actionType: task.title.includes("Final")
                            ? "reservations.checkout.prepare"
                            : "reservations.turnover.update",
                          ariaLabel: t("Devir aksiyonunu hazırla"),
                          entityTable: "reservations",
                          entityExternalId: task.bookingId,
                          title: task.title,
                          metadata: { taskId: task.id, progress: task.progress },
                        },
                      ]}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </DashboardSection>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">
              {clientView ? t("Rezervasyon durumunuz") : t("Bugünkü operasyon çizelgesi")}
            </h2>
            <StatusBadge variant="info">{moveIns + checkouts} {t("aktif iş")}</StatusBadge>
          </div>
          <div className="space-y-3">
            {visibleSchedule.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={bookingVariant(booking.status)}>
                        {t(bookingStatusLabels[booking.status])}
                      </StatusBadge>
                      <StatusBadge variant={depositVariant(booking.depositStatus)}>
                        {depositLabels[booking.depositStatus]}
                      </StatusBadge>
                      <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>
                        {t(accessLabels[booking.accessCodeStatus])}
                      </StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {booking.flatNumber} - {booking.guestName}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {booking.channel} - {t("Giriş")} {formatDate(booking.checkIn)} - {t("Çıkış")}{" "}
                      {formatDate(booking.checkOut)}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">
                      {maskFinance ? t(depositLabels[booking.depositStatus]) : formatTry(booking.depositTry)}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("Depozito")}</p>
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
                <h2 className="text-sm font-bold text-card-foreground">{t("Erişim kodu")}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? t("Erişim durumu yalnızca yetkili kaydınız için gösterilir.")
                    : t("Borç, depozito ve kimlik kontrolü tamamlanınca erişim kodu otomatik aktif olur.")}
                </p>
                <p className="mt-3 text-xl font-black text-foreground">{accessPending}</p>
                <p className="text-xs text-muted-foreground">{t("bekleyen veya kısıtlı kayıt")}</p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <LockKeyhole className="mt-0.5 h-5 w-5 text-rose-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView ? t("Kapanış kontrolü") : t("Hasar ve depozito")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? t("Check-out sonrası hasar, fotoğraf kanıtı ve iade kararı portal kaydına bağlanır.")
                    : t("Check-out sonrası fotoğraf, servis maliyeti ve depozito kesintisi aynı finans kaydına bağlanır.")}
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
                    {fieldView ? t("Saha önceliği") : t("AI doluluk önerisi")}
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fieldView
                      ? t("Temizlik, erişim ve çıkış işleri günlük ekip kapasitesine göre sıralanır.")
                      : t("Boş daire, bakım durumu ve önceki kanal performansına göre fiyat ve kanal önerisi üretilebilir.")}
                  </p>
                </div>
              </div>
            </Card3D>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card3D glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{t("Access handoff queue")}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Mobile code, card, plate and QR credentials are prepared in demo/provider-ready mode with manual fallback.")}
              </p>
            </div>
            <StatusBadge variant="info">{visibleAccessHandoffs.length} {t("handoff")}</StatusBadge>
          </div>
          <DataTable
            data={visibleAccessHandoffs}
            pageSize={6}
            searchValue={(handoff) => `${handoff.id} ${handoff.bookingId} ${handoff.flatNumber} ${handoff.credential} ${handoff.provider} ${handoff.blocker}`}
            columns={[
              { key: "id", header: t("Access"), sortable: true, render: (handoff) => handoff.id },
              { key: "flat", header: t("Daire"), sortable: true, render: (handoff) => handoff.flatNumber },
              { key: "credential", header: t("Credential"), sortable: true, render: (handoff) => handoff.credential },
              { key: "provider", header: t("Mode"), render: (handoff) => handoff.provider },
              {
                key: "status",
                header: t("Status"),
                render: (handoff) => (
                  <StatusBadge variant={accessVariant(handoff.status)}>{t(accessLabels[handoff.status])}</StatusBadge>
                ),
              },
              { key: "blocker", header: t("Blocker"), render: (handoff) => handoff.blocker },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: t("Action"),
                      sticky: "right" as const,
                      render: (handoff: (typeof visibleAccessHandoffs)[number]) => (
                        <DashboardActionMenu
                          compact
                          label={t("Erişim aksiyonlari")}
                          ariaLabel={`${handoff.id} ${t("Erişim aksiyonlari")}`}
                          items={[
                            {
                              key: "access",
                              label: t("Access handoff hazırla"),
                              description: `${handoff.provider} ${t("için")} ${t(handoff.status)} ${t("kaydı")}.`,
                              icon: <KeyRound />,
                              actionType: "reservations.access.prepare",
                              ariaLabel: t("Access handoff hazırla"),
                              entityTable: "reservations",
                              entityExternalId: handoff.bookingId,
                              title: handoff.nextAction,
                              metadata: {
                                accessHandoffId: handoff.id,
                                provider: handoff.provider,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>

        <Card3D glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <WalletCards className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{t("Deposit settlement queue")}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("Itemized damage, cleaning deductions, refund amount and approval owner are kept in the same audited flow.")}
              </p>
            </div>
            <StatusBadge variant={openSettlements > 0 ? "warning" : "success"}>{openSettlements} {t("open")}</StatusBadge>
          </div>
          <DataTable
            data={visibleSettlements}
            pageSize={6}
            searchValue={(settlement) => `${settlement.id} ${settlement.bookingId} ${settlement.flatNumber} ${settlement.guestName} ${settlement.nextAction}`}
            columns={[
              { key: "id", header: t("Settlement"), sortable: true, render: (settlement) => settlement.id },
              { key: "flat", header: t("Daire"), sortable: true, render: (settlement) => settlement.flatNumber },
              { key: "guest", header: clientView ? t("Kayıt") : t("Guest"), render: (settlement) => settlement.guestName },
              {
                key: "deposit",
                header: t("Deposit"),
                sortable: true,
                sortValue: (settlement) => settlement.depositTry,
                render: (settlement) => (maskFinance ? t("Masked") : formatTry(settlement.depositTry)),
              },
              {
                key: "refund",
                header: t("Refund"),
                sortable: true,
                sortValue: (settlement) => settlement.refundTry,
                render: (settlement) => (maskFinance ? t("Masked") : formatTry(settlement.refundTry)),
              },
              {
                key: "status",
                header: t("Status"),
                render: (settlement) => (
                  <StatusBadge variant={settlementVariant(settlement.status)}>{t(settlement.status)}</StatusBadge>
                ),
              },
              { key: "next", header: t("Next action"), render: (settlement) => settlement.nextAction },
              ...(!clientView
                ? [
                    {
                      key: "action",
                      header: t("Action"),
                      sticky: "right" as const,
                      render: (settlement: (typeof visibleSettlements)[number]) => (
                        <DashboardActionMenu
                          compact
                          label={t("Depozito aksiyonlari")}
                          ariaLabel={`${settlement.id} ${t("Depozito aksiyonlari")}`}
                          items={[
                            {
                              key: "deposit",
                              label: t("Depozito kararını incele"),
                              description: `${t(settlement.status)} ${t("durumu onaya hazırlanır")}.`,
                              icon: <WalletCards />,
                              actionType: "reservations.deposit.review",
                              ariaLabel: t("Depozito kararını incele"),
                              entityTable: "reservations",
                              entityExternalId: settlement.bookingId,
                              title: settlement.nextAction,
                              metadata: {
                                settlementId: settlement.id,
                                status: settlement.status,
                              },
                            },
                          ]}
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
        </Card3D>
      </div>

      {showSalesPipeline && (
        <Card3D glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h2 className="text-sm font-bold text-card-foreground">{t("Gezinti ve online tur akışı")}</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("New Level Premium satış görüşmeleri dil, alıcı hedefi, kanal, sorumlu danışman ve takip tarihiyle yönetilir.")}
              </p>
            </div>
            <StatusBadge variant="accent">{viewingSummary.total} {t("aktif görüşme")}</StatusBadge>
          </div>
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Onaylı tur")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.confirmed}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Takip gerekli")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.followUpDue}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("Online tur")}</p>
              <p className="mt-1 text-2xl font-black text-foreground">{viewingSummary.onlineTours}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("No-show kurtarma")}</p>
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
              { key: "id", header: t("Tur"), sortable: true, render: (viewing) => viewing.id },
              { key: "lead", header: "Lead", render: (viewing) => viewing.leadName },
              { key: "goal", header: t("Hedef"), sortable: true, render: (viewing) => viewing.buyerGoal },
              { key: "unit", header: t("İstenen tip"), sortable: true, render: (viewing) => viewing.preferredUnit },
              {
                key: "channel",
                header: t("Kanal"),
                render: (viewing) => (
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle className="h-3.5 w-3.5 text-muted-foreground" />
                    {viewing.channel}
                  </span>
                ),
              },
              {
                key: "status",
                header: t("Durum"),
                render: (viewing) => (
                  <StatusBadge variant={viewingVariant(viewing.status)}>
                    {viewingLabel(viewing.status, t)}
                  </StatusBadge>
                ),
              },
              { key: "follow", header: t("Takip"), render: (viewing) => formatDate(viewing.followUpDueAt) },
              { key: "action", header: t("Sonraki aksiyon"), render: (viewing) => viewing.nextAction },
            ]}
          />
        </Card3D>
      )}

      <DashboardSection
        title={t("Tam rezervasyon kaydı")}
        description={t("Tüm kayıtları kartlara yığmak yerine rezervasyonları arayın, sıralayın ve sayfalayın.")}
        info={t("Büyük operasyon veri setleri aranabilir tablolarda tutulur. Üstteki özet kartları bilinçli olarak kısa kalır.")}
        actionHref="/dashboard/calendar"
        actionLabel={t("Üst")}
      >
        <div id="reservations-table" className="scroll-mt-24">
          <DataTable
            data={visibleBookings}
            searchValue={(booking) => `${booking.id} ${booking.flatNumber} ${booking.guestName} ${booking.channel}`}
            columns={[
          { key: "id", header: t("Kayıt"), sortable: true, render: (booking) => booking.id },
          { key: "flat", header: t("Daire"), sortable: true, render: (booking) => booking.flatNumber },
          { key: "guest", header: clientView ? t("Kayıt") : t("Misafir/Sakin"), render: (booking) => booking.guestName },
          ...(!clientView
            ? [
                {
                  key: "channel",
                  header: t("Kanal"),
                  sortable: true,
                  render: (booking: BookingRecord) => booking.channel,
                },
              ]
            : []),
          {
            key: "checkin",
            header: t("Giriş"),
            sortable: true,
            sortValue: (booking) => booking.checkIn,
            render: (booking) => formatDate(booking.checkIn),
          },
          {
            key: "checkout",
            header: t("Çıkış"),
            sortable: true,
            sortValue: (booking) => booking.checkOut,
            render: (booking) => formatDate(booking.checkOut),
          },
          {
            key: "status",
            header: t("Durum"),
            render: (booking) => (
              <StatusBadge variant={bookingVariant(booking.status)}>
                {t(bookingStatusLabels[booking.status])}
              </StatusBadge>
            ),
          },
          {
            key: "deposit",
            header: t("Depozito"),
            render: (booking) => (
              <StatusBadge variant={depositVariant(booking.depositStatus)}>
                {t(depositLabels[booking.depositStatus])}
              </StatusBadge>
            ),
          },
          {
            key: "access",
            header: t("Erişim"),
            render: (booking) => (
              <StatusBadge variant={accessVariant(booking.accessCodeStatus)}>
                {t(accessLabels[booking.accessCodeStatus])}
              </StatusBadge>
            ),
          },
          {
            key: "cleaning",
            header: t("Temizlik"),
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
      </DashboardSection>

      <DashboardSection
        title={t("Tam devir görev kaydı")}
        description={t("Temizlik, kanıt, çıkış ve teslim işleri önizleme listesi yoğunlaşınca sayfalı tabloya taşınır.")}
        info={t("Önizleme panelinde rahat taranamayacak kadar çok iş olduğunda bu tabloyu kullanın.")}
        actionHref="/dashboard/calendar#reservations-table"
        actionLabel={t("Rezervasyonlar")}
      >
        <div id="turnover-table" className="scroll-mt-24">
          <DataTable
            data={visibleTurnoverTasks}
            pageSize={8}
            searchValue={(task) => `${task.id} ${task.bookingId} ${task.flatNumber} ${task.owner} ${task.title} ${task.nextAction}`}
            columns={[
              { key: "id", header: t("Görev"), sortable: true, render: (task) => task.id },
              { key: "flat", header: t("Daire"), sortable: true, render: (task) => task.flatNumber },
              { key: "title", header: t("İş"), render: (task) => task.title },
              {
                key: "status",
                header: t("Durum"),
                render: (task) => <StatusBadge variant={taskStatusVariant(task.status)}>{t(task.status)}</StatusBadge>,
              },
              {
                key: "priority",
                header: t("Öncelik"),
                render: (task) => <StatusBadge variant={priorityVariant(task.priority)}>{t(priorityLabels[task.priority])}</StatusBadge>,
              },
              {
                key: "due",
                header: t("Son tarih"),
                sortable: true,
                sortValue: (task) => task.dueAt,
                render: (task) => formatDate(task.dueAt),
              },
              { key: "next", header: t("Sonraki aksiyon"), render: (task) => task.nextAction },
            ]}
          />
        </div>
      </DashboardSection>
    </div>
  )
}
