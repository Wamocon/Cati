-- 1Cati public QR problem reporting.
-- Account-free intake is deliberately separated from service tickets: a report
-- can become a ticket only through an authenticated, site-scoped human review.

CREATE TABLE public.public_report_qr_placements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  public_code TEXT NOT NULL UNIQUE,
  zone_code TEXT NOT NULL,
  zone_label JSONB NOT NULL DEFAULT '{}'::JSONB,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  valid_until TIMESTAMPTZ,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (public_code ~ '^qr_[0-9a-f]{32}$'),
  CHECK (length(zone_code) BETWEEN 2 AND 80),
  CHECK (jsonb_typeof(zone_label) = 'object'),
  CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE UNIQUE INDEX public_report_qr_active_zone_idx
  ON public.public_report_qr_placements(site_id, zone_code)
  WHERE active;
CREATE INDEX public_report_qr_company_site_idx
  ON public.public_report_qr_placements(company_id, site_id, active);

CREATE TABLE public.public_problem_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  placement_id UUID NOT NULL REFERENCES public.public_report_qr_placements(id) ON DELETE RESTRICT,
  public_reference TEXT NOT NULL UNIQUE,
  tracking_token_digest BYTEA NOT NULL,
  submission_key TEXT NOT NULL,
  submission_payload_digest BYTEA NOT NULL,
  abuse_key_digest TEXT NOT NULL,
  abuse_agent_digest TEXT NOT NULL,
  duplicate_fingerprint TEXT NOT NULL,
  possible_duplicate_of UUID REFERENCES public.public_problem_reports(id) ON DELETE SET NULL,
  category TEXT NOT NULL CHECK (category IN (
    'cleaning', 'technical', 'security', 'accessibility', 'noise', 'other'
  )),
  location_detail TEXT,
  description TEXT NOT NULL,
  contact_kind TEXT CHECK (contact_kind IS NULL OR contact_kind IN ('email', 'phone')),
  contact_value TEXT,
  language TEXT NOT NULL DEFAULT 'tr' CHECK (language IN ('tr', 'en', 'de', 'ru')),
  safety_code TEXT CHECK (safety_code IS NULL OR safety_code IN (
    'life_safety', 'fire_smoke', 'gas_leak', 'medical_emergency',
    'electrical_hazard', 'elevator_entrapment', 'flooding_active', 'security_threat'
  )),
  safety_policy_version TEXT NOT NULL DEFAULT 'public-report-safety-2026-07-v1',
  safety_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted', 'under_review', 'awaiting_information', 'rejected', 'converted'
  )),
  public_message TEXT NOT NULL,
  internal_reason TEXT,
  converted_ticket_id UUID UNIQUE REFERENCES public.service_tickets(id) ON DELETE RESTRICT,
  workflow_version INTEGER NOT NULL DEFAULT 1 CHECK (workflow_version > 0),
  consent_version TEXT NOT NULL,
  consent_text_digest TEXT NOT NULL,
  consent_locale TEXT NOT NULL CHECK (consent_locale IN ('tr', 'en', 'de', 'ru')),
  consent_accepted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  retention_class TEXT NOT NULL DEFAULT 'public_problem_report_24_months',
  retention_due_at TIMESTAMPTZ NOT NULL DEFAULT (clock_timestamp() + INTERVAL '24 months'),
  retention_anonymized_at TIMESTAMPTZ,
  retention_command_key TEXT,
  external_execution_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  last_transition_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (placement_id, submission_key),
  CHECK (length(public_reference) BETWEEN 12 AND 40),
  CHECK (length(submission_key) BETWEEN 16 AND 200),
  CHECK (abuse_key_digest ~ '^[0-9a-f]{64}$'),
  CHECK (abuse_agent_digest ~ '^[0-9a-f]{64}$'),
  CHECK (duplicate_fingerprint ~ '^[0-9a-f]{64}$'),
  CHECK (length(description) BETWEEN 10 AND 4000),
  CHECK (location_detail IS NULL OR length(location_detail) <= 240),
  CHECK (contact_value IS NULL OR length(contact_value) <= 254),
  CHECK ((contact_kind IS NULL) = (contact_value IS NULL)),
  CHECK (length(public_message) BETWEEN 5 AND 500),
  CHECK (internal_reason IS NULL OR length(internal_reason) <= 1000),
  CHECK (consent_text_digest ~ '^[0-9a-f]{64}$'),
  CHECK (retention_due_at > created_at),
  CHECK ((retention_anonymized_at IS NULL) = (retention_command_key IS NULL)),
  CHECK (retention_command_key IS NULL OR length(retention_command_key) BETWEEN 16 AND 200),
  CHECK (safety_code IS NULL OR safety_acknowledged),
  CHECK (NOT external_execution_allowed),
  CHECK (
    (status = 'converted' AND converted_ticket_id IS NOT NULL)
    OR (status <> 'converted' AND converted_ticket_id IS NULL)
  )
);

CREATE INDEX public_problem_reports_manager_queue_idx
  ON public.public_problem_reports(company_id, site_id, status, created_at DESC);
CREATE INDEX public_problem_reports_abuse_window_idx
  ON public.public_problem_reports(placement_id, abuse_key_digest, created_at DESC);
CREATE INDEX public_problem_reports_duplicate_idx
  ON public.public_problem_reports(placement_id, duplicate_fingerprint, created_at DESC);
CREATE UNIQUE INDEX public_problem_reports_retention_command_idx
  ON public.public_problem_reports(company_id, retention_command_key)
  WHERE retention_command_key IS NOT NULL;

CREATE TABLE public.public_problem_report_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  report_id UUID NOT NULL REFERENCES public.public_problem_reports(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'submitted', 'start_review', 'request_information', 'resume_review', 'rejected', 'converted'
  )),
  report_version INTEGER NOT NULL CHECK (report_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  public_message TEXT NOT NULL,
  internal_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (report_id, report_version),
  UNIQUE (company_id, actor_profile_id, idempotency_key),
  CHECK (length(public_message) BETWEEN 5 AND 500),
  CHECK (internal_reason IS NULL OR length(internal_reason) <= 1000),
  CHECK (length(idempotency_key) BETWEEN 8 AND 240)
);

CREATE INDEX public_problem_report_events_timeline_idx
  ON public.public_problem_report_events(report_id, report_version, created_at);

COMMENT ON TABLE public.public_report_qr_placements IS
  'Opaque, revocable QR placements bound to exactly one company, site and physical zone.';
