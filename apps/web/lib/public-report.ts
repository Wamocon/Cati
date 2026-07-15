export const PUBLIC_REPORT_LOCALES = ["tr", "en", "de", "ru"] as const
export type PublicReportLocale = (typeof PUBLIC_REPORT_LOCALES)[number]

export const PUBLIC_REPORT_CONSENT_VERSION = "public-report-kvkk-2026-07-v1"
export const PUBLIC_REPORT_CONSENT_TEXT: Record<PublicReportLocale, string> = {
  tr: "Bildirimin işlenmesini, isteğe bağlı iletişim bilgisinin yalnızca takip amacıyla kullanılmasını ve yasal saklama süresi sonunda silinmesini kabul ediyorum.",
  en: "I consent to processing this report, using optional contact details only for follow-up, and deleting them after the documented retention period.",
  de: "Ich stimme der Verarbeitung dieser Meldung, der Nutzung optionaler Kontaktdaten nur zur Rückfrage und der Löschung nach der dokumentierten Aufbewahrungsfrist zu.",
  ru: "Я соглашаюсь на обработку сообщения, использование необязательных контактов только для уточнения и удаление после установленного срока хранения.",
}

export const PUBLIC_REPORT_CATEGORIES = [
  "cleaning",
  "technical",
  "security",
  "accessibility",
  "noise",
  "other",
] as const
export type PublicReportCategory = (typeof PUBLIC_REPORT_CATEGORIES)[number]

export const PUBLIC_REPORT_STATUSES = [
  "submitted",
  "under_review",
  "awaiting_information",
  "rejected",
  "converted",
] as const
export type PublicReportStatus = (typeof PUBLIC_REPORT_STATUSES)[number]

export const PUBLIC_REPORT_REVIEW_ACTIONS = [
  "start_review",
  "request_information",
  "reject",
  "convert",
] as const
export type PublicReportReviewAction = (typeof PUBLIC_REPORT_REVIEW_ACTIONS)[number]

export const PUBLIC_REPORT_PLACEMENT_ACTIONS = ["create", "rotate", "revoke"] as const
export type PublicReportPlacementAction = (typeof PUBLIC_REPORT_PLACEMENT_ACTIONS)[number]

export type PublicReportSafetyCode =
  | "life_safety"
  | "fire_smoke"
  | "gas_leak"
  | "medical_emergency"
  | "electrical_hazard"
  | "elevator_entrapment"
  | "flooding_active"
  | "security_threat"

export interface PublicReportSafetyResult {
  code: PublicReportSafetyCode | null
  requiresEmergencyCall: boolean
  emergencyNumber: "112" | null
  autoActionAuthorized: false
  policyVersion: "public-report-safety-2026-07-v1"
}

const safetyRules: ReadonlyArray<{
  code: PublicReportSafetyCode
  positive: RegExp
  negative?: RegExp
}> = [
  {
    code: "fire_smoke",
    positive: /fire|smoke|flames|yangın|duman|alev|feuer|rauch|flammen|пожар|дым|пламя/iu,
    negative:
      /(?:no|not|without)\s+(?:active\s+)?(?:fire|smoke|flames)|(?:yangın|duman|alev)\s+(?:yok|değil)|(?:kein|keine|keinen|ohne)\s+(?:feuer|rauch|flammen)|(?:пожара|дыма|пламени)\s+нет|нет\s+(?:пожара|дыма|пламени)/iu,
  },
  {
    code: "gas_leak",
    positive:
      /gas leak|smell of gas|gaz kaçağı|gaz kokusu|gasleck|gasgeruch|утечк[аи] газа|запах газа/iu,
    negative:
      /(?:no|not|without)\s+(?:gas leak|smell of gas)|(?:gaz kaçağı|gaz kokusu)\s+(?:yok|değil)|(?:kein|keine|ohne)\s+(?:gasleck|gasgeruch)|нет\s+(?:утечки|запаха) газа/iu,
  },
  {
    code: "elevator_entrapment",
    positive:
      /person trapped|trapped in (?:the )?lift|elevator entrapment|asansörde.*(?:mahsur|sıkış)|aufzug.*(?:eingeschlossen|stecken)|лифт.*(?:застрял|заблокирован)|в лифте.*застр/iu,
  },
  {
    code: "medical_emergency",
    positive:
      /medical emergency|unconscious|not breathing|tıbbi acil|bilinci kapalı|nefes almıyor|medizinischer notfall|bewusstlos|atmet nicht|медицинская помощь|без сознания|не дышит/iu,
  },
  {
    code: "electrical_hazard",
    positive:
      /exposed live wire|electric shock|sparking cable|açık elektrik|elektrik çarp|kıvılcım|stromschlag|offene stromleitung|funken|оголенн.*провод|удар током|искр/iu,
  },
  {
    code: "flooding_active",
    positive:
      /active flooding|rapidly flooding|su basıyor|aktif sel|akut.*überflut|wasser strömt|затапливает|сильн.*потоп/iu,
  },
  {
    code: "security_threat",
    positive:
      /weapon|armed threat|violent attack|silah|silahlı|şiddetli saldırı|waffe|bewaffnet|gewalttätiger angriff|оружие|вооружен|нападение/iu,
  },
  {
    code: "life_safety",
    positive: /immediate danger to life|hayati tehlike|akute lebensgefahr|угроза жизни/iu,
  },
]

