"use client"

import { useCallback, useEffect, useState } from "react"
import { useLocale } from "next-intl"
import {
  Loader2,
  Plus,
  Power,
  ShieldAlert,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { StatusBadge } from "@/components/status-badge"
import type { Role } from "@/lib/rbac"
import type { ManagedUser, UserAdministration } from "@/lib/user-role-admin-repository"

type LocaleKey = "tr" | "en" | "de" | "ru"

const ASSIGNABLE: Role[] = ["manager", "accountant", "staff", "owner", "tenant"]

const copy = {
  tr: {
    eyebrow: "KULLANICI VE ROL YONETIMI",
    title: "Kullanici ve rol yonetimi",
    body: "Kullanici ekleyin, birden fazla rol atayin ve erisimi pasiflestirin. Yonetici rolu platform tarafindan verilir ve buradan atanamaz.",
    unavailable: "Canli kullanici yonetimi icin gercek, sirket kapsamli bir yonetici oturumu gerekir.",
    createTitle: "Yeni kullanici",
    email: "E-posta",
    fullName: "Ad Soyad",
    primaryRole: "Baslangic rolu",
    create: "Kullanici olustur",
    created: "Kullanici olusturuldu.",
    listTitle: "Kullanicilar ve roller",
    roles: "Roller",
    addRole: "Rol ekle",
    add: "Ekle",
    activate: "Aktiflestir",
    deactivate: "Pasiflestir",
    active: "Aktif",
    inactive: "Pasif",
    you: "Siz",
    protected: "Korumali",
    empty: "Gosterilecek kullanici yok.",
    lastRole: "Bir kullanici en az bir role sahip olmalidir.",
    failed: "Islem tamamlanamadi. Yenileyip tekrar deneyin.",
    roleLabels: { admin: "Yonetici", manager: "Sorumlu", accountant: "Muhasebe", staff: "Personel", owner: "Malik", tenant: "Kiraci", guest: "Misafir", service_provider: "Hizmet Saglayici", child_owner: "Malik (Alt Hesap)", child_tenant: "Kiraci (Alt Hesap)", child_guest: "Misafir (Alt Hesap)" },
  },
  en: {
    eyebrow: "USER & ROLE ADMINISTRATION",
    title: "User & role administration",
    body: "Add users, assign multiple roles, and deactivate access. The administrator role is platform-provisioned and cannot be assigned here.",
    unavailable: "Live user administration requires a real administrator session with a company boundary.",
    createTitle: "New user",
    email: "Email",
    fullName: "Full name",
    primaryRole: "Starting role",
    create: "Create user",
    created: "User created.",
    listTitle: "Users & roles",
    roles: "Roles",
    addRole: "Add role",
    add: "Add",
    activate: "Activate",
    deactivate: "Deactivate",
    active: "Active",
    inactive: "Inactive",
    you: "You",
    protected: "Protected",
    empty: "No users to show.",
    lastRole: "A user must keep at least one role.",
    failed: "The action could not be completed. Refresh and try again.",
    roleLabels: { admin: "Administrator", manager: "Manager", accountant: "Accountant", staff: "Staff", owner: "Owner", tenant: "Tenant", guest: "Guest", service_provider: "Service Provider", child_owner: "Owner (Sub-account)", child_tenant: "Tenant (Sub-account)", child_guest: "Guest (Sub-account)" },
  },
  de: {
    eyebrow: "BENUTZER- UND ROLLENVERWALTUNG",
    title: "Benutzer- und Rollenverwaltung",
    body: "Benutzer anlegen, mehrere Rollen zuweisen und Zugriff deaktivieren. Die Administratorrolle wird von der Plattform vergeben und kann hier nicht zugewiesen werden.",
    unavailable: "Die Live-Benutzerverwaltung erfordert eine echte Administratorsitzung mit Organisationszuordnung.",
    createTitle: "Neuer Benutzer",
    email: "E-Mail",
    fullName: "Vollstandiger Name",
    primaryRole: "Startrolle",
    create: "Benutzer anlegen",
    created: "Benutzer angelegt.",
    listTitle: "Benutzer und Rollen",
    roles: "Rollen",
    addRole: "Rolle hinzufugen",
    add: "Hinzufugen",
    activate: "Aktivieren",
    deactivate: "Deaktivieren",
    active: "Aktiv",
    inactive: "Inaktiv",
    you: "Sie",
    protected: "Geschutzt",
    empty: "Keine Benutzer vorhanden.",
    lastRole: "Ein Benutzer muss mindestens eine Rolle behalten.",
    failed: "Aktion nicht abgeschlossen. Aktualisieren und erneut versuchen.",
    roleLabels: { admin: "Administrator", manager: "Manager", accountant: "Buchhaltung", staff: "Personal", owner: "Eigentumer", tenant: "Mieter", guest: "Gast", service_provider: "Dienstleister", child_owner: "Eigentumer (Unterkonto)", child_tenant: "Mieter (Unterkonto)", child_guest: "Gast (Unterkonto)" },
  },
  ru: {
    eyebrow: "УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ И РОЛЯМИ",
    title: "Управление пользователями и ролями",
    body: "Добавляйте пользователей, назначайте несколько ролей и отключайте доступ. Роль администратора выдаётся платформой и не назначается здесь.",
    unavailable: "Для управления пользователями нужна реальная сессия администратора с границей организации.",
    createTitle: "Новый пользователь",
    email: "Эл. почта",
    fullName: "Имя и фамилия",
    primaryRole: "Начальная роль",
    create: "Создать пользователя",
    created: "Пользователь создан.",
    listTitle: "Пользователи и роли",
    roles: "Роли",
    addRole: "Добавить роль",
    add: "Добавить",
    activate: "Активировать",
    deactivate: "Деактивировать",
    active: "Активен",
    inactive: "Неактивен",
    you: "Вы",
    protected: "Защищено",
    empty: "Нет пользователей для отображения.",
    lastRole: "У пользователя должна остаться хотя бы одна роль.",
    failed: "Действие не выполнено. Обновите и повторите.",
    roleLabels: { admin: "Администратор", manager: "Менеджер", accountant: "Бухгалтер", staff: "Персонал", owner: "Собственник", tenant: "Арендатор", guest: "Гость", service_provider: "Поставщик услуг", child_owner: "Собственник (субаккаунт)", child_tenant: "Арендатор (субаккаунт)", child_guest: "Гость (субаккаунт)" },
  },
} as const

function localeKey(value: string): LocaleKey {
  return value === "tr" || value === "de" || value === "ru" ? value : "en"
}

export function UserAdministrationPanel() {
  const user = useUser()
  const t = copy[localeKey(useLocale())]
  const [data, setData] = useState<UserAdministration | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notice, setNotice] = useState("")
  const [busyId, setBusyId] = useState("")
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [role, setRole] = useState<Role>("manager")
  const [addRoleChoice, setAddRoleChoice] = useState<Record<string, Role>>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/site-management/users?limit=80", {
        cache: "no-store",
      })
      const payload = (await response.json()) as {
        administration?: UserAdministration
        error?: string
      }
      if (!response.ok) throw new Error(payload.error ?? "unavailable")
      setData(payload.administration ?? null)
      setError("")
    } catch {
      setError(t.failed)
    } finally {
      setLoading(false)
    }
  }, [t.failed])

  useEffect(() => {
    if (user.role !== "admin") return
    const timer = window.setTimeout(() => void load(), 0)
    return () => window.clearTimeout(timer)
  }, [user.role, load])

  function applyUser(updated: ManagedUser) {
    setData((current) =>
      current
        ? {
            ...current,
            users: current.users.some((item) => item.id === updated.id)
              ? current.users.map((item) => (item.id === updated.id ? updated : item))
              : [...current.users, updated],
          }
        : current
    )
  }

  async function createUser() {
    if (creating) return
    setCreating(true)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/site-management/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role }),
      })
      const payload = (await response.json()) as { user?: ManagedUser; error?: string }
      if (!response.ok || !payload.user) throw new Error(payload.error ?? t.failed)
      applyUser(payload.user)
      setEmail("")
      setFullName("")
      setRole("manager")
      setNotice(t.created)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : t.failed)
    } finally {
      setCreating(false)
    }
  }

  async function mutate(
    profileId: string,
    body: Record<string, unknown>
  ) {
    setBusyId(profileId)
    setError("")
    setNotice("")
    try {
      const response = await fetch("/api/site-management/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, ...body }),
      })
      const payload = (await response.json()) as { user?: ManagedUser; error?: string }
      if (!response.ok || !payload.user) throw new Error(payload.error ?? t.failed)
      applyUser(payload.user)
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t.failed)
    } finally {
      setBusyId("")
    }
  }

  if (user.role !== "admin") return null

  const unavailable = !loading && data && !data.available

  return (
    <section
      aria-labelledby="user-administration-title"
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="border-b border-border bg-gradient-to-br from-primary/[0.08] via-card to-emerald-500/[0.05] p-5 sm:p-6">
        <div className="flex items-center gap-2 text-primary">
          <Users className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px] font-black uppercase tracking-[0.16em]">{t.eyebrow}</span>
        </div>
        <h2 id="user-administration-title" className="mt-2 text-xl font-black text-foreground">{t.title}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{t.body}</p>
      </div>

      {unavailable ? (
        <div className="m-5 flex items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <p className="text-sm leading-5 text-muted-foreground">{t.unavailable}</p>
        </div>
      ) : (
        <div className="space-y-6 p-5 sm:p-6">
          {/* Create user */}
          <div className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-black text-foreground">{t.createTitle}</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                {t.email}
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                  autoComplete="off"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                {t.fullName}
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={120}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                  autoComplete="off"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                {t.primaryRole}
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as Role)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium"
                >
                  {ASSIGNABLE.map((candidate) => (
                    <option key={candidate} value={candidate}>{t.roleLabels[candidate]}</option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => void createUser()}
                  disabled={creating || !email.trim() || fullName.trim().length < 2}
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
                  {t.create}
                </button>
              </div>
            </div>
          </div>

          {(error || notice) && (
            <p
              aria-live="polite"
              className={`text-xs font-semibold ${error ? "text-rose-600" : "text-emerald-700"}`}
            >
              {error || notice}
            </p>
          )}

          {/* User list */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              <h3 className="text-sm font-black text-foreground">{t.listTitle}</h3>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              </div>
            ) : data && data.users.length > 0 ? (
              <ul className="grid gap-3">
                {data.users.map((item) => {
                  const availableToAdd = ASSIGNABLE.filter((candidate) => !item.roles.includes(candidate))
                  const choice = addRoleChoice[item.id] ?? availableToAdd[0] ?? "manager"
                  const isBusy = busyId === item.id
                  return (
                    <li key={item.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-foreground">{item.fullName}</p>
                            {item.isCurrentActor && <StatusBadge variant="accent">{t.you}</StatusBadge>}
                            {!item.mutable && !item.isCurrentActor && (
                              <StatusBadge variant="neutral">{t.protected}</StatusBadge>
                            )}
                            <StatusBadge variant={item.isActive ? "success" : "danger"}>
                              {item.isActive ? t.active : t.inactive}
                            </StatusBadge>
                          </div>
                          {item.email && <p className="mt-1 truncate text-xs text-muted-foreground">{item.email}</p>}
                        </div>
                        {item.mutable && (
                          <button
                            type="button"
                            onClick={() => void mutate(item.id, { action: "set_active", active: !item.isActive })}
                            disabled={isBusy}
                            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${
                              item.isActive
                                ? "border-rose-500/30 text-rose-700"
                                : "border-emerald-500/30 text-emerald-700"
                            }`}
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Power className="h-3.5 w-3.5" aria-hidden="true" />}
                            {item.isActive ? t.deactivate : t.activate}
                          </button>
                        )}
                      </div>

                      {/* Role chips */}
                      <div className="mt-3">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t.roles}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.roles.map((assigned) => (
                            <span
                              key={assigned}
                              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-bold text-foreground"
                            >
                              {t.roleLabels[assigned]}
                              {item.mutable && assigned !== "admin" && item.roles.length > 1 && (
                                <button
                                  type="button"
                                  aria-label={`${t.roleLabels[assigned]} -`}
                                  onClick={() => void mutate(item.id, { action: "revoke_role", role: assigned })}
                                  disabled={isBusy}
                                  className="rounded-full p-0.5 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-700 disabled:opacity-50"
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Add role */}
                      {item.mutable && availableToAdd.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <select
                            value={choice}
                            onChange={(event) =>
                              setAddRoleChoice((current) => ({ ...current, [item.id]: event.target.value as Role }))
                            }
                            aria-label={t.addRole}
                            className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-medium"
                          >
                            {availableToAdd.map((candidate) => (
                              <option key={candidate} value={candidate}>{t.roleLabels[candidate]}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void mutate(item.id, { action: "assign_role", role: choice })}
                            disabled={isBusy}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted disabled:opacity-50"
                          >
                            {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                            {t.addRole}
                          </button>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {t.empty}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