COMMENT ON TABLE public.public_problem_reports IS
  'Account-free public intake with hashed tracking authority, consent evidence, retention and human-only ticket conversion.';
COMMENT ON COLUMN public.public_problem_reports.external_execution_allowed IS
  'Invariant: public intake never authorizes emergency calls, dispatch, access, spend, payment or other external execution.';
COMMENT ON TABLE public.public_problem_report_events IS
  'Append-only, versioned report workflow evidence. Public status responses expose only safe messages.';

DROP TRIGGER IF EXISTS protect_public_problem_report_events
  ON public.public_problem_report_events;
CREATE TRIGGER protect_public_problem_report_events
  BEFORE UPDATE OR DELETE ON public.public_problem_report_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

CREATE OR REPLACE FUNCTION public.classify_public_report_safety(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_text TEXT := lower(COALESCE(p_text, ''));
BEGIN
  IF v_text ~ '(fire|smoke|flames|yangın|duman|alev|feuer|rauch|flammen|пожар|дым|пламя)'
     AND v_text !~ '(no|not|without)\s+(active\s+)?(fire|smoke|flames)'
     AND v_text !~ '(yangın|duman|alev)\s+(yok|değil)'
     AND v_text !~ '(kein|keine|keinen|ohne)\s+(feuer|rauch|flammen)'
     AND v_text !~ '((пожара|дыма|пламени)\s+нет|нет\s+(пожара|дыма|пламени))'
  THEN RETURN 'fire_smoke'; END IF;

  IF v_text ~ '(gas leak|smell of gas|gaz kaçağı|gaz kokusu|gasleck|gasgeruch|утечк[аи] газа|запах газа)'
     AND v_text !~ '(no|not|without)\s+(gas leak|smell of gas)'
     AND v_text !~ '(gaz kaçağı|gaz kokusu)\s+(yok|değil)'
     AND v_text !~ '(kein|keine|ohne)\s+(gasleck|gasgeruch)'
     AND v_text !~ '(нет\s+(утечки|запаха) газа)'
  THEN RETURN 'gas_leak'; END IF;

  IF v_text ~ '(person trapped|trapped in (the )?lift|elevator entrapment|asansörde.*(mahsur|sıkış)|aufzug.*(eingeschlossen|stecken)|лифт.*(застрял|заблокирован))'
  THEN RETURN 'elevator_entrapment'; END IF;

  IF v_text ~ '(medical emergency|unconscious|not breathing|tıbbi acil|bilinci kapalı|nefes almıyor|medizinischer notfall|bewusstlos|atmet nicht|медицинская помощь|без сознания|не дышит)'
  THEN RETURN 'medical_emergency'; END IF;

  IF v_text ~ '(exposed live wire|electric shock|sparking cable|açık elektrik|elektrik çarp|kıvılcım|stromschlag|offene stromleitung|funken|оголенн.*провод|удар током|искр)'
  THEN RETURN 'electrical_hazard'; END IF;

  IF v_text ~ '(active flooding|rapidly flooding|su basıyor|aktif sel|akut.*überflut|wasser strömt|затапливает|сильн.*потоп)'
  THEN RETURN 'flooding_active'; END IF;

  IF v_text ~ '(weapon|armed threat|violent attack|silah|silahlı|şiddetli saldırı|waffe|bewaffnet|gewalttätiger angriff|оружие|вооружен|нападение)'
  THEN RETURN 'security_threat'; END IF;

  IF v_text ~ '(immediate danger to life|hayati tehlike|akute lebensgefahr|угроза жизни)'
  THEN RETURN 'life_safety'; END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.public_report_contains_identity_data(p_payload JSONB)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(COALESCE(p_payload::TEXT, '')) ~
    '(passport|pasaport|reisepass|паспорт|tckn|kimlik|identity[_ -]?number|personalausweis|идентификационн|biometric|biyometr|biometr|биометр)';
$$;

CREATE OR REPLACE FUNCTION public.public_report_default_message(p_status TEXT, p_language TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE COALESCE(p_language, 'tr')
    WHEN 'en' THEN CASE p_status
      WHEN 'submitted' THEN 'Your report was received and is waiting for human review.'
      WHEN 'under_review' THEN 'A site manager is reviewing your report.'
      WHEN 'awaiting_information' THEN 'Management needs more information. Use your optional contact route or contact the site office.'
      WHEN 'rejected' THEN 'Management closed this report without creating a service ticket.'
      WHEN 'converted' THEN 'Management reviewed this report and created a service ticket.'
      ELSE 'Your report status was updated.' END
    WHEN 'de' THEN CASE p_status
      WHEN 'submitted' THEN 'Ihre Meldung ist eingegangen und wartet auf eine menschliche Prüfung.'
      WHEN 'under_review' THEN 'Die Standortverwaltung prüft Ihre Meldung.'
      WHEN 'awaiting_information' THEN 'Die Verwaltung benötigt weitere Informationen. Nutzen Sie den optionalen Kontaktweg oder das Standortbüro.'
      WHEN 'rejected' THEN 'Die Verwaltung hat diese Meldung ohne Service-Ticket geschlossen.'
      WHEN 'converted' THEN 'Die Verwaltung hat die Meldung geprüft und ein Service-Ticket erstellt.'
      ELSE 'Der Status Ihrer Meldung wurde aktualisiert.' END
    WHEN 'ru' THEN CASE p_status
      WHEN 'submitted' THEN 'Сообщение получено и ожидает проверки сотрудником.'
      WHEN 'under_review' THEN 'Управляющий объекта проверяет сообщение.'
      WHEN 'awaiting_information' THEN 'Управляющему нужны дополнительные сведения. Используйте указанный контакт или обратитесь в офис объекта.'
      WHEN 'rejected' THEN 'Управляющий закрыл сообщение без создания сервисной заявки.'
      WHEN 'converted' THEN 'Управляющий проверил сообщение и создал сервисную заявку.'
      ELSE 'Статус сообщения обновлён.' END
    ELSE CASE p_status
      WHEN 'submitted' THEN 'Bildiriminiz alındı ve insan incelemesini bekliyor.'
      WHEN 'under_review' THEN 'Site yöneticisi bildiriminizi inceliyor.'
      WHEN 'awaiting_information' THEN 'Yönetimin ek bilgiye ihtiyacı var. İsteğe bağlı iletişim yolunu veya site ofisini kullanın.'
      WHEN 'rejected' THEN 'Yönetim bu bildirimi servis talebi oluşturmadan kapattı.'
      WHEN 'converted' THEN 'Yönetim bildirimi inceledi ve servis talebi oluşturdu.'
      ELSE 'Bildiriminizin durumu güncellendi.' END
  END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_public_report_qr(p_public_code TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'siteLabel', s.name,
    'zoneCode', q.zone_code,
    'zoneLabels', q.zone_label,
    'active', TRUE
  )
  FROM public.public_report_qr_placements q
  JOIN public.sites s ON s.id = q.site_id AND s.company_id = q.company_id
  WHERE q.public_code = btrim(COALESCE(p_public_code, ''))
    AND q.active
    AND q.valid_from <= clock_timestamp()
    AND (q.valid_until IS NULL OR q.valid_until > clock_timestamp())
    AND s.status <> 'archived'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.submit_public_problem_report(
  p_qr_code TEXT,
  p_payload JSONB,
  p_tracking_token TEXT,
  p_submission_key TEXT,
  p_abuse_digest TEXT,
  p_agent_digest TEXT,
  p_duplicate_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_placement public.public_report_qr_placements%ROWTYPE;
  v_existing public.public_problem_reports%ROWTYPE;
  v_report public.public_problem_reports%ROWTYPE;
  v_duplicate_id UUID;
  v_payload_digest BYTEA;
  v_tracking_digest BYTEA;
  v_reference_seed TEXT;
  v_submission_key TEXT := btrim(COALESCE(p_submission_key, ''));
  v_category TEXT := lower(btrim(COALESCE(p_payload->>'category', '')));
  v_description TEXT := btrim(COALESCE(p_payload->>'description', ''));
  v_location_detail TEXT := NULLIF(btrim(COALESCE(p_payload->>'locationDetail', '')), '');
  v_language TEXT := lower(btrim(COALESCE(p_payload->>'language', 'tr')));
  v_contact_kind TEXT := NULLIF(lower(btrim(COALESCE(p_payload->>'contactKind', ''))), '');
  v_contact_value TEXT := NULLIF(btrim(COALESCE(p_payload->>'contactValue', '')), '');
  v_consent_version TEXT := btrim(COALESCE(p_payload->>'consentVersion', ''));
  v_consent_digest TEXT := lower(btrim(COALESCE(p_payload->>'consentTextDigest', '')));
  v_consent_locale TEXT := lower(btrim(COALESCE(p_payload->>'consentLocale', '')));
  v_safety_code TEXT;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_SUBMIT_SERVICE_ROLE_REQUIRED';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_INVALID_PAYLOAD';
  END IF;
  IF (p_payload - ARRAY[
    'category', 'description', 'locationDetail', 'language', 'contactKind',
    'contactValue', 'consent', 'consentVersion', 'consentTextDigest',
    'consentLocale', 'safetyAcknowledged', 'companyWebsite'
  ]) <> '{}'::JSONB THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_UNKNOWN_FIELDS';
  END IF;
  IF NULLIF(btrim(COALESCE(p_payload->>'companyWebsite', '')), '') IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_SPAM_REJECTED';
  END IF;
  IF public.public_report_contains_identity_data(p_payload) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_IDENTITY_DATA_FORBIDDEN';
  END IF;
  IF v_submission_key !~ '^[A-Za-z0-9._:-]{16,200}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_IDEMPOTENCY_REQUIRED';
  END IF;
  IF length(btrim(COALESCE(p_tracking_token, ''))) < 32
     OR length(btrim(COALESCE(p_tracking_token, ''))) > 200
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_TRACKING_TOKEN_INVALID';
  END IF;
  IF lower(COALESCE(p_abuse_digest, '')) !~ '^[0-9a-f]{64}$'
     OR lower(COALESCE(p_agent_digest, '')) !~ '^[0-9a-f]{64}$'
     OR lower(COALESCE(p_duplicate_fingerprint, '')) !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_FINGERPRINT_INVALID';
  END IF;
  IF v_category NOT IN ('cleaning', 'technical', 'security', 'accessibility', 'noise', 'other')
     OR length(v_description) < 10 OR length(v_description) > 4000
     OR (v_location_detail IS NOT NULL AND length(v_location_detail) > 240)
     OR v_language NOT IN ('tr', 'en', 'de', 'ru')
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_CONTENT_INVALID';
  END IF;
  IF (v_contact_kind IS NULL) IS DISTINCT FROM (v_contact_value IS NULL)
     OR (v_contact_kind IS NOT NULL AND v_contact_kind NOT IN ('email', 'phone'))
     OR (v_contact_value IS NOT NULL AND length(v_contact_value) > 254)
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_CONTACT_INVALID';
  END IF;
  IF v_contact_kind = 'email'
     AND v_contact_value !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_CONTACT_INVALID';
  END IF;
  IF v_contact_kind = 'phone'
     AND v_contact_value !~ '^\+?[0-9 ()-]{7,30}$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_CONTACT_INVALID';
  END IF;
  IF p_payload->'consent' IS DISTINCT FROM 'true'::JSONB
     OR v_consent_version <> 'public-report-kvkk-2026-07-v1'
     OR v_consent_digest !~ '^[0-9a-f]{64}$'
     OR v_consent_locale NOT IN ('tr', 'en', 'de', 'ru')
     OR v_consent_locale IS DISTINCT FROM v_language
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_CONSENT_REQUIRED';
  END IF;

  v_safety_code := public.classify_public_report_safety(
    concat_ws(' ', v_description, v_location_detail)
  );
  IF v_safety_code IS NOT NULL
     AND p_payload->'safetyAcknowledged' IS DISTINCT FROM 'true'::JSONB
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_112_ACKNOWLEDGEMENT_REQUIRED';
  END IF;

  SELECT * INTO v_placement
  FROM public.public_report_qr_placements q
  WHERE q.public_code = btrim(COALESCE(p_qr_code, ''))
    AND q.active
    AND q.valid_from <= clock_timestamp()
    AND (q.valid_until IS NULL OR q.valid_until > clock_timestamp())
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_QR_NOT_FOUND';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = v_placement.site_id
      AND s.company_id = v_placement.company_id
      AND s.status <> 'archived'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_QR_NOT_FOUND';
  END IF;

  v_payload_digest := extensions.digest(
    convert_to(jsonb_strip_nulls(p_payload)::TEXT, 'UTF8'), 'sha256'
  );
  v_tracking_digest := extensions.digest(
    convert_to(btrim(p_tracking_token), 'UTF8'), 'sha256'
  );
  PERFORM pg_advisory_xact_lock(hashtextextended(
    v_placement.id::TEXT || ':' || v_submission_key, 0
  ));

  SELECT * INTO v_existing
  FROM public.public_problem_reports r
  WHERE r.placement_id = v_placement.id
    AND r.submission_key = v_submission_key
  FOR UPDATE;
  IF FOUND THEN
    IF v_existing.submission_payload_digest IS DISTINCT FROM v_payload_digest
       OR v_existing.tracking_token_digest IS DISTINCT FROM v_tracking_digest
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'reference', v_existing.public_reference,
      'status', v_existing.status,
      'version', v_existing.workflow_version,
      'safetyCode', v_existing.safety_code,
      'replayed', TRUE
    );
  END IF;

  -- Fixed order is intentional: concurrent submissions for the same placement
  -- serialize the abuse-window check first, then the duplicate check.
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'public-report-abuse:' || v_placement.id::TEXT || ':' || lower(p_abuse_digest), 0
  ));
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'public-report-duplicate:' || v_placement.id::TEXT || ':' || lower(p_duplicate_fingerprint), 0
  ));

  IF (
    SELECT count(*) FROM public.public_problem_reports r
    WHERE r.placement_id = v_placement.id
      AND r.abuse_key_digest = lower(p_abuse_digest)
      AND r.created_at >= clock_timestamp() - INTERVAL '10 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PUBLIC_REPORT_RATE_LIMITED';
  END IF;

  SELECT r.id INTO v_duplicate_id
  FROM public.public_problem_reports r
  WHERE r.placement_id = v_placement.id
    AND r.duplicate_fingerprint = lower(p_duplicate_fingerprint)
    AND r.created_at >= clock_timestamp() - INTERVAL '24 hours'
  ORDER BY r.created_at DESC
  LIMIT 1;

  v_reference_seed := upper(replace(gen_random_uuid()::TEXT, '-', ''));
  INSERT INTO public.public_problem_reports (
    company_id, site_id, placement_id, public_reference, tracking_token_digest,
    submission_key, submission_payload_digest, abuse_key_digest,
    abuse_agent_digest, duplicate_fingerprint, possible_duplicate_of, category, location_detail,
    description, contact_kind, contact_value, language, safety_code,
    safety_acknowledged, public_message, consent_version, consent_text_digest,
    consent_locale
  ) VALUES (
    v_placement.company_id,
    v_placement.site_id,
    v_placement.id,
    'PR-' || substr(v_reference_seed, 1, 4) || '-' || substr(v_reference_seed, 5, 4)
      || '-' || substr(v_reference_seed, 9, 4),
    v_tracking_digest,
    v_submission_key,
    v_payload_digest,
    lower(p_abuse_digest),
    lower(p_agent_digest),
    lower(p_duplicate_fingerprint),
    v_duplicate_id,
    v_category,
    v_location_detail,
    v_description,
    v_contact_kind,
    v_contact_value,
    v_language,
    v_safety_code,
    COALESCE((p_payload->>'safetyAcknowledged')::BOOLEAN, FALSE),
    public.public_report_default_message('submitted', v_language),
    v_consent_version,
    v_consent_digest,
    v_consent_locale
  ) RETURNING * INTO v_report;

  INSERT INTO public.public_problem_report_events (
    company_id, site_id, report_id, event_type, report_version,
    public_message, metadata, idempotency_key
  ) VALUES (
    v_report.company_id, v_report.site_id, v_report.id, 'submitted', 1,
    v_report.public_message,
    jsonb_build_object(
      'safetyCode', v_report.safety_code,
      'possibleDuplicate', v_report.possible_duplicate_of IS NOT NULL,
      'externalExecutionAllowed', FALSE
    ),
    'submit:' || encode(extensions.digest(
      convert_to(v_placement.id::TEXT || ':' || v_submission_key, 'UTF8'), 'sha256'
    ), 'hex')
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_report.company_id, NULL, 'public_report.submitted',
    'public_problem_reports', v_report.id, NULL,
    jsonb_build_object(
      'reference', v_report.public_reference,
      'siteId', v_report.site_id,
      'category', v_report.category,
      'safetyCode', v_report.safety_code,
      'consentVersion', v_report.consent_version,
      'externalExecutionAllowed', FALSE
    ),
    'audit:public-report:submit:' || v_report.id::TEXT
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_report.company_id, 'internal_event_bus', 'public_report.submitted',
    'public_problem_reports', v_report.id,
    jsonb_build_object(
      'reportId', v_report.id,
      'reference', v_report.public_reference,
      'siteId', v_report.site_id,
      'status', v_report.status,
      'safetyCode', v_report.safety_code,
      'externalActionAllowed', FALSE
    ),
    'queued', 'public-report:submit:' || v_report.id::TEXT
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'reference', v_report.public_reference,
    'status', v_report.status,
    'version', v_report.workflow_version,
    'safetyCode', v_report.safety_code,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_problem_report_status(
  p_reference TEXT,
  p_tracking_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_report public.public_problem_reports%ROWTYPE;
  v_history JSONB;
BEGIN
  SELECT * INTO v_report
  FROM public.public_problem_reports r
  WHERE upper(r.public_reference) = upper(btrim(COALESCE(p_reference, '')))
    AND r.tracking_token_digest = extensions.digest(
      convert_to(btrim(COALESCE(p_tracking_token, '')), 'UTF8'), 'sha256'
    )
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', CASE e.event_type
      WHEN 'start_review' THEN 'under_review'
      WHEN 'resume_review' THEN 'under_review'
      WHEN 'request_information' THEN 'awaiting_information'
      ELSE e.event_type
    END,
    'message', e.public_message,
    'at', e.created_at
  ) ORDER BY e.report_version), '[]'::JSONB)
  INTO v_history
  FROM public.public_problem_report_events e
  WHERE e.report_id = v_report.id;

  RETURN jsonb_build_object(
    'reference', v_report.public_reference,
    'status', v_report.status,
    'version', v_report.workflow_version,
    'message', v_report.public_message,
    'safetyCode', v_report.safety_code,
    'createdAt', v_report.created_at,
    'updatedAt', v_report.updated_at,
    'nextStep', CASE v_report.status
      WHEN 'submitted' THEN 'await_human_review'
      WHEN 'under_review' THEN 'await_human_review'
      WHEN 'awaiting_information' THEN 'contact_site_management'
      WHEN 'rejected' THEN 'closed'
      WHEN 'converted' THEN 'service_ticket_created'
    END,
    'history', v_history
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_problem_report_review_data()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_reports JSONB;
  v_placements JSONB;
  v_sites JSONB;
BEGIN
  IF v_actor_id IS NULL OR (
    NOT public.is_platform_super_admin() AND v_actor_role NOT IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_MANAGER_AUTH_REQUIRED';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'reference', r.public_reference,
    'siteId', r.site_id,
    'siteLabel', s.name,
    'zoneCode', q.zone_code,
    'zoneLabels', q.zone_label,
    'category', r.category,
    'locationDetail', r.location_detail,
    'description', r.description,
    'contactKind', r.contact_kind,
    'contactValue', r.contact_value,
    'language', r.language,
    'safetyCode', r.safety_code,
    'status', r.status,
    'version', r.workflow_version,
    'publicMessage', r.public_message,
    'internalReason', r.internal_reason,
    'possibleDuplicateReference', duplicate.public_reference,
    'convertedTicketId', r.converted_ticket_id,
    'consentVersion', r.consent_version,
    'retentionDueAt', r.retention_due_at,
    'createdAt', r.created_at,
    'updatedAt', r.updated_at,
    'events', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'eventType', e.event_type,
        'version', e.report_version,
        'publicMessage', e.public_message,
        'internalReason', e.internal_reason,
        'actorRole', e.actor_role,
        'createdAt', e.created_at
      ) ORDER BY e.report_version)
      FROM public.public_problem_report_events e
      WHERE e.report_id = r.id
    ), '[]'::JSONB)
  ) ORDER BY
    CASE r.status
      WHEN 'submitted' THEN 1
      WHEN 'under_review' THEN 2
      WHEN 'awaiting_information' THEN 3
      ELSE 4
    END,
    r.created_at DESC
  ), '[]'::JSONB)
  INTO v_reports
  FROM public.public_problem_reports r
  JOIN public.sites s ON s.id = r.site_id AND s.company_id = r.company_id
  JOIN public.public_report_qr_placements q ON q.id = r.placement_id
  LEFT JOIN public.public_problem_reports duplicate ON duplicate.id = r.possible_duplicate_of
  WHERE public.current_user_can_manage_site(r.site_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', q.id,
    'siteId', q.site_id,
    'siteLabel', s.name,
    'publicCode', q.public_code,
    'zoneCode', q.zone_code,
    'zoneLabels', q.zone_label,
    'active', q.active,
    'validUntil', q.valid_until
  ) ORDER BY s.name, q.zone_code), '[]'::JSONB)
  INTO v_placements
  FROM public.public_report_qr_placements q
  JOIN public.sites s ON s.id = q.site_id AND s.company_id = q.company_id
  WHERE public.current_user_can_manage_site(q.site_id);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'label', s.name
  ) ORDER BY s.name), '[]'::JSONB)
  INTO v_sites
  FROM public.sites s
  WHERE s.status <> 'archived'
    AND public.current_user_can_manage_site(s.id);

  RETURN jsonb_build_object(
    'reports', v_reports,
    'placements', v_placements,
    'sites', v_sites
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_public_problem_report_command(
  p_report_id UUID,
  p_expected_version INTEGER,
  p_action TEXT,
  p_public_message TEXT,
  p_internal_reason TEXT,
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
  v_report public.public_problem_reports%ROWTYPE;
  v_existing public.public_problem_report_events%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
  v_action TEXT := lower(btrim(COALESCE(p_action, '')));
  v_requested_public_message TEXT := btrim(COALESCE(p_public_message, ''));
  v_public_message TEXT := v_requested_public_message;
  v_internal_reason TEXT := NULLIF(btrim(COALESCE(p_internal_reason, '')), '');
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_next_status TEXT;
  v_event_type TEXT;
  v_zone_label TEXT;
BEGIN
  IF v_actor_id IS NULL OR (
    NOT public.is_platform_super_admin() AND v_actor_role NOT IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_MANAGER_AUTH_REQUIRED';
  END IF;
  IF v_action NOT IN ('start_review', 'request_information', 'reject', 'convert')
     OR length(v_key) < 8 OR length(v_key) > 200
     OR length(v_public_message) > 500
     OR (v_internal_reason IS NOT NULL AND length(v_internal_reason) > 1000)
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_REVIEW_INVALID';
  END IF;
  IF v_action IN ('reject', 'convert')
     AND (v_internal_reason IS NULL OR length(v_internal_reason) < 5)
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_REVIEW_REASON_REQUIRED';
  END IF;

  SELECT * INTO v_report
  FROM public.public_problem_reports r
  WHERE r.id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_NOT_FOUND';
  END IF;
  IF NOT public.current_user_can_manage_site(v_report.site_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_SITE_SCOPE_DENIED';
  END IF;

  SELECT * INTO v_existing
  FROM public.public_problem_report_events e
  WHERE e.company_id = v_report.company_id
    AND e.actor_profile_id = v_actor_id
    AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.report_id IS DISTINCT FROM v_report.id
       OR v_existing.metadata->>'action' IS DISTINCT FROM v_action
       OR v_existing.metadata->>'expectedVersion' IS DISTINCT FROM p_expected_version::TEXT
       OR v_existing.metadata->>'requestedPublicMessage' IS DISTINCT FROM v_requested_public_message
       OR v_existing.internal_reason IS DISTINCT FROM v_internal_reason
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'id', v_report.id,
      'reference', v_report.public_reference,
      'status', v_report.status,
      'version', v_report.workflow_version,
      'convertedTicketId', v_report.converted_ticket_id,
      'replayed', TRUE
    );
  END IF;

  IF p_expected_version IS DISTINCT FROM v_report.workflow_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PUBLIC_REPORT_VERSION_CONFLICT';
  END IF;

  CASE
    WHEN v_report.status = 'submitted' AND v_action = 'start_review' THEN
      v_next_status := 'under_review'; v_event_type := 'start_review';
    WHEN v_report.status = 'awaiting_information' AND v_action = 'start_review' THEN
      v_next_status := 'under_review'; v_event_type := 'resume_review';
    WHEN v_report.status = 'under_review' AND v_action = 'request_information' THEN
      v_next_status := 'awaiting_information'; v_event_type := 'request_information';
    WHEN v_report.status = 'under_review' AND v_action = 'reject' THEN
      v_next_status := 'rejected'; v_event_type := 'rejected';
    WHEN v_report.status = 'under_review' AND v_action = 'convert' THEN
      v_next_status := 'converted'; v_event_type := 'converted';
    ELSE
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_INVALID_TRANSITION';
  END CASE;

  IF v_public_message = '' THEN
    v_public_message := public.public_report_default_message(v_next_status, v_report.language);
  END IF;
  IF length(v_public_message) < 5 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PUBLIC_MESSAGE_REQUIRED';
  END IF;

  IF v_action = 'convert' THEN
    SELECT COALESCE(q.zone_label->>v_report.language, q.zone_label->>'tr', q.zone_code)
    INTO v_zone_label
    FROM public.public_report_qr_placements q
    WHERE q.id = v_report.placement_id;

    SELECT * INTO v_ticket
    FROM public.create_service_ticket_command(
      p_idempotency_key => 'public-report:' || v_report.id::TEXT,
      p_site_id => v_report.site_id,
      p_unit_id => NULL,
      p_title => left('Public report ' || v_report.public_reference || ' · ' || v_zone_label, 160),
      p_description => left(concat_ws(E'\n',
        NULLIF('Location: ' || COALESCE(v_report.location_detail, ''), 'Location: '),
        v_report.description
      ), 4000),
      p_category => 'public_report.' || v_report.category,
      p_priority => CASE WHEN v_report.safety_code IS NULL THEN 'normal' ELSE 'urgent' END,
      p_resident_id => NULL,
      p_ticket_no => NULL,
      p_sla_due_at => NULL,
      p_emergency_policy_code => v_report.safety_code,
      p_request_fingerprint => encode(v_report.submission_payload_digest, 'hex')
    );
    IF v_ticket.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'PUBLIC_REPORT_TICKET_CONVERSION_FAILED';
    END IF;
  END IF;

  UPDATE public.public_problem_reports
  SET status = v_next_status,
      public_message = v_public_message,
      internal_reason = v_internal_reason,
      converted_ticket_id = CASE WHEN v_action = 'convert' THEN v_ticket.id ELSE NULL END,
      workflow_version = workflow_version + 1,
      last_transition_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE id = v_report.id
    AND workflow_version = p_expected_version
  RETURNING * INTO v_report;
  IF v_report.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'PUBLIC_REPORT_VERSION_CONFLICT';
  END IF;

  INSERT INTO public.public_problem_report_events (
    company_id, site_id, report_id, event_type, report_version,
    actor_profile_id, actor_role, public_message, internal_reason,
    metadata, idempotency_key
  ) VALUES (
    v_report.company_id, v_report.site_id, v_report.id, v_event_type,
    v_report.workflow_version, v_actor_id, v_actor_role, v_public_message,
    v_internal_reason,
    jsonb_build_object(
      'action', v_action,
      'expectedVersion', p_expected_version,
      'requestedPublicMessage', v_requested_public_message,
      'convertedTicketId', v_report.converted_ticket_id,
      'externalExecutionAllowed', FALSE
    ),
    v_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_report.company_id, v_actor_id, 'public_report.' || v_action,
    'public_problem_reports', v_report.id,
    jsonb_build_object('status', CASE v_event_type
      WHEN 'start_review' THEN 'submitted'
      WHEN 'resume_review' THEN 'awaiting_information'
      WHEN 'request_information' THEN 'under_review'
      WHEN 'rejected' THEN 'under_review'
      WHEN 'converted' THEN 'under_review' END,
      'version', v_report.workflow_version - 1),
    jsonb_build_object(
      'status', v_report.status,
      'version', v_report.workflow_version,
      'convertedTicketId', v_report.converted_ticket_id,
      'reason', v_internal_reason,
      'externalExecutionAllowed', FALSE
    ),
    'audit:public-report:' || v_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_report.company_id, 'internal_event_bus', 'public_report.' || v_action,
    'public_problem_reports', v_report.id,
    jsonb_build_object(
      'reportId', v_report.id,
      'reference', v_report.public_reference,
      'siteId', v_report.site_id,
      'status', v_report.status,
      'ticketId', v_report.converted_ticket_id,
      'externalActionAllowed', FALSE
    ),
    'queued', 'public-report:' || v_key
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'id', v_report.id,
    'reference', v_report.public_reference,
    'status', v_report.status,
    'version', v_report.workflow_version,
    'convertedTicketId', v_report.converted_ticket_id,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.manage_public_report_qr_placement_command(
  p_action TEXT,
  p_site_id UUID,
  p_placement_id UUID,
  p_zone_code TEXT,
  p_zone_labels JSONB,
  p_valid_until TIMESTAMPTZ,
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
  v_action TEXT := lower(btrim(COALESCE(p_action, '')));
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_zone_code TEXT := lower(btrim(COALESCE(p_zone_code, '')));
  v_site public.sites%ROWTYPE;
  v_target public.public_report_qr_placements%ROWTYPE;
  v_result public.public_report_qr_placements%ROWTYPE;
  v_prior_audit public.audit_events%ROWTYPE;
  v_before JSONB;
  v_audit_action TEXT;
  v_audit_key TEXT;
  v_normalized_labels JSONB;
  v_command_fingerprint TEXT;
BEGIN
  IF v_actor_id IS NULL OR (
    NOT public.is_platform_super_admin() AND v_actor_role NOT IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_MANAGER_AUTH_REQUIRED';
  END IF;
  IF v_action NOT IN ('create', 'rotate', 'revoke')
     OR length(v_key) < 16 OR length(v_key) > 200
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_INVALID';
  END IF;

  IF v_action = 'create' THEN
    IF p_site_id IS NULL OR p_placement_id IS NOT NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_INVALID';
    END IF;
    SELECT * INTO v_site
    FROM public.sites s
    WHERE s.id = p_site_id AND s.status <> 'archived';
  ELSE
    IF p_placement_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_INVALID';
    END IF;
    SELECT * INTO v_target
    FROM public.public_report_qr_placements q
    WHERE q.id = p_placement_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_NOT_FOUND';
    END IF;
    SELECT * INTO v_site
    FROM public.sites s
    WHERE s.id = v_target.site_id AND s.company_id = v_target.company_id;
  END IF;
  IF v_site.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_NOT_FOUND';
  END IF;
  IF NOT public.current_user_can_manage_site(v_site.id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_SITE_SCOPE_DENIED';
  END IF;

  IF v_action = 'create' THEN
    IF v_zone_code !~ '^[a-z0-9][a-z0-9._-]{1,79}$'
       OR jsonb_typeof(p_zone_labels) IS DISTINCT FROM 'object'
       OR (p_zone_labels - ARRAY['tr', 'en', 'de', 'ru']) <> '{}'::JSONB
       OR jsonb_typeof(p_zone_labels->'tr') IS DISTINCT FROM 'string'
       OR jsonb_typeof(p_zone_labels->'en') IS DISTINCT FROM 'string'
       OR jsonb_typeof(p_zone_labels->'de') IS DISTINCT FROM 'string'
       OR jsonb_typeof(p_zone_labels->'ru') IS DISTINCT FROM 'string'
       OR length(btrim(p_zone_labels->>'tr')) NOT BETWEEN 2 AND 120
       OR length(btrim(p_zone_labels->>'en')) NOT BETWEEN 2 AND 120
       OR length(btrim(p_zone_labels->>'de')) NOT BETWEEN 2 AND 120
       OR length(btrim(p_zone_labels->>'ru')) NOT BETWEEN 2 AND 120
       OR (p_valid_until IS NOT NULL AND (
         p_valid_until <= clock_timestamp() + INTERVAL '5 minutes'
         OR p_valid_until > clock_timestamp() + INTERVAL '5 years'
       ))
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_INVALID';
    END IF;
    v_normalized_labels := jsonb_build_object(
      'tr', btrim(p_zone_labels->>'tr'), 'en', btrim(p_zone_labels->>'en'),
      'de', btrim(p_zone_labels->>'de'), 'ru', btrim(p_zone_labels->>'ru')
    );
  ELSIF p_site_id IS NOT NULL OR p_zone_code IS NOT NULL
        OR p_zone_labels IS NOT NULL OR p_valid_until IS NOT NULL
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_INVALID';
  END IF;

  v_command_fingerprint := encode(extensions.digest(convert_to(
    jsonb_build_object(
      'action', v_action,
      'siteId', p_site_id,
      'placementId', p_placement_id,
      'zoneCode', CASE WHEN v_action = 'create' THEN v_zone_code ELSE NULL END,
      'zoneLabels', v_normalized_labels,
      'validUntil', p_valid_until
    )::TEXT,
    'UTF8'
  ), 'sha256'), 'hex');

  v_audit_action := 'public_report.placement.' || v_action;
  v_audit_key := 'audit:public-report-placement:' || encode(extensions.digest(
    convert_to(v_key, 'UTF8'), 'sha256'
  ), 'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(
    'public-report-placement-command:' || v_site.company_id::TEXT || ':' || v_key, 0
  ));
  SELECT * INTO v_prior_audit
  FROM public.audit_events a
  WHERE a.company_id = v_site.company_id
    AND a.idempotency_key = v_audit_key
  LIMIT 1;
  IF FOUND THEN
    IF v_prior_audit.actor_profile_id IS DISTINCT FROM v_actor_id
       OR v_prior_audit.action IS DISTINCT FROM v_audit_action
       OR v_prior_audit.after_data->>'commandFingerprint' IS DISTINCT FROM v_command_fingerprint
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_IDEMPOTENCY_CONFLICT';
    END IF;
    SELECT * INTO v_result
    FROM public.public_report_qr_placements q
    WHERE q.id = v_prior_audit.entity_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_NOT_FOUND';
    END IF;
    IF NOT public.current_user_can_manage_site(v_result.site_id) THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_SITE_SCOPE_DENIED';
    END IF;
    SELECT * INTO v_site
    FROM public.sites s
    WHERE s.id = v_result.site_id AND s.company_id = v_result.company_id;
    RETURN jsonb_build_object(
      'placement', jsonb_build_object(
        'id', v_result.id, 'siteId', v_result.site_id, 'siteLabel', v_site.name,
        'publicCode', v_result.public_code, 'zoneCode', v_result.zone_code,
        'zoneLabels', v_result.zone_label, 'active', v_result.active,
        'validUntil', v_result.valid_until
      ),
      'replayed', TRUE
    );
  END IF;

  IF v_action = 'create' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(
      'public-report-placement-zone:' || v_site.id::TEXT || ':' || v_zone_code, 0
    ));
    IF EXISTS (
      SELECT 1 FROM public.public_report_qr_placements q
      WHERE q.site_id = v_site.id AND q.zone_code = v_zone_code AND q.active
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_CONFLICT';
    END IF;
    INSERT INTO public.public_report_qr_placements (
      company_id, site_id, public_code, zone_code, zone_label,
      valid_until, created_by_profile_id
    ) VALUES (
      v_site.company_id, v_site.id,
      'qr_' || replace(gen_random_uuid()::TEXT, '-', ''),
      v_zone_code,
      v_normalized_labels,
      p_valid_until, v_actor_id
    ) RETURNING * INTO v_result;
    v_before := NULL;
  ELSIF v_action = 'rotate' THEN
    IF NOT v_target.active THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_PLACEMENT_CONFLICT';
    END IF;
    v_before := jsonb_build_object(
      'id', v_target.id, 'siteId', v_target.site_id,
      'zoneCode', v_target.zone_code, 'active', v_target.active
    );
    UPDATE public.public_report_qr_placements
    SET active = FALSE,
        valid_until = CASE
          WHEN valid_until IS NULL OR valid_until > clock_timestamp()
            THEN GREATEST(clock_timestamp(), valid_from + INTERVAL '1 microsecond')
          ELSE valid_until
        END,
        updated_at = clock_timestamp()
    WHERE id = v_target.id;
    INSERT INTO public.public_report_qr_placements (
      company_id, site_id, public_code, zone_code, zone_label,
      valid_until, created_by_profile_id
    ) VALUES (
      v_target.company_id, v_target.site_id,
      'qr_' || replace(gen_random_uuid()::TEXT, '-', ''),
      v_target.zone_code, v_target.zone_label,
      CASE WHEN v_target.valid_until > clock_timestamp() THEN v_target.valid_until ELSE NULL END,
      v_actor_id
    ) RETURNING * INTO v_result;
  ELSE
    v_before := jsonb_build_object(
      'id', v_target.id, 'siteId', v_target.site_id,
      'zoneCode', v_target.zone_code, 'active', v_target.active
    );
    UPDATE public.public_report_qr_placements
    SET active = FALSE,
        valid_until = CASE
          WHEN valid_until IS NULL OR valid_until > clock_timestamp()
            THEN GREATEST(clock_timestamp(), valid_from + INTERVAL '1 microsecond')
          ELSE valid_until
        END,
        updated_at = clock_timestamp()
    WHERE id = v_target.id
    RETURNING * INTO v_result;
  END IF;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_site.company_id, v_actor_id, v_audit_action,
    'public_report_qr_placements', v_result.id, v_before,
    jsonb_build_object(
      'id', v_result.id, 'siteId', v_result.site_id,
      'zoneCode', v_result.zone_code, 'active', v_result.active,
      'replacedPlacementId', CASE WHEN v_action = 'rotate' THEN v_target.id ELSE NULL END,
      'commandFingerprint', v_command_fingerprint
    ),
    v_audit_key
  );

  RETURN jsonb_build_object(
    'placement', jsonb_build_object(
      'id', v_result.id, 'siteId', v_result.site_id, 'siteLabel', v_site.name,
      'publicCode', v_result.public_code, 'zoneCode', v_result.zone_code,
      'zoneLabels', v_result.zone_label, 'active', v_result.active,
      'validUntil', v_result.valid_until
    ),
    'replayed', FALSE
  );
END;
$$;

-- This migration installs the least-privilege retention command only. No cron
-- job or external scheduler is activated here; production scheduling remains
-- an explicitly configured operations dependency.
CREATE OR REPLACE FUNCTION public.anonymize_due_public_problem_report_v1(
  p_report_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_report public.public_problem_reports%ROWTYPE;
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_anonymized_at TIMESTAMPTZ;
  v_audit_key TEXT;
  v_had_optional_contact BOOLEAN;
BEGIN
  IF (SELECT auth.role()) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'PUBLIC_REPORT_RETENTION_SERVICE_ROLE_REQUIRED';
  END IF;
  IF p_report_id IS NULL OR length(v_key) < 16 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_RETENTION_INVALID';
  END IF;

  SELECT * INTO v_report
  FROM public.public_problem_reports r
  WHERE r.id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'PUBLIC_REPORT_NOT_FOUND';
  END IF;
  IF v_report.retention_anonymized_at IS NOT NULL THEN
    IF v_report.retention_command_key IS DISTINCT FROM v_key THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'PUBLIC_REPORT_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN jsonb_build_object(
      'id', v_report.id,
      'reference', v_report.public_reference,
      'anonymizedAt', v_report.retention_anonymized_at,
      'replayed', TRUE
    );
  END IF;
  IF v_report.retention_due_at > clock_timestamp() THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'PUBLIC_REPORT_RETENTION_NOT_DUE';
  END IF;

  v_anonymized_at := clock_timestamp();
  v_had_optional_contact := v_report.contact_value IS NOT NULL;
  UPDATE public.public_problem_reports
  SET tracking_token_digest = extensions.digest(
        convert_to('retained:tracking:' || id::TEXT, 'UTF8'), 'sha256'
      ),
      submission_key = 'retained-' || replace(id::TEXT, '-', ''),
      submission_payload_digest = extensions.digest(
        convert_to('retained:payload:' || id::TEXT, 'UTF8'), 'sha256'
      ),
      abuse_key_digest = encode(extensions.digest(
        convert_to('retained:abuse:' || id::TEXT, 'UTF8'), 'sha256'
      ), 'hex'),
      abuse_agent_digest = encode(extensions.digest(
        convert_to('retained:agent:' || id::TEXT, 'UTF8'), 'sha256'
      ), 'hex'),
      duplicate_fingerprint = encode(extensions.digest(
        convert_to('retained:duplicate:' || id::TEXT, 'UTF8'), 'sha256'
      ), 'hex'),
      possible_duplicate_of = NULL,
      location_detail = NULL,
      description = '[retention anonymized]',
      contact_kind = NULL,
      contact_value = NULL,
      internal_reason = NULL,
      retention_anonymized_at = v_anonymized_at,
      retention_command_key = v_key,
      updated_at = v_anonymized_at
  WHERE id = v_report.id
  RETURNING * INTO v_report;

  v_audit_key := 'audit:public-report-retention:' || encode(extensions.digest(
    convert_to(v_key, 'UTF8'), 'sha256'
  ), 'hex');
  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_report.company_id, NULL, 'public_report.retention_anonymized',
    'public_problem_reports', v_report.id,
    jsonb_build_object(
      'retentionDueAt', v_report.retention_due_at,
      'hadOptionalContact', v_had_optional_contact
    ),
    jsonb_build_object(
      'anonymizedAt', v_anonymized_at,
      'directIntakeFieldsAnonymized', TRUE,
      'trackingAuthorityRevoked', TRUE,
      'externalExecutionAllowed', FALSE
    ),
    v_audit_key
  );

  RETURN jsonb_build_object(
    'id', v_report.id,
    'reference', v_report.public_reference,
    'anonymizedAt', v_anonymized_at,
    'replayed', FALSE
  );
END;
$$;

COMMENT ON FUNCTION public.anonymize_due_public_problem_report_v1(UUID, TEXT) IS
  'Service-role-only idempotent anonymization of due direct public-intake fields and tracking authority. Converted service records and append-only audit evidence follow their own retention policies; no scheduler is installed here.';

ALTER TABLE public.public_report_qr_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_problem_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_problem_report_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read scoped public QR placements"
  ON public.public_report_qr_placements FOR SELECT TO authenticated
  USING (public.current_user_can_manage_site(site_id));
CREATE POLICY "Managers read scoped public reports"
  ON public.public_problem_reports FOR SELECT TO authenticated
  USING (public.current_user_can_manage_site(site_id));
CREATE POLICY "Managers read scoped public report events"
  ON public.public_problem_report_events FOR SELECT TO authenticated
  USING (public.current_user_can_manage_site(site_id));

REVOKE ALL ON TABLE public.public_report_qr_placements FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.public_problem_reports FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.public_problem_report_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.public_report_qr_placements TO authenticated;
GRANT SELECT ON TABLE public.public_problem_reports TO authenticated;
GRANT SELECT ON TABLE public.public_problem_report_events TO authenticated;

REVOKE ALL ON FUNCTION public.resolve_public_report_qr(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_report_qr(TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.submit_public_problem_report(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_public_problem_report(TEXT, JSONB, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
REVOKE ALL ON FUNCTION public.get_public_problem_report_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_problem_report_status(TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_public_problem_report_review_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_problem_report_review_data() TO authenticated;
REVOKE ALL ON FUNCTION public.review_public_problem_report_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_public_problem_report_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.manage_public_report_qr_placement_command(TEXT, UUID, UUID, TEXT, JSONB, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.manage_public_report_qr_placement_command(TEXT, UUID, UUID, TEXT, JSONB, TIMESTAMPTZ, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.anonymize_due_public_problem_report_v1(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.anonymize_due_public_problem_report_v1(UUID, TEXT) TO service_role;

ALTER TABLE public.public_problem_reports REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.public_problem_reports;
