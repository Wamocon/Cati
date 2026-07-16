import { NextRequest, NextResponse } from "next/server"
import { getUserProfile } from "@/lib/auth"
import {
  MoveHandoverRepositoryError,
  addMoveHandoverEvidence,
  cancelMoveHandover,
  createMoveHandover,
  createMoveHandoverTurnover,
  getMoveHandoverWorkspace,
  linkMoveHandoverDeposit,
  prepareMoveHandoverAccess,
  recordMoveHandoverCondition,
  recordMoveHandoverMeter,
  rescheduleMoveHandover,
  transitionMoveHandover,
  updateMoveHandoverChecklist,
  type MoveHandoverAccessTruthState,
  type MoveHandoverAccessType,
  type MoveHandoverAppointmentKind,
  type MoveHandoverChecklistStatus,
  type MoveHandoverConditionState,
  type MoveHandoverEvidenceType,
  type MoveHandoverMeterType,
  type MoveHandoverTransition,
  type MoveHandoverWorkType,
} from "@/lib/move-handover-repository"
import { hasAnyPermission } from "@/lib/rbac"

export const dynamic = "force-dynamic"

type JsonRecord = Record<string, unknown>
class InvalidRequest extends Error {}
function record(value: unknown): JsonRecord { if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidRequest("body"); return value as JsonRecord }
function string(value: unknown, field: string) { if (typeof value !== "string" || !value.trim()) throw new InvalidRequest(field); return value.trim() }
function optional(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null }
function integer(value: unknown, field: string, minimum = 1) { if (!Number.isSafeInteger(value) || Number(value) < minimum) throw new InvalidRequest(field); return Number(value) }
function numeric(value: unknown, field: string) { if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidRequest(field); return value }
function bool(value: unknown, field: string) { if (typeof value !== "boolean") throw new InvalidRequest(field); return value }
function oneOf<T extends string>(value: unknown, values: readonly T[], field: string): T { if (typeof value !== "string" || !values.includes(value as T)) throw new InvalidRequest(field); return value as T }
function idempotency(request: NextRequest) { const value = request.headers.get("Idempotency-Key")?.trim(); if (!value || value.length < 8 || value.length > 200) throw new InvalidRequest("idempotencyKey"); return value }
function json(value: unknown, status = 200) { const response = NextResponse.json(value, { status }); response.headers.set("Cache-Control", "no-store, private"); return response }
function errorResponse(error: unknown) {
  if (error instanceof InvalidRequest || error instanceof SyntaxError) return json({ error: { code: "MOVE_HANDOVER_REQUEST_INVALID", messageKey: "handover.requestInvalid", field: error.message } }, 400)
  if (error instanceof MoveHandoverRepositoryError) return json({ error: { code: error.code, messageKey: `handover.${error.code}` } }, error.status)
  return json({ error: { code: "MOVE_HANDOVER_UNEXPECTED", messageKey: "handover.unavailable" } }, 500)
}
function allowed(role: Parameters<typeof hasAnyPermission>[0], action: string) {
  if (action === "deposit.link") return hasAnyPermission(role, "finance", ["update", "approve", "manage"])
  if (action === "evidence") {
    return hasAnyPermission(role, "calendar", ["update", "manage"]) && hasAnyPermission(role, "documents", ["create", "update", "manage"])
  }
  if (["meter", "condition"].includes(action)) return hasAnyPermission(role, "calendar", ["update", "manage"])
  if (["transition", "checklist", "access.prepare", "turnover.create"].includes(action)) return hasAnyPermission(role, "calendar", ["update", "manage"])
  if (["create", "reschedule", "cancel"].includes(action)) return hasAnyPermission(role, "calendar", ["create", "update", "manage"])
  return false
}

export async function GET(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return json({ error: { code: "MOVE_HANDOVER_AUTH_REQUIRED", messageKey: "handover.authRequired" } }, 401)
  if (!hasAnyPermission(profile.role, "calendar", ["view"]) && !hasAnyPermission(profile.role, "finance", ["view"])) return json({ error: { code: "MOVE_HANDOVER_FORBIDDEN", messageKey: "handover.forbidden" } }, 403)
  try { return json(await getMoveHandoverWorkspace(request.nextUrl.searchParams.get("siteId"))) } catch (error) { return errorResponse(error) }
}

