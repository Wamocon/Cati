import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

const migrationPath = resolve(
  process.cwd(),
  "../../supabase/migrations/00000000000022_tenant_access_invitations.sql"
)

const legacyPhaseTables = [
  "reservation_availability_blocks",
  "booking_readiness",
  "turnover_work_items",
  "access_handoff_requests",
  "deposit_settlements",
  "documents",
  "document_packets",
  "message_threads",
  "notification_deliveries",
  "notification_rules",
  "message_templates",
] as const

const sensitiveColumns: Record<(typeof legacyPhaseTables)[number], string[]> = {
  reservation_availability_blocks: ["reason", "metadata"],
  booking_readiness: ["steps"],
  turnover_work_items: [
    "workforce_task_id",
    "owner_team",
    "checklist",
    "dependency",
    "metadata",
  ],
  access_handoff_requests: [
    "provider_code",
    "provider_response",
    "approved_by",
  ],
  deposit_settlements: [
    "settlement_items",
    "approval_owner",
    "approved_by",
  ],
  documents: [
    "resident_id",
    "file_path",
    "storage_bucket",
    "storage_provider",
    "checksum_sha256",
    "uploaded_by",
    "uploaded_original_name",
    "metadata",
  ],
  document_packets: ["metadata"],
  message_threads: [
    "owner_team",
    "consent_status",
    "sentiment",
    "last_message",
    "next_action",
    "metadata",
  ],
  notification_deliveries: [
    "recipient_ref",
    "idempotency_key",
    "provider_mode",
    "provider_response",
  ],
  notification_rules: [
    "target_expression",
    "owner_team",
    "failover",
    "metadata",
  ],
  message_templates: ["owner_team", "body_by_language"],
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function safeGrant(migration: string, table: string): string {
  const statement = migration.match(
    new RegExp(
      `GRANT\\s+SELECT\\s*\\(([^)]*)\\)\\s+ON\\s+TABLE\\s+public\\.${escapeRegex(table)}\\s+TO\\s+authenticated\\s*;`,
      "i"
    )
  )?.[1]

  expect(statement, `${table} must expose an explicit safe column grant`).toBeTruthy()
  return statement ?? ""
}

function selectPolicy(migration: string, policyName: string, table: string): string {
  const statement = migration.match(
    new RegExp(
      `CREATE\\s+POLICY\\s+${escapeRegex(policyName)}[\\s\\S]*?ON\\s+public\\.${escapeRegex(table)}[\\s\\S]*?;`,
      "i"
    )
  )?.[0]

  expect(statement, `${policyName} must exist`).toBeTruthy()
  expect(statement).toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i)
  return statement ?? ""
}

