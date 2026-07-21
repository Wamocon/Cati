-- User and role management for 1Cati ("German ERP power").
--
-- Adds the admin-facing user administration the client asked for: create users,
-- deactivate users, edit roles, and assign MULTIPLE business roles per user.
--
-- SAFETY INVARIANT (additive, non-breaking):
--   * Every existing profile is backfilled with exactly ONE role assignment equal
--     to its current profiles.role (is_primary = true). A single-assignment user
--     therefore has IDENTICAL effective permissions to before this migration;
--     profiles.role stays the canonical "primary" role that all existing RLS and
--     UI gates continue to read. Permissions only widen once an admin adds a
--     SECOND role.
--   * profiles.role is always recomputed to the HIGHEST-level assigned role, so
--     the existing single-role RLS on every other table stays coherent.
--
-- Security model (mirrors the audited authority / accountant subsystems):
--   * profile_role_assignments has RLS from the start: a user may read own rows;
--     an organization admin may read/manage rows inside their own company.
--   * The admin tier is platform-provisioned. This subsystem never creates or
--     assigns the 'admin' role (mirrors admin_set_company_member_authority).
--   * Role and activation changes go through SECURITY DEFINER RPCs that validate
--     caller = organization admin of the same company and write an audit_events
--     row. Direct profiles.role mutation stays gated by the existing
--     prevent_profile_privilege_escalation trigger; the RPCs set the established
--     app.authority_change_command guard before recomputing the primary role.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Activation state on profiles (additive; defaults keep everyone active).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

-- ---------------------------------------------------------------------------
-- 2. Multi-role assignment table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profile_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (
    role IN ('admin', 'manager', 'accountant', 'staff', 'owner', 'tenant')
  ),
  is_primary BOOLEAN NOT NULL DEFAULT false,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, role)
);

CREATE INDEX IF NOT EXISTS idx_profile_role_assignments_profile
  ON public.profile_role_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_role_assignments_role
  ON public.profile_role_assignments(role);

-- ---------------------------------------------------------------------------
-- 3. Backfill: exactly one assignment per existing profile from profiles.role.
--    This is what preserves identical behavior for every current user.
-- ---------------------------------------------------------------------------
INSERT INTO public.profile_role_assignments (profile_id, role, is_primary)
SELECT p.id, p.role, true
FROM public.profiles p
ON CONFLICT (profile_id, role) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Helpers.
-- ---------------------------------------------------------------------------

-- The caller's effective assignment roles (falls back to profiles.role so a
-- profile that predates the assignment table still resolves to its base role).
CREATE OR REPLACE FUNCTION public.current_user_roles()
RETURNS SETOF text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.role
  FROM public.profile_role_assignments a
  WHERE a.profile_id = (SELECT auth.uid())
  UNION
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_role_assignments a2
      WHERE a2.profile_id = p.id
    );
$$;

