"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Ban,
  Building2,
  CheckCircle2,
  CircleAlert,
  Clock3,
  KeyRound,
  LockKeyhole,
  Network,
  PlugZap,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { OrganizationAuthorityEditor } from "@/components/organization-authority-editor"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import type {
  GovernanceCapabilityStatus,
  GovernanceControlKey,
  GovernancePersonaKey,
  GovernanceScopeKind,
  RoleGovernanceDTO,
} from "@/lib/role-governance"
import type { Action, Permission, Resource, Role } from "@/lib/rbac"
import type {
  GovernanceAdministration,
  GovernanceMember,
} from "@/lib/role-governance-repository"

type SupportedLocale = "tr" | "en" | "de" | "ru"
type RoleGovernanceApiDTO = RoleGovernanceDTO & {
  administration?: GovernanceAdministration
}

interface GovernanceCopy {
  eyebrow: string
  organizationTitle: string
  siteTitle: string
  organizationBody: string
  siteBody: string
  readOnly: string
  loading: string
  error: string
  retryHint: string
  currentAuthority: string
  organizationBoundary: string
  siteBoundary: string
  boundaryReady: string
  boundaryMissing: string
  noCrossOrganization: string
  controlsTitle: string
  controlsBody: string
  rolesTitle: string
  rolesBody: string
  personasTitle: string
  personasBody: string
  resources: string
  permissions: string
  baseRole: string
  protectedPersona: string
  assignablePersona: string
  readOnlyFootnote: string
  status: Record<GovernanceCapabilityStatus, string>
  authority: Record<RoleGovernanceDTO["actor"]["authority"], string>
  scope: Record<GovernanceScopeKind, string>
  actions: Record<Action, string>
  controls: Record<GovernanceControlKey, { title: string; detail: string }>
  personas: Record<GovernancePersonaKey, { title: string; detail: string }>
}

