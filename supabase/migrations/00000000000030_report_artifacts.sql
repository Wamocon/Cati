BEGIN;

-- Persistent, auditable report artifacts for scoped operational exports.
-- Internal generation is authoritative; external storage remains provider-ready.

CREATE TABLE public.report_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  requested_role TEXT NOT NULL CHECK (requested_role IN ('admin', 'manager', 'accountant')),
  report_type TEXT NOT NULL CHECK (report_type IN (
    'finance_ledger', 'unit_inventory', 'ticket_operations', 'compliance_cases'
  )),
  site_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  filters JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'generating', 'ready', 'failed')),
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  failure_code TEXT,
  failure_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, requested_by, idempotency_key)
);

CREATE TABLE public.report_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_request_id UUID NOT NULL UNIQUE REFERENCES public.report_requests(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL CHECK (report_type IN (
    'finance_ledger', 'unit_inventory', 'ticket_operations', 'compliance_cases'
  )),
  generator_version TEXT NOT NULL DEFAULT 'reporting-v1' CHECK (generator_version = 'reporting-v1'),
  site_ids UUID[] NOT NULL CHECK (cardinality(site_ids) BETWEEN 1 AND 100),
  filters JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (jsonb_typeof(filters) = 'object'),
  format TEXT NOT NULL DEFAULT 'csv' CHECK (format = 'csv'),
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'text/csv; charset=utf-8',
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  sha256_hex TEXT NOT NULL CHECK (sha256_hex ~ '^[0-9a-f]{64}$'),
  source_tables TEXT[] NOT NULL,
  source_snapshot_at TIMESTAMPTZ NOT NULL,
  metrics JSONB NOT NULL DEFAULT '{}'::JSONB,
  limitations TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  storage_mode TEXT NOT NULL DEFAULT 'database' CHECK (storage_mode IN ('database', 'provider_ready')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.report_artifact_payloads (
  artifact_id UUID PRIMARY KEY REFERENCES public.report_artifacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  content_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.report_artifact_commentary (
  artifact_id UUID PRIMARY KEY REFERENCES public.report_artifacts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  commentary TEXT NOT NULL,
  grounding JSONB NOT NULL DEFAULT '{}'::JSONB,
  model_mode TEXT NOT NULL DEFAULT 'deterministic_grounded'
    CHECK (model_mode IN ('deterministic_grounded', 'provider_ready')),
  review_status TEXT NOT NULL DEFAULT 'pending_human_review'
    CHECK (review_status IN ('pending_human_review', 'approved', 'rejected')),
  review_reason TEXT,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE public.report_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  report_request_id UUID NOT NULL REFERENCES public.report_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'queued', 'generating', 'ready', 'failed', 'commentary_approved', 'commentary_rejected'
  )),
  request_version INTEGER NOT NULL CHECK (request_version > 0),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

CREATE TABLE public.report_commentary_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  artifact_id UUID NOT NULL REFERENCES public.report_artifacts(id) ON DELETE CASCADE,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected')),
  reason TEXT NOT NULL,
  expected_version INTEGER NOT NULL CHECK (expected_version > 0),
  resulting_version INTEGER NOT NULL CHECK (resulting_version > expected_version),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

CREATE INDEX report_requests_company_created_idx
  ON public.report_requests(company_id, created_at DESC);
CREATE INDEX report_requests_actor_created_idx
  ON public.report_requests(requested_by, created_at DESC);
CREATE INDEX report_artifacts_company_created_idx
  ON public.report_artifacts(company_id, created_at DESC);

COMMENT ON TABLE public.report_artifacts IS
  'Immutable CSV exports generated from one transaction snapshot with source lineage and checksum.';
COMMENT ON TABLE public.report_artifact_payloads IS
  'Immutable database payloads for internal persistent mode; external object storage is provider-ready.';

CREATE OR REPLACE FUNCTION public.report_csv_cell(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_value TEXT := COALESCE(p_value, '');
BEGIN
  -- Prevent spreadsheet formula execution while preserving the displayed value.
  IF v_value ~ '^[[:space:]]*[=+\-@]' THEN
    v_value := chr(39) || v_value;
  END IF;
  RETURN '"' || replace(v_value, '"', '""') || '"';
END;
$$;

-- Defined before policies and review commands so migration body validation is deterministic.
CREATE OR REPLACE FUNCTION public.report_scope_allowed(
  p_company_id UUID,
  p_report_type TEXT,
  p_site_ids UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
  v_user_company UUID := public.current_user_company_id();
  v_site UUID;
BEGIN
  IF p_company_id IS NULL OR p_company_id IS DISTINCT FROM v_user_company THEN RETURN FALSE; END IF;
  IF v_role = 'admin' THEN RETURN TRUE; END IF;
  IF v_role = 'accountant' THEN RETURN p_report_type = 'finance_ledger'; END IF;
  IF v_role <> 'manager' OR cardinality(p_site_ids) = 0 THEN RETURN FALSE; END IF;
  FOREACH v_site IN ARRAY p_site_ids LOOP
    IF NOT public.current_user_can_manage_site(v_site) THEN RETURN FALSE; END IF;
  END LOOP;
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_report_commentary_v1(
  p_artifact_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_profile_id UUID := auth.uid();
  v_artifact public.report_artifacts%ROWTYPE;
  v_request public.report_requests%ROWTYPE;
  v_commentary public.report_artifact_commentary%ROWTYPE;
  v_review public.report_commentary_reviews%ROWTYPE;
  v_command_fingerprint TEXT;
BEGIN
  IF v_company_id IS NULL OR v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Reporting access denied' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected')
     OR p_expected_version IS NULL OR p_expected_version < 1
     OR length(btrim(COALESCE(p_reason, ''))) < 10
     OR length(btrim(COALESCE(p_reason, ''))) > 1000
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid commentary review command' USING ERRCODE = '22023';
  END IF;
  v_command_fingerprint := encode(extensions.digest(convert_to(
    jsonb_build_object(
      'artifactId', p_artifact_id,
      'expectedVersion', p_expected_version,
      'decision', p_decision,
      'reason', btrim(p_reason)
    )::TEXT,
    'UTF8'
  ), 'sha256'), 'hex');

  SELECT * INTO v_review
  FROM public.report_commentary_reviews
  WHERE company_id = v_company_id
    AND actor_profile_id = v_profile_id
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_review.command_fingerprint <> v_command_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for another review' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_artifact
    FROM public.report_artifacts
    WHERE id = v_review.artifact_id
      AND company_id = v_company_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Report artifact not found' USING ERRCODE = 'P0002';
    END IF;
    SELECT * INTO v_request
    FROM public.report_requests
    WHERE id = v_artifact.report_request_id
      AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.report_scope_allowed(
      v_company_id, v_request.report_type, v_request.site_ids
    ) THEN
      RAISE EXCEPTION 'Reporting scope denied' USING ERRCODE = '42501';
    END IF;
    RETURN jsonb_build_object(
      'replayed', TRUE, 'artifactId', v_review.artifact_id,
      'reviewStatus', v_review.decision, 'version', v_review.resulting_version
    );
  END IF;

  SELECT * INTO v_artifact FROM public.report_artifacts
  WHERE id = p_artifact_id AND company_id = v_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report artifact not found' USING ERRCODE = 'P0002';
  END IF;
  SELECT * INTO v_request FROM public.report_requests
  WHERE id = v_artifact.report_request_id;
  IF NOT public.report_scope_allowed(
    v_company_id, v_request.report_type, v_request.site_ids
  ) THEN
    RAISE EXCEPTION 'Reporting scope denied' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_commentary
  FROM public.report_artifact_commentary
  WHERE artifact_id = p_artifact_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report commentary not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_commentary.version <> p_expected_version THEN
    RAISE EXCEPTION 'Report commentary version conflict' USING ERRCODE = '40001';
  END IF;
  IF v_commentary.review_status <> 'pending_human_review' THEN
    RAISE EXCEPTION 'Report commentary already has a final review' USING ERRCODE = '55000';
  END IF;

  UPDATE public.report_artifact_commentary
  SET review_status = p_decision,
      review_reason = btrim(p_reason),
      reviewed_by = v_profile_id,
      reviewed_at = clock_timestamp(),
      version = version + 1,
      updated_at = clock_timestamp()
  WHERE artifact_id = p_artifact_id
    AND version = p_expected_version
  RETURNING * INTO v_commentary;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report commentary version conflict' USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.report_commentary_reviews (
    company_id, artifact_id, decision, reason, expected_version,
    resulting_version, actor_profile_id, idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, p_artifact_id, p_decision, btrim(p_reason), p_expected_version,
    v_commentary.version, v_profile_id, btrim(p_idempotency_key), v_command_fingerprint
  );
  INSERT INTO public.report_request_events (
    company_id, report_request_id, event_type, request_version,
    actor_profile_id, payload, idempotency_key
  ) VALUES (
    v_company_id, v_request.id, 'commentary_' || p_decision,
    v_request.version + v_commentary.version, v_profile_id,
    jsonb_build_object('artifactId', p_artifact_id, 'reason', btrim(p_reason)),
    btrim(p_idempotency_key) || ':event'
  );

  RETURN jsonb_build_object(
    'replayed', FALSE, 'artifactId', p_artifact_id,
    'reviewStatus', v_commentary.review_status, 'version', v_commentary.version
  );
END;
$$;

ALTER TABLE public.report_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_artifact_payloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_artifact_commentary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_commentary_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_requests_select_scope
  ON public.report_requests FOR SELECT TO authenticated
  USING (public.report_scope_allowed(company_id, report_type, site_ids));

CREATE POLICY report_artifacts_select_scope
  ON public.report_artifacts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.report_requests r
    WHERE r.id = report_artifacts.report_request_id
      AND public.report_scope_allowed(r.company_id, r.report_type, r.site_ids)
  ));

CREATE POLICY report_payloads_select_scope
  ON public.report_artifact_payloads FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.report_artifacts a
    JOIN public.report_requests r ON r.id = a.report_request_id
    WHERE a.id = report_artifact_payloads.artifact_id
      AND public.report_scope_allowed(r.company_id, r.report_type, r.site_ids)
  ));

