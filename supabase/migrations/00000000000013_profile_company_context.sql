-- Ensure production signups have a company context for RLS-scoped CRM data.
-- Role elevation remains an explicit administrator/service-role action.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language, company_id)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    'tenant',
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr'),
    public.default_company_id()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    language = COALESCE(EXCLUDED.language, public.profiles.language),
    company_id = COALESCE(public.profiles.company_id, EXCLUDED.company_id),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET
  company_id = public.default_company_id(),
  updated_at = NOW()
WHERE company_id IS NULL
  AND public.default_company_id() IS NOT NULL;