const governanceCopy: Record<SupportedLocale, GovernanceCopy> = {
  tr: {
    eyebrow: "YETKİ KONTROL DÜZLEMİ",
    organizationTitle: "Organizasyon yönetişimi",
    siteTitle: "Site operasyon yönetişimi",
    organizationBody: "Organizasyon yöneticisinin rol kapsamını, korunan işlemleri ve entegrasyon bağımlılıklarını tek bir doğruluk kaynağından gösterir.",
    siteBody: "Property manager için site sınırı, operasyon rolleri ve insan onayı gerektiren işlemler açıkça ayrılır.",
    readOnly: "Salt okunur doğrulanmış görünüm",
    loading: "Yetki kapsamı doğrulanıyor…",
    error: "Yetki yönetişimi şu anda yüklenemedi.",
    retryHint: "Oturumu veya bağlantıyı doğrulayıp sayfayı yenileyin.",
    currentAuthority: "Geçerli yetki",
    organizationBoundary: "Organizasyon sınırı",
    siteBoundary: "Site sınırı",
    boundaryReady: "Profile bağlı",
    boundaryMissing: "Profil bağlamı atanmamış",
    noCrossOrganization: "Organizasyonlar arası erişim kapalıdır.",
    controlsTitle: "Kontrol uygulanabilirliği",
    controlsBody: "Durumlar gerçek çalışma sınırlarını gösterir; bu görünüm çalışmayan bir ayarı etkinmiş gibi sunmaz.",
    rolesTitle: "Kanonik iş rolleri",
    rolesBody: "Veritabanında atanabilen altı rol ve fiili izin kapsamları.",
    personasTitle: "Operasyon personeleri",
    personasBody: "Platform, organizasyon, saha, yüklenici, sakin ve kamu girişi sınırları rol çoğalması olmadan modellenir.",
    resources: "Modül",
    permissions: "İzin",
    baseRole: "Temel rol",
    protectedPersona: "Atanamaz / korumalı",
    assignablePersona: "Atanabilir iş rolü",
    readOnlyFootnote: "Rol tanımları doğrulanmış ve salt okunurdur. Organizasyon yöneticisi rol, ofis ve site kapsamını ayrı denetimli komutla değiştirir; platform yetkisi ve hassas işlemler korumalı onay olarak kalır.",
    status: {
      available: "Kullanılabilir",
      approval_required: "Onay gerekli",
      provider_blocked: "Sağlayıcı bekleniyor",
      unavailable: "Kullanılamaz",
    },
    authority: {
      organization_administrator: "Organizasyon yöneticisi",
      property_manager: "Property manager",
      finance_controller: "Finans sorumlusu",
      field_operator: "Saha operatörü",
      unit_owner: "Bağımsız bölüm maliki",
      unit_tenant: "Yetkili kiracı",
    },
    scope: {
      protected_platform: "Korumalı platform",
      organization: "Atanmış organizasyon",
      site: "Atanmış site",
      finance: "Organizasyon finansı",
      assignment: "Yalnızca atanmış işler",
      owned_unit: "Sahip olunan bağımsız bölüm",
      rented_unit: "Kiralanan bağımsız bölüm",
      public_intake: "Kimliksiz kamu girişi",
    },
    actions: { view: "Görüntüle", create: "Oluştur", update: "Güncelle", delete: "Sil", manage: "Yönet", export: "Dışa aktar", approve: "Onayla", assign: "Ata" },
    controls: {
      permission_visibility: { title: "İzin görünürlüğü", detail: "Geçerli rol, modül ve aksiyon kapsamı doğrulanmış API üzerinden okunur." },
      role_assignment: { title: "Rol atama", detail: "Rol değişiklikleri yeniden kimlik doğrulama, gerekçe ve değiştirilemez audit kaydı gerektirir." },
      site_assignment: { title: "Site ve ekip atama", detail: "Personel ve property manager kapsamı site ilişkisiyle ve onaylı iş akışıyla sınırlandırılmalıdır." },
      sensitive_approval: { title: "Hassas işlem onayı", detail: "Finans, erişim, iade ve güvenlik işlemleri çift kontrol olmadan yürütülemez." },
      provider_activation: { title: "Harici sağlayıcı aktivasyonu", detail: "Sözleşme, anahtar, veri işleme kararı ve sağlık kontrolü tamamlanana kadar kapalıdır." },
      cross_organization_access: { title: "Organizasyonlar arası erişim", detail: "Normal admin rolüne verilmez; şirket verisi sınır dışına taşınamaz." },
      public_emergency_dispatch: { title: "Kamu acil çağrı otomasyonu", detail: "112/185/186/187 gibi kamu hatları AI tarafından otomatik aranamaz." },
    },
    personas: {
      platform_super_admin: { title: "Platform süper yöneticisi", detail: "Organizasyon rolü değildir; ayrı kimlik, ayrı oturum ve break-glass audit gerektiren korumalı platform kapsamıdır." },
      organization_admin: { title: "Organizasyon yöneticisi", detail: "Admin temel rolüyle yalnızca atanmış şirket içinde kullanıcı, politika, audit ve sağlayıcı görünürlüğü sağlar." },
      property_manager: { title: "Property manager", detail: "Manager temel rolüyle atanmış sitedeki servis, rezervasyon, ekip, SLA ve günlük riskleri yönetir." },
      accountant: { title: "Muhasebe", detail: "Finans kayıtlarını ve onay kuyruklarını görür; saha kapatma veya kullanıcı yönetimi yapmaz." },
      internal_field_staff: { title: "İç saha personeli", detail: "Atanmış işleri kabul eder, durum ve kanıt ekler; finans ve rol yönetimine erişmez." },
      contractor: { title: "Yüklenici", detail: "Personel rolünden ayrı tutulur; yalnızca atanmış iş, süreli erişim ve sözleşme/sertifika doğrulamasıyla etkinleşir." },
      owner: { title: "Malik", detail: "Yalnızca sahip olduğu bağımsız bölümler, yetkili kiracılar ve ilgili talepleri görür." },
      tenant: { title: "Kiracı", detail: "Yalnızca aktif kira ilişkisine bağlı bölüm, talepler, rezervasyonlar ve belgeleri görür." },
      public_intake: { title: "Misafir / kamu girişi", detail: "Kimliksiz ticket açma aktif değildir; güvenli başvuru kanalı ayrıca oran sınırlama ve doğrulama gerektirir." },
    },
  },
  en: {
    eyebrow: "AUTHORITY CONTROL PLANE",
    organizationTitle: "Organization governance",
    siteTitle: "Site operations governance",
    organizationBody: "Shows the organization administrator's role boundaries, protected actions, and provider dependencies from one canonical source.",
    siteBody: "Makes the property manager's site boundary, operational roles, and human-approval requirements explicit.",
    readOnly: "Verified read-only view",
    loading: "Verifying authority scope…",
    error: "Role governance could not be loaded.",
    retryHint: "Verify the session or connection and refresh the page.",
    currentAuthority: "Current authority",
    organizationBoundary: "Organization boundary",
    siteBoundary: "Site boundary",
    boundaryReady: "Bound to profile",
    boundaryMissing: "Profile context not assigned",
    noCrossOrganization: "Cross-organization access is disabled.",
    controlsTitle: "Control feasibility",
    controlsBody: "Statuses describe the real operating boundary; this view never presents an unimplemented setting as active.",
    rolesTitle: "Canonical business roles",
    rolesBody: "The six assignable database roles and their effective permission scope.",
    personasTitle: "Operating personas",
    personasBody: "Platform, organization, field, contractor, resident, and public boundaries are modeled without role sprawl.",
    resources: "Modules",
    permissions: "Permissions",
    baseRole: "Base role",
    protectedPersona: "Protected / not assignable",
    assignablePersona: "Assignable business role",
    readOnlyFootnote: "Role definitions remain verified and read-only. Organization admins change eligible member role, office, and site scope through the separate audited command; platform authority and sensitive actions remain protected approvals.",
    status: {
      available: "Available",
      approval_required: "Approval required",
      provider_blocked: "Provider blocked",
      unavailable: "Unavailable",
    },
    authority: {
      organization_administrator: "Organization administrator",
      property_manager: "Property manager",
      finance_controller: "Finance controller",
      field_operator: "Field operator",
      unit_owner: "Unit owner",
      unit_tenant: "Authorized tenant",
    },
    scope: {
      protected_platform: "Protected platform",
      organization: "Assigned organization",
      site: "Assigned site",
      finance: "Organization finance",
      assignment: "Assigned work only",
      owned_unit: "Owned unit",
      rented_unit: "Rented unit",
      public_intake: "Unauthenticated public intake",
    },
    actions: { view: "View", create: "Create", update: "Update", delete: "Delete", manage: "Manage", export: "Export", approve: "Approve", assign: "Assign" },
    controls: {
      permission_visibility: { title: "Permission visibility", detail: "The effective role, module, and action scope is read from an authenticated canonical API." },
      role_assignment: { title: "Role assignment", detail: "Role changes require re-authentication, a reason, approval, and an immutable audit event." },
      site_assignment: { title: "Site and team assignment", detail: "Staff and property-manager authority must be constrained by a site relationship and approved workflow." },
      sensitive_approval: { title: "Sensitive-action approval", detail: "Finance, access, refund, and security actions cannot execute without dual control." },
      provider_activation: { title: "External provider activation", detail: "Remains blocked until contracts, keys, data-processing decisions, and health checks exist." },
      cross_organization_access: { title: "Cross-organization access", detail: "Never belongs to the normal admin role; company data cannot cross its tenant boundary." },
      public_emergency_dispatch: { title: "Public emergency auto-dispatch", detail: "AI cannot autonomously call public lines such as 112, 185, 186, or 187." },
    },
    personas: {
      platform_super_admin: { title: "Platform super-admin", detail: "Not an organization role; a protected platform scope requiring separate identity, session, break-glass approval, and audit." },
      organization_admin: { title: "Organization administrator", detail: "Uses the admin base role only inside the assigned company for users, policy, audit, and provider visibility." },
      property_manager: { title: "Property manager", detail: "Uses the manager base role to operate service, reservations, teams, SLAs, and daily risk within assigned sites." },
      accountant: { title: "Accountant", detail: "Handles finance records and approval queues without field closure or user-administration authority." },
      internal_field_staff: { title: "Internal field staff", detail: "Accepts assigned work and adds status and evidence without finance or role-management access." },
      contractor: { title: "Contractor", detail: "Must remain distinct from staff and receive only assignment-bound, time-limited access after contract and credential checks." },
      owner: { title: "Owner", detail: "Sees only owned units, authorized tenants, and records linked to those relationships." },
      tenant: { title: "Tenant", detail: "Sees only units, requests, reservations, and documents linked to an active tenancy." },
      public_intake: { title: "Guest / public intake", detail: "Unauthenticated ticket creation is not active; a future safe intake channel needs verification and rate limits." },
    },
  },
  de: {
    eyebrow: "BERECHTIGUNGS-KONTROLLEBENE",
    organizationTitle: "Organisations-Governance",
    siteTitle: "Standortbezogene Betriebs-Governance",
    organizationBody: "Zeigt Grenzen der Organisationsadministration, geschützte Aktionen und Provider-Abhängigkeiten aus einer kanonischen Quelle.",
    siteBody: "Grenzt Standortverantwortung des Property Managers, operative Rollen und menschliche Freigaben eindeutig ab.",
    readOnly: "Verifizierte schreibgeschützte Ansicht",
    loading: "Berechtigungsumfang wird geprüft…",
    error: "Die Rollen-Governance konnte nicht geladen werden.",
    retryHint: "Sitzung oder Verbindung prüfen und die Seite neu laden.",
    currentAuthority: "Aktuelle Berechtigung",
    organizationBoundary: "Organisationsgrenze",
    siteBoundary: "Standortgrenze",
    boundaryReady: "Mit Profil verknüpft",
    boundaryMissing: "Profilkontext nicht zugewiesen",
    noCrossOrganization: "Organisationsübergreifender Zugriff ist deaktiviert.",
    controlsTitle: "Umsetzbarkeit der Kontrollen",
    controlsBody: "Statuswerte zeigen die reale Betriebsgrenze; nicht implementierte Einstellungen werden nicht als aktiv dargestellt.",
    rolesTitle: "Kanonische Geschäftsrollen",
    rolesBody: "Die sechs zuweisbaren Datenbankrollen mit ihrem wirksamen Berechtigungsumfang.",
    personasTitle: "Betriebspersonas",
    personasBody: "Plattform-, Organisations-, Feld-, Dienstleister-, Bewohner- und öffentliche Grenzen ohne Rollenwildwuchs.",
    resources: "Module",
    permissions: "Berechtigungen",
    baseRole: "Basisrolle",
    protectedPersona: "Geschützt / nicht zuweisbar",
    assignablePersona: "Zuweisbare Geschäftsrolle",
    readOnlyFootnote: "Rollendefinitionen bleiben verifiziert und schreibgeschützt. Organisationsadmins ändern Rolle, Büro und Standort berechtigter Mitglieder über den separaten auditierten Befehl; Plattformrechte und sensible Aktionen bleiben geschützt.",
    status: { available: "Verfügbar", approval_required: "Freigabe erforderlich", provider_blocked: "Provider ausstehend", unavailable: "Nicht verfügbar" },
    authority: { organization_administrator: "Organisationsadministrator", property_manager: "Property Manager", finance_controller: "Finanzverantwortlicher", field_operator: "Feldmitarbeiter", unit_owner: "Wohnungseigentümer", unit_tenant: "Berechtigter Mieter" },
    scope: { protected_platform: "Geschützte Plattform", organization: "Zugewiesene Organisation", site: "Zugewiesener Standort", finance: "Organisationsfinanzen", assignment: "Nur zugewiesene Arbeiten", owned_unit: "Eigene Einheit", rented_unit: "Gemietete Einheit", public_intake: "Nicht authentifizierte Erfassung" },
    actions: { view: "Ansehen", create: "Erstellen", update: "Aktualisieren", delete: "Löschen", manage: "Verwalten", export: "Exportieren", approve: "Freigeben", assign: "Zuweisen" },
    controls: {
      permission_visibility: { title: "Berechtigungstransparenz", detail: "Wirksame Rollen-, Modul- und Aktionsrechte werden über eine authentifizierte kanonische API gelesen." },
      role_assignment: { title: "Rollenzuweisung", detail: "Rollenänderungen brauchen erneute Authentifizierung, Begründung, Freigabe und unveränderlichen Audit-Eintrag." },
      site_assignment: { title: "Standort- und Teamzuweisung", detail: "Personal und Property Manager müssen über Standortbeziehungen und einen freigegebenen Ablauf begrenzt werden." },
      sensitive_approval: { title: "Freigabe sensibler Aktionen", detail: "Finanz-, Zutritts-, Rückerstattungs- und Sicherheitsaktionen benötigen Vier-Augen-Kontrolle." },
      provider_activation: { title: "Aktivierung externer Provider", detail: "Bis Verträge, Schlüssel, Datenentscheidungen und Health Checks vorliegen, bleibt die Funktion gesperrt." },
      cross_organization_access: { title: "Organisationsübergreifender Zugriff", detail: "Gehört nie zur normalen Adminrolle; Unternehmensdaten bleiben in ihrer Mandantengrenze." },
      public_emergency_dispatch: { title: "Automatischer öffentlicher Notruf", detail: "KI darf öffentliche Nummern wie 112, 185, 186 oder 187 nicht selbstständig anrufen." },
    },
    personas: {
      platform_super_admin: { title: "Plattform-Superadmin", detail: "Keine Organisationsrolle; geschützter Plattformumfang mit separater Identität, Sitzung, Break-Glass-Freigabe und Audit." },
      organization_admin: { title: "Organisationsadministrator", detail: "Nutzt die Admin-Basisrolle nur in der zugewiesenen Firma für Nutzer-, Richtlinien-, Audit- und Providertransparenz." },
      property_manager: { title: "Property Manager", detail: "Betreibt Service, Reservierungen, Teams, SLAs und Tagesrisiken mit der Managerrolle in zugewiesenen Standorten." },
      accountant: { title: "Buchhaltung", detail: "Bearbeitet Finanzdaten und Freigaben ohne Feldabschluss- oder Nutzerverwaltungsrechte." },
      internal_field_staff: { title: "Internes Feldpersonal", detail: "Bearbeitet zugewiesene Arbeiten und Nachweise ohne Finanz- oder Rollenverwaltungszugriff." },
      contractor: { title: "Externer Dienstleister", detail: "Bleibt vom Personal getrennt und erhält nur auftragsgebundenen, zeitlich begrenzten Zugriff nach Vertrags- und Qualifikationsprüfung." },
      owner: { title: "Eigentümer", detail: "Sieht nur eigene Einheiten, berechtigte Mieter und damit verknüpfte Datensätze." },
      tenant: { title: "Mieter", detail: "Sieht nur Einheiten, Anfragen, Reservierungen und Dokumente einer aktiven Mietbeziehung." },
      public_intake: { title: "Gast / öffentliche Erfassung", detail: "Nicht authentifizierte Ticketerfassung ist nicht aktiv; ein künftiger Kanal braucht Verifikation und Rate Limits." },
    },
  },
  ru: {
    eyebrow: "КОНТУР УПРАВЛЕНИЯ ДОСТУПОМ",
    organizationTitle: "Управление организацией",
    siteTitle: "Управление операциями объекта",
    organizationBody: "Показывает границы администратора организации, защищенные действия и зависимости от провайдеров из единого источника.",
    siteBody: "Явно разделяет границы объекта для property manager, операционные роли и действия с обязательным подтверждением человека.",
    readOnly: "Проверенный режим только для чтения",
    loading: "Проверяем область полномочий…",
    error: "Не удалось загрузить управление ролями.",
    retryHint: "Проверьте сессию или подключение и обновите страницу.",
    currentAuthority: "Текущие полномочия",
    organizationBoundary: "Граница организации",
    siteBoundary: "Граница объекта",
    boundaryReady: "Привязано к профилю",
    boundaryMissing: "Контекст профиля не назначен",
    noCrossOrganization: "Доступ между организациями отключен.",
    controlsTitle: "Готовность элементов управления",
    controlsBody: "Статусы отражают реальные границы; неработающие настройки не выдаются за активные.",
    rolesTitle: "Канонические бизнес-роли",
    rolesBody: "Шесть назначаемых ролей базы данных и их фактические разрешения.",
    personasTitle: "Операционные персоны",
    personasBody: "Границы платформы, организации, персонала, подрядчика, резидента и публичного входа без разрастания ролей.",
    resources: "Модули",
    permissions: "Разрешения",
    baseRole: "Базовая роль",
    protectedPersona: "Защищено / не назначается",
    assignablePersona: "Назначаемая бизнес-роль",
    readOnlyFootnote: "Определения ролей остаются проверенными и доступны только для чтения. Администратор меняет роль, офис и объекты допустимых участников отдельной аудируемой командой; платформенные и чувствительные права остаются защищёнными.",
    status: { available: "Доступно", approval_required: "Нужно согласование", provider_blocked: "Ожидается провайдер", unavailable: "Недоступно" },
    authority: { organization_administrator: "Администратор организации", property_manager: "Property manager", finance_controller: "Финансовый контролер", field_operator: "Полевой сотрудник", unit_owner: "Собственник помещения", unit_tenant: "Авторизованный арендатор" },
    scope: { protected_platform: "Защищенная платформа", organization: "Назначенная организация", site: "Назначенный объект", finance: "Финансы организации", assignment: "Только назначенная работа", owned_unit: "Собственное помещение", rented_unit: "Арендуемое помещение", public_intake: "Неавторизованный публичный вход" },
    actions: { view: "Просмотр", create: "Создание", update: "Изменение", delete: "Удаление", manage: "Управление", export: "Экспорт", approve: "Согласование", assign: "Назначение" },
    controls: {
      permission_visibility: { title: "Прозрачность разрешений", detail: "Действующие роли, модули и действия читаются через авторизованный канонический API." },
      role_assignment: { title: "Назначение ролей", detail: "Изменение роли требует повторной аутентификации, причины, согласования и неизменяемого аудита." },
      site_assignment: { title: "Назначение объекта и команды", detail: "Полномочия персонала и property manager должны ограничиваться связью с объектом и согласованным процессом." },
      sensitive_approval: { title: "Согласование чувствительных действий", detail: "Финансовые, пропускные, возвратные и защитные операции требуют двойного контроля." },
      provider_activation: { title: "Активация внешнего провайдера", detail: "Заблокировано до появления договоров, ключей, решений по данным и проверки доступности." },
      cross_organization_access: { title: "Доступ между организациями", detail: "Не входит в обычную роль admin; данные компании не пересекают границу арендатора." },
      public_emergency_dispatch: { title: "Автоматический вызов госслужб", detail: "ИИ не может самостоятельно звонить на государственные номера 112, 185, 186 или 187." },
    },
    personas: {
      platform_super_admin: { title: "Суперадмин платформы", detail: "Не является ролью организации: защищенный контур с отдельной учетной записью, сессией, break-glass согласованием и аудитом." },
      organization_admin: { title: "Администратор организации", detail: "Использует базовую роль admin только внутри назначенной компании для пользователей, политик, аудита и провайдеров." },
      property_manager: { title: "Property manager", detail: "Управляет сервисом, бронированиями, командами, SLA и ежедневными рисками на назначенных объектах." },
      accountant: { title: "Бухгалтер", detail: "Работает с финансами и согласованиями без закрытия полевых работ и управления пользователями." },
      internal_field_staff: { title: "Внутренний полевой персонал", detail: "Выполняет назначенные работы и добавляет доказательства без доступа к финансам и ролям." },
      contractor: { title: "Подрядчик", detail: "Отделен от персонала и получает только ограниченный заданием и временем доступ после проверки договора и квалификации." },
      owner: { title: "Собственник", detail: "Видит только свои помещения, авторизованных арендаторов и связанные записи." },
      tenant: { title: "Арендатор", detail: "Видит только помещения, заявки, бронирования и документы активной аренды." },
      public_intake: { title: "Гость / публичный вход", detail: "Неавторизованное создание заявок не активно; будущий канал потребует проверки и ограничения частоты." },
    },
  },
}

