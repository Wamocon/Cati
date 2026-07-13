-- Tenant tickets require an owner decision before ordinary operational dispatch.
ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (approval_status IN ('not_required', 'pending_owner', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS routing_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_service_tickets_owner_approval
  ON public.service_tickets(company_id, approval_status, status)
  WHERE approval_status = 'pending_owner';

DROP POLICY IF EXISTS "Company owners can approve tenant tickets" ON public.service_tickets;
CREATE POLICY "Company owners can approve tenant tickets"
  ON public.service_tickets FOR UPDATE
  USING (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 20
  )
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 20
  );
