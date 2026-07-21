import { randomUUID } from "node:crypto"
import {
  closeSync,
  openSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  isAccessProfileEnabled,
  isSupabaseConfigured,
  type UserProfile,
} from "@/lib/auth"
import { isValidRole, roleLevel, type Role } from "@/lib/rbac"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"

// The access-profile placeholder id used for local/QA sessions.
const ACCESS_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

// Roles an admin may create/assign through this subsystem. The 'admin' tier is
// platform-provisioned and deliberately excluded (mirrors role governance).
export const assignableUserRoles: Role[] = [
  "manager",
  "accountant",
  "staff",
  "owner",
  "tenant",
]

export type UserAdminSource = "supabase" | "local-qa"

export interface ManagedUser {
  id: string
  fullName: string
  email: string | null
  isActive: boolean
  primaryRole: Role
  roles: Role[]
  isCurrentActor: boolean
  // false for the caller's own row and for the platform-provisioned admin tier.
  mutable: boolean
}

export interface UserAdministration {
  available: boolean
  unavailableReason: "real_auth_required" | "company_scope_required" | null
  source: UserAdminSource
  assignableRoles: Role[]
  users: ManagedUser[]
}

export interface CreateManagedUserInput {
  email: string
  fullName: string
  role: Role
}

export class UserAdminError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number
  ) {
    super(message)
    this.name = "UserAdminError"
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function isRealOrganizationAdmin(profile: UserProfile): boolean {
  return Boolean(
    profile.role === "admin" &&
      profile.company_id &&
      profile.id !== ACCESS_PROFILE_ID &&
      isSupabaseConfigured()
  )
}

function sortRolesByLevel(list: Role[]): Role[] {
  return [...new Set(list)].sort((a, b) => roleLevel(b) - roleLevel(a))
}

function primaryOf(list: Role[]): Role {
  return sortRolesByLevel(list)[0] ?? "tenant"
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function validateCreateInput(input: unknown): CreateManagedUserInput {
  const record = asRecord(input)
  const email = asString(record.email).trim().toLowerCase()
  const fullName = asString(record.fullName).trim()
  const role = record.role

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
    throw new UserAdminError(
      "USER_ADMIN_EMAIL_INVALID",
      "A valid email address is required.",
      422
    )
  }
  if (fullName.length < 2 || fullName.length > 120) {
    throw new UserAdminError(
      "USER_ADMIN_NAME_INVALID",
      "A full name between 2 and 120 characters is required.",
      422
    )
  }
  if (!isValidRole(role) || role === "admin") {
    throw new UserAdminError(
      "USER_ADMIN_ROLE_INVALID",
      "Choose one of the assignable roles (not the administrator tier).",
      422
    )
  }
  return { email, fullName, role }
}

function assertAssignableRole(role: unknown): Role {
  if (!isValidRole(role) || role === "admin") {
    throw new UserAdminError(
      "USER_ADMIN_ROLE_INVALID",
      "This control may assign manager, accountant, staff, owner, or tenant roles only.",
      422
    )
  }
  return role
}

// ---------------------------------------------------------------------------
// Supabase (real organization admin) path
// ---------------------------------------------------------------------------

function mapSupabaseError(error: unknown): UserAdminError {
  const record = asRecord(error)
  const code = asString(record.code)
  const message = asString(record.message) || "The user command failed."

  if (code === "42501" || /platform-provisioned|only an organization|own access/i.test(message)) {
    return new UserAdminError("USER_ADMIN_FORBIDDEN", message, 403)
  }
  if (code === "P0002" || /not found|not assigned/i.test(message)) {
    return new UserAdminError("USER_ADMIN_NOT_FOUND", message, 404)
  }
  if (code === "23505" || /already registered|already exists|duplicate/i.test(message)) {
    return new UserAdminError(
      "USER_ADMIN_CONFLICT",
      "A user with those details already exists.",
      409
    )
  }
  if (/at least one role/i.test(message)) {
    return new UserAdminError("USER_ADMIN_LAST_ROLE", message, 422)
  }
  return new UserAdminError(
    "USER_ADMIN_UNAVAILABLE",
    "User administration is temporarily unavailable.",
    503
  )
}

function managedUserFromJson(value: unknown, actorId: string): ManagedUser {
  const record = asRecord(value)
  const id = asString(record.id)
  const rawRoles = Array.isArray(record.roles)
    ? (record.roles as unknown[]).filter(isValidRole)
    : []
  const primaryRole = isValidRole(record.primaryRole)
    ? record.primaryRole
    : primaryOf(rawRoles)
  const roles = sortRolesByLevel(rawRoles.length > 0 ? rawRoles : [primaryRole])
  return {
    id,
    fullName:
      asString(record.fullName).trim() ||
      asString(record.email).trim() ||
      "Unnamed user",
    email: asString(record.email).trim() || null,
    isActive: record.isActive !== false,
    primaryRole,
    roles,
    isCurrentActor: id === actorId,
    mutable: id !== actorId && primaryRole !== "admin",
  }
}

async function getSupabaseAdministration(
  profile: UserProfile
): Promise<UserAdministration> {
  const supabase = await createClient()
  const [profilesResponse, assignmentsResponse] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active")
      .eq("company_id", profile.company_id as string)
      .order("full_name", { ascending: true }),
    supabase
      .from("profile_role_assignments")
      .select("profile_id, role"),
  ])

  const firstError = profilesResponse.error ?? assignmentsResponse.error
  if (firstError) throw mapSupabaseError(firstError)

  const rolesByProfile = new Map<string, Role[]>()
  for (const rawAssignment of assignmentsResponse.data ?? []) {
    const assignment = asRecord(rawAssignment)
    const profileId = asString(assignment.profile_id)
    const role = assignment.role
    if (!profileId || !isValidRole(role)) continue
    rolesByProfile.set(profileId, [
      ...(rolesByProfile.get(profileId) ?? []),
      role,
    ])
  }

  const users = (profilesResponse.data ?? []).flatMap((rawMember) => {
    const member = asRecord(rawMember)
    const id = asString(member.id)
    const role = member.role
    if (!id || !isValidRole(role)) return []
    const roles = sortRolesByLevel(rolesByProfile.get(id) ?? [role])
    const primaryRole = primaryOf(roles)
    return [
      {
        id,
        fullName:
          asString(member.full_name).trim() ||
          asString(member.email).trim() ||
          "Unnamed user",
        email: asString(member.email).trim() || null,
        isActive: member.is_active !== false,
        primaryRole,
        roles,
        isCurrentActor: id === profile.id,
        mutable: id !== profile.id && primaryRole !== "admin",
      } satisfies ManagedUser,
    ]
  })

  return {
    available: true,
    unavailableReason: null,
    source: "supabase",
    assignableRoles: assignableUserRoles,
    users,
  }
}

