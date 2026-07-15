BEGIN;

-- Authoritative internal buyer funnel. Twenty synchronization remains provider-ready.
CREATE TABLE public.buyer_prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  email TEXT,
  email_normalized TEXT,
  phone TEXT,
  phone_normalized TEXT,
  preferred_locale TEXT NOT NULL DEFAULT 'tr' CHECK (preferred_locale IN ('tr', 'en', 'de', 'ru')),
  source TEXT NOT NULL CHECK (source IN ('website', 'referral', 'portal', 'walk_in', 'phone', 'partner', 'import')),
  source_detail TEXT,
  consent_status TEXT NOT NULL DEFAULT 'pending' CHECK (consent_status IN ('pending', 'granted', 'withdrawn')),
  consent_version TEXT,
  consent_text_digest TEXT CHECK (consent_text_digest IS NULL OR consent_text_digest ~ '^[0-9a-f]{64}$'),
  consent_accepted_at TIMESTAMPTZ,
  assigned_manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  stage TEXT NOT NULL DEFAULT 'new' CHECK (stage IN (
    'new', 'contacted', 'qualified', 'viewing', 'offer',
    'reservation', 'due_diligence', 'won', 'lost'
  )),
  follow_up_at TIMESTAMPTZ,
  loss_reason TEXT,
  crm_authority TEXT NOT NULL DEFAULT 'local_authoritative' CHECK (crm_authority = 'local_authoritative'),
  twenty_sync_status TEXT NOT NULL DEFAULT 'provider_ready'
    CHECK (twenty_sync_status IN ('provider_ready', 'queued', 'synced', 'failed')),
  twenty_external_id TEXT,
  twenty_last_sync_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (email_normalized IS NOT NULL OR phone_normalized IS NOT NULL),
  CHECK (email IS NULL OR length(email) <= 254),
  CHECK (phone IS NULL OR length(phone) <= 60),
  CHECK (source_detail IS NULL OR length(source_detail) <= 500),
  CHECK (loss_reason IS NULL OR length(loss_reason) <= 1000),
  CHECK (
    (
      consent_status = 'pending'
      AND consent_version IS NULL
      AND consent_text_digest IS NULL
      AND consent_accepted_at IS NULL
    )
    OR (
      consent_status IN ('granted', 'withdrawn')
      AND consent_version IS NOT NULL
      AND consent_text_digest IS NOT NULL
      AND consent_accepted_at IS NOT NULL
    )
  ),
  CHECK ((stage = 'lost' AND loss_reason IS NOT NULL) OR stage <> 'lost')
);

CREATE UNIQUE INDEX buyer_prospects_email_unique
  ON public.buyer_prospects(company_id, email_normalized)
  WHERE email_normalized IS NOT NULL AND stage <> 'lost';
CREATE UNIQUE INDEX buyer_prospects_phone_unique
  ON public.buyer_prospects(company_id, phone_normalized)
  WHERE phone_normalized IS NOT NULL AND stage <> 'lost';
CREATE INDEX buyer_prospects_company_stage_idx
  ON public.buyer_prospects(company_id, stage, updated_at DESC);
CREATE INDEX buyer_prospects_manager_follow_up_idx
  ON public.buyer_prospects(assigned_manager_id, follow_up_at)
  WHERE stage NOT IN ('won', 'lost');

CREATE TABLE public.buyer_prospect_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 10),
  note TEXT CHECK (note IS NULL OR length(note) <= 1000),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (prospect_id, site_id, unit_id)
);

CREATE TABLE public.buyer_prospect_stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL CHECK (to_stage IN (
    'new', 'contacted', 'qualified', 'viewing', 'offer',
    'reservation', 'due_diligence', 'won', 'lost'
  )),
  reason TEXT,
  prospect_version INTEGER NOT NULL CHECK (prospect_version > 0),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, actor_profile_id, idempotency_key),
  UNIQUE (prospect_id, prospect_version)
);

CREATE TABLE public.buyer_prospect_consent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  from_status TEXT CHECK (from_status IS NULL OR from_status IN ('pending', 'granted', 'withdrawn')),
  to_status TEXT NOT NULL CHECK (to_status IN ('pending', 'granted', 'withdrawn')),
  consent_version TEXT,
  consent_text_digest TEXT CHECK (
    consent_text_digest IS NULL OR consent_text_digest ~ '^[0-9a-f]{64}$'
  ),
  consent_accepted_at TIMESTAMPTZ,
  prospect_version INTEGER NOT NULL CHECK (prospect_version > 0),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (
    (to_status = 'pending' AND consent_version IS NULL AND consent_text_digest IS NULL AND consent_accepted_at IS NULL)
    OR (
      to_status IN ('granted', 'withdrawn')
      AND consent_version IS NOT NULL
      AND consent_text_digest IS NOT NULL
      AND consent_accepted_at IS NOT NULL
    )
  ),
  UNIQUE (prospect_id, prospect_version)
);

CREATE TABLE public.buyer_prospect_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 2 AND 4000),
  prospect_version INTEGER NOT NULL CHECK (prospect_version > 0),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, actor_profile_id, idempotency_key),
  UNIQUE (prospect_id, prospect_version)
);

CREATE TABLE public.buyer_prospect_conversion_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('registration_request', 'reservation')),
  target_id UUID NOT NULL,
  prospect_version INTEGER NOT NULL CHECK (prospect_version > 0),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (prospect_id, target_type),
  UNIQUE (company_id, target_type, target_id),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

CREATE TABLE public.buyer_prospect_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  prospect_id UUID NOT NULL REFERENCES public.buyer_prospects(id) ON DELETE CASCADE,
  command_type TEXT NOT NULL CHECK (command_type IN ('create', 'transition', 'note', 'update', 'convert')),
  command_fingerprint TEXT NOT NULL CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

