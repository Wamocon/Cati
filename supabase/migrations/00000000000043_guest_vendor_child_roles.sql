-- Phase-1 foundation for the guest / vendor / guardianship role expansion.
--
-- ADDITIVE ONLY. The six existing roles behave identically: their CHECK, level
-- and scope entries are unchanged and no existing policy or grant is loosened.
-- This migration:
--   1. Adds minor / consent metadata columns to profiles.
--   2. Widens the role CHECK on profiles.role and profile_role_assignments.role
--      to the full 11-role set (mirrors apps/web/lib/rbac.ts `roles`).
--   3. Extends the role_level / role_scope SQL helpers (mig 1) for the new roles.
--   4. Adds guardianships + delegated_grants with RLS, an is_active_guardian_of
--      RLS helper, and mig-41-style grant hardening (table DML revoked from
--      `authenticated`; writes go via admin / service-role / RPC in a later phase;
--      the RLS-evaluated helper keeps EXECUTE for `authenticated`).
--
-- OUT OF SCOPE (later phases): wallet / activities / vendor_invoices tables and
-- any new pages. Keep everything here additive.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Minor / consent metadata on profiles (additive; defaults keep every
--    existing profile a non-minor with no consent record).
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_minor boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS date_of_birth date,
  ADD COLUMN IF NOT EXISTS age_band text,
  ADD COLUMN IF NOT EXISTS consent_recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_by uuid;

-- ---------------------------------------------------------------------------
-- 2. Widen the role CHECK constraints to the full 11-role set.
--    Kept in sync with apps/web/lib/rbac.ts `roles`. profiles_role_check is the
--    named constraint from mig 1; profile_role_assignments_role_check is the
--    auto-generated name of the inline column CHECK created in mig 40.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'manager',
    'accountant',
    'staff',
    'owner',
    'tenant',
    'guest',
    'service_provider',
    'child_owner',
    'child_tenant',
    'child_guest'
  ));

ALTER TABLE public.profile_role_assignments
  DROP CONSTRAINT IF EXISTS profile_role_assignments_role_check;
ALTER TABLE public.profile_role_assignments
  ADD CONSTRAINT profile_role_assignments_role_check
  CHECK (role IN (
    'admin',
    'manager',
    'accountant',
    'staff',
    'owner',
    'tenant',
    'guest',
    'service_provider',
    'child_owner',
    'child_tenant',
    'child_guest'
  ));

-- ---------------------------------------------------------------------------
-- 3. Extend the role hierarchy / scope helpers (defined in mig 1) so the new
--    roles resolve consistently. Levels and scopes mirror lib/rbac.ts exactly.
--    is_admin_role() is `p_role = 'admin'` and current_user_profile_role() reads
--    the stored role directly, so both already handle the new roles correctly and
--    need no change. CREATE OR REPLACE preserves the existing EXECUTE grants.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.role_level(p_role text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin'            THEN 90
    WHEN 'manager'          THEN 70
    WHEN 'accountant'       THEN 60
    WHEN 'staff'            THEN 40
    WHEN 'service_provider' THEN 25
    WHEN 'owner'            THEN 20
    WHEN 'guest'            THEN 15
    WHEN 'tenant'           THEN 10
    WHEN 'child_owner'      THEN 7
    WHEN 'child_tenant'     THEN 6
    WHEN 'child_guest'      THEN 5
    ELSE 0
  END;
$$;

CREATE OR REPLACE FUNCTION public.role_scope(p_role text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin'            THEN 'company'
    WHEN 'manager'          THEN 'site'
    WHEN 'accountant'       THEN 'finance'
    WHEN 'staff'            THEN 'field'
    WHEN 'owner'            THEN 'owned_unit'
    WHEN 'tenant'           THEN 'rented_unit'
    WHEN 'guest'            THEN 'guest_access'
    WHEN 'service_provider' THEN 'vendor'
    WHEN 'child_owner'      THEN 'managed_minor'
    WHEN 'child_tenant'     THEN 'managed_minor'
    WHEN 'child_guest'      THEN 'managed_minor'
    ELSE 'rented_unit'
  END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Guardianship (parent <-> child) schema.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardianships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  guardian_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  relation text NOT NULL DEFAULT 'parent'
    CHECK (relation IN ('parent', 'guardian', 'delegate')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'revoked')),
  consent_recorded_at timestamptz,
  consent_method text,
  created_at timestamptz DEFAULT now(),
  revoked_at timestamptz,
  UNIQUE (guardian_profile_id, child_profile_id),
  CHECK (guardian_profile_id <> child_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_guardianships_guardian
  ON public.guardianships(guardian_profile_id);
CREATE INDEX IF NOT EXISTS idx_guardianships_child
  ON public.guardianships(child_profile_id);

CREATE TABLE IF NOT EXISTS public.delegated_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guardianship_id uuid NOT NULL
    REFERENCES public.guardianships(id) ON DELETE CASCADE,
  permission text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  valid_until timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delegated_grants_guardianship
  ON public.delegated_grants(guardianship_id);

-- Active-guardian check for RLS. True when the caller is the active, non-revoked
-- guardian of p_child. Evaluated inside RLS policies, so it keeps EXECUTE for
-- `authenticated` (mirrors profile_company / current_user_roles from mig 40).
CREATE OR REPLACE FUNCTION public.is_active_guardian_of(p_child uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.guardianships g
    WHERE g.guardian_profile_id = (SELECT auth.uid())
      AND g.child_profile_id = p_child
      AND g.status = 'active'
      AND g.revoked_at IS NULL
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. RLS. Reads: the child, the guardian, and same-company admins.
--    Writes: same-company admins only (creation is an admin / service-role / RPC
--    concern delivered in a later phase). Mirrors the mig-40 self_read + admin_all
--    shape.
-- ---------------------------------------------------------------------------
ALTER TABLE public.guardianships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delegated_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardianships_read ON public.guardianships;
CREATE POLICY guardianships_read
  ON public.guardianships FOR SELECT TO authenticated
  USING (
    child_profile_id = (SELECT auth.uid())
    OR guardian_profile_id = (SELECT auth.uid())
    OR public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) = 'admin'
      AND company_id = (SELECT public.current_user_company_id())
    )
  );

DROP POLICY IF EXISTS guardianships_admin_all ON public.guardianships;
CREATE POLICY guardianships_admin_all
  ON public.guardianships FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) = 'admin'
      AND company_id = (SELECT public.current_user_company_id())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) = 'admin'
      AND company_id = (SELECT public.current_user_company_id())
    )
  );

