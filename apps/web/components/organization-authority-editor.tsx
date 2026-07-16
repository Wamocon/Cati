"use client"

import { useMemo, useRef, useState } from "react"
import { useLocale } from "next-intl"
import { CheckCircle2, Loader2, ShieldAlert, UserRoundCog } from "lucide-react"
import type {
  GovernanceAdministration,
  GovernanceMember,
} from "@/lib/role-governance-repository"
import type { Role } from "@/lib/rbac"

const assignableRoles = ["manager", "accountant", "staff", "owner", "tenant"] as const
type AssignableRole = (typeof assignableRoles)[number]
type SupportedLocale = "tr" | "en" | "de" | "ru"

const copy = {
  tr: {
    title: "Organizasyon yetki yönetimi",
    body: "Rol, ofis ve saha kapsamı tek bir denetimli işlemle güncellenir. Kendi yetkinizi veya başka bir organizasyonu değiştiremezsiniz.",
    unavailable: "Canlı yetki değişiklikleri için gerçek, şirket kapsamı tanımlı bir yönetici oturumu gerekir.",
    member: "Ekip üyesi",
    role: "Rol",
    office: "Ofis",
    noOffice: "Ofis yok",
    sites: "Yetkili sahalar",
    noSites: "Bu rol için saha ataması yoktur.",
    reason: "Değişiklik gerekçesi",
    reasonHint: "En az 10 karakter; denetim kaydında saklanır.",
    save: "Yetkiyi denetimli olarak güncelle",
    saved: "Yetki güncellendi ve denetim kaydı oluşturuldu.",
    select: "Bir üye seçin",
    empty: "Değiştirilebilir organizasyon üyesi bulunamadı.",
    roles: { manager: "Yönetici", accountant: "Muhasebe", staff: "Saha personeli", owner: "Malik", tenant: "Kiracı" },
  },
  en: {
    title: "Organization authority management",
    body: "Role, office, and site scope are changed in one audited operation. You cannot change your own authority or another organization.",
    unavailable: "Live authority changes require a real administrator session with an organization boundary.",
    member: "Team member",
    role: "Role",
    office: "Office",
    noOffice: "No office",
    sites: "Authorized sites",
    noSites: "This role does not receive site assignments.",
    reason: "Reason for change",
    reasonHint: "At least 10 characters; retained in the audit trail.",
    save: "Update authority with audit",
    saved: "Authority updated and recorded in the audit trail.",
    select: "Select a member",
    empty: "There are no mutable organization members.",
    roles: { manager: "Manager", accountant: "Accountant", staff: "Field staff", owner: "Owner", tenant: "Tenant" },
  },
  de: {
    title: "Berechtigungen der Organisation",
    body: "Rolle, Büro und Standortumfang werden in einem auditierten Vorgang geändert. Eigene oder organisationsfremde Rechte bleiben gesperrt.",
    unavailable: "Live-Änderungen erfordern eine echte Administratorsitzung mit Organisationszuordnung.",
    member: "Teammitglied",
    role: "Rolle",
    office: "Büro",
    noOffice: "Kein Büro",
    sites: "Berechtigte Standorte",
    noSites: "Diese Rolle erhält keine Standortzuordnung.",
    reason: "Begründung",
    reasonHint: "Mindestens 10 Zeichen; wird im Audit-Trail gespeichert.",
    save: "Berechtigung auditiert aktualisieren",
    saved: "Berechtigung aktualisiert und auditiert.",
    select: "Mitglied auswählen",
    empty: "Keine änderbaren Organisationsmitglieder vorhanden.",
    roles: { manager: "Manager", accountant: "Buchhaltung", staff: "Außendienst", owner: "Eigentümer", tenant: "Mieter" },
  },
  ru: {
    title: "Управление правами организации",
    body: "Роль, офис и объекты изменяются одной аудируемой операцией. Нельзя изменить собственные права или чужую организацию.",
    unavailable: "Для изменений нужна реальная сессия администратора с границей организации.",
    member: "Сотрудник",
    role: "Роль",
    office: "Офис",
    noOffice: "Без офиса",
    sites: "Доступные объекты",
    noSites: "Для этой роли объекты не назначаются.",
    reason: "Причина изменения",
    reasonHint: "Минимум 10 символов; сохраняется в аудите.",
    save: "Обновить с аудитом",
    saved: "Права обновлены и записаны в аудит.",
    select: "Выберите сотрудника",
    empty: "Нет участников, права которых можно изменить.",
    roles: { manager: "Менеджер", accountant: "Бухгалтер", staff: "Полевой сотрудник", owner: "Собственник", tenant: "Арендатор" },
  },
} as const

