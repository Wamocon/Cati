-- Digital owner/tenant/staff registration: public intake -> human review ->
-- expiring activation -> least-privilege profile binding.
--
-- Important boundaries:
--   * Public applicants may request only owner, tenant or staff access.
--   * Identity evidence is never treated as provider-verified unless a real
--     provider returns that result. This migration stores only a digest and a
--     masked suffix of the document number.
--   * Managers may read and recommend inside their company. Only an
--     organization admin (or protected platform admin) may approve/reject.
--   * Approval creates an expiring one-time activation; it never creates a
--     password or an autonomous privileged account.
--   * Every mutation is transactional, versioned, idempotent, audited and
--     emitted through the internal outbox.

BEGIN;

-- Migration 12 exposed a generic anonymous intake RPC that also accepted
-- registration.* actions and copied raw identity numbers into metadata/KBS
-- outbox payloads. Registration now has one dedicated digesting workflow, so
-- keep this generic RPC only for non-identity public reports and AI intake.
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
  v_company_id UUID := public.default_company_id();
  v_request_id UUID;
  v_metadata JSONB := COALESCE(p_metadata, '{}'::JSONB);
  v_action_type TEXT := lower(btrim(COALESCE(p_action_type, '')));
BEGIN
  IF v_action_type LIKE 'registration.%' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Registration intake must use the controlled registration workflow';
  END IF;
  IF v_action_type NOT IN (
    'public.report',
    'public.ai_question',
    'public.ai_escalation',
    'public.ai_feedback'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported public intake action type';
  END IF;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'No default company context is configured for public intake';
  END IF;
  IF octet_length(v_metadata::TEXT) > 20000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Public intake metadata is too large';
  END IF;

  -- Reject identity-document material at any nesting depth. JSON serialization
  -- always quotes keys, so this also catches identity keys hidden in a nested
  -- payload. Reports may contain contact details, never passport/ID evidence.
  IF v_metadata::TEXT ~* '"(idnumber|id_number|idtype|id_type|identity|identitynumber|identity_number|identitydocument|identity_document|passport|passportnumber|passport_number|documentnumber|document_number|tckimlik|tc_kimlik|issuingcountry|issuing_country|selfie|biometric)"[[:space:]]*:' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Identity document data is forbidden in generic public intake';
  END IF;

  INSERT INTO public.client_action_requests (
    company_id, action_type, title, status, requested_by, metadata
  ) VALUES (
    v_company_id, v_action_type, left(COALESCE(p_title, ''), 200),
    'queued', NULL, v_metadata
  ) RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_intake(TEXT, TEXT, JSONB) TO anon, authenticated;

-- Retire and fully redact any rows created through the old registration
-- bypass. Replaying or converting them would lack the new consent receipt,
-- lookup secret and verified scope, so applicants must resubmit safely.
UPDATE public.client_action_requests
SET status = 'rejected',
    title = 'Retired legacy registration request',
    metadata = jsonb_build_object(
      'legacyRegistrationRetired', TRUE,
      'retiredAt', clock_timestamp(),
      'reason', 'Resubmit through the controlled registration workflow'
    ),
    updated_at = clock_timestamp()
WHERE action_type LIKE 'registration.request.%';

UPDATE public.integration_outbox o
SET status = CASE
      WHEN o.status IN ('queued', 'processing', 'failed') THEN 'cancelled'
      ELSE o.status
    END,
    payload = jsonb_build_object(
      'legacyIdentityPayloadRedacted', TRUE,
      'redactedAt', clock_timestamp(),
      'reason', 'Legacy public registration identity payload removed'
    )
WHERE o.entity_table = 'client_action_requests'
  AND o.action_type = 'kbs.guest_report'
  AND EXISTS (
    SELECT 1 FROM public.client_action_requests r
    WHERE r.id = o.entity_id
      AND r.action_type LIKE 'registration.request.%'
  );

CREATE TABLE public.registration_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  public_reference TEXT NOT NULL UNIQUE,
  lookup_token_digest BYTEA NOT NULL,
  submission_key TEXT NOT NULL,
  submission_payload_digest BYTEA NOT NULL,
  requested_role TEXT NOT NULL
    CHECK (requested_role IN ('owner', 'tenant', 'staff')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  email_digest BYTEA NOT NULL,
  email_masked TEXT NOT NULL,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'tr'
    CHECK (language IN ('tr', 'en', 'de', 'ru')),
  unit_claim TEXT,
  proof_type TEXT,
  proof_reference TEXT,
  linked_tenant_invitation_id UUID
    REFERENCES public.tenant_access_invitations(id) ON DELETE SET NULL,
  position TEXT,
  identity_type TEXT,
  identity_number_digest BYTEA,
  identity_number_masked TEXT,
  identity_review_status TEXT NOT NULL DEFAULT 'not_required'
    CHECK (identity_review_status IN (
      'not_required',
      'manual_review_required',
      'manual_review_complete',
      'provider_verified',
      'provider_rejected'
    )),
  consent_version TEXT NOT NULL,
  consent_text_digest TEXT NOT NULL,
  consent_locale TEXT NOT NULL CHECK (consent_locale IN ('tr', 'en', 'de', 'ru')),
  consent_accepted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  source TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'under_review', 'approved', 'rejected', 'activated')),
  manager_recommendation TEXT
    CHECK (manager_recommendation IS NULL OR manager_recommendation IN (
      'approve', 'reject', 'more_information'
    )),
  manager_recommended_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  manager_recommended_at TIMESTAMPTZ,
  manager_recommendation_reason TEXT,
  approved_unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  approved_site_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  decided_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_reason TEXT,
  workflow_version INTEGER NOT NULL DEFAULT 1 CHECK (workflow_version > 0),
  last_transition_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, submission_key),
  CHECK (length(btrim(full_name)) BETWEEN 2 AND 120),
  CHECK (length(email) <= 254),
  CHECK (phone IS NULL OR length(phone) <= 60),
  CHECK (unit_claim IS NULL OR length(unit_claim) <= 120),
  CHECK (proof_reference IS NULL OR length(proof_reference) <= 160),
  CHECK (position IS NULL OR length(position) <= 120),
  CHECK (cardinality(approved_site_ids) <= 50),
  CHECK (
    (status IN ('approved', 'activated') AND decided_at IS NOT NULL AND decided_by_profile_id IS NOT NULL)
    OR status NOT IN ('approved', 'activated')
  ),
  CHECK (
    (status = 'rejected' AND decided_at IS NOT NULL AND decided_by_profile_id IS NOT NULL)
    OR status <> 'rejected'
  )
);

