-- Phase 12-14 foundation:
-- mobile-friendly web/PWA readiness, offline sync queue, provider placeholders,
-- and guardrailed AI recommendation/image-proof workflow records.

CREATE TABLE IF NOT EXISTS public.mobile_web_capabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  capability_code TEXT NOT NULL,
  title TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('manager', 'staff', 'resident', 'all')),
  surface TEXT NOT NULL CHECK (surface IN ('Responsive Web', 'Installable PWA', 'Offline Queue', 'Touch UX', 'Accessibility')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'provider_ready', 'needs_device_test')),
  priority TEXT NOT NULL DEFAULT 'important' CHECK (priority IN ('core', 'important', 'later')),
  description TEXT NOT NULL,
  evidence TEXT,
  qa_signal TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, capability_code)
);

CREATE TABLE IF NOT EXISTS public.offline_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  job_code TEXT NOT NULL,
  role_key TEXT NOT NULL CHECK (role_key IN ('manager', 'staff', 'owner', 'tenant')),
  module_key TEXT NOT NULL CHECK (module_key IN ('tickets', 'calendar', 'documents', 'communications', 'dashboard')),
  action_label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('synced', 'queued', 'conflict', 'read_only_cached')),
  device_label TEXT,
  last_sync_at TIMESTAMPTZ,
  retry_policy TEXT,
  data_scope TEXT,
  guardrail TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, job_code)
);

CREATE TABLE IF NOT EXISTS public.integration_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Supabase', 'Payments', 'Banking', 'SMS', 'Email', 'Access', 'Camera', 'Identity', 'Ticketing')),
  provider_name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('live', 'simulation', 'placeholder', 'provider_ready')),
  status TEXT NOT NULL CHECK (status IN ('connected', 'demo_ready', 'blocked_pending_client', 'manual_fallback')),
  ideal_now TEXT NOT NULL,
  scale_path TEXT,
  required_from_client TEXT,
  data_handled TEXT,
  fallback TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, provider_code)
);

CREATE TABLE IF NOT EXISTS public.ai_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  recommendation_code TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('daily_briefing', 'service_triage', 'debt_risk', 'booking_review', 'report_draft', 'integration_advice', 'natural_language_search')),
  title TEXT NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('admin', 'manager', 'accountant', 'staff', 'resident')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'human_review', 'provider_ready')),
  confidence INTEGER NOT NULL DEFAULT 0 CHECK (confidence BETWEEN 0 AND 100),
  language_support TEXT[] NOT NULL DEFAULT ARRAY['tr'],
  source_records TEXT[] NOT NULL DEFAULT '{}',
  recommendation TEXT NOT NULL,
  human_approval TEXT NOT NULL,
  model_fit TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, recommendation_code)
);

CREATE TABLE IF NOT EXISTS public.ai_image_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  workflow_code TEXT NOT NULL,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('service_photo', 'checkout_photo', 'document_scan', 'camera_event')),
  status TEXT NOT NULL DEFAULT 'mock_ready' CHECK (status IN ('mock_ready', 'provider_ready', 'human_review')),
  ai_use TEXT NOT NULL,
  guardrail TEXT NOT NULL,
  output_description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, workflow_code)
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_jobs_status ON public.offline_sync_jobs(company_id, status, module_key);
CREATE INDEX IF NOT EXISTS idx_integration_providers_status ON public.integration_providers(company_id, category, status);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_mode ON public.ai_recommendations(company_id, mode, status);
CREATE INDEX IF NOT EXISTS idx_ai_image_workflows_status ON public.ai_image_workflows(company_id, source_type, status);

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'mobile_web_capabilities',
    'offline_sync_jobs',
    'integration_providers',
    'ai_recommendations',
    'ai_image_workflows'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table_name);

    EXECUTE format('DROP POLICY IF EXISTS "Company members can read phase 12 14" ON public.%I', v_table_name);
    EXECUTE format(
      'CREATE POLICY "Company members can read phase 12 14" ON public.%I FOR SELECT USING (public.is_super_admin() OR company_id = public.current_user_company_id())',
      v_table_name
    );

    EXECUTE format('DROP POLICY IF EXISTS "Admins manage phase 12 14" ON public.%I', v_table_name);
    EXECUTE format(
      'CREATE POLICY "Admins manage phase 12 14" ON public.%I FOR ALL USING ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70) WITH CHECK ((public.is_super_admin() OR company_id = public.current_user_company_id()) AND public.current_user_role_level() >= 70)',
      v_table_name
    );
  END LOOP;
END $$;
