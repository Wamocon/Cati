-- Role, relationship and workflow hardening for ticketing and reservations.
--
-- This is intentionally a forward-only migration.  Earlier migration numbers
-- (including the duplicate 00000000000015 prefix) may already exist in cloud
-- history and must not be renamed or edited in place.
--
-- Canonical authority model after this migration:
--   * platform super administrator: explicitly provisioned in the protected
--     platform_administrators registry; may cross organization boundaries.
--   * admin: organization administrator; full visibility only inside the
--     profile's company.
--   * manager: property/site manager; visibility only for assigned sites.
--   * accountant: finance-only; tickets only when finance intervention is
--     required or a linked service order is payment/debt blocked.
--   * staff: assigned ticket/task or active team queue only.
--   * owner / tenant: active, verified unit relationships only.
--
-- Ticket state changes are database commands with row locking, optimistic
-- versions, idempotency, append-only transitions, audit evidence and outbox
-- events.  Authenticated clients no longer receive direct ticket UPDATE access.

-- ---------------------------------------------------------------------------
-- 1. Fail closed when already-stored tenant keys contradict their parents.
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.unit_residents ur
    JOIN public.units u ON u.id = ur.unit_id
    JOIN public.residents r ON r.id = ur.resident_id
    WHERE ur.company_id IS DISTINCT FROM u.company_id
       OR ur.company_id IS DISTINCT FROM r.company_id
  ) THEN
    RAISE EXCEPTION
      'Cannot install relationship hardening: unit_residents contains cross-company rows.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.service_tickets t
    JOIN public.sites s ON s.id = t.site_id
    LEFT JOIN public.units u ON u.id = t.unit_id
    LEFT JOIN public.residents r ON r.id = t.resident_id
    WHERE t.company_id IS DISTINCT FROM s.company_id
       OR (u.id IS NOT NULL AND (
            t.company_id IS DISTINCT FROM u.company_id
            OR t.site_id IS DISTINCT FROM u.site_id
          ))
       OR (r.id IS NOT NULL AND t.company_id IS DISTINCT FROM r.company_id)
  ) THEN
    RAISE EXCEPTION
      'Cannot install ticket hardening: service_tickets contains cross-company/site rows.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reservations b
    JOIN public.sites s ON s.id = b.site_id
    JOIN public.units u ON u.id = b.unit_id
    LEFT JOIN public.residents r ON r.id = b.resident_id
    WHERE b.company_id IS DISTINCT FROM s.company_id
       OR b.company_id IS DISTINCT FROM u.company_id
       OR b.site_id IS DISTINCT FROM u.site_id
       OR (r.id IS NOT NULL AND b.company_id IS DISTINCT FROM r.company_id)
  ) THEN
    RAISE EXCEPTION
      'Cannot install reservation hardening: reservations contains cross-company/site rows.';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Protected authority and exact relationship registries.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.platform_administrators (
  profile_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  reason TEXT NOT NULL,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL)
    OR (status <> 'revoked')
  )
);

COMMENT ON TABLE public.platform_administrators IS
  'Protected platform-wide authority registry. Ordinary profiles.role=admin users are organization-scoped and never become platform super administrators implicitly.';

CREATE TABLE IF NOT EXISTS public.resident_profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('pending', 'active', 'suspended', 'revoked')),
  verification_method TEXT NOT NULL DEFAULT 'admin_verified'
    CHECK (verification_method IN (
      'admin_verified',
      'verified_email',
      'identity_document',
      'migration_exact_email'
    )),
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, profile_id),
  UNIQUE (company_id, resident_id),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  CHECK (status <> 'active' OR verified_at IS NOT NULL)
);

COMMENT ON TABLE public.resident_profile_links IS
  'Verified one-to-one link between an authenticated profile and its resident identity. Unit ownership/tenancy is resolved through unit_residents, never through hard-coded unit numbers.';

CREATE TABLE IF NOT EXISTS public.profile_site_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_role TEXT NOT NULL
    CHECK (access_role IN ('manager', 'operator', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'revoked')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  granted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, site_id, profile_id),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

COMMENT ON TABLE public.profile_site_assignments IS
  'Explicit site scope for property managers and field users. The business role remains manager/staff; property manager is a site-scoped manager, not a separate role.';

-- Backfill only relationships that can be proven without inference.
INSERT INTO public.profile_site_assignments (
  company_id,
  site_id,
  profile_id,
  access_role,
  status
)
SELECT
  s.company_id,
  s.id,
  s.manager_profile_id,
  'manager',
  'active'
FROM public.sites s
JOIN public.profiles p
  ON p.id = s.manager_profile_id
 AND p.company_id = s.company_id
WHERE s.manager_profile_id IS NOT NULL
ON CONFLICT (company_id, site_id, profile_id) DO UPDATE
SET
  access_role = 'manager',
  status = 'active',
  updated_at = NOW();

-- A manager in a company with exactly one active site has an unambiguous site
-- scope. Multi-site companies require an explicit assignment.
WITH single_site_company AS (
  SELECT company_id, MIN(id::TEXT)::UUID AS site_id
  FROM public.sites
  WHERE status <> 'archived'
  GROUP BY company_id
  HAVING COUNT(*) = 1
)
INSERT INTO public.profile_site_assignments (
  company_id,
  site_id,
  profile_id,
  access_role,
  status
)
SELECT
  p.company_id,
  s.site_id,
  p.id,
  'manager',
  'active'
FROM public.profiles p
JOIN single_site_company s ON s.company_id = p.company_id
WHERE p.role = 'manager'
ON CONFLICT (company_id, site_id, profile_id) DO NOTHING;

-- Exact, confirmed email equality is the only safe automatic resident-profile
-- migration. Ambiguous, unconfirmed and cross-company matches remain unlinked
-- for administrator review.
WITH exact_matches AS (
  SELECT
    p.company_id,
    p.id AS profile_id,
    r.id AS resident_id,
    COUNT(*) OVER (PARTITION BY p.company_id, p.id) AS profile_match_count,
    COUNT(*) OVER (PARTITION BY r.company_id, r.id) AS resident_match_count
  FROM public.profiles p
  JOIN auth.users au
    ON au.id = p.id
   AND au.email_confirmed_at IS NOT NULL
  JOIN public.residents r
    ON r.company_id = p.company_id
   AND NULLIF(BTRIM(r.email), '') IS NOT NULL
   AND LOWER(BTRIM(r.email)) = LOWER(BTRIM(au.email))
  WHERE p.role IN ('owner', 'tenant')
)
INSERT INTO public.resident_profile_links (
  company_id,
  profile_id,
  resident_id,
  status,
  verification_method,
  verified_at
)
SELECT
  company_id,
  profile_id,
  resident_id,
  'active',
  'migration_exact_email',
  NOW()
FROM exact_matches
WHERE profile_match_count = 1
  AND resident_match_count = 1
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Durable ticket/reservation workflow evidence.
-- ---------------------------------------------------------------------------

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS workflow_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS last_transition_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS workflow_state TEXT NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS emergency_classification TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS emergency_policy_code TEXT,
  ADD COLUMN IF NOT EXISTS emergency_policy_version TEXT,
  ADD COLUMN IF NOT EXISTS emergency_reported_at TIMESTAMPTZ;

ALTER TABLE public.service_tickets
  DROP CONSTRAINT IF EXISTS service_tickets_workflow_version_check;
ALTER TABLE public.service_tickets
  ADD CONSTRAINT service_tickets_workflow_version_check
  CHECK (workflow_version > 0);

ALTER TABLE public.service_tickets
  DROP CONSTRAINT IF EXISTS service_tickets_emergency_classification_check;
ALTER TABLE public.service_tickets
  ADD CONSTRAINT service_tickets_emergency_classification_check
  CHECK (emergency_classification IN ('none', 'reported', 'rule_matched_p0'));

-- `post_emergency_review` is deliberately non-financial. It records that
-- containment proceeded without deciding who pays, posting a debit, or
-- blocking the responder. Any later charge belongs to a separate audited
-- manager/accountant finance command.
ALTER TABLE public.service_orders
  DROP CONSTRAINT IF EXISTS service_orders_payment_decision_check;
ALTER TABLE public.service_orders
  ADD CONSTRAINT service_orders_payment_decision_check
  CHECK (payment_decision IN (
    'no_charge',
    'collect_before_dispatch',
    'debit_to_account',
    'paid_or_debit_approved',
    'hold',
    'post_emergency_review'
  ));

CREATE OR REPLACE FUNCTION public.enforce_emergency_service_order_finance_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_is_p0 BOOLEAN := FALSE;
BEGIN
  IF NEW.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.emergency_classification = 'rule_matched_p0'
    INTO v_is_p0
    FROM public.service_tickets AS t
   WHERE t.id = NEW.ticket_id;

  IF NOT COALESCE(v_is_p0, FALSE) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('payment_pending', 'blocked') THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = 'P0 emergency execution cannot wait for finance.';
  END IF;

  IF NEW.debt_check_status <> 'clear' THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = 'P0 emergency execution cannot carry a debt block.';
  END IF;

  IF NEW.quoted_price_cents > 0
     AND NEW.payment_decision <> 'post_emergency_review' THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = 'Priced P0 work requires a separate post-emergency human finance review.';
  END IF;

  IF NEW.quoted_price_cents = 0
     AND NEW.payment_decision NOT IN ('no_charge', 'post_emergency_review') THEN
    RAISE EXCEPTION
      USING ERRCODE = '23514',
            MESSAGE = 'P0 work cannot create an autonomous money decision.';
  END IF;

  NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', NEW.quoted_price_cents > 0
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS service_orders_emergency_finance_guard
  ON public.service_orders;
CREATE TRIGGER service_orders_emergency_finance_guard
BEFORE INSERT OR UPDATE OF
  ticket_id,
  status,
  debt_check_status,
  payment_decision,
  quoted_price_cents,
  metadata
ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_emergency_service_order_finance_guard();

REVOKE ALL ON FUNCTION public.enforce_emergency_service_order_finance_guard()
  FROM PUBLIC, anon, authenticated;

ALTER TABLE public.service_tickets
  DROP CONSTRAINT IF EXISTS service_tickets_workflow_state_check;
ALTER TABLE public.service_tickets
  ADD CONSTRAINT service_tickets_workflow_state_check
  CHECK (workflow_state IN (
    'submitted',
    'triage',
    'accepted',
    'assigned',
    'acknowledged',
    'in_progress',
    'waiting_resident',
    'manager_review',
    'rework',
    'resolved',
    'closed',
    'cancelled'
  ));

UPDATE public.service_tickets
SET workflow_state = CASE status
  WHEN 'open' THEN 'submitted'
  WHEN 'waiting_approval' THEN 'triage'
  WHEN 'triage' THEN 'triage'
  WHEN 'assigned' THEN 'assigned'
  WHEN 'in_progress' THEN 'in_progress'
  WHEN 'resolved' THEN 'resolved'
  WHEN 'closed' THEN 'closed'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'submitted'
END;

UPDATE public.service_tickets
SET
  last_transition_at = COALESCE(last_transition_at, updated_at, created_at),
  closed_at = CASE
    WHEN status = 'closed' THEN COALESCE(closed_at, updated_at, created_at)
    ELSE closed_at
  END
WHERE last_transition_at IS NULL
   OR (status = 'closed' AND closed_at IS NULL);

ALTER TABLE public.service_ticket_events
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS ticket_version INTEGER,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

ALTER TABLE public.service_ticket_events
  DROP CONSTRAINT IF EXISTS service_ticket_events_visibility_check;
ALTER TABLE public.service_ticket_events
  ADD CONSTRAINT service_ticket_events_visibility_check
  CHECK (visibility IN ('resident', 'internal', 'finance'));

CREATE TABLE IF NOT EXISTS public.service_ticket_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  command TEXT NOT NULL DEFAULT 'legacy_transition',
  from_workflow_state TEXT,
  to_workflow_state TEXT,
  ticket_version INTEGER NOT NULL CHECK (ticket_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (ticket_id, ticket_version),
  UNIQUE (company_id, idempotency_key)
);

COMMENT ON TABLE public.service_ticket_transitions IS
  'Append-only state/assignment/approval evidence. ticket_version provides optimistic concurrency; company idempotency prevents duplicate commands.';

CREATE OR REPLACE FUNCTION public.ticket_legacy_status_for_workflow_state(
  p_workflow_state TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_workflow_state
    WHEN 'submitted' THEN 'open'
    WHEN 'triage' THEN 'triage'
    WHEN 'accepted' THEN 'triage'
    WHEN 'assigned' THEN 'assigned'
    WHEN 'acknowledged' THEN 'assigned'
    WHEN 'in_progress' THEN 'in_progress'
    WHEN 'waiting_resident' THEN 'in_progress'
    WHEN 'manager_review' THEN 'resolved'
    WHEN 'rework' THEN 'in_progress'
    WHEN 'resolved' THEN 'resolved'
    WHEN 'closed' THEN 'closed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE NULL
  END;
$$;

COMMENT ON COLUMN public.service_tickets.workflow_state IS
  'Authoritative lifecycle state. The legacy status column remains a compatibility projection and must not be used as the workflow authority.';

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workflow_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

ALTER TABLE public.reservations
  ALTER COLUMN created_by SET DEFAULT auth.uid();

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_workflow_version_check;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_workflow_version_check
  CHECK (workflow_version > 0);

UPDATE public.reservations b
SET created_by = l.profile_id
FROM public.resident_profile_links l
WHERE b.created_by IS NULL
  AND b.resident_id = l.resident_id
  AND b.company_id = l.company_id
  AND l.status = 'active';

CREATE TABLE IF NOT EXISTS public.reservation_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL CHECK (to_status IN ('approved', 'rejected')),
  reservation_version INTEGER NOT NULL CHECK (reservation_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  idempotency_key TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id, reservation_version),
  UNIQUE (company_id, idempotency_key)
);

COMMENT ON TABLE public.reservation_decisions IS
  'Append-only owner/manager/admin reservation approval evidence with optimistic version and idempotency.';

ALTER TABLE public.integration_outbox
  ADD COLUMN IF NOT EXISTS deduplication_key TEXT;

