-- Phase 10-11 operations foundation:
-- booking readiness, checkout settlement, access handoff, communications,
-- notification delivery and document packet workflow tables.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.reservation_availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('reservation', 'maintenance', 'owner_hold', 'admin_block')),
  source_reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'released')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  EXCLUDE USING gist (
    unit_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  ) WHERE (status = 'active')
);

CREATE TABLE IF NOT EXISTS public.booking_readiness (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  readiness_score INTEGER NOT NULL DEFAULT 0 CHECK (readiness_score BETWEEN 0 AND 100),
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  steps JSONB NOT NULL DEFAULT '[]'::JSONB,
  blocker TEXT,
  next_action TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.turnover_work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  workforce_task_id UUID REFERENCES public.workforce_tasks(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'in_progress', 'ready', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_at TIMESTAMPTZ,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  checklist JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_required BOOLEAN NOT NULL DEFAULT TRUE,
  dependency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_handoff_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  credential_type TEXT NOT NULL CHECK (credential_type IN ('mobile_code', 'card', 'plate', 'qr')),
  provider_code TEXT NOT NULL DEFAULT 'demo',
  action TEXT NOT NULL CHECK (action IN ('activate', 'deactivate', 'revoke', 'retry', 'manual_fallback')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'succeeded', 'failed', 'manual_required', 'approved')),
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  provider_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deposit_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  deposit_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (deposit_amount_cents >= 0),
  proposed_deduction_cents BIGINT NOT NULL DEFAULT 0 CHECK (proposed_deduction_cents >= 0),
  refund_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (refund_amount_cents >= 0),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'evidence_needed', 'manager_review', 'finance_ready', 'closed')),
  settlement_items JSONB NOT NULL DEFAULT '[]'::JSONB,
  evidence_count INTEGER NOT NULL DEFAULT 0 CHECK (evidence_count >= 0),
  approval_owner TEXT,
  final_statement_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  related_entity_table TEXT,
  related_entity_id UUID,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Portal', 'Email', 'SMS', 'Push', 'Team')),
  audience TEXT NOT NULL,
  subject TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('needs_reply', 'in_progress', 'ready', 'blocked')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  language TEXT NOT NULL DEFAULT 'tr' CHECK (language IN ('tr', 'en', 'de', 'ru')),
  consent_status TEXT NOT NULL DEFAULT 'ok' CHECK (consent_status IN ('ok', 'missing', 'opted_out')),
  sentiment TEXT NOT NULL DEFAULT 'neutral' CHECK (sentiment IN ('positive', 'neutral', 'risk')),
  last_message TEXT,
  next_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  trigger_key TEXT NOT NULL,
  target_expression TEXT NOT NULL,
  channel_mix TEXT NOT NULL,
  owner_team TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('active', 'review', 'disabled')),
  language_mode TEXT NOT NULL DEFAULT 'multilingual' CHECK (language_mode IN ('single', 'multilingual')),
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  failover TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, trigger_key)
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  notification_rule_id UUID REFERENCES public.notification_rules(id) ON DELETE SET NULL,
  recipient_ref TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Email', 'SMS', 'Push', 'Portal')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'manual_review')),
  related_entity_table TEXT,
  related_entity_id UUID,
  idempotency_key TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  provider_mode TEXT NOT NULL DEFAULT 'demo' CHECK (provider_mode IN ('demo', 'provider_ready', 'manual')),
  provider_response JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  use_case TEXT NOT NULL CHECK (use_case IN ('move_in', 'checkout', 'debt', 'service', 'document', 'announcement')),
  channel TEXT NOT NULL CHECK (channel IN ('WhatsApp', 'Email', 'SMS', 'Push', 'Portal')),
  owner_team TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'draft' CHECK (approval_status IN ('approved', 'needs_review', 'draft')),
  languages TEXT[] NOT NULL DEFAULT ARRAY['tr'],
  variables TEXT[] NOT NULL DEFAULT '{}',
  preview TEXT,
  body_by_language JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, title, use_case, channel)
);

CREATE TABLE IF NOT EXISTS public.document_packets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('owner', 'tenant', 'guest', 'buyer', 'staff', 'management')),
  related_entity_table TEXT,
  related_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('complete', 'missing_items', 'signature_pending', 'review')),
  required_documents INTEGER NOT NULL DEFAULT 0 CHECK (required_documents >= 0),
  completed_documents INTEGER NOT NULL DEFAULT 0 CHECK (completed_documents >= 0),
  signature_status TEXT NOT NULL DEFAULT 'not_required' CHECK (signature_status IN ('not_required', 'sent', 'signed', 'blocked')),
  retention_class TEXT NOT NULL CHECK (retention_class IN ('legal', 'finance', 'service', 'guest')),
  next_action TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'reservation_availability_blocks',
    'booking_readiness',
    'turnover_work_items',
    'access_handoff_requests',
    'deposit_settlements',
    'message_threads',
    'notification_rules',
    'notification_deliveries',
    'message_templates',
    'document_packets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Company members can read phase 10 11" ON public.%I', v_table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can read phase 10 11" ON public.%I FOR SELECT USING (public.is_super_admin() OR company_id = public.current_user_company_id())',
      v_table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Managers can manage phase 10 11" ON public.%I', v_table_name);
    EXECUTE format(
      'CREATE POLICY "Managers can manage phase 10 11" ON public.%I FOR ALL USING ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70) WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      v_table_name
    );

    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', v_table_name, v_table_name);
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = v_table_name AND column_name = 'updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
        v_table_name,
        v_table_name
      );
    END IF;
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_reservation_availability_unit_range ON public.reservation_availability_blocks USING gist (unit_id, tstzrange(starts_at, ends_at, '[)'));
CREATE INDEX IF NOT EXISTS idx_booking_readiness_company_risk ON public.booking_readiness(company_id, risk_level, readiness_score);
CREATE INDEX IF NOT EXISTS idx_turnover_work_company_status_due ON public.turnover_work_items(company_id, status, due_at);
CREATE INDEX IF NOT EXISTS idx_access_handoff_company_status ON public.access_handoff_requests(company_id, status, action);
CREATE INDEX IF NOT EXISTS idx_deposit_settlements_company_status ON public.deposit_settlements(company_id, status, approved_at);
CREATE INDEX IF NOT EXISTS idx_message_threads_company_status ON public.message_threads(company_id, status, priority, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_rules_company_status ON public.notification_rules(company_id, status, owner_team);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_retry ON public.notification_deliveries(company_id, status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_message_templates_company_use_case ON public.message_templates(company_id, use_case, approval_status);
CREATE INDEX IF NOT EXISTS idx_document_packets_company_status ON public.document_packets(company_id, status, retention_class);

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'reservation_availability_blocks',
    'booking_readiness',
    'turnover_work_items',
    'access_handoff_requests',
    'deposit_settlements',
    'message_threads',
    'notification_rules',
    'notification_deliveries',
    'message_templates',
    'document_packets'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipping phase 10-11 realtime publication setup; supabase_realtime publication is unavailable.';
END;
$$;
