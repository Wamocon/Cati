"use client"

import { useLocale } from "next-intl"
import { CheckCircle2, CloudOff, MonitorSmartphone, RefreshCw, ShieldCheck, Smartphone, WifiOff } from "lucide-react"
import { Card3D } from "@/components/3d-card"
import { DashboardActionMenu } from "@/components/dashboard-action-menu"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import { useUser } from "@/components/user-provider"
import { visibleOfflineSyncQueueForRole } from "@/lib/role-scoped-views"
import {
  getMobileWebSummary,
  mobileWebCapabilities,
  offlineSyncQueue,
  type MobileWebCapabilityRecord,
  type OfflineSyncRecord,
} from "@/lib/site-management-data"
import { resolveDashboardLocale } from "@/lib/operational-copy"
import type { DashboardLocale } from "@/lib/unit-matrix-copy"

type OfflineCopy = {
  title: string
  description: string
  actionMenu: {
    label: string
    ariaLabel: string
    queueReviewLabel: string
    queueReviewDescription: string
    queueReviewAria: string
    queueReviewTitle: string
    itemLabel: string
    itemAriaSuffix: string
    itemReviewLabel: string
    itemReviewAria: string
    itemReviewTitleSuffix: string
  }
  metrics: {
    capabilities: string
    ready: string
    queuedWrites: string
    demoQueue: string
    conflicts: string
  }
  capabilityPanel: {
    title: string
    description: string
    badge: string
  }
  sideCards: {
    manualQaTitle: string
    manualQaDescription: string
    guardrailTitle: string
    guardrailDescription: string
  }
  columns: {
    queue: string
    role: string
    module: string
    status: string
    action: string
    guardrail: string
    review: string
  }
  capabilityStatus: Record<MobileWebCapabilityRecord["status"], string>
  queueStatus: Record<OfflineSyncRecord["status"], string>
  roles: Record<OfflineSyncRecord["role"], string>
  modules: Record<OfflineSyncRecord["module"], string>
  surfaces: Record<MobileWebCapabilityRecord["surface"], string>
  audiences: Record<MobileWebCapabilityRecord["audience"], string>
  capabilities: Record<string, { title: string; description: string; qaSignal: string }>
  queue: Record<string, { action: string; guardrail: string }>
}

