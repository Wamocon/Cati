import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

const migrationPaths = {
  m22: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000022_tenant_access_invitations.sql"
  ),
  m32: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000032_booking_resource_lifecycle.sql"
  ),
  m33: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000033_move_handover_workflow.sql"
  ),
  m34: resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000034_calendar_ics_feeds.sql"
  ),
} as const

const legacyHandoverTables = [
  "turnover_work_items",
  "access_handoff_requests",
  "deposit_settlements",
] as const

const internalReservationColumns = [
  "notes",
  "created_by",
  "workflow_version",
  "idempotency_key",
  "approved_by",
  "approved_at",
  "request_fingerprint",
  "bookable_resource_id",
  "party_size",
  "lifecycle_status",
  "approval_state",
  "payment_state",
  "deposit_truth_state",
  "access_preparation_state",
  "price_truth",
  "price_amount_cents",
  "deposit_amount_cents",
  "buffer_before_minutes",
  "buffer_after_minutes",
  "buffered_start_at",
  "buffered_end_at",
  "cancellation_cutoff_minutes",
  "cancellation_policy",
  "no_show_policy",
  "required_staff_count",
  "safety_condition",
  "rescheduled_at",
] as const

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function readMigration(name: keyof typeof migrationPaths): string {
  return readFileSync(migrationPaths[name], "utf8")
}

function policyStatements(migration: string, table: string): string[] {
  return [
    ...migration.matchAll(
      /CREATE\s+POLICY\s+(?:"[^"]+"|[a-z0-9_]+)[\s\S]*?;/gi
    ),
  ]
    .map((match) => match[0])
    .filter((statement) =>
      new RegExp(
        `ON\\s+(?:TABLE\\s+)?public\\.${escapeRegex(table)}\\b`,
        "i"
      ).test(statement)
    )
}

function explicitSelectColumns(migration: string, table: string): string {
  const columns = migration.match(
    new RegExp(
      `GRANT\\s+SELECT\\s*\\(([^)]*)\\)\\s+ON\\s+(?:TABLE\\s+)?public\\.${escapeRegex(table)}\\s+TO\\s+authenticated\\s*;`,
      "i"
    )
  )?.[1]

  expect(columns, `${table} must use an explicit authenticated column grant`).toBeTruthy()
  return columns ?? ""
}

function tableWideSelectTargets(migration: string): string[] {
  return [
    ...migration.matchAll(
      /GRANT\s+SELECT\s+ON\s+(?:TABLE\s+)?([\s\S]*?)\s+TO\s+authenticated\s*;/gi
    ),
  ].map((match) => match[1])
}

function authenticatedDmlGrants(migration: string, table: string): string[] {
  return [
    ...migration.matchAll(
      /GRANT\s+([\s\S]*?)\s+ON\s+(?:TABLE\s+)?([\s\S]*?)\s+TO\s+authenticated\s*;/gi
    ),
  ]
    .filter((match) =>
      new RegExp(`\\bpublic\\.${escapeRegex(table)}\\b`, "i").test(match[2])
    )
    .filter((match) => /\b(?:ALL|INSERT|UPDATE|DELETE)\b/i.test(match[1]))
    .map((match) => match[0])
}

function expectAuthenticatedExecuteGrant(
  migration: string,
  functionName: string
): void {
  expect(migration).toMatch(
    new RegExp(
      `GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+public\\.${escapeRegex(functionName)}\\s*\\([\\s\\S]*?\\)\\s+TO\\s+authenticated\\s*;`,
      "i"
    )
  )
}

function expectInternalHelperRevoked(
  migration: string,
  functionName: string
): void {
  expect(migration).toMatch(
    new RegExp(
      `REVOKE\\s+ALL\\s+ON\\s+FUNCTION\\s+public\\.${escapeRegex(functionName)}\\s*\\([\\s\\S]*?\\)\\s+FROM\\s+PUBLIC\\s*,\\s*anon\\s*,\\s*authenticated\\s*;`,
      "i"
    )
  )
}

