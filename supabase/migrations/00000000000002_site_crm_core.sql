-- Core site-management CRM schema for 1Cati.
-- This migration adds the production domain model behind the ERP UI.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  primary_locale TEXT NOT NULL DEFAULT 'tr',
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul',
  currency TEXT NOT NULL DEFAULT 'TRY',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'tenant';

CREATE TABLE IF NOT EXISTS public.offices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  office_id UUID REFERENCES public.offices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Istanbul',
  district TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'onboarding', 'paused', 'archived')),
  total_units INTEGER NOT NULL DEFAULT 0 CHECK (total_units >= 0),
  manager_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.site_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, name)
);

CREATE TABLE IF NOT EXISTS public.site_floors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.site_blocks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, block_id, label)
);

CREATE TABLE IF NOT EXISTS public.units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.site_blocks(id) ON DELETE SET NULL,
  floor_id UUID REFERENCES public.site_floors(id) ON DELETE SET NULL,
  unit_no TEXT NOT NULL,
  unit_type TEXT NOT NULL DEFAULT 'apartment' CHECK (unit_type IN ('apartment', 'villa', 'commercial', 'storage', 'parking')),
  size_sqm NUMERIC(10, 2),
  bedrooms INTEGER CHECK (bedrooms IS NULL OR bedrooms >= 0),
  occupancy_status TEXT NOT NULL DEFAULT 'unknown' CHECK (occupancy_status IN ('occupied', 'vacant', 'reserved', 'blocked', 'unknown')),
  ownership_status TEXT NOT NULL DEFAULT 'unknown' CHECK (ownership_status IN ('owner_occupied', 'tenant_occupied', 'company_owned', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (site_id, unit_no)
);

CREATE TABLE IF NOT EXISTS public.residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'tr',
  preferred_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'sms', 'email', 'phone', 'portal')),
  identity_status TEXT NOT NULL DEFAULT 'unverified' CHECK (identity_status IN ('unverified', 'pending', 'verified', 'rejected', 'expired')),
  risk_score INTEGER NOT NULL DEFAULT 0 CHECK (risk_score BETWEEN 0 AND 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unit_residents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL CHECK (relationship IN ('owner', 'tenant', 'guest', 'family', 'authorized_contact')),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, resident_id, relationship)
);

CREATE TABLE IF NOT EXISTS public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'blocked', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  ticket_no TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triage', 'assigned', 'waiting_approval', 'in_progress', 'resolved', 'closed', 'cancelled')),
  sla_due_at TIMESTAMPTZ,
  estimated_cost_cents BIGINT CHECK (estimated_cost_cents IS NULL OR estimated_cost_cents >= 0),
  approved_cost_cents BIGINT CHECK (approved_cost_cents IS NULL OR approved_cost_cents >= 0),
  requires_finance_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, ticket_no)
);

CREATE TABLE IF NOT EXISTS public.service_ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  body TEXT,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('dues', 'service_charge', 'deposit', 'refund', 'penalty', 'adjustment', 'payment')),
  period TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'partially_paid', 'paid', 'overdue', 'cancelled')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  ledger_entry_id UUID REFERENCES public.finance_ledger_entries(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'cancelled')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  paid_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  guest_name TEXT,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'checked_in', 'checked_out', 'cancelled', 'no_show')),
  access_code_status TEXT NOT NULL DEFAULT 'pending' CHECK (access_code_status IN ('pending', 'issued', 'revoked', 'expired')),
  cleaning_status TEXT NOT NULL DEFAULT 'pending' CHECK (cleaning_status IN ('pending', 'assigned', 'done', 'blocked')),
  deposit_status TEXT NOT NULL DEFAULT 'not_required' CHECK (deposit_status IN ('not_required', 'pending', 'held', 'released', 'deducted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out_at > check_in_at)
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'expired', 'archived', 'rejected')),
  expires_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  event_source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor_name TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  module TEXT NOT NULL,
  entity_table TEXT,
  entity_id UUID,
  prompt_hash TEXT,
  recommendation TEXT NOT NULL,
  confidence NUMERIC(5, 4) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  status TEXT NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'approved', 'rejected', 'applied', 'expired')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  sources JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.current_user_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role_level()
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.role_level(public.current_user_profile_role());
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.current_user_profile_role() = 'admin';
$$;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'offices',
    'sites',
    'site_blocks',
    'site_floors',
    'units',
    'residents',
    'unit_residents',
    'vendors',
    'service_tickets',
    'service_ticket_events',
    'finance_ledger_entries',
    'payment_transactions',
    'reservations',
    'documents',
    'access_events',
    'ai_action_logs',
    'audit_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Company members can read" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can read" ON public.%I FOR SELECT USING (public.is_super_admin() OR company_id = public.current_user_company_id())',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Managers can write company data" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Managers can insert company data" ON public.%I', table_name);
    EXECUTE format('DROP POLICY IF EXISTS "Managers can update company data" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Managers can insert company data" ON public.%I FOR INSERT WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      table_name
    );
    EXECUTE format(
      'CREATE POLICY "Managers can update company data" ON public.%I FOR UPDATE USING ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70) WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      table_name
    );
  END LOOP;