const statusIcons = {
  available: CheckCircle2,
  approval_required: Clock3,
  provider_blocked: PlugZap,
  unavailable: Ban,
} satisfies Record<GovernanceCapabilityStatus, React.ElementType>

function resolveLocale(locale: string): SupportedLocale {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function statusVariant(status: GovernanceCapabilityStatus) {
  if (status === "available") return "success"
  if (status === "approval_required") return "warning"
  if (status === "provider_blocked") return "info"
  return "neutral"
}

function isRoleGovernanceDTO(value: unknown): value is RoleGovernanceApiDTO {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<RoleGovernanceApiDTO>
  return (
    candidate.schemaVersion === "2026-07-roles-v1" &&
    candidate.readonly === true &&
    Boolean(candidate.actor) &&
    Array.isArray(candidate.controls) &&
    Array.isArray(candidate.roles) &&
    Array.isArray(candidate.personas)
  )
}

function resourceActions(
  permissions: Permission[],
  resource: Resource
): Action[] {
  return permissions.flatMap((item) => {
    const [permissionResource, action] = item.split(":") as [Resource, Action]
    return permissionResource === resource ? [action] : []
  })
}

export function RoleGovernancePanel() {
  const user = useUser()
  const rawLocale = useLocale()
  const roleT = useTranslations("roles")
  const dashboardT = useTranslations("dashboard")
  const copy = governanceCopy[resolveLocale(rawLocale)]
  const [data, setData] = useState<RoleGovernanceApiDTO | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (user.role !== "admin" && user.role !== "manager") return
    const controller = new AbortController()

    async function loadGovernance() {
      setFailed(false)
      try {
        const response = await fetch("/api/site-management/governance/roles", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        })
        if (!response.ok) throw new Error("Governance request failed")
        const payload: unknown = await response.json()
        if (!isRoleGovernanceDTO(payload)) throw new Error("Invalid governance response")
        setData(payload)
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        setFailed(true)
      }
    }

    void loadGovernance()
    return () => controller.abort()
  }, [user.role])

  const statusCounts = useMemo(() => {
    const counts: Record<GovernanceCapabilityStatus, number> = {
      available: 0,
      approval_required: 0,
      provider_blocked: 0,
      unavailable: 0,
    }
    data?.controls.forEach((control) => {
      counts[control.status] += 1
    })
    return counts
  }, [data])

  function handleMemberUpdated(member: GovernanceMember) {
    setData((current) => {
      if (!current?.administration) return current
      return {
        ...current,
        administration: {
          ...current.administration,
          members: current.administration.members.map((existing) =>
            existing.id === member.id ? member : existing
          ),
        },
      }
    })
  }

  if (user.role !== "admin" && user.role !== "manager") return null

  if (failed) {
    return (
      <div role="alert" className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5">
        <div className="flex items-start gap-3">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" aria-hidden="true" />
          <div>
            <p className="font-bold text-foreground">{copy.error}</p>
            <p className="mt-1 text-sm text-muted-foreground">{copy.retryHint}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div aria-live="polite" aria-busy="true" className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3 text-sm font-semibold text-muted-foreground">
          <ShieldCheck className="h-5 w-5 animate-pulse text-primary" aria-hidden="true" />
          {copy.loading}
        </div>
      </div>
    )
  }

  const organizationView = data.actor.view === "organization"

  return (
    <section aria-labelledby="role-governance-title" className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-br from-primary/[0.10] via-card to-emerald-500/[0.06] p-5 sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full border border-primary/10 bg-primary/[0.04]" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 text-[11px] font-black tracking-[0.16em] text-primary">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {copy.eyebrow}
              </span>
              <StatusBadge variant={data.administration?.mutationAvailable ? "success" : "accent"}>
                {data.administration?.mutationAvailable ? copy.status.available : copy.readOnly}
              </StatusBadge>
            </div>
            <h2 id="role-governance-title" className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {organizationView ? copy.organizationTitle : copy.siteTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {organizationView ? copy.organizationBody : copy.siteBody}
            </p>
          </div>

          <div className="min-w-64 rounded-xl border border-border/80 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{copy.currentAuthority}</p>
            <p className="mt-1 text-sm font-black text-foreground">{copy.authority[data.actor.authority]}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              {organizationView ? <Building2 className="h-4 w-4 text-primary" aria-hidden="true" /> : <Network className="h-4 w-4 text-primary" aria-hidden="true" />}
              <span>{organizationView ? copy.organizationBoundary : copy.siteBoundary}: {data.actor.boundaryConfigured ? copy.boundaryReady : copy.boundaryMissing}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <LockKeyhole className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>{copy.noCrossOrganization}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-7 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label={copy.controlsTitle}>
          {data.controls.length > 0 && Object.entries(statusCounts).map(([status, count]) => {
            const typedStatus = status as GovernanceCapabilityStatus
            const Icon = statusIcons[typedStatus]
            return (
              <div key={status} className="flex items-center gap-3 rounded-xl border border-border bg-muted/25 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-lg font-black leading-none text-foreground">{count}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{copy.status[typedStatus]}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div>
          <div className="mb-4">
            <h3 className="text-sm font-black text-foreground">{copy.controlsTitle}</h3>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">{copy.controlsBody}</p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.controls.map((control) => {
              const display = copy.controls[control.key]
              const Icon = statusIcons[control.status]
              return (
                <article key={control.key} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      <h4 className="text-sm font-bold text-foreground">{display.title}</h4>
                    </div>
                    <StatusBadge variant={statusVariant(control.status)}>{copy.status[control.status]}</StatusBadge>
                  </div>
                  <p className="mt-2 pl-7 text-xs leading-5 text-muted-foreground">{display.detail}</p>
                </article>
              )
            })}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-start gap-3">
            <UserRoundCog className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-black text-foreground">{copy.rolesTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{copy.rolesBody}</p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {data.roles.map((role) => (
              <details key={role.role} className="group rounded-xl border border-border bg-background open:bg-muted/15">
                <summary className="cursor-pointer list-none p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-foreground">{roleT(role.role)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{copy.authority[role.authority]} · {copy.scope[role.scopeKind]}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <StatusBadge variant="neutral">{role.resources.length} {copy.resources}</StatusBadge>
                      <StatusBadge variant="accent">{role.permissionCount} {copy.permissions}</StatusBadge>
                    </div>
                  </div>
                </summary>
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <p className="text-xs leading-5 text-muted-foreground">{roleT(`descriptions.${role.role}`)}</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {role.resources.map((resource) => (
                      <div key={resource} className="rounded-lg border border-border bg-card px-3 py-2">
                        <p className="text-[11px] font-bold text-foreground">{dashboardT(`menu.${resource}`)}</p>
                        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                          {resourceActions(role.permissions, resource).map((action) => copy.actions[action]).join(" · ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-start gap-3">
            <UsersRound className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
            <div>
              <h3 className="text-sm font-black text-foreground">{copy.personasTitle}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{copy.personasBody}</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.personas.map((persona) => {
              const display = copy.personas[persona.key]
              return (
                <article key={persona.key} className="rounded-xl border border-border bg-muted/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-black text-foreground">{display.title}</h4>
                    <StatusBadge variant={statusVariant(persona.status)}>{copy.status[persona.status]}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{display.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-md border border-border bg-card px-2 py-1">{copy.scope[persona.scopeKind]}</span>
                    <span className="rounded-md border border-border bg-card px-2 py-1">
                      {persona.baseRole ? `${copy.baseRole}: ${roleT(persona.baseRole as Role)}` : copy.protectedPersona}
                    </span>
                    {persona.assignable ? <span className="sr-only">{copy.assignablePersona}</span> : null}
                  </div>
                </article>
              )
            })}
          </div>
        </div>

        {organizationView && data.administration ? (
          <OrganizationAuthorityEditor
            administration={data.administration}
            onMemberUpdated={handleMemberUpdated}
          />
        ) : null}

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-4 text-xs leading-5 text-muted-foreground">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p>{copy.readOnlyFootnote}</p>
        </div>
      </div>
    </section>
  )
}
