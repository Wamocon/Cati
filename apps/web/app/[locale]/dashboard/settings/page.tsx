"use client"

import { useTranslations } from "next-intl"
import { Settings, Bell, Shield, Globe, Palette } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { ThemeToggle } from "@/components/theme-toggle"

export default function SettingsPage() {
  const t = useTranslations("dashboardModules.settings")

  const items = [
    { icon: Bell, title: t("notifications.title"), desc: t("notifications.desc") },
    { icon: Shield, title: t("security.title"), desc: t("security.desc") },
    { icon: Globe, title: t("language.title"), desc: t("language.desc") },
    { icon: Palette, title: t("appearance.title"), desc: t("appearance.desc"), action: <ThemeToggle /> },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4">
        {items.map((item) => (
          <Card3D key={item.title} innerClassName="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <item.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
              {item.action || (
                <button className="rounded-full border border-border bg-muted px-4 py-1.5 text-xs font-medium text-foreground hover:bg-muted/80">
                  {t("configure")}
                </button>
              )}
            </div>
          </Card3D>
        ))}
      </div>

      <Card3D innerClassName="p-5">
        <div className="flex items-center gap-3">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t("version")}: <span className="font-mono text-foreground">1Çatı v2.1.0-demo</span></p>
        </div>
      </Card3D>
    </div>
  )
}
