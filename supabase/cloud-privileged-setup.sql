-- ============================================================================
-- 1Çatı, Cloud privileged setup (run in the Supabase Dashboard SQL Editor)
-- ============================================================================
-- Migrations 0–36 apply cleanly through `supabase db push` / the DB-owner role.
-- However, three RLS/bucket objects are owned by Supabase-internal roles
-- (supabase_storage_admin, supabase_realtime_admin) that the `postgres`
-- migration role cannot ALTER. Migration 27 therefore SKIPS them gracefully on
-- hosted Supabase (private buckets, data-table RLS and service-role writes are
-- still fully enforced, this file is defense-in-depth hardening).
--
-- Run this ONCE in Dashboard → SQL Editor (which has the required privileges).
-- It is idempotent. If a statement still reports "must be owner", apply the
-- storage policy via Dashboard → Storage → Policies and the realtime policy via
-- Dashboard → Database → Realtime authorization instead.
-- ============================================================================

-- 1) Private evidence bucket -------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cati-service-evidence', 'cati-service-evidence', FALSE, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) storage.objects restrictive guard for the evidence bucket ---------------
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_evidence_object_direct_access_guard ON storage.objects;
CREATE POLICY service_evidence_object_direct_access_guard
  ON storage.objects
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (bucket_id <> 'cati-service-evidence')
  WITH CHECK (bucket_id <> 'cati-service-evidence');

-- 3) realtime.messages private-broadcast authorization for service-proof ------
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_evidence_private_broadcast_read ON realtime.messages;
DROP POLICY IF EXISTS service_evidence_private_broadcast_guard ON realtime.messages;
DROP POLICY IF EXISTS service_evidence_private_broadcast_insert_guard ON realtime.messages;

CREATE POLICY service_evidence_private_broadcast_read
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    extension = 'broadcast'
    AND public.current_user_can_subscribe_service_evidence_topic((SELECT realtime.topic()))
  );

CREATE POLICY service_evidence_private_broadcast_guard
  ON realtime.messages AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    (SELECT realtime.topic()) NOT LIKE 'service-proof:%'
    OR (
      extension = 'broadcast'
      AND public.current_user_can_subscribe_service_evidence_topic((SELECT realtime.topic()))
    )
  );

CREATE POLICY service_evidence_private_broadcast_insert_guard
  ON realtime.messages AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK ((SELECT realtime.topic()) NOT LIKE 'service-proof:%');
