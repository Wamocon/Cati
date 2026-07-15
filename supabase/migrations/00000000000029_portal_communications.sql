-- STRICTLY CONFIDENTIAL - 1Cati persistent portal communications
-- Replaces the Phase-11 demo summaries with participant-secured, auditable
-- threads, messages, templates, delivery truth, and a bounded retry outbox.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Normalized persistence. External delivery is never called successful
--    until a provider acknowledgement carrying its own message id is stored.
-- ---------------------------------------------------------------------------

CREATE TABLE public.portal_communication_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  scope_kind TEXT NOT NULL DEFAULT 'operational'
    CHECK (scope_kind IN ('operational', 'finance', 'resident', 'announcement')),
  related_entity_table TEXT,
  related_entity_id UUID,
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 240),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en', 'de', 'ru')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  assigned_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  last_message_preview TEXT,
  last_message_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (site_id IS NOT NULL OR unit_id IS NULL)
);

CREATE TABLE public.portal_communication_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_label TEXT NOT NULL CHECK (char_length(display_label) BETWEEN 1 AND 160),
  role_at_add TEXT NOT NULL CHECK (role_at_add IN ('admin', 'manager', 'accountant', 'staff', 'owner', 'tenant')),
  participant_kind TEXT NOT NULL DEFAULT 'member'
    CHECK (participant_kind IN ('member', 'assignee', 'recipient')),
  added_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  removed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, profile_id),
  CHECK ((active AND removed_at IS NULL) OR (NOT active AND removed_at IS NOT NULL))
);

CREATE TABLE public.portal_communication_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  sender_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_label TEXT NOT NULL CHECK (char_length(sender_label) BETWEEN 1 AND 160),
  sender_role TEXT NOT NULL CHECK (sender_role IN ('admin', 'manager', 'accountant', 'staff', 'owner', 'tenant', 'system')),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en', 'de', 'ru')),
  channel TEXT NOT NULL DEFAULT 'portal'
    CHECK (channel IN ('portal', 'email', 'sms', 'whatsapp', 'push')),
  lifecycle_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (lifecycle_state IN ('draft', 'scheduled', 'queued', 'portal_delivered', 'provider_acknowledged', 'read', 'failed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  portal_delivered_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key),
  CHECK (channel <> 'portal' OR lifecycle_state NOT IN ('provider_acknowledged')),
  CHECK (lifecycle_state <> 'portal_delivered' OR portal_delivered_at IS NOT NULL)
);

CREATE TABLE public.portal_communication_message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.portal_communication_messages(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  portal_delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, profile_id),
  CHECK (read_at IS NULL OR portal_delivered_at IS NOT NULL)
);

-- File bytes and storage coordinates stay exclusively in the existing
-- document domain. Communication access never grants attachment bytes.
CREATE TABLE public.portal_communication_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.portal_communication_messages(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  attached_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, document_id)
);

CREATE TABLE public.portal_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  purpose TEXT NOT NULL DEFAULT 'operational'
    CHECK (purpose IN ('operational', 'finance', 'resident', 'announcement')),
  channel TEXT NOT NULL DEFAULT 'portal'
    CHECK (channel IN ('portal', 'email', 'sms', 'whatsapp', 'push')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, site_id, name, channel)
);

CREATE TABLE public.portal_communication_template_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.portal_communication_templates(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('tr', 'en', 'de', 'ru')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 240),
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 10000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, locale)
);

CREATE TABLE public.portal_communication_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.portal_communication_templates(id) ON DELETE RESTRICT,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  purpose TEXT NOT NULL DEFAULT 'announcement'
    CHECK (purpose IN ('operational', 'finance', 'resident', 'announcement')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'queued', 'cancelled', 'completed')),
  target_snapshot JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.portal_communication_audience_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  audience_id UUID NOT NULL REFERENCES public.portal_communication_audiences(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  recipient_label TEXT NOT NULL CHECK (char_length(recipient_label) BETWEEN 1 AND 200),
  locale TEXT NOT NULL DEFAULT 'tr' CHECK (locale IN ('tr', 'en', 'de', 'ru')),
  channel TEXT NOT NULL DEFAULT 'portal'
    CHECK (channel IN ('portal', 'email', 'sms', 'whatsapp', 'push')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE NULLS NOT DISTINCT (audience_id, profile_id, unit_id, channel)
);

CREATE TABLE public.portal_communication_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push')),
  purpose TEXT NOT NULL CHECK (purpose IN ('operational', 'finance', 'resident', 'announcement')),
  status TEXT NOT NULL CHECK (status IN ('granted', 'withdrawn')),
  source TEXT NOT NULL CHECK (char_length(source) BETWEEN 1 AND 120),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, profile_id, channel, purpose)
);

CREATE TABLE public.portal_communication_suppressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE CASCADE,
  channel TEXT CHECK (channel IN ('portal', 'email', 'sms', 'whatsapp', 'push')),
  purpose TEXT CHECK (purpose IN ('operational', 'finance', 'resident', 'announcement')),
  reason TEXT NOT NULL CHECK (char_length(reason) BETWEEN 3 AND 500),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (profile_id IS NOT NULL OR unit_id IS NOT NULL)
);

CREATE TABLE public.portal_communication_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID NOT NULL REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.portal_communication_messages(id) ON DELETE CASCADE,
  recipient_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  recipient_label TEXT NOT NULL CHECK (char_length(recipient_label) BETWEEN 1 AND 200),
  channel TEXT NOT NULL CHECK (channel IN ('portal', 'email', 'sms', 'whatsapp', 'push')),
  delivery_state TEXT NOT NULL DEFAULT 'queued'
    CHECK (delivery_state IN ('queued', 'portal_delivered', 'provider_acknowledged', 'read', 'failed', 'cancelled')),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries INTEGER NOT NULL DEFAULT 5 CHECK (max_retries BETWEEN 0 AND 10),
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  provider_key TEXT,
  provider_message_id TEXT,
  provider_acknowledged_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, recipient_profile_id, channel),
  CHECK (
    delivery_state <> 'provider_acknowledged'
    OR (
      channel <> 'portal'
      AND provider_message_id IS NOT NULL
      AND provider_acknowledged_at IS NOT NULL
    )
  )
);

CREATE TABLE public.portal_communication_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.portal_communication_deliveries(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'push')),
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'retry_wait', 'succeeded', 'dead_letter', 'cancelled')),
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  dedupe_key TEXT NOT NULL CHECK (char_length(dedupe_key) BETWEEN 8 AND 240),
  retry_count INTEGER NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
  max_retries INTEGER NOT NULL DEFAULT 5 CHECK (max_retries BETWEEN 0 AND 10),
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_at TIMESTAMPTZ,
  locked_by TEXT,
  claim_token UUID,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, dedupe_key),
  CHECK (
    (
      status = 'processing'
      AND locked_at IS NOT NULL
      AND NULLIF(BTRIM(locked_by), '') IS NOT NULL
      AND claim_token IS NOT NULL
    )
    OR (
      status <> 'processing'
      AND locked_at IS NULL
      AND locked_by IS NULL
      AND claim_token IS NULL
    )
  )
);

CREATE TABLE public.portal_communication_provider_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.portal_communication_deliveries(id) ON DELETE CASCADE,
  provider_key TEXT NOT NULL,
  provider_event_id TEXT NOT NULL,
  provider_message_id TEXT,
  event_kind TEXT NOT NULL CHECK (event_kind IN ('acknowledged', 'delivered', 'read', 'failed')),
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider_key, provider_event_id),
  CHECK (event_kind = 'failed' OR provider_message_id IS NOT NULL)
);