ALTER TABLE public.audit_events
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_service_tickets_idempotency
  ON public.service_tickets(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_ticket_events_idempotency
  ON public.service_ticket_events(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reservations_idempotency
  ON public.reservations(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_integration_outbox_deduplication
  ON public.integration_outbox(company_id, integration_key, deduplication_key)
  WHERE deduplication_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_audit_events_idempotency
  ON public.audit_events(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_resident_profile_links_profile_active
  ON public.resident_profile_links(profile_id, status, valid_until, resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_profile_links_resident_active
  ON public.resident_profile_links(resident_id, status, valid_until, profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_site_assignments_profile_active
  ON public.profile_site_assignments(profile_id, status, valid_until, site_id);
CREATE INDEX IF NOT EXISTS idx_profile_site_assignments_site_active
  ON public.profile_site_assignments(site_id, status, valid_until, profile_id);
CREATE INDEX IF NOT EXISTS idx_unit_residents_relationship_active
  ON public.unit_residents(resident_id, relationship, start_date, end_date, unit_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_profile_team
  ON public.staff_members(profile_id, status, company_id, team)
  WHERE profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_role_scope
  ON public.service_tickets(company_id, site_id, unit_id, created_by, resident_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_staff_scope
  ON public.service_tickets(company_id, assigned_to, status, updated_at DESC)
  WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_tickets_finance_scope
  ON public.service_tickets(company_id, requires_finance_approval, status)
  WHERE requires_finance_approval = TRUE;
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_ticket_assignment
  ON public.workforce_tasks(ticket_id, assigned_staff_member_id, status, team);
CREATE UNIQUE INDEX IF NOT EXISTS service_orders_one_per_ticket_idx
  ON public.service_orders(ticket_id)
  WHERE ticket_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS workforce_tasks_primary_per_ticket_idx
  ON public.workforce_tasks(ticket_id)
  WHERE ticket_id IS NOT NULL
    AND metadata->>'generationKey' = 'ticket-primary-v1';
CREATE INDEX IF NOT EXISTS idx_reservations_role_scope
  ON public.reservations(company_id, site_id, unit_id, created_by, resident_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transitions_timeline
  ON public.service_ticket_transitions(ticket_id, ticket_version DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservation_decisions_timeline
  ON public.reservation_decisions(reservation_id, reservation_version DESC, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Cross-table integrity triggers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_resident_profile_link_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_company UUID;
  v_resident_company UUID;
BEGIN
  SELECT p.company_id INTO v_profile_company
  FROM public.profiles p
  WHERE p.id = NEW.profile_id;

  SELECT r.company_id INTO v_resident_company
  FROM public.residents r
  WHERE r.id = NEW.resident_id;

  IF v_profile_company IS NULL
     OR v_resident_company IS NULL
     OR NEW.company_id IS DISTINCT FROM v_profile_company
     OR NEW.company_id IS DISTINCT FROM v_resident_company
  THEN
    RAISE EXCEPTION 'Resident/profile link must remain inside one company.';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_resident_profile_link_integrity
  ON public.resident_profile_links;
CREATE TRIGGER enforce_resident_profile_link_integrity
  BEFORE INSERT OR UPDATE ON public.resident_profile_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_resident_profile_link_integrity();

CREATE OR REPLACE FUNCTION public.enforce_profile_site_assignment_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile_company UUID;
  v_site_company UUID;
BEGIN
  SELECT p.company_id INTO v_profile_company
  FROM public.profiles p
  WHERE p.id = NEW.profile_id;

  SELECT s.company_id INTO v_site_company
  FROM public.sites s
  WHERE s.id = NEW.site_id;

  IF v_profile_company IS NULL
     OR v_site_company IS NULL
     OR NEW.company_id IS DISTINCT FROM v_profile_company
     OR NEW.company_id IS DISTINCT FROM v_site_company
  THEN
    RAISE EXCEPTION 'Profile/site assignment must remain inside one company.';
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_profile_site_assignment_integrity
  ON public.profile_site_assignments;
CREATE TRIGGER enforce_profile_site_assignment_integrity
  BEFORE INSERT OR UPDATE ON public.profile_site_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_site_assignment_integrity();

CREATE OR REPLACE FUNCTION public.enforce_unit_resident_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_company UUID;
  v_resident_company UUID;
BEGIN
  SELECT u.company_id INTO v_unit_company
  FROM public.units u
  WHERE u.id = NEW.unit_id;

  SELECT r.company_id INTO v_resident_company
  FROM public.residents r
  WHERE r.id = NEW.resident_id;

  IF v_unit_company IS NULL
     OR v_resident_company IS NULL
     OR NEW.company_id IS DISTINCT FROM v_unit_company
     OR NEW.company_id IS DISTINCT FROM v_resident_company
  THEN
    RAISE EXCEPTION 'Unit/resident relationship must remain inside one company.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_unit_resident_integrity ON public.unit_residents;
CREATE TRIGGER enforce_unit_resident_integrity
  BEFORE INSERT OR UPDATE ON public.unit_residents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_unit_resident_integrity();

CREATE OR REPLACE FUNCTION public.enforce_service_ticket_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_site_company UUID;
  v_unit_company UUID;
  v_unit_site UUID;
  v_resident_company UUID;
  v_profile_company UUID;
BEGIN
  SELECT s.company_id INTO v_site_company
  FROM public.sites s
  WHERE s.id = NEW.site_id;

  IF v_site_company IS NULL OR NEW.company_id IS DISTINCT FROM v_site_company THEN
    RAISE EXCEPTION 'Ticket site must belong to the ticket company.';
  END IF;

  IF NEW.unit_id IS NOT NULL THEN
    SELECT u.company_id, u.site_id
      INTO v_unit_company, v_unit_site
    FROM public.units u
    WHERE u.id = NEW.unit_id;

    IF v_unit_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_unit_company
       OR NEW.site_id IS DISTINCT FROM v_unit_site
    THEN
      RAISE EXCEPTION 'Ticket unit must belong to the ticket company and site.';
    END IF;
  END IF;

  IF NEW.resident_id IS NOT NULL THEN
    SELECT r.company_id INTO v_resident_company
    FROM public.residents r
    WHERE r.id = NEW.resident_id;

    IF v_resident_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_resident_company
    THEN
      RAISE EXCEPTION 'Ticket resident must belong to the ticket company.';
    END IF;
  END IF;

  IF NEW.assigned_to IS NOT NULL THEN
    SELECT p.company_id INTO v_profile_company
    FROM public.profiles p
    WHERE p.id = NEW.assigned_to;

    IF v_profile_company IS NULL
       OR (
         NEW.company_id IS DISTINCT FROM v_profile_company
         AND NOT public.is_super_admin()
       )
    THEN
      RAISE EXCEPTION 'Ticket assignee must belong to the ticket company.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_service_ticket_integrity
  ON public.service_tickets;
CREATE TRIGGER enforce_service_ticket_integrity
  BEFORE INSERT OR UPDATE ON public.service_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_service_ticket_integrity();

CREATE OR REPLACE FUNCTION public.enforce_reservation_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_site_company UUID;
  v_unit_company UUID;
  v_unit_site UUID;
  v_resident_company UUID;
BEGIN
  SELECT s.company_id INTO v_site_company
  FROM public.sites s
  WHERE s.id = NEW.site_id;
  SELECT u.company_id, u.site_id INTO v_unit_company, v_unit_site
  FROM public.units u
  WHERE u.id = NEW.unit_id;

  IF v_site_company IS NULL
     OR v_unit_company IS NULL
     OR NEW.company_id IS DISTINCT FROM v_site_company
     OR NEW.company_id IS DISTINCT FROM v_unit_company
     OR NEW.site_id IS DISTINCT FROM v_unit_site
  THEN
    RAISE EXCEPTION 'Reservation unit must belong to the reservation company and site.';
  END IF;

  IF NEW.resident_id IS NOT NULL THEN
    SELECT r.company_id INTO v_resident_company
    FROM public.residents r
    WHERE r.id = NEW.resident_id;

    IF v_resident_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_resident_company
    THEN
      RAISE EXCEPTION 'Reservation resident must belong to the reservation company.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_reservation_integrity ON public.reservations;
CREATE TRIGGER enforce_reservation_integrity
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_reservation_integrity();

-- ---------------------------------------------------------------------------
-- 5. Separate platform and organization administration.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE((SELECT auth.role()) = 'service_role', FALSE)
    OR EXISTS (
      SELECT 1
      FROM public.platform_administrators pa
      WHERE pa.profile_id = (SELECT auth.uid())
        AND pa.status = 'active'
        AND pa.revoked_at IS NULL
    );
$$;

-- Compatibility name used by earlier RLS policies. It now means genuine
-- platform authority, not profiles.role = 'admin'.
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.is_platform_super_admin();
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_organization_admin(
  p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.company_id = p_company_id
        AND p.role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_company UUID := public.current_user_company_id();
  v_actor_role TEXT := public.current_user_profile_role();
  v_sensitive_change BOOLEAN;
  v_office_company UUID;
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile identity is immutable.';
  END IF;

  v_sensitive_change :=
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.office_id IS DISTINCT FROM OLD.office_id;

  IF NOT v_sensitive_change THEN
    RETURN NEW;
  END IF;

  IF NEW.office_id IS NOT NULL THEN
    SELECT o.company_id INTO v_office_company
    FROM public.offices o
    WHERE o.id = NEW.office_id;

    IF v_office_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_office_company
    THEN
      RAISE EXCEPTION 'Profile office must belong to the profile company.';
    END IF;
  END IF;

  IF public.is_platform_super_admin() THEN
    NULL;
  ELSIF v_actor_role = 'admin'
        AND v_actor_company IS NOT NULL
        AND OLD.company_id = v_actor_company
        AND NEW.company_id = v_actor_company
        AND NEW.id IS DISTINCT FROM v_actor_id
  THEN
    -- Organization administrators may manage another member's business role
    -- and office inside their own company, but cannot move identities between
    -- organizations or alter their own authority.
    NULL;
  ELSE
    RAISE EXCEPTION
      'Profile role, company and office assignments require authorized organization or platform administration.';
  END IF;

  INSERT INTO public.audit_events (
    company_id,
    actor_profile_id,
    action,
    entity_table,
    entity_id,
    before_data,
    after_data
  ) VALUES (
    COALESCE(NEW.company_id, OLD.company_id),
    v_actor_id,
    'profile.security_context.updated',
    'profiles',
    NEW.id,
    jsonb_build_object(
      'role', OLD.role,
      'companyId', OLD.company_id,
      'officeId', OLD.office_id
    ),
    jsonb_build_object(
      'role', NEW.role,
      'companyId', NEW.company_id,
      'officeId', NEW.office_id
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ---------------------------------------------------------------------------
-- 6. Relationship- and scope-aware authorization helpers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profile_has_unit_relationship(
  p_profile_id UUID,
  p_unit_id UUID,
  p_relationships TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resident_profile_links l
    JOIN public.residents r
      ON r.id = l.resident_id
     AND r.company_id = l.company_id
    JOIN public.unit_residents ur
      ON ur.company_id = l.company_id
     AND ur.resident_id = l.resident_id
    WHERE l.profile_id = p_profile_id
      AND ur.unit_id = p_unit_id
      AND ur.relationship = ANY (p_relationships)
      AND l.status = 'active'
      AND r.status = 'active'
      AND l.verified_at IS NOT NULL
      AND l.valid_from <= NOW()
      AND (l.valid_until IS NULL OR l.valid_until > NOW())
      AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
      AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_unit_relationship(
  p_unit_id UUID,
  p_relationships TEXT[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.profile_has_unit_relationship(
    (SELECT auth.uid()),
    p_unit_id,
    p_relationships
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_linked_resident_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT l.resident_id
  FROM public.resident_profile_links l
  JOIN public.residents r
    ON r.id = l.resident_id
   AND r.company_id = l.company_id
  WHERE l.profile_id = (SELECT auth.uid())
    AND l.company_id = public.current_user_company_id()
    AND l.status = 'active'
    AND r.status = 'active'
    AND l.verified_at IS NOT NULL
    AND l.valid_from <= NOW()
    AND (l.valid_until IS NULL OR l.valid_until > NOW())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_linked_resident(
  p_resident_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.resident_profile_links l
    JOIN public.residents r
      ON r.id = l.resident_id
     AND r.company_id = l.company_id
    WHERE l.profile_id = (SELECT auth.uid())
      AND l.resident_id = p_resident_id
      AND l.company_id = public.current_user_company_id()
      AND l.status = 'active'
      AND r.status = 'active'
      AND l.verified_at IS NOT NULL
      AND l.valid_from <= NOW()
      AND (l.valid_until IS NULL OR l.valid_until > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_site(
  p_site_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.sites s
      JOIN public.profiles p ON p.id = (SELECT auth.uid())
      WHERE s.id = p_site_id
        AND p.company_id = s.company_id
        AND (
          p.role = 'admin'
          OR (
            p.role = 'manager'
            AND (
              s.manager_profile_id = p.id
              OR EXISTS (
                SELECT 1
                FROM public.profile_site_assignments a
                WHERE a.company_id = s.company_id
                  AND a.site_id = s.id
                  AND a.profile_id = p.id
                  AND a.access_role = 'manager'
                  AND a.status = 'active'
                  AND a.valid_from <= NOW()
                  AND (a.valid_until IS NULL OR a.valid_until > NOW())
              )
            )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_site(
  p_site_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.current_user_can_manage_site(p_site_id)
    OR EXISTS (
      SELECT 1
      FROM public.sites s
      JOIN public.profiles p ON p.id = (SELECT auth.uid())
      JOIN public.profile_site_assignments a
        ON a.company_id = s.company_id
       AND a.site_id = s.id
       AND a.profile_id = p.id
      WHERE s.id = p_site_id
        AND p.company_id = s.company_id
        AND p.role = 'staff'
        AND a.access_role IN ('operator', 'viewer')
        AND a.status = 'active'
        AND a.valid_from <= NOW()
        AND (a.valid_until IS NULL OR a.valid_until > NOW())
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_unit(
  p_unit_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit public.units%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_unit
  FROM public.units u
  WHERE u.id = p_unit_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_unit.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_role = 'manager' THEN
    RETURN public.current_user_can_manage_site(v_unit.site_id);
  ELSIF v_role = 'accountant' THEN
    -- Unit number/site context is required to reconcile the company ledger;
    -- resident identity remains separately protected.
    RETURN TRUE;
  ELSIF v_role = 'staff' THEN
    RETURN EXISTS (
        SELECT 1
        FROM public.workforce_tasks w
        JOIN public.staff_members sm
          ON sm.id = w.assigned_staff_member_id
        WHERE w.unit_id = v_unit.id
          AND sm.profile_id = (SELECT auth.uid())
          AND sm.company_id = v_unit.company_id
          AND sm.status IN ('active', 'training')
          AND w.status NOT IN ('closed', 'cancelled')
      );
  ELSIF v_role = 'owner' THEN
    RETURN public.profile_has_unit_relationship(
      (SELECT auth.uid()), v_unit.id, ARRAY['owner']::TEXT[]
    );
  ELSIF v_role = 'tenant' THEN
    RETURN public.profile_has_unit_relationship(
      (SELECT auth.uid()), v_unit.id, ARRAY['tenant']::TEXT[]
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_resident(
  p_resident_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_resident_status TEXT;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT r.company_id, r.status INTO v_company_id, v_resident_status
  FROM public.residents r
  WHERE r.id = p_resident_id;

  IF v_company_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- Historical/inactive identities remain available to organization/platform
  -- administrators for audit, but not to operational, staff or resident roles.
  IF v_resident_status <> 'active' THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'manager' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.unit_residents ur
      JOIN public.units u ON u.id = ur.unit_id
      WHERE ur.resident_id = p_resident_id
        AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
        AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
        AND public.current_user_can_manage_site(u.site_id)
    );
  ELSIF v_role = 'staff' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.service_tickets t
      WHERE (t.resident_id = p_resident_id OR EXISTS (
        SELECT 1
        FROM public.unit_residents ur
        WHERE ur.resident_id = p_resident_id
          AND ur.unit_id = t.unit_id
          AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
          AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
      ))
      AND t.workflow_state NOT IN ('closed', 'cancelled')
      AND public.current_user_has_staff_ticket_access(t.id, t.assigned_to)
    );
  ELSIF v_role = 'owner' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.unit_residents target_ur
      WHERE target_ur.resident_id = p_resident_id
        AND target_ur.relationship IN (
          'owner', 'tenant', 'family', 'authorized_contact'
        )
        AND (target_ur.start_date IS NULL OR target_ur.start_date <= CURRENT_DATE)
        AND (target_ur.end_date IS NULL OR target_ur.end_date >= CURRENT_DATE)
        AND public.profile_has_unit_relationship(
          (SELECT auth.uid()),
          target_ur.unit_id,
          ARRAY['owner']::TEXT[]
        )
    );
  ELSIF v_role = 'tenant' THEN
    RETURN public.current_user_is_linked_resident(p_resident_id);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_staff_ticket_access(
  p_ticket_id UUID,
  p_assigned_to UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_tickets t
    JOIN public.staff_members sm
      ON sm.profile_id = (SELECT auth.uid())
     AND sm.company_id = t.company_id
    WHERE t.id = p_ticket_id
      AND sm.status IN ('active', 'training')
      AND (
        t.assigned_to = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workforce_tasks w
          WHERE w.company_id = sm.company_id
            AND w.ticket_id = t.id
            AND w.assigned_staff_member_id = sm.id
            AND w.status NOT IN ('closed', 'cancelled')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_assigned_to_ticket(
  p_ticket_id UUID,
  p_assigned_to UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.service_tickets t
    JOIN public.staff_members sm
      ON sm.profile_id = (SELECT auth.uid())
     AND sm.company_id = t.company_id
    WHERE t.id = p_ticket_id
      AND sm.status = 'active'
      AND (
        t.assigned_to = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.workforce_tasks w
          WHERE w.company_id = sm.company_id
            AND w.ticket_id = t.id
            AND w.assigned_staff_member_id = sm.id
            AND w.status NOT IN ('closed', 'cancelled')
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_finance_ticket_access(
  p_ticket_id UUID,
  p_requires_finance_approval BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(p_requires_finance_approval, FALSE)
    OR EXISTS (
      SELECT 1
      FROM public.service_tickets t
      WHERE t.id = p_ticket_id
        AND t.emergency_classification = 'rule_matched_p0'
    )
    OR EXISTS (
      SELECT 1
      FROM public.service_orders o
      WHERE o.ticket_id = p_ticket_id
        AND (
          o.status IN ('payment_pending', 'blocked')
          OR o.debt_check_status IN ('minor_debt_review', 'blocked')
          OR o.payment_decision = 'hold'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.service_ticket_finance_cleared(
  p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.emergency_classification = 'rule_matched_p0'
    OR NOT t.requires_finance_approval
    OR EXISTS (
      SELECT 1
      FROM public.service_orders o
      WHERE o.ticket_id = t.id
        AND o.status NOT IN ('payment_pending', 'blocked', 'cancelled')
        AND o.debt_check_status = 'clear'
        AND (
          o.approved_at IS NOT NULL
          OR o.payment_decision IN (
            'no_charge',
            'debit_to_account',
            'paid_or_debit_approved'
          )
        )
    )
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_service_ticket(
  p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket public.service_tickets%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_ticket.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_role = 'manager' THEN
    RETURN public.current_user_can_manage_site(v_ticket.site_id);
  ELSIF v_role = 'accountant' THEN
    RETURN public.current_user_has_finance_ticket_access(
      v_ticket.id, v_ticket.requires_finance_approval
    );
  ELSIF v_role = 'staff' THEN
    RETURN public.current_user_has_staff_ticket_access(
      v_ticket.id, v_ticket.assigned_to
    );
  ELSIF v_role = 'owner' THEN
    RETURN v_ticket.unit_id IS NOT NULL
      AND public.profile_has_unit_relationship(
        (SELECT auth.uid()),
        v_ticket.unit_id,
        ARRAY['owner']::TEXT[]
      );
  ELSIF v_role = 'tenant' THEN
    RETURN v_ticket.unit_id IS NOT NULL
      AND public.profile_has_unit_relationship(
        (SELECT auth.uid()),
        v_ticket.unit_id,
        ARRAY['tenant']::TEXT[]
      )
      AND (
        v_ticket.created_by = (SELECT auth.uid())
        OR (
          v_ticket.resident_id IS NOT NULL
          AND public.current_user_is_linked_resident(v_ticket.resident_id)
        )
      );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_reservation(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking public.reservations%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_booking
  FROM public.reservations b
  WHERE b.id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_booking.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_role = 'manager' THEN
    RETURN public.current_user_can_manage_site(v_booking.site_id);
  ELSIF v_role = 'staff' THEN
    RETURN public.current_user_can_view_site(v_booking.site_id);
  ELSIF v_role = 'owner' THEN
    RETURN public.profile_has_unit_relationship(
      (SELECT auth.uid()),
      v_booking.unit_id,
      ARRAY['owner']::TEXT[]
    );
  ELSIF v_role = 'tenant' THEN
    RETURN public.profile_has_unit_relationship(
      (SELECT auth.uid()),
      v_booking.unit_id,
      ARRAY['tenant']::TEXT[]
    )
    AND (
      v_booking.created_by = (SELECT auth.uid())
      OR (
        v_booking.resident_id IS NOT NULL
        AND public.current_user_is_linked_resident(v_booking.resident_id)
      )
    );
  END IF;

  RETURN FALSE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 7. Append-only evidence protection.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.reject_append_only_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.allow_append_only_mutation', TRUE) = 'on' THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    '% is append-only; use an authorized compensating event.', TG_TABLE_NAME;
END;
$$;

DROP TRIGGER IF EXISTS protect_service_ticket_events
  ON public.service_ticket_events;
CREATE TRIGGER protect_service_ticket_events
  BEFORE UPDATE OR DELETE ON public.service_ticket_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

DROP TRIGGER IF EXISTS protect_service_ticket_transitions
  ON public.service_ticket_transitions;
CREATE TRIGGER protect_service_ticket_transitions
  BEFORE UPDATE OR DELETE ON public.service_ticket_transitions
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

DROP TRIGGER IF EXISTS protect_reservation_decisions
  ON public.reservation_decisions;
CREATE TRIGGER protect_reservation_decisions
  BEFORE UPDATE OR DELETE ON public.reservation_decisions
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

DROP TRIGGER IF EXISTS protect_audit_events ON public.audit_events;
CREATE TRIGGER protect_audit_events
  BEFORE UPDATE OR DELETE ON public.audit_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

-- ---------------------------------------------------------------------------
-- 8. Canonical RLS replacement for the ticket/reservation security boundary.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  v_table_name TEXT;
  v_policy RECORD;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'resident_profile_links',
    'profile_site_assignments',
    'units',
    'residents',
    'unit_residents',
    'service_tickets',
    'service_ticket_events',
    'service_ticket_transitions',
    'reservations',
    'reservation_decisions',
    'staff_members',
    'service_orders',
    'workforce_tasks',
    'media_reports',
    'audit_events',
    'integration_outbox'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);

    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table_name
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname,
        v_table_name
      );
    END LOOP;
  END LOOP;

  ALTER TABLE public.platform_administrators ENABLE ROW LEVEL SECURITY;
END;
$$;

CREATE POLICY "Users and organization admins read resident links"
  ON public.resident_profile_links
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR profile_id = (SELECT auth.uid())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
    )
  );

CREATE POLICY "Organization admins create resident links"
  ON public.resident_profile_links
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Organization admins update resident links"
  ON public.resident_profile_links
  FOR UPDATE TO authenticated
  USING (public.current_user_is_organization_admin(company_id))
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Users and organization admins read site assignments"
  ON public.profile_site_assignments
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR profile_id = (SELECT auth.uid())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
    )
  );

CREATE POLICY "Organization admins create site assignments"
  ON public.profile_site_assignments
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Organization admins update site assignments"
  ON public.profile_site_assignments
  FOR UPDATE TO authenticated
  USING (public.current_user_is_organization_admin(company_id))
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Role scoped unit visibility"
  ON public.units
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_unit(id));

CREATE POLICY "Organization admins and site managers create units"
  ON public.units
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_organization_admin(company_id)
    OR public.current_user_can_manage_site(site_id)
  );

CREATE POLICY "Organization admins and site managers update units"
  ON public.units
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_organization_admin(company_id)
    OR public.current_user_can_manage_site(site_id)
  )
  WITH CHECK (
    public.current_user_is_organization_admin(company_id)
    OR public.current_user_can_manage_site(site_id)
  );

CREATE POLICY "Role scoped resident visibility"
  ON public.residents
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_resident(id));

CREATE POLICY "Organization admins create residents"
  ON public.residents
  FOR INSERT TO authenticated
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Organization admins update residents"
  ON public.residents
  FOR UPDATE TO authenticated
  USING (public.current_user_is_organization_admin(company_id))
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Role scoped unit resident visibility"
  ON public.unit_residents
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_view_unit(unit_id)
    AND public.current_user_can_view_resident(resident_id)
  );

CREATE POLICY "Organization admins and site managers create unit relationships"
  ON public.unit_residents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_user_is_organization_admin(company_id)
    OR EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = unit_id
        AND public.current_user_can_manage_site(u.site_id)
    )
  );

CREATE POLICY "Organization admins and site managers update unit relationships"
  ON public.unit_residents
  FOR UPDATE TO authenticated
  USING (
    public.current_user_is_organization_admin(company_id)
    OR EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = unit_id
        AND public.current_user_can_manage_site(u.site_id)
    )
  )
  WITH CHECK (
    public.current_user_is_organization_admin(company_id)
    OR EXISTS (
      SELECT 1
      FROM public.units u
      WHERE u.id = unit_id
        AND public.current_user_can_manage_site(u.site_id)
    )
  );

CREATE POLICY "Role and relationship scoped ticket visibility"
  ON public.service_tickets
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN TRUE
        WHEN 'manager' THEN public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN public.current_user_has_finance_ticket_access(
          id, requires_finance_approval
        )
        WHEN 'staff' THEN public.current_user_has_staff_ticket_access(
          id, assigned_to
        )
        WHEN 'owner' THEN unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id, ARRAY['owner']::TEXT[]
          )
        WHEN 'tenant' THEN unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id, ARRAY['tenant']::TEXT[]
          )
          AND (
            created_by = (SELECT auth.uid())
            OR (
              resident_id IS NOT NULL
              AND public.current_user_is_linked_resident(resident_id)
            )
          )
        ELSE FALSE
      END
    )
  );

CREATE POLICY "Role scoped ticket event visibility"
  ON public.service_ticket_events
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_view_service_ticket(ticket_id)
    AND (
      (SELECT public.is_platform_super_admin())
      OR CASE (SELECT public.current_user_profile_role())
        WHEN 'owner' THEN visibility = 'resident'
        WHEN 'tenant' THEN visibility = 'resident'
        WHEN 'accountant' THEN visibility = 'finance'
        WHEN 'staff' THEN visibility IN ('resident', 'internal')
        ELSE TRUE
      END
    )
  );

CREATE POLICY "Operational users read ticket transitions"
  ON public.service_ticket_transitions
  FOR SELECT TO authenticated
  USING (
    public.current_user_can_view_service_ticket(ticket_id)
    AND (
      (SELECT public.is_platform_super_admin())
      OR (SELECT public.current_user_profile_role()) IN (
        'admin', 'manager', 'accountant', 'staff'
      )
    )
  );

CREATE POLICY "Role and relationship scoped reservation visibility"
  ON public.reservations
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_reservation(id));

CREATE POLICY "Authorized users create reservations"
  ON public.reservations
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND created_by = (SELECT auth.uid())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN TRUE
        WHEN 'manager' THEN public.current_user_can_manage_site(site_id)
        WHEN 'owner' THEN
          public.current_user_has_unit_relationship(
            unit_id, ARRAY['owner']::TEXT[]
          )
          AND (resident_id IS NULL OR public.current_user_is_linked_resident(resident_id))
          AND approval_status = 'approved'
          AND status = 'scheduled'
          AND access_code_status = 'pending'
          AND cleaning_status = 'pending'
        WHEN 'tenant' THEN
          public.current_user_has_unit_relationship(
            unit_id, ARRAY['tenant']::TEXT[]
          )
          AND (resident_id IS NULL OR public.current_user_is_linked_resident(resident_id))
          AND approval_status = 'pending_owner'
          AND status = 'scheduled'
          AND access_code_status = 'pending'
          AND cleaning_status = 'pending'
        ELSE FALSE
      END
    )
  );

CREATE POLICY "Authorized users read reservation decisions"
  ON public.reservation_decisions
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_reservation(reservation_id));

CREATE POLICY "Scoped staff directory visibility"
  ON public.staff_members
  FOR SELECT TO authenticated
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
            OR EXISTS (
              SELECT 1
              FROM public.workforce_tasks w
              WHERE w.assigned_staff_member_id = staff_members.id
                AND public.current_user_can_manage_site(w.site_id)
            )
          )
        )
      )
    )
  );

CREATE POLICY "Organization admins manage staff directory"
  ON public.staff_members
  FOR ALL TO authenticated
  USING (public.current_user_is_organization_admin(company_id))
  WITH CHECK (public.current_user_is_organization_admin(company_id));

CREATE POLICY "Role scoped service order visibility"
  ON public.service_orders
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) = 'admin'
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND public.current_user_can_manage_site(site_id)
        )
        OR (SELECT public.current_user_profile_role()) = 'accountant'
      )
    )
  );

DROP POLICY IF EXISTS "Operational managers manage service orders"
  ON public.service_orders;

CREATE POLICY "Operational workforce task visibility"
  ON public.workforce_tasks
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) = 'admin'
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND public.current_user_can_manage_site(site_id)
        )
        OR (
          (SELECT public.current_user_profile_role()) = 'staff'
          AND EXISTS (
            SELECT 1
            FROM public.staff_members sm
            WHERE sm.profile_id = (SELECT auth.uid())
              AND sm.company_id = workforce_tasks.company_id
              AND sm.status IN ('active', 'training')
              AND workforce_tasks.assigned_staff_member_id = sm.id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Operational manager workforce task management"
  ON public.workforce_tasks;

CREATE POLICY "Scoped media evidence visibility"
  ON public.media_reports
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) = 'admin'
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        )
        OR (
          (SELECT public.current_user_profile_role()) = 'staff'
          AND ticket_id IS NOT NULL
          AND public.current_user_has_staff_ticket_access(ticket_id, NULL)
        )
        OR (
          (SELECT public.current_user_profile_role()) IN ('owner', 'tenant')
          AND verification_status = 'accepted'
          AND ticket_id IS NOT NULL
          AND public.current_user_can_view_service_ticket(ticket_id)
        )
      )
    )
  );

