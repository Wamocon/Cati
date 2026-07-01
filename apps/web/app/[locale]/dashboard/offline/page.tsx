"use client"

import { CheckCircle2, CloudOff, MonitorSmartphone, RefreshCw, ShieldCheck, Smartphone, WifiOff } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { visibleOfflineSyncQueueForRole } from "@/lib/role-scoped-views"
import {
  getMobileWebSummary,
  mobileWebCapabilities,
  offlineSyncQueue,
  type MobileWebCapabilityRecord,
  type OfflineSyncRecord,
} from "@/lib/site-management-data"

function capabilityVariant(status: MobileWebCapabilityRecord["status"]) {
  if (status === "ready") return "success"
  if (status === "simulation") return "warning"
  if (status === "provider_ready") return "info"
  return "warning"
}

function capabilityLabel(status: MobileWebCapabilityRecord["status"]) {
  if (status === "ready") return "Hazır"
  if (status === "simulation") return "Sadece demo"
  if (status === "provider_ready") return "Sağlayıcı hazır"
  return "Cihaz testi"
}

function queueVariant(status: OfflineSyncRecord["status"]) {
  if (status === "synced") return "success"
  if (status === "queued" || status === "read_only_cached") return "info"
  return "warning"
}

function queueLabel(status: OfflineSyncRecord["status"]) {
  if (status === "read_only_cached") return "Salt okunur cache"
  if (status === "queued") return "Kuyrukta"
  if (status === "conflict") return "Çakışma"
  return "Senkron"
}

export default function OfflineSyncPage() {
  const user = useUser()
  const visibleQueue = visibleOfflineSyncQueueForRole(user.role, offlineSyncQueue)
  const summary = getMobileWebSummary(visibleQueue)
  const reviewTarget = visibleQueue.find((item) => item.status === "conflict") ?? visibleQueue[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">Mobil Web & Offline Sync</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Tek web uygulamasi mobilde kullanilir; native app yok. Bu ekran bugun demo/readiness seviyesindedir: PWA shell ve guvenli cache mantigi hazir, canli offline yazma kuyrugu ise production icin ayrica baglanmalidir.
          </p>
        </div>
        <DashboardActionMenu
          label="Aksiyonlar"
          ariaLabel="Offline sync aksiyonlari"
          items={[
            {
              key: "queue-review",
              label: "Demo kuyrugunu incele",
              description: "Cakisma ve guvenli cache kayitlarini denetler.",
              icon: <RefreshCw />,
              actionType: "offline_sync.queue.review",
              ariaLabel: "Offline kuyrugu incele",
              entityTable: "offline_sync_jobs",
              entityExternalId: reviewTarget?.id ?? "OFF-9001",
              title: "Offline cakisma kuyrugunu incele",
              metadata: { phase: 12, mode: "simulation", role: user.role },
            },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Kabiliyetler</p>
              <p className="text-2xl font-black">{summary.capabilities}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Hazır</p>
              <p className="text-2xl font-black">{summary.ready}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CloudOff className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Kuyruk yazımları</p>
              <p className="text-2xl font-black">{summary.queuedWrites}</p>
              <p className="mt-1 text-xs text-muted-foreground">Demo kuyruğu</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WifiOff className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Çakışmalar</p>
              <p className="text-2xl font-black">{summary.conflicts}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Faz 12 kabiliyet panosu</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Mobil öncelikli web davranışı aynı dashboard yüzeyinde hazırlanır. Gerçek offline yazım daha sonraki üretim entegrasyonudur; canlı vaat değildir.
              </p>
            </div>
            <StatusBadge variant="warning">Sadece demo sync</StatusBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {mobileWebCapabilities.map((item) => (
              <div key={item.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{item.surface} - {item.audience}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{item.title}</h3>
                  </div>
                  <StatusBadge variant={capabilityVariant(item.status)}>{capabilityLabel(item.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{item.description}</p>
                <p className="mt-2 text-xs font-semibold text-foreground">{item.qaSignal}</p>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Manuel mobil QA</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Müşteri UAT öncesinde giriş, yan menü, arama, talepler, rezervasyonlar, iletişim ve raporları telefon genişliğinde test edin.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Offline güvenlik sınırı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Finans, depozito, erişim ve rol değişiklikleri offline durumda kapalı kalır ve sunucu tarafı onay ister. Üretim yazım senkronu IndexedDB, tekrar işleri ve çakışma incelemesi gerektirir.
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={visibleQueue}
        searchValue={(item) => `${item.id} ${item.role} ${item.module} ${item.action} ${item.status} ${item.guardrail}`}
        columns={[
          { key: "id", header: "Kuyruk", sortable: true, render: (item) => item.id },
          { key: "role", header: "Rol", sortable: true, render: (item) => item.role },
          { key: "module", header: "Modül", sortable: true, render: (item) => item.module },
          { key: "status", header: "Durum", render: (item) => <StatusBadge variant={queueVariant(item.status)}>{queueLabel(item.status)}</StatusBadge> },
          { key: "action", header: "Aksiyon", render: (item) => item.action },
          { key: "guardrail", header: "Güvenlik sınırı", render: (item) => item.guardrail },
          {
            key: "review",
            header: "İnceleme",
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (item) => (
              <DashboardActionMenu
                compact
                label="Kuyruk aksiyonlari"
                ariaLabel={`${item.id} offline kuyruk aksiyonlari`}
                items={[
                  {
                    key: "review",
                    label: "Kaydi incele",
                    description: `${item.module} / ${item.status}`,
                    icon: <RefreshCw />,
                    actionType: "offline_sync.item.review",
                    ariaLabel: "Offline sync item review",
                    entityTable: "offline_sync_jobs",
                    entityExternalId: item.id,
                    title: `${item.id} incele`,
                    metadata: { status: item.status, module: item.module },
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
