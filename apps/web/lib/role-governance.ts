import {
  getAccessibleResources,
  getRolePermissions,
  roleDefinitions,
  type Permission,
  type Resource,
  type Role,
} from "./rbac"

export const governanceViews = ["organization", "site", "self"] as const
export type GovernanceView = (typeof governanceViews)[number]

export const governanceCapabilityStatuses = [
  "available",
  "approval_required",
  "provider_blocked",
  "unavailable",
] as const
export type GovernanceCapabilityStatus =
  (typeof governanceCapabilityStatuses)[number]

export const governanceAuthorities = [
  "organization_administrator",
  "property_manager",
  "finance_controller",
  "field_operator",
  "unit_owner",
  "unit_tenant",
] as const
export type GovernanceAuthority = (typeof governanceAuthorities)[number]

export const governanceScopeKinds = [
  "protected_platform",
  "organization",
  "site",
  "finance",
  "assignment",
  "owned_unit",
  "rented_unit",
  "public_intake",
] as const
export type GovernanceScopeKind = (typeof governanceScopeKinds)[number]

export const governancePersonaKeys = [
  "platform_super_admin",
  "organization_admin",
  "property_manager",
  "accountant",
  "internal_field_staff",
  "contractor",
  "owner",
  "tenant",
  "public_intake",
] as const
export type GovernancePersonaKey = (typeof governancePersonaKeys)[number]

export interface CanonicalRoleGovernanceDefinition {
  role: Role
  authority: GovernanceAuthority
  scopeKind: Exclude<
    GovernanceScopeKind,
    "protected_platform" | "assignment" | "public_intake"
  >
  canCrossOrganizations: false
  isPlatformSuperAdmin: false
  permissionCount: number
  resources: Resource[]
  permissions: Permission[]
}

export interface GovernancePersonaDefinition {
  key: GovernancePersonaKey
  baseRole: Role | null
  scopeKind: GovernanceScopeKind
  status: GovernanceCapabilityStatus
  assignable: boolean
  crossOrganizationAccess: boolean
}

export const roleGovernanceRegistry: Record<
  Role,
  CanonicalRoleGovernanceDefinition
> = {
  admin: createRoleGovernance(
    "admin",
    "organization_administrator",
    "organization"
  ),
  manager: createRoleGovernance("manager", "property_manager", "site"),
  accountant: createRoleGovernance(
    "accountant",
    "finance_controller",
    "finance"
  ),
  staff: createRoleGovernance("staff", "field_operator", "site"),
  owner: createRoleGovernance("owner", "unit_owner", "owned_unit"),
  tenant: createRoleGovernance("tenant", "unit_tenant", "rented_unit"),
}

// Personas are intentionally separate from the six persisted business roles.
// This prevents a company administrator from silently becoming a platform-wide
// super-admin and keeps contractor/public boundaries explicit until their data
// relationships and audited workflows exist.
export const governancePersonas: GovernancePersonaDefinition[] = [
  {
    key: "platform_super_admin",
    baseRole: null,
    scopeKind: "protected_platform",
    status: "unavailable",
    assignable: false,
    crossOrganizationAccess: true,
  },
  {
    key: "organization_admin",
    baseRole: "admin",
    scopeKind: "organization",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "property_manager",
    baseRole: "manager",
    scopeKind: "site",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "accountant",
    baseRole: "accountant",
    scopeKind: "finance",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "internal_field_staff",
    baseRole: "staff",
    scopeKind: "site",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "contractor",
    baseRole: "staff",
    scopeKind: "assignment",
    status: "approval_required",
    assignable: false,
    crossOrganizationAccess: false,
  },
  {
    key: "owner",
    baseRole: "owner",
    scopeKind: "owned_unit",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "tenant",
    baseRole: "tenant",
    scopeKind: "rented_unit",
    status: "available",
    assignable: true,
    crossOrganizationAccess: false,
  },
  {
    key: "public_intake",
    baseRole: null,
    scopeKind: "public_intake",
    status: "unavailable",
    assignable: false,
    crossOrganizationAccess: false,
  },
]

export const governanceControlKeys = [
  "permission_visibility",
  "role_assignment",
  "site_assignment",
  "sensitive_approval",
  "provider_activation",
  "cross_organization_access",
  "public_emergency_dispatch",
] as const
export type GovernanceControlKey = (typeof governanceControlKeys)[number]

export interface GovernanceControlDefinition {
  key: GovernanceControlKey
  status: GovernanceCapabilityStatus
}

