"use client"

import { BadgeCheck, ShieldCheck, UserCog, Users, WalletCards } from "lucide-react"
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
    kpi: {
      staff: { label: "Personel", caption: "İç ekip hesabı" },
      residents: { label: "Sakin kaydı", caption: "Malik, kiracı ve misafir" },
      tasks: { label: "Açık personel görevi", caption: "Tüm personelde aktif saha görevi" },
      financeApprovers: { label: "Finans onaycı", caption: "Finans onaylayabilen kullanıcı" },
    },
    rosterTitle: "Personel listesi",
    rosterBody: "Her personelin rolü, ekibi, görev yükü, erişim kapsamı ve durumu tek sıralanabilir listede.",
    rolesTitle: "Roller bir bakışta",
    rolesBody: "Altı atanabilir rol ve her rolün finans onayı, erişim kısıtı, kullanıcı yönetimi ve dışa aktarım yetkisi.",
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
      manage: "Kullanıcı yön.",
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
    kpi: {
      staff: { label: "Staff members", caption: "Internal team accounts" },
      residents: { label: "Resident records", caption: "Owners, tenants and guests" },
      tasks: { label: "Open staff tasks", caption: "Active field tasks across all staff" },
      financeApprovers: { label: "Finance approvers", caption: "Users who can approve finance" },
    },
    rosterTitle: "Staff roster",
    rosterBody: "Every staff member's role, team, workload, access scope and status in one sortable list.",
    rolesTitle: "Roles at a glance",
    rolesBody: "The six assignable roles and each role's finance approval, access restriction, user management and export rights.",
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
      manage: "Manage users",
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
    kpi: {
      staff: { label: "Mitarbeiter", caption: "Interne Teamkonten" },
      residents: { label: "Bewohnerdaten", caption: "Eigentümer, Mieter und Gäste" },
      tasks: { label: "Offene Mitarbeiteraufgaben", caption: "Aktive Feldaufgaben über alle Mitarbeiter" },
      financeApprovers: { label: "Finanzfreigaben", caption: "Nutzer mit Finanzfreigabe" },
    },
    rosterTitle: "Mitarbeiterliste",
    rosterBody: "Rolle, Team, Auslastung, Zugriffsbereich und Status jedes Mitarbeiters in einer sortierbaren Liste.",
    rolesTitle: "Rollen auf einen Blick",
    rolesBody: "Die sechs zuweisbaren Rollen und ihre Rechte für Finanzfreigabe, Zugriffssperre, Benutzerverwaltung und Export.",
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
      manage: "Benutzerverw.",
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
    kpi: {
      staff: { label: "Сотрудники", caption: "Внутренние учётные записи" },
      residents: { label: "Записи резидентов", caption: "Владельцы, арендаторы и гости" },
      tasks: { label: "Открытые задачи персонала", caption: "Активные полевые задачи по всем сотрудникам" },
      financeApprovers: { label: "Финансовые согласующие", caption: "Пользователи с правом согласования финансов" },
    },
    rosterTitle: "Список персонала",
    rosterBody: "Роль, команда, нагрузка, область доступа и статус каждого сотрудника в одном сортируемом списке.",
    rolesTitle: "Роли кратко",
    rolesBody: "Шесть назначаемых ролей и права каждой на согласование финансов, ограничение доступа, управление пользователями и экспорт.",
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
      manage: "Упр. польз.",
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

  const kpiCards = [
    { key: "staff", Icon: UserCog, tone: "text-primary", ...copy.kpi.staff, value: staffSummary.total },
    { key: "residents", Icon: Users, tone: "text-teal-600", ...copy.kpi.residents, value: residentSummary.total },
    { key: "tasks", Icon: BadgeCheck, tone: "text-amber-600", ...copy.kpi.tasks, value: staffSummary.activeTasks },
    { key: "finance", Icon: WalletCards, tone: "text-rose-600", ...copy.kpi.financeApprovers, value: staffSummary.financeApprovers },
  ] as const

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {copy.subtitle}
        </p>
      </header>

      {/* Unambiguous KPI strip: each tile states exactly what it counts. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map(({ key, Icon, tone, label, caption, value }) => (
          <Card3D key={key} glow={false}>
            <div className="flex items-start gap-3">
              <Icon className={`h-8 w-8 shrink-0 ${tone}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
                <AnimatedCounter value={value} className="text-2xl font-black" />
                <p className="mt-1 text-xs leading-4 text-muted-foreground">{caption}</p>
              </div>
            </div>
          </Card3D>
        ))}
      </div>

      {/* 1. Administration: create users, assign roles, deactivate access (admin only; self-hides otherwise). */}
      <UserAdministrationPanel />

      {/* 2. People directory: live staff, residents and role coverage. */}
      <PeopleDirectoryLive />

      {/* Full, sortable staff roster backing the directory. */}
      <section aria-labelledby="staff-roster-heading" className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="staff-roster-heading" className="text-lg font-black text-foreground">{copy.rosterTitle}</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.rosterBody}</p>
        </div>
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
      </section>

      {/* 3. Single roles reference: one compact capability matrix for the six roles. */}
      <section aria-labelledby="roles-reference-heading" className="space-y-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="roles-reference-heading" className="text-lg font-black text-foreground">{copy.rolesTitle}</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{copy.rolesBody}</p>
        </div>
        <DataTable
          data={roleCoverage}
          searchValue={(role) => roleCoverageLabel(role.role, copy)}
          pageSize={10}
          columns={[
            { key: "role", header: copy.headers.role, sortable: true, render: (role) => roleCoverageLabel(role.role, copy) },
            { key: "users", header: copy.headers.users, sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: copy.headers.finance, render: (role) => booleanBadge(role.canApproveFinance, copy) },
            { key: "access", header: copy.headers.access, render: (role) => booleanBadge(role.canRestrictAccess, copy) },
            { key: "manage", header: copy.headers.manage, render: (role) => booleanBadge(role.canManageUsers, copy) },
            { key: "export", header: copy.headers.export, render: (role) => booleanBadge(role.canExportData, copy) },
          ]}
        />
      </section>

      {/* Deep role governance and authority controls (admin/manager; self-hides otherwise). */}
      <RoleGovernancePanel />

      {/* 4. Registration review and time-boxed tenant access (self-hide by role). */}
      <RegistrationReviewPanel />

      <TenantAccessLivePanel />
    </div>
  )
}
