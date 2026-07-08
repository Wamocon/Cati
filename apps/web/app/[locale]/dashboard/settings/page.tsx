"use client"

import { Bell, CheckCircle2, Eye, FileClock, Globe, PlugZap, Shield, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  auditEvents,
  getIntegrationSummary,
  getPlatformControlSummary,
  integrationProviders,
  platformControls,
  roleCoverage,
  type AuditEvent,
  type IntegrationProviderRecord,
  type PlatformControl,
} from "@/lib/site-management-data"

const settingsCopy = {
  tr: {
    title: "Platform Yönetim Merkezi",
    subtitle: "Rol yetki kapsamı, denetim izi, güvenlik kontrolleri ve kullanıcı görünürlüğü tek yönetim alanında takip edilir.",
    metrics: { controls: "Kontrol", active: "Aktif", review: "İnceleme", highRisk: "Yüksek risk denetim" },
    controlsTitle: "Güvenlik ve platform kontrolleri",
    controlsBody: "Her kontrolün sahibi, amacı ve canlı durumu yönetim için görünür.",
    operationsTitle: "Operasyon ayarları",
    operationsBody: "Yönetici, finans, güvenlik ve saha ekipleri aynı kontrol merkezinden standart kuralları görür.",
    configuration: [
      { title: "Bildirim kuralları", desc: "Borç, SLA, check-in, check-out ve belge eksikliği için rol bazlı uyarılar." },
      { title: "Güvenlik politikası", desc: "Rol bazlı erişim, hassas finans işlemleri ve insan onaylı AI kararları." },
      { title: "Dil ve yerelleştirme", desc: "Türkçe ana kullanım, çok dilli sakin desteği ve resmi ton standardı." },
    ],
    integrationsTitle: "Faz 13 entegrasyon hazırlığı",
    integrationsBody: "Supabase bağlı backend olarak çalışır. Ödeme, banka, SMS, e-posta, erişim, kamera ve OAuth sağlayıcıları müşteri sözleşmeleri ve API anahtarları onaylanana kadar demo/sağlayıcı-hazır modunda kalır.",
    live: "Canlı",
    demo: "Demo",
    waitingClient: "Müşteri bekliyor",
    version: "Platform sürümü",
    yes: "Var",
    no: "Yok",
    controlStatus: { active: "Aktif", review: "İnceleme", planned: "Planlı" },
    integrationStatus: { connected: "Bağlı", demo_ready: "Demo hazır", blocked_pending_client: "Müşteri bekleniyor", manual_fallback: "Manuel yedek" },
    risk: { high: "Yüksek", medium: "Orta", low: "Düşük" },
    headers: {
      role: "Rol",
      users: "Kullanıcı",
      financeApproval: "Finans onayı",
      accessRestriction: "Erişim kısıtı",
      export: "Dışa aktarım",
      audit: "Denetim",
      actor: "Aktör",
      module: "Modül",
      risk: "Risk",
      action: "Aksiyon",
      service: "Servis",
      provider: "Provider",
      status: "Status",
      required: "Needed from client",
      fallback: "Fallback",
    },
  },
  en: {
    title: "Platform Administration Center",
    subtitle: "Role permission scope, audit trail, security controls and user visibility are tracked in one administration area.",
    metrics: { controls: "Controls", active: "Active", review: "Review", highRisk: "High-risk audits" },
    controlsTitle: "Security and platform controls",
    controlsBody: "Each control owner, purpose and live status is visible to management.",
    operationsTitle: "Operation settings",
    operationsBody: "Administration, finance, security and field teams see standard rules from the same control center.",
    configuration: [
      { title: "Notification rules", desc: "Role-based alerts for debt, SLA, check-in, check-out and missing documents." },
      { title: "Security policy", desc: "Role-based access, sensitive finance actions and human-approved AI decisions." },
      { title: "Language and localization", desc: "Turkish primary operations, multilingual resident support and formal tone standards." },
    ],
    integrationsTitle: "Phase 13 integration readiness",
    integrationsBody: "Supabase is the connected backend. Payment, bank, SMS, email, access, camera and OAuth providers stay in demo/provider-ready mode until client contracts and API keys are approved.",
    live: "Live",
    demo: "Demo",
    waitingClient: "Waiting for client",
    version: "Platform version",
    yes: "Yes",
    no: "No",
    controlStatus: { active: "Active", review: "Review", planned: "Planned" },
    integrationStatus: { connected: "Connected", demo_ready: "Demo ready", blocked_pending_client: "Waiting for client", manual_fallback: "Manual fallback" },
    risk: { high: "High", medium: "Medium", low: "Low" },
    headers: {
      role: "Role",
      users: "Users",
      financeApproval: "Finance approval",
      accessRestriction: "Access restriction",
      export: "Export",
      audit: "Audit",
      actor: "Actor",
      module: "Module",
      risk: "Risk",
      action: "Action",
      service: "Service",
      provider: "Provider",
      status: "Status",
      required: "Needed from client",
      fallback: "Fallback",
    },
  },
  de: {
    title: "Plattform-Administrationszentrum",
    subtitle: "Rollenberechtigungen, Audit-Trail, Sicherheitskontrollen und Benutzersichtbarkeit werden zentral verwaltet.",
    metrics: { controls: "Kontrollen", active: "Aktiv", review: "Prüfung", highRisk: "Hochrisiko-Audits" },
    controlsTitle: "Sicherheits- und Plattformkontrollen",
    controlsBody: "Owner, Zweck und Live-Status jeder Kontrolle sind für das Management sichtbar.",
    operationsTitle: "Operationseinstellungen",
    operationsBody: "Administration, Finanzen, Sicherheit und Feldteams sehen Standardregeln im selben Kontrollzentrum.",
    configuration: [
      { title: "Benachrichtigungsregeln", desc: "Rollenbasierte Warnungen für Schulden, SLA, Check-in, Check-out und fehlende Dokumente." },
      { title: "Sicherheitsrichtlinie", desc: "Rollenbasierter Zugriff, sensible Finanzaktionen und KI-Entscheidungen mit menschlicher Freigabe." },
      { title: "Sprache und Lokalisierung", desc: "Türkische Hauptoperationen, mehrsprachige Bewohnerunterstützung und formaler Tonstandard." },
    ],
    integrationsTitle: "Phase-13-Integrationsbereitschaft",
    integrationsBody: "Supabase läuft als angebundenes Backend. Zahlungs-, Bank-, SMS-, E-Mail-, Zugangs-, Kamera- und OAuth-Anbieter bleiben im Demo/Provider-ready-Modus, bis Verträge und API-Schlüssel freigegeben sind.",
    live: "Live",
    demo: "Demo",
    waitingClient: "Wartet auf Kunde",
    version: "Plattformversion",
    yes: "Ja",
    no: "Nein",
    controlStatus: { active: "Aktiv", review: "Prüfung", planned: "Geplant" },
    integrationStatus: { connected: "Verbunden", demo_ready: "Demo bereit", blocked_pending_client: "Wartet auf Kunde", manual_fallback: "Manueller Ersatz" },
    risk: { high: "Hoch", medium: "Mittel", low: "Niedrig" },
    headers: {
      role: "Rolle",
      users: "Benutzer",
      financeApproval: "Finanzfreigabe",
      accessRestriction: "Zugangssperre",
      export: "Export",
      audit: "Audit",
      actor: "Akteur",
      module: "Modul",
      risk: "Risiko",
      action: "Aktion",
      service: "Service",
      provider: "Provider",
      status: "Status",
      required: "Vom Kunden benötigt",
      fallback: "Fallback",
    },
  },
  ru: {
    title: "Центр администрирования платформы",
    subtitle: "Ролевые права, аудит, контроль безопасности и видимость пользователей отслеживаются в одной зоне управления.",
    metrics: { controls: "Контроли", active: "Активно", review: "Проверка", highRisk: "Аудит высокого риска" },
    controlsTitle: "Безопасность и контроль платформы",
    controlsBody: "Владелец, цель и live-статус каждого контроля видны управлению.",
    operationsTitle: "Операционные настройки",
    operationsBody: "Администрация, финансы, безопасность и полевая команда видят стандартные правила в одном центре контроля.",
    configuration: [
      { title: "Правила уведомлений", desc: "Ролевые уведомления по долгам, SLA, check-in, check-out и отсутствующим документам." },
      { title: "Политика безопасности", desc: "Ролевой доступ, чувствительные финансовые действия и AI-решения с одобрением человека." },
      { title: "Язык и локализация", desc: "Турецкий как основной язык операций, многоязычная поддержка резидентов и официальный тон." },
    ],
    integrationsTitle: "Готовность интеграций фазы 13",
    integrationsBody: "Supabase работает как подключенный backend. Провайдеры оплат, банка, SMS, e-mail, доступа, камер и OAuth остаются в demo/provider-ready режиме до одобрения договоров и API-ключей клиентом.",
    live: "Live",
    demo: "Демо",
    waitingClient: "Ожидает клиента",
    version: "Версия платформы",
    yes: "Да",
    no: "Нет",
    controlStatus: { active: "Активно", review: "Проверка", planned: "Запланировано" },
    integrationStatus: { connected: "Подключено", demo_ready: "Демо готово", blocked_pending_client: "Ожидает клиента", manual_fallback: "Ручной fallback" },
    risk: { high: "Высокий", medium: "Средний", low: "Низкий" },
    headers: {
      role: "Роль",
      users: "Пользователи",
      financeApproval: "Финансовое одобрение",
      accessRestriction: "Ограничение доступа",
      export: "Экспорт",
      audit: "Аудит",
      actor: "Актор",
      module: "Модуль",
      risk: "Риск",
      action: "Действие",
      service: "Сервис",
      provider: "Провайдер",
      status: "Статус",
      required: "Нужно от клиента",
      fallback: "Fallback",
    },
  },
} as const