async function createSupabaseManagedUser(
  profile: UserProfile,
  input: CreateManagedUserInput
): Promise<ManagedUser> {
  const service = createServiceRoleClient()
  if (!service) {
    throw new UserAdminError(
      "USER_ADMIN_SERVICE_ROLE_REQUIRED",
      "Creating users requires the server service-role configuration.",
      503
    )
  }

  const { data: created, error: createError } =
    await service.auth.admin.createUser({
      email: input.email,
      email_confirm: true,
      user_metadata: { full_name: input.fullName, language: "tr" },
    })
  if (createError || !created?.user) {
    throw mapSupabaseError(createError ?? { message: "User could not be created." })
  }
  const newId = created.user.id

  // The signup trigger inserts a base tenant profile; elevate it to the chosen
  // company/role. The service-role client passes the privilege-escalation
  // trigger as platform provisioning.
  const { error: profileError } = await service
    .from("profiles")
    .update({
      company_id: profile.company_id,
      full_name: input.fullName,
      role: input.role,
      is_active: true,
    })
    .eq("id", newId)
  if (profileError) throw mapSupabaseError(profileError)

  const { error: assignmentError } = await service
    .from("profile_role_assignments")
    .upsert(
      {
        profile_id: newId,
        role: input.role,
        is_primary: true,
        granted_by: profile.id,
      },
      { onConflict: "profile_id,role" }
    )
  if (assignmentError) throw mapSupabaseError(assignmentError)

  const { data: row, error: readError } = await service
    .from("profiles")
    .select("id, full_name, email, role, is_active")
    .eq("id", newId)
    .single()
  if (readError || !row) throw mapSupabaseError(readError ?? {})

  const record = asRecord(row)
  return {
    id: newId,
    fullName: asString(record.full_name).trim() || input.fullName,
    email: asString(record.email).trim() || input.email,
    isActive: record.is_active !== false,
    primaryRole: input.role,
    roles: [input.role],
    isCurrentActor: false,
    mutable: true,
  }
}