CREATE TABLE public.portal_communication_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.portal_communication_threads(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.portal_communication_messages(id) ON DELETE CASCADE,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (char_length(event_type) BETWEEN 3 AND 120),
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  event_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

CREATE INDEX portal_communication_threads_scope_idx
  ON public.portal_communication_threads (company_id, site_id, unit_id, scope_kind, last_message_at DESC);
CREATE INDEX portal_communication_participants_profile_idx
  ON public.portal_communication_participants (profile_id, active, thread_id);
CREATE INDEX portal_communication_messages_thread_idx
  ON public.portal_communication_messages (thread_id, created_at, id);
CREATE INDEX portal_communication_receipts_profile_idx
  ON public.portal_communication_message_receipts (profile_id, read_at, message_id);
CREATE INDEX portal_communication_deliveries_retry_idx
  ON public.portal_communication_deliveries (delivery_state, next_retry_at) WHERE delivery_state = 'failed';
CREATE INDEX portal_communication_outbox_claim_idx
  ON public.portal_communication_outbox (status, next_retry_at, created_at)
  WHERE status IN ('queued', 'retry_wait');
CREATE UNIQUE INDEX portal_communication_provider_message_identity_unique
  ON public.portal_communication_deliveries (provider_key, provider_message_id)
  WHERE provider_key IS NOT NULL AND provider_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. Participant-, assignment-, relationship-, and module-scoped reads.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_can_access_portal_communication_thread(
  p_thread_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.portal_communication_threads t
      WHERE t.id = p_thread_id
        AND t.company_id = public.current_user_company_id()
        AND (
          public.current_user_profile_role() = 'admin'
          OR (
            public.current_user_profile_role() = 'manager'
            AND t.site_id IS NOT NULL
            AND public.current_user_can_manage_site(t.site_id)
          )
          OR (
            public.current_user_profile_role() = 'accountant'
            AND t.scope_kind = 'finance'
          )
          OR (
            public.current_user_profile_role() = 'staff'
            AND t.scope_kind = 'operational'
            AND t.assigned_profile_id = (SELECT auth.uid())
            AND t.site_id IS NOT NULL
            AND EXISTS (
              SELECT 1
              FROM public.profile_site_assignments psa
              WHERE psa.company_id = t.company_id
                AND psa.site_id = t.site_id
                AND psa.profile_id = (SELECT auth.uid())
                AND psa.status = 'active'
                AND psa.valid_from <= NOW()
                AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
            )
            AND EXISTS (
              SELECT 1
              FROM public.portal_communication_participants p
              WHERE p.thread_id = t.id
                AND p.profile_id = (SELECT auth.uid())
                AND p.active
            )
          )
          OR (
            public.current_user_profile_role() = 'owner'
            AND t.unit_id IS NOT NULL
            AND public.current_user_has_unit_relationship(t.unit_id, ARRAY['owner']::TEXT[])
            AND EXISTS (
              SELECT 1
              FROM public.portal_communication_participants p
              WHERE p.thread_id = t.id
                AND p.profile_id = (SELECT auth.uid())
                AND p.active
            )
          )
          OR (
            public.current_user_profile_role() = 'tenant'
            AND t.unit_id IS NOT NULL
            AND public.current_user_has_tenant_module_access(t.unit_id, 'communications')
            AND EXISTS (
              SELECT 1
              FROM public.portal_communication_participants p
              WHERE p.thread_id = t.id
                AND p.profile_id = (SELECT auth.uid())
                AND p.active
            )
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_portal_communication_template(
  p_template_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1
      FROM public.portal_communication_templates t
      WHERE t.id = p_template_id
        AND t.company_id = public.current_user_company_id()
        AND (
          public.current_user_profile_role() = 'admin'
          OR (
            public.current_user_profile_role() = 'manager'
            AND t.site_id IS NOT NULL
            AND public.current_user_can_manage_site(t.site_id)
          )
          OR (
            public.current_user_profile_role() = 'accountant'
            AND t.purpose = 'finance'
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.portal_communication_profile_is_active_recipient(
  p_thread_id UUID,
  p_profile_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.portal_communication_threads t
    JOIN public.profiles p ON p.id = p_profile_id AND p.company_id = t.company_id
    JOIN public.portal_communication_participants participant
      ON participant.thread_id = t.id
     AND participant.profile_id = p.id
     AND participant.active
    WHERE t.id = p_thread_id
      AND (
        p.role = 'admin'
        OR (p.role = 'accountant' AND t.scope_kind = 'finance')
        OR (
          p.role = 'manager' AND t.site_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.profile_site_assignments psa
            WHERE psa.company_id = t.company_id AND psa.site_id = t.site_id
              AND psa.profile_id = p.id AND psa.status = 'active'
              AND psa.valid_from <= NOW()
              AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
          )
        )
        OR (
          p.role = 'staff'
          AND t.scope_kind = 'operational'
          AND t.assigned_profile_id = p.id
          AND t.site_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.profile_site_assignments psa
            WHERE psa.company_id = t.company_id AND psa.site_id = t.site_id
              AND psa.profile_id = p.id AND psa.status = 'active'
              AND psa.valid_from <= NOW()
              AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
          )
        )
        OR (
          p.role = 'owner' AND t.unit_id IS NOT NULL
          AND public.profile_has_unit_relationship(p.id, t.unit_id, ARRAY['owner']::TEXT[])
        )
        OR (
          p.role = 'tenant' AND t.unit_id IS NOT NULL
          AND public.profile_has_tenant_module_access(p.id, t.unit_id, 'communications')
        )
      )
  );
$$;

ALTER TABLE public.portal_communication_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_message_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_template_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_audience_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_provider_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_communication_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_communication_threads_read
  ON public.portal_communication_threads FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(id));

CREATE POLICY portal_communication_participants_read
  ON public.portal_communication_participants FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(thread_id));

CREATE POLICY portal_communication_messages_read
  ON public.portal_communication_messages FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(thread_id));

CREATE POLICY portal_communication_message_receipts_read
  ON public.portal_communication_message_receipts FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(thread_id));

CREATE POLICY portal_communication_attachments_read
  ON public.portal_communication_attachments FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(thread_id));

CREATE POLICY portal_communication_templates_read
  ON public.portal_communication_templates FOR SELECT TO authenticated
  USING (public.current_user_can_manage_portal_communication_template(id));

CREATE POLICY portal_communication_template_variants_read
  ON public.portal_communication_template_variants FOR SELECT TO authenticated
  USING (public.current_user_can_manage_portal_communication_template(template_id));

CREATE POLICY portal_communication_audiences_read
  ON public.portal_communication_audiences FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND (
        public.current_user_profile_role() = 'admin'
        OR (
          public.current_user_profile_role() = 'manager'
          AND site_id IS NOT NULL
          AND public.current_user_can_manage_site(site_id)
        )
        OR (public.current_user_profile_role() = 'accountant' AND purpose = 'finance')
      )
    )
  );

CREATE POLICY portal_communication_audience_members_read
  ON public.portal_communication_audience_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_communication_audiences a
      WHERE a.id = audience_id
        AND (
          public.is_platform_super_admin()
          OR (
            a.company_id = public.current_user_company_id()
            AND (
              public.current_user_profile_role() = 'admin'
              OR (public.current_user_profile_role() = 'manager' AND a.site_id IS NOT NULL AND public.current_user_can_manage_site(a.site_id))
              OR (public.current_user_profile_role() = 'accountant' AND a.purpose = 'finance')
            )
          )
        )
    )
  );

CREATE POLICY portal_communication_consents_read
  ON public.portal_communication_consents FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND (
        profile_id = (SELECT auth.uid())
        OR public.current_user_profile_role() = 'admin'
      )
    )
  );

CREATE POLICY portal_communication_suppressions_read
  ON public.portal_communication_suppressions FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND (
        public.current_user_profile_role() = 'admin'
        OR (
          public.current_user_profile_role() = 'manager'
          AND unit_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.units u
            WHERE u.id = unit_id
              AND public.current_user_can_manage_site(u.site_id)
          )
        )
      )
    )
  );

CREATE POLICY portal_communication_deliveries_read
  ON public.portal_communication_deliveries FOR SELECT TO authenticated
  USING (public.current_user_can_access_portal_communication_thread(thread_id));

-- Participant-facing state omits recipient, worker error, retry, and provider
-- identifiers. Security-invoker applies base-table RLS as defense in depth.
CREATE VIEW public.portal_communication_delivery_status
WITH (security_barrier = TRUE, security_invoker = TRUE)
AS
SELECT d.id, d.thread_id, d.message_id, d.channel, d.delivery_state,
       d.provider_acknowledged_at, d.updated_at
FROM public.portal_communication_deliveries d
WHERE public.current_user_can_access_portal_communication_thread(d.thread_id);

GRANT SELECT ON public.portal_communication_delivery_status TO authenticated;

-- Internal evidence is exposed through an explicitly role-scoped view because
-- authenticated users receive only safe column grants on the base table.
CREATE VIEW public.portal_communication_delivery_evidence
WITH (security_barrier = TRUE)
AS
SELECT d.id, d.thread_id, d.message_id, d.channel, d.delivery_state,
       d.recipient_label, d.retry_count, d.max_retries, d.next_retry_at,
       d.last_error, d.provider_acknowledged_at, d.version, d.updated_at
FROM public.portal_communication_deliveries d
JOIN public.portal_communication_threads t ON t.id = d.thread_id
WHERE
  public.is_platform_super_admin()
  OR (
    t.company_id = public.current_user_company_id()
    AND (
      public.current_user_profile_role() = 'admin'
      OR (
        public.current_user_profile_role() = 'manager'
        AND t.site_id IS NOT NULL
        AND public.current_user_can_manage_site(t.site_id)
      )
      OR (
        public.current_user_profile_role() = 'accountant'
        AND t.scope_kind = 'finance'
      )
    )
  );

GRANT SELECT ON public.portal_communication_delivery_evidence TO authenticated;

CREATE POLICY portal_communication_outbox_read
  ON public.portal_communication_outbox FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_communication_deliveries d
      JOIN public.portal_communication_threads t ON t.id = d.thread_id
      WHERE d.id = delivery_id
        AND (
          public.is_platform_super_admin()
          OR (
            t.company_id = public.current_user_company_id()
            AND (
              public.current_user_profile_role() = 'admin'
              OR (
                public.current_user_profile_role() = 'manager'
                AND t.site_id IS NOT NULL
                AND public.current_user_can_manage_site(t.site_id)
              )
              OR (
                public.current_user_profile_role() = 'accountant'
                AND t.scope_kind = 'finance'
              )
            )
          )
        )
    )
  );

CREATE POLICY portal_communication_provider_receipts_read
  ON public.portal_communication_provider_receipts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.portal_communication_deliveries d
      JOIN public.portal_communication_threads t ON t.id = d.thread_id
      WHERE d.id = delivery_id
        AND (
          public.is_platform_super_admin()
          OR (
            t.company_id = public.current_user_company_id()
            AND (
              public.current_user_profile_role() = 'admin'
              OR (
                public.current_user_profile_role() = 'manager'
                AND t.site_id IS NOT NULL
                AND public.current_user_can_manage_site(t.site_id)
              )
              OR (
                public.current_user_profile_role() = 'accountant'
                AND t.scope_kind = 'finance'
              )
            )
          )
        )
    )
  );

CREATE POLICY portal_communication_events_read
  ON public.portal_communication_events FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND (
        (
          thread_id IS NOT NULL
          AND public.current_user_can_access_portal_communication_thread(thread_id)
        )
        OR (
          thread_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM public.portal_communication_templates t
            WHERE t.company_id = portal_communication_events.company_id
              AND t.id::TEXT = portal_communication_events.event_data->>'templateId'
              AND public.current_user_can_manage_portal_communication_template(t.id)
          )
        )
      )
    )
  );

-- Authenticated clients read through RLS but may mutate only through the
-- command functions below. Service workers receive only their bounded RPCs.
GRANT SELECT ON
  public.portal_communication_threads,
  public.portal_communication_participants,
  public.portal_communication_messages,
  public.portal_communication_message_receipts,
  public.portal_communication_attachments,
  public.portal_communication_templates,
  public.portal_communication_template_variants,
  public.portal_communication_audiences,
  public.portal_communication_audience_members,
  public.portal_communication_consents,
  public.portal_communication_suppressions,
  public.portal_communication_deliveries,
  public.portal_communication_outbox,
  public.portal_communication_provider_receipts,
  public.portal_communication_events
TO authenticated;

