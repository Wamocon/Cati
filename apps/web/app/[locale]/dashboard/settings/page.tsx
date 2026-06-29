"use client"

import { Bell, CheckCircle2, Eye, FileClock, Globe, Palette, Shield, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  auditEvents,
  getPlatformControlSummary,
  platformControls,
  roleCoverage,
  type AuditEvent,
  type PlatformControl,
} from "@/lib/site-management-data"

function controlVariant(status: PlatformControl["status"]) {
  if (status === "active") return "success"
  if (status === "review") return "warning"
  return "neutral"
}

function controlLabel(status: PlatformControl["status"]) {
  if (status === "active") return "Aktif"
  if (status === "review") return "İnceleme"
  return "Planlı"
}

function riskVariant(risk: AuditEvent["risk"]) {
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function riskLabel(risk: AuditEvent["risk"]) {
  if (risk === "high") return "Yüksek"
  if (risk === "medium") return "Orta"
  return "Düşük"
}

function booleanBadge(value: boolean) {
  return <StatusBadge variant={value ? "success" : "neutral"}>{value ? "Var" : "Yok"}</StatusBadge>
}

export default function SettingsPage() {
  const summary = getPlatformControlSummary()

  const configurationItems = [
    {
      icon: Bell,
      title: "Bildirim kuralları",
      desc: "Borç, SLA, check-in, check-out ve belge eksikliği için rol bazlı uyarılar.",
    },
    {
      icon: Shield,
      title: "Güvenlik politikası",
      desc: "Rol bazlı erişim, hassas finans işlemleri ve insan onaylı AI kararları.",
    },
    {
      icon: Globe,
      title: "Dil ve yerelleştirme",
      desc: "Türkçe ana kullanım, çok dilli sakin desteği ve resmi ton standardı.",
      action: <LocaleSwitcher />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Platform Yönetim Merkezi</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Rol yetki kapsamı, denetim izi, güvenlik kontrolleri ve kullanıcı görünürlüğü tek yönetim alanında takip edilir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Kontrol</p>
              <p className="text-2xl font-black">{summary.total}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Aktif</p>
              <p className="text-2xl font-black">{summary.active}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">İnceleme</p>
              <p className="text-2xl font-black">{summary.review}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Yüksek risk denetim</p>
              <p className="text-2xl font-black">{summary.highRiskAuditEvents}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">Güvenlik ve platform kontrolleri</h2>
            <p className="mt-1 text-xs text-muted-foreground">Her kontrolün sahibi, amacı ve canlı durumu yönetim için görünür.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {platformControls.map((control) => (
              <div key={control.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">{control.area} - {control.owner}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{control.title}</h3>
                  </div>
                  <StatusBadge variant={controlVariant(control.status)}>{controlLabel(control.status)}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{control.detail}</p>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Operasyon ayarları</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Yönetici, finans, güvenlik ve saha ekipleri aynı kontrol merkezinden standart kuralları görür.
                </p>
              </div>
            </div>
          </Card3D>
          {configurationItems.map((item) => (
            <Card3D key={item.title} glow={false}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-card-foreground">{item.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                {"action" in item ? item.action : null}
              </div>
            </Card3D>
          ))}
          <Card3D glow={false}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Palette className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-bold text-card-foreground">Görünüm</p>
                  <p className="text-xs text-muted-foreground">Açık/koyu tema desteği.</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
          </Card3D>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          data={roleCoverage}
          searchValue={(role) => role.role}
          pageSize={10}
          columns={[
            { key: "role", header: "Rol", sortable: true, render: (role) => role.role },
            { key: "users", header: "Kullanıcı", sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: "Finans onayı", render: (role) => booleanBadge(role.canApproveFinance) },
            { key: "access", header: "Erişim kısıtı", render: (role) => booleanBadge(role.canRestrictAccess) },
            { key: "usersManage", header: "Kullanıcı", render: (role) => booleanBadge(role.canManageUsers) },
            { key: "export", header: "Dışa aktarım", render: (role) => booleanBadge(role.canExportData) },
          ]}
        />

        <DataTable
          data={auditEvents}
          searchValue={(event) => `${event.actor} ${event.action} ${event.module} ${event.decision}`}
          pageSize={10}
          columns={[
            { key: "id", header: "Denetim", sortable: true, render: (event) => event.id },
            { key: "actor", header: "Aktör", render: (event) => event.actor },
            { key: "module", header: "Modül", sortable: true, render: (event) => event.module },
            { key: "risk", header: "Risk", render: (event) => <StatusBadge variant={riskVariant(event.risk)}>{riskLabel(event.risk)}</StatusBadge> },
            { key: "action", header: "Aksiyon", render: (event) => event.action },
          ]}
        />
      </div>

      <Card3D innerClassName="p-5" glow={false}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Platform sürümü: <span className="font-mono text-foreground">1Çatı ERP v2.5.0</span>
          </p>
        </div>
      </Card3D>
    </div>
  )
}