CREATE POLICY "Operational users create media evidence"
  ON public.media_reports
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = (SELECT public.current_user_company_id())
    AND (
      public.current_user_is_organization_admin(company_id)
      OR (
        (SELECT public.current_user_profile_role()) = 'manager'
        AND site_id IS NOT NULL
        AND public.current_user_can_manage_site(site_id)
      )
      OR (
        (SELECT public.current_user_profile_role()) = 'staff'
        AND ticket_id IS NOT NULL
        AND public.current_user_is_assigned_to_ticket(ticket_id, NULL)
      )
    )
  );

CREATE POLICY "Organization administrators read company audit"
  ON public.audit_events
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
    )
  );

CREATE POLICY "Organization administrators read integration outbox"
  ON public.integration_outbox
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
    )
  );

DROP POLICY IF EXISTS "Organization admins can manage company profiles"
  ON public.profiles;
CREATE POLICY "Organization admins can manage company profiles"
  ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
      AND id IS DISTINCT FROM (SELECT auth.uid())
    )
  )
  WITH CHECK (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
      AND id IS DISTINCT FROM (SELECT auth.uid())
    )
  );

-- API consumers must never receive raw ticket rows. Command responses and list
-- reads use the same role-safe projection so that relationship RLS cannot be
-- bypassed through SECURITY DEFINER return values or nested PostgREST selects.
CREATE OR REPLACE FUNCTION public.redact_service_ticket_for_current_user(
  p_ticket public.service_tickets
)
RETURNS public.service_tickets
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result public.service_tickets%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
  v_actor_id UUID := (SELECT auth.uid());
  v_has_operational_access BOOLEAN;
BEGIN
  v_result := p_ticket;
  v_has_operational_access :=
    public.is_platform_super_admin()
    OR v_role IN ('admin', 'manager')
    OR (
      v_role = 'staff'
      AND public.current_user_has_staff_ticket_access(
        p_ticket.id, p_ticket.assigned_to
      )
    );

  IF v_has_operational_access THEN
    RETURN v_result;
  END IF;

  -- Idempotency, policy/routing, vendor and actor fields are internal even when
  -- the caller is allowed to see the business lifecycle of the ticket.
  v_result.vendor_id := NULL;
  v_result.approved_by := NULL;
  v_result.approved_at := NULL;
  v_result.routing_source := NULL;
  v_result.routing_metadata := '{}'::JSONB;
  v_result.idempotency_key := NULL;
  v_result.emergency_policy_code := NULL;
  v_result.emergency_policy_version := NULL;
  v_result.emergency_reported_at := NULL;
  v_result.search_vector := NULL;
  v_result.created_by := CASE
    WHEN p_ticket.created_by = v_actor_id THEN v_actor_id
    ELSE NULL
  END;
  v_result.resident_id := CASE
    WHEN p_ticket.resident_id IS NOT NULL
      AND public.current_user_is_linked_resident(p_ticket.resident_id)
    THEN p_ticket.resident_id
    ELSE NULL
  END;
  v_result.assigned_to := CASE
    WHEN p_ticket.assigned_to = v_actor_id THEN v_actor_id
    ELSE NULL
  END;

  IF v_role <> 'accountant' THEN
    v_result.estimated_cost_cents := NULL;
    v_result.approved_cost_cents := NULL;
    v_result.requires_finance_approval := FALSE;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.read_service_ticket_queue_safe(
  p_limit INTEGER DEFAULT 100,
  p_search TEXT DEFAULT NULL,
  p_identifier TEXT DEFAULT NULL
)
RETURNS SETOF JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_is_platform_admin BOOLEAN := public.is_platform_super_admin();
  v_search TEXT := NULLIF(LEFT(BTRIM(p_search), 120), '');
  v_identifier TEXT := NULLIF(LEFT(BTRIM(p_identifier), 200), '');
BEGIN
  IF v_actor_id IS NULL AND NOT v_is_platform_admin THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT jsonb_build_object(
    'id', t.id,
    'ticket_no', t.ticket_no,
    'title', t.title,
    'description', t.description,
    'category', t.category,
    'priority', t.priority,
    'status', t.status,
    'workflow_state', t.workflow_state,
    'workflow_version', t.workflow_version,
    'approval_status', t.approval_status,
    'emergency_classification', t.emergency_classification,
    'created_by', CASE
      WHEN access.can_read_operations OR t.created_by = v_actor_id
        THEN t.created_by
      ELSE NULL
    END,
    'routing_metadata', CASE
      WHEN access.can_read_operations THEN COALESCE(t.routing_metadata, '{}'::JSONB)
      ELSE '{}'::JSONB
    END,
    'sla_due_at', t.sla_due_at,
    'estimated_cost_cents', CASE
      WHEN access.can_read_finance THEN t.estimated_cost_cents
      ELSE NULL
    END,
    'requires_finance_approval', CASE
      WHEN access.can_read_finance THEN t.requires_finance_approval
      ELSE FALSE
    END,
    'unit_id', t.unit_id,
    'resident_id', CASE
      WHEN access.can_read_operations OR (
        t.resident_id IS NOT NULL
        AND public.current_user_is_linked_resident(t.resident_id)
      ) THEN t.resident_id
      ELSE NULL
    END,
    'assigned_to', CASE
      WHEN access.can_read_operations OR t.assigned_to = v_actor_id
        THEN t.assigned_to
      ELSE NULL
    END,
    'assignment_label', t.assignment_label,
    'routing_source', CASE
      WHEN access.can_read_operations THEN t.routing_source
      ELSE NULL
    END,
    'created_at', t.created_at,
    'updated_at', t.updated_at,
    'units', CASE WHEN u.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', u.id,
      'unit_no', u.unit_no
    ) END,
    'residents', CASE
      WHEN r.id IS NULL THEN NULL
      WHEN access.can_read_operations
        OR public.current_user_is_linked_resident(r.id)
      THEN jsonb_build_object('id', r.id, 'full_name', r.full_name)
      ELSE NULL
    END,
    'service_ticket_events', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', e.id,
          'event_type', e.event_type,
          'body', e.body,
          'visibility', e.visibility,
          'ticket_version', e.ticket_version,
          'metadata', CASE
            WHEN access.can_read_finance THEN COALESCE(e.metadata, '{}'::JSONB)
            ELSE '{}'::JSONB
          END,
          'created_at', e.created_at
        ) ORDER BY e.created_at ASC
      )
      FROM public.service_ticket_events e
      WHERE e.ticket_id = t.id
        AND (
          v_is_platform_admin
          OR CASE v_role
            WHEN 'owner' THEN e.visibility = 'resident'
            WHEN 'tenant' THEN e.visibility = 'resident'
            WHEN 'accountant' THEN e.visibility = 'finance'
            WHEN 'staff' THEN e.visibility IN ('resident', 'internal')
            ELSE TRUE
          END
        )
    ), '[]'::JSONB),
    'media_reports', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'verification_status', m.verification_status
        ) ORDER BY m.created_at ASC
      )
      FROM public.media_reports m
      WHERE m.ticket_id = t.id
        AND (access.can_read_operations OR m.verification_status = 'accepted')
    ), '[]'::JSONB)
  )
  FROM public.service_tickets t
  LEFT JOIN public.units u ON u.id = t.unit_id
  LEFT JOIN public.residents r ON r.id = t.resident_id
  CROSS JOIN LATERAL (
    SELECT
      (
        v_is_platform_admin
        OR v_role IN ('admin', 'manager')
        OR (
          v_role = 'staff'
          AND public.current_user_has_staff_ticket_access(t.id, t.assigned_to)
        )
      ) AS can_read_operations,
      (
        v_is_platform_admin
        OR v_role IN ('admin', 'manager', 'accountant')
        OR (
          v_role = 'staff'
          AND public.current_user_has_staff_ticket_access(t.id, t.assigned_to)
        )
      ) AS can_read_finance
  ) access
  WHERE (v_is_platform_admin OR t.company_id = v_company_id)
    AND public.current_user_can_view_service_ticket(t.id)
    AND (
      v_identifier IS NULL
      OR t.id::TEXT = v_identifier
      OR t.ticket_no = v_identifier
    )
    AND (
      v_search IS NULL
      OR CONCAT_WS(
        ' ', t.ticket_no, t.title, t.description, t.category, u.unit_no
      ) ILIKE '%' || v_search || '%'
    )
  ORDER BY t.sla_due_at ASC NULLS LAST, t.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 100), 1), 250);
END;
$$;

COMMENT ON FUNCTION public.read_service_ticket_queue_safe(INTEGER, TEXT, TEXT)
  IS 'Role-safe ticket queue projection with relationship scope, redacted internal fields and visibility-filtered event history.';

-- ---------------------------------------------------------------------------
-- 9. Atomic, idempotent ticket commands.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_service_ticket_command(
  p_idempotency_key TEXT,
  p_site_id UUID,
  p_unit_id UUID,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_category TEXT DEFAULT 'general',
  p_priority TEXT DEFAULT 'normal',
  p_resident_id UUID DEFAULT NULL,
  p_ticket_no TEXT DEFAULT NULL,
  p_sla_due_at TIMESTAMPTZ DEFAULT NULL,
  p_emergency_policy_code TEXT DEFAULT NULL,
  p_request_fingerprint TEXT DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_actor_company UUID := public.current_user_company_id();
  v_company_id UUID;
  v_resident_id UUID := p_resident_id;
  v_approval_status TEXT;
  v_status TEXT;
  v_emergency_classification TEXT := 'none';
  v_emergency_policy_code TEXT := NULLIF(BTRIM(p_emergency_policy_code), '');
  v_ticket_no TEXT;
  v_ticket public.service_tickets%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF COALESCE(p_request_fingerprint, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A SHA-256 request fingerprint is required.';
  END IF;

  IF NULLIF(BTRIM(p_title), '') IS NULL OR LENGTH(p_title) > 160 THEN
    RAISE EXCEPTION 'Ticket title must contain 1 to 160 characters.';
  END IF;

  IF p_description IS NOT NULL AND LENGTH(p_description) > 4000 THEN
    RAISE EXCEPTION 'Ticket description may not exceed 4000 characters.';
  END IF;

  IF NULLIF(BTRIM(p_category), '') IS NULL OR LENGTH(p_category) > 100 THEN
    RAISE EXCEPTION 'Ticket category must contain 1 to 100 characters.';
  END IF;

  IF p_priority NOT IN ('low', 'normal', 'high', 'urgent') THEN
    RAISE EXCEPTION 'Unsupported ticket priority: %', p_priority;
  END IF;

  IF v_emergency_policy_code IS NOT NULL THEN
    IF p_priority <> 'urgent' THEN
      RAISE EXCEPTION 'Emergency policy codes require urgent priority.';
    END IF;

    IF v_emergency_policy_code NOT IN (
      'life_safety',
      'fire_smoke',
      'gas_leak',
      'medical_emergency',
      'electrical_hazard',
      'elevator_entrapment',
      'flooding_active',
      'security_threat'
    ) THEN
      RAISE EXCEPTION 'Unsupported deterministic emergency policy code: %',
        v_emergency_policy_code;
    END IF;

    -- These codes are a versioned deterministic allowlist, not a model output.
    -- The result opens containment routing only; it never calls a public
    -- emergency number, grants access, closes a ticket or approves spend.
    v_emergency_classification := 'rule_matched_p0';
  ELSIF p_priority = 'urgent' THEN
    v_emergency_classification := 'reported';
  END IF;

  SELECT s.company_id INTO v_company_id
  FROM public.sites s
  WHERE s.id = p_site_id
    AND s.status <> 'archived';

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Unknown or archived ticket site.';
  END IF;

  IF v_actor_id IS NULL AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF NOT public.is_platform_super_admin()
     AND v_actor_company IS DISTINCT FROM v_company_id
  THEN
    RAISE EXCEPTION 'The ticket site is outside the current organization.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.company_id = v_company_id
    AND t.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF NOT (
      public.is_platform_super_admin()
      OR (v_actor_role = 'admin' AND v_ticket.company_id = v_actor_company)
      OR (
        v_actor_role = 'manager'
        AND public.current_user_can_manage_site(v_ticket.site_id)
      )
      OR (
        v_actor_role IN ('owner', 'tenant')
        AND v_ticket.created_by = v_actor_id
        AND v_ticket.unit_id IS NOT NULL
        AND public.current_user_has_unit_relationship(
          v_ticket.unit_id,
          CASE v_actor_role
            WHEN 'owner' THEN ARRAY['owner']::TEXT[]
            ELSE ARRAY['tenant']::TEXT[]
          END
        )
      )
    ) THEN
      RAISE EXCEPTION 'The current user cannot replay this ticket submission.';
    END IF;
    IF NOT public.is_platform_super_admin()
       AND v_ticket.created_by IS DISTINCT FROM v_actor_id
    THEN
      RAISE EXCEPTION 'Ticket submission replay belongs to another actor.';
    END IF;
    IF v_ticket.routing_metadata->>'requestFingerprint'
       IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different ticket submission.';
    END IF;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF v_actor_id IS NULL AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF NOT public.is_platform_super_admin()
     AND v_actor_company IS DISTINCT FROM v_company_id
  THEN
    RAISE EXCEPTION 'The ticket site is outside the current organization.';
  END IF;

  IF p_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.units u
    WHERE u.id = p_unit_id
      AND u.company_id = v_company_id
      AND u.site_id = p_site_id
  ) THEN
    RAISE EXCEPTION 'Ticket unit is outside the requested site.';
  END IF;

  IF public.is_platform_super_admin() OR v_actor_role = 'admin' THEN
    v_approval_status := 'not_required';
    v_status := 'open';
  ELSIF v_actor_role = 'manager'
        AND public.current_user_can_manage_site(p_site_id)
  THEN
    v_approval_status := 'not_required';
    v_status := 'open';
  ELSIF v_actor_role IN ('owner', 'tenant') THEN
    IF p_unit_id IS NULL THEN
      RAISE EXCEPTION 'Owners and tenants must select an authorized unit.';
    END IF;

    IF v_actor_role = 'owner'
       AND NOT public.current_user_has_unit_relationship(
         p_unit_id, ARRAY['owner']::TEXT[]
       )
    THEN
      RAISE EXCEPTION 'The current owner is not linked to this unit.';
    END IF;

    IF v_actor_role = 'tenant'
       AND NOT public.current_user_has_unit_relationship(
         p_unit_id, ARRAY['tenant']::TEXT[]
       )
    THEN
      RAISE EXCEPTION 'The current tenant is not linked to this unit.';
    END IF;

    IF v_resident_id IS NULL THEN
      v_resident_id := public.current_user_linked_resident_id();
    END IF;

    IF v_resident_id IS NULL
       OR NOT public.current_user_is_linked_resident(v_resident_id)
    THEN
      RAISE EXCEPTION 'A verified resident/profile link is required.';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.unit_residents ur
      WHERE ur.company_id = v_company_id
        AND ur.unit_id = p_unit_id
        AND ur.resident_id = v_resident_id
        AND ur.relationship = v_actor_role
        AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
        AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
    ) THEN
      RAISE EXCEPTION 'The resident is not actively linked to the selected unit.';
    END IF;

    -- Submission always enters the authoritative submitted/open intake state.
    -- Owner approval is an orthogonal manager decision made only after triage
    -- establishes responsibility, policy and cost; basic intake never waits on
    -- an owner by default.
    v_approval_status := 'not_required';
    v_status := 'open';
  ELSE
    RAISE EXCEPTION 'The current role cannot submit service tickets.';
  END IF;

  IF v_resident_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.residents r
    WHERE r.id = v_resident_id
      AND r.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'Ticket resident is outside the organization.';
  END IF;

  v_ticket_no := COALESCE(
    NULLIF(BTRIM(p_ticket_no), ''),
    'SRV-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' ||
      UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', '') FROM 1 FOR 8))
  );

  IF LENGTH(v_ticket_no) > 80 THEN
    RAISE EXCEPTION 'Ticket number may not exceed 80 characters.';
  END IF;

  INSERT INTO public.service_tickets (
    company_id,
    site_id,
    unit_id,
    resident_id,
    ticket_no,
    title,
    description,
    category,
    priority,
    status,
    sla_due_at,
    created_by,
    approval_status,
    requires_finance_approval,
    routing_source,
    routing_metadata,
    emergency_classification,
    emergency_policy_code,
    emergency_policy_version,
    emergency_reported_at,
    workflow_state,
    workflow_version,
    idempotency_key,
    last_transition_at
  ) VALUES (
    v_company_id,
    p_site_id,
    p_unit_id,
    v_resident_id,
    v_ticket_no,
    BTRIM(p_title),
    NULLIF(BTRIM(p_description), ''),
    BTRIM(p_category),
    p_priority,
    v_status,
    p_sla_due_at,
    v_actor_id,
    v_approval_status,
    FALSE,
    CASE WHEN v_actor_role IN ('owner', 'tenant')
      THEN 'resident_reported'
      ELSE 'manual'
    END,
    jsonb_build_object(
      'reportedPriority', p_priority,
      'requiresHumanTriage', p_priority = 'urgent',
      'emergencyClassification', v_emergency_classification,
      'emergencyPolicyCode', v_emergency_policy_code,
      'requestFingerprint', p_request_fingerprint
    ),
    v_emergency_classification,
    v_emergency_policy_code,
    CASE WHEN v_emergency_policy_code IS NOT NULL THEN 'tr-2026-07-v1' ELSE NULL END,
    CASE WHEN p_priority = 'urgent' THEN NOW() ELSE NULL END,
    'submitted',
    1,
    p_idempotency_key,
    NOW()
  )
  ON CONFLICT (company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.company_id = v_company_id
      AND t.idempotency_key = p_idempotency_key;
    IF v_ticket.routing_metadata->>'requestFingerprint'
       IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different ticket submission.';
    END IF;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  INSERT INTO public.service_ticket_transitions (
    company_id,
    ticket_id,
    from_status,
    to_status,
    command,
    from_workflow_state,
    to_workflow_state,
    ticket_version,
    actor_profile_id,
    actor_role,
    reason,
    metadata,
    idempotency_key
  ) VALUES (
    v_company_id,
    v_ticket.id,
    NULL,
    v_status,
    'submit',
    NULL,
    'submitted',
    1,
    v_actor_id,
    v_actor_role,
    'Ticket submitted',
    jsonb_build_object(
      'approvalStatus', v_approval_status,
      'reportedPriority', p_priority,
      'emergencyClassification', v_emergency_classification,
      'emergencyPolicyCode', v_emergency_policy_code,
      'emergencyPolicyVersion', CASE
        WHEN v_emergency_policy_code IS NOT NULL THEN 'tr-2026-07-v1'
        ELSE NULL
      END
    ),
    'create:' || p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id,
    ticket_id,
    event_type,
    body,
    actor_profile_id,
    metadata,
    visibility,
    ticket_version,
    idempotency_key
  ) VALUES (
    v_company_id,
    v_ticket.id,
    'ticket_created',
    'Service request received.',
    v_actor_id,
    jsonb_build_object(
      'status', v_status,
      'workflowState', 'submitted',
      'approvalStatus', v_approval_status
    ),
    'resident',
    1,
    'event:create:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id,
    actor_profile_id,
    action,
    entity_table,
    entity_id,
    after_data,
    idempotency_key
  ) VALUES (
    v_company_id,
    v_actor_id,
    'service_ticket.created',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketNo', v_ticket.ticket_no,
      'siteId', v_ticket.site_id,
      'unitId', v_ticket.unit_id,
      'status', v_ticket.status,
      'priority', v_ticket.priority,
      'approvalStatus', v_ticket.approval_status,
      'emergencyClassification', v_ticket.emergency_classification,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_ticket.workflow_version
    ),
    'audit:create:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id,
    integration_key,
    action_type,
    entity_table,
    entity_id,
    payload,
    status,
    deduplication_key
  ) VALUES (
    v_company_id,
    'internal_event_bus',
    'ticket.created',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'siteId', v_ticket.site_id,
      'unitId', v_ticket.unit_id,
      'status', v_ticket.status,
      'priority', v_ticket.priority,
      'emergencyClassification', v_ticket.emergency_classification,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_ticket.workflow_version
    ),
    'queued',
    'ticket.created:' || v_ticket.id::TEXT || ':1'
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

