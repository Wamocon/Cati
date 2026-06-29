-- Phase 8-9 service operations foundation:
-- service catalogue, resident service orders, workforce SLA tasks and media reports.

CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('maintenance', 'cleaning', 'transfer', 'amenity', 'security', 'inspection', 'concierge')),
  description TEXT,
  base_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (base_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  sla_hours INTEGER NOT NULL CHECK (sla_hours > 0),
  debt_policy TEXT NOT NULL DEFAULT 'manager_review' CHECK (debt_policy IN ('allow', 'manager_review', 'block_until_clear')),
  requires_payment BOOLEAN NOT NULL DEFAULT TRUE,
  requires_deposit BOOLEAN NOT NULL DEFAULT FALSE,
  team TEXT NOT NULL,
  provider_type TEXT NOT NULL DEFAULT 'internal' CHECK (provider_type IN ('internal', 'vendor', 'mixed')),
  service_level TEXT NOT NULL DEFAULT 'standard' CHECK (service_level IN ('standard', 'premium', 'emergency')),
  popularity_score INTEGER NOT NULL DEFAULT 0 CHECK (popularity_score BETWEEN 0 AND 100),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code)
);

CREATE TABLE IF NOT EXISTS public.service_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  service_catalog_id UUID REFERENCES public.service_catalog(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  order_no TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'debt_check' CHECK (status IN ('draft', 'debt_check', 'payment_pending', 'task_created', 'assigned', 'completed', 'blocked', 'cancelled')),
  debt_check_status TEXT NOT NULL DEFAULT 'clear' CHECK (debt_check_status IN ('clear', 'minor_debt_review', 'blocked')),
  payment_decision TEXT NOT NULL DEFAULT 'collect_before_dispatch' CHECK (payment_decision IN ('no_charge', 'collect_before_dispatch', 'debit_to_account', 'paid_or_debit_approved', 'hold')),
  quoted_price_cents BIGINT NOT NULL DEFAULT 0 CHECK (quoted_price_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY',
  requested_for_at TIMESTAMPTZ,
  next_action TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, order_no)
);

CREATE TABLE IF NOT EXISTS public.workforce_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL,
  ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  assigned_staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  task_no TEXT NOT NULL,
  title TEXT NOT NULL,
  team TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'waiting_payment', 'in_progress', 'resolved', 'closed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  sla_due_at TIMESTAMPTZ,
  route_slot TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::JSONB,
  requires_media BOOLEAN NOT NULL DEFAULT TRUE,
  media_count INTEGER NOT NULL DEFAULT 0 CHECK (media_count >= 0),
  manager_approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  completion_readiness INTEGER NOT NULL DEFAULT 0 CHECK (completion_readiness BETWEEN 0 AND 100),
  field_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, task_no)
);

CREATE TABLE IF NOT EXISTS public.media_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES public.service_tickets(id) ON DELETE CASCADE,
  workforce_task_id UUID REFERENCES public.workforce_tasks(id) ON DELETE CASCADE,
  uploaded_by_staff_member_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video', 'document', 'note')),
  storage_path TEXT,
  caption TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'accepted', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'service_catalog',
    'service_orders',
    'workforce_tasks',
    'media_reports'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Company members can read" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can read" ON public.%I FOR SELECT USING (public.is_super_admin() OR company_id = public.current_user_company_id())',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Managers can insert service operations" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Managers can insert service operations" ON public.%I FOR INSERT WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Managers can update service operations" ON public.%I', table_name);
    EXECUTE format(
      'CREATE POLICY "Managers can update service operations" ON public.%I FOR UPDATE USING ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70) WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      table_name
    );
  END LOOP;
END;
$$;

DROP POLICY IF EXISTS "Staff can update workforce tasks" ON public.workforce_tasks;
CREATE POLICY "Staff can update workforce tasks"
  ON public.workforce_tasks FOR UPDATE
  USING (
    company_id = public.current_user_company_id()
    AND public.current_user_role_level() >= 40
  )
  WITH CHECK (
    company_id = public.current_user_company_id()
    AND public.current_user_role_level() >= 40
  );