export function classifyPublicReportSafety(text: string): PublicReportSafetyResult {
  const normalized = text.normalize("NFKC").toLocaleLowerCase()
  const rule = safetyRules.find(
    ({ positive, negative }) => positive.test(normalized) && !negative?.test(normalized)
  )
  const code = rule?.code ?? null
  return {
    code,
    requiresEmergencyCall: code !== null,
    emergencyNumber: code === null ? null : "112",
    autoActionAuthorized: false,
    policyVersion: "public-report-safety-2026-07-v1",
  }
}

export class PublicReportWorkflowError extends Error {
  constructor(status: PublicReportStatus, action: PublicReportReviewAction) {
    super(`Public report cannot transition from ${status} using ${action}.`)
    this.name = "PublicReportWorkflowError"
  }
}

const transitions: Readonly<
  Partial<Record<PublicReportStatus, Partial<Record<PublicReportReviewAction, PublicReportStatus>>>>
> = {
  submitted: { start_review: "under_review" },
  under_review: {
    request_information: "awaiting_information",
    reject: "rejected",
    convert: "converted",
  },
  awaiting_information: { start_review: "under_review" },
}

export function decidePublicReportTransition(
  status: PublicReportStatus,
  action: PublicReportReviewAction
): PublicReportStatus {
  const next = transitions[status]?.[action]
  if (!next) throw new PublicReportWorkflowError(status, action)
  return next
}

export function isPublicReportLocale(value: unknown): value is PublicReportLocale {
  return (
    typeof value === "string" &&
    (PUBLIC_REPORT_LOCALES as readonly string[]).includes(value)
  )
}

export function isPublicReportCategory(value: unknown): value is PublicReportCategory {
  return (
    typeof value === "string" &&
    (PUBLIC_REPORT_CATEGORIES as readonly string[]).includes(value)
  )
}

export function isPublicReportReviewAction(value: unknown): value is PublicReportReviewAction {
  return (
    typeof value === "string" &&
    (PUBLIC_REPORT_REVIEW_ACTIONS as readonly string[]).includes(value)
  )
}

export function isPublicReportPlacementAction(value: unknown): value is PublicReportPlacementAction {
  return (
    typeof value === "string" &&
    (PUBLIC_REPORT_PLACEMENT_ACTIONS as readonly string[]).includes(value)
  )
}

export interface PublicReportPlacement {
  siteLabel: string
  zoneCode: string
  zoneLabels: Partial<Record<PublicReportLocale, string>>
  active: boolean
}

export interface PublicReportSubmission {
  qrToken: string
  category: PublicReportCategory
  description: string
  locationDetail: string | null
  language: PublicReportLocale
  contactKind: "email" | "phone" | null
  contactValue: string | null
  consent: true
  consentLocale: PublicReportLocale
  safetyAcknowledged: boolean
  companyWebsite: string
}

export interface PublicReportReceipt {
  reference: string
  trackingToken: string
  status: PublicReportStatus
  version: number
  safetyCode: PublicReportSafetyCode | null
  replayed: boolean
}

export interface PublicReportStatusEntry {
  status: PublicReportStatus
  message: string
  at: string
}

export interface PublicReportTrackingStatus {
  reference: string
  status: PublicReportStatus
  version: number
  message: string
  safetyCode: PublicReportSafetyCode | null
  createdAt: string
  updatedAt: string
  nextStep: string
  history: PublicReportStatusEntry[]
}

export interface PublicReportManagerRecord {
  id: string
  reference: string
  siteId: string
  siteLabel: string
  zoneCode: string
  zoneLabels: Partial<Record<PublicReportLocale, string>>
  category: PublicReportCategory
  locationDetail: string | null
  description: string
  contactKind: "email" | "phone" | null
  contactValue: string | null
  language: PublicReportLocale
  safetyCode: PublicReportSafetyCode | null
  status: PublicReportStatus
  version: number
  publicMessage: string
  internalReason: string | null
  possibleDuplicateReference: string | null
  convertedTicketId: string | null
  consentVersion: string
  retentionDueAt: string
  createdAt: string
  updatedAt: string
  events: Array<{
    eventType: string
    version: number
    publicMessage: string
    internalReason: string | null
    actorRole: string | null
    createdAt: string
  }>
}

export interface PublicReportPlacementAdmin extends PublicReportPlacement {
  id: string
  siteId: string
  publicCode: string
  validUntil: string | null
}

export interface PublicReportReviewData {
  reports: PublicReportManagerRecord[]
  placements: PublicReportPlacementAdmin[]
  sites: Array<{ id: string; label: string }>
}