COMMENT ON FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) IS
  'Atomically submits an authorized service ticket and initial transition/event/audit/outbox records. Urgent resident priority enters human triage only.';

CREATE OR REPLACE FUNCTION public.transition_service_ticket_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_to_status TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_existing_ticket_id UUID;
  v_existing_status TEXT;
  v_transition_allowed BOOLEAN := FALSE;
  v_next_version INTEGER;
  v_from_status TEXT;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Transition reason may not exceed 1000 characters.';
  END IF;

  IF OCTET_LENGTH(COALESCE(p_metadata, '{}'::JSONB)::TEXT) > 20000 THEN
    RAISE EXCEPTION 'Transition metadata is too large.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  SELECT tr.ticket_id, tr.to_status
    INTO v_existing_ticket_id, v_existing_status
  FROM public.service_ticket_transitions tr
  WHERE tr.company_id = v_ticket.company_id
    AND tr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_ticket_id IS DISTINCT FROM p_ticket_id
       OR v_existing_status IS DISTINCT FROM p_to_status
    THEN
      RAISE EXCEPTION 'Idempotency key was already used for another transition.';
    END IF;
    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  v_from_status := v_ticket.status;

  IF public.is_platform_super_admin()
     OR (
       v_actor_role = 'admin'
       AND v_ticket.company_id = public.current_user_company_id()
     )
     OR (
       v_actor_role = 'manager'
       AND public.current_user_can_manage_site(v_ticket.site_id)
     )
  THEN
    NULL;
  ELSIF v_actor_role = 'staff'
        AND public.current_user_is_assigned_to_ticket(
          v_ticket.id, v_ticket.assigned_to
        )
  THEN
    IF NOT (
      (v_ticket.status = 'assigned' AND p_to_status = 'in_progress')
      OR (v_ticket.status = 'in_progress' AND p_to_status = 'resolved')
      OR (v_ticket.status = 'resolved' AND p_to_status = 'in_progress')
    ) THEN
      RAISE EXCEPTION 'Staff may only start, resolve, or reopen assigned work.';
    END IF;
  ELSE
    RAISE EXCEPTION 'The current role cannot transition this ticket.';
  END IF;

  v_transition_allowed := CASE v_ticket.status
    WHEN 'open' THEN p_to_status IN (
      'triage', 'waiting_approval', 'assigned', 'cancelled'
    )
    WHEN 'waiting_approval' THEN p_to_status IN (
      'triage', 'assigned', 'cancelled'
    )
    WHEN 'triage' THEN p_to_status IN (
      'waiting_approval', 'assigned', 'in_progress', 'cancelled'
    )
    WHEN 'assigned' THEN p_to_status IN (
      'triage', 'waiting_approval', 'in_progress', 'resolved', 'cancelled'
    )
    WHEN 'in_progress' THEN p_to_status IN (
      'triage', 'waiting_approval', 'resolved', 'cancelled'
    )
    WHEN 'resolved' THEN p_to_status IN ('closed', 'in_progress')
    WHEN 'closed' THEN p_to_status = 'in_progress'
    WHEN 'cancelled' THEN p_to_status = 'open'
    ELSE FALSE
  END;

  IF NOT v_transition_allowed THEN
    RAISE EXCEPTION 'Invalid ticket transition: % -> %.',
      v_ticket.status, p_to_status;
  END IF;

  IF p_to_status IN ('assigned', 'in_progress')
     AND v_ticket.approval_status IN ('pending_owner', 'rejected')
  THEN
    RAISE EXCEPTION 'Owner approval must clear before operational dispatch.';
  END IF;

  IF p_to_status IN ('assigned', 'in_progress')
     AND NOT COALESCE(public.service_ticket_finance_cleared(v_ticket.id), FALSE)
     AND NOT (
       v_ticket.emergency_classification = 'rule_matched_p0'
       AND COALESCE(p_metadata->>'transitionPurpose', '') = 'emergency_containment'
     )
  THEN
    RAISE EXCEPTION 'Finance/payment clearance is required before dispatch.';
  END IF;

  IF v_actor_role = 'staff'
     AND p_to_status = 'resolved'
     AND EXISTS (
       SELECT 1
       FROM public.workforce_tasks w
       WHERE w.ticket_id = v_ticket.id
         AND w.requires_media = TRUE
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.media_reports m
       WHERE m.ticket_id = v_ticket.id
         AND (
           m.storage_path IS NOT NULL
           OR m.media_type = 'note'
         )
     )
  THEN
    RAISE EXCEPTION 'Required completion evidence must be uploaded before resolution.';
  END IF;

  IF p_to_status = 'closed'
     AND EXISTS (
       SELECT 1
       FROM public.workforce_tasks w
       WHERE w.ticket_id = v_ticket.id
         AND w.requires_media = TRUE
     )
     AND NOT EXISTS (
       SELECT 1
       FROM public.media_reports m
       WHERE m.ticket_id = v_ticket.id
         AND m.verification_status = 'accepted'
     )
  THEN
    RAISE EXCEPTION 'Accepted completion evidence is required before closure.';
  END IF;

  v_next_version := v_ticket.workflow_version + 1;

  UPDATE public.service_tickets
  SET
    status = p_to_status,
    workflow_version = v_next_version,
    last_transition_at = NOW(),
    closed_at = CASE
      WHEN p_to_status = 'closed' THEN NOW()
      WHEN p_to_status IN ('open', 'triage', 'assigned', 'in_progress') THEN NULL
      ELSE closed_at
    END,
    updated_at = NOW()
  WHERE id = v_ticket.id
    AND workflow_version = p_expected_version
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket version conflict.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.service_ticket_transitions (
    company_id, ticket_id, from_status, to_status, ticket_version,
    actor_profile_id, actor_role, reason, metadata, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    v_from_status,
    p_to_status,
    v_next_version,
    v_actor_id,
    v_actor_role,
    NULLIF(BTRIM(p_reason), ''),
    COALESCE(p_metadata, '{}'::JSONB),
    p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    'status_changed',
    COALESCE(NULLIF(BTRIM(p_reason), ''), 'Ticket status updated.'),
    v_actor_id,
    COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
      'fromStatus', v_from_status,
      'toStatus', p_to_status,
      'workflowVersion', v_next_version
    ),
    'resident',
    v_next_version,
    'event:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.transitioned',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'status', v_from_status,
      'workflowVersion', p_expected_version
    ),
    jsonb_build_object(
      'status', p_to_status,
      'workflowVersion', v_next_version,
      'reason', NULLIF(BTRIM(p_reason), '')
    ),
    'audit:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    'ticket.status_changed',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'status', p_to_status,
      'workflowVersion', v_next_version
    ),
    'queued',
    'ticket.status_changed:' || v_ticket.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

COMMENT ON FUNCTION public.transition_service_ticket_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) IS
  'Row-locked, optimistic and idempotent service-ticket state transition with role, owner-approval, finance and evidence gates.';

