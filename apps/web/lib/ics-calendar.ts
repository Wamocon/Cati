/**
 * RFC 5545 helpers for the in-house, privacy-reduced calendar feed.
 *
 * This module deliberately has no Next.js, Supabase, Node-only, or browser-only
 * imports. Route handlers can use it on the server and Playwright can import the
 * pure serializer/parser directly.
 */

export const ISTANBUL_TIME_ZONE = "Europe/Istanbul"
export const DEFAULT_ICS_PROD_ID = "-//1Cati//Residential Operations Calendar//EN"
export const MAX_ICS_IMPORT_BYTES = 512_000
export const MAX_ICS_IMPORT_EVENTS = 500
export const MAX_ICS_UNFOLDED_LINE_BYTES = 32_768

export type CalendarLifecycleStatus =
  | "tentative"
  | "confirmed"
  | "cancelled"
  | "completed"

export interface PrivacyReducedCalendarEvent {
  uid: string
  sequence: number
  startsAt: string | Date
  endsAt: string | Date
  updatedAt: string | Date
  createdAt?: string | Date
  status: CalendarLifecycleStatus
  /** A facility/resource label only. Never pass a resident, guest, or unit name. */
  resourceLabel: string
}

export interface PrivacyReducedCalendarOptions {
  calendarName: string
  events: readonly PrivacyReducedCalendarEvent[]
  generatedAt?: string | Date
  productId?: string
  genericDescription?: string
}

export type IcsImportClassification =
  | "new"
  | "duplicate"
  | "update"
  | "stale"
  | "conflict"
  | "cancelled"
  | "invalid"

export interface ParsedIcsEvent {
  uid: string
  recurrenceId: string | null
  sequence: number
  startsAt: string | null
  endsAt: string | null
  updatedAt: string | null
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED"
  summary: string
  canonicalKey: string
  errors: string[]
}

export interface KnownCalendarEvent {
  uid: string
  recurrenceId?: string | null
  sequence: number
  canonicalKey?: string
}

export interface IcsImportPreviewItem extends ParsedIcsEvent {
  classification: IcsImportClassification
  duplicateOfIndex: number | null
}

export interface IcsImportPreview {
  events: IcsImportPreviewItem[]
  totals: Record<IcsImportClassification, number>
  calendarName: string | null
  warnings: string[]
}

export interface CalendarImportRpcItem {
  externalUid: string
  occurrenceKey: string
  sequence: number
  startsAt: string | null
  endsAt: string | null
  status: "TENTATIVE" | "CONFIRMED" | "CANCELLED"
  contentDigest: string
}

export type IcsCalendarErrorCode =
  | "ICS_INPUT_INVALID"
  | "ICS_INPUT_TOO_LARGE"
  | "ICS_EVENT_LIMIT_EXCEEDED"
  | "ICS_DATE_INVALID"
  | "ICS_TIMEZONE_UNSUPPORTED"
  | "ICS_TOKEN_INVALID"

export class IcsCalendarError extends Error {
  constructor(
    readonly code: IcsCalendarErrorCode,
    message: string
  ) {
    super(message)
    this.name = "IcsCalendarError"
  }
}

const textEncoder = new TextEncoder()
const ISTANBUL_PARTS_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: ISTANBUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})

function byteLength(value: string): number {
  return textEncoder.encode(value).byteLength
}

function asValidDate(value: string | Date, label: string): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (!Number.isFinite(date.getTime())) {
    throw new IcsCalendarError("ICS_DATE_INVALID", label + " must be a valid date.")
  }
  return date
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, "0")
}

function datePartsInIstanbul(date: Date): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of ISTANBUL_PARTS_FORMATTER.formatToParts(date)) {
    if (part.type !== "literal") result[part.type] = part.value
  }
  return result
}

export function formatIcsUtc(value: string | Date): string {
  const date = asValidDate(value, "Calendar timestamp")
  return (
    pad(date.getUTCFullYear(), 4) +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  )
}

export function formatIcsIstanbulLocal(value: string | Date): string {
  const parts = datePartsInIstanbul(asValidDate(value, "Calendar timestamp"))
  return (
    parts.year +
    parts.month +
    parts.day +
    "T" +
    parts.hour +
    parts.minute +
    parts.second
  )
}

/** Removes control characters and applies RFC 5545 TEXT escaping. */
export function escapeIcsText(value: string, maxCharacters = 512): string {
  const normalized = value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, maxCharacters)

  return normalized
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
}

