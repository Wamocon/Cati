-- AI conversation memory (Phase 4 of the AI re-architecture).
--
-- Per-user + per-role conversation memory for the DASHBOARD assistant ONLY
-- (/api/ai/chat). The public landing concierge (/api/ai/public-chat) stays
-- data-blind and NEVER writes here.
--
-- Two RLS-owned tables:
--   * public.ai_conversations - one running thread per (user, role_at_time,
--     surface). role_at_time is stamped so a ROLE SWITCH starts a fresh thread and
--     can never inherit another role's prior context (retrieval filters on it).
--     running_summary holds a cheap, deterministic roll-up of older turns.
--   * public.ai_messages       - the raw user/assistant turns of a conversation,
--     cascade-deleted with their parent.
--
-- Security model (mirrors migration 41 "grant hardening", per LESSONS-LEARNED #7,
-- and the sibling AI observability table in migration 52):
--   * RLS is ON on both tables.
--   * A user reads/writes ONLY their OWN memory: conversations by
--     user_id = auth.uid(); messages via the owning conversation. This is the hard
--     leak boundary -- memory can never widen scope.
--   * Admin/manager get a SELECT-ONLY, company-scoped read policy (the
--     "hierarchy sees broader context" rule): company_id = current_user_company_id()
--     AND current_user_profile_role() IN ('admin','manager'). They NEVER write or
--     update another user's memory. is_super_admin() keeps platform-admin visibility
--     consistent with the rest of the schema.
--   * Writes: the CALLER inserts their own rows under their own JWT (INSERT policy
--     with-check user_id = auth.uid() on conversations; via the owning conversation
--     for messages). The route persists memory under the caller JWT, not the service
--     role.
--   * The owner may UPDATE only running_summary + last_active_at on their OWN
--     conversation. Column-level GRANT UPDATE(running_summary, last_active_at)
--     enforces which columns can change; the own-row UPDATE policy enforces which
--     rows. No other column (user_id, role_at_time, company_id, expires_at) is
--     writable by authenticated.
--   * The owner may DELETE their own raw messages (append-then-summarize pruning is
--     a legitimate own-data operation). No DELETE on ai_conversations for
--     authenticated: conversation lifecycle stays with the KVKK erasure RPC below
--     and the scheduled retention purge.
--   * Supabase default privileges GRANT full DML on new tables to `authenticated`,
--     so a plain "REVOKE ALL FROM anon" is not enough. We explicitly REVOKE the
--     write grants from `authenticated` and re-GRANT only what the policies need.
--
-- KVKK / retention:
--   * Every conversation carries expires_at (default now() + 90 days). The memory
--     reader IGNORES expired conversations (never resumes them). A SECURITY DEFINER
--     purge_expired_ai_conversations() is provided for a scheduled service-role job
--     (pg_cron or an external cron) to physically delete expired rows; pg_cron is
--     NOT required.
--   * KVKK erasure: admin_anonymize_user (mig-49) is re-declared here to ALSO delete
--     the person's ai_conversations (messages cascade), so removing a person erases
--     their AI memory. The body is the CURRENT mig-49 version VERBATIM; the ONLY
--     change is the added DELETE. (mig-49 is the latest definition -- mig-50 only
--     references it in comments and does not redefine it.)
--
-- NOTE: like every migration in this repo, a green local-seed e2e run does NOT
-- exercise this SQL (the suite runs with Supabase blanked, so the memory layer is a
-- no-op). This migration MUST be applied to the Supabase cloud project and validated
-- against real Postgres (`supabase db push --db-url "$SUPABASE_DB_URL"`), per
-- LESSONS-LEARNED #4.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- The owning user. Intentionally NOT foreign-keyed to auth.users so a
  -- best-effort insert never fails on a race; RLS binds it to auth.uid().
  user_id uuid NOT NULL,
  -- Tenant scope for the admin/manager broader-context read policy.
  company_id uuid,
  -- The user's ACTIVE role when the thread started. A role switch filters to a
  -- different value, so context never crosses roles.
  role_at_time text NOT NULL,
  -- Dashboard-only memory. A CHECK keeps the public concierge out by construction.
  surface text NOT NULL DEFAULT 'dashboard' CHECK (surface IN ('dashboard')),
  -- Deterministic roll-up of older turns (KVKK-bounded, capped by the app layer).
  running_summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  -- Retention horizon. Reader ignores rows past this; purge deletes them.
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE TABLE IF NOT EXISTS public.ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL
    REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'assistant')),
  content text,
  language text,
  -- The resolved response source for an assistant turn (local-ai,
  -- deterministic-fallback, ...); 'user' for a user turn.
  source text,
  tokens integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. Indexes (resume-by-user, retention purge, message ordering, admin reads).
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_active
  ON public.ai_conversations (user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_expires
  ON public.ai_conversations (expires_at);
CREATE INDEX IF NOT EXISTS idx_ai_conversations_company_active
  ON public.ai_conversations (company_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conversation_created
  ON public.ai_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;

-- 3a. ai_conversations: a user reads their own thread.
DROP POLICY IF EXISTS "Users read own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users read own AI conversations"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- 3b. ai_conversations: admin/manager read (SELECT only) within their company.
--     This is the hierarchy "broader context" read; it is never a write path.
DROP POLICY IF EXISTS "Admins and managers read company AI conversations"
  ON public.ai_conversations;
CREATE POLICY "Admins and managers read company AI conversations"
  ON public.ai_conversations FOR SELECT TO authenticated
  USING (
    public.is_super_admin()
    OR (
      company_id IS NOT NULL
      AND company_id = public.current_user_company_id()
      AND public.current_user_profile_role() IN ('admin', 'manager')
    )
  );

-- 3c. ai_conversations: the caller inserts only their OWN thread.
DROP POLICY IF EXISTS "Users insert own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users insert own AI conversations"
  ON public.ai_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 3d. ai_conversations: the owner may UPDATE their own thread. WHICH columns
--     (running_summary, last_active_at) is enforced by the column-level GRANT
--     below; this policy enforces WHICH rows and forbids re-homing the row.
DROP POLICY IF EXISTS "Users update own AI conversations" ON public.ai_conversations;
CREATE POLICY "Users update own AI conversations"
  ON public.ai_conversations FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- 3e. ai_messages: a user reads the messages of their own conversation.
DROP POLICY IF EXISTS "Users read own AI messages" ON public.ai_messages;
CREATE POLICY "Users read own AI messages"
  ON public.ai_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- 3f. ai_messages: admin/manager read (SELECT only) messages of company threads.
DROP POLICY IF EXISTS "Admins and managers read company AI messages"
  ON public.ai_messages;
CREATE POLICY "Admins and managers read company AI messages"
  ON public.ai_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND (
          public.is_super_admin()
          OR (
            c.company_id IS NOT NULL
            AND c.company_id = public.current_user_company_id()
            AND public.current_user_profile_role() IN ('admin', 'manager')
          )
        )
    )
  );

