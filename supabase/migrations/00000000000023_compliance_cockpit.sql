-- Priority-1 Access & Buyer Compliance Cockpit.
--
-- This migration turns the former seed-only compliance screen into an
-- authenticated, company/site-scoped workflow. A compliance decision is a
-- human review record only: it never activates physical access, posts money,
-- refunds a deposit, or provides a legal guarantee.

CREATE TABLE IF NOT EXISTS public.compliance_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  case_no TEXT NOT NULL,
  case_type TEXT NOT NULL
    CHECK (case_type IN ('access', 'deposit', 'buyer_suitability')),
  subject_name TEXT NOT NULL,
  subject_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN (
      'pending_review',
      'in_review',
      'approved',
      'rejected',
      'blocked',
      'closed'
    )),
  risk_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  blocker TEXT,
  next_action TEXT,
  financial_exposure_cents BIGINT
    CHECK (financial_exposure_cents IS NULL OR financial_exposure_cents >= 0),
  currency TEXT,
  execution_mode TEXT NOT NULL DEFAULT 'internal_review'
    CHECK (execution_mode IN ('internal_review', 'provider_ready', 'manual_only')),
  provider_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (provider_status IN (
      'not_required',
      'blocked_pending_contract',
      'disconnected',
      'test_connected',
      'live_connected'
    )),
  data_origin TEXT NOT NULL DEFAULT 'manual'
    CHECK (data_origin IN (
      'manual',
      'client_import',
      'operational_projection',
      'demo_seed'
    )),
  source_table TEXT,
  source_id UUID,
  facts JSONB NOT NULL DEFAULT '{}'::JSONB,
  human_decision_required BOOLEAN NOT NULL DEFAULT TRUE
    CHECK (human_decision_required),
  external_execution_allowed BOOLEAN NOT NULL DEFAULT FALSE
    CHECK (NOT external_execution_allowed),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  last_decision_at TIMESTAMPTZ,
  last_decision_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, case_no)
);

COMMENT ON TABLE public.compliance_cases IS
  'Company/site-scoped access, deposit and buyer-suitability review cases. Decisions are record-only and never execute physical access, money movement or legal guarantees.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_cases_source_unique
  ON public.compliance_cases(company_id, case_type, source_table, source_id)
  WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_compliance_cases_site_queue
  ON public.compliance_cases(company_id, site_id, status, risk_level, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_type_queue
  ON public.compliance_cases(company_id, case_type, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.compliance_case_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.compliance_cases(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  decision TEXT NOT NULL
    CHECK (decision IN (
      'approve',
      'reject',
      'request_information',
      'block',
      'close',
      'reopen'
    )),
  rationale TEXT NOT NULL,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('admin', 'manager')),
  case_version INTEGER NOT NULL CHECK (case_version > 1),
  policy_version TEXT NOT NULL DEFAULT 'compliance-review-v1',
  idempotency_key TEXT NOT NULL,
  external_execution BOOLEAN NOT NULL DEFAULT FALSE CHECK (NOT external_execution),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (case_id, case_version),
  UNIQUE (company_id, idempotency_key)
);

COMMENT ON TABLE public.compliance_case_decisions IS
  'Append-only evidence of human compliance decisions with CAS/idempotency. external_execution is constrained false.';

CREATE INDEX IF NOT EXISTS idx_compliance_decisions_case_created
  ON public.compliance_case_decisions(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_site_created
  ON public.compliance_case_decisions(company_id, site_id, created_at DESC);

DROP TRIGGER IF EXISTS set_compliance_cases_updated_at ON public.compliance_cases;
CREATE TRIGGER set_compliance_cases_updated_at
  BEFORE UPDATE ON public.compliance_cases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.prevent_compliance_decision_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Compliance decisions are append-only.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_compliance_decision_update
  ON public.compliance_case_decisions;
CREATE TRIGGER prevent_compliance_decision_update
  BEFORE UPDATE OR DELETE ON public.compliance_case_decisions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_compliance_decision_mutation();

ALTER TABLE public.compliance_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_case_decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS compliance_cases_read_authorized_scope
  ON public.compliance_cases;
CREATE POLICY compliance_cases_read_authorized_scope
  ON public.compliance_cases
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
      AND public.current_user_can_manage_site(site_id)
    )
  );