export function unescapeIcsText(value: string): string {
  let output = ""
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (character !== "\\" || index + 1 >= value.length) {
      output += character
      continue
    }

    const escaped = value[index + 1]
    if (escaped === "n" || escaped === "N") output += "\n"
    else if (escaped === "\\" || escaped === ";" || escaped === ",") output += escaped
    else output += escaped
    index += 1
  }
  return output
}

/** Folds a content line at 75 UTF-8 octets, including continuation whitespace. */
export function foldIcsLine(line: string): string {
  if (byteLength(line) <= 75) return line

  const physicalLines: string[] = []
  let current = ""

  for (const character of line) {
    if (byteLength(current + character) <= 75) {
      current += character
      continue
    }

    if (current.length > 0) physicalLines.push(current)
    current = " " + character
  }

  if (current.length > 0) physicalLines.push(current)
  return physicalLines.join("\r\n")
}

export function unfoldIcsLines(input: string): string[] {
  const normalized = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  return normalized.replace(/\n[ \t]/g, "").split("\n")
}

function normalizedUid(uid: string): string {
  const value = uid
    .normalize("NFC")
    .replace(/[\r\n\u0000-\u001f\u007f]/g, "")
    .trim()
  if (!value || value.length > 255) {
    throw new IcsCalendarError("ICS_INPUT_INVALID", "Calendar UID must contain 1 to 255 characters.")
  }
  return value
}

function normalizedSequence(sequence: number): number {
  if (!Number.isSafeInteger(sequence) || sequence < 0 || sequence > 2_147_483_647) {
    throw new IcsCalendarError("ICS_INPUT_INVALID", "Calendar SEQUENCE must be a non-negative integer.")
  }
  return sequence
}

function icsStatus(status: CalendarLifecycleStatus): "TENTATIVE" | "CONFIRMED" | "CANCELLED" {
  if (status === "tentative") return "TENTATIVE"
  if (status === "cancelled") return "CANCELLED"
  return "CONFIRMED"
}

function serializeEvent(event: PrivacyReducedCalendarEvent, generatedAt: Date, description: string): string[] {
  const startsAt = asValidDate(event.startsAt, "Event start")
  const endsAt = asValidDate(event.endsAt, "Event end")
  const updatedAt = asValidDate(event.updatedAt, "Event update timestamp")
  const createdAt = event.createdAt ? asValidDate(event.createdAt, "Event creation timestamp") : updatedAt
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw new IcsCalendarError("ICS_DATE_INVALID", "Calendar event end must be after start.")
  }

  const status = icsStatus(event.status)
  const resource = event.resourceLabel.trim() || "Shared facility"
  const summary = status === "CANCELLED" ? "Cancelled reservation - " + resource : "Reservation - " + resource

  return [
    "BEGIN:VEVENT",
    "UID:" + escapeIcsText(normalizedUid(event.uid), 255),
    "DTSTAMP:" + formatIcsUtc(generatedAt),
    "CREATED:" + formatIcsUtc(createdAt),
    "LAST-MODIFIED:" + formatIcsUtc(updatedAt),
    "SEQUENCE:" + normalizedSequence(event.sequence),
    "DTSTART;TZID=" + ISTANBUL_TIME_ZONE + ":" + formatIcsIstanbulLocal(startsAt),
    "DTEND;TZID=" + ISTANBUL_TIME_ZONE + ":" + formatIcsIstanbulLocal(endsAt),
    "SUMMARY:" + escapeIcsText(summary, 240),
    "DESCRIPTION:" + escapeIcsText(description, 500),
    "STATUS:" + status,
    "TRANSP:" + (status === "CANCELLED" ? "TRANSPARENT" : "OPAQUE"),
    "X-1CATI-STATE:" + event.status.toUpperCase(),
    "END:VEVENT",
  ]
}

/**
 * Serializes only privacy-reduced fields. Guest names, unit numbers, notes,
 * identity data, payment/deposit details, and access credentials are not part
 * of this contract and therefore cannot accidentally enter the feed.
 */
