"use client"

import { BadgeCheck, Car, DoorOpen, FileSearch, KeyRound, LockKeyhole, Scale, ShieldAlert, ShieldCheck } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  accessControlRecords,
  accessLabels,
  buyerEligibility,
  getAccessSummary,
  getEligibilitySummary,
  type AccessControlRecord,
  type AccessStatus,
  type EligibilityStatus,
} from "@/lib/site-management-data"

function statusVariant(status: AccessStatus) {
  if (status === "active") return "success"
  if (status === "restricted") return "danger"
  if (status === "pending") return "warning"
  return "neutral"
}

function riskVariant(risk: AccessControlRecord["riskLevel"]) {
  if (risk === "critical") return "danger"
  if (risk === "high") return "danger"
  if (risk === "medium") return "warning"
  return "success"
}

function riskLabel(risk: AccessControlRecord["riskLevel"]) {
  if (risk === "critical") return "Kritik"
  if (risk === "high") return "Yüksek"
  if (risk === "medium") return "Orta"
  return "Düşük"
}

function eligibilityVariant(status: EligibilityStatus) {
  if (status === "qualified") return "success"
  if (status === "review_required" || status === "partner_review") return "warning"
  return "danger"
}

function eligibilityLabel(status: EligibilityStatus) {
  if (status === "qualified") return "Uygun"
  if (status === "review_required") return "Kontrol gerekli"
  if (status === "partner_review") return "Partner incelemesi"
  return "Blokeli"
}

export default function CompliancePage() {
  const summary = getAccessSummary()
  const eligibilitySummary = getEligibilitySummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">Erişim & Uyum</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          Mobil kod, kart, plaka, QR, borç kısıtı, depozito kontrolü ve güvenlik olaylarını tek karar motorunda izleyin.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Takipteki kayıt</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Kısıtlı</p>
              <AnimatedCounter value={summary.restricted} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Bekleyen</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">Kritik risk</p>
              <AnimatedCounter value={summary.critical} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Erişim bölgesi yoğunluğu</h2>
            <StatusBadge variant="accent">5 bölge</StatusBadge>
          </div>
          <BarChart
            data={summary.zones.map((zone) => ({ label: zone.label, value: zone.value, color: "var(--primary)" }))}
            height={230}
          />
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <DoorOpen className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Kapı karar motoru</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Borç, rezervasyon, depozito ve kimlik kontrolü tamamlanmadan geçici erişim açılmaz.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Car className="mt-0.5 h-5 w-5 text-amber-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Plaka ve otopark</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Otopark, misafir ve sakin erişimleri aynı uyum kayıtlarına bağlanır.
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-5 w-5 text-teal-600" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">Audit trail</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Her erişim kararı kullanıcı, sebep, saat ve belge referansıyla denetlenebilir tutulur.
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">Phase 9 - Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Satış ekibi uygunluk ön kontrolünü görür; sistem hukuki garanti vermez ve riskli durumları partner incelemesine gönderir.
            </p>
          </div>
          <StatusBadge variant={eligibilitySummary.blocked > 0 ? "danger" : "success"}>
            {eligibilitySummary.review} inceleme kuyruğu
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Alıcı dosyası</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ön uygun</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.qualified}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Ekspertiz gerekli</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.appraisalRequired}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Blokeli</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.blocked}</p>
          </div>
        </div>
        <DataTable
          data={buyerEligibility}
          pageSize={6}
          searchValue={(record) => `${record.id} ${record.buyerName} ${record.nationality} ${record.buyerGoal} ${record.targetUnit} ${record.nextAction}`}
          columns={[
            { key: "id", header: "Kontrol", sortable: true, render: (record) => record.id },
            { key: "buyer", header: "Alıcı", render: (record) => record.buyerName },
            { key: "goal", header: "Hedef", sortable: true, render: (record) => record.buyerGoal },
            {
              key: "budget",
              header: "Bütçe",
              sortable: true,
              sortValue: (record) => record.declaredBudgetEur,
              render: (record) => `${record.declaredBudgetEur.toLocaleString("de-DE")} €`,
            },
            { key: "district", header: "Bölge", render: (record) => record.districtCheck },
            {
              key: "appraisal",
              header: "Ekspertiz",
              render: (record) => (
                <span className="inline-flex items-center gap-1">
                  <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
                  {record.appraisalRequired ? "Gerekli" : "Gerekmez"}
                </span>
              ),
            },
            {
              key: "status",
              header: "Durum",
              render: (record) => <StatusBadge variant={eligibilityVariant(record.status)}>{eligibilityLabel(record.status)}</StatusBadge>,
            },
            { key: "next", header: "Sonraki aksiyon", render: (record) => record.nextAction },
          ]}
        />
      </Card3D>

      <DataTable
        data={accessControlRecords}
        searchValue={(record) => `${record.flatNumber} ${record.residentName} ${record.zone} ${record.credential} ${record.reason}`}
        columns={[
          { key: "flat", header: "Daire", sortable: true, render: (record) => record.flatNumber },
          { key: "resident", header: "Sakin", render: (record) => record.residentName },
          { key: "zone", header: "Bölge", sortable: true, render: (record) => record.zone },
          { key: "credential", header: "Kimlik", sortable: true, render: (record) => record.credential },
          {
            key: "status",
            header: "Erişim",
            render: (record) => <StatusBadge variant={statusVariant(record.status)}>{accessLabels[record.status]}</StatusBadge>,
          },
          {
            key: "risk",
            header: "Risk",
            sortable: true,
            sortValue: (record) => record.riskLevel,
            render: (record) => <StatusBadge variant={riskVariant(record.riskLevel)}>{riskLabel(record.riskLevel)}</StatusBadge>,
          },
          { key: "reason", header: "Sebep", render: (record) => record.reason },
        ]}
      />
    </div>
  )
}
