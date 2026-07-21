// Client-aligned RBAC for the 1Cati site-management platform.
//
// The client specification defines six business roles. We keep that set small
// and use explicit permissions plus data ownership rules to avoid role sprawl.

export const roles = [
  "admin",
  "manager",
  "accountant",
  "staff",
  "owner",
  "tenant",
] as const

export type Role = (typeof roles)[number]

export const resources = [
  "dashboard",
  "listings",
  "leads",
  "deals",
  "tickets",
  "calendar",
  "documents",
  "eids_compliance",
  "finance",
  "reports",
  "users",
  "settings",
  "communications",
] as const

export type Resource = (typeof resources)[number]

export const actions = [
  "view",
  "create",
  "update",
  "delete",
  "manage",
  "export",
  "approve",
  "assign",
] as const

export type Action = (typeof actions)[number]

export type Permission = `${Resource}:${Action}`

export const permission = (resource: Resource, action: Action): Permission =>
  `${resource}:${action}`

export interface RoleDefinition {
  key: Role
  labelKey: string
  descriptionKey: string
  level: number
  scope: "company" | "site" | "finance" | "field" | "owned_unit" | "rented_unit"
  responsibilities: string[]
  constraints: string[]
}

export const roleDefinitions: RoleDefinition[] = [
  {
    key: "admin",
    labelKey: "roles.admin",
    descriptionKey: "roles.descriptions.admin",
    level: 90,
    scope: "company",
    responsibilities: [
      "Full organization configuration",
      "User and role administration",
      "Sensitive finance, access, audit, and integration oversight",
    ],
    constraints: [
      "Must use separate approval/audit trail for finance and access changes",
      "Cannot bypass tenant/company data isolation",
    ],
  },
  {
    key: "manager",
    labelKey: "roles.manager",
    descriptionKey: "roles.descriptions.manager",
    level: 70,
    scope: "site",
    responsibilities: [
      "Daily site operations",
      "Task, service, staff, reservation, and communication supervision",
      "SLA, debt restriction, and access-risk review",
    ],
    constraints: [
      "Can review finance but cannot post accounting entries",
      "Can assign staff but cannot change global system settings",
    ],
  },
  {
    key: "accountant",
    labelKey: "roles.accountant",
    descriptionKey: "roles.descriptions.accountant",
    level: 60,
    scope: "finance",
    responsibilities: [
      "Fees, payments, deposits, refunds, collections, and finance reports",
      "Debt restriction validation before paid services and reservations",
    ],
    constraints: [
      "No user administration",
      "No field task closure without operational evidence",
    ],
  },
  {
    key: "staff",
    labelKey: "roles.staff",
    descriptionKey: "roles.descriptions.staff",
    level: 40,
    scope: "field",
    responsibilities: [
      "Accept assigned jobs",
      "Complete tasks with photo/video evidence",
      "Update service status and field notes",
    ],
    constraints: [
      "Cannot view finance ledgers",
      "Cannot approve refunds, access restrictions, or user roles",
    ],
  },
  {
    key: "owner",
    labelKey: "roles.owner",
    descriptionKey: "roles.descriptions.owner",
    level: 20,
    scope: "owned_unit",
    responsibilities: [
      "View owned-unit documents, reservations, communications, and service status",
      "Create service requests and communicate with management",
      "Sponsor and revoke time-boxed tenant access for owned units",
    ],
    constraints: [
      "Can only access own units and authorized tenants",
      "Cannot see other owners, staff, reports, or internal finance controls",
    ],
  },
  {
    key: "tenant",
    labelKey: "roles.tenant",
    descriptionKey: "roles.descriptions.tenant",
    level: 10,
    scope: "rented_unit",
    responsibilities: [
      "View own service requests, reservations, chat, and authorized documents",
      "Create reservations or service requests when owner permissions allow it",
    ],
    constraints: [
      "Access is restricted by the owner agreement and debt status",
      "Cannot view owner records, reports, finance ledgers, or other units",
    ],
  },
]

const manage = (resource: Resource): Permission[] => [
  permission(resource, "view"),
  permission(resource, "create"),
  permission(resource, "update"),
  permission(resource, "delete"),
  permission(resource, "manage"),
  permission(resource, "export"),
  permission(resource, "approve"),
  permission(resource, "assign"),
]

const crud = (resource: Resource): Permission[] => [
  permission(resource, "view"),
  permission(resource, "create"),
  permission(resource, "update"),
  permission(resource, "delete"),
]

const view = (resource: Resource): Permission[] => [
  permission(resource, "view"),
]