END;
$$;

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read own company" ON public.companies;
CREATE POLICY "Company members can read own company"
  ON public.companies FOR SELECT
  USING (public.is_super_admin() OR id = public.current_user_company_id());

DROP POLICY IF EXISTS "Company admins can write own company" ON public.companies;
DROP POLICY IF EXISTS "Super admins can create companies" ON public.companies;
CREATE POLICY "Super admins can create companies"
  ON public.companies FOR INSERT
  WITH CHECK (public.is_super_admin());

DROP POLICY IF EXISTS "Company admins can update own company" ON public.companies;
CREATE POLICY "Company admins can update own company"
  ON public.companies FOR UPDATE
  USING (
    (public.is_super_admin() OR id = public.current_user_company_id())
    AND public.current_user_role_level() >= 90
  )
  WITH CHECK (
    (public.is_super_admin() OR id = public.current_user_company_id())
    AND public.current_user_role_level() >= 90
  );

DROP POLICY IF EXISTS "Admins and managers can read profiles" ON public.profiles;
CREATE POLICY "Admins and managers can read profiles"
  ON public.profiles FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      company_id = public.current_user_company_id()
      AND public.current_user_role_level() >= public.role_level('manager')
    )
  );

DROP POLICY IF EXISTS "Maintenance can update assigned tickets" ON public.service_tickets;
CREATE POLICY "Maintenance can update assigned tickets"
  ON public.service_tickets FOR UPDATE
  USING (
    company_id = public.current_user_company_id()
    AND public.current_user_role_level() >= 40
    AND assigned_to = auth.uid()
  )
  WITH CHECK (
    company_id = public.current_user_company_id()
    AND public.current_user_role_level() >= 40
    AND assigned_to = auth.uid()
  );

CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_offices_company_id ON public.offices(company_id);
CREATE INDEX IF NOT EXISTS idx_sites_company_status ON public.sites(company_id, status);
CREATE INDEX IF NOT EXISTS idx_site_blocks_site_id ON public.site_blocks(site_id);
CREATE INDEX IF NOT EXISTS idx_site_floors_site_id ON public.site_floors(site_id);
CREATE INDEX IF NOT EXISTS idx_units_site_status ON public.units(site_id, occupancy_status);
CREATE INDEX IF NOT EXISTS idx_residents_company_status ON public.residents(company_id, status);
CREATE INDEX IF NOT EXISTS idx_unit_residents_unit_id ON public.unit_residents(unit_id);
CREATE INDEX IF NOT EXISTS idx_unit_residents_resident_id ON public.unit_residents(resident_id);
CREATE INDEX IF NOT EXISTS idx_service_tickets_company_status ON public.service_tickets(company_id, status);
CREATE INDEX IF NOT EXISTS idx_service_tickets_sla_due_at ON public.service_tickets(sla_due_at) WHERE status NOT IN ('resolved', 'closed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_ticket_events_ticket_id ON public.service_ticket_events(ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_company_status ON public.finance_ledger_entries(company_id, status);
CREATE INDEX IF NOT EXISTS idx_finance_ledger_due_date ON public.finance_ledger_entries(due_date) WHERE status IN ('open', 'partially_paid', 'overdue');
CREATE INDEX IF NOT EXISTS idx_payment_transactions_reference ON public.payment_transactions(provider, provider_reference);
CREATE INDEX IF NOT EXISTS idx_reservations_site_window ON public.reservations(site_id, check_in_at, check_out_at);
CREATE INDEX IF NOT EXISTS idx_documents_company_category ON public.documents(company_id, category);
CREATE INDEX IF NOT EXISTS idx_access_events_site_time ON public.access_events(site_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_action_logs_company_status ON public.ai_action_logs(company_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events(entity_table, entity_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'companies',
    'offices',
    'sites',
    'site_blocks',
    'site_floors',
    'units',
    'residents',
    'vendors',
    'service_tickets',
    'finance_ledger_entries',
    'payment_transactions',
    'reservations',
    'documents'
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
