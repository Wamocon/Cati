-- Operational API foundation for the 1Cati site-management CRM.
-- Adds search, AI retrieval, local tenant defaults, action logging and
-- dashboard snapshot functions used by the Next.js backend-for-frontend layer.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.default_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id
  FROM public.companies
  WHERE slug = 'ataberk-estate'
  ORDER BY created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role text;
  safe_role text;
  requested_company_id uuid;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'client');

  safe_role := CASE
    WHEN requested_role IN (
      'super_admin','company_admin','manager','sales_consultant',
      'listing_agent','property_manager','accountant','maintenance','client','viewer'
    ) THEN requested_role
    ELSE 'client'
  END;

  BEGIN
    requested_company_id := NULLIF(NEW.raw_user_meta_data->>'company_id', '')::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      requested_company_id := NULL;
  END;

  INSERT INTO public.profiles (id, full_name, role, language, company_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    safe_role,
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr'),
    COALESCE(requested_company_id, public.default_company_id())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.sites
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(name, '') || ' ' || coalesce(code, '') || ' ' ||
      coalesce(city, '') || ' ' || coalesce(district, '') || ' ' ||
      coalesce(address, '')
    )
  ) STORED;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(unit_no, '') || ' ' || coalesce(unit_type, '') || ' ' ||
      coalesce(occupancy_status, '') || ' ' || coalesce(ownership_status, '')
    )
  ) STORED;

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(full_name, '') || ' ' || coalesce(phone, '') || ' ' ||
      coalesce(email, '') || ' ' || coalesce(preferred_language, '') || ' ' ||
      coalesce(identity_status, '')
    )
  ) STORED;

ALTER TABLE public.service_tickets
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(ticket_no, '') || ' ' || coalesce(title, '') || ' ' ||
      coalesce(description, '') || ' ' || coalesce(category, '') || ' ' ||
      coalesce(priority, '') || ' ' || coalesce(status, '')
    )
  ) STORED;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(title, '') || ' ' || coalesce(category, '') || ' ' ||
      coalesce(file_path, '') || ' ' || coalesce(status, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_sites_search_vector ON public.sites USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_units_search_vector ON public.units USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_residents_search_vector ON public.residents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_service_tickets_search_vector ON public.service_tickets USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON public.documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_units_company_site_number ON public.units(company_id, site_id, unit_no);
CREATE INDEX IF NOT EXISTS idx_service_tickets_company_priority ON public.service_tickets(company_id, priority, status);

ALTER TABLE public.finance_ledger_entries
  ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reversal_of UUID REFERENCES public.finance_ledger_entries(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_ledger_idempotency
  ON public.finance_ledger_entries(company_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_company_posted
  ON public.finance_ledger_entries(company_id, posted_at DESC)
  WHERE posted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_posted_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.posted_at IS NOT NULL AND (
    NEW.entry_type IS DISTINCT FROM OLD.entry_type OR
    NEW.site_id IS DISTINCT FROM OLD.site_id OR
    NEW.unit_id IS DISTINCT FROM OLD.unit_id OR
    NEW.resident_id IS DISTINCT FROM OLD.resident_id OR
    NEW.amount_cents IS DISTINCT FROM OLD.amount_cents OR
    NEW.currency IS DISTINCT FROM OLD.currency OR
    NEW.period IS DISTINCT FROM OLD.period OR
    NEW.description IS DISTINCT FROM OLD.description
  ) THEN
    RAISE EXCEPTION 'Posted ledger entries are immutable; create a reversal entry instead.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_posted_ledger_mutation ON public.finance_ledger_entries;
CREATE TRIGGER prevent_posted_ledger_mutation
  BEFORE UPDATE ON public.finance_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_posted_ledger_mutation();

CREATE TABLE IF NOT EXISTS public.import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_name TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  valid_rows INTEGER NOT NULL DEFAULT 0 CHECK (valid_rows >= 0),
  warning_rows INTEGER NOT NULL DEFAULT 0 CHECK (warning_rows >= 0),
  rejected_rows INTEGER NOT NULL DEFAULT 0 CHECK (rejected_rows >= 0),
  status TEXT NOT NULL DEFAULT 'validated' CHECK (status IN ('validated', 'review_required', 'ready_to_apply', 'applied', 'cancelled')),
  imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.import_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  import_batch_id UUID REFERENCES public.import_batches(id) ON DELETE CASCADE,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error')),
  area TEXT NOT NULL,
  affected_rows INTEGER NOT NULL DEFAULT 0 CHECK (affected_rows >= 0),
  message TEXT NOT NULL,
  recommended_action TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  team TEXT NOT NULL,
  phone TEXT,
  language TEXT NOT NULL DEFAULT 'tr',
  active_tasks INTEGER NOT NULL DEFAULT 0 CHECK (active_tasks >= 0),
  approval_limit_cents BIGINT NOT NULL DEFAULT 0 CHECK (approval_limit_cents >= 0),
  access_scope TEXT NOT NULL DEFAULT 'support_only' CHECK (access_scope IN ('all_site', 'finance_only', 'field_only', 'support_only')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'training', 'restricted', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.role_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role_label TEXT NOT NULL,
  users_count INTEGER NOT NULL DEFAULT 0 CHECK (users_count >= 0),
  can_approve_finance BOOLEAN NOT NULL DEFAULT FALSE,
  can_restrict_access BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_users BOOLEAN NOT NULL DEFAULT FALSE,
  can_export_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, role_label)
);

CREATE TABLE IF NOT EXISTS public.client_action_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  entity_external_id TEXT,
  title TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'logged', 'approved', 'rejected', 'completed', 'failed')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.integration_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  integration_key TEXT NOT NULL,
  action_type TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'succeeded', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.operational_search_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  entity_table TEXT NOT NULL,
  entity_id UUID,
  entity_external_id TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  language TEXT NOT NULL DEFAULT 'tr',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  embedding vector(1536),
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, ''))
  ) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_batches_company_status ON public.import_batches(company_id, status);
