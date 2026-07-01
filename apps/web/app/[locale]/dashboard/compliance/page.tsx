"use client"

import { motion } from "framer-motion"
import { useLocale } from "next-intl"
import { ArrowUpRight, BadgeCheck, BarChart3, Car, DoorOpen, FileSearch, KeyRound, LockKeyhole, Network, Scale, ShieldAlert, ShieldCheck } from "lucide-react"
import { AnimatedCounter } from "@/components/animated-counter"
import { BarChart } from "@/components/charts/bar-chart"
import { Card3D } from "@/components/3d-card"
import { DataTable } from "@/components/data-table"
import { StatusBadge } from "@/components/status-badge"
import {
  accessControlRecords,
  buyerEligibility,
  getAccessSummary,
  getEligibilitySummary,
  type AccessControlRecord,
  type AccessStatus,
  type EligibilityStatus,
} from "@/lib/site-management-data"
import { resolveDashboardLocale } from "@/lib/operational-copy"
import { localizeOperationalValue, type DashboardLocale } from "@/lib/unit-matrix-copy"

type ComplianceCopy = {
  title: string
  description: string
  hero: {
    eyebrow: string
    title: string
    description: string
    restrictedLabel: string
    liveRiskFilter: string
    decisionSummary: (pending: number, critical: number) => string
    auditRhythm: string
    auditDescription: string
  }
  flow: Array<{ label: string; detail: string; icon: typeof KeyRound }>
  bars: Array<{ label: string; value: number }>
  metrics: {
    tracked: string
    restricted: string
    pending: string
    critical: string
  }
  accessDensity: {
    title: string
    zones: string
    openRecords: string
    chartAria: string
    total: string
  }
  sideCards: Array<{ title: string; description: string; icon: typeof DoorOpen; className: string }>
  eligibility: {
    title: string
    description: string
    reviewQueue: string
    buyerFiles: string
    preQualified: string
    appraisalRequired: string
    blocked: string
    appraisalYes: string
    appraisalNo: string
  }
  columns: {
    check: string
    buyer: string
    goal: string
    budget: string
    district: string
    appraisal: string
    status: string
    nextAction: string
    unit: string
    resident: string
    zone: string
    credential: string
    access: string
    risk: string
    reason: string
  }
  statusLabels: Record<AccessStatus, string>
  riskLabels: AccessControlRecord["riskLevel"] extends infer R ? Record<Extract<R, string>, string> : never
  eligibilityLabels: Record<EligibilityStatus, string>
  buyerGoals: Record<string, string>
  districtChecks: Record<string, string>
  nextActions: Record<string, string>
  zones: Record<string, string>
  credentials: Record<string, string>
  reasons: Record<AccessStatus, string>
}

