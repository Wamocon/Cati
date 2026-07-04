-- 00000000000007_security_hardening.sql
-- Security hardening pass addressing the audit's critical/high database findings.
-- All statements are additive/restrictive and safe to apply after migrations 0-6.
-- Scope:
--   1. Signup trigger no longer trusts client-supplied privileged roles/company.
--   2. Self-service profile role/company escalation is blocked (missing WITH CHECK).
--   3. Unauthenticated (anon) access to SECURITY DEFINER data RPCs is revoked.
--   4. Posted ledger immutability also covers un-posting (posted_at) and DELETE.

-- 1. Harden the signup trigger: never map client metadata to privileged roles,
--    and never trust a client-supplied company_id. Self-service signups become
--    'tenant' (or at most 'owner'); privilege elevation must go through an
--    admin/service-role path, not auth.signUp metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role text;
  safe_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  safe_role := CASE
    WHEN requested_role IN ('owner', 'tenant') THEN requested_role
    ELSE 'tenant'
  END;

  INSERT INTO public.profiles (id, full_name, role, language, company_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    safe_role,
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr'),
    public.default_company_id()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Block self-service role / company_id changes. The "Users can update own
--    profile" policy has no WITH CHECK, so a user could PATCH their own role to
--    'admin'. This BEFORE UPDATE trigger forbids a normal authenticated user from
--    changing their own role or company_id; admins and service-role/server
--    contexts (auth.uid() IS NULL) are unaffected, so admin user management and
--    the signup INSERT (which is not an UPDATE) still work.
CREATE OR REPLACE FUNCTION public.prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.id
     AND public.current_user_profile_role() <> 'admin'
     AND (
       NEW.role IS DISTINCT FROM OLD.role
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
     )
  THEN
    RAISE EXCEPTION 'Role and company assignments cannot be changed by the account owner.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS prevent_self_role_escalation ON public.profiles;
CREATE TRIGGER prevent_self_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_role_escalation();

-- 3. Revoke anonymous EXECUTE on the SECURITY DEFINER data functions. These
--    bypass RLS and fall back to the first company when no auth context exists,
--    so an anon caller with the public key could read company-wide PII/finance.
--    The app's anonymous/local mode uses the repository seed fallback, so no
--    legitimate anon path needs these. Authenticated grants are left intact.
REVOKE EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM anon;

-- 4. Strengthen the posted-ledger immutability invariant: also forbid clearing
--    or altering posted_at (which previously allowed "un-post -> mutate -> re-post")
--    and forbid deleting a posted entry. Corrections must use reversal entries.
CREATE OR REPLACE FUNCTION public.prevent_posted_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.posted_at IS NOT NULL THEN
      RAISE EXCEPTION 'Posted ledger entries are immutable; they cannot be deleted. Create a reversal entry instead.';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.posted_at IS NOT NULL AND (
    NEW.entry_type IS DISTINCT FROM OLD.entry_type OR
    NEW.site_id IS DISTINCT FROM OLD.site_id OR
    NEW.unit_id IS DISTINCT FROM OLD.unit_id OR
    NEW.resident_id IS DISTINCT FROM OLD.resident_id OR
    NEW.amount_cents IS DISTINCT FROM OLD.amount_cents OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.period IS DISTINCT FROM OLD.period OR
    NEW.description IS DISTINCT FROM OLD.description OR
    NEW.posted_at IS DISTINCT FROM OLD.posted_at
  ) THEN
    RAISE EXCEPTION 'Posted ledger entries are immutable; create a reversal entry instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_posted_ledger_mutation ON public.finance_ledger_entries;
CREATE TRIGGER prevent_posted_ledger_mutation
  BEFORE UPDATE OR DELETE ON public.finance_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_ledger_mutation();
