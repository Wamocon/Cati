"use client"

import { useTranslations } from "next-intl"
import { FileText, Download, Eye } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { StatusBadge } from "@/components/status-badge"

const docs = [
  { name: "TAPU_Tarama_Villa4021.pdf", type: "tapu", size: "2.4 MB", updated: "18.06.2026" },
  { name: "DASK_Policy_Daire1847.pdf", type: "insurance", size: "1.1 MB", updated: "17.06.2026" },
  { name: "Komisyon_Sozlesmesi_Pent990.pdf", type: "contract", size: "890 KB", updated: "16.06.2026" },
  { name: "EIDS_Yetki_Belgesi_Villa4021.pdf", type: "eids", size: "340 KB", updated: "15.06.2026" },
  { name: "Pasaport_Kopyasi_Annak.pdf", type: "identity", size: "1.8 MB", updated: "14.06.2026" },
]

export default function DocumentsPage() {
  const t = useTranslations("dashboardModules.documents")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t("stats.total"), value: docs.length },
          { label: t("stats.tapu"), value: 1 },
          { label: t("stats.contracts"), value: 2 },
          { label: t("stats.eids"), value: 1 },
        ].map((s) => (
          <Card3D key={s.label}>
            <p className="text-xs text-muted-foreground uppercase">{s.label}</p>
            <p className="text-2xl font-black">{s.value}</p>
          </Card3D>
        ))}
      </div>

      <div className="grid gap-3">
        {docs.map((doc, i) => (
          <Card3D key={i} innerClassName="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.size} • {doc.updated}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge variant="info">{t(`types.${doc.type}`)}</StatusBadge>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  <Eye className="h-4 w-4" />
                </button>
                <button className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </Card3D>
        ))}
      </div>
    </div>
  )
}