-- 3g. ai_messages: the caller inserts messages only into their OWN conversation.
DROP POLICY IF EXISTS "Users insert own AI messages" ON public.ai_messages;
CREATE POLICY "Users insert own AI messages"
  ON public.ai_messages FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- 3h. ai_messages: the owner may DELETE their own raw messages (summarize-and-prune).
DROP POLICY IF EXISTS "Users delete own AI messages" ON public.ai_messages;
CREATE POLICY "Users delete own AI messages"
  ON public.ai_messages FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Grant hardening (mirror migrations 41 / 44 / 52).
--    Strip the Supabase-default DML grant from `authenticated`, then re-grant
--    exactly what the policies above need. anon gets nothing.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.ai_conversations FROM anon;
REVOKE ALL ON public.ai_messages FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.ai_conversations FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ai_messages FROM authenticated;

-- Conversations: read + insert own; update only two columns on own rows; NO delete.
GRANT SELECT, INSERT ON public.ai_conversations TO authenticated;
GRANT UPDATE (running_summary, last_active_at) ON public.ai_conversations TO authenticated;

-- Messages: read + insert + delete own (via the owning conversation); NO update
-- (turns are append-only facts).
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. KVKK erasure. Re-declare admin_anonymize_user with the CURRENT mig-49 body
--    VERBATIM plus ONE added statement: delete the person's ai_conversations
--    (ai_messages cascade), so anonymizing a user erases their AI memory too.
--    CREATE OR REPLACE preserves the mig-49 grant; we re-assert it defensively.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_anonymize_user(
  p_profile_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := (SELECT auth.uid());
  v_target public.profiles%ROWTYPE;
  v_reason text;
BEGIN
  -- Authorize + lock the target first (also blocks the platform admin tier).
  v_target := public.assert_user_role_admin(p_profile_id);

  IF p_reason IS NULL OR length(btrim(p_reason)) < 10 THEN
    RAISE EXCEPTION 'A removal reason of at least 10 characters is required.'
      USING ERRCODE = '22023';
  END IF;
  v_reason := btrim(p_reason);

  -- Defense in depth; assert_user_role_admin already rejects the admin tier.
  IF v_target.role = 'admin' THEN
    RAISE EXCEPTION
      'The administrator tier is platform-provisioned and cannot be removed here.'
      USING ERRCODE = '42501';
  END IF;

  -- Scrub personally-identifiable fields in place.
  UPDATE public.profiles
  SET
    full_name = 'Removed user',
    email = NULL,
    phone = NULL,
    avatar_url = NULL,
    date_of_birth = NULL,
    age_band = NULL,
    is_minor = false,
    consent_recorded_at = NULL,
    consent_by = NULL,
    is_active = false,
    deactivated_at = now(),
    anonymized_at = now(),
    anonymized_by = v_actor_id,
    removal_reason = v_reason,
    updated_at = now()
  WHERE id = p_profile_id;

  -- Sever all business-role assignments (profiles.role is left intact so the
  -- managed_user_json projection still resolves a single primary role).
  DELETE FROM public.profile_role_assignments
  WHERE profile_id = p_profile_id;

  -- Soft-revoke any guardianship where this profile is the guardian or the
  -- managed child.
  UPDATE public.guardianships
  SET status = 'revoked',
      revoked_at = now()
  WHERE (guardian_profile_id = p_profile_id OR child_profile_id = p_profile_id)
    AND status <> 'revoked';

  -- Phase-4 addition (KVKK): erase this person's dashboard AI conversation memory.
  -- ai_messages are removed by the ON DELETE CASCADE from ai_conversations.
  DELETE FROM public.ai_conversations
  WHERE user_id = p_profile_id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_target.company_id, v_actor_id, 'user.anonymized',
    'profiles', p_profile_id,
    jsonb_build_object('reason', v_reason)
  );

  RETURN public.managed_user_json(p_profile_id);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_anonymize_user(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_user(uuid, text)
  TO authenticated;

COMMENT ON FUNCTION public.admin_anonymize_user(uuid, text) IS
  'KVKK/GDPR soft delete: scrubs PII in place, deactivates, severs role assignments, revokes guardianships, ERASES the user''s AI conversation memory (ai_conversations + cascaded ai_messages), and audit-logs the reason; organization admin only, never the admin tier. Never hard-deletes the profile or the finance/audit rows that reference it.';

-- ---------------------------------------------------------------------------
-- 6. Scheduled retention purge (service-role only; pg_cron NOT required).
--    Physically deletes conversations past their retention horizon (messages
--    cascade). Intended for a scheduled job that runs as the service role /
--    a superuser. Revoked from PUBLIC, anon and authenticated so a client can
--    never trigger a mass delete; the SECURITY DEFINER body bypasses RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.purge_expired_ai_conversations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.ai_conversations
  WHERE expires_at < now();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_expired_ai_conversations()
  FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.purge_expired_ai_conversations() IS
  'Retention purge for AI conversation memory: deletes conversations past expires_at (messages cascade). Run on a schedule as the service role (pg_cron or external cron). Not callable by anon/authenticated.';

COMMENT ON TABLE public.ai_conversations IS
  'Per-user, per-role dashboard AI conversation threads. RLS: the owner reads/writes own rows, admin/manager read company rows (SELECT only). role_at_time stops context crossing roles; expires_at (90d) bounds retention; anonymizing the user erases these rows.';
COMMENT ON TABLE public.ai_messages IS
  'Raw user/assistant turns of an ai_conversations thread (cascade-deleted with it). RLS via the owning conversation; owner may prune own messages, never update them.';

-- ---------------------------------------------------------------------------
-- 7. Realtime publication (guarded / optional; matches migs 4 / 43 / 44).
--    Not required for memory, but keeps parity so a future live memory panel can
--    subscribe. Guarded so a missing publication never fails the migration.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['ai_conversations', 'ai_messages']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables AS t
      WHERE t.table_schema = 'public' AND t.table_name = v_table_name
    )
    AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipping realtime publication setup; supabase_realtime is unavailable.';
END;
$$;

COMMIT;