COMMENT ON TABLE public.buyer_prospects IS
  'Internal authoritative buyer pipeline; Twenty CRM synchronization is provider-ready and never implied connected.';
COMMENT ON TABLE public.buyer_prospect_stage_events IS
  'Buyer prospect history is append-only and records every accepted stage transition.';
COMMENT ON TABLE public.buyer_prospect_consent_events IS
  'Append-only buyer consent history. Granted evidence is retained through withdrawal and is never overwritten.';

CREATE OR REPLACE FUNCTION public.buyer_stage_transition_allowed(p_from TEXT, p_to TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE p_from
    WHEN 'new' THEN p_to IN ('contacted', 'lost')
    WHEN 'contacted' THEN p_to IN ('qualified', 'lost')
    WHEN 'qualified' THEN p_to IN ('viewing', 'offer', 'lost')
    WHEN 'viewing' THEN p_to IN ('offer', 'lost')
    WHEN 'offer' THEN p_to IN ('reservation', 'lost')
    WHEN 'reservation' THEN p_to IN ('due_diligence', 'lost')
    WHEN 'due_diligence' THEN p_to IN ('won', 'lost')
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_consent_transition_allowed(p_from TEXT, p_to TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE p_from
    WHEN 'pending' THEN p_to IN ('pending', 'granted')
    WHEN 'granted' THEN p_to IN ('granted', 'withdrawn')
    WHEN 'withdrawn' THEN p_to = 'withdrawn'
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.buyer_prospect_scope_allowed(
  p_company_id UUID,
  p_site_id UUID,
  p_assigned_manager_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_company_id = public.current_user_company_id()
    AND (
      public.current_user_profile_role() = 'admin'
      OR (
        public.current_user_profile_role() = 'manager'
        AND EXISTS (
          SELECT 1 FROM public.profile_site_assignments a
          WHERE a.company_id = p_company_id
            AND a.site_id = p_site_id
            AND a.profile_id = auth.uid()
            AND a.access_role = 'manager'
            AND a.status = 'active'
            AND a.valid_from <= clock_timestamp()
            AND (a.valid_until IS NULL OR a.valid_until > clock_timestamp())
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.reject_buyer_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Buyer prospect history is append-only' USING ERRCODE = '55000';
END;
$$;

CREATE TRIGGER buyer_stage_events_append_only
  BEFORE UPDATE OR DELETE ON public.buyer_prospect_stage_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_buyer_history_mutation();
CREATE TRIGGER buyer_consent_events_append_only
  BEFORE UPDATE OR DELETE ON public.buyer_prospect_consent_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_buyer_history_mutation();
CREATE TRIGGER buyer_notes_append_only
  BEFORE UPDATE OR DELETE ON public.buyer_prospect_notes
  FOR EACH ROW EXECUTE FUNCTION public.reject_buyer_history_mutation();
CREATE TRIGGER buyer_conversion_links_append_only
  BEFORE UPDATE OR DELETE ON public.buyer_prospect_conversion_links
  FOR EACH ROW EXECUTE FUNCTION public.reject_buyer_history_mutation();
CREATE TRIGGER buyer_commands_append_only
  BEFORE UPDATE OR DELETE ON public.buyer_prospect_commands
  FOR EACH ROW EXECUTE FUNCTION public.reject_buyer_history_mutation();

CREATE OR REPLACE FUNCTION public.create_buyer_prospect_v1(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_source TEXT,
  p_source_detail TEXT,
  p_site_id UUID,
  p_unit_id UUID,
  p_assigned_manager_id UUID,
  p_follow_up_at TIMESTAMPTZ,
  p_consent_status TEXT,
  p_consent_version TEXT,
  p_consent_text_digest TEXT,
  p_preferred_locale TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_actor UUID := auth.uid();
  v_role TEXT := public.current_user_profile_role();
  v_manager UUID := COALESCE(p_assigned_manager_id, auth.uid());
  v_email TEXT := NULLIF(lower(btrim(COALESCE(p_email, ''))), '');
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_consent_digest TEXT := NULLIF(lower(btrim(COALESCE(p_consent_text_digest, ''))), '');
  v_match_count INTEGER := 0;
  v_fingerprint TEXT;
  v_existing public.buyer_prospects%ROWTYPE;
  v_prospect public.buyer_prospects%ROWTYPE;
  v_command public.buyer_prospect_commands%ROWTYPE;
  v_result JSONB;
BEGIN
  IF v_company_id IS NULL OR v_actor IS NULL OR v_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Buyer pipeline access denied' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(COALESCE(p_full_name, ''))) NOT BETWEEN 2 AND 120
     OR p_source NOT IN ('website', 'referral', 'portal', 'walk_in', 'phone', 'partner', 'import')
     OR COALESCE(p_preferred_locale, '') NOT IN ('tr', 'en', 'de', 'ru')
     OR COALESCE(p_consent_status, '') NOT IN ('pending', 'granted')
     OR (v_email IS NULL AND v_phone IS NULL)
     OR (v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'))
     OR (v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9]{7,20}$')
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid buyer prospect command' USING ERRCODE = '22023';
  END IF;
  IF p_consent_status = 'granted' AND (
    length(btrim(COALESCE(p_consent_version, ''))) < 3
    OR v_consent_digest !~ '^[0-9a-f]{64}$'
  ) THEN
    RAISE EXCEPTION 'Granted buyer consent requires a version and evidence digest' USING ERRCODE = '22023';
  END IF;
  IF p_consent_status = 'pending' AND (
    NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS NOT NULL
    OR v_consent_digest IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Pending buyer consent cannot contain grant evidence' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sites s WHERE s.id = p_site_id AND s.company_id = v_company_id
  ) OR (v_role = 'manager' AND NOT public.current_user_can_manage_site(p_site_id)) THEN
    RAISE EXCEPTION 'Buyer site is outside the authorized scope' USING ERRCODE = '42501';
  END IF;
  IF p_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = p_unit_id AND u.company_id = v_company_id AND u.site_id = p_site_id
  ) THEN
    RAISE EXCEPTION 'Buyer unit is outside the selected site' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = v_manager AND p.company_id = v_company_id AND p.role = 'manager'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profile_site_assignments a
    WHERE a.company_id = v_company_id AND a.site_id = p_site_id
      AND a.profile_id = v_manager AND a.access_role = 'manager'
      AND a.status = 'active' AND a.valid_from <= clock_timestamp()
      AND (a.valid_until IS NULL OR a.valid_until > clock_timestamp())
  ) OR (v_role = 'manager' AND v_manager <> v_actor) THEN
    RAISE EXCEPTION 'Assigned manager is invalid for this command' USING ERRCODE = '42501';
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'action', 'create', 'fullName', btrim(p_full_name), 'email', v_email, 'phone', v_phone,
    'source', p_source, 'sourceDetail', NULLIF(btrim(COALESCE(p_source_detail, '')), ''),
    'siteId', p_site_id, 'unitId', p_unit_id, 'managerId', v_manager,
    'followUpAt', p_follow_up_at, 'consentStatus', p_consent_status,
    'consentVersion', NULLIF(btrim(COALESCE(p_consent_version, '')), ''),
    'consentTextDigest', v_consent_digest,
    'locale', p_preferred_locale
  )::TEXT, 'UTF8'), 'sha256'), 'hex');

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_company_id::TEXT || ':buyer-command:' || v_actor::TEXT || ':' || btrim(p_idempotency_key), 0
  ));
  SELECT * INTO v_command FROM public.buyer_prospect_commands
  WHERE company_id = v_company_id AND actor_profile_id = v_actor
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_command.command_type <> 'create' OR v_command.command_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Buyer idempotency key was reused with another command' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_prospect FROM public.buyer_prospects
    WHERE id = v_command.prospect_id AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.buyer_prospect_scope_allowed(
      v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Buyer replay is outside the current authorized scope' USING ERRCODE = '42501';
    END IF;
    RETURN v_command.result || jsonb_build_object('replayed', TRUE);
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_company_id::TEXT || ':buyer:' || contact_key, 0)
  )
  FROM unnest(ARRAY[
    CASE WHEN v_email IS NOT NULL THEN 'email:' || v_email END,
    CASE WHEN v_phone IS NOT NULL THEN 'phone:' || v_phone END
  ]) AS contact_locks(contact_key)
  WHERE contact_key IS NOT NULL
  ORDER BY contact_key;
  SELECT count(DISTINCT b.id)::INTEGER INTO v_match_count FROM public.buyer_prospects b
  WHERE b.company_id = v_company_id AND b.stage <> 'lost'
    AND ((v_email IS NOT NULL AND b.email_normalized = v_email)
      OR (v_phone IS NOT NULL AND b.phone_normalized = v_phone));
  IF v_match_count > 1 THEN
    RAISE EXCEPTION 'Buyer contact values match different active prospects' USING ERRCODE = '23505';
  END IF;
  SELECT * INTO v_existing FROM public.buyer_prospects b
  WHERE b.company_id = v_company_id AND b.stage <> 'lost'
    AND ((v_email IS NOT NULL AND b.email_normalized = v_email)
      OR (v_phone IS NOT NULL AND b.phone_normalized = v_phone))
  ORDER BY b.created_at, b.id LIMIT 1;
  IF FOUND THEN
    IF NOT public.buyer_prospect_scope_allowed(
      v_existing.company_id, v_existing.site_id, v_existing.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Matching buyer exists outside the authorized scope' USING ERRCODE = '42501';
    END IF;
    v_result := jsonb_build_object(
      'prospectId', v_existing.id, 'version', v_existing.version,
      'stage', v_existing.stage, 'duplicate', TRUE, 'replayed', FALSE
    );
    INSERT INTO public.buyer_prospect_commands (
      company_id, prospect_id, command_type, command_fingerprint,
      actor_profile_id, idempotency_key, result
    ) VALUES (
      v_company_id, v_existing.id, 'create', v_fingerprint,
      v_actor, btrim(p_idempotency_key), v_result
    );
    RETURN v_result;
  END IF;

  INSERT INTO public.buyer_prospects (
    company_id, site_id, unit_id, full_name, email, email_normalized,
    phone, phone_normalized, preferred_locale, source, source_detail,
    consent_status, consent_version, consent_text_digest, consent_accepted_at,
    assigned_manager_id, follow_up_at, created_by, updated_by
  ) VALUES (
    v_company_id, p_site_id, p_unit_id, btrim(p_full_name), v_email, v_email,
    NULLIF(btrim(COALESCE(p_phone, '')), ''), v_phone, p_preferred_locale, p_source,
    NULLIF(btrim(COALESCE(p_source_detail, '')), ''), p_consent_status,
    CASE WHEN p_consent_status = 'granted'
      THEN NULLIF(btrim(COALESCE(p_consent_version, '')), '') ELSE NULL END,
    CASE WHEN p_consent_status = 'granted' THEN v_consent_digest ELSE NULL END,
    CASE WHEN p_consent_status = 'granted' THEN clock_timestamp() ELSE NULL END,
    v_manager, p_follow_up_at, v_actor, v_actor
  ) RETURNING * INTO v_prospect;

  IF p_unit_id IS NOT NULL THEN
    INSERT INTO public.buyer_prospect_interests (
      company_id, prospect_id, site_id, unit_id, created_by
    ) VALUES (v_company_id, v_prospect.id, p_site_id, p_unit_id, v_actor);
  END IF;
  INSERT INTO public.buyer_prospect_stage_events (
    company_id, prospect_id, from_stage, to_stage, reason, prospect_version,
    actor_profile_id, idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, v_prospect.id, NULL, 'new', 'Prospect created', 1,
    v_actor, btrim(p_idempotency_key) || ':stage', v_fingerprint
  );
  INSERT INTO public.buyer_prospect_consent_events (
    company_id, prospect_id, from_status, to_status, consent_version,
    consent_text_digest, consent_accepted_at, prospect_version,
    actor_profile_id, idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, v_prospect.id, NULL, v_prospect.consent_status,
    v_prospect.consent_version, v_prospect.consent_text_digest,
    v_prospect.consent_accepted_at, 1, v_actor,
    btrim(p_idempotency_key), v_fingerprint
  );
  v_result := jsonb_build_object(
    'prospectId', v_prospect.id, 'version', 1, 'stage', 'new',
    'duplicate', FALSE, 'replayed', FALSE
  );
  INSERT INTO public.buyer_prospect_commands (
    company_id, prospect_id, command_type, command_fingerprint,
    actor_profile_id, idempotency_key, result
  ) VALUES (
    v_company_id, v_prospect.id, 'create', v_fingerprint,
    v_actor, btrim(p_idempotency_key), v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_buyer_prospect_v1(
  p_prospect_id UUID,
  p_expected_version INTEGER,
  p_to_stage TEXT,
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
  v_actor UUID := auth.uid();
  v_prospect public.buyer_prospects%ROWTYPE;
  v_event public.buyer_prospect_stage_events%ROWTYPE;
  v_command public.buyer_prospect_commands%ROWTYPE;
  v_fingerprint TEXT;
  v_from_stage TEXT;
  v_result JSONB;
BEGIN
  IF public.current_user_profile_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Buyer pipeline access denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1
     OR p_to_stage NOT IN ('new', 'contacted', 'qualified', 'viewing', 'offer', 'reservation', 'due_diligence', 'won', 'lost')
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200
     OR length(btrim(COALESCE(p_reason, ''))) > 1000
     OR (p_to_stage = 'lost' AND length(btrim(COALESCE(p_reason, ''))) < 3) THEN
    RAISE EXCEPTION 'Invalid buyer stage command' USING ERRCODE = '22023';
  END IF;
  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'action', 'transition', 'prospectId', p_prospect_id, 'expectedVersion', p_expected_version,
    'toStage', p_to_stage, 'reason', NULLIF(btrim(COALESCE(p_reason, '')), '')
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_company_id::TEXT || ':buyer-command:' || v_actor::TEXT || ':' || btrim(p_idempotency_key), 0
  ));
  SELECT * INTO v_command FROM public.buyer_prospect_commands
  WHERE company_id = v_company_id AND actor_profile_id = v_actor
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_command.command_type <> 'transition' OR v_command.command_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Buyer idempotency key was reused with another command' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_prospect FROM public.buyer_prospects
    WHERE id = v_command.prospect_id AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.buyer_prospect_scope_allowed(
      v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Buyer replay is outside the current authorized scope' USING ERRCODE = '42501';
    END IF;
    RETURN v_command.result || jsonb_build_object('replayed', TRUE);
  END IF;
  SELECT * INTO v_prospect FROM public.buyer_prospects
  WHERE id = p_prospect_id AND company_id = v_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.buyer_prospect_scope_allowed(
    v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
  ) THEN RAISE EXCEPTION 'Buyer prospect is outside the authorized scope' USING ERRCODE = '42501'; END IF;
  IF v_prospect.version <> p_expected_version THEN
    RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001';
  END IF;
  IF NOT public.buyer_stage_transition_allowed(v_prospect.stage, p_to_stage) THEN
    RAISE EXCEPTION 'Buyer stage transition is not allowed' USING ERRCODE = '22023';
  END IF;
  v_from_stage := v_prospect.stage;
  UPDATE public.buyer_prospects SET
    stage = p_to_stage,
    loss_reason = CASE WHEN p_to_stage = 'lost' THEN btrim(p_reason) ELSE NULL END,
    version = version + 1, updated_by = v_actor, updated_at = clock_timestamp()
  WHERE id = p_prospect_id AND version = p_expected_version
  RETURNING * INTO v_prospect;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.buyer_prospect_stage_events (
    company_id, prospect_id, from_stage, to_stage, reason, prospect_version,
    actor_profile_id, idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, p_prospect_id, v_from_stage, p_to_stage,
    NULLIF(btrim(COALESCE(p_reason, '')), ''), v_prospect.version,
    v_actor, btrim(p_idempotency_key), v_fingerprint
  ) RETURNING * INTO v_event;
  v_result := jsonb_build_object(
    'prospectId', p_prospect_id, 'version', v_prospect.version,
    'stage', p_to_stage, 'replayed', FALSE
  );
  INSERT INTO public.buyer_prospect_commands (
    company_id, prospect_id, command_type, command_fingerprint,
    actor_profile_id, idempotency_key, result
  ) VALUES (
    v_company_id, p_prospect_id, 'transition', v_fingerprint,
    v_actor, btrim(p_idempotency_key), v_result
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.convert_buyer_prospect_v1(
  p_prospect_id UUID,
  p_expected_version INTEGER,
  p_target_type TEXT,
  p_target_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_actor UUID := auth.uid();
  v_prospect public.buyer_prospects%ROWTYPE;
  v_link public.buyer_prospect_conversion_links%ROWTYPE;
  v_registration public.registration_requests%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_unit_no TEXT;
  v_fingerprint TEXT;
  v_command public.buyer_prospect_commands%ROWTYPE;
  v_result JSONB;
BEGIN
  IF public.current_user_profile_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Buyer pipeline access denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1
     OR p_target_type NOT IN ('registration_request', 'reservation')
     OR p_target_id IS NULL
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid buyer conversion hand-off' USING ERRCODE = '22023';
  END IF;
  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'action', 'convert', 'prospectId', p_prospect_id, 'expectedVersion', p_expected_version,
    'targetType', p_target_type, 'targetId', p_target_id
  )::TEXT, 'UTF8'), 'sha256'), 'hex');

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_company_id::TEXT || ':buyer-command:' || v_actor::TEXT || ':' || btrim(p_idempotency_key), 0
  ));
  SELECT * INTO v_command FROM public.buyer_prospect_commands
  WHERE company_id = v_company_id AND actor_profile_id = v_actor
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_command.command_type <> 'convert' OR v_command.command_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Buyer idempotency key was reused with another command' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_prospect FROM public.buyer_prospects
    WHERE id = v_command.prospect_id AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.buyer_prospect_scope_allowed(
      v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Buyer replay is outside the current authorized scope' USING ERRCODE = '42501';
    END IF;
    RETURN v_command.result || jsonb_build_object('replayed', TRUE);
  END IF;

  SELECT * INTO v_prospect FROM public.buyer_prospects
  WHERE id = p_prospect_id AND company_id = v_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.buyer_prospect_scope_allowed(
    v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
  ) THEN RAISE EXCEPTION 'Buyer prospect is outside the authorized scope' USING ERRCODE = '42501'; END IF;
  IF v_prospect.version <> p_expected_version THEN
    RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_link FROM public.buyer_prospect_conversion_links
  WHERE prospect_id = p_prospect_id AND target_type = p_target_type;
  IF FOUND THEN
    IF v_link.target_id <> p_target_id THEN
      RAISE EXCEPTION 'Buyer prospect already has another target for this hand-off type' USING ERRCODE = '23505';
    END IF;
    v_result := jsonb_build_object(
      'prospectId', v_link.prospect_id, 'targetType', v_link.target_type,
      'targetId', v_link.target_id, 'version', v_prospect.version,
      'duplicate', TRUE, 'replayed', FALSE
    );
    INSERT INTO public.buyer_prospect_commands (
      company_id, prospect_id, command_type, command_fingerprint,
      actor_profile_id, idempotency_key, result
    ) VALUES (
      v_company_id, p_prospect_id, 'convert', v_fingerprint,
      v_actor, btrim(p_idempotency_key), v_result
    );
    RETURN v_result;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.buyer_prospect_conversion_links c
    WHERE c.company_id = v_company_id
      AND c.target_type = p_target_type AND c.target_id = p_target_id
      AND c.prospect_id <> p_prospect_id
  ) THEN
    RAISE EXCEPTION 'Conversion target is already linked to another buyer prospect' USING ERRCODE = '23505';
  END IF;

  IF p_target_type = 'registration_request' THEN
    IF v_prospect.stage <> 'won' OR v_prospect.consent_status <> 'granted'
       OR v_prospect.email_normalized IS NULL OR v_prospect.unit_id IS NULL THEN
      RAISE EXCEPTION 'Registration hand-off requires a won, consented buyer with email and unit evidence' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_registration FROM public.registration_requests r
    WHERE r.id = p_target_id AND r.company_id = v_company_id
      AND r.requested_role = 'owner' AND r.status <> 'rejected';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Existing owner registration request not found' USING ERRCODE = 'P0002';
    END IF;
    SELECT u.unit_no INTO v_unit_no FROM public.units u
    WHERE u.id = v_prospect.unit_id AND u.company_id = v_company_id
      AND u.site_id = v_prospect.site_id;
    IF v_registration.email_digest IS DISTINCT FROM extensions.digest(
         convert_to(v_prospect.email_normalized, 'UTF8'), 'sha256'
       ) OR NOT (
         v_registration.approved_unit_id = v_prospect.unit_id
         OR (
           v_registration.approved_unit_id IS NULL
           AND lower(btrim(COALESCE(v_registration.unit_claim, ''))) = lower(btrim(v_unit_no))
         )
       ) THEN
      RAISE EXCEPTION 'Registration hand-off requires matching email and unit evidence' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF v_prospect.stage NOT IN ('reservation', 'due_diligence', 'won') OR v_prospect.unit_id IS NULL THEN
      RAISE EXCEPTION 'Reservation reference requires a buyer at reservation stage or later' USING ERRCODE = '22023';
    END IF;
    SELECT * INTO v_reservation FROM public.reservations r
    WHERE r.id = p_target_id AND r.company_id = v_company_id
      AND r.site_id = v_prospect.site_id AND r.unit_id = v_prospect.unit_id
      AND r.status NOT IN ('cancelled', 'no_show')
      AND lower(btrim(COALESCE(r.guest_name, ''))) = lower(btrim(v_prospect.full_name));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Existing operational reservation reference not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  UPDATE public.buyer_prospects SET
    version = version + 1, updated_by = v_actor, updated_at = clock_timestamp()
  WHERE id = p_prospect_id AND version = p_expected_version
  RETURNING * INTO v_prospect;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.buyer_prospect_conversion_links (
    company_id, prospect_id, target_type, target_id, prospect_version,
    actor_profile_id, idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, p_prospect_id, p_target_type, p_target_id, v_prospect.version,
    v_actor, btrim(p_idempotency_key), v_fingerprint
  ) RETURNING * INTO v_link;
  v_result := jsonb_build_object(
    'prospectId', p_prospect_id, 'targetType', p_target_type,
    'targetId', p_target_id, 'version', v_prospect.version,
    'replayed', FALSE
  );
  INSERT INTO public.buyer_prospect_commands (
    company_id, prospect_id, command_type, command_fingerprint,
    actor_profile_id, idempotency_key, result
  ) VALUES (
    v_company_id, p_prospect_id, 'convert', v_fingerprint,
    v_actor, btrim(p_idempotency_key), v_result
  );
  RETURN v_result;
