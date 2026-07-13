-- Preserve tenant notes through owner review and keep rejected slots available.
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_reservations_owner_review
  ON public.reservations(company_id, approval_status, check_in_at)
  WHERE approval_status = 'pending_owner';
