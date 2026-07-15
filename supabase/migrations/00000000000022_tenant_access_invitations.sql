-- Secure, owner-sponsored tenant access invitations.
--
-- Security invariants:
--   * Invitation codes are generated server-side and returned exactly once.
--     Only a SHA-256 digest and a short, non-secret hint are persisted.
--   * Email addresses are matched by an authoritative, confirmed auth identity;
--     only a digest and masked display value are persisted on the invitation.
--   * New self-signups remain company-unassigned until invitation redemption or
--     an explicit administrator command binds them to an organization.
--   * Every mutation is versioned, idempotent, audited and published through the
--     transactional outbox. Direct table mutation is denied.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
DECLARE
  v_extension_schema TEXT;
BEGIN
  SELECT n.nspname
    INTO v_extension_schema
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
   WHERE e.extname = 'pgcrypto';

  IF v_extension_schema IS DISTINCT FROM 'extensions' THEN
    RAISE EXCEPTION
      'pgcrypto must be installed in the extensions schema; found %.',
      COALESCE(v_extension_schema, '<missing>');
  END IF;
END;
$$;

CREATE TABLE public.tenant_access_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  sponsor_owner_profile_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_by_profile_id UUID NOT NULL
    REFERENCES public.profiles(id) ON DELETE RESTRICT,
  tenant_name TEXT NOT NULL,
  email_digest BYTEA NOT NULL,
  email_masked TEXT NOT NULL,
  code_digest BYTEA NOT NULL,
  code_hint TEXT NOT NULL,
  allowed_scopes TEXT[] NOT NULL,
  access_valid_from DATE NOT NULL,
  access_valid_until DATE NOT NULL,
  redeem_from TIMESTAMPTZ NOT NULL,
  redeem_until TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  accepted_profile_id UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  accepted_resident_id UUID REFERENCES public.residents(id) ON DELETE RESTRICT,
  relationship_id UUID REFERENCES public.unit_residents(id) ON DELETE SET NULL,
  relationship_created_by_invitation BOOLEAN NOT NULL DEFAULT FALSE,
  relationship_managed_by_invitation BOOLEAN NOT NULL DEFAULT FALSE,
  relationship_previous_start_date DATE,
  relationship_previous_end_date DATE,
  profile_link_managed_by_invitation BOOLEAN NOT NULL DEFAULT FALSE,
  profile_company_assigned_by_invitation BOOLEAN NOT NULL DEFAULT FALSE,
  workflow_version INTEGER NOT NULL DEFAULT 1,
  create_idempotency_key TEXT NOT NULL,
  last_command_idempotency_key TEXT NOT NULL,
  accepted_at TIMESTAMPTZ,
  extended_at TIMESTAMPTZ,
  extended_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  revoked_reason TEXT,
  last_audit_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT tenant_access_invitations_status_check
    CHECK (status IN ('pending', 'accepted', 'revoked')),
  CONSTRAINT tenant_access_invitations_name_check
    CHECK (length(btrim(tenant_name)) BETWEEN 2 AND 160),
  CONSTRAINT tenant_access_invitations_email_digest_check
    CHECK (octet_length(email_digest) = 32),
  CONSTRAINT tenant_access_invitations_code_digest_check
    CHECK (octet_length(code_digest) = 32),
  CONSTRAINT tenant_access_invitations_mask_check
    CHECK (length(email_masked) BETWEEN 5 AND 320),
  CONSTRAINT tenant_access_invitations_hint_check
    CHECK (length(code_hint) BETWEEN 4 AND 12),
  CONSTRAINT tenant_access_invitations_scope_check
    CHECK (
      cardinality(allowed_scopes) BETWEEN 1 AND 4
      AND allowed_scopes <@ ARRAY[
        'tickets', 'calendar', 'documents', 'communications'
      ]::TEXT[]
    ),
  CONSTRAINT tenant_access_invitations_access_window_check
    CHECK (access_valid_until >= access_valid_from),
  CONSTRAINT tenant_access_invitations_redeem_window_check
    CHECK (
      redeem_until > redeem_from
      AND redeem_from::DATE >= access_valid_from
      AND redeem_until::DATE <= access_valid_until
    ),
  CONSTRAINT tenant_access_invitations_version_check
    CHECK (workflow_version > 0),
  CONSTRAINT tenant_access_invitations_create_key_check
    CHECK (length(btrim(create_idempotency_key)) BETWEEN 8 AND 200),
  CONSTRAINT tenant_access_invitations_last_key_check
    CHECK (length(btrim(last_command_idempotency_key)) BETWEEN 8 AND 200),
  CONSTRAINT tenant_access_invitations_acceptance_check
    CHECK (
      (
        accepted_profile_id IS NULL
        AND accepted_resident_id IS NULL
        AND accepted_at IS NULL
        AND relationship_id IS NULL
      )
      OR (
        accepted_profile_id IS NOT NULL
        AND accepted_resident_id IS NOT NULL
        AND accepted_at IS NOT NULL
        AND relationship_id IS NOT NULL
      )
    ),
  CONSTRAINT tenant_access_invitations_status_evidence_check
    CHECK (
      (
        status = 'pending'
        AND accepted_profile_id IS NULL
        AND revoked_at IS NULL
        AND revoked_by_profile_id IS NULL
        AND revoked_reason IS NULL
      )
      OR (
        status = 'accepted'
        AND accepted_profile_id IS NOT NULL
        AND revoked_at IS NULL
        AND revoked_by_profile_id IS NULL
        AND revoked_reason IS NULL
      )
      OR (
        status = 'revoked'
        AND revoked_at IS NOT NULL
        AND revoked_by_profile_id IS NOT NULL
        AND length(btrim(revoked_reason)) BETWEEN 10 AND 1000
      )
    ),
  CONSTRAINT tenant_access_invitations_relationship_evidence_check
    CHECK (
      NOT relationship_created_by_invitation
      OR relationship_managed_by_invitation
    ),
  CONSTRAINT tenant_access_invitations_extended_evidence_check
    CHECK (
      (extended_at IS NULL AND extended_by_profile_id IS NULL)
      OR (extended_at IS NOT NULL AND extended_by_profile_id IS NOT NULL)
    ),
  CONSTRAINT tenant_access_invitations_code_unique UNIQUE (code_digest),
  CONSTRAINT tenant_access_invitations_create_idempotency_unique
    UNIQUE (company_id, create_idempotency_key)
);

COMMENT ON TABLE public.tenant_access_invitations IS
  'Time-boxed owner-sponsored tenant capabilities. Plain invitation codes and plaintext invitation emails are never persisted.';
COMMENT ON COLUMN public.tenant_access_invitations.email_digest IS
  'SHA-256 digest of the normalized invitation email. The plaintext email is intentionally not stored here.';
COMMENT ON COLUMN public.tenant_access_invitations.code_digest IS
  'SHA-256 digest of a server-generated 256-bit invitation code. The plaintext code is returned once and never stored.';
COMMENT ON COLUMN public.tenant_access_invitations.code_hint IS
  'Short non-secret suffix used only to help users distinguish invitations.';
COMMENT ON COLUMN public.tenant_access_invitations.allowed_scopes IS
  'Allowlisted capabilities. API and RLS consumers must call current_user_has_tenant_invitation_scope before granting an invitation-derived capability.';

CREATE UNIQUE INDEX tenant_access_invitations_pending_email_unit_uq
  ON public.tenant_access_invitations(company_id, unit_id, email_digest)
  WHERE status = 'pending';
CREATE UNIQUE INDEX tenant_access_invitations_accepted_profile_unit_uq
  ON public.tenant_access_invitations(unit_id, accepted_profile_id)
  WHERE status = 'accepted' AND accepted_profile_id IS NOT NULL;
CREATE INDEX tenant_access_invitations_company_status_redeem_idx
  ON public.tenant_access_invitations(company_id, status, redeem_until);
CREATE INDEX tenant_access_invitations_sponsor_status_created_idx
  ON public.tenant_access_invitations(
    sponsor_owner_profile_id, status, created_at DESC
  );
CREATE INDEX tenant_access_invitations_accepted_profile_status_idx
  ON public.tenant_access_invitations(
    accepted_profile_id, status, access_valid_until
  )
  WHERE accepted_profile_id IS NOT NULL;
CREATE INDEX tenant_access_invitations_unit_status_idx
  ON public.tenant_access_invitations(unit_id, status, access_valid_until);
CREATE INDEX residents_company_normalized_email_idx
  ON public.residents(company_id, lower(btrim(email)))
  WHERE email IS NOT NULL AND btrim(email) <> '';