-- Company of a target profile, read as definer so RLS policies on the
-- assignment table do not have to recurse into profiles RLS.
CREATE OR REPLACE FUNCTION public.profile_company(p_profile_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE id = p_profile_id LIMIT 1;
$$;

-- Read-only JSON projection of a managed user, used as the RPC return payload.
CREATE OR REPLACE FUNCTION public.managed_user_json(p_profile_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'fullName', p.full_name,
    'email', p.email,
    'isActive', p.is_active,
    'deactivatedAt', p.deactivated_at,
    'primaryRole', p.role,
    'updatedAt', p.updated_at,
    'roles', COALESCE(
      (
        SELECT jsonb_agg(a.role ORDER BY public.role_level(a.role) DESC, a.role)
        FROM public.profile_role_assignments a
        WHERE a.profile_id = p.id
      ),
      to_jsonb(ARRAY[p.role])
    ),
    'source', 'supabase'
  )
  FROM public.profiles p
  WHERE p.id = p_profile_id;
$$;

-- Recompute profiles.role to the highest-level assigned role and refresh the
-- is_primary flags. Sets the established authority-command guard so the
-- privilege-escalation trigger accepts the reasoned, admin-scoped change.
CREATE OR REPLACE FUNCTION public.recompute_profile_primary_role(p_profile_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_top TEXT;
  v_current TEXT;
BEGIN
  SELECT a.role
    INTO v_top
  FROM public.profile_role_assignments a
  WHERE a.profile_id = p_profile_id
  ORDER BY public.role_level(a.role) DESC, a.role
  LIMIT 1;

  IF v_top IS NULL THEN
    RETURN; -- No assignments left; caller guarantees this never happens.
  END IF;

  UPDATE public.profile_role_assignments a
  SET is_primary = (a.role = v_top)
  WHERE a.profile_id = p_profile_id;

  SELECT p.role INTO v_current FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_current IS DISTINCT FROM v_top THEN
    PERFORM set_config('app.authority_change_command', 'on', TRUE);
    UPDATE public.profiles
    SET role = v_top
    WHERE id = p_profile_id;
  END IF;
END;
$$;

-- Validate that the caller is an organization admin allowed to manage the
-- target, and return the locked target row. Rejects self-management and the
-- platform-provisioned admin tier.
CREATE OR REPLACE FUNCTION public.assert_user_role_admin(p_profile_id UUID)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_actor_company UUID := public.current_user_company_id();
  v_target public.profiles%ROWTYPE;
BEGIN
  SELECT * INTO v_target
  FROM public.profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.is_platform_super_admin() THEN
    IF v_actor_role <> 'admin'
       OR v_actor_company IS NULL
       OR v_target.company_id IS DISTINCT FROM v_actor_company
    THEN
      RAISE EXCEPTION
        'Only an organization administrator may manage users in their own company.'
        USING ERRCODE = '42501';
    END IF;
    IF p_profile_id = v_actor_id THEN
      RAISE EXCEPTION 'Administrators cannot change their own access.'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION
      'The administrator tier is platform-provisioned and cannot be changed here.'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_target;
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Mutation commands.
-- ---------------------------------------------------------------------------

-- Add a business role to a user (idempotent), then recompute the primary role.
CREATE OR REPLACE FUNCTION public.admin_assign_role(
  p_profile_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
BEGIN
  IF p_role = 'admin' THEN
    RAISE EXCEPTION
      'The administrator role is platform-provisioned and cannot be assigned here.'
      USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('manager', 'accountant', 'staff', 'owner', 'tenant') THEN
    RAISE EXCEPTION 'Unsupported role: %', p_role;
  END IF;

  v_target := public.assert_user_role_admin(p_profile_id);

  INSERT INTO public.profile_role_assignments (
    profile_id, role, is_primary, granted_by
  ) VALUES (
    p_profile_id, p_role, false, v_actor_id
  )
  ON CONFLICT (profile_id, role) DO NOTHING;

  PERFORM public.recompute_profile_primary_role(p_profile_id);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user_role.assigned',
    'profile_role_assignments', p_profile_id,
    jsonb_build_object('role', p_role)
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

-- Remove a business role. Never removes the last remaining role.
CREATE OR REPLACE FUNCTION public.admin_revoke_role(
  p_profile_id UUID,
  p_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
  v_remaining INTEGER;
  v_has_role BOOLEAN;
BEGIN
  v_target := public.assert_user_role_admin(p_profile_id);

  SELECT
    COUNT(*),
    BOOL_OR(a.role = p_role)
  INTO v_remaining, v_has_role
  FROM public.profile_role_assignments a
  WHERE a.profile_id = p_profile_id;

  IF NOT COALESCE(v_has_role, false) THEN
    RAISE EXCEPTION 'That role is not assigned to the user.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_remaining <= 1 THEN
    RAISE EXCEPTION 'A user must keep at least one role.';
  END IF;

  DELETE FROM public.profile_role_assignments
  WHERE profile_id = p_profile_id AND role = p_role;

  PERFORM public.recompute_profile_primary_role(p_profile_id);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user_role.revoked',
    'profile_role_assignments', p_profile_id,
    jsonb_build_object('role', p_role)
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

-- Activate or deactivate a user. is_active is not a privileged trigger field,
-- so this does not touch the role/authority path.
CREATE OR REPLACE FUNCTION public.admin_set_user_active(
  p_profile_id UUID,
  p_active BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
BEGIN
  v_target := public.assert_user_role_admin(p_profile_id);

  UPDATE public.profiles
  SET
    is_active = p_active,
    deactivated_at = CASE WHEN p_active THEN NULL ELSE NOW() END
  WHERE id = p_profile_id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user.activation_changed',
    'profiles', p_profile_id,
    jsonb_build_object('isActive', p_active)
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS: own-read for users, read/manage for same-company org admins.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profile_role_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profile_role_assignments_self_read
  ON public.profile_role_assignments;
CREATE POLICY profile_role_assignments_self_read
  ON public.profile_role_assignments FOR SELECT TO authenticated
  USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_role_assignments_admin_all
  ON public.profile_role_assignments;
CREATE POLICY profile_role_assignments_admin_all
  ON public.profile_role_assignments FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) = 'admin'
      AND public.profile_company(profile_id)
          = (SELECT public.current_user_company_id())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) = 'admin'
      AND public.profile_company(profile_id)
          = (SELECT public.current_user_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Grants. Mutations run only through the SECURITY DEFINER commands.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.current_user_roles() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_roles() TO authenticated;

REVOKE ALL ON FUNCTION public.profile_company(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.managed_user_json(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recompute_profile_primary_role(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assert_user_role_admin(UUID) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.admin_assign_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_revoke_role(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_assign_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN)
  TO authenticated;

COMMENT ON FUNCTION public.admin_assign_role(UUID, TEXT) IS
  'Adds a business role to a company user and recomputes the primary (highest-level) role; organization admin only, never the admin tier.';
COMMENT ON FUNCTION public.admin_revoke_role(UUID, TEXT) IS
  'Removes a business role from a company user (never the last one) and recomputes the primary role; organization admin only.';
COMMENT ON FUNCTION public.admin_set_user_active(UUID, BOOLEAN) IS
  'Activates or deactivates a company user; organization admin only, not the admin tier or the caller.';

-- Keep the signup path consistent with multi-role: every new profile also gets a
-- primary role assignment, so admin_assign_role never loses the original role for
-- users created after this migration's one-time backfill ran.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_language TEXT := lower(COALESCE(NEW.raw_user_meta_data->>'language', 'tr'));
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language, company_id, email)
  VALUES (
    NEW.id,
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    'tenant',
    CASE WHEN v_language IN ('tr', 'en', 'de', 'ru') THEN v_language ELSE 'tr' END,
    NULL,
    NEW.email
  );
  INSERT INTO public.profile_role_assignments (profile_id, role, is_primary, granted_by)
  VALUES (NEW.id, 'tenant', TRUE, NEW.id)
  ON CONFLICT (profile_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

COMMIT;
