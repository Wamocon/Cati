import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { expect, test } from "@playwright/test"

import {
  getAccessibleResources,
  isValidRole,
  roleDefinitions,
  roles,
  type Role,
} from "../../lib/rbac"
import {
  buildRoleGovernanceDTO,
  governancePersonas,
  roleGovernanceRegistry,
} from "../../lib/role-governance"
import {
  accessibleUnitsForRole,
  LOCAL_QA_STAFF_ASSIGNMENT_LABEL,
  visibleServiceTicketsForRole,
} from "../../lib/role-scoped-views"
import type { ServiceTicket } from "../../lib/site-management-data"

const migration = readFileSync(
  resolve(
    process.cwd(),
    "../../supabase/migrations/00000000000020_role_relationship_ticket_workflow_hardening.sql"
  ),
  "utf8"
)

const expectedActors = {
  admin: {
    authority: "organization_administrator",
    view: "organization",
    scopeKind: "organization",
    companyId: "company-qa",
    officeId: "office-qa",
    boundaryId: "company-qa",
  },
  manager: {
    authority: "property_manager",
    view: "site",
    scopeKind: "site",
    companyId: "company-qa",
    officeId: "site-qa",
    boundaryId: "site-qa",
  },
  accountant: {
    authority: "finance_controller",
    view: "self",
    scopeKind: "finance",
    companyId: "company-qa",
    officeId: "office-qa",
    boundaryId: null,
  },
  staff: {
    authority: "field_operator",
    view: "self",
    scopeKind: "site",
    companyId: "company-qa",
    officeId: "site-qa",
    boundaryId: null,
  },
  owner: {
    authority: "unit_owner",
    view: "self",
    scopeKind: "owned_unit",
    companyId: "company-qa",
    officeId: "office-qa",
    boundaryId: null,
  },
  tenant: {
    authority: "unit_tenant",
    view: "self",
    scopeKind: "rented_unit",
    companyId: "company-qa",
    officeId: "office-qa",
    boundaryId: null,
  },
} as const satisfies Record<
  Role,
  {
    authority: string
    view: string
    scopeKind: string
    companyId: string
    officeId: string
    boundaryId: string | null
  }
>

function ticket(id: string, assignee: string, flatNumber = "A-001"): ServiceTicket {
  return {
    id,
    flatId: `flat-${id}`,
    flatNumber,
    title: `Ticket ${id}`,
    category: "maintenance",
    priority: "medium",
    status: "assigned",
    assignee,
    requester: "QA resident",
    openedAt: "2026-07-14T08:00:00.000Z",
    dueAt: "2026-07-14T12:00:00.000Z",
    slaHoursRemaining: 4,
    debtBlocked: false,
    paymentVerified: true,
    mediaCount: 0,
    estimatedCostTry: 0,
  }
}

