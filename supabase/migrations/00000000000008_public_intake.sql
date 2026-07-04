-- 00000000000008_public_intake.sql
-- Public, account-free intake for the New Level Premium landing page.
-- Two arrival types share one tightly-scoped entry point:
--   1. owner / tenant / staff registration requests, and
--   2. public/guest issue reports (the "report an issue" channel).
--
-- These submissions arrive with NO authenticated session, so they cannot use
-- log_client_action() (which requires a company/role context and role level).
-- Instead this single SECURITY DEFINER function accepts an anonymous
-- submission, records it as a 'queued' client_action_request for human triage,
-- and returns only the new id.
--
-- Safety properties (this is the one intentional anonymous WRITE path):
--   * write-only: never reads or returns any internal row back to the caller,
--   * allowlisted action types only (no arbitrary writes),
--   * never trusts a client-supplied company_id or requested_by
--     (company is resolved server-side; requester is always NULL/anonymous),
--   * always lands as status 'queued' for human triage; it can never
--     self-approve or activate an account,
--   * title is length-clamped to bound abuse.
-- Privileged-role registration (manager/accountant/admin) is intentionally not
-- representable here: the app layer rejects those roles, and even a direct call
-- can at most create a 'queued' owner/tenant/staff request or a public report.

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
BEGIN
  -- Allowlist: only public landing-page intake types may use this anon path.
  IF p_action_type NOT IN (
    'registration.request.owner',
    'registration.request.tenant',
    'registration.request.staff',
    'public.report'
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

  INSERT INTO public.client_action_requests (
    company_id,
    action_type,
    title,
    status,
    requested_by,
    metadata
  ) VALUES (
    v_company_id,
    p_action_type,
    LEFT(COALESCE(p_title, ''), 200),
    'queued',
    NULL,
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

-- Public intake is the single deliberate anonymous write path; grant it
-- explicitly to anon (landing page visitors) and authenticated callers.
REVOKE ALL ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) TO authenticated;
