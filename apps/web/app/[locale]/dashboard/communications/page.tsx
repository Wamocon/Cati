"use client"

import { useLocale } from "next-intl"
import { BellRing, Mail, MessageSquareText, Send, Smartphone, Users } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionButton } from "@/components/dashboard-action-button"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { isClientRole, isFieldRole } from "@/lib/role-scoped-views"
import { localizeBusinessCopy, resolveDashboardLocale } from "@/lib/business-copy"
import { priorityLabels, type ServicePriority } from "@/lib/site-management-data"
import type { Role } from "@/lib/rbac"

const conversations = [
  {
    id: "COM-301",
    channel: "WhatsApp",
    audience: "Malik",
    subject: "Aidat borcu ve erişim uyarısı",
    owner: "Muhasebe",
    status: "needs_reply",
    priority: "high",
    lastMessage: "Ödeme planı bugün onay bekliyor.",
  },
  {
    id: "COM-302",
    channel: "Portal",
    audience: "Kiracı",
    subject: "Klima servis randevusu",
    owner: "Personel",
    status: "in_progress",
    priority: "medium",
    lastMessage: "Teknisyen fotoğraf raporu ekleyecek.",
  },
  {
    id: "COM-303",
    channel: "Ekip",
    audience: "Operasyon",
    subject: "Bugünkü check-out ve depozito kontrolü",
    owner: "Sahip",
    status: "ready",
    priority: "high",
    lastMessage: "Temizlik, hasar ve iade kontrolü aynı akışta.",
  },
  {
    id: "COM-304",
    channel: "E-posta",
    audience: "Malik",
    subject: "Aylık finans raporu hazır",
    owner: "Muhasebe",
    status: "ready",
    priority: "low",
    lastMessage: "Rapor sadece ilgili malik için paylaşılacak.",
  },
]

const notificationRules = [
  { id: "NTF-01", trigger: "Borç > 0", target: "Malik/Kiracı", channel: "WhatsApp + E-posta", owner: "Muhasebe" },
  { id: "NTF-02", trigger: "SLA < 4 saat", target: "Personel + Sahip", channel: "Push + Ekip", owner: "Sahip" },
  { id: "NTF-03", trigger: "Check-in bugün", target: "Kiracı/Misafir", channel: "Push + SMS", owner: "Operasyon" },
  { id: "NTF-04", trigger: "Belge eksik", target: "Malik", channel: "Portal + E-posta", owner: "Yönetim" },
]

type Conversation = (typeof conversations)[number]
type NotificationRule = (typeof notificationRules)[number]

function visibleConversationsForRole(role: Role) {
  if (role === "owner") {
    return conversations.filter((item) => item.audience === "Malik")
  }

  if (role === "tenant") {
    return conversations.filter((item) => item.audience === "Kiracı")
  }

  if (role === "staff") {
    return conversations.filter((item) => item.audience === "Operasyon" || item.owner === "Personel")
  }

  if (role === "accountant") {
    return conversations.filter((item) => item.audience === "Malik" || item.owner === "Muhasebe")
  }

  return conversations
}

function visibleNotificationRulesForRole(role: Role) {
  if (role === "owner") {
    return notificationRules.filter((item) => item.target.includes("Malik"))
  }

  if (role === "tenant") {
    return notificationRules.filter((item) => item.target.includes("Kiracı"))
  }

  if (role === "staff") {
    return notificationRules.filter((item) => item.target.includes("Personel") || item.owner === "Operasyon")
  }

  if (role === "accountant") {
    return notificationRules.filter((item) => item.owner === "Muhasebe" || item.target.includes("Malik"))
  }

  return notificationRules
}

function statusVariant(status: string) {
  if (status === "needs_reply") return "danger"
  if (status === "in_progress") return "warning"
  return "success"
}

function statusLabel(status: string, locale: string) {
  if (status === "needs_reply") return localizeBusinessCopy("Cevap gerekli", locale)
  if (status === "in_progress") return localizeBusinessCopy("İşlemde", locale)
  return localizeBusinessCopy("Hazır", locale)
}

function priorityVariant(priority: string) {
  if (priority === "high") return "danger"
  if (priority === "medium") return "warning"
  return "neutral"
}

function targetLabel(target: string, locale: string) {
  return target
    .split(/(\s\+\s|\/)/)
    .map((part) => (part === "/" || part === " + " ? part : localizeBusinessCopy(part, locale)))
    .join("")
}

