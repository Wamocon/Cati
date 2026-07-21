"use client"

import { BadgeCheck, Languages, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react"
import { useLocale } from "next-intl"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { PeopleDirectoryLive } from "@/components/people-directory-live"
import { RoleGovernancePanel } from "@/components/role-governance-panel"
import { RegistrationReviewPanel } from "@/components/registration-review-panel"
import { UserAdministrationPanel } from "@/components/user-administration-panel"
import { StatusBadge } from "@/components/status-badge"
import { TenantAccessLivePanel } from "@/components/tenant-access-live-panel"
import {
  localizeDashboardTextPart,
  resolveDashboardLocale,
} from "@/lib/operational-copy"
import { formatDual } from "@/lib/currency"
import {
  getResidentSummary,
  getStaffSummary,
  roleCoverage,
  staffMembers,
  type StaffMember,
} from "@/lib/site-management-data"

const usersCopy = {
  tr: {
    title: "Kullanıcılar & Roller",
    subtitle: "Malik, kiracı, misafir ve personel kayıtları; dil, görev yükü ve yetki kapsamı tek yönetim alanında izlenir.",
    staff: "Personel",
    residentRecords: "Sakin kaydı",
    activeTasks: "Aktif görev",
    financeApprovers: "Finans onaycı",
    staffScopeTitle: "Personel operasyon kapsamı",
    staffScopeBody: "Her ekip üyesinin rolü, saha yükü, onay limiti ve erişim kapsamı yönetim için görünürdür.",
    permissionTitle: "Yetki prensibi",
    permissionBody: "Kullanıcı sadece kendi görevi için gerekli modülleri görür. Finans, erişim ve kullanıcı yönetimi ayrı onay kapsamındadır.",
    task: "Görev",
    limit: "Limit",
    scope: "Kapsam",
    owner: "Malik",
    tenant: "Kiracı",
    guest: "Misafir",
    risky: "Riskli",
    yes: "Var",
    no: "Yok",
    headers: {
      name: "Ad",
      role: "Rol",
      team: "Ekip",
      tasks: "Görev",
      scope: "Kapsam",
      status: "Durum",
      users: "Kullanıcı",
      finance: "Finans",
      access: "Erişim",
      export: "Dışa aktarım",
    },
    roles: { admin: "Yönetim", manager: "Sorumlu", accountant: "Muhasebe", staff: "Personel" },
    roleCoverage: { Yönetim: "Yönetim", Sorumlu: "Sorumlu", Muhasebe: "Muhasebe", Personel: "Personel", Malik: "Malik", Kiracı: "Kiracı" },
    statuses: { active: "Aktif", training: "Eğitim", restricted: "Kısıtlı" },
    scopes: { all_site: "Tüm site", operations: "Operasyon", finance_only: "Sadece finans", field_only: "Saha", resident_only: "Sakin" },
  },
  en: {
    title: "Users & Roles",
    subtitle: "Owner, tenant, guest and staff records are managed with language, workload and permission scope in one administration view.",
    staff: "Staff",
    residentRecords: "Resident records",
    activeTasks: "Active tasks",
    financeApprovers: "Finance approvers",
    staffScopeTitle: "Staff operating scope",
    staffScopeBody: "Each team member's role, field load, approval limit and access scope are visible to management.",
    permissionTitle: "Permission principle",
    permissionBody: "Users only see the modules required for their work. Finance, access and user administration stay in separate approval scopes.",
    task: "Tasks",
    limit: "Limit",
    scope: "Scope",
    owner: "Owner",
    tenant: "Tenant",
    guest: "Guest",
    risky: "Risk",
    yes: "Yes",
    no: "No",
    headers: {
      name: "Name",
      role: "Role",
      team: "Team",
      tasks: "Tasks",
      scope: "Scope",
      status: "Status",
      users: "Users",
      finance: "Finance",
      access: "Access",
      export: "Export",
    },
    roles: { admin: "Administration", manager: "Manager", accountant: "Accounting", staff: "Staff" },
    roleCoverage: { Yönetim: "Administration", Sorumlu: "Manager", Muhasebe: "Accounting", Personel: "Staff", Malik: "Owner", Kiracı: "Tenant" },
    statuses: { active: "Active", training: "Training", restricted: "Restricted" },
    scopes: { all_site: "Full site", operations: "Operations", finance_only: "Finance only", field_only: "Field only", resident_only: "Resident" },
  },
  de: {
    title: "Benutzer & Rollen",
    subtitle: "Eigentümer-, Mieter-, Gäste- und Personaldaten werden mit Sprache, Arbeitslast und Berechtigungsumfang zentral verwaltet.",
    staff: "Personal",
    residentRecords: "Bewohnerdaten",
    activeTasks: "Aktive Aufgaben",
    financeApprovers: "Finanzfreigaben",
    staffScopeTitle: "Operationsumfang des Personals",
    staffScopeBody: "Rolle, Feldlast, Freigabelimit und Zugriffsbereich jedes Teammitglieds sind für das Management sichtbar.",
    permissionTitle: "Berechtigungsprinzip",
    permissionBody: "Benutzer sehen nur die Module, die für ihre Aufgabe nötig sind. Finanzen, Zugang und Benutzerverwaltung bleiben getrennte Freigabebereiche.",
    task: "Aufgaben",
    limit: "Limit",
    scope: "Umfang",
    owner: "Eigentümer",
    tenant: "Mieter",
    guest: "Gast",
    risky: "Risiko",
    yes: "Ja",
    no: "Nein",
    headers: {
      name: "Name",
      role: "Rolle",
      team: "Team",
      tasks: "Aufgaben",
      scope: "Umfang",
      status: "Status",
      users: "Benutzer",
      finance: "Finanzen",
      access: "Zugang",
      export: "Export",
    },
    roles: { admin: "Administration", manager: "Manager", accountant: "Buchhaltung", staff: "Personal" },
    roleCoverage: { Yönetim: "Administration", Sorumlu: "Manager", Muhasebe: "Buchhaltung", Personel: "Personal", Malik: "Eigentümer", Kiracı: "Mieter" },
    statuses: { active: "Aktiv", training: "Training", restricted: "Eingeschränkt" },
    scopes: { all_site: "Gesamte Anlage", operations: "Operations", finance_only: "Nur Finanzen", field_only: "Nur Feldteam", resident_only: "Bewohner" },
  },
  ru: {
    title: "Пользователи и роли",
    subtitle: "Записи владельцев, арендаторов, гостей и сотрудников управляются вместе с языком, нагрузкой и областью доступа.",
    staff: "Персонал",
    residentRecords: "Записи резидентов",
    activeTasks: "Активные задачи",
    financeApprovers: "Финансовые согласующие",
    staffScopeTitle: "Операционный охват персонала",
    staffScopeBody: "Роль, полевая нагрузка, лимит одобрения и доступ каждого сотрудника видны управлению.",
    permissionTitle: "Принцип доступа",
    permissionBody: "Пользователь видит только нужные для своей работы модули. Финансы, доступ и управление пользователями остаются отдельными зонами одобрения.",
    task: "Задачи",
    limit: "Лимит",
    scope: "Охват",
    owner: "Владелец",
    tenant: "Арендатор",
    guest: "Гость",
    risky: "Риск",
    yes: "Да",
    no: "Нет",
    headers: {
      name: "Имя",
      role: "Роль",
      team: "Команда",
      tasks: "Задачи",
      scope: "Охват",
      status: "Статус",
      users: "Пользователи",
      finance: "Финансы",
      access: "Доступ",
      export: "Экспорт",
    },
    roles: { admin: "Администрация", manager: "Менеджер", accountant: "Бухгалтерия", staff: "Персонал" },
    roleCoverage: { Yönetim: "Администрация", Sorumlu: "Менеджер", Muhasebe: "Бухгалтерия", Personel: "Персонал", Malik: "Владелец", Kiracı: "Арендатор" },
    statuses: { active: "Активен", training: "Обучение", restricted: "Ограничен" },
    scopes: { all_site: "Весь объект", operations: "Операции", finance_only: "Только финансы", field_only: "Только полевая команда", resident_only: "Резидент" },
  },
} as const

function resolveUsersLocale(locale: string): keyof typeof usersCopy {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function staffRoleLabel(role: StaffMember["role"], copy: (typeof usersCopy)[keyof typeof usersCopy]) {
  return copy.roles[role]
}

function roleCoverageLabel(role: string, copy: (typeof usersCopy)[keyof typeof usersCopy]) {
  return copy.roleCoverage[role as keyof typeof copy.roleCoverage] ?? role
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

function statusLabel(status: StaffMember["status"], copy: (typeof usersCopy)[keyof typeof usersCopy]) {
  return copy.statuses[status]
}

function scopeLabel(scope: StaffMember["accessScope"], copy: (typeof usersCopy)[keyof typeof usersCopy]) {
  return copy.scopes[scope]
}

function booleanBadge(value: boolean, copy: (typeof usersCopy)[keyof typeof usersCopy]) {
  return <StatusBadge variant={value ? "success" : "neutral"}>{value ? copy.yes : copy.no}</StatusBadge>
}

export default function UsersPage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = usersCopy[resolveUsersLocale(locale)]
  const t = (value: string) => localizeDashboardTextPart(value, locale)
  const staffSummary = getStaffSummary()
  const residentSummary = getResidentSummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {copy.subtitle}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <UserCog className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.staff}</p>
              <AnimatedCounter value={staffSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.residentRecords}</p>
              <AnimatedCounter value={residentSummary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BadgeCheck className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.activeTasks}</p>
              <AnimatedCounter value={staffSummary.activeTasks} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WalletCards className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.financeApprovers}</p>
              <AnimatedCounter value={staffSummary.financeApprovers} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <UserAdministrationPanel />

      <RoleGovernancePanel />

      <RegistrationReviewPanel />

      <PeopleDirectoryLive />

      <TenantAccessLivePanel />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">{copy.staffScopeTitle}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.staffScopeBody}
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {staffMembers.map((member) => (
              <div key={member.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge variant={staffRoleVariant(member.role)}>{staffRoleLabel(member.role, copy)}</StatusBadge>
                      <StatusBadge variant={statusVariant(member.status)}>{statusLabel(member.status, copy)}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-black text-foreground">{t(member.name)}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{t(member.team)} - {member.phone}</p>
                  </div>
                  <Languages className="h-5 w-5 text-primary" />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{copy.task}</p>
                    <p className="font-bold text-foreground">{member.activeTasks}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{copy.limit}</p>
                    <p className="font-bold text-foreground">{formatDual(member.approvalLimitTry)}</p>
                  </div>
                  <div className="rounded-lg bg-background/70 p-2">
                    <p className="text-muted-foreground">{copy.scope}</p>
                    <p className="font-bold text-foreground">{scopeLabel(member.accessScope, copy)}</p>
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
                <h2 className="text-sm font-bold text-card-foreground">{copy.permissionTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.permissionBody}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{copy.owner}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.owners}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{copy.tenant}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.tenants}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{copy.guest}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.guests}</p>
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">{copy.risky}</p>
                <p className="mt-1 text-xl font-black">{residentSummary.highRisk}</p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          data={staffMembers}
          searchValue={(member) => `${t(member.name)} ${t(member.team)} ${staffRoleLabel(member.role, copy)} ${member.phone}`}
          pageSize={10}
          columns={[
            { key: "name", header: copy.headers.name, sortable: true, render: (member) => t(member.name) },
            { key: "role", header: copy.headers.role, render: (member) => <StatusBadge variant={staffRoleVariant(member.role)}>{staffRoleLabel(member.role, copy)}</StatusBadge> },
            { key: "team", header: copy.headers.team, sortable: true, render: (member) => t(member.team) },
            { key: "tasks", header: copy.headers.tasks, sortable: true, sortValue: (member) => member.activeTasks, render: (member) => member.activeTasks },
            { key: "scope", header: copy.headers.scope, render: (member) => scopeLabel(member.accessScope, copy) },
            { key: "status", header: copy.headers.status, render: (member) => <StatusBadge variant={statusVariant(member.status)}>{statusLabel(member.status, copy)}</StatusBadge> },
          ]}
        />

        <DataTable
          data={roleCoverage}
          searchValue={(role) => roleCoverageLabel(role.role, copy)}
          pageSize={10}
          columns={[
            { key: "role", header: copy.headers.role, sortable: true, render: (role) => roleCoverageLabel(role.role, copy) },
            { key: "users", header: copy.headers.users, sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: copy.headers.finance, render: (role) => booleanBadge(role.canApproveFinance, copy) },
            { key: "access", header: copy.headers.access, render: (role) => booleanBadge(role.canRestrictAccess, copy) },
            { key: "manage", header: copy.headers.users, render: (role) => booleanBadge(role.canManageUsers, copy) },
            { key: "export", header: copy.headers.export, render: (role) => booleanBadge(role.canExportData, copy) },
          ]}
        />
      </div>
    </div>
  )
}