test.describe("Window 3 booking and handover static security gate", () => {
  test("migration 32 exposes reservations only through a resident-safe column allowlist", () => {
    const migration = readMigration("m32")

    for (const targets of tableWideSelectTargets(migration)) {
      expect(targets).not.toMatch(/\bpublic\.reservations\b/i)
    }

    const columns = explicitSelectColumns(migration, "reservations")
    for (const safeColumn of [
      "id",
      "site_id",
      "unit_id",
      "check_in_at",
      "check_out_at",
      "status",
    ]) {
      expect(columns).toMatch(new RegExp(`\\b${safeColumn}\\b`, "i"))
    }
    for (const internalColumn of internalReservationColumns) {
      expect(columns).not.toMatch(
        new RegExp(`\\b${escapeRegex(internalColumn)}\\b`, "i")
      )
    }
  })

  test("migration 32 retains one exact reservation read policy and command-only writes", () => {
    const migration = readMigration("m32")
    const policies = policyStatements(migration, "reservations")

    expect(policies).toHaveLength(1)
    expect(policies[0]).toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i)
    expect(policies[0]).toMatch(
      /USING\s*\(\s*public\.current_user_can_view_reservation\s*\(\s*id\s*\)\s*\)/i
    )
    expect(policies[0]).not.toMatch(/FOR\s+(?:ALL|INSERT|UPDATE|DELETE)\b/i)
    expect(migration).toMatch(
      /REVOKE\s+(?:ALL|INSERT\s*,\s*UPDATE\s*,\s*DELETE)\s+ON\s+(?:TABLE\s+)?public\.reservations\s+FROM\s+anon\s*,\s*authenticated\s*;/i
    )
    expect(authenticatedDmlGrants(migration, "reservations")).toEqual([])
  })

  test("migration 33 leaves the three legacy handover tables with SELECT policies only", () => {
    const migration = readMigration("m33")

    expect(migration).not.toMatch(/_legacy_(?:insert|update)\b/i)
    for (const table of legacyHandoverTables) {
      const policies = policyStatements(migration, table)

      expect(policies, `${table} must retain one exact read policy`).toHaveLength(1)
      expect(policies[0]).toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i)
      expect(policies[0]).not.toMatch(/FOR\s+(?:ALL|INSERT|UPDATE|DELETE)\b/i)
    }
  })

  test("migration 33 repeats legacy-table DML revokes without a later authenticated grant", () => {
    const migration = readMigration("m33")
    const revokeStatements = [
      ...migration.matchAll(
        /REVOKE\s+INSERT\s*,\s*UPDATE\s*,\s*DELETE\s+ON\s+(?:TABLE\s+)?([\s\S]*?)\s+FROM\s+([^;]*authenticated[^;]*)\s*;/gi
      ),
    ]

    for (const table of legacyHandoverTables) {
      expect(
        revokeStatements.some((statement) =>
          new RegExp(`\\bpublic\\.${escapeRegex(table)}\\b`, "i").test(
            statement[1]
          )
        ),
        `${table} must repeat REVOKE INSERT, UPDATE, DELETE from authenticated`
      ).toBe(true)
      expect(authenticatedDmlGrants(migration, table)).toEqual([])
    }
  })

  test("ordered migrations 22, 32, 33 and 34 do not reintroduce the retired attack paths", () => {
    const m22 = readMigration("m22")
    const m32 = readMigration("m32")
    const m33 = readMigration("m33")
    const m34 = readMigration("m34")
    const boundary = "\n-- Window 3 post-order security boundary --\n"
    const orderedMigrations = [m22, m32, m33, m34].join(boundary)
    const postReservationHardening = [m32, m33, m34].join(boundary)
    const postHandoverHardening = [m33, m34].join(boundary)

    expect(orderedMigrations).toContain(postReservationHardening)
    for (const targets of tableWideSelectTargets(postReservationHardening)) {
      expect(targets).not.toMatch(/\bpublic\.reservations\b/i)
    }
    expect(authenticatedDmlGrants(postReservationHardening, "reservations")).toEqual(
      []
    )

    for (const table of legacyHandoverTables) {
      for (const policy of policyStatements(postHandoverHardening, table)) {
        expect(policy).toMatch(/FOR\s+SELECT\s+TO\s+authenticated/i)
        expect(policy).not.toMatch(/FOR\s+(?:ALL|INSERT|UPDATE|DELETE)\b/i)
      }
      expect(authenticatedDmlGrants(postHandoverHardening, table)).toEqual([])
    }

    const supportedCommands: ReadonlyArray<readonly [string, string[]]> = [
      [
        m32,
        [
          "create_booking_hold_command",
          "commit_resource_booking_command",
          "decide_resource_booking_command",
          "reschedule_resource_booking_command",
          "booking_lifecycle_workspace",
        ],
      ],
      [
        m33,
        [
          "create_move_handover_command",
          "transition_move_handover_command",
          "add_move_handover_evidence_command",
          "move_handover_workspace",
          "current_user_can_view_move_handover",
        ],
      ],
      [
        m34,
        [
          "create_calendar_feed_token_command",
          "rotate_calendar_feed_token_command",
          "revoke_calendar_feed_token_command",
          "preview_calendar_import_command",
        ],
      ],
    ]
    for (const [migration, commands] of supportedCommands) {
      for (const command of commands) {
        expectAuthenticatedExecuteGrant(migration, command)
      }
    }

    const internalHelpers: ReadonlyArray<readonly [string, string[]]> = [
      [
        m32,
        [
          "booking_command_replay",
          "booking_store_receipt",
          "booking_try_allocate_capacity",
        ],
      ],
      [
        m33,
        [
          "move_handover_command_replay",
          "move_handover_store_receipt",
          "move_handover_add_event",
          "sync_move_handover_from_reservation",
          "current_user_can_manage_move_handover",
          "move_handover_invalidate_access",
        ],
      ],
      [
        m34,
        [
          "calendar_profile_can_manage_site",
          "calendar_feed_is_current",
          "calendar_reservation_audience_profile",
        ],
      ],
    ]
    for (const [migration, helpers] of internalHelpers) {
      for (const helper of helpers) {
        expectInternalHelperRevoked(migration, helper)
      }
    }
  })
})