CREATE TABLE public.registration_activation_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  registration_request_id UUID NOT NULL UNIQUE
    REFERENCES public.registration_requests(id) ON DELETE CASCADE,
  approved_role TEXT NOT NULL CHECK (approved_role IN ('owner', 'tenant', 'staff')),
  email_digest BYTEA NOT NULL,
  activation_token_digest BYTEA NOT NULL,
  token_hint TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'redeemed', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_by_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  redeemed_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  workflow_version INTEGER NOT NULL DEFAULT 1 CHECK (workflow_version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CHECK (expires_at > created_at),
  CHECK (
    (status = 'redeemed' AND redeemed_by_profile_id IS NOT NULL AND redeemed_at IS NOT NULL)
    OR status <> 'redeemed'
  )
);

CREATE TABLE public.registration_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  registration_request_id UUID NOT NULL
    REFERENCES public.registration_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'submitted', 'manager_recommended', 'approved', 'rejected', 'activated'
  )),
  request_version INTEGER NOT NULL CHECK (request_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (company_id, idempotency_key),
  UNIQUE (registration_request_id, request_version)
);

CREATE INDEX registration_requests_company_queue_idx
  ON public.registration_requests(company_id, status, created_at DESC);
CREATE INDEX registration_requests_company_email_idx
  ON public.registration_requests(company_id, email_digest, created_at DESC);
CREATE INDEX registration_requests_linked_tenant_invitation_idx
  ON public.registration_requests(linked_tenant_invitation_id)
  WHERE linked_tenant_invitation_id IS NOT NULL;
CREATE INDEX registration_activation_pending_expiry_idx
  ON public.registration_activation_invitations(company_id, expires_at)
  WHERE status = 'pending';
CREATE INDEX registration_request_events_timeline_idx
  ON public.registration_request_events(registration_request_id, request_version DESC);

COMMENT ON TABLE public.registration_requests IS
  'Company-scoped public owner/tenant/staff access requests with immutable consent evidence and a versioned human-decision workflow.';
COMMENT ON TABLE public.registration_activation_invitations IS
  'One-time, expiring account activation authority created only by an administrator decision. Plaintext tokens are returned once and never stored.';

CREATE OR REPLACE FUNCTION public.normalize_registration_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(btrim(COALESCE(p_email, '')));
$$;

CREATE OR REPLACE FUNCTION public.mask_registration_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_email TEXT := public.normalize_registration_email(p_email);
  v_at INTEGER := strpos(v_email, '@');
  v_local TEXT;
  v_domain TEXT;
BEGIN
  IF v_at <= 1 THEN RETURN '***'; END IF;
  v_local := left(v_email, v_at - 1);
  v_domain := substring(v_email FROM v_at + 1);
  RETURN left(v_local, 1) || repeat('*', greatest(length(v_local) - 1, 2)) || '@' || v_domain;
END;
$$;

CREATE OR REPLACE FUNCTION public.registration_request_admin_payload(
  p_request public.registration_requests,
  p_activation_token TEXT DEFAULT NULL,
  p_replayed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', p_request.id,
    'companyId', p_request.company_id,
    'reference', p_request.public_reference,
    'requestedRole', p_request.requested_role,
    'fullName', p_request.full_name,
    'email', p_request.email,
    'emailMasked', p_request.email_masked,
    'phone', p_request.phone,
    'language', p_request.language,
    'unitClaim', p_request.unit_claim,
    'proofType', p_request.proof_type,
    'proofReference', p_request.proof_reference,
    'linkedTenantInvitationId', p_request.linked_tenant_invitation_id,
    'position', p_request.position,
    'identityType', p_request.identity_type,
    'identityNumberMasked', p_request.identity_number_masked,
    'identityReviewStatus', p_request.identity_review_status,
    'consentVersion', p_request.consent_version,
    'consentLocale', p_request.consent_locale,
    'consentAcceptedAt', p_request.consent_accepted_at,
    'source', p_request.source,
    'status', p_request.status,
    'managerRecommendation', p_request.manager_recommendation,
    'managerRecommendedBy', p_request.manager_recommended_by,
    'managerRecommendedAt', p_request.manager_recommended_at,
    'managerRecommendationReason', p_request.manager_recommendation_reason,
    'approvedUnitId', p_request.approved_unit_id,
    'approvedSiteIds', to_jsonb(p_request.approved_site_ids),
    'decidedByProfileId', p_request.decided_by_profile_id,
    'decidedAt', p_request.decided_at,
    'decisionReason', p_request.decision_reason,
    'workflowVersion', p_request.workflow_version,
    'createdAt', p_request.created_at,
    'updatedAt', p_request.updated_at,
    'activation', (
      SELECT jsonb_build_object(
        'id', a.id,
        'status', CASE
          WHEN a.status = 'pending' AND a.expires_at <= now() THEN 'expired'
          ELSE a.status
        END,
        'expiresAt', a.expires_at,
        'tokenHint', a.token_hint,
        'redeemedAt', a.redeemed_at,
        'providerMode', 'supabase-auth-provider-ready'
      )
      FROM public.registration_activation_invitations a
      WHERE a.registration_request_id = p_request.id
    ),
    'activationToken', p_activation_token,
    'codeAvailable', p_activation_token IS NOT NULL,
    'replayed', p_replayed
  );
$$;

