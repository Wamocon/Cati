"use client"

import { useLocale } from "next-intl"
import { Bell, CheckCircle2, Eye, FileClock, Globe, Palette, Shield, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { LocaleSwitcher } from "@/components/locale-switcher"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
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

function controlLabel(status: PlatformControl["status"], locale: string) {
  if (status === "active") return localizeBusinessCopy("Aktif", locale)
  if (status === "review") return localizeBusinessCopy("İnceleme", locale)
  return localizeBusinessCopy("Planlı", locale)
}

function riskVariant(risk: AuditEvent["risk"]) {
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function riskLabel(risk: AuditEvent["risk"], locale: string) {
  if (risk === "high") return localizeBusinessCopy("Yüksek", locale)
  if (risk === "medium") return localizeBusinessCopy("Orta", locale)
  return localizeBusinessCopy("Düşük", locale)
}

function booleanBadge(value: boolean, locale: string) {
  return (
    <StatusBadge variant={value ? "success" : "neutral"}>
      {value ? localizeBusinessCopy("Var", locale) : localizeBusinessCopy("Yok", locale)}
    </StatusBadge>
  )
}

export default function SettingsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const summary = getPlatformControlSummary()

  const configurationItems = [
    {
      icon: Bell,
      title: localizeBusinessCopy("Bildirim kuralları", locale),
      desc: localizeBusinessCopy("Borç, SLA, check-in, check-out ve belge eksikliği için rol bazlı uyarılar.", locale),
    },
    {
      icon: Shield,
      title: localizeBusinessCopy("Güvenlik politikası", locale),
      desc: localizeBusinessCopy("Rol bazlı erişim, hassas finans işlemleri ve insan onaylı AI kararları.", locale),
    },
    {
      icon: Globe,
      title: localizeBusinessCopy("Dil ve yerelleştirme", locale),
      desc: localizeBusinessCopy("Türkçe ana kullanım, çok dilli sakin desteği ve resmi ton standardı.", locale),
      action: <LocaleSwitcher />,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("Platform Yönetim Merkezi", locale)}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {localizeBusinessCopy("Rol yetki kapsamı, denetim izi, güvenlik kontrolleri ve kullanıcı görünürlüğü tek yönetim alanında takip edilir.", locale)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Kontrol", locale)}</p>
              <p className="text-2xl font-black">{summary.total}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Aktif", locale)}</p>
              <p className="text-2xl font-black">{summary.active}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("İnceleme", locale)}</p>
              <p className="text-2xl font-black">{summary.review}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Yüksek risk denetim", locale)}</p>
              <p className="text-2xl font-black">{summary.highRiskAuditEvents}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Güvenlik ve platform kontrolleri", locale)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{localizeBusinessCopy("Her kontrolün sahibi, amacı ve canlı durumu yönetim için görünür.", locale)}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {platformControls.map((control) => (
              <div key={control.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p lang="en" className="text-xs font-semibold uppercase text-muted-foreground">{control.area} - {control.owner}</p>
                    <h3 className="mt-1 text-sm font-black text-foreground">{localizeBusinessCopy(control.title, locale)}</h3>
                  </div>
                  <StatusBadge variant={controlVariant(control.status)}>{controlLabel(control.status, locale)}</StatusBadge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{localizeBusinessCopy(control.detail, locale)}</p>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Operasyon ayarları", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Yönetici, finans, güvenlik ve saha ekipleri aynı kontrol merkezinden standart kuralları görür.", locale)}
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
                  <p className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Görünüm", locale)}</p>
                  <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Açık/koyu tema desteği.", locale)}</p>
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
            { key: "role", header: localizeBusinessCopy("Rol", locale), sortable: true, render: (role) => localizeBusinessCopy(role.role, locale) },
            { key: "users", header: localizeBusinessCopy("Kullanıcı", locale), sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: localizeBusinessCopy("Finans onayı", locale), render: (role) => booleanBadge(role.canApproveFinance, locale) },
            { key: "access", header: localizeBusinessCopy("Erişim kısıtı", locale), render: (role) => booleanBadge(role.canRestrictAccess, locale) },
            { key: "usersManage", header: localizeBusinessCopy("Kullanıcı", locale), render: (role) => booleanBadge(role.canManageUsers, locale) },
            { key: "export", header: localizeBusinessCopy("Dışa aktarım", locale), render: (role) => booleanBadge(role.canExportData, locale) },
          ]}
        />

        <DataTable
          data={auditEvents}
          searchValue={(event) => `${event.actor} ${event.action} ${event.module} ${event.decision}`}
          pageSize={10}
          columns={[
            { key: "id", header: localizeBusinessCopy("Denetim", locale), sortable: true, render: (event) => event.id },
            { key: "actor", header: localizeBusinessCopy("Aktör", locale), render: (event) => localizeBusinessCopy(event.actor, locale) },
            { key: "module", header: localizeBusinessCopy("Modül", locale), sortable: true, render: (event) => localizeBusinessCopy(event.module, locale) },
            { key: "risk", header: localizeBusinessCopy("Risk", locale), render: (event) => <StatusBadge variant={riskVariant(event.risk)}>{riskLabel(event.risk, locale)}</StatusBadge> },
            { key: "action", header: localizeBusinessCopy("Aksiyon", locale), render: (event) => localizeBusinessCopy(event.action, locale) },
          ]}
        />
      </div>

      <Card3D innerClassName="p-5" glow={false}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {localizeBusinessCopy("Platform sürümü:", locale)} <span className="font-mono text-foreground">1Çatı ERP v2.5.0</span>
          </p>
        </div>
      </Card3D>
    </div>
  )
}