DROP POLICY IF EXISTS "Staff can insert media reports" ON public.media_reports;
CREATE POLICY "Staff can insert media reports"
  ON public.media_reports FOR INSERT
  WITH CHECK (
    company_id = public.current_user_company_id()
    AND public.current_user_role_level() >= 40
  );

CREATE INDEX IF NOT EXISTS idx_service_catalog_company_active ON public.service_catalog(company_id, active, category);
CREATE INDEX IF NOT EXISTS idx_service_orders_company_status ON public.service_orders(company_id, status, debt_check_status);
CREATE INDEX IF NOT EXISTS idx_service_orders_ticket_id ON public.service_orders(ticket_id);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_company_status ON public.workforce_tasks(company_id, status, priority);
CREATE INDEX IF NOT EXISTS idx_workforce_tasks_sla_due ON public.workforce_tasks(sla_due_at) WHERE status NOT IN ('resolved', 'closed', 'cancelled');
CREATE INDEX IF NOT EXISTS idx_media_reports_ticket_task ON public.media_reports(ticket_id, workforce_task_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['service_catalog', 'service_orders', 'workforce_tasks']
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

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'service_catalog',
    'service_orders',
    'workforce_tasks',
    'media_reports'
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
    RAISE NOTICE 'Skipping service operations realtime publication setup; supabase_realtime publication is unavailable.';
END;
$$;

INSERT INTO public.service_catalog (
  id,
  company_id,
  site_id,
  code,
  name,
  category,
  description,
  base_price_cents,
  currency,
  sla_hours,
  debt_policy,
  requires_payment,
  requires_deposit,
  team,
  provider_type,
  service_level,
  popularity_score,
  active
)
VALUES
  ('77777777-7777-4777-8777-777777777701', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'CLEAN-STD', 'Standart daire temizligi', 'cleaning', 'Daire teslimi ve kisa konaklama sonrasi temizlik.', 250000, 'TRY', 24, 'manager_review', TRUE, FALSE, 'Kat hizmetleri', 'mixed', 'standard', 96, TRUE),
  ('77777777-7777-4777-8777-777777777702', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'CLEAN-DEEP', 'Derin temizlik ve checkout hazirligi', 'cleaning', 'Checkout sonrasi detayli temizlik ve depozito kaniti.', 620000, 'TRY', 18, 'manager_review', TRUE, TRUE, 'Kat hizmetleri', 'mixed', 'premium', 88, TRUE),
  ('77777777-7777-4777-8777-777777777703', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'MAINT-AC', 'Klima bakimi ve drenaj kontrolu', 'maintenance', 'Filtre, drenaj ve sogutma performansi kontrolu.', 210000, 'TRY', 36, 'allow', TRUE, FALSE, 'Teknik', 'internal', 'standard', 84, TRUE),
  ('77777777-7777-4777-8777-777777777704', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'MAINT-PLUMB', 'Acil tesisat mudahalesi', 'maintenance', 'Su kacagi, gider tikanikligi ve acil tesisat onarimi.', 980000, 'TRY', 4, 'allow', TRUE, FALSE, 'Teknik', 'vendor', 'emergency', 91, TRUE),
  ('77777777-7777-4777-8777-777777777705', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'TRANSFER-AYT', 'Antalya havalimani transferi', 'transfer', 'Malik, kiraci ve misafirler icin planli transfer.', 450000, 'TRY', 48, 'block_until_clear', TRUE, FALSE, 'Rezervasyon', 'vendor', 'premium', 79, TRUE),
  ('77777777-7777-4777-8777-777777777706', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'AMENITY-SPA', 'Spa, fitness ve ortak alan rezervasyonu', 'amenity', 'Ortak alan kapasitesi, aidat durumu ve yetki kontrolu.', 0, 'TRY', 12, 'block_until_clear', FALSE, FALSE, 'Sakin destek', 'internal', 'standard', 73, TRUE),
  ('77777777-7777-4777-8777-777777777707', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'SEC-ACCESS', 'Kart, QR ve plaka erisim islemi', 'security', 'Yeni kart/QR, plaka tanimi ve kayip kart iptali.', 90000, 'TRY', 8, 'block_until_clear', TRUE, FALSE, 'Guvenlik', 'internal', 'standard', 82, TRUE),
  ('77777777-7777-4777-8777-777777777708', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'INSP-DAMAGE', 'Hasar tespiti ve depozito raporu', 'inspection', 'Fotograf/video kanitli hasar ve depozito raporu.', 720000, 'TRY', 12, 'manager_review', FALSE, TRUE, 'Operasyon', 'internal', 'premium', 77, TRUE)
ON CONFLICT (company_id, code) DO UPDATE
SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  base_price_cents = EXCLUDED.base_price_cents,
  sla_hours = EXCLUDED.sla_hours,
  debt_policy = EXCLUDED.debt_policy,
  requires_payment = EXCLUDED.requires_payment,
  requires_deposit = EXCLUDED.requires_deposit,
  team = EXCLUDED.team,
  provider_type = EXCLUDED.provider_type,
  service_level = EXCLUDED.service_level,
  popularity_score = EXCLUDED.popularity_score,
  active = EXCLUDED.active,
  updated_at = NOW();

WITH ticket_catalog AS (
  SELECT
    t.id AS ticket_id,
    t.company_id,
    t.site_id,
    t.unit_id,
    t.resident_id,
    t.ticket_no,
    t.status AS ticket_status,
    t.requires_finance_approval,
    t.estimated_cost_cents,
    t.sla_due_at,
    c.id AS catalog_id,
    c.team,
    row_number() OVER (ORDER BY t.ticket_no) AS rn
  FROM public.service_tickets t
  JOIN public.service_catalog c
    ON c.company_id = t.company_id
   AND c.code = CASE
      WHEN t.category ILIKE '%Tesisat%' THEN 'MAINT-PLUMB'
      WHEN t.category ILIKE '%Klima%' OR t.category ILIKE '%Iklim%' THEN 'MAINT-AC'
      WHEN t.category ILIKE '%Temiz%' THEN 'CLEAN-STD'
      WHEN t.category ILIKE '%Depozito%' OR t.category ILIKE '%Hasar%' THEN 'INSP-DAMAGE'
      WHEN t.category ILIKE '%Erisim%' OR t.category ILIKE '%Guven%' OR t.category ILIKE '%Kamera%' THEN 'SEC-ACCESS'
      ELSE 'AMENITY-SPA'
    END
  WHERE t.company_id = '11111111-1111-4111-8111-111111111111'
)
INSERT INTO public.service_orders (
  company_id,
  site_id,
  service_catalog_id,
  ticket_id,
  unit_id,
  resident_id,
  order_no,
  status,
  debt_check_status,
  payment_decision,
  quoted_price_cents,
  requested_for_at,
  next_action
)
SELECT
  company_id,
  site_id,
  catalog_id,
  ticket_id,
  unit_id,
  resident_id,
  'ORD-' || replace(ticket_no, 'SRV-', ''),
  CASE
    WHEN requires_finance_approval THEN 'blocked'
    WHEN ticket_status IN ('assigned', 'in_progress') THEN 'assigned'
    WHEN ticket_status IN ('resolved', 'closed') THEN 'completed'
    ELSE 'debt_check'
  END,
  CASE WHEN requires_finance_approval THEN 'blocked' ELSE 'clear' END,
  CASE
    WHEN requires_finance_approval THEN 'hold'
    WHEN COALESCE(estimated_cost_cents, 0) = 0 THEN 'no_charge'
    ELSE 'paid_or_debit_approved'
  END,
  COALESCE(estimated_cost_cents, 0),
  sla_due_at,
  CASE WHEN requires_finance_approval THEN 'Finance approval before dispatch.' ELSE 'Assign by SLA and team capacity.' END
FROM ticket_catalog
ON CONFLICT (company_id, order_no) DO UPDATE
SET
  status = EXCLUDED.status,
  debt_check_status = EXCLUDED.debt_check_status,
  payment_decision = EXCLUDED.payment_decision,
  quoted_price_cents = EXCLUDED.quoted_price_cents,
  next_action = EXCLUDED.next_action,
  updated_at = NOW();

WITH order_source AS (
  SELECT
    o.id AS order_id,
    o.company_id,
    o.site_id,
    o.ticket_id,
    o.unit_id,
    o.order_no,
    o.status AS order_status,
    o.debt_check_status,
    t.title,
    t.priority,
    t.status AS ticket_status,
    t.sla_due_at,
    t.estimated_cost_cents,
    c.team,
    s.id AS staff_member_id,
    row_number() OVER (ORDER BY o.order_no) AS rn
  FROM public.service_orders o
  LEFT JOIN public.service_tickets t ON t.id = o.ticket_id
  LEFT JOIN public.service_catalog c ON c.id = o.service_catalog_id
  LEFT JOIN LATERAL (
    SELECT sm.id
    FROM public.staff_members sm
    WHERE sm.company_id = o.company_id
      AND (sm.team = c.team OR sm.access_scope IN ('field_only', 'all_site'))
    ORDER BY sm.active_tasks ASC, sm.name ASC
    LIMIT 1
  ) s ON TRUE
  WHERE o.company_id = '11111111-1111-4111-8111-111111111111'
)
INSERT INTO public.workforce_tasks (
  company_id,
  site_id,
  service_order_id,
  ticket_id,
  unit_id,
  assigned_staff_member_id,
  task_no,
  title,
  team,
  status,
  priority,
  sla_due_at,
  route_slot,
  checklist,
  requires_media,
  media_count,
  manager_approval_required,
  completion_readiness,
  field_note
)
SELECT
  company_id,
  site_id,
  order_id,
  ticket_id,
  unit_id,
  staff_member_id,
  'TASK-' || replace(order_no, 'ORD-', ''),
  COALESCE(title, order_no),
  COALESCE(team, 'Operasyon'),
  CASE
    WHEN order_status = 'blocked' THEN 'waiting_payment'
    WHEN ticket_status IN ('assigned', 'in_progress', 'resolved', 'closed', 'cancelled') THEN ticket_status
    ELSE 'open'
  END,
  CASE WHEN priority = 'normal' THEN 'medium' ELSE COALESCE(priority, 'medium') END,
  sla_due_at,
  CASE WHEN sla_due_at < NOW() THEN 'Immediate' WHEN rn % 3 = 0 THEN 'Morning' WHEN rn % 3 = 1 THEN 'Midday' ELSE 'Evening' END,
  '["Verify request","Upload before photo","Add field note","Upload closure proof"]'::JSONB,
  TRUE,
  CASE WHEN ticket_status IN ('resolved', 'closed') THEN 2 ELSE 0 END,
  debt_check_status = 'blocked' OR COALESCE(estimated_cost_cents, 0) >= 700000,
  CASE
    WHEN ticket_status IN ('resolved', 'closed') THEN 88
    WHEN ticket_status = 'in_progress' THEN 64
    WHEN ticket_status = 'assigned' THEN 48
    ELSE 22
  END,
  CASE WHEN debt_check_status = 'blocked' THEN 'Finance approval is pending.' ELSE 'Assignment and evidence flow are ready.' END
FROM order_source
ON CONFLICT (company_id, task_no) DO UPDATE
SET
  status = EXCLUDED.status,
  priority = EXCLUDED.priority,
  sla_due_at = EXCLUDED.sla_due_at,
  route_slot = EXCLUDED.route_slot,
  manager_approval_required = EXCLUDED.manager_approval_required,
  completion_readiness = EXCLUDED.completion_readiness,
  field_note = EXCLUDED.field_note,
  updated_at = NOW();
