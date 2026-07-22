"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { useLocale } from "next-intl"
import {
  AlertTriangle,
  Languages,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Power,
  Save,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { useUser } from "@/components/user-provider"
import { StatusBadge } from "@/components/status-badge"
import type { Role } from "@/lib/rbac"
import type { ManagedUser, UserAdministration } from "@/lib/user-role-admin-repository"

type LocaleKey = "tr" | "en" | "de" | "ru"

// Assignable business roles offered in the create + add-role controls. Guest and
// Service Provider are included (the admin role is platform-provisioned and the
// child_* roles need a guardianship, so both are intentionally absent here).
const ASSIGNABLE: Role[] = [
  "manager",
  "accountant",
  "staff",
  "owner",
  "tenant",
  "guest",
  "service_provider",
]

// Supported interface languages. Names are shown in their own language, so they
// need no per-locale translation.
const LANGUAGES = ["tr", "en", "de", "ru"] as const
const LANGUAGE_NAMES: Record<(typeof LANGUAGES)[number], string> = {
  tr: "Türkçe",
  en: "English",
  de: "Deutsch",
  ru: "Русский",
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const dialogFocusableSelector =
  'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled])'

// Trap Tab focus inside an open modal dialog (mirrors the dashboard sidebar and
// navbar pattern). Focus is returned to the trigger by the native <dialog>.
function keepFocusInsideDialog(event: KeyboardEvent<HTMLDialogElement>) {
  if (event.key !== "Tab") return

  const controls = Array.from(
    event.currentTarget.querySelectorAll<HTMLElement>(dialogFocusableSelector)
  ).filter(
    (control) =>
      control.getAttribute("aria-hidden") !== "true" &&
      control.getClientRects().length > 0
  )
  const first = controls[0]
  const last = controls.at(-1)
  if (!first || !last) return

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const copy = {
  tr: {
    eyebrow: "KULLANICI VE ROL YÖNETİMİ",
    title: "Kullanıcı ve rol yönetimi",
    body: "Kullanıcı ekleyin, kişi bilgilerini düzenleyin, birden fazla rol atayın, erişimi askıya alın veya bir kişiyi kaldırın. Yönetici rolü platform tarafından verilir ve buradan atanamaz.",
    unavailable: "Canlı kullanıcı yönetimi için gerçek, şirket kapsamlı bir yönetici oturumu gerekir.",
    createTitle: "Yeni kullanıcı",
    email: "E-posta",
    fullName: "Ad Soyad",
    primaryRole: "Başlangıç rolü",
    create: "Kullanıcı oluştur",
    created: "Kullanıcı oluşturuldu.",
    listTitle: "Kullanıcılar ve roller",
    roles: "Roller",
    addRole: "Rol ekle",
    add: "Ekle",
    activate: "Erişimi geri aç",
    deactivate: "Erişimi askıya al",
    suspendHint: "Kişi şimdilik giriş yapamaz. Erişimi istediğiniz zaman geri açabilirsiniz.",
    restoreHint: "Kişinin erişimini yeniden açar.",
    active: "Aktif",
    inactive: "Pasif",
    you: "Siz",
    protected: "Korumalı",
    removedBadge: "Kaldırıldı",
    empty: "Gösterilecek kullanıcı yok.",
    lastRole: "Bir kullanıcı en az bir role sahip olmalıdır.",
    failed: "İşlem tamamlanamadı. Yenileyip tekrar deneyin.",
    edit: "Ayrıntıları düzenle",
    editTitle: "Kişiyi düzenle",
    language: "Dil",
    keepLanguage: "Dili değiştirme",
    saveDetails: "Ayrıntıları kaydet",
    detailsSaved: "Ayrıntılar güncellendi.",
    signInEmail: "Giriş e-postası",
    emailNote: "Kişi bu adresle giriş yapar. Değiştirmek, giriş şeklini değiştirir.",
    changeEmail: "Giriş e-postasını değiştir",
    emailSaved: "Giriş e-postası güncellendi.",
    remove: "Kişiyi kaldır",
    removeTitle: "Kişiyi kaldır",
    removeHint: "Kişiyi çıkarır ve kişisel bilgilerini temizler. Geçmiş saklanır.",
    removeWarning: "Bu kişi erişimini kaybeder ve kişisel bilgileri kaldırılır. Finans ve işlem geçmişi kayıtlarımızda saklanır.",
    removeReasonLabel: "Kaldırma nedeni (kayıtlarımızda saklanır)",
    removeReasonHint: "Lütfen en az 10 karakter girin.",
    confirmRemove: "Kişiyi kaldır",
    removed: "Kişi kaldırıldı ve kişisel bilgileri temizlendi.",
    cancel: "Vazgeç",
    close: "Kapat",
    roleLabels: { admin: "Yönetici", manager: "Sorumlu", accountant: "Muhasebe", staff: "Personel", owner: "Malik", tenant: "Kiracı", guest: "Misafir", service_provider: "Hizmet Sağlayıcı", child_owner: "Malik (Alt Hesap)", child_tenant: "Kiracı (Alt Hesap)", child_guest: "Misafir (Alt Hesap)" },
  },
  en: {
    eyebrow: "USER & ROLE ADMINISTRATION",
    title: "User & role administration",
    body: "Add people, edit their details, assign multiple roles, suspend access, or remove a person. The administrator role is platform-provisioned and cannot be assigned here.",
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
    activate: "Restore access",
    deactivate: "Suspend access",
    suspendHint: "They can't sign in for now. You can restore access anytime.",
    restoreHint: "Turn their access back on.",
    active: "Active",
    inactive: "Inactive",
    you: "You",
    protected: "Protected",
    removedBadge: "Removed",
    empty: "No users to show.",
    lastRole: "A user must keep at least one role.",
    failed: "The action could not be completed. Refresh and try again.",
    edit: "Edit details",
    editTitle: "Edit person",
    language: "Language",
    keepLanguage: "Keep current language",
    saveDetails: "Save details",
    detailsSaved: "Details updated.",
    signInEmail: "Sign-in email",
    emailNote: "This is the address the person signs in with. Changing it changes how they sign in.",
    changeEmail: "Change sign-in email",
    emailSaved: "Sign-in email updated.",
    remove: "Remove person",
    removeTitle: "Remove person",
    removeHint: "Off-boards the person and clears their personal details. History is kept.",
    removeWarning: "This person will lose access and their personal details will be removed. Their financial and activity history is kept for our records.",
    removeReasonLabel: "Reason for removing (kept in our records)",
    removeReasonHint: "Please give at least 10 characters.",
    confirmRemove: "Remove person",
    removed: "Person removed and personal details cleared.",
    cancel: "Cancel",
    close: "Close",
    roleLabels: { admin: "Administrator", manager: "Manager", accountant: "Accountant", staff: "Staff", owner: "Owner", tenant: "Tenant", guest: "Guest", service_provider: "Service Provider", child_owner: "Owner (Sub-account)", child_tenant: "Tenant (Sub-account)", child_guest: "Guest (Sub-account)" },
  },
  de: {
    eyebrow: "BENUTZER- UND ROLLENVERWALTUNG",
    title: "Benutzer- und Rollenverwaltung",
    body: "Personen anlegen, Details bearbeiten, mehrere Rollen zuweisen, Zugang aussetzen oder eine Person entfernen. Die Administratorrolle wird von der Plattform vergeben und kann hier nicht zugewiesen werden.",
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
    activate: "Zugang wiederherstellen",
    deactivate: "Zugang aussetzen",
    suspendHint: "Kann sich vorerst nicht anmelden. Zugang jederzeit wiederherstellbar.",
    restoreHint: "Zugang wieder aktivieren.",
    active: "Aktiv",
    inactive: "Inaktiv",
    you: "Sie",
    protected: "Geschutzt",
    removedBadge: "Entfernt",
    empty: "Keine Benutzer vorhanden.",
    lastRole: "Ein Benutzer muss mindestens eine Rolle behalten.",
    failed: "Aktion nicht abgeschlossen. Aktualisieren und erneut versuchen.",
    edit: "Details bearbeiten",
    editTitle: "Person bearbeiten",
    language: "Sprache",
    keepLanguage: "Sprache beibehalten",
    saveDetails: "Details speichern",
    detailsSaved: "Details aktualisiert.",
    signInEmail: "Anmelde-E-Mail",
    emailNote: "Mit dieser Adresse meldet sich die Person an. Eine Anderung andert die Anmeldung.",
    changeEmail: "Anmelde-E-Mail andern",
    emailSaved: "Anmelde-E-Mail aktualisiert.",
    remove: "Person entfernen",
    removeTitle: "Person entfernen",
    removeHint: "Entfernt die Person und loscht ihre personlichen Daten. Verlauf bleibt erhalten.",
    removeWarning: "Diese Person verliert den Zugang und ihre personlichen Daten werden entfernt. Finanz- und Aktivitatsverlauf bleiben fur unsere Unterlagen erhalten.",
    removeReasonLabel: "Grund fur die Entfernung (fur unsere Unterlagen gespeichert)",
    removeReasonHint: "Bitte mindestens 10 Zeichen angeben.",
    confirmRemove: "Person entfernen",
    removed: "Person entfernt und personliche Daten geloscht.",
    cancel: "Abbrechen",
    close: "Schliessen",
    roleLabels: { admin: "Administrator", manager: "Manager", accountant: "Buchhaltung", staff: "Personal", owner: "Eigentumer", tenant: "Mieter", guest: "Gast", service_provider: "Dienstleister", child_owner: "Eigentumer (Unterkonto)", child_tenant: "Mieter (Unterkonto)", child_guest: "Gast (Unterkonto)" },
  },
  ru: {
    eyebrow: "УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ И РОЛЯМИ",
    title: "Управление пользователями и ролями",
    body: "Добавляйте людей, изменяйте их данные, назначайте несколько ролей, приостанавливайте доступ или удаляйте человека. Роль администратора выдаётся платформой и не назначается здесь.",
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
    activate: "Восстановить доступ",
    deactivate: "Приостановить доступ",
    suspendHint: "Пока не сможет войти. Доступ можно восстановить в любой момент.",
    restoreHint: "Снова включить доступ.",
    active: "Активен",
    inactive: "Неактивен",
    you: "Вы",
    protected: "Защищено",
    removedBadge: "Удалён",
    empty: "Нет пользователей для отображения.",
    lastRole: "У пользователя должна остаться хотя бы одна роль.",
    failed: "Действие не выполнено. Обновите и повторите.",
    edit: "Изменить данные",
    editTitle: "Изменить человека",
    language: "Язык",
    keepLanguage: "Оставить текущий язык",
    saveDetails: "Сохранить данные",
    detailsSaved: "Данные обновлены.",
    signInEmail: "Эл. почта для входа",
    emailNote: "С этим адресом человек входит в систему. Изменение меняет способ входа.",
    changeEmail: "Изменить почту для входа",
    emailSaved: "Почта для входа обновлена.",
    remove: "Удалить человека",
    removeTitle: "Удалить человека",
    removeHint: "Убирает человека и очищает его личные данные. История сохраняется.",
    removeWarning: "Этот человек потеряет доступ, а его личные данные будут удалены. Финансовая история и история действий сохраняются в наших записях.",
    removeReasonLabel: "Причина удаления (сохраняется в наших записях)",
    removeReasonHint: "Укажите не менее 10 символов.",
    confirmRemove: "Удалить человека",
    removed: "Человек удалён, личные данные очищены.",
    cancel: "Отмена",
    close: "Закрыть",
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

  // Edit-person dialog state.
  const editDialogRef = useRef<HTMLDialogElement>(null)
  const [editUser, setEditUser] = useState<ManagedUser | null>(null)
  const [editName, setEditName] = useState("")
  const [editLanguage, setEditLanguage] = useState("")
  const [editEmail, setEditEmail] = useState("")

  // Remove-person confirmation dialog state.
  const removeDialogRef = useRef<HTMLDialogElement>(null)
  const [removeUser, setRemoveUser] = useState<ManagedUser | null>(null)
  const [removeReason, setRemoveReason] = useState("")

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

  // Open/close the native modal dialogs in step with their target state so the
  // browser restores focus to the triggering row control on close.
  useEffect(() => {
    const dialog = editDialogRef.current
    if (!dialog) return
    if (editUser && !dialog.open) dialog.showModal()
    if (!editUser && dialog.open) dialog.close()
  }, [editUser])

  useEffect(() => {
    const dialog = removeDialogRef.current
    if (!dialog) return
    if (removeUser && !dialog.open) dialog.showModal()
    if (!removeUser && dialog.open) dialog.close()
  }, [removeUser])

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
  ): Promise<boolean> {
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
      return true
    } catch (mutationError) {
      setError(mutationError instanceof Error ? mutationError.message : t.failed)
      return false
    } finally {
      setBusyId("")
    }
  }

  function openEdit(target: ManagedUser) {
    setError("")
    setNotice("")
    setEditName(target.fullName)
    setEditLanguage("")
    setEditEmail(target.email ?? "")
    setEditUser(target)
  }

  function openRemove(target: ManagedUser) {
    setError("")
    setNotice("")
    setRemoveReason("")
    setRemoveUser(target)
  }

  async function saveProfile() {
    if (!editUser) return
    const body: Record<string, unknown> = {
      action: "update_profile",
      fullName: editName.trim(),
    }
    if (editLanguage) body.language = editLanguage
    const ok = await mutate(editUser.id, body)
    if (ok) {
      setNotice(t.detailsSaved)
      setEditUser(null)
    }
  }

  async function saveEmail() {
    if (!editUser) return
    const ok = await mutate(editUser.id, {
      action: "update_email",
      email: editEmail.trim(),
    })
    if (ok) {
      setNotice(t.emailSaved)
      setEditUser(null)
    }
  }

  async function confirmRemove() {
    if (!removeUser) return
    const ok = await mutate(removeUser.id, {
      action: "remove",
      reason: removeReason.trim(),
    })
    if (ok) {
      setNotice(t.removed)
      setRemoveUser(null)
    }
  }

  if (user.role !== "admin") return null

  const unavailable = !loading && data && !data.available
  const editBusy = editUser !== null && busyId === editUser.id
  const removeBusy = removeUser !== null && busyId === removeUser.id

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
                  // Anonymized (KVKK/GDPR soft-deleted) rows are read-only "Removed"
                  // records: the DB has severed their roles and disabled login, so
                  // no mutation control is offered (this also removes the dead
                  // "Restore access" affordance that could never bring roles back).
                  const removed = item.anonymizedAt != null
                  const canManage = item.mutable && !removed
                  const availableToAdd = ASSIGNABLE.filter((candidate) => !item.roles.includes(candidate))
                  const choice = addRoleChoice[item.id] ?? availableToAdd[0] ?? "manager"
                  const isBusy = busyId === item.id
                  return (
                    <li key={item.id} className="rounded-xl border border-border bg-background p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 break-words text-sm font-black text-foreground">{item.fullName}</p>
                            {item.isCurrentActor && <StatusBadge variant="accent">{t.you}</StatusBadge>}
                            {removed ? (
                              <StatusBadge variant="neutral">{t.removedBadge}</StatusBadge>
                            ) : (
                              <>
                                {!item.mutable && !item.isCurrentActor && (
                                  <StatusBadge variant="neutral">{t.protected}</StatusBadge>
                                )}
                                <StatusBadge variant={item.isActive ? "success" : "danger"}>
                                  {item.isActive ? t.active : t.inactive}
                                </StatusBadge>
                              </>
                            )}
                          </div>
                          {!removed && item.email && <p className="mt-1 min-w-0 break-words text-xs text-muted-foreground">{item.email}</p>}
                        </div>
                        {canManage && (
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              disabled={isBusy}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-xs font-bold hover:bg-muted disabled:opacity-50"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                              {t.edit}
                            </button>
                            <button
                              type="button"
                              onClick={() => void mutate(item.id, { action: "set_active", active: !item.isActive })}
                              disabled={isBusy}
                              title={item.isActive ? t.suspendHint : t.restoreHint}
                              className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-bold disabled:opacity-50 ${
                                item.isActive
                                  ? "border-rose-500/30 text-rose-700"
                                  : "border-emerald-500/30 text-emerald-700"
                              }`}
                            >
                              {isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Power className="h-3.5 w-3.5" aria-hidden="true" />}
                              {item.isActive ? t.deactivate : t.activate}
                            </button>
                            <button
                              type="button"
                              onClick={() => openRemove(item)}
                              disabled={isBusy}
                              title={t.removeHint}
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-rose-500/30 px-3 text-xs font-bold text-rose-700 hover:bg-rose-500/10 disabled:opacity-50"
                            >
                              <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                              {t.remove}
                            </button>
                          </div>
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
                              {canManage && assigned !== "admin" && item.roles.length > 1 && (
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
                      {canManage && availableToAdd.length > 0 && (
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

      {/* Edit person: name + language, plus a clearly separated sign-in email change. */}
      <dialog
        ref={editDialogRef}
        aria-labelledby="user-edit-title"
        onKeyDown={keepFocusInsideDialog}
        onCancel={(event) => {
          event.preventDefault()
          setEditUser(null)
        }}
        onClose={() => setEditUser(null)}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          const inside =
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom
          if (!inside) setEditUser(null)
        }}
        className="m-auto w-full max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[1px]"
      >
        {editUser && (
          <div className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 id="user-edit-title" className="text-base font-black text-foreground">{t.editTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditUser(null)}
                aria-label={t.close}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 min-w-0 break-words text-xs text-muted-foreground">{editUser.fullName}</p>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                {t.fullName}
                <input
                  type="text"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  maxLength={120}
                  autoFocus
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                />
              </label>
              <label className="grid gap-1.5 text-xs font-bold text-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5" aria-hidden="true" />
                  {t.language}
                </span>
                <select
                  value={editLanguage}
                  onChange={(event) => setEditLanguage(event.target.value)}
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium"
                >
                  <option value="">{t.keepLanguage}</option>
                  {LANGUAGES.map((code) => (
                    <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void saveProfile()}
                disabled={editBusy || editName.trim().length < 2}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
                {t.saveDetails}
              </button>
            </div>

            {/* Sign-in email is separated: it changes how the person signs in. */}
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" aria-hidden="true" />
                <h4 className="text-sm font-black text-foreground">{t.signInEmail}</h4>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.emailNote}</p>
              <div className="mt-2 grid gap-2">
                <input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  autoComplete="off"
                  className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-normal"
                />
                <button
                  type="button"
                  onClick={() => void saveEmail()}
                  disabled={editBusy || !emailPattern.test(editEmail.trim())}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-bold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {editBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                  {t.changeEmail}
                </button>
              </div>
            </div>

            {error && (
              <p aria-live="polite" className="mt-4 text-xs font-semibold text-rose-600">{error}</p>
            )}
          </div>
        )}
      </dialog>

      {/* Remove person: destructive, requires a typed reason (min 10 chars). */}
      <dialog
        ref={removeDialogRef}
        aria-labelledby="user-remove-title"
        aria-describedby="user-remove-warning"
        onKeyDown={keepFocusInsideDialog}
        onCancel={(event) => {
          event.preventDefault()
          setRemoveUser(null)
        }}
        onClose={() => setRemoveUser(null)}
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) return
          const bounds = event.currentTarget.getBoundingClientRect()
          const inside =
            event.clientX >= bounds.left &&
            event.clientX <= bounds.right &&
            event.clientY >= bounds.top &&
            event.clientY <= bounds.bottom
          if (!inside) setRemoveUser(null)
        }}
        className="m-auto w-full max-w-md rounded-2xl border border-border bg-card p-0 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-[1px]"
      >
        {removeUser && (
          <div className="max-h-[90dvh] overflow-y-auto p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden="true" />
                <h3 id="user-remove-title" className="text-base font-black text-foreground">{t.removeTitle}</h3>
              </div>
              <button
                type="button"
                onClick={() => setRemoveUser(null)}
                aria-label={t.close}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-1 min-w-0 break-words text-sm font-bold text-foreground">{removeUser.fullName}</p>
            <p
              id="user-remove-warning"
              className="mt-3 rounded-xl border border-rose-500/25 bg-rose-500/[0.06] p-3 text-xs leading-5 text-muted-foreground"
            >
              {t.removeWarning}
            </p>

            <label className="mt-4 grid gap-1.5 text-xs font-bold text-foreground">
              {t.removeReasonLabel}
              <textarea
                value={removeReason}
                onChange={(event) => setRemoveReason(event.target.value)}
                rows={3}
                maxLength={1000}
                autoFocus
                className="rounded-lg border border-border bg-background p-3 text-sm font-normal"
              />
              <span className="text-[11px] font-medium text-muted-foreground">{t.removeReasonHint}</span>
            </label>

            {error && (
              <p aria-live="polite" className="mt-3 text-xs font-semibold text-rose-600">{error}</p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRemoveUser(null)}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-bold hover:bg-muted"
              >
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void confirmRemove()}
                disabled={removeBusy || removeReason.trim().length < 10}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {removeBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserMinus className="h-4 w-4" aria-hidden="true" />}
                {t.confirmRemove}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}