// Canonical permission matrix. Keep in sync with Supabase RLS and tests.
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    ...manage("dashboard"),
    ...manage("listings"),
    ...manage("leads"),
    ...manage("deals"),
    ...manage("tickets"),
    ...manage("calendar"),
    ...manage("documents"),
    ...manage("eids_compliance"),
    ...manage("finance"),
    ...manage("reports"),
    ...manage("users"),
    ...manage("settings"),
    ...manage("communications"),
  ],
  manager: [
    ...view("dashboard"),
    ...crud("listings"),
    permission("listings", "assign"),
    permission("listings", "approve"),
    permission("listings", "export"),
    ...crud("leads"),
    permission("leads", "assign"),
    permission("leads", "export"),
    ...crud("deals"),
    permission("deals", "approve"),
    permission("deals", "export"),
    ...crud("tickets"),
    permission("tickets", "assign"),
    permission("tickets", "approve"),
    ...crud("calendar"),
    permission("calendar", "approve"),
    ...crud("documents"),
    permission("eids_compliance", "view"),
    permission("eids_compliance", "update"),
    permission("eids_compliance", "approve"),
    permission("finance", "view"),
    permission("finance", "export"),
    permission("reports", "view"),
    permission("reports", "create"),
    permission("reports", "export"),
    permission("users", "view"),
    permission("settings", "view"),
    ...crud("communications"),
  ],
  accountant: [
    ...view("dashboard"),
    permission("tickets", "view"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("documents", "update"),
    permission("finance", "view"),
    permission("finance", "create"),
    permission("finance", "update"),
    permission("finance", "export"),
    permission("finance", "approve"),
    permission("reports", "view"),
    permission("reports", "create"),
    permission("reports", "export"),
    permission("communications", "view"),
    permission("communications", "create"),
  ],
  staff: [
    ...view("dashboard"),
    permission("tickets", "view"),
    permission("tickets", "update"),
    permission("calendar", "view"),
    permission("calendar", "update"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("communications", "view"),
    permission("communications", "create"),
  ],
  owner: [
    ...view("dashboard"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("tickets", "approve"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("calendar", "approve"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("finance", "view"),
    permission("communications", "view"),
    permission("communications", "create"),
  ],
  tenant: [
    ...view("dashboard"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("communications", "view"),
    permission("communications", "create"),
  ],
}

export function isValidRole(value: unknown): value is Role {
  return typeof value === "string" && roles.includes(value as Role)
}

export function hasPermission(
  role: Role | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!isValidRole(role)) return false
  const perms = rolePermissions[role]
  return perms.includes(permission(resource, action))
}

export function hasAnyPermission(
  role: Role | null | undefined,
  resource: Resource,
  actions: Action[]
): boolean {
  return actions.some((action) => hasPermission(role, resource, action))
}

export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? []
}

/**
 * Numeric hierarchy level of a role (higher = broader authority).
 * Mirrors the SQL public.role_level() helper. Unknown roles resolve to 0.
 */
export function roleLevel(role: Role | null | undefined): number {
  if (!isValidRole(role)) return 0
  return roleDefinitions.find((r) => r.key === role)?.level ?? 0
}

/**
 * Multi-role permission check: true if ANY of the assigned roles grants the
 * permission. Used only where a user may hold several business roles at once;
 * single-role callers keep using hasPermission(role, ...) unchanged.
 */
export function hasAnyRolePermission(
  roles: readonly Role[] | null | undefined,
  resource: Resource,
  action: Action
): boolean {
  if (!roles || roles.length === 0) return false
  return roles.some((role) => hasPermission(role, resource, action))
}

/**
 * Union of every resource reachable by any of the assigned roles.
 */
export function effectiveResourcesForRoles(
  roles: readonly Role[] | null | undefined
): Resource[] {
  if (!roles || roles.length === 0) return []
  const seen = new Set<Resource>()
  for (const role of roles) {
    for (const resource of getAccessibleResources(role)) {
      seen.add(resource)
    }
  }
  return Array.from(seen)
}

export function getAccessibleResources(
  role: Role | null | undefined
): Resource[] {
  if (!isValidRole(role)) return []
  const seen = new Set<Resource>()
  for (const p of rolePermissions[role]) {
    const [resource] = p.split(":") as [Resource]
    seen.add(resource)
  }
  return Array.from(seen)
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "admin"
}

/**
 * Internal accounting workspaces expose organization/site controls that are
 * intentionally broader than the owner's own-unit statement projection.
 * Keep this boundary explicit when a route or API returns ledger operations,
 * payment controls, reconciliation data, or provider metadata.
 */
export function canViewInternalFinance(
  role: Role | null | undefined
): boolean {
  return role === "admin" || role === "manager" || role === "accountant"
}

export function isManagerOrAbove(role: Role | null | undefined): boolean {
  if (!isValidRole(role)) return false
  const def = roleDefinitions.find((r) => r.key === role)
  return (def?.level ?? 0) >= 70
}

export function roleScope(
  role: Role | null | undefined
): RoleDefinition["scope"] | null {
  if (!isValidRole(role)) return null
  return roleDefinitions.find((r) => r.key === role)?.scope ?? null
}