async function callSupabaseRpc(
  profile: UserProfile,
  fn: "admin_assign_role" | "admin_revoke_role" | "admin_set_user_active",
  args: Record<string, unknown>
): Promise<ManagedUser> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc(fn, args)
  if (error) throw mapSupabaseError(error)
  return managedUserFromJson(data, profile.id)
}

// ---------------------------------------------------------------------------
// Local-QA fallback path (access-profile mode). File-backed so the panel is
// usable and persistent across requests in controlled QA, mirroring the
// manual-payment local store.
// ---------------------------------------------------------------------------

interface LocalManagedUserFacts {
  id: string
  fullName: string
  email: string
  roles: Role[]
  isActive: boolean
  created: boolean
}

interface LocalUserAdminState {
  version: 1
  overrides: LocalManagedUserFacts[]
}

const LOCAL_BASELINE: LocalManagedUserFacts[] = [
  { id: "11111111-1111-4111-8111-111111111101", fullName: "Site Yoneticisi (Demo)", email: "manager@cati.local", roles: ["manager"], isActive: true, created: false },
  { id: "11111111-1111-4111-8111-111111111102", fullName: "Muhasebe (Demo)", email: "accountant@cati.local", roles: ["accountant"], isActive: true, created: false },
  { id: "11111111-1111-4111-8111-111111111103", fullName: "Teknik Personel (Demo)", email: "staff@cati.local", roles: ["staff"], isActive: true, created: false },
  { id: "11111111-1111-4111-8111-111111111104", fullName: "Malik (Demo)", email: "owner@cati.local", roles: ["owner"], isActive: true, created: false },
  { id: "11111111-1111-4111-8111-111111111105", fullName: "Kiraci (Demo)", email: "tenant@cati.local", roles: ["tenant"], isActive: true, created: false },
  { id: "11111111-1111-4111-8111-111111111100", fullName: "Organizasyon Yoneticisi (Demo)", email: "admin@cati.local", roles: ["admin"], isActive: true, created: false },
]

const stateNamespace =
  process.env.CATI_LOCAL_STATE_NAMESPACE ??
  Buffer.from(process.cwd()).toString("base64url").slice(-64)
const statePath = join(tmpdir(), `cati-user-role-admin-${stateNamespace}.v1.json`)
const lockPath = `${statePath}.lock`
const waitBuffer = new Int32Array(new SharedArrayBuffer(4))

function localPersistenceEnabled() {
  return !isSupabaseConfigured() || isAccessProfileEnabled()
}

function acquireLock() {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      const descriptor = openSync(lockPath, "wx", 0o600)
      closeSync(descriptor)
      return
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error
      try {
        if (Date.now() - statSync(lockPath).mtimeMs > 30_000) {
          unlinkSync(lockPath)
          continue
        }
      } catch (lockError) {
        if ((lockError as NodeJS.ErrnoException).code !== "ENOENT") throw lockError
      }
      Atomics.wait(waitBuffer, 0, 0, 10)
    }
  }
  throw new UserAdminError(
    "USER_ADMIN_BUSY",
    "The local user workspace is busy; retry the request.",
    503
  )
}

