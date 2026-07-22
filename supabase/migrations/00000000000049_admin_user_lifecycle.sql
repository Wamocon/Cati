-- Admin Control Center, Phase 1: managed-user lifecycle.
--
-- Adds the admin-facing user lifecycle the client asked for on top of the mig-40
-- user/role subsystem: edit a user's non-privileged fields, and a KVKK/GDPR-
-- correct SOFT DELETE that anonymizes PII in place (never a hard delete, so the
-- finance/audit/ticket/wallet rows whose FKs are ON DELETE SET NULL keep pointing
-- at the retained, scrubbed profile). Also widens admin_assign_role to the guest
-- and service_provider business roles (child_* roles stay excluded; they require
-- is_minor + a guardianship, handled in a later phase).
--
-- ADDITIVE and idempotent-where-safe. Every NEW function mirrors the mig-41
-- hardening pattern: SECURITY DEFINER, SET search_path = '', fully-qualified
-- objects, caller authorization through the existing assert_user_role_admin
-- (self / admin-tier / same-company / FOR UPDATE guards) BEFORE any mutation,
-- EXECUTE revoked from PUBLIC + anon and granted only to authenticated (they
-- self-authorize inside the function).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Lifecycle columns on profiles (additive; defaults keep every existing row
--    a non-anonymized user). phone and avatar_url already exist (initial schema)
--    and are reused by the anonymizer below.
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS anonymized_at timestamptz,
  ADD COLUMN IF NOT EXISTS anonymized_by uuid
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS removal_reason text;

-- ---------------------------------------------------------------------------
-- 2. Edit a user's non-privileged fields (name / language). Email is an
--    auth.users concern handled by the repository/service role, never here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_managed_user(
  p_profile_id uuid,
  p_full_name text DEFAULT NULL,
  p_language text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
  v_new_name text;
BEGIN
  -- Authorize + lock the target (same-company org admin, not self, not the
  -- platform admin tier). Reuses the mig-40 guard verbatim.
  v_target := public.assert_user_role_admin(p_profile_id);

  IF p_full_name IS NOT NULL THEN
    v_new_name := btrim(p_full_name);
    IF length(v_new_name) < 2 OR length(v_new_name) > 120 THEN
      RAISE EXCEPTION 'A full name between 2 and 120 characters is required.'
        USING ERRCODE = '22023';
    END IF;
  END IF;

  IF p_language IS NOT NULL
     AND p_language NOT IN ('tr', 'en', 'de', 'ru') THEN
    RAISE EXCEPTION 'Unsupported language: %', p_language USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET
    full_name = COALESCE(v_new_name, full_name),
    language = COALESCE(p_language, language),
    updated_at = now()
  WHERE id = p_profile_id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user.profile_updated',
    'profiles', p_profile_id,
    jsonb_build_object(
      'fullName', v_target.full_name,
      'language', v_target.language
    ),
    jsonb_build_object(
      'fullName', COALESCE(v_new_name, v_target.full_name),
      'language', COALESCE(p_language, v_target.language)
    )
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Anonymize (soft delete). Scrubs PII in place and severs role assignments
--    and guardianships. Never hard-deletes the profile and never touches
--    auth.users (that would cascade-delete the profile) or the finance / payment
--    / wallet / audit / ticket rows that reference it (their FKs are ON DELETE
--    SET NULL and must retain the anonymized row). The auth login is disabled by
--    a service-role ban in the repository layer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_anonymize_user(
  p_profile_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
  v_reason text;
BEGIN
  -- Authorize + lock the target first (also blocks the platform admin tier).
  v_target := public.assert_user_role_admin(p_profile_id);

  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A removal reason of at least 10 characters is required.'
      USING ERRCODE = '22023';
  END IF;
  v_reason := btrim(p_reason);

  -- Defense in depth; assert_user_role_admin already rejects the admin tier.
  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION
      'The administrator tier is platform-provisioned and cannot be removed here.'
      USING ERRCODE = '42501';
  END IF;

  -- Scrub personally-identifiable fields in place.
  UPDATE public.profiles
  SET
    full_name = 'Removed user',
    email = NULL,
    phone = NULL,
    avatar_url = NULL,
    date_of_birth = NULL,
    age_band = NULL,
    is_minor = false,
    consent_recorded_at = NULL,
    consent_by = NULL,
    is_active = false,
    deactivated_at = now(),
    anonymized_at = now(),
    anonymized_by = v_actor_id,
    removal_reason = v_reason,
    updated_at = now()
  WHERE id = p_profile_id;

  -- Sever all business-role assignments (profiles.role is left intact so the
  -- managed_user_json projection still resolves a single primary role).
  DELETE FROM public.profile_role_assignments
  WHERE profile_id = p_profile_id;

  -- Soft-revoke any guardianship where this profile is the guardian or the
  -- managed child.
  UPDATE public.guardianships
  SET status = 'revoked',
      revoked_at = now()
  WHERE (guardian_profile_id = p_profile_id OR child_profile_id = p_profile_id)
    AND status <> 'revoked';

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user.anonymized',
    'profiles', p_profile_id,
    jsonb_build_object('reason', v_reason)
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Widen admin_assign_role to also permit the guest and service_provider
--    business roles. Body is the mig-40 version VERBATIM; the ONLY change is the
--    allowed-role allowlist. The admin tier stays blocked and the child_* roles
--    stay excluded (they require is_minor + a guardianship). CREATE OR REPLACE
--    preserves the existing EXECUTE grant to authenticated.
-- ---------------------------------------------------------------------------
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
  IF p_role NOT IN (
    'manager', 'accountant', 'staff', 'owner', 'tenant',
    'guest', 'service_provider'
  ) THEN
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

-- ---------------------------------------------------------------------------
-- 5. Grants for the two NEW functions. They self-authorize (assert_user_role_admin
--    validates auth.uid() + authority inside), so authenticated may EXECUTE while
--    PUBLIC and anon are revoked. admin_assign_role keeps its existing grant via
--    CREATE OR REPLACE. No new tables -> no new RLS.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_update_managed_user(uuid, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_anonymize_user(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_managed_user(uuid, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_user(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.admin_update_managed_user(uuid, text, text) IS
  'Edits a company user''s non-privileged fields (full_name, language) and writes an audit row; organization admin only, never the caller or the admin tier. Email changes are handled outside this RPC.';
COMMENT ON FUNCTION public.admin_anonymize_user(uuid, text) IS
  'KVKK/GDPR soft delete: scrubs PII in place, deactivates, severs role assignments and revokes guardianships, and audit-logs the reason; organization admin only, never the admin tier. Never hard-deletes the profile or the finance/audit rows that reference it.';

COMMIT;