END;
$$;

ALTER TABLE public.buyer_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_consent_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_conversion_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_prospect_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY buyer_prospects_select_scope ON public.buyer_prospects
  FOR SELECT TO authenticated
  USING (public.buyer_prospect_scope_allowed(company_id, site_id, assigned_manager_id));

CREATE POLICY buyer_interests_select_scope ON public.buyer_prospect_interests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_interests.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));
CREATE POLICY buyer_stage_events_select_scope ON public.buyer_prospect_stage_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_stage_events.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));
CREATE POLICY buyer_consent_events_select_scope ON public.buyer_prospect_consent_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_consent_events.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));
CREATE POLICY buyer_notes_select_scope ON public.buyer_prospect_notes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_notes.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));
CREATE POLICY buyer_conversion_links_select_scope ON public.buyer_prospect_conversion_links
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_conversion_links.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));
CREATE POLICY buyer_commands_select_scope ON public.buyer_prospect_commands
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.buyer_prospects b WHERE b.id = buyer_prospect_commands.prospect_id
      AND public.buyer_prospect_scope_allowed(b.company_id, b.site_id, b.assigned_manager_id)
  ));

REVOKE ALL ON public.buyer_prospects FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_interests FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_stage_events FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_consent_events FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_notes FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_conversion_links FROM anon, authenticated;
REVOKE ALL ON public.buyer_prospect_commands FROM anon, authenticated;
GRANT SELECT ON public.buyer_prospects TO authenticated;
GRANT SELECT ON public.buyer_prospect_interests TO authenticated;
GRANT SELECT ON public.buyer_prospect_stage_events TO authenticated;
GRANT SELECT ON public.buyer_prospect_consent_events TO authenticated;
GRANT SELECT ON public.buyer_prospect_notes TO authenticated;
GRANT SELECT ON public.buyer_prospect_conversion_links TO authenticated;
GRANT SELECT ON public.buyer_prospect_commands TO authenticated;

