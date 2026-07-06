import { NextResponse } from "next/server"
import {
  submitPublicReport,
  type PublicReportInput,
} from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

// Account-free "report an issue" channel for the New Level Premium landing page.
// Anyone can raise an observation about the grounds without logging in. Every
// report lands as an unverified queued triage item; it is write-only and never
// returns internal data. AI and automation must treat these as weak signals
// only, never as a basis for finance or access decisions.
const REPORT_CATEGORIES = [
  "cleaning",
  "technical",
  "security",
  "landscaping",
  "amenity",
  "noise",
  "other",
] as const
type ReportCategory = (typeof REPORT_CATEGORIES)[number]

function isCategory(value: unknown): value is ReportCategory {
  return typeof value === "string" && (REPORT_CATEGORIES as readonly string[]).includes(value)
}

function asString(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed || trimmed.length > max) return null
  return trimmed
}

export async function POST(request: Request) {
  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const category: ReportCategory = isCategory(body.category) ? body.category : "other"
  const zone = asString(body.zone, 80)
  const description = asString(body.description, 1200)
  if (!zone || !description) {
    return NextResponse.json(
      { error: "A location and a short description are required." },
      { status: 400 }
    )
  }
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "Consent is required to submit a report." },
      { status: 400 }
    )
  }

  const input: PublicReportInput = {
    category,
    zone,
    description,
    contact: asString(body.contact, 160),
    language: asString(body.language, 8),
    consent: true,
  }

  try {
    const result = await submitPublicReport(input)
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Report could not be submitted. Please try again." },
      { status: 500 }
    )
  }
}
