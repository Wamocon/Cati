-- Phase 9 / use case 20 hardening: immutable service-order proof.
--
-- Staff may submit evidence only for the exact task assigned to their profile.
-- Organization administrators and site managers may submit an operational
-- override only with a reason. Binary objects stay in a private bucket; a
-- database row never implies that an object was uploaded or malware-scanned.

ALTER TABLE public.media_reports
  ADD COLUMN IF NOT EXISTS service_order_id UUID
    REFERENCES public.service_orders(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS submitted_by_profile_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS submitter_role TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS safe_filename TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS upload_status TEXT NOT NULL DEFAULT 'provider_not_connected',
  ADD COLUMN IF NOT EXISTS virus_scan_status TEXT NOT NULL DEFAULT 'not_connected',
  ADD COLUMN IF NOT EXISTS review_version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS reviewed_by_profile_id UUID
    REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT,
  ADD COLUMN IF NOT EXISTS override_reason TEXT,
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.media_reports
  DROP CONSTRAINT IF EXISTS media_reports_upload_status_check,
  DROP CONSTRAINT IF EXISTS media_reports_virus_scan_status_check,
  DROP CONSTRAINT IF EXISTS media_reports_review_version_check,
  DROP CONSTRAINT IF EXISTS media_reports_size_bytes_check,
  DROP CONSTRAINT IF EXISTS media_reports_checksum_sha256_check,
  DROP CONSTRAINT IF EXISTS media_reports_accepted_truth_check;

ALTER TABLE public.media_reports
  ADD CONSTRAINT media_reports_upload_status_check CHECK (
    upload_status IN (
      'requested', 'stored', 'failed', 'provider_not_connected', 'not_required'
    )
  ),
  ADD CONSTRAINT media_reports_virus_scan_status_check CHECK (
    virus_scan_status IN (
      'pending', 'clean', 'rejected', 'not_connected', 'not_applicable'
    )
  ),
  ADD CONSTRAINT media_reports_review_version_check CHECK (review_version > 0),
  ADD CONSTRAINT media_reports_size_bytes_check CHECK (
    size_bytes IS NULL OR size_bytes > 0
  ),
  ADD CONSTRAINT media_reports_checksum_sha256_check CHECK (
    checksum_sha256 IS NULL OR checksum_sha256 ~ '^[0-9a-f]{64}$'
  ),
  ADD CONSTRAINT media_reports_accepted_truth_check CHECK (
    verification_status <> 'accepted'
    OR media_type = 'note'
    OR (
      upload_status = 'stored'
      AND virus_scan_status = 'clean'
      AND storage_bucket = 'cati-service-evidence'
      AND storage_path IS NOT NULL
    )
  ) NOT VALID;

-- Legacy rows are retained, but old records without explicit scan provenance
-- are not represented as accepted binary evidence.
UPDATE public.media_reports
SET
  upload_status = CASE
    WHEN media_type = 'note' THEN 'not_required'
    WHEN storage_path IS NULL THEN 'provider_not_connected'
    ELSE 'requested'
  END,
  virus_scan_status = CASE
    WHEN media_type = 'note' THEN 'not_applicable'
    WHEN storage_path IS NULL THEN 'not_connected'
    ELSE 'pending'
  END,
  verification_status = CASE
    WHEN media_type = 'note' THEN verification_status
    WHEN verification_status = 'accepted' THEN 'pending'
    ELSE verification_status
  END,
  storage_bucket = CASE
    WHEN storage_path IS NULL THEN NULL
    ELSE COALESCE(storage_bucket, 'cati-service-evidence')
  END,
  updated_at = NOW()
WHERE request_fingerprint IS NULL;

ALTER TABLE public.media_reports
  VALIDATE CONSTRAINT media_reports_accepted_truth_check;

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_reports_idempotency
  ON public.media_reports(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_media_reports_review_queue
  ON public.media_reports(company_id, site_id, verification_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_reports_task_created
  ON public.media_reports(workforce_task_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.service_evidence_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  evidence_id UUID NOT NULL REFERENCES public.media_reports(id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  workforce_task_id UUID NOT NULL REFERENCES public.workforce_tasks(id) ON DELETE CASCADE,
  event_version INTEGER NOT NULL CHECK (event_version > 0),
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'submitted', 'upload_stored', 'upload_failed', 'scan_clean',
      'scan_rejected', 'accepted', 'rejected'
    )
  ),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (evidence_id, event_version),
  UNIQUE (company_id, idempotency_key)
);

COMMENT ON TABLE public.service_evidence_events IS
  'Append-only evidence submission, storage, scan and human-review history.';

ALTER TABLE public.service_evidence_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_is_exact_task_assignee(
  p_workforce_task_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.workforce_tasks w
      JOIN public.staff_members sm
        ON sm.id = w.assigned_staff_member_id
       AND sm.company_id = w.company_id
     WHERE w.id = p_workforce_task_id
       AND sm.profile_id = (SELECT auth.uid())
       AND sm.status IN ('active', 'training')
       AND w.status NOT IN ('closed', 'cancelled')
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_is_exact_task_assignee(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_is_exact_task_assignee(UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.current_user_can_view_service_evidence(
  p_evidence_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.media_reports%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_evidence
    FROM public.media_reports m
   WHERE m.id = p_evidence_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_evidence.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  RETURN CASE v_role
    WHEN 'admin' THEN public.current_user_is_organization_admin(v_evidence.company_id)
    WHEN 'manager' THEN
      v_evidence.site_id IS NOT NULL
      AND public.current_user_can_manage_site(v_evidence.site_id)
    WHEN 'staff' THEN
      v_evidence.workforce_task_id IS NOT NULL
      AND public.current_user_is_exact_task_assignee(v_evidence.workforce_task_id)
    WHEN 'owner' THEN
      v_evidence.verification_status = 'accepted'
      AND v_evidence.ticket_id IS NOT NULL
      AND public.current_user_can_view_service_ticket(v_evidence.ticket_id)
    WHEN 'tenant' THEN
      v_evidence.verification_status = 'accepted'
      AND v_evidence.ticket_id IS NOT NULL
      AND public.current_user_can_view_service_ticket(v_evidence.ticket_id)
    ELSE FALSE
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_can_view_service_evidence(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_service_evidence(UUID)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.next_service_evidence_event_version(
  p_evidence_id UUID
)
RETURNS INTEGER
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(MAX(e.event_version), 0) + 1
    FROM public.service_evidence_events e
   WHERE e.evidence_id = p_evidence_id;
$$;

-- Internal helper only. Keeping this SECURITY DEFINER function off the public
-- RPC surface avoids leaking event counts across RLS boundaries.
REVOKE ALL ON FUNCTION public.next_service_evidence_event_version(UUID)
  FROM PUBLIC, anon, authenticated;

-- Command RPCs must never return the composite media_reports row. The explicit
-- projection keeps operational UI fields while excluding object paths,
-- checksums, idempotency/fingerprint material and profile identifiers.
CREATE OR REPLACE FUNCTION public.service_evidence_operational_projection(
  p_evidence public.media_reports,
  p_replayed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', (p_evidence).id,
    'ticket_id', (p_evidence).ticket_id,
    'workforce_task_id', (p_evidence).workforce_task_id,
    'service_order_id', (p_evidence).service_order_id,
    'media_type', (p_evidence).media_type,
    'caption', (p_evidence).caption,
    'original_filename', (p_evidence).original_filename,
    'mime_type', (p_evidence).mime_type,
    'size_bytes', (p_evidence).size_bytes,
    'upload_status', (p_evidence).upload_status,
    'virus_scan_status', (p_evidence).virus_scan_status,
    'verification_status', (p_evidence).verification_status,
    'review_version', (p_evidence).review_version,
    'submitter_role', (p_evidence).submitter_role,
    'created_at', (p_evidence).created_at,
    'reviewed_at', (p_evidence).reviewed_at,
    'review_reason', (p_evidence).review_reason,
    'override_reason', (p_evidence).override_reason,
    'can_open_file', (
      (p_evidence).media_type <> 'note'
      AND (p_evidence).upload_status = 'stored'
      AND (p_evidence).virus_scan_status = 'clean'
    ),
    'replayed', p_replayed
  );
$$;

REVOKE ALL ON FUNCTION public.service_evidence_operational_projection(
  public.media_reports, BOOLEAN
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_service_evidence_command(
  p_ticket_id UUID,
  p_workforce_task_id UUID,
  p_media_type TEXT,
  p_caption TEXT,
  p_original_filename TEXT,
  p_safe_filename TEXT,
  p_mime_type TEXT,
  p_size_bytes BIGINT,
  p_checksum_sha256 TEXT,
  p_live_storage BOOLEAN,
  p_override_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_actor_company_id UUID := public.current_user_company_id();
  v_task public.workforce_tasks%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
  v_order public.service_orders%ROWTYPE;
  v_existing public.media_reports%ROWTYPE;
  v_result public.media_reports%ROWTYPE;
  v_evidence_id UUID := gen_random_uuid();
  v_media_type TEXT := lower(BTRIM(COALESCE(p_media_type, '')));
  v_caption TEXT := NULLIF(BTRIM(COALESCE(p_caption, '')), '');
  v_safe_filename TEXT := lower(BTRIM(COALESCE(p_safe_filename, '')));
  v_mime_type TEXT := lower(BTRIM(COALESCE(p_mime_type, '')));
  v_checksum TEXT := lower(BTRIM(COALESCE(p_checksum_sha256, '')));
  v_override_reason TEXT := NULLIF(BTRIM(COALESCE(p_override_reason, '')), '');
  v_key TEXT := BTRIM(COALESCE(p_idempotency_key, ''));
  v_fingerprint TEXT;
  v_storage_path TEXT;
  v_event_visibility TEXT := 'internal';
BEGIN
  IF v_actor_id IS NULL OR v_actor_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication and company membership are required';
  END IF;

  IF length(v_key) < 8 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  IF v_media_type NOT IN ('photo', 'video', 'note') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Evidence type must be photo, video or note';
  END IF;

  IF v_caption IS NULL OR length(v_caption) < 3 OR length(v_caption) > 2000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A note between 3 and 2000 characters is required';
  END IF;

  SELECT * INTO v_task
    FROM public.workforce_tasks w
   WHERE w.id = p_workforce_task_id
   FOR UPDATE;

  IF NOT FOUND OR v_task.ticket_id IS DISTINCT FROM p_ticket_id THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'The task does not belong to the requested ticket';
  END IF;

  SELECT * INTO v_ticket
    FROM public.service_tickets t
   WHERE t.id = p_ticket_id
     AND t.company_id = v_task.company_id
     AND t.site_id = v_task.site_id
   FOR UPDATE;

  IF NOT FOUND OR v_ticket.company_id IS DISTINCT FROM v_actor_company_id THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The ticket is outside your company scope';
  END IF;

  IF v_task.status IN ('closed', 'cancelled')
     OR v_ticket.workflow_state IN ('closed', 'cancelled')
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Closed or cancelled work cannot receive new evidence';
  END IF;

  IF v_actor_role = 'staff' THEN
    IF NOT public.current_user_is_exact_task_assignee(v_task.id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the staff member assigned to this exact task may add evidence';
    END IF;
    IF v_override_reason IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Staff submissions cannot use a manager override';
    END IF;
  ELSIF v_actor_role = 'manager' THEN
    IF NOT public.current_user_can_manage_site(v_task.site_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The task is outside your managed-site scope';
    END IF;
    IF v_override_reason IS NULL OR length(v_override_reason) < 10 OR length(v_override_reason) > 1000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A manager override reason between 10 and 1000 characters is required';
    END IF;
  ELSIF v_actor_role = 'admin' OR public.is_platform_super_admin() THEN
    IF NOT public.is_platform_super_admin()
       AND NOT public.current_user_is_organization_admin(v_task.company_id)
    THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Organization administrator authority is required';
    END IF;
    IF v_override_reason IS NULL OR length(v_override_reason) < 10 OR length(v_override_reason) > 1000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An administrator override reason between 10 and 1000 characters is required';
    END IF;
  ELSE
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'This role cannot add service evidence';
  END IF;

  IF v_media_type = 'note' THEN
    IF p_original_filename IS NOT NULL OR p_safe_filename IS NOT NULL
       OR p_mime_type IS NOT NULL OR p_size_bytes IS NOT NULL
       OR p_checksum_sha256 IS NOT NULL
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Note evidence cannot include binary file metadata';
    END IF;
  ELSE
    IF v_safe_filename = '' OR v_safe_filename !~ '^[a-z0-9][a-z0-9._-]{0,119}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'The evidence filename is invalid';
    END IF;
    IF v_checksum !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A SHA-256 checksum is required';
    END IF;
    IF v_media_type = 'photo' AND (
      v_mime_type NOT IN ('image/jpeg', 'image/png', 'image/webp')
      OR p_size_bytes IS NULL OR p_size_bytes < 1 OR p_size_bytes > 10485760
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Photos must be JPEG, PNG or WebP and no larger than 10 MB';
    END IF;
    IF v_media_type = 'video' AND (
      v_mime_type NOT IN ('video/mp4', 'video/quicktime', 'video/webm')
      OR p_size_bytes IS NULL OR p_size_bytes < 1 OR p_size_bytes > 52428800
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Videos must be MP4, MOV or WebM and no larger than 50 MB';
    END IF;
  END IF;

  SELECT * INTO v_order
    FROM public.service_orders o
   WHERE o.id = v_task.service_order_id
     AND o.ticket_id = v_ticket.id
     AND o.company_id = v_ticket.company_id;

  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'ticketId', v_ticket.id,
    'workforceTaskId', v_task.id,
    'mediaType', v_media_type,
    'caption', v_caption,
    'safeFilename', COALESCE(v_safe_filename, ''),
    'mimeType', COALESCE(v_mime_type, ''),
    'sizeBytes', p_size_bytes,
    'checksumSha256', COALESCE(v_checksum, ''),
    'overrideReason', COALESCE(v_override_reason, ''),
    'liveStorage', COALESCE(p_live_storage, FALSE)
  )::TEXT, 'UTF8'), 'sha256'), 'hex');

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_ticket.company_id::TEXT || ':' || v_actor_id::TEXT || ':' || v_key, 0)
  );

  SELECT * INTO v_existing
    FROM public.media_reports m
   WHERE m.company_id = v_ticket.company_id
     AND m.idempotency_key = v_key;

  IF FOUND THEN
    IF v_existing.submitted_by_profile_id IS DISTINCT FROM v_actor_id
       OR v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The idempotency key was already used for different evidence';
    END IF;
    RETURN public.service_evidence_operational_projection(v_existing, TRUE);
  END IF;

  IF v_media_type <> 'note' THEN
    v_storage_path := concat_ws('/',
      v_ticket.company_id::TEXT,
      v_ticket.site_id::TEXT,
      v_ticket.id::TEXT,
      v_task.id::TEXT,
      v_evidence_id::TEXT,
      v_safe_filename
    );
  END IF;

  INSERT INTO public.media_reports (
    id, company_id, site_id, ticket_id, workforce_task_id, service_order_id,
    uploaded_by_staff_member_id, submitted_by_profile_id, submitter_role,
    media_type, storage_path, caption, verification_status, original_filename,
    safe_filename, mime_type, size_bytes, checksum_sha256, storage_bucket,
    upload_status, virus_scan_status, review_version, override_reason,
    request_fingerprint, idempotency_key, metadata
  ) VALUES (
    v_evidence_id, v_ticket.company_id, v_ticket.site_id, v_ticket.id, v_task.id,
    v_order.id,
    CASE WHEN v_actor_role = 'staff' THEN v_task.assigned_staff_member_id ELSE NULL END,
    v_actor_id, v_actor_role, v_media_type, v_storage_path, v_caption, 'pending',
    NULLIF(BTRIM(COALESCE(p_original_filename, '')), ''),
    CASE WHEN v_media_type = 'note' THEN NULL ELSE v_safe_filename END,
    CASE WHEN v_media_type = 'note' THEN NULL ELSE v_mime_type END,
    CASE WHEN v_media_type = 'note' THEN NULL ELSE p_size_bytes END,
    CASE WHEN v_media_type = 'note' THEN NULL ELSE v_checksum END,
    CASE WHEN v_media_type = 'note' THEN NULL ELSE 'cati-service-evidence' END,
    CASE
      WHEN v_media_type = 'note' THEN 'not_required'
      WHEN COALESCE(p_live_storage, FALSE) THEN 'requested'
      ELSE 'provider_not_connected'
    END,
    CASE
      WHEN v_media_type = 'note' THEN 'not_applicable'
      WHEN COALESCE(p_live_storage, FALSE) THEN 'pending'
      ELSE 'not_connected'
    END,
    1, v_override_reason, v_fingerprint, v_key,
    jsonb_build_object(
      'storageProvider', CASE WHEN COALESCE(p_live_storage, FALSE) THEN 'supabase-storage' ELSE 'not-connected' END,
      'privateObject', v_media_type <> 'note',
      'override', v_actor_role IN ('manager', 'admin') OR public.is_platform_super_admin()
    )
  ) RETURNING * INTO v_result;

  INSERT INTO public.service_evidence_events (
    company_id, evidence_id, ticket_id, workforce_task_id, event_version,
    event_type, actor_profile_id, actor_role, reason, payload, idempotency_key
  ) VALUES (
    v_result.company_id, v_result.id, v_result.ticket_id, v_result.workforce_task_id,
    1, 'submitted', v_actor_id, v_actor_role, COALESCE(v_override_reason, v_caption),
    jsonb_build_object(
      'mediaType', v_media_type,
      'uploadStatus', v_result.upload_status,
      'virusScanStatus', v_result.virus_scan_status
    ),
    'event:' || v_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, ticket_version, idempotency_key
  ) VALUES (
    v_ticket.company_id, v_ticket.id, 'evidence_submitted',
    'Service evidence was submitted for human review.', v_actor_id,
    jsonb_build_object(
      'evidenceId', v_result.id,
      'workforceTaskId', v_task.id,
      'mediaType', v_media_type,
      'uploadStatus', v_result.upload_status
    ),
    v_event_visibility, v_ticket.workflow_version, 'ticket-event:' || v_key
  );

  UPDATE public.workforce_tasks
     SET media_count = (
           SELECT COUNT(*)::INTEGER FROM public.media_reports m
            WHERE m.workforce_task_id = v_task.id
         ),
         manager_approval_required = TRUE,
         completion_readiness = GREATEST(completion_readiness, 65),
         updated_at = NOW()
   WHERE id = v_task.id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    after_data, idempotency_key
  ) VALUES (
    v_ticket.company_id, v_actor_id, 'service_evidence.submitted',
    'media_reports', v_result.id,
    jsonb_build_object(
      'ticketId', v_ticket.id,
      'workforceTaskId', v_task.id,
      'mediaType', v_media_type,
      'uploadStatus', v_result.upload_status,
      'overrideReason', v_override_reason
    ),
    'audit:' || v_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_ticket.company_id, 'internal_event_bus', 'service_evidence.submitted',
    'media_reports', v_result.id,
    jsonb_build_object(
      'evidenceId', v_result.id,
      'ticketId', v_ticket.id,
      'workforceTaskId', v_task.id,
      'requiresHumanReview', TRUE
    ),
    'queued', 'service-evidence-submit:' || v_result.id::TEXT
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
      WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN public.service_evidence_operational_projection(v_result, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_service_evidence_upload_command(
  p_evidence_id UUID,
  p_outcome TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.media_reports%ROWTYPE;
  v_existing_event public.service_evidence_events%ROWTYPE;
  v_event_version INTEGER;
  v_outcome TEXT := lower(BTRIM(COALESCE(p_outcome, '')));
  v_key TEXT := BTRIM(COALESCE(p_idempotency_key, ''));
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the private upload service may complete an upload';
  END IF;
  IF v_outcome NOT IN ('stored', 'failed') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Upload outcome must be stored or failed';
  END IF;
  IF length(v_key) < 8 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid idempotency key is required';
  END IF;

  SELECT * INTO v_evidence FROM public.media_reports m
   WHERE m.id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Evidence was not found';
  END IF;
  IF v_evidence.media_type = 'note' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Note evidence does not have an upload';
  END IF;

  SELECT * INTO v_existing_event FROM public.service_evidence_events e
   WHERE e.company_id = v_evidence.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing_event.evidence_id IS DISTINCT FROM v_evidence.id
       OR v_existing_event.event_type IS DISTINCT FROM
           CASE WHEN v_outcome = 'stored' THEN 'upload_stored' ELSE 'upload_failed' END
       OR v_existing_event.payload ->> 'uploadStatus' IS DISTINCT FROM v_outcome
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The idempotency key was already used for another upload result';
    END IF;
    RETURN public.service_evidence_operational_projection(v_evidence, TRUE);
  END IF;

  IF v_evidence.upload_status <> 'requested'
     OR v_evidence.virus_scan_status <> 'pending'
     OR v_evidence.verification_status <> 'pending'
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Upload result can be recorded only once from the requested state';
  END IF;

  PERFORM set_config('app.allow_service_evidence_state_change', 'on', TRUE);
  UPDATE public.media_reports
     SET upload_status = v_outcome,
          virus_scan_status = CASE WHEN v_outcome = 'stored' THEN 'pending' ELSE 'not_connected' END,
          updated_at = NOW()
   WHERE id = v_evidence.id
     AND upload_status = 'requested'
     AND virus_scan_status = 'pending'
     AND verification_status = 'pending'
   RETURNING * INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Upload state changed before completion';
  END IF;

  v_event_version := public.next_service_evidence_event_version(v_evidence.id);
  INSERT INTO public.service_evidence_events (
    company_id, evidence_id, ticket_id, workforce_task_id, event_version,
    event_type, actor_role, payload, idempotency_key
  ) VALUES (
    v_evidence.company_id, v_evidence.id, v_evidence.ticket_id,
    v_evidence.workforce_task_id, v_event_version,
    CASE WHEN v_outcome = 'stored' THEN 'upload_stored' ELSE 'upload_failed' END,
    'service_role',
    jsonb_build_object('uploadStatus', v_outcome, 'scanStatus', v_evidence.virus_scan_status),
    v_key
  );

  RETURN public.service_evidence_operational_projection(v_evidence, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_service_evidence_scan_command(
  p_evidence_id UUID,
  p_scan_status TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.media_reports%ROWTYPE;
  v_existing_event public.service_evidence_events%ROWTYPE;
  v_status TEXT := lower(BTRIM(COALESCE(p_scan_status, '')));
  v_key TEXT := BTRIM(COALESCE(p_idempotency_key, ''));
  v_event_version INTEGER;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the configured scan service may record a malware result';
  END IF;
  IF v_status NOT IN ('clean', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Scan status must be clean or rejected';
  END IF;
  IF length(v_key) < 8 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid idempotency key is required';
  END IF;

  SELECT * INTO v_evidence FROM public.media_reports m
   WHERE m.id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Evidence was not found';
  END IF;
  IF v_evidence.upload_status <> 'stored' OR v_evidence.media_type = 'note' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only stored binary evidence can receive a scan result';
  END IF;

  SELECT * INTO v_existing_event FROM public.service_evidence_events e
   WHERE e.company_id = v_evidence.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing_event.evidence_id IS DISTINCT FROM v_evidence.id
       OR v_existing_event.event_type IS DISTINCT FROM
          CASE WHEN v_status = 'clean' THEN 'scan_clean' ELSE 'scan_rejected' END
       OR v_existing_event.payload ->> 'virusScanStatus' IS DISTINCT FROM v_status
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The idempotency key was already used for another scan result';
    END IF;
    RETURN public.service_evidence_operational_projection(v_evidence, TRUE);
  END IF;

  IF v_evidence.virus_scan_status <> 'pending'
     OR v_evidence.verification_status <> 'pending'
  THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'A final scan result cannot be changed';
  END IF;

  PERFORM set_config('app.allow_service_evidence_state_change', 'on', TRUE);
  UPDATE public.media_reports SET virus_scan_status = v_status, updated_at = NOW()
   WHERE id = v_evidence.id
     AND upload_status = 'stored'
     AND virus_scan_status = 'pending'
     AND verification_status = 'pending'
   RETURNING * INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Scan state changed before completion';
  END IF;

  v_event_version := public.next_service_evidence_event_version(v_evidence.id);
  INSERT INTO public.service_evidence_events (
    company_id, evidence_id, ticket_id, workforce_task_id, event_version,
    event_type, actor_role, payload, idempotency_key
  ) VALUES (
    v_evidence.company_id, v_evidence.id, v_evidence.ticket_id,
    v_evidence.workforce_task_id, v_event_version,
    CASE WHEN v_status = 'clean' THEN 'scan_clean' ELSE 'scan_rejected' END,
    'service_role', jsonb_build_object('virusScanStatus', v_status), v_key
  );
  RETURN public.service_evidence_operational_projection(v_evidence, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.review_service_evidence_command(
  p_evidence_id UUID,
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
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_evidence public.media_reports%ROWTYPE;
  v_existing_event public.service_evidence_events%ROWTYPE;
  v_decision TEXT := lower(BTRIM(COALESCE(p_decision, '')));
  v_reason TEXT := BTRIM(COALESCE(p_reason, ''));
  v_key TEXT := BTRIM(COALESCE(p_idempotency_key, ''));
  v_next_version INTEGER;
  v_event_version INTEGER;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;
  IF v_decision NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Decision must be accepted or rejected';
  END IF;
  IF length(v_reason) < 10 OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A review reason between 10 and 1000 characters is required';
  END IF;
  IF length(v_key) < 8 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid idempotency key is required';
  END IF;

  SELECT * INTO v_evidence FROM public.media_reports m
   WHERE m.id = p_evidence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Evidence was not found';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_is_organization_admin(v_evidence.company_id)
    OR (
      v_actor_role = 'manager'
      AND v_evidence.site_id IS NOT NULL
      AND public.current_user_can_manage_site(v_evidence.site_id)
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A scoped manager or administrator must review evidence';
  END IF;

  SELECT * INTO v_existing_event FROM public.service_evidence_events e
   WHERE e.company_id = v_evidence.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing_event.evidence_id IS DISTINCT FROM v_evidence.id
       OR v_existing_event.event_type IS DISTINCT FROM v_decision
       OR v_existing_event.reason IS DISTINCT FROM v_reason
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'The idempotency key was already used for another review';
    END IF;
    RETURN public.service_evidence_operational_projection(v_evidence, TRUE);
  END IF;

  IF p_expected_version IS DISTINCT FROM v_evidence.review_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Evidence review version conflict';
  END IF;
  IF v_evidence.verification_status <> 'pending' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only pending evidence can be reviewed';
  END IF;
  IF v_decision = 'accepted'
     AND v_evidence.media_type <> 'note'
     AND NOT (
       v_evidence.upload_status = 'stored'
       AND v_evidence.virus_scan_status = 'clean'
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Binary evidence must be privately stored and malware-scanned before acceptance';
  END IF;

  v_next_version := v_evidence.review_version + 1;
  PERFORM set_config('app.allow_service_evidence_state_change', 'on', TRUE);
  UPDATE public.media_reports
     SET verification_status = v_decision,
         review_version = v_next_version,
         reviewed_by_profile_id = v_actor_id,
         reviewed_at = NOW(),
         review_reason = v_reason,
         updated_at = NOW()
   WHERE id = v_evidence.id
     AND review_version = p_expected_version
     AND verification_status = 'pending'
   RETURNING * INTO v_evidence;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Evidence review version conflict';
  END IF;

  v_event_version := public.next_service_evidence_event_version(v_evidence.id);
  INSERT INTO public.service_evidence_events (
    company_id, evidence_id, ticket_id, workforce_task_id, event_version,
    event_type, actor_profile_id, actor_role, reason, payload, idempotency_key
  ) VALUES (
    v_evidence.company_id, v_evidence.id, v_evidence.ticket_id,
    v_evidence.workforce_task_id, v_event_version, v_decision,
    v_actor_id, v_actor_role, v_reason,
    jsonb_build_object('reviewVersion', v_next_version), v_key
  );

  INSERT INTO public.service_ticket_events (
    company_id, ticket_id, event_type, body, actor_profile_id, metadata,
    visibility, idempotency_key
  ) VALUES (
    v_evidence.company_id, v_evidence.ticket_id,
    CASE WHEN v_decision = 'accepted' THEN 'evidence_accepted' ELSE 'evidence_rejected' END,
    CASE WHEN v_decision = 'accepted'
      THEN 'Service evidence was accepted after human review.'
      ELSE 'Service evidence was rejected and rework is required.'
    END,
    v_actor_id,
    jsonb_build_object(
      'evidenceId', v_evidence.id,
      'workforceTaskId', v_evidence.workforce_task_id,
      'reason', v_reason,
      'reviewVersion', v_next_version
    ),
    CASE WHEN v_decision = 'accepted' THEN 'resident' ELSE 'internal' END,
    'ticket-event:' || v_key
  );

  UPDATE public.workforce_tasks
     SET manager_approval_required = EXISTS (
           SELECT 1 FROM public.media_reports m
            WHERE m.workforce_task_id = v_evidence.workforce_task_id
              AND m.verification_status = 'pending'
         ),
         completion_readiness = CASE
           WHEN v_decision = 'accepted' THEN GREATEST(completion_readiness, 90)
           ELSE LEAST(completion_readiness, 55)
         END,
         updated_at = NOW()
   WHERE id = v_evidence.workforce_task_id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_evidence.company_id, v_actor_id, 'service_evidence.' || v_decision,
    'media_reports', v_evidence.id,
    jsonb_build_object('verificationStatus', 'pending', 'reviewVersion', p_expected_version),
    jsonb_build_object('verificationStatus', v_decision, 'reviewVersion', v_next_version, 'reason', v_reason),
    'audit:' || v_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_evidence.company_id, 'internal_event_bus', 'service_evidence.' || v_decision,
    'media_reports', v_evidence.id,
    jsonb_build_object(
      'evidenceId', v_evidence.id,
      'ticketId', v_evidence.ticket_id,
      'workforceTaskId', v_evidence.workforce_task_id,
      'decision', v_decision,
      'requiresHumanReview', FALSE
    ),
    'queued', 'service-evidence-review:' || v_evidence.id::TEXT || ':' || v_next_version::TEXT
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
      WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN public.service_evidence_operational_projection(v_evidence, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_resident_service_evidence(
  p_ticket_id UUID,
  p_workforce_task_id UUID
)
RETURNS TABLE (
  id UUID,
  ticket_id UUID,
  workforce_task_id UUID,
  media_type TEXT,
  caption TEXT,
  verification_status TEXT,
  created_at TIMESTAMPTZ,
  can_open_file BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
BEGIN
  IF (SELECT auth.uid()) IS NULL OR v_role NOT IN ('owner', 'tenant') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'A resident account is required';
  END IF;

  IF NOT public.current_user_can_view_service_ticket(p_ticket_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The ticket is outside your resident scope';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.ticket_id,
    m.workforce_task_id,
    m.media_type,
    m.caption,
    m.verification_status,
    m.created_at,
    (
      m.media_type <> 'note'
      AND m.upload_status = 'stored'
      AND m.virus_scan_status = 'clean'
      AND m.storage_bucket = 'cati-service-evidence'
      AND m.storage_path IS NOT NULL
    ) AS can_open_file
  FROM public.media_reports m
  WHERE m.ticket_id = p_ticket_id
    AND m.workforce_task_id = p_workforce_task_id
    AND m.verification_status = 'accepted'
    AND public.current_user_can_view_service_evidence(m.id)
  ORDER BY m.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.authorize_service_evidence_file_access(
  p_evidence_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_evidence public.media_reports%ROWTYPE;
BEGIN
  IF NOT public.current_user_can_view_service_evidence(p_evidence_id) THEN
    RETURN NULL;
  END IF;
  SELECT * INTO v_evidence FROM public.media_reports m WHERE m.id = p_evidence_id;
  IF NOT FOUND OR v_evidence.media_type = 'note'
     OR v_evidence.storage_bucket <> 'cati-service-evidence'
     OR v_evidence.upload_status <> 'stored'
     OR v_evidence.virus_scan_status <> 'clean'
     OR v_evidence.storage_path IS NULL
  THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'id', v_evidence.id,
    'safeFilename', v_evidence.safe_filename,
    'available', TRUE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_service_evidence_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Service evidence is append-only and cannot be deleted.';
  END IF;
  IF current_setting('app.allow_service_evidence_state_change', TRUE) <> 'on' THEN
    RAISE EXCEPTION 'Service evidence can be changed only by an authorized command.';
  END IF;
  IF NEW.upload_status IS DISTINCT FROM OLD.upload_status
     AND NOT (
       OLD.upload_status = 'requested'
       AND NEW.upload_status IN ('stored', 'failed')
     )
  THEN
    RAISE EXCEPTION 'Service evidence upload status can move from requested to one final result only.';
  END IF;
  IF NEW.virus_scan_status IS DISTINCT FROM OLD.virus_scan_status
     AND NOT (
       OLD.virus_scan_status = 'pending'
       AND (
         NEW.virus_scan_status IN ('clean', 'rejected')
         OR (
           NEW.virus_scan_status = 'not_connected'
           AND NEW.upload_status = 'failed'
         )
       )
     )
  THEN
    RAISE EXCEPTION 'Service evidence scan status can leave pending only once.';
  END IF;
  IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
    IF OLD.verification_status <> 'pending'
       OR NEW.verification_status NOT IN ('accepted', 'rejected')
       OR NEW.review_version IS DISTINCT FROM OLD.review_version + 1
       OR NEW.reviewed_by_profile_id IS NULL
       OR NEW.reviewed_at IS NULL
       OR NULLIF(BTRIM(COALESCE(NEW.review_reason, '')), '') IS NULL
    THEN
      RAISE EXCEPTION 'Service evidence review can leave pending exactly once with reviewer provenance.';
    END IF;
  ELSIF NEW.review_version IS DISTINCT FROM OLD.review_version
     OR NEW.reviewed_by_profile_id IS DISTINCT FROM OLD.reviewed_by_profile_id
     OR NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at
     OR NEW.review_reason IS DISTINCT FROM OLD.review_reason
  THEN
    RAISE EXCEPTION 'Service evidence review provenance cannot change without a review transition.';
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.ticket_id IS DISTINCT FROM OLD.ticket_id
     OR NEW.workforce_task_id IS DISTINCT FROM OLD.workforce_task_id
     OR NEW.service_order_id IS DISTINCT FROM OLD.service_order_id
     OR NEW.uploaded_by_staff_member_id IS DISTINCT FROM OLD.uploaded_by_staff_member_id
     OR NEW.submitted_by_profile_id IS DISTINCT FROM OLD.submitted_by_profile_id
     OR NEW.submitter_role IS DISTINCT FROM OLD.submitter_role
     OR NEW.media_type IS DISTINCT FROM OLD.media_type
     OR NEW.storage_path IS DISTINCT FROM OLD.storage_path
     OR NEW.caption IS DISTINCT FROM OLD.caption
     OR NEW.original_filename IS DISTINCT FROM OLD.original_filename
     OR NEW.safe_filename IS DISTINCT FROM OLD.safe_filename
     OR NEW.mime_type IS DISTINCT FROM OLD.mime_type
     OR NEW.size_bytes IS DISTINCT FROM OLD.size_bytes
     OR NEW.checksum_sha256 IS DISTINCT FROM OLD.checksum_sha256
     OR NEW.storage_bucket IS DISTINCT FROM OLD.storage_bucket
     OR NEW.override_reason IS DISTINCT FROM OLD.override_reason
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.metadata IS DISTINCT FROM OLD.metadata
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Service evidence content and scope are immutable.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_service_evidence ON public.media_reports;
CREATE TRIGGER protect_service_evidence
  BEFORE UPDATE OR DELETE ON public.media_reports
  FOR EACH ROW EXECUTE FUNCTION public.protect_service_evidence_mutation();

DROP TRIGGER IF EXISTS protect_service_evidence_events ON public.service_evidence_events;
CREATE TRIGGER protect_service_evidence_events
  BEFORE UPDATE OR DELETE ON public.service_evidence_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

CREATE OR REPLACE FUNCTION public.enforce_ticket_service_evidence_gate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.workflow_state = 'manager_review'
     AND OLD.workflow_state IS DISTINCT FROM NEW.workflow_state
     AND EXISTS (
       SELECT 1
         FROM public.workforce_tasks w
        WHERE w.ticket_id = NEW.id
          AND w.requires_media
          AND w.status NOT IN ('closed', 'cancelled')
          AND NOT EXISTS (
            SELECT 1
              FROM public.media_reports m
             WHERE m.ticket_id = NEW.id
               AND m.workforce_task_id = w.id
               AND m.verification_status IN ('pending', 'accepted')
               AND (
                 m.media_type = 'note'
                 OR (
                   m.upload_status = 'stored'
                   AND m.virus_scan_status = 'clean'
                   AND m.storage_bucket = 'cati-service-evidence'
                 )
               )
          )
     )
  THEN
    RAISE EXCEPTION 'Every active media-required task needs stored, malware-cleared evidence or a field note before manager review.';
  END IF;

  IF NEW.workflow_state = 'resolved'
     AND OLD.workflow_state IS DISTINCT FROM NEW.workflow_state
     AND EXISTS (
       SELECT 1
         FROM public.workforce_tasks w
        WHERE w.ticket_id = NEW.id
          AND w.requires_media
          AND w.status NOT IN ('closed', 'cancelled')
          AND NOT EXISTS (
            SELECT 1
              FROM public.media_reports m
             WHERE m.ticket_id = NEW.id
               AND m.workforce_task_id = w.id
               AND m.verification_status = 'accepted'
               AND (
                 m.media_type = 'note'
                 OR (
                   m.upload_status = 'stored'
                   AND m.virus_scan_status = 'clean'
                   AND m.storage_bucket = 'cati-service-evidence'
                 )
               )
          )
     )
  THEN
    RAISE EXCEPTION 'Every active media-required task needs human-accepted service evidence before resolution.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_ticket_service_evidence_gate ON public.service_tickets;
CREATE TRIGGER enforce_ticket_service_evidence_gate
  BEFORE UPDATE ON public.service_tickets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_service_evidence_gate();

-- Realtime authorization is evaluated for the exact task topic instead of
-- streaming media_reports/service_evidence_events rows to the browser. The
-- topic contains only the already-visible task id; company, site, ticket and
-- resident/staff scope are re-derived in PostgreSQL on every channel join.
CREATE OR REPLACE FUNCTION public.current_user_can_subscribe_service_evidence_topic(
  p_topic TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_task_id UUID;
  v_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
BEGIN
  IF p_topic IS NULL OR p_topic !~ '^service-proof:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN FALSE;
  END IF;

  v_task_id := split_part(p_topic, ':', 2)::UUID;

  RETURN EXISTS (
    SELECT 1
      FROM public.workforce_tasks w
      JOIN public.service_tickets t
        ON t.id = w.ticket_id
       AND t.company_id = w.company_id
       AND t.site_id = w.site_id
     WHERE w.id = v_task_id
       AND (
         public.is_platform_super_admin()
         OR (
           w.company_id = v_company_id
           AND CASE v_role
             WHEN 'admin' THEN
               public.current_user_is_organization_admin(w.company_id)
             WHEN 'manager' THEN
               public.current_user_can_manage_site(w.site_id)
             WHEN 'staff' THEN
               public.current_user_is_exact_task_assignee(w.id)
             WHEN 'owner' THEN
               public.current_user_can_view_service_ticket(t.id)
             WHEN 'tenant' THEN
               public.current_user_can_view_service_ticket(t.id)
             ELSE FALSE
           END
         )
       )
  );
EXCEPTION WHEN invalid_text_representation THEN
  RETURN FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.current_user_can_subscribe_service_evidence_topic(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_subscribe_service_evidence_topic(TEXT)
  TO authenticated;

-- Only a sanitized invalidation is broadcast. realtime.send is invoked
-- dynamically so a deployment without Supabase Realtime still commits the
-- domain transaction; connected clients recover through bounded polling.
CREATE OR REPLACE FUNCTION public.broadcast_service_evidence_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.workforce_task_id IS NULL
     OR to_regprocedure('realtime.send(jsonb,text,text,boolean)') IS NULL
  THEN
    RETURN NEW;
  END IF;

  BEGIN
    EXECUTE 'SELECT realtime.send($1, $2, $3, $4)'
      USING
        jsonb_build_object('kind', 'changed'),
        'changed',
        'service-proof:' || NEW.workforce_task_id::TEXT,
        TRUE;
  EXCEPTION WHEN OTHERS THEN
    -- Realtime is an acceleration path, never a prerequisite for persisting
    -- evidence or review decisions. Do not expose provider/database errors.
    RAISE WARNING 'Service evidence live update unavailable; polling recovery remains active.';
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.broadcast_service_evidence_changed()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS broadcast_service_evidence_changed
  ON public.media_reports;
CREATE TRIGGER broadcast_service_evidence_changed
  AFTER INSERT OR UPDATE ON public.media_reports
  FOR EACH ROW EXECUTE FUNCTION public.broadcast_service_evidence_changed();

-- Private Broadcast subscriptions are read-only for browser clients. A
-- restrictive INSERT guard also survives unrelated permissive policies, so
-- only the SECURITY DEFINER trigger/service role can publish invalidations.
DO $$
BEGIN
  IF to_regclass('realtime.messages') IS NULL
     OR to_regprocedure('realtime.topic()') IS NULL
  THEN
    RAISE NOTICE 'Skipping service evidence private Broadcast policy; Supabase Realtime authorization is unavailable.';
    RETURN;
  END IF;

  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  EXECUTE 'DROP POLICY IF EXISTS service_evidence_private_broadcast_read ON realtime.messages';
  EXECUTE 'DROP POLICY IF EXISTS service_evidence_private_broadcast_guard ON realtime.messages';
  EXECUTE 'DROP POLICY IF EXISTS service_evidence_private_broadcast_insert_guard ON realtime.messages';
  EXECUTE $policy$
    CREATE POLICY service_evidence_private_broadcast_read
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (
        extension = 'broadcast'
        AND public.current_user_can_subscribe_service_evidence_topic(
          (SELECT realtime.topic())
        )
      )
  $policy$;
  -- PostgreSQL combines permissive SELECT policies with OR. This restrictive
  -- prefix guard keeps an unrelated broad Realtime policy from silently
  -- granting access to service-proof topics while leaving other topics alone.
  EXECUTE $policy$
    CREATE POLICY service_evidence_private_broadcast_guard
      ON realtime.messages
      AS RESTRICTIVE
      FOR SELECT
      TO authenticated
      USING (
        (SELECT realtime.topic()) NOT LIKE 'service-proof:%'
        OR (
          extension = 'broadcast'
          AND public.current_user_can_subscribe_service_evidence_topic(
            (SELECT realtime.topic())
          )
        )
      )
  $policy$;
  EXECUTE $policy$
    CREATE POLICY service_evidence_private_broadcast_insert_guard
      ON realtime.messages
      AS RESTRICTIVE
      FOR INSERT
      TO anon, authenticated
      WITH CHECK (
        (SELECT realtime.topic()) NOT LIKE 'service-proof:%'
      )
  $policy$;
EXCEPTION
  WHEN undefined_object OR undefined_function OR invalid_schema_name THEN
    RAISE NOTICE 'Skipping service evidence private Broadcast policy; Supabase Realtime authorization is unavailable.';
END;
$$;

ALTER TABLE public.media_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read" ON public.media_reports;
DROP POLICY IF EXISTS "Managers can insert service operations" ON public.media_reports;
DROP POLICY IF EXISTS "Managers can update service operations" ON public.media_reports;
DROP POLICY IF EXISTS "Staff can insert media reports" ON public.media_reports;
DROP POLICY IF EXISTS "Scoped media evidence visibility" ON public.media_reports;
DROP POLICY IF EXISTS "Operational users create media evidence" ON public.media_reports;
DROP POLICY IF EXISTS service_evidence_select_scope ON public.media_reports;
CREATE POLICY service_evidence_select_scope
  ON public.media_reports FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      public.current_user_profile_role() IN ('admin', 'manager', 'staff')
      AND public.current_user_can_view_service_evidence(id)
    )
  );

DROP POLICY IF EXISTS service_evidence_event_select_scope
  ON public.service_evidence_events;
CREATE POLICY service_evidence_event_select_scope
  ON public.service_evidence_events FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      public.current_user_profile_role() IN ('admin', 'manager', 'staff')
      AND public.current_user_can_view_service_evidence(evidence_id)
    )
  );

-- RLS constrains rows; column grants also prevent scoped operational users
-- from bypassing the safe projections to read object paths, hashes,
-- fingerprints, idempotency receipts or profile identifiers directly.
REVOKE ALL ON public.media_reports FROM anon, authenticated;
GRANT SELECT (
  id,
  ticket_id,
  workforce_task_id,
  service_order_id,
  media_type,
  caption,
  original_filename,
  mime_type,
  size_bytes,
  upload_status,
  virus_scan_status,
  verification_status,
  review_version,
  submitter_role,
  created_at,
  reviewed_at,
  review_reason,
  override_reason
) ON public.media_reports TO authenticated;

REVOKE ALL ON public.service_evidence_events FROM anon, authenticated;
GRANT SELECT (
  id,
  evidence_id,
  ticket_id,
  workforce_task_id,
  event_version,
  event_type,
  actor_role,
  reason,
  created_at
) ON public.service_evidence_events TO authenticated;

REVOKE ALL ON FUNCTION public.create_service_evidence_command(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_service_evidence_command(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT
) TO authenticated;

REVOKE ALL ON FUNCTION public.complete_service_evidence_upload_command(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_service_evidence_upload_command(UUID, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.record_service_evidence_scan_command(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_service_evidence_scan_command(UUID, TEXT, TEXT)
  TO service_role;

REVOKE ALL ON FUNCTION public.review_service_evidence_command(UUID, INTEGER, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_service_evidence_command(UUID, INTEGER, TEXT, TEXT, TEXT)
  TO authenticated;

REVOKE ALL ON FUNCTION public.authorize_service_evidence_file_access(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_service_evidence_file_access(UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.list_resident_service_evidence(UUID, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_resident_service_evidence(UUID, UUID)
  TO authenticated;

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'cati-service-evidence',
      'cati-service-evidence',
      FALSE,
      52428800,
      ARRAY[
        'image/jpeg', 'image/png', 'image/webp',
        'video/mp4', 'video/quicktime', 'video/webm'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = FALSE,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS service_evidence_object_direct_access_guard
      ON storage.objects;
    -- Storage policies are permissive by default and combine with OR. This
    -- bucket-prefix guard is restrictive, so an unrelated broad policy cannot
    -- grant a browser direct list/read/write/delete path. The application
    -- writes immutable objects with the service role and returns only a short
    -- signed URL after the evidence authorization RPC succeeds.
    CREATE POLICY service_evidence_object_direct_access_guard
      ON storage.objects
      AS RESTRICTIVE
      FOR ALL
      TO anon, authenticated
      USING (bucket_id <> 'cati-service-evidence')
      WITH CHECK (bucket_id <> 'cati-service-evidence');
  END IF;
END;
$$;

DO $$
BEGIN
  -- Raw Postgres Changes can carry full rows even when REST column grants are
  -- narrow. Remove both sensitive tables from the publication and use the
  -- sanitized private Broadcast trigger above instead.
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'service_evidence_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.service_evidence_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'media_reports'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.media_reports;
  END IF;
EXCEPTION WHEN undefined_object THEN
  RAISE NOTICE 'Skipping raw service evidence publication cleanup; publication is unavailable.';
END;
$$;

COMMENT ON FUNCTION public.create_service_evidence_command(
  UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, BOOLEAN, TEXT, TEXT
) IS 'Creates immutable exact-task evidence with staff-assignment or reasoned manager/admin override authorization.';
COMMENT ON FUNCTION public.review_service_evidence_command(UUID, INTEGER, TEXT, TEXT, TEXT)
  IS 'Human-only scoped evidence review with optimistic versioning, idempotency, audit and outbox evidence.';