DROP POLICY IF EXISTS compliance_decisions_read_authorized_scope
  ON public.compliance_case_decisions;
CREATE POLICY compliance_decisions_read_authorized_scope
  ON public.compliance_case_decisions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
      AND public.current_user_can_manage_site(site_id)
    )
  );

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.compliance_cases FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.compliance_case_decisions FROM authenticated;
GRANT SELECT ON public.compliance_cases TO authenticated;
GRANT SELECT ON public.compliance_case_decisions TO authenticated;

CREATE OR REPLACE FUNCTION public.decide_compliance_case_v1(
  p_case_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_rationale TEXT,
  p_idempotency_key TEXT
)
RETURNS public.compliance_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_case public.compliance_cases%ROWTYPE;
  v_result public.compliance_cases%ROWTYPE;
  v_existing public.compliance_case_decisions%ROWTYPE;
  v_next_status TEXT;
  v_next_version INTEGER;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'A positive expected version is required.'
      USING ERRCODE = '22023';
  END IF;

  IF p_decision NOT IN (
    'approve',
    'reject',
    'request_information',
    'block',
    'close',
    'reopen'
  ) THEN
    RAISE EXCEPTION 'Unsupported compliance decision: %', p_decision
      USING ERRCODE = '22023';
  END IF;

  IF NULLIF(BTRIM(p_rationale), '') IS NULL
     OR LENGTH(BTRIM(p_rationale)) < 10
     OR LENGTH(p_rationale) > 1000
  THEN
    RAISE EXCEPTION 'Compliance decisions require a rationale of 10 to 1000 characters.'
      USING ERRCODE = '22023';
  END IF;

  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL
     OR LENGTH(p_idempotency_key) < 8
     OR LENGTH(p_idempotency_key) > 200
  THEN
    RAISE EXCEPTION 'An idempotency key of 8 to 200 characters is required.'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_case
  FROM public.compliance_cases c
  WHERE c.id = p_case_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Compliance case not found.' USING ERRCODE = 'P0002';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role IN ('admin', 'manager')
      AND v_case.company_id = public.current_user_company_id()
      AND public.current_user_can_manage_site(v_case.site_id)
    )
  ) THEN
    RAISE EXCEPTION 'Compliance case is outside the authorized company or site scope.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_existing
  FROM public.compliance_case_decisions d
  WHERE d.company_id = v_case.company_id
    AND d.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.actor_profile_id IS DISTINCT FROM v_actor_id
       OR v_existing.case_id IS DISTINCT FROM p_case_id
       OR v_existing.decision IS DISTINCT FROM p_decision
       OR v_existing.rationale IS DISTINCT FROM BTRIM(p_rationale)
       OR v_existing.case_version IS DISTINCT FROM p_expected_version + 1
    THEN
      RAISE EXCEPTION 'Idempotency key was already used with a different compliance payload.'
        USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_result
    FROM public.compliance_cases c
    WHERE c.id = v_existing.case_id;
    RETURN v_result;
  END IF;

  IF v_case.version IS DISTINCT FROM p_expected_version THEN
    RAISE EXCEPTION 'Compliance case version conflict: expected %, current %.',
      p_expected_version,
      v_case.version
      USING ERRCODE = '40001';
  END IF;

  v_next_status := CASE p_decision
    WHEN 'approve' THEN 'approved'
    WHEN 'reject' THEN 'rejected'
    WHEN 'request_information' THEN 'in_review'
    WHEN 'block' THEN 'blocked'
    WHEN 'close' THEN 'closed'
    WHEN 'reopen' THEN 'in_review'
  END;

  IF p_decision IN ('approve', 'reject', 'request_information', 'block')
     AND v_case.status NOT IN ('pending_review', 'in_review')
  THEN
    RAISE EXCEPTION 'Decision % is not allowed from compliance status %.',
      p_decision,
      v_case.status
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'close'
     AND v_case.status NOT IN ('approved', 'rejected', 'blocked')
  THEN
    RAISE EXCEPTION 'Close is allowed only after an approved, rejected or blocked review.'
      USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'reopen'
     AND v_case.status NOT IN ('approved', 'rejected', 'blocked', 'closed')
  THEN
    RAISE EXCEPTION 'Reopen is allowed only after a completed compliance review.'
      USING ERRCODE = '22023';
  END IF;

  v_next_version := v_case.version + 1;

  UPDATE public.compliance_cases
  SET
    status = v_next_status,
    version = v_next_version,
    last_decision_at = NOW(),
    last_decision_by = v_actor_id,
    next_action = CASE
      WHEN p_decision = 'request_information' THEN 'Collect the missing evidence and return for human review.'
      WHEN p_decision = 'approve' AND v_case.case_type = 'access'
        THEN 'Review approved; physical access remains provider-blocked until a separate authorized action.'
      WHEN p_decision = 'approve' AND v_case.case_type = 'deposit'
        THEN 'Review approved; no payment, deduction or refund has been executed.'
      WHEN p_decision = 'approve' AND v_case.case_type = 'buyer_suitability'
        THEN 'Pre-check approved; legal eligibility remains subject to qualified partner review where required.'
      WHEN p_decision = 'block' THEN 'Resolve the recorded blocker before reopening the review.'
      WHEN p_decision = 'reject' THEN 'Communicate the reason and retain the audit trail.'
      WHEN p_decision = 'close' THEN 'No further review action is pending.'
      WHEN p_decision = 'reopen' THEN 'Complete a new human review with current evidence.'
      ELSE next_action
    END
  WHERE id = v_case.id
    AND version = p_expected_version
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION 'Compliance case version conflict.' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.compliance_case_decisions (
    company_id,
    site_id,
    case_id,
    from_status,
    to_status,
    decision,
    rationale,
    actor_profile_id,
    actor_role,
    case_version,
    policy_version,
    idempotency_key,
    external_execution,
    metadata
  ) VALUES (
    v_case.company_id,
    v_case.site_id,
    v_case.id,
    v_case.status,
    v_next_status,
    p_decision,
    BTRIM(p_rationale),
    v_actor_id,
    v_actor_role,
    v_next_version,
    'compliance-review-v1',
    p_idempotency_key,
    FALSE,
    jsonb_build_object(
      'caseType', v_case.case_type,
      'effect', 'record_only',
      'providerStatus', v_case.provider_status,
      'expectedVersion', p_expected_version
    )
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
    v_case.company_id,
    v_actor_id,
    'compliance.case.decided',
    'compliance_cases',
    v_case.id,
    jsonb_build_object(
      'status', v_case.status,
      'version', v_case.version
    ),
    jsonb_build_object(
      'status', v_next_status,
      'version', v_next_version,
      'decision', p_decision,
      'rationale', BTRIM(p_rationale),
      'effect', 'record_only',
      'externalExecution', FALSE
    ),
    'audit:compliance:' || p_idempotency_key
  );

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.decide_compliance_case_v1(
  UUID, INTEGER, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_compliance_case_v1(
  UUID, INTEGER, TEXT, TEXT, TEXT
) TO authenticated;

-- Project the existing operational access and deposit work into the cockpit.
-- The source records remain authoritative for execution; the compliance case
-- records human review state only.
INSERT INTO public.compliance_cases (
  company_id,
  site_id,
  unit_id,
  case_no,
  case_type,
  subject_name,
  subject_reference,
  status,
  risk_level,
  blocker,
  next_action,
  execution_mode,
  provider_status,
  data_origin,
  source_table,
  source_id,
  facts
)
SELECT
  a.company_id,
  a.site_id,
  a.unit_id,
  'ACC-' || UPPER(SUBSTRING(REPLACE(a.id::TEXT, '-', '') FROM 1 FOR 10)),
  'access',
  COALESCE(r.guest_name, u.unit_no, 'Access handoff'),
  u.unit_no,
  CASE
    WHEN a.status IN ('approved', 'succeeded') THEN 'approved'
    WHEN a.status IN ('failed', 'manual_required') THEN 'blocked'
    ELSE 'pending_review'
  END,
  CASE
    WHEN a.status IN ('failed', 'manual_required') THEN 'high'
    WHEN a.status IN ('approved', 'succeeded') THEN 'low'
    ELSE 'medium'
  END,
  CASE
    WHEN a.provider_code = 'demo' THEN 'Access provider contract and credentials are not active.'
    WHEN a.status IN ('failed', 'manual_required') THEN 'Provider or manual handoff needs resolution.'
    WHEN a.approval_required AND a.approved_at IS NULL THEN 'Human access review is required.'
    ELSE NULL
  END,
  CASE
    WHEN a.provider_code = 'demo' THEN 'Complete human review; keep physical activation provider-blocked.'
    ELSE 'Complete human review before any separate access action.'
  END,
  'provider_ready',
  CASE
    WHEN a.provider_code = 'demo' THEN 'blocked_pending_contract'
    ELSE 'disconnected'
  END,
  'operational_projection',
  'access_handoff_requests',
  a.id,
  jsonb_build_object(
    'credentialType', a.credential_type,
    'requestedAction', a.action,
    'sourceStatus', a.status,
    'providerCode', a.provider_code,
    'validFrom', a.valid_from,
    'validUntil', a.valid_until
  )
FROM public.access_handoff_requests a
LEFT JOIN public.reservations r ON r.id = a.reservation_id
LEFT JOIN public.units u ON u.id = a.unit_id
ON CONFLICT DO NOTHING;

INSERT INTO public.compliance_cases (
  company_id,
  site_id,
  unit_id,
  case_no,
  case_type,
  subject_name,
  subject_reference,
  status,
  risk_level,
  blocker,
  next_action,
  financial_exposure_cents,
  currency,
  execution_mode,
  provider_status,
  data_origin,
  source_table,
  source_id,
  facts
)
SELECT
  d.company_id,
  d.site_id,
  r.unit_id,
  'DEP-' || UPPER(SUBSTRING(REPLACE(d.id::TEXT, '-', '') FROM 1 FOR 10)),
  'deposit',
  COALESCE(r.guest_name, u.unit_no, 'Deposit settlement'),
  u.unit_no,
  CASE
    WHEN d.status = 'closed' THEN 'closed'
    WHEN d.status IN ('manager_review', 'finance_ready') THEN 'in_review'
    ELSE 'pending_review'
  END,
  CASE
    WHEN d.proposed_deduction_cents > 0 AND d.evidence_count = 0 THEN 'high'
    WHEN d.status IN ('manager_review', 'finance_ready') THEN 'medium'
    ELSE 'low'
  END,
  CASE
    WHEN d.proposed_deduction_cents > 0 AND d.evidence_count = 0
      THEN 'A proposed deduction has no attached evidence.'
    WHEN d.status = 'evidence_needed' THEN 'Checkout evidence is incomplete.'
    WHEN d.status = 'finance_ready' THEN 'Final finance approval remains separate.'
    ELSE NULL
  END,
  CASE
    WHEN d.status = 'finance_ready'
      THEN 'Complete human compliance review; finance execution remains separate.'
    ELSE 'Collect evidence and complete manager review.'
  END,
  d.deposit_amount_cents,
  'TRY',
  'internal_review',
  'not_required',
  'operational_projection',
  'deposit_settlements',
  d.id,
  jsonb_build_object(
    'sourceStatus', d.status,
    'proposedDeductionCents', d.proposed_deduction_cents,
    'refundAmountCents', d.refund_amount_cents,
    'evidenceCount', d.evidence_count,
    'approvalOwner', d.approval_owner
  )
FROM public.deposit_settlements d
LEFT JOIN public.reservations r ON r.id = d.reservation_id
LEFT JOIN public.units u ON u.id = r.unit_id
ON CONFLICT DO NOTHING;

-- The current client demo has no durable buyer-suitability source table yet.
-- Preserve the four already-approved demo scenarios as explicitly labelled
-- demo records in PostgreSQL, never as legal advice or live client evidence.
WITH demo_scope AS (
  SELECT c.id AS company_id, s.id AS site_id
  FROM public.companies c
  JOIN LATERAL (
    SELECT site.id
    FROM public.sites site
    WHERE site.company_id = c.id
      AND site.status <> 'archived'
    ORDER BY site.created_at, site.id
    LIMIT 1
  ) s ON TRUE
  WHERE c.slug = 'ataberk-estate'
  LIMIT 1
), demo_cases (
  case_no,
  subject_name,
  subject_reference,
  status,
  risk_level,
  blocker,
  next_action,
  financial_exposure_cents,
  facts
) AS (
  VALUES
    (
      'BUY-DEMO-001',
      'Demo buyer – investment',
      '2+1 Garden',
      'approved',
      'low',
      NULL,
      'Proceed with reservation review and the ROI information pack.',
      26000000::BIGINT,
      '{"nationality":"DE","buyerGoal":"investment","districtCheck":"clear","appraisalRequired":false,"legalDisclaimer":"Pre-check only; no legal guarantee."}'::JSONB
    ),
    (
      'BUY-DEMO-002',
      'Demo buyer – holiday home',
      '1+1',
      'pending_review',
      'medium',
      'Residence-zone quota must be checked before any promise.',
      'Send the file to a qualified partner for zone review.',
      14500000::BIGINT,
      '{"nationality":"RU","buyerGoal":"holiday_home","districtCheck":"quota_review","appraisalRequired":false,"legalDisclaimer":"Pre-check only; no legal guarantee."}'::JSONB
    ),
    (
      'BUY-DEMO-003',
      'Demo buyer – citizenship',
      '3+1 Penthouse',
      'in_review',
      'high',
      'Appraisal and source-of-funds review are incomplete.',
      'Collect the missing evidence and request qualified legal review.',
      32000000::BIGINT,
      '{"nationality":"AE","buyerGoal":"citizenship","districtCheck":"clear","appraisalRequired":true,"legalDisclaimer":"Pre-check only; no legal guarantee."}'::JSONB
    ),
    (
      'BUY-DEMO-004',
      'Demo buyer – residence',
      '1+1',
      'blocked',
      'critical',
      'The configured district is currently marked restricted for this demo scenario.',
      'Do not promise suitability; obtain current qualified legal advice.',
      12000000::BIGINT,
      '{"nationality":"GB","buyerGoal":"residence","districtCheck":"restricted","appraisalRequired":false,"legalDisclaimer":"Pre-check only; no legal guarantee."}'::JSONB
    )
)
INSERT INTO public.compliance_cases (
  company_id,
  site_id,
  case_no,
  case_type,
  subject_name,
  subject_reference,
  status,
  risk_level,
  blocker,
  next_action,
  financial_exposure_cents,
  currency,
  execution_mode,
  provider_status,
  data_origin,
  facts
)
SELECT
  demo_scope.company_id,
  demo_scope.site_id,
  demo_cases.case_no,
  'buyer_suitability',
  demo_cases.subject_name,
  demo_cases.subject_reference,
  demo_cases.status,
  demo_cases.risk_level,
  demo_cases.blocker,
  demo_cases.next_action,
  demo_cases.financial_exposure_cents,
  'EUR',
  'manual_only',
  'not_required',
  'demo_seed',
  demo_cases.facts
FROM demo_scope
CROSS JOIN demo_cases
ON CONFLICT (company_id, case_no) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'compliance_cases'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_cases;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'compliance_case_decisions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.compliance_case_decisions;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipping compliance realtime publication; supabase_realtime is unavailable.';
END;
$$;

ALTER TABLE public.compliance_cases REPLICA IDENTITY FULL;
ALTER TABLE public.compliance_case_decisions REPLICA IDENTITY FULL;
