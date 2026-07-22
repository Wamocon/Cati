-- Phase-3 of the guest / vendor / guardianship role expansion: the activities /
-- extra-services catalog and its wallet-funded bookings.
--
-- This is where "New Level Premium extra services" (spa, private beach cabana,
-- airport transfer, tennis court) and the supervised under-18 activities (kids
-- club, swimming lesson, art workshop, mini-golf) live. A booking spends from the
-- booker's own wallet through the existing public.wallet_spend RPC (mig 44), so
-- there is exactly one place that moves credit and one no-negative / no-overdraft
-- invariant.
--
-- Amounts are integer minor units (kurus / cents). An activity carries a single
-- currency; the app renders dual TRY / EUR at the display layer (lib/currency.ts)
-- with no FX in the ledger.
--
-- Security model (mirrors migs 41 / 44):
--   * activities is a catalog: SELECT for every authenticated member of the
--     company; writes are RLS-restricted to same-company admin / manager.
--   * activity_bookings is written ONLY through the SECURITY DEFINER,
--     search_path='' RPCs below. Direct INSERT/UPDATE/DELETE is REVOKEd from
--     `authenticated`; only SELECT is granted and further constrained by RLS so a
--     booking is visible to the booker, an active guardian of the booker (this is
--     how a parent sees what their child booked), and same-company admin / manager
--     / accountant.
--   * Internal helper functions have EXECUTE revoked from `authenticated`; only
--     the caller-facing RPCs are granted. anon gets nothing.
--   * book_activity enforces an age gate: an 'adult' activity is refused for a
--     minor (profiles.is_minor OR a child_* role). 'under_18' is bookable by
--     minors and adults; 'all' by anyone.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  -- Optional scoping to a single site; NULL means the whole company can book it.
  site_id uuid REFERENCES public.sites(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  category text,
  age_band text NOT NULL DEFAULT 'all'
    CHECK (age_band IN ('all', 'under_18', 'adult')),
  price_cents bigint NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'TRY' CHECK (currency IN ('TRY', 'EUR')),
  capacity int CHECK (capacity IS NULL OR capacity > 0),
  image_key text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.activity_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  activity_id uuid REFERENCES public.activities(id) ON DELETE SET NULL,
  booker_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- The wallet_spend transaction that funded this booking (NULL for free ones).
  wallet_transaction_id uuid
    REFERENCES public.wallet_transactions(id) ON DELETE SET NULL,
  party_size int NOT NULL DEFAULT 1 CHECK (party_size > 0),
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'booked'
    CHECK (status IN ('booked', 'cancelled', 'completed')),
  amount_cents bigint CHECK (amount_cents IS NULL OR amount_cents >= 0),
  currency text CHECK (currency IS NULL OR currency IN ('TRY', 'EUR')),
  -- Idempotency: a retried book_activity call with the same request_key returns
  -- the original booking instead of creating a duplicate. Nullable so historical /
  -- system rows do not need a key; a partial unique index enforces uniqueness only
  -- when a key is present.
  request_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_company
  ON public.activities (company_id);
CREATE INDEX IF NOT EXISTS idx_activities_company_active
  ON public.activities (company_id, active);

CREATE INDEX IF NOT EXISTS idx_activity_bookings_activity
  ON public.activity_bookings (activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_bookings_booker
  ON public.activity_bookings (booker_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_bookings_company
  ON public.activity_bookings (company_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS ux_activity_bookings_request_key
  ON public.activity_bookings (request_key)
  WHERE request_key IS NOT NULL;

DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. Internal helper (EXECUTE revoked from authenticated at the end).
-- ---------------------------------------------------------------------------

-- Read-only JSON projection of a booking plus a slim view of its activity. The
-- command return payload of book_activity / cancel_activity_booking.
CREATE OR REPLACE FUNCTION public.activity_booking_json(p_booking_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'booking', jsonb_build_object(
      'id', b.id,
      'companyId', b.company_id,
      'activityId', b.activity_id,
      'bookerProfileId', b.booker_profile_id,
      'walletTransactionId', b.wallet_transaction_id,
      'partySize', b.party_size,
      'scheduledAt', b.scheduled_at,
      'status', b.status,
      'amountCents', b.amount_cents,
      'currency', b.currency,
      'createdAt', b.created_at
    ),
    'activity', jsonb_build_object(
      'id', a.id,
      'name', a.name,
      'category', a.category,
      'ageBand', a.age_band,
      'priceCents', a.price_cents,
      'currency', a.currency,
      'imageKey', a.image_key
    ),
    'source', 'supabase'
  )
  FROM public.activity_bookings b
  LEFT JOIN public.activities a ON a.id = b.activity_id
  WHERE b.id = p_booking_id;
$$;

-- ---------------------------------------------------------------------------
-- 3. Caller-facing RPCs (GRANT EXECUTE to authenticated at the end).
-- ---------------------------------------------------------------------------

-- Book an activity for the caller. Enforces the age gate, spends from the
-- caller's own wallet (via wallet_spend, which enforces no-negative /
-- insufficient-credit) for a priced activity, and is idempotent on
-- p_idempotency_key.
CREATE OR REPLACE FUNCTION public.book_activity(
  p_activity_id uuid,
  p_party_size int,
  p_scheduled_at timestamptz,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_role text := public.current_user_profile_role();
  v_company uuid := public.current_user_company_id();
  v_is_minor boolean;
  v_actor_role text;
  v_activity public.activities%ROWTYPE;
  v_party int := COALESCE(p_party_size, 1);
  v_amount bigint;
  v_existing public.activity_bookings%ROWTYPE;
  v_wallet jsonb;
  v_wallet_id uuid;
  v_spend jsonb;
  v_txn_id uuid;
  v_booking public.activity_bookings%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;
  IF v_party < 1 OR v_party > 50 THEN
    RAISE EXCEPTION 'The party size must be between 1 and 50.';
  END IF;

  -- Idempotent replay: return the original booking to the booker, an active
  -- guardian of the booker, or a same-company admin / manager / accountant.
  SELECT * INTO v_existing
  FROM public.activity_bookings
  WHERE request_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.booker_profile_id = v_actor
       OR public.is_active_guardian_of(v_existing.booker_profile_id)
       OR (v_role IN ('admin', 'manager', 'accountant')
           AND v_existing.company_id = v_company)
    THEN
      RETURN public.activity_booking_json(v_existing.id);
    END IF;
    RAISE EXCEPTION 'This idempotency key belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_activity FROM public.activities WHERE id = p_activity_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The activity was not found.' USING ERRCODE = '42501';
  END IF;
  -- Same-company (or global) catalog only; do not let an id from another org be
  -- booked around the catalog RLS.
  IF v_activity.company_id IS NOT NULL
     AND v_activity.company_id IS DISTINCT FROM v_company
     AND v_role <> 'admin'
  THEN
    RAISE EXCEPTION 'The activity was not found.' USING ERRCODE = '42501';
  END IF;
  IF NOT v_activity.active THEN
    RAISE EXCEPTION 'This activity is not currently bookable.';
  END IF;
  IF v_activity.capacity IS NOT NULL AND v_party > v_activity.capacity THEN
    RAISE EXCEPTION 'The party size exceeds this activity''s capacity.';
  END IF;

  -- Age gate. An 'adult' activity is refused for a minor (flagged profile OR a
  -- child_* role). 'under_18' and 'all' fall through for everyone.
  SELECT p.is_minor, p.role INTO v_is_minor, v_actor_role
  FROM public.profiles p WHERE p.id = v_actor;
  IF v_activity.age_band = 'adult'
     AND (
       COALESCE(v_is_minor, false)
       OR v_actor_role IN ('child_owner', 'child_tenant', 'child_guest')
     )
  THEN
    RAISE EXCEPTION 'This activity is restricted to adults.'
      USING ERRCODE = '42501';
  END IF;

  v_amount := v_activity.price_cents * v_party;

  -- Priced activity: spend from the caller's own wallet in the activity currency.
  -- wallet_spend locks the wallet, rejects an overdraft, and is itself idempotent
  -- on its own key, so a retried book_activity never double-charges.
  IF v_amount > 0 THEN
    v_wallet := public.ensure_user_wallet(v_activity.currency);
    v_wallet_id := ((v_wallet -> 'wallet') ->> 'id')::uuid;
    v_spend := public.wallet_spend(
      v_wallet_id,
      v_amount,
      'activity_booking',
      'Activity: ' || v_activity.name,
      p_idempotency_key || ':activity-spend'
    );
    v_txn_id := ((v_spend -> 'transaction') ->> 'id')::uuid;
  END IF;

  INSERT INTO public.activity_bookings (
    company_id, activity_id, booker_profile_id, wallet_transaction_id,
    party_size, scheduled_at, status, amount_cents, currency, request_key
  ) VALUES (
    v_activity.company_id, v_activity.id, v_actor, v_txn_id,
    v_party, p_scheduled_at, 'booked', v_amount, v_activity.currency,
    p_idempotency_key
  ) RETURNING * INTO v_booking;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_activity.company_id, v_actor, 'activity.book', 'activity_bookings',
    v_booking.id,
    jsonb_build_object(
      'activityId', v_activity.id,
      'partySize', v_party,
      'amountCents', v_amount,
      'currency', v_activity.currency,
      'walletTransactionId', v_txn_id
    )
  );

  RETURN public.activity_booking_json(v_booking.id);
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent duplicate request_key: the winning insert already funded the
    -- booking (wallet_spend is idempotent), so just return it.
    SELECT * INTO v_existing
    FROM public.activity_bookings
    WHERE request_key = p_idempotency_key;
    IF FOUND AND (
      v_existing.booker_profile_id = v_actor
      OR public.is_active_guardian_of(v_existing.booker_profile_id)
      OR (v_role IN ('admin', 'manager', 'accountant')
          AND v_existing.company_id = v_company)
    ) THEN
      RETURN public.activity_booking_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- Cancel a booking. The booker, an active guardian of the booker, or a
-- same-company admin / manager / accountant may cancel. A refund of the funding
-- transaction is posted automatically only when the caller is an admin /
-- accountant (mirrors wallet_refund's own authority guard); a booker- or
-- guardian-initiated cancellation instead records a refund request on the
-- integration outbox for accountant review, so the wallet security model is
-- never weakened. Idempotent on p_idempotency_key.
CREATE OR REPLACE FUNCTION public.cancel_activity_booking(
  p_booking_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_role text := public.current_user_profile_role();
  v_company uuid := public.current_user_company_id();
  v_booking public.activity_bookings%ROWTYPE;
  v_is_manager boolean;
  v_is_booker boolean;
  v_is_guardian boolean;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  SELECT * INTO v_booking
  FROM public.activity_bookings WHERE id = p_booking_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The booking was not found.' USING ERRCODE = '42501';
  END IF;

  v_is_booker := v_booking.booker_profile_id = v_actor;
  v_is_guardian := v_booking.booker_profile_id IS NOT NULL
    AND public.is_active_guardian_of(v_booking.booker_profile_id);
  v_is_manager := v_role IN ('admin', 'manager', 'accountant')
    AND v_booking.company_id = v_company;

  IF NOT (v_is_booker OR v_is_guardian OR v_is_manager) THEN
    RAISE EXCEPTION 'You cannot cancel this booking.' USING ERRCODE = '42501';
  END IF;

  -- Idempotent: a second cancel is a no-op that returns the current state.
  IF v_booking.status = 'cancelled' THEN
    RETURN public.activity_booking_json(v_booking.id);
  END IF;
  IF v_booking.status = 'completed' THEN
    RAISE EXCEPTION 'A completed booking cannot be cancelled.';
  END IF;

  UPDATE public.activity_bookings
  SET status = 'cancelled'
  WHERE id = v_booking.id;

  IF v_booking.wallet_transaction_id IS NOT NULL THEN
    IF v_role IN ('admin', 'accountant') THEN
      PERFORM public.wallet_refund(
        v_booking.wallet_transaction_id,
        p_idempotency_key || ':activity-refund'
      );
    ELSIF v_booking.company_id IS NOT NULL THEN
      -- Booker / guardian cancellation: hand the refund to an accountant.
      INSERT INTO public.integration_outbox (
        company_id, integration_key, action_type, entity_table, entity_id, payload
      ) VALUES (
        v_booking.company_id, 'activity.refund_requested', 'notify',
        'activity_bookings', v_booking.id,
        jsonb_build_object(
          'bookingId', v_booking.id,
          'walletTransactionId', v_booking.wallet_transaction_id,
          'amountCents', v_booking.amount_cents,
          'currency', v_booking.currency,
          'requestedBy', v_actor
        )
      );
    END IF;
  END IF;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_booking.company_id, v_actor, 'activity.cancel', 'activity_bookings',
    v_booking.id,
    jsonb_build_object(
      'activityId', v_booking.activity_id,
      'refundedByRpc', (v_role IN ('admin', 'accountant')
                        AND v_booking.wallet_transaction_id IS NOT NULL)
    )
  );

  RETURN public.activity_booking_json(v_booking.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Seed a handful of realistic activities for every existing company.
--    Idempotent: skips any (company, name) that is already present.
-- ---------------------------------------------------------------------------
INSERT INTO public.activities (
  company_id, name, description, category, age_band, price_cents, currency,
  capacity, image_key
)
SELECT
  c.id, v.name, v.description, v.category, v.age_band, v.price_cents, 'TRY',
  v.capacity, v.image_key
FROM public.companies c
CROSS JOIN (VALUES
  -- New Level Premium extra services (adult / all-ages).
  ('Spa & Hammam Session',
   'Private spa and hammam session at the wellness centre.',
   'wellness', 'adult', 150000::bigint, 2, 'activities/spa-hammam.jpg'),
  ('Private Beach Cabana',
   'Reserved beachfront cabana with sunbeds and service for the day.',
   'leisure', 'all', 250000::bigint, 6, 'activities/beach-cabana.jpg'),
  ('Airport Transfer',
   'Private door-to-door transfer to or from the airport.',
   'transport', 'all', 90000::bigint, 4, 'activities/airport-transfer.jpg'),
  ('Tennis Court (1 hour)',
   'One-hour floodlit tennis court reservation, racquets included.',
   'sports', 'adult', 40000::bigint, 4, 'activities/tennis-court.jpg'),
  -- Supervised under-18 activities.
  ('Kids Club (day pass)',
   'Supervised full-day kids club with games and craft sessions.',
   'kids', 'under_18', 30000::bigint, 20, 'activities/kids-club.jpg'),
  ('Swimming Lesson',
   'Group swimming lesson for children with a certified instructor.',
   'kids', 'under_18', 25000::bigint, 8, 'activities/swimming-lesson.jpg'),
  ('Art Workshop',
   'Guided art and painting workshop for children.',
   'kids', 'under_18', 18000::bigint, 15, 'activities/art-workshop.jpg'),
  ('Mini-Golf Round',
   'Family-friendly mini-golf round on the garden course.',
   'kids', 'under_18', 12000::bigint, 12, 'activities/mini-golf.jpg')
) AS v(name, description, category, age_band, price_cents, capacity, image_key)
WHERE NOT EXISTS (
  SELECT 1 FROM public.activities a
  WHERE a.company_id = c.id AND a.name = v.name
);

-- ---------------------------------------------------------------------------
-- 5. RLS.
--    activities  : SELECT for every authenticated member of the company (the
--                  catalog); writes (INSERT/UPDATE/DELETE) restricted to
--                  same-company admin / manager.
--    activity_bookings : SELECT for the booker, an active guardian of the booker,
--                  and same-company admin / manager / accountant. Writes go only
--                  through the RPCs above (DML revoked below).
-- ---------------------------------------------------------------------------
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_read ON public.activities;
CREATE POLICY activities_read
  ON public.activities FOR SELECT TO authenticated
  USING (
    company_id IS NULL
    OR company_id = (SELECT public.current_user_company_id())
    OR public.is_super_admin()
  );

DROP POLICY IF EXISTS activities_write ON public.activities;
CREATE POLICY activities_write
  ON public.activities FOR ALL TO authenticated
  USING (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
      AND company_id = (SELECT public.current_user_company_id())
    )
  )
  WITH CHECK (
    public.is_super_admin()
    OR (
      (SELECT public.current_user_profile_role()) IN ('admin', 'manager')
      AND company_id = (SELECT public.current_user_company_id())
    )
  );

DROP POLICY IF EXISTS activity_bookings_read ON public.activity_bookings;
CREATE POLICY activity_bookings_read
  ON public.activity_bookings FOR SELECT TO authenticated
  USING (
    booker_profile_id = (SELECT auth.uid())
    OR (booker_profile_id IS NOT NULL
        AND public.is_active_guardian_of(booker_profile_id))
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role())
          IN ('admin', 'manager', 'accountant')
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grant hardening (mirrors migs 41 / 44).
--    activities: keep RLS-gated DML for admin / manager; anon gets nothing.
--    activity_bookings: SELECT only for authenticated (writes are RPC-only).
--    Internal helper EXECUTE stripped from authenticated; RPCs granted.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.activities FROM anon;
REVOKE ALL ON public.activity_bookings FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.activity_bookings FROM authenticated;
GRANT SELECT ON public.activities TO authenticated;
GRANT SELECT ON public.activity_bookings TO authenticated;

-- Internal helper: never callable directly by clients (it bypasses RLS).
REVOKE ALL ON FUNCTION public.activity_booking_json(uuid)
  FROM PUBLIC, anon, authenticated;

-- Caller-facing RPCs: authenticated only (never anon / public).
REVOKE ALL ON FUNCTION public.book_activity(uuid, int, timestamptz, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_activity_booking(uuid, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_activity(uuid, int, timestamptz, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_activity_booking(uuid, text)
  TO authenticated;

COMMENT ON TABLE public.activities IS
  'Bookable activities / extra-services catalog (New Level Premium extras + supervised under-18 activities). SELECT is the company catalog; writes are admin/manager only. Prices are integer minor units.';
COMMENT ON TABLE public.activity_bookings IS
  'Wallet-funded activity bookings. Written only via book_activity / cancel_activity_booking. SELECT is limited to the booker, the booker''s active guardian, and same-company admin/manager/accountant.';
COMMENT ON FUNCTION public.book_activity(uuid, int, timestamptz, text) IS
  'Book an activity for the caller: age-gates adult activities against minors, spends from the caller''s own wallet via wallet_spend (no-overdraft), idempotent on the request key.';

-- ---------------------------------------------------------------------------
-- 7. Realtime publication (guarded / optional; matches migs 4 / 43 / 44).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['activities', 'activity_bookings']
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
