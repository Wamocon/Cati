-- Fix: infinite recursion detected in policy for relation "workforce_tasks" (42P17)
--
-- There was a circular RLS dependency between two tables:
--
--   * public.workforce_tasks  SELECT policy -> EXISTS (SELECT 1 FROM staff_members ...)
--       (so a staff member can read the tasks assigned to them)
--   * public.staff_members    SELECT policy -> EXISTS (SELECT 1 FROM workforce_tasks ...)
--       (so a manager can see staff assigned to tasks on sites they manage)
--
-- PostgreSQL expands policies recursively, so this structural cycle raises
-- 42P17 for ANY authenticated read of workforce_tasks — it broke the staff
-- role dashboard entirely against a real (RLS-enforcing) database. It was never
-- caught because the E2E suite runs against the local-seed fallback and never
-- exercises Postgres RLS.
--
-- The cycle is broken by routing the staff_members -> workforce_tasks lookup
-- through a SECURITY DEFINER helper. The helper is owned by the table owner and
-- the tables are not FORCE ROW LEVEL SECURITY, so the nested read does not
-- re-enter workforce_tasks' policies. Visibility semantics are unchanged.

CREATE OR REPLACE FUNCTION public.staff_member_has_manager_visible_task(
  p_staff_member_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workforce_tasks w
    WHERE w.assigned_staff_member_id = p_staff_member_id
      AND public.current_user_can_manage_site(w.site_id)
  );
$$;

COMMENT ON FUNCTION public.staff_member_has_manager_visible_task(UUID) IS
  'Breaks the workforce_tasks <-> staff_members RLS cycle: resolves whether the current manager has a task on a site they manage assigned to this staff member, without re-entering workforce_tasks row policies.';

REVOKE ALL ON FUNCTION public.staff_member_has_manager_visible_task(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_member_has_manager_visible_task(UUID)
  TO authenticated;

DROP POLICY IF EXISTS "Scoped staff directory visibility" ON public.staff_members;
CREATE POLICY "Scoped staff directory visibility"
  ON public.staff_members
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) = 'admin'
        OR profile_id = (SELECT auth.uid())
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND (
            EXISTS (
              SELECT 1
              FROM public.profile_site_assignments a
              WHERE a.profile_id = staff_members.profile_id
                AND public.current_user_can_manage_site(a.site_id)
                AND a.status = 'active'
            )
            OR public.staff_member_has_manager_visible_task(staff_members.id)
          )
        )
      )
    )
  );