CREATE POLICY report_commentary_select_scope
  ON public.report_artifact_commentary FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.report_artifacts a
    JOIN public.report_requests r ON r.id = a.report_request_id
    WHERE a.id = report_artifact_commentary.artifact_id
      AND public.report_scope_allowed(r.company_id, r.report_type, r.site_ids)
  ));

CREATE POLICY report_events_select_scope
  ON public.report_request_events FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.report_requests r
    WHERE r.id = report_request_events.report_request_id
      AND public.report_scope_allowed(r.company_id, r.report_type, r.site_ids)
  ));

CREATE POLICY report_reviews_select_scope
  ON public.report_commentary_reviews FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.report_artifacts a
    JOIN public.report_requests r ON r.id = a.report_request_id
    WHERE a.id = report_commentary_reviews.artifact_id
      AND public.report_scope_allowed(r.company_id, r.report_type, r.site_ids)
  ));

REVOKE ALL ON public.report_requests FROM anon, authenticated;
REVOKE ALL ON public.report_artifacts FROM anon, authenticated;
REVOKE ALL ON public.report_artifact_payloads FROM anon, authenticated;
REVOKE ALL ON public.report_artifact_commentary FROM anon, authenticated;
REVOKE ALL ON public.report_request_events FROM anon, authenticated;
REVOKE ALL ON public.report_commentary_reviews FROM anon, authenticated;
GRANT SELECT ON public.report_requests TO authenticated;
GRANT SELECT ON public.report_artifacts TO authenticated;
GRANT SELECT ON public.report_artifact_payloads TO authenticated;
GRANT SELECT ON public.report_artifact_commentary TO authenticated;
GRANT SELECT ON public.report_request_events TO authenticated;
GRANT SELECT ON public.report_commentary_reviews TO authenticated;

