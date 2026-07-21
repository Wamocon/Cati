-- Add email to public.profiles.
--
-- The people directory, role governance and buyer pipeline all select
-- profiles.email (e.g. lib/role-governance-repository.ts, lib/buyer-pipeline-
-- repository.ts, lib/tenant-access-repository.ts). The column never existed, so
-- those reads failed at runtime with "column profiles.email does not exist",
-- surfacing a red error on the Users and Leads pages. Email is owned by
-- auth.users; we mirror it onto profiles and keep it in sync.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing rows from auth.users.
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id
  AND (p.email IS DISTINCT FROM u.email);

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles (email);

-- Recreate the signup trigger to also capture email at creation time.
-- Body mirrors migration 00000000000025 with the email column added.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_language TEXT := lower(COALESCE(NEW.raw_user_meta_data->>'language', 'tr'));
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language, company_id, email)
  VALUES (
    NEW.id,
    NULLIF(btrim(NEW.raw_user_meta_data->>'full_name'), ''),
    'tenant',
    CASE WHEN v_language IN ('tr', 'en', 'de', 'ru') THEN v_language ELSE 'tr' END,
    NULL,
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Keep profiles.email in sync when a user's auth email changes.
CREATE OR REPLACE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email,
      updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  WHEN (NEW.email IS DISTINCT FROM OLD.email)
  EXECUTE FUNCTION public.sync_profile_email();