export default function CommunicationsPage() {
  const locale = resolveDashboardLocale(useLocale())
  const user = useUser()
  const clientView = isClientRole(user.role)
  const fieldView = isFieldRole(user.role)
  const visibleConversations = visibleConversationsForRole(user.role)
  const visibleRules = visibleNotificationRulesForRole(user.role)
  const urgent = visibleConversations.filter((item) => item.priority === "high").length
  const ready = visibleConversations.filter((item) => item.status === "ready").length

  const intro = clientView
    ? localizeBusinessCopy("Portal mesajları, bildirimler ve yönetim yanıtları yalnızca yetkili kaydınız kapsamında gösterilir.", locale)
    : fieldView
      ? localizeBusinessCopy("Saha ekibi için görev mesajları, SLA bildirimleri ve operasyon yanıtları sadeleştirilmiş görünümde tutulur.", locale)
      : localizeBusinessCopy("Yönetim sohbeti, ekip içi koordinasyon, bildirim kuralları ve müşteri cevap takibi tek sayfada yönetilir.", locale)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{localizeBusinessCopy("İletişim Merkezi", locale)}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MessageSquareText className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Açık konuşma", locale)}</p>
              <p className="text-2xl font-black">{visibleConversations.length}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <BellRing className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Acil takip", locale)}</p>
              <p className="text-2xl font-black">{urgent}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Send className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Hazır mesaj", locale)}</p>
              <p className="text-2xl font-black">{ready}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{localizeBusinessCopy("Rol kuralı", locale)}</p>
              <p className="text-2xl font-black">{visibleRules.length}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">
                {clientView ? localizeBusinessCopy("Portal konuşmaları", locale) : localizeBusinessCopy("Müşteri ve ekip konuşmaları", locale)}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {clientView
                  ? localizeBusinessCopy("Kanal, konu, son mesaj ve durum bilgisi yetki kapsamınıza göre filtrelenir.", locale)
                  : localizeBusinessCopy("Her konuşmada kanal, sorumlu ekip, öncelik ve son aksiyon görünür.", locale)}
              </p>
            </div>
            {!clientView && !fieldView && (
              <DashboardActionButton
                actionType="communication.broadcast.prepare"
                ariaLabel={localizeBusinessCopy("Toplu bildirim hazırla", locale)}
                entityTable="communications"
                entityExternalId="broadcast"
                title={localizeBusinessCopy("Toplu bildirim taslağı hazırlandı", locale)}
                successLabel={localizeBusinessCopy("Taslak hazır", locale)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-foreground hover:bg-muted"
              >
                <Send className="h-4 w-4" />
                {localizeBusinessCopy("Toplu bildirim", locale)}
              </DashboardActionButton>
            )}
          </div>

          <DataTable
            data={visibleConversations}
            searchValue={(item) => `${item.id} ${item.channel} ${item.audience} ${item.subject} ${item.owner}`}
            pageSize={10}
            columns={[
              { key: "id", header: localizeBusinessCopy("Kayıt", locale), sortable: true, render: (item) => item.id },
              { key: "channel", header: localizeBusinessCopy("Kanal", locale), sortable: true, render: (item) => localizeBusinessCopy(item.channel, locale) },
              ...(!clientView
                ? [
                    {
                      key: "audience",
                      header: localizeBusinessCopy("Kitle", locale),
                      render: (item: Conversation) => localizeBusinessCopy(item.audience, locale),
                    },
                  ]
                : []),
              { key: "subject", header: localizeBusinessCopy("Konu", locale), render: (item) => localizeBusinessCopy(item.subject, locale) },
              ...(!clientView
                ? [
                    {
                      key: "owner",
                      header: localizeBusinessCopy("Sorumlu", locale),
                      render: (item: Conversation) => localizeBusinessCopy(item.owner, locale),
                    },
                  ]
                : []),
              {
                key: "priority",
                header: localizeBusinessCopy("Öncelik", locale),
                render: (item) => (
                  <StatusBadge variant={priorityVariant(item.priority)}>
                    {localizeBusinessCopy(priorityLabels[item.priority as ServicePriority], locale)}
                  </StatusBadge>
                ),
              },
              {
                key: "status",
                header: localizeBusinessCopy("Durum", locale),
                render: (item) => (
                  <StatusBadge variant={statusVariant(item.status)}>
                    {statusLabel(item.status, locale)}
                  </StatusBadge>
                ),
              },
            ]}
          />
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{localizeBusinessCopy("Bildirim mantığı", locale)}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy("Bildirimler yanlış kişiye gitmeyecek şekilde daire ve rol kapsamıyla sınırlandırılır.", locale)
                    : localizeBusinessCopy("Push, SMS, WhatsApp ve e-posta aynı olaydan tetiklenebilir; hassas finans ve erişim kararları insan onayı olmadan uygulanmaz.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  {clientView ? localizeBusinessCopy("Yanıt takibi", locale) : localizeBusinessCopy("Negatif durumlar", locale)}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {clientView
                    ? localizeBusinessCopy("Yönetim yanıtı, servis randevusu ve belge talebi aynı konuşma geçmişinde kalır.", locale)
                    : localizeBusinessCopy("Yanlış alıcı, kapalı kanal, borç ihtilafı, dil uyumsuzluğu ve tekrar eden mesajlar audit kuyruğuna düşer.", locale)}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={visibleRules}
        searchValue={(item) => `${item.id} ${item.trigger} ${item.target} ${item.channel} ${item.owner}`}
        pageSize={10}
        columns={[
          { key: "id", header: localizeBusinessCopy("Kural", locale), sortable: true, render: (item) => item.id },
          { key: "trigger", header: localizeBusinessCopy("Tetikleyici", locale), render: (item) => localizeBusinessCopy(item.trigger, locale) },
          { key: "target", header: localizeBusinessCopy("Hedef", locale), render: (item) => targetLabel(item.target, locale) },
          { key: "channel", header: localizeBusinessCopy("Kanal", locale), render: (item) => localizeBusinessCopy(item.channel, locale) },
          ...(!clientView
            ? [
                {
                  key: "owner",
                  header: localizeBusinessCopy("Sahip", locale),
                  render: (item: NotificationRule) => localizeBusinessCopy(item.owner, locale),
                },
              ]
            : []),
        ]}
      />
    </div>
  )
}
