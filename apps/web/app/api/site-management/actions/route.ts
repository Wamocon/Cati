import { NextRequest, NextResponse } from "next/server"
import {
  type ClientActionInput,
  logClientAction,
} from "@/lib/site-management-repository"

export const dynamic = "force-dynamic"

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    )
  }

  const payload = asRecord(body)
  const actionType = asString(payload.actionType)

  if (!actionType || actionType.length > 120) {
    return NextResponse.json(
      { error: "A valid actionType is required." },
      { status: 400 }
    )
  }

  const input: ClientActionInput = {
    actionType,
    entityTable: asString(payload.entityTable),
    entityId: asString(payload.entityId),
    entityExternalId: asString(payload.entityExternalId),
    title: asString(payload.title),
    metadata: asRecord(payload.metadata),
  }

  try {
    const result = await logClientAction(input)
    return NextResponse.json(result, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Action could not be logged." },
      { status: 500 }
    )
  }
}