REVOKE ALL ON FUNCTION public.report_csv_cell(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.report_scope_allowed(UUID, TEXT, UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.review_report_commentary_v1(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_scope_allowed(UUID, TEXT, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_report_commentary_v1(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.report_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_report_artifact_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Report artifacts and payloads are immutable' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER report_artifacts_immutable
  BEFORE UPDATE OR DELETE ON public.report_artifacts
  FOR EACH ROW EXECUTE FUNCTION public.reject_report_artifact_mutation();
CREATE TRIGGER report_artifact_payloads_immutable
  BEFORE UPDATE OR DELETE ON public.report_artifact_payloads
  FOR EACH ROW EXECUTE FUNCTION public.reject_report_artifact_mutation();

CREATE OR REPLACE FUNCTION public.reject_report_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Report event and review history is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER report_request_events_append_only
  BEFORE UPDATE OR DELETE ON public.report_request_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_report_history_mutation();
CREATE TRIGGER report_commentary_reviews_append_only
  BEFORE UPDATE OR DELETE ON public.report_commentary_reviews
  FOR EACH ROW EXECUTE FUNCTION public.reject_report_history_mutation();

CREATE OR REPLACE FUNCTION public.request_report_generation_v1(
  p_report_type TEXT,
  p_site_ids UUID[] DEFAULT ARRAY[]::UUID[],
  p_filters JSONB DEFAULT '{}'::JSONB,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_profile_id UUID := auth.uid();
  v_role TEXT := public.current_user_profile_role();
  v_sites UUID[] := COALESCE(p_site_ids, ARRAY[]::UUID[]);
  v_fingerprint TEXT;
  v_existing public.report_requests%ROWTYPE;
  v_request public.report_requests%ROWTYPE;
  v_artifact public.report_artifacts%ROWTYPE;
  v_snapshot TIMESTAMPTZ;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
  v_status TEXT;
  v_csv TEXT;
  v_rows INTEGER := 0;
  v_sources TEXT[];
  v_metrics JSONB := '{}'::JSONB;
  v_limitations TEXT[] := ARRAY[]::TEXT[];
  v_file_name TEXT;
  v_commentary TEXT;
  v_error TEXT;
  v_max_rows CONSTANT INTEGER := 50000;
BEGIN
  IF v_company_id IS NULL OR v_profile_id IS NULL OR v_role NOT IN ('admin', 'manager', 'accountant') THEN
    RAISE EXCEPTION 'Reporting access denied' USING ERRCODE = '42501';
  END IF;
  IF p_report_type NOT IN ('finance_ledger', 'unit_inventory', 'ticket_operations', 'compliance_cases') THEN
    RAISE EXCEPTION 'Unsupported report type' USING ERRCODE = '22023';
  END IF;
  IF v_role = 'accountant' AND p_report_type <> 'finance_ledger' THEN
    RAISE EXCEPTION 'Accountants may generate finance ledger reports only' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'A bounded idempotency key is required' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(COALESCE(p_filters, '{}'::JSONB)) <> 'object'
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(COALESCE(p_filters, '{}'::JSONB)) AS k
       WHERE k NOT IN ('from', 'to', 'status')
     ) THEN
    RAISE EXCEPTION 'Report filters contain unsupported fields' USING ERRCODE = '22023';
  END IF;

  -- Stabilize authorization and site scope before it is resolved. SHARE locks
  -- block concurrent row-changing commands until this report transaction ends.
  LOCK TABLE public.profile_site_assignments IN SHARE MODE;
  LOCK TABLE public.sites IN SHARE MODE;

  IF cardinality(v_sites) = 0 THEN
    IF v_role = 'manager' THEN
      SELECT COALESCE(array_agg(s.id ORDER BY s.id), ARRAY[]::UUID[])
        INTO v_sites
      FROM public.sites s
      WHERE s.company_id = v_company_id
        AND public.current_user_can_manage_site(s.id);
    ELSE
      SELECT COALESCE(array_agg(s.id ORDER BY s.id), ARRAY[]::UUID[])
        INTO v_sites
      FROM public.sites s
      WHERE s.company_id = v_company_id;
    END IF;
  ELSE
    SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::UUID[])
      INTO v_sites
    FROM unnest(v_sites) AS x;
  END IF;

  IF cardinality(v_sites) = 0
     OR cardinality(v_sites) > 100
     OR NOT public.report_scope_allowed(v_company_id, p_report_type, v_sites) THEN
    RAISE EXCEPTION 'Reporting scope denied' USING ERRCODE = '42501';
  END IF;
  IF EXISTS (
    SELECT 1 FROM unnest(v_sites) x
    LEFT JOIN public.sites s ON s.id = x AND s.company_id = v_company_id
    WHERE s.id IS NULL
  ) THEN
    RAISE EXCEPTION 'A requested site is outside the company scope' USING ERRCODE = '42501';
  END IF;

  BEGIN
    v_from := NULLIF(p_filters ->> 'from', '')::TIMESTAMPTZ;
    v_to := NULLIF(p_filters ->> 'to', '')::TIMESTAMPTZ;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RAISE EXCEPTION 'Invalid report date range' USING ERRCODE = '22023';
  END;
  v_status := NULLIF(btrim(p_filters ->> 'status'), '');
  IF v_from IS NOT NULL AND v_to IS NOT NULL AND v_to <= v_from THEN
    RAISE EXCEPTION 'Report end must be after start' USING ERRCODE = '22023';
  END IF;
  IF v_from IS NOT NULL AND v_to IS NOT NULL AND v_to - v_from > INTERVAL '366 days' THEN
    RAISE EXCEPTION 'Report range cannot exceed 366 days' USING ERRCODE = '22023';
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(
    jsonb_build_object(
      'version', 'reporting-v1',
      'reportType', p_report_type,
      'siteIds', to_jsonb(v_sites),
      'filters', COALESCE(p_filters, '{}'::JSONB)
    )::TEXT,
    'UTF8'
  ), 'sha256'), 'hex');

  SELECT * INTO v_existing
  FROM public.report_requests
  WHERE company_id = v_company_id
    AND requested_by = v_profile_id
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_existing.request_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used for another report' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_artifact FROM public.report_artifacts
      WHERE report_request_id = v_existing.id;
    RETURN jsonb_build_object(
      'replayed', TRUE,
      'requestId', v_existing.id,
      'status', v_existing.status,
      'artifactId', v_artifact.id
    );
  END IF;

  -- Count, CSV, and metrics below are separate statements. These source locks
  -- make them one stable committed source image under READ COMMITTED.
  LOCK TABLE public.units IN SHARE MODE;
  IF p_report_type = 'finance_ledger' THEN
    LOCK TABLE public.finance_ledger_entries IN SHARE MODE;
  ELSIF p_report_type = 'ticket_operations' THEN
    LOCK TABLE public.service_tickets IN SHARE MODE;
  ELSIF p_report_type = 'compliance_cases' THEN
    LOCK TABLE public.compliance_cases IN SHARE MODE;
  END IF;

  IF p_report_type = 'finance_ledger' AND EXISTS (
    SELECT 1
    FROM public.finance_ledger_entries l
    WHERE l.company_id = v_company_id
      AND l.site_id = ANY(v_sites)
      AND l.unit_id IS NOT NULL
      AND (v_from IS NULL OR l.created_at >= v_from)
      AND (v_to IS NULL OR l.created_at < v_to)
      AND (v_status IS NULL OR l.status = v_status)
      AND NOT EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = l.unit_id
          AND u.company_id = v_company_id
          AND u.site_id = l.site_id
      )
  ) THEN
    RAISE EXCEPTION 'REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT'
      USING ERRCODE = '23514';
  ELSIF p_report_type = 'ticket_operations' AND EXISTS (
    SELECT 1
    FROM public.service_tickets t
    WHERE t.company_id = v_company_id
      AND t.site_id = ANY(v_sites)
      AND t.unit_id IS NOT NULL
      AND (v_from IS NULL OR t.created_at >= v_from)
      AND (v_to IS NULL OR t.created_at < v_to)
      AND (v_status IS NULL OR t.workflow_state = v_status)
      AND NOT EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = t.unit_id
          AND u.company_id = v_company_id
          AND u.site_id = t.site_id
      )
  ) THEN
    RAISE EXCEPTION 'REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT'
      USING ERRCODE = '23514';
  ELSIF p_report_type = 'compliance_cases' AND EXISTS (
    SELECT 1
    FROM public.compliance_cases c
    WHERE c.company_id = v_company_id
      AND c.site_id = ANY(v_sites)
      AND c.unit_id IS NOT NULL
      AND (v_from IS NULL OR c.created_at >= v_from)
      AND (v_to IS NULL OR c.created_at < v_to)
      AND (v_status IS NULL OR c.status = v_status)
      AND NOT EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = c.unit_id
          AND u.company_id = v_company_id
          AND u.site_id = c.site_id
      )
  ) THEN
    RAISE EXCEPTION 'REPORTING_SOURCE_UNIT_SCOPE_INCONSISTENT'
      USING ERRCODE = '23514';
  END IF;
  v_snapshot := clock_timestamp();

  INSERT INTO public.report_requests (
    company_id, requested_by, requested_role, report_type, site_ids, filters,
    status, idempotency_key, request_fingerprint
  ) VALUES (
    v_company_id, v_profile_id, v_role, p_report_type, v_sites,
    COALESCE(p_filters, '{}'::JSONB), 'queued', btrim(p_idempotency_key), v_fingerprint
  ) RETURNING * INTO v_request;

  INSERT INTO public.report_request_events (
    company_id, report_request_id, event_type, request_version,
    actor_profile_id, idempotency_key
  ) VALUES (
    v_company_id, v_request.id, 'queued', 1, v_profile_id,
    btrim(p_idempotency_key) || ':queued'
  );

  UPDATE public.report_requests
  SET status = 'generating', version = 2, started_at = clock_timestamp(), updated_at = clock_timestamp()
  WHERE id = v_request.id
  RETURNING * INTO v_request;
  INSERT INTO public.report_request_events (
    company_id, report_request_id, event_type, request_version,
    actor_profile_id, idempotency_key
  ) VALUES (
    v_company_id, v_request.id, 'generating', 2, v_profile_id,
    btrim(p_idempotency_key) || ':generating'
  );

  BEGIN
    IF p_report_type = 'finance_ledger' THEN
      v_sources := ARRAY['public.finance_ledger_entries', 'public.sites', 'public.units'];
      SELECT count(*)::INTEGER INTO v_rows
      FROM public.finance_ledger_entries l
      WHERE l.company_id = v_company_id AND l.site_id = ANY(v_sites)
        AND (v_from IS NULL OR l.created_at >= v_from)
        AND (v_to IS NULL OR l.created_at < v_to)
        AND (v_status IS NULL OR l.status = v_status);
      IF v_rows > v_max_rows THEN
        RAISE EXCEPTION 'Report exceeds the 50000-row internal artifact limit; use the provider-ready bulk export path' USING ERRCODE = '54000';
      END IF;
      SELECT '"ledger_id","site","unit","entry_type","period","due_date","paid_at","status","amount_cents","currency","description","updated_at"'
        || COALESCE(E'\n' || string_agg(
          public.report_csv_cell(l.id::TEXT) || ',' || public.report_csv_cell(s.name) || ',' ||
          public.report_csv_cell(u.unit_no) || ',' || public.report_csv_cell(l.entry_type) || ',' ||
          public.report_csv_cell(l.period) || ',' || public.report_csv_cell(l.due_date::TEXT) || ',' ||
          public.report_csv_cell(l.paid_at::TEXT) || ',' || public.report_csv_cell(l.status) || ',' ||
          public.report_csv_cell(l.amount_cents::TEXT) || ',' || public.report_csv_cell(l.currency) || ',' ||
          public.report_csv_cell(l.description) || ',' || public.report_csv_cell(l.updated_at::TEXT),
          E'\n' ORDER BY l.created_at, l.id
        ), '') INTO v_csv
      FROM public.finance_ledger_entries l
      JOIN public.sites s
        ON s.id = l.site_id
       AND s.company_id = v_company_id
      LEFT JOIN public.units u
        ON u.id = l.unit_id
       AND u.company_id = v_company_id
       AND u.site_id = l.site_id
      WHERE l.company_id = v_company_id AND l.site_id = ANY(v_sites)
        AND (v_from IS NULL OR l.created_at >= v_from)
        AND (v_to IS NULL OR l.created_at < v_to)
        AND (v_status IS NULL OR l.status = v_status);
      SELECT jsonb_build_object(
        'rows', v_rows,
        'amountCents', COALESCE(sum(l.amount_cents), 0),
        'currencyCount', count(DISTINCT l.currency)
      ) INTO v_metrics
      FROM public.finance_ledger_entries l
      WHERE l.company_id = v_company_id AND l.site_id = ANY(v_sites)
        AND (v_from IS NULL OR l.created_at >= v_from)
        AND (v_to IS NULL OR l.created_at < v_to)
        AND (v_status IS NULL OR l.status = v_status);
      v_limitations := ARRAY['Amounts are exported in source currencies and are not exchange-rate normalized.'];

    ELSIF p_report_type = 'unit_inventory' THEN
      v_sources := ARRAY['public.units', 'public.sites'];
      SELECT count(*)::INTEGER INTO v_rows
      FROM public.units u
      WHERE u.company_id = v_company_id AND u.site_id = ANY(v_sites)
        AND (v_from IS NULL OR u.created_at >= v_from)
        AND (v_to IS NULL OR u.created_at < v_to)
        AND (v_status IS NULL OR u.occupancy_status = v_status);
      IF v_rows > v_max_rows THEN
        RAISE EXCEPTION 'Report exceeds the 50000-row internal artifact limit; use the provider-ready bulk export path' USING ERRCODE = '54000';
      END IF;
      SELECT '"unit_id","site","unit_no","unit_type","size_sqm","bedrooms","occupancy_status","ownership_status","updated_at"'
        || COALESCE(E'\n' || string_agg(
          public.report_csv_cell(u.id::TEXT) || ',' || public.report_csv_cell(s.name) || ',' ||
          public.report_csv_cell(u.unit_no) || ',' || public.report_csv_cell(u.unit_type) || ',' ||
          public.report_csv_cell(u.size_sqm::TEXT) || ',' || public.report_csv_cell(u.bedrooms::TEXT) || ',' ||
          public.report_csv_cell(u.occupancy_status) || ',' || public.report_csv_cell(u.ownership_status) || ',' ||
          public.report_csv_cell(u.updated_at::TEXT), E'\n' ORDER BY s.name, u.unit_no, u.id
        ), '') INTO v_csv
      FROM public.units u
      JOIN public.sites s
        ON s.id = u.site_id
       AND s.company_id = v_company_id
      WHERE u.company_id = v_company_id AND u.site_id = ANY(v_sites)
        AND (v_from IS NULL OR u.created_at >= v_from)
        AND (v_to IS NULL OR u.created_at < v_to)
        AND (v_status IS NULL OR u.occupancy_status = v_status);
      SELECT jsonb_build_object(
        'rows', v_rows,
        'occupied', count(*) FILTER (WHERE u.occupancy_status = 'occupied'),
        'vacant', count(*) FILTER (WHERE u.occupancy_status = 'vacant'),
        'reserved', count(*) FILTER (WHERE u.occupancy_status = 'reserved')
      ) INTO v_metrics
      FROM public.units u
      WHERE u.company_id = v_company_id AND u.site_id = ANY(v_sites)
        AND (v_from IS NULL OR u.created_at >= v_from)
        AND (v_to IS NULL OR u.created_at < v_to)
        AND (v_status IS NULL OR u.occupancy_status = v_status);
      v_limitations := ARRAY['Inventory reflects the committed database snapshot, not an external listing portal.'];

    ELSIF p_report_type = 'ticket_operations' THEN
      v_sources := ARRAY['public.service_tickets', 'public.sites', 'public.units'];
      SELECT count(*)::INTEGER INTO v_rows
      FROM public.service_tickets t
      WHERE t.company_id = v_company_id AND t.site_id = ANY(v_sites)
        AND (v_from IS NULL OR t.created_at >= v_from)
        AND (v_to IS NULL OR t.created_at < v_to)
        AND (v_status IS NULL OR t.workflow_state = v_status);
      IF v_rows > v_max_rows THEN
        RAISE EXCEPTION 'Report exceeds the 50000-row internal artifact limit; use the provider-ready bulk export path' USING ERRCODE = '54000';
      END IF;
      SELECT '"ticket_id","ticket_no","site","unit","title","category","priority","status","workflow_state","sla_due_at","created_at","updated_at"'
        || COALESCE(E'\n' || string_agg(
          public.report_csv_cell(t.id::TEXT) || ',' || public.report_csv_cell(t.ticket_no) || ',' ||
          public.report_csv_cell(s.name) || ',' || public.report_csv_cell(u.unit_no) || ',' ||
          public.report_csv_cell(t.title) || ',' || public.report_csv_cell(t.category) || ',' ||
          public.report_csv_cell(t.priority) || ',' || public.report_csv_cell(t.status) || ',' ||
          public.report_csv_cell(t.workflow_state) || ',' || public.report_csv_cell(t.sla_due_at::TEXT) || ',' ||
          public.report_csv_cell(t.created_at::TEXT) || ',' || public.report_csv_cell(t.updated_at::TEXT),
          E'\n' ORDER BY t.created_at, t.id
        ), '') INTO v_csv
      FROM public.service_tickets t
      JOIN public.sites s
        ON s.id = t.site_id
       AND s.company_id = v_company_id
      LEFT JOIN public.units u
        ON u.id = t.unit_id
       AND u.company_id = v_company_id
       AND u.site_id = t.site_id
      WHERE t.company_id = v_company_id AND t.site_id = ANY(v_sites)
        AND (v_from IS NULL OR t.created_at >= v_from)
        AND (v_to IS NULL OR t.created_at < v_to)
        AND (v_status IS NULL OR t.workflow_state = v_status);
      SELECT jsonb_build_object(
        'rows', v_rows,
        'urgent', count(*) FILTER (WHERE t.priority = 'urgent'),
        'overdueSla', count(*) FILTER (WHERE t.sla_due_at < v_snapshot AND t.status NOT IN ('resolved','closed','cancelled'))
      ) INTO v_metrics
      FROM public.service_tickets t
      WHERE t.company_id = v_company_id AND t.site_id = ANY(v_sites)
        AND (v_from IS NULL OR t.created_at >= v_from)
        AND (v_to IS NULL OR t.created_at < v_to)
        AND (v_status IS NULL OR t.workflow_state = v_status);
      v_limitations := ARRAY['Operational durations are inferred from current ticket fields; event-level cycle-time analysis is not included.'];

    ELSE
      v_sources := ARRAY['public.compliance_cases', 'public.sites', 'public.units'];
      SELECT count(*)::INTEGER INTO v_rows
      FROM public.compliance_cases c
      WHERE c.company_id = v_company_id AND c.site_id = ANY(v_sites)
        AND (v_from IS NULL OR c.created_at >= v_from)
        AND (v_to IS NULL OR c.created_at < v_to)
        AND (v_status IS NULL OR c.status = v_status);
      IF v_rows > v_max_rows THEN
        RAISE EXCEPTION 'Report exceeds the 50000-row internal artifact limit; use the provider-ready bulk export path' USING ERRCODE = '54000';
      END IF;
      SELECT '"case_id","case_no","site","unit","case_type","subject_name","status","risk_level","blocker","next_action","execution_mode","provider_status","updated_at"'
        || COALESCE(E'\n' || string_agg(
          public.report_csv_cell(c.id::TEXT) || ',' || public.report_csv_cell(c.case_no) || ',' ||
          public.report_csv_cell(s.name) || ',' || public.report_csv_cell(u.unit_no) || ',' ||
          public.report_csv_cell(c.case_type) || ',' || public.report_csv_cell(c.subject_name) || ',' ||
          public.report_csv_cell(c.status) || ',' || public.report_csv_cell(c.risk_level) || ',' ||
          public.report_csv_cell(c.blocker) || ',' || public.report_csv_cell(c.next_action) || ',' ||
          public.report_csv_cell(c.execution_mode) || ',' || public.report_csv_cell(c.provider_status) || ',' ||
          public.report_csv_cell(c.updated_at::TEXT), E'\n' ORDER BY c.created_at, c.id
        ), '') INTO v_csv
      FROM public.compliance_cases c
      JOIN public.sites s
        ON s.id = c.site_id
       AND s.company_id = v_company_id
      LEFT JOIN public.units u
        ON u.id = c.unit_id
       AND u.company_id = v_company_id
       AND u.site_id = c.site_id
      WHERE c.company_id = v_company_id AND c.site_id = ANY(v_sites)
        AND (v_from IS NULL OR c.created_at >= v_from)
        AND (v_to IS NULL OR c.created_at < v_to)
        AND (v_status IS NULL OR c.status = v_status);
      SELECT jsonb_build_object(
        'rows', v_rows,
        'highOrCritical', count(*) FILTER (WHERE c.risk_level IN ('high','critical')),
        'humanDecisionRequired', count(*) FILTER (WHERE c.human_decision_required)
      ) INTO v_metrics
      FROM public.compliance_cases c
      WHERE c.company_id = v_company_id AND c.site_id = ANY(v_sites)
        AND (v_from IS NULL OR c.created_at >= v_from)
        AND (v_to IS NULL OR c.created_at < v_to)
        AND (v_status IS NULL OR c.status = v_status);
      v_limitations := ARRAY['Commentary is informational; every compliance decision remains human-controlled.'];
    END IF;

    v_file_name := p_report_type || '-' || to_char(v_snapshot AT TIME ZONE 'UTC', 'YYYYMMDD-HH24MISS') || '.csv';
    INSERT INTO public.report_artifacts (
      company_id, report_request_id, report_type, generator_version, site_ids, filters,
      file_name, byte_size, row_count,
      sha256_hex, source_tables, source_snapshot_at, metrics, limitations, created_by
    ) VALUES (
      v_company_id, v_request.id, p_report_type, 'reporting-v1', v_sites,
      COALESCE(p_filters, '{}'::JSONB), v_file_name,
      octet_length(convert_to(v_csv, 'UTF8')), v_rows,
      encode(extensions.digest(convert_to(v_csv, 'UTF8'), 'sha256'), 'hex'),
      v_sources, v_snapshot, v_metrics, v_limitations, v_profile_id
    ) RETURNING * INTO v_artifact;

    INSERT INTO public.report_artifact_payloads (artifact_id, company_id, content_text)
    VALUES (v_artifact.id, v_company_id, v_csv);

    v_commentary := format(
      '%s export contains %s source rows from a transaction snapshot at %s. Review the metrics, source lineage, filters, and stated limitations before operational use.',
      replace(initcap(replace(p_report_type, '_', ' ')), '  ', ' '), v_rows, v_snapshot
    );
    INSERT INTO public.report_artifact_commentary (
      artifact_id, company_id, commentary, grounding
    ) VALUES (
      v_artifact.id, v_company_id, v_commentary,
      jsonb_build_object(
        'sourceTables', to_jsonb(v_sources),
        'snapshotAt', v_snapshot,
        'filters', COALESCE(p_filters, '{}'::JSONB),
        'metrics', v_metrics,
        'limitations', to_jsonb(v_limitations)
      )
    );

    UPDATE public.report_requests
    SET status = 'ready', version = 3, completed_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = v_request.id
    RETURNING * INTO v_request;
    INSERT INTO public.report_request_events (
      company_id, report_request_id, event_type, request_version,
      actor_profile_id, payload, idempotency_key
    ) VALUES (
      v_company_id, v_request.id, 'ready', 3, v_profile_id,
      jsonb_build_object('artifactId', v_artifact.id, 'rows', v_rows, 'sha256', v_artifact.sha256_hex),
      btrim(p_idempotency_key) || ':ready'
    );
  EXCEPTION WHEN OTHERS THEN
    v_error := left(SQLERRM, 500);
    UPDATE public.report_requests
    SET status = 'failed', version = 3, failure_code = SQLSTATE,
        failure_message = v_error, completed_at = clock_timestamp(), updated_at = clock_timestamp()
    WHERE id = v_request.id
    RETURNING * INTO v_request;
    INSERT INTO public.report_request_events (
      company_id, report_request_id, event_type, request_version,
      actor_profile_id, payload, idempotency_key
    ) VALUES (
      v_company_id, v_request.id, 'failed', 3, v_profile_id,
      jsonb_build_object('code', SQLSTATE), btrim(p_idempotency_key) || ':failed'
    );
  END;

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'requestId', v_request.id,
    'status', v_request.status,
    'artifactId', v_artifact.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.request_report_generation_v1(TEXT, UUID[], JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_report_generation_v1(TEXT, UUID[], JSONB, TEXT) TO authenticated;

COMMIT;