CREATE INDEX IF NOT EXISTS idx_import_findings_batch ON public.import_findings(import_batch_id, severity);
CREATE INDEX IF NOT EXISTS idx_staff_members_company_role ON public.staff_members(company_id, role, status);
CREATE INDEX IF NOT EXISTS idx_client_action_requests_company_status ON public.client_action_requests(company_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_integration_outbox_status ON public.integration_outbox(company_id, status, available_at);
CREATE INDEX IF NOT EXISTS idx_operational_search_documents_vector ON public.operational_search_documents USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_operational_search_documents_entity ON public.operational_search_documents(entity_table, entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_operational_search_documents_external_unique
  ON public.operational_search_documents(company_id, entity_table, entity_external_id)
  WHERE entity_external_id IS NOT NULL;

DO $$
BEGIN
  EXECUTE '
    CREATE INDEX IF NOT EXISTS idx_operational_search_documents_embedding
      ON public.operational_search_documents
      USING hnsw (embedding vector_cosine_ops)
      WHERE embedding IS NOT NULL
  ';
EXCEPTION
  WHEN undefined_object OR feature_not_supported OR invalid_parameter_value THEN
    RAISE NOTICE 'Skipping HNSW vector index; text search indexes remain active.';
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'import_batches',
    'import_findings',
    'staff_members',
    'role_coverage',
    'client_action_requests',
    'integration_outbox',
    'operational_search_documents'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Company members can read" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can read" ON public.%I FOR SELECT USING (public.is_super_admin() OR company_id = public.current_user_company_id())',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Company members can insert" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can insert" ON public.%I FOR INSERT WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 20)',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Managers can update" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Managers can update" ON public.%I FOR UPDATE USING ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 50) WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 50)',
      table_name
    );
  END LOOP;
END;
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'import_batches',
    'staff_members',
    'role_coverage',
    'client_action_requests',
    'integration_outbox',
    'operational_search_documents'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%I_updated_at ON public.%I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER set_%I_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      table_name,
      table_name
    );
  END LOOP;
END;
$$;

GRANT SELECT ON public.companies TO authenticated;
GRANT SELECT, INSERT, UPDATE ON
  public.offices,
  public.sites,
  public.site_blocks,
  public.site_floors,
  public.units,
  public.residents,
  public.unit_residents,
  public.vendors,
  public.service_tickets,
  public.service_ticket_events,
  public.finance_ledger_entries,
  public.payment_transactions,
  public.reservations,
  public.documents,
  public.access_events,
  public.ai_action_logs,
  public.audit_events,
  public.import_batches,
  public.import_findings,
  public.staff_members,
  public.role_coverage,
  public.client_action_requests,
  public.integration_outbox,
  public.operational_search_documents
TO authenticated;

