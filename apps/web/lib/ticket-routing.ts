export type EmergencyPolicyCode =
  | "life_safety"
  | "fire_smoke"
  | "gas_leak"
  | "medical_emergency"
  | "electrical_hazard"
  | "elevator_entrapment"
  | "flooding_active"
  | "security_threat"

export type TicketRoute = {
  assignee: string
  role: "manager" | "staff"
  reason: string
  emergency: boolean
  emergencyPolicyCode: EmergencyPolicyCode | null
  confidence: "deterministic" | "reported" | "standard"
  autoDispatchAuthorized: false
}

interface EmergencyRule {
  pattern: RegExp
  negated: RegExp
  policyCode: EmergencyPolicyCode
  assignee: (typeof ticketAssigneeOptions)[number]
  reason: string
}

export const ticketAssigneeOptions = [
  "Operations triage queue",
  "Life-safety response queue",
  "Gas response queue",
  "Electrical response queue",
  "Elevator response queue",
  "Plumbing response queue",
  "Security response queue",
  "Cleaning queue",
  "Resident amenity response queue",
  "Restaurant and event response queue",
] as const

const emergencyRules: EmergencyRule[] = [
  {
    pattern: /\b(gas (?:smell|leak)|gaz (?:kokusu|kaçağı|kacagi)|gasgeruch|утечк[аи] газа)\b/i,
    negated: /\b(no|not|kein|keine|yok|değil|degil|нет)\b.{0,18}\b(gas|gaz|gasgeruch|газа)\b/i,
    policyCode: "gas_leak",
    assignee: "Gas response queue",
    reason: "Deterministic gas-leak safety rule",
  },
  {
    pattern: /\b(fire|flames?|active smoke|smoke alarm|yangın|yangin|alev|rauchmelder|пожар|дымовая сигнализация)\b/i,
    negated: /\b(no|not|kein|keine|yok|değil|degil|нет)\b.{0,18}\b(fire|flame|smoke|yangın|yangin|alev|rauch|пожар|дым)\b/i,
    policyCode: "fire_smoke",
    assignee: "Life-safety response queue",
    reason: "Deterministic fire or active-smoke safety rule",
  },
  {
    pattern: /\b(electric(?:al)? (?:spark|arc|shock|fire)|sparks? (?:at|from|near)|burning (?:panel|socket|wire)|exposed live wire|elektrik (?:kıvılcım|kivilcim|çarpması|carpmasi)|stromschlag|искрит|удар током)\b/i,
    negated: /\b(no|not|kein|keine|yok|değil|degil|нет)\b.{0,18}\b(spark|shock|burning|kıvılcım|kivilcim|stromschlag|искр|ток)\b/i,
    policyCode: "electrical_hazard",
    assignee: "Electrical response queue",
    reason: "Deterministic active-electrical-hazard rule",
  },
  {
    pattern: /\b(elevator|lift|asansör|asansor|aufzug|лифт)\b.{0,28}\b(trapped|entrapment|stuck between|person inside|mahsur|sıkış|sikis|eingeschlossen|застрял|заперт)\b|\b(trapped|mahsur|eingeschlossen|застрял)\b.{0,28}\b(elevator|lift|asansör|asansor|aufzug|лифт)\b/i,
    negated: /\b(no one|nobody|kimse|niemand|никто не)\b.{0,24}\b(trapped|mahsur|eingeschlossen|застрял)\b/i,
    policyCode: "elevator_entrapment",
    assignee: "Elevator response queue",
    reason: "Deterministic elevator-entrapment rule",
  },
  {
    pattern: /\b(active flood(?:ing)?|burst pipe|water pouring|rapid water leak|su basması|su basmasi|boru patladı|boru patladi|starke überflutung|rohrbruch|затопление|прорыв трубы)\b/i,
    negated: /\b(no|not|kein|keine|yok|değil|degil|нет)\b.{0,18}\b(flood|burst|pouring|su bas|rohrbruch|затоп|прорыв)\b/i,
    policyCode: "flooding_active",
    assignee: "Plumbing response queue",
    reason: "Deterministic active-flooding rule",
  },
  {
    pattern: /\b(weapon|armed intruder|break[- ]?in in progress|violent threat|silah|silahlı|silahli|zorla giriş|zorla giris|bewaffnet|einbruch im gange|вооружен|вторжение)\b/i,
    negated: /\b(no|not|kein|keine|yok|değil|degil|нет)\b.{0,18}\b(weapon|armed|intruder|silah|bewaffnet|вооруж)\b/i,
    policyCode: "security_threat",
    assignee: "Security response queue",
    reason: "Deterministic active-security-threat rule",
  },
  {
    pattern: /\b(unconscious|not breathing|severe bleeding|kalp krizi|nefes almıyor|nefes almiyor|bilinçsiz|bilincsiz|bewusstlos|atmet nicht|без сознания|не дышит)\b/i,
    negated: /\b(test message|training drill|false alarm|historical report|resolved earlier|test mesajı|tatbikat|yanlış alarm|probealarm|übungsfall|fehlalarm|учебная тревога|ложная тревога)\b/i,
    policyCode: "medical_emergency",
    assignee: "Life-safety response queue",
    reason: "Deterministic acute-medical-emergency rule",
  },
]

const benignMedicalStatements =
  /\b(not unconscious|conscious and (?:is )?breathing|breathing normally|no severe bleeding)\b/i
const explicitAcuteMedicalStatements =
  /\b(not breathing|kalp krizi|nefes almıyor|nefes almiyor|bewusstlos|atmet nicht|без сознания|не дышит)\b/i