function releaseLock() {
  try {
    unlinkSync(lockPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
  }
}

function normalizeLocalFacts(value: unknown): LocalManagedUserFacts | null {
  const record = asRecord(value)
  const id = asString(record.id)
  const roles = Array.isArray(record.roles)
    ? sortRolesByLevel((record.roles as unknown[]).filter(isValidRole))
    : []
  if (!id || roles.length === 0) return null
  return {
    id,
    fullName: asString(record.fullName).trim() || "Unnamed user",
    email: asString(record.email).trim(),
    roles,
    isActive: record.isActive !== false,
    created: record.created === true,
  }
}

function readState(): LocalUserAdminState {
  try {
    const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<LocalUserAdminState>
    if (parsed.version !== 1 || !Array.isArray(parsed.overrides)) {
      throw new Error("Unsupported user-admin local state.")
    }
    return {
      version: 1,
      overrides: parsed.overrides.flatMap((item) => {
        const normalized = normalizeLocalFacts(item)
        return normalized ? [normalized] : []
      }),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { version: 1, overrides: [] }
    }
    throw error
  }
}

function writeState(state: LocalUserAdminState) {
  const temporaryPath = `${statePath}.${process.pid}.${Date.now()}.tmp`
  writeFileSync(temporaryPath, JSON.stringify(state), {
    encoding: "utf8",
    mode: 0o600,
  })
  try {
    renameSync(temporaryPath, statePath)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "EEXIST" && code !== "EPERM") throw error
    try {
      unlinkSync(statePath)
    } catch (unlinkError) {
      if ((unlinkError as NodeJS.ErrnoException).code !== "ENOENT") throw unlinkError
    }
    renameSync(temporaryPath, statePath)
  }
}

function withLocalState<T>(
  write: boolean,
  operation: (state: LocalUserAdminState) => T
): T {
  if (!localPersistenceEnabled()) {
    return operation({ version: 1, overrides: [] })
  }
  acquireLock()
  try {
    const state = readState()
    const result = operation(state)
    if (write) writeState(state)
    return result
  } finally {
    releaseLock()
  }
}

/** Test-only: drop accumulated local user-admin overrides between serial runs. */
export function resetUserAdminStateForTesting() {
  withLocalState(true, (state) => {
    state.overrides.length = 0
  })
}

function materializeLocalUsers(
  state: LocalUserAdminState
): LocalManagedUserFacts[] {
  const overrides = new Map(state.overrides.map((item) => [item.id, item]))
  const baseline = LOCAL_BASELINE.map((base) => overrides.get(base.id) ?? base)
  const created = state.overrides.filter(
    (item) => item.created && !LOCAL_BASELINE.some((base) => base.id === item.id)
  )
  return [...baseline, ...created]
}

function toManagedUser(
  facts: LocalManagedUserFacts,
  actorId: string
): ManagedUser {
  const primaryRole = primaryOf(facts.roles)
  return {
    id: facts.id,
    fullName: facts.fullName,
    email: facts.email || null,
    isActive: facts.isActive,
    primaryRole,
    roles: sortRolesByLevel(facts.roles),
    isCurrentActor: facts.id === actorId,
    mutable: facts.id !== actorId && primaryRole !== "admin",
  }
}