REVOKE ALL ON FUNCTION public.normalize_registration_email(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mask_registration_email(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.registration_request_admin_payload(
  public.registration_requests, TEXT, BOOLEAN
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_registration_request(
  p_payload JSONB,
  p_lookup_token TEXT,
  p_submission_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.default_company_id();
  v_role TEXT := lower(btrim(COALESCE(p_payload->>'role', '')));
  v_full_name TEXT := btrim(COALESCE(p_payload->>'fullName', ''));
  v_email TEXT := public.normalize_registration_email(p_payload->>'email');
  v_email_digest BYTEA;
  v_phone TEXT := NULLIF(btrim(COALESCE(p_payload->>'phone', '')), '');
  v_language TEXT := lower(btrim(COALESCE(p_payload->>'language', 'tr')));
  v_unit_claim TEXT := NULLIF(btrim(COALESCE(p_payload->>'unitClaim', '')), '');
  v_proof_type TEXT := NULLIF(btrim(COALESCE(p_payload->>'proofType', '')), '');
  v_proof_reference TEXT := NULLIF(btrim(COALESCE(p_payload->>'proofReference', '')), '');
  v_invite_code TEXT := NULLIF(btrim(COALESCE(p_payload->>'inviteCode', '')), '');
  v_position TEXT := NULLIF(btrim(COALESCE(p_payload->>'position', '')), '');
  v_identity_type TEXT := NULLIF(btrim(COALESCE(p_payload->>'idType', '')), '');
  v_identity_digest_hex TEXT := lower(btrim(COALESCE(p_payload->>'identityDigest', '')));
  v_consent_version TEXT := btrim(COALESCE(p_payload->>'consentVersion', ''));
  v_consent_text_digest TEXT := btrim(COALESCE(p_payload->>'consentTextDigest', ''));
  v_consent_locale TEXT := lower(btrim(COALESCE(p_payload->>'consentLocale', v_language)));
  v_source TEXT := btrim(COALESCE(p_payload->>'source', 'public-registration'));
  v_submission_key TEXT := btrim(COALESCE(p_submission_key, ''));
  v_lookup_token TEXT := btrim(COALESCE(p_lookup_token, ''));
  v_payload_digest BYTEA;
  v_existing public.registration_requests%ROWTYPE;
  v_request public.registration_requests%ROWTYPE;
  v_reference TEXT;
  v_linked_tenant_invitation_id UUID;
BEGIN
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'Public registration is not configured for an organization';
  END IF;
  IF v_role NOT IN ('owner', 'tenant', 'staff') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Only owner, tenant or staff access may be requested publicly';
  END IF;
  IF length(v_full_name) < 2 OR length(v_full_name) > 120 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Full name must contain 2 to 120 characters';
  END IF;
  IF length(v_email) > 254 OR v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid email address is required';
  END IF;
  IF v_phone IS NOT NULL AND length(v_phone) > 60 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Phone value is too long';
  END IF;
  IF v_language NOT IN ('tr', 'en', 'de', 'ru') OR v_consent_locale NOT IN ('tr', 'en', 'de', 'ru') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported registration language';
  END IF;
  IF COALESCE((p_payload->>'consent')::BOOLEAN, FALSE) IS NOT TRUE
     OR v_consent_version <> 'kvkk-registration-2026-07-v1'
     OR v_consent_text_digest <>
       'e369300890134c057cf98582a766ded861e8a0a2a16fb8ebe1f8b7fcf6df6555'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Versioned KVKK consent is required';
  END IF;
  IF length(v_submission_key) < 8 OR length(v_submission_key) > 200
     OR length(v_lookup_token) < 32 OR length(v_lookup_token) > 256
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Registration receipt keys are invalid';
  END IF;
  IF v_source NOT IN ('signup', 'new-level-premium') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported registration source';
  END IF;
  IF p_payload ? 'idNumber' AND p_payload->>'idNumber' IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Raw identity numbers are forbidden in the registration database command';
  END IF;
  IF v_role IN ('owner', 'tenant')
     AND (
       v_identity_type IS NULL
       OR length(v_identity_type) > 40
       OR v_identity_digest_hex !~ '^[0-9a-f]{64}$'
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Protected identity evidence is required for manual review';
  END IF;
  IF v_role IN ('owner', 'tenant') AND v_unit_claim IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Owner and tenant requests must identify the claimed unit';
  END IF;
  IF v_role = 'owner' AND (v_proof_type IS NULL OR v_proof_reference IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Owner requests require ownership evidence';
  END IF;
  IF v_role = 'tenant' AND v_invite_code IS NULL AND v_proof_reference IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tenant requests require an invitation or tenancy evidence';
  END IF;
  IF v_role = 'staff' AND v_position IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Staff requests require a position or team';
  END IF;
  IF v_unit_claim IS NOT NULL AND length(v_unit_claim) > 120
     OR v_proof_type IS NOT NULL AND length(v_proof_type) > 40
     OR v_proof_reference IS NOT NULL AND length(v_proof_reference) > 160
     OR v_invite_code IS NOT NULL AND length(v_invite_code) > 256
     OR v_position IS NOT NULL AND length(v_position) > 120
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Registration evidence value is too long';
  END IF;

  v_email_digest := extensions.digest(convert_to(v_email, 'UTF8'), 'sha256');
  v_payload_digest := extensions.digest(convert_to(COALESCE(p_payload, '{}'::JSONB)::TEXT, 'UTF8'), 'sha256');

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_company_id::TEXT || ':registration:' || v_submission_key, 0)
  );

  SELECT * INTO v_existing
  FROM public.registration_requests r
  WHERE r.company_id = v_company_id AND r.submission_key = v_submission_key;

  IF FOUND THEN
    IF v_existing.submission_payload_digest IS DISTINCT FROM v_payload_digest
       OR v_existing.lookup_token_digest IS DISTINCT FROM
          extensions.digest(convert_to(v_lookup_token, 'UTF8'), 'sha256')
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Submission key was already used with different registration data';
    END IF;
    RETURN jsonb_build_object(
      'reference', v_existing.public_reference,
      'status', v_existing.status,
      'workflowVersion', v_existing.workflow_version,
      'replayed', TRUE
    );
  END IF;

  -- Database-side abuse budget cannot be bypassed by calling the anonymous
  -- RPC directly. The application also applies a client/IP budget, while this
  -- authoritative boundary limits repeated identities and organization-wide
  -- bursts without storing an IP address.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_company_id::TEXT || ':registration-email:' || encode(v_email_digest, 'hex'),
      0
    )
  );
  IF (
    SELECT COUNT(*)
      FROM public.registration_requests r
     WHERE r.company_id = v_company_id
       AND r.email_digest = v_email_digest
       AND r.created_at >= clock_timestamp() - INTERVAL '24 hours'
  ) >= 5 OR (
    SELECT COUNT(*)
      FROM public.registration_requests r
     WHERE r.company_id = v_company_id
       AND r.created_at >= clock_timestamp() - INTERVAL '10 minutes'
  ) >= 100
  THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Registration rate limit exceeded; retry after the cooling period';
  END IF;

  IF v_role = 'tenant' AND v_invite_code IS NOT NULL THEN
    SELECT i.id INTO v_linked_tenant_invitation_id
    FROM public.tenant_access_invitations i
    WHERE i.company_id = v_company_id
      AND i.status = 'pending'
      AND i.redeem_from <= clock_timestamp()
      AND i.redeem_until >= clock_timestamp()
      AND i.email_digest = v_email_digest
      AND i.code_digest = extensions.digest(convert_to(v_invite_code, 'UTF8'), 'sha256')
    LIMIT 1;
  END IF;

  v_reference := 'REG-' || to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::TEXT, '-', ''), 1, 10));

  INSERT INTO public.registration_requests (
    company_id, public_reference, lookup_token_digest, submission_key,
    submission_payload_digest, requested_role, full_name, email, email_digest,
    email_masked, phone, language, unit_claim, proof_type, proof_reference,
    linked_tenant_invitation_id, position, identity_type,
    identity_number_digest, identity_number_masked, identity_review_status,
    consent_version, consent_text_digest, consent_locale, source
  ) VALUES (
    v_company_id,
    v_reference,
    extensions.digest(convert_to(v_lookup_token, 'UTF8'), 'sha256'),
    v_submission_key,
    v_payload_digest,
    v_role,
    v_full_name,
    v_email,
    v_email_digest,
    public.mask_registration_email(v_email),
    v_phone,
    v_language,
    v_unit_claim,
    v_proof_type,
    v_proof_reference,
    v_linked_tenant_invitation_id,
    v_position,
    v_identity_type,
    CASE WHEN v_identity_digest_hex ~ '^[0-9a-f]{64}$'
      THEN pg_catalog.decode(v_identity_digest_hex, 'hex') ELSE NULL END,
    NULL,
    CASE WHEN v_role IN ('owner', 'tenant') THEN 'manual_review_required' ELSE 'not_required' END,
    v_consent_version,
    v_consent_text_digest,
    v_consent_locale,
    v_source
  ) RETURNING * INTO v_request;

  INSERT INTO public.registration_request_events (
    company_id, registration_request_id, event_type, request_version,
    actor_profile_id, reason, payload, idempotency_key
  ) VALUES (
    v_company_id, v_request.id, 'submitted', 1, NULL, NULL,
    jsonb_build_object(
      'requestedRole', v_role,
      'consentVersion', v_consent_version,
      'source', v_source,
      'linkedTenantInvitation', v_linked_tenant_invitation_id IS NOT NULL
    ),
    'submit:' || v_submission_key
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_company_id, NULL, 'registration.submitted', 'registration_requests', v_request.id,
    NULL,
    jsonb_build_object(
      'reference', v_request.public_reference,
      'requestedRole', v_role,
      'consentVersion', v_consent_version,
      'identityReviewStatus', v_request.identity_review_status
    ),
    'audit:registration:submit:' || v_submission_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_company_id, 'internal_event_bus', 'registration.submitted',
    'registration_requests', v_request.id,
    jsonb_build_object('requestId', v_request.id, 'reference', v_reference, 'requestedRole', v_role),
    'queued', 'registration:submit:' || v_submission_key
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'reference', v_request.public_reference,
    'status', v_request.status,
    'workflowVersion', v_request.workflow_version,
    'replayed', FALSE
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_request_status(
  p_reference TEXT,
  p_lookup_token TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'reference', r.public_reference,
    'requestedRole', r.requested_role,
    'status', r.status,
    'identityReviewStatus', r.identity_review_status,
    'workflowVersion', r.workflow_version,
    'lastUpdatedAt', r.updated_at,
    'activationStatus', CASE
      WHEN a.status = 'pending' AND a.expires_at <= now() THEN 'expired'
      ELSE a.status
    END,
    'activationExpiresAt', a.expires_at,
    'nextStep', CASE
      WHEN r.status IN ('submitted', 'under_review') THEN 'await_review'
      WHEN r.status = 'approved' THEN 'use_activation_invitation'
      WHEN r.status = 'rejected' THEN 'contact_management'
      WHEN r.status = 'activated' THEN 'sign_in'
      ELSE 'await_review'
    END
  )
  FROM public.registration_requests r
  LEFT JOIN public.registration_activation_invitations a
    ON a.registration_request_id = r.id
  WHERE upper(r.public_reference) = upper(btrim(COALESCE(p_reference, '')))
    AND r.lookup_token_digest = extensions.digest(
      convert_to(btrim(COALESCE(p_lookup_token, '')), 'UTF8'), 'sha256'
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_registration_activation_status(
  p_reference TEXT,
  p_activation_token TEXT
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'reference', r.public_reference,
    'requestedRole', r.requested_role,
    'emailMasked', r.email_masked,
    'status', CASE
      WHEN a.status = 'pending' AND a.expires_at <= now() THEN 'expired'
      ELSE a.status
    END,
    'expiresAt', a.expires_at,
    'providerMode', 'supabase-auth-provider-ready'
  )
  FROM public.registration_requests r
  JOIN public.registration_activation_invitations a
    ON a.registration_request_id = r.id
  WHERE upper(r.public_reference) = upper(btrim(COALESCE(p_reference, '')))
    AND a.activation_token_digest = extensions.digest(
      convert_to(btrim(COALESCE(p_activation_token, '')), 'UTF8'), 'sha256'
    )
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.submit_registration_request(JSONB, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_registration_request(JSONB, TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_registration_request_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_request_status(TEXT, TEXT) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.get_registration_activation_status(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_registration_activation_status(TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.recommend_registration_request_command(
  p_registration_request_id UUID,
  p_expected_version INTEGER,
  p_recommendation TEXT,
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
  v_actor_company UUID := public.current_user_company_id();
  v_request public.registration_requests%ROWTYPE;
  v_existing public.registration_request_events%ROWTYPE;
  v_recommendation TEXT := lower(btrim(COALESCE(p_recommendation, '')));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
BEGIN
  IF v_actor_id IS NULL OR v_actor_role NOT IN ('manager', 'admin') THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Manager or administrator authentication is required';
  END IF;
  IF v_recommendation NOT IN ('approve', 'reject', 'more_information') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Unsupported registration recommendation';
  END IF;
  IF length(v_reason) < 10 OR length(v_reason) > 1000
     OR length(v_key) < 8 OR length(v_key) > 200
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason and idempotency key are required';
  END IF;

  SELECT * INTO v_request
  FROM public.registration_requests r
  WHERE r.id = p_registration_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Registration request was not found'; END IF;
  IF NOT public.is_platform_super_admin() AND v_request.company_id IS DISTINCT FROM v_actor_company THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Registration request is outside your organization';
  END IF;

  SELECT * INTO v_existing
  FROM public.registration_request_events e
  WHERE e.company_id = v_request.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.registration_request_id IS DISTINCT FROM v_request.id
       OR v_existing.event_type <> 'manager_recommended'
       OR v_existing.payload->>'recommendation' IS DISTINCT FROM v_recommendation
       OR v_existing.reason IS DISTINCT FROM v_reason
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Idempotency key was used with a different recommendation';
    END IF;
    RETURN public.registration_request_admin_payload(v_request, NULL, TRUE);
  END IF;

  IF v_request.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A decided registration request cannot be recommended again';
  END IF;
  IF p_expected_version IS DISTINCT FROM v_request.workflow_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Registration request version conflict';
  END IF;

  UPDATE public.registration_requests
  SET status = 'under_review',
      manager_recommendation = v_recommendation,
      manager_recommended_by = v_actor_id,
      manager_recommended_at = clock_timestamp(),
      manager_recommendation_reason = v_reason,
      workflow_version = workflow_version + 1,
      last_transition_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE id = v_request.id AND workflow_version = p_expected_version
  RETURNING * INTO v_request;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Registration request version conflict';
  END IF;

  INSERT INTO public.registration_request_events (
    company_id, registration_request_id, event_type, request_version,
    actor_profile_id, reason, payload, idempotency_key
  ) VALUES (
    v_request.company_id, v_request.id, 'manager_recommended', v_request.workflow_version,
    v_actor_id, v_reason, jsonb_build_object('recommendation', v_recommendation), v_key
  );
  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_request.company_id, v_actor_id, 'registration.manager_recommended',
    'registration_requests', v_request.id, NULL,
    jsonb_build_object('recommendation', v_recommendation, 'reason', v_reason, 'workflowVersion', v_request.workflow_version),
    'audit:registration:' || v_key
  );
  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_request.company_id, 'internal_event_bus', 'registration.manager_recommended',
    'registration_requests', v_request.id,
    jsonb_build_object('requestId', v_request.id, 'recommendation', v_recommendation),
    'queued', 'registration:' || v_key
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN public.registration_request_admin_payload(v_request, NULL, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_registration_request_command(
  p_registration_request_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_reason TEXT,
  p_activation_expires_at TIMESTAMPTZ,
  p_unit_id UUID,
  p_site_ids UUID[],
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_company UUID := public.current_user_company_id();
  v_request public.registration_requests%ROWTYPE;
  v_existing public.registration_request_events%ROWTYPE;
  v_decision TEXT := lower(btrim(COALESCE(p_decision, '')));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_site_ids UUID[];
  v_activation_token TEXT;
  v_activation_id UUID;
  v_site_count INTEGER;
  v_valid_site_count INTEGER;
  v_invitation_unit_id UUID;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator authentication is required';
  END IF;
  IF v_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Decision must be approve or reject';
  END IF;
  IF length(v_reason) < 10 OR length(v_reason) > 1000
     OR length(v_key) < 8 OR length(v_key) > 200
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason and idempotency key are required';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT site_id ORDER BY site_id), ARRAY[]::UUID[])
  INTO v_site_ids
  FROM unnest(COALESCE(p_site_ids, ARRAY[]::UUID[])) AS requested(site_id)
  WHERE site_id IS NOT NULL;

  SELECT * INTO v_request
  FROM public.registration_requests r
  WHERE r.id = p_registration_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Registration request was not found'; END IF;
  IF NOT public.current_user_is_organization_admin(v_request.company_id) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Organization administrator authority is required';
  END IF;
  IF NOT public.is_platform_super_admin() AND v_request.company_id IS DISTINCT FROM v_actor_company THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Registration request is outside your organization';
  END IF;

  SELECT * INTO v_existing
  FROM public.registration_request_events e
  WHERE e.company_id = v_request.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing.registration_request_id IS DISTINCT FROM v_request.id
       OR v_existing.event_type IS DISTINCT FROM (CASE v_decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END)
       OR v_existing.actor_profile_id IS DISTINCT FROM v_actor_id
       OR v_existing.request_version IS DISTINCT FROM p_expected_version + 1
       OR v_existing.reason IS DISTINCT FROM v_reason
       OR v_existing.payload->>'decision' IS DISTINCT FROM v_decision
       OR v_existing.payload->>'unitId' IS DISTINCT FROM p_unit_id::TEXT
       OR v_existing.payload->'siteIds' IS DISTINCT FROM to_jsonb(v_site_ids)
       OR (v_existing.payload->>'activationExpiresAt')::TIMESTAMPTZ
          IS DISTINCT FROM p_activation_expires_at
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Idempotency key was used with a different registration decision';
    END IF;
    RETURN public.registration_request_admin_payload(v_request, NULL, TRUE);
  END IF;

  IF v_request.status NOT IN ('submitted', 'under_review') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Registration request is already decided';
  END IF;
  IF p_expected_version IS DISTINCT FROM v_request.workflow_version THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Registration request version conflict';
  END IF;

  IF v_decision = 'approve' THEN
    IF p_activation_expires_at IS NULL
       OR p_activation_expires_at <= clock_timestamp()
       OR p_activation_expires_at > clock_timestamp() + interval '30 days'
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Activation expiry must be within the next 30 days';
    END IF;

    IF v_request.requested_role IN ('owner', 'tenant') THEN
      IF p_unit_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM public.units u
        WHERE u.id = p_unit_id AND u.company_id = v_request.company_id
      ) THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Owner and tenant approval requires a unit in the same organization';
      END IF;
      IF cardinality(v_site_ids) > 0 THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Resident registration cannot receive staff site assignments';
      END IF;
      IF v_request.linked_tenant_invitation_id IS NOT NULL THEN
        SELECT unit_id INTO v_invitation_unit_id
        FROM public.tenant_access_invitations
        WHERE id = v_request.linked_tenant_invitation_id;
        IF v_invitation_unit_id IS DISTINCT FROM p_unit_id THEN
          RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Approved unit does not match the owner invitation';
        END IF;
      END IF;
    ELSE
      IF p_unit_id IS NOT NULL THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Staff approval does not accept a resident unit';
      END IF;
      SELECT count(*) INTO v_site_count FROM unnest(v_site_ids);
      SELECT count(*) INTO v_valid_site_count
      FROM public.sites s
      WHERE s.id = ANY(v_site_ids)
        AND s.company_id = v_request.company_id
        AND s.status <> 'archived';
      IF v_site_count < 1 OR v_valid_site_count <> v_site_count THEN
        RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Staff approval requires at least one valid organization site';
      END IF;
    END IF;

    v_activation_token := encode(extensions.gen_random_bytes(32), 'hex');
    INSERT INTO public.registration_activation_invitations (
      company_id, registration_request_id, approved_role, email_digest,
      activation_token_digest, token_hint, expires_at, created_by_profile_id
    ) VALUES (
      v_request.company_id, v_request.id, v_request.requested_role, v_request.email_digest,
      extensions.digest(convert_to(v_activation_token, 'UTF8'), 'sha256'),
      right(v_activation_token, 6), p_activation_expires_at, v_actor_id
    ) RETURNING id INTO v_activation_id;
  END IF;

  UPDATE public.registration_requests
  SET status = CASE v_decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
      approved_unit_id = CASE WHEN v_decision = 'approve' THEN p_unit_id ELSE NULL END,
      approved_site_ids = CASE WHEN v_decision = 'approve' THEN v_site_ids ELSE ARRAY[]::UUID[] END,
      identity_review_status = CASE
        WHEN v_decision = 'approve' AND identity_review_status = 'manual_review_required'
          THEN 'manual_review_complete'
        ELSE identity_review_status
      END,
      decided_by_profile_id = v_actor_id,
      decided_at = clock_timestamp(),
      decision_reason = v_reason,
      workflow_version = workflow_version + 1,
      last_transition_at = clock_timestamp(),
      updated_at = clock_timestamp()
  WHERE id = v_request.id AND workflow_version = p_expected_version
  RETURNING * INTO v_request;
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Registration request version conflict';
  END IF;

  INSERT INTO public.registration_request_events (
    company_id, registration_request_id, event_type, request_version,
    actor_profile_id, reason, payload, idempotency_key
  ) VALUES (
    v_request.company_id, v_request.id,
    CASE v_decision WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
    v_request.workflow_version, v_actor_id, v_reason,
    jsonb_build_object(
      'decision', v_decision,
      'activationExpiresAt', p_activation_expires_at,
      'unitId', p_unit_id,
      'siteIds', to_jsonb(v_site_ids),
      'activationId', v_activation_id
    ),
    v_key
  );
  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_request.company_id, v_actor_id,
    CASE v_decision
      WHEN 'approve' THEN 'registration.approved'
      ELSE 'registration.rejected'
    END,
    'registration_requests', v_request.id, NULL,
    jsonb_build_object(
      'decision', v_decision,
      'reason', v_reason,
      'workflowVersion', v_request.workflow_version,
      'unitId', p_unit_id,
      'siteIds', to_jsonb(v_site_ids),
      'activationId', v_activation_id
    ),
    'audit:registration:' || v_key
  );
  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_request.company_id, 'internal_event_bus',
    CASE v_decision WHEN 'approve' THEN 'registration.activation_ready' ELSE 'registration.rejected' END,
    'registration_requests', v_request.id,
    jsonb_build_object(
      'requestId', v_request.id,
      'reference', v_request.public_reference,
      'requestedRole', v_request.requested_role,
      'activationId', v_activation_id,
      'deliveryMode', 'manual_or_provider_adapter'
    ),
    'queued', 'registration:' || v_key
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN public.registration_request_admin_payload(v_request, v_activation_token, FALSE);
END;
$$;

REVOKE ALL ON FUNCTION public.recommend_registration_request_command(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recommend_registration_request_command(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.decide_registration_request_command(
  UUID, INTEGER, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID[], TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_registration_request_command(
  UUID, INTEGER, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID[], TEXT
) TO authenticated;

-- New Auth identities always start unassigned. Public metadata must never
-- choose a company or role; an approved invitation is the only self-service
-- path that may bind either value.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_language TEXT := lower(COALESCE(NEW.raw_user_meta_data->>'language', 'tr'));
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language, company_id)
  VALUES (
    NEW.id,
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    'tenant',
    CASE WHEN v_language IN ('tr', 'en', 'de', 'ru') THEN v_language ELSE 'tr' END,
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.registration_activation_profile_binding_allowed(
  p_activation_id UUID,
  p_profile_id UUID,
  p_company_id UUID,
  p_role TEXT,
  p_token_digest_hex TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.registration_activation_invitations a
    JOIN public.registration_requests r ON r.id = a.registration_request_id
    JOIN auth.users au ON au.id = p_profile_id
    WHERE a.id = p_activation_id
      AND p_profile_id = (SELECT auth.uid())
      AND a.company_id = p_company_id
      AND a.approved_role = p_role
      AND a.status = 'pending'
      AND a.expires_at > now()
      AND r.status = 'approved'
      AND r.requested_role = p_role
      AND au.email_confirmed_at IS NOT NULL
      AND a.email_digest = extensions.digest(
        convert_to(public.normalize_registration_email(au.email), 'UTF8'), 'sha256'
      )
      AND encode(a.activation_token_digest, 'hex') = lower(p_token_digest_hex)
  );
$$;

REVOKE ALL ON FUNCTION public.registration_activation_profile_binding_allowed(
  UUID, UUID, UUID, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

-- Preserve migration-22 tenant-invitation redemption and add one equally
-- narrow registration-activation branch. Arbitrary self-service role/company
-- changes remain impossible.
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
  v_command_guard BOOLEAN := current_setting('app.authority_change_command', TRUE) = 'on';
  v_tenant_invitation_id UUID := NULLIF(current_setting('app.tenant_invitation_redeem_id', TRUE), '')::UUID;
  v_tenant_code_digest_hex TEXT := NULLIF(current_setting('app.tenant_invitation_code_digest', TRUE), '');
  v_registration_activation_id UUID := NULLIF(current_setting('app.registration_activation_redeem_id', TRUE), '')::UUID;
  v_registration_token_digest_hex TEXT := NULLIF(current_setting('app.registration_activation_token_digest', TRUE), '');
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Profile identity is immutable.'; END IF;
  v_sensitive_change := NEW.role IS DISTINCT FROM OLD.role
    OR NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.office_id IS DISTINCT FROM OLD.office_id;
  IF NOT v_sensitive_change THEN RETURN NEW; END IF;

  IF NEW.office_id IS NOT NULL THEN
    SELECT o.company_id INTO v_office_company FROM public.offices o WHERE o.id = NEW.office_id;
    IF v_office_company IS NULL OR NEW.company_id IS DISTINCT FROM v_office_company THEN
      RAISE EXCEPTION 'Profile office must belong to the profile company.';
    END IF;
  END IF;

  IF public.is_platform_super_admin() THEN
    IF NOT v_command_guard THEN
      INSERT INTO public.audit_events (
        company_id, actor_profile_id, action, entity_table, entity_id, before_data, after_data
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id), v_actor_id,
        'profile.platform_authority_provisioned', 'profiles', NEW.id,
        jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
        jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'reason', 'platform/service provisioning')
      );
    END IF;
  ELSIF v_command_guard
        AND v_actor_role = 'admin'
        AND v_actor_company IS NOT NULL
        AND OLD.company_id = v_actor_company
        AND NEW.company_id = v_actor_company
        AND NEW.id IS DISTINCT FROM v_actor_id
  THEN NULL;
  ELSIF OLD.company_id IS NULL
        AND NEW.company_id IS NOT NULL
        AND OLD.role = 'tenant'
        AND NEW.role = 'tenant'
        AND NEW.office_id IS NOT DISTINCT FROM OLD.office_id
        AND NEW.id = v_actor_id
        AND v_tenant_invitation_id IS NOT NULL
        AND v_tenant_code_digest_hex IS NOT NULL
        AND public.tenant_invitation_profile_binding_allowed(
          v_tenant_invitation_id, NEW.id, NEW.company_id, v_tenant_code_digest_hex
        )
  THEN
    INSERT INTO public.audit_events (
      company_id, actor_profile_id, action, entity_table, entity_id,
      before_data, after_data, idempotency_key
    ) VALUES (
      NEW.company_id, v_actor_id, 'tenant_invitation.profile_company_bound', 'profiles', NEW.id,
      jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
      jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'invitationId', v_tenant_invitation_id),
      'tenant-invite:profile-bind:' || v_tenant_invitation_id::TEXT
    );
  ELSIF OLD.company_id IS NULL
        AND NEW.company_id IS NOT NULL
        AND OLD.role = 'tenant'
        AND NEW.role IN ('owner', 'tenant', 'staff')
        AND NEW.office_id IS NOT DISTINCT FROM OLD.office_id
        AND NEW.id = v_actor_id
        AND v_registration_activation_id IS NOT NULL
        AND v_registration_token_digest_hex IS NOT NULL
        AND public.registration_activation_profile_binding_allowed(
          v_registration_activation_id, NEW.id, NEW.company_id, NEW.role,
          v_registration_token_digest_hex
        )
  THEN
    INSERT INTO public.audit_events (
      company_id, actor_profile_id, action, entity_table, entity_id,
      before_data, after_data, idempotency_key
    ) VALUES (
      NEW.company_id, v_actor_id, 'registration_activation.profile_bound', 'profiles', NEW.id,
      jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
      jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'activationId', v_registration_activation_id),
      'registration-activation:profile-bind:' || v_registration_activation_id::TEXT
    );
  ELSE
    RAISE EXCEPTION 'Sensitive profile authority changes require an authorized admin command or verified invitation redemption.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_registration_activation_command(
  p_reference TEXT,
  p_activation_token TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_reference TEXT := upper(btrim(COALESCE(p_reference, '')));
  v_token TEXT := btrim(COALESCE(p_activation_token, ''));
  v_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_token_digest BYTEA;
  v_request public.registration_requests%ROWTYPE;
  v_activation public.registration_activation_invitations%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_auth_email TEXT;
  v_email_confirmed_at TIMESTAMPTZ;
  v_existing_event public.registration_request_events%ROWTYPE;
  v_resident_id UUID;
  v_resident_count INTEGER;
BEGIN
  IF v_actor_id IS NULL THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required'; END IF;
  IF length(v_reference) < 8 OR length(v_token) < 32 OR length(v_key) < 8 OR length(v_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Activation receipt is invalid';
  END IF;
  v_token_digest := extensions.digest(convert_to(v_token, 'UTF8'), 'sha256');

  SELECT a.* INTO v_activation
  FROM public.registration_activation_invitations a
  JOIN public.registration_requests r ON r.id = a.registration_request_id
  WHERE upper(r.public_reference) = v_reference
  FOR UPDATE OF a, r;
  IF NOT FOUND OR v_activation.activation_token_digest IS DISTINCT FROM v_token_digest THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Activation invitation was not found';
  END IF;

  SELECT r.* INTO v_request
  FROM public.registration_requests r
  WHERE r.id = v_activation.registration_request_id;

  SELECT * INTO v_existing_event
  FROM public.registration_request_events e
  WHERE e.company_id = v_request.company_id AND e.idempotency_key = v_key;
  IF FOUND THEN
    IF v_existing_event.registration_request_id IS DISTINCT FROM v_request.id
       OR v_existing_event.event_type <> 'activated'
       OR v_existing_event.actor_profile_id IS DISTINCT FROM v_actor_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Idempotency key was used for a different activation';
    END IF;
    RETURN jsonb_build_object(
      'reference', v_request.public_reference,
      'status', v_request.status,
      'requestedRole', v_request.requested_role,
      'companyId', v_request.company_id,
      'replayed', TRUE
    );
  END IF;

  IF v_activation.status <> 'pending' OR v_request.status <> 'approved' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Activation invitation is no longer pending';
  END IF;
  IF v_activation.expires_at <= clock_timestamp() THEN
    UPDATE public.registration_activation_invitations
      SET status = 'expired', updated_at = clock_timestamp()
      WHERE id = v_activation.id;
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Activation invitation has expired';
  END IF;

  SELECT public.normalize_registration_email(au.email), au.email_confirmed_at
  INTO v_auth_email, v_email_confirmed_at
  FROM auth.users au WHERE au.id = v_actor_id;
  IF v_email_confirmed_at IS NULL
     OR extensions.digest(convert_to(v_auth_email, 'UTF8'), 'sha256') IS DISTINCT FROM v_activation.email_digest
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Use the confirmed email address that received this activation';
  END IF;

  SELECT * INTO v_profile FROM public.profiles p WHERE p.id = v_actor_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Authenticated profile was not found'; END IF;
  IF v_profile.company_id IS NOT NULL OR v_profile.role <> 'tenant' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Activation requires a new unassigned profile';
  END IF;

  PERFORM set_config('app.registration_activation_redeem_id', v_activation.id::TEXT, TRUE);
  PERFORM set_config('app.registration_activation_token_digest', encode(v_token_digest, 'hex'), TRUE);
  UPDATE public.profiles
  SET company_id = v_request.company_id,
      role = v_request.requested_role,
      full_name = COALESCE(NULLIF(full_name, ''), v_request.full_name),
      phone = COALESCE(phone, v_request.phone),
      language = v_request.language,
      updated_at = clock_timestamp()
  WHERE id = v_actor_id;

  IF v_request.requested_role IN ('owner', 'tenant') THEN
    IF EXISTS (
      SELECT 1
      FROM public.residents r
      WHERE r.company_id = v_request.company_id
        AND public.normalize_registration_email(r.email) = v_auth_email
        AND r.status IS DISTINCT FROM 'active'
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Inactive resident record requires administrator resolution before activation';
    END IF;
    SELECT count(*), min(id::TEXT)::UUID INTO v_resident_count, v_resident_id
    FROM public.residents r
    WHERE r.company_id = v_request.company_id
      AND public.normalize_registration_email(r.email) = v_auth_email
      AND r.status = 'active';
    IF v_resident_count > 1 THEN
      RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Multiple resident records require administrator resolution';
    END IF;
    IF v_resident_count = 0 THEN
      INSERT INTO public.residents (
        company_id, full_name, phone, email, preferred_language,
        preferred_channel, identity_status, status
      ) VALUES (
        v_request.company_id, v_request.full_name, v_request.phone, v_request.email,
        v_request.language, 'portal',
        CASE WHEN v_request.identity_review_status IN ('manual_review_complete', 'provider_verified') THEN 'verified' ELSE 'pending' END,
        'active'
      ) RETURNING id INTO v_resident_id;
    END IF;

    INSERT INTO public.resident_profile_links (
      company_id, profile_id, resident_id, status, verification_method,
      verified_by, verified_at, valid_from
    ) VALUES (
      v_request.company_id, v_actor_id, v_resident_id, 'active', 'admin_verified',
      v_request.decided_by_profile_id, v_request.decided_at, clock_timestamp()
    )
    ON CONFLICT (company_id, profile_id) DO UPDATE SET
      resident_id = EXCLUDED.resident_id,
      status = 'active',
      verification_method = 'admin_verified',
      verified_by = EXCLUDED.verified_by,
      verified_at = EXCLUDED.verified_at,
      valid_from = EXCLUDED.valid_from,
      valid_until = NULL,
      updated_at = clock_timestamp();

    INSERT INTO public.unit_residents (
      company_id, unit_id, resident_id, relationship, is_primary, start_date, end_date
    ) VALUES (
      v_request.company_id, v_request.approved_unit_id, v_resident_id,
      v_request.requested_role, TRUE, CURRENT_DATE, NULL
    )
    ON CONFLICT (unit_id, resident_id, relationship) DO UPDATE SET
      company_id = EXCLUDED.company_id,
      is_primary = TRUE,
      start_date = LEAST(public.unit_residents.start_date, CURRENT_DATE),
      end_date = NULL;
  ELSE
    INSERT INTO public.staff_members (
      company_id, profile_id, name, role, team, phone, language,
      active_tasks, approval_limit_cents, access_scope, status
    )
    SELECT
      v_request.company_id, v_actor_id, v_request.full_name, 'staff',
      COALESCE(v_request.position, 'Onboarding'), v_request.phone, v_request.language,
      0, 0, 'field_only', 'training'
    WHERE NOT EXISTS (SELECT 1 FROM public.staff_members s WHERE s.profile_id = v_actor_id);

    INSERT INTO public.profile_site_assignments (
      company_id, site_id, profile_id, access_role, status,
      valid_from, valid_until, granted_by
    )
    SELECT
      v_request.company_id, site_id, v_actor_id, 'operator', 'active',
      clock_timestamp(), NULL, v_request.decided_by_profile_id
    FROM unnest(v_request.approved_site_ids) site_id
    ON CONFLICT (company_id, site_id, profile_id) DO UPDATE SET
      access_role = 'operator', status = 'active', valid_from = clock_timestamp(),
      valid_until = NULL, granted_by = EXCLUDED.granted_by, updated_at = clock_timestamp();
  END IF;

  UPDATE public.registration_activation_invitations
  SET status = 'redeemed', redeemed_by_profile_id = v_actor_id,
      redeemed_at = clock_timestamp(), workflow_version = workflow_version + 1,
      updated_at = clock_timestamp()
  WHERE id = v_activation.id AND status = 'pending';

  UPDATE public.registration_requests
  SET status = 'activated', workflow_version = workflow_version + 1,
      last_transition_at = clock_timestamp(), updated_at = clock_timestamp()
  WHERE id = v_request.id AND status = 'approved'
  RETURNING * INTO v_request;

  INSERT INTO public.registration_request_events (
    company_id, registration_request_id, event_type, request_version,
    actor_profile_id, reason, payload, idempotency_key
  ) VALUES (
    v_request.company_id, v_request.id, 'activated', v_request.workflow_version,
    v_actor_id, 'Approved applicant redeemed the one-time activation.',
    jsonb_build_object('activationId', v_activation.id, 'profileId', v_actor_id, 'role', v_request.requested_role),
    v_key
  );
  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_request.company_id, v_actor_id, 'registration.activated', 'registration_requests', v_request.id,
    jsonb_build_object('status', 'approved'),
    jsonb_build_object('status', 'activated', 'profileId', v_actor_id, 'role', v_request.requested_role, 'workflowVersion', v_request.workflow_version),
    'audit:registration:' || v_key
  );
  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_request.company_id, 'internal_event_bus', 'registration.activated',
    'registration_requests', v_request.id,
    jsonb_build_object('requestId', v_request.id, 'profileId', v_actor_id, 'role', v_request.requested_role),
    'queued', 'registration:' || v_key
  ) ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object(
    'reference', v_request.public_reference,
    'status', v_request.status,
    'requestedRole', v_request.requested_role,
    'companyId', v_request.company_id,
    'replayed', FALSE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_registration_activation_command(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_registration_activation_command(TEXT, TEXT, TEXT) TO authenticated;

ALTER TABLE public.registration_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_activation_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_request_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reject_registration_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION USING
    ERRCODE = '42501',
    MESSAGE = 'Registration history is append-only';
END;
$$;

DROP TRIGGER IF EXISTS registration_history_append_only
  ON public.registration_request_events;
CREATE TRIGGER registration_history_append_only
  BEFORE UPDATE OR DELETE ON public.registration_request_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_registration_history_mutation();

REVOKE ALL ON FUNCTION public.reject_registration_history_mutation()
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.registration_review_workspace()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_role TEXT := public.current_user_profile_role();
  v_requests JSONB;
  v_units JSONB;
  v_sites JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR v_company_id IS NULL
     OR v_role NOT IN ('admin', 'manager')
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Registration review is limited to authenticated management';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      public.registration_request_admin_payload(
        r::public.registration_requests,
        NULL,
        FALSE
      )
      || jsonb_build_object(
        'history', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', e.id,
              'eventType', e.event_type,
              'requestVersion', e.request_version,
              'actorProfileId', e.actor_profile_id,
              'reason', e.reason,
              'createdAt', e.created_at
            ) ORDER BY e.request_version
          )
          FROM public.registration_request_events e
          WHERE e.registration_request_id = r.id
        ), '[]'::JSONB)
      )
      ORDER BY r.created_at DESC
    ),
    '[]'::JSONB
  )
    INTO v_requests
    FROM (
      SELECT *
      FROM public.registration_requests request_row
      WHERE request_row.company_id = v_company_id
      ORDER BY request_row.created_at DESC
      LIMIT 100
    ) r;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', u.id,
        'unitNo', u.unit_no,
        'siteName', COALESCE(s.name, s.code)
      ) ORDER BY s.name, u.unit_no
    ),
    '[]'::JSONB
  )
    INTO v_units
    FROM public.units u
    JOIN public.sites s ON s.id = u.site_id AND s.company_id = u.company_id
   WHERE u.company_id = v_company_id
     AND (
       v_role = 'admin'
       OR public.current_user_can_manage_site(u.site_id)
     );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'code', s.code
      ) ORDER BY s.name
    ),
    '[]'::JSONB
  )
    INTO v_sites
    FROM public.sites s
   WHERE s.company_id = v_company_id
     AND s.status <> 'archived'
     AND (
       v_role = 'admin'
       OR public.current_user_can_manage_site(s.id)
     );

  RETURN jsonb_build_object(
    'contractVersion', 'registration-review.v1',
    'generatedAt', NOW(),
    'requests', v_requests,
    'units', v_units,
    'sites', v_sites
  );
