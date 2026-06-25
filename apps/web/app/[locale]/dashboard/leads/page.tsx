"use client"

import { Languages, MessageCircle, PhoneCall, ShieldAlert, Users, WalletCards } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  accessLabels,
  formatTry,
  getResidentSummary,
  residents,
  type AccessStatus,
  type ResidentRecord,
} from "@/lib/site-management-data"
import { clientProfile } from "@/lib/client-context"

function relationLabel(relation: ResidentRecord["relation"]) {
  if (relation === "owner") return "Malik"
  if (relation === "tenant") return "Kiracı"
  return "Misafir"
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

function riskVariant(score: number) {
  if (score >= 80) return "danger"
  if (score >= 55) return "warning"
  if (score >= 30) return "info"
  return "success"
}

export default function LeadsPage() {
  const summary = getResidentSummary()
  const highRisk = residents.filter((resident) => resident.riskScore >= 55).slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Müşteri & Malik CRM</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {clientProfile.clientName} için alıcı, malik, kiracı ve misafirleri; dil, WhatsApp/telefon tercihi, borç,
          servis, erişim ve yatırım ilgisiyle tek kayıt altında yönetin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Aktif sakin</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Riskli kayıt</p>
              <AnimatedCounter value={summary.highRisk} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MessageCircle className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">WhatsApp tercih</p>
              <AnimatedCounter value={summary.whatsapp} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Languages className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Çok dilli destek</p>
              <p className="text-2xl font-black">TR/EN/DE/RU</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card3D className="lg:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">AI iletişim önceliği</h2>
            <StatusBadge variant="danger">{highRisk.length} aksiyon</StatusBadge>
          </div>
          <div className="space-y-3">
            {highRisk.map((resident) => (
              <div key={resident.id} className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={relationVariant(resident.relation)}>{relationLabel(resident.relation)}</StatusBadge>
                      <StatusBadge variant={accessVariant(resident.accessStatus)}>{accessLabels[resident.accessStatus]}</StatusBadge>
                      <StatusBadge variant={riskVariant(resident.riskScore)}>Risk {resident.riskScore}</StatusBadge>
                    </div>
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {resident.flatNumber} - {resident.name}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {resident.communicationPreference} - {resident.phone} - {resident.language.toUpperCase()}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">{formatTry(resident.balanceTry)}</p>
                    <p className="text-xs text-muted-foreground">{resident.serviceOpen} servis</p>
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
                <h2 className="text-sm font-bold text-card-foreground">İletişim merkezi</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  WhatsApp, telefon, e-posta ve portal bildirimleri tek sakin profiline bağlanır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <WalletCards className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Borç + servis bağlamı</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sakin temsilcisi aramadan önce açık borç, erişim kısıtı ve servis geçmişini görür.
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
          { key: "flat", header: "Daire", sortable: true, render: (resident) => resident.flatNumber },
          { key: "name", header: "Ad", sortable: true, render: (resident) => resident.name },
          {
            key: "relation",
            header: "Tip",
            render: (resident) => <StatusBadge variant={relationVariant(resident.relation)}>{relationLabel(resident.relation)}</StatusBadge>,
          },
          { key: "language", header: "Dil", sortable: true, render: (resident) => resident.language.toUpperCase() },
          { key: "phone", header: "Telefon", render: (resident) => resident.phone },
          {
            key: "balance",
            header: "Borç",
            sortable: true,
            sortValue: (resident) => resident.balanceTry,
            render: (resident) => formatTry(resident.balanceTry),
          },
          {
            key: "access",
            header: "Erişim",
            render: (resident) => <StatusBadge variant={accessVariant(resident.accessStatus)}>{accessLabels[resident.accessStatus]}</StatusBadge>,
          },
          {
            key: "risk",
            header: "Risk",
            sortable: true,
            sortValue: (resident) => resident.riskScore,
            render: (resident) => <StatusBadge variant={riskVariant(resident.riskScore)}>{resident.riskScore}</StatusBadge>,
          },
        ]}
      />
    </div>
  )
}