export async function POST(request: NextRequest) {
  const profile = await getUserProfile()
  if (!profile) return json({ error: { code: "MOVE_HANDOVER_AUTH_REQUIRED", messageKey: "handover.authRequired" } }, 401)
  try {
    const body = record(await request.json()); const action = string(body.action, "action")
    if (!allowed(profile.role, action)) return json({ error: { code: "MOVE_HANDOVER_FORBIDDEN", messageKey: "handover.forbidden" } }, 403)
    const key = idempotency(request)
    if (action === "create") {
      const kinds: readonly MoveHandoverAppointmentKind[] = ["move_in", "move_out", "handover"]
      return json(await createMoveHandover({ reservationId: string(body.reservationId, "reservationId"), relationshipId: string(body.relationshipId, "relationshipId"), appointmentKind: oneOf(body.appointmentKind, kinds, "appointmentKind"), idempotencyKey: key }), 201)
    }
    const appointmentId = string(body.appointmentId, "appointmentId"); const expectedVersion = integer(body.expectedVersion, "expectedVersion")
    if (action === "reschedule") return json(await rescheduleMoveHandover({ appointmentId, expectedVersion, startsAt: string(body.startsAt, "startsAt"), endsAt: string(body.endsAt, "endsAt"), reason: string(body.reason, "reason"), idempotencyKey: key }))
    if (action === "cancel") return json(await cancelMoveHandover({ appointmentId, expectedVersion, reason: string(body.reason, "reason"), idempotencyKey: key }))
    if (action === "transition") {
      const values: readonly MoveHandoverTransition[] = ["prepare", "mark_ready", "start", "complete"]
      return json(await transitionMoveHandover({ appointmentId, expectedVersion, transition: oneOf(body.transition, values, "transition"), reason: optional(body.reason), idempotencyKey: key }))
    }
    if (action === "checklist") {
      const values: readonly MoveHandoverChecklistStatus[] = ["pending", "completed", "blocked", "not_applicable"]
      return json(await updateMoveHandoverChecklist({ appointmentId, expectedVersion, itemCode: string(body.itemCode, "itemCode"), status: oneOf(body.status, values, "status"), notes: optional(body.notes), idempotencyKey: key }))
    }
    if (action === "evidence") {
      const values: readonly MoveHandoverEvidenceType[] = ["identity", "condition", "meter", "key_handover", "signature", "other"]
      return json(await addMoveHandoverEvidence({ appointmentId, expectedVersion, documentId: string(body.documentId, "documentId"), evidenceType: oneOf(body.evidenceType, values, "evidenceType"), notes: optional(body.notes), idempotencyKey: key }))
    }
    if (action === "meter") {
      const values: readonly MoveHandoverMeterType[] = ["electricity", "water", "gas", "heat", "other"]
      return json(await recordMoveHandoverMeter({ appointmentId, expectedVersion, meterType: oneOf(body.meterType, values, "meterType"), readingNumeric: numeric(body.readingNumeric, "readingNumeric"), readingUnit: string(body.readingUnit, "readingUnit"), readAt: string(body.readAt, "readAt"), evidenceDocumentId: optional(body.evidenceDocumentId), idempotencyKey: key }))
    }
    if (action === "condition") {
      const values: readonly MoveHandoverConditionState[] = ["good", "fair", "damaged", "not_inspected"]
      return json(await recordMoveHandoverCondition({ appointmentId, expectedVersion, areaCode: string(body.areaCode, "areaCode"), conditionState: oneOf(body.conditionState, values, "conditionState"), notes: optional(body.notes), evidenceDocumentId: optional(body.evidenceDocumentId), idempotencyKey: key }))
    }
    if (action === "access.prepare") {
      const values: readonly MoveHandoverAccessTruthState[] = ["blocked", "manual_ready", "provider_ready", "revoked"]
      const accessTypes: readonly MoveHandoverAccessType[] = ["mobile_code", "card", "plate", "qr"]
      const truthState = oneOf(body.truthState, values, "truthState")
      const humanApproved = bool(body.humanApproved, "humanApproved")
      if (profile.role === "staff" && (truthState !== "blocked" || humanApproved)) {
        return json({ error: { code: "MOVE_HANDOVER_FORBIDDEN", messageKey: "handover.accessApprovalRequired" } }, 403)
      }
      return json(await prepareMoveHandoverAccess({ appointmentId, expectedVersion, accessType: oneOf(body.accessType, accessTypes, "accessType"), truthState, humanApproved, reason: string(body.reason, "reason"), idempotencyKey: key }))
    }
    if (action === "turnover.create") {
      const values: readonly MoveHandoverWorkType[] = ["cleaning", "inspection", "repair", "key_return", "access_revocation", "other"]
      return json(await createMoveHandoverTurnover({ appointmentId, expectedVersion, workType: oneOf(body.workType, values, "workType"), assignedProfileId: optional(body.assignedProfileId), dueAt: optional(body.dueAt), idempotencyKey: key }), 201)
    }
    if (action === "deposit.link") return json(await linkMoveHandoverDeposit({ appointmentId, expectedVersion, depositSettlementId: string(body.depositSettlementId, "depositSettlementId"), idempotencyKey: key }))
    throw new InvalidRequest("action")
  } catch (error) { return errorResponse(error) }
}
