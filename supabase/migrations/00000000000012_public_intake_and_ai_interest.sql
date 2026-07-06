-- Public, account-free intake for the New Level Premium landing page.
--
-- This is the one intentional anonymous write path. It only accepts a small
-- allowlist of public intake types, writes queued client_action_requests for
-- human triage, and returns only the generated request id.

CREATE OR REPLACE FUNCTION public.kbs_identity_retention_days()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$ SELECT 180 $$;

REVOKE ALL ON FUNCTION public.kbs_identity_retention_days() FROM PUBLIC;

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
  v_action_type TEXT;
  v_has_identity BOOLEAN;
BEGIN
  v_action_type := COALESCE(p_action_type, '');

  IF v_action_type NOT IN (
    'registration.request.owner',
    'registration.request.tenant',
    'registration.request.staff',
    'public.report',
    'public.ai_question'
  ) THEN
    RAISE EXCEPTION 'Unsupported public intake action type: %', v_action_type;
  END IF;

  v_company_id := public.default_company_id();
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No default company context available for public intake.';
  END IF;

  v_metadata := COALESCE(p_metadata, '{}'::JSONB);
  IF octet_length(v_metadata::TEXT) > 20000 THEN
    RAISE EXCEPTION 'Public intake metadata is too large.';
  END IF;

  v_has_identity :=
    (v_metadata ? 'idNumber') AND NULLIF(v_metadata->>'idNumber', '') IS NOT NULL;

  IF v_has_identity THEN
    v_metadata := v_metadata || jsonb_build_object(
      'identityRetentionBasis', 'kbs_public_intake',
      'identityRetentionUntil',
        to_char(
          (now() + make_interval(days => public.kbs_identity_retention_days())) AT TIME ZONE 'UTC',
          'YYYY-MM-DD"T"HH24:MI:SS"Z"'
        )
    );
  END IF;

  INSERT INTO public.client_action_requests (
    company_id,
    action_type,
    title,
    status,
    requested_by,
    metadata
  ) VALUES (
    v_company_id,
    v_action_type,
    LEFT(COALESCE(p_title, ''), 200),
    'queued',
    NULL,
    v_metadata
  )
  RETURNING id INTO v_request_id;

  -- Queue only; no authority/provider transmission happens in this function.
  IF v_has_identity
     AND v_action_type IN ('registration.request.owner', 'registration.request.tenant')
  THEN
    INSERT INTO public.integration_outbox (
      company_id,
      integration_key,
      action_type,
      entity_table,
      entity_id,
      payload,
      status
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