function findLocalTarget(
  state: LocalUserAdminState,
  profileId: string,
  actorId: string
): { facts: LocalManagedUserFacts; override: LocalManagedUserFacts } {
  const materialized = materializeLocalUsers(state).find((u) => u.id === profileId)
  if (!materialized) {
    throw new UserAdminError("USER_ADMIN_NOT_FOUND", "Target user not found.", 404)
  }
  if (materialized.id === actorId) {
    throw new UserAdminError(
      "USER_ADMIN_FORBIDDEN",
      "Administrators cannot change their own access.",
      403
    )
  }
  if (primaryOf(materialized.roles) === "admin") {
    throw new UserAdminError(
      "USER_ADMIN_FORBIDDEN",
      "The administrator tier is platform-provisioned and cannot be changed here.",
      403
    )
  }
  // Clone into a mutable override the caller can edit in place.
  const existing = state.overrides.find((item) => item.id === profileId)
  const override: LocalManagedUserFacts = existing ?? {
    ...materialized,
    roles: [...materialized.roles],
  }
  if (!existing) state.overrides.push(override)
  return { facts: materialized, override }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getUserAdministration(
  profile: UserProfile
): Promise<UserAdministration> {
  if (isRealOrganizationAdmin(profile)) {
    return getSupabaseAdministration(profile)
  }

  if (!isAccessProfileEnabled()) {
    return {
      available: false,
      unavailableReason: profile.company_id
        ? "real_auth_required"
        : "company_scope_required",
      source: "local-qa",
      assignableRoles: assignableUserRoles,
      users: [],
    }
  }

  const users = withLocalState(false, (state) =>
    materializeLocalUsers(state).map((facts) => toManagedUser(facts, profile.id))
  )
  return {
    available: true,
    unavailableReason: null,
    source: "local-qa",
    assignableRoles: assignableUserRoles,
    users,
  }
}

export async function createManagedUser(
  profile: UserProfile,
  input: unknown
): Promise<ManagedUser> {
  const validated = validateCreateInput(input)

  if (isRealOrganizationAdmin(profile)) {
    return createSupabaseManagedUser(profile, validated)
  }
  if (!isAccessProfileEnabled()) {
    throw new UserAdminError(
      "USER_ADMIN_REAL_AUTH_REQUIRED",
      "Creating users requires a real organization-admin session.",
      403
    )
  }

  return withLocalState(true, (state) => {
    const email = validated.email
    if (materializeLocalUsers(state).some((u) => u.email === email)) {
      throw new UserAdminError(
        "USER_ADMIN_CONFLICT",
        "A user with that email already exists.",
        409
      )
    }
    const facts: LocalManagedUserFacts = {
      id: randomUUID(),
      fullName: validated.fullName,
      email,
      roles: [validated.role],
      isActive: true,
      created: true,
    }
    state.overrides.push(facts)
    return toManagedUser(facts, profile.id)
  })
}

export async function assignManagedUserRole(
  profile: UserProfile,
  profileId: string,
  role: unknown
): Promise<ManagedUser> {
  const nextRole = assertAssignableRole(role)

  if (isRealOrganizationAdmin(profile)) {
    return callSupabaseRpc(profile, "admin_assign_role", {
      p_profile_id: profileId,
      p_role: nextRole,
    })
  }
  if (!isAccessProfileEnabled()) {
    throw new UserAdminError(
      "USER_ADMIN_REAL_AUTH_REQUIRED",
      "Role changes require a real organization-admin session.",
      403
    )
  }

  return withLocalState(true, (state) => {
    const { override } = findLocalTarget(state, profileId, profile.id)
    if (!override.roles.includes(nextRole)) override.roles.push(nextRole)
    override.roles = sortRolesByLevel(override.roles)
    return toManagedUser(override, profile.id)
  })
}

export async function revokeManagedUserRole(
  profile: UserProfile,
  profileId: string,
  role: unknown
): Promise<ManagedUser> {
  const targetRole = assertAssignableRole(role)

  if (isRealOrganizationAdmin(profile)) {
    return callSupabaseRpc(profile, "admin_revoke_role", {
      p_profile_id: profileId,
      p_role: targetRole,
    })
  }
  if (!isAccessProfileEnabled()) {
    throw new UserAdminError(
      "USER_ADMIN_REAL_AUTH_REQUIRED",
      "Role changes require a real organization-admin session.",
      403
    )
  }

  return withLocalState(true, (state) => {
    const { override } = findLocalTarget(state, profileId, profile.id)
    if (!override.roles.includes(targetRole)) {
      throw new UserAdminError(
        "USER_ADMIN_NOT_FOUND",
        "That role is not assigned to the user.",
        404
      )
    }
    if (override.roles.length <= 1) {
      throw new UserAdminError(
        "USER_ADMIN_LAST_ROLE",
        "A user must keep at least one role.",
        422
      )
    }
    override.roles = sortRolesByLevel(
      override.roles.filter((item) => item !== targetRole)
    )
    return toManagedUser(override, profile.id)
  })
}

export async function setManagedUserActive(
  profile: UserProfile,
  profileId: string,
  active: boolean
): Promise<ManagedUser> {
  if (isRealOrganizationAdmin(profile)) {
    return callSupabaseRpc(profile, "admin_set_user_active", {
      p_profile_id: profileId,
      p_active: active,
    })
  }
  if (!isAccessProfileEnabled()) {
    throw new UserAdminError(
      "USER_ADMIN_REAL_AUTH_REQUIRED",
      "Activation changes require a real organization-admin session.",
      403
    )
  }

  return withLocalState(true, (state) => {
    const { override } = findLocalTarget(state, profileId, profile.id)
    override.isActive = active
    return toManagedUser(override, profile.id)
  })
}