test.describe("migration 22 legacy Phase 10/11 security gate", () => {
  test("retires inherited broad write policies and direct table DML", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const revokeBlock = migration.match(
      /REVOKE ALL ON TABLE\s+public\.reservation_availability_blocks,[\s\S]*?FROM anon, authenticated;/i
    )?.[0]

    expect(revokeBlock).toBeTruthy()
    for (const table of legacyPhaseTables) {
      expect(revokeBlock).toContain(`public.${table}`)
      const policies = [
        ...migration.matchAll(
          new RegExp(
            `CREATE\\s+POLICY[^;]*ON\\s+public\\.${escapeRegex(table)}[^;]*;`,
            "gi"
          )
        ),
      ].map((match) => match[0])

      expect(policies.length, `${table} must retain a scoped read policy`).toBe(1)
      expect(policies[0]).toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i)
      expect(policies[0]).not.toMatch(/FOR\s+(?:ALL|INSERT|UPDATE|DELETE)\b/i)
    }

    for (const table of legacyPhaseTables.filter(
      (name) => name !== "documents"
    )) {
      expect(migration).toContain(
        `DROP POLICY IF EXISTS "Managers can manage phase 10 11"\n  ON public.${table};`
      )
    }

    expect(migration).not.toMatch(
      /current_user_profile_role\(\)\)?\s*<>\s*'tenant'/i
    )
  })

  test("exposes safe columns instead of raw provider, finance, message or file evidence", () => {
    const migration = readFileSync(migrationPath, "utf8")

    for (const table of legacyPhaseTables) {
      expect(migration).not.toMatch(
        new RegExp(
          `GRANT\\s+SELECT\\s+ON\\s+TABLE\\s+public\\.${escapeRegex(table)}\\b`,
          "i"
        )
      )

      const columns = safeGrant(migration, table)
      for (const sensitiveColumn of sensitiveColumns[table]) {
        expect(columns).not.toMatch(
          new RegExp(`\\b${escapeRegex(sensitiveColumn)}\\b`, "i")
        )
      }
    }

    const uploadGrant = safeGrant(migration, "document_upload_requests")
    for (const sensitiveColumn of [
      "resident_id",
      "original_filename",
      "safe_filename",
      "file_path",
      "storage_bucket",
      "storage_provider",
      "checksum_sha256",
      "requested_by",
      "requester_role",
      "reviewed_by",
      "metadata",
    ]) {
      expect(uploadGrant).not.toMatch(
        new RegExp(`\\b${escapeRegex(sensitiveColumn)}\\b`, "i")
      )
    }
  })

  test("uses explicit role, site and relationship predicates", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const availability = selectPolicy(
      migration,
      "reservation_availability_read_module_scope",
      "reservation_availability_blocks"
    )
    const readiness = selectPolicy(
      migration,
      "booking_readiness_read_module_scope",
      "booking_readiness"
    )
    const turnover = selectPolicy(
      migration,
      "turnover_work_items_read_module_scope",
      "turnover_work_items"
    )
    const access = selectPolicy(
      migration,
      "access_handoff_read_module_scope",
      "access_handoff_requests"
    )
    const deposits = selectPolicy(
      migration,
      "deposit_settlements_read_module_scope",
      "deposit_settlements"
    )
    const deliveries = selectPolicy(
      migration,
      "notification_deliveries_read_module_scope",
      "notification_deliveries"
    )
    const templates = selectPolicy(
      migration,
      "message_templates_internal_read",
      "message_templates"
    )

    for (const role of ["admin", "manager", "staff", "owner", "tenant"]) {
      expect(availability).toContain(`WHEN '${role}'`)
    }
    expect(availability).not.toContain("WHEN 'accountant'")
    expect(readiness).toContain("current_user_can_view_reservation")
    expect(readiness).not.toContain("WHEN 'accountant'")
    expect(turnover).toContain("WHEN 'manager'")
    expect(turnover).not.toMatch(/WHEN '(?:accountant|staff|owner|tenant)'/)
    expect(access).toContain("WHEN 'owner'")
    expect(access).toContain("WHEN 'tenant'")
    expect(access).not.toMatch(/WHEN '(?:accountant|staff)'/)
    expect(deposits).toContain("WHEN 'accountant' THEN TRUE")
    expect(deposits).toContain("current_user_can_view_reservation")
    expect(deliveries).not.toMatch(/WHEN '(?:accountant|staff|owner|tenant)'/)
    expect(templates).toContain("current_user_profile_role()) = 'admin'")
  })

  test("reservation mutation is command-only", () => {
    const migration = readFileSync(migrationPath, "utf8")

    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Authorized users create reservations"'
    )
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Authorized users create scoped reservations"'
    )
    expect(migration).not.toMatch(
      /CREATE\s+POLICY\s+"Authorized users create/i
    )
    expect(migration).toMatch(
      /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.reservations\s+FROM anon, authenticated;/i
    )
  })

  test("private object storage denies dirty reads and browser-direct writes", () => {
    const migration = readFileSync(migrationPath, "utf8")
    const readGuard = migration.match(
      /CREATE OR REPLACE FUNCTION public\.current_user_can_read_document_object[\s\S]*?(?=CREATE OR REPLACE FUNCTION public\.current_user_can_upload_document_object)/i
    )?.[0]

    expect(readGuard).toBeTruthy()
    expect(readGuard).toContain("r.upload_status = 'stored'")
    expect(readGuard).toContain("r.review_status = 'approved'")
    expect(readGuard).toContain("r.virus_scan_status = 'clean'")
    expect(readGuard).toContain("d.status = 'active'")
    expect(readGuard).toContain("d.review_status = 'approved'")
    expect(readGuard).toContain("d.retention_class <> 'identity'")
    expect(readGuard?.match(/clean_upload\.virus_scan_status = 'clean'/g)?.length)
      .toBeGreaterThanOrEqual(2)

    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Scoped users can upload own private cati documents"'
    )
    expect(migration).not.toContain(
      'CREATE POLICY "Scoped users can upload own private cati documents"'
    )
    expect(migration).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.current_user_can_upload_document_object/i
    )
    expect(migration).toMatch(
      /REVOKE ALL ON FUNCTION public\.current_user_can_upload_document_object\(\s*TEXT, TEXT\s*\) FROM PUBLIC, anon, authenticated;/i
    )
  })
})
