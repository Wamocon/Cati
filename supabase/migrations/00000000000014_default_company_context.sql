-- Keep live document uploads and RLS-scoped CRM records from depending on local seed/import data.
-- The app still scopes all records to a company; this migration ensures the default one exists.

INSERT INTO public.companies (name, slug, status, primary_locale, timezone, currency)
VALUES ('Ataberk Estate', 'ataberk-estate', 'active', 'tr', 'Europe/Istanbul', 'EUR')
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  primary_locale = COALESCE(public.companies.primary_locale, EXCLUDED.primary_locale),
  timezone = COALESCE(public.companies.timezone, EXCLUDED.timezone),
  updated_at = NOW();

UPDATE public.profiles
SET
  company_id = public.default_company_id(),
  updated_at = NOW()
WHERE company_id IS NULL
  AND public.default_company_id() IS NOT NULL;