CREATE OR REPLACE FUNCTION public.search_operational_records(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  entity_table TEXT,
  entity_id UUID,
  entity_external_id TEXT,
  title TEXT,
  summary TEXT,
  rank REAL,
  metadata JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  q tsquery;
BEGIN
  IF NULLIF(trim(p_query), '') IS NULL THEN
    RETURN;
  END IF;

  q := websearch_to_tsquery('simple', p_query);

  RETURN QUERY
  SELECT
    d.entity_table,
    d.entity_id,
    d.entity_external_id,
    d.title,
    d.summary,
    ts_rank_cd(d.search_vector, q) AS rank,
    d.metadata
  FROM public.operational_search_documents d
  WHERE
    (public.is_super_admin() OR d.company_id = public.current_user_company_id())
    AND d.search_vector @@ q
  ORDER BY rank DESC, d.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
END;
$$;

CREATE OR REPLACE FUNCTION public.log_client_action(
  p_action_type TEXT,
  p_entity_table TEXT DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_entity_external_id TEXT DEFAULT NULL,
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
  v_action_id UUID;
BEGIN
  v_company_id := public.current_user_company_id();

  IF v_company_id IS NULL AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'No company context for action logging.';
  END IF;

  IF v_company_id IS NULL THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;

  IF public.current_user_role_level() < 10 AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Insufficient permission for action logging.';
  END IF;

  INSERT INTO public.client_action_requests (
    company_id,
    action_type,
    entity_table,
    entity_id,
    entity_external_id,
    title,
    status,
    requested_by,
    metadata
  )
  VALUES (
    v_company_id,
    p_action_type,
    p_entity_table,
    p_entity_id,
    p_entity_external_id,
    p_title,
    'logged',
    auth.uid(),
    COALESCE(p_metadata, '{}'::JSONB)
  )
  RETURNING id INTO v_action_id;

  INSERT INTO public.audit_events (
    company_id,
    actor_profile_id,
    action,
    entity_table,
    entity_id,
    after_data
  )
  VALUES (
    v_company_id,
    auth.uid(),
    p_action_type,
    COALESCE(p_entity_table, 'client_action_requests'),
    COALESCE(p_entity_id, v_action_id),
    jsonb_build_object(
      'action_request_id', v_action_id,
      'entity_external_id', p_entity_external_id,
      'title', p_title,
      'metadata', COALESCE(p_metadata, '{}'::JSONB)
    )
  );

  RETURN v_action_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_site_dashboard_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_site_id UUID;
  v_payload JSONB;
BEGIN
  v_company_id := public.current_user_company_id();

  IF v_company_id IS NULL AND public.is_super_admin() THEN
    SELECT id INTO v_company_id FROM public.companies ORDER BY created_at LIMIT 1;
  END IF;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context for dashboard snapshot.';
  END IF;

  SELECT id INTO v_site_id
  FROM public.sites
  WHERE company_id = v_company_id
  ORDER BY created_at
  LIMIT 1;

  SELECT jsonb_build_object(
    'source', 'supabase',
    'generatedAt', NOW(),
    'company', (
      SELECT jsonb_build_object('id', c.id, 'name', c.name, 'slug', c.slug, 'currency', c.currency)
      FROM public.companies c
      WHERE c.id = v_company_id
    ),
    'site', (
      SELECT jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code, 'city', s.city, 'district', s.district, 'totalUnits', s.total_units)
      FROM public.sites s
      WHERE s.id = v_site_id
    ),
    'summary', jsonb_build_object(
      'totalUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND (v_site_id IS NULL OR u.site_id = v_site_id)),
      'occupiedUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND (v_site_id IS NULL OR u.site_id = v_site_id) AND u.occupancy_status IN ('occupied', 'reserved')),
      'vacantUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND (v_site_id IS NULL OR u.site_id = v_site_id) AND u.occupancy_status = 'vacant'),
      'blockedUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND (v_site_id IS NULL OR u.site_id = v_site_id) AND u.occupancy_status = 'blocked'),
      'openTickets', (SELECT count(*) FROM public.service_tickets t WHERE t.company_id = v_company_id AND (v_site_id IS NULL OR t.site_id = v_site_id) AND t.status NOT IN ('resolved', 'closed', 'cancelled')),
      'overdueTickets', (SELECT count(*) FROM public.service_tickets t WHERE t.company_id = v_company_id AND (v_site_id IS NULL OR t.site_id = v_site_id) AND t.status NOT IN ('resolved', 'closed', 'cancelled') AND t.sla_due_at < NOW()),
      'openLedgerCents', COALESCE((SELECT sum(l.amount_cents) FROM public.finance_ledger_entries l WHERE l.company_id = v_company_id AND (v_site_id IS NULL OR l.site_id = v_site_id) AND l.status IN ('open', 'partially_paid', 'overdue')), 0),
      'activeReservations', (SELECT count(*) FROM public.reservations r WHERE r.company_id = v_company_id AND (v_site_id IS NULL OR r.site_id = v_site_id) AND r.status NOT IN ('cancelled', 'no_show', 'checked_out')),
      'pendingAiActions', (SELECT count(*) FROM public.ai_action_logs a WHERE a.company_id = v_company_id AND a.status IN ('suggested', 'approved'))
    ),
    'units', COALESCE((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT u.id, u.unit_no, u.unit_type, u.occupancy_status, u.ownership_status, u.size_sqm, u.bedrooms
        FROM public.units u
        WHERE u.company_id = v_company_id AND (v_site_id IS NULL OR u.site_id = v_site_id)
        ORDER BY u.unit_no
        LIMIT 48
      ) x
    ), '[]'::jsonb),
    'tickets', COALESCE((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT t.id, t.ticket_no, t.title, t.priority, t.status, t.category, t.sla_due_at, t.estimated_cost_cents
        FROM public.service_tickets t
        WHERE t.company_id = v_company_id AND (v_site_id IS NULL OR t.site_id = v_site_id)
        ORDER BY
          CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'normal' THEN 3 ELSE 4 END,
          t.sla_due_at NULLS LAST
        LIMIT 12
      ) x
    ), '[]'::jsonb),
    'recentActions', COALESCE((
      SELECT jsonb_agg(row_to_json(x))
      FROM (
        SELECT a.id, a.action_type, a.entity_table, a.entity_external_id, a.title, a.status, a.created_at
        FROM public.client_action_requests a
        WHERE a.company_id = v_company_id
        ORDER BY a.created_at DESC
        LIMIT 10
      ) x
    ), '[]'::jsonb)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_client_action(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() TO authenticated;