const affirmedLiveIncident =
  /\b(?:this is\s+)?not\s+(?:a\s+)?(?:drill|test|false alarm)\b/i
const explicitSimulationStatement =
  /\b(?:training\s+)?drill\b|\b(?:gas|fire|smoke|alarm)(?:\s+leak)?\s+test\b|\btest message\b|\bfalse alarm\b|\bhistorical report\b|\bresolved earlier\b/i
const fireSmokeDeviceMaintenance =
  /\b(?:smoke|fire)\s+(?:alarm|detector)\b.{0,48}\b(?:battery\s+(?:is\s+)?low|low battery|replace(?:ment)?|maintenance|service|inspection|test)\b|\b(?:battery\s+(?:is\s+)?low|low battery|replace(?:ment)?|maintenance|service|inspection|test)\b.{0,48}\b(?:smoke|fire)\s+(?:alarm|detector)\b/i
const activeFireSmokeEvidence =
  /\b(?:(?:active|visible|heavy)\s+smoke|smoke\s+(?:coming|pouring|detected)|flames?|alarm\s+(?:is\s+)?(?:sounding|active|activated)|fire\s+(?:now|in progress|burning))\b/i

function isEmergencyRuleNegated(rule: EmergencyRule, clause: string) {
  // "Not a drill" affirms a live report. Remove only that phrase so a later
  // direct statement such as "no gas leak" still correctly negates the rule.
  const normalizedClause = clause.replace(affirmedLiveIncident, " ")
  if (explicitSimulationStatement.test(normalizedClause)) return true
  if (
    rule.policyCode === "fire_smoke" &&
    fireSmokeDeviceMaintenance.test(normalizedClause) &&
    !activeFireSmokeEvidence.test(normalizedClause)
  ) {
    return true
  }
  if (rule.negated.test(normalizedClause)) return true
  if (
    rule.policyCode !== "medical_emergency" ||
    !benignMedicalStatements.test(normalizedClause)
  ) {
    return false
  }
  if (explicitAcuteMedicalStatements.test(normalizedClause)) return false
  return !(
    /\bsevere bleeding\b/i.test(normalizedClause) &&
    !/\bno severe bleeding\b/i.test(normalizedClause)
  )
}

const standardRoutes: Array<{
  pattern: RegExp
  assignee: (typeof ticketAssigneeOptions)[number]
  role: TicketRoute["role"]
  reason: string
}> = [
  { pattern: /pool|spa|fitness|havuz|wellness/i, assignee: "Resident amenity response queue", role: "staff", reason: "Resident amenity capability queue" },
  { pattern: /restaurant|food|event|theatre|crowd|restoran|yemek|etkinlik|tiyatro/i, assignee: "Restaurant and event response queue", role: "staff", reason: "Restaurant and event capability queue" },
  { pattern: /elevator|lift|asansör|asansor|aufzug|лифт/i, assignee: "Elevator response queue", role: "staff", reason: "Elevator capability queue" },
  { pattern: /electric|elektrik|power|strom|электр/i, assignee: "Electrical response queue", role: "staff", reason: "Electrical capability queue" },
  { pattern: /water|plumb|pipe|toilet|sewer|su |tesisat|wasser|канализ|вод/i, assignee: "Plumbing response queue", role: "staff", reason: "Plumbing capability queue" },
  { pattern: /security|access|lock|door|gate|güvenlik|guvenlik|kapı|kapi|sicherheit|доступ|двер/i, assignee: "Security response queue", role: "staff", reason: "Security and access capability queue" },
  { pattern: /clean|temiz|reinig|уборк/i, assignee: "Cleaning queue", role: "staff", reason: "Cleaning capability queue" },
]

export function resolveTicketRoute(input: {
  title: string
  description?: string | null
  category?: string
  priority?: string
}): TicketRoute {
  const content = [input.title, input.description, input.category]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .join(". ")
  const emergencyClauses = content
    .split(/[.!?;:\r\n]+/)
    .map((clause) => clause.trim())
    .filter(Boolean)
  const emergencyRule = emergencyRules.find(
    (rule) =>
      emergencyClauses.some(
        (clause) => rule.pattern.test(clause) && !isEmergencyRuleNegated(rule, clause)
      )
  )
  if (emergencyRule) {
    return {
      assignee: emergencyRule.assignee,
      role: "manager",
      reason: emergencyRule.reason,
      emergency: true,
      emergencyPolicyCode: emergencyRule.policyCode,
      confidence: "deterministic",
      autoDispatchAuthorized: false,
    }
  }

  const standardRoute = standardRoutes.find(({ pattern }) => pattern.test(content))
  if (standardRoute) {
    return {
      ...standardRoute,
      emergency: false,
      emergencyPolicyCode: null,
      confidence: input.priority === "urgent" ? "reported" : "standard",
      autoDispatchAuthorized: false,
    }
  }

  return {
    assignee: "Operations triage queue",
    role: "manager",
    reason: input.priority === "urgent"
      ? "Urgency reported; human triage required"
      : "Standard operations triage",
    emergency: false,
    emergencyPolicyCode: null,
    confidence: input.priority === "urgent" ? "reported" : "standard",
    autoDispatchAuthorized: false,
  }
}

export function isTicketAssignee(
  value: string | null
): value is (typeof ticketAssigneeOptions)[number] {
  return Boolean(
    value && ticketAssigneeOptions.includes(value as (typeof ticketAssigneeOptions)[number])
  )
}
