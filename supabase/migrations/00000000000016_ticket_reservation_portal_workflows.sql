-- Portal workflow fixes:
-- allow authenticated company users to create service tickets/reservations
-- through the guarded API, and allow ticket owners/staff to update tickets.

DROP POLICY IF EXISTS "Company users can create portal tickets" ON public.service_tickets;
CREATE POLICY "Company users can create portal tickets"
  ON public.service_tickets FOR INSERT
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 10
  );

DROP POLICY IF EXISTS "Company users can update own or operational tickets" ON public.service_tickets;
CREATE POLICY "Company users can update own or operational tickets"
  ON public.service_tickets FOR UPDATE
  USING (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND (
      public.current_user_role_level() >= 40
      OR created_by = auth.uid()
    )
  )
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND (
      public.current_user_role_level() >= 40
      OR created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company users can create portal ticket events" ON public.service_ticket_events;
CREATE POLICY "Company users can create portal ticket events"
  ON public.service_ticket_events FOR INSERT
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 10
    AND EXISTS (
      SELECT 1
      FROM public.service_tickets t
      WHERE t.id = ticket_id
        AND t.company_id = company_id
    )
  );

DROP POLICY IF EXISTS "Company users can create portal reservations" ON public.reservations;
CREATE POLICY "Company users can create portal reservations"
  ON public.reservations FOR INSERT
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 10
  );

CREATE INDEX IF NOT EXISTS idx_service_tickets_company_created
  ON public.service_tickets(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_service_ticket_events_assignment
  ON public.service_ticket_events(ticket_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reservations_company_unit_window
  ON public.reservations(company_id, unit_id, check_in_at, check_out_at)
  WHERE status NOT IN ('cancelled', 'no_show');
