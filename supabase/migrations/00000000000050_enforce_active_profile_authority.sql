-- Enforce active-profile authority at the DB layer (adversarial review, 2026-07-22).
--
-- Deactivation (mig-40 admin_set_user_active -> profiles.is_active = false) and
-- anonymization (mig-49 admin_anonymize_user -> profiles.anonymized_at set,
-- is_active = false, role assignments deleted) only changed profiles.*. They did
-- NOT change how RLS RESOLVES the caller's authority, so a retained/valid JWT (or
-- a direct PostgREST call) kept resolving a role:
--
--   * current_user_profile_role() (mig-01) read profiles.role unconditionally, so
--     a deactivated user's single-role RLS still passed.
--   * current_user_roles() (mig-40) fell back to profiles.role when no assignment
--     rows exist -- exactly the state anonymize leaves behind -- so an anonymized
--     user still resolved their leftover primary role in every multi-role policy.
--
-- This migration CREATE OR REPLACEs both role-resolution helpers, reproducing the
-- CURRENT body VERBATIM and adding ONE guard clause so an inactive or anonymized
-- profile resolves to NULL / the empty set. `is_active IS NOT FALSE` deliberately
-- keeps a legacy NULL is_active row active (never deny a legitimate user); only an
-- explicit FALSE, or a set anonymized_at, removes authority. Because these helpers
-- are used across ALL RLS (and downstream via current_user_role_level() and
-- is_super_admin() -> ...), the guard makes a deactivation/anonymization take
-- effect the instant it is written, independent of any cached session.
--
-- Both helpers keep their exact signature, volatility, SECURITY DEFINER and
-- SET search_path = '' so CREATE OR REPLACE preserves every existing grant (the
-- mig-41 note: both stay EXECUTE-able by `authenticated` because they run inside
-- RLS policies). Only the guard clause is added.
--
-- NOTE: only NON-admin roles are ever deactivated/anonymized (assert_user_role_admin
-- rejects the admin tier), so current_user_is_organization_admin() /
-- is_platform_super_admin() -- which read profiles.role='admin' or the
-- platform_administrators table -- are never reached for a suspended user and need
-- no change here.
--
-- This migration MUST be applied to the Supabase cloud project and validated
-- against real Postgres (a green local-seed e2e run does NOT exercise it).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Single-role resolver (mig-01 body VERBATIM + active/anonymized guard).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles
  WHERE id = auth.uid()
    AND is_active IS NOT FALSE
    AND anonymized_at IS NULL
  LIMIT 1;
$$;

-- ---------------------------------------------------------------------------
-- 2. Multi-role resolver (mig-40 body VERBATIM + active/anonymized guard on
--    BOTH UNION branches: the assignment branch and the profiles.role fallback).
-- ---------------------------------------------------------------------------
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
    AND EXISTS (
      SELECT 1 FROM public.profiles gp
      WHERE gp.id = a.profile_id
        AND gp.is_active IS NOT FALSE
        AND gp.anonymized_at IS NULL
    )
  UNION
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = (SELECT auth.uid())
    AND p.is_active IS NOT FALSE
    AND p.anonymized_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.profile_role_assignments a2
      WHERE a2.profile_id = p.id
    );
$$;

-- ---------------------------------------------------------------------------
-- 3. Support the app-layer "Removed" read-only treatment (FIX F): surface
--    anonymized_at in the managed-user projection. Body is the mig-40 version
--    VERBATIM; the ONLY change is the added 'anonymizedAt' key. mig-49 added the
--    profiles.anonymized_at column but never projected it here, so admin_anonymize_user
--    returned a payload the client could not tell apart from an ordinary
--    deactivation. CREATE OR REPLACE preserves the mig-41 revoke of EXECUTE from
--    `authenticated` (this internal projection stays callable only by the SECURITY
--    DEFINER RPCs that return it).
-- ---------------------------------------------------------------------------
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
    'anonymizedAt', p.anonymized_at,
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

COMMIT;
