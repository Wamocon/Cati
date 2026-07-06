"use client"

import { useLocale } from "next-intl"
import { Languages, MessageCircle, PhoneCall, ShieldAlert, Users, WalletCards } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  formatTry,
  getResidentSummary,
  residents,
  type AccessStatus,
  type ResidentRecord,
} from "@/lib/site-management-data"
import { clientProfile } from "@/lib/client-context"
import { resolveDashboardLocale } from "@/lib/operational-copy"
import type { DashboardLocale } from "@/lib/unit-matrix-copy"

type LeadsCopy = {
  title: string
  description: string
  metrics: {
    activeResidents: string
    riskRecords: string
    whatsappPreference: string
    multilingualSupport: string
  }
  aiPriority: string
  actions: string
  serviceOpen: string
  risk: string
  communicationCenter: {
    title: string
    description: string
  }
  debtContext: {
    title: string
    description: string
  }
  placeholders: {
    residentPending: string
    ownerPending: string
    sourcePending: string
  }
  columns: {
    unit: string
    name: string
    type: string
    language: string
    phone: string
    debt: string
    access: string
    risk: string
  }
  relations: Record<ResidentRecord["relation"], string>
  communicationPreferences: Record<ResidentRecord["communicationPreference"], string>
}

const leadsCopy: Record<DashboardLocale, LeadsCopy> = {
  tr: {
    title: "Müşteri & Malik CRM",
    description:
      "{clientName} için alıcı, malik, kiracı ve misafirleri; dil, WhatsApp/telefon tercihi, borç, servis, erişim ve yatırım ilgisiyle tek kayıt altında yönetin.",
    metrics: {
      activeResidents: "Aktif sakin",
      riskRecords: "Riskli kayıt",
      whatsappPreference: "WhatsApp tercih",
      multilingualSupport: "Çok dilli destek",
    },
    aiPriority: "AI iletişim önceliği",
    actions: "aksiyon",
    serviceOpen: "servis",
    risk: "Risk",
    communicationCenter: {
      title: "İletişim merkezi",
      description: "WhatsApp, telefon, e-posta ve portal bildirimleri tek sakin profiline bağlanır.",
    },
    debtContext: {
      title: "Borç + servis bağlamı",
      description:
        "Sakin temsilcisi aramadan önce açık borç, erişim kısıtı ve servis geçmişini görür.",
    },
    placeholders: {
      residentPending: "Sakin kaydı bekliyor",
      ownerPending: "Malik kaydı bekliyor",
      sourcePending: "Kaynak bekliyor",
    },
    columns: {
      unit: "Daire",
      name: "Ad",
      type: "Tip",
      language: "Dil",
      phone: "Telefon",
      debt: "Borç",
      access: "Erişim",
      risk: "Risk",
    },
    relations: {
      owner: "Malik",
      tenant: "Kiracı",
      guest: "Misafir",
    },
    communicationPreferences: {
      WhatsApp: "WhatsApp",
      Telefon: "Telefon",
      "E-posta": "E-posta",
      Portal: "Portal",
    },
  },
  en: {
    title: "Customer & Owner CRM",
    description:
      "Manage buyers, owners, tenants and guests for {clientName} in one CRM record with language, WhatsApp/phone preference, debt, service, access and investment signals.",
    metrics: {
      activeResidents: "Active residents",
      riskRecords: "Risk records",
      whatsappPreference: "WhatsApp preference",
      multilingualSupport: "Multilingual support",
    },
    aiPriority: "AI communication priority",
    actions: "actions",
    serviceOpen: "services",
    risk: "Risk",
    communicationCenter: {
      title: "Communication center",
      description: "WhatsApp, phone, email and portal notifications are linked to one resident profile.",
    },
    debtContext: {
      title: "Debt and service context",
      description:
        "Before calling, the resident team sees open debt, access restrictions and service history.",
    },
    placeholders: {
      residentPending: "Resident record pending",
      ownerPending: "Owner record pending",
      sourcePending: "Source pending",
    },
    columns: {
      unit: "Unit",
      name: "Name",
      type: "Type",
      language: "Language",
      phone: "Phone",
      debt: "Debt",
      access: "Access",
      risk: "Risk",
    },
    relations: {
      owner: "Owner",
      tenant: "Tenant",
      guest: "Guest",
    },
    communicationPreferences: {
      WhatsApp: "WhatsApp",
      Telefon: "Phone",
      "E-posta": "Email",
      Portal: "Portal",
    },
  },
  de: {
    title: "Kunden- & Eigentümer-CRM",
    description:
      "Verwalten Sie Käufer, Eigentümer, Mieter und Gäste für {clientName} in einem CRM-Datensatz mit Sprache, WhatsApp-/Telefonpräferenz, Saldo, Service, Zugang und Investmentinteresse.",
    metrics: {
      activeResidents: "Aktive Bewohner",
      riskRecords: "Risikodatensätze",
      whatsappPreference: "WhatsApp-Präferenz",
      multilingualSupport: "Mehrsprachige Betreuung",
    },
    aiPriority: "KI-Kommunikationspriorität",
    actions: "Aktionen",
    serviceOpen: "Services",
    risk: "Risiko",
    communicationCenter: {
      title: "Kommunikationszentrum",
      description: "WhatsApp, Telefon, E-Mail und Portalhinweise sind mit einem Bewohnerprofil verknüpft.",
    },
    debtContext: {
      title: "Saldo- und Servicekontext",
      description:
        "Vor dem Anruf sieht das Team offene Salden, Zugangsbeschränkungen und die Servicehistorie.",
    },
    placeholders: {
      residentPending: "Bewohnerdatensatz ausstehend",
      ownerPending: "Eigentümerdatensatz ausstehend",
      sourcePending: "Quelle ausstehend",
    },
    columns: {
      unit: "Einheit",
      name: "Name",
      type: "Typ",
      language: "Sprache",
      phone: "Telefon",
      debt: "Saldo",
      access: "Zugang",
      risk: "Risiko",
    },
    relations: {
      owner: "Eigentümer",
      tenant: "Mieter",
      guest: "Gast",
    },
    communicationPreferences: {
      WhatsApp: "WhatsApp",
      Telefon: "Telefon",
      "E-posta": "E-Mail",
      Portal: "Portal",
    },
  },
  ru: {
    title: "CRM клиентов и владельцев",
    description:
      "Управляйте покупателями, владельцами, арендаторами и гостями {clientName} в одной CRM-карточке: язык, WhatsApp/телефон, задолженность, сервис, доступ и инвестиционный интерес.",
    metrics: {
      activeResidents: "Активные жители",
      riskRecords: "Рискованные записи",
      whatsappPreference: "Предпочтение WhatsApp",
      multilingualSupport: "Многоязычная поддержка",
    },
    aiPriority: "Приоритет связи от AI",
    actions: "действий",
    serviceOpen: "сервисных заявок",
    risk: "Риск",
    communicationCenter: {
      title: "Центр коммуникаций",
      description: "WhatsApp, телефон, email и уведомления портала связаны с одним профилем жителя.",
    },
    debtContext: {
      title: "Контекст долга и сервиса",
      description:
        "Перед звонком команда видит открытый долг, ограничения доступа и историю сервиса.",
    },
    placeholders: {
      residentPending: "Запись жителя ожидает данных",
      ownerPending: "Запись владельца ожидает данных",
      sourcePending: "Источник ожидает данных",
    },
    columns: {
      unit: "Объект",
      name: "Имя",
      type: "Тип",
      language: "Язык",
      phone: "Телефон",
      debt: "Долг",
      access: "Доступ",
      risk: "Риск",
    },
    relations: {
      owner: "Владелец",
      tenant: "Арендатор",
      guest: "Гость",
    },
    communicationPreferences: {
      WhatsApp: "WhatsApp",
      Telefon: "Телефон",
      "E-posta": "Email",
      Portal: "Портал",
    },
  },
}