END;
$$;

COMMENT ON FUNCTION public.registration_review_workspace() IS
  'Returns management-safe registration, history, unit and site projections without exposing receipt, submission, activation or identity digests.';

REVOKE ALL ON FUNCTION public.registration_review_workspace()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registration_review_workspace()
  TO authenticated;

CREATE POLICY registration_requests_company_review_select
  ON public.registration_requests FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
    )
  );

CREATE POLICY registration_activation_company_admin_select
  ON public.registration_activation_invitations FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
    )
    OR redeemed_by_profile_id = (SELECT auth.uid())
  );

CREATE POLICY registration_events_company_review_select
  ON public.registration_request_events FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
    )
  );

REVOKE ALL ON TABLE public.registration_requests FROM anon, authenticated;
REVOKE ALL ON TABLE public.registration_activation_invitations FROM anon, authenticated;
REVOKE ALL ON TABLE public.registration_request_events FROM anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
         AND tablename = 'registration_requests'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.registration_requests;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.decide_registration_request_command(
  UUID, INTEGER, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID[], TEXT
) IS
  'Admin-only CAS/idempotent registration decision. Approval binds an exact resident unit or staff site scope and returns a one-time expiring activation token.';
COMMENT ON FUNCTION public.redeem_registration_activation_command(TEXT, TEXT, TEXT) IS
  'Redeems a human-approved activation for the exact confirmed email, then creates least-privilege company/role and resident-or-staff relationships transactionally.';

COMMIT;
