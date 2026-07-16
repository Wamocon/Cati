-- Durable workflow fields. Labels make queue/team assignment visible even when a
-- provider profile has not yet been provisioned; assigned_to remains available
-- for a future staff-profile relation.
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS assignment_label TEXT,
  ADD COLUMN IF NOT EXISTS routing_source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS resource_name TEXT NOT NULL DEFAULT 'Amenity',
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (approval_status IN ('pending_owner', 'approved', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_service_tickets_assignment_label
  ON public.service_tickets(company_id, assignment_label, status);

CREATE INDEX IF NOT EXISTS idx_reservations_resource_window
  ON public.reservations(company_id, resource_name, check_in_at, check_out_at)
  WHERE status NOT IN ('cancelled', 'no_show') AND approval_status <> 'rejected';

DROP POLICY IF EXISTS "Company users can approve portal reservations" ON public.reservations;
CREATE POLICY "Company users can approve portal reservations"
  ON public.reservations FOR UPDATE
  USING (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 20
  )
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 20
  );