function functionBody(name: string) {
  const start = migration.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`)
  expect(start, `${name} exists`).toBeGreaterThanOrEqual(0)
  const end = migration.indexOf("\n$$;", start)
  expect(end, `${name} closes`).toBeGreaterThan(start)
  return migration.slice(start, end + 4)
}

function policyBody(name: string) {
  const start = migration.indexOf(`CREATE POLICY "${name}"`)
  expect(start, `${name} exists`).toBeGreaterThanOrEqual(0)
  const end = migration.indexOf(";", start)
  expect(end, `${name} closes`).toBeGreaterThan(start)
  return migration.slice(start, end + 1)
}

test.describe("role governance release contract", () => {
  test("the switchable business-role set is exactly the six documented roles", () => {
    expect(roles).toEqual([
      "admin",
      "manager",
      "accountant",
      "staff",
      "owner",
      "tenant",
    ])
    expect(roleDefinitions.map((definition) => definition.key)).toEqual(roles)
    expect(Object.keys(roleGovernanceRegistry)).toEqual(roles)
    expect(isValidRole("platform_super_admin")).toBe(false)
    expect(isValidRole("superadmin")).toBe(false)
  })

  for (const role of roles) {
    test(`${role} exposes its exact authority and actor scope`, () => {
      const expected = expectedActors[role]
      const dto = buildRoleGovernanceDTO({
        role,
        company_id: expected.companyId,
        office_id: expected.officeId,
      })

      expect(dto.actor).toMatchObject({
        role,
        authority: expected.authority,
        view: expected.view,
        scopeKind: expected.scopeKind,
        boundaryId: expected.boundaryId,
        boundaryConfigured: expected.boundaryId !== null,
        canCrossOrganizations: false,
        isPlatformSuperAdmin: false,
      })
      expect(dto.readonly).toBe(true)
      expect(dto.schemaVersion).toBe("2026-07-roles-v1")
      expect(roleGovernanceRegistry[role].resources).toEqual(
        getAccessibleResources(role)
      )
      expect(roleGovernanceRegistry[role].canCrossOrganizations).toBe(false)
      expect(roleGovernanceRegistry[role].isPlatformSuperAdmin).toBe(false)
    })
  }

  test("platform super-admin remains a protected, non-assignable persona", () => {
    const platformPersona = governancePersonas.find(
      (persona) => persona.key === "platform_super_admin"
    )
    expect(platformPersona).toEqual({
      key: "platform_super_admin",
      baseRole: null,
      scopeKind: "protected_platform",
      status: "unavailable",
      assignable: false,
      crossOrganizationAccess: true,
    })

    const organizationView = buildRoleGovernanceDTO({
      role: "admin",
      company_id: "company-qa",
    })
    expect(organizationView.roles.map((definition) => definition.role)).toEqual(
      roles
    )
    expect(
      organizationView.personas.find(
        (persona) => persona.key === "platform_super_admin"
      )
    ).toMatchObject({ baseRole: null, assignable: false, status: "unavailable" })

    const siteView = buildRoleGovernanceDTO({
      role: "manager",
      office_id: "site-qa",
    })
    expect(siteView.roles.map((definition) => definition.role)).not.toContain(
      "admin"
    )
    expect(siteView.personas.map((persona) => persona.key)).not.toContain(
      "platform_super_admin"
    )
  })

  test("local resident and staff fallbacks preserve exact actor boundaries", () => {
    const ownerUnits = [...(accessibleUnitsForRole("owner") ?? [])].sort()
    const tenantUnits = [...(accessibleUnitsForRole("tenant") ?? [])].sort()
    expect(ownerUnits).toEqual(["A-001", "A-054", "D-023"])
    expect(tenantUnits).toEqual(["A-018", "A-023"])
    expect(ownerUnits.filter((unitNo) => tenantUnits.includes(unitNo))).toEqual([])

    const visible = visibleServiceTicketsForRole("staff", [
      ticket("assigned", `  ${LOCAL_QA_STAFF_ASSIGNMENT_LABEL}  `),
      ticket("unassigned", ""),
      ticket("other-technician", "Teknik - Ayşe"),
      ticket("finance", "Tahsilat"),
    ])
    expect(visible.map((item) => item.id)).toEqual(["assigned"])
  })

  test("platform authority comes only from the protected registry", () => {
    const platformCheck = functionBody("is_platform_super_admin")
    const compatibilityCheck = functionBody("is_super_admin")

    expect(platformCheck).toContain("FROM public.platform_administrators pa")
    expect(platformCheck).toContain("pa.status = 'active'")
    expect(platformCheck).toContain("pa.revoked_at IS NULL")
    expect(platformCheck).not.toMatch(/public\.profiles|current_user_profile_role|role\s*=\s*'admin'/i)
    expect(compatibilityCheck).toContain("SELECT public.is_platform_super_admin();")
    expect(compatibilityCheck).not.toMatch(/public\.profiles|role\s*=\s*'admin'/i)

    expect(migration).toContain(
      "REVOKE ALL ON TABLE public.platform_administrators FROM anon, authenticated;"
    )
    expect(migration).toContain(
      "GRANT SELECT ON TABLE public.platform_administrators TO authenticated;"
    )
    expect(migration).not.toMatch(
      /GRANT[\s\S]{0,160}(?:INSERT|UPDATE|DELETE|ALL)[\s\S]{0,160}ON TABLE public\.platform_administrators[\s\S]{0,80}TO authenticated;/i
    )
    expect(
      policyBody("Platform administrators inspect platform registry")
    ).toContain("USING ((SELECT public.is_platform_super_admin()))")
  })

  test("database ticket and task visibility enforce staff assignment", () => {
    const ticketPolicy = policyBody("Role and relationship scoped ticket visibility")
    const taskPolicy = policyBody("Operational workforce task visibility")
    const staffRead = functionBody("current_user_has_staff_ticket_access")
    const staffAction = functionBody("current_user_is_assigned_to_ticket")

    expect(ticketPolicy).toContain(
      "WHEN 'staff' THEN public.current_user_has_staff_ticket_access("
    )
    expect(ticketPolicy).toContain("id, assigned_to")
    expect(taskPolicy).toContain(
      "workforce_tasks.assigned_staff_member_id = sm.id"
    )
    expect(taskPolicy).not.toContain(
      "workforce_tasks.assigned_staff_member_id IS NULL"
    )
    expect(staffRead).toContain("t.assigned_to = (SELECT auth.uid())")
    expect(staffRead).toContain("w.assigned_staff_member_id = sm.id")
    expect(staffRead).not.toContain("w.assigned_staff_member_id IS NULL")
    expect(staffAction).toContain("sm.status = 'active'")
    expect(staffAction).not.toContain("'training'")
  })
})
