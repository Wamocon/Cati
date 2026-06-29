"use client"

import { BadgeCheck, Languages, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { PeopleDirectoryLive } from "@/components/people-directory-live"
import { StatusBadge } from "@/components/status-badge"
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

function booleanBadge(value: boolean) {
  return <StatusBadge variant={value ? "success" : "neutral"}>{value ? "Var" : "Yok"}</StatusBadge>
}

export default function UsersPage() {
  const staffSummary = getStaffSummary()
  const residentSummary = getResidentSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Kullanıcılar & Roller</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Malik, kiracı, misafir ve personel kayıtları; dil, görev yükü ve yetki kapsamı tek yönetim alanında izlenir.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Personel</p>
              <AnimatedCounter value={staffSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Sakin kaydı</p>
              <AnimatedCounter value={residentSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Aktif görev</p>
              <AnimatedCounter value={staffSummary.activeTasks} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Finans onaycı</p>
              <AnimatedCounter value={staffSummary.financeApprovers} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <PeopleDirectoryLive />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">Personel operasyon kapsamı</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Her ekip üyesinin rolü, saha yükü, onay limiti ve erişim kapsamı yönetim için görünürdür.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {staffMembers.map((member) => (
              <div key={member.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant={staffRoleVariant(member.role)}>{staffRoleLabel(member.role)}</StatusBadge>
                      <StatusBadge variant={statusVariant(member.status)}>{statusLabel(member.status)}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-foreground">{member.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{member.team} - {member.phone}</p>
                  </div>
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">Görev</p>
                    <p className="font-bold text-foreground">{member.activeTasks}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">Limit</p>
                    <p className="font-bold text-foreground">{formatTry(member.approvalLimitTry)}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">Kapsam</p>
                    <p className="font-bold text-foreground">{scopeLabel(member.accessScope)}</p>
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
                <h2 className="text-sm font-bold text-card-foreground">Yetki prensibi</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Kullanıcı sadece kendi görevi için gerekli modülleri görür. Finans, erişim ve kullanıcı yönetimi ayrı onay kapsamındadır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Malik</p>
                <p className="mt-1 text-xl font-black">{residentSummary.owners}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Kiracı</p>
                <p className="mt-1 text-xl font-black">{residentSummary.tenants}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Misafir</p>
                <p className="mt-1 text-xl font-black">{residentSummary.guests}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">Riskli</p>
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
            { key: "name", header: "Ad", sortable: true, render: (member) => member.name },
            { key: "role", header: "Rol", render: (member) => <StatusBadge variant={staffRoleVariant(member.role)}>{staffRoleLabel(member.role)}</StatusBadge> },
            { key: "team", header: "Ekip", sortable: true, render: (member) => member.team },
            { key: "tasks", header: "Görev", sortable: true, sortValue: (member) => member.activeTasks, render: (member) => member.activeTasks },
            { key: "scope", header: "Kapsam", render: (member) => scopeLabel(member.accessScope) },
            { key: "status", header: "Durum", render: (member) => <StatusBadge variant={statusVariant(member.status)}>{statusLabel(member.status)}</StatusBadge> },
          ]}
        />

        <DataTable
          data={roleCoverage}
          searchValue={(role) => role.role}
          pageSize={10}
          columns={[
            { key: "role", header: "Rol", sortable: true, render: (role) => role.role },
            { key: "users", header: "Kullanıcı", sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: "Finans", render: (role) => booleanBadge(role.canApproveFinance) },
            { key: "access", header: "Erişim", render: (role) => booleanBadge(role.canRestrictAccess) },
            { key: "manage", header: "Kullanıcı", render: (role) => booleanBadge(role.canManageUsers) },
            { key: "export", header: "Export", render: (role) => booleanBadge(role.canExportData) },
          ]}
        />
      </div>
    </div>
  )
}