DROP POLICY IF EXISTS delegated_grants_read ON public.delegated_grants;
CREATE POLICY delegated_grants_read
  ON public.delegated_grants FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.guardianships g
      WHERE g.id = delegated_grants.guardianship_id
        AND (
          g.child_profile_id = (SELECT auth.uid())
          OR g.guardian_profile_id = (SELECT auth.uid())
          OR public.is_super_admin()
          OR (
            (SELECT public.current_user_profile_role()) = 'admin'
            AND g.company_id = (SELECT public.current_user_company_id())
          )
        )
    )
  );

DROP POLICY IF EXISTS delegated_grants_admin_all ON public.delegated_grants;
CREATE POLICY delegated_grants_admin_all
  ON public.delegated_grants FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.guardianships g
      WHERE g.id = delegated_grants.guardianship_id
        AND (SELECT public.current_user_profile_role()) = 'admin'
        AND g.company_id = (SELECT public.current_user_company_id())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.guardianships g
      WHERE g.id = delegated_grants.guardianship_id
        AND (SELECT public.current_user_profile_role()) = 'admin'
        AND g.company_id = (SELECT public.current_user_company_id())
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grant hardening (mirrors mig 41). Supabase's default privileges grant full
--    DML on new tables to `authenticated`; strip write access so guardianship
--    writes can only come from an admin RPC / service role in a later phase. RLS
--    still limits SELECT to the child, guardian and same-company admins. anon has
--    no policy (all policies are TO authenticated) and no table grant.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.guardianships FROM anon;
REVOKE ALL ON public.delegated_grants FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.guardianships FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.delegated_grants FROM authenticated;
GRANT SELECT ON public.guardianships TO authenticated;
GRANT SELECT ON public.delegated_grants TO authenticated;

-- is_active_guardian_of is evaluated inside RLS -> keep EXECUTE for authenticated
-- (mirrors profile_company / current_user_roles), but never anon / public.
REVOKE ALL ON FUNCTION public.is_active_guardian_of(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_guardian_of(uuid) TO authenticated;

COMMENT ON TABLE public.guardianships IS
  'Parent/guardian <-> managed child-account relationships. Writes are admin/service-role/RPC only; RLS SELECT is limited to the child, the guardian and same-company admins.';
COMMENT ON TABLE public.delegated_grants IS
  'Time-boxed permission grants delegated from a guardianship to the managed child account. Writes are admin/service-role/RPC only.';
COMMENT ON FUNCTION public.is_active_guardian_of(uuid) IS
  'RLS helper: true when the caller is the active, non-revoked guardian of the given child profile.';

-- ---------------------------------------------------------------------------
-- 7. Realtime publication (guarded / optional), matching how dashboard tables are
--    registered in mig 4. Safe no-op if the publication is unavailable.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['guardianships', 'delegated_grants']
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables AS t
      WHERE t.table_schema = 'public'
        AND t.table_name = v_table_name
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipping realtime publication setup; supabase_realtime publication is unavailable.';
END;
$$;

COMMIT;