type PlatformControlDisplayCopy = {
  area: string
  owner: string
  title: string
  detail: string
}

const platformControlDisplayCopy = {
  tr: {
    "CTL-AUTH-01": {
      area: "Kimlik",
      owner: "Platform",
      title: "Rol profili ve oturum kontrolü",
      detail:
        "Yerel çalışma ortamında yetki profili kullanılabilir; üretim ortamında doğrulanmış kullanıcı profili önceliklidir.",
    },
    "CTL-RBAC-01": {
      area: "RBAC",
      owner: "Güvenlik",
      title: "Rol bazlı menü ve yetki matrisi",
      detail:
        "Her rol için görüntüleme, oluşturma, onay, dışa aktarma ve yönetim hakları açık tanımlanır.",
    },
    "CTL-AUD-01": {
      area: "Denetim",
      owner: "Uyum",
      title: "Finans, erişim ve AI karar izi",
      detail:
        "Hassas kararlar aktör, modül, sebep, risk ve zaman bilgisiyle izlenebilir şekilde modellenir.",
    },
    "CTL-DATA-01": {
      area: "Veri",
      owner: "Veri",
      title: "Şirket/site izolasyon hazırlığı",
      detail:
        "Veri modeli şirket, site ve rol bağlamını güvenli erişim politikalarına hazırlayacak şekilde tasarlanmıştır.",
    },
    "CTL-AI-01": {
      area: "AI",
      owner: "AI yönetişimi",
      title: "AI aksiyonlarında insan onayı",
      detail:
        "AI finans, erişim veya hassas verilerde doğrudan işlem yapmaz; öneri ve onay kuyruğu üretir.",
    },
  },
  en: {
    "CTL-AUTH-01": {
      area: "Auth",
      owner: "Platform",
      title: "Role profile and session control",
      detail:
        "Access profiles can be used in local QA; verified user profiles take priority in production.",
    },
    "CTL-RBAC-01": {
      area: "RBAC",
      owner: "Security",
      title: "Role-based menu and permission matrix",
      detail:
        "View, create, approve, export and management rights are defined clearly for every role.",
    },
    "CTL-AUD-01": {
      area: "Audit",
      owner: "Compliance",
      title: "Finance, access and AI decision trail",
      detail:
        "Sensitive decisions are modeled with actor, module, reason, risk and timestamp for traceability.",
    },
    "CTL-DATA-01": {
      area: "Data",
      owner: "Data",
      title: "Company/site isolation readiness",
      detail:
        "The data model is prepared for secure access policies across company, site and role context.",
    },
    "CTL-AI-01": {
      area: "AI",
      owner: "AI governance",
      title: "Human approval for AI actions",
      detail:
        "AI does not directly act on finance, access or sensitive data; it creates recommendations and approval queues.",
    },
  },
  de: {
    "CTL-AUTH-01": {
      area: "Auth",
      owner: "Plattform",
      title: "Rollenprofil- und Sitzungskontrolle",
      detail:
        "In lokalen QA-Umgebungen können Zugriffsprofile genutzt werden; in Produktion haben verifizierte Benutzerprofile Vorrang.",
    },
    "CTL-RBAC-01": {
      area: "RBAC",
      owner: "Sicherheit",
      title: "Rollenbasiertes Menü und Berechtigungsmatrix",
      detail:
        "Ansichts-, Erstellungs-, Freigabe-, Export- und Verwaltungsrechte sind für jede Rolle klar definiert.",
    },
    "CTL-AUD-01": {
      area: "Audit",
      owner: "Compliance",
      title: "Finanz-, Zugangs- und KI-Entscheidungsspur",
      detail:
        "Sensible Entscheidungen werden mit Akteur, Modul, Grund, Risiko und Zeitpunkt nachvollziehbar modelliert.",
    },
    "CTL-DATA-01": {
      area: "Daten",
      owner: "Daten",
      title: "Vorbereitung der Unternehmens-/Standortisolierung",
      detail:
        "Das Datenmodell ist auf sichere Zugriffsrichtlinien nach Unternehmen, Standort und Rolle vorbereitet.",
    },
    "CTL-AI-01": {
      area: "KI",
      owner: "KI-Governance",
      title: "Menschliche Freigabe für KI-Aktionen",
      detail:
        "KI führt keine direkten Aktionen in Finanzen, Zugang oder sensiblen Daten aus; sie erstellt Empfehlungen und Freigabewarteschlangen.",
    },
  },
  ru: {
    "CTL-AUTH-01": {
      area: "Auth",
      owner: "Платформа",
      title: "Контроль профиля роли и сессии",
      detail:
        "В локальной QA-среде можно использовать профили доступа; в production приоритет имеют подтвержденные профили пользователей.",
    },
    "CTL-RBAC-01": {
      area: "RBAC",
      owner: "Безопасность",
      title: "Ролевое меню и матрица прав",
      detail:
        "Права просмотра, создания, одобрения, экспорта и управления четко определены для каждой роли.",
    },
    "CTL-AUD-01": {
      area: "Аудит",
      owner: "Compliance",
      title: "След решений по финансам, доступу и AI",
      detail:
        "Чувствительные решения моделируются с участником, модулем, причиной, риском и временем для прослеживаемости.",
    },
    "CTL-DATA-01": {
      area: "Данные",
      owner: "Данные",
      title: "Готовность изоляции компании/объекта",
      detail:
        "Модель данных подготовлена для безопасных политик доступа по контексту компании, объекта и роли.",
    },
    "CTL-AI-01": {
      area: "AI",
      owner: "AI governance",
      title: "Одобрение человеком для AI-действий",
      detail:
        "AI не выполняет прямые действия с финансами, доступом или чувствительными данными; он создает рекомендации и очереди одобрения.",
    },
  },
} satisfies Record<keyof typeof settingsCopy, Record<string, PlatformControlDisplayCopy>>

