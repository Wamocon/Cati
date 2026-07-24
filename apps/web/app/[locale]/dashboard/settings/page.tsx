"use client"

import type { ReactNode } from "react"
import { Bell, CheckCircle2, Eye, FileClock, Globe, Shield, ShieldCheck, SlidersHorizontal } from "lucide-react"
import { useLocale } from "next-intl"
import { Card3D } from "@/components/3d-card"
import { ComingSoon } from "@/components/coming-soon"
import { DataTable } from "@/components/data-table"
import { FeatureInfo } from "@/components/feature-info"
import { IntegrationHealthPanel } from "@/components/integration-health-panel"
import { StatusBadge } from "@/components/status-badge"
import { LocaleSwitcher } from "@/components/locale-switcher"
import {
  auditEvents,
  getPlatformControlSummary,
  platformControls,
  roleCoverage,
  type AuditEvent,
  type PlatformControl,
} from "@/lib/site-management-data"
import { localizeDashboardTextPart } from "@/lib/operational-copy"

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
    integrationsBody: "Temel platform bağlı ve çalışır durumdadır. Ödeme, banka, SMS, e-posta, erişim, kamera ve OAuth sağlayıcıları müşteri sözleşmeleri ve API anahtarları onaylanana kadar demo/sağlayıcı-hazır modunda kalır.",
    viewOnlyNote: "Bu ekran şu an çoğunlukla görüntüleme içindir. Yalnızca dil tercihi hemen değiştirilebilir; diğer ayarlar yakında açılacaktır.",
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
    integrationsBody: "The core platform is connected and operational. Payment, bank, SMS, email, access, camera and OAuth providers stay in demo/provider-ready mode until client contracts and API keys are approved.",
    viewOnlyNote: "This screen is mostly view-only for now. Only the language preference can be changed today; the other settings are coming soon.",
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
    controlsBody: "Eigentümer, Zweck und Live-Status jeder Kontrolle sind für das Management sichtbar.",
    operationsTitle: "Operationseinstellungen",
    operationsBody: "Administration, Finanzen, Sicherheit und Feldteams sehen Standardregeln im selben Kontrollzentrum.",
    configuration: [
      { title: "Benachrichtigungsregeln", desc: "Rollenbasierte Warnungen für Schulden, SLA, Check-in, Check-out und fehlende Dokumente." },
      { title: "Sicherheitsrichtlinie", desc: "Rollenbasierter Zugriff, sensible Finanzaktionen und KI-Entscheidungen mit menschlicher Freigabe." },
      { title: "Sprache und Lokalisierung", desc: "Türkische Hauptoperationen, mehrsprachige Bewohnerunterstützung und formaler Tonstandard." },
    ],
    integrationsTitle: "Phase-13-Integrationsbereitschaft",
    integrationsBody: "Die Kernplattform ist angebunden und betriebsbereit. Zahlungs-, Bank-, SMS-, E-Mail-, Zugangs-, Kamera- und OAuth-Anbieter bleiben im Demo-/anbieterbereiten Modus, bis Verträge und API-Schlüssel freigegeben sind.",
    viewOnlyNote: "Dieser Bildschirm dient derzeit überwiegend zur Ansicht. Nur die Sprachauswahl lässt sich schon ändern; die übrigen Einstellungen folgen bald.",
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
      service: "Dienst",
      provider: "Anbieter",
      status: "Status",
      required: "Vom Kunden benötigt",
      fallback: "Rückfalloption",
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
    integrationsBody: "Базовая платформа подключена и работает. Провайдеры оплат, банка, SMS, e-mail, доступа, камер и OAuth остаются в demo/provider-ready режиме до одобрения договоров и API-ключей клиентом.",
    viewOnlyNote: "Пока этот экран в основном предназначен для просмотра. Сейчас можно изменить только язык; остальные настройки появятся скоро.",
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
      area: "Giriş",
      owner: "Sistem",
      title: "Giriş ve rol erişimi",
      detail:
        "Her kişi kendi rolüyle giriş yapar ve yalnızca yetkili olduğu bilgileri görür.",
    },
    "CTL-RBAC-01": {
      area: "Erişim",
      owner: "Güvenlik",
      title: "Kim neyi görebilir ve yapabilir",
      detail:
        "Her rol için görüntüleme, ekleme, onaylama, dışa aktarma ve yönetim hakları açıkça belirlenir.",
    },
    "CTL-AUD-01": {
      area: "Kayıt",
      owner: "Uyum",
      title: "Önemli kararların kaydı",
      detail:
        "Finans, erişim ve yapay zekâ ile ilgili önemli kararlar; kim, ne zaman ve neden bilgisiyle kayıt altına alınır.",
    },
    "CTL-DATA-01": {
      area: "Veri",
      owner: "Veri",
      title: "Her firmanın ve sitenin verisini ayrı tutma",
      detail:
        "Her firmanın ve sitenin bilgileri birbirinden ayrı ve güvenli kalacak şekilde düzenlenir.",
    },
    "CTL-AI-01": {
      area: "Yapay zekâ",
      owner: "Yönetim",
      title: "Yapay zekâ işlemlerinde insan onayı",
      detail:
        "Yapay zekâ finans, erişim veya hassas verilerde doğrudan işlem yapmaz; yalnızca öneri sunar ve bir kişi onaylar.",
    },
  },
  en: {
    "CTL-AUTH-01": {
      area: "Sign-in",
      owner: "System",
      title: "Sign-in and role access",
      detail:
        "Each person signs in with their own role and sees only the information they are allowed to.",
    },
    "CTL-RBAC-01": {
      area: "Access",
      owner: "Security",
      title: "Who can see and do what",
      detail:
        "Viewing, adding, approving, exporting and managing rights are set clearly for every role.",
    },
    "CTL-AUD-01": {
      area: "Records",
      owner: "Compliance",
      title: "Record of important decisions",
      detail:
        "Important finance, access and AI decisions are recorded with who acted, when and why.",
    },
    "CTL-DATA-01": {
      area: "Data",
      owner: "Data",
      title: "Keeping each company and site's data separate",
      detail:
        "Each company's and site's information is organized to stay separate from the others and secure.",
    },
    "CTL-AI-01": {
      area: "AI",
      owner: "Management",
      title: "Human approval for AI actions",
      detail:
        "AI never acts directly on finance, access or sensitive data; it only suggests, and a person approves.",
    },
  },
  de: {
    "CTL-AUTH-01": {
      area: "Anmeldung",
      owner: "System",
      title: "Anmeldung und Rollenzugriff",
      detail:
        "Jede Person meldet sich mit der eigenen Rolle an und sieht nur die freigegebenen Informationen.",
    },
    "CTL-RBAC-01": {
      area: "Zugriff",
      owner: "Sicherheit",
      title: "Wer was sehen und tun darf",
      detail:
        "Ansehen, Hinzufügen, Freigeben, Exportieren und Verwalten sind für jede Rolle klar festgelegt.",
    },
    "CTL-AUD-01": {
      area: "Protokoll",
      owner: "Compliance",
      title: "Aufzeichnung wichtiger Entscheidungen",
      detail:
        "Wichtige Finanz-, Zugangs- und KI-Entscheidungen werden mit Wer, Wann und Warum festgehalten.",
    },
    "CTL-DATA-01": {
      area: "Daten",
      owner: "Daten",
      title: "Daten jedes Unternehmens und Standorts getrennt halten",
      detail:
        "Die Informationen jedes Unternehmens und Standorts sind so organisiert, dass sie getrennt und sicher bleiben.",
    },
    "CTL-AI-01": {
      area: "KI",
      owner: "Leitung",
      title: "Menschliche Freigabe für KI-Aktionen",
      detail:
        "Die KI handelt nie direkt bei Finanzen, Zugang oder sensiblen Daten; sie schlägt nur vor, und ein Mensch gibt frei.",
    },
  },
  ru: {
    "CTL-AUTH-01": {
      area: "Вход",
      owner: "Система",
      title: "Вход и доступ по ролям",
      detail:
        "Каждый входит под своей ролью и видит только разрешённую ему информацию.",
    },
    "CTL-RBAC-01": {
      area: "Доступ",
      owner: "Безопасность",
      title: "Кто что может видеть и делать",
      detail:
        "Права на просмотр, добавление, одобрение, экспорт и управление чётко заданы для каждой роли.",
    },
    "CTL-AUD-01": {
      area: "Записи",
      owner: "Комплаенс",
      title: "Запись важных решений",
      detail:
        "Важные решения по финансам, доступу и ИИ фиксируются: кто, когда и почему.",
    },
    "CTL-DATA-01": {
      area: "Данные",
      owner: "Данные",
      title: "Раздельное хранение данных каждой компании и объекта",
      detail:
        "Информация каждой компании и объекта организована так, чтобы оставаться отдельной и защищённой.",
    },
    "CTL-AI-01": {
      area: "ИИ",
      owner: "Руководство",
      title: "Одобрение человеком действий ИИ",
      detail:
        "ИИ никогда не действует напрямую с финансами, доступом или чувствительными данными; он только предлагает, а решение принимает человек.",
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

function booleanBadge(value: boolean, copy: (typeof settingsCopy)[keyof typeof settingsCopy]) {
  return <StatusBadge variant={value ? "success" : "neutral"}>{value ? copy.yes : copy.no}</StatusBadge>
}

export default function SettingsPage() {
  const rawLocale = useLocale()
  const locale = resolveSettingsLocale(rawLocale)
  const copy = settingsCopy[locale]
  const localizeValue = (value: string) =>
    localizeDashboardTextPart(value, locale)
  const summary = getPlatformControlSummary()

  const configurationItems: Array<{
    icon: typeof Bell
    title: string
    desc: string
    action?: ReactNode
    comingSoonKey?: string
  }> = [
    {
      icon: Bell,
      title: copy.configuration[0].title,
      desc: copy.configuration[0].desc,
      comingSoonKey: "settings_notification_rules",
    },
    {
      icon: Shield,
      title: copy.configuration[1].title,
      desc: copy.configuration[1].desc,
      comingSoonKey: "settings_security_policy",
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
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
          <FeatureInfo featureKey="settings" side="bottom" />
        </div>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {copy.subtitle}
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs font-semibold text-muted-foreground">
          <Eye className="h-4 w-4 shrink-0" />
          {copy.viewOnlyNote}
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
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-card-foreground">{item.title}</h3>
                      {item.comingSoonKey ? (
                        <ComingSoon featureKey={item.comingSoonKey} variant="inline" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                {item.action ?? null}
              </div>
            </Card3D>
          ))}
        </div>
      </div>

      <IntegrationHealthPanel />

      <div className="grid gap-6 xl:grid-cols-2">
        <DataTable
          data={roleCoverage}
          searchValue={(role) => role.role}
          pageSize={10}
          columns={[
            { key: "role", header: copy.headers.role, sortable: true, render: (role) => localizeValue(role.role) },
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
            { key: "actor", header: copy.headers.actor, render: (event) => localizeValue(event.actor) },
            { key: "module", header: copy.headers.module, sortable: true, render: (event) => localizeValue(event.module) },
            { key: "risk", header: copy.headers.risk, render: (event) => <StatusBadge variant={riskVariant(event.risk)}>{riskLabel(event.risk, copy)}</StatusBadge> },
            { key: "action", header: copy.headers.action, render: (event) => localizeValue(event.action) },
          ]}
        />
      </div>

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