const organizationControls: GovernanceControlDefinition[] = [
  { key: "permission_visibility", status: "available" },
  { key: "role_assignment", status: "approval_required" },
  { key: "site_assignment", status: "approval_required" },
  { key: "sensitive_approval", status: "approval_required" },
  { key: "provider_activation", status: "provider_blocked" },
  { key: "cross_organization_access", status: "unavailable" },
  { key: "public_emergency_dispatch", status: "unavailable" },
]

const siteControls: GovernanceControlDefinition[] = [
  { key: "permission_visibility", status: "available" },
  { key: "site_assignment", status: "approval_required" },
  { key: "sensitive_approval", status: "approval_required" },
  { key: "provider_activation", status: "provider_blocked" },
  { key: "role_assignment", status: "unavailable" },
  { key: "cross_organization_access", status: "unavailable" },
  { key: "public_emergency_dispatch", status: "unavailable" },
]

const selfControls: GovernanceControlDefinition[] = [
  { key: "permission_visibility", status: "available" },
  { key: "role_assignment", status: "unavailable" },
  { key: "site_assignment", status: "unavailable" },
  { key: "sensitive_approval", status: "unavailable" },
  { key: "provider_activation", status: "provider_blocked" },
  { key: "cross_organization_access", status: "unavailable" },
  { key: "public_emergency_dispatch", status: "unavailable" },
]

export interface GovernanceActorScope {
  role: Role
  authority: GovernanceAuthority
  view: GovernanceView
  scopeKind: CanonicalRoleGovernanceDefinition["scopeKind"]
  boundaryId: string | null
  boundaryConfigured: boolean
  canCrossOrganizations: false
  isPlatformSuperAdmin: false
}

export interface RoleGovernanceDTO {
  actor: GovernanceActorScope
  controls: GovernanceControlDefinition[]
  roles: CanonicalRoleGovernanceDefinition[]
  personas: GovernancePersonaDefinition[]
  readonly: true
  schemaVersion: "2026-07-roles-v1"
}

interface GovernanceProfileInput {
  role: Role
  company_id?: string | null
  office_id?: string | null
}

export function buildRoleGovernanceDTO(
  profile: GovernanceProfileInput
): RoleGovernanceDTO {
  const roleDefinition = roleGovernanceRegistry[profile.role]
  const view: GovernanceView =
    profile.role === "admin"
      ? "organization"
      : profile.role === "manager"
        ? "site"
        : "self"
  const boundaryId =
    view === "organization"
      ? profile.company_id ?? null
      : view === "site"
        ? profile.office_id ?? null
        : null

  return {
    actor: {
      role: profile.role,
      authority: roleDefinition.authority,
      view,
      scopeKind: roleDefinition.scopeKind,
      boundaryId,
      boundaryConfigured: Boolean(boundaryId),
      canCrossOrganizations: false,
      isPlatformSuperAdmin: false,
    },
    controls:
      view === "organization"
        ? organizationControls
        : view === "site"
          ? siteControls
          : selfControls,
    roles: visibleRoleDefinitions(view, profile.role),
    personas: visiblePersonaDefinitions(view, profile.role),
    readonly: true,
    schemaVersion: "2026-07-roles-v1",
  }
}

function createRoleGovernance(
  role: Role,
  authority: GovernanceAuthority,
  scopeKind: CanonicalRoleGovernanceDefinition["scopeKind"]
): CanonicalRoleGovernanceDefinition {
  const permissions = getRolePermissions(role)

  return {
    role,
    authority,
    scopeKind,
    canCrossOrganizations: false,
    isPlatformSuperAdmin: false,
    permissionCount: permissions.length,
    resources: getAccessibleResources(role),
    permissions,
  }
}

function visibleRoleDefinitions(
  view: GovernanceView,
  actorRole: Role
): CanonicalRoleGovernanceDefinition[] {
  if (view === "organization") {
    return roleDefinitions.map((definition) =>
      roleGovernanceRegistry[definition.key]
    )
  }

  if (view === "site") {
    return roleDefinitions
      .filter((definition) => definition.key !== "admin")
      .map((definition) => roleGovernanceRegistry[definition.key])
  }

  return [roleGovernanceRegistry[actorRole]]
}

function visiblePersonaDefinitions(
  view: GovernanceView,
  actorRole: Role
): GovernancePersonaDefinition[] {
  if (view === "organization") return governancePersonas
  if (view === "site") {
    return governancePersonas.filter((persona) =>
      [
        "property_manager",
        "accountant",
        "internal_field_staff",
        "contractor",
        "owner",
        "tenant",
        "public_intake",
      ].includes(persona.key)
    )
  }

  return governancePersonas.filter((persona) => persona.baseRole === actorRole)
}
