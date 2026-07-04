-- 00000000000011_public_ai_interest.sql
-- Landing-page AI concierge: capture what visitors ask about, so the internal
-- 1Cati assistant and the team can learn which topics prospects care about.
--
-- Decision (client, 03.07.2026): the public landing assistant must (a) know the
-- product well enough to explain why/how/advantages, (b) NEVER expose internal
-- 1Cati data (it is given no data access at the application layer), and (c)
-- feed the questions back into 1Cati as interest analytics.
--
-- This migration only extends the submit_public_intake allowlist with
-- 'public.ai_question'. Everything else is byte-identical to migration 0009
-- (identity retention stamping + queued KBS report); AI questions carry no
-- identity fields, so those branches stay inert for them.

CREATE OR REPLACE FUNCTION public.submit_public_intake(
  p_action_type TEXT,
  p_title TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_request_id UUID;
  v_metadata JSONB;
  v_has_identity BOOLEAN;
BEGIN
  -- Allowlist: only public landing-page intake types may use this anon path.
  IF p_action_type NOT IN (
    'registration.request.owner',
    'registration.request.tenant',
    'registration.request.staff',
    'public.report',
    'public.ai_question'
  ) THEN
    RAISE EXCEPTION 'Unsupported public intake action type: %', p_action_type;
  END IF;

  v_company_id := public.default_company_id();
  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context available for public intake.';
  END IF;

  v_metadata := COALESCE(p_metadata, '{}'::JSONB);

  -- If an identity document number is present (owner/tenant), stamp a retention
  -- deadline so the data is not held longer than its KBS legal basis permits.
  v_has_identity :=
    (v_metadata ? 'idNumber') AND NULLIF(v_metadata->>'idNumber', '') IS NOT NULL;

  IF v_has_identity THEN
    v_metadata := v_metadata || jsonb_build_object(
      'identityRetentionBasis', 'kbs',
      'identityRetentionUntil',
        to_char(
          (now() + make_interval(days => public.kbs_identity_retention_days())) AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        )
    );
  END IF;

  INSERT INTO public.client_action_requests (
    company_id, action_type, title, status, requested_by, metadata
  ) VALUES (
    v_company_id,
    p_action_type,
    LEFT(COALESCE(p_title, ''), 200),
    'queued',
    NULL,
    v_metadata
  )
  RETURNING id INTO v_request_id;

  -- Queue (do NOT send) a KBS guest report for owner/tenant registrations that
  -- carry identity data. A gated production integration performs the actual
  -- transmission to authorities; this row is only the durable intent to report.
  IF v_has_identity
     AND p_action_type IN ('registration.request.owner', 'registration.request.tenant')
  THEN
    INSERT INTO public.integration_outbox (
      company_id, integration_key, action_type, entity_table, entity_id, payload, status
    ) VALUES (
      v_company_id,
      'kbs',
      'kbs.guest_report',
      'client_action_requests',
      v_request_id,
      jsonb_build_object(
        'requestId', v_request_id,
        'role', v_metadata->>'role',
        'fullName', v_metadata->>'fullName',
        'idType', v_metadata->>'idType',
        'idNumber', v_metadata->>'idNumber',
        'issuingCountry', v_metadata->>'issuingCountry',
        'unitClaim', v_metadata->>'unitClaim',
        'retentionUntil', v_metadata->>'identityRetentionUntil'
      ),
      'queued'
    );
  END IF;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) TO authenticated;
