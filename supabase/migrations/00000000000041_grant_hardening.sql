-- Security hardening for the user-role (mig 40) and accountant-finance (mig 39)
-- grants. Flagged by the 2026-07-21 expert review.
--
-- Supabase's default privileges GRANT EXECUTE on new public functions and full
-- DML on new tables to the `authenticated` role. A plain
-- `REVOKE ALL ... FROM PUBLIC, anon` (as migs 39/40 used for these objects)
-- leaves that explicit `authenticated` grant in place. Two consequences closed
-- here:
--
--  1. Direct DML on profile_role_assignments must go ONLY through the admin_*
--     SECURITY DEFINER RPCs (which reject the admin tier and write an audit
--     row). Without this revoke an org admin could POST directly to PostgREST an
--     INSERT of (any same-company user, role='admin') and then be promoted by
--     recompute_profile_primary_role -- defeating the "admin tier is never
--     assigned here" invariant, with no audit trail.
--  2. The internal SECURITY DEFINER projections must not be callable by arbitrary
--     authenticated users: managed_user_json / accountant_finance_offset_json
--     return another tenant's PII / finance detail, bypassing the tables' RLS.
--
-- profile_company() and current_user_roles() are intentionally left executable by
-- `authenticated` because they are evaluated inside RLS policies.

REVOKE INSERT, UPDATE, DELETE ON public.profile_role_assignments FROM authenticated;
-- The self_read RLS policy (FOR SELECT TO authenticated, own rows) needs the base
-- SELECT grant to function; without it the app's multi-role read silently falls
-- back to the single primary role. RLS still limits authenticated to own rows
-- (admins see all via the admin_all policy).
GRANT SELECT ON public.profile_role_assignments TO authenticated;

REVOKE EXECUTE ON FUNCTION public.managed_user_json(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.recompute_profile_primary_role(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.assert_user_role_admin(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.accountant_finance_offset_json(UUID) FROM authenticated;