function resolveSettingsLocale(locale: string): keyof typeof settingsCopy {
  return locale === "tr" || locale === "de" || locale === "ru" ? locale : "en"
}

function controlVariant(status: PlatformControl["status"]) {
  if (status === "active") return "success"
  if (status === "review") return "warning"
  return "neutral"
}

function controlLabel(status: PlatformControl["status"], copy: (typeof settingsCopy)[keyof typeof settingsCopy]) {
  return copy.controlStatus[status]
}

function controlDisplay(control: PlatformControl, locale: keyof typeof settingsCopy) {
  const localizedControls: Record<string, PlatformControlDisplayCopy> = platformControlDisplayCopy[locale]
  return localizedControls[control.id] ?? {
    area: control.area,
    owner: control.owner,
    title: control.title,
    detail: control.detail,
  }
}

function riskVariant(risk: AuditEvent["risk"]) {
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function riskLabel(risk: AuditEvent["risk"], copy: (typeof settingsCopy)[keyof typeof settingsCopy]) {
  return copy.risk[risk]
}

function integrationVariant(status: IntegrationProviderRecord["status"]) {
  if (status === "connected") return "success"
  if (status === "demo_ready") return "info"
  if (status === "blocked_pending_client") return "warning"
  return "neutral"
}

function integrationLabel(status: IntegrationProviderRecord["status"], copy: (typeof settingsCopy)[keyof typeof settingsCopy]) {
  return copy.integrationStatus[status]
}

function integrationRiskVariant(risk: IntegrationProviderRecord["riskLevel"]) {
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function booleanBadge(value: boolean, copy: (typeof settingsCopy)[keyof typeof settingsCopy]) {
  return <StatusBadge variant={value ? "success" : "neutral"}>{value ? copy.yes : copy.no}</StatusBadge>
}

export default function SettingsPage() {
  const locale = resolveSettingsLocale(useLocale())
  const copy = settingsCopy[locale]
  const summary = getPlatformControlSummary()
  const integrationSummary = getIntegrationSummary()

  const configurationItems = [
    {
      icon: Bell,
      title: copy.configuration[0].title,
      desc: copy.configuration[0].desc,
    },
    {
      icon: Shield,
      title: copy.configuration[1].title,
      desc: copy.configuration[1].desc,
    },
    {
      icon: Globe,
      title: copy.configuration[2].title,
      desc: copy.configuration[2].desc,
      action: <LocaleSwitcher />,
    },
  ]

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
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.controls}</p>
              <p className="text-2xl font-black">{summary.total}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.active}</p>
              <p className="text-2xl font-black">{summary.active}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <FileClock className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.review}</p>
              <p className="text-2xl font-black">{summary.review}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Eye className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.highRisk}</p>
              <p className="text-2xl font-black">{summary.highRiskAuditEvents}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4">
            <h2 className="text-sm font-bold text-card-foreground">{copy.controlsTitle}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{copy.controlsBody}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {platformControls.map((control) => {
              const display = controlDisplay(control, locale)
              return (
                <div key={control.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase text-muted-foreground">{display.area} - {display.owner}</p>
                      <h3 className="mt-1 text-sm font-black text-foreground">{display.title}</h3>
                    </div>
                    <StatusBadge variant={controlVariant(control.status)}>{controlLabel(control.status, copy)}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{display.detail}</p>
                </div>
              )
            })}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.operationsTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.operationsBody}
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
        </div>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-sm font-bold text-card-foreground">{copy.integrationsTitle}</h2>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
              {copy.integrationsBody}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge variant="success">{copy.live} {integrationSummary.liveProviders}</StatusBadge>
            <StatusBadge variant="info">{copy.demo} {integrationSummary.demoReady}</StatusBadge>
            <StatusBadge variant="warning">{copy.waitingClient} {integrationSummary.blockedPendingClient}</StatusBadge>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {integrationProviders.slice(0, 6).map((provider) => (
            <div key={provider.id} className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">{provider.category}</p>
                  <h3 className="mt-1 text-sm font-black text-foreground">{provider.provider}</h3>
                </div>
                <PlugZap className="h-4 w-4 shrink-0 text-primary" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant={integrationVariant(provider.status)}>{integrationLabel(provider.status, copy)}</StatusBadge>
                <StatusBadge variant={integrationRiskVariant(provider.riskLevel)}>{provider.riskLevel}</StatusBadge>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{provider.idealNow}</p>
            </div>
          ))}
        </div>
      </Card3D>

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          data={roleCoverage}
          searchValue={(role) => role.role}
          pageSize={10}
          columns={[
            { key: "role", header: copy.headers.role, sortable: true, render: (role) => role.role },
            { key: "users", header: copy.headers.users, sortable: true, sortValue: (role) => role.users, render: (role) => role.users },
            { key: "finance", header: copy.headers.financeApproval, render: (role) => booleanBadge(role.canApproveFinance, copy) },
            { key: "access", header: copy.headers.accessRestriction, render: (role) => booleanBadge(role.canRestrictAccess, copy) },
            { key: "usersManage", header: copy.headers.users, render: (role) => booleanBadge(role.canManageUsers, copy) },
            { key: "export", header: copy.headers.export, render: (role) => booleanBadge(role.canExportData, copy) },
          ]}
        />

        <DataTable
          data={auditEvents}
          searchValue={(event) => `${event.actor} ${event.action} ${event.module} ${event.decision}`}
          pageSize={10}
          columns={[
            { key: "id", header: copy.headers.audit, sortable: true, render: (event) => event.id },
            { key: "actor", header: copy.headers.actor, render: (event) => event.actor },
            { key: "module", header: copy.headers.module, sortable: true, render: (event) => event.module },
            { key: "risk", header: copy.headers.risk, render: (event) => <StatusBadge variant={riskVariant(event.risk)}>{riskLabel(event.risk, copy)}</StatusBadge> },
            { key: "action", header: copy.headers.action, render: (event) => event.action },
          ]}
        />
      </div>

      <DataTable
        data={integrationProviders}
        searchValue={(provider) =>
          `${provider.id} ${provider.category} ${provider.provider} ${provider.status} ${provider.requiredFromClient} ${provider.fallback}`
        }
        pageSize={10}
        columns={[
          { key: "id", header: "ID", sortable: true, render: (provider) => provider.id },
          { key: "category", header: copy.headers.service, sortable: true, render: (provider) => provider.category },
          { key: "provider", header: copy.headers.provider, render: (provider) => provider.provider },
          { key: "status", header: copy.headers.status, render: (provider) => <StatusBadge variant={integrationVariant(provider.status)}>{integrationLabel(provider.status, copy)}</StatusBadge> },
          { key: "risk", header: copy.headers.risk, render: (provider) => <StatusBadge variant={integrationRiskVariant(provider.riskLevel)}>{copy.risk[provider.riskLevel]}</StatusBadge> },
          { key: "required", header: copy.headers.required, render: (provider) => provider.requiredFromClient },
          { key: "fallback", header: copy.headers.fallback, render: (provider) => provider.fallback },
        ]}
      />

      <Card3D innerClassName="p-5" glow={false}>
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {copy.version}: <span className="font-mono text-foreground">1Çatı ERP v2.5.0</span>
          </p>
        </div>
      </Card3D>
    </div>
  )
}
