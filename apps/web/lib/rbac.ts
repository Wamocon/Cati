// Role-Based Access Control (RBAC) for the 1Çatı real-estate platform.
//
// Design principles:
// - Least privilege: every role receives only the permissions required for its job function.
// - Defense in depth: these claims are mirrored by Supabase Row Level Security (RLS) policies.
// - Explicit over implicit: each role lists its exact permissions rather than inheriting broadly.
// - Scalable: new resources and actions can be added without changing the core helpers.

export const roles = [
  "super_admin",
  "company_admin",
  "manager",
  "sales_consultant",
  "listing_agent",
  "property_manager",
  "accountant",
  "maintenance",
  "client",
  "viewer",
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
  "offline_sync",
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
  scope: "platform" | "company" | "office" | "personal"
}

export const roleDefinitions: RoleDefinition[] = [
  {
    key: "super_admin",
    labelKey: "roles.superAdmin",
    descriptionKey: "roles.descriptions.superAdmin",
    level: 100,
    scope: "platform",
  },
  {
    key: "company_admin",
    labelKey: "roles.companyAdmin",
    descriptionKey: "roles.descriptions.companyAdmin",
    level: 90,
    scope: "company",
  },
  {
    key: "manager",
    labelKey: "roles.manager",
    descriptionKey: "roles.descriptions.manager",
    level: 70,
    scope: "office",
  },
  {
    key: "sales_consultant",
    labelKey: "roles.salesConsultant",
    descriptionKey: "roles.descriptions.salesConsultant",
    level: 50,
    scope: "office",
  },
  {
    key: "listing_agent",
    labelKey: "roles.listingAgent",
    descriptionKey: "roles.descriptions.listingAgent",
    level: 50,
    scope: "office",
  },
  {
    key: "property_manager",
    labelKey: "roles.propertyManager",
    descriptionKey: "roles.descriptions.propertyManager",
    level: 50,
    scope: "office",
  },
  {
    key: "accountant",
    labelKey: "roles.accountant",
    descriptionKey: "roles.descriptions.accountant",
    level: 50,
    scope: "office",
  },
  {
    key: "maintenance",
    labelKey: "roles.maintenance",
    descriptionKey: "roles.descriptions.maintenance",
    level: 40,
    scope: "office",
  },
  {
    key: "client",
    labelKey: "roles.client",
    descriptionKey: "roles.descriptions.client",
    level: 10,
    scope: "personal",
  },
  {
    key: "viewer",
    labelKey: "roles.viewer",
    descriptionKey: "roles.descriptions.viewer",
    level: 20,
    scope: "office",
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

const view = (resource: Resource): Permission[] => [permission(resource, "view")]

// Canonical permission matrix. Keep in sync with:
// - supabase/migrations/* RLS policies
// - app/[locale]/dashboard/page.tsx menu config
export const rolePermissions: Record<Role, Permission[]> = {
  super_admin: [
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
    ...manage("offline_sync"),
  ],
  company_admin: [
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
    ...manage("offline_sync"),
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
    ...crud("offline_sync"),
  ],
  sales_consultant: [
    ...view("dashboard"),
    ...view("listings"),
    permission("leads", "view"),
    permission("leads", "create"),
    permission("leads", "update"),
    permission("deals", "view"),
    permission("deals", "create"),
    permission("deals", "update"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("calendar", "update"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("eids_compliance", "view"),
    permission("communications", "view"),
    permission("communications", "create"),
    permission("offline_sync", "view"),
    permission("offline_sync", "create"),
    permission("offline_sync", "update"),
    permission("offline_sync", "delete"),
  ],
  listing_agent: [
    ...view("dashboard"),
    permission("listings", "view"),
    permission("listings", "create"),
    permission("listings", "update"),
    permission("listings", "assign"),
    permission("leads", "view"),
    permission("leads", "create"),
    permission("deals", "view"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("calendar", "update"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("documents", "update"),
    permission("eids_compliance", "view"),
    permission("eids_compliance", "create"),
    permission("eids_compliance", "update"),
    permission("communications", "view"),
    permission("communications", "create"),
    permission("offline_sync", "view"),
    permission("offline_sync", "create"),
    permission("offline_sync", "update"),
    permission("offline_sync", "delete"),
  ],
  property_manager: [
    ...view("dashboard"),
    permission("listings", "view"),
    permission("listings", "update"),
    permission("leads", "view"),
    permission("leads", "create"),
    permission("deals", "view"),
    permission("deals", "create"),
    permission("deals", "update"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("tickets", "update"),
    permission("tickets", "assign"),
    permission("tickets", "approve"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("calendar", "update"),
    permission("calendar", "delete"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("documents", "update"),
    permission("eids_compliance", "view"),
    permission("finance", "view"),
    permission("reports", "view"),
    permission("reports", "export"),
    permission("communications", "view"),
    permission("communications", "create"),
    permission("offline_sync", "view"),
    permission("offline_sync", "create"),
    permission("offline_sync", "update"),
    permission("offline_sync", "delete"),
  ],
  accountant: [
    ...view("dashboard"),
    permission("listings", "view"),
    permission("deals", "view"),
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
    permission("settings", "view"),
    permission("communications", "view"),
  ],
  maintenance: [
    ...view("dashboard"),
    permission("tickets", "view"),
    permission("tickets", "update"),
    permission("calendar", "view"),
    permission("calendar", "create"),
    permission("calendar", "update"),
    permission("documents", "view"),
    permission("documents", "create"),
    permission("communications", "view"),
    permission("communications", "create"),
    permission("offline_sync", "view"),
    permission("offline_sync", "create"),
    permission("offline_sync", "update"),
    permission("offline_sync", "delete"),
  ],
  client: [
    ...view("dashboard"),
    permission("listings", "view"),
    permission("deals", "view"),
    permission("tickets", "view"),
    permission("tickets", "create"),
    permission("documents", "view"),
    permission("finance", "view"),
    permission("finance", "export"),
    permission("reports", "view"),
    permission("reports", "export"),
    permission("communications", "view"),
    permission("communications", "create"),
  ],
  viewer: [
    ...view("dashboard"),
    permission("listings", "view"),
    permission("leads", "view"),
    permission("deals", "view"),
    permission("tickets", "view"),
    permission("calendar", "view"),
    permission("documents", "view"),
    permission("eids_compliance", "view"),
    permission("finance", "view"),
    permission("reports", "view"),
    permission("communications", "view"),
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

export function getAccessibleResources(role: Role | null | undefined): Resource[] {
  if (!isValidRole(role)) return []
  const seen = new Set<Resource>()
  for (const p of rolePermissions[role]) {
    const [resource] = p.split(":") as [Resource]
    seen.add(resource)
  }
  return Array.from(seen)
}

export function isAdmin(role: Role | null | undefined): boolean {
  return role === "super_admin" || role === "company_admin"
}

export function isManagerOrAbove(role: Role | null | undefined): boolean {
  if (!isValidRole(role)) return false
  const def = roleDefinitions.find((r) => r.key === role)
  return (def?.level ?? 0) >= 70
}

export function roleScope(role: Role | null | undefined): RoleDefinition["scope"] | null {
  if (!isValidRole(role)) return null
  return roleDefinitions.find((r) => r.key === role)?.scope ?? null
}