export function serializePrivacyReducedCalendar(options: PrivacyReducedCalendarOptions): string {
  const generatedAt = asValidDate(options.generatedAt ?? new Date(), "Calendar generation timestamp")
  const calendarName = options.calendarName.trim() || "1Cati reservations"
  const productId = (options.productId ?? DEFAULT_ICS_PROD_ID)
    .replace(/[\r\n\u0000-\u001f\u007f]/g, "")
    .slice(0, 255)
  const description = options.genericDescription?.trim() || "Open 1Cati while online for current operational details."

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "PRODID:" + productId,
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:" + escapeIcsText(calendarName, 160),
    "X-WR-TIMEZONE:" + ISTANBUL_TIME_ZONE,
    "BEGIN:VTIMEZONE",
    "TZID:" + ISTANBUL_TIME_ZONE,
    "X-LIC-LOCATION:" + ISTANBUL_TIME_ZONE,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0300",
    "TZNAME:TRT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ]

  const events = [...options.events].sort((left, right) => {
    const uidOrder = left.uid.localeCompare(right.uid)
    return uidOrder === 0 ? left.sequence - right.sequence : uidOrder
  })
  for (const event of events) lines.push(...serializeEvent(event, generatedAt, description))
  lines.push("END:VCALENDAR")

  return lines.map(foldIcsLine).join("\r\n") + "\r\n"
}

function encodeBase64Url(bytes: Uint8Array): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  let output = ""
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index]
    const second = index + 1 < bytes.length ? bytes[index + 1] : 0
    const third = index + 2 < bytes.length ? bytes[index + 2] : 0
    const combined = (first << 16) | (second << 8) | third
    output += alphabet[(combined >>> 18) & 63]
    output += alphabet[(combined >>> 12) & 63]
    if (index + 1 < bytes.length) output += alphabet[(combined >>> 6) & 63]
    if (index + 2 < bytes.length) output += alphabet[combined & 63]
  }
  return output
}

function webCrypto(): Crypto {
  if (typeof globalThis.crypto === "undefined" || !globalThis.crypto.subtle) {
    throw new IcsCalendarError("ICS_TOKEN_INVALID", "Web Crypto is unavailable in this runtime.")
  }
  return globalThis.crypto
}

export function generateOpaqueFeedToken(byteCount = 32): string {
  if (!Number.isSafeInteger(byteCount) || byteCount < 32 || byteCount > 64) {
    throw new IcsCalendarError("ICS_TOKEN_INVALID", "Feed tokens must contain 32 to 64 random bytes.")
  }
  const bytes = new Uint8Array(byteCount)
  webCrypto().getRandomValues(bytes)
  return encodeBase64Url(bytes)
}

export function assertOpaqueFeedToken(token: string): string {
  const normalized = token.trim()
  if (!/^[A-Za-z0-9_-]{43,86}$/.test(normalized)) {
    throw new IcsCalendarError("ICS_TOKEN_INVALID", "Feed token format is invalid.")
  }
  return normalized
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await webCrypto().subtle.digest("SHA-256", textEncoder.encode(value))
  return Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("")
}

export async function digestOpaqueFeedToken(token: string): Promise<string> {
  return sha256Hex(assertOpaqueFeedToken(token))
}

export function opaqueFeedTokenHint(token: string): string {
  const value = assertOpaqueFeedToken(token)
  return value.slice(0, 6) + "..." + value.slice(-4)
}

interface ContentLine {
  name: string
  parameters: Record<string, string>
  value: string
}

function splitHeader(header: string): string[] {
  const parts: string[] = []
  let current = ""
  let quoted = false
  for (const character of header) {
    if (character === '"') quoted = !quoted
    if (character === ";" && !quoted) {
      parts.push(current)
      current = ""
    } else {
      current += character
    }
  }
  parts.push(current)
  return parts
}

function parseContentLine(line: string): ContentLine | null {
  const colon = line.indexOf(":")
  if (colon <= 0) return null
  const headerParts = splitHeader(line.slice(0, colon))
  const name = (headerParts.shift() ?? "").trim().toUpperCase()
  if (!name) return null
  const parameters: Record<string, string> = {}
  for (const parameter of headerParts) {
    const equals = parameter.indexOf("=")
    if (equals <= 0) continue
    const key = parameter.slice(0, equals).trim().toUpperCase()
    const value = parameter.slice(equals + 1).trim().replace(/^"|"$/g, "")
    if (key) parameters[key] = value
  }
  return { name, parameters, value: line.slice(colon + 1) }
}

function parseCompactParts(value: string): {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
} | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?$/.exec(value)
  if (!match) return null
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4] ?? 0),
    minute: Number(match[5] ?? 0),
    second: Number(match[6] ?? 0),
  }
}

function partsAtInstant(date: Date, timeZone: string): number[] {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
  const values: Record<string, number> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== "literal") values[part.type] = Number(part.value)
  }
  return [values.year, values.month, values.day, values.hour, values.minute, values.second]
}