REVOKE SELECT ON public.portal_communication_deliveries FROM authenticated;
GRANT SELECT (
  id, thread_id, message_id, channel, delivery_state,
  provider_acknowledged_at, updated_at
) ON public.portal_communication_deliveries TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON
  public.portal_communication_threads,
  public.portal_communication_participants,
  public.portal_communication_messages,
  public.portal_communication_message_receipts,
  public.portal_communication_attachments,
  public.portal_communication_templates,
  public.portal_communication_template_variants,
  public.portal_communication_audiences,
  public.portal_communication_audience_members,
  public.portal_communication_consents,
  public.portal_communication_suppressions,
  public.portal_communication_deliveries,
  public.portal_communication_outbox,
  public.portal_communication_provider_receipts,
  public.portal_communication_events
FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Explicitly retire the broad Phase-11 policies. The legacy summary tables
--    remain readable only by organization admins for migration/audit purposes.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Managers can manage phase 10 11" ON public.message_threads;
DROP POLICY IF EXISTS "Company members can read phase 10 11" ON public.message_threads;
DROP POLICY IF EXISTS message_threads_read_module_scope ON public.message_threads;
DROP POLICY IF EXISTS legacy_phase11_communications_admin_read ON public.message_threads;
CREATE POLICY legacy_phase11_communications_admin_read
  ON public.message_threads FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_profile_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can manage phase 10 11" ON public.notification_deliveries;
DROP POLICY IF EXISTS "Company members can read phase 10 11" ON public.notification_deliveries;
DROP POLICY IF EXISTS notification_deliveries_read_module_scope ON public.notification_deliveries;
DROP POLICY IF EXISTS legacy_phase11_communications_admin_read ON public.notification_deliveries;
CREATE POLICY legacy_phase11_communications_admin_read
  ON public.notification_deliveries FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_profile_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can manage phase 10 11" ON public.notification_rules;
DROP POLICY IF EXISTS "Company members can read phase 10 11" ON public.notification_rules;
DROP POLICY IF EXISTS notification_rules_internal_read ON public.notification_rules;
DROP POLICY IF EXISTS legacy_phase11_communications_admin_read ON public.notification_rules;
CREATE POLICY legacy_phase11_communications_admin_read
  ON public.notification_rules FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_profile_role() = 'admin'
    )
  );

DROP POLICY IF EXISTS "Managers can manage phase 10 11" ON public.message_templates;
DROP POLICY IF EXISTS "Company members can read phase 10 11" ON public.message_templates;
DROP POLICY IF EXISTS message_templates_internal_read ON public.message_templates;
DROP POLICY IF EXISTS legacy_phase11_communications_admin_read ON public.message_templates;
CREATE POLICY legacy_phase11_communications_admin_read
  ON public.message_templates FOR SELECT TO authenticated
  USING (
    public.is_platform_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_profile_role() = 'admin'
    )
  );

REVOKE INSERT, UPDATE, DELETE ON
  public.message_threads,
  public.notification_deliveries,
  public.notification_rules,
  public.message_templates
FROM authenticated;