const offlineCopy: Record<DashboardLocale, OfflineCopy> = {
  tr: {
    title: "Mobil Web & Offline Sync",
    description:
      "Tek web uygulaması mobilde kullanılır; native app yok. Bu ekran bugün demo/readiness seviyesindedir: PWA shell ve güvenli cache mantığı hazır, canlı offline yazma kuyruğu ise production için ayrıca bağlanmalıdır.",
    actionMenu: {
      label: "Aksiyonlar",
      ariaLabel: "Offline sync aksiyonları",
      queueReviewLabel: "Demo kuyruğunu incele",
      queueReviewDescription: "Çakışma ve güvenli cache kayıtlarını denetler.",
      queueReviewAria: "Offline kuyruğu incele",
      queueReviewTitle: "Offline çakışma kuyruğunu incele",
      itemLabel: "Kuyruk aksiyonları",
      itemAriaSuffix: "offline kuyruk aksiyonları",
      itemReviewLabel: "Kaydı incele",
      itemReviewAria: "Offline sync kaydını incele",
      itemReviewTitleSuffix: "incele",
    },
    metrics: {
      capabilities: "Kabiliyetler",
      ready: "Hazır",
      queuedWrites: "Kuyruk yazımları",
      demoQueue: "Demo kuyruğu",
      conflicts: "Çakışmalar",
    },
    capabilityPanel: {
      title: "Faz 12 kabiliyet panosu",
      description:
        "Mobil öncelikli web davranışı aynı dashboard yüzeyinde hazırlanır. Gerçek offline yazım daha sonraki üretim entegrasyonudur; canlı vaat değildir.",
      badge: "Sadece demo sync",
    },
    sideCards: {
      manualQaTitle: "Manuel mobil QA",
      manualQaDescription:
        "Müşteri UAT öncesinde giriş, yan menü, arama, talepler, rezervasyonlar, iletişim ve raporları telefon genişliğinde test edin.",
      guardrailTitle: "Offline güvenlik sınırı",
      guardrailDescription:
        "Finans, depozito, erişim ve rol değişiklikleri offline durumda kapalı kalır ve sunucu tarafı onay ister. Üretim yazım senkronu IndexedDB, tekrar işleri ve çakışma incelemesi gerektirir.",
    },
    columns: {
      queue: "Kuyruk",
      role: "Rol",
      module: "Modül",
      status: "Durum",
      action: "Aksiyon",
      guardrail: "Güvenlik sınırı",
      review: "İnceleme",
    },
    capabilityStatus: {
      ready: "Hazır",
      simulation: "Sadece demo",
      provider_ready: "Sağlayıcı hazır",
      needs_device_test: "Cihaz testi",
    },
    queueStatus: {
      synced: "Senkron",
      queued: "Kuyrukta",
      conflict: "Çakışma",
      read_only_cached: "Salt okunur cache",
    },
    roles: {
      manager: "Sorumlu",
      staff: "Personel",
      owner: "Malik",
      tenant: "Kiracı",
    },
    modules: {
      tickets: "Talepler",
      calendar: "Rezervasyon",
      documents: "Belgeler",
      communications: "İletişim",
      dashboard: "Dashboard",
    },
    surfaces: {
      "Responsive Web": "Responsive Web",
      "Installable PWA": "Kurulabilir PWA",
      "Offline Queue": "Offline Kuyruk",
      "Touch UX": "Dokunmatik UX",
      Accessibility: "Erişilebilirlik",
    },
    audiences: {
      all: "tüm roller",
      manager: "sorumlu",
      staff: "personel",
      resident: "sakin",
    },
    capabilities: {
      "MW-RESP-01": {
        title: "Tek responsive web app, native bağımlılık yok",
        description:
          "Dashboard, servis, rezervasyon, belge ve iletişim akışları aynı Next.js web uygulamasında kalır ve telefon, tablet, desktop için uyarlanır.",
        qaSignal: "390px mobil smoke kontrollerinde yatay taşma yok.",
      },
      "MW-PWA-02": {
        title: "Kurulabilir web shell",
        description: "Manifest ve service-worker shell, HTTPS üretim hostu açıldığında tarayıcı kurulum hedefi sağlar.",
        qaSignal: "Manifest ve service worker browser QA'da görülebilir.",
      },
      "MW-FIELD-03": {
        title: "Telefondan saha ekip akışı",
        description:
          "Teknisyen ve temizlik ekibi atanan işleri, SLA'yı, rota slotunu, checklist'i ve kanıt gerekliliklerini mobilde görür.",
        qaSignal: "Personel mobil smoke talepler ve rezervasyonu kapsar.",
      },
      "MW-OFFLINE-04": {
        title: "Offline güvenli okuma ve retry kuyruğu",
        description:
          "Kritik kayıtlar demo için güvenli salt okunur snapshot ve kuyruk senaryosu olarak gösterilir. Canlı yazım için IndexedDB kuyruğu, retry worker, idempotent API ve çakışma onayı gerekir.",
        qaSignal: "Demo kuyruk kayıtları retry, kapsam ve guardrail bilgisini gösterir; canlı yazım açık değildir.",
      },
      "MW-A11Y-05": {
        title: "Erişilebilir mobil operasyon",
        description:
          "Dokunma hedefleri, skip link, etiketler, reduced-motion desteği ve rol bazlı net navigasyon web app genelinde korunur.",
        qaSignal: "Browser smoke h1, label ve mobil overflow kontrolü yapar.",
      },
    },
    queue: {
      "OFF-9001": {
        action: "TASK-204 için önce/sonra kanıtı yükle",
        guardrail: "Medya sunucuya ulaşmadan iş kapatılamaz",
      },
      "OFF-9002": {
        action: "Günlük operasyon snapshot'ını oku",
        guardrail: "Yenilenene kadar eski veri etiketi görünür kalır",
      },
      "OFF-9003": {
        action: "Portal konuşmasından destek mesajı taslağı hazırla",
        guardrail: "Toplu yayın veya personel konuşmasına erişim yok",
      },
      "OFF-9004": {
        action: "Aylık malik ekstresini aç",
        guardrail: "Süresi dolan veya değişen belgeler taze sunucu kontrolü ister",
      },
      "OFF-9005": {
        action: "Checkout/depozito çakışmasını çöz",
        guardrail: "Finans ve erişim değişiklikleri manager onayı ister",
      },
    },
  },
  en: {
    title: "Mobile Web & Offline-Synchronisierung",
    description:
      "One responsive web application is used on mobile; there is no native-app dependency. This screen is demo/readiness level today: the PWA shell and safe-cache model are ready, while live offline write sync still needs production integration.",
    actionMenu: {
      label: "Actions",
      ariaLabel: "Offline sync actions",
      queueReviewLabel: "Review demo queue",
      queueReviewDescription: "Reviews conflicts and safe-cache records.",
      queueReviewAria: "Review offline queue",
      queueReviewTitle: "Review offline conflict queue",
      itemLabel: "Queue actions",
      itemAriaSuffix: "offline queue actions",
      itemReviewLabel: "Review record",
      itemReviewAria: "Review offline sync record",
      itemReviewTitleSuffix: "review",
    },
    metrics: {
      capabilities: "Capabilities",
      ready: "Ready",
      queuedWrites: "Queued writes",
      demoQueue: "Demo queue",
      conflicts: "Conflicts",
    },
    capabilityPanel: {
      title: "Phase 12 capability board",
      description:
        "Mobile-first web behavior is prepared inside the same dashboard surface. Real offline write sync is a later production integration, not a live promise.",
      badge: "Demo sync only",
    },
    sideCards: {
      manualQaTitle: "Manual mobile QA",
      manualQaDescription:
        "Before customer UAT, test login, sidebar, search, requests, reservations, communications and reports at phone width.",
      guardrailTitle: "Offline safety boundary",
      guardrailDescription:
        "Finance, deposit, access and role changes stay closed while offline and require server-side approval. Production write sync needs IndexedDB, retry jobs and conflict review.",
    },
    columns: {
      queue: "Queue",
      role: "Role",
      module: "Module",
      status: "Status",
      action: "Action",
      guardrail: "Safety boundary",
      review: "Review",
    },
    capabilityStatus: {
      ready: "Ready",
      simulation: "Demo only",
      provider_ready: "Provider ready",
      needs_device_test: "Device test",
    },
    queueStatus: {
      synced: "Synced",
      queued: "Queued",
      conflict: "Conflict",
      read_only_cached: "Read-only cache",
    },
    roles: {
      manager: "Manager",
      staff: "Staff",
      owner: "Owner",
      tenant: "Tenant",
    },
    modules: {
      tickets: "Tickets",
      calendar: "Reservation",
      documents: "Documents",
      communications: "Communication",
      dashboard: "Dashboard",
    },
    surfaces: {
      "Responsive Web": "Responsive Web",
      "Installable PWA": "Installable PWA",
      "Offline Queue": "Offline Queue",
      "Touch UX": "Touch UX",
      Accessibility: "Accessibility",
    },
    audiences: {
      all: "all roles",
      manager: "manager",
      staff: "staff",
      resident: "resident",
    },
    capabilities: {
      "MW-RESP-01": {
        title: "One responsive web app, no native app dependency",
        description:
          "Dashboard, service, booking, document and communication flows stay in the same Next.js web app and adapt to phone, tablet and desktop.",
        qaSignal: "No horizontal overflow on 390px mobile smoke checks.",
      },
      "MW-PWA-02": {
        title: "Installable web shell",
        description: "Manifest and service-worker shell allow browser install once HTTPS production hosting is enabled.",
        qaSignal: "Manifest and service worker are discoverable in browser QA.",
      },
      "MW-FIELD-03": {
        title: "Staff field flow from phone",
        description:
          "Technicians and cleaning staff can view assigned jobs, SLA, route slot, checklist and proof requirements on mobile.",
        qaSignal: "Staff mobile smoke covers tickets and calendar.",
      },
      "MW-OFFLINE-04": {
        title: "Offline-safe read and retry queue",
        description:
          "Critical records can be shown as safe read-only snapshots and queued-write scenarios for demo. Live writes need IndexedDB, retry worker, idempotent API and conflict approval.",
        qaSignal: "Demo queue records expose retry policy, scope and guardrail; live write queue is not enabled.",
      },
      "MW-A11Y-05": {
        title: "Accessible mobile operations",
        description:
          "Touch targets, skip link, labels, reduced-motion support and clear role-scoped navigation are kept across the web app.",
        qaSignal: "Browser smoke checks h1, labels and mobile overflow.",
      },
    },
    queue: {
      "OFF-9001": {
        action: "Upload before/after proof for TASK-204",
        guardrail: "Cannot close job until media reaches server",
      },
      "OFF-9002": {
        action: "Read daily operation snapshot",
        guardrail: "Stale badge remains visible until refresh",
      },
      "OFF-9003": {
        action: "Draft support message from portal thread",
        guardrail: "No broadcast or staff thread access",
      },
      "OFF-9004": {
        action: "Open monthly owner statement",
        guardrail: "Expired or changed documents require fresh server check",
      },
      "OFF-9005": {
        action: "Resolve checkout/deposit conflict",
        guardrail: "Finance and access changes require manager approval",
      },
    },
  },
  de: {
    title: "Mobile Web & Offline Sync",
    description:
      "Auf Mobilgeräten wird eine responsive Web-App genutzt; keine native App ist nötig. Dieser Bereich ist heute Demo-/Readiness-Stand: PWA-Shell und sicheres Cache-Modell sind bereit, Live-Offline-Schreiben braucht noch Produktionsintegration.",
    actionMenu: {
      label: "Aktionen",
      ariaLabel: "Offline-Sync-Aktionen",
      queueReviewLabel: "Demo-Warteschlange prüfen",
      queueReviewDescription: "Prüft Konflikte und sichere Cache-Einträge.",
      queueReviewAria: "Offline-Warteschlange prüfen",
      queueReviewTitle: "Offline-Konfliktwarteschlange prüfen",
      itemLabel: "Warteschlangen-Aktionen",
      itemAriaSuffix: "Offline-Warteschlangen-Aktionen",
      itemReviewLabel: "Eintrag prüfen",
      itemReviewAria: "Offline-Sync-Eintrag prüfen",
      itemReviewTitleSuffix: "prüfen",
    },
    metrics: {
      capabilities: "Fähigkeiten",
      ready: "Bereit",
      queuedWrites: "Schreibwarteschlange",
      demoQueue: "Demo-Warteschlange",
      conflicts: "Konflikte",
    },
    capabilityPanel: {
      title: "Phase-12-Fähigkeiten",
      description:
        "Mobile-first Web-Verhalten wird in derselben Dashboard-Oberfläche vorbereitet. Echtes Offline-Schreiben ist eine spätere Produktionsintegration, kein Live-Versprechen.",
      badge: "Nur Demo-Sync",
    },
    sideCards: {
      manualQaTitle: "Manuelle Mobile-QA",
      manualQaDescription:
        "Vor Kunden-UAT Login, Sidebar, Suche, Anfragen, Reservierungen, Kommunikation und Berichte auf Smartphone-Breite testen.",
      guardrailTitle: "Offline-Sicherheitsgrenze",
      guardrailDescription:
        "Finanz-, Kautions-, Zugangs- und Rollenänderungen bleiben offline gesperrt und benötigen serverseitige Freigabe. Produktions-Sync braucht IndexedDB, Retry-Jobs und Konfliktprüfung.",
    },
    columns: {
      queue: "Warteschlange",
      role: "Rolle",
      module: "Modul",
      status: "Status",
      action: "Aktion",
      guardrail: "Sicherheitsgrenze",
      review: "Prüfung",
    },
    capabilityStatus: {
      ready: "Bereit",
      simulation: "Nur Demo",
      provider_ready: "Anbieter bereit",
      needs_device_test: "Gerätetest",
    },
    queueStatus: {
      synced: "Synchron",
      queued: "In Warteschlange",
      conflict: "Konflikt",
      read_only_cached: "Nur-Lese-Cache",
    },
    roles: {
      manager: "Manager",
      staff: "Personal",
      owner: "Eigentümer",
      tenant: "Mieter",
    },
    modules: {
      tickets: "Serviceanfragen",
      calendar: "Reservierung",
      documents: "Dokumente",
      communications: "Kommunikation",
      dashboard: "Übersicht",
    },
    surfaces: {
      "Responsive Web": "Responsive Web",
      "Installable PWA": "Installierbare PWA",
      "Offline Queue": "Offline-Warteschlange",
      "Touch UX": "Touch UX",
      Accessibility: "Barrierefreiheit",
    },
    audiences: {
      all: "alle Rollen",
      manager: "Manager",
      staff: "Personal",
      resident: "Bewohner",
    },
    capabilities: {
      "MW-RESP-01": {
        title: "Eine responsive Web-App, keine native App-Abhängigkeit",
        description:
          "Dashboard-, Service-, Buchungs-, Dokument- und Kommunikationsflüsse bleiben in derselben Next.js-Web-App und passen sich Smartphone, Tablet und Desktop an.",
        qaSignal: "Keine horizontale Überbreite in 390px-Mobile-Smoke-Checks.",
      },
      "MW-PWA-02": {
        title: "Installierbare Web-Shell",
        description: "Manifest und Service-Worker-Shell ermöglichen Browser-Installation, sobald HTTPS-Produktion aktiv ist.",
        qaSignal: "Manifest und Service Worker sind in Browser-QA sichtbar.",
      },
      "MW-FIELD-03": {
        title: "Feldteam-Ablauf per Smartphone",
        description:
          "Techniker und Reinigungspersonal sehen zugewiesene Jobs, SLA, Route, Checkliste und Nachweispflichten mobil.",
        qaSignal: "Mobiler Personaltest deckt Serviceanfragen und Kalender ab.",
      },
      "MW-OFFLINE-04": {
        title: "Offline-sichere Ansicht und Retry-Warteschlange",
        description:
          "Kritische Datensätze werden in der Demo als sichere Nur-Lese-Snapshots und Queue-Szenarien gezeigt. Live-Schreiben braucht IndexedDB, Retry Worker, idempotente API und Konfliktfreigabe.",
        qaSignal: "Demo-Queue zeigt Retry, Scope und Guardrail; Live-Schreibqueue ist nicht aktiv.",
      },
      "MW-A11Y-05": {
        title: "Barrierefreie mobile Abläufe",
        description:
          "Touch-Ziele, Skip Link, Labels, Reduced-Motion und klare rollenbasierte Navigation bleiben appweit erhalten.",
        qaSignal: "Browser-Smoke prüft h1, Labels und mobilen Overflow.",
      },
    },
    queue: {
      "OFF-9001": {
        action: "Vorher-/Nachher-Nachweis für TASK-204 hochladen",
        guardrail: "Job kann erst geschlossen werden, wenn Medien den Server erreichen",
      },
      "OFF-9002": {
        action: "Täglichen Operations-Snapshot lesen",
        guardrail: "Stale-Badge bleibt bis zur Aktualisierung sichtbar",
      },
      "OFF-9003": {
        action: "Supportnachricht aus Portal-Thread entwerfen",
        guardrail: "Kein Broadcast- oder Personal-Thread-Zugriff",
      },
      "OFF-9004": {
        action: "Monatliche Eigentümerabrechnung öffnen",
        guardrail: "Abgelaufene oder geänderte Dokumente erfordern frischen Servercheck",
      },
      "OFF-9005": {
        action: "Checkout-/Kautionskonflikt lösen",
        guardrail: "Finanz- und Zugangsänderungen brauchen Managerfreigabe",
      },
    },
  },
  ru: {
    title: "Мобильный веб и офлайн-синхронизация",
    description:
      "На телефоне используется одна responsive web app; native app не требуется. Сейчас это demo/readiness: PWA shell и безопасный cache готовы, а live offline write sync требует отдельной production-интеграции.",
    actionMenu: {
      label: "Действия",
      ariaLabel: "Действия offline sync",
      queueReviewLabel: "Проверить demo queue",
      queueReviewDescription: "Проверяет конфликты и безопасные cache-записи.",
      queueReviewAria: "Проверить offline queue",
      queueReviewTitle: "Проверить очередь offline конфликтов",
      itemLabel: "Действия очереди",
      itemAriaSuffix: "действия offline queue",
      itemReviewLabel: "Проверить запись",
      itemReviewAria: "Проверить запись offline sync",
      itemReviewTitleSuffix: "проверить",
    },
    metrics: {
      capabilities: "Возможности",
      ready: "Готово",
      queuedWrites: "Очередь записей",
      demoQueue: "Demo queue",
      conflicts: "Конфликты",
    },
    capabilityPanel: {
      title: "Панель возможностей Phase 12",
      description:
        "Мобильный веб-интерфейс готовится внутри той же панели. Реальная офлайн-синхронизация записей является отдельной производственной интеграцией, а не текущим обещанием.",
      badge: "Только демо-синхронизация",
    },
    sideCards: {
      manualQaTitle: "Ручная мобильная QA",
      manualQaDescription:
        "Перед клиентским UAT проверьте вход, боковое меню, поиск, заявки, бронирования, коммуникации и отчеты на ширине телефона.",
      guardrailTitle: "Граница офлайн-безопасности",
      guardrailDescription:
        "Финансы, депозит, доступ и роли остаются закрытыми офлайн и требуют серверного одобрения. Производственная синхронизация записей требует IndexedDB, повторных задач и проверки конфликтов.",
    },
    columns: {
      queue: "Очередь",
      role: "Роль",
      module: "Модуль",
      status: "Статус",
      action: "Действие",
      guardrail: "Граница безопасности",
      review: "Проверка",
    },
    capabilityStatus: {
      ready: "Готово",
      simulation: "Только demo",
      provider_ready: "Готово к провайдеру",
      needs_device_test: "Тест устройства",
    },
    queueStatus: {
      synced: "Синхронизировано",
      queued: "В очереди",
      conflict: "Конфликт",
      read_only_cached: "Кэш только для чтения",
    },
    roles: {
      manager: "Менеджер",
      staff: "Персонал",
      owner: "Владелец",
      tenant: "Арендатор",
    },
    modules: {
      tickets: "Заявки",
      calendar: "Бронирование",
      documents: "Документы",
      communications: "Коммуникации",
      dashboard: "Обзор",
    },
    surfaces: {
      "Responsive Web": "Адаптивный веб",
      "Installable PWA": "Устанавливаемая PWA",
      "Offline Queue": "Офлайн-очередь",
      "Touch UX": "Сенсорный UX",
      Accessibility: "Доступность",
    },
    audiences: {
      all: "все роли",
      manager: "менеджер",
      staff: "персонал",
      resident: "житель",
    },
    capabilities: {
      "MW-RESP-01": {
        title: "Одно адаптивное веб-приложение без зависимости от native app",
        description:
          "Панель, сервисные заявки, бронирования, документы и коммуникации остаются в одном веб-приложении Next.js и адаптируются под телефон, планшет и рабочий стол.",
        qaSignal: "На мобильной проверке 390px нет горизонтального переполнения.",
      },
      "MW-PWA-02": {
        title: "Устанавливаемая веб-оболочка",
        description: "Manifest и service worker позволяют установку в браузере после включения HTTPS-продакшн-хостинга.",
        qaSignal: "Manifest и service worker видны в браузерной QA.",
      },
      "MW-FIELD-03": {
        title: "Полевой поток для персонала с телефона",
        description:
          "Техники и команда уборки видят назначенные задачи, SLA, маршрут, чек-лист и требования к доказательствам на мобильном.",
        qaSignal: "Мобильная проверка персонала покрывает заявки и календарь.",
      },
      "MW-OFFLINE-04": {
        title: "Безопасное офлайн-чтение и очередь повторов",
        description:
          "Критические записи в демо представлены как безопасные снимки только для чтения и сценарии очереди записи. Живые записи требуют IndexedDB, повторного worker, идемпотентного API и одобрения конфликтов.",
        qaSignal: "Демо-очередь показывает политику повторов, область доступа и ограничение; живая очередь записи не включена.",
      },
      "MW-A11Y-05": {
        title: "Доступные мобильные операции",
        description:
          "Сенсорные цели, ссылка пропуска, метки, reduced-motion и ролевая навигация сохраняются во всем веб-приложении.",
        qaSignal: "Браузерная проверка контролирует h1, метки и мобильное переполнение.",
      },
    },
    queue: {
      "OFF-9001": {
        action: "Загрузить доказательство до/после для TASK-204",
        guardrail: "Нельзя закрыть job, пока media не дошли до server",
      },
      "OFF-9002": {
        action: "Прочитать daily operation snapshot",
        guardrail: "Stale badge остается видимым до refresh",
      },
      "OFF-9003": {
        action: "Подготовить support message из portal thread",
        guardrail: "Нет broadcast или staff thread access",
      },
      "OFF-9004": {
        action: "Открыть monthly owner statement",
        guardrail: "Expired или changed documents требуют fresh server check",
      },
      "OFF-9005": {
        action: "Решить checkout/deposit conflict",
        guardrail: "Finance и access changes требуют manager approval",
      },
    },
  },
}