function zonedPartsToUtc(parts: ReturnType<typeof parseCompactParts>, timeZone: string): Date | null {
  if (!parts) return null
  const desired = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  let candidate = desired
  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const actual = partsAtInstant(new Date(candidate), timeZone)
      const actualAsUtc = Date.UTC(actual[0], actual[1] - 1, actual[2], actual[3], actual[4], actual[5])
      const adjustment = desired - actualAsUtc
      candidate += adjustment
      if (adjustment === 0) break
    }
  } catch {
    throw new IcsCalendarError("ICS_TIMEZONE_UNSUPPORTED", "Unsupported calendar timezone: " + timeZone)
  }
  const result = new Date(candidate)
  return Number.isFinite(result.getTime()) ? result : null
}

function parseIcsDateValue(value: string, parameters: Record<string, string>): string | null {
  const trimmed = value.trim()
  if (/^\d{8}T\d{6}Z$/.test(trimmed)) {
    const parts = parseCompactParts(trimmed.slice(0, -1))
    if (!parts) return null
    return new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
    ).toISOString()
  }

  const offsetMatch = /^(\d{8}T\d{6})([+-])(\d{2})(\d{2})$/.exec(trimmed)
  if (offsetMatch) {
    const parts = parseCompactParts(offsetMatch[1])
    if (!parts) return null
    const direction = offsetMatch[2] === "+" ? 1 : -1
    const offsetMinutes = direction * (Number(offsetMatch[3]) * 60 + Number(offsetMatch[4]))
    return new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
        offsetMinutes * 60_000
    ).toISOString()
  }

  const timeZone = parameters.TZID || ISTANBUL_TIME_ZONE
  const date = zonedPartsToUtc(parseCompactParts(trimmed), timeZone)
  return date?.toISOString() ?? null
}

function firstLineValue(lines: readonly ContentLine[], name: string): ContentLine | null {
  return lines.find((line) => line.name === name) ?? null
}

export function canonicalImportEventKey(event: {
  startsAt: string | null
  endsAt: string | null
  status: string
  summary: string
}): string {
  return [event.startsAt ?? "", event.endsAt ?? "", event.status, event.summary.trim()].join("|")
}

function parseEvent(lines: readonly ContentLine[]): ParsedIcsEvent {
  const errors: string[] = []
  const uidLine = firstLineValue(lines, "UID")
  const sequenceLine = firstLineValue(lines, "SEQUENCE")
  const startLine = firstLineValue(lines, "DTSTART")
  const endLine = firstLineValue(lines, "DTEND")
  const updatedLine = firstLineValue(lines, "LAST-MODIFIED") ?? firstLineValue(lines, "DTSTAMP")
  const statusLine = firstLineValue(lines, "STATUS")
  const summaryLine = firstLineValue(lines, "SUMMARY")
  const recurrenceLine = firstLineValue(lines, "RECURRENCE-ID")

  const uid = uidLine ? unescapeIcsText(uidLine.value).trim().slice(0, 255) : ""
  if (!uid) errors.push("UID is required.")

  const sequence = sequenceLine ? Number(sequenceLine.value.trim()) : 0
  if (!Number.isSafeInteger(sequence) || sequence < 0) errors.push("SEQUENCE must be a non-negative integer.")

  const startsAt = startLine ? parseIcsDateValue(startLine.value, startLine.parameters) : null
  const endsAt = endLine ? parseIcsDateValue(endLine.value, endLine.parameters) : null
  if (!startsAt) errors.push("DTSTART is missing or invalid.")
  if (!endsAt) errors.push("DTEND is missing or invalid.")
  if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    errors.push("DTEND must be after DTSTART.")
  }

  const rawStatus = statusLine?.value.trim().toUpperCase() ?? "CONFIRMED"
  const status =
    rawStatus === "CANCELLED" ? "CANCELLED" : rawStatus === "TENTATIVE" ? "TENTATIVE" : "CONFIRMED"
  const summary = unescapeIcsText(summaryLine?.value ?? "").trim().slice(0, 240)
  const recurrenceId = recurrenceLine
    ? parseIcsDateValue(recurrenceLine.value, recurrenceLine.parameters) ?? recurrenceLine.value.slice(0, 64)
    : null
  const updatedAt = updatedLine ? parseIcsDateValue(updatedLine.value, updatedLine.parameters) : null
  const canonicalKey = canonicalImportEventKey({ startsAt, endsAt, status, summary })

  return {
    uid,
    recurrenceId,
    sequence: Number.isSafeInteger(sequence) && sequence >= 0 ? sequence : 0,
    startsAt,
    endsAt,
    updatedAt,
    status,
    summary,
    canonicalKey,
    errors,
  }
}

function eventIdentity(uid: string, recurrenceId: string | null | undefined): string {
  return uid + "\u0000" + (recurrenceId ?? "")
}