-- ---------------------------------------------------------------------------
-- 4. RPC-only thread and message commands with idempotency and audit evidence.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.portal_communication_sha256(p_payload TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
STRICT
SET search_path = ''
AS $$
  SELECT encode(
    extensions.digest(convert_to(p_payload, 'UTF8'), 'sha256'),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.portal_communication_replay_result(
  p_company_id UUID,
  p_idempotency_key TEXT,
  p_command_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_event_data JSONB;
  v_thread_id UUID;
  v_event_type TEXT;
  v_template_id UUID;
BEGIN
  SELECT event_data, thread_id, event_type
  INTO v_event_data, v_thread_id, v_event_type
  FROM public.portal_communication_events
  WHERE company_id = p_company_id
    AND idempotency_key = p_idempotency_key
    AND actor_profile_id = (SELECT auth.uid());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF v_event_data->>'commandFingerprint' IS DISTINCT FROM p_command_fingerprint THEN
    RAISE EXCEPTION 'Idempotency key payload mismatch.' USING ERRCODE = '22023';
  END IF;
  IF v_thread_id IS NOT NULL THEN
    IF NOT public.current_user_can_access_portal_communication_thread(v_thread_id) THEN
      RAISE EXCEPTION 'Current communication scope no longer permits replay.' USING ERRCODE = '42501';
    END IF;
  ELSIF v_event_type IN ('template.saved', 'broadcast.created') THEN
    BEGIN
      v_template_id := NULLIF(v_event_data->>'templateId', '')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      v_template_id := NULL;
    END;
    IF v_template_id IS NULL
       OR NOT public.current_user_can_manage_portal_communication_template(v_template_id)
    THEN
      RAISE EXCEPTION 'Current template scope no longer permits replay.' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Threadless command replay is not authorized.' USING ERRCODE = '42501';
  END IF;
  RETURN v_event_data - 'commandFingerprint';
END;
$$;

CREATE OR REPLACE FUNCTION public.create_portal_communication_thread_command(
  p_site_id UUID,
  p_unit_id UUID,
  p_subject TEXT,
  p_scope_kind TEXT,
  p_priority TEXT,
  p_locale TEXT,
  p_assigned_profile_id UUID,
  p_participant_profile_ids UUID[],
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_role TEXT := public.current_user_profile_role();
  v_thread public.portal_communication_threads%ROWTYPE;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  IF v_company_id IS NULL OR (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'A real authenticated organization profile is required.' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'A valid idempotency key is required.' USING ERRCODE = '22023';
  END IF;

  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'create_thread', 'siteId', p_site_id, 'unitId', p_unit_id,
    'subject', BTRIM(p_subject), 'scopeKind', p_scope_kind, 'priority', p_priority,
    'locale', p_locale, 'assignedProfileId', p_assigned_profile_id,
    'participantProfileIds', COALESCE(p_participant_profile_ids, ARRAY[]::UUID[])
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  IF p_site_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.id = p_site_id AND s.company_id = v_company_id)
     OR (p_unit_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.units u
       WHERE u.id = p_unit_id AND u.site_id = p_site_id AND u.company_id = v_company_id
     ))
  THEN
    RAISE EXCEPTION 'Invalid site or unit scope.' USING ERRCODE = '22023';
  END IF;

  IF NOT (
    v_role = 'admin'
    OR (v_role = 'manager' AND public.current_user_can_manage_site(p_site_id))
    OR (v_role = 'accountant' AND p_scope_kind = 'finance')
  ) THEN
    RAISE EXCEPTION 'Role may not create this communication thread.' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM unnest(
      COALESCE(p_participant_profile_ids, ARRAY[]::UUID[])
      || CASE
           WHEN p_assigned_profile_id IS NULL THEN ARRAY[]::UUID[]
           ELSE ARRAY[p_assigned_profile_id]
         END
    ) recipient(profile_id)
    WHERE recipient.profile_id IS NOT NULL
      AND recipient.profile_id <> (SELECT auth.uid())
  ) THEN
    RAISE EXCEPTION 'At least one eligible recipient is required.' USING ERRCODE = '22023';
  END IF;

  IF p_assigned_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_assigned_profile_id
      AND p.company_id = v_company_id
      AND (p.role <> 'staff' OR p_scope_kind = 'operational')
      AND (
        p.role NOT IN ('manager', 'staff')
        OR EXISTS (
          SELECT 1
          FROM public.profile_site_assignments psa
          WHERE psa.company_id = v_company_id
            AND psa.site_id = p_site_id
            AND psa.profile_id = p.id
            AND psa.status = 'active'
            AND psa.valid_from <= NOW()
            AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
        )
      )
  ) THEN
    RAISE EXCEPTION 'Assignee is outside the organization or active site assignment.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(
      COALESCE(p_participant_profile_ids, ARRAY[]::UUID[])
      || ARRAY[(SELECT auth.uid())]
      || CASE
           WHEN p_assigned_profile_id IS NULL THEN ARRAY[]::UUID[]
           ELSE ARRAY[p_assigned_profile_id]
         END
    ) candidate(profile_id)
    LEFT JOIN public.profiles p
      ON p.id = candidate.profile_id
     AND p.company_id = v_company_id
    WHERE p.id IS NULL
       OR NOT (
         p.role = 'admin'
         OR (p.role = 'accountant' AND p_scope_kind = 'finance')
         OR (
           p.role = 'manager'
           AND EXISTS (
             SELECT 1 FROM public.profile_site_assignments psa
             WHERE psa.company_id = v_company_id
               AND psa.site_id = p_site_id
               AND psa.profile_id = p.id
               AND psa.status = 'active'
               AND psa.valid_from <= NOW()
               AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
           )
         )
         OR (
           p.role = 'staff'
           AND p_scope_kind = 'operational'
           AND p.id = p_assigned_profile_id
           AND EXISTS (
             SELECT 1 FROM public.profile_site_assignments psa
             WHERE psa.company_id = v_company_id
               AND psa.site_id = p_site_id
               AND psa.profile_id = p.id
               AND psa.status = 'active'
               AND psa.valid_from <= NOW()
               AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
           )
         )
         OR (
           p.role = 'owner'
           AND p_unit_id IS NOT NULL
           AND public.profile_has_unit_relationship(p.id, p_unit_id, ARRAY['owner']::TEXT[])
         )
         OR (
           p.role = 'tenant'
           AND p_unit_id IS NOT NULL
           AND public.profile_has_tenant_module_access(p.id, p_unit_id, 'communications')
         )
       )
  ) THEN
    RAISE EXCEPTION 'Every participant must have an active matching site or unit relationship.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.portal_communication_threads (
    company_id, site_id, unit_id, scope_kind, subject, priority, locale,
    created_by, assigned_profile_id
  ) VALUES (
    v_company_id, p_site_id, p_unit_id, p_scope_kind, BTRIM(p_subject),
    p_priority, p_locale, (SELECT auth.uid()), p_assigned_profile_id
  ) RETURNING * INTO v_thread;

  INSERT INTO public.portal_communication_participants (
    company_id, thread_id, profile_id, display_label, role_at_add,
    participant_kind, added_by
  )
  SELECT
    v_company_id,
    v_thread.id,
    p.id,
    COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Member'),
    p.role,
    CASE WHEN p.id = p_assigned_profile_id THEN 'assignee' ELSE 'member' END,
    (SELECT auth.uid())
  FROM public.profiles p
  WHERE p.company_id = v_company_id
    AND p.id = ANY (
      ARRAY(
        SELECT DISTINCT candidate
        FROM unnest(
          COALESCE(p_participant_profile_ids, ARRAY[]::UUID[])
          || ARRAY[(SELECT auth.uid())]
          || CASE WHEN p_assigned_profile_id IS NULL THEN ARRAY[]::UUID[] ELSE ARRAY[p_assigned_profile_id] END
        ) AS candidate
      )
    )
  ON CONFLICT (thread_id, profile_id) DO NOTHING;

  INSERT INTO public.portal_communication_events (
    company_id, thread_id, actor_profile_id, event_type, idempotency_key, event_data
  ) VALUES (
    v_company_id, v_thread.id, (SELECT auth.uid()), 'thread.created', p_idempotency_key,
    jsonb_build_object('threadId', v_thread.id, 'version', v_thread.version, 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.thread.created',
    'portal_communication_threads', v_thread.id,
    jsonb_build_object('siteId', p_site_id, 'unitId', p_unit_id, 'scopeKind', p_scope_kind)
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('threadId', v_thread.id, 'version', v_thread.version)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.post_portal_communication_message_command(
  p_thread_id UUID,
  p_body TEXT,
  p_locale TEXT,
  p_channel TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_document_ids UUID[],
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_thread public.portal_communication_threads%ROWTYPE;
  v_message public.portal_communication_messages%ROWTYPE;
  v_delivery_id UUID;
  v_sender_label TEXT;
  v_sender_role TEXT;
  v_replay JSONB;
  v_document_count INTEGER;
  v_external_allowed BOOLEAN := FALSE;
  v_recipient_count INTEGER := 0;
  v_command_fingerprint TEXT;
BEGIN
  IF v_company_id IS NULL OR (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'A real authenticated organization profile is required.' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_idempotency_key), '') IS NULL OR char_length(p_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'A valid idempotency key is required.' USING ERRCODE = '22023';
  END IF;

  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'post_message', 'threadId', p_thread_id, 'body', BTRIM(p_body),
    'locale', p_locale, 'channel', p_channel, 'scheduledFor', p_scheduled_for,
    'documentIds', COALESCE(p_document_ids, ARRAY[]::UUID[])
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  SELECT * INTO v_thread
  FROM public.portal_communication_threads
  WHERE id = p_thread_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.current_user_can_access_portal_communication_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Communication thread is unavailable.' USING ERRCODE = '42501';
  END IF;
  IF v_thread.status <> 'open' THEN
    RAISE EXCEPTION 'Only open threads accept messages.' USING ERRCODE = '55000';
  END IF;
  IF char_length(BTRIM(p_body)) NOT BETWEEN 1 AND 10000
     OR p_locale NOT IN ('tr', 'en', 'de', 'ru')
     OR p_channel NOT IN ('portal', 'email', 'sms', 'whatsapp', 'push')
  THEN
    RAISE EXCEPTION 'Invalid message content, locale, or channel.' USING ERRCODE = '22023';
  END IF;
  IF p_channel = 'portal' AND p_scheduled_for IS NOT NULL THEN
    RAISE EXCEPTION 'Scheduled portal delivery is not supported; release requires a dedicated due-message worker.' USING ERRCODE = '22023';
  END IF;
  IF (p_channel <> 'portal' OR p_scheduled_for IS NOT NULL)
     AND NOT (
       public.current_user_profile_role() = 'admin'
       OR (
         public.current_user_profile_role() = 'manager'
         AND v_thread.site_id IS NOT NULL
         AND public.current_user_can_manage_site(v_thread.site_id)
       )
       OR (
         public.current_user_profile_role() = 'accountant'
         AND v_thread.scope_kind = 'finance'
       )
     )
  THEN
    RAISE EXCEPTION 'External channels and scheduling require an authorized internal role.' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(NULLIF(BTRIM(full_name), ''), 'Member'), role
  INTO v_sender_label, v_sender_role
  FROM public.profiles
  WHERE id = (SELECT auth.uid()) AND company_id = v_company_id;

  IF COALESCE(cardinality(p_document_ids), 0) > 0 THEN
    SELECT count(*) INTO v_document_count
    FROM public.documents d
    WHERE d.id = ANY (p_document_ids)
      AND d.company_id = v_company_id
      AND (v_thread.site_id IS NULL OR d.site_id IS NULL OR d.site_id = v_thread.site_id)
      AND (v_thread.unit_id IS NULL OR d.unit_id IS NULL OR d.unit_id = v_thread.unit_id)
      AND public.current_user_can_read_document_object(d.storage_bucket, d.file_path);
    IF v_document_count <> cardinality(ARRAY(SELECT DISTINCT unnest(p_document_ids))) THEN
      RAISE EXCEPTION 'One or more attachments are unavailable.' USING ERRCODE = '42501';
    END IF;
  END IF;

  INSERT INTO public.portal_communication_messages (
    company_id, thread_id, sender_profile_id, sender_label, sender_role,
    body, locale, channel, lifecycle_state, scheduled_for,
    portal_delivered_at, idempotency_key
  ) VALUES (
    v_company_id, p_thread_id, (SELECT auth.uid()), v_sender_label, v_sender_role,
    BTRIM(p_body), p_locale, p_channel,
    CASE
      WHEN p_scheduled_for IS NOT NULL AND p_scheduled_for > NOW() THEN 'scheduled'
      WHEN p_channel = 'portal' THEN 'portal_delivered'
      ELSE 'queued'
    END,
    p_scheduled_for,
    CASE WHEN p_channel = 'portal' AND (p_scheduled_for IS NULL OR p_scheduled_for <= NOW()) THEN NOW() END,
    p_idempotency_key
  ) RETURNING * INTO v_message;

  INSERT INTO public.portal_communication_attachments (
    company_id, thread_id, message_id, document_id, attached_by
  )
  SELECT v_company_id, p_thread_id, v_message.id, document_id, (SELECT auth.uid())
  FROM unnest(COALESCE(p_document_ids, ARRAY[]::UUID[])) AS document_id
  ON CONFLICT (message_id, document_id) DO NOTHING;

  IF p_channel = 'portal' THEN
    INSERT INTO public.portal_communication_message_receipts (
      company_id, thread_id, message_id, profile_id, portal_delivered_at
    )
    SELECT v_company_id, p_thread_id, v_message.id, p.profile_id, NOW()
    FROM public.portal_communication_participants p
    WHERE p.thread_id = p_thread_id AND p.active AND p.profile_id <> (SELECT auth.uid())
    ON CONFLICT (message_id, profile_id) DO UPDATE
      SET portal_delivered_at = COALESCE(public.portal_communication_message_receipts.portal_delivered_at, EXCLUDED.portal_delivered_at),
          updated_at = NOW();
  ELSE
    SELECT count(*) INTO v_recipient_count
    FROM public.portal_communication_participants p
    WHERE p.thread_id = p_thread_id
      AND p.active
      AND p.profile_id <> (SELECT auth.uid())
      AND public.portal_communication_profile_is_active_recipient(p_thread_id, p.profile_id);
    IF v_recipient_count <> 1 THEN
      RAISE EXCEPTION 'External delivery requires exactly one active, verified recipient.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.portal_communication_deliveries (
      company_id, thread_id, message_id, recipient_profile_id, recipient_label,
      channel, delivery_state, next_retry_at
    )
    SELECT
      v_company_id, p_thread_id, v_message.id, p.profile_id, p.display_label,
      p_channel, 'queued', COALESCE(p_scheduled_for, NOW())
    FROM public.portal_communication_participants p
    WHERE p.thread_id = p_thread_id
      AND p.active
      AND p.profile_id <> (SELECT auth.uid())
      AND public.portal_communication_profile_is_active_recipient(p_thread_id, p.profile_id)
    RETURNING id INTO v_delivery_id;

    IF v_delivery_id IS NULL THEN
      RAISE EXCEPTION 'External delivery requires an active recipient.' USING ERRCODE = '22023';
    END IF;

    -- No essential-service bypass is assumed. Every external enqueue requires
    -- an effective grant and must be clear of profile/unit suppression.
    SELECT
      EXISTS (
        SELECT 1
        FROM public.portal_communication_deliveries d
        JOIN public.portal_communication_consents c
          ON c.company_id = d.company_id
         AND c.profile_id = d.recipient_profile_id
         AND c.channel = d.channel
         AND c.purpose = v_thread.scope_kind
         AND c.status = 'granted'
         AND c.effective_at <= NOW()
        WHERE d.id = v_delivery_id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.portal_communication_deliveries d
        JOIN public.portal_communication_suppressions s
          ON s.company_id = d.company_id
         AND s.active
         AND (s.expires_at IS NULL OR s.expires_at > NOW())
         AND (s.profile_id IS NULL OR s.profile_id = d.recipient_profile_id)
         AND (s.unit_id IS NULL OR s.unit_id = v_thread.unit_id)
         AND (s.channel IS NULL OR s.channel = d.channel)
         AND (s.purpose IS NULL OR s.purpose = v_thread.scope_kind)
        WHERE d.id = v_delivery_id
      )
    INTO v_external_allowed;

    IF v_external_allowed THEN
      INSERT INTO public.portal_communication_outbox (
        company_id, delivery_id, channel, payload, dedupe_key, next_retry_at
      ) VALUES (
        v_company_id, v_delivery_id, p_channel,
        jsonb_build_object('messageId', v_message.id, 'threadId', p_thread_id, 'locale', p_locale),
        'portal-communication:' || v_delivery_id::TEXT,
        COALESCE(p_scheduled_for, NOW())
      );
    ELSE
      UPDATE public.portal_communication_deliveries
      SET delivery_state = 'cancelled', next_retry_at = NULL,
          last_error = 'Consent or suppression blocked external delivery.',
          version = version + 1, updated_at = NOW()
      WHERE id = v_delivery_id;

      UPDATE public.portal_communication_messages
      SET lifecycle_state = 'cancelled', version = version + 1, updated_at = NOW()
      WHERE id = v_message.id
      RETURNING * INTO v_message;
    END IF;
  END IF;

  UPDATE public.portal_communication_threads
  SET last_message_preview = left(BTRIM(p_body), 240),
      last_message_at = NOW(),
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_thread_id;

  INSERT INTO public.portal_communication_events (
    company_id, thread_id, message_id, actor_profile_id, event_type,
    idempotency_key, event_data
  ) VALUES (
    v_company_id, p_thread_id, v_message.id, (SELECT auth.uid()),
    'message.created', p_idempotency_key,
    jsonb_build_object('messageId', v_message.id, 'threadId', p_thread_id, 'channel', p_channel, 'lifecycleState', v_message.lifecycle_state, 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.message.created',
    'portal_communication_messages', v_message.id,
    jsonb_build_object('threadId', p_thread_id, 'channel', p_channel, 'attachmentCount', COALESCE(cardinality(p_document_ids), 0))
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('messageId', v_message.id, 'threadId', p_thread_id, 'version', v_message.version)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_portal_communication_message_read_command(
  p_message_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_message public.portal_communication_messages%ROWTYPE;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object('command', 'mark_read', 'messageId', p_message_id)::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  SELECT * INTO v_message
  FROM public.portal_communication_messages
  WHERE id = p_message_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.current_user_can_access_portal_communication_thread(v_message.thread_id) THEN
    RAISE EXCEPTION 'Message is unavailable.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.portal_communication_message_receipts (
    company_id, thread_id, message_id, profile_id, portal_delivered_at, read_at
  ) VALUES (
    v_company_id, v_message.thread_id, v_message.id, (SELECT auth.uid()), NOW(), NOW()
  )
  ON CONFLICT (message_id, profile_id) DO UPDATE
    SET portal_delivered_at = COALESCE(public.portal_communication_message_receipts.portal_delivered_at, EXCLUDED.portal_delivered_at),
        read_at = COALESCE(public.portal_communication_message_receipts.read_at, EXCLUDED.read_at),
        updated_at = NOW();

  INSERT INTO public.portal_communication_events (
    company_id, thread_id, message_id, actor_profile_id, event_type,
    idempotency_key, event_data
  ) VALUES (
    v_company_id, v_message.thread_id, v_message.id, (SELECT auth.uid()),
    'message.read', p_idempotency_key,
    jsonb_build_object('messageId', v_message.id, 'threadId', v_message.thread_id, 'commandFingerprint', v_command_fingerprint)
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('messageId', v_message.id, 'readAt', NOW())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_portal_communication_delivery_command(
  p_delivery_id UUID,
  p_expected_version INTEGER,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_delivery public.portal_communication_deliveries%ROWTYPE;
  v_thread public.portal_communication_threads%ROWTYPE;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'retry_delivery', 'deliveryId', p_delivery_id, 'expectedVersion', p_expected_version
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  SELECT * INTO v_delivery
  FROM public.portal_communication_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.current_user_can_access_portal_communication_thread(v_delivery.thread_id) THEN
    RAISE EXCEPTION 'Delivery is unavailable.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_thread FROM public.portal_communication_threads WHERE id = v_delivery.thread_id;
  IF NOT (
    public.current_user_profile_role() IN ('admin', 'manager')
    OR (public.current_user_profile_role() = 'accountant' AND v_thread.scope_kind = 'finance')
  ) THEN
    RAISE EXCEPTION 'Role may not retry this delivery.' USING ERRCODE = '42501';
  END IF;
  IF v_delivery.version <> p_expected_version THEN
    RAISE EXCEPTION 'Delivery version conflict.' USING ERRCODE = '40001';
  END IF;
  IF v_delivery.delivery_state <> 'failed' THEN
    RAISE EXCEPTION 'Only failed deliveries can be retried.' USING ERRCODE = '55000';
  END IF;

  UPDATE public.portal_communication_deliveries
  SET delivery_state = 'queued',
      max_retries = LEAST(10, GREATEST(max_retries, retry_count + 1)),
      next_retry_at = NOW(),
      last_error = NULL,
      version = version + 1,
      updated_at = NOW()
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  UPDATE public.portal_communication_messages
  SET lifecycle_state = 'queued', version = version + 1, updated_at = NOW()
  WHERE id = v_delivery.message_id
    AND lifecycle_state = 'failed';

  INSERT INTO public.portal_communication_outbox (
    company_id, delivery_id, channel, payload, dedupe_key,
    retry_count, max_retries, next_retry_at
  ) VALUES (
    v_delivery.company_id, v_delivery.id, v_delivery.channel,
    jsonb_build_object('messageId', v_delivery.message_id, 'threadId', v_delivery.thread_id),
    'portal-communication:manual-retry:' || v_delivery.id::TEXT || ':' || v_delivery.version::TEXT,
    v_delivery.retry_count, v_delivery.max_retries, NOW()
  )
  ON CONFLICT (company_id, dedupe_key) DO UPDATE
    SET status = 'queued', next_retry_at = NOW(), locked_at = NULL,
        locked_by = NULL, claim_token = NULL, last_error = NULL, updated_at = NOW();

  INSERT INTO public.portal_communication_events (
    company_id, thread_id, message_id, actor_profile_id, event_type,
    idempotency_key, event_data
  ) VALUES (
    v_company_id, v_delivery.thread_id, v_delivery.message_id, (SELECT auth.uid()),
    'delivery.retry_requested', p_idempotency_key,
    jsonb_build_object('deliveryId', v_delivery.id, 'version', v_delivery.version, 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.delivery.retry_requested',
    'portal_communication_deliveries', v_delivery.id,
    jsonb_build_object('version', v_delivery.version)
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('deliveryId', v_delivery.id, 'version', v_delivery.version)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_portal_communication_delivery_command(
  p_delivery_id UUID,
  p_expected_version INTEGER,
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
  v_delivery public.portal_communication_deliveries%ROWTYPE;
  v_thread public.portal_communication_threads%ROWTYPE;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'cancel_delivery', 'deliveryId', p_delivery_id,
    'expectedVersion', p_expected_version, 'reason', BTRIM(p_reason)
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  SELECT * INTO v_delivery
  FROM public.portal_communication_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND OR NOT public.current_user_can_access_portal_communication_thread(v_delivery.thread_id) THEN
    RAISE EXCEPTION 'Delivery is unavailable.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_thread FROM public.portal_communication_threads WHERE id = v_delivery.thread_id;
  IF NOT (
    public.current_user_profile_role() IN ('admin', 'manager')
    OR (public.current_user_profile_role() = 'accountant' AND v_thread.scope_kind = 'finance')
  ) THEN
    RAISE EXCEPTION 'Role may not cancel this delivery.' USING ERRCODE = '42501';
  END IF;
  IF v_delivery.version <> p_expected_version THEN
    RAISE EXCEPTION 'Delivery version conflict.' USING ERRCODE = '40001';
  END IF;
  IF v_delivery.delivery_state IN ('provider_acknowledged', 'read', 'cancelled') THEN
    RAISE EXCEPTION 'Acknowledged, read, or cancelled delivery is final.' USING ERRCODE = '55000';
  END IF;
  IF char_length(BTRIM(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'A clear cancellation reason is required.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.portal_communication_deliveries
  SET delivery_state = 'cancelled', next_retry_at = NULL,
      last_error = BTRIM(p_reason), version = version + 1, updated_at = NOW()
  WHERE id = p_delivery_id
  RETURNING * INTO v_delivery;

  UPDATE public.portal_communication_messages
  SET lifecycle_state = 'cancelled', version = version + 1, updated_at = NOW()
  WHERE id = v_delivery.message_id
    AND lifecycle_state NOT IN ('provider_acknowledged', 'read', 'cancelled');

  UPDATE public.portal_communication_outbox
  SET status = 'cancelled', next_retry_at = NOW(), locked_at = NULL,
      locked_by = NULL, claim_token = NULL,
      last_error = BTRIM(p_reason), updated_at = NOW()
  WHERE delivery_id = p_delivery_id AND status NOT IN ('succeeded', 'cancelled');

  INSERT INTO public.portal_communication_events (
    company_id, thread_id, message_id, actor_profile_id, event_type,
    idempotency_key, event_data
  ) VALUES (
    v_company_id, v_delivery.thread_id, v_delivery.message_id, (SELECT auth.uid()),
    'delivery.cancelled', p_idempotency_key,
    jsonb_build_object('deliveryId', v_delivery.id, 'version', v_delivery.version, 'reason', BTRIM(p_reason), 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.delivery.cancelled',
    'portal_communication_deliveries', v_delivery.id,
    jsonb_build_object('version', v_delivery.version, 'reason', BTRIM(p_reason))
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('deliveryId', v_delivery.id, 'version', v_delivery.version)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.save_portal_communication_template_command(
  p_template_id UUID,
  p_site_id UUID,
  p_name TEXT,
  p_purpose TEXT,
  p_channel TEXT,
  p_status TEXT,
  p_expected_version INTEGER,
  p_variants JSONB,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_template public.portal_communication_templates%ROWTYPE;
  v_variant_count INTEGER;
  v_required_count INTEGER;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'save_template', 'templateId', p_template_id, 'siteId', p_site_id,
    'name', BTRIM(p_name), 'purpose', p_purpose, 'channel', p_channel,
    'status', p_status, 'expectedVersion', p_expected_version, 'variants', p_variants
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  IF v_company_id IS NULL
     OR p_site_id IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.sites s WHERE s.id = p_site_id AND s.company_id = v_company_id)
     OR NOT (
       public.current_user_profile_role() = 'admin'
       OR (public.current_user_profile_role() = 'manager' AND public.current_user_can_manage_site(p_site_id))
       OR (public.current_user_profile_role() = 'accountant' AND p_purpose = 'finance')
     )
  THEN
    RAISE EXCEPTION 'Template scope is unavailable.' USING ERRCODE = '42501';
  END IF;
  IF char_length(BTRIM(p_name)) NOT BETWEEN 1 AND 160
     OR p_purpose NOT IN ('operational', 'finance', 'resident', 'announcement')
     OR p_channel NOT IN ('portal', 'email', 'sms', 'whatsapp', 'push')
     OR p_status NOT IN ('draft', 'active', 'archived')
     OR jsonb_typeof(p_variants) <> 'array'
  THEN
    RAISE EXCEPTION 'Invalid template contract.' USING ERRCODE = '22023';
  END IF;

  SELECT count(DISTINCT item->>'locale'),
         count(DISTINCT item->>'locale') FILTER (WHERE item->>'locale' IN ('tr', 'en', 'de', 'ru'))
  INTO v_variant_count, v_required_count
  FROM jsonb_array_elements(p_variants) item
  WHERE NULLIF(BTRIM(item->>'subject'), '') IS NOT NULL
    AND NULLIF(BTRIM(item->>'body'), '') IS NOT NULL;

  IF v_variant_count = 0 OR (p_status = 'active' AND (v_variant_count <> 4 OR v_required_count <> 4)) THEN
    RAISE EXCEPTION 'Active templates require complete TR, EN, DE, and RU variants.' USING ERRCODE = '22023';
  END IF;

  IF p_template_id IS NULL THEN
    IF p_expected_version <> 0 THEN
      RAISE EXCEPTION 'New template version must be zero.' USING ERRCODE = '40001';
    END IF;
    INSERT INTO public.portal_communication_templates (
      company_id, site_id, name, purpose, channel, status, created_by
    ) VALUES (
      v_company_id, p_site_id, BTRIM(p_name), p_purpose, p_channel, p_status, (SELECT auth.uid())
    ) RETURNING * INTO v_template;
  ELSE
    SELECT * INTO v_template
    FROM public.portal_communication_templates
    WHERE id = p_template_id
    FOR UPDATE;
    IF NOT FOUND OR NOT public.current_user_can_manage_portal_communication_template(p_template_id) THEN
      RAISE EXCEPTION 'Template is unavailable.' USING ERRCODE = '42501';
    END IF;
    IF v_template.version <> p_expected_version THEN
      RAISE EXCEPTION 'Template version conflict.' USING ERRCODE = '40001';
    END IF;
    UPDATE public.portal_communication_templates
    SET site_id = p_site_id, name = BTRIM(p_name), purpose = p_purpose,
        channel = p_channel, status = p_status, version = version + 1, updated_at = NOW()
    WHERE id = p_template_id
    RETURNING * INTO v_template;
    DELETE FROM public.portal_communication_template_variants WHERE template_id = p_template_id;
  END IF;

  INSERT INTO public.portal_communication_template_variants (
    company_id, template_id, locale, subject, body
  )
  SELECT
    v_company_id, v_template.id, item->>'locale', BTRIM(item->>'subject'), BTRIM(item->>'body')
  FROM jsonb_array_elements(p_variants) item;

  INSERT INTO public.portal_communication_events (
    company_id, actor_profile_id, event_type, idempotency_key, event_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'template.saved', p_idempotency_key,
    jsonb_build_object('templateId', v_template.id, 'version', v_template.version, 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.template.saved',
    'portal_communication_templates', v_template.id,
    jsonb_build_object('status', v_template.status, 'version', v_template.version, 'variantCount', v_variant_count)
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('templateId', v_template.id, 'version', v_template.version)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_portal_communication_broadcast_command(
  p_template_id UUID,
  p_name TEXT,
  p_members JSONB,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_template public.portal_communication_templates%ROWTYPE;
  v_audience public.portal_communication_audiences%ROWTYPE;
  v_member_count INTEGER;
  v_replay JSONB;
  v_command_fingerprint TEXT;
BEGIN
  v_command_fingerprint := public.portal_communication_sha256(jsonb_build_object(
    'command', 'create_broadcast', 'templateId', p_template_id,
    'name', BTRIM(p_name), 'members', p_members
  )::TEXT);
  v_replay := public.portal_communication_replay_result(
    v_company_id, p_idempotency_key, v_command_fingerprint
  );
  IF v_replay IS NOT NULL THEN
    RETURN jsonb_build_object('replayed', TRUE, 'result', v_replay);
  END IF;

  SELECT * INTO v_template
  FROM public.portal_communication_templates
  WHERE id = p_template_id
  FOR UPDATE;
  IF NOT FOUND OR NOT public.current_user_can_manage_portal_communication_template(p_template_id) OR v_template.status <> 'active' THEN
    RAISE EXCEPTION 'An active authorized template is required.' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_members) <> 'array' THEN
    RAISE EXCEPTION 'Audience members must be an array.' USING ERRCODE = '22023';
  END IF;
  v_member_count := jsonb_array_length(p_members);
  IF v_member_count NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Broadcast audience must contain 1 to 500 recipients.' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_members) item
    WHERE jsonb_typeof(item) <> 'object'
       OR NULLIF(BTRIM(item->>'profileId'), '') IS NULL
       OR (item->>'profileId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       OR (
         NULLIF(BTRIM(item->>'unitId'), '') IS NOT NULL
         AND (item->>'unitId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       )
       OR char_length(BTRIM(COALESCE(item->>'recipientLabel', ''))) NOT BETWEEN 1 AND 200
       OR COALESCE(NULLIF(item->>'locale', ''), 'tr') NOT IN ('tr', 'en', 'de', 'ru')
       OR COALESCE(NULLIF(item->>'channel', ''), v_template.channel) NOT IN ('portal', 'email', 'sms', 'whatsapp', 'push')
  ) THEN
    RAISE EXCEPTION 'Every broadcast member requires bounded, typed recipient fields.' USING ERRCODE = '22023';
  END IF;

  IF v_template.site_id IS NULL OR EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_members) item
    LEFT JOIN public.profiles p
      ON p.id = (item->>'profileId')::UUID
     AND p.company_id = v_company_id
    LEFT JOIN public.units u
      ON u.id = NULLIF(BTRIM(item->>'unitId'), '')::UUID
    WHERE p.id IS NULL
       OR (
         NULLIF(BTRIM(item->>'unitId'), '') IS NOT NULL
         AND (
           u.id IS NULL
           OR u.company_id IS DISTINCT FROM v_company_id
           OR u.site_id IS DISTINCT FROM v_template.site_id
         )
       )
       OR NOT (
         p.role = 'admin'
         OR (p.role = 'accountant' AND v_template.purpose = 'finance')
         OR (
           p.role = 'manager'
           AND EXISTS (
             SELECT 1
             FROM public.profile_site_assignments psa
             WHERE psa.company_id = v_company_id
               AND psa.site_id = v_template.site_id
               AND psa.profile_id = p.id
               AND psa.status = 'active'
               AND psa.valid_from <= NOW()
               AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
           )
         )
         OR (
           p.role = 'staff'
           AND v_template.purpose = 'operational'
           AND EXISTS (
             SELECT 1
             FROM public.profile_site_assignments psa
             WHERE psa.company_id = v_company_id
               AND psa.site_id = v_template.site_id
               AND psa.profile_id = p.id
               AND psa.status = 'active'
               AND psa.valid_from <= NOW()
               AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
           )
         )
         OR (
           p.role = 'owner'
           AND u.id IS NOT NULL
           AND public.profile_has_unit_relationship(p.id, u.id, ARRAY['owner']::TEXT[])
         )
         OR (
           p.role = 'tenant'
           AND u.id IS NOT NULL
           AND public.profile_has_tenant_module_access(p.id, u.id, 'communications')
         )
       )
  ) THEN
    RAISE EXCEPTION 'Every broadcast member must match the template company, site, and current relationship.' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_members) item
    WHERE (
      COALESCE(NULLIF(item->>'channel', ''), v_template.channel) <> 'portal'
      AND NOT EXISTS (
        SELECT 1
        FROM public.portal_communication_consents c
        WHERE c.company_id = v_company_id
          AND c.profile_id = (item->>'profileId')::UUID
          AND c.channel = COALESCE(NULLIF(item->>'channel', ''), v_template.channel)
          AND c.purpose = v_template.purpose
          AND c.status = 'granted'
          AND c.effective_at <= NOW()
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.portal_communication_suppressions s
      WHERE s.company_id = v_company_id
        AND s.active
        AND (s.expires_at IS NULL OR s.expires_at > NOW())
        AND (s.profile_id IS NULL OR s.profile_id = (item->>'profileId')::UUID)
        AND (
          s.unit_id IS NULL
          OR s.unit_id = NULLIF(BTRIM(item->>'unitId'), '')::UUID
        )
        AND (
          s.channel IS NULL
          OR s.channel = COALESCE(NULLIF(item->>'channel', ''), v_template.channel)
        )
        AND (s.purpose IS NULL OR s.purpose = v_template.purpose)
    )
  ) THEN
    RAISE EXCEPTION 'Consent or suppression blocked a broadcast recipient.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.portal_communication_audiences (
    company_id, site_id, template_id, name, purpose, status,
    target_snapshot, created_by
  ) VALUES (
    v_company_id, v_template.site_id, v_template.id, BTRIM(p_name),
    v_template.purpose, 'queued', p_members, (SELECT auth.uid())
  ) RETURNING * INTO v_audience;

  INSERT INTO public.portal_communication_audience_members (
    company_id, audience_id, profile_id, unit_id, recipient_label, locale, channel
  )
  SELECT
    v_company_id,
    v_audience.id,
    NULLIF(item->>'profileId', '')::UUID,
    NULLIF(item->>'unitId', '')::UUID,
    BTRIM(item->>'recipientLabel'),
    COALESCE(NULLIF(item->>'locale', ''), 'tr'),
    COALESCE(NULLIF(item->>'channel', ''), v_template.channel)
  FROM jsonb_array_elements(p_members) item
  WHERE NULLIF(BTRIM(item->>'recipientLabel'), '') IS NOT NULL;

  IF (SELECT count(*) FROM public.portal_communication_audience_members WHERE audience_id = v_audience.id) <> v_member_count THEN
    RAISE EXCEPTION 'Each audience member requires a valid recipient label.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.portal_communication_events (
    company_id, actor_profile_id, event_type, idempotency_key, event_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'broadcast.created', p_idempotency_key,
    jsonb_build_object('audienceId', v_audience.id, 'templateId', v_template.id, 'memberCount', v_member_count, 'commandFingerprint', v_command_fingerprint)
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, (SELECT auth.uid()), 'portal_communication.broadcast.created',
    'portal_communication_audiences', v_audience.id,
    jsonb_build_object('templateId', v_template.id, 'memberCount', v_member_count)
  );

  RETURN jsonb_build_object(
    'replayed', FALSE,
    'result', jsonb_build_object('audienceId', v_audience.id, 'memberCount', v_member_count, 'version', v_audience.version)
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Bounded service worker and monotonic provider receipt contracts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.claim_portal_communication_outbox(
  p_worker_id TEXT,
  p_limit INTEGER DEFAULT 25
)
RETURNS SETOF public.portal_communication_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_expired public.portal_communication_outbox%ROWTYPE;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_worker_id), '') IS NULL
     OR char_length(BTRIM(p_worker_id)) > 200
     OR p_limit NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Invalid worker claim.' USING ERRCODE = '22023';
  END IF;

  -- Expired five-minute processing leases consume a bounded attempt before
  -- returning to retry or dead-letter; a crashed worker cannot strand a row.
  FOR v_expired IN
    UPDATE public.portal_communication_outbox
    SET retry_count = retry_count + 1,
        status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead_letter' ELSE 'retry_wait' END,
        next_retry_at = CASE
          WHEN retry_count + 1 >= max_retries THEN NOW()
          ELSE NOW() + INTERVAL '60 seconds'
        END,
        locked_at = NULL,
        locked_by = NULL,
        claim_token = NULL,
        last_error = 'Worker processing lease expired.',
        updated_at = NOW()
    WHERE status = 'processing'
      AND locked_at < NOW() - INTERVAL '5 minutes'
    RETURNING *
  LOOP
    UPDATE public.portal_communication_deliveries
    SET delivery_state = 'failed',
        retry_count = v_expired.retry_count,
        next_retry_at = CASE
          WHEN v_expired.status = 'retry_wait' THEN v_expired.next_retry_at
        END,
        last_error = v_expired.last_error,
        version = version + 1,
        updated_at = NOW()
    WHERE id = v_expired.delivery_id
      AND delivery_state NOT IN ('provider_acknowledged', 'read', 'cancelled');

    IF v_expired.status = 'dead_letter' THEN
      UPDATE public.portal_communication_messages
      SET lifecycle_state = 'failed', version = version + 1, updated_at = NOW()
      WHERE id = (
        SELECT d.message_id
        FROM public.portal_communication_deliveries d
        WHERE d.id = v_expired.delivery_id
      )
        AND lifecycle_state NOT IN ('provider_acknowledged', 'read', 'cancelled');
    END IF;
  END LOOP;

  RETURN QUERY
  WITH candidates AS (
    SELECT o.id
    FROM public.portal_communication_outbox o
    WHERE o.status IN ('queued', 'retry_wait')
      AND o.next_retry_at <= NOW()
    ORDER BY o.next_retry_at, o.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.portal_communication_outbox o
  SET status = 'processing', locked_at = NOW(), locked_by = BTRIM(p_worker_id),
      claim_token = gen_random_uuid(), updated_at = NOW()
  FROM candidates c
  WHERE o.id = c.id
  RETURNING o.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_portal_communication_outbox_attempt(
  p_outbox_id UUID,
  p_worker_id TEXT,
  p_claim_token UUID,
  p_succeeded BOOLEAN,
  p_error TEXT,
  p_retry_after_seconds INTEGER DEFAULT 60
)
RETURNS public.portal_communication_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_outbox public.portal_communication_outbox%ROWTYPE;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  IF NULLIF(BTRIM(p_worker_id), '') IS NULL
     OR char_length(BTRIM(p_worker_id)) > 200
     OR p_claim_token IS NULL THEN
    RAISE EXCEPTION 'Worker identity and opaque claim token are required.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_outbox
  FROM public.portal_communication_outbox
  WHERE id = p_outbox_id
  FOR UPDATE;
  IF NOT FOUND
     OR v_outbox.status <> 'processing'
     OR v_outbox.locked_by IS DISTINCT FROM BTRIM(p_worker_id)
     OR v_outbox.claim_token IS DISTINCT FROM p_claim_token
     OR v_outbox.locked_at < NOW() - INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'Current worker claim is required; the lease may have expired or been replaced.' USING ERRCODE = '55000';
  END IF;

  IF p_succeeded THEN
    UPDATE public.portal_communication_outbox
    SET status = 'succeeded', locked_at = NULL, locked_by = NULL, claim_token = NULL,
        last_error = NULL, updated_at = NOW()
    WHERE id = p_outbox_id
    RETURNING * INTO v_outbox;
  ELSE
    UPDATE public.portal_communication_outbox
    SET retry_count = retry_count + 1,
        status = CASE WHEN retry_count + 1 >= max_retries THEN 'dead_letter' ELSE 'retry_wait' END,
        next_retry_at = CASE
          WHEN retry_count + 1 >= max_retries THEN NOW()
          ELSE NOW() + make_interval(secs => LEAST(GREATEST(p_retry_after_seconds, 15), 86400))
        END,
        locked_at = NULL,
        locked_by = NULL,
        claim_token = NULL,
        last_error = left(COALESCE(NULLIF(BTRIM(p_error), ''), 'Provider adapter failed.'), 1000),
        updated_at = NOW()
    WHERE id = p_outbox_id
    RETURNING * INTO v_outbox;

    UPDATE public.portal_communication_deliveries
    SET delivery_state = 'failed',
        retry_count = v_outbox.retry_count,
        next_retry_at = CASE WHEN v_outbox.status = 'retry_wait' THEN v_outbox.next_retry_at END,
        last_error = v_outbox.last_error,
        version = version + 1,
        updated_at = NOW()
    WHERE id = v_outbox.delivery_id
      AND delivery_state NOT IN ('provider_acknowledged', 'read', 'cancelled');

    IF v_outbox.status = 'dead_letter' THEN
      UPDATE public.portal_communication_messages
      SET lifecycle_state = 'failed', version = version + 1, updated_at = NOW()
      WHERE id = (
        SELECT d.message_id
        FROM public.portal_communication_deliveries d
        WHERE d.id = v_outbox.delivery_id
      )
        AND lifecycle_state NOT IN ('provider_acknowledged', 'read', 'cancelled');
    END IF;
  END IF;

  RETURN v_outbox;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_portal_communication_provider_receipt(
  p_delivery_id UUID,
  p_provider_key TEXT,
  p_provider_event_id TEXT,
  p_provider_message_id TEXT,
  p_event_kind TEXT,
  p_occurred_at TIMESTAMPTZ,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_delivery public.portal_communication_deliveries%ROWTYPE;
  v_existing_receipt public.portal_communication_provider_receipts%ROWTYPE;
  v_receipt_id UUID;
  v_next_state TEXT;
BEGIN
  IF (SELECT auth.role()) <> 'service_role' THEN
    RAISE EXCEPTION 'Service role required.' USING ERRCODE = '42501';
  END IF;
  IF p_event_kind NOT IN ('acknowledged', 'delivered', 'read', 'failed')
     OR NULLIF(BTRIM(p_provider_key), '') IS NULL
     OR NULLIF(BTRIM(p_provider_event_id), '') IS NULL
     OR p_occurred_at IS NULL
  THEN
    RAISE EXCEPTION 'Invalid provider receipt.' USING ERRCODE = '22023';
  END IF;
  IF p_event_kind IN ('acknowledged', 'delivered', 'read')
     AND NULLIF(BTRIM(p_provider_message_id), '') IS NULL
  THEN
    RAISE EXCEPTION 'Provider acknowledgement requires a provider message id.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_delivery
  FROM public.portal_communication_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;
  IF NOT FOUND OR v_delivery.channel = 'portal' THEN
    RAISE EXCEPTION 'External delivery is unavailable.' USING ERRCODE = '22023';
  END IF;
  IF v_delivery.provider_key IS NOT NULL
     AND v_delivery.provider_key IS DISTINCT FROM BTRIM(p_provider_key) THEN
    RAISE EXCEPTION 'Provider identity does not match the acknowledged delivery.' USING ERRCODE = '23505';
  END IF;
  IF v_delivery.provider_message_id IS NOT NULL
     AND NULLIF(BTRIM(p_provider_message_id), '') IS NOT NULL
     AND v_delivery.provider_message_id IS DISTINCT FROM BTRIM(p_provider_message_id) THEN
    RAISE EXCEPTION 'Provider message identity does not match the acknowledged delivery.' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.portal_communication_provider_receipts (
    company_id, delivery_id, provider_key, provider_event_id,
    provider_message_id, event_kind, occurred_at, payload
  ) VALUES (
    v_delivery.company_id, v_delivery.id, BTRIM(p_provider_key),
    BTRIM(p_provider_event_id), NULLIF(BTRIM(p_provider_message_id), ''),
    p_event_kind, p_occurred_at, COALESCE(p_payload, '{}'::JSONB)
  )
  ON CONFLICT (provider_key, provider_event_id) DO NOTHING
  RETURNING id INTO v_receipt_id;

  IF v_receipt_id IS NULL THEN
    SELECT * INTO v_existing_receipt
    FROM public.portal_communication_provider_receipts r
    WHERE r.provider_key = BTRIM(p_provider_key)
      AND r.provider_event_id = BTRIM(p_provider_event_id);
    IF NOT FOUND
       OR v_existing_receipt.company_id IS DISTINCT FROM v_delivery.company_id
       OR v_existing_receipt.delivery_id IS DISTINCT FROM v_delivery.id
       OR v_existing_receipt.provider_message_id IS DISTINCT FROM NULLIF(BTRIM(p_provider_message_id), '')
       OR v_existing_receipt.event_kind IS DISTINCT FROM p_event_kind
       OR v_existing_receipt.occurred_at IS DISTINCT FROM p_occurred_at
       OR v_existing_receipt.payload IS DISTINCT FROM COALESCE(p_payload, '{}'::JSONB) THEN
      RAISE EXCEPTION 'Duplicate provider event identity does not match its original receipt.' USING ERRCODE = '23505';
    END IF;
    RETURN jsonb_build_object('duplicate', TRUE, 'deliveryId', v_delivery.id, 'state', v_delivery.delivery_state);
  END IF;

  v_next_state := CASE
    WHEN v_delivery.delivery_state IN ('read', 'cancelled') THEN v_delivery.delivery_state
    WHEN p_event_kind = 'read' THEN 'read'
    WHEN v_delivery.delivery_state = 'provider_acknowledged' THEN 'provider_acknowledged'
    WHEN p_event_kind IN ('acknowledged', 'delivered') THEN 'provider_acknowledged'
    WHEN p_event_kind = 'failed' THEN 'failed'
    ELSE v_delivery.delivery_state
  END;

  UPDATE public.portal_communication_deliveries
  SET delivery_state = v_next_state,
      provider_key = CASE
        WHEN p_event_kind <> 'failed' THEN COALESCE(provider_key, BTRIM(p_provider_key))
        ELSE provider_key
      END,
      provider_message_id = CASE
        WHEN p_event_kind <> 'failed' THEN COALESCE(provider_message_id, NULLIF(BTRIM(p_provider_message_id), ''))
        ELSE provider_message_id
      END,
      provider_acknowledged_at = CASE
        WHEN p_event_kind IN ('acknowledged', 'delivered', 'read') THEN COALESCE(provider_acknowledged_at, p_occurred_at)
        ELSE provider_acknowledged_at
      END,
      next_retry_at = CASE WHEN v_next_state IN ('provider_acknowledged', 'read', 'cancelled') THEN NULL ELSE next_retry_at END,
      last_error = CASE WHEN v_next_state = 'failed' THEN left(COALESCE(p_payload->>'error', 'Provider reported failure.'), 1000) ELSE NULL END,
      version = version + 1,
      updated_at = NOW()
  WHERE id = v_delivery.id
  RETURNING * INTO v_delivery;

  IF v_next_state IN ('provider_acknowledged', 'read') THEN
    UPDATE public.portal_communication_messages
    SET lifecycle_state = v_next_state,
        version = version + 1,
        updated_at = NOW()
    WHERE id = v_delivery.message_id
      AND lifecycle_state NOT IN ('read', 'cancelled');

    UPDATE public.portal_communication_outbox
    SET status = 'succeeded', locked_at = NULL, locked_by = NULL, claim_token = NULL,
        last_error = NULL, updated_at = NOW()
    WHERE delivery_id = v_delivery.id AND status NOT IN ('cancelled', 'succeeded');
  ELSIF v_next_state = 'failed' THEN
    UPDATE public.portal_communication_messages
    SET lifecycle_state = 'failed', version = version + 1, updated_at = NOW()
    WHERE id = v_delivery.message_id
      AND lifecycle_state NOT IN ('provider_acknowledged', 'read', 'cancelled');
  END IF;

  RETURN jsonb_build_object(
    'duplicate', FALSE,
    'deliveryId', v_delivery.id,
    'state', v_delivery.delivery_state,
    'version', v_delivery.version
  );
END;
$$;

-- Return only people whom the current actor may add to a newly created thread.
-- The command RPC still performs the authoritative check at write time; this
-- read contract exists only to keep the compose UI from exposing broad profile
-- directories or asking users to paste identifiers.
CREATE OR REPLACE FUNCTION public.portal_communication_participant_candidates()
RETURNS TABLE (
  profile_id UUID,
  display_label TEXT,
  profile_role TEXT,
  site_id UUID,
  unit_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH actor AS MATERIALIZED (
    SELECT p.id, p.company_id, p.role
    FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
      AND p.company_id IS NOT NULL
      AND p.role IN ('admin', 'manager', 'accountant')
  ),
  eligible_sites AS MATERIALIZED (
    SELECT s.id AS site_id, s.company_id
    FROM actor a
    JOIN public.sites s ON s.company_id = a.company_id
    WHERE a.role IN ('admin', 'accountant')
       OR (a.role = 'manager' AND public.current_user_can_manage_site(s.id))
  ),
  site_candidates AS (
    SELECT
      p.id AS profile_id,
      COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Member') AS display_label,
      p.role AS profile_role,
      es.site_id,
      NULL::UUID AS unit_id
    FROM actor a
    JOIN eligible_sites es ON es.company_id = a.company_id
    JOIN public.profiles p
      ON p.company_id = a.company_id
     AND p.id <> a.id
    WHERE p.role IN ('admin', 'manager', 'accountant', 'staff')
      AND (a.role <> 'accountant' OR p.role <> 'staff')
      AND (
        p.role IN ('admin', 'accountant')
        OR EXISTS (
          SELECT 1
          FROM public.profile_site_assignments psa
          WHERE psa.company_id = a.company_id
            AND psa.site_id = es.site_id
            AND psa.profile_id = p.id
            AND psa.status = 'active'
            AND psa.valid_from <= NOW()
            AND (psa.valid_until IS NULL OR psa.valid_until > NOW())
        )
      )
  ),
  relationship_candidates AS (
    SELECT
      p.id AS profile_id,
      COALESCE(NULLIF(BTRIM(p.full_name), ''), 'Member') AS display_label,
      p.role AS profile_role,
      es.site_id,
      u.id AS unit_id
    FROM actor a
    JOIN eligible_sites es ON es.company_id = a.company_id
    JOIN public.units u
      ON u.company_id = a.company_id
     AND u.site_id = es.site_id
    JOIN public.unit_residents ur
      ON ur.company_id = a.company_id
     AND ur.unit_id = u.id
    JOIN public.resident_profile_links l
      ON l.company_id = a.company_id
     AND l.resident_id = ur.resident_id
    JOIN public.profiles p
      ON p.id = l.profile_id
     AND p.company_id = a.company_id
     AND p.id <> a.id
    WHERE p.role IN ('owner', 'tenant')
      AND (
        (p.role = 'owner' AND public.profile_has_unit_relationship(
          p.id, u.id, ARRAY['owner']::TEXT[]
        ))
        OR (p.role = 'tenant' AND public.profile_has_tenant_module_access(
          p.id, u.id, 'communications'
        ))
      )
  )
  SELECT DISTINCT
    candidate.profile_id,
    candidate.display_label,
    candidate.profile_role,
    candidate.site_id,
    candidate.unit_id
  FROM (
    SELECT * FROM site_candidates
    UNION ALL
    SELECT * FROM relationship_candidates
  ) candidate
  ORDER BY candidate.display_label, candidate.profile_role, candidate.site_id, candidate.unit_id
  LIMIT 5000;
$$;

-- ---------------------------------------------------------------------------
-- 6. Evidence protection, realtime invalidation, and least-privilege grants.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.protect_portal_communication_provider_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    OLD.provider_key IS NOT NULL
    OR OLD.provider_message_id IS NOT NULL
    OR OLD.provider_acknowledged_at IS NOT NULL
  ) AND (
    NEW.provider_key IS DISTINCT FROM OLD.provider_key
    OR NEW.provider_message_id IS DISTINCT FROM OLD.provider_message_id
    OR NEW.provider_acknowledged_at IS DISTINCT FROM OLD.provider_acknowledged_at
  ) THEN
    RAISE EXCEPTION 'Acknowledged provider identity is immutable.' USING ERRCODE = '55000';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_portal_communication_provider_identity
  ON public.portal_communication_deliveries;
CREATE TRIGGER protect_portal_communication_provider_identity
  BEFORE UPDATE ON public.portal_communication_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.protect_portal_communication_provider_identity();

DROP TRIGGER IF EXISTS protect_portal_communication_events ON public.portal_communication_events;
CREATE TRIGGER protect_portal_communication_events
  BEFORE UPDATE OR DELETE ON public.portal_communication_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

DROP TRIGGER IF EXISTS protect_portal_communication_provider_receipts ON public.portal_communication_provider_receipts;
CREATE TRIGGER protect_portal_communication_provider_receipts
  BEFORE UPDATE OR DELETE ON public.portal_communication_provider_receipts
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

ALTER TABLE public.portal_communication_threads REPLICA IDENTITY FULL;
ALTER TABLE public.portal_communication_messages REPLICA IDENTITY FULL;
ALTER TABLE public.portal_communication_message_receipts REPLICA IDENTITY FULL;
ALTER TABLE public.portal_communication_deliveries REPLICA IDENTITY FULL;
ALTER TABLE public.portal_communication_outbox REPLICA IDENTITY FULL;

DO $realtime$
DECLARE
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'portal_communication_threads',
    'portal_communication_messages',
    'portal_communication_message_receipts',
    'portal_communication_deliveries',
    'portal_communication_outbox'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_catalog.pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END;
$realtime$;

REVOKE ALL ON FUNCTION public.current_user_can_access_portal_communication_thread(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_access_portal_communication_thread(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_manage_portal_communication_template(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_can_manage_portal_communication_template(UUID) TO authenticated;
REVOKE ALL ON FUNCTION public.portal_communication_sha256(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_communication_replay_result(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_communication_profile_is_active_recipient(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.protect_portal_communication_provider_identity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_communication_participant_candidates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_communication_participant_candidates() TO authenticated;

REVOKE ALL ON FUNCTION public.create_portal_communication_thread_command(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_portal_communication_thread_command(UUID, UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID[], TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.post_portal_communication_message_command(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_portal_communication_message_command(UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID[], TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.mark_portal_communication_message_read_command(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_portal_communication_message_read_command(UUID, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.retry_portal_communication_delivery_command(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_portal_communication_delivery_command(UUID, INTEGER, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_portal_communication_delivery_command(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_portal_communication_delivery_command(UUID, INTEGER, TEXT, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.save_portal_communication_template_command(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_portal_communication_template_command(UUID, UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, JSONB, TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.create_portal_communication_broadcast_command(UUID, TEXT, JSONB, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_portal_communication_broadcast_command(UUID, TEXT, JSONB, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_portal_communication_outbox(TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_portal_communication_outbox(TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.complete_portal_communication_outbox_attempt(UUID, TEXT, UUID, BOOLEAN, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_portal_communication_outbox_attempt(UUID, TEXT, UUID, BOOLEAN, TEXT, INTEGER) TO service_role;
REVOKE ALL ON FUNCTION public.record_portal_communication_provider_receipt(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_portal_communication_provider_receipt(UUID, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ, JSONB) TO service_role;

COMMIT;
