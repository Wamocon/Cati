"use client"

import { BadgeCheck, Languages, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react"
import { useLocale } from "next-intl"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { PeopleDirectoryLive } from "@/components/people-directory-live"
import { StatusBadge } from "@/components/status-badge"
import { TenantAccessPanel } from "@/components/tenant-access-panel"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import {
  formatTry,
  getResidentSummary,
  getStaffSummary,
  roleCoverage,
  staffMembers,
  type StaffMember,
} from "@/lib/site-management-data"

function staffRoleLabel(role: StaffMember["role"]) {
  if (role === "admin") return "Yönetim"
  if (role === "manager") return "Sorumlu"
  if (role === "accountant") return "Muhasebe"
  return "Personel"
}

function staffRoleVariant(role: StaffMember["role"]) {
  if (role === "admin" || role === "manager") return "accent"
  if (role === "accountant") return "warning"
  return "info"
}

function statusVariant(status: StaffMember["status"]) {
  if (status === "active") return "success"
  if (status === "training") return "warning"
  return "danger"
}

function statusLabel(status: StaffMember["status"]) {
  if (status === "active") return "Aktif"
  if (status === "training") return "Eğitim"
  return "Kısıtlı"
}

function scopeLabel(scope: StaffMember["accessScope"]) {
  if (scope === "all_site") return "Tüm site"
  if (scope === "operations") return "Operasyon"
  if (scope === "finance_only") return "Sadece finans"
  if (scope === "field_only") return "Saha"
  return "Sakin"
}

function booleanBadge(value: boolean, locale: string) {
  return (
    <StatusBadge variant={value ? "success" : "neutral"}>
      {value ? localizeBusinessCopy("Var", locale) : localizeBusinessCopy("Yok", locale)}
    </StatusBadge>
  )
}

export default function UsersPage() {
  const locale = resolveDashboardLocale(useLocale())
  const staffSummary = getStaffSummary()
  const residentSummary = getResidentSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("Kullanıcılar & Roller", locale)}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {localizeBusinessCopy("Malik, kiracı, misafir ve personel kayıtları; dil, görev yükü ve yetki kapsamı tek yönetim alanında izlenir.", locale)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Personel", locale)}</p>
              <AnimatedCounter value={staffSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Sakin kaydı", locale)}</p>
              <AnimatedCounter value={residentSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Aktif görev", locale)}</p>
              <AnimatedCounter value={staffSummary.activeTasks} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Finans onaycı", locale)}</p>
              <AnimatedCounter value={staffSummary.financeApprovers} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <PeopleDirectoryLive />

      <TenantAccessPanel />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Personel operasyon kapsamı", locale)}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {localizeBusinessCopy("Her ekip üyesinin rolü, saha yükü, onay limiti ve erişim kapsamı yönetim için görünürdür.", locale)}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {staffMembers.map((member) => (
              <div key={member.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant={staffRoleVariant(member.role)}>{localizeBusinessCopy(staffRoleLabel(member.role), locale)}</StatusBadge>
                      <StatusBadge variant={statusVariant(member.status)}>{localizeBusinessCopy(statusLabel(member.status), locale)}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-foreground">{localizeBusinessCopy(member.name, locale)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{localizeBusinessCopy(member.team, locale)} - {member.phone}</p>
                  </div>
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{localizeBusinessCopy("Görev", locale)}</p>
                    <p className="font-bold text-foreground">{member.activeTasks}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{localizeBusinessCopy("Limit", locale)}</p>
                    <p className="font-bold text-foreground">{formatTry(member.approvalLimitTry)}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{localizeBusinessCopy("Kapsam", locale)}</p>
                    <p className="font-bold text-foreground">{localizeBusinessCopy(scopeLabel(member.accessScope), locale)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Yetki prensibi", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {localizeBusinessCopy("Kullanıcı sadece kendi görevi için gerekli modülleri görür. Finans, erişim ve kullanıcı yönetimi ayrı onay kapsamındadır.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Malik", locale)}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.owners}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Kiracı", locale)}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.tenants}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Misafir", locale)}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.guests}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{localizeBusinessCopy("Riskli", locale)}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.highRisk}</p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          data={staffMembers}
          searchValue={(member) => `${member.name} ${member.team} ${staffRoleLabel(member.role)} ${member.phone}`}
          pageSize={10}
          columns={[
            { key: "name", header: localizeBusinessCopy("Ad", locale), sortable: true, render: (member) => localizeBusinessCopy(member.name, locale) },
            { key: "role", header: localizeBusinessCopy("Rol", locale), render: (member) => <StatusBadge variant={staffRoleVariant(member.role)}>{localizeBusinessCopy(staffRoleLabel(member.role), locale)}</StatusBadge> },
            { key: "team", header: localizeBusinessCopy("Ekip", locale), sortable: true, render: (member) => localizeBusinessCopy(member.team, locale) },
            { key: "tasks", header: localizeBusinessCopy("Görev", locale), sortable: true, sortValue: (member) => member.activeTasks, render: (member) => member.activeTasks },
            { key: "scope", header: localizeBusinessCopy("Kapsam", locale), render: (member) => localizeBusinessCopy(scopeLabel(member.accessScope), locale) },
            { key: "status", header: localizeBusinessCopy("Durum", locale), render: (member) => <StatusBadge variant={statusVariant(member.status)}>{localizeBusinessCopy(statusLabel(member.status), locale)}</StatusBadge> },
          ]}
        />

        <DataTable
          data={roleCoverage}
          searchValue={(role) => role.role}
          pageSize={10}
          columns={[
            { key: "role", header: localizeBusinessCopy("Rol", locale), sortable: true, render: (role) => localizeBusinessCopy(role.role, locale) },
            { key: "users", header: localizeBusinessCopy("Kullanıcı", locale), sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: localizeBusinessCopy("Finans onayı", locale), render: (role) => booleanBadge(role.canApproveFinance, locale) },
            { key: "access", header: localizeBusinessCopy("Erişim kısıtı", locale), render: (role) => booleanBadge(role.canRestrictAccess, locale) },
            { key: "manage", header: localizeBusinessCopy("Kullanıcı", locale), render: (role) => booleanBadge(role.canManageUsers, locale) },
            { key: "export", header: localizeBusinessCopy("Dışa aktarım", locale), render: (role) => booleanBadge(role.canExportData, locale) },
          ]}
        />
      </div>
    </div>
  )
}