export function previewIcsImport(
  input: string,
  knownEvents: readonly KnownCalendarEvent[] = []
): IcsImportPreview {
  if (typeof input !== "string" || !input.trim()) {
    throw new IcsCalendarError("ICS_INPUT_INVALID", "Calendar input is empty.")
  }
  if (byteLength(input) > MAX_ICS_IMPORT_BYTES) {
    throw new IcsCalendarError("ICS_INPUT_TOO_LARGE", "Calendar input exceeds 512000 bytes.")
  }

  const unfolded = unfoldIcsLines(input)
  const warnings: string[] = []
  let calendarName: string | null = null
  let inEvent = false
  let eventLines: ContentLine[] = []
  const parsedEvents: ParsedIcsEvent[] = []

  for (const rawLine of unfolded) {
    if (byteLength(rawLine) > MAX_ICS_UNFOLDED_LINE_BYTES) {
      throw new IcsCalendarError("ICS_INPUT_TOO_LARGE", "An unfolded calendar line is too large.")
    }
    if (!rawLine) continue
    const line = parseContentLine(rawLine)
    if (!line) {
      if (inEvent) warnings.push("An invalid content line was ignored inside VEVENT.")
      continue
    }
    if (line.name === "X-WR-CALNAME" && !calendarName) {
      calendarName = unescapeIcsText(line.value).trim().slice(0, 160) || null
    }
    if (line.name === "BEGIN" && line.value.trim().toUpperCase() === "VEVENT") {
      if (inEvent) warnings.push("Nested VEVENT was ignored.")
      inEvent = true
      eventLines = []
      continue
    }
    if (line.name === "END" && line.value.trim().toUpperCase() === "VEVENT") {
      if (inEvent) parsedEvents.push(parseEvent(eventLines))
      inEvent = false
      eventLines = []
      if (parsedEvents.length > MAX_ICS_IMPORT_EVENTS) {
        throw new IcsCalendarError(
          "ICS_EVENT_LIMIT_EXCEEDED",
          "Calendar input contains more than " + MAX_ICS_IMPORT_EVENTS + " events."
        )
      }
      continue
    }
    if (inEvent) {
      if (["ATTACH", "URL", "ATTENDEE", "ORGANIZER"].includes(line.name)) {
        warnings.push(line.name + " was omitted from the privacy-reduced preview.")
        continue
      }
      eventLines.push(line)
    }
  }
  if (inEvent) warnings.push("An unterminated VEVENT was ignored.")

  const knownByIdentity = new Map(
    knownEvents.map((event) => [eventIdentity(event.uid, event.recurrenceId), event] as const)
  )
  const seen = new Map<string, number>()
  const events: IcsImportPreviewItem[] = parsedEvents.map((event, index) => {
    const identity = eventIdentity(event.uid, event.recurrenceId)
    const duplicateOfIndex = seen.get(identity) ?? null
    if (!seen.has(identity)) seen.set(identity, index)
    const known = knownByIdentity.get(identity)

    let classification: IcsImportClassification
    if (event.errors.length > 0) classification = "invalid"
    else if (duplicateOfIndex !== null) classification = "duplicate"
    else if (!known) classification = event.status === "CANCELLED" ? "cancelled" : "new"
    else if (event.sequence < known.sequence) classification = "stale"
    else if (event.sequence > known.sequence) {
      classification = event.status === "CANCELLED" ? "cancelled" : "update"
    } else if (!known.canonicalKey || known.canonicalKey === event.canonicalKey) {
      classification = "duplicate"
    } else {
      classification = "conflict"
    }

    return { ...event, classification, duplicateOfIndex }
  })

  const totals: Record<IcsImportClassification, number> = {
    new: 0,
    duplicate: 0,
    update: 0,
    stale: 0,
    conflict: 0,
    cancelled: 0,
    invalid: 0,
  }
  for (const event of events) totals[event.classification] += 1
  return { events, totals, calendarName, warnings: [...new Set(warnings)] }
}

/**
 * Maps an in-memory preview to the bounded database contract. Summary text is
 * represented only by its canonical digest, so imported names or notes never
 * enter preview persistence.
 */
export async function toCalendarImportRpcItems(
  preview: IcsImportPreview
): Promise<CalendarImportRpcItem[]> {
  return Promise.all(
    preview.events.map(async (event) => ({
      externalUid: event.uid,
      occurrenceKey: event.recurrenceId ?? "",
      sequence: event.sequence,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      status: event.status,
      contentDigest: await sha256Hex(event.canonicalKey),
    }))
  )
}