function relationLabel(relation: ResidentRecord["relation"], copy: LeadsCopy) {
  return copy.relations[relation]
}

function relationVariant(relation: ResidentRecord["relation"]) {
  if (relation === "owner") return "success"
  if (relation === "tenant") return "info"
  return "accent"
}

function accessVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "restricted") return "danger"
  if (status === "pending") return "warning"
  return "neutral"
}

function localizeResidentValue(value: string, copy: LeadsCopy) {
  if (value === "Sakin kaydı bekliyor") return copy.placeholders.residentPending
  if (value === "Malik kaydı bekliyor") return copy.placeholders.ownerPending
  if (value === "Kaynak bekliyor") return copy.placeholders.sourcePending
  return value
}

function riskVariant(score: number) {
  if (score >= 80) return "danger"
  if (score >= 55) return "warning"
  if (score >= 30) return "info"
  return "success"
}

export default function LeadsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = leadsCopy[locale]
  const summary = getResidentSummary()
  const highRisk = residents.filter((resident) => resident.riskScore >= 55).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {copy.description.replace("{clientName}", clientProfile.clientName)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.activeResidents}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.riskRecords}</p>
              <AnimatedCounter value={summary.highRisk} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.whatsappPreference}</p>
              <AnimatedCounter value={summary.whatsapp} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Languages className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.multilingualSupport}</p>
              <p className="text-2xl font-black">TR/EN/DE/RU</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{copy.aiPriority}</h2>
            <StatusBadge variant="danger">{highRisk.length} {copy.actions}</StatusBadge>
          </div>
          <div className="space-y-3">
            {highRisk.map((resident) => (
              <div key={resident.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={relationVariant(resident.relation)}>{relationLabel(resident.relation, copy)}</StatusBadge>
                      <StatusBadge variant={accessVariant(resident.accessStatus)}>{resident.accessStatus}</StatusBadge>
                      <StatusBadge variant={riskVariant(resident.riskScore)}>{copy.risk} {resident.riskScore}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {resident.flatNumber} - {localizeResidentValue(resident.name, copy)}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {copy.communicationPreferences[resident.communicationPreference]} - {localizeResidentValue(resident.phone, copy)} - {resident.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">{formatTry(resident.balanceTry)}</p>
                    <p className="text-xs text-muted-foreground">{resident.serviceOpen} {copy.serviceOpen}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <PhoneCall className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.communicationCenter.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.communicationCenter.description}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.debtContext.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.debtContext.description}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={residents}
        searchValue={(resident) => `${resident.name} ${resident.flatNumber} ${resident.phone} ${resident.email}`}
        columns={[
          { key: "flat", header: copy.columns.unit, sortable: true, render: (resident) => resident.flatNumber },
          { key: "name", header: copy.columns.name, sortable: true, render: (resident) => localizeResidentValue(resident.name, copy) },
          {
            key: "relation",
            header: copy.columns.type,
            render: (resident) => <StatusBadge variant={relationVariant(resident.relation)}>{relationLabel(resident.relation, copy)}</StatusBadge>,
          },
          { key: "language", header: copy.columns.language, sortable: true, render: (resident) => resident.language.toUpperCase() },
          { key: "phone", header: copy.columns.phone, render: (resident) => localizeResidentValue(resident.phone, copy) },
          {
            key: "balance",
            header: copy.columns.debt,
            sortable: true,
            sortValue: (resident) => resident.balanceTry,
            render: (resident) => formatTry(resident.balanceTry),
          },
          {
            key: "access",
            header: copy.columns.access,
            render: (resident) => <StatusBadge variant={accessVariant(resident.accessStatus)}>{resident.accessStatus}</StatusBadge>,
          },
          {
            key: "risk",
            header: copy.columns.risk,
            sortable: true,
            sortValue: (resident) => resident.riskScore,
            render: (resident) => <StatusBadge variant={riskVariant(resident.riskScore)}>{resident.riskScore}</StatusBadge>,
          },
        ]}
      />
    </div>
  )
}
