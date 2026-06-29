-- RBAC schema update for the 1Çatı real-estate platform.
-- Adds the canonical role set, helper functions for RLS, and tighter policies on profiles.

-- 1. Expand the set of allowed roles to match lib/rbac.ts
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN (
    'admin',
    'manager',
    'accountant',
    'staff',
    'owner',
    'tenant'
  ));

-- 2. Canonical role ordering / hierarchy level for UI sorting and inheritance checks.
CREATE OR REPLACE FUNCTION public.role_level(p_role text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin'      THEN 90
    WHEN 'manager'    THEN 70
    WHEN 'accountant' THEN 60
    WHEN 'staff'      THEN 40
    WHEN 'owner'      THEN 20
    WHEN 'tenant'     THEN 10
    ELSE 0
  END;
$$;

-- 3. Scope of a role: platform, company, office, or personal.
CREATE OR REPLACE FUNCTION public.role_scope(p_role text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE p_role
    WHEN 'admin'      THEN 'company'
    WHEN 'manager'    THEN 'site'
    WHEN 'accountant' THEN 'finance'
    WHEN 'staff'      THEN 'field'
    WHEN 'owner'      THEN 'owned_unit'
    WHEN 'tenant'     THEN 'rented_unit'
    ELSE 'rented_unit'
  END;
$$;

-- 4. Is the given role an admin role?
CREATE OR REPLACE FUNCTION public.is_admin_role(p_role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p_role = 'admin';
$$;

-- 5. Does the requesting user's role have a level >= the required level?
-- Useful for policies that want "manager or above".
CREATE OR REPLACE FUNCTION public.current_user_role_meets(min_level integer)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.role_level((auth.jwt() ->> 'role')::text) >= min_level;
$$;

-- 6. Read the current user's platform role from the profiles table.
-- Prefer this over auth.jwt() claims because JWT user_metadata can be tampered with by users.
CREATE OR REPLACE FUNCTION public.current_user_profile_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 7. Updated RLS policies on profiles.
--    - Everyone can read their own profile.
--    - Admins and managers can read any profile in the same company scope
--      (when multi-tenancy is added, scope this by company_id).
--    - Users can update only their own profile.
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins and managers can read profiles"
  ON public.profiles FOR SELECT
  USING (
    public.role_level(public.current_user_profile_role()) >= public.role_level('manager')
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 8. Ensure the signup trigger respects the expanded role set and falls back safely.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  requested_role text;
  safe_role text;
BEGIN
  requested_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');

  -- Validate against the canonical role set.
  safe_role := CASE
    WHEN requested_role IN (
      'admin','manager','accountant','staff','owner','tenant'
    ) THEN requested_role
    ELSE 'tenant'
  END;

  INSERT INTO public.profiles (id, full_name, role, language)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    safe_role,
    COALESCE(NEW.raw_user_meta_data->>'language', 'tr')
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Re-attach trigger in case it was dropped.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Indexes to keep RLS policy predicates fast.
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_office_id ON public.profiles(office_id);