-- Materialize the operational work objects inside the same transaction as the
-- accepted/assigned ticket command. This is intentionally an internal helper:
-- callers must already hold the ticket row lock and pass the authoritative
-- workflow/RBAC checks in the public command functions below.
CREATE OR REPLACE FUNCTION public.materialize_ticket_execution_internal(
  p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_ticket public.service_tickets%ROWTYPE;
  v_catalog public.service_catalog%ROWTYPE;
  v_order public.service_orders%ROWTYPE;
  v_task public.workforce_tasks%ROWTYPE;
  v_staff_member_id UUID;
  v_finance_cleared BOOLEAN := FALSE;
  v_emergency_containment BOOLEAN := FALSE;
  v_materialize BOOLEAN := FALSE;
  v_order_status TEXT;
  v_task_status TEXT;
  v_payment_decision TEXT;
  v_team TEXT;
  v_catalog_code TEXT;
  v_ticket_content TEXT;
  v_quoted_price_cents BIGINT;
  v_next_action TEXT;
BEGIN
  SELECT *
    INTO v_ticket
    FROM public.service_tickets t
   WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  SELECT *
    INTO v_order
    FROM public.service_orders o
   WHERE o.ticket_id = v_ticket.id
   ORDER BY o.created_at ASC
   LIMIT 1
   FOR UPDATE;

  SELECT *
    INTO v_task
    FROM public.workforce_tasks w
   WHERE w.ticket_id = v_ticket.id
   ORDER BY
     (w.metadata->>'generationKey' = 'ticket-primary-v1') DESC,
     w.created_at ASC
   LIMIT 1
   FOR UPDATE;

  v_materialize :=
    v_order.id IS NOT NULL
    OR v_task.id IS NOT NULL
    OR v_ticket.workflow_state IN (
      'accepted', 'assigned', 'acknowledged', 'in_progress',
      'waiting_resident', 'manager_review', 'rework', 'resolved', 'closed'
    );

  IF NOT v_materialize THEN
    RETURN jsonb_build_object(
      'materialized', FALSE,
      'serviceOrderId', NULL,
      'workforceTaskId', NULL
    );
  END IF;

  -- Classify from the resident's complete request, not only the free-form
  -- category. Portal categories such as `access-maintenance` are deliberately
  -- stable API values and will not necessarily equal a service-catalog code.
  -- The explicit mapping keeps the transactional database path aligned with
  -- the deterministic local QA path while retaining a human assignment gate.
  v_ticket_content := lower(concat_ws(
    ' ',
    COALESCE(v_ticket.category, ''),
    COALESCE(v_ticket.title, ''),
    COALESCE(v_ticket.description, '')
  ));
  v_catalog_code := CASE
    WHEN v_ticket_content ~ '(life[- ]?safety|gas|gaz|smoke|duman|fire|yang)' THEN 'EMERG-LIFE-SAFETY'
    WHEN v_ticket_content ~ '(elevator|lift|asans|aufzug)' THEN 'MAINT-ELEVATOR'
    WHEN v_ticket_content ~ '(electric|elektrik|power|spark|strom)' THEN 'MAINT-ELEC'
    WHEN v_ticket_content ~ '(sewer|sewage|drain|toilet|gider|kanalizasyon)' THEN 'MAINT-SEWER'
    WHEN v_ticket_content ~ '(plumb|water|pipe|tesisat|su yok|su ka)' THEN 'MAINT-PLUMB'
    WHEN v_ticket_content ~ '(hvac|urgent ac|acil klima)' THEN 'MAINT-HVAC-URGENT'
    WHEN v_ticket_content ~ '(air condition|klima|iklim)' THEN 'MAINT-AC'
    WHEN v_ticket_content ~ '(clean|temiz|reinig)' THEN 'CLEAN-STD'
    WHEN v_ticket_content ~ '(deposit damage|depozito|hasar)' THEN 'INSP-DAMAGE'
    WHEN v_ticket_content ~ '(lockout|locked out|access-maintenance|access maintenance|barrier|bariyer|kapida kal)' THEN 'SEC-LOCKOUT'
    WHEN v_ticket_content ~ '(access|security|erisim|guven|kamera)' THEN 'SEC-ACCESS'
    WHEN v_ticket_content ~ '(amenity-food-event|restaurant event|restaurant incident|food|etkinlik olayi)' THEN 'AMENITY-FOOD-EVENT-INCIDENT'
    WHEN v_ticket_content ~ '(theatre|theater|tiyatro|event|etkinlik)' THEN 'AMENITY-THEATRE'
    WHEN v_ticket_content ~ '(restaurant|restoran|dining)' THEN 'AMENITY-RESTAURANT'
    WHEN v_ticket_content ~ '(excursion|quad|bike|bisiklet|jeep|mountain)' THEN 'CONCIERGE-EXCURSION'
    WHEN v_ticket_content ~ '(amenity-spa-pool|pool hygiene|havuz incident|hijyen)' THEN 'AMENITY-SPA-INCIDENT'
    WHEN v_ticket_content ~ '(pool|havuz|spa|fitness|ortak)' THEN 'AMENITY-SPA'
    ELSE NULL
  END;

  SELECT *
    INTO v_catalog
    FROM public.service_catalog c
   WHERE c.company_id = v_ticket.company_id
     AND c.active
     AND (c.site_id IS NULL OR c.site_id = v_ticket.site_id)
   ORDER BY
     CASE
       WHEN v_catalog_code IS NOT NULL
            AND lower(c.code) = lower(v_catalog_code) THEN 0
       WHEN lower(c.code) = lower(v_ticket.category) THEN 1
       WHEN lower(concat_ws(' ', c.code, c.name, c.category, c.description))
            LIKE '%' || lower(v_ticket.category) || '%' THEN 2
       WHEN c.category = 'maintenance' THEN 3
       ELSE 4
     END,
     (c.site_id = v_ticket.site_id) DESC,
     c.popularity_score DESC,
     c.created_at ASC
   LIMIT 1;

  v_emergency_containment :=
    v_ticket.emergency_classification = 'rule_matched_p0';
  -- Life-safety containment is operationally clear by definition. Any cost is
  -- reviewed after containment and must never turn assignment or start-work
  -- into a payment gate.
  v_finance_cleared := v_emergency_containment OR COALESCE(
    public.service_ticket_finance_cleared(v_ticket.id),
    FALSE
  );
  v_team := COALESCE(
    NULLIF(BTRIM(v_catalog.team), ''),
    NULLIF(BTRIM(v_ticket.assignment_label), ''),
    NULLIF(BTRIM(v_ticket.routing_metadata->>'suggestedAssignee'), ''),
    'Operasyon'
  );
  v_quoted_price_cents := COALESCE(
    NULLIF(v_ticket.estimated_cost_cents, 0),
    v_catalog.base_price_cents,
    0
  );

  v_order_status := CASE
    WHEN v_ticket.workflow_state = 'cancelled' THEN 'cancelled'
    WHEN v_ticket.workflow_state IN ('resolved', 'closed') THEN 'completed'
    WHEN v_ticket.workflow_state IN (
      'assigned', 'acknowledged', 'in_progress', 'waiting_resident',
      'manager_review', 'rework'
    ) THEN 'assigned'
    WHEN NOT v_finance_cleared AND NOT v_emergency_containment
      THEN 'payment_pending'
    WHEN v_ticket.workflow_state = 'accepted' THEN 'task_created'
    ELSE 'debt_check'
  END;

  v_task_status := CASE
    WHEN v_ticket.workflow_state = 'cancelled' THEN 'cancelled'
    WHEN v_ticket.workflow_state = 'closed' THEN 'closed'
    WHEN v_ticket.workflow_state IN ('manager_review', 'resolved') THEN 'resolved'
    WHEN v_ticket.workflow_state IN ('in_progress', 'waiting_resident', 'rework')
      THEN 'in_progress'
    WHEN v_ticket.workflow_state IN ('assigned', 'acknowledged') THEN 'assigned'
    WHEN NOT v_finance_cleared AND NOT v_emergency_containment
      THEN 'waiting_payment'
    ELSE 'open'
  END;

  v_payment_decision := CASE
    WHEN v_emergency_containment AND v_quoted_price_cents = 0 THEN 'no_charge'
    WHEN v_emergency_containment THEN 'post_emergency_review'
    WHEN v_quoted_price_cents = 0 OR COALESCE(v_catalog.requires_payment, FALSE) = FALSE
      THEN 'no_charge'
    WHEN v_finance_cleared THEN 'paid_or_debit_approved'
    WHEN COALESCE(v_catalog.debt_policy, 'manager_review') = 'allow'
      THEN 'debit_to_account'
    ELSE 'collect_before_dispatch'
  END;

  v_next_action := CASE
    WHEN v_ticket.workflow_state = 'cancelled' THEN 'Request cancelled; retain audit evidence.'
    WHEN v_ticket.workflow_state IN ('resolved', 'closed') THEN 'Include completed work in service reporting.'
    WHEN v_emergency_containment
      THEN 'Continue emergency containment; complete finance review afterwards.'
    WHEN NOT v_finance_cleared
      THEN 'Complete payment or debit approval before normal work starts.'
    WHEN v_ticket.workflow_state = 'accepted'
      THEN 'Assign the primary task by SLA and capability.'
    WHEN v_ticket.workflow_state IN ('assigned', 'acknowledged')
      THEN 'Responder acknowledges and starts the approved work.'
    WHEN v_ticket.workflow_state IN ('in_progress', 'waiting_resident', 'rework')
      THEN 'Complete checklist, notes and required evidence.'
    ELSE 'Manager reviews the submitted completion evidence.'
  END;

  INSERT INTO public.service_orders (
    company_id,
    site_id,
    service_catalog_id,
    ticket_id,
    unit_id,
    resident_id,
    order_no,
    status,
    debt_check_status,
    payment_decision,
    quoted_price_cents,
    currency,
    requested_for_at,
    next_action,
    created_by,
    approved_by,
    approved_at,
    metadata
  ) VALUES (
    v_ticket.company_id,
    v_ticket.site_id,
    v_catalog.id,
    v_ticket.id,
    v_ticket.unit_id,
    v_ticket.resident_id,
    'ORD-' || upper(substr(replace(v_ticket.id::TEXT, '-', ''), 1, 12)),
    v_order_status,
    CASE
      WHEN v_emergency_containment THEN 'clear'
      WHEN v_finance_cleared THEN 'clear'
      ELSE 'blocked'
    END,
    v_payment_decision,
    v_quoted_price_cents,
    COALESCE(v_catalog.currency, 'TRY'),
    v_ticket.sla_due_at,
    v_next_action,
    COALESCE(v_ticket.created_by, v_actor_id),
    v_actor_id,
    clock_timestamp(),
    jsonb_build_object(
      'generationKey', 'ticket-primary-v1',
      'workflowVersion', v_ticket.workflow_version,
      'emergencyContainment', v_emergency_containment,
      'financeBlocksDispatch',
        NOT v_emergency_containment AND NOT v_finance_cleared,
      'postEmergencyFinanceReviewRequired',
        v_emergency_containment AND v_quoted_price_cents > 0
    )
  )
  ON CONFLICT (ticket_id) WHERE ticket_id IS NOT NULL
  DO UPDATE SET
    service_catalog_id = COALESCE(EXCLUDED.service_catalog_id, public.service_orders.service_catalog_id),
    unit_id = EXCLUDED.unit_id,
    resident_id = EXCLUDED.resident_id,
    status = EXCLUDED.status,
    debt_check_status = EXCLUDED.debt_check_status,
    payment_decision = EXCLUDED.payment_decision,
    quoted_price_cents = EXCLUDED.quoted_price_cents,
    currency = EXCLUDED.currency,
    requested_for_at = EXCLUDED.requested_for_at,
    next_action = EXCLUDED.next_action,
    approved_by = COALESCE(public.service_orders.approved_by, EXCLUDED.approved_by),
    approved_at = COALESCE(public.service_orders.approved_at, EXCLUDED.approved_at),
    metadata = COALESCE(public.service_orders.metadata, '{}'::JSONB) || EXCLUDED.metadata,
    updated_at = clock_timestamp()
  RETURNING * INTO v_order;

  IF v_ticket.assigned_to IS NOT NULL THEN
    SELECT sm.id
      INTO v_staff_member_id
      FROM public.staff_members sm
     WHERE sm.company_id = v_ticket.company_id
       AND sm.profile_id = v_ticket.assigned_to
       AND sm.status IN ('active', 'training')
     LIMIT 1;
  END IF;

  IF v_task.id IS NULL THEN
    INSERT INTO public.workforce_tasks (
      company_id,
      site_id,
      service_order_id,
      ticket_id,
      unit_id,
      assigned_staff_member_id,
      task_no,
      title,
      team,
      status,
      priority,
      sla_due_at,
      checklist,
      requires_media,
      manager_approval_required,
      field_note,
      metadata
    ) VALUES (
      v_ticket.company_id,
      v_ticket.site_id,
      v_order.id,
      v_ticket.id,
      v_ticket.unit_id,
      v_staff_member_id,
      'TASK-' || upper(substr(replace(v_ticket.id::TEXT, '-', ''), 1, 12)),
      v_ticket.title,
      v_team,
      v_task_status,
      CASE WHEN v_ticket.priority = 'normal' THEN 'medium' ELSE v_ticket.priority END,
      v_ticket.sla_due_at,
      jsonb_build_array(
        'Verify scope and safety',
        'Record work performed',
        'Upload required before/after evidence',
        'Submit completion for manager review'
      ),
      TRUE,
      v_emergency_containment OR v_quoted_price_cents >= 700000,
      v_next_action,
      jsonb_build_object(
        'generationKey', 'ticket-primary-v1',
        'workflowVersion', v_ticket.workflow_version,
        'emergencyContainment', v_emergency_containment,
        'financeBlocksDispatch',
          NOT v_emergency_containment AND NOT v_finance_cleared,
        'postEmergencyFinanceReviewRequired',
          v_emergency_containment AND v_quoted_price_cents > 0
      )
    )
    RETURNING * INTO v_task;
  ELSE
    UPDATE public.workforce_tasks
       SET service_order_id = v_order.id,
           unit_id = v_ticket.unit_id,
           assigned_staff_member_id = v_staff_member_id,
           title = v_ticket.title,
           team = v_team,
           status = v_task_status,
           priority = CASE
             WHEN v_ticket.priority = 'normal' THEN 'medium'
             ELSE v_ticket.priority
           END,
           sla_due_at = v_ticket.sla_due_at,
           manager_approval_required =
             v_emergency_containment OR v_quoted_price_cents >= 700000,
           field_note = v_next_action,
           metadata = COALESCE(metadata, '{}'::JSONB) || jsonb_build_object(
             'generationKey', 'ticket-primary-v1',
             'workflowVersion', v_ticket.workflow_version,
             'emergencyContainment', v_emergency_containment,
             'financeBlocksDispatch',
               NOT v_emergency_containment AND NOT v_finance_cleared,
             'postEmergencyFinanceReviewRequired',
               v_emergency_containment AND v_quoted_price_cents > 0
           ),
           updated_at = clock_timestamp()
     WHERE id = v_task.id
     RETURNING * INTO v_task;
  END IF;

  RETURN jsonb_build_object(
    'materialized', TRUE,
    'serviceOrderId', v_order.id,
    'serviceOrderNo', v_order.order_no,
    'workforceTaskId', v_task.id,
    'workforceTaskNo', v_task.task_no
  );
END;
$$;

-- Normalize any already-materialized P0 work. A priced emergency order remains
-- executable but explicitly undecided financially until a separate human
-- manager/accountant command records the eventual ledger action.
UPDATE public.service_orders AS o
SET
  status = CASE
    WHEN t.workflow_state = 'cancelled' THEN 'cancelled'
    WHEN t.workflow_state IN ('resolved', 'closed') THEN 'completed'
    WHEN t.workflow_state IN (
      'assigned', 'acknowledged', 'in_progress', 'waiting_resident',
      'manager_review', 'rework'
    ) THEN 'assigned'
    WHEN t.workflow_state = 'accepted' THEN 'task_created'
    ELSE o.status
  END,
  debt_check_status = 'clear',
  payment_decision = CASE
    WHEN o.quoted_price_cents = 0 THEN 'no_charge'
    ELSE 'post_emergency_review'
  END,
  next_action = CASE
    WHEN t.workflow_state IN ('resolved', 'closed')
      THEN 'Include completed work in service reporting.'
    ELSE 'Continue emergency containment; complete finance review afterwards.'
  END,
  metadata = COALESCE(o.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', o.quoted_price_cents > 0
  ),
  updated_at = clock_timestamp()
FROM public.service_tickets AS t
WHERE o.ticket_id = t.id
  AND t.emergency_classification = 'rule_matched_p0';

UPDATE public.workforce_tasks AS w
SET
  status = CASE
    WHEN t.workflow_state = 'cancelled' THEN 'cancelled'
    WHEN t.workflow_state = 'closed' THEN 'closed'
    WHEN t.workflow_state IN ('manager_review', 'resolved') THEN 'resolved'
    WHEN t.workflow_state IN ('in_progress', 'waiting_resident', 'rework')
      THEN 'in_progress'
    WHEN t.workflow_state IN ('assigned', 'acknowledged') THEN 'assigned'
    ELSE 'open'
  END,
  metadata = COALESCE(w.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', TRUE
  ),
  updated_at = clock_timestamp()
FROM public.service_tickets AS t
WHERE w.ticket_id = t.id
  AND t.emergency_classification = 'rule_matched_p0';

COMMENT ON FUNCTION public.materialize_ticket_execution_internal(UUID) IS
  'Internal idempotent ticket-to-service-order-and-primary-task materializer; invoked only after authoritative ticket command authorization while the ticket row is locked.';

REVOKE ALL ON FUNCTION public.materialize_ticket_execution_internal(UUID)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.assign_service_ticket_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_assigned_profile_id UUID,
  p_assignment_label TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_request_fingerprint TEXT DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_assignee_role TEXT;
  v_assignee_company UUID;
  v_from_status TEXT;
  v_to_status TEXT;
  v_from_workflow_state TEXT;
  v_to_workflow_state TEXT;
  v_next_version INTEGER;
  v_finance_cleared BOOLEAN;
  v_emergency_containment BOOLEAN;
  v_existing_ticket_id UUID;
  v_existing_command TEXT;
  v_existing_actor_id UUID;
  v_existing_fingerprint TEXT;
  v_expected_command CONSTANT TEXT := 'assign';
  v_execution JSONB := '{}'::JSONB;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF COALESCE(p_request_fingerprint, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A SHA-256 request fingerprint is required.';
  END IF;

  IF p_assignment_label IS NOT NULL AND LENGTH(p_assignment_label) > 120 THEN
    RAISE EXCEPTION 'Assignment label may not exceed 120 characters.';
  END IF;

  IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Assignment reason may not exceed 1000 characters.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  -- Authorization must precede idempotent replay; otherwise a leaked key and
  -- fingerprint becomes a cross-scope ticket read primitive.
  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    )
  ) THEN
    RAISE EXCEPTION 'Only the scoped manager or organization/platform administrator may assign operational work.';
  END IF;

  SELECT tr.ticket_id, tr.command, tr.actor_profile_id,
         tr.metadata->>'requestFingerprint'
    INTO v_existing_ticket_id, v_existing_command, v_existing_actor_id,
         v_existing_fingerprint
  FROM public.service_ticket_transitions tr
  WHERE tr.company_id = v_ticket.company_id
    AND tr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_ticket_id IS DISTINCT FROM p_ticket_id
      OR v_existing_command IS DISTINCT FROM v_expected_command
      OR (
        NOT public.is_platform_super_admin()
        AND v_existing_actor_id IS DISTINCT FROM v_actor_id
      )
      OR v_existing_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for another ticket.';
    END IF;
    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    )
  ) THEN
    RAISE EXCEPTION 'Only the scoped manager or organization/platform administrator may assign operational work.';
  END IF;

  IF v_ticket.workflow_state IN ('manager_review', 'resolved', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'Resolved, closed or cancelled work must be reopened before assignment.';
  END IF;

  IF p_assigned_profile_id IS NULL
     AND NULLIF(BTRIM(p_assignment_label), '') IS NULL
  THEN
    RAISE EXCEPTION 'Choose a real profile or a non-empty team queue label.';
  END IF;

  IF p_assigned_profile_id IS NOT NULL THEN
    SELECT p.company_id, p.role
      INTO v_assignee_company, v_assignee_role
    FROM public.profiles p
    WHERE p.id = p_assigned_profile_id;

    IF v_assignee_company IS NULL
       OR v_assignee_company IS DISTINCT FROM v_ticket.company_id
       OR v_assignee_role NOT IN ('staff', 'manager')
    THEN
      RAISE EXCEPTION 'Assignee must be a staff or manager profile in the ticket organization.';
    END IF;

    IF v_assignee_role = 'staff' AND NOT EXISTS (
      SELECT 1
      FROM public.staff_members sm
      WHERE sm.profile_id = p_assigned_profile_id
        AND sm.company_id = v_ticket.company_id
        AND sm.status IN ('active', 'training')
    ) THEN
      RAISE EXCEPTION 'Staff assignee has no active workforce record.';
    END IF;

    IF v_assignee_role = 'manager' AND NOT EXISTS (
      SELECT 1
      FROM public.sites s
      WHERE s.id = v_ticket.site_id
        AND (
          s.manager_profile_id = p_assigned_profile_id
          OR EXISTS (
            SELECT 1
            FROM public.profile_site_assignments a
            WHERE a.site_id = s.id
              AND a.profile_id = p_assigned_profile_id
              AND a.access_role = 'manager'
              AND a.status = 'active'
              AND a.valid_from <= NOW()
              AND (a.valid_until IS NULL OR a.valid_until > NOW())
          )
        )
    ) THEN
      RAISE EXCEPTION 'Manager assignee is outside the ticket site.';
    END IF;
  END IF;

  v_from_status := v_ticket.status;
  v_from_workflow_state := v_ticket.workflow_state;
  v_to_workflow_state := v_ticket.workflow_state;
  v_finance_cleared := COALESCE(
    public.service_ticket_finance_cleared(v_ticket.id), FALSE
  );
  v_emergency_containment :=
    v_ticket.emergency_classification = 'rule_matched_p0';

  IF v_emergency_containment
     AND v_ticket.workflow_state IN ('submitted', 'triage', 'accepted')
  THEN
    v_to_workflow_state := 'assigned';
  ELSIF v_ticket.approval_status IN ('pending_owner', 'rejected') THEN
    v_to_workflow_state := v_ticket.workflow_state;
  ELSIF v_finance_cleared AND v_ticket.workflow_state = 'accepted' THEN
    v_to_workflow_state := 'assigned';
  ELSE
    -- Queue selection is preserved, but a normal ticket cannot enter dispatched
    -- workflow until it is accepted and finance clears. P0 containment is the
    -- only exception and its cost decision remains open.
    v_to_workflow_state := v_ticket.workflow_state;
  END IF;

  v_to_status := public.ticket_legacy_status_for_workflow_state(
    v_to_workflow_state
  );

  v_next_version := v_ticket.workflow_version + 1;

  UPDATE public.service_tickets
  SET
    assigned_to = p_assigned_profile_id,
    assignment_label = NULLIF(BTRIM(p_assignment_label), ''),
    routing_source = 'manual',
    workflow_state = v_to_workflow_state,
    status = v_to_status,
    approval_status = CASE
      WHEN v_emergency_containment THEN 'not_required'
      ELSE approval_status
    END,
    workflow_version = v_next_version,
    last_transition_at = NOW(),
    routing_metadata = COALESCE(routing_metadata, '{}'::JSONB) || jsonb_build_object(
      'lastAssignmentReason', NULLIF(BTRIM(p_reason), ''),
      'emergencyContainment', v_emergency_containment,
      'costDecisionPending', v_emergency_containment AND NOT v_finance_cleared
    ),
    updated_at = NOW()
  WHERE id = v_ticket.id
    AND workflow_version = p_expected_version
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket version conflict.' USING ERRCODE = '40001';
  END IF;

  v_execution := public.materialize_ticket_execution_internal(v_ticket.id);

  INSERT INTO public.service_ticket_transitions (
    company_id, ticket_id, from_status, to_status, command,
    from_workflow_state, to_workflow_state, ticket_version,
    actor_profile_id, actor_role, reason, metadata, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    v_from_status,
    v_to_status,
    'assign',
    v_from_workflow_state,
    v_to_workflow_state,
    v_next_version,
    v_actor_id,
    v_actor_role,
    NULLIF(BTRIM(p_reason), ''),
    jsonb_build_object(
      'event', 'assignment',
      'assignedProfileId', p_assigned_profile_id,
      'assignmentLabel', NULLIF(BTRIM(p_assignment_label), ''),
      'fromWorkflowState', v_from_workflow_state,
      'toWorkflowState', v_to_workflow_state,
      'emergencyContainment', v_emergency_containment,
      'costDecisionPending', v_emergency_containment AND NOT v_finance_cleared,
      'requestFingerprint', p_request_fingerprint,
      'execution', v_execution,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version
    ),
    p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    'ticket_assigned',
    CASE
      WHEN NULLIF(BTRIM(p_assignment_label), '') IS NOT NULL
        THEN 'Ticket routed to ' || BTRIM(p_assignment_label) || '.'
      ELSE 'Ticket assignment updated.'
    END,
    v_actor_id,
    jsonb_build_object(
      'assignmentLabel', NULLIF(BTRIM(p_assignment_label), ''),
      'status', v_to_status,
      'workflowState', v_to_workflow_state,
      'workflowVersion', v_next_version,
      'emergencyContainment', v_emergency_containment,
      'execution', v_execution
    ),
    'resident',
    v_next_version,
    'event:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.assigned',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'status', v_from_status,
      'workflowState', v_from_workflow_state,
      'workflowVersion', p_expected_version
    ),
    jsonb_build_object(
      'assignedProfileId', p_assigned_profile_id,
      'assignmentLabel', NULLIF(BTRIM(p_assignment_label), ''),
      'status', v_to_status,
      'workflowState', v_to_workflow_state,
      'workflowVersion', v_next_version,
      'emergencyContainment', v_emergency_containment,
      'costDecisionPending', v_emergency_containment AND NOT v_finance_cleared,
      'execution', v_execution,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version,
      'reason', NULLIF(BTRIM(p_reason), '')
    ),
    'audit:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    CASE WHEN v_emergency_containment
      THEN 'ticket.emergency_containment_assigned'
      ELSE 'ticket.assigned'
    END,
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'assignedProfileId', p_assigned_profile_id,
      'assignmentLabel', NULLIF(BTRIM(p_assignment_label), ''),
      'status', v_to_status,
      'workflowState', v_to_workflow_state,
      'workflowVersion', v_next_version,
      'emergencyContainment', v_emergency_containment,
      'costDecisionPending', v_emergency_containment AND NOT v_finance_cleared,
      'execution', v_execution,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version
    ),
    'queued',
    'ticket.assigned:' || v_ticket.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_ticket_owner_approval_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_request_fingerprint TEXT DEFAULT NULL
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_existing_ticket_id UUID;
  v_existing_command TEXT;
  v_existing_actor_id UUID;
  v_existing_fingerprint TEXT;
  v_expected_command TEXT := CASE p_decision
    WHEN 'approved' THEN 'owner_approve'
    WHEN 'rejected' THEN 'owner_reject'
    ELSE '__invalid__'
  END;
  v_to_status TEXT;
  v_next_version INTEGER;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Owner decision must be approved or rejected.';
  END IF;

  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF COALESCE(p_request_fingerprint, '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A SHA-256 request fingerprint is required.';
  END IF;

  IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Decision reason may not exceed 1000 characters.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  IF v_actor_role = 'owner'
     AND v_ticket.unit_id IS NOT NULL
     AND public.current_user_has_unit_relationship(
       v_ticket.unit_id, ARRAY['owner']::TEXT[]
     )
  THEN
    NULL;
  ELSIF public.is_platform_super_admin()
        OR (
          v_actor_role = 'admin'
          AND v_ticket.company_id = public.current_user_company_id()
        )
  THEN
    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Administrator override requires a reason.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only the exact unit owner or an audited administrator override may decide.';
  END IF;

  SELECT tr.ticket_id, tr.command, tr.actor_profile_id,
         tr.metadata->>'requestFingerprint'
    INTO v_existing_ticket_id, v_existing_command, v_existing_actor_id,
         v_existing_fingerprint
  FROM public.service_ticket_transitions tr
  WHERE tr.company_id = v_ticket.company_id
    AND tr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_ticket_id IS DISTINCT FROM p_ticket_id
      OR v_existing_command IS DISTINCT FROM v_expected_command
      OR (
        NOT public.is_platform_super_admin()
        AND v_existing_actor_id IS DISTINCT FROM v_actor_id
      )
      OR v_existing_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for another ticket.';
    END IF;
    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  IF v_ticket.approval_status <> 'pending_owner' THEN
    RAISE EXCEPTION 'Ticket is not awaiting an owner decision.';
  END IF;

  IF v_actor_role = 'owner'
     AND v_ticket.unit_id IS NOT NULL
     AND public.current_user_has_unit_relationship(
       v_ticket.unit_id, ARRAY['owner']::TEXT[]
     )
  THEN
    NULL;
  ELSIF public.is_platform_super_admin()
        OR (
          v_actor_role = 'admin'
          AND v_ticket.company_id = public.current_user_company_id()
        )
  THEN
    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Administrator override requires a reason.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only the exact unit owner or an audited administrator override may decide.';
  END IF;

  -- Approval is orthogonal to the primary lifecycle. Approval never dispatches
  -- work; rejection never silently cancels it. A rejection blocks assignment
  -- until operations revises/re-requests approval or explicitly cancels.
  v_to_status := v_ticket.status;
  v_next_version := v_ticket.workflow_version + 1;

  UPDATE public.service_tickets
  SET
    approval_status = p_decision,
    approved_by = v_actor_id,
    approved_at = NOW(),
    workflow_version = v_next_version,
    last_transition_at = NOW(),
    updated_at = NOW()
  WHERE id = v_ticket.id
    AND workflow_version = p_expected_version
    AND approval_status = 'pending_owner'
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket approval conflict.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.service_ticket_transitions (
    company_id, ticket_id, from_status, to_status, command,
    from_workflow_state, to_workflow_state, ticket_version,
    actor_profile_id, actor_role, reason, metadata, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    v_ticket.status,
    v_to_status,
    CASE p_decision WHEN 'approved' THEN 'owner_approve' ELSE 'owner_reject' END,
    v_ticket.workflow_state,
    v_ticket.workflow_state,
    v_next_version,
    v_actor_id,
    v_actor_role,
    NULLIF(BTRIM(p_reason), ''),
    jsonb_build_object(
      'event', 'owner_approval',
      'decision', p_decision,
      'requestFingerprint', p_request_fingerprint
    ),
    p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    'owner_approval_decided',
    CASE p_decision
      WHEN 'approved' THEN 'The owner approved this service request.'
      ELSE 'The owner rejected this service request.'
    END,
    v_actor_id,
    jsonb_build_object(
      'decision', p_decision,
      'status', v_to_status,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_next_version
    ),
    'resident',
    v_next_version,
    'event:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.owner_approval_decided',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'approvalStatus', 'pending_owner',
      'status', v_ticket.status,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', p_expected_version
    ),
    jsonb_build_object(
      'approvalStatus', p_decision,
      'status', v_to_status,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_next_version,
      'reason', NULLIF(BTRIM(p_reason), '')
    ),
    'audit:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    'ticket.owner_approval_decided',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'decision', p_decision,
      'status', v_to_status,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_next_version
    ),
    'queued',
    'ticket.owner_approval:' || v_ticket.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