CREATE OR REPLACE FUNCTION public.normalize_tenant_invitation_email(p_email TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT lower(btrim(COALESCE(p_email, '')));
$$;

CREATE OR REPLACE FUNCTION public.mask_tenant_invitation_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
DECLARE
  v_email TEXT := public.normalize_tenant_invitation_email(p_email);
  v_at INTEGER := strpos(v_email, '@');
  v_local TEXT;
  v_domain TEXT;
BEGIN
  IF v_at <= 1 OR v_at = length(v_email) THEN
    RETURN '***';
  END IF;

  v_local := left(v_email, v_at - 1);
  v_domain := substring(v_email FROM v_at + 1);
  RETURN left(v_local, 1) || repeat('*', greatest(3, length(v_local) - 1))
    || '@' || v_domain;
END;
$$;

CREATE OR REPLACE FUNCTION public.tenant_access_invitation_safe_payload(
  p_invitation public.tenant_access_invitations
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = ''
AS $$
BEGIN
  RETURN jsonb_build_object(
    'id', p_invitation.id,
    'companyId', p_invitation.company_id,
    'unitId', p_invitation.unit_id,
    'sponsorOwnerProfileId', p_invitation.sponsor_owner_profile_id,
    'createdByProfileId', p_invitation.created_by_profile_id,
    'tenantName', p_invitation.tenant_name,
    'emailMasked', p_invitation.email_masked,
    'codeHint', p_invitation.code_hint,
    'allowedScopes', p_invitation.allowed_scopes,
    'accessValidFrom', p_invitation.access_valid_from,
    'accessValidUntil', p_invitation.access_valid_until,
    'redeemFrom', p_invitation.redeem_from,
    'redeemUntil', p_invitation.redeem_until,
    'status', p_invitation.status,
    'acceptedProfileId', p_invitation.accepted_profile_id,
    'acceptedResidentId', p_invitation.accepted_resident_id,
    'workflowVersion', p_invitation.workflow_version,
    'acceptedAt', p_invitation.accepted_at,
    'extendedAt', p_invitation.extended_at,
    'revokedAt', p_invitation.revoked_at,
    'lastAuditAt', p_invitation.last_audit_at,
    'createdAt', p_invitation.created_at,
    'updatedAt', p_invitation.updated_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.normalize_tenant_invitation_email(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mask_tenant_invitation_email(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tenant_access_invitation_safe_payload(
  public.tenant_access_invitations
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.enforce_tenant_access_invitation_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_company UUID;
  v_sponsor_company UUID;
  v_sponsor_role TEXT;
  v_profile_company UUID;
  v_profile_role TEXT;
  v_resident_company UUID;
  v_relationship_company UUID;
  v_relationship_unit UUID;
  v_relationship_resident UUID;
  v_relationship_type TEXT;
  v_scope_count INTEGER;
  v_distinct_scope_count INTEGER;
BEGIN
  IF current_setting('app.tenant_invitation_command', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Tenant invitations may change only through authorized command functions';
  END IF;

  SELECT u.company_id
    INTO v_unit_company
    FROM public.units u
   WHERE u.id = NEW.unit_id;

  SELECT p.company_id, p.role
    INTO v_sponsor_company, v_sponsor_role
    FROM public.profiles p
   WHERE p.id = NEW.sponsor_owner_profile_id;

  IF v_unit_company IS NULL
     OR v_sponsor_company IS NULL
     OR NEW.company_id IS DISTINCT FROM v_unit_company
     OR NEW.company_id IS DISTINCT FROM v_sponsor_company
     OR v_sponsor_role IS DISTINCT FROM 'owner'
  THEN
    RAISE EXCEPTION 'Invitation unit and sponsor owner must remain inside one company.';
  END IF;

  SELECT count(*), count(DISTINCT scope_name)
    INTO v_scope_count, v_distinct_scope_count
    FROM unnest(NEW.allowed_scopes) AS scopes(scope_name);

  IF v_scope_count IS DISTINCT FROM v_distinct_scope_count THEN
    RAISE EXCEPTION 'Invitation scopes must not contain duplicates.';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'pending' OR NEW.workflow_version <> 1 THEN
      RAISE EXCEPTION 'New invitations must begin pending at workflow version 1.';
    END IF;
  ELSE
    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id
       OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
       OR NEW.sponsor_owner_profile_id IS DISTINCT FROM OLD.sponsor_owner_profile_id
       OR NEW.created_by_profile_id IS DISTINCT FROM OLD.created_by_profile_id
       OR NEW.tenant_name IS DISTINCT FROM OLD.tenant_name
       OR NEW.email_digest IS DISTINCT FROM OLD.email_digest
       OR NEW.email_masked IS DISTINCT FROM OLD.email_masked
       OR NEW.code_digest IS DISTINCT FROM OLD.code_digest
       OR NEW.code_hint IS DISTINCT FROM OLD.code_hint
       OR NEW.allowed_scopes IS DISTINCT FROM OLD.allowed_scopes
       OR NEW.access_valid_from IS DISTINCT FROM OLD.access_valid_from
       OR NEW.create_idempotency_key IS DISTINCT FROM OLD.create_idempotency_key
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Invitation identity, secret digests and granted scopes are immutable.';
    END IF;

    IF NEW.workflow_version IS DISTINCT FROM OLD.workflow_version + 1 THEN
      RAISE EXCEPTION 'Invitation workflow version must increase by exactly one.';
    END IF;

    IF NEW.access_valid_until < OLD.access_valid_until
       OR NEW.redeem_until < OLD.redeem_until
    THEN
      RAISE EXCEPTION 'Invitation windows cannot be shortened; revoke instead.';
    END IF;

    IF NOT (
      NEW.status = OLD.status
      OR (OLD.status = 'pending' AND NEW.status IN ('accepted', 'revoked'))
      OR (OLD.status = 'accepted' AND NEW.status = 'revoked')
    ) THEN
      RAISE EXCEPTION 'Unsupported invitation status transition: % -> %.',
        OLD.status, NEW.status;
    END IF;

    IF OLD.accepted_profile_id IS NOT NULL
       AND (
         NEW.accepted_profile_id IS DISTINCT FROM OLD.accepted_profile_id
         OR NEW.accepted_resident_id IS DISTINCT FROM OLD.accepted_resident_id
         OR NEW.relationship_id IS DISTINCT FROM OLD.relationship_id
         OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
       )
    THEN
      RAISE EXCEPTION 'Accepted invitation identity is immutable.';
    END IF;
  END IF;

  IF NEW.accepted_profile_id IS NOT NULL THEN
    SELECT p.company_id, p.role
      INTO v_profile_company, v_profile_role
      FROM public.profiles p
     WHERE p.id = NEW.accepted_profile_id;

    SELECT r.company_id
      INTO v_resident_company
      FROM public.residents r
     WHERE r.id = NEW.accepted_resident_id;

    SELECT ur.company_id, ur.unit_id, ur.resident_id, ur.relationship
      INTO v_relationship_company, v_relationship_unit,
           v_relationship_resident, v_relationship_type
      FROM public.unit_residents ur
     WHERE ur.id = NEW.relationship_id;

    IF v_profile_company IS DISTINCT FROM NEW.company_id
       OR v_profile_role IS DISTINCT FROM 'tenant'
       OR v_resident_company IS DISTINCT FROM NEW.company_id
       OR v_relationship_company IS DISTINCT FROM NEW.company_id
       OR v_relationship_unit IS DISTINCT FROM NEW.unit_id
       OR v_relationship_resident IS DISTINCT FROM NEW.accepted_resident_id
       OR v_relationship_type IS DISTINCT FROM 'tenant'
    THEN
      RAISE EXCEPTION 'Accepted tenant identity and relationship must remain inside the invitation boundary.';
    END IF;
  END IF;

  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_tenant_access_invitation_integrity
  BEFORE INSERT OR UPDATE ON public.tenant_access_invitations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_access_invitation_integrity();

CREATE OR REPLACE FUNCTION public.tenant_invitation_profile_binding_allowed(
  p_invitation_id UUID,
  p_profile_id UUID,
  p_company_id UUID,
  p_code_digest_hex TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
      JOIN auth.users au ON au.id = p_profile_id
     WHERE i.id = p_invitation_id
       AND p_profile_id = (SELECT auth.uid())
       AND i.company_id = p_company_id
       AND i.status = 'pending'
       AND i.redeem_from <= clock_timestamp()
       AND i.redeem_until >= clock_timestamp()
       AND i.access_valid_from <= CURRENT_DATE
       AND i.access_valid_until >= CURRENT_DATE
       AND au.email_confirmed_at IS NOT NULL
       AND public.normalize_tenant_invitation_email(au.email)
         = public.normalize_tenant_invitation_email((SELECT auth.jwt())->>'email')
       AND i.email_digest = extensions.digest(
         convert_to(public.normalize_tenant_invitation_email(au.email), 'UTF8'),
         'sha256'
       )
       AND encode(i.code_digest, 'hex') = lower(p_code_digest_hex)
       AND public.profile_has_unit_relationship(
         i.sponsor_owner_profile_id,
         i.unit_id,
         ARRAY['owner']::TEXT[]
       )
  );
$$;

REVOKE ALL ON FUNCTION public.tenant_invitation_profile_binding_allowed(
  UUID, UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;

-- New self-signups no longer inherit a global/default organization. Existing
-- profiles are intentionally untouched. Invitation redemption or an explicit
-- administrator command supplies company context later.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, full_name, role, language, company_id
  ) VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'tenant',
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr'),
    NULL
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    language = COALESCE(EXCLUDED.language, public.profiles.language),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
  'Creates a least-privilege tenant profile without implicit company membership. Organization binding requires a verified invite or admin command.';

-- Preserve migration-20 authority rules and add one narrowly bounded NULL ->
-- invitation-company branch. The transaction-local guard is useful only with
-- the matching code digest, confirmed JWT/auth email, pending invitation and
-- still-active sponsor ownership.
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
  v_command_guard BOOLEAN :=
    current_setting('app.authority_change_command', TRUE) = 'on';
  v_invitation_id UUID := NULLIF(
    current_setting('app.tenant_invitation_redeem_id', TRUE), ''
  )::UUID;
  v_invitation_code_digest_hex TEXT := NULLIF(
    current_setting('app.tenant_invitation_code_digest', TRUE), ''
  );
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN
    RAISE EXCEPTION 'Profile identity is immutable.';
  END IF;

  v_sensitive_change :=
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.office_id IS DISTINCT FROM OLD.office_id;

  IF NOT v_sensitive_change THEN
    RETURN NEW;
  END IF;

  IF NEW.office_id IS NOT NULL THEN
    SELECT o.company_id INTO v_office_company
    FROM public.offices o
    WHERE o.id = NEW.office_id;

    IF v_office_company IS NULL
       OR NEW.company_id IS DISTINCT FROM v_office_company
    THEN
      RAISE EXCEPTION 'Profile office must belong to the profile company.';
    END IF;
  END IF;

  IF public.is_platform_super_admin() THEN
    IF NOT v_command_guard THEN
      INSERT INTO public.audit_events (
        company_id, actor_profile_id, action, entity_table, entity_id,
        before_data, after_data
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id),
        v_actor_id,
        'profile.platform_authority_provisioned',
        'profiles',
        NEW.id,
        jsonb_build_object(
          'role', OLD.role,
          'companyId', OLD.company_id,
          'officeId', OLD.office_id
        ),
        jsonb_build_object(
          'role', NEW.role,
          'companyId', NEW.company_id,
          'officeId', NEW.office_id,
          'reason', 'platform/service provisioning'
        )
      );
    END IF;
  ELSIF v_command_guard
        AND v_actor_role = 'admin'
        AND v_actor_company IS NOT NULL
        AND OLD.company_id = v_actor_company
        AND NEW.company_id = v_actor_company
        AND NEW.id IS DISTINCT FROM v_actor_id
  THEN
    NULL;
  ELSIF OLD.company_id IS NULL
        AND NEW.company_id IS NOT NULL
        AND OLD.role = 'tenant'
        AND NEW.role = 'tenant'
        AND NEW.office_id IS NOT DISTINCT FROM OLD.office_id
        AND NEW.id = v_actor_id
        AND v_invitation_id IS NOT NULL
        AND v_invitation_code_digest_hex IS NOT NULL
        AND public.tenant_invitation_profile_binding_allowed(
          v_invitation_id,
          NEW.id,
          NEW.company_id,
          v_invitation_code_digest_hex
        )
  THEN
    INSERT INTO public.audit_events (
      company_id, actor_profile_id, action, entity_table, entity_id,
      before_data, after_data, idempotency_key
    ) VALUES (
      NEW.company_id,
      v_actor_id,
      'tenant_invitation.profile_company_bound',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'role', OLD.role,
        'companyId', OLD.company_id,
        'officeId', OLD.office_id
      ),
      jsonb_build_object(
        'role', NEW.role,
        'companyId', NEW.company_id,
        'officeId', NEW.office_id,
        'invitationId', v_invitation_id
      ),
      'tenant-invite:profile-bind:' || v_invitation_id::TEXT
    );
  ELSE
    RAISE EXCEPTION
      'Sensitive profile authority changes require an authorized admin command or verified tenant invitation redemption.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_tenant_access_invitation(
  p_invitation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
     WHERE i.id = p_invitation_id
       AND (
         public.is_platform_super_admin()
         OR (
           (SELECT public.current_user_profile_role()) = 'admin'
           AND (SELECT public.current_user_company_id()) = i.company_id
         )
         OR i.accepted_profile_id = (SELECT auth.uid())
         OR (
           i.sponsor_owner_profile_id = (SELECT auth.uid())
           AND public.profile_has_unit_relationship(
             (SELECT auth.uid()),
             i.unit_id,
             ARRAY['owner']::TEXT[]
           )
         )
       )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_tenant_invitation_scope(
  p_unit_id UUID,
  p_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
     WHERE i.accepted_profile_id = (SELECT auth.uid())
       AND i.unit_id = p_unit_id
       AND i.status = 'accepted'
       AND lower(btrim(p_scope)) = ANY (i.allowed_scopes)
       AND i.access_valid_from <= CURRENT_DATE
       AND i.access_valid_until >= CURRENT_DATE
       AND public.profile_has_unit_relationship(
         (SELECT auth.uid()),
         i.unit_id,
         ARRAY['tenant']::TEXT[]
       )
       AND public.profile_has_unit_relationship(
         i.sponsor_owner_profile_id,
         i.unit_id,
         ARRAY['owner']::TEXT[]
       )
  );
$$;

COMMENT ON FUNCTION public.current_user_has_tenant_invitation_scope(UUID, TEXT) IS
  'Authoritative invitation-derived capability check. Returns false after expiration, revocation, sponsor ownership loss or tenant relationship loss.';

REVOKE ALL ON FUNCTION public.current_user_can_view_tenant_access_invitation(UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_view_tenant_access_invitation(UUID)
  TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_has_tenant_invitation_scope(UUID, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_tenant_invitation_scope(UUID, TEXT)
  TO authenticated;

ALTER TABLE public.tenant_access_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_access_invitations_select_authorized
  ON public.tenant_access_invitations
  FOR SELECT
  TO authenticated
  USING (public.current_user_can_view_tenant_access_invitation(id));

CREATE OR REPLACE FUNCTION public.create_tenant_access_invitation_command(
  p_unit_id UUID,
  p_sponsor_owner_profile_id UUID,
  p_tenant_name TEXT,
  p_tenant_email TEXT,
  p_allowed_scopes TEXT[],
  p_access_valid_from DATE,
  p_access_valid_until DATE,
  p_redeem_from TIMESTAMPTZ,
  p_redeem_until TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_reason TEXT
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
  v_unit public.units%ROWTYPE;
  v_sponsor public.profiles%ROWTYPE;
  v_existing public.tenant_access_invitations%ROWTYPE;
  v_invitation public.tenant_access_invitations%ROWTYPE;
  v_normalized_email TEXT := public.normalize_tenant_invitation_email(p_tenant_email);
  v_email_digest BYTEA;
  v_masked_email TEXT;
  v_invite_code TEXT;
  v_code_digest BYTEA;
  v_scopes TEXT[];
  v_idempotency_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_safe_payload JSONB;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF length(v_idempotency_key) < 8 OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  IF length(v_reason) < 10 OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 10 and 1000 characters is required';
  END IF;

  IF length(btrim(COALESCE(p_tenant_name, ''))) NOT BETWEEN 2 AND 160 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Tenant name must contain 2 to 160 characters';
  END IF;

  IF length(v_normalized_email) > 320
     OR v_normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A valid tenant email is required';
  END IF;

  IF p_allowed_scopes IS NULL
     OR cardinality(p_allowed_scopes) = 0
     OR EXISTS (
       SELECT 1
         FROM unnest(p_allowed_scopes) AS requested(scope_name)
        WHERE lower(btrim(scope_name)) NOT IN (
          'tickets', 'calendar', 'documents', 'communications'
        )
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation scopes contain an unsupported capability';
  END IF;

  SELECT array_agg(
           DISTINCT lower(btrim(scope_name))
           ORDER BY lower(btrim(scope_name))
         )
    INTO v_scopes
    FROM unnest(p_allowed_scopes) AS requested(scope_name);

  IF p_access_valid_from IS NULL
     OR p_access_valid_until IS NULL
     OR p_access_valid_until < p_access_valid_from
     OR p_access_valid_from < CURRENT_DATE
     OR p_access_valid_until > (p_access_valid_from + INTERVAL '2 years')::DATE
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Access must be a future-facing window of at most two years';
  END IF;

  IF p_redeem_from IS NULL
     OR p_redeem_until IS NULL
     OR p_redeem_from < clock_timestamp() - INTERVAL '5 minutes'
     OR p_redeem_from::DATE < p_access_valid_from
     OR p_redeem_until <= p_redeem_from
     OR p_redeem_until < clock_timestamp() + INTERVAL '10 minutes'
     OR p_redeem_until > p_redeem_from + INTERVAL '30 days'
     OR p_redeem_until::DATE > p_access_valid_until
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Redemption must be a 10-minute to 30-day window inside the access window';
  END IF;

  SELECT *
    INTO v_unit
    FROM public.units u
   WHERE u.id = p_unit_id
   FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Invitation unit was not found';
  END IF;

  SELECT *
    INTO v_sponsor
    FROM public.profiles p
   WHERE p.id = p_sponsor_owner_profile_id
   FOR SHARE;

  IF NOT FOUND
     OR v_sponsor.company_id IS DISTINCT FROM v_unit.company_id
     OR v_sponsor.role IS DISTINCT FROM 'owner'
     OR NOT public.profile_has_unit_relationship(
       p_sponsor_owner_profile_id,
       p_unit_id,
       ARRAY['owner']::TEXT[]
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The sponsor must be a currently verified owner of the selected unit';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_actor_company = v_unit.company_id
    )
    OR (
      v_actor_role = 'owner'
      AND v_actor_id = p_sponsor_owner_profile_id
      AND v_actor_company = v_unit.company_id
      AND public.current_user_has_unit_relationship(
        p_unit_id,
        ARRAY['owner']::TEXT[]
      )
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the verified sponsor owner or an organization administrator may create this invitation';
  END IF;

  v_email_digest := extensions.digest(convert_to(v_normalized_email, 'UTF8'), 'sha256');
  v_masked_email := public.mask_tenant_invitation_email(v_normalized_email);

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'tenant-invite:create:' || v_unit.company_id::TEXT || ':' || v_idempotency_key,
      0
    )
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'tenant-invite:email:' || v_unit.company_id::TEXT || ':'
        || p_unit_id::TEXT || ':' || encode(v_email_digest, 'hex'),
      0
    )
  );

  SELECT *
    INTO v_existing
    FROM public.tenant_access_invitations i
   WHERE i.company_id = v_unit.company_id
     AND i.create_idempotency_key = v_idempotency_key;

  IF FOUND THEN
    IF v_existing.created_by_profile_id IS DISTINCT FROM v_actor_id
       OR v_existing.unit_id IS DISTINCT FROM p_unit_id
       OR v_existing.sponsor_owner_profile_id IS DISTINCT FROM p_sponsor_owner_profile_id
       OR v_existing.tenant_name IS DISTINCT FROM btrim(p_tenant_name)
       OR v_existing.email_digest IS DISTINCT FROM v_email_digest
       OR v_existing.allowed_scopes IS DISTINCT FROM v_scopes
       OR v_existing.access_valid_from IS DISTINCT FROM p_access_valid_from
       OR v_existing.access_valid_until IS DISTINCT FROM p_access_valid_until
       OR v_existing.redeem_from IS DISTINCT FROM p_redeem_from
       OR v_existing.redeem_until IS DISTINCT FROM p_redeem_until
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency key was already used with a different invitation request';
    END IF;

    RETURN public.tenant_access_invitation_safe_payload(v_existing)
      || jsonb_build_object(
        'inviteCode', NULL,
        'codeAvailable', FALSE,
        'replayed', TRUE
      );
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
     WHERE i.company_id = v_unit.company_id
       AND i.unit_id = p_unit_id
       AND i.email_digest = v_email_digest
       AND i.status = 'pending'
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'A pending invitation already exists for this tenant and unit';
  END IF;

  -- 256 bits of entropy. The plaintext exists only in this function result.
  v_invite_code := encode(extensions.gen_random_bytes(32), 'hex');
  v_code_digest := extensions.digest(convert_to(v_invite_code, 'UTF8'), 'sha256');

  PERFORM set_config('app.tenant_invitation_command', 'on', TRUE);

  INSERT INTO public.tenant_access_invitations (
    company_id,
    unit_id,
    sponsor_owner_profile_id,
    created_by_profile_id,
    tenant_name,
    email_digest,
    email_masked,
    code_digest,
    code_hint,
    allowed_scopes,
    access_valid_from,
    access_valid_until,
    redeem_from,
    redeem_until,
    status,
    workflow_version,
    create_idempotency_key,
    last_command_idempotency_key,
    last_audit_at
  ) VALUES (
    v_unit.company_id,
    p_unit_id,
    p_sponsor_owner_profile_id,
    v_actor_id,
    btrim(p_tenant_name),
    v_email_digest,
    v_masked_email,
    v_code_digest,
    right(v_invite_code, 6),
    v_scopes,
    p_access_valid_from,
    p_access_valid_until,
    p_redeem_from,
    p_redeem_until,
    'pending',
    1,
    v_idempotency_key,
    v_idempotency_key,
    clock_timestamp()
  )
  RETURNING * INTO v_invitation;

  v_safe_payload := public.tenant_access_invitation_safe_payload(v_invitation);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_invitation.company_id,
    v_actor_id,
    'tenant_invitation.created',
    'tenant_access_invitations',
    v_invitation.id,
    NULL,
    v_safe_payload || jsonb_build_object('reason', v_reason),
    'tenant-invite:create:' || v_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_invitation.company_id,
    'internal_event_bus',
    'tenant.invitation_created',
    'tenant_access_invitations',
    v_invitation.id,
    v_safe_payload,
    'queued',
    'tenant-invite:create:' || v_invitation.id::TEXT || ':1'
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_safe_payload || jsonb_build_object(
    'inviteCode', v_invite_code,
    'codeAvailable', TRUE,
    'replayed', FALSE
  );
END;
$$;

COMMENT ON FUNCTION public.create_tenant_access_invitation_command(
  UUID, UUID, TEXT, TEXT, TEXT[], DATE, DATE, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) IS
  'Creates an owner-sponsored time-boxed tenant invitation and returns its 256-bit plaintext code exactly once. No plaintext code or email is persisted.';

CREATE OR REPLACE FUNCTION public.extend_tenant_access_invitation_command(
  p_invitation_id UUID,
  p_expected_version INTEGER,
  p_access_valid_until DATE,
  p_redeem_until TIMESTAMPTZ,
  p_idempotency_key TEXT,
  p_reason TEXT
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
  v_invitation public.tenant_access_invitations%ROWTYPE;
  v_result public.tenant_access_invitations%ROWTYPE;
  v_relationship public.unit_residents%ROWTYPE;
  v_existing_action TEXT;
  v_existing_entity UUID;
  v_existing_actor UUID;
  v_new_access_valid_until DATE;
  v_new_redeem_until TIMESTAMPTZ;
  v_idempotency_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_audit_key TEXT;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF length(v_idempotency_key) < 8 OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  IF length(v_reason) < 10 OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A reason between 10 and 1000 characters is required';
  END IF;

  SELECT *
    INTO v_invitation
    FROM public.tenant_access_invitations i
   WHERE i.id = p_invitation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Invitation was not found';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_actor_company = v_invitation.company_id
    )
    OR (
      v_actor_role = 'owner'
      AND v_actor_id = v_invitation.sponsor_owner_profile_id
      AND v_actor_company = v_invitation.company_id
      AND public.current_user_has_unit_relationship(
        v_invitation.unit_id,
        ARRAY['owner']::TEXT[]
      )
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the verified sponsor owner or an organization administrator may extend this invitation';
  END IF;

  IF NOT public.profile_has_unit_relationship(
    v_invitation.sponsor_owner_profile_id,
    v_invitation.unit_id,
    ARRAY['owner']::TEXT[]
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The sponsor no longer owns the invitation unit; revoke instead';
  END IF;

  v_audit_key := 'tenant-invite:extend:' || v_idempotency_key;

  SELECT ae.action, ae.entity_id, ae.actor_profile_id
    INTO v_existing_action, v_existing_entity, v_existing_actor
    FROM public.audit_events ae
   WHERE ae.company_id = v_invitation.company_id
     AND ae.idempotency_key = v_audit_key;

  IF FOUND THEN
    IF v_existing_action IS DISTINCT FROM 'tenant_invitation.extended'
       OR v_existing_entity IS DISTINCT FROM p_invitation_id
       OR v_existing_actor IS DISTINCT FROM v_actor_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency key was already used for another invitation command';
    END IF;

    RETURN public.tenant_access_invitation_safe_payload(v_invitation)
      || jsonb_build_object('replayed', TRUE);
  END IF;

  IF v_invitation.status = 'revoked' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Revoked invitations cannot be extended';
  END IF;

  IF p_expected_version IS DISTINCT FROM v_invitation.workflow_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = format(
        'Invitation version conflict: expected %s, current %s',
        p_expected_version,
        v_invitation.workflow_version
      );
  END IF;

  v_new_access_valid_until := COALESCE(
    p_access_valid_until,
    v_invitation.access_valid_until
  );
  v_new_redeem_until := COALESCE(
    p_redeem_until,
    v_invitation.redeem_until
  );

  IF v_new_access_valid_until < v_invitation.access_valid_until
     OR v_new_access_valid_until
       > (v_invitation.access_valid_from + INTERVAL '2 years')::DATE
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Access expiry may only be extended within the two-year invitation limit';
  END IF;

  IF v_invitation.status = 'accepted'
     AND v_new_redeem_until IS DISTINCT FROM v_invitation.redeem_until
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Redemption expiry cannot change after acceptance';
  END IF;

  IF v_new_redeem_until < v_invitation.redeem_until
     OR v_new_redeem_until::DATE > v_new_access_valid_until
     OR (
       v_invitation.status = 'pending'
       AND v_new_redeem_until <= clock_timestamp()
     )
     OR (
       v_invitation.status = 'pending'
       AND v_new_redeem_until > clock_timestamp() + INTERVAL '30 days'
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Redemption expiry may only be extended up to 30 days from now and must remain inside access validity';
  END IF;

  IF v_new_access_valid_until = v_invitation.access_valid_until
     AND v_new_redeem_until = v_invitation.redeem_until
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'At least one invitation window must be extended';
  END IF;

  v_before := public.tenant_access_invitation_safe_payload(v_invitation);
  PERFORM set_config('app.tenant_invitation_command', 'on', TRUE);

  UPDATE public.tenant_access_invitations
     SET access_valid_until = v_new_access_valid_until,
         redeem_until = v_new_redeem_until,
         extended_at = clock_timestamp(),
         extended_by_profile_id = v_actor_id,
         workflow_version = workflow_version + 1,
         last_command_idempotency_key = v_idempotency_key,
         last_audit_at = clock_timestamp()
   WHERE id = p_invitation_id
     AND workflow_version = p_expected_version
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Invitation version conflict';
  END IF;

  IF v_result.status = 'accepted'
     AND v_result.relationship_managed_by_invitation
  THEN
    SELECT *
      INTO v_relationship
      FROM public.unit_residents ur
     WHERE ur.id = v_result.relationship_id
     FOR UPDATE;

    IF NOT FOUND
       OR v_relationship.company_id IS DISTINCT FROM v_result.company_id
       OR v_relationship.unit_id IS DISTINCT FROM v_result.unit_id
       OR v_relationship.resident_id IS DISTINCT FROM v_result.accepted_resident_id
       OR v_relationship.relationship IS DISTINCT FROM 'tenant'
    THEN
      RAISE EXCEPTION 'The accepted invitation relationship is missing or outside its boundary.';
    END IF;

    UPDATE public.unit_residents
       SET end_date = CASE
         WHEN end_date IS NULL THEN NULL
         ELSE greatest(end_date, v_new_access_valid_until)
       END
     WHERE id = v_relationship.id;
  END IF;

  v_after := public.tenant_access_invitation_safe_payload(v_result);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_result.company_id,
    v_actor_id,
    'tenant_invitation.extended',
    'tenant_access_invitations',
    v_result.id,
    v_before,
    v_after || jsonb_build_object('reason', v_reason),
    v_audit_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_result.company_id,
    'internal_event_bus',
    'tenant.invitation_extended',
    'tenant_access_invitations',
    v_result.id,
    v_after,
    'queued',
    'tenant-invite:extend:' || v_result.id::TEXT || ':' || v_result.workflow_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_after || jsonb_build_object('replayed', FALSE);
END;
$$;

COMMENT ON FUNCTION public.extend_tenant_access_invitation_command(
  UUID, INTEGER, DATE, TIMESTAMPTZ, TEXT, TEXT
) IS
  'Versioned/idempotent extension of a pending invitation or accepted invitation access window by its still-verified sponsor owner or organization administrator.';

CREATE OR REPLACE FUNCTION public.revoke_tenant_access_invitation_command(
  p_invitation_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT,
  p_reason TEXT
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
  v_invitation public.tenant_access_invitations%ROWTYPE;
  v_result public.tenant_access_invitations%ROWTYPE;
  v_relationship public.unit_residents%ROWTYPE;
  v_existing_action TEXT;
  v_existing_entity UUID;
  v_existing_actor UUID;
  v_idempotency_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_reason TEXT := btrim(COALESCE(p_reason, ''));
  v_audit_key TEXT;
  v_before JSONB;
  v_after JSONB;
  v_immediate_end_date DATE := CURRENT_DATE - 1;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF length(v_idempotency_key) < 8 OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  IF length(v_reason) < 10 OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'A revocation reason between 10 and 1000 characters is required';
  END IF;

  SELECT *
    INTO v_invitation
    FROM public.tenant_access_invitations i
   WHERE i.id = p_invitation_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Invitation was not found';
  END IF;

  IF NOT (
    public.is_platform_super_admin()
    OR (
      v_actor_role = 'admin'
      AND v_actor_company = v_invitation.company_id
    )
    OR (
      v_actor_role = 'owner'
      AND v_actor_id = v_invitation.sponsor_owner_profile_id
      AND v_actor_company = v_invitation.company_id
      AND public.current_user_has_unit_relationship(
        v_invitation.unit_id,
        ARRAY['owner']::TEXT[]
      )
    )
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only the verified sponsor owner or an organization administrator may revoke this invitation';
  END IF;

  v_audit_key := 'tenant-invite:revoke:' || v_idempotency_key;

  SELECT ae.action, ae.entity_id, ae.actor_profile_id
    INTO v_existing_action, v_existing_entity, v_existing_actor
    FROM public.audit_events ae
   WHERE ae.company_id = v_invitation.company_id
     AND ae.idempotency_key = v_audit_key;

  IF FOUND THEN
    IF v_existing_action IS DISTINCT FROM 'tenant_invitation.revoked'
       OR v_existing_entity IS DISTINCT FROM p_invitation_id
       OR v_existing_actor IS DISTINCT FROM v_actor_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency key was already used for another invitation command';
    END IF;

    RETURN public.tenant_access_invitation_safe_payload(v_invitation)
      || jsonb_build_object('replayed', TRUE);
  END IF;

  IF v_invitation.status = 'revoked' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation is already revoked';
  END IF;

  IF p_expected_version IS DISTINCT FROM v_invitation.workflow_version THEN
    RAISE EXCEPTION USING
      ERRCODE = '40001',
      MESSAGE = format(
        'Invitation version conflict: expected %s, current %s',
        p_expected_version,
        v_invitation.workflow_version
      );
  END IF;

  v_before := public.tenant_access_invitation_safe_payload(v_invitation);
  PERFORM set_config('app.tenant_invitation_command', 'on', TRUE);

  UPDATE public.tenant_access_invitations
     SET status = 'revoked',
         revoked_at = clock_timestamp(),
         revoked_by_profile_id = v_actor_id,
         revoked_reason = v_reason,
         workflow_version = workflow_version + 1,
         last_command_idempotency_key = v_idempotency_key,
         last_audit_at = clock_timestamp()
   WHERE id = p_invitation_id
     AND workflow_version = p_expected_version
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Invitation version conflict';
  END IF;

  IF v_invitation.status = 'accepted'
     AND v_invitation.relationship_managed_by_invitation
  THEN
    SELECT *
      INTO v_relationship
      FROM public.unit_residents ur
     WHERE ur.id = v_invitation.relationship_id
     FOR UPDATE;

    IF FOUND THEN
      IF v_relationship.company_id IS DISTINCT FROM v_invitation.company_id
         OR v_relationship.unit_id IS DISTINCT FROM v_invitation.unit_id
         OR v_relationship.resident_id IS DISTINCT FROM v_invitation.accepted_resident_id
         OR v_relationship.relationship IS DISTINCT FROM 'tenant'
      THEN
        RAISE EXCEPTION 'The accepted invitation relationship is outside its boundary.';
      END IF;

      IF v_invitation.relationship_created_by_invitation THEN
        UPDATE public.unit_residents
           SET is_primary = FALSE,
               start_date = least(
                 COALESCE(start_date, v_immediate_end_date),
                 v_immediate_end_date
               ),
               end_date = v_immediate_end_date
         WHERE id = v_relationship.id;
      ELSE
        UPDATE public.unit_residents
           SET start_date = v_invitation.relationship_previous_start_date,
               end_date = v_invitation.relationship_previous_end_date
         WHERE id = v_relationship.id;
      END IF;
    END IF;

    IF NOT EXISTS (
      SELECT 1
        FROM public.unit_residents ur
       WHERE ur.company_id = v_invitation.company_id
         AND ur.resident_id = v_invitation.accepted_resident_id
         AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
         AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
    ) THEN
      UPDATE public.resident_profile_links
         SET status = 'suspended',
             valid_until = greatest(
               clock_timestamp(),
               valid_from + INTERVAL '1 microsecond'
             ),
             updated_at = clock_timestamp()
       WHERE company_id = v_invitation.company_id
         AND profile_id = v_invitation.accepted_profile_id
         AND resident_id = v_invitation.accepted_resident_id
         AND status = 'active';
    END IF;
  END IF;

  v_after := public.tenant_access_invitation_safe_payload(v_result);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_result.company_id,
    v_actor_id,
    'tenant_invitation.revoked',
    'tenant_access_invitations',
    v_result.id,
    v_before,
    v_after || jsonb_build_object(
      'reason', v_reason,
      'relationshipAccessRemoved',
        v_invitation.relationship_managed_by_invitation
    ),
    v_audit_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_result.company_id,
    'internal_event_bus',
    'tenant.invitation_revoked',
    'tenant_access_invitations',
    v_result.id,
    v_after || jsonb_build_object(
      'relationshipAccessRemoved',
        v_invitation.relationship_managed_by_invitation
    ),
    'queued',
    'tenant-invite:revoke:' || v_result.id::TEXT || ':' || v_result.workflow_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_after || jsonb_build_object('replayed', FALSE);
END;
$$;

COMMENT ON FUNCTION public.revoke_tenant_access_invitation_command(
  UUID, INTEGER, TEXT, TEXT
) IS
  'Versioned/idempotent revocation. Invitation-created tenant access is ended atomically; pre-existing legal relationships are restored rather than deleted.';

CREATE OR REPLACE FUNCTION public.redeem_tenant_access_invitation_command(
  p_invitation_id UUID,
  p_invite_code TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_profile public.profiles%ROWTYPE;
  v_invitation public.tenant_access_invitations%ROWTYPE;
  v_result public.tenant_access_invitations%ROWTYPE;
  v_resident public.residents%ROWTYPE;
  v_profile_link public.resident_profile_links%ROWTYPE;
  v_relationship public.unit_residents%ROWTYPE;
  v_auth_email TEXT;
  v_jwt_email TEXT;
  v_email_confirmed_at TIMESTAMPTZ;
  v_normalized_auth_email TEXT;
  v_normalized_code TEXT := lower(btrim(COALESCE(p_invite_code, '')));
  v_code_digest BYTEA;
  v_idempotency_key TEXT := btrim(COALESCE(p_idempotency_key, ''));
  v_audit_key TEXT;
  v_existing_action TEXT;
  v_existing_entity UUID;
  v_existing_actor UUID;
  v_matching_resident_count INTEGER;
  v_linked_resident_id UUID;
  v_linked_profile_id UUID;
  v_profile_link_managed BOOLEAN := FALSE;
  v_profile_was_unassigned BOOLEAN := FALSE;
  v_relationship_created BOOLEAN := FALSE;
  v_relationship_managed BOOLEAN := FALSE;
  v_relationship_previous_start DATE;
  v_relationship_previous_end DATE;
  v_is_primary BOOLEAN := FALSE;
  v_before JSONB;
  v_after JSONB;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication is required';
  END IF;

  IF length(v_idempotency_key) < 8 OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'An idempotency key between 8 and 200 characters is required';
  END IF;

  IF v_normalized_code !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation code is invalid or unavailable';
  END IF;

  v_code_digest := extensions.digest(
    convert_to(v_normalized_code, 'UTF8'),
    'sha256'
  );

  -- Match ID and digest together so callers cannot distinguish an unknown ID
  -- from a wrong code. The plaintext code is never selected or persisted.
  SELECT *
    INTO v_invitation
    FROM public.tenant_access_invitations i
   WHERE i.id = p_invitation_id
     AND i.code_digest = v_code_digest
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation code is invalid or unavailable';
  END IF;

  SELECT *
    INTO v_profile
    FROM public.profiles p
   WHERE p.id = v_actor_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authenticated tenant profile was not found';
  END IF;

  SELECT au.email, au.email_confirmed_at
    INTO v_auth_email, v_email_confirmed_at
    FROM auth.users au
   WHERE au.id = v_actor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authenticated tenant identity was not found';
  END IF;

  v_jwt_email := (SELECT auth.jwt())->>'email';
  v_normalized_auth_email := public.normalize_tenant_invitation_email(v_auth_email);

  IF v_profile.role IS DISTINCT FROM 'tenant' THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Only tenant profiles may redeem tenant invitations';
  END IF;

  IF v_email_confirmed_at IS NULL
     OR v_normalized_auth_email = ''
     OR v_normalized_auth_email
       IS DISTINCT FROM public.normalize_tenant_invitation_email(v_jwt_email)
     OR v_invitation.email_digest IS DISTINCT FROM extensions.digest(
       convert_to(v_normalized_auth_email, 'UTF8'),
       'sha256'
     )
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The confirmed signed-in email does not match this invitation';
  END IF;

  IF v_profile.company_id IS NOT NULL
     AND v_profile.company_id IS DISTINCT FROM v_invitation.company_id
  THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Tenant profile already belongs to another organization';
  END IF;

  v_audit_key := 'tenant-invite:redeem:' || v_idempotency_key;

  SELECT ae.action, ae.entity_id, ae.actor_profile_id
    INTO v_existing_action, v_existing_entity, v_existing_actor
    FROM public.audit_events ae
   WHERE ae.company_id = v_invitation.company_id
     AND ae.idempotency_key = v_audit_key;

  IF FOUND THEN
    IF v_existing_action IS DISTINCT FROM 'tenant_invitation.redeemed'
       OR v_existing_entity IS DISTINCT FROM p_invitation_id
       OR v_existing_actor IS DISTINCT FROM v_actor_id
    THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Idempotency key was already used for another invitation command';
    END IF;

    RETURN public.tenant_access_invitation_safe_payload(v_invitation)
      || jsonb_build_object('replayed', TRUE, 'alreadyAccepted', TRUE);
  END IF;

  IF v_invitation.status = 'accepted' THEN
    IF v_invitation.accepted_profile_id = v_actor_id THEN
      RETURN public.tenant_access_invitation_safe_payload(v_invitation)
        || jsonb_build_object('replayed', TRUE, 'alreadyAccepted', TRUE);
    END IF;

    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation code is invalid or unavailable';
  END IF;

  IF v_invitation.status <> 'pending'
     OR v_invitation.redeem_from > clock_timestamp()
     OR v_invitation.redeem_until < clock_timestamp()
     OR v_invitation.access_valid_from > CURRENT_DATE
     OR v_invitation.access_valid_until < CURRENT_DATE
  THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invitation code is invalid or unavailable';
  END IF;

  IF NOT public.profile_has_unit_relationship(
    v_invitation.sponsor_owner_profile_id,
    v_invitation.unit_id,
    ARRAY['owner']::TEXT[]
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Invitation sponsor no longer owns the selected unit';
  END IF;

  v_before := public.tenant_access_invitation_safe_payload(v_invitation);

  -- Serialize resident reuse by company/email even though invitations for
  -- different units may be redeemed concurrently.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'tenant-invite:resident:' || v_invitation.company_id::TEXT || ':'
        || encode(v_invitation.email_digest, 'hex'),
      0
    )
  );

  IF v_profile.company_id IS NULL THEN
    v_profile_was_unassigned := TRUE;
    PERFORM set_config(
      'app.tenant_invitation_redeem_id',
      v_invitation.id::TEXT,
      TRUE
    );
    PERFORM set_config(
      'app.tenant_invitation_code_digest',
      encode(v_code_digest, 'hex'),
      TRUE
    );

    UPDATE public.profiles
       SET company_id = v_invitation.company_id,
           updated_at = clock_timestamp()
     WHERE id = v_actor_id
       AND company_id IS NULL
       AND role = 'tenant'
    RETURNING * INTO v_profile;

    IF v_profile.id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Tenant organization binding changed concurrently';
    END IF;
  END IF;

  UPDATE public.profiles
     SET full_name = COALESCE(NULLIF(btrim(full_name), ''), v_invitation.tenant_name),
         updated_at = clock_timestamp()
   WHERE id = v_actor_id
  RETURNING * INTO v_profile;

  SELECT count(*)
    INTO v_matching_resident_count
    FROM public.residents r
   WHERE r.company_id = v_invitation.company_id
     AND public.normalize_tenant_invitation_email(r.email) = v_normalized_auth_email;

  IF v_matching_resident_count > 1 THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Multiple resident records match the confirmed email; administrator resolution is required';
  END IF;

  IF v_matching_resident_count = 1 THEN
    SELECT *
      INTO v_resident
      FROM public.residents r
     WHERE r.company_id = v_invitation.company_id
       AND public.normalize_tenant_invitation_email(r.email) = v_normalized_auth_email
     ORDER BY r.id
     LIMIT 1
     FOR UPDATE;

    IF v_resident.status IN ('blocked', 'archived') THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'The matching resident record is not eligible for invitation access';
    END IF;

    IF v_resident.status = 'inactive' THEN
      UPDATE public.residents
         SET status = 'active',
             updated_at = clock_timestamp()
       WHERE id = v_resident.id
      RETURNING * INTO v_resident;
    END IF;
  ELSE
    INSERT INTO public.residents (
      company_id,
      full_name,
      email,
      preferred_language,
      preferred_channel,
      identity_status,
      status
    ) VALUES (
      v_invitation.company_id,
      v_invitation.tenant_name,
      v_normalized_auth_email,
      COALESCE(NULLIF(btrim(v_profile.language), ''), 'tr'),
      'portal',
      'unverified',
      'active'
    )
    RETURNING * INTO v_resident;
  END IF;

  SELECT l.resident_id
    INTO v_linked_resident_id
    FROM public.resident_profile_links l
   WHERE l.company_id = v_invitation.company_id
     AND l.profile_id = v_actor_id
   FOR UPDATE;

  IF FOUND AND v_linked_resident_id IS DISTINCT FROM v_resident.id THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Tenant profile is already linked to another resident identity';
  END IF;

  SELECT l.profile_id
    INTO v_linked_profile_id
    FROM public.resident_profile_links l
   WHERE l.company_id = v_invitation.company_id
     AND l.resident_id = v_resident.id
   FOR UPDATE;

  IF FOUND AND v_linked_profile_id IS DISTINCT FROM v_actor_id THEN
    RAISE EXCEPTION USING ERRCODE = '23505', MESSAGE = 'Resident identity is already linked to another profile';
  END IF;

  SELECT *
    INTO v_profile_link
    FROM public.resident_profile_links l
   WHERE l.company_id = v_invitation.company_id
     AND l.profile_id = v_actor_id;

  v_profile_link_managed := NOT FOUND OR v_profile_link.status <> 'active';

  INSERT INTO public.resident_profile_links (
    company_id,
    profile_id,
    resident_id,
    status,
    verification_method,
    verified_by,
    verified_at,
    valid_from,
    valid_until
  ) VALUES (
    v_invitation.company_id,
    v_actor_id,
    v_resident.id,
    'active',
    'verified_email',
    v_actor_id,
    clock_timestamp(),
    CURRENT_TIMESTAMP,
    NULL
  )
  ON CONFLICT (company_id, profile_id)
  DO UPDATE SET
    resident_id = EXCLUDED.resident_id,
    status = 'active',
    verification_method = 'verified_email',
    verified_by = EXCLUDED.verified_by,
    verified_at = EXCLUDED.verified_at,
    valid_from = least(
      public.resident_profile_links.valid_from,
      EXCLUDED.valid_from
    ),
    valid_until = NULL,
    updated_at = clock_timestamp()
  RETURNING * INTO v_profile_link;

  SELECT *
    INTO v_relationship
    FROM public.unit_residents ur
   WHERE ur.company_id = v_invitation.company_id
     AND ur.unit_id = v_invitation.unit_id
     AND ur.resident_id = v_resident.id
     AND ur.relationship = 'tenant'
   FOR UPDATE;

  IF NOT FOUND THEN
    SELECT NOT EXISTS (
      SELECT 1
        FROM public.unit_residents ur
       WHERE ur.company_id = v_invitation.company_id
         AND ur.resident_id = v_resident.id
         AND ur.relationship = 'tenant'
         AND ur.is_primary
         AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
         AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
    ) INTO v_is_primary;

    INSERT INTO public.unit_residents (
      company_id,
      unit_id,
      resident_id,
      relationship,
      is_primary,
      start_date,
      end_date
    ) VALUES (
      v_invitation.company_id,
      v_invitation.unit_id,
      v_resident.id,
      'tenant',
      v_is_primary,
      v_invitation.access_valid_from,
      v_invitation.access_valid_until
    )
    RETURNING * INTO v_relationship;

    v_relationship_created := TRUE;
    v_relationship_managed := TRUE;
  ELSE
    v_relationship_previous_start := v_relationship.start_date;
    v_relationship_previous_end := v_relationship.end_date;

    IF NOT (
      (v_relationship.start_date IS NULL
        OR v_relationship.start_date <= v_invitation.access_valid_from)
      AND (v_relationship.end_date IS NULL
        OR v_relationship.end_date >= v_invitation.access_valid_until)
    ) THEN
      UPDATE public.unit_residents
         SET start_date = CASE
               WHEN start_date IS NULL THEN NULL
               ELSE least(start_date, v_invitation.access_valid_from)
             END,
             end_date = CASE
               WHEN end_date IS NULL THEN NULL
               ELSE greatest(end_date, v_invitation.access_valid_until)
             END
       WHERE id = v_relationship.id
      RETURNING * INTO v_relationship;

      v_relationship_managed := TRUE;
    END IF;
  END IF;

  IF NOT (
    (v_relationship.start_date IS NULL OR v_relationship.start_date <= CURRENT_DATE)
    AND (v_relationship.end_date IS NULL OR v_relationship.end_date >= CURRENT_DATE)
  ) THEN
    RAISE EXCEPTION 'Invitation redemption did not produce an active tenant relationship.';
  END IF;

  PERFORM set_config('app.tenant_invitation_command', 'on', TRUE);

  UPDATE public.tenant_access_invitations
     SET status = 'accepted',
         accepted_profile_id = v_actor_id,
         accepted_resident_id = v_resident.id,
         relationship_id = v_relationship.id,
         relationship_created_by_invitation = v_relationship_created,
         relationship_managed_by_invitation = v_relationship_managed,
         relationship_previous_start_date = v_relationship_previous_start,
         relationship_previous_end_date = v_relationship_previous_end,
         profile_link_managed_by_invitation = v_profile_link_managed,
         profile_company_assigned_by_invitation = v_profile_was_unassigned,
         workflow_version = workflow_version + 1,
         last_command_idempotency_key = v_idempotency_key,
         accepted_at = clock_timestamp(),
         last_audit_at = clock_timestamp()
   WHERE id = v_invitation.id
     AND status = 'pending'
     AND workflow_version = v_invitation.workflow_version
  RETURNING * INTO v_result;

  IF v_result.id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '40001', MESSAGE = 'Invitation changed concurrently';
  END IF;

  v_after := public.tenant_access_invitation_safe_payload(v_result);

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    v_result.company_id,
    v_actor_id,
    'tenant_invitation.redeemed',
    'tenant_access_invitations',
    v_result.id,
    v_before,
    v_after || jsonb_build_object(
      'profileCompanyAssigned', v_profile_was_unassigned,
      'residentCreated', v_matching_resident_count = 0,
      'profileLinkManaged', v_profile_link_managed,
      'relationshipCreated', v_relationship_created,
      'relationshipManaged', v_relationship_managed
    ),
    v_audit_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    v_result.company_id,
    'internal_event_bus',
    'tenant.invitation_redeemed',
    'tenant_access_invitations',
    v_result.id,
    v_after || jsonb_build_object(
      'profileCompanyAssigned', v_profile_was_unassigned,
      'relationshipCreated', v_relationship_created,
      'relationshipManaged', v_relationship_managed
    ),
    'queued',
    'tenant-invite:redeem:' || v_result.id::TEXT || ':' || v_result.workflow_version::TEXT
  )
  ON CONFLICT (company_id, integration_key, deduplication_key)
    WHERE deduplication_key IS NOT NULL
  DO NOTHING;

  RETURN v_after || jsonb_build_object(
    'replayed', FALSE,
    'alreadyAccepted', FALSE
  );
END;
$$;

COMMENT ON FUNCTION public.redeem_tenant_access_invitation_command(
  UUID, TEXT, TEXT
) IS
  'Atomically redeems a pending code for the matching confirmed JWT/auth email, binds only a NULL tenant company, and creates/reuses verified resident and tenant-unit relationships.';

REVOKE ALL ON TABLE public.tenant_access_invitations
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.tenant_access_invitations
  FROM PUBLIC, anon, authenticated;

-- Column-level projection deliberately excludes email_digest, code_digest,
-- command keys, internal relationship-restoration evidence and revoke reason.
GRANT SELECT (
  id,
  company_id,
  unit_id,
  sponsor_owner_profile_id,
  created_by_profile_id,
  tenant_name,
  email_masked,
  code_hint,
  allowed_scopes,
  access_valid_from,
  access_valid_until,
  redeem_from,
  redeem_until,
  status,
  accepted_profile_id,
  accepted_resident_id,
  workflow_version,
  accepted_at,
  extended_at,
  revoked_at,
  last_audit_at,
  created_at,
  updated_at
) ON public.tenant_access_invitations TO authenticated;

REVOKE ALL ON FUNCTION public.enforce_tenant_access_invitation_integrity()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_tenant_access_invitation_command(
  UUID, UUID, TEXT, TEXT, TEXT[], DATE, DATE, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_tenant_access_invitation_command(
  UUID, UUID, TEXT, TEXT, TEXT[], DATE, DATE, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.extend_tenant_access_invitation_command(
  UUID, INTEGER, DATE, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_tenant_access_invitation_command(
  UUID, INTEGER, DATE, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.revoke_tenant_access_invitation_command(
  UUID, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_tenant_access_invitation_command(
  UUID, INTEGER, TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.redeem_tenant_access_invitation_command(
  UUID, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_tenant_access_invitation_command(
  UUID, TEXT, TEXT
) TO authenticated;

-- ---------------------------------------------------------------------------
-- Invitation capabilities are enforced at the real module boundaries.
--
-- A legacy/admin-provisioned tenant relationship has no accepted invitation
-- provenance and retains its existing access. A relationship actively managed
-- by an accepted invitation is deny-by-default and receives only the explicit,
-- still-valid scopes on that invitation. This prevents the resident/unit link
-- created during redemption from accidentally becoming an all-module grant.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.profile_has_tenant_module_access(
  p_profile_id UUID,
  p_unit_id UUID,
  p_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_scope TEXT := lower(btrim(COALESCE(p_scope, '')));
  v_has_active_invitation_provenance BOOLEAN;
BEGIN
  IF v_scope NOT IN (
    'tickets', 'calendar', 'documents', 'communications'
  ) THEN
    RETURN FALSE;
  END IF;

  IF NOT public.profile_has_unit_relationship(
    p_profile_id,
    p_unit_id,
    ARRAY['tenant']::TEXT[]
  ) THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
     WHERE i.accepted_profile_id = p_profile_id
       AND i.unit_id = p_unit_id
       AND i.status = 'accepted'
       AND i.relationship_managed_by_invitation
  ) INTO v_has_active_invitation_provenance;

  -- No active invitation-managed provenance means this is a legacy or
  -- administrator-provisioned relationship and keeps its prior module access.
  IF NOT v_has_active_invitation_provenance THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.tenant_access_invitations i
      JOIN public.unit_residents ur
        ON ur.id = i.relationship_id
       AND ur.company_id = i.company_id
       AND ur.unit_id = i.unit_id
       AND ur.resident_id = i.accepted_resident_id
       AND ur.relationship = 'tenant'
     WHERE i.accepted_profile_id = p_profile_id
       AND i.unit_id = p_unit_id
       AND i.status = 'accepted'
       AND i.relationship_managed_by_invitation
       AND v_scope = ANY (i.allowed_scopes)
       AND i.access_valid_from <= CURRENT_DATE
       AND i.access_valid_until >= CURRENT_DATE
       AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
       AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
       AND public.profile_has_unit_relationship(
         i.sponsor_owner_profile_id,
         i.unit_id,
         ARRAY['owner']::TEXT[]
       )
  );
END;
$$;

COMMENT ON FUNCTION public.profile_has_tenant_module_access(UUID, UUID, TEXT) IS
  'Returns legacy tenant access unchanged, but requires an active accepted invitation scope whenever the tenant relationship has invitation-managed provenance.';

CREATE OR REPLACE FUNCTION public.current_user_has_tenant_module_access(
  p_unit_id UUID,
  p_scope TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.profile_has_tenant_module_access(
    (SELECT auth.uid()),
    p_unit_id,
    p_scope
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_has_related_module_access(
  p_scope TEXT,
  p_entity_table TEXT,
  p_entity_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entity_table TEXT := lower(btrim(COALESCE(p_entity_table, '')));
BEGIN
  IF p_entity_id IS NULL THEN
    RETURN FALSE;
  END IF;

  CASE v_entity_table
    WHEN 'units' THEN
      RETURN public.current_user_has_tenant_module_access(
        p_entity_id,
        p_scope
      );

    WHEN 'service_tickets' THEN
      RETURN EXISTS (
        SELECT 1
          FROM public.service_tickets t
         WHERE t.id = p_entity_id
           AND t.unit_id IS NOT NULL
           AND public.current_user_has_tenant_module_access(
             t.unit_id,
             p_scope
           )
           AND (
             t.created_by = (SELECT auth.uid())
             OR (
               t.resident_id IS NOT NULL
               AND public.current_user_is_linked_resident(t.resident_id)
             )
           )
      );

    WHEN 'reservations' THEN
      RETURN EXISTS (
        SELECT 1
          FROM public.reservations r
         WHERE r.id = p_entity_id
           AND public.current_user_has_tenant_module_access(
             r.unit_id,
             p_scope
           )
           AND (
             r.created_by = (SELECT auth.uid())
             OR (
               r.resident_id IS NOT NULL
               AND public.current_user_is_linked_resident(r.resident_id)
             )
           )
      );

    WHEN 'documents' THEN
      RETURN EXISTS (
        SELECT 1
          FROM public.documents d
         WHERE d.id = p_entity_id
           AND d.unit_id IS NOT NULL
           AND public.current_user_has_tenant_module_access(
             d.unit_id,
             p_scope
           )
           AND (
             d.resident_id IS NULL
             OR public.current_user_is_linked_resident(d.resident_id)
           )
      );

    WHEN 'message_threads' THEN
      RETURN EXISTS (
        SELECT 1
          FROM public.message_threads mt
         WHERE mt.id = p_entity_id
           AND mt.unit_id IS NOT NULL
           AND public.current_user_has_tenant_module_access(
             mt.unit_id,
             p_scope
           )
      );

    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

-- Keep the original, deeply validated ticket implementations as private
-- delegates. Public compatibility wrappers enforce capability scope before an
-- idempotent replay can return and before any mutation path is entered.
ALTER FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) RENAME TO create_service_ticket_command_without_invitation_scope;

REVOKE ALL ON FUNCTION public.create_service_ticket_command_without_invitation_scope(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_service_ticket_command(
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
BEGIN
  IF public.current_user_profile_role() = 'tenant'
     AND (
       p_unit_id IS NULL
       OR NOT public.current_user_has_tenant_module_access(
         p_unit_id,
         'tickets'
       )
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'This tenant access does not include service tickets';
  END IF;

  RETURN public.create_service_ticket_command_without_invitation_scope(
    p_idempotency_key,
    p_site_id,
    p_unit_id,
    p_title,
    p_description,
    p_category,
    p_priority,
    p_resident_id,
    p_ticket_no,
    p_sla_due_at,
    p_emergency_policy_code,
    p_request_fingerprint
  );
END;
$$;

ALTER FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) RENAME TO execute_service_ticket_workflow_command_without_invitation_scope;

REVOKE ALL ON FUNCTION public.execute_service_ticket_workflow_command_without_invitation_scope(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.execute_service_ticket_workflow_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_command TEXT,
  p_idempotency_key TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  IF public.current_user_profile_role() = 'tenant' THEN
    SELECT t.unit_id
      INTO v_unit_id
      FROM public.service_tickets t
     WHERE t.id = p_ticket_id;

    IF v_unit_id IS NULL
       OR NOT public.current_user_has_tenant_module_access(
         v_unit_id,
         'tickets'
       )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'This tenant access does not include service tickets';
    END IF;
  END IF;

  RETURN public.execute_service_ticket_workflow_command_without_invitation_scope(
    p_ticket_id,
    p_expected_version,
    p_command,
    p_idempotency_key,
    p_reason,
    p_metadata
  );
END;
$$;

ALTER FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) RENAME TO update_service_ticket_details_command_without_invitation_scope;

REVOKE ALL ON FUNCTION public.update_service_ticket_details_command_without_invitation_scope(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_service_ticket_details_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_clear_description BOOLEAN DEFAULT FALSE,
  p_category TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS public.service_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  IF public.current_user_profile_role() = 'tenant' THEN
    SELECT t.unit_id
      INTO v_unit_id
      FROM public.service_tickets t
     WHERE t.id = p_ticket_id;

    IF v_unit_id IS NULL
       OR NOT public.current_user_has_tenant_module_access(
         v_unit_id,
         'tickets'
       )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'This tenant access does not include service tickets';
    END IF;
  END IF;

  RETURN public.update_service_ticket_details_command_without_invitation_scope(
    p_ticket_id,
    p_expected_version,
    p_idempotency_key,
    p_title,
    p_description,
    p_clear_description,
    p_category,
    p_priority,
    p_reason,
    p_metadata
  );
END;
$$;

ALTER FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) RENAME TO append_service_ticket_event_command_without_invitation_scope;

REVOKE ALL ON FUNCTION public.append_service_ticket_event_command_without_invitation_scope(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.append_service_ticket_event_command(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_event_type TEXT,
  p_body TEXT,
  p_visibility TEXT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_unit_id UUID;
BEGIN
  IF public.current_user_profile_role() = 'tenant' THEN
    SELECT t.unit_id
      INTO v_unit_id
      FROM public.service_tickets t
     WHERE t.id = p_ticket_id;

    IF v_unit_id IS NULL
       OR NOT public.current_user_has_tenant_module_access(
         v_unit_id,
         'tickets'
       )
    THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'This tenant access does not include service tickets';
    END IF;
  END IF;

  RETURN public.append_service_ticket_event_command_without_invitation_scope(
    p_ticket_id,
    p_expected_version,
    p_event_type,
    p_body,
    p_visibility,
    p_idempotency_key,
    p_metadata
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_service_ticket(
  p_ticket_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_ticket public.service_tickets%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_ticket
  FROM public.service_tickets t
  WHERE t.id = p_ticket_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_ticket.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_role = 'manager' THEN
    RETURN public.current_user_can_manage_site(v_ticket.site_id);
  ELSIF v_role = 'accountant' THEN
    RETURN public.current_user_has_finance_ticket_access(
      v_ticket.id, v_ticket.requires_finance_approval
    );
  ELSIF v_role = 'staff' THEN
    RETURN public.current_user_has_staff_ticket_access(
      v_ticket.id, v_ticket.assigned_to
    );
  ELSIF v_role = 'owner' THEN
    RETURN v_ticket.unit_id IS NOT NULL
      AND public.profile_has_unit_relationship(
        (SELECT auth.uid()),
        v_ticket.unit_id,
        ARRAY['owner']::TEXT[]
      );
  ELSIF v_role = 'tenant' THEN
    RETURN v_ticket.unit_id IS NOT NULL
      AND public.current_user_has_tenant_module_access(
        v_ticket.unit_id,
        'tickets'
      )
      AND (
        v_ticket.created_by = (SELECT auth.uid())
        OR (
          v_ticket.resident_id IS NOT NULL
          AND public.current_user_is_linked_resident(v_ticket.resident_id)
        )
      );
  END IF;

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS "Role and relationship scoped ticket visibility"
  ON public.service_tickets;
CREATE POLICY "Role and invitation scoped ticket visibility"
  ON public.service_tickets
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN TRUE
        WHEN 'manager' THEN public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN public.current_user_has_finance_ticket_access(
          id, requires_finance_approval
        )
        WHEN 'staff' THEN public.current_user_has_staff_ticket_access(
          id, assigned_to
        )
        WHEN 'owner' THEN unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id, ARRAY['owner']::TEXT[]
          )
        WHEN 'tenant' THEN unit_id IS NOT NULL
          AND public.current_user_has_tenant_module_access(
            unit_id, 'tickets'
          )
          AND (
            created_by = (SELECT auth.uid())
            OR (
              resident_id IS NOT NULL
              AND public.current_user_is_linked_resident(resident_id)
            )
          )
        ELSE FALSE
      END
    )
  );

CREATE OR REPLACE FUNCTION public.current_user_can_view_reservation(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_booking public.reservations%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_booking
  FROM public.reservations b
  WHERE b.id = p_reservation_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  IF v_booking.company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role = 'admin' THEN
    RETURN TRUE;
  ELSIF v_role = 'manager' THEN
    RETURN public.current_user_can_manage_site(v_booking.site_id);
  ELSIF v_role = 'staff' THEN
    RETURN public.current_user_can_view_site(v_booking.site_id);
  ELSIF v_role = 'owner' THEN
    RETURN public.profile_has_unit_relationship(
      (SELECT auth.uid()),
      v_booking.unit_id,
      ARRAY['owner']::TEXT[]
    );
  ELSIF v_role = 'tenant' THEN
    RETURN public.current_user_has_tenant_module_access(
      v_booking.unit_id,
      'calendar'
    )
    AND (
      v_booking.created_by = (SELECT auth.uid())
      OR (
        v_booking.resident_id IS NOT NULL
        AND public.current_user_is_linked_resident(v_booking.resident_id)
      )
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_tenant_calendar_module_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF public.current_user_profile_role() = 'tenant'
     AND NOT public.current_user_has_tenant_module_access(
       NEW.unit_id,
       'calendar'
     )
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'This tenant access does not include calendar and reservations';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_tenant_calendar_module_scope
  ON public.reservations;
CREATE TRIGGER enforce_tenant_calendar_module_scope
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_tenant_calendar_module_scope();

DROP POLICY IF EXISTS "Role and relationship scoped reservation visibility"
  ON public.reservations;
CREATE POLICY "Role and invitation scoped reservation visibility"
  ON public.reservations
  FOR SELECT TO authenticated
  USING (public.current_user_can_view_reservation(id));

DROP POLICY IF EXISTS "Authorized users create reservations"
  ON public.reservations;
DROP POLICY IF EXISTS "Authorized users create scoped reservations"
  ON public.reservations;

-- Reservation creation is a stateful, capacity-sensitive operation. Direct
-- authenticated INSERT would let the browser choose lifecycle, approval and
-- audit fields without an idempotent command boundary. It therefore fails
-- closed here; the canonical booking lifecycle migration later exposes only
-- validated command RPCs.

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.reservation_availability_blocks;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.reservation_availability_blocks;
DROP POLICY IF EXISTS reservation_availability_read_module_scope
  ON public.reservation_availability_blocks;
CREATE POLICY reservation_availability_read_module_scope
  ON public.reservation_availability_blocks
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          public.current_user_can_manage_site(site_id)
        WHEN 'staff' THEN
          public.current_user_can_view_site(site_id)
        WHEN 'owner' THEN
          public.current_user_has_unit_relationship(
            unit_id, ARRAY['owner']::TEXT[]
          )
        WHEN 'tenant' THEN
          public.current_user_has_tenant_module_access(
            unit_id, 'calendar'
          )
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.booking_readiness;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.booking_readiness;
DROP POLICY IF EXISTS booking_readiness_read_module_scope
  ON public.booking_readiness;
CREATE POLICY booking_readiness_read_module_scope
  ON public.booking_readiness
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          public.current_user_can_manage_site(site_id)
        WHEN 'staff' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        WHEN 'owner' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        WHEN 'tenant' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.turnover_work_items;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.turnover_work_items;
DROP POLICY IF EXISTS turnover_work_items_read_module_scope
  ON public.turnover_work_items;
CREATE POLICY turnover_work_items_read_module_scope
  ON public.turnover_work_items
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          public.current_user_can_manage_site(site_id)
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.access_handoff_requests;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.access_handoff_requests;
DROP POLICY IF EXISTS access_handoff_read_module_scope
  ON public.access_handoff_requests;
CREATE POLICY access_handoff_read_module_scope
  ON public.access_handoff_requests
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          public.current_user_can_manage_site(site_id)
        WHEN 'owner' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        WHEN 'tenant' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.deposit_settlements;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.deposit_settlements;
DROP POLICY IF EXISTS deposit_settlements_read_module_scope
  ON public.deposit_settlements;
CREATE POLICY deposit_settlements_read_module_scope
  ON public.deposit_settlements
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN TRUE
        WHEN 'owner' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        WHEN 'tenant' THEN
          reservation_id IS NOT NULL
          AND public.current_user_can_view_reservation(reservation_id)
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read"
  ON public.documents;
DROP POLICY IF EXISTS "Managers can insert company data"
  ON public.documents;
DROP POLICY IF EXISTS "Managers can update company data"
  ON public.documents;
DROP POLICY IF EXISTS documents_read_module_scope
  ON public.documents;
CREATE POLICY documents_read_module_scope
  ON public.documents
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN
          retention_class = 'finance'
        WHEN 'staff' THEN
          uploaded_by = (SELECT auth.uid())
        WHEN 'owner' THEN
          unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id,
            ARRAY['owner']::TEXT[]
          )
          AND (
            uploaded_by = (SELECT auth.uid())
            OR (
              visibility = 'unit'
              AND review_status = 'approved'
              AND status = 'active'
              AND retention_class <> 'identity'
              AND (
                resident_id IS NULL
                OR public.current_user_is_linked_resident(resident_id)
              )
            )
          )
        WHEN 'tenant' THEN
          unit_id IS NOT NULL
          AND public.current_user_has_tenant_module_access(
            unit_id,
            'documents'
          )
          AND (
            uploaded_by = (SELECT auth.uid())
            OR (
              visibility = 'unit'
              AND review_status = 'approved'
              AND status = 'active'
              AND retention_class <> 'identity'
              AND (
                resident_id IS NULL
                OR public.current_user_is_linked_resident(resident_id)
              )
            )
          )
        ELSE FALSE
      END
    )
  );

COMMENT ON POLICY documents_read_module_scope ON public.documents IS
  'Least-privilege document metadata visibility by organization role, assigned site, finance class, own upload, or exact verified unit relationship; file signing remains separately gated to approved clean objects.';

DROP POLICY IF EXISTS "Company members can read document uploads"
  ON public.document_upload_requests;
DROP POLICY IF EXISTS "Company members can request document uploads"
  ON public.document_upload_requests;
DROP POLICY IF EXISTS "Managers can manage document uploads"
  ON public.document_upload_requests;
DROP POLICY IF EXISTS document_upload_requests_read_module_scope
  ON public.document_upload_requests;
DROP POLICY IF EXISTS document_upload_requests_insert_module_scope
  ON public.document_upload_requests;
CREATE POLICY document_upload_requests_read_module_scope
  ON public.document_upload_requests
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN
          retention_class = 'finance'
        WHEN 'staff' THEN
          requested_by = (SELECT auth.uid())
        WHEN 'owner' THEN
          requested_by = (SELECT auth.uid())
          AND unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id,
            ARRAY['owner']::TEXT[]
          )
          AND (
            resident_id IS NULL
            OR public.current_user_is_linked_resident(resident_id)
          )
        WHEN 'tenant' THEN
          requested_by = (SELECT auth.uid())
          AND unit_id IS NOT NULL
          AND public.current_user_has_tenant_module_access(
            unit_id, 'documents'
          )
          AND (
            resident_id IS NULL
            OR public.current_user_is_linked_resident(resident_id)
          )
        ELSE FALSE
      END
    )
  );

COMMENT ON POLICY document_upload_requests_read_module_scope
  ON public.document_upload_requests IS
  'Authenticated users receive only least-privilege upload metadata. All request creation, path generation, scan state and review state are server-controlled; direct authenticated DML is revoked.';

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.document_packets;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.document_packets;
DROP POLICY IF EXISTS document_packets_read_module_scope
  ON public.document_packets;
CREATE POLICY document_packets_read_module_scope
  ON public.document_packets
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        WHEN 'accountant' THEN
          retention_class = 'finance'
        WHEN 'staff' THEN
          audience = 'staff'
          AND site_id IS NOT NULL
          AND public.current_user_can_view_site(site_id)
        WHEN 'owner' THEN
          audience = 'owner'
          AND related_entity_table IS NOT NULL
          AND related_entity_id IS NOT NULL
          AND CASE lower(related_entity_table)
            WHEN 'units' THEN
              public.current_user_has_unit_relationship(
                related_entity_id, ARRAY['owner']::TEXT[]
              )
            WHEN 'reservations' THEN
              public.current_user_can_view_reservation(related_entity_id)
            ELSE FALSE
          END
        WHEN 'tenant' THEN
          audience = 'tenant'
          AND related_entity_table IS NOT NULL
          AND related_entity_id IS NOT NULL
          AND public.current_user_has_related_module_access(
            'documents',
            related_entity_table,
            related_entity_id
          )
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.message_threads;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.message_threads;
DROP POLICY IF EXISTS message_threads_read_module_scope
  ON public.message_threads;
CREATE POLICY message_threads_read_module_scope
  ON public.message_threads
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        WHEN 'staff' THEN
          site_id IS NOT NULL
          AND public.current_user_can_view_site(site_id)
        WHEN 'owner' THEN
          unit_id IS NOT NULL
          AND public.current_user_has_unit_relationship(
            unit_id, ARRAY['owner']::TEXT[]
          )
        WHEN 'tenant' THEN
          (
            unit_id IS NOT NULL
            AND public.current_user_has_tenant_module_access(
              unit_id, 'communications'
            )
          )
          OR (
            unit_id IS NULL
            AND related_entity_table IS NOT NULL
            AND related_entity_id IS NOT NULL
            AND public.current_user_has_related_module_access(
              'communications',
              related_entity_table,
              related_entity_id
            )
          )
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.notification_deliveries;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.notification_deliveries;
DROP POLICY IF EXISTS notification_deliveries_read_module_scope
  ON public.notification_deliveries;
CREATE POLICY notification_deliveries_read_module_scope
  ON public.notification_deliveries
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        ELSE FALSE
      END
    )
  );

-- Notification rules/templates are internal configuration. Site managers may
-- see only rules for their assigned sites, while global rules and all legacy
-- message bodies remain organization-admin only.
DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.notification_rules;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.notification_rules;
DROP POLICY IF EXISTS notification_rules_internal_read
  ON public.notification_rules;
CREATE POLICY notification_rules_internal_read
  ON public.notification_rules
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND CASE (SELECT public.current_user_profile_role())
        WHEN 'admin' THEN
          public.current_user_is_organization_admin(company_id)
        WHEN 'manager' THEN
          site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        ELSE FALSE
      END
    )
  );

DROP POLICY IF EXISTS "Company members can read phase 10 11"
  ON public.message_templates;
DROP POLICY IF EXISTS "Managers can manage phase 10 11"
  ON public.message_templates;
DROP POLICY IF EXISTS message_templates_internal_read
  ON public.message_templates;
CREATE POLICY message_templates_internal_read
  ON public.message_templates
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) = 'admin'
      AND public.current_user_is_organization_admin(company_id)
    )
  );

CREATE OR REPLACE FUNCTION public.authorize_document_upload_context(
  p_unit_no TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_unit public.units%ROWTYPE;
  v_site_id UUID;
  v_resident_id UUID;
  v_allowed BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL OR v_company_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NULLIF(BTRIM(p_unit_no), '') IS NOT NULL THEN
    SELECT *
      INTO v_unit
      FROM public.units u
     WHERE u.company_id = v_company_id
       AND upper(u.unit_no) = upper(BTRIM(p_unit_no))
     LIMIT 1;

    IF v_unit.id IS NULL THEN
      RETURN NULL;
    END IF;
    v_site_id := v_unit.site_id;
  ELSE
    IF v_role IN ('owner', 'tenant', 'staff') THEN
      RETURN NULL;
    END IF;

    SELECT s.id
      INTO v_site_id
      FROM public.sites s
     WHERE s.company_id = v_company_id
       AND s.status <> 'archived'
       AND (
         v_role IN ('admin', 'accountant')
         OR (
           v_role = 'manager'
           AND public.current_user_can_manage_site(s.id)
         )
       )
     ORDER BY s.created_at ASC
     LIMIT 1;

    IF v_site_id IS NULL THEN
      RETURN NULL;
    END IF;
  END IF;

  v_allowed := CASE v_role
    WHEN 'admin' THEN TRUE
    WHEN 'manager' THEN public.current_user_can_manage_site(v_site_id)
    WHEN 'accountant' THEN TRUE
    WHEN 'staff' THEN
      v_unit.id IS NOT NULL
      AND EXISTS (
        SELECT 1
          FROM public.staff_members sm
          JOIN public.workforce_tasks w
            ON w.company_id = sm.company_id
           AND w.assigned_staff_member_id = sm.id
         WHERE sm.profile_id = v_actor_id
           AND sm.company_id = v_company_id
           AND sm.status IN ('active', 'training')
           AND w.unit_id = v_unit.id
           AND w.status IN ('open', 'assigned', 'in_progress')
      )
    WHEN 'owner' THEN
      v_unit.id IS NOT NULL
      AND public.current_user_has_unit_relationship(
        v_unit.id,
        ARRAY['owner']::TEXT[]
      )
    WHEN 'tenant' THEN
      v_unit.id IS NOT NULL
      AND public.current_user_has_tenant_module_access(
        v_unit.id,
        'documents'
      )
    ELSE FALSE
  END;

  IF NOT v_allowed THEN
    RETURN NULL;
  END IF;

  IF v_role IN ('owner', 'tenant') THEN
    v_resident_id := public.current_user_linked_resident_id();
    IF v_resident_id IS NULL
       OR NOT public.current_user_is_linked_resident(v_resident_id)
    THEN
      RETURN NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'companyId', v_company_id,
    'siteId', v_site_id,
    'unitId', v_unit.id,
    'unitNo', v_unit.unit_no,
    'residentId', v_resident_id
  );
END;
$$;

COMMENT ON FUNCTION public.authorize_document_upload_context(TEXT) IS
  'Returns the canonical company/site/unit/resident upload scope for the authenticated actor; owner/tenant/staff uploads require an exact authorized unit and tenant invitation scope is enforced.';

CREATE OR REPLACE FUNCTION public.current_user_can_read_document_object(
  p_bucket_id TEXT,
  p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
BEGIN
  IF p_bucket_id IS DISTINCT FROM 'cati-documents'
     OR NULLIF(BTRIM(p_object_name), '') IS NULL
  THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Organization administrators and site managers may read only objects that
  -- already have authoritative metadata inside their own organization. A
  -- role level by itself must never grant access to another company's bucket
  -- prefix. Managers are additionally restricted to an assigned site.
  IF v_role IN ('admin', 'manager') THEN
    RETURN EXISTS (
      SELECT 1
        FROM public.document_upload_requests r
       WHERE r.storage_bucket = p_bucket_id
         AND r.file_path = p_object_name
         AND r.company_id = public.current_user_company_id()
         AND r.upload_status = 'stored'
         AND r.review_status = 'approved'
         AND r.virus_scan_status = 'clean'
         AND (
           v_role = 'admin'
           OR (
             r.site_id IS NOT NULL
             AND public.current_user_can_manage_site(r.site_id)
           )
         )
    ) OR EXISTS (
      SELECT 1
        FROM public.documents d
       WHERE d.storage_bucket = p_bucket_id
         AND d.file_path = p_object_name
         AND d.company_id = public.current_user_company_id()
         AND d.status = 'active'
         AND d.review_status = 'approved'
         AND EXISTS (
           SELECT 1
             FROM public.document_upload_requests clean_upload
            WHERE clean_upload.storage_bucket = d.storage_bucket
              AND clean_upload.file_path = d.file_path
              AND clean_upload.company_id = d.company_id
              AND clean_upload.upload_status = 'stored'
              AND clean_upload.review_status = 'approved'
              AND clean_upload.virus_scan_status = 'clean'
         )
         AND (
           v_role = 'admin'
           OR (
             d.site_id IS NOT NULL
             AND public.current_user_can_manage_site(d.site_id)
           )
         )
    );
  END IF;

  IF v_role NOT IN ('owner', 'tenant') THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
      FROM public.document_upload_requests r
     WHERE r.storage_bucket = p_bucket_id
       AND r.file_path = p_object_name
       AND r.company_id = public.current_user_company_id()
       AND r.requested_by = (SELECT auth.uid())
       AND r.unit_id IS NOT NULL
       AND r.review_status = 'approved'
       AND r.upload_status = 'stored'
       AND r.virus_scan_status = 'clean'
       AND (
         (
           v_role = 'owner'
           AND public.current_user_has_unit_relationship(
             r.unit_id,
             ARRAY['owner']::TEXT[]
           )
         )
         OR (
           v_role = 'tenant'
           AND public.current_user_has_tenant_module_access(
             r.unit_id,
             'documents'
           )
         )
       )
       AND (
         r.resident_id IS NULL
         OR public.current_user_is_linked_resident(r.resident_id)
       )
  ) OR EXISTS (
    SELECT 1
     FROM public.documents d
     WHERE d.storage_bucket = p_bucket_id
       AND d.file_path = p_object_name
       AND d.company_id = public.current_user_company_id()
       AND d.unit_id IS NOT NULL
       AND d.visibility = 'unit'
       AND d.review_status = 'approved'
       AND d.status = 'active'
       AND (
         d.retention_class <> 'identity'
         OR d.uploaded_by = (SELECT auth.uid())
       )
       AND EXISTS (
         SELECT 1
           FROM public.document_upload_requests clean_upload
          WHERE clean_upload.storage_bucket = d.storage_bucket
            AND clean_upload.file_path = d.file_path
            AND clean_upload.company_id = d.company_id
            AND clean_upload.upload_status = 'stored'
            AND clean_upload.review_status = 'approved'
            AND clean_upload.virus_scan_status = 'clean'
       )
       AND (
         (
           v_role = 'owner'
           AND public.current_user_has_unit_relationship(
             d.unit_id,
             ARRAY['owner']::TEXT[]
           )
         )
         OR (
           v_role = 'tenant'
           AND public.current_user_has_tenant_module_access(
             d.unit_id,
             'documents'
           )
         )
       )
       AND (
         d.resident_id IS NULL
         OR public.current_user_is_linked_resident(d.resident_id)
       )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_upload_document_object(
  p_bucket_id TEXT,
  p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
BEGIN
  IF p_bucket_id IS DISTINCT FROM 'cati-documents'
     OR NULLIF(BTRIM(p_object_name), '') IS NULL
  THEN
    RETURN FALSE;
  END IF;

  IF public.is_platform_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Browser uploads are permitted only after an upload-request row has bound
  -- the exact object name to the current actor and organization. The app's
  -- server-side upload path uses the service role after performing the same
  -- business authorization and is not governed by this client policy.
  RETURN EXISTS (
    SELECT 1
      FROM public.document_upload_requests r
     WHERE r.storage_bucket = p_bucket_id
       AND r.file_path = p_object_name
       AND r.company_id = public.current_user_company_id()
       AND r.requested_by = (SELECT auth.uid())
       AND r.upload_status IN ('stored', 'quarantined')
       AND r.review_status = 'pending_review'
       AND (
         v_role = 'admin'
         OR (
           v_role = 'manager'
           AND r.site_id IS NOT NULL
           AND public.current_user_can_manage_site(r.site_id)
         )
         OR (
           v_role = 'owner'
           AND r.unit_id IS NOT NULL
           AND public.current_user_has_unit_relationship(
             r.unit_id,
             ARRAY['owner']::TEXT[]
           )
         )
         OR (
           v_role = 'tenant'
           AND r.unit_id IS NOT NULL
           AND public.current_user_has_tenant_module_access(
             r.unit_id,
             'documents'
           )
         )
       )
       AND (
         r.resident_id IS NULL
         OR public.current_user_is_linked_resident(r.resident_id)
       )
  );
END;
$$;

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Managers can read private cati documents"
      ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload own private cati documents"
      ON storage.objects;
    DROP POLICY IF EXISTS "Scoped users can upload own private cati documents"
      ON storage.objects;

    CREATE POLICY "Scoped users can read private cati documents"
      ON storage.objects
      FOR SELECT TO authenticated
      USING (
        bucket_id = 'cati-documents'
        AND public.current_user_can_read_document_object(bucket_id, name)
      );

    -- Browser-direct object writes are intentionally absent. The authorized
    -- application upload route validates scope and content, creates canonical
    -- metadata and writes with the narrowly held service role.
  END IF;
END;
$$;

-- The application signs document URLs with a narrowly held service key. This
-- authenticated RPC is therefore the authorization boundary: it resolves an
-- exact, approved and clean object only after applying organization, site,
-- unit and invitation scope. The service key never chooses a path supplied by
-- the browser.
CREATE OR REPLACE FUNCTION public.authorize_document_file_access(
  p_document_identifier TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_upload public.document_upload_requests%ROWTYPE;
  v_document public.documents%ROWTYPE;
  v_is_promoted_document BOOLEAN := FALSE;
  v_authorized BOOLEAN := FALSE;
BEGIN
  IF v_actor_id IS NULL
     OR NULLIF(BTRIM(p_document_identifier), '') IS NULL
     OR LENGTH(p_document_identifier) > 180
  THEN
    RETURN NULL;
  END IF;

  IF p_document_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    SELECT *
      INTO v_upload
      FROM public.document_upload_requests r
     WHERE r.id = p_document_identifier::UUID
     LIMIT 1;
  END IF;

  IF v_upload.id IS NULL THEN
    SELECT *
      INTO v_upload
      FROM public.document_upload_requests r
     WHERE r.metadata->>'externalUploadId' = p_document_identifier
     ORDER BY r.created_at DESC
     LIMIT 1;
  END IF;

  IF v_upload.id IS NULL
     AND p_document_identifier ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  THEN
    SELECT *
      INTO v_document
      FROM public.documents d
     WHERE d.id = p_document_identifier::UUID
     LIMIT 1;

    IF v_document.id IS NOT NULL
       AND v_document.status = 'active'
       AND v_document.review_status = 'approved'
    THEN
      SELECT *
        INTO v_upload
        FROM public.document_upload_requests r
       WHERE r.document_id = v_document.id
          OR (
            r.storage_bucket = v_document.storage_bucket
            AND r.file_path = v_document.file_path
          )
       ORDER BY (r.document_id = v_document.id) DESC, r.created_at DESC
       LIMIT 1;
      v_is_promoted_document := v_upload.id IS NOT NULL;
    END IF;
  END IF;

  IF v_upload.id IS NULL
     OR v_upload.storage_bucket <> 'cati-documents'
     OR v_upload.upload_status <> 'stored'
     OR v_upload.review_status <> 'approved'
     OR v_upload.virus_scan_status <> 'clean'
  THEN
    RETURN NULL;
  END IF;

  v_authorized := public.is_platform_super_admin();

  IF NOT v_authorized
     AND v_upload.company_id = v_company_id
  THEN
    v_authorized := CASE v_actor_role
      WHEN 'admin' THEN TRUE
      WHEN 'manager' THEN
        v_upload.site_id IS NOT NULL
        AND public.current_user_can_manage_site(v_upload.site_id)
      WHEN 'accountant' THEN
        v_upload.retention_class = 'finance'
      WHEN 'staff' THEN
        v_upload.requested_by = v_actor_id
      WHEN 'owner' THEN
        v_upload.unit_id IS NOT NULL
        AND public.current_user_has_unit_relationship(
          v_upload.unit_id,
          ARRAY['owner']::TEXT[]
        )
        AND (
          v_upload.requested_by = v_actor_id
          OR (
            v_is_promoted_document
            AND v_document.visibility = 'unit'
            AND v_document.retention_class <> 'identity'
            AND (
              v_document.resident_id IS NULL
              OR public.current_user_is_linked_resident(v_document.resident_id)
            )
          )
        )
      WHEN 'tenant' THEN
        v_upload.unit_id IS NOT NULL
        AND public.current_user_has_tenant_module_access(
          v_upload.unit_id,
          'documents'
        )
        AND (
          v_upload.requested_by = v_actor_id
          OR (
            v_is_promoted_document
            AND v_document.visibility = 'unit'
            AND v_document.retention_class <> 'identity'
            AND (
              v_document.resident_id IS NULL
              OR public.current_user_is_linked_resident(v_document.resident_id)
            )
          )
        )
      ELSE FALSE
    END;
  END IF;

  IF NOT v_authorized THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'id', v_upload.id,
    'title', COALESCE(v_document.title, v_upload.title),
    'safeFilename', v_upload.safe_filename,
    'storageBucket', v_upload.storage_bucket,
    'storagePath', v_upload.file_path,
    'mimeType', v_upload.mime_type,
    'status', 'available',
    'source', CASE
      WHEN v_is_promoted_document THEN 'document'
      ELSE 'upload_request'
    END
  );
END;
$$;

COMMENT ON FUNCTION public.authorize_document_file_access(TEXT) IS
  'Resolves one approved, malware-clean private document object for the authenticated actor after organization/site/unit/module authorization; intended as the only precursor to service-role URL signing.';

CREATE INDEX IF NOT EXISTS documents_unit_resident_visibility_idx
  ON public.documents(unit_id, resident_id, visibility, review_status, status)
  WHERE unit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS document_packets_related_entity_idx
  ON public.document_packets(company_id, related_entity_table, related_entity_id)
  WHERE related_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS message_threads_related_entity_idx
  ON public.message_threads(company_id, related_entity_table, related_entity_id)
  WHERE related_entity_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notification_deliveries_related_entity_idx
  ON public.notification_deliveries(
    company_id, related_entity_table, related_entity_id
  )
  WHERE related_entity_id IS NOT NULL;

REVOKE ALL ON FUNCTION public.profile_has_tenant_module_access(
  UUID, UUID, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_has_tenant_module_access(
  UUID, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_tenant_module_access(
  UUID, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_has_related_module_access(
  TEXT, TEXT, UUID
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_related_module_access(
  TEXT, TEXT, UUID
) TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_read_document_object(
  TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_read_document_object(
  TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_upload_document_object(
  TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.authorize_document_upload_context(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_document_upload_context(TEXT)
  TO authenticated;
REVOKE ALL ON FUNCTION public.authorize_document_file_access(TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_document_file_access(TEXT)
  TO authenticated;
REVOKE ALL ON FUNCTION public.enforce_tenant_calendar_module_scope()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_service_ticket_command(
  TEXT, UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT
) TO authenticated;
REVOKE ALL ON FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_service_ticket_workflow_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
REVOKE ALL ON FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_service_ticket_details_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, BOOLEAN, TEXT, TEXT, TEXT, JSONB
) TO authenticated;
REVOKE ALL ON FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.append_service_ticket_event_command(
  UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, JSONB
) TO authenticated;

-- Retire every inherited Phase-10/11 browser write policy and privilege. These
-- tables contain provider evidence, financial detail and message content that
-- must be projected by role-aware APIs rather than exposed with SELECT *.
REVOKE ALL ON TABLE
  public.reservation_availability_blocks,
  public.booking_readiness,
  public.turnover_work_items,
  public.access_handoff_requests,
  public.deposit_settlements,
  public.documents,
  public.document_packets,
  public.message_threads,
  public.notification_deliveries,
  public.notification_rules,
  public.message_templates
FROM anon, authenticated;
REVOKE ALL ON TABLE public.document_upload_requests
  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.reservations
  FROM anon, authenticated;

GRANT SELECT (
  id,
  site_id,
  unit_id,
  block_type,
  source_reservation_id,
  starts_at,
  ends_at,
  status,
  created_at,
  updated_at
) ON TABLE public.reservation_availability_blocks TO authenticated;

GRANT SELECT (
  id,
  site_id,
  reservation_id,
  readiness_score,
  risk_level,
  blocker,
  next_action,
  updated_at
) ON TABLE public.booking_readiness TO authenticated;

GRANT SELECT (
  id,
  site_id,
  reservation_id,
  title,
  status,
  priority,
  due_at,
  progress,
  evidence_required,
  created_at,
  updated_at
) ON TABLE public.turnover_work_items TO authenticated;

GRANT SELECT (
  id,
  site_id,
  reservation_id,
  unit_id,
  credential_type,
  action,
  status,
  valid_from,
  valid_until,
  approval_required,
  approved_at,
  created_at,
  updated_at
) ON TABLE public.access_handoff_requests TO authenticated;

GRANT SELECT (
  id,
  site_id,
  reservation_id,
  deposit_amount_cents,
  proposed_deduction_cents,
  refund_amount_cents,
  status,
  evidence_count,
  final_statement_document_id,
  approved_at,
  created_at,
  updated_at
) ON TABLE public.deposit_settlements TO authenticated;

GRANT SELECT (
  id,
  site_id,
  unit_id,
  title,
  category,
  status,
  expires_at,
  mime_type,
  size_bytes,
  review_status,
  visibility,
  retention_class,
  created_at,
  updated_at
) ON TABLE public.documents TO authenticated;

GRANT SELECT (
  id,
  site_id,
  unit_id,
  document_id,
  title,
  category,
  mime_type,
  size_bytes,
  upload_status,
  review_status,
  virus_scan_status,
  retention_class,
  reviewed_at,
  created_at,
  updated_at
) ON TABLE public.document_upload_requests TO authenticated;

GRANT SELECT (
  id,
  site_id,
  title,
  audience,
  related_entity_table,
  related_entity_id,
  status,
  required_documents,
  completed_documents,
  signature_status,
  retention_class,
  next_action,
  created_at,
  updated_at
) ON TABLE public.document_packets TO authenticated;

GRANT SELECT (
  id,
  site_id,
  unit_id,
  related_entity_table,
  related_entity_id,
  channel,
  audience,
  subject,
  status,
  priority,
  language,
  created_at,
  updated_at
) ON TABLE public.message_threads TO authenticated;

GRANT SELECT (
  id,
  site_id,
  notification_rule_id,
  channel,
  status,
  related_entity_table,
  related_entity_id,
  attempts,
  last_attempt_at,
  next_retry_at,
  created_at,
  updated_at
) ON TABLE public.notification_deliveries TO authenticated;

GRANT SELECT (
  id,
  site_id,
  trigger_key,
  channel_mix,
  status,
  language_mode,
  approval_required,
  created_at,
  updated_at
) ON TABLE public.notification_rules TO authenticated;

GRANT SELECT (
  id,
  title,
  use_case,
  channel,
  approval_status,
  languages,
  variables,
  preview,
  created_at,
  updated_at
) ON TABLE public.message_templates TO authenticated;

-- Reservation rows remain readable through exact relationship RLS, but every
-- mutation is command-only. Migration 32 installs the canonical lifecycle
-- commands and repeats this revoke as a defense-in-depth release gate.
GRANT SELECT ON TABLE public.reservations TO authenticated;
