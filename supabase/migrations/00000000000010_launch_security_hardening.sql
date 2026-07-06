-- Phase 15 launch security hardening.
-- Keeps demo/QA convenience out of production data boundaries.

REVOKE EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) TO authenticated;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    NEW.role IS DISTINCT FROM OLD.role OR
    NEW.company_id IS DISTINCT FROM OLD.company_id OR
    NEW.office_id IS DISTINCT FROM OLD.office_id
  ) AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Profile role, company and office assignments require an administrator.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'tenant',
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Authenticated users can read private cati documents" ON storage.objects;
    DROP POLICY IF EXISTS "Managers can read private cati documents" ON storage.objects;
    CREATE POLICY "Managers can read private cati documents"
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'cati-documents'
        AND auth.role() = 'authenticated'
        AND public.current_user_role_level() >= public.role_level('manager')
      );

    DROP POLICY IF EXISTS "Authenticated users can upload private cati documents" ON storage.objects;
    DROP POLICY IF EXISTS "Authenticated users can upload own private cati documents" ON storage.objects;
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