CREATE OR REPLACE FUNCTION public.append_service_ticket_event_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_event_type TEXT,
  p_body TEXT,
  p_visibility TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_visibility TEXT := p_visibility;
  v_event_id UUID;
  v_existing_ticket_id UUID;
  v_existing_actor_id UUID;
  v_existing_fingerprint TEXT;
  v_request_fingerprint TEXT;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF NULLIF(BTRIM(p_event_type), '') IS NULL OR LENGTH(p_event_type) > 80 THEN
    RAISE EXCEPTION 'Event type must contain 1 to 80 characters.';
  END IF;

  IF NULLIF(BTRIM(p_body), '') IS NULL OR LENGTH(p_body) > 4000 THEN
    RAISE EXCEPTION 'Event body must contain 1 to 4000 characters.';
  END IF;

  IF p_visibility NOT IN ('resident', 'internal', 'finance') THEN
    RAISE EXCEPTION 'Unsupported event visibility.';
  END IF;

  IF OCTET_LENGTH(COALESCE(p_metadata, '{}'::JSONB)::TEXT) > 20000 THEN
    RAISE EXCEPTION 'Event metadata is too large.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND OR NOT public.current_user_can_view_service_ticket(p_ticket_id) THEN
    RAISE EXCEPTION 'Service ticket not found or not visible.';
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  IF public.is_platform_super_admin() THEN
    NULL;
  ELSIF v_actor_role IN ('owner', 'tenant') THEN
    v_visibility := 'resident';
    IF p_event_type NOT IN ('resident_comment', 'resident_update', 'evidence_note') THEN
      RAISE EXCEPTION 'Residents may append comments, updates or evidence notes only.';
    END IF;
  ELSIF v_actor_role = 'staff' THEN
    IF NOT public.current_user_has_staff_ticket_access(
      v_ticket.id, v_ticket.assigned_to
    ) THEN
      RAISE EXCEPTION 'Staff event access requires exact active assignment.';
    END IF;
    IF v_visibility = 'finance' THEN
      RAISE EXCEPTION 'Staff cannot create finance-visible notes.';
    END IF;
  ELSIF v_actor_role = 'accountant' THEN
    v_visibility := 'finance';
  ELSIF v_actor_role = 'manager' THEN
    IF NOT public.current_user_can_manage_site(v_ticket.site_id) THEN
      RAISE EXCEPTION 'Manager is outside the ticket site.';
    END IF;
  ELSIF v_actor_role <> 'admin' THEN
    RAISE EXCEPTION 'The current role cannot append ticket events.';
  END IF;

  -- The server binds the idempotency key to the normalized payload and actor.
  -- A caller-supplied fingerprint is deliberately ignored and cannot authorize
  -- a different body, visibility or metadata on retry.
  v_request_fingerprint := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'actorProfileId', v_actor_id,
          'ticketId', v_ticket.id,
          'expectedVersion', p_expected_version,
          'eventType', BTRIM(p_event_type),
          'body', BTRIM(p_body),
          'visibility', v_visibility,
          'metadata', COALESCE(p_metadata, '{}'::JSONB) - 'requestFingerprint'
        )::TEXT,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    BTRIM(p_event_type),
    BTRIM(p_body),
    v_actor_id,
    (COALESCE(p_metadata, '{}'::JSONB) - 'requestFingerprint') ||
      jsonb_build_object('requestFingerprint', v_request_fingerprint),
    v_visibility,
    v_ticket.workflow_version,
    p_idempotency_key
  )
  ON CONFLICT (company_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL
  DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT
      e.id,
      e.ticket_id,
      e.actor_profile_id,
      e.metadata->>'requestFingerprint'
      INTO
        v_event_id,
        v_existing_ticket_id,
        v_existing_actor_id,
        v_existing_fingerprint
    FROM public.service_ticket_events e
    WHERE e.company_id = v_ticket.company_id
      AND e.idempotency_key = p_idempotency_key;

    IF v_event_id IS NULL
       OR v_existing_ticket_id IS DISTINCT FROM v_ticket.id
       OR v_existing_actor_id IS DISTINCT FROM v_actor_id
       OR v_existing_fingerprint IS DISTINCT FROM v_request_fingerprint
    THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different ticket event payload.';
    END IF;
    RETURN v_event_id;
  END IF;

  UPDATE public.service_tickets
  SET updated_at = NOW()
  WHERE id = v_ticket.id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.event_appended',
    'service_ticket_events',
    v_event_id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'eventType', BTRIM(p_event_type),
      'visibility', v_visibility,
      'ticketVersion', v_ticket.workflow_version
    ),
    'audit:event:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    'ticket.event_appended',
    'service_ticket_events',
    v_event_id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'eventId', v_event_id,
      'eventType', BTRIM(p_event_type),
      'visibility', v_visibility,
      'ticketVersion', v_ticket.workflow_version
    ),
    'queued',
    'ticket.event:' || v_event_id::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_event_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_reservation_approval_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.reservations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_booking public.reservations%ROWTYPE;
  v_existing_reservation_id UUID;
  v_next_version INTEGER;
BEGIN
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Reservation decision must be approved or rejected.';
  END IF;

  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Reservation decision reason may not exceed 1000 characters.';
  END IF;

  SELECT * INTO v_booking
  FROM public.reservations b
  WHERE b.id = p_reservation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reservation not found.';
  END IF;

  SELECT d.reservation_id INTO v_existing_reservation_id
  FROM public.reservation_decisions d
  WHERE d.company_id = v_booking.company_id
    AND d.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_reservation_id IS DISTINCT FROM p_reservation_id THEN
      RAISE EXCEPTION 'Idempotency key was already used for another reservation.';
    END IF;
    SELECT * INTO v_booking
    FROM public.reservations b
    WHERE b.id = p_reservation_id;
    RETURN v_booking;
  END IF;

  IF p_expected_version IS DISTINCT FROM v_booking.workflow_version THEN
    RAISE EXCEPTION 'Reservation version conflict: expected %, current %.',
      p_expected_version, v_booking.workflow_version
      USING ERRCODE = '40001';
  END IF;

  IF v_booking.approval_status <> 'pending_owner' THEN
    RAISE EXCEPTION 'Reservation is not awaiting an owner decision.';
  END IF;

  IF v_actor_role = 'owner'
     AND public.current_user_has_unit_relationship(
       v_booking.unit_id, ARRAY['owner']::TEXT[]
     )
  THEN
    NULL;
  ELSIF v_actor_role = 'manager'
        AND public.current_user_can_manage_site(v_booking.site_id)
  THEN
    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Manager override requires a reason.';
    END IF;
  ELSIF public.is_platform_super_admin()
        OR (
          v_actor_role = 'admin'
          AND v_booking.company_id = public.current_user_company_id()
        )
  THEN
    IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
      RAISE EXCEPTION 'Administrator override requires a reason.';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only the exact unit owner or a reasoned operational override may decide.';
  END IF;

  v_next_version := v_booking.workflow_version + 1;

  UPDATE public.reservations
  SET
    approval_status = p_decision,
    approved_by = v_actor_id,
    approved_at = NOW(),
    access_code_status = CASE
      WHEN p_decision = 'rejected' AND access_code_status <> 'pending'
        THEN 'revoked'
      ELSE access_code_status
    END,
    workflow_version = v_next_version,
    updated_at = NOW()
  WHERE id = v_booking.id
    AND workflow_version = p_expected_version
    AND approval_status = 'pending_owner'
  RETURNING * INTO v_booking;

  IF v_booking.id IS NULL THEN
    RAISE EXCEPTION 'Reservation approval conflict.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.reservation_decisions (
    company_id, reservation_id, from_status, to_status,
    reservation_version, actor_profile_id, actor_role, reason,
    idempotency_key, metadata
  ) VALUES (
    v_booking.company_id,
    v_booking.id,
    'pending_owner',
    p_decision,
    v_next_version,
    v_actor_id,
    v_actor_role,
    NULLIF(BTRIM(p_reason), ''),
    p_idempotency_key,
    jsonb_build_object(
      'siteId', v_booking.site_id,
      'unitId', v_booking.unit_id,
      'resourceName', v_booking.resource_name
    )
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_booking.company_id,
    v_actor_id,
    'reservation.approval_decided',
    'reservations',
    v_booking.id,
    jsonb_build_object(
      'approvalStatus', 'pending_owner',
      'workflowVersion', p_expected_version
    ),
    jsonb_build_object(
      'approvalStatus', p_decision,
      'workflowVersion', v_next_version,
      'reason', NULLIF(BTRIM(p_reason), '')
    ),
    'audit:reservation:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_booking.company_id,
    'internal_event_bus',
    'reservation.approval_decided',
    'reservations',
    v_booking.id,
    jsonb_build_object(
      'reservationId', v_booking.id,
      'decision', p_decision,
      'workflowVersion', v_next_version
    ),
    'queued',
    'reservation.approval:' || v_booking.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_booking;
END;
$$;

-- ---------------------------------------------------------------------------
-- 10. Audited organization authority command.
-- ---------------------------------------------------------------------------

-- Sensitive profile fields can change only inside the authority RPC below or
-- through explicitly privileged platform/service provisioning. Benign profile
-- edits continue through the existing self-update policy and column grants.
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_company UUID := public.current_user_company_id();
  v_actor_role TEXT := public.current_user_profile_role();
  v_sensitive_change BOOLEAN;
  v_office_company UUID;
  v_command_guard BOOLEAN :=
    current_setting('app.authority_change_command', TRUE) = 'on';
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile identity is immutable.';
  END IF;

  v_sensitive_change :=
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.office_id IS DISTINCT FROM OLD.office_id;

  IF NOT v_sensitive_change THEN
    RETURN NEW;
  END IF;

  IF NEW.office_id IS NOT NULL THEN
    SELECT o.company_id INTO v_office_company
    FROM public.offices o
    WHERE o.id = NEW.office_id;

    IF v_office_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_office_company
    THEN
      RAISE EXCEPTION 'Profile office must belong to the profile company.';
    END IF;
  END IF;

  IF public.is_platform_super_admin() THEN
    -- Platform/service provisioning is the only direct authority mutation.
    -- Organization administrators must use the reasoned/idempotent RPC.
    IF NOT v_command_guard THEN
      INSERT INTO public.audit_events (
        company_id, actor_profile_id, action, entity_table, entity_id,
        before_data, after_data
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        v_actor_id,
        'profile.platform_authority_provisioned',
        'profiles',
        NEW.id,
        jsonb_build_object(
          'role', OLD.role,
          'companyId', OLD.company_id,
          'officeId', OLD.office_id
        ),
        jsonb_build_object(
          'role', NEW.role,
          'companyId', NEW.company_id,
          'officeId', NEW.office_id,
          'reason', 'platform/service provisioning'
        )
      );
    END IF;
  ELSIF v_command_guard
        AND v_actor_role = 'admin'
        AND v_actor_company IS NOT NULL
        AND OLD.company_id = v_actor_company
        AND NEW.company_id = v_actor_company
        AND NEW.id IS DISTINCT FROM v_actor_id
  THEN
    NULL;
  ELSE
    RAISE EXCEPTION
      'Sensitive profile authority changes require admin_set_company_member_authority.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_company_member_authority(
  p_profile_id UUID,
  p_expected_updated_at TIMESTAMPTZ,
  p_role TEXT,
  p_office_id UUID,
  p_site_ids UUID[],
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_actor_company UUID := public.current_user_company_id();
  v_target public.profiles%ROWTYPE;
  v_result public.profiles%ROWTYPE;
  v_existing_entity UUID;
  v_existing_after_data JSONB;
  v_old_site_ids JSONB;
  v_new_site_ids JSONB;
  v_requested_site_ids JSONB;
  v_site_count INTEGER;
  v_valid_site_count INTEGER;
BEGIN
  IF p_profile_id = v_actor_id THEN
    RAISE EXCEPTION 'Administrators cannot change their own authority.';
  END IF;

  IF p_role NOT IN ('admin', 'manager', 'accountant', 'staff', 'owner', 'tenant') THEN
    RAISE EXCEPTION 'Unsupported business role: %', p_role;
  END IF;

  IF NULLIF(BTRIM(p_reason), '') IS NULL OR LENGTH(BTRIM(p_reason)) < 10
     OR LENGTH(p_reason) > 1000
  THEN
    RAISE EXCEPTION 'Authority changes require a reason of 10 to 1000 characters.';
  END IF;

  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM UNNEST(COALESCE(p_site_ids, ARRAY[]::UUID[])) AS requested(site_id)
    WHERE requested.site_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Site assignments may not contain null identifiers.';
  END IF;

  -- Canonicalize the requested set before the replay check. This binds an
  -- idempotency key to the semantic payload even when callers reorder or
  -- duplicate otherwise identical site identifiers.
  SELECT COALESCE(jsonb_agg(requested.site_id ORDER BY requested.site_id), '[]'::JSONB)
    INTO v_requested_site_ids
  FROM (
    SELECT DISTINCT site_id
    FROM UNNEST(COALESCE(p_site_ids, ARRAY[]::UUID[])) AS sites(site_id)
  ) requested;

  SELECT * INTO v_target
  FROM public.profiles p
  WHERE p.id = p_profile_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target profile not found.';
  END IF;

  IF NOT public.is_platform_super_admin() THEN
    IF v_actor_role <> 'admin'
       OR v_actor_company IS NULL
       OR v_target.company_id IS DISTINCT FROM v_actor_company
    THEN
      RAISE EXCEPTION 'Organization administrators may manage their own company only.';
    END IF;
  END IF;

  IF (v_target.role = 'admin' OR p_role = 'admin')
     AND NOT public.is_platform_super_admin()
  THEN
    RAISE EXCEPTION 'Entering or leaving the organization-admin tier requires platform provisioning or a future two-person approval workflow.';
  END IF;

  SELECT a.entity_id, a.after_data
    INTO v_existing_entity, v_existing_after_data
  FROM public.audit_events a
  WHERE a.company_id = v_target.company_id
    AND a.idempotency_key = 'audit:authority:' || p_idempotency_key;

  IF FOUND THEN
    IF v_existing_entity IS DISTINCT FROM p_profile_id
       OR v_existing_after_data->'role' IS DISTINCT FROM to_jsonb(p_role)
       OR v_existing_after_data->'officeId' IS DISTINCT FROM
         (jsonb_build_object('officeId', p_office_id)->'officeId')
       OR v_existing_after_data->'siteIds' IS DISTINCT FROM v_requested_site_ids
    THEN
      RAISE EXCEPTION
        'Idempotency key was already used with a different authority payload.';
    END IF;
    RETURN v_target;
  END IF;

  IF p_expected_updated_at IS DISTINCT FROM v_target.updated_at THEN
    RAISE EXCEPTION 'Profile version conflict: expected %, current %.',
      p_expected_updated_at, v_target.updated_at
      USING ERRCODE = '40001';
  END IF;

  IF p_office_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.offices o
    WHERE o.id = p_office_id
      AND o.company_id = v_target.company_id
      AND o.status <> 'archived'
  ) THEN
    RAISE EXCEPTION 'Office is outside the target organization or archived.';
  END IF;

  SELECT COUNT(DISTINCT site_id)
    INTO v_site_count
  FROM UNNEST(COALESCE(p_site_ids, ARRAY[]::UUID[])) AS requested(site_id);

  SELECT COUNT(*) INTO v_valid_site_count
  FROM public.sites s
  WHERE s.id = ANY (COALESCE(p_site_ids, ARRAY[]::UUID[]))
    AND s.company_id = v_target.company_id
    AND s.status <> 'archived';

  IF v_valid_site_count <> v_site_count THEN
    RAISE EXCEPTION 'One or more site assignments are outside the target organization or archived.';
  END IF;

  IF p_role NOT IN ('manager', 'staff') AND v_site_count > 0 THEN
    RAISE EXCEPTION 'Only manager and staff roles receive explicit site assignments.';
  END IF;

  IF v_target.role = 'admin'
     AND p_role <> 'admin'
     AND NOT EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.company_id = v_target.company_id
         AND p.role = 'admin'
         AND p.id <> v_target.id
     )
  THEN
    RAISE EXCEPTION 'The final organization administrator cannot be demoted.';
  END IF;

  SELECT COALESCE(jsonb_agg(a.site_id ORDER BY a.site_id), '[]'::JSONB)
    INTO v_old_site_ids
  FROM public.profile_site_assignments a
  WHERE a.profile_id = v_target.id
    AND a.company_id = v_target.company_id
    AND a.status = 'active';

  PERFORM set_config('app.authority_change_command', 'on', TRUE);

  UPDATE public.profiles
  SET
    role = p_role,
    office_id = p_office_id,
    updated_at = NOW()
  WHERE id = v_target.id
    AND updated_at = p_expected_updated_at
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Profile version conflict.' USING ERRCODE = '40001';
  END IF;

  UPDATE public.profile_site_assignments
  SET
    status = 'revoked',
    valid_until = COALESCE(valid_until, NOW()),
    updated_at = NOW()
  WHERE profile_id = v_target.id
    AND company_id = v_target.company_id
    AND status = 'active'
    AND (
      p_role NOT IN ('manager', 'staff')
      OR NOT (site_id = ANY (COALESCE(p_site_ids, ARRAY[]::UUID[])))
    );

  IF p_role IN ('manager', 'staff') THEN
    INSERT INTO public.profile_site_assignments (
      company_id, site_id, profile_id, access_role, status,
      valid_from, valid_until, granted_by
    )
    SELECT
      v_target.company_id,
      requested.site_id,
      v_target.id,
      CASE p_role WHEN 'manager' THEN 'manager' ELSE 'operator' END,
      'active',
      NOW(),
      NULL,
      v_actor_id
    FROM (
      SELECT DISTINCT site_id
      FROM UNNEST(COALESCE(p_site_ids, ARRAY[]::UUID[])) AS sites(site_id)
    ) requested
    ON CONFLICT (company_id, site_id, profile_id) DO UPDATE
    SET
      access_role = EXCLUDED.access_role,
      status = 'active',
      valid_from = NOW(),
      valid_until = NULL,
      granted_by = EXCLUDED.granted_by,
      updated_at = NOW();
  END IF;

  SELECT COALESCE(jsonb_agg(a.site_id ORDER BY a.site_id), '[]'::JSONB)
    INTO v_new_site_ids
  FROM public.profile_site_assignments a
  WHERE a.profile_id = v_target.id
    AND a.company_id = v_target.company_id
    AND a.status = 'active';

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_target.company_id,
    v_actor_id,
    'profile.authority_changed',
    'profiles',
    v_target.id,
    jsonb_build_object(
      'role', v_target.role,
      'officeId', v_target.office_id,
      'siteIds', v_old_site_ids,
      'updatedAt', v_target.updated_at
    ),
    jsonb_build_object(
      'role', v_result.role,
      'officeId', v_result.office_id,
      'siteIds', v_new_site_ids,
      'updatedAt', v_result.updated_at,
      'reason', BTRIM(p_reason)
    ),
    'audit:authority:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_target.company_id,
    'internal_event_bus',
    'profile.authority_changed',
    'profiles',
    v_target.id,
    jsonb_build_object(
      'profileId', v_target.id,
      'role', v_result.role,
      'siteIds', v_new_site_ids,
      'changedBy', v_actor_id
    ),
    'queued',
    'profile.authority:' || p_idempotency_key
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.assign_service_ticket_command(
  UUID, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT
) IS
  'Atomically assigns a real staff/manager profile or a NULL-profile team queue. A queue label is never represented as a fake person. P0 assignment is containment-only and preserves pending cost evidence.';

COMMENT ON FUNCTION public.decide_ticket_owner_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT
) IS
  'Exactly-once owner approval/rejection for the owner-linked unit; administrator overrides require a reason.';

COMMENT ON FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) IS
  'Idempotently appends a visibility-scoped ticket event without mutating prior history.';

COMMENT ON FUNCTION public.decide_reservation_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT
) IS
  'Exactly-once owner reservation decision with scoped, reasoned manager/admin override.';

COMMENT ON FUNCTION public.admin_set_company_member_authority(
  UUID, TIMESTAMPTZ, TEXT, UUID, UUID[], TEXT, TEXT
) IS
  'CAS- and idempotency-protected organization role/office/site assignment command. Self-change and platform-scope grants are prohibited; every change is audited.';

-- Keep the CAS timestamp authoritative even for benign self-service updates.
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Platform administrators inspect platform registry"
  ON public.platform_administrators
  FOR SELECT TO authenticated
  USING ((SELECT public.is_platform_super_admin()));

-- ---------------------------------------------------------------------------
-- 11. Least-privilege table and function grants.
-- ---------------------------------------------------------------------------

-- A platform authority grant/revocation is an infrastructure provisioning
-- operation performed by service_role; authenticated application users only
-- receive platform-super-admin read visibility after they are provisioned.
REVOKE ALL ON TABLE public.platform_administrators FROM anon, authenticated;
GRANT SELECT ON TABLE public.platform_administrators TO authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE
  public.resident_profile_links,
  public.profile_site_assignments,
  public.units,
  public.residents,
  public.unit_residents,
  public.staff_members
TO authenticated;

GRANT SELECT ON TABLE public.service_orders, public.workforce_tasks
  TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.service_orders,
  public.workforce_tasks
FROM anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.media_reports TO authenticated;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.service_tickets
  FROM anon, authenticated;