function resolveLocale(locale: string): SupportedLocale {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function isAssignableRole(role: Role): role is AssignableRole {
  return role !== "admin"
}

export function OrganizationAuthorityEditor({
  administration,
  onMemberUpdated,
}: {
  administration: GovernanceAdministration
  onMemberUpdated: (member: GovernanceMember) => void
}) {
  const t = copy[resolveLocale(useLocale())]
  const mutableMembers = useMemo(
    () => administration.members.filter((member) => member.mutable),
    [administration.members]
  )
  const initialMember = mutableMembers[0] ?? null
  const [selectedId, setSelectedId] = useState(initialMember?.id ?? "")
  const selected = mutableMembers.find((member) => member.id === selectedId) ?? null
  const [role, setRole] = useState<AssignableRole>(
    initialMember && isAssignableRole(initialMember.role) ? initialMember.role : "manager"
  )
  const [officeId, setOfficeId] = useState(initialMember?.officeId ?? "")
  const [siteIds, setSiteIds] = useState<string[]>(initialMember?.siteIds ?? [])
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null)
  const retryKey = useRef<string | null>(null)

  function chooseMember(id: string) {
    setSelectedId(id)
    const member = mutableMembers.find((candidate) => candidate.id === id)
    if (!member) return
    setRole(isAssignableRole(member.role) ? member.role : "manager")
    setOfficeId(member.officeId ?? "")
    setSiteIds(member.siteIds)
    setReason("")
    setMessage(null)
    retryKey.current = null
  }

  const siteScoped = role === "manager" || role === "staff"

  async function save() {
    if (!selected || reason.trim().length < 10 || saving) return
    setSaving(true)
    setMessage(null)
    const idempotencyKey =
      retryKey.current ?? `governance:${selected.id}:${crypto.randomUUID()}`
    retryKey.current = idempotencyKey

    try {
      const response = await fetch("/api/site-management/governance/roles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          profileId: selected.id,
          expectedUpdatedAt: selected.updatedAt,
          role,
          officeId: officeId || null,
          siteIds: siteScoped ? siteIds : [],
          reason: reason.trim(),
        }),
      })
      const payload: unknown = await response.json()
      const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
      if (!response.ok) {
        throw new Error(typeof record.error === "string" ? record.error : "Authority update failed.")
      }
      const member = record.member as GovernanceMember | undefined
      if (!member?.id || !member.updatedAt) throw new Error("The server returned an invalid member record.")
      retryKey.current = null
      onMemberUpdated(member)
      setReason("")
      setMessage({ kind: "success", text: t.saved })
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Authority update failed.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (!administration.mutationAvailable) {
    return (
      <section aria-labelledby="organization-authority-title" className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
          <div>
            <h3 id="organization-authority-title" className="text-sm font-black text-foreground">{t.title}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{t.unavailable}</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="organization-authority-title" className="rounded-xl border border-primary/20 bg-primary/[0.035] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <UserRoundCog className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h3 id="organization-authority-title" className="text-sm font-black text-foreground">{t.title}</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">{t.body}</p>
        </div>
      </div>

      {mutableMembers.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-bold text-foreground">
            {t.member}
            <select value={selectedId} onChange={(event) => chooseMember(event.target.value)} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium">
              <option value="">{t.select}</option>
              {mutableMembers.map((member) => (
                <option key={member.id} value={member.id}>{member.fullName} · {t.roles[member.role as AssignableRole]}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-foreground">
            {t.role}
            <select value={role} onChange={(event) => { setRole(event.target.value as AssignableRole); retryKey.current = null }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium">
              {assignableRoles.map((candidate) => <option key={candidate} value={candidate}>{t.roles[candidate]}</option>)}
            </select>
          </label>

          <label className="grid gap-1.5 text-xs font-bold text-foreground">
            {t.office}
            <select value={officeId} onChange={(event) => { setOfficeId(event.target.value); retryKey.current = null }} className="h-10 rounded-lg border border-border bg-background px-3 text-sm font-medium">
              <option value="">{t.noOffice}</option>
              {administration.offices.map((office) => <option key={office.id} value={office.id}>{office.name}</option>)}
            </select>
          </label>

          <fieldset className="rounded-lg border border-border bg-background p-3" disabled={!siteScoped}>
            <legend className="px-1 text-xs font-bold text-foreground">{t.sites}</legend>
            {siteScoped ? (
              <div className="mt-1 grid max-h-28 gap-2 overflow-auto">
                {administration.sites.map((site) => (
                  <label key={site.id} className="flex items-center gap-2 text-xs text-foreground">
                    <input type="checkbox" checked={siteIds.includes(site.id)} onChange={(event) => { retryKey.current = null; setSiteIds((current) => event.target.checked ? [...current, site.id] : current.filter((id) => id !== site.id)) }} className="h-4 w-4 rounded border-border text-primary focus-visible:ring-primary" />
                    <span>{site.name}{site.code ? ` · ${site.code}` : ""}</span>
                  </label>
                ))}
              </div>
            ) : <p className="text-xs text-muted-foreground">{t.noSites}</p>}
          </fieldset>

          <label className="grid gap-1.5 text-xs font-bold text-foreground lg:col-span-2">
            {t.reason}
            <textarea value={reason} onChange={(event) => { setReason(event.target.value); retryKey.current = null }} maxLength={1000} rows={3} placeholder={t.reasonHint} className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal" />
          </label>

          <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={() => void save()} disabled={!selected || reason.trim().length < 10 || saving} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {t.save}
            </button>
            <p aria-live="polite" className={`text-xs ${message?.kind === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message?.text}</p>
          </div>
        </div>
      )}
    </section>
  )
}