REVOKE ALL ON FUNCTION public.buyer_stage_transition_allowed(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_consent_transition_allowed(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.buyer_prospect_scope_allowed(UUID, UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_buyer_prospect_v1(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transition_buyer_prospect_v1(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.convert_buyer_prospect_v1(UUID, INTEGER, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.buyer_prospect_scope_allowed(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_buyer_prospect_v1(TEXT, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_buyer_prospect_v1(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.convert_buyer_prospect_v1(UUID, INTEGER, TEXT, UUID, TEXT) TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.buyer_prospects;
EXCEPTION WHEN duplicate_object THEN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_buyer_prospect_note_v1(
  p_prospect_id UUID,
  p_expected_version INTEGER,
  p_body TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_actor UUID := auth.uid();
  v_prospect public.buyer_prospects%ROWTYPE;
  v_note public.buyer_prospect_notes%ROWTYPE;
  v_command public.buyer_prospect_commands%ROWTYPE;
  v_fingerprint TEXT;
  v_result JSONB;
BEGIN
  IF public.current_user_profile_role() NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION 'Buyer pipeline access denied' USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1
     OR length(btrim(COALESCE(p_body, ''))) NOT BETWEEN 2 AND 4000
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid buyer note command' USING ERRCODE = '22023';
  END IF;
  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'action', 'note', 'prospectId', p_prospect_id,
    'expectedVersion', p_expected_version, 'body', btrim(p_body)
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_company_id::TEXT || ':buyer-command:' || v_actor::TEXT || ':' || btrim(p_idempotency_key), 0
  ));
  SELECT * INTO v_command FROM public.buyer_prospect_commands
  WHERE company_id = v_company_id AND actor_profile_id = v_actor
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_command.command_type <> 'note' OR v_command.command_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Buyer idempotency key was reused with another command' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_prospect FROM public.buyer_prospects
    WHERE id = v_command.prospect_id AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.buyer_prospect_scope_allowed(
      v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Buyer replay is outside the current authorized scope' USING ERRCODE = '42501';
    END IF;
    RETURN v_command.result || jsonb_build_object('replayed', TRUE);
  END IF;
  SELECT * INTO v_prospect FROM public.buyer_prospects
  WHERE id = p_prospect_id AND company_id = v_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.buyer_prospect_scope_allowed(
    v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
  ) THEN RAISE EXCEPTION 'Buyer prospect is outside the authorized scope' USING ERRCODE = '42501'; END IF;
  IF v_prospect.version <> p_expected_version THEN
    RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001';
  END IF;
  UPDATE public.buyer_prospects SET
    version = version + 1, updated_by = v_actor, updated_at = clock_timestamp()
  WHERE id = p_prospect_id AND version = p_expected_version
  RETURNING * INTO v_prospect;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001'; END IF;
  INSERT INTO public.buyer_prospect_notes (
    company_id, prospect_id, body, prospect_version, actor_profile_id,
    idempotency_key, command_fingerprint
  ) VALUES (
    v_company_id, p_prospect_id, btrim(p_body), v_prospect.version, v_actor,
    btrim(p_idempotency_key), v_fingerprint
  ) RETURNING * INTO v_note;
  v_result := jsonb_build_object(
    'prospectId', p_prospect_id, 'version', v_prospect.version,
    'noteId', v_note.id, 'replayed', FALSE
  );
  INSERT INTO public.buyer_prospect_commands (
    company_id, prospect_id, command_type, command_fingerprint,
    actor_profile_id, idempotency_key, result
  ) VALUES (
    v_company_id, p_prospect_id, 'note', v_fingerprint,
    v_actor, btrim(p_idempotency_key), v_result
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.add_buyer_prospect_note_v1(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_buyer_prospect_note_v1(UUID, INTEGER, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_buyer_prospect_v1(
  p_prospect_id UUID,
  p_expected_version INTEGER,
  p_email TEXT,
  p_phone TEXT,
  p_assigned_manager_id UUID,
  p_follow_up_at TIMESTAMPTZ,
  p_source_detail TEXT,
  p_consent_status TEXT,
  p_consent_version TEXT,
  p_consent_text_digest TEXT,
  p_preferred_locale TEXT,
  p_interest_unit_ids UUID[],
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_actor UUID := auth.uid();
  v_role TEXT := public.current_user_profile_role();
  v_email TEXT := NULLIF(lower(btrim(COALESCE(p_email, ''))), '');
  v_phone TEXT := NULLIF(regexp_replace(COALESCE(p_phone, ''), '[^0-9+]', '', 'g'), '');
  v_consent_digest TEXT := NULLIF(lower(btrim(COALESCE(p_consent_text_digest, ''))), '');
  v_interests UUID[];
  v_prospect public.buyer_prospects%ROWTYPE;
  v_command public.buyer_prospect_commands%ROWTYPE;
  v_fingerprint TEXT;
  v_result JSONB;
  v_conflicts INTEGER;
  v_previous_consent_status TEXT;
BEGIN
  IF v_role NOT IN ('admin', 'manager') OR v_company_id IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION 'Buyer pipeline access denied' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(array_agg(DISTINCT x ORDER BY x), ARRAY[]::UUID[])
    INTO v_interests FROM unnest(COALESCE(p_interest_unit_ids, ARRAY[]::UUID[])) AS x;
  IF p_expected_version IS NULL OR p_expected_version < 1
     OR p_assigned_manager_id IS NULL
     OR p_consent_status NOT IN ('pending', 'granted', 'withdrawn')
     OR p_preferred_locale NOT IN ('tr', 'en', 'de', 'ru')
     OR (v_email IS NULL AND v_phone IS NULL)
     OR (v_email IS NOT NULL AND (length(v_email) > 254 OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'))
     OR (v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9]{7,20}$')
     OR cardinality(v_interests) > 20
     OR length(btrim(COALESCE(p_source_detail, ''))) > 500
     OR length(btrim(COALESCE(p_idempotency_key, ''))) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Invalid buyer update command' USING ERRCODE = '22023';
  END IF;
  IF (
    NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS NULL
  ) <> (v_consent_digest IS NULL) OR (
    NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS NOT NULL
    AND (
      length(btrim(p_consent_version)) < 3
      OR v_consent_digest !~ '^[0-9a-f]{64}$'
    )
  ) THEN
    RAISE EXCEPTION 'Buyer consent evidence must be a complete version and digest pair' USING ERRCODE = '22023';
  END IF;
  IF p_consent_status = 'pending' AND (
    NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS NOT NULL
    OR v_consent_digest IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Pending buyer consent cannot contain grant evidence' USING ERRCODE = '22023';
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(jsonb_build_object(
    'action', 'update', 'prospectId', p_prospect_id, 'expectedVersion', p_expected_version,
    'email', v_email, 'phone', v_phone, 'managerId', p_assigned_manager_id,
    'followUpAt', p_follow_up_at,
    'sourceDetail', NULLIF(btrim(COALESCE(p_source_detail, '')), ''),
    'consentStatus', p_consent_status,
    'consentVersion', NULLIF(btrim(COALESCE(p_consent_version, '')), ''),
    'consentTextDigest', v_consent_digest, 'locale', p_preferred_locale,
    'interestUnitIds', to_jsonb(v_interests)
  )::TEXT, 'UTF8'), 'sha256'), 'hex');
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_company_id::TEXT || ':buyer-command:' || v_actor::TEXT || ':' || btrim(p_idempotency_key), 0
  ));
  SELECT * INTO v_command FROM public.buyer_prospect_commands
  WHERE company_id = v_company_id AND actor_profile_id = v_actor
    AND idempotency_key = btrim(p_idempotency_key);
  IF FOUND THEN
    IF v_command.command_type <> 'update' OR v_command.command_fingerprint <> v_fingerprint THEN
      RAISE EXCEPTION 'Buyer idempotency key was reused with another command' USING ERRCODE = '23505';
    END IF;
    SELECT * INTO v_prospect FROM public.buyer_prospects
    WHERE id = v_command.prospect_id AND company_id = v_company_id;
    IF NOT FOUND OR NOT public.buyer_prospect_scope_allowed(
      v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
    ) THEN
      RAISE EXCEPTION 'Buyer replay is outside the current authorized scope' USING ERRCODE = '42501';
    END IF;
    RETURN v_command.result || jsonb_build_object('replayed', TRUE);
  END IF;

  SELECT * INTO v_prospect FROM public.buyer_prospects
  WHERE id = p_prospect_id AND company_id = v_company_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect not found' USING ERRCODE = 'P0002'; END IF;
  IF NOT public.buyer_prospect_scope_allowed(
    v_prospect.company_id, v_prospect.site_id, v_prospect.assigned_manager_id
  ) THEN RAISE EXCEPTION 'Buyer prospect is outside the authorized scope' USING ERRCODE = '42501'; END IF;
  IF v_prospect.version <> p_expected_version THEN
    RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001';
  END IF;
  IF NOT public.buyer_consent_transition_allowed(v_prospect.consent_status, p_consent_status) THEN
    RAISE EXCEPTION 'Buyer consent transition is not allowed' USING ERRCODE = '22023';
  END IF;
  IF v_prospect.consent_status = 'pending' AND p_consent_status = 'granted' AND (
    length(btrim(COALESCE(p_consent_version, ''))) < 3
    OR v_consent_digest !~ '^[0-9a-f]{64}$'
  ) THEN
    RAISE EXCEPTION 'Granted buyer consent requires a version and evidence digest' USING ERRCODE = '22023';
  END IF;
  IF v_prospect.consent_status IN ('granted', 'withdrawn') AND (
    (
      NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS NOT NULL
      AND NULLIF(btrim(COALESCE(p_consent_version, '')), '') IS DISTINCT FROM v_prospect.consent_version
    )
    OR (
      v_consent_digest IS NOT NULL
      AND v_consent_digest IS DISTINCT FROM v_prospect.consent_text_digest
    )
  ) THEN
    RAISE EXCEPTION 'Buyer consent grant evidence is immutable' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_assigned_manager_id
      AND p.company_id = v_company_id AND p.role = 'manager'
  ) OR NOT EXISTS (
    SELECT 1 FROM public.profile_site_assignments a
    WHERE a.company_id = v_company_id AND a.site_id = v_prospect.site_id
      AND a.profile_id = p_assigned_manager_id AND a.access_role = 'manager'
      AND a.status = 'active' AND a.valid_from <= clock_timestamp()
      AND (a.valid_until IS NULL OR a.valid_until > clock_timestamp())
  ) OR (v_role = 'manager' AND p_assigned_manager_id <> v_actor) THEN
    RAISE EXCEPTION 'Assigned manager lacks an active site assignment' USING ERRCODE = '42501';
  END IF;
  IF cardinality(v_interests) > 0 AND (
    SELECT count(*) FROM public.units u
    WHERE u.id = ANY(v_interests) AND u.company_id = v_company_id
      AND u.site_id = v_prospect.site_id
  ) <> cardinality(v_interests) THEN
    RAISE EXCEPTION 'An interest unit is outside the buyer site' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_company_id::TEXT || ':buyer:' || contact_key, 0)
  )
  FROM unnest(ARRAY[
    CASE WHEN v_email IS NOT NULL THEN 'email:' || v_email END,
    CASE WHEN v_phone IS NOT NULL THEN 'phone:' || v_phone END
  ]) AS contact_locks(contact_key)
  WHERE contact_key IS NOT NULL
  ORDER BY contact_key;
  SELECT count(DISTINCT b.id)::INTEGER INTO v_conflicts
  FROM public.buyer_prospects b
  WHERE b.company_id = v_company_id AND b.id <> p_prospect_id AND b.stage <> 'lost'
    AND ((v_email IS NOT NULL AND b.email_normalized = v_email)
      OR (v_phone IS NOT NULL AND b.phone_normalized = v_phone));
  IF v_conflicts > 0 THEN
    RAISE EXCEPTION 'Buyer contact values already belong to another active prospect' USING ERRCODE = '23505';
  END IF;

  v_previous_consent_status := v_prospect.consent_status;
  UPDATE public.buyer_prospects SET
    email = v_email, email_normalized = v_email,
    phone = NULLIF(btrim(COALESCE(p_phone, '')), ''), phone_normalized = v_phone,
    assigned_manager_id = p_assigned_manager_id, follow_up_at = p_follow_up_at,
    source_detail = NULLIF(btrim(COALESCE(p_source_detail, '')), ''),
    preferred_locale = p_preferred_locale, consent_status = p_consent_status,
    consent_version = CASE
      WHEN consent_status = 'pending' AND p_consent_status = 'granted'
        THEN btrim(p_consent_version)
      ELSE consent_version END,
    consent_text_digest = CASE
      WHEN consent_status = 'pending' AND p_consent_status = 'granted'
        THEN v_consent_digest
      ELSE consent_text_digest END,
    consent_accepted_at = CASE
      WHEN consent_status = 'pending' AND p_consent_status = 'granted'
        THEN clock_timestamp()
      ELSE consent_accepted_at END,
    version = version + 1, updated_by = v_actor, updated_at = clock_timestamp()
  WHERE id = p_prospect_id AND version = p_expected_version
  RETURNING * INTO v_prospect;
  IF NOT FOUND THEN RAISE EXCEPTION 'Buyer prospect version conflict' USING ERRCODE = '40001'; END IF;

  DELETE FROM public.buyer_prospect_interests WHERE prospect_id = p_prospect_id;
  INSERT INTO public.buyer_prospect_interests (
    company_id, prospect_id, site_id, unit_id, priority, created_by
  )
  SELECT v_company_id, p_prospect_id, v_prospect.site_id, x.unit_id, x.priority, v_actor
  FROM unnest(v_interests) WITH ORDINALITY AS x(unit_id, priority);
  IF v_previous_consent_status <> v_prospect.consent_status THEN
    INSERT INTO public.buyer_prospect_consent_events (
      company_id, prospect_id, from_status, to_status, consent_version,
      consent_text_digest, consent_accepted_at, prospect_version,
      actor_profile_id, idempotency_key, command_fingerprint
    ) VALUES (
      v_company_id, p_prospect_id, v_previous_consent_status,
      v_prospect.consent_status, v_prospect.consent_version,
      v_prospect.consent_text_digest, v_prospect.consent_accepted_at,
      v_prospect.version, v_actor, btrim(p_idempotency_key), v_fingerprint
    );
  END IF;
  v_result := jsonb_build_object(
    'prospectId', p_prospect_id, 'version', v_prospect.version,
    'stage', v_prospect.stage, 'replayed', FALSE
  );
  INSERT INTO public.buyer_prospect_commands (
    company_id, prospect_id, command_type, command_fingerprint,
    actor_profile_id, idempotency_key, result
  ) VALUES (
    v_company_id, p_prospect_id, 'update', v_fingerprint,
    v_actor, btrim(p_idempotency_key), v_result
  );
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.update_buyer_prospect_v1(UUID, INTEGER, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_buyer_prospect_v1(UUID, INTEGER, TEXT, TEXT, UUID, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT, TEXT, UUID[], TEXT) TO authenticated;

COMMIT;