GRANT SELECT (
  id,
  company_id,
  site_id,
  ticket_no,
  title,
  category,
  priority,
  status,
  sla_due_at,
  unit_id,
  assignment_label,
  workflow_state,
  workflow_version,
  approval_status,
  emergency_classification,
  created_at,
  updated_at
) ON TABLE public.service_tickets TO authenticated;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.service_ticket_events,
  public.service_ticket_transitions
FROM anon, authenticated;
GRANT SELECT (
  id,
  ticket_id,
  event_type,
  body,
  visibility,
  ticket_version,
  created_at
) ON TABLE public.service_ticket_events TO authenticated;
GRANT SELECT ON TABLE public.service_ticket_transitions TO authenticated;

REVOKE UPDATE, DELETE ON TABLE public.reservations FROM anon, authenticated;
GRANT SELECT, INSERT ON TABLE public.reservations TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.reservation_decisions
  FROM anon, authenticated;
GRANT SELECT ON TABLE public.reservation_decisions TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.audit_events,
  public.integration_outbox
FROM anon, authenticated;
GRANT SELECT ON TABLE public.audit_events, public.integration_outbox
  TO authenticated;

-- Users retain benign self-service fields. Role/company/office authority has no
-- direct authenticated column privilege and is changed only by the command RPC.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT UPDATE (full_name, phone, language, avatar_url)
  ON TABLE public.profiles TO authenticated;