const complianceCopy: Record<DashboardLocale, ComplianceCopy> = {
  tr: {
    title: "Erişim & Uyum",
    description:
      "Mobil kod, kart, plaka, QR, borç kısıtı, depozito kontrolü ve güvenlik olaylarını tek karar motorunda izleyin.",
    hero: {
      eyebrow: "Erişim karar motoru",
      title: "Kapı, borç, depozito ve kimlik tek karar motorunda",
      description:
        "Sistem erişim kararını sadece geçiş kartı olarak değil; ödeme, rezervasyon, belge ve güvenlik sinyaliyle birlikte değerlendirir.",
      restrictedLabel: "aktif kısıt",
      liveRiskFilter: "Canlı risk filtresi",
      decisionSummary: (pending, critical) => `${pending} bekleyen, ${critical} kritik karar`,
      auditRhythm: "Denetim ritmi",
      auditDescription:
        "Her geçiş kararı kullanıcı, sebep, saat ve belge referansıyla kayıt altında tutulur.",
    },
    flow: [
      { label: "Kimlik", detail: "QR, kart, plaka", icon: KeyRound },
      { label: "Finans", detail: "Borç ve depozito", icon: LockKeyhole },
      { label: "Karar", detail: "Geçiş veya kısıt", icon: DoorOpen },
    ],
    bars: [
      { label: "Kapı", value: 84 },
      { label: "Otopark", value: 63 },
      { label: "Havuz", value: 56 },
      { label: "Asansör", value: 48 },
    ],
    metrics: {
      tracked: "Takipteki kayıt",
      restricted: "Kısıtlı",
      pending: "Bekleyen",
      critical: "Kritik risk",
    },
    accessDensity: {
      title: "Erişim bölgesi yoğunluğu",
      zones: "5 bölge",
      openRecords: "Kayıtları aç",
      chartAria: "Erişim bölgesi durum grafiği",
      total: "Toplam",
    },
    sideCards: [
      {
        title: "Kapı karar motoru",
        description: "Borç, rezervasyon, depozito ve kimlik kontrolü tamamlanmadan geçici erişim açılmaz.",
        icon: DoorOpen,
        className: "text-primary",
      },
      {
        title: "Plaka ve otopark",
        description: "Otopark, misafir ve sakin erişimleri aynı uyum kayıtlarına bağlanır.",
        icon: Car,
        className: "text-amber-600",
      },
      {
        title: "Audit trail",
        description: "Her erişim kararı kullanıcı, sebep, saat ve belge referansıyla denetlenebilir tutulur.",
        icon: BadgeCheck,
        className: "text-teal-600",
      },
    ],
    eligibility: {
      title: "Oturum, vatandaşlık ve alıcı uygunluk ön kontrolü",
      description:
        "Satış ekibi uygunluk ön kontrolünü görür; sistem hukuki garanti vermez ve riskli durumları partner incelemesine gönderir.",
      reviewQueue: "inceleme kuyruğu",
      buyerFiles: "Alıcı dosyası",
      preQualified: "Ön uygun",
      appraisalRequired: "Ekspertiz gerekli",
      blocked: "Blokeli",
      appraisalYes: "Gerekli",
      appraisalNo: "Gerekmez",
    },
    columns: {
      check: "Kontrol",
      buyer: "Alıcı",
      goal: "Hedef",
      budget: "Bütçe",
      district: "Bölge",
      appraisal: "Ekspertiz",
      status: "Durum",
      nextAction: "Sonraki aksiyon",
      unit: "Daire",
      resident: "Sakin",
      zone: "Bölge",
      credential: "Kimlik",
      access: "Erişim",
      risk: "Risk",
      reason: "Sebep",
    },
    statusLabels: {
      active: "Aktif",
      restricted: "Kısıtlı",
      pending: "Bekliyor",
      disabled: "Kapalı",
    },
    riskLabels: {
      critical: "Kritik",
      high: "Yüksek",
      medium: "Orta",
      low: "Düşük",
    },
    eligibilityLabels: {
      qualified: "Uygun",
      review_required: "Kontrol gerekli",
      partner_review: "Partner incelemesi",
      blocked: "Blokeli",
    },
    buyerGoals: {
      residence: "Oturum",
      citizenship: "Vatandaşlık",
      investment: "Yatırım",
      holiday_home: "Tatil evi",
    },
    districtChecks: {
      clear: "Temiz",
      quota_review: "Kota kontrolü",
      restricted: "Kısıtlı",
    },
    nextActions: {
      "Proceed with reservation and ROI pack": "Rezervasyon ve ROI paketiyle devam et",
      "Check residence-zone status before promise": "Söz vermeden önce oturum bölgesi durumunu kontrol et",
      "Need appraisal and source-of-funds review": "Ekspertiz ve fon kaynağı incelemesi gerekli",
      "Do not promise residence suitability": "Oturuma uygunluk vaadi verme",
    },
    zones: {
      "Ana Kapı": "Ana Kapı",
      Otopark: "Otopark",
      Havuz: "Havuz",
      Asansör: "Asansör",
      Depo: "Depo",
    },
    credentials: {
      "Mobil Kod": "Mobil Kod",
      Kart: "Kart",
      Plaka: "Plaka",
      QR: "QR",
    },
    reasons: {
      active: "Normal kullanım",
      restricted: "Aidat borcu veya depozito kontrolü",
      pending: "Giriş ön kontrolü bekliyor",
      disabled: "Bakım veya güvenlik kapaması",
    },
  },
  en: {
    title: "Access & Compliance",
    description:
      "Monitor mobile codes, cards, plates, QR credentials, debt restrictions, deposit checks and security events in one decision engine.",
    hero: {
      eyebrow: "Access decision engine",
      title: "Gate, debt, deposit and identity in one decision engine",
      description:
        "The system evaluates access as an operational decision, combining payment, reservation, document and security signals.",
      restrictedLabel: "active restrictions",
      liveRiskFilter: "Live risk filter",
      decisionSummary: (pending, critical) => `${pending} pending, ${critical} critical decisions`,
      auditRhythm: "Audit rhythm",
      auditDescription:
        "Every access decision is logged with user, reason, time and document reference.",
    },
    flow: [
      { label: "Identity", detail: "QR, card, plate", icon: KeyRound },
      { label: "Finance", detail: "Debt and deposit", icon: LockKeyhole },
      { label: "Decision", detail: "Allow or restrict", icon: DoorOpen },
    ],
    bars: [
      { label: "Gate", value: 84 },
      { label: "Parking", value: 63 },
      { label: "Pool", value: 56 },
      { label: "Elevator", value: 48 },
    ],
    metrics: {
      tracked: "Tracked records",
      restricted: "Restricted",
      pending: "Pending",
      critical: "Critical risk",
    },
    accessDensity: {
      title: "Access-zone density",
      zones: "5 zones",
      openRecords: "Open records",
      chartAria: "Access-zone status chart",
      total: "Total",
    },
    sideCards: [
      {
        title: "Gate decision engine",
        description: "Temporary access is not opened until debt, reservation, deposit and identity checks pass.",
        icon: DoorOpen,
        className: "text-primary",
      },
      {
        title: "Plate and parking",
        description: "Parking, guest and resident access are tied to the same compliance records.",
        icon: Car,
        className: "text-amber-600",
      },
      {
        title: "Audit trail",
        description: "Every access decision stays auditable with user, reason, time and document reference.",
        icon: BadgeCheck,
        className: "text-teal-600",
      },
    ],
    eligibility: {
      title: "Residence, citizenship and buyer eligibility pre-check",
      description:
        "Sales sees the eligibility pre-check; the system does not give legal guarantees and routes risky cases to partner review.",
      reviewQueue: "review queue",
      buyerFiles: "Buyer files",
      preQualified: "Pre-qualified",
      appraisalRequired: "Appraisal required",
      blocked: "Blocked",
      appraisalYes: "Required",
      appraisalNo: "Not required",
    },
    columns: {
      check: "Check",
      buyer: "Buyer",
      goal: "Goal",
      budget: "Budget",
      district: "District",
      appraisal: "Appraisal",
      status: "Status",
      nextAction: "Next action",
      unit: "Unit",
      resident: "Resident",
      zone: "Zone",
      credential: "Credential",
      access: "Access",
      risk: "Risk",
      reason: "Reason",
    },
    statusLabels: {
      active: "Active",
      restricted: "Restricted",
      pending: "Pending",
      disabled: "Disabled",
    },
    riskLabels: {
      critical: "Critical",
      high: "High",
      medium: "Medium",
      low: "Low",
    },
    eligibilityLabels: {
      qualified: "Qualified",
      review_required: "Review required",
      partner_review: "Partner review",
      blocked: "Blocked",
    },
    buyerGoals: {
      residence: "Residence",
      citizenship: "Citizenship",
      investment: "Investment",
      holiday_home: "Holiday home",
    },
    districtChecks: {
      clear: "Clear",
      quota_review: "Quota review",
      restricted: "Restricted",
    },
    nextActions: {
      "Proceed with reservation and ROI pack": "Proceed with reservation and ROI pack",
      "Check residence-zone status before promise": "Check residence-zone status before any promise",
      "Need appraisal and source-of-funds review": "Need appraisal and source-of-funds review",
      "Do not promise residence suitability": "Do not promise residence suitability",
    },
    zones: {
      "Ana Kapı": "Main gate",
      Otopark: "Parking",
      Havuz: "Pool",
      Asansör: "Elevator",
      Depo: "Storage",
    },
    credentials: {
      "Mobil Kod": "Mobile code",
      Kart: "Card",
      Plaka: "Plate",
      QR: "QR",
    },
    reasons: {
      active: "Normal use",
      restricted: "Maintenance-fee debt or deposit review",
      pending: "Entry pre-check pending",
      disabled: "Maintenance or security closure",
    },
  },
  de: {
    title: "Zugang & Compliance",
    description:
      "Überwachen Sie mobile Codes, Karten, Kennzeichen, QR-Zugänge, Saldenbeschränkungen, Kautionsprüfungen und Sicherheitsereignisse in einer Entscheidungslogik.",
    hero: {
      eyebrow: "Zugangs-Entscheidungslogik",
      title: "Tor, Saldo, Kaution und Identität in einer Entscheidung",
      description:
        "Das System bewertet Zugang als operative Entscheidung zusammen mit Zahlung, Reservierung, Dokumenten und Sicherheitssignalen.",
      restrictedLabel: "aktive Einschränkungen",
      liveRiskFilter: "Live-Risikofilter",
      decisionSummary: (pending, critical) => `${pending} offene, ${critical} kritische Entscheidungen`,
      auditRhythm: "Audit-Rhythmus",
      auditDescription:
        "Jede Zugangsentscheidung wird mit Nutzer, Grund, Uhrzeit und Dokumentreferenz protokolliert.",
    },
    flow: [
      { label: "Identität", detail: "QR, Karte, Kennzeichen", icon: KeyRound },
      { label: "Finanzen", detail: "Saldo und Kaution", icon: LockKeyhole },
      { label: "Entscheidung", detail: "Freigeben oder sperren", icon: DoorOpen },
    ],
    bars: [
      { label: "Tor", value: 84 },
      { label: "Parken", value: 63 },
      { label: "Pool", value: 56 },
      { label: "Aufzug", value: 48 },
    ],
    metrics: {
      tracked: "Überwachte Einträge",
      restricted: "Eingeschränkt",
      pending: "Offen",
      critical: "Kritisches Risiko",
    },
    accessDensity: {
      title: "Dichte je Zugangszone",
      zones: "5 Zonen",
      openRecords: "Einträge öffnen",
      chartAria: "Statusdiagramm der Zugangszonen",
      total: "Gesamt",
    },
    sideCards: [
      {
        title: "Tor-Entscheidungslogik",
        description: "Temporärer Zugang wird erst geöffnet, wenn Saldo, Reservierung, Kaution und Identität geprüft sind.",
        icon: DoorOpen,
        className: "text-primary",
      },
      {
        title: "Kennzeichen und Parken",
        description: "Park-, Gäste- und Bewohnerzugänge sind mit denselben Compliance-Einträgen verknüpft.",
        icon: Car,
        className: "text-amber-600",
      },
      {
        title: "Audit Trail",
        description: "Jede Zugangsentscheidung bleibt mit Nutzer, Grund, Uhrzeit und Dokumentreferenz prüfbar.",
        icon: BadgeCheck,
        className: "text-teal-600",
      },
    ],
    eligibility: {
      title: "Vorprüfung für Aufenthalt, Staatsbürgerschaft und Käufer-Eignung",
      description:
        "Der Vertrieb sieht die Vorprüfung; das System gibt keine Rechtsgarantie und leitet riskante Fälle an Partner zur Prüfung weiter.",
      reviewQueue: "Prüfwarteschlange",
      buyerFiles: "Käuferakten",
      preQualified: "Vorab geeignet",
      appraisalRequired: "Gutachten erforderlich",
      blocked: "Gesperrt",
      appraisalYes: "Erforderlich",
      appraisalNo: "Nicht erforderlich",
    },
    columns: {
      check: "Prüfung",
      buyer: "Käufer",
      goal: "Ziel",
      budget: "Budget",
      district: "Bezirk",
      appraisal: "Gutachten",
      status: "Status",
      nextAction: "Nächste Aktion",
      unit: "Einheit",
      resident: "Bewohner",
      zone: "Zone",
      credential: "Nachweis",
      access: "Zugang",
      risk: "Risiko",
      reason: "Grund",
    },
    statusLabels: {
      active: "Aktiv",
      restricted: "Eingeschränkt",
      pending: "Offen",
      disabled: "Deaktiviert",
    },
    riskLabels: {
      critical: "Kritisch",
      high: "Hoch",
      medium: "Mittel",
      low: "Niedrig",
    },
    eligibilityLabels: {
      qualified: "Geeignet",
      review_required: "Prüfung erforderlich",
      partner_review: "Partnerprüfung",
      blocked: "Gesperrt",
    },
    buyerGoals: {
      residence: "Aufenthalt",
      citizenship: "Staatsbürgerschaft",
      investment: "Investment",
      holiday_home: "Ferienwohnung",
    },
    districtChecks: {
      clear: "Frei",
      quota_review: "Quotenprüfung",
      restricted: "Eingeschränkt",
    },
    nextActions: {
      "Proceed with reservation and ROI pack": "Mit Reservierung und ROI-Paket fortfahren",
      "Check residence-zone status before promise": "Zonenstatus vor jeder Zusage prüfen",
      "Need appraisal and source-of-funds review": "Gutachten und Mittelherkunft prüfen",
      "Do not promise residence suitability": "Keine Aufenthaltseignung zusagen",
    },
    zones: {
      "Ana Kapı": "Haupttor",
      Otopark: "Parkplatz",
      Havuz: "Pool",
      Asansör: "Aufzug",
      Depo: "Lager",
    },
    credentials: {
      "Mobil Kod": "Mobiler Code",
      Kart: "Karte",
      Plaka: "Kennzeichen",
      QR: "QR",
    },
    reasons: {
      active: "Normale Nutzung",
      restricted: "Hausgeldsaldo oder Kautionsprüfung",
      pending: "Vorprüfung für Eintritt offen",
      disabled: "Wartungs- oder Sicherheitssperre",
    },
  },
  ru: {
    title: "Доступ и комплаенс",
    description:
      "Контролируйте мобильные коды, карты, номера, QR-доступ, ограничения из-за долга, проверки депозита и события безопасности в одном механизме решений.",
    hero: {
      eyebrow: "Механизм решения доступа",
      title: "Ворота, долг, депозит и идентификация в одном решении",
      description:
        "Система оценивает доступ как операционное решение вместе с оплатой, бронью, документами и сигналами безопасности.",
      restrictedLabel: "активных ограничений",
      liveRiskFilter: "Живой фильтр риска",
      decisionSummary: (pending, critical) => `${pending} ожидают, ${critical} критических решений`,
      auditRhythm: "Ритм аудита",
      auditDescription:
        "Каждое решение по доступу фиксируется с пользователем, причиной, временем и ссылкой на документ.",
    },
    flow: [
      { label: "Идентификация", detail: "QR, карта, номер", icon: KeyRound },
      { label: "Финансы", detail: "Долг и депозит", icon: LockKeyhole },
      { label: "Решение", detail: "Разрешить или ограничить", icon: DoorOpen },
    ],
    bars: [
      { label: "Ворота", value: 84 },
      { label: "Парковка", value: 63 },
      { label: "Бассейн", value: 56 },
      { label: "Лифт", value: 48 },
    ],
    metrics: {
      tracked: "Записей в контроле",
      restricted: "Ограничено",
      pending: "Ожидает",
      critical: "Критический риск",
    },
    accessDensity: {
      title: "Плотность по зонам доступа",
      zones: "5 зон",
      openRecords: "Открыть записи",
      chartAria: "Диаграмма статуса зон доступа",
      total: "Всего",
    },
    sideCards: [
      {
        title: "Решение для ворот",
        description: "Временный доступ не открывается до проверки долга, брони, депозита и личности.",
        icon: DoorOpen,
        className: "text-primary",
      },
      {
        title: "Номера и парковка",
        description: "Доступ к парковке, гостям и жителям связан с теми же записями комплаенса.",
        icon: Car,
        className: "text-amber-600",
      },
      {
        title: "Аудит-трейл",
        description: "Каждое решение по доступу остается проверяемым: пользователь, причина, время и документ.",
        icon: BadgeCheck,
        className: "text-teal-600",
      },
    ],
    eligibility: {
      title: "Предпроверка ВНЖ, гражданства и пригодности покупателя",
      description:
        "Отдел продаж видит предпроверку; система не дает юридических гарантий и отправляет рискованные случаи партнеру на проверку.",
      reviewQueue: "очередь проверки",
      buyerFiles: "Файлы покупателей",
      preQualified: "Предварительно подходит",
      appraisalRequired: "Нужна оценка",
      blocked: "Заблокировано",
      appraisalYes: "Требуется",
      appraisalNo: "Не требуется",
    },
    columns: {
      check: "Проверка",
      buyer: "Покупатель",
      goal: "Цель",
      budget: "Бюджет",
      district: "Район",
      appraisal: "Оценка",
      status: "Статус",
      nextAction: "Следующее действие",
      unit: "Объект",
      resident: "Житель",
      zone: "Зона",
      credential: "Идентификатор",
      access: "Доступ",
      risk: "Риск",
      reason: "Причина",
    },
    statusLabels: {
      active: "Активно",
      restricted: "Ограничено",
      pending: "Ожидает",
      disabled: "Отключено",
    },
    riskLabels: {
      critical: "Критический",
      high: "Высокий",
      medium: "Средний",
      low: "Низкий",
    },
    eligibilityLabels: {
      qualified: "Подходит",
      review_required: "Нужна проверка",
      partner_review: "Проверка партнера",
      blocked: "Заблокировано",
    },
    buyerGoals: {
      residence: "ВНЖ",
      citizenship: "Гражданство",
      investment: "Инвестиция",
      holiday_home: "Дом для отдыха",
    },
    districtChecks: {
      clear: "Чисто",
      quota_review: "Проверка квоты",
      restricted: "Ограничено",
    },
    nextActions: {
      "Proceed with reservation and ROI pack": "Продолжить с бронью и ROI-пакетом",
      "Check residence-zone status before promise": "Проверить зону ВНЖ до любых обещаний",
      "Need appraisal and source-of-funds review": "Нужна оценка и проверка источника средств",
      "Do not promise residence suitability": "Не обещать пригодность для ВНЖ",
    },
    zones: {
      "Ana Kapı": "Главные ворота",
      Otopark: "Парковка",
      Havuz: "Бассейн",
      Asansör: "Лифт",
      Depo: "Склад",
    },
    credentials: {
      "Mobil Kod": "Мобильный код",
      Kart: "Карта",
      Plaka: "Номер",
      QR: "QR",
    },
    reasons: {
      active: "Обычное использование",
      restricted: "Долг по взносам или проверка депозита",
      pending: "Ожидается предварительная проверка входа",
      disabled: "Закрыто из-за обслуживания или безопасности",
    },
  },
}

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

