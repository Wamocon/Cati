-- Persist the estimated service-ticket cost at creation time.
--
-- Until now the "estimated cost" shown when a service request is raised was a
-- purely client-side value (apps/web .../tickets/page.tsx -> estimatedTicketCostTry),
-- recomputed from priority at render time. That meant the figure only ever existed
-- in the browser and could drift between viewers. This migration stores the
-- estimate on the row at insert so every finance-readable role reads the exact
-- same persisted amount, while owner/tenant (whose finance columns are redacted by
-- read_service_ticket_queue_safe) fall back to the identical deterministic compute
-- because the SQL helper below mirrors the app's tiers.
--
-- Scope of changes (all additive; existing behaviour, signatures and RLS unchanged):
--   1. service_tickets gains estimated_cost_currency (estimated_cost_cents already
--      exists since migration 00000000000002).
--   2. estimate_service_ticket_cost_cents(): deterministic TRY-cents helper that
--      mirrors estimatedTicketCostTry() in the web app.
--   3. Backfill estimated_cost_cents for existing rows that never had one.
--   4. CREATE OR REPLACE the ticket-create implementation so new inserts stamp the
--      estimate. The public create_service_ticket_command() is a thin
--      invitation-scope wrapper added in migration 00000000000022 that delegates to
--      create_service_ticket_command_without_invitation_scope(); the latter owns the
--      single INSERT into service_tickets, so the estimate assignment belongs there.
--      The wrapper and every other line of the implementation are preserved exactly.

-- ---------------------------------------------------------------------------
-- 1. Columns.
-- ---------------------------------------------------------------------------

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS estimated_cost_cents bigint,
  ADD COLUMN IF NOT EXISTS estimated_cost_currency text NOT NULL DEFAULT 'TRY'
    CHECK (estimated_cost_currency IN ('TRY', 'EUR'));

-- ---------------------------------------------------------------------------
-- 2. Deterministic cost helper (mirrors apps/web estimatedTicketCostTry()).
--
--    App tiers (TRY):  urgent 4500, high 3000, medium 1800, low 900, else 1500.
--    Stored here in TRY minor units (kuruş). The DB priority domain is
--    ('low','normal','high','urgent'); the app's "medium" is persisted as
--    'normal', so both map to the 1800 TRY tier. The category argument is accepted
--    to match the requested signature (and the backfill call site) but, exactly
--    like the app, does not affect the tier.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.estimate_service_ticket_cost_cents(
  p_priority text,
  p_category text DEFAULT NULL
)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE lower(coalesce(p_priority, ''))
    WHEN 'urgent' THEN 450000::bigint
    WHEN 'high'   THEN 300000::bigint
    WHEN 'medium' THEN 180000::bigint
    WHEN 'normal' THEN 180000::bigint
    WHEN 'low'    THEN 90000::bigint
    ELSE 150000::bigint
  END;
$$;

COMMENT ON FUNCTION public.estimate_service_ticket_cost_cents(text, text) IS
  'Deterministic estimated service-ticket cost in TRY minor units (kuruş). Mirrors the web app estimatedTicketCostTry() priority tiers. Category is accepted for signature/call-site parity but does not change the tier.';

-- ---------------------------------------------------------------------------
-- 3. Backfill existing rows that never received an estimate.
-- ---------------------------------------------------------------------------

UPDATE public.service_tickets
SET estimated_cost_cents =
  public.estimate_service_ticket_cost_cents(priority, category)
WHERE estimated_cost_cents IS NULL;

-- ---------------------------------------------------------------------------
-- 4. Stamp the estimate on new inserts.
--
--    Verbatim copy of create_service_ticket_command_without_invitation_scope
--    (originally defined as create_service_ticket_command in migration
--    00000000000020 and renamed in 00000000000022) with exactly one addition: the
--    INSERT now sets estimated_cost_cents from the helper above. Signature, return
--    type, security context, validation, idempotency, redaction and all
--    transition/event/audit/outbox side effects are unchanged.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_service_ticket_command_without_invitation_scope(
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
    estimated_cost_cents,
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
    -- Persist the deterministic estimate at creation so the figure is stored once
    -- and read identically by every finance-readable role.
    public.estimate_service_ticket_cost_cents(p_priority, BTRIM(p_category)),
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

-- Preserve the invariant that this scoped implementation is reachable only through
-- the public create_service_ticket_command() wrapper (CREATE OR REPLACE keeps the
-- existing ACL; this REVOKE is defensive and idempotent).
REVOKE ALL ON FUNCTION public.create_service_ticket_command_without_invitation_scope(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