-- Trigger/integrity internals are never callable from the API.
REVOKE ALL ON FUNCTION public.enforce_resident_profile_link_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_profile_site_assignment_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_unit_resident_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_service_ticket_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_reservation_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_append_only_mutation()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.profile_has_unit_relationship(UUID, UUID, TEXT[])
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_ticket_finance_cleared(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.redact_service_ticket_for_current_user(
  public.service_tickets
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.read_service_ticket_queue_safe(
  INTEGER, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_service_ticket_queue_safe(
  INTEGER, TEXT, TEXT
) TO authenticated;

-- Context helpers expose only the current caller's effective scope and are
-- required by RLS evaluation.
REVOKE ALL ON FUNCTION public.is_platform_super_admin()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_super_admin()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_is_organization_admin(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_unit_relationship(UUID, TEXT[])
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_linked_resident_id()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_is_linked_resident(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_manage_site(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_view_site(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_view_unit(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_view_resident(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_staff_ticket_access(UUID, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_is_assigned_to_ticket(UUID, UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_has_finance_ticket_access(UUID, BOOLEAN)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_view_service_ticket(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.current_user_can_view_reservation(UUID)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.is_platform_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_organization_admin(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_unit_relationship(UUID, TEXT[])
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_linked_resident_id()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_linked_resident(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_site(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_site(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_unit(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_resident(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_staff_ticket_access(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_assigned_to_ticket(UUID, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_has_finance_ticket_access(UUID, BOOLEAN)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_service_ticket(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_reservation(UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.transition_service_ticket_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.assign_service_ticket_command(
  UUID, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_ticket_owner_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.decide_reservation_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_company_member_authority(
  UUID, TIMESTAMPTZ, TEXT, UUID, UUID[], TEXT, TEXT
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_service_ticket_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_service_ticket_command(
  UUID, INTEGER, UUID, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_ticket_owner_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_reservation_approval_command(
  UUID, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_company_member_authority(
  UUID, TIMESTAMPTZ, TEXT, UUID, UUID[], TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. Canonical command/state workflow authority.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.execute_service_ticket_workflow_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_command TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_existing_ticket_id UUID;
  v_existing_command TEXT;
  v_existing_actor_id UUID;
  v_existing_fingerprint TEXT;
  v_from_state TEXT;
  v_to_state TEXT;
  v_from_status TEXT;
  v_to_status TEXT;
  v_next_version INTEGER;
  v_is_operational_manager BOOLEAN := FALSE;
  v_is_assigned_staff BOOLEAN := FALSE;
  v_is_requester BOOLEAN := FALSE;
  v_new_approval_status TEXT;
  v_old_approval_status TEXT;
  v_new_approved_by UUID;
  v_new_approved_at TIMESTAMPTZ;
  v_estimated_cost_cents BIGINT;
  v_emergency_containment BOOLEAN := FALSE;
  v_execution JSONB := '{}'::JSONB;
BEGIN
  IF NULLIF(BTRIM(p_command), '') IS NULL OR LENGTH(p_command) > 80 THEN
    RAISE EXCEPTION 'A supported workflow command is required.';
  END IF;

  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF p_reason IS NOT NULL AND LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Command reason may not exceed 1000 characters.';
  END IF;

  IF OCTET_LENGTH(COALESCE(p_metadata, '{}'::JSONB)::TEXT) > 20000 THEN
    RAISE EXCEPTION 'Command metadata is too large.';
  END IF;

  IF COALESCE(p_metadata->>'requestFingerprint', '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A SHA-256 request fingerprint is required.';
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  v_is_operational_manager :=
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    );

  v_is_assigned_staff :=
    v_actor_role = 'staff'
    AND public.current_user_is_assigned_to_ticket(
      v_ticket.id, v_ticket.assigned_to
    );

  v_is_requester :=
    v_actor_role IN ('owner', 'tenant')
    AND v_ticket.created_by = v_actor_id
    AND v_ticket.unit_id IS NOT NULL
    AND public.current_user_has_unit_relationship(
      v_ticket.unit_id,
      CASE v_actor_role
        WHEN 'owner' THEN ARRAY['owner']::TEXT[]
        ELSE ARRAY['tenant']::TEXT[]
      END
    );

  IF NOT (
    v_is_operational_manager OR v_is_assigned_staff OR v_is_requester
  ) THEN
    RAISE EXCEPTION 'The current role cannot execute or replay workflow commands for this ticket.';
  END IF;

  SELECT tr.ticket_id, tr.command, tr.actor_profile_id,
         tr.metadata->>'requestFingerprint'
    INTO v_existing_ticket_id, v_existing_command, v_existing_actor_id,
         v_existing_fingerprint
  FROM public.service_ticket_transitions tr
  WHERE tr.company_id = v_ticket.company_id
    AND tr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_ticket_id IS DISTINCT FROM p_ticket_id
       OR v_existing_command IS DISTINCT FROM p_command
       OR (
         NOT public.is_platform_super_admin()
         AND v_existing_actor_id IS DISTINCT FROM v_actor_id
       )
       OR v_existing_fingerprint IS DISTINCT FROM p_metadata->>'requestFingerprint'
    THEN
      RAISE EXCEPTION 'Idempotency key was already used for another workflow command.';
    END IF;

    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  v_from_state := v_ticket.workflow_state;
  v_to_state := v_ticket.workflow_state;
  v_from_status := v_ticket.status;
  v_new_approval_status := v_ticket.approval_status;
  v_old_approval_status := v_ticket.approval_status;
  v_new_approved_by := v_ticket.approved_by;
  v_new_approved_at := v_ticket.approved_at;
  v_estimated_cost_cents := v_ticket.estimated_cost_cents;

  v_is_operational_manager :=
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    );

  v_is_assigned_staff :=
    v_actor_role = 'staff'
    AND public.current_user_is_assigned_to_ticket(
      v_ticket.id, v_ticket.assigned_to
    );

  v_is_requester :=
    v_actor_role IN ('owner', 'tenant')
    AND v_ticket.created_by = v_actor_id
    AND v_ticket.unit_id IS NOT NULL
    AND public.current_user_has_unit_relationship(
      v_ticket.unit_id,
      CASE v_actor_role
        WHEN 'owner' THEN ARRAY['owner']::TEXT[]
        ELSE ARRAY['tenant']::TEXT[]
      END
    );

  CASE p_command
    WHEN 'start_triage' THEN
      IF NOT v_is_operational_manager OR v_from_state <> 'submitted' THEN
        RAISE EXCEPTION 'start_triage requires scoped operations and submitted state.';
      END IF;
      v_to_state := 'triage';

    WHEN 'accept' THEN
      IF NOT v_is_operational_manager OR v_from_state <> 'triage' THEN
        RAISE EXCEPTION 'accept requires scoped operations and triage state.';
      END IF;
      v_to_state := 'accepted';

    WHEN 'request_owner_approval' THEN
      IF NOT v_is_operational_manager
         OR v_from_state NOT IN ('triage', 'accepted')
      THEN
        RAISE EXCEPTION 'Owner approval may be requested only during triage/acceptance by scoped operations.';
      END IF;

      IF v_ticket.emergency_classification = 'rule_matched_p0' THEN
        RAISE EXCEPTION 'P0 containment must never wait for owner approval.';
      END IF;

      IF v_ticket.unit_id IS NULL THEN
        RAISE EXCEPTION 'Owner approval requires a unit-linked ticket.';
      END IF;

      IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Owner approval request requires a reason.';
      END IF;

      IF COALESCE(p_metadata->>'responsibility', '') NOT IN ('owner', 'shared')
         OR COALESCE(p_metadata->>'policyCode', '') NOT IN (
        'resident_cost_approval_v1'
         )
         OR COALESCE(p_metadata->>'estimatedCostCents', '') !~ '^[0-9]+$'
      THEN
        RAISE EXCEPTION 'Owner approval requires owner/shared responsibility, policyCode and non-negative estimatedCostCents.';
      END IF;

      IF p_metadata ? 'approvalThresholdCents'
         AND COALESCE(p_metadata->>'approvalThresholdCents', '') !~ '^[0-9]+$'
      THEN
        RAISE EXCEPTION 'approvalThresholdCents must be a non-negative integer.';
      END IF;

      v_estimated_cost_cents := (p_metadata->>'estimatedCostCents')::BIGINT;

    IF p_metadata->>'policyCode' = 'resident_cost_approval_v1' THEN
        IF NOT (p_metadata ? 'approvalThresholdCents')
           OR COALESCE(p_metadata->>'approvalThresholdCents', '') !~ '^[0-9]+$'
        OR v_estimated_cost_cents < (p_metadata->>'approvalThresholdCents')::BIGINT
        THEN
          RAISE EXCEPTION 'resident_cost_approval_v1 requires estimated cost at or above a non-negative approval threshold.';
        END IF;
      END IF;

      v_new_approval_status := 'pending_owner';
      v_new_approved_by := NULL;
      v_new_approved_at := NULL;
      -- Approval is orthogonal: the primary workflow remains triage/accepted.
      v_to_state := v_from_state;

    WHEN 'acknowledge' THEN
      IF NOT (v_is_assigned_staff OR v_is_operational_manager)
         OR v_from_state <> 'assigned'
      THEN
        RAISE EXCEPTION 'acknowledge requires assigned work and its assignee/operations.';
      END IF;
      v_to_state := 'acknowledged';

    WHEN 'start_work' THEN
      IF NOT (v_is_assigned_staff OR v_is_operational_manager)
         OR v_from_state NOT IN ('assigned', 'acknowledged')
      THEN
        RAISE EXCEPTION 'start_work requires assigned/acknowledged work and its assignee/operations.';
      END IF;

      IF v_ticket.approval_status IN ('pending_owner', 'rejected') THEN
        RAISE EXCEPTION 'Owner approval blocks normal dispatch until approved or re-requested.';
      END IF;

      v_emergency_containment :=
        v_ticket.emergency_classification = 'rule_matched_p0'
        AND COALESCE(p_metadata->>'transitionPurpose', '') = 'emergency_containment';

      IF NOT COALESCE(public.service_ticket_finance_cleared(v_ticket.id), FALSE)
         AND NOT v_emergency_containment
      THEN
        RAISE EXCEPTION 'Finance/payment clearance is required before normal work starts.';
      END IF;

      v_to_state := 'in_progress';

    WHEN 'wait_resident' THEN
      IF NOT (v_is_assigned_staff OR v_is_operational_manager)
         OR v_from_state <> 'in_progress'
         OR NULLIF(BTRIM(p_reason), '') IS NULL
      THEN
        RAISE EXCEPTION 'wait_resident requires in-progress work, authorized operations and a reason.';
      END IF;
      v_to_state := 'waiting_resident';

    WHEN 'resume_work' THEN
      IF NOT (v_is_assigned_staff OR v_is_operational_manager)
         OR v_from_state NOT IN ('waiting_resident', 'rework')
      THEN
        RAISE EXCEPTION 'resume_work requires waiting-resident/rework state and authorized operations.';
      END IF;
      v_to_state := 'in_progress';

    WHEN 'submit_for_review' THEN
      IF NOT (v_is_assigned_staff OR v_is_operational_manager)
         OR v_from_state <> 'in_progress'
      THEN
        RAISE EXCEPTION 'submit_for_review requires in-progress assigned work.';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.workforce_tasks w
        WHERE w.ticket_id = v_ticket.id
          AND w.requires_media = TRUE
      ) AND NOT EXISTS (
        SELECT 1
        FROM public.media_reports m
        WHERE m.ticket_id = v_ticket.id
          AND (m.storage_path IS NOT NULL OR m.media_type = 'note')
      ) THEN
        RAISE EXCEPTION 'Required completion evidence must be uploaded before manager review.';
      END IF;

      v_to_state := 'manager_review';

    WHEN 'request_rework' THEN
      IF NOT v_is_operational_manager
         OR v_from_state NOT IN ('manager_review', 'resolved')
         OR NULLIF(BTRIM(p_reason), '') IS NULL
      THEN
        RAISE EXCEPTION 'request_rework requires manager review and a reason.';
      END IF;
      v_to_state := 'rework';

    WHEN 'resolve' THEN
      IF NOT v_is_operational_manager OR v_from_state <> 'manager_review' THEN
        RAISE EXCEPTION 'resolve requires scoped operations and manager-review state.';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM public.workforce_tasks w
        WHERE w.ticket_id = v_ticket.id
          AND w.requires_media = TRUE
      ) AND NOT EXISTS (
        SELECT 1
        FROM public.media_reports m
        WHERE m.ticket_id = v_ticket.id
          AND m.verification_status = 'accepted'
      ) THEN
        RAISE EXCEPTION 'Accepted completion evidence is required before resolution.';
      END IF;

      v_to_state := 'resolved';

    WHEN 'close' THEN
      IF NOT v_is_operational_manager OR v_from_state <> 'resolved' THEN
        RAISE EXCEPTION 'close requires scoped operations and resolved state.';
      END IF;
      v_to_state := 'closed';

    WHEN 'cancel' THEN
      IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Cancellation requires a reason.';
      END IF;

      IF v_is_operational_manager THEN
        IF v_from_state IN ('closed', 'cancelled') THEN
          RAISE EXCEPTION 'Closed/cancelled tickets cannot be cancelled again.';
        END IF;
      ELSIF v_is_requester THEN
        IF v_from_state NOT IN ('submitted', 'triage', 'accepted') THEN
          RAISE EXCEPTION 'Requesters may cancel only before operational assignment.';
        END IF;
      ELSE
        RAISE EXCEPTION 'The current user cannot cancel this ticket.';
      END IF;

      v_to_state := 'cancelled';

    WHEN 'reopen' THEN
      IF NULLIF(BTRIM(p_reason), '') IS NULL THEN
        RAISE EXCEPTION 'Reopening requires a reason.';
      END IF;

      IF v_from_state NOT IN ('resolved', 'closed', 'cancelled') THEN
        RAISE EXCEPTION 'Only resolved, closed or cancelled tickets can be reopened.';
      END IF;

      IF NOT (v_is_operational_manager OR v_is_requester) THEN
        RAISE EXCEPTION 'The current user cannot reopen this ticket.';
      END IF;

      v_to_state := CASE v_from_state
        WHEN 'resolved' THEN 'rework'
        WHEN 'closed' THEN 'triage'
        WHEN 'cancelled' THEN 'submitted'
      END;

    ELSE
      RAISE EXCEPTION 'Unsupported workflow command: %', p_command;
  END CASE;

  v_to_status := public.ticket_legacy_status_for_workflow_state(v_to_state);
  IF v_to_status IS NULL THEN
    RAISE EXCEPTION 'Workflow state has no legacy status projection: %', v_to_state;
  END IF;

  v_next_version := v_ticket.workflow_version + 1;

  UPDATE public.service_tickets
  SET
    workflow_state = v_to_state,
    status = v_to_status,
    approval_status = v_new_approval_status,
    approved_by = v_new_approved_by,
    approved_at = v_new_approved_at,
    estimated_cost_cents = v_estimated_cost_cents,
    workflow_version = v_next_version,
    last_transition_at = NOW(),
    closed_at = CASE
      WHEN v_to_state = 'closed' THEN NOW()
      WHEN v_to_state IN (
        'submitted', 'triage', 'accepted', 'assigned', 'acknowledged',
        'in_progress', 'waiting_resident', 'manager_review', 'rework'
      ) THEN NULL
      ELSE closed_at
    END,
    routing_metadata = COALESCE(routing_metadata, '{}'::JSONB) ||
      CASE WHEN p_command = 'request_owner_approval' THEN jsonb_build_object(
        'ownerApprovalPolicyCode', p_metadata->>'policyCode',
        'ownerApprovalResponsibility', p_metadata->>'responsibility',
        'ownerApprovalThresholdCents', p_metadata->>'approvalThresholdCents',
        'ownerApprovalRequestedAt', NOW()
      ) ELSE '{}'::JSONB END,
    updated_at = NOW()
  WHERE id = v_ticket.id
    AND workflow_version = p_expected_version
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket version conflict.' USING ERRCODE = '40001';
  END IF;

  v_execution := public.materialize_ticket_execution_internal(v_ticket.id);

  INSERT INTO public.service_ticket_transitions (
    company_id, ticket_id, from_status, to_status, command,
    from_workflow_state, to_workflow_state, ticket_version,
    actor_profile_id, actor_role, reason, metadata, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    v_from_status,
    v_to_status,
    p_command,
    v_from_state,
    v_to_state,
    v_next_version,
    v_actor_id,
    v_actor_role,
    NULLIF(BTRIM(p_reason), ''),
    COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
      'emergencyClassification', v_ticket.emergency_classification,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version,
      'emergencyContainment', v_emergency_containment,
      'execution', v_execution
    ),
    p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    'workflow_command',
    CASE p_command
      WHEN 'request_owner_approval' THEN 'Owner approval requested after review.'
      WHEN 'cancel' THEN 'Service request cancelled.'
      WHEN 'reopen' THEN 'Service request reopened.'
      ELSE 'Service request workflow updated.'
    END,
    v_actor_id,
    jsonb_build_object(
      'command', p_command,
      'fromWorkflowState', v_from_state,
      'toWorkflowState', v_to_state,
      'legacyStatus', v_to_status,
      'approvalStatus', v_new_approval_status,
      'workflowVersion', v_next_version,
      'execution', v_execution
    ),
    'resident',
    v_next_version,
    'event:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.workflow_command',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'workflowState', v_from_state,
      'status', v_from_status,
      'approvalStatus', v_old_approval_status,
      'workflowVersion', p_expected_version
    ),
    jsonb_build_object(
      'command', p_command,
      'workflowState', v_to_state,
      'status', v_to_status,
      'approvalStatus', v_new_approval_status,
      'estimatedCostCents', v_estimated_cost_cents,
      'workflowVersion', v_next_version,
      'reason', NULLIF(BTRIM(p_reason), ''),
      'emergencyClassification', v_ticket.emergency_classification,
      'emergencyPolicyCode', v_ticket.emergency_policy_code,
      'emergencyPolicyVersion', v_ticket.emergency_policy_version,
      'emergencyContainment', v_emergency_containment,
      'execution', v_execution
    ),
    'audit:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    'ticket.workflow_command',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'command', p_command,
      'workflowState', v_to_state,
      'legacyStatus', v_to_status,
      'approvalStatus', v_new_approval_status,
      'workflowVersion', v_next_version,
      'emergencyContainment', v_emergency_containment,
      'execution', v_execution
    ),
    'queued',
    'ticket.workflow:' || v_ticket.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

COMMENT ON FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) IS
  'Authoritative command/state lifecycle with legacy-status projection, exact role checks, requester cancel/reopen, orthogonal owner approval, evidence gates and P0 containment rules.';

REVOKE ALL ON FUNCTION public.transition_service_ticket_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) FROM authenticated;
REVOKE ALL ON FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_service_ticket_details_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_clear_description BOOLEAN DEFAULT FALSE,
  p_category TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_ticket public.service_tickets%ROWTYPE;
  v_existing_ticket_id UUID;
  v_existing_command TEXT;
  v_existing_actor_id UUID;
  v_existing_fingerprint TEXT;
  v_expected_command CONSTANT TEXT := 'update_details';
  v_is_operational_manager BOOLEAN;
  v_is_requester BOOLEAN;
  v_next_version INTEGER;
  v_new_title TEXT;
  v_new_description TEXT;
  v_new_category TEXT;
  v_new_priority TEXT;
  v_changed_fields JSONB := '[]'::JSONB;
  v_before_data JSONB;
BEGIN
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'A non-empty idempotency key of at most 200 characters is required.';
  END IF;

  IF NULLIF(BTRIM(p_reason), '') IS NULL OR LENGTH(p_reason) > 1000 THEN
    RAISE EXCEPTION 'Ticket detail edits require a reason of at most 1000 characters.';
  END IF;

  IF OCTET_LENGTH(COALESCE(p_metadata, '{}'::JSONB)::TEXT) > 20000 THEN
    RAISE EXCEPTION 'Edit metadata is too large.';
  END IF;

  IF COALESCE(p_metadata->>'requestFingerprint', '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A SHA-256 request fingerprint is required.';
  END IF;

  IF p_title IS NULL
     AND p_description IS NULL
     AND NOT p_clear_description
     AND p_category IS NULL
     AND p_priority IS NULL
  THEN
    RAISE EXCEPTION 'No ticket detail change was requested.';
  END IF;

  IF p_title IS NOT NULL
     AND (NULLIF(BTRIM(p_title), '') IS NULL OR LENGTH(p_title) > 160)
  THEN
    RAISE EXCEPTION 'Ticket title must contain 1 to 160 characters.';
  END IF;

  IF p_description IS NOT NULL AND LENGTH(p_description) > 4000 THEN
    RAISE EXCEPTION 'Ticket description may not exceed 4000 characters.';
  END IF;

  IF p_category IS NOT NULL
     AND (NULLIF(BTRIM(p_category), '') IS NULL OR LENGTH(p_category) > 100)
  THEN
    RAISE EXCEPTION 'Ticket category must contain 1 to 100 characters.';
  END IF;

  IF p_priority IS NOT NULL
     AND p_priority NOT IN ('low', 'normal', 'high', 'urgent')
  THEN
    RAISE EXCEPTION 'Unsupported ticket priority: %', p_priority;
  END IF;

  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Service ticket not found.';
  END IF;

  v_is_operational_manager :=
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    );

  v_is_requester :=
    v_actor_role IN ('owner', 'tenant')
    AND v_ticket.created_by = v_actor_id
    AND v_ticket.workflow_state = 'submitted'
    AND v_ticket.unit_id IS NOT NULL
    AND public.current_user_has_unit_relationship(
      v_ticket.unit_id,
      CASE v_actor_role
        WHEN 'owner' THEN ARRAY['owner']::TEXT[]
        ELSE ARRAY['tenant']::TEXT[]
      END
    );

  IF NOT (v_is_operational_manager OR v_is_requester) THEN
    RAISE EXCEPTION 'Only the submitted-ticket requester or scoped operations may edit or replay details.';
  END IF;

  SELECT tr.ticket_id, tr.command, tr.actor_profile_id,
         tr.metadata->>'requestFingerprint'
    INTO v_existing_ticket_id, v_existing_command, v_existing_actor_id,
         v_existing_fingerprint
  FROM public.service_ticket_transitions tr
  WHERE tr.company_id = v_ticket.company_id
    AND tr.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_ticket_id IS DISTINCT FROM p_ticket_id
      OR v_existing_command IS DISTINCT FROM v_expected_command
      OR (
        NOT public.is_platform_super_admin()
        AND v_existing_actor_id IS DISTINCT FROM v_actor_id
      )
      OR v_existing_fingerprint IS DISTINCT FROM p_metadata->>'requestFingerprint' THEN
      RAISE EXCEPTION 'Idempotency key was already used for another ticket edit.';
    END IF;
    SELECT * INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = p_ticket_id;
    RETURN public.redact_service_ticket_for_current_user(v_ticket);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_ticket.workflow_version THEN
    RAISE EXCEPTION 'Ticket version conflict: expected %, current %.',
      p_expected_version, v_ticket.workflow_version
      USING ERRCODE = '40001';
  END IF;

  v_before_data := jsonb_build_object(
    'title', v_ticket.title,
    'description', v_ticket.description,
    'category', v_ticket.category,
    'priority', v_ticket.priority,
    'workflowVersion', v_ticket.workflow_version
  );

  v_is_operational_manager :=
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_ticket.company_id = public.current_user_company_id()
    )
    OR (
      v_actor_role = 'manager'
      AND public.current_user_can_manage_site(v_ticket.site_id)
    );

  v_is_requester :=
    v_actor_role IN ('owner', 'tenant')
    AND v_ticket.created_by = v_actor_id
    AND v_ticket.workflow_state = 'submitted'
    AND v_ticket.unit_id IS NOT NULL
    AND public.current_user_has_unit_relationship(
      v_ticket.unit_id,
      CASE v_actor_role
        WHEN 'owner' THEN ARRAY['owner']::TEXT[]
        ELSE ARRAY['tenant']::TEXT[]
      END
    );

  IF NOT (v_is_operational_manager OR v_is_requester) THEN
    RAISE EXCEPTION 'Only the submitted-ticket requester or scoped operations may edit details.';
  END IF;

  IF v_ticket.workflow_state IN ('closed', 'cancelled') THEN
    RAISE EXCEPTION 'Closed/cancelled tickets must be reopened before editing.';
  END IF;

  IF v_ticket.emergency_classification = 'rule_matched_p0'
     AND (p_priority IS NOT NULL OR p_category IS NOT NULL)
  THEN
    RAISE EXCEPTION 'P0 priority/category cannot be downgraded or reclassified by a detail edit.';
  END IF;

  v_new_title := COALESCE(NULLIF(BTRIM(p_title), ''), v_ticket.title);
  v_new_description := CASE
    WHEN p_clear_description THEN NULL
    WHEN p_description IS NOT NULL THEN NULLIF(BTRIM(p_description), '')
    ELSE v_ticket.description
  END;
  v_new_category := COALESCE(NULLIF(BTRIM(p_category), ''), v_ticket.category);
  v_new_priority := COALESCE(p_priority, v_ticket.priority);

  IF v_new_title IS DISTINCT FROM v_ticket.title THEN
      v_changed_fields := v_changed_fields || jsonb_build_array('title');
  END IF;
  IF v_new_description IS DISTINCT FROM v_ticket.description THEN
      v_changed_fields := v_changed_fields || jsonb_build_array('description');
  END IF;
  IF v_new_category IS DISTINCT FROM v_ticket.category THEN
      v_changed_fields := v_changed_fields || jsonb_build_array('category');
  END IF;
  IF v_new_priority IS DISTINCT FROM v_ticket.priority THEN
      v_changed_fields := v_changed_fields || jsonb_build_array('priority');
  END IF;

  IF JSONB_ARRAY_LENGTH(v_changed_fields) = 0 THEN
    RAISE EXCEPTION 'Requested ticket details are unchanged.';
  END IF;

  v_next_version := v_ticket.workflow_version + 1;

  UPDATE public.service_tickets
  SET
    title = v_new_title,
    description = v_new_description,
    category = v_new_category,
    priority = v_new_priority,
    workflow_version = v_next_version,
    last_transition_at = NOW(),
    updated_at = NOW()
  WHERE id = v_ticket.id
    AND workflow_version = p_expected_version
  RETURNING * INTO v_ticket;

  IF v_ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ticket version conflict.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.service_ticket_transitions (
    company_id, ticket_id, from_status, to_status, command,
    from_workflow_state, to_workflow_state, ticket_version,
    actor_profile_id, actor_role, reason, metadata, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    v_ticket.status,
    v_ticket.status,
    'update_details',
    v_ticket.workflow_state,
    v_ticket.workflow_state,
    v_next_version,
    v_actor_id,
    v_actor_role,
    BTRIM(p_reason),
    COALESCE(p_metadata, '{}'::JSONB) || jsonb_build_object(
      'changedFields', v_changed_fields
    ),
    p_idempotency_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_ticket.id,
    'ticket_details_updated',
    'Service request details updated.',
    v_actor_id,
    jsonb_build_object(
      'changedFields', v_changed_fields,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_next_version
    ),
    'resident',
    v_next_version,
    'event:' || p_idempotency_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id,
    v_actor_id,
    'service_ticket.details_updated',
    'service_tickets',
    v_ticket.id,
    v_before_data || jsonb_build_object('changedFields', v_changed_fields),
    jsonb_build_object(
      'title', v_new_title,
        'descriptionChanged', v_changed_fields @> jsonb_build_array('description'),
      'category', v_new_category,
      'priority', v_new_priority,
      'workflowVersion', v_next_version,
      'reason', BTRIM(p_reason)
    ),
    'audit:' || p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id,
    'internal_event_bus',
    'ticket.details_updated',
    'service_tickets',
    v_ticket.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'changedFields', v_changed_fields,
      'workflowState', v_ticket.workflow_state,
      'workflowVersion', v_next_version
    ),
    'queued',
    'ticket.details:' || v_ticket.id::TEXT || ':' || v_next_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN public.redact_service_ticket_for_current_user(v_ticket);
END;
$$;

COMMENT ON FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) IS
  'Versioned/idempotent allowlisted ticket detail edit. Requesters are limited to their own submitted ticket; scoped operations may edit; P0 classification cannot be downgraded.';

REVOKE ALL ON FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- Relationship authority is command-only. This command verifies the exact
-- profile -> resident -> unit chain, records the administrator decision, and
-- publishes one deduplicated internal event. Organization administrators are
-- limited to their own company; cross-company work requires the protected
-- platform-administrator registry.
CREATE OR REPLACE FUNCTION public.admin_set_resident_unit_relationship(
  p_profile_id UUID,
  p_resident_id UUID,
  p_unit_id UUID,
  p_relationship TEXT,
  p_is_primary BOOLEAN,
  p_active BOOLEAN,
  p_start_date DATE,
  p_end_date DATE,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS public.unit_residents
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_target_profile public.profiles%ROWTYPE;
  v_resident public.residents%ROWTYPE;
  v_unit public.units%ROWTYPE;
  v_existing public.unit_residents%ROWTYPE;
  v_result public.unit_residents%ROWTYPE;
  v_prior_audit public.audit_events%ROWTYPE;
  v_before JSONB;
  v_after JSONB;
  v_relationship TEXT := lower(btrim(COALESCE(p_relationship, '')));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_idempotency_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_start_date DATE;
  v_end_date DATE;
  v_linked_resident_id UUID;
  v_linked_profile_id UUID;
  v_verifier_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF v_relationship NOT IN ('owner', 'tenant') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Relationship must be owner or tenant';
  END IF;

  IF p_active IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Relationship active state is required';
  END IF;

  IF length(v_reason) < 10 OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 10 and 1000 characters is required';
  END IF;

  IF length(v_idempotency_key) < 8 OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  SELECT *
    INTO v_target_profile
    FROM public.profiles
   WHERE id = p_profile_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Target profile was not found';
  END IF;

  IF v_target_profile.role::TEXT <> v_relationship THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = format('A %s relationship requires a profile with the %s role', v_relationship, v_relationship);
  END IF;

  SELECT *
    INTO v_resident
    FROM public.residents
   WHERE id = p_resident_id
     AND company_id = v_target_profile.company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Resident was not found in the target company';
  END IF;

  SELECT *
    INTO v_unit
    FROM public.units
   WHERE id = p_unit_id
     AND company_id = v_target_profile.company_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Unit was not found in the target company';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_is_organization_admin(v_target_profile.company_id)
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Organization administrator authority is required';
  END IF;

  -- Serialize retries for this actor/company/key before reading the audit row.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_target_profile.company_id::TEXT || ':' || v_actor_id::TEXT || ':' || v_idempotency_key,
      0
    )
  );

  SELECT *
    INTO v_prior_audit
    FROM public.audit_events
   WHERE company_id = v_target_profile.company_id
     AND actor_profile_id = v_actor_id
     AND action = 'resident_unit_relationship.set'
     AND idempotency_key = v_idempotency_key
   ORDER BY created_at DESC
   LIMIT 1;

  IF FOUND THEN
    SELECT *
      INTO v_result
      FROM public.unit_residents
     WHERE id = v_prior_audit.entity_id;

    IF FOUND THEN
      RETURN v_result;
    END IF;

    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'The idempotent relationship result is no longer available';
  END IF;

  SELECT *
    INTO v_existing
    FROM public.unit_residents
   WHERE company_id = v_target_profile.company_id
     AND unit_id = p_unit_id
     AND resident_id = p_resident_id
     AND relationship = v_relationship
   FOR UPDATE;

  v_before := CASE WHEN FOUND THEN to_jsonb(v_existing) ELSE NULL END;

  IF p_active THEN
    v_start_date := COALESCE(p_start_date, CURRENT_DATE);
    v_end_date := p_end_date;

    IF v_start_date > CURRENT_DATE THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An active relationship cannot start in the future';
    END IF;

    IF v_end_date IS NOT NULL AND (v_end_date < CURRENT_DATE OR v_end_date < v_start_date) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An active relationship must have a current or future valid end date';
    END IF;

    SELECT resident_id
      INTO v_linked_resident_id
      FROM public.resident_profile_links
     WHERE company_id = v_target_profile.company_id
       AND profile_id = p_profile_id
     FOR UPDATE;

    IF FOUND AND v_linked_resident_id <> p_resident_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The profile is already linked to another resident';
    END IF;

    SELECT profile_id
      INTO v_linked_profile_id
      FROM public.resident_profile_links
     WHERE company_id = v_target_profile.company_id
       AND resident_id = p_resident_id
     FOR UPDATE;

    IF FOUND AND v_linked_profile_id <> p_profile_id THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The resident is already linked to another profile';
    END IF;

    -- Cross-company platform administrators are recorded in the audit event;
    -- verified_by remains company-local to preserve tenant isolation.
    SELECT id
      INTO v_verifier_id
      FROM public.profiles
     WHERE id = v_actor_id
       AND company_id = v_target_profile.company_id;

    INSERT INTO public.resident_profile_links (
      company_id,
      profile_id,
      resident_id,
      status,
      verification_method,
      verified_by,
      verified_at,
      valid_from,
      valid_until
    ) VALUES (
      v_target_profile.company_id,
      p_profile_id,
      p_resident_id,
      'active',
      'admin_verified',
      v_verifier_id,
      clock_timestamp(),
      clock_timestamp(),
      NULL
    )
    ON CONFLICT (company_id, profile_id)
    DO UPDATE SET
      resident_id = EXCLUDED.resident_id,
      status = 'active',
      verification_method = 'admin_verified',
      verified_by = EXCLUDED.verified_by,
      verified_at = EXCLUDED.verified_at,
      valid_from = LEAST(
        COALESCE(public.resident_profile_links.valid_from, EXCLUDED.valid_from),
        EXCLUDED.valid_from
      ),
      valid_until = NULL,
      updated_at = clock_timestamp();

    INSERT INTO public.unit_residents (
      company_id,
      unit_id,
      resident_id,
      relationship,
      is_primary,
      start_date,
      end_date
    ) VALUES (
      v_target_profile.company_id,
      p_unit_id,
      p_resident_id,
      v_relationship,
      COALESCE(p_is_primary, FALSE),
      v_start_date,
      v_end_date
    )
    ON CONFLICT (unit_id, resident_id, relationship)
    DO UPDATE SET
      company_id = EXCLUDED.company_id,
      is_primary = EXCLUDED.is_primary,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date
    RETURNING * INTO v_result;

    IF COALESCE(p_is_primary, FALSE) THEN
      UPDATE public.unit_residents
         SET is_primary = FALSE
       WHERE company_id = v_target_profile.company_id
         AND resident_id = p_resident_id
         AND relationship = v_relationship
         AND id <> v_result.id
         AND is_primary;
    END IF;
  ELSE
    IF v_before IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The relationship to deactivate was not found';
    END IF;

    -- End dates are inclusive in the existing model. Yesterday revokes access
    -- immediately so all relationship-backed RLS helpers fail closed now.
    v_end_date := LEAST(COALESCE(p_end_date, CURRENT_DATE - 1), CURRENT_DATE - 1);

    UPDATE public.unit_residents
       SET is_primary = FALSE,
           start_date = LEAST(start_date, v_end_date),
           end_date = v_end_date
     WHERE id = v_existing.id
    RETURNING * INTO v_result;

    IF NOT EXISTS (
      SELECT 1
        FROM public.unit_residents ur
       WHERE ur.company_id = v_target_profile.company_id
         AND ur.resident_id = p_resident_id
         AND ur.start_date <= CURRENT_DATE
         AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
    ) THEN
      UPDATE public.resident_profile_links
         SET status = 'suspended',
             valid_until = clock_timestamp(),
             updated_at = clock_timestamp()
       WHERE company_id = v_target_profile.company_id
         AND profile_id = p_profile_id
         AND resident_id = p_resident_id
         AND status = 'active';
    END IF;
  END IF;

  v_after := to_jsonb(v_result) || jsonb_build_object(
    'active', p_active,
    'profileId', p_profile_id,
    'reason', v_reason
  );

  INSERT INTO public.audit_events (
    company_id,
    actor_profile_id,
    action,
    entity_table,
    entity_id,
    before_data,
    after_data,
    idempotency_key
  ) VALUES (
    v_target_profile.company_id,
    v_actor_id,
    'resident_unit_relationship.set',
    'unit_residents',
    v_result.id,
    v_before,
    v_after,
    v_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id,
    integration_key,
    action_type,
    entity_table,
    entity_id,
    payload,
    status,
    deduplication_key
  ) VALUES (
    v_target_profile.company_id,
    'internal_event_bus',
    'resident.relationship_changed',
    'unit_residents',
    v_result.id,
    jsonb_build_object(
      'relationshipId', v_result.id,
      'profileId', p_profile_id,
      'residentId', p_resident_id,
      'unitId', p_unit_id,
      'relationship', v_relationship,
      'state', CASE WHEN p_active THEN 'activated' ELSE 'revoked' END,
      'actorProfileId', v_actor_id
    ),
    'queued',
    'resident-unit-relationship:' || v_target_profile.company_id::TEXT || ':' || v_idempotency_key
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.admin_set_resident_unit_relationship(
  UUID, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, DATE, DATE, TEXT, TEXT
) IS
  'Audited and idempotent organization-admin command for verified owner/tenant profile-resident-unit relationships.';

REVOKE ALL ON FUNCTION public.admin_set_resident_unit_relationship(
  UUID, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, DATE, DATE, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_resident_unit_relationship(
  UUID, UUID, UUID, TEXT, BOOLEAN, BOOLEAN, DATE, DATE, TEXT, TEXT
) TO authenticated;

-- All relationship and site-scope mutation now goes through audited command
-- functions. Existing RLS remains defense in depth for reads.
REVOKE INSERT, UPDATE, DELETE ON TABLE public.resident_profile_links FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.profile_site_assignments FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.unit_residents FROM anon, authenticated;
GRANT SELECT ON TABLE public.resident_profile_links TO authenticated;
GRANT SELECT ON TABLE public.profile_site_assignments TO authenticated;
GRANT SELECT ON TABLE public.unit_residents TO authenticated;

-- Replace the migration-01 global manager/admin directory policy. Managers see
-- only people connected to a site they actually manage; organization admins
-- see their company; platform administrators retain explicit cross-company
-- support visibility. Every other role is limited to its own profile.
CREATE OR REPLACE FUNCTION public.current_user_can_view_profile(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_target_company_id UUID;
BEGIN
  IF v_actor_id IS NULL OR p_profile_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_profile_id = v_actor_id THEN
    RETURN TRUE;
  END IF;

  SELECT p.company_id
    INTO v_target_company_id
    FROM public.profiles p
   WHERE p.id = p_profile_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF public.current_user_is_organization_admin(v_target_company_id) THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.profile_site_assignments psa
     WHERE psa.company_id = v_target_company_id
       AND psa.profile_id = p_profile_id
       AND psa.status = 'active'
       AND psa.valid_from <= CURRENT_TIMESTAMP
       AND (psa.valid_until IS NULL OR psa.valid_until >= CURRENT_TIMESTAMP)
       AND public.current_user_can_manage_site(psa.site_id)
  ) OR EXISTS (
    SELECT 1
      FROM public.resident_profile_links rpl
      JOIN public.unit_residents ur
        ON ur.company_id = rpl.company_id
       AND ur.resident_id = rpl.resident_id
      JOIN public.units u
        ON u.company_id = ur.company_id
       AND u.id = ur.unit_id
     WHERE rpl.company_id = v_target_company_id
       AND rpl.profile_id = p_profile_id
       AND rpl.status = 'active'
       AND rpl.valid_from <= CURRENT_TIMESTAMP
       AND (rpl.valid_until IS NULL OR rpl.valid_until >= CURRENT_TIMESTAMP)
       AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
       AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
       AND public.current_user_can_manage_site(u.site_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_profile(UUID) TO authenticated;

DROP POLICY IF EXISTS "Admins and managers can read profiles" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_role_relationship_scope ON public.profiles;
CREATE POLICY profiles_select_role_relationship_scope
ON public.profiles
FOR SELECT
TO authenticated
USING (public.current_user_can_view_profile(id));