function riskLabel(risk: AccessControlRecord["riskLevel"], copy: ComplianceCopy) {
  return copy.riskLabels[risk]
}

function eligibilityVariant(status: EligibilityStatus) {
  if (status === "qualified") return "success"
  if (status === "review_required" || status === "partner_review") return "warning"
  return "danger"
}

function eligibilityLabel(status: EligibilityStatus, copy: ComplianceCopy) {
  return copy.eligibilityLabels[status]
}

function ComplianceCommandScene({
  summary,
  copy,
}: {
  summary: ReturnType<typeof getAccessSummary>
  copy: ComplianceCopy
}) {
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
                {copy.hero.eyebrow}
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-black leading-tight sm:text-4xl 2xl:text-5xl">
                {copy.hero.title}
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-white/70">
                {copy.hero.description}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-white/10 p-3 text-right backdrop-blur sm:p-4">
              <ShieldAlert className="ml-auto h-5 w-5 text-amber-200" />
              <p className="mt-3 text-4xl font-black">{summary.restricted}</p>
              <p className="mt-1 text-xs text-white/65">{copy.hero.restrictedLabel}</p>
            </div>
          </div>

          <div className="mt-auto grid grid-cols-3 gap-2 sm:gap-3">
            {copy.flow.map((item, index) => {
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
                {copy.hero.liveRiskFilter}
              </p>
              <h2 className="mt-1 text-lg font-black text-card-foreground">
                {copy.hero.decisionSummary(summary.pending, summary.critical)}
              </h2>
            </div>
            <Network className="h-5 w-5 text-primary" />
          </div>
          <div className="mt-5 space-y-4">
            {copy.bars.map((bar, index) => (
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
              <h2 className="text-sm font-bold text-card-foreground">{copy.hero.auditRhythm}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {copy.hero.auditDescription}
              </p>
            </div>
          </div>
        </Card3D>
      </div>
    </section>
  )
}

export default function CompliancePage() {
  const locale = resolveDashboardLocale(useLocale())
  const copy = complianceCopy[locale]
  const summary = getAccessSummary()
  const eligibilitySummary = getEligibilitySummary()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-foreground">{copy.title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
          {copy.description}
        </p>
      </div>

      <ComplianceCommandScene summary={summary} copy={copy} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.tracked}</p>
              <AnimatedCounter value={summary.total} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-8 w-8 text-rose-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.restricted}</p>
              <AnimatedCounter value={summary.restricted} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <KeyRound className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.pending}</p>
              <AnimatedCounter value={summary.pending} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
        <Card3D glow={false}>
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-red-600" />
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.metrics.critical}</p>
              <AnimatedCounter value={summary.critical} className="text-2xl font-black" />
            </div>
          </div>
        </Card3D>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card3D className="xl:col-span-2" glow={false}>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-card-foreground">{copy.accessDensity.title}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant="accent">{copy.accessDensity.zones}</StatusBadge>
              <a
                href="#access-register"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-black text-foreground transition hover:bg-muted"
              >
                {copy.accessDensity.openRecords}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
          <BarChart
            data={summary.zones.map((zone) => ({
              label: copy.zones[zone.label] ?? zone.label,
              value: zone.value,
              color: "var(--primary)",
            }))}
            ariaLabel={copy.accessDensity.chartAria}
            height={230}
            totalLabel={copy.accessDensity.total}
          />
        </Card3D>

        <div className="space-y-4">
          {copy.sideCards.map((card) => {
            const Icon = card.icon
            return (
              <Card3D key={card.title} glow={false}>
                <div className="flex items-start gap-3">
                  <Icon className={`mt-0.5 h-5 w-5 ${card.className}`} />
                  <div>
                    <h2 className="text-sm font-bold text-card-foreground">{card.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
                  </div>
                </div>
              </Card3D>
            )
          })}
        </div>
      </div>

      <Card3D glow={false}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="text-sm font-bold text-card-foreground">{copy.eligibility.title}</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.eligibility.description}
            </p>
          </div>
          <StatusBadge variant={eligibilitySummary.blocked > 0 ? "danger" : "success"}>
            {eligibilitySummary.review} {copy.eligibility.reviewQueue}
          </StatusBadge>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.eligibility.buyerFiles}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.total}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.eligibility.preQualified}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.qualified}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.eligibility.appraisalRequired}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.appraisalRequired}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">{copy.eligibility.blocked}</p>
            <p className="mt-1 text-2xl font-black text-foreground">{eligibilitySummary.blocked}</p>
          </div>
        </div>
        <DataTable
          data={buyerEligibility}
          pageSize={6}
          searchValue={(record) => `${record.id} ${record.buyerName} ${record.nationality} ${record.buyerGoal} ${record.targetUnit} ${record.nextAction}`}
          columns={[
            { key: "id", header: copy.columns.check, sortable: true, render: (record) => record.id },
            { key: "buyer", header: copy.columns.buyer, render: (record) => record.buyerName },
            { key: "goal", header: copy.columns.goal, sortable: true, render: (record) => copy.buyerGoals[record.buyerGoal] },
            {
              key: "budget",
              header: copy.columns.budget,
              sortable: true,
              sortValue: (record) => record.declaredBudgetEur,
              render: (record) => `${record.declaredBudgetEur.toLocaleString("de-DE")} €`,
            },
            { key: "district", header: copy.columns.district, render: (record) => copy.districtChecks[record.districtCheck] },
            {
              key: "appraisal",
              header: copy.columns.appraisal,
              render: (record) => (
                <span className="inline-flex items-center gap-1">
                  <FileSearch className="h-3.5 w-3.5 text-muted-foreground" />
                  {record.appraisalRequired ? copy.eligibility.appraisalYes : copy.eligibility.appraisalNo}
                </span>
              ),
            },
            {
              key: "status",
              header: copy.columns.status,
              render: (record) => <StatusBadge variant={eligibilityVariant(record.status)}>{eligibilityLabel(record.status, copy)}</StatusBadge>,
            },
            { key: "next", header: copy.columns.nextAction, render: (record) => copy.nextActions[record.nextAction] ?? record.nextAction },
          ]}
        />
      </Card3D>

      <div id="access-register" className="scroll-mt-24">
        <DataTable
          data={accessControlRecords}
          searchValue={(record) => `${record.flatNumber} ${record.residentName} ${record.zone} ${record.credential} ${record.reason}`}
          columns={[
            { key: "flat", header: copy.columns.unit, sortable: true, render: (record) => record.flatNumber },
            { key: "resident", header: copy.columns.resident, render: (record) => localizeOperationalValue(record.residentName, locale) },
            { key: "zone", header: copy.columns.zone, sortable: true, render: (record) => copy.zones[record.zone] ?? record.zone },
            { key: "credential", header: copy.columns.credential, sortable: true, render: (record) => copy.credentials[record.credential] ?? record.credential },
            {
              key: "status",
              header: copy.columns.access,
              render: (record) => <StatusBadge variant={statusVariant(record.status)}>{copy.statusLabels[record.status]}</StatusBadge>,
            },
            {
              key: "risk",
              header: copy.columns.risk,
              sortable: true,
              sortValue: (record) => record.riskLevel,
              render: (record) => <StatusBadge variant={riskVariant(record.riskLevel)}>{riskLabel(record.riskLevel, copy)}</StatusBadge>,
            },
            { key: "reason", header: copy.columns.reason, render: (record) => copy.reasons[record.status] },
          ]}
        />
      </div>
    </div>
  )
}
