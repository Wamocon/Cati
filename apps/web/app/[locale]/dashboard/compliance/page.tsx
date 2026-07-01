"use client"

import { motion } from "framer-motion"
import { ArrowUpRight, BadgeCheck, BarChart3, Car, DoorOpen, FileSearch, KeyRound, LockKeyhole, Network, Scale, ShieldAlert, ShieldCheck } from "lucide-react"
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

function ComplianceCommandScene({
  summary,
}: {
  summary: ReturnType<typeof getAccessSummary>
}) {
  const flow = [
    { label: "Kimlik", detail: "QR, kart, plaka", icon: KeyRound },
    { label: "Finans", detail: "Borç ve depozito", icon: LockKeyhole },
    { label: "Karar", detail: "Geçiş veya kısıt", icon: DoorOpen },
  ]
  const bars = [
    { label: "Kapı", value: 84 },
    { label: "Otopark", value: 63 },
    { label: "Havuz", value: 56 },
    { label: "Asansör", value: 48 },
  ]

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-slate-950 text-white shadow-2xl shadow-primary/[0.14]">
        <div className="absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(255,255,255,.055)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.055)_1px,transparent_1px)] [background-size:46px_46px]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(15,23,42,.94),rgba(6,95,70,.86)_48%,rgba(17,24,39,.95)),radial-gradient(circle_at_72%_18%,rgba(251,191,36,.16),transparent_28%)]" />
        <motion.div
          aria-hidden="true"
          className="absolute left-[12%] top-[20%] h-32 w-[58%] rounded-full border border-dashed border-white/18"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute right-12 top-16 h-24 w-24 rounded-2xl border border-white/15 bg-white/[0.05]"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute bottom-0 left-0 right-0 hidden h-28 items-end gap-2 px-7 opacity-70 sm:flex">
          {[74, 54, 88, 62, 44, 78, 52, 66, 40].map((height, index) => (
            <motion.div
              key={index}
              className="min-w-6 flex-1 rounded-t-lg border border-white/10 bg-white/[0.085]"
              initial={{ height: 12 }}
              animate={{ height }}
              transition={{ delay: index * 0.05, duration: 0.7 }}
            />
          ))}
        </div>
        <div className="relative z-10 flex min-h-[360px] flex-col gap-7 p-5 sm:min-h-[380px] sm:p-6 xl:min-h-[360px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100/70">
                Erişim karar motoru
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl 2xl:text-5xl">
                Kapı, borç, depozito ve kimlik tek karar motorunda
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                Sistem erişim kararını sadece geçiş kartı olarak değil; ödeme, rezervasyon,
                belge ve güvenlik sinyaliyle birlikte değerlendirir.
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <ShieldAlert className="ml-auto h-5 w-5 text-amber-200" />
              <p className="mt-3 text-4xl font-black">{summary.restricted}</p>
              <p className="mt-1 text-xs text-white/65">aktif kısıt</p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {flow.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={item.label}
                  className="min-w-0 rounded-xl border border-white/12 bg-white/[0.08] p-3 backdrop-blur transition-colors hover:bg-white/[0.13] sm:p-4"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + index * 0.08 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-black uppercase text-white/55">
                        0{index + 1}
                      </p>
                      <p className="mt-1 text-sm font-black">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-white/65">{item.detail}</p>
                    </div>
                    <Icon className="hidden h-5 w-5 shrink-0 text-emerald-200 sm:block" />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-4">
        <Card3D glow={false}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-muted-foreground">
                Canlı risk filtresi
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {summary.pending} bekleyen, {summary.critical} kritik karar
              </h2>
            </div>
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 space-y-4">
            {bars.map((bar, index) => (
              <div key={bar.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-bold text-card-foreground">{bar.label}</span>
                  <span className="font-black text-primary">{bar.value}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 via-teal-500 to-amber-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${bar.value}%` }}
                    transition={{ delay: 0.15 + index * 0.07, duration: 0.65 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card3D>

        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-5 w-5 text-primary" />
            <div>
              <h2 className="text-sm font-bold text-card-foreground">Denetim ritmi</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Her geçiş kararı kullanıcı, sebep, saat ve belge referansıyla kayıt altında tutulur.
              </p>
            </div>
          </div>
        </Card3D>
      </div>
    </section>
  )
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

      <ComplianceCommandScene summary={summary} />

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
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-card-foreground">Erişim bölgesi yoğunluğu</h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant="accent">5 bölge</StatusBadge>
              <a
                href="#access-register"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
              >
                Kayıtları aç
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <BarChart
            data={summary.zones.map((zone) => ({ label: zone.label, value: zone.value, color: "var(--primary)" }))}
            ariaLabel="Erişim bölgesi durum grafiği"
            height={230}
            totalLabel="Toplam"
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
              <h2 className="text-sm font-bold text-card-foreground">Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü</h2>
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

      <div id="access-register" className="scroll-mt-24">
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
    </div>
  )
}