function capabilityVariant(status: MobileWebCapabilityRecord["status"]) {
  if (status === "ready") return "success"
  if (status === "simulation") return "warning"
  if (status === "provider_ready") return "info"
  return "warning"
}

function capabilityLabel(status: MobileWebCapabilityRecord["status"], copy: OfflineCopy) {
  return copy.capabilityStatus[status]
}

function queueVariant(status: OfflineSyncRecord["status"]) {
  if (status === "synced") return "success"
  if (status === "queued" || status === "read_only_cached") return "info"
  return "warning"
}

function queueLabel(status: OfflineSyncRecord["status"], copy: OfflineCopy) {
  return copy.queueStatus[status]
}

export default function OfflineSyncPage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = offlineCopy[locale]
  const user = useUser()
  const visibleQueue = visibleOfflineSyncQueueForRole(user.role, offlineSyncQueue)
  const summary = getMobileWebSummary(visibleQueue)
  const reviewTarget = visibleQueue.find((item) => item.status === "conflict") ?? visibleQueue[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <DashboardActionMenu
          label={copy.actionMenu.label}
          ariaLabel={copy.actionMenu.ariaLabel}
          items={[
            {
              key: "queue-review",
              label: copy.actionMenu.queueReviewLabel,
              description: copy.actionMenu.queueReviewDescription,
              icon: <RefreshCw />,
              actionType: "offline_sync.queue.review",
              ariaLabel: copy.actionMenu.queueReviewAria,
              entityTable: "offline_sync_jobs",
              entityExternalId: reviewTarget?.id ?? "OFF-9001",
              title: copy.actionMenu.queueReviewTitle,
              metadata: { phase: 12, mode: "simulation", role: user.role },
            },
          ]}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <MonitorSmartphone className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.capabilities}</p>
              <p className="text-2xl font-black">{summary.capabilities}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-8 w-8 text-teal-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.ready}</p>
              <p className="text-2xl font-black">{summary.ready}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <CloudOff className="h-8 w-8 text-sky-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.queuedWrites}</p>
              <p className="text-2xl font-black">{summary.queuedWrites}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.metrics.demoQueue}</p>
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <WifiOff className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.conflicts}</p>
              <p className="text-2xl font-black">{summary.conflicts}</p>
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-card-foreground">{copy.capabilityPanel.title}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.capabilityPanel.description}
              </p>
            </div>
            <StatusBadge variant="warning">{copy.capabilityPanel.badge}</StatusBadge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {mobileWebCapabilities.map((item) => {
              const itemCopy = copy.capabilities[item.id] ?? item
              return (
                <div key={item.id} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        {copy.surfaces[item.surface]} - {copy.audiences[item.audience]}
                      </p>
                      <h3 className="mt-1 text-sm font-black text-foreground">{itemCopy.title}</h3>
                    </div>
                    <StatusBadge variant={capabilityVariant(item.status)}>{capabilityLabel(item.status, copy)}</StatusBadge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">{itemCopy.description}</p>
                  <p className="mt-2 text-xs font-semibold text-foreground">{itemCopy.qaSignal}</p>
                </div>
              )
            })}
          </div>
        </Card3D>

        <div className="space-y-4">
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.sideCards.manualQaTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.sideCards.manualQaDescription}
                </p>
              </div>
            </div>
          </Card3D>
          <Card3D glow={false}>
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-primary" />
              <div>
                <h2 className="text-sm font-bold text-card-foreground">{copy.sideCards.guardrailTitle}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {copy.sideCards.guardrailDescription}
                </p>
              </div>
            </div>
          </Card3D>
        </div>
      </div>

      <DataTable
        data={visibleQueue}
        searchValue={(item) => `${item.id} ${item.role} ${item.module} ${item.action} ${item.status} ${item.guardrail}`}
        columns={[
          { key: "id", header: copy.columns.queue, sortable: true, render: (item) => item.id },
          { key: "role", header: copy.columns.role, sortable: true, render: (item) => copy.roles[item.role] },
          { key: "module", header: copy.columns.module, sortable: true, render: (item) => copy.modules[item.module] },
          { key: "status", header: copy.columns.status, render: (item) => <StatusBadge variant={queueVariant(item.status)}>{queueLabel(item.status, copy)}</StatusBadge> },
          { key: "action", header: copy.columns.action, render: (item) => copy.queue[item.id]?.action ?? item.action },
          { key: "guardrail", header: copy.columns.guardrail, render: (item) => copy.queue[item.id]?.guardrail ?? item.guardrail },
          {
            key: "review",
            header: copy.columns.review,
            sticky: "right",
            headerClassName: "text-center",
            cellClassName: "text-center",
            render: (item) => (
              <DashboardActionMenu
                compact
                label={copy.actionMenu.itemLabel}
                ariaLabel={`${item.id} ${copy.actionMenu.itemAriaSuffix}`}
                items={[
                  {
                    key: "review",
                    label: copy.actionMenu.itemReviewLabel,
                    description: `${copy.modules[item.module]} / ${copy.queueStatus[item.status]}`,
                    icon: <RefreshCw />,
                    actionType: "offline_sync.item.review",
                    ariaLabel: copy.actionMenu.itemReviewAria,
                    entityTable: "offline_sync_jobs",
                    entityExternalId: item.id,
                    title: `${item.id} ${copy.actionMenu.itemReviewTitleSuffix}`,
                    metadata: { status: item.status, module: item.module },
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  )
}
