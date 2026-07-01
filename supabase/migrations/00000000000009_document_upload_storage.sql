-- Phase 11/15 hardening: private document upload storage.
-- Binary files live in private object storage. Postgres keeps searchable,
-- auditable metadata and review state.

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'supabase-storage'
    CHECK (storage_provider IN ('supabase-storage', 'demo-object-store', 'external-s3')),
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS size_bytes BIGINT CHECK (size_bytes IS NULL OR size_bytes >= 0),
  ADD COLUMN IF NOT EXISTS checksum_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'approved'
    CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private'
    CHECK (visibility IN ('private', 'company', 'unit')),
  ADD COLUMN IF NOT EXISTS retention_class TEXT NOT NULL DEFAULT 'general'
    CHECK (retention_class IN ('identity', 'legal', 'finance', 'service', 'guest', 'general')),
  ADD COLUMN IF NOT EXISTS uploaded_original_name TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

CREATE TABLE IF NOT EXISTS public.document_upload_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  safe_filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  storage_bucket TEXT NOT NULL DEFAULT 'cati-documents',
  storage_provider TEXT NOT NULL DEFAULT 'supabase-storage'
    CHECK (storage_provider IN ('supabase-storage', 'demo-object-store', 'external-s3')),
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  checksum_sha256 TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'stored'
    CHECK (upload_status IN ('stored', 'demo_stored', 'failed', 'quarantined')),
  review_status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
  virus_scan_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (virus_scan_status IN ('pending', 'clean', 'infected', 'not_connected')),
  retention_class TEXT NOT NULL DEFAULT 'general'
    CHECK (retention_class IN ('identity', 'legal', 'finance', 'service', 'guest', 'general')),
  requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  requester_role TEXT NOT NULL,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, checksum_sha256, file_path)
);

ALTER TABLE public.document_upload_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read document uploads" ON public.document_upload_requests;
CREATE POLICY "Company members can read document uploads"
  ON public.document_upload_requests
  FOR SELECT
  USING (public.is_super_admin() OR company_id = public.current_user_company_id());

DROP POLICY IF EXISTS "Company members can request document uploads" ON public.document_upload_requests;
CREATE POLICY "Company members can request document uploads"
  ON public.document_upload_requests
  FOR INSERT
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 10
  );

DROP POLICY IF EXISTS "Managers can manage document uploads" ON public.document_upload_requests;
CREATE POLICY "Managers can manage document uploads"
  ON public.document_upload_requests
  FOR UPDATE
  USING (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 70
  )
  WITH CHECK (
    (public.is_super_admin() OR company_id = public.current_user_company_id())
    AND public.current_user_role_level() >= 70
  );

CREATE INDEX IF NOT EXISTS idx_document_upload_requests_company_status
  ON public.document_upload_requests(company_id, review_status, upload_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_upload_requests_file_path
  ON public.document_upload_requests(storage_bucket, file_path);

DROP TRIGGER IF EXISTS set_document_upload_requests_updated_at ON public.document_upload_requests;
CREATE TRIGGER set_document_upload_requests_updated_at
  BEFORE UPDATE ON public.document_upload_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'cati-documents',
      'cati-documents',
      false,
      26214400,
      ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;

  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can read private cati documents" ON storage.objects;
    CREATE POLICY "Managers can read private cati documents"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'cati-documents'
        AND auth.role() = 'authenticated'
        AND public.current_user_role_level() >= public.role_level('manager')
      );

    DROP POLICY IF EXISTS "Authenticated users can upload private cati documents" ON storage.objects;
    CREATE POLICY "Authenticated users can upload own private cati documents"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'cati-documents'
        AND auth.role() = 'authenticated'
        AND owner = auth.uid()
      );
  END IF;
END;
$$;
