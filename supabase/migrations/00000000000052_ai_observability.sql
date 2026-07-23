-- AI observability sink (Phase 1 of the AI re-architecture).
--
-- One append-only row per AI call across both AI surfaces:
--   * /api/ai/chat        (dashboard, authenticated, role-scoped)
--   * /api/ai/public-chat (public landing concierge, anonymous, data-blind)
--
-- This table stores ONLY structured metadata about each call -- never the raw
-- prompt, reply, or any PII. `message_chars` is the input length, not the text.
-- Rows are written best-effort from the API routes via the SERVICE ROLE client
-- (which bypasses RLS); a write failure never affects the AI response.
--
-- Security model (mirrors migration 41 "grant hardening", per LESSONS-LEARNED #7):
--   * RLS is ON.
--   * A user can read their OWN traces (user_id = auth.uid()).
--   * Company admins/managers can read traces within their own company
--     (reuses the mig 48/50 company-scope + role helpers).
--   * There is NO authenticated INSERT: writes go only through the service role.
--     INSERT/UPDATE/DELETE are REVOKEd from `authenticated`; SELECT is granted so
--     the two read policies can function; anon has no access at all.
--
-- Supabase default privileges GRANT full DML on new tables to `authenticated`, so
-- a plain "REVOKE ALL FROM anon" would leave that grant in place. We must
-- explicitly REVOKE the write grants from `authenticated` (see mig 41).
--
-- NOTE: like every migration in this repo, a green local-seed e2e run does NOT
-- exercise this SQL (the suite runs with Supabase blanked). This migration MUST be
-- applied to the Supabase cloud project and validated against real Postgres
-- (`supabase db push --db-url "$SUPABASE_DB_URL"`), per LESSONS-LEARNED #4.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ai_request_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Which AI surface produced this trace.
  surface TEXT NOT NULL CHECK (surface IN ('dashboard', 'public')),
  -- Actor + tenant scope. NULL for the anonymous public concierge. Intentionally
  -- NOT foreign-keyed: this is a decoupled observability sink, so a best-effort
  -- insert can never fail on a missing/soft-deleted parent row.
  user_id UUID,
  company_id UUID,
  role TEXT,
  language TEXT,
  -- The resolved response source: rbac-guard | deterministic-fallback |
  -- deterministic-language-guard | local-ai | public-knowledge.
  source TEXT NOT NULL,
  -- Gateway execution metadata (only present when the local-AI path actually ran;
  -- threaded through from completeWithLocalAi, otherwise NULL).
  model TEXT,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  latency_ms INTEGER,
  -- Safety-evaluation signals derived from the existing evaluation objects
  -- (operations-ai-safety-v2 / public-ai-safety-v2). Booleans, never free text.
  injection_detected BOOLEAN NOT NULL DEFAULT FALSE,
  grounded BOOLEAN,
  out_of_scope BOOLEAN NOT NULL DEFAULT FALSE,
  refused BOOLEAN NOT NULL DEFAULT FALSE,
  -- Length of the user input in characters. NOT the message text -- no raw
  -- prompt / PII is ever persisted here.
  message_chars INTEGER
);

-- Indexes for the two read policies + time-ordered dashboards.
CREATE INDEX IF NOT EXISTS idx_ai_request_traces_user
  ON public.ai_request_traces (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_traces_company
  ON public.ai_request_traces (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_request_traces_surface_created
  ON public.ai_request_traces (surface, created_at DESC);

ALTER TABLE public.ai_request_traces ENABLE ROW LEVEL SECURITY;

-- A user reads only their own traces.
DROP POLICY IF EXISTS "Users read own AI traces" ON public.ai_request_traces;
CREATE POLICY "Users read own AI traces"
  ON public.ai_request_traces FOR SELECT
  USING (user_id = auth.uid());

-- Company admins/managers read traces within their own company. Gated to those
-- two roles via the mig 48/50 active-profile role helper, and scoped to the
-- caller's company via current_user_company_id(). is_super_admin() (role = admin)
-- keeps platform-admin visibility consistent with the rest of the schema.
DROP POLICY IF EXISTS "Admins and managers read company AI traces" ON public.ai_request_traces;
CREATE POLICY "Admins and managers read company AI traces"
  ON public.ai_request_traces FOR SELECT
  USING (
    public.is_super_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_user_company_id()
      AND public.current_user_profile_role() IN ('admin', 'manager')
    )
  );

-- No INSERT/UPDATE/DELETE policy exists: writes go ONLY through the service role
-- (which bypasses RLS). There is intentionally no authenticated write path.

-- Grant hardening (mirror migration 41). Remove the Supabase-default DML grant
-- from `authenticated`, keep SELECT so the read policies function, deny anon.
REVOKE ALL ON public.ai_request_traces FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_request_traces FROM authenticated;
GRANT SELECT ON public.ai_request_traces TO authenticated;

COMMIT;
