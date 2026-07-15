-- Canonical bookable-resource and reservation lifecycle.
--
-- public.reservations remains the single booking authority.  This migration
-- adds resource/rule/capacity facts around it and removes direct authenticated
-- reservation writes so every allocation is made by a transactional command.
-- Price, deposit and provider fields describe system truth only; no state in
-- this migration claims that an external payment, refund or credential exists.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.booking_resource_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'spa_treatment', 'spa_room', 'sauna', 'steam_room', 'sports_court',
    'game_room', 'event_area', 'shuttle', 'shared_facility',
    'move_loading_slot', 'handover_appointment'
  )),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, code),
  UNIQUE (id, company_id)
);

CREATE TABLE public.bookable_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_type_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  commissioning_state TEXT NOT NULL DEFAULT 'draft'
    CHECK (commissioning_state IN (
      'draft', 'commissioning', 'active', 'maintenance', 'suspended', 'retired'
    )),
  timezone TEXT NOT NULL DEFAULT 'Europe/Istanbul'
    CHECK (timezone = 'Europe/Istanbul'),
  capacity_mode TEXT NOT NULL DEFAULT 'exclusive'
    CHECK (capacity_mode IN ('exclusive', 'shared')),
  capacity INTEGER NOT NULL DEFAULT 1 CHECK (capacity BETWEEN 1 AND 500),
  default_duration_minutes INTEGER NOT NULL DEFAULT 60
    CHECK (default_duration_minutes BETWEEN 5 AND 1440),
  min_duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (min_duration_minutes BETWEEN 5 AND 1440),
  max_duration_minutes INTEGER NOT NULL DEFAULT 240
    CHECK (max_duration_minutes BETWEEN 5 AND 2880),
  slot_increment_minutes INTEGER NOT NULL DEFAULT 15
    CHECK (slot_increment_minutes BETWEEN 5 AND 1440),
  buffer_before_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (buffer_before_minutes BETWEEN 0 AND 1440),
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (buffer_after_minutes BETWEEN 0 AND 1440),
  minimum_advance_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (minimum_advance_minutes BETWEEN 0 AND 525600),
  maximum_advance_days INTEGER NOT NULL DEFAULT 90
    CHECK (maximum_advance_days BETWEEN 1 AND 730),
  hold_minutes INTEGER NOT NULL DEFAULT 10 CHECK (hold_minutes BETWEEN 2 AND 60),
  approval_requirement TEXT NOT NULL DEFAULT 'none'
    CHECK (approval_requirement IN ('none', 'owner', 'manager')),
  price_truth TEXT NOT NULL DEFAULT 'free'
    CHECK (price_truth IN ('free', 'manual_required', 'provider_ready', 'blocked')),
  price_amount_cents BIGINT CHECK (price_amount_cents IS NULL OR price_amount_cents >= 0),
  deposit_truth TEXT NOT NULL DEFAULT 'not_required'
    CHECK (deposit_truth IN ('not_required', 'manual_required', 'provider_ready', 'blocked')),
  deposit_amount_cents BIGINT CHECK (deposit_amount_cents IS NULL OR deposit_amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'TRY' CHECK (currency ~ '^[A-Z]{3}$'),
  cancellation_cutoff_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (cancellation_cutoff_minutes BETWEEN 0 AND 525600),
  cancellation_policy TEXT NOT NULL DEFAULT 'manual_review',
  no_show_policy TEXT NOT NULL DEFAULT 'manual_review',
  required_staff_count INTEGER NOT NULL DEFAULT 0
    CHECK (required_staff_count BETWEEN 0 AND 50),
  safety_condition TEXT,
  access_requirement TEXT NOT NULL DEFAULT 'none'
    CHECK (access_requirement IN ('none', 'manual', 'provider_ready')),
  emergency_bypass_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bookable_resources_duration_order
    CHECK (min_duration_minutes <= default_duration_minutes
      AND default_duration_minutes <= max_duration_minutes),
  CONSTRAINT bookable_resources_price_truth
    CHECK (price_truth <> 'free' OR COALESCE(price_amount_cents, 0) = 0),
  CONSTRAINT bookable_resources_deposit_truth
    CHECK (deposit_truth <> 'not_required' OR COALESCE(deposit_amount_cents, 0) = 0),
  UNIQUE (site_id, code),
  UNIQUE (id, company_id, site_id),
  FOREIGN KEY (resource_type_id, company_id)
    REFERENCES public.booking_resource_types(id, company_id) ON DELETE RESTRICT
);

CREATE TABLE public.booking_resource_opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  iso_weekday SMALLINT NOT NULL CHECK (iso_weekday BETWEEN 1 AND 7),
  interval_no SMALLINT NOT NULL DEFAULT 1 CHECK (interval_no BETWEEN 1 AND 12),
  local_start TIME,
  local_end TIME,
  spans_next_day BOOLEAN NOT NULL DEFAULT FALSE,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_resource_opening_hours_shape CHECK (
    (is_closed AND local_start IS NULL AND local_end IS NULL)
    OR (
      NOT is_closed
      AND local_start IS NOT NULL
      AND local_end IS NOT NULL
      AND local_start <> local_end
      AND spans_next_day = (local_end < local_start)
    )
  ),
  UNIQUE (resource_id, iso_weekday, interval_no),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_resource_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'tenant', 'staff')),
  relationship TEXT CHECK (relationship IN ('owner', 'tenant')),
  requires_unit_relationship BOOLEAN NOT NULL DEFAULT TRUE,
  max_party_size INTEGER CHECK (max_party_size IS NULL OR max_party_size > 0),
  max_active_bookings INTEGER CHECK (max_active_bookings IS NULL OR max_active_bookings > 0),
  approval_override TEXT CHECK (approval_override IN ('none', 'owner', 'manager')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_id, role),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_resource_staff_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (valid_until IS NULL OR valid_until > valid_from),
  UNIQUE (resource_id, profile_id),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_resource_capacity_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  ordinal INTEGER NOT NULL CHECK (ordinal > 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (resource_id, ordinal),
  UNIQUE (id, resource_id),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_resource_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  blackout_type TEXT NOT NULL CHECK (blackout_type IN (
    'maintenance', 'commissioning', 'safety', 'admin'
  )),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL DEFAULT auth.uid(),
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  UNIQUE (id, resource_id),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 500),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  buffer_before_minutes INTEGER NOT NULL CHECK (buffer_before_minutes BETWEEN 0 AND 1440),
  buffer_after_minutes INTEGER NOT NULL CHECK (buffer_after_minutes BETWEEN 0 AND 1440),
  buffered_start_at TIMESTAMPTZ NOT NULL,
  buffered_end_at TIMESTAMPTZ NOT NULL,
  price_truth TEXT NOT NULL CHECK (price_truth IN (
    'free', 'manual_required', 'provider_ready', 'blocked'
  )),
  price_amount_cents BIGINT CHECK (price_amount_cents IS NULL OR price_amount_cents >= 0),
  deposit_truth TEXT NOT NULL CHECK (deposit_truth IN (
    'not_required', 'manual_required', 'provider_ready', 'blocked'
  )),
  deposit_amount_cents BIGINT CHECK (deposit_amount_cents IS NULL OR deposit_amount_cents >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'converted', 'released', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  request_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK (buffered_end_at > buffered_start_at),
  UNIQUE (id, resource_id),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS bookable_resource_id UUID,
  ADD COLUMN IF NOT EXISTS party_size INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT NOT NULL DEFAULT 'requested',
  ADD COLUMN IF NOT EXISTS approval_state TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS payment_state TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS deposit_truth_state TEXT NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS access_preparation_state TEXT NOT NULL DEFAULT 'blocked_until_confirmed',
  ADD COLUMN IF NOT EXISTS price_truth TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS price_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS deposit_amount_cents BIGINT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'TRY',
  ADD COLUMN IF NOT EXISTS buffer_before_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffer_after_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS buffered_start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buffered_end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancellation_cutoff_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_policy TEXT NOT NULL DEFAULT 'manual_review',
  ADD COLUMN IF NOT EXISTS no_show_policy TEXT NOT NULL DEFAULT 'manual_review',
  ADD COLUMN IF NOT EXISTS required_staff_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS safety_condition TEXT,
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT,
  ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;

ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_party_size_check,
  ADD CONSTRAINT reservations_party_size_check CHECK (party_size BETWEEN 1 AND 500),
  DROP CONSTRAINT IF EXISTS reservations_lifecycle_status_check,
  ADD CONSTRAINT reservations_lifecycle_status_check CHECK (lifecycle_status IN (
    'requested', 'confirmed', 'checked_in', 'completed',
    'cancelled', 'no_show', 'rejected', 'revoked'
  )),
  DROP CONSTRAINT IF EXISTS reservations_approval_state_check,
  ADD CONSTRAINT reservations_approval_state_check CHECK (approval_state IN (
    'not_required', 'pending_owner', 'pending_manager', 'approved', 'rejected'
  )),
  DROP CONSTRAINT IF EXISTS reservations_payment_state_check,
  ADD CONSTRAINT reservations_payment_state_check CHECK (payment_state IN (
    'not_required', 'manual_required', 'provider_ready', 'manual_verified',
    'waived', 'unavailable'
  )),
  DROP CONSTRAINT IF EXISTS reservations_deposit_truth_state_check,
  ADD CONSTRAINT reservations_deposit_truth_state_check CHECK (deposit_truth_state IN (
    'not_required', 'manual_required', 'provider_ready', 'manual_verified',
    'waived', 'unavailable'
  )),
  DROP CONSTRAINT IF EXISTS reservations_access_preparation_state_check,
  ADD CONSTRAINT reservations_access_preparation_state_check CHECK (access_preparation_state IN (
    'not_required', 'blocked_until_confirmed', 'manual_required',
    'provider_ready', 'revoked'
  )),
  DROP CONSTRAINT IF EXISTS reservations_price_truth_check,
  ADD CONSTRAINT reservations_price_truth_check CHECK (price_truth IN (
    'free', 'manual_required', 'provider_ready', 'blocked'
  )),
  DROP CONSTRAINT IF EXISTS reservations_money_snapshot_check,
  ADD CONSTRAINT reservations_money_snapshot_check CHECK (
    (price_amount_cents IS NULL OR price_amount_cents >= 0)
    AND (deposit_amount_cents IS NULL OR deposit_amount_cents >= 0)
    AND currency ~ '^[A-Z]{3}$'
  ),
  DROP CONSTRAINT IF EXISTS reservations_buffer_snapshot_check,
  ADD CONSTRAINT reservations_buffer_snapshot_check CHECK (
    buffer_before_minutes BETWEEN 0 AND 1440
    AND buffer_after_minutes BETWEEN 0 AND 1440
    AND cancellation_cutoff_minutes BETWEEN 0 AND 525600
    AND required_staff_count BETWEEN 0 AND 50
  ),
  DROP CONSTRAINT IF EXISTS reservations_access_confirmation_check,
  ADD CONSTRAINT reservations_access_confirmation_check CHECK (
    access_preparation_state NOT IN ('manual_required', 'provider_ready')
    OR lifecycle_status IN ('confirmed', 'checked_in')
  ),
  DROP CONSTRAINT IF EXISTS reservations_terminal_access_check,
  ADD CONSTRAINT reservations_terminal_access_check CHECK (
    lifecycle_status NOT IN ('cancelled', 'no_show', 'rejected', 'revoked', 'completed')
    OR access_preparation_state IN ('not_required', 'revoked')
  );

CREATE TABLE public.booking_waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  resident_id UUID REFERENCES public.residents(id) ON DELETE SET NULL,
  party_size INTEGER NOT NULL CHECK (party_size BETWEEN 1 AND 500),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  buffered_start_at TIMESTAMPTZ NOT NULL,
  buffered_end_at TIMESTAMPTZ NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN -1000 AND 1000),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'offered', 'promoted', 'cancelled', 'expired')),
  offered_hold_id UUID REFERENCES public.booking_holds(id) ON DELETE SET NULL,
  offer_expires_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  request_fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at AND buffered_end_at > buffered_start_at),
  UNIQUE (id, resource_id),
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

CREATE TABLE public.booking_capacity_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL,
  capacity_unit_id UUID NOT NULL,
  hold_id UUID REFERENCES public.booking_holds(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  blackout_id UUID REFERENCES public.booking_resource_blackouts(id) ON DELETE CASCADE,
  allocation_kind TEXT NOT NULL CHECK (allocation_kind IN ('hold', 'reservation', 'blackout')),
  occupied_range TSTZRANGE NOT NULL,
  released_at TIMESTAMPTZ,
  release_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT isempty(occupied_range)),
  CHECK (num_nonnulls(hold_id, reservation_id, blackout_id) = 1),
  CHECK (
    (allocation_kind = 'hold' AND hold_id IS NOT NULL)
    OR (allocation_kind = 'reservation' AND reservation_id IS NOT NULL)
    OR (allocation_kind = 'blackout' AND blackout_id IS NOT NULL)
  ),
  UNIQUE NULLS NOT DISTINCT (capacity_unit_id, hold_id, reservation_id, blackout_id),
  FOREIGN KEY (capacity_unit_id, resource_id)
    REFERENCES public.booking_resource_capacity_units(id, resource_id) ON DELETE CASCADE,
  FOREIGN KEY (resource_id, company_id, site_id)
    REFERENCES public.bookable_resources(id, company_id, site_id) ON DELETE CASCADE
);

ALTER TABLE public.booking_capacity_allocations
  ADD CONSTRAINT booking_capacity_allocations_no_overlap
  EXCLUDE USING gist (
    capacity_unit_id WITH =,
    occupied_range WITH &&
  ) WHERE (released_at IS NULL);

CREATE TABLE public.resource_booking_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  resource_id UUID NOT NULL REFERENCES public.bookable_resources(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL CHECK (task_type IN (
    'reminder', 'staffing', 'safety', 'settlement', 'turnover'
  )),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'in_progress', 'completed', 'blocked', 'cancelled')),
  assigned_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reservation_id, task_type, title)
);

CREATE TABLE public.resource_booking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE CASCADE,
  hold_id UUID REFERENCES public.booking_holds(id) ON DELETE CASCADE,
  waitlist_entry_id UUID REFERENCES public.booking_waitlist_entries(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  entity_version INTEGER NOT NULL CHECK (entity_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (num_nonnulls(reservation_id, hold_id, waitlist_entry_id) = 1)
);

CREATE UNIQUE INDEX resource_booking_events_reservation_version
  ON public.resource_booking_events(reservation_id, entity_version)
  WHERE reservation_id IS NOT NULL;
CREATE UNIQUE INDEX resource_booking_events_hold_version
  ON public.resource_booking_events(hold_id, entity_version)
  WHERE hold_id IS NOT NULL;
CREATE UNIQUE INDEX resource_booking_events_waitlist_version
  ON public.resource_booking_events(waitlist_entry_id, entity_version)
  WHERE waitlist_entry_id IS NOT NULL;

CREATE TABLE public.booking_command_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  command_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  stable_response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

CREATE INDEX booking_resources_site_state_idx
  ON public.bookable_resources(company_id, site_id, commissioning_state, name);
CREATE INDEX booking_opening_hours_lookup_idx
  ON public.booking_resource_opening_hours(resource_id, iso_weekday, interval_no);
CREATE INDEX booking_staff_assignment_lookup_idx
  ON public.booking_resource_staff_assignments(profile_id, resource_id, status);
CREATE INDEX booking_holds_expiry_idx
  ON public.booking_holds(resource_id, expires_at)
  WHERE status = 'active';
CREATE INDEX reservations_resource_window_idx
  ON public.reservations(bookable_resource_id, buffered_start_at, buffered_end_at)
  WHERE lifecycle_status IN ('requested', 'confirmed', 'checked_in');
CREATE INDEX booking_waitlist_order_idx
  ON public.booking_waitlist_entries(resource_id, priority DESC, created_at, id)
  WHERE status = 'waiting';
CREATE INDEX booking_tasks_assignment_idx
  ON public.resource_booking_tasks(assigned_profile_id, status, due_at);

-- ---------------------------------------------------------------------------
-- Integrity helpers.  Every write below is command-owned; these triggers are
-- the final database backstop for callers with elevated credentials.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.booking_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_reject_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'booking history is append-only'
    USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_resource_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_site_company UUID;
  v_type_company UUID;
BEGIN
  SELECT s.company_id INTO v_site_company
  FROM public.sites s
  WHERE s.id = NEW.site_id;

  SELECT rt.company_id INTO v_type_company
  FROM public.booking_resource_types rt
  WHERE rt.id = NEW.resource_type_id;

  IF v_site_company IS DISTINCT FROM NEW.company_id
     OR v_type_company IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'booking resource company/site/type mismatch'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_sync_capacity_units()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ordinal INTEGER;
  v_in_use INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::TEXT, 0));

  IF TG_OP = 'UPDATE' AND NEW.capacity < OLD.capacity THEN
    SELECT COUNT(DISTINCT cu.ordinal)::INTEGER
      INTO v_in_use
    FROM public.booking_resource_capacity_units cu
    JOIN public.booking_capacity_allocations a
      ON a.capacity_unit_id = cu.id
     AND a.released_at IS NULL
    WHERE cu.resource_id = NEW.id
      AND cu.ordinal > NEW.capacity;

    IF v_in_use > 0 THEN
      RAISE EXCEPTION 'capacity cannot be reduced while capacity units are allocated'
        USING ERRCODE = '23P01';
    END IF;
  END IF;

  FOR v_ordinal IN 1..NEW.capacity LOOP
    INSERT INTO public.booking_resource_capacity_units (
      company_id, site_id, resource_id, ordinal, status
    ) VALUES (
      NEW.company_id, NEW.site_id, NEW.id, v_ordinal, 'active'
    )
    ON CONFLICT (resource_id, ordinal)
    DO UPDATE SET
      status = 'active',
      company_id = EXCLUDED.company_id,
      site_id = EXCLUDED.site_id;
  END LOOP;

  UPDATE public.booking_resource_capacity_units
  SET status = 'retired'
  WHERE resource_id = NEW.id
    AND ordinal > NEW.capacity
    AND status <> 'retired';

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_capacity_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_site_id UUID;
  v_resource_id UUID;
  v_expected_range TSTZRANGE;
BEGIN
  IF NEW.hold_id IS NOT NULL THEN
    SELECT h.company_id, h.site_id, h.resource_id,
           tstzrange(h.buffered_start_at, h.buffered_end_at, '[)')
      INTO v_company_id, v_site_id, v_resource_id, v_expected_range
    FROM public.booking_holds h
    WHERE h.id = NEW.hold_id;
  ELSIF NEW.reservation_id IS NOT NULL THEN
    SELECT r.company_id, r.site_id, r.bookable_resource_id,
           tstzrange(r.buffered_start_at, r.buffered_end_at, '[)')
      INTO v_company_id, v_site_id, v_resource_id, v_expected_range
    FROM public.reservations r
    WHERE r.id = NEW.reservation_id;
  ELSE
    SELECT b.company_id, b.site_id, b.resource_id,
           tstzrange(b.starts_at, b.ends_at, '[)')
      INTO v_company_id, v_site_id, v_resource_id, v_expected_range
    FROM public.booking_resource_blackouts b
    WHERE b.id = NEW.blackout_id;
  END IF;

  IF v_resource_id IS NULL
     OR NEW.company_id IS DISTINCT FROM v_company_id
     OR NEW.site_id IS DISTINCT FROM v_site_id
     OR NEW.resource_id IS DISTINCT FROM v_resource_id
     OR NEW.occupied_range IS DISTINCT FROM v_expected_range THEN
    RAISE EXCEPTION 'capacity allocation does not match its owning entity'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_buffer_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.buffered_start_at IS DISTINCT FROM
       NEW.starts_at - make_interval(mins => NEW.buffer_before_minutes)
     OR NEW.buffered_end_at IS DISTINCT FROM
       NEW.ends_at + make_interval(mins => NEW.buffer_after_minutes) THEN
    RAISE EXCEPTION 'buffered window does not match the immutable buffer snapshot'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_reservation_resource()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
  v_site_id UUID;
BEGIN
  IF NEW.bookable_resource_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT br.company_id, br.site_id
    INTO v_company_id, v_site_id
  FROM public.bookable_resources br
  WHERE br.id = NEW.bookable_resource_id;

  IF v_company_id IS NULL
     OR v_company_id IS DISTINCT FROM NEW.company_id
     OR v_site_id IS DISTINCT FROM NEW.site_id THEN
    RAISE EXCEPTION 'reservation resource company/site mismatch'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.buffered_start_at IS DISTINCT FROM
       NEW.check_in_at - make_interval(mins => NEW.buffer_before_minutes)
     OR NEW.buffered_end_at IS DISTINCT FROM
       NEW.check_out_at + make_interval(mins => NEW.buffer_after_minutes) THEN
    RAISE EXCEPTION 'reservation buffered window does not match its immutable buffer snapshot'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_resource_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, resource_type_id
ON public.bookable_resources
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_resource_scope();

CREATE TRIGGER booking_resource_capacity_sync
AFTER INSERT OR UPDATE OF capacity
ON public.bookable_resources
FOR EACH ROW EXECUTE FUNCTION public.booking_sync_capacity_units();

CREATE TRIGGER booking_hold_buffer_guard
BEFORE INSERT OR UPDATE OF starts_at, ends_at, buffer_before_minutes,
  buffer_after_minutes, buffered_start_at, buffered_end_at
ON public.booking_holds
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_buffer_snapshot();

CREATE TRIGGER booking_reservation_resource_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, bookable_resource_id,
  check_in_at, check_out_at, buffer_before_minutes,
  buffer_after_minutes, buffered_start_at, buffered_end_at
ON public.reservations
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_reservation_resource();

CREATE TRIGGER booking_capacity_allocation_guard
BEFORE INSERT OR UPDATE
ON public.booking_capacity_allocations
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_capacity_allocation();

CREATE TRIGGER booking_resources_touch_updated_at
BEFORE UPDATE ON public.bookable_resources
FOR EACH ROW EXECUTE FUNCTION public.booking_touch_updated_at();
CREATE TRIGGER booking_holds_touch_updated_at
BEFORE UPDATE ON public.booking_holds
FOR EACH ROW EXECUTE FUNCTION public.booking_touch_updated_at();
CREATE TRIGGER booking_waitlist_touch_updated_at
BEFORE UPDATE ON public.booking_waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.booking_touch_updated_at();
CREATE TRIGGER booking_tasks_touch_updated_at
BEFORE UPDATE ON public.resource_booking_tasks
FOR EACH ROW EXECUTE FUNCTION public.booking_touch_updated_at();

CREATE TRIGGER booking_events_append_only
BEFORE UPDATE OR DELETE ON public.resource_booking_events
FOR EACH ROW EXECUTE FUNCTION public.booking_reject_history_mutation();
CREATE TRIGGER booking_receipts_append_only
BEFORE UPDATE OR DELETE ON public.booking_command_receipts
FOR EACH ROW EXECUTE FUNCTION public.booking_reject_history_mutation();

-- ---------------------------------------------------------------------------
-- Configuration seed and lossless cut-over of the pre-existing reservations
-- table.  `reservations` remains the only booking authority.
-- ---------------------------------------------------------------------------

INSERT INTO public.booking_resource_types (company_id, code, name, category)
SELECT c.id, seed.code, seed.name, seed.category
FROM public.companies c
CROSS JOIN (
  VALUES
    ('spa-treatment', 'Spa treatment', 'spa_treatment'),
    ('spa-room', 'Spa room', 'spa_room'),
    ('sauna', 'Sauna', 'sauna'),
    ('steam-room', 'Steam room', 'steam_room'),
    ('sports-court', 'Sports court', 'sports_court'),
    ('game-room', 'Game room', 'game_room'),
    ('event-area', 'Event area', 'event_area'),
    ('shuttle', 'Shuttle', 'shuttle'),
    ('shared-facility', 'Shared facility', 'shared_facility'),
    ('move-loading-slot', 'Move loading slot', 'move_loading_slot'),
    ('handover-appointment', 'Handover appointment', 'handover_appointment')
) AS seed(code, name, category)
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.bookable_resources (
  company_id,
  site_id,
  resource_type_id,
  code,
  name,
  commissioning_state,
  capacity_mode,
  capacity,
  min_duration_minutes,
  default_duration_minutes,
  max_duration_minutes,
  maximum_advance_days,
  approval_requirement,
  price_truth,
  deposit_truth,
  access_requirement
)
SELECT DISTINCT
  r.company_id,
  r.site_id,
  rt.id,
  'legacy-' || SUBSTRING(md5(lower(trim(r.resource_name))) FROM 1 FOR 20),
  trim(r.resource_name),
  'active',
  'exclusive',
  1,
  5,
  60,
  2880,
  730,
  'none',
  'free',
  'not_required',
  'manual'
FROM public.reservations r
JOIN public.booking_resource_types rt
  ON rt.company_id = r.company_id
 AND rt.code = 'shared-facility'
WHERE r.resource_name IS NOT NULL
  AND trim(r.resource_name) <> ''
ON CONFLICT (site_id, code) DO NOTHING;

INSERT INTO public.booking_resource_opening_hours (
  company_id, site_id, resource_id, iso_weekday, interval_no,
  local_start, local_end, spans_next_day, is_closed
)
SELECT br.company_id, br.site_id, br.id, weekday, 1,
       TIME '00:00:00', TIME '23:59:59.999999', FALSE, FALSE
FROM public.bookable_resources br
CROSS JOIN generate_series(1, 7) AS weekday
WHERE br.code LIKE 'legacy-%'
ON CONFLICT (resource_id, iso_weekday, interval_no) DO NOTHING;

INSERT INTO public.booking_resource_entitlements (
  company_id, site_id, resource_id, role, relationship,
  requires_unit_relationship
)
SELECT br.company_id, br.site_id, br.id, entitlement.role,
       entitlement.relationship, entitlement.requires_unit_relationship
FROM public.bookable_resources br
CROSS JOIN (
  VALUES
    ('owner', 'owner', TRUE),
    ('tenant', 'tenant', TRUE),
    ('staff', NULL::TEXT, FALSE)
) AS entitlement(role, relationship, requires_unit_relationship)
WHERE br.code LIKE 'legacy-%'
ON CONFLICT (resource_id, role) DO NOTHING;

UPDATE public.reservations r
SET
  bookable_resource_id = br.id,
  party_size = 1,
  lifecycle_status = CASE
    WHEN r.status = 'checked_in' THEN 'checked_in'
    WHEN r.status = 'checked_out' THEN 'completed'
    WHEN r.status = 'cancelled' OR r.approval_status = 'rejected' THEN 'cancelled'
    WHEN r.status = 'no_show' THEN 'no_show'
    WHEN r.approval_status = 'pending_owner' THEN 'requested'
    ELSE 'confirmed'
  END,
  approval_state = CASE
    WHEN r.approval_status = 'pending_owner' THEN 'pending_owner'
    WHEN r.approval_status = 'rejected' THEN 'rejected'
    ELSE 'approved'
  END,
  payment_state = 'not_required',
  deposit_truth_state = CASE
    WHEN r.deposit_status = 'not_required' THEN 'not_required'
    ELSE 'manual_required'
  END,
  access_preparation_state = CASE
    WHEN r.status IN ('cancelled', 'no_show', 'checked_out')
      OR r.approval_status = 'rejected' THEN 'revoked'
    WHEN r.status = 'scheduled' AND r.approval_status = 'pending_owner'
      THEN 'blocked_until_confirmed'
    ELSE 'manual_required'
  END,
  price_truth = 'free',
  price_amount_cents = 0,
  deposit_amount_cents = NULL,
  currency = 'TRY',
  buffer_before_minutes = 0,
  buffer_after_minutes = 0,
  buffered_start_at = r.check_in_at,
  buffered_end_at = r.check_out_at,
  cancellation_cutoff_minutes = 0,
  cancellation_policy = 'legacy_manual_review',
  no_show_policy = 'legacy_manual_review',
  required_staff_count = 0,
  safety_condition = NULL,
  request_fingerprint = md5(
    concat_ws('|', r.id::TEXT, r.company_id::TEXT, r.site_id::TEXT,
      r.unit_id::TEXT, r.check_in_at::TEXT, r.check_out_at::TEXT)
  )
FROM public.bookable_resources br
WHERE br.company_id = r.company_id
  AND br.site_id = r.site_id
  AND br.code = 'legacy-' || SUBSTRING(md5(lower(trim(r.resource_name))) FROM 1 FOR 20)
  AND r.bookable_resource_id IS NULL;

DO $$
DECLARE
  v_unmapped UUID;
  v_first UUID;
  v_second UUID;
BEGIN
  SELECT r.id INTO v_unmapped
  FROM public.reservations r
  WHERE r.bookable_resource_id IS NULL
  LIMIT 1;

  IF v_unmapped IS NOT NULL THEN
    RAISE EXCEPTION 'reservation % cannot be mapped to a bookable resource', v_unmapped
      USING ERRCODE = '23514';
  END IF;

  SELECT r1.id, r2.id INTO v_first, v_second
  FROM public.reservations r1
  JOIN public.reservations r2
    ON r2.bookable_resource_id = r1.bookable_resource_id
   AND r2.id > r1.id
   AND tstzrange(r2.buffered_start_at, r2.buffered_end_at, '[)')
       && tstzrange(r1.buffered_start_at, r1.buffered_end_at, '[)')
  WHERE r1.lifecycle_status IN ('requested', 'confirmed', 'checked_in')
    AND r2.lifecycle_status IN ('requested', 'confirmed', 'checked_in')
  LIMIT 1;

  IF v_first IS NOT NULL THEN
    RAISE EXCEPTION
      'legacy reservations % and % overlap on an exclusive resource; reconcile before migration',
      v_first, v_second
      USING ERRCODE = '23P01';
  END IF;
END;
$$;

ALTER TABLE public.reservations
  ALTER COLUMN bookable_resource_id SET NOT NULL,
  ALTER COLUMN buffered_start_at SET NOT NULL,
  ALTER COLUMN buffered_end_at SET NOT NULL,
  ALTER COLUMN request_fingerprint SET NOT NULL,
  ADD CONSTRAINT reservations_bookable_resource_fk
    FOREIGN KEY (bookable_resource_id)
    REFERENCES public.bookable_resources(id) ON DELETE RESTRICT;

INSERT INTO public.booking_capacity_allocations (
  company_id, site_id, resource_id, capacity_unit_id, reservation_id,
  allocation_kind, occupied_range
)
SELECT r.company_id, r.site_id, r.bookable_resource_id, cu.id, r.id,
       'reservation', tstzrange(r.buffered_start_at, r.buffered_end_at, '[)')
FROM public.reservations r
JOIN public.booking_resource_capacity_units cu
  ON cu.resource_id = r.bookable_resource_id
 AND cu.ordinal = 1
WHERE r.lifecycle_status IN ('requested', 'confirmed', 'checked_in')
ON CONFLICT DO NOTHING;

-- Narrow orchestration tasks only. Settlement and physical turnover remain in
-- deposit_settlements, turnover_work_items and workforce_tasks.
ALTER TABLE public.resource_booking_tasks
  ADD COLUMN workforce_task_id UUID REFERENCES public.workforce_tasks(id) ON DELETE SET NULL,
  ADD CONSTRAINT resource_booking_tasks_narrow_type
    CHECK (task_type IN ('reminder', 'staffing', 'safety')) NOT VALID;

UPDATE public.resource_booking_tasks
SET status = 'cancelled', reason = 'superseded_by_canonical_operational_table'
WHERE task_type IN ('settlement', 'turnover');

ALTER TABLE public.resource_booking_tasks
  VALIDATE CONSTRAINT resource_booking_tasks_narrow_type;

-- ---------------------------------------------------------------------------
-- Scope, eligibility, schedule and idempotency helpers.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_has_booking_resource_assignment(
  p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.booking_resource_staff_assignments a
    JOIN public.profiles p
      ON p.id = a.profile_id
     AND p.company_id = a.company_id
    WHERE a.resource_id = p_resource_id
      AND a.profile_id = (SELECT auth.uid())
      AND p.role = 'staff'
      AND a.status = 'active'
      AND a.valid_from <= NOW()
      AND (a.valid_until IS NULL OR a.valid_until > NOW())
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_bookable_resource(
  p_resource_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.bookable_resources br
    WHERE br.id = p_resource_id
      AND br.company_id = public.current_user_company_id()
      AND (
        public.is_platform_super_admin()
        OR public.current_user_can_manage_site(br.site_id)
        OR public.current_user_has_booking_resource_assignment(br.id)
        OR (
          public.current_user_profile_role() IN ('owner', 'tenant')
          AND EXISTS (
            SELECT 1
            FROM public.unit_residents actor_relation
            JOIN public.units actor_unit
              ON actor_unit.id = actor_relation.unit_id
             AND actor_unit.company_id = actor_relation.company_id
            WHERE actor_relation.company_id = br.company_id
              AND actor_unit.site_id = br.site_id
              AND actor_relation.resident_id =
                public.current_user_linked_resident_id()
              AND actor_relation.relationship = public.current_user_profile_role()
              AND (actor_relation.end_date IS NULL
                OR actor_relation.end_date >= CURRENT_DATE)
              AND (
                public.current_user_profile_role() <> 'tenant'
                OR public.current_user_has_tenant_module_access(
                  actor_relation.unit_id, 'calendar'
                )
              )
          )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_view_reservation(
  p_reservation_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.reservations r
    WHERE r.id = p_reservation_id
      AND r.company_id = public.current_user_company_id()
      AND public.current_user_profile_role() <> 'accountant'
      AND (
        public.is_platform_super_admin()
        OR public.current_user_can_manage_site(r.site_id)
        OR r.created_by = (SELECT auth.uid())
        OR public.current_user_has_booking_resource_assignment(r.bookable_resource_id)
        OR EXISTS (
          SELECT 1
          FROM public.resource_booking_tasks t
          WHERE t.reservation_id = r.id
            AND t.assigned_profile_id = (SELECT auth.uid())
        )
        OR (
          public.current_user_profile_role() = 'owner'
          AND public.current_user_has_unit_relationship(r.unit_id, ARRAY['owner'])
        )
        OR (
          public.current_user_profile_role() = 'tenant'
          AND public.current_user_has_unit_relationship(r.unit_id, ARRAY['tenant'])
          AND public.current_user_has_tenant_module_access(r.unit_id, 'calendar')
        )
        OR (r.resident_id IS NOT NULL AND public.current_user_is_linked_resident(r.resident_id))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.booking_actor_can_request(
  p_resource_id UUID,
  p_unit_id UUID,
  p_resident_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
  v_site_id UUID;
  v_company_id UUID;
  v_entitled BOOLEAN;
  v_entitlement public.booking_resource_entitlements%ROWTYPE;
BEGIN
  SELECT br.site_id, br.company_id
    INTO v_site_id, v_company_id
  FROM public.bookable_resources br
  WHERE br.id = p_resource_id;

  IF v_site_id IS NULL OR v_company_id IS DISTINCT FROM public.current_user_company_id() THEN
    RETURN FALSE;
  END IF;

  IF v_role IN ('owner', 'tenant', 'staff') THEN
    SELECT e.* INTO v_entitlement
    FROM public.booking_resource_entitlements e
    WHERE e.resource_id = p_resource_id
      AND e.role = v_role;
  END IF;

  IF public.is_platform_super_admin() OR public.current_user_can_manage_site(v_site_id) THEN
    v_entitled := TRUE;
  ELSIF NOT FOUND THEN
    v_entitled := FALSE;
  ELSIF v_role = 'staff' THEN
    v_entitled := public.current_user_has_booking_resource_assignment(p_resource_id);
  ELSIF v_role IN ('owner', 'tenant') THEN
    v_entitled := TRUE;
  ELSE
    v_entitled := FALSE;
  END IF;

  IF v_entitled
     AND NOT (public.is_platform_super_admin() OR public.current_user_can_manage_site(v_site_id))
     AND v_entitlement.requires_unit_relationship THEN
    v_entitled := p_unit_id IS NOT NULL
      AND v_entitlement.relationship IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.unit_residents actor_relation
        WHERE actor_relation.company_id = v_company_id
          AND actor_relation.unit_id = p_unit_id
          AND actor_relation.resident_id =
            public.current_user_linked_resident_id()
          AND actor_relation.relationship = v_entitlement.relationship
          AND (
            v_role <> 'tenant'
            OR actor_relation.resident_id = p_resident_id
          )
      );
  END IF;

  IF v_entitled AND v_role = 'tenant' THEN
    v_entitled := p_unit_id IS NOT NULL
      AND public.current_user_has_tenant_module_access(p_unit_id, 'calendar');
  END IF;

  IF NOT v_entitled THEN
    RETURN FALSE;
  END IF;

  IF p_unit_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = p_unit_id
      AND u.company_id = v_company_id
      AND u.site_id = v_site_id
  ) THEN
    RETURN FALSE;
  END IF;

  -- The command caller and hold scope trigger validate the resident at the
  -- requested booking date. This helper stays signature-compatible and only
  -- establishes that the resident belongs to the selected unit/company.
  IF p_resident_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.unit_residents ur
    WHERE ur.company_id = v_company_id
      AND ur.unit_id = p_unit_id
      AND ur.resident_id = p_resident_id
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_resource_window_is_open(
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timezone TEXT;
  v_local_start TIMESTAMP;
  v_local_end TIMESTAMP;
  v_date DATE;
BEGIN
  SELECT timezone INTO v_timezone
  FROM public.bookable_resources
  WHERE id = p_resource_id;

  IF v_timezone IS NULL OR p_ends_at <= p_starts_at THEN
    RETURN FALSE;
  END IF;

  v_local_start := p_starts_at AT TIME ZONE v_timezone;
  v_local_end := p_ends_at AT TIME ZONE v_timezone;

  FOR v_date IN
    SELECT d FROM (VALUES (v_local_start::DATE), ((v_local_start::DATE) - 1)) AS dates(d)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM public.booking_resource_opening_hours oh
      WHERE oh.resource_id = p_resource_id
        AND oh.iso_weekday = EXTRACT(ISODOW FROM v_date)::SMALLINT
        AND NOT oh.is_closed
        AND v_local_start >= v_date + oh.local_start
        AND v_local_end <= v_date + oh.local_end
          + CASE WHEN oh.spans_next_day THEN INTERVAL '1 day' ELSE INTERVAL '0' END
    ) THEN
      RETURN TRUE;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_validate_window(
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource public.bookable_resources%ROWTYPE;
  v_minutes NUMERIC;
  v_local_start TIMESTAMP;
BEGIN
  SELECT * INTO v_resource
  FROM public.bookable_resources
  WHERE id = p_resource_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bookable resource not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_resource.commissioning_state <> 'active' THEN
    RAISE EXCEPTION 'resource is not commissioned for booking' USING ERRCODE = 'P0001';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'booking end must be after start' USING ERRCODE = 'P0001';
  END IF;

  v_minutes := EXTRACT(EPOCH FROM (p_ends_at - p_starts_at)) / 60;
  IF v_minutes < v_resource.min_duration_minutes
     OR v_minutes > v_resource.max_duration_minutes THEN
    RAISE EXCEPTION 'booking duration is outside resource limits' USING ERRCODE = 'P0001';
  END IF;
  IF p_starts_at < NOW() + make_interval(mins => v_resource.minimum_advance_minutes)
     OR p_starts_at > NOW() + make_interval(days => v_resource.maximum_advance_days) THEN
    RAISE EXCEPTION 'booking is outside the advance window' USING ERRCODE = 'P0001';
  END IF;

  v_local_start := p_starts_at AT TIME ZONE v_resource.timezone;
  IF MOD((EXTRACT(HOUR FROM v_local_start)::INTEGER * 60)
       + EXTRACT(MINUTE FROM v_local_start)::INTEGER,
       v_resource.slot_increment_minutes) <> 0 THEN
    RAISE EXCEPTION 'booking start is not aligned with the slot increment'
      USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.booking_resource_window_is_open(p_resource_id, p_starts_at, p_ends_at) THEN
    RAISE EXCEPTION 'booking window is outside opening hours' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_command_replay(
  p_company_id UUID,
  p_command_name TEXT,
  p_idempotency_key TEXT,
  p_request_fingerprint TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_receipt public.booking_command_receipts%ROWTYPE;
BEGIN
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'idempotency key must contain 8 to 200 characters'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      p_company_id::TEXT || ':' || (SELECT auth.uid())::TEXT || ':' || p_idempotency_key,
      0
    )
  );

  SELECT * INTO v_receipt
  FROM public.booking_command_receipts
  WHERE company_id = p_company_id
    AND idempotency_key = p_idempotency_key;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_receipt.actor_profile_id IS DISTINCT FROM (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'idempotency key belongs to a different actor'
      USING ERRCODE = '23505';
  END IF;

  IF v_receipt.command_name IS DISTINCT FROM p_command_name
     OR v_receipt.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
    RAISE EXCEPTION 'idempotency key was already used with different semantics'
      USING ERRCODE = '23505';
  END IF;

  RETURN jsonb_set(v_receipt.stable_response, '{replayed}', 'true'::JSONB, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_store_receipt(
  p_company_id UUID,
  p_command_name TEXT,
  p_idempotency_key TEXT,
  p_request_fingerprint TEXT,
  p_response JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.booking_command_receipts (
    company_id, actor_profile_id, command_name, idempotency_key,
    request_fingerprint, stable_response
  ) VALUES (
    p_company_id, (SELECT auth.uid()), p_command_name, p_idempotency_key,
    p_request_fingerprint, p_response
  );
  RETURN p_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_record_change(
  p_company_id UUID,
  p_command_name TEXT,
  p_entity_table TEXT,
  p_entity_id UUID,
  p_before JSONB,
  p_after JSONB,
  p_idempotency_key TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data, idempotency_key
  ) VALUES (
    p_company_id, (SELECT auth.uid()), p_command_name, p_entity_table,
    p_entity_id, p_before, p_after, p_idempotency_key
  );

  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    p_company_id, 'booking-lifecycle', p_command_name, p_entity_table,
    p_entity_id,
    jsonb_build_object('entityId', p_entity_id, 'command', p_command_name),
    'pending', p_command_name || ':' || p_idempotency_key
  )
  ON CONFLICT DO NOTHING;
END;
$$;

ALTER TABLE public.booking_waitlist_entries
  ADD COLUMN buffer_before_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (buffer_before_minutes BETWEEN 0 AND 1440),
  ADD COLUMN buffer_after_minutes INTEGER NOT NULL DEFAULT 0
    CHECK (buffer_after_minutes BETWEEN 0 AND 1440),
  ADD COLUMN price_truth TEXT NOT NULL DEFAULT 'free'
    CHECK (price_truth IN ('free', 'manual_required', 'provider_ready', 'blocked')),
  ADD COLUMN price_amount_cents BIGINT CHECK (price_amount_cents IS NULL OR price_amount_cents >= 0),
  ADD COLUMN deposit_truth TEXT NOT NULL DEFAULT 'not_required'
    CHECK (deposit_truth IN ('not_required', 'manual_required', 'provider_ready', 'blocked')),
  ADD COLUMN deposit_amount_cents BIGINT CHECK (deposit_amount_cents IS NULL OR deposit_amount_cents >= 0),
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'TRY' CHECK (currency ~ '^[A-Z]{3}$');

CREATE OR REPLACE FUNCTION public.booking_add_event(
  p_company_id UUID,
  p_reservation_id UUID,
  p_hold_id UUID,
  p_waitlist_entry_id UUID,
  p_event_type TEXT,
  p_from_state TEXT,
  p_to_state TEXT,
  p_entity_version INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.resource_booking_events (
    company_id, reservation_id, hold_id, waitlist_entry_id, event_type,
    from_state, to_state, entity_version, actor_profile_id, actor_role,
    reason, metadata
  ) VALUES (
    p_company_id, p_reservation_id, p_hold_id, p_waitlist_entry_id,
    p_event_type, p_from_state, p_to_state, p_entity_version,
    (SELECT auth.uid()), public.current_user_profile_role(), p_reason,
    COALESCE(p_metadata, '{}'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_try_allocate_capacity(
  p_resource_id UUID,
  p_allocation_kind TEXT,
  p_parent_id UUID,
  p_occupied_range TSTZRANGE,
  p_party_size INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource public.bookable_resources%ROWTYPE;
  v_needed INTEGER;
  v_unit_ids UUID[];
BEGIN
  SELECT * INTO v_resource
  FROM public.bookable_resources
  WHERE id = p_resource_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'bookable resource not found' USING ERRCODE = 'P0002';
  END IF;
  IF p_allocation_kind NOT IN ('hold', 'reservation', 'blackout') THEN
    RAISE EXCEPTION 'invalid capacity allocation kind' USING ERRCODE = 'P0001';
  END IF;

  v_needed := CASE
    WHEN p_allocation_kind = 'blackout' OR v_resource.capacity_mode = 'exclusive'
      THEN v_resource.capacity
    ELSE p_party_size
  END;

  IF v_needed < 1 OR v_needed > v_resource.capacity THEN
    RETURN FALSE;
  END IF;

  SELECT array_agg(candidate.id ORDER BY candidate.ordinal)
    INTO v_unit_ids
  FROM (
    SELECT cu.id, cu.ordinal
    FROM public.booking_resource_capacity_units cu
    WHERE cu.resource_id = p_resource_id
      AND cu.status = 'active'
      AND NOT EXISTS (
        SELECT 1
        FROM public.booking_capacity_allocations a
        WHERE a.capacity_unit_id = cu.id
          AND a.released_at IS NULL
          AND a.occupied_range && p_occupied_range
      )
    ORDER BY cu.ordinal
    LIMIT v_needed
    FOR UPDATE
  ) AS candidate;

  IF COALESCE(cardinality(v_unit_ids), 0) <> v_needed THEN
    RETURN FALSE;
  END IF;

  INSERT INTO public.booking_capacity_allocations (
    company_id, site_id, resource_id, capacity_unit_id,
    hold_id, reservation_id, blackout_id, allocation_kind, occupied_range
  )
  SELECT
    v_resource.company_id,
    v_resource.site_id,
    v_resource.id,
    capacity_unit_id,
    CASE WHEN p_allocation_kind = 'hold' THEN p_parent_id END,
    CASE WHEN p_allocation_kind = 'reservation' THEN p_parent_id END,
    CASE WHEN p_allocation_kind = 'blackout' THEN p_parent_id END,
    p_allocation_kind,
    p_occupied_range
  FROM unnest(v_unit_ids) AS capacity_unit_id;

  RETURN TRUE;
EXCEPTION
  WHEN exclusion_violation THEN
    RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_expire_holds(
  p_resource_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hold public.booking_holds%ROWTYPE;
  v_count INTEGER := 0;
  v_waitlist public.booking_waitlist_entries%ROWTYPE;
BEGIN
  FOR v_hold IN
    UPDATE public.booking_holds
    SET status = 'expired', version = version + 1
    WHERE resource_id = p_resource_id
      AND status = 'active'
      AND expires_at <= NOW()
    RETURNING *
  LOOP
    UPDATE public.booking_capacity_allocations
    SET released_at = NOW(), release_reason = 'hold_expired'
    WHERE hold_id = v_hold.id
      AND released_at IS NULL;

    FOR v_waitlist IN
      UPDATE public.booking_waitlist_entries
      SET status = 'waiting', offered_hold_id = NULL, offer_expires_at = NULL,
          version = version + 1
      WHERE offered_hold_id = v_hold.id
        AND status = 'offered'
      RETURNING *
    LOOP
      PERFORM public.booking_add_event(
        v_waitlist.company_id, NULL, NULL, v_waitlist.id,
        'waitlist_offer_expired', 'offered', 'waiting', v_waitlist.version,
        'hold_expired'
      );
    END LOOP;

    PERFORM public.booking_add_event(
      v_hold.company_id, NULL, v_hold.id, NULL,
      'hold_expired', 'active', 'expired', v_hold.version, 'timeout'
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_offer_waitlist_internal(
  p_resource_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.booking_waitlist_entries%ROWTYPE;
  v_resource public.bookable_resources%ROWTYPE;
  v_hold public.booking_holds%ROWTYPE;
  v_entitlement public.booking_resource_entitlements%ROWTYPE;
  v_allocated BOOLEAN;
  v_eligible BOOLEAN;
  v_has_entitlement BOOLEAN;
  v_promoted INTEGER := 0;
  v_active_count INTEGER;
  v_requester_role TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_resource_id::TEXT, 0));
  PERFORM public.booking_expire_holds(p_resource_id);

  SELECT * INTO v_resource
  FROM public.bookable_resources
  WHERE id = p_resource_id
  FOR UPDATE;

  IF NOT FOUND OR v_resource.commissioning_state <> 'active' THEN
    RETURN 0;
  END IF;

  FOR v_entry IN
    SELECT *
    FROM public.booking_waitlist_entries
    WHERE resource_id = p_resource_id
      AND status = 'waiting'
    ORDER BY priority DESC, created_at, id
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    FOR UPDATE
  LOOP
    IF v_entry.starts_at < NOW() + make_interval(mins => v_resource.minimum_advance_minutes)
       OR v_entry.starts_at > NOW() + make_interval(days => v_resource.maximum_advance_days)
       OR v_entry.ends_at <= v_entry.starts_at
       OR EXTRACT(EPOCH FROM (v_entry.ends_at - v_entry.starts_at)) / 60
          NOT BETWEEN v_resource.min_duration_minutes AND v_resource.max_duration_minutes
       OR NOT public.booking_resource_window_is_open(
         v_entry.resource_id, v_entry.starts_at, v_entry.ends_at
       ) THEN
      UPDATE public.booking_waitlist_entries
      SET status = 'expired', version = version + 1
      WHERE id = v_entry.id
      RETURNING * INTO v_entry;
      PERFORM public.booking_add_event(
        v_entry.company_id, NULL, NULL, v_entry.id,
        'waitlist_expired', 'waiting', 'expired', v_entry.version,
        'booking_window_no_longer_valid'
      );
      CONTINUE;
    END IF;

    SELECT p.role INTO v_requester_role
    FROM public.profiles p
    WHERE p.id = v_entry.requested_by
      AND p.company_id = v_entry.company_id;
    v_eligible := FOUND;

    IF v_eligible THEN
      v_eligible := EXISTS (
        SELECT 1
        FROM public.units u
        JOIN public.unit_residents ur ON ur.unit_id = u.id
        JOIN public.residents resident ON resident.id = ur.resident_id
        WHERE u.id = v_entry.unit_id
          AND u.site_id = v_entry.site_id
          AND u.company_id = v_entry.company_id
          AND ur.resident_id = v_entry.resident_id
          AND resident.company_id = v_entry.company_id
          AND resident.status = 'active'
          AND (ur.start_date IS NULL OR ur.start_date <=
            (v_entry.starts_at AT TIME ZONE v_resource.timezone)::DATE)
          AND (ur.end_date IS NULL OR ur.end_date >=
            (v_entry.starts_at AT TIME ZONE v_resource.timezone)::DATE)
      );
    END IF;

    IF v_eligible AND v_requester_role IN ('owner', 'tenant', 'staff') THEN
      SELECT e.* INTO v_entitlement
      FROM public.booking_resource_entitlements e
      WHERE e.resource_id = v_entry.resource_id
        AND e.role = v_requester_role;
      v_has_entitlement := FOUND;
      v_eligible := v_has_entitlement
        AND (v_entitlement.max_party_size IS NULL
          OR v_entry.party_size <= v_entitlement.max_party_size);

      IF v_eligible AND v_entitlement.requires_unit_relationship THEN
        v_eligible := v_entitlement.relationship IS NOT NULL
          AND public.profile_has_unit_relationship(
            v_entry.requested_by,
            v_entry.unit_id,
            ARRAY[v_entitlement.relationship]
          );
      END IF;

      IF v_eligible AND v_requester_role = 'tenant' THEN
        v_eligible := public.profile_has_tenant_module_access(
          v_entry.requested_by, v_entry.unit_id, 'calendar'
        );
      ELSIF v_eligible AND v_requester_role = 'staff' THEN
        v_eligible := EXISTS (
          SELECT 1
          FROM public.booking_resource_staff_assignments a
          WHERE a.resource_id = v_entry.resource_id
            AND a.profile_id = v_entry.requested_by
            AND a.status = 'active'
            AND a.valid_from <= NOW()
            AND (a.valid_until IS NULL OR a.valid_until > NOW())
        );
      END IF;

      IF v_eligible AND v_entitlement.max_active_bookings IS NOT NULL THEN
        SELECT COUNT(*)::INTEGER INTO v_active_count
        FROM public.reservations r
        WHERE r.bookable_resource_id = v_entry.resource_id
          AND r.created_by = v_entry.requested_by
          AND r.lifecycle_status IN ('requested', 'confirmed', 'checked_in');
        v_eligible := v_active_count < v_entitlement.max_active_bookings;
      END IF;
    ELSIF v_eligible AND v_requester_role = 'manager' THEN
      v_eligible := EXISTS (
        SELECT 1
        FROM public.sites s
        WHERE s.id = v_entry.site_id
          AND s.company_id = v_entry.company_id
          AND (
            s.manager_profile_id = v_entry.requested_by
            OR EXISTS (
              SELECT 1
              FROM public.profile_site_assignments a
              WHERE a.company_id = v_entry.company_id
                AND a.site_id = v_entry.site_id
                AND a.profile_id = v_entry.requested_by
                AND a.access_role = 'manager'
                AND a.status = 'active'
                AND a.valid_from <= NOW()
                AND (a.valid_until IS NULL OR a.valid_until > NOW())
            )
          )
      );
    ELSIF v_eligible AND v_requester_role <> 'admin' THEN
      v_eligible := FALSE;
    END IF;

    IF NOT v_eligible
       OR v_resource.price_truth = 'blocked'
       OR v_resource.deposit_truth = 'blocked'
       OR v_entry.party_size > v_resource.capacity THEN
      UPDATE public.booking_waitlist_entries
      SET status = 'cancelled', version = version + 1
      WHERE id = v_entry.id
      RETURNING * INTO v_entry;
      PERFORM public.booking_add_event(
        v_entry.company_id, NULL, NULL, v_entry.id,
        'waitlist_ineligible', 'waiting', 'cancelled', v_entry.version,
        'eligibility_no_longer_valid'
      );
      CONTINUE;
    END IF;

    INSERT INTO public.booking_holds (
      company_id, site_id, resource_id, requested_by, unit_id, resident_id,
      party_size, starts_at, ends_at, buffer_before_minutes,
      buffer_after_minutes, buffered_start_at, buffered_end_at,
      price_truth, price_amount_cents, deposit_truth, deposit_amount_cents,
      currency, status, expires_at, request_fingerprint
    ) VALUES (
      v_entry.company_id, v_entry.site_id, v_entry.resource_id,
      v_entry.requested_by, v_entry.unit_id, v_entry.resident_id,
      v_entry.party_size, v_entry.starts_at, v_entry.ends_at,
      v_entry.buffer_before_minutes, v_entry.buffer_after_minutes,
      v_entry.buffered_start_at, v_entry.buffered_end_at,
      v_entry.price_truth, v_entry.price_amount_cents, v_entry.deposit_truth,
      v_entry.deposit_amount_cents, v_entry.currency, 'active',
      NOW() + make_interval(mins => v_resource.hold_minutes),
      v_entry.request_fingerprint || ':offer:' || v_entry.version::TEXT
    ) RETURNING * INTO v_hold;

    v_allocated := public.booking_try_allocate_capacity(
      p_resource_id,
      'hold',
      v_hold.id,
      tstzrange(v_hold.buffered_start_at, v_hold.buffered_end_at, '[)'),
      v_hold.party_size
    );

    IF NOT v_allocated THEN
      DELETE FROM public.booking_holds WHERE id = v_hold.id;
      CONTINUE;
    END IF;

    UPDATE public.booking_waitlist_entries
    SET status = 'offered', offered_hold_id = v_hold.id,
        offer_expires_at = v_hold.expires_at, version = version + 1
    WHERE id = v_entry.id
    RETURNING * INTO v_entry;

    PERFORM public.booking_add_event(
      v_hold.company_id, NULL, v_hold.id, NULL,
      'waitlist_hold_created', NULL, 'active', v_hold.version, NULL,
      jsonb_build_object('waitlistEntryId', v_entry.id)
    );
    PERFORM public.booking_add_event(
      v_entry.company_id, NULL, NULL, v_entry.id,
      'waitlist_offered', 'waiting', 'offered', v_entry.version, NULL,
      jsonb_build_object('holdId', v_hold.id, 'expiresAt', v_hold.expires_at)
    );
    v_promoted := v_promoted + 1;
  END LOOP;

  RETURN v_promoted;
END;
$$;

-- ---------------------------------------------------------------------------
-- Public transactional commands.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_booking_hold_command(
  p_resource_id UUID,
  p_unit_id UUID,
  p_resident_id UUID,
  p_party_size INTEGER,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_waitlist_if_full BOOLEAN,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_company_id UUID := public.current_user_company_id();
  v_resource public.bookable_resources%ROWTYPE;
  v_hold public.booking_holds%ROWTYPE;
  v_waitlist public.booking_waitlist_entries%ROWTYPE;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_allocated BOOLEAN;
  v_entitlement public.booking_resource_entitlements%ROWTYPE;
  v_role TEXT := public.current_user_profile_role();
  v_active_count INTEGER;
BEGIN
  IF v_actor_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'authenticated profile required' USING ERRCODE = '42501';
  END IF;
  IF p_unit_id IS NULL OR p_resident_id IS NULL THEN
    RAISE EXCEPTION 'unit and resident are required for a booking request'
      USING ERRCODE = 'P0001';
  END IF;

  v_fingerprint := md5(jsonb_build_object(
    'resourceId', p_resource_id, 'unitId', p_unit_id,
    'residentId', p_resident_id, 'partySize', p_party_size,
    'startsAt', p_starts_at, 'endsAt', p_ends_at,
    'waitlistIfFull', COALESCE(p_waitlist_if_full, FALSE)
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_company_id, 'create_booking_hold', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_resource_id::TEXT, 0));
  SELECT * INTO v_resource
  FROM public.bookable_resources
  WHERE id = p_resource_id
    AND company_id = v_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'bookable resource not found' USING ERRCODE = 'P0002';
  END IF;

  IF NOT public.booking_actor_can_request(p_resource_id, p_unit_id, p_resident_id) THEN
    RAISE EXCEPTION 'booking eligibility denied for resource and unit'
      USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.unit_residents ur
    WHERE ur.company_id = v_resource.company_id
      AND ur.unit_id = p_unit_id
      AND ur.resident_id = p_resident_id
      AND (ur.start_date IS NULL OR ur.start_date <=
        (p_starts_at AT TIME ZONE v_resource.timezone)::DATE)
      AND (ur.end_date IS NULL OR ur.end_date >=
        (p_starts_at AT TIME ZONE v_resource.timezone)::DATE)
  ) THEN
    RAISE EXCEPTION 'booking resident relationship is not valid for the requested date'
      USING ERRCODE = '42501';
  END IF;
  IF v_role IN ('owner', 'tenant') AND NOT EXISTS (
    SELECT 1
    FROM public.unit_residents actor_relation
    WHERE actor_relation.company_id = v_resource.company_id
      AND actor_relation.unit_id = p_unit_id
      AND actor_relation.resident_id = public.current_user_linked_resident_id()
      AND actor_relation.relationship = v_role
      AND (actor_relation.start_date IS NULL OR actor_relation.start_date <=
        (p_starts_at AT TIME ZONE v_resource.timezone)::DATE)
      AND (actor_relation.end_date IS NULL OR actor_relation.end_date >=
        (p_starts_at AT TIME ZONE v_resource.timezone)::DATE)
      AND (v_role <> 'tenant' OR actor_relation.resident_id = p_resident_id)
  ) THEN
    RAISE EXCEPTION 'booking actor relationship is not valid for the requested date'
      USING ERRCODE = '42501';
  END IF;
  IF p_party_size IS NULL OR p_party_size < 1 OR p_party_size > v_resource.capacity THEN
    RAISE EXCEPTION 'party size exceeds the resource capacity'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_resource.price_truth = 'blocked' OR v_resource.deposit_truth = 'blocked' THEN
    RAISE EXCEPTION 'booking is blocked until price or deposit truth is configured'
      USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.booking_validate_window(p_resource_id, p_starts_at, p_ends_at);
  PERFORM public.booking_expire_holds(p_resource_id);

  SELECT e.* INTO v_entitlement
  FROM public.booking_resource_entitlements e
  WHERE e.resource_id = p_resource_id
    AND e.role = CASE WHEN v_role IN ('owner', 'tenant', 'staff') THEN v_role ELSE 'staff' END;

  IF FOUND AND v_entitlement.max_party_size IS NOT NULL
     AND p_party_size > v_entitlement.max_party_size THEN
    RAISE EXCEPTION 'party size exceeds entitlement limit' USING ERRCODE = 'P0001';
  END IF;
  IF FOUND AND v_entitlement.max_active_bookings IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_active_count
    FROM public.reservations r
    WHERE r.bookable_resource_id = p_resource_id
      AND r.created_by = v_actor_id
      AND r.lifecycle_status IN ('requested', 'confirmed', 'checked_in');
    IF v_active_count >= v_entitlement.max_active_bookings THEN
      RAISE EXCEPTION 'active booking entitlement limit reached' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  INSERT INTO public.booking_holds (
    company_id, site_id, resource_id, requested_by, unit_id, resident_id,
    party_size, starts_at, ends_at, buffer_before_minutes,
    buffer_after_minutes, buffered_start_at, buffered_end_at,
    price_truth, price_amount_cents, deposit_truth, deposit_amount_cents,
    currency, status, expires_at, request_fingerprint
  ) VALUES (
    v_resource.company_id, v_resource.site_id, v_resource.id, v_actor_id,
    p_unit_id, p_resident_id, p_party_size, p_starts_at, p_ends_at,
    v_resource.buffer_before_minutes, v_resource.buffer_after_minutes,
    p_starts_at - make_interval(mins => v_resource.buffer_before_minutes),
    p_ends_at + make_interval(mins => v_resource.buffer_after_minutes),
    v_resource.price_truth, v_resource.price_amount_cents,
    v_resource.deposit_truth, v_resource.deposit_amount_cents,
    v_resource.currency, 'active',
    NOW() + make_interval(mins => v_resource.hold_minutes),
    v_fingerprint
  ) RETURNING * INTO v_hold;

  v_allocated := public.booking_try_allocate_capacity(
    p_resource_id, 'hold', v_hold.id,
    tstzrange(v_hold.buffered_start_at, v_hold.buffered_end_at, '[)'),
    p_party_size
  );

  IF NOT v_allocated THEN
    DELETE FROM public.booking_holds WHERE id = v_hold.id;
    IF NOT COALESCE(p_waitlist_if_full, FALSE) THEN
      RAISE EXCEPTION 'resource capacity is unavailable for the requested window'
        USING ERRCODE = '23P01';
    END IF;

    INSERT INTO public.booking_waitlist_entries (
      company_id, site_id, resource_id, requested_by, unit_id, resident_id,
      party_size, starts_at, ends_at, buffered_start_at, buffered_end_at,
      priority, status, request_fingerprint, buffer_before_minutes,
      buffer_after_minutes, price_truth, price_amount_cents, deposit_truth,
      deposit_amount_cents, currency
    ) VALUES (
      v_resource.company_id, v_resource.site_id, v_resource.id, v_actor_id,
      p_unit_id, p_resident_id, p_party_size, p_starts_at, p_ends_at,
      p_starts_at - make_interval(mins => v_resource.buffer_before_minutes),
      p_ends_at + make_interval(mins => v_resource.buffer_after_minutes),
      0, 'waiting', v_fingerprint, v_resource.buffer_before_minutes,
      v_resource.buffer_after_minutes, v_resource.price_truth,
      v_resource.price_amount_cents, v_resource.deposit_truth,
      v_resource.deposit_amount_cents, v_resource.currency
    ) RETURNING * INTO v_waitlist;

    PERFORM public.booking_add_event(
      v_company_id, NULL, NULL, v_waitlist.id,
      'waitlist_joined', NULL, 'waiting', v_waitlist.version
    );
    PERFORM public.booking_record_change(
      v_company_id, 'create_booking_waitlist_entry',
      'booking_waitlist_entries', v_waitlist.id, NULL,
      jsonb_build_object('state', v_waitlist.status, 'resourceId', p_resource_id),
      p_idempotency_key
    );

    v_response := jsonb_build_object(
      'contractVersion', 'booking-lifecycle.v1',
      'command', 'create_booking_hold',
      'entityType', 'waitlist',
      'entityId', v_waitlist.id,
      'waitlistEntryId', v_waitlist.id,
      'version', v_waitlist.version,
      'state', v_waitlist.status,
      'replayed', FALSE
    );
    RETURN public.booking_store_receipt(
      v_company_id, 'create_booking_hold', p_idempotency_key,
      v_fingerprint, v_response
    );
  END IF;

  PERFORM public.booking_add_event(
    v_company_id, NULL, v_hold.id, NULL,
    'hold_created', NULL, 'active', v_hold.version
  );
  PERFORM public.booking_record_change(
    v_company_id, 'create_booking_hold', 'booking_holds', v_hold.id,
    NULL,
    jsonb_build_object('state', v_hold.status, 'resourceId', p_resource_id,
      'startsAt', v_hold.starts_at, 'endsAt', v_hold.ends_at),
    p_idempotency_key
  );

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'create_booking_hold',
    'entityType', 'hold',
    'entityId', v_hold.id,
    'holdId', v_hold.id,
    'version', v_hold.version,
    'state', v_hold.status,
    'expiresAt', v_hold.expires_at,
    'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_company_id, 'create_booking_hold', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.commit_resource_booking_command(
  p_hold_id UUID,
  p_expected_version INTEGER,
  p_guest_name TEXT,
  p_notes TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_hold public.booking_holds%ROWTYPE;
  v_resource public.bookable_resources%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_waitlist public.booking_waitlist_entries%ROWTYPE;
  v_approval_state TEXT;
  v_payment_state TEXT;
  v_deposit_state TEXT;
  v_lifecycle TEXT;
  v_access_state TEXT;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_assignee UUID;
  v_role TEXT := public.current_user_profile_role();
  v_approval_override TEXT;
  v_approval_requirement TEXT;
  v_entitlement public.booking_resource_entitlements%ROWTYPE;
  v_requester_role TEXT;
  v_active_count INTEGER;
BEGIN
  SELECT * INTO v_hold FROM public.booking_holds WHERE id = p_hold_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking hold not found' USING ERRCODE = 'P0002';
  END IF;

  v_fingerprint := md5(jsonb_build_object(
    'holdId', p_hold_id, 'expectedVersion', p_expected_version,
    'guestName', NULLIF(trim(p_guest_name), ''), 'notes', NULLIF(trim(p_notes), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_hold.company_id, 'commit_resource_booking', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_hold.resource_id::TEXT, 0));
  SELECT * INTO v_hold
  FROM public.booking_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF v_hold.requested_by <> v_actor_id
     AND NOT public.current_user_can_manage_site(v_hold.site_id)
     AND NOT public.is_platform_super_admin() THEN
    RAISE EXCEPTION 'booking hold is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_hold.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale booking hold version' USING ERRCODE = '40001';
  END IF;
  IF v_hold.status <> 'active' OR v_hold.expires_at <= NOW() THEN
    RAISE EXCEPTION 'booking hold is no longer active' USING ERRCODE = '23505';
  END IF;
  IF v_hold.unit_id IS NULL OR v_hold.resident_id IS NULL THEN
    RAISE EXCEPTION 'a unit and resident are required to commit a resident booking'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_resource
  FROM public.bookable_resources
  WHERE id = v_hold.resource_id
  FOR UPDATE;
  IF v_resource.commissioning_state <> 'active' THEN
    RAISE EXCEPTION 'resource is no longer bookable' USING ERRCODE = 'P0001';
  END IF;

  SELECT p.role INTO v_requester_role
  FROM public.profiles p
  WHERE p.id = v_hold.requested_by
    AND p.company_id = v_hold.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'booking requester profile is no longer active in company scope'
      USING ERRCODE = '42501';
  END IF;

  SELECT e.* INTO v_entitlement
  FROM public.booking_resource_entitlements e
  WHERE e.resource_id = v_resource.id
    AND e.role = CASE
      WHEN v_requester_role IN ('owner', 'tenant', 'staff') THEN v_requester_role
      ELSE 'staff'
    END;
  IF FOUND AND v_entitlement.max_active_bookings IS NOT NULL THEN
    SELECT COUNT(*)::INTEGER INTO v_active_count
    FROM public.reservations r
    WHERE r.bookable_resource_id = v_resource.id
      AND r.created_by = v_hold.requested_by
      AND r.lifecycle_status IN ('requested', 'confirmed', 'checked_in');
    IF v_active_count >= v_entitlement.max_active_bookings THEN
      RAISE EXCEPTION 'active booking entitlement limit reached at commit'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF v_role IN ('owner', 'tenant', 'staff') THEN
    SELECT e.approval_override INTO v_approval_override
    FROM public.booking_resource_entitlements e
    WHERE e.resource_id = v_resource.id
      AND e.role = v_role;
  END IF;
  v_approval_requirement := COALESCE(
    v_approval_override,
    v_resource.approval_requirement
  );

  v_approval_state := CASE
    WHEN v_approval_requirement = 'none' THEN 'not_required'
    WHEN public.current_user_can_manage_site(v_hold.site_id)
      OR public.is_platform_super_admin() THEN 'approved'
    WHEN v_approval_requirement = 'owner' THEN 'pending_owner'
    ELSE 'pending_manager'
  END;
  v_payment_state := CASE v_hold.price_truth
    WHEN 'free' THEN 'not_required'
    WHEN 'manual_required' THEN 'manual_required'
    WHEN 'provider_ready' THEN 'provider_ready'
    ELSE 'unavailable'
  END;
  v_deposit_state := CASE v_hold.deposit_truth
    WHEN 'not_required' THEN 'not_required'
    WHEN 'manual_required' THEN 'manual_required'
    WHEN 'provider_ready' THEN 'provider_ready'
    ELSE 'unavailable'
  END;
  v_lifecycle := CASE
    WHEN v_approval_state IN ('not_required', 'approved')
      AND v_payment_state IN ('not_required', 'manual_verified', 'waived')
      AND v_deposit_state IN ('not_required', 'manual_verified', 'waived')
      THEN 'confirmed'
    ELSE 'requested'
  END;
  v_access_state := CASE
    WHEN v_lifecycle <> 'confirmed' THEN 'blocked_until_confirmed'
    WHEN v_resource.access_requirement = 'none' THEN 'not_required'
    WHEN v_resource.access_requirement = 'manual' THEN 'manual_required'
    ELSE 'provider_ready'
  END;

  INSERT INTO public.reservations (
    company_id, site_id, unit_id, resident_id, guest_name,
    check_in_at, check_out_at, status, access_code_status,
    cleaning_status, deposit_status, resource_name, approval_status,
    notes, created_by, workflow_version, idempotency_key,
    approved_by, approved_at, bookable_resource_id, party_size,
    lifecycle_status, approval_state, payment_state, deposit_truth_state,
    access_preparation_state, price_truth, price_amount_cents,
    deposit_amount_cents, currency, buffer_before_minutes,
    buffer_after_minutes, buffered_start_at, buffered_end_at,
    cancellation_cutoff_minutes, cancellation_policy, no_show_policy,
    required_staff_count, safety_condition, request_fingerprint
  ) VALUES (
    v_hold.company_id, v_hold.site_id, v_hold.unit_id, v_hold.resident_id,
    NULLIF(trim(p_guest_name), ''), v_hold.starts_at, v_hold.ends_at,
    'scheduled', 'pending', 'pending',
    CASE WHEN v_deposit_state = 'not_required' THEN 'not_required' ELSE 'pending' END,
    v_resource.name,
    CASE WHEN v_approval_state IN ('not_required', 'approved') THEN 'approved' ELSE 'pending_owner' END,
    NULLIF(trim(p_notes), ''), v_hold.requested_by, 1, p_idempotency_key,
    CASE WHEN v_approval_state = 'approved' THEN v_actor_id END,
    CASE WHEN v_approval_state = 'approved' THEN NOW() END,
    v_resource.id, v_hold.party_size, v_lifecycle, v_approval_state,
    v_payment_state, v_deposit_state, v_access_state,
    v_hold.price_truth, v_hold.price_amount_cents, v_hold.deposit_amount_cents,
    v_hold.currency, v_hold.buffer_before_minutes, v_hold.buffer_after_minutes,
    v_hold.buffered_start_at, v_hold.buffered_end_at,
    v_resource.cancellation_cutoff_minutes, v_resource.cancellation_policy,
    v_resource.no_show_policy, v_resource.required_staff_count,
    v_resource.safety_condition, v_hold.request_fingerprint
  ) RETURNING * INTO v_reservation;

  UPDATE public.booking_capacity_allocations
  SET allocation_kind = 'reservation', hold_id = NULL,
      reservation_id = v_reservation.id
  WHERE hold_id = v_hold.id
    AND released_at IS NULL;

  UPDATE public.booking_holds
  SET status = 'converted', version = version + 1
  WHERE id = v_hold.id
  RETURNING * INTO v_hold;

  FOR v_waitlist IN
    UPDATE public.booking_waitlist_entries
    SET status = 'promoted', version = version + 1
    WHERE offered_hold_id = v_hold.id
      AND status = 'offered'
    RETURNING *
  LOOP
    PERFORM public.booking_add_event(
      v_waitlist.company_id, NULL, NULL, v_waitlist.id,
      'waitlist_promoted', 'offered', 'promoted', v_waitlist.version, NULL,
      jsonb_build_object('reservationId', v_reservation.id)
    );
  END LOOP;

  SELECT a.profile_id INTO v_assignee
  FROM public.booking_resource_staff_assignments a
  WHERE a.resource_id = v_resource.id
    AND a.status = 'active'
    AND a.valid_from <= v_hold.starts_at
    AND (a.valid_until IS NULL OR a.valid_until > v_hold.starts_at)
  ORDER BY a.valid_from, a.id
  LIMIT 1;

  INSERT INTO public.resource_booking_tasks (
    company_id, site_id, reservation_id, resource_id, task_type,
    title, assigned_profile_id, due_at, metadata
  ) VALUES (
    v_hold.company_id, v_hold.site_id, v_reservation.id, v_resource.id,
    'reminder', 'Booking reminder', NULL,
    GREATEST(NOW(), v_hold.starts_at - INTERVAL '24 hours'),
    jsonb_build_object('deliveryTruth', 'outbox_pending')
  );
  IF v_resource.required_staff_count > 0 THEN
    INSERT INTO public.resource_booking_tasks (
      company_id, site_id, reservation_id, resource_id, task_type,
      title, assigned_profile_id, due_at, metadata
    ) VALUES (
      v_hold.company_id, v_hold.site_id, v_reservation.id, v_resource.id,
      'staffing', 'Confirm required staffing', v_assignee,
      v_hold.starts_at - INTERVAL '2 hours',
      jsonb_build_object('requiredStaffCount', v_resource.required_staff_count)
    );
  END IF;
  IF v_resource.safety_condition IS NOT NULL THEN
    INSERT INTO public.resource_booking_tasks (
      company_id, site_id, reservation_id, resource_id, task_type,
      title, assigned_profile_id, due_at, metadata
    ) VALUES (
      v_hold.company_id, v_hold.site_id, v_reservation.id, v_resource.id,
      'safety', 'Verify safety condition', v_assignee,
      v_hold.starts_at - INTERVAL '30 minutes',
      jsonb_build_object('condition', v_resource.safety_condition)
    );
  END IF;

  PERFORM public.booking_add_event(
    v_hold.company_id, v_reservation.id, NULL, NULL,
    'booking_committed', NULL, v_lifecycle, v_reservation.workflow_version,
    NULL, jsonb_build_object('holdId', v_hold.id)
  );
  PERFORM public.booking_add_event(
    v_hold.company_id, NULL, v_hold.id, NULL,
    'hold_converted', 'active', 'converted', v_hold.version, NULL,
    jsonb_build_object('reservationId', v_reservation.id)
  );
  PERFORM public.booking_record_change(
    v_hold.company_id, 'commit_resource_booking', 'reservations',
    v_reservation.id, NULL,
    jsonb_build_object('state', v_lifecycle, 'holdId', v_hold.id),
    p_idempotency_key
  );

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'commit_resource_booking',
    'entityType', 'reservation',
    'entityId', v_reservation.id,
    'reservationId', v_reservation.id,
    'holdId', v_hold.id,
    'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status,
    'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_hold.company_id, 'commit_resource_booking', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.decide_resource_booking_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_decision TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_resource public.bookable_resources%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_can_decide BOOLEAN;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'expectedVersion', p_expected_version,
    'decision', p_decision, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_reservation.company_id, 'decide_resource_booking', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  SELECT * INTO v_resource
  FROM public.bookable_resources WHERE id = v_reservation.bookable_resource_id FOR UPDATE;

  v_can_decide := public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_reservation.site_id)
    OR (
      v_reservation.approval_state = 'pending_owner'
      AND public.current_user_profile_role() = 'owner'
      AND public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['owner'])
    );
  IF NOT v_can_decide THEN
    RAISE EXCEPTION 'approval decision is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('approve', 'reject') THEN
    RAISE EXCEPTION 'decision must be approve or reject' USING ERRCODE = 'P0001';
  END IF;
  IF v_reservation.workflow_version <> p_expected_version THEN
    RAISE EXCEPTION 'stale reservation version' USING ERRCODE = '40001';
  END IF;
  IF v_reservation.lifecycle_status <> 'requested'
     OR v_reservation.approval_state NOT IN ('pending_owner', 'pending_manager') THEN
    RAISE EXCEPTION 'reservation is not awaiting approval' USING ERRCODE = 'P0001';
  END IF;
  IF p_decision = 'reject' AND NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'rejection reason is required' USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_reservation);
  IF p_decision = 'reject' THEN
    UPDATE public.reservations
    SET lifecycle_status = 'cancelled', approval_state = 'rejected',
        approval_status = 'rejected', status = 'cancelled',
        access_preparation_state = 'revoked', access_code_status = 'revoked',
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id
    RETURNING * INTO v_reservation;

    UPDATE public.booking_capacity_allocations
    SET released_at = NOW(), release_reason = 'approval_rejected'
    WHERE reservation_id = p_reservation_id AND released_at IS NULL;
    UPDATE public.resource_booking_tasks
    SET status = 'cancelled', reason = 'approval_rejected'
    WHERE reservation_id = p_reservation_id
      AND status NOT IN ('completed', 'cancelled');
  ELSE
    UPDATE public.reservations
    SET approval_state = 'approved', approval_status = 'approved',
        approved_by = (SELECT auth.uid()), approved_at = NOW(),
        lifecycle_status = CASE
          WHEN payment_state IN ('not_required', 'manual_verified', 'waived')
           AND deposit_truth_state IN ('not_required', 'manual_verified', 'waived')
            THEN 'confirmed'
          ELSE lifecycle_status
        END,
        access_preparation_state = CASE
          WHEN payment_state IN ('not_required', 'manual_verified', 'waived')
           AND deposit_truth_state IN ('not_required', 'manual_verified', 'waived')
            THEN CASE v_resource.access_requirement
              WHEN 'none' THEN 'not_required'
              WHEN 'manual' THEN 'manual_required'
              ELSE 'provider_ready'
            END
          ELSE 'blocked_until_confirmed'
        END,
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id
    RETURNING * INTO v_reservation;
  END IF;

  PERFORM public.booking_add_event(
    v_reservation.company_id, v_reservation.id, NULL, NULL,
    'approval_' || p_decision, v_before->>'approval_state',
    v_reservation.lifecycle_status, v_reservation.workflow_version,
    NULLIF(trim(p_reason), '')
  );
  PERFORM public.booking_record_change(
    v_reservation.company_id, 'decide_resource_booking', 'reservations',
    v_reservation.id, v_before, to_jsonb(v_reservation), p_idempotency_key
  );
  IF p_decision = 'reject' THEN
    PERFORM public.booking_offer_waitlist_internal(v_reservation.bookable_resource_id, 20);
  END IF;

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1', 'command', 'decide_resource_booking',
    'entityType', 'reservation', 'entityId', v_reservation.id,
    'reservationId', v_reservation.id, 'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_reservation.company_id, 'decide_resource_booking', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_resource_booking_finance_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_payment_state TEXT,
  p_deposit_state TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_resource public.bookable_resources%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_role TEXT := public.current_user_profile_role();
  v_ready BOOLEAN;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'expectedVersion', p_expected_version,
    'paymentState', p_payment_state, 'depositState', p_deposit_state,
    'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_reservation.company_id, 'update_resource_booking_finance',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  SELECT * INTO v_resource
  FROM public.bookable_resources WHERE id = v_reservation.bookable_resource_id;

  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_reservation.site_id)
    OR (v_role = 'accountant' AND v_reservation.company_id = public.current_user_company_id())
  ) THEN
    RAISE EXCEPTION 'finance update is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF p_payment_state NOT IN (
      'not_required', 'manual_required', 'provider_ready',
      'manual_verified', 'waived', 'unavailable'
    ) OR p_deposit_state NOT IN (
      'not_required', 'manual_required', 'provider_ready',
      'manual_verified', 'waived', 'unavailable'
    ) THEN
    RAISE EXCEPTION 'invalid finance truth state' USING ERRCODE = 'P0001';
  END IF;
  IF (p_payment_state IN ('manual_verified', 'waived')
      OR p_deposit_state IN ('manual_verified', 'waived'))
     AND NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'manual verification or waiver requires a reason'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_reservation.workflow_version <> p_expected_version THEN
    RAISE EXCEPTION 'stale reservation version' USING ERRCODE = '40001';
  END IF;
  IF v_reservation.lifecycle_status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'finance truth cannot change in this lifecycle state'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_reservation.price_truth = 'free' AND p_payment_state <> 'not_required' THEN
    RAISE EXCEPTION 'free booking payment state must remain not_required'
      USING ERRCODE = 'P0001';
  END IF;
  IF v_reservation.deposit_amount_cents IS NULL
     AND v_resource.deposit_truth = 'not_required'
     AND p_deposit_state <> 'not_required' THEN
    RAISE EXCEPTION 'booking without deposit must remain not_required'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_reservation);
  v_ready := v_reservation.approval_state IN ('not_required', 'approved')
    AND p_payment_state IN ('not_required', 'manual_verified', 'waived')
    AND p_deposit_state IN ('not_required', 'manual_verified', 'waived');

  UPDATE public.reservations
  SET payment_state = p_payment_state,
      deposit_truth_state = p_deposit_state,
      deposit_status = CASE
        WHEN p_deposit_state = 'not_required' THEN 'not_required'
        ELSE 'pending'
      END,
      lifecycle_status = CASE
        WHEN lifecycle_status IN ('requested', 'confirmed') AND v_ready THEN 'confirmed'
        WHEN lifecycle_status = 'confirmed' AND NOT v_ready THEN 'requested'
        ELSE lifecycle_status
      END,
      access_preparation_state = CASE
        WHEN v_ready THEN
          CASE v_resource.access_requirement
            WHEN 'none' THEN 'not_required'
            WHEN 'manual' THEN 'manual_required'
            ELSE 'provider_ready'
          END
        ELSE 'blocked_until_confirmed'
      END,
      access_code_status = CASE
        WHEN NOT v_ready THEN 'revoked'
        WHEN access_code_status = 'revoked'
          AND v_resource.access_requirement <> 'none' THEN 'pending'
        ELSE access_code_status
      END,
      workflow_version = workflow_version + 1,
      updated_at = NOW()
  WHERE id = p_reservation_id
  RETURNING * INTO v_reservation;

  PERFORM public.booking_add_event(
    v_reservation.company_id, v_reservation.id, NULL, NULL,
    'finance_truth_updated', v_before->>'lifecycle_status',
    v_reservation.lifecycle_status, v_reservation.workflow_version,
    NULLIF(trim(p_reason), ''),
    jsonb_build_object('paymentState', p_payment_state,
      'depositState', p_deposit_state, 'verificationMode', 'manual_or_provider_ready')
  );
  PERFORM public.booking_record_change(
    v_reservation.company_id, 'update_resource_booking_finance',
    'reservations', v_reservation.id, v_before, to_jsonb(v_reservation),
    p_idempotency_key
  );

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'update_resource_booking_finance',
    'entityType', 'reservation', 'entityId', v_reservation.id,
    'reservationId', v_reservation.id, 'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_reservation.company_id, 'update_resource_booking_finance',
    p_idempotency_key, v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_resource_booking_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_transition TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_manage BOOLEAN;
  v_can_attend BOOLEAN;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'expectedVersion', p_expected_version,
    'transition', p_transition, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_reservation.company_id, 'transition_resource_booking',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF v_reservation.workflow_version <> p_expected_version THEN
    RAISE EXCEPTION 'stale reservation version' USING ERRCODE = '40001';
  END IF;
  IF p_transition NOT IN ('check_in', 'complete', 'no_show', 'revoke_access') THEN
    RAISE EXCEPTION 'unsupported booking transition' USING ERRCODE = 'P0001';
  END IF;

  v_manage := public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_reservation.site_id)
    OR public.current_user_has_booking_resource_assignment(v_reservation.bookable_resource_id)
    OR EXISTS (
      SELECT 1 FROM public.resource_booking_tasks t
      WHERE t.reservation_id = v_reservation.id
        AND t.assigned_profile_id = (SELECT auth.uid())
    );
  v_can_attend := v_manage
    OR v_reservation.created_by = (SELECT auth.uid())
    OR public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['owner', 'tenant'])
    OR (v_reservation.resident_id IS NOT NULL
        AND public.current_user_is_linked_resident(v_reservation.resident_id));

  IF (p_transition = 'check_in' AND NOT v_can_attend)
     OR (p_transition IN ('complete', 'no_show') AND NOT v_manage)
     OR (p_transition = 'revoke_access'
         AND NOT (public.is_platform_super_admin()
           OR public.current_user_can_manage_site(v_reservation.site_id))) THEN
    RAISE EXCEPTION 'booking transition is outside actor scope' USING ERRCODE = '42501';
  END IF;

  v_before := to_jsonb(v_reservation);
  IF p_transition = 'check_in' THEN
    IF v_reservation.lifecycle_status <> 'confirmed'
       OR v_reservation.payment_state NOT IN ('not_required', 'manual_verified', 'waived')
       OR v_reservation.deposit_truth_state NOT IN ('not_required', 'manual_verified', 'waived')
       OR v_reservation.access_preparation_state IN ('blocked_until_confirmed', 'revoked') THEN
      RAISE EXCEPTION 'booking is not ready for check-in' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.resource_booking_tasks t
      WHERE t.reservation_id = v_reservation.id
        AND t.task_type IN ('staffing', 'safety')
        AND t.status <> 'completed'
    ) THEN
      RAISE EXCEPTION 'required staffing or safety task is incomplete'
        USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.reservations
    SET lifecycle_status = 'checked_in', status = 'checked_in',
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id RETURNING * INTO v_reservation;
  ELSIF p_transition = 'complete' THEN
    IF v_reservation.lifecycle_status <> 'checked_in' THEN
      RAISE EXCEPTION 'only checked-in bookings can complete' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.reservations
    SET lifecycle_status = 'completed', status = 'checked_out',
        access_preparation_state = 'revoked', access_code_status = 'revoked',
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id RETURNING * INTO v_reservation;
  ELSIF p_transition = 'no_show' THEN
    IF v_reservation.lifecycle_status <> 'confirmed' THEN
      RAISE EXCEPTION 'only confirmed bookings can be marked no-show'
        USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.reservations
    SET lifecycle_status = 'no_show', status = 'no_show',
        access_preparation_state = 'revoked', access_code_status = 'revoked',
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id RETURNING * INTO v_reservation;
  ELSE
    IF v_reservation.lifecycle_status NOT IN ('confirmed', 'checked_in') THEN
      RAISE EXCEPTION 'access can only be revoked for active confirmed bookings'
        USING ERRCODE = 'P0001';
    END IF;
    IF NULLIF(trim(p_reason), '') IS NULL THEN
      RAISE EXCEPTION 'access revocation reason is required' USING ERRCODE = 'P0001';
    END IF;
    UPDATE public.reservations
    SET access_preparation_state = 'revoked', access_code_status = 'revoked',
        workflow_version = workflow_version + 1, updated_at = NOW()
    WHERE id = p_reservation_id RETURNING * INTO v_reservation;
  END IF;

  IF p_transition IN ('complete', 'no_show') THEN
    UPDATE public.booking_capacity_allocations
    SET released_at = NOW(), release_reason = p_transition
    WHERE reservation_id = p_reservation_id AND released_at IS NULL;
    UPDATE public.resource_booking_tasks
    SET status = CASE WHEN task_type = 'reminder' THEN 'cancelled' ELSE status END,
        reason = CASE WHEN task_type = 'reminder' THEN p_transition ELSE reason END
    WHERE reservation_id = p_reservation_id;
  END IF;

  PERFORM public.booking_add_event(
    v_reservation.company_id, v_reservation.id, NULL, NULL,
    'booking_' || p_transition, v_before->>'lifecycle_status',
    v_reservation.lifecycle_status, v_reservation.workflow_version,
    NULLIF(trim(p_reason), '')
  );
  PERFORM public.booking_record_change(
    v_reservation.company_id, 'transition_resource_booking', 'reservations',
    v_reservation.id, v_before, to_jsonb(v_reservation), p_idempotency_key
  );
  IF p_transition IN ('complete', 'no_show') THEN
    PERFORM public.booking_offer_waitlist_internal(v_reservation.bookable_resource_id, 20);
  END IF;

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'transition_resource_booking',
    'entityType', 'reservation', 'entityId', v_reservation.id,
    'reservationId', v_reservation.id, 'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_reservation.company_id, 'transition_resource_booking',
    p_idempotency_key, v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_resource_booking_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_late BOOLEAN;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'expectedVersion', p_expected_version,
    'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_reservation.company_id, 'cancel_resource_booking', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;

  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_reservation.site_id)
    OR public.current_user_has_booking_resource_assignment(
      v_reservation.bookable_resource_id
    )
    OR v_reservation.created_by = (SELECT auth.uid())
    OR public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['owner'])
    OR (
      public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['tenant'])
      AND public.current_user_has_tenant_module_access(v_reservation.unit_id, 'calendar')
    )
  ) THEN
    RAISE EXCEPTION 'booking cancellation is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_reservation.workflow_version <> p_expected_version THEN
    RAISE EXCEPTION 'stale reservation version' USING ERRCODE = '40001';
  END IF;
  IF v_reservation.lifecycle_status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'booking cannot be cancelled in its current state'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'cancellation reason is required' USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_reservation);
  v_late := NOW() > v_reservation.check_in_at
    - make_interval(mins => v_reservation.cancellation_cutoff_minutes);

  UPDATE public.reservations
  SET lifecycle_status = 'cancelled', status = 'cancelled',
      access_preparation_state = 'revoked', access_code_status = 'revoked',
      workflow_version = workflow_version + 1, updated_at = NOW()
  WHERE id = p_reservation_id
  RETURNING * INTO v_reservation;

  UPDATE public.booking_capacity_allocations
  SET released_at = NOW(), release_reason = 'booking_cancelled'
  WHERE reservation_id = p_reservation_id AND released_at IS NULL;
  UPDATE public.resource_booking_tasks
  SET status = 'cancelled', reason = 'booking_cancelled'
  WHERE reservation_id = p_reservation_id
    AND status NOT IN ('completed', 'cancelled');

  PERFORM public.booking_add_event(
    v_reservation.company_id, v_reservation.id, NULL, NULL,
    'booking_cancelled', v_before->>'lifecycle_status', 'cancelled',
    v_reservation.workflow_version, trim(p_reason),
    jsonb_build_object(
      'lateCancellation', v_late,
      'policy', v_reservation.cancellation_policy,
      'settlementTruth', 'manual_review_required'
    )
  );
  PERFORM public.booking_record_change(
    v_reservation.company_id, 'cancel_resource_booking', 'reservations',
    v_reservation.id, v_before, to_jsonb(v_reservation), p_idempotency_key
  );
  PERFORM public.booking_offer_waitlist_internal(v_reservation.bookable_resource_id, 20);

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'cancel_resource_booking',
    'entityType', 'reservation', 'entityId', v_reservation.id,
    'reservationId', v_reservation.id, 'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_reservation.company_id, 'cancel_resource_booking', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_resource_booking_command(
  p_reservation_id UUID,
  p_expected_version INTEGER,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_resource public.bookable_resources%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_allocated BOOLEAN;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'expectedVersion', p_expected_version,
    'startsAt', p_starts_at, 'endsAt', p_ends_at,
    'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_reservation.company_id, 'reschedule_resource_booking',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  SELECT * INTO v_resource
  FROM public.bookable_resources WHERE id = v_reservation.bookable_resource_id FOR UPDATE;

  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_reservation.site_id)
    OR public.current_user_has_booking_resource_assignment(
      v_reservation.bookable_resource_id
    )
    OR v_reservation.created_by = (SELECT auth.uid())
    OR public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['owner'])
    OR (
      public.current_user_has_unit_relationship(v_reservation.unit_id, ARRAY['tenant'])
      AND public.current_user_has_tenant_module_access(v_reservation.unit_id, 'calendar')
    )
  ) THEN
    RAISE EXCEPTION 'booking reschedule is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_reservation.workflow_version <> p_expected_version THEN
    RAISE EXCEPTION 'stale reservation version' USING ERRCODE = '40001';
  END IF;
  IF v_reservation.lifecycle_status NOT IN ('requested', 'confirmed') THEN
    RAISE EXCEPTION 'booking cannot be rescheduled in its current state'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reschedule reason is required' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.booking_validate_window(
    v_reservation.bookable_resource_id, p_starts_at, p_ends_at
  );
  v_before := to_jsonb(v_reservation);

  UPDATE public.booking_capacity_allocations
  SET released_at = NOW(), release_reason = 'booking_rescheduled'
  WHERE reservation_id = p_reservation_id AND released_at IS NULL;

  UPDATE public.reservations
  SET check_in_at = p_starts_at,
      check_out_at = p_ends_at,
      buffered_start_at = p_starts_at - make_interval(mins => buffer_before_minutes),
      buffered_end_at = p_ends_at + make_interval(mins => buffer_after_minutes),
      request_fingerprint = v_fingerprint,
      rescheduled_at = NOW(),
      workflow_version = workflow_version + 1,
      updated_at = NOW()
  WHERE id = p_reservation_id
  RETURNING * INTO v_reservation;

  v_allocated := public.booking_try_allocate_capacity(
    v_reservation.bookable_resource_id, 'reservation', v_reservation.id,
    tstzrange(v_reservation.buffered_start_at, v_reservation.buffered_end_at, '[)'),
    v_reservation.party_size
  );
  IF NOT v_allocated THEN
    RAISE EXCEPTION 'resource capacity is unavailable for the new window'
      USING ERRCODE = '23P01';
  END IF;

  UPDATE public.resource_booking_tasks
  SET status = CASE WHEN task_type = 'reminder' THEN 'queued' ELSE status END,
      due_at = CASE
        WHEN task_type = 'reminder'
          THEN GREATEST(NOW(), p_starts_at - INTERVAL '24 hours')
        WHEN task_type = 'staffing' THEN p_starts_at - INTERVAL '2 hours'
        WHEN task_type = 'safety' THEN p_starts_at - INTERVAL '30 minutes'
        ELSE due_at
      END,
      reason = NULL,
      version = version + 1
  WHERE reservation_id = p_reservation_id
    AND status <> 'completed';

  PERFORM public.booking_add_event(
    v_reservation.company_id, v_reservation.id, NULL, NULL,
    'booking_rescheduled', v_before->>'lifecycle_status',
    v_reservation.lifecycle_status, v_reservation.workflow_version,
    trim(p_reason),
    jsonb_build_object(
      'oldStartsAt', v_before->>'check_in_at',
      'oldEndsAt', v_before->>'check_out_at',
      'newStartsAt', p_starts_at,
      'newEndsAt', p_ends_at
    )
  );
  PERFORM public.booking_record_change(
    v_reservation.company_id, 'reschedule_resource_booking', 'reservations',
    v_reservation.id, v_before, to_jsonb(v_reservation), p_idempotency_key
  );
  PERFORM public.booking_offer_waitlist_internal(v_reservation.bookable_resource_id, 20);

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'reschedule_resource_booking',
    'entityType', 'reservation', 'entityId', v_reservation.id,
    'reservationId', v_reservation.id, 'version', v_reservation.workflow_version,
    'state', v_reservation.lifecycle_status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_reservation.company_id, 'reschedule_resource_booking',
    p_idempotency_key, v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_booking_blackout_command(
  p_resource_id UUID,
  p_starts_at TIMESTAMPTZ,
  p_ends_at TIMESTAMPTZ,
  p_blackout_type TEXT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource public.bookable_resources%ROWTYPE;
  v_blackout public.booking_resource_blackouts%ROWTYPE;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_allocated BOOLEAN;
BEGIN
  SELECT * INTO v_resource
  FROM public.bookable_resources WHERE id = p_resource_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'bookable resource not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'resourceId', p_resource_id, 'startsAt', p_starts_at, 'endsAt', p_ends_at,
    'blackoutType', p_blackout_type, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_resource.company_id, 'create_booking_blackout', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_resource_id::TEXT, 0));
  SELECT * INTO v_resource
  FROM public.bookable_resources WHERE id = p_resource_id FOR UPDATE;
  IF NOT (public.is_platform_super_admin()
      OR public.current_user_can_manage_site(v_resource.site_id)) THEN
    RAISE EXCEPTION 'blackout command is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF p_blackout_type NOT IN ('maintenance', 'commissioning', 'safety', 'admin') THEN
    RAISE EXCEPTION 'invalid blackout type' USING ERRCODE = 'P0001';
  END IF;
  IF p_ends_at <= p_starts_at THEN
    RAISE EXCEPTION 'blackout end must be after start' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'blackout reason is required' USING ERRCODE = 'P0001';
  END IF;

  PERFORM public.booking_expire_holds(p_resource_id);
  INSERT INTO public.booking_resource_blackouts (
    company_id, site_id, resource_id, blackout_type, starts_at, ends_at,
    reason, status, created_by
  ) VALUES (
    v_resource.company_id, v_resource.site_id, v_resource.id,
    p_blackout_type, p_starts_at, p_ends_at, trim(p_reason), 'active',
    (SELECT auth.uid())
  ) RETURNING * INTO v_blackout;

  v_allocated := public.booking_try_allocate_capacity(
    p_resource_id, 'blackout', v_blackout.id,
    tstzrange(p_starts_at, p_ends_at, '[)'), v_resource.capacity
  );
  IF NOT v_allocated THEN
    RAISE EXCEPTION 'blackout conflicts with an active booking or hold'
      USING ERRCODE = '23P01';
  END IF;

  PERFORM public.booking_record_change(
    v_resource.company_id, 'create_booking_blackout',
    'booking_resource_blackouts', v_blackout.id, NULL,
    to_jsonb(v_blackout), p_idempotency_key
  );
  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'create_booking_blackout',
    'entityType', 'blackout', 'entityId', v_blackout.id,
    'blackoutId', v_blackout.id, 'version', v_blackout.version,
    'state', v_blackout.status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_resource.company_id, 'create_booking_blackout', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking_blackout_command(
  p_blackout_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_blackout public.booking_resource_blackouts%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_blackout
  FROM public.booking_resource_blackouts WHERE id = p_blackout_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking blackout not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'blackoutId', p_blackout_id, 'expectedVersion', p_expected_version,
    'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.booking_command_replay(
    v_blackout.company_id, 'cancel_booking_blackout', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_blackout.resource_id::TEXT, 0));
  SELECT * INTO v_blackout
  FROM public.booking_resource_blackouts WHERE id = p_blackout_id FOR UPDATE;
  IF NOT (public.is_platform_super_admin()
      OR public.current_user_can_manage_site(v_blackout.site_id)) THEN
    RAISE EXCEPTION 'blackout command is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_blackout.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale blackout version' USING ERRCODE = '40001';
  END IF;
  IF v_blackout.status <> 'active' THEN
    RAISE EXCEPTION 'blackout is not active' USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'blackout cancellation reason is required' USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_blackout);
  UPDATE public.booking_resource_blackouts
  SET status = 'cancelled', cancelled_by = (SELECT auth.uid()),
      cancelled_at = NOW(), version = version + 1
  WHERE id = p_blackout_id
  RETURNING * INTO v_blackout;
  UPDATE public.booking_capacity_allocations
  SET released_at = NOW(), release_reason = 'blackout_cancelled'
  WHERE blackout_id = p_blackout_id AND released_at IS NULL;

  PERFORM public.booking_record_change(
    v_blackout.company_id, 'cancel_booking_blackout',
    'booking_resource_blackouts', v_blackout.id, v_before,
    to_jsonb(v_blackout), p_idempotency_key
  );
  PERFORM public.booking_offer_waitlist_internal(v_blackout.resource_id, 20);

  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'cancel_booking_blackout',
    'entityType', 'blackout', 'entityId', v_blackout.id,
    'blackoutId', v_blackout.id, 'version', v_blackout.version,
    'state', v_blackout.status, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_blackout.company_id, 'cancel_booking_blackout', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.promote_booking_waitlist_command(
  p_resource_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resource public.bookable_resources%ROWTYPE;
  v_fingerprint TEXT := md5(jsonb_build_object('resourceId', p_resource_id)::TEXT);
  v_replay JSONB;
  v_response JSONB;
  v_promoted INTEGER;
BEGIN
  SELECT * INTO v_resource FROM public.bookable_resources WHERE id = p_resource_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'bookable resource not found' USING ERRCODE = 'P0002'; END IF;
  v_replay := public.booking_command_replay(
    v_resource.company_id, 'promote_booking_waitlist', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;
  IF NOT (
    public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_resource.site_id)
    OR public.current_user_has_booking_resource_assignment(v_resource.id)
  ) THEN
    RAISE EXCEPTION 'waitlist promotion is outside actor scope' USING ERRCODE = '42501';
  END IF;

  v_promoted := public.booking_offer_waitlist_internal(p_resource_id, 100);
  v_response := jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'command', 'promote_booking_waitlist',
    'entityType', 'resource', 'entityId', v_resource.id,
    'version', v_resource.version, 'state', v_resource.commissioning_state,
    'promotedCount', v_promoted, 'replayed', FALSE
  );
  RETURN public.booking_store_receipt(
    v_resource.company_id, 'promote_booking_waitlist', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_lifecycle_workspace(
  p_site_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID := public.current_user_company_id();
  v_role TEXT := public.current_user_profile_role();
  v_resources JSONB := '[]'::JSONB;
  v_eligible_units JSONB := '[]'::JSONB;
  v_eligible_residents JSONB := '[]'::JSONB;
  v_holds JSONB := '[]'::JSONB;
  v_bookings JSONB := '[]'::JSONB;
  v_waitlist JSONB := '[]'::JSONB;
  v_tasks JSONB := '[]'::JSONB;
  v_blackouts JSONB := '[]'::JSONB;
  v_site_name TEXT;
  v_site_code TEXT;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'authenticated profile required' USING ERRCODE = '42501';
  END IF;
  IF v_role = 'accountant' THEN
    RAISE EXCEPTION 'accountants cannot read resident booking workspace rows'
      USING ERRCODE = '42501';
  END IF;

  IF p_site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = p_site_id AND s.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'site is outside actor company' USING ERRCODE = '42501';
  END IF;
  IF p_site_id IS NOT NULL THEN
    SELECT s.name, s.code INTO v_site_name, v_site_code
    FROM public.sites s
    WHERE s.id = p_site_id
      AND s.company_id = v_company_id;
  END IF;
  IF p_site_id IS NOT NULL
     AND NOT public.is_platform_super_admin()
     AND NOT public.current_user_can_view_site(p_site_id)
     AND NOT EXISTS (
       SELECT 1 FROM public.booking_resource_staff_assignments a
       WHERE a.site_id = p_site_id
         AND a.profile_id = (SELECT auth.uid())
         AND a.status = 'active'
         AND a.valid_from <= NOW()
         AND (a.valid_until IS NULL OR a.valid_until > NOW())
     ) THEN
    RAISE EXCEPTION 'site is outside booking scope' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', br.id,
      'siteId', br.site_id,
      'siteName', s.name,
      'siteCode', s.code,
      'typeCode', rt.code,
      'typeName', rt.name,
      'category', rt.category,
      'code', br.code,
      'name', br.name,
      'description', br.description,
      'commissioningState', br.commissioning_state,
      'timezone', br.timezone,
      'capacityMode', br.capacity_mode,
      'capacity', br.capacity,
      'defaultDurationMinutes', br.default_duration_minutes,
      'minDurationMinutes', br.min_duration_minutes,
      'maxDurationMinutes', br.max_duration_minutes,
      'slotIncrementMinutes', br.slot_increment_minutes,
      'bufferBeforeMinutes', br.buffer_before_minutes,
      'bufferAfterMinutes', br.buffer_after_minutes,
      'minimumAdvanceMinutes', br.minimum_advance_minutes,
      'maximumAdvanceDays', br.maximum_advance_days,
      'holdMinutes', br.hold_minutes,
      'approvalRequirement', br.approval_requirement,
      'priceTruth', br.price_truth,
      'priceAmountCents', br.price_amount_cents,
      'depositTruth', br.deposit_truth,
      'depositAmountCents', br.deposit_amount_cents,
      'currency', br.currency,
      'cancellationCutoffMinutes', br.cancellation_cutoff_minutes,
      'cancellationPolicy', br.cancellation_policy,
      'noShowPolicy', br.no_show_policy,
      'requiredStaffCount', br.required_staff_count,
      'safetyCondition', br.safety_condition,
      'accessRequirement', br.access_requirement,
      'version', br.version,
      'openingHours', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'isoWeekday', oh.iso_weekday,
          'intervalNo', oh.interval_no,
          'localStart', oh.local_start,
          'localEnd', oh.local_end,
          'spansNextDay', oh.spans_next_day,
          'isClosed', oh.is_closed
        ) ORDER BY oh.iso_weekday, oh.interval_no)
        FROM public.booking_resource_opening_hours oh
        WHERE oh.resource_id = br.id
      ), '[]'::JSONB)
    ) ORDER BY br.name, br.id), '[]'::JSONB)
    INTO v_resources
    FROM public.bookable_resources br
    JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
    JOIN public.sites s ON s.id = br.site_id AND s.company_id = br.company_id
    WHERE br.company_id = v_company_id
      AND (p_site_id IS NULL OR br.site_id = p_site_id)
      AND public.current_user_can_view_bookable_resource(br.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', u.id,
      'siteId', u.site_id,
      'label', u.unit_no
    ) ORDER BY u.unit_no, u.id), '[]'::JSONB)
    INTO v_eligible_units
    FROM public.units u
    WHERE u.company_id = v_company_id
      AND (p_site_id IS NULL OR u.site_id = p_site_id)
      AND (
        public.is_platform_super_admin()
        OR public.current_user_can_manage_site(u.site_id)
        OR (
          v_role IN ('owner', 'tenant')
          AND EXISTS (
            SELECT 1
            FROM public.unit_residents actor_relation
            WHERE actor_relation.company_id = v_company_id
              AND actor_relation.unit_id = u.id
              AND actor_relation.resident_id =
                public.current_user_linked_resident_id()
              AND actor_relation.relationship = v_role
              AND (actor_relation.end_date IS NULL
                OR actor_relation.end_date >= CURRENT_DATE)
          )
          AND (
            v_role <> 'tenant'
            OR public.current_user_has_tenant_module_access(u.id, 'calendar')
          )
        )
        OR (
          v_role = 'staff'
          AND EXISTS (
            SELECT 1
            FROM public.booking_resource_staff_assignments a
            WHERE a.site_id = u.site_id
              AND a.profile_id = (SELECT auth.uid())
              AND a.status = 'active'
              AND a.valid_from <= NOW()
              AND (a.valid_until IS NULL OR a.valid_until > NOW())
          )
        )
      );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', er.resident_id,
      'unitId', er.unit_id,
      'siteId', er.site_id,
      'label', er.full_name,
      'relationship', er.relationship,
      'isPrimary', er.is_primary
    ) ORDER BY er.full_name, er.resident_id), '[]'::JSONB)
    INTO v_eligible_residents
    FROM (
      SELECT DISTINCT ON (ur.unit_id, resident.id)
        resident.id AS resident_id,
        ur.unit_id,
        u.site_id,
        resident.full_name,
        ur.relationship,
        ur.is_primary
      FROM public.unit_residents ur
      JOIN public.residents resident ON resident.id = ur.resident_id
      JOIN public.units u ON u.id = ur.unit_id
      WHERE u.company_id = v_company_id
        AND resident.company_id = v_company_id
        AND resident.status = 'active'
        AND (p_site_id IS NULL OR u.site_id = p_site_id)
        -- Future move-in residents must be selectable before their relationship
        -- starts. The create-hold command validates the chosen booking date.
        AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
        AND (
          public.is_platform_super_admin()
          OR public.current_user_can_manage_site(u.site_id)
          OR (
            v_role IN ('owner', 'tenant')
            AND EXISTS (
              SELECT 1
              FROM public.unit_residents actor_relation
              WHERE actor_relation.company_id = v_company_id
                AND actor_relation.unit_id = u.id
                AND actor_relation.resident_id =
                  public.current_user_linked_resident_id()
                AND actor_relation.relationship = v_role
                AND (actor_relation.end_date IS NULL
                  OR actor_relation.end_date >= CURRENT_DATE)
            )
            AND (
              v_role <> 'tenant'
              OR public.current_user_has_tenant_module_access(u.id, 'calendar')
            )
          )
          OR (
            v_role = 'staff'
            AND EXISTS (
              SELECT 1
              FROM public.booking_resource_staff_assignments a
              WHERE a.site_id = u.site_id
                AND a.profile_id = (SELECT auth.uid())
                AND a.status = 'active'
                AND a.valid_from <= NOW()
                AND (a.valid_until IS NULL OR a.valid_until > NOW())
            )
          )
        )
      ORDER BY ur.unit_id, resident.id, ur.is_primary DESC, ur.relationship
    ) er;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', h.id,
      'siteId', h.site_id,
      'resourceId', h.resource_id,
      'unitId', h.unit_id,
      'residentId', h.resident_id,
      'partySize', h.party_size,
      'startsAt', h.starts_at,
      'endsAt', h.ends_at,
      'status', h.status,
      'expiresAt', h.expires_at,
      'version', h.version,
      'createdAt', h.created_at
    ) ORDER BY h.starts_at, h.id), '[]'::JSONB)
    INTO v_holds
    FROM public.booking_holds h
    WHERE h.company_id = v_company_id
      AND (p_site_id IS NULL OR h.site_id = p_site_id)
      AND (
        h.requested_by = (SELECT auth.uid())
        OR public.is_platform_super_admin()
        OR public.current_user_can_manage_site(h.site_id)
        OR public.current_user_has_booking_resource_assignment(h.resource_id)
      );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', r.id,
      'siteId', r.site_id,
      'unitId', r.unit_id,
      'residentId', r.resident_id,
      'resourceId', r.bookable_resource_id,
      'resourceName', r.resource_name,
      'guestName', r.guest_name,
      'startsAt', r.check_in_at,
      'endsAt', r.check_out_at,
      'partySize', r.party_size,
      'lifecycleStatus', r.lifecycle_status,
      'approvalState', r.approval_state,
      'paymentState', r.payment_state,
      'depositTruthState', r.deposit_truth_state,
      'accessPreparationState', r.access_preparation_state,
      'priceTruth', r.price_truth,
      'priceAmountCents', r.price_amount_cents,
      'depositAmountCents', r.deposit_amount_cents,
      'currency', r.currency,
      'cancellationCutoffMinutes', r.cancellation_cutoff_minutes,
      'cancellationPolicy', r.cancellation_policy,
      'noShowPolicy', r.no_show_policy,
      'requiredStaffCount', r.required_staff_count,
      'safetyCondition', r.safety_condition,
      'version', r.workflow_version,
      'createdAt', r.created_at,
      'updatedAt', r.updated_at
    ) ORDER BY r.check_in_at, r.id), '[]'::JSONB)
    INTO v_bookings
    FROM public.reservations r
    WHERE r.company_id = v_company_id
      AND (p_site_id IS NULL OR r.site_id = p_site_id)
      AND public.current_user_can_view_reservation(r.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', w.id,
      'siteId', w.site_id,
      'resourceId', w.resource_id,
      'unitId', w.unit_id,
      'residentId', w.resident_id,
      'partySize', w.party_size,
      'startsAt', w.starts_at,
      'endsAt', w.ends_at,
      'priority', w.priority,
      'status', w.status,
      'offeredHoldId', w.offered_hold_id,
      'offerExpiresAt', w.offer_expires_at,
      'version', w.version,
      'createdAt', w.created_at
    ) ORDER BY w.priority DESC, w.created_at, w.id), '[]'::JSONB)
    INTO v_waitlist
    FROM public.booking_waitlist_entries w
    WHERE w.company_id = v_company_id
      AND (p_site_id IS NULL OR w.site_id = p_site_id)
      AND (
        w.requested_by = (SELECT auth.uid())
        OR public.is_platform_super_admin()
        OR public.current_user_can_manage_site(w.site_id)
        OR public.current_user_has_booking_resource_assignment(w.resource_id)
      );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', t.id,
      'siteId', t.site_id,
      'reservationId', t.reservation_id,
      'resourceId', t.resource_id,
      'taskType', t.task_type,
      'title', t.title,
      'status', t.status,
      'assignedProfileId', t.assigned_profile_id,
      'dueAt', t.due_at,
      'reason', t.reason,
      'version', t.version
    ) ORDER BY t.due_at NULLS LAST, t.id), '[]'::JSONB)
    INTO v_tasks
    FROM public.resource_booking_tasks t
    WHERE t.company_id = v_company_id
      AND (p_site_id IS NULL OR t.site_id = p_site_id)
      AND (
        t.assigned_profile_id = (SELECT auth.uid())
        OR public.is_platform_super_admin()
        OR public.current_user_can_manage_site(t.site_id)
        OR public.current_user_can_view_reservation(t.reservation_id)
      );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', b.id,
      'siteId', b.site_id,
      'resourceId', b.resource_id,
      'blackoutType', b.blackout_type,
      'startsAt', b.starts_at,
      'endsAt', b.ends_at,
      'reason', b.reason,
      'status', b.status,
      'version', b.version
    ) ORDER BY b.starts_at, b.id), '[]'::JSONB)
    INTO v_blackouts
    FROM public.booking_resource_blackouts b
    WHERE b.company_id = v_company_id
      AND (p_site_id IS NULL OR b.site_id = p_site_id)
      AND public.current_user_can_view_bookable_resource(b.resource_id);
  RETURN jsonb_build_object(
    'contractVersion', 'booking-lifecycle.v1',
    'generatedAt', NOW(),
    'scope', jsonb_build_object(
      'siteId', p_site_id,
      'siteName', v_site_name,
      'siteCode', v_site_code,
      'role', v_role
    ),
    'resources', v_resources,
    'eligibleUnits', v_eligible_units,
    'eligibleResidents', v_eligible_residents,
    'holds', v_holds,
    'bookings', v_bookings,
    'waitlist', v_waitlist,
    'tasks', v_tasks,
    'blackouts', v_blackouts
  );
END;
$$;

-- Cross-entity integrity for command-owned rows.
CREATE OR REPLACE FUNCTION public.booking_assert_party_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.unit_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.units u
    WHERE u.id = NEW.unit_id
      AND u.company_id = NEW.company_id
      AND u.site_id = NEW.site_id
  ) THEN
    RAISE EXCEPTION 'booking party unit is outside resource scope'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.resident_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.unit_residents ur
    WHERE ur.company_id = NEW.company_id
      AND ur.unit_id = NEW.unit_id
      AND ur.resident_id = NEW.resident_id
      AND (ur.start_date IS NULL OR ur.start_date <=
        (NEW.starts_at AT TIME ZONE 'Europe/Istanbul')::DATE)
      AND (ur.end_date IS NULL OR ur.end_date >=
        (NEW.starts_at AT TIME ZONE 'Europe/Istanbul')::DATE)
  ) THEN
    RAISE EXCEPTION 'booking resident is not actively related to the unit'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_staff_assignment_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.profile_id
      AND p.company_id = NEW.company_id
      AND p.role = 'staff'
  ) THEN
    RAISE EXCEPTION 'booking assignment requires a same-company staff profile'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_task_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.id = NEW.reservation_id
      AND r.company_id = NEW.company_id
      AND r.site_id = NEW.site_id
      AND r.bookable_resource_id = NEW.resource_id
  ) THEN
    RAISE EXCEPTION 'booking task crosses reservation scope'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.assigned_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.assigned_profile_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'booking task assignee crosses company scope'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_event_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  IF NEW.reservation_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM public.reservations WHERE id = NEW.reservation_id;
  ELSIF NEW.hold_id IS NOT NULL THEN
    SELECT company_id INTO v_company_id FROM public.booking_holds WHERE id = NEW.hold_id;
  ELSE
    SELECT company_id INTO v_company_id
    FROM public.booking_waitlist_entries WHERE id = NEW.waitlist_entry_id;
  END IF;
  IF v_company_id IS NULL OR v_company_id IS DISTINCT FROM NEW.company_id THEN
    RAISE EXCEPTION 'booking event crosses company scope' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_receipt_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.actor_profile_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'booking receipt actor crosses company scope'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_opening_interval()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_new_start INTEGER;
  v_new_end INTEGER;
  v_existing RECORD;
  v_old_start INTEGER;
  v_old_end INTEGER;
BEGIN
  IF NEW.is_closed THEN RETURN NEW; END IF;
  v_new_start := (NEW.iso_weekday - 1) * 1440
    + floor(EXTRACT(EPOCH FROM NEW.local_start) / 60)::INTEGER;
  v_new_end := (NEW.iso_weekday - 1) * 1440
    + ceil(EXTRACT(EPOCH FROM NEW.local_end) / 60)::INTEGER
    + CASE WHEN NEW.spans_next_day THEN 1440 ELSE 0 END;

  FOR v_existing IN
    SELECT * FROM public.booking_resource_opening_hours oh
    WHERE oh.resource_id = NEW.resource_id
      AND oh.id <> NEW.id
      AND NOT oh.is_closed
  LOOP
    v_old_start := (v_existing.iso_weekday - 1) * 1440
      + floor(EXTRACT(EPOCH FROM v_existing.local_start) / 60)::INTEGER;
    v_old_end := (v_existing.iso_weekday - 1) * 1440
      + ceil(EXTRACT(EPOCH FROM v_existing.local_end) / 60)::INTEGER
      + CASE WHEN v_existing.spans_next_day THEN 1440 ELSE 0 END;
    IF int4range(v_new_start, v_new_end, '[)') && int4range(v_old_start, v_old_end, '[)')
       OR int4range(v_new_start, v_new_end, '[)') && int4range(v_old_start - 10080, v_old_end - 10080, '[)')
       OR int4range(v_new_start, v_new_end, '[)') && int4range(v_old_start + 10080, v_old_end + 10080, '[)') THEN
      RAISE EXCEPTION 'opening-hour intervals overlap' USING ERRCODE = '23P01';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.booking_assert_waitlist_offer()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'offered' AND NOT EXISTS (
    SELECT 1 FROM public.booking_holds h
    WHERE h.id = NEW.offered_hold_id
      AND h.resource_id = NEW.resource_id
      AND h.requested_by = NEW.requested_by
      AND h.starts_at = NEW.starts_at
      AND h.ends_at = NEW.ends_at
      AND h.status = 'active'
      AND NEW.offer_expires_at = h.expires_at
  ) THEN
    RAISE EXCEPTION 'waitlist offer does not match its active hold'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.status <> 'offered'
     AND (NEW.offer_expires_at IS NOT NULL
       OR (NEW.status IN ('waiting', 'cancelled', 'expired') AND NEW.offered_hold_id IS NOT NULL)) THEN
    RAISE EXCEPTION 'waitlist offer fields are inconsistent with status'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER booking_hold_party_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, unit_id, resident_id, starts_at
ON public.booking_holds
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_party_scope();
CREATE TRIGGER booking_waitlist_party_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, unit_id, resident_id, starts_at
ON public.booking_waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_party_scope();
CREATE TRIGGER booking_staff_assignment_scope_guard
BEFORE INSERT OR UPDATE OF company_id, profile_id
ON public.booking_resource_staff_assignments
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_staff_assignment_scope();
CREATE TRIGGER booking_task_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, reservation_id, resource_id, assigned_profile_id
ON public.resource_booking_tasks
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_task_scope();
CREATE TRIGGER booking_event_scope_guard
BEFORE INSERT ON public.resource_booking_events
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_event_scope();
CREATE TRIGGER booking_receipt_scope_guard
BEFORE INSERT ON public.booking_command_receipts
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_receipt_scope();
CREATE TRIGGER booking_opening_interval_guard
BEFORE INSERT OR UPDATE ON public.booking_resource_opening_hours
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_opening_interval();
CREATE TRIGGER booking_waitlist_offer_guard
BEFORE INSERT OR UPDATE OF status, offered_hold_id, offer_expires_at
ON public.booking_waitlist_entries
FOR EACH ROW EXECUTE FUNCTION public.booking_assert_waitlist_offer();

-- ---------------------------------------------------------------------------
-- Command-only writes and exact read scope.
-- ---------------------------------------------------------------------------

ALTER TABLE public.booking_resource_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookable_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_capacity_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_resource_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_capacity_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_booking_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_booking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy RECORD;
  v_function RECORD;
BEGIN
  FOR v_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reservations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.reservations', v_policy.policyname);
  END LOOP;

  FOR v_function IN
    SELECT p.oid::regprocedure AS signature
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'decide_reservation_approval_command'
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      v_function.signature);
  END LOOP;
END;
$$;

CREATE POLICY reservations_booking_exact_select
ON public.reservations
FOR SELECT TO authenticated
USING (public.current_user_can_view_reservation(id));

CREATE POLICY booking_resource_types_select
ON public.booking_resource_types
FOR SELECT TO authenticated
USING (
  company_id = public.current_user_company_id()
  AND public.current_user_profile_role() <> 'accountant'
  AND (
    public.is_platform_super_admin()
    OR EXISTS (
      SELECT 1 FROM public.bookable_resources br
      WHERE br.resource_type_id = booking_resource_types.id
        AND public.current_user_can_view_bookable_resource(br.id)
    )
  )
);

CREATE POLICY bookable_resources_exact_select
ON public.bookable_resources
FOR SELECT TO authenticated
USING (public.current_user_can_view_bookable_resource(id));

CREATE POLICY booking_opening_hours_exact_select
ON public.booking_resource_opening_hours
FOR SELECT TO authenticated
USING (public.current_user_can_view_bookable_resource(resource_id));

CREATE POLICY booking_entitlements_exact_select
ON public.booking_resource_entitlements
FOR SELECT TO authenticated
USING (public.current_user_can_view_bookable_resource(resource_id));

CREATE POLICY booking_staff_assignments_exact_select
ON public.booking_resource_staff_assignments
FOR SELECT TO authenticated
USING (
  profile_id = (SELECT auth.uid())
  OR public.is_platform_super_admin()
  OR public.current_user_can_manage_site(site_id)
);

CREATE POLICY booking_capacity_units_exact_select
ON public.booking_resource_capacity_units
FOR SELECT TO authenticated
USING (public.current_user_can_view_bookable_resource(resource_id));

CREATE POLICY booking_blackouts_exact_select
ON public.booking_resource_blackouts
FOR SELECT TO authenticated
USING (public.current_user_can_view_bookable_resource(resource_id));

CREATE POLICY booking_holds_exact_select
ON public.booking_holds
FOR SELECT TO authenticated
USING (
  requested_by = (SELECT auth.uid())
  OR public.is_platform_super_admin()
  OR public.current_user_can_manage_site(site_id)
  OR public.current_user_has_booking_resource_assignment(resource_id)
);

CREATE POLICY booking_waitlist_exact_select
ON public.booking_waitlist_entries
FOR SELECT TO authenticated
USING (
  requested_by = (SELECT auth.uid())
  OR public.is_platform_super_admin()
  OR public.current_user_can_manage_site(site_id)
  OR public.current_user_has_booking_resource_assignment(resource_id)
);

CREATE POLICY booking_tasks_exact_select
ON public.resource_booking_tasks
FOR SELECT TO authenticated
USING (
  assigned_profile_id = (SELECT auth.uid())
  OR public.is_platform_super_admin()
  OR public.current_user_can_manage_site(site_id)
  OR public.current_user_can_view_reservation(reservation_id)
);

CREATE POLICY booking_events_exact_select
ON public.resource_booking_events
FOR SELECT TO authenticated
USING (
  (reservation_id IS NOT NULL AND public.current_user_can_view_reservation(reservation_id))
  OR EXISTS (
    SELECT 1 FROM public.booking_holds h
    WHERE h.id = resource_booking_events.hold_id
      AND (
        h.requested_by = (SELECT auth.uid())
        OR public.is_platform_super_admin()
        OR public.current_user_can_manage_site(h.site_id)
        OR public.current_user_has_booking_resource_assignment(h.resource_id)
      )
  )
  OR EXISTS (
    SELECT 1 FROM public.booking_waitlist_entries w
    WHERE w.id = resource_booking_events.waitlist_entry_id
      AND (
        w.requested_by = (SELECT auth.uid())
        OR public.is_platform_super_admin()
        OR public.current_user_can_manage_site(w.site_id)
        OR public.current_user_has_booking_resource_assignment(w.resource_id)
      )
  )
);

REVOKE ALL ON TABLE
  public.booking_resource_types,
  public.bookable_resources,
  public.booking_resource_opening_hours,
  public.booking_resource_entitlements,
  public.booking_resource_staff_assignments,
  public.booking_resource_capacity_units,
  public.booking_resource_blackouts,
  public.booking_holds,
  public.booking_waitlist_entries,
  public.booking_capacity_allocations,
  public.resource_booking_tasks,
  public.resource_booking_events,
  public.booking_command_receipts
FROM anon, authenticated;

REVOKE ALL ON TABLE public.reservations FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.booking_resource_types,
  public.bookable_resources,
  public.booking_resource_opening_hours,
  public.booking_resource_entitlements,
  public.booking_resource_staff_assignments,
  public.booking_resource_capacity_units,
  public.booking_resource_blackouts,
  public.booking_holds,
  public.booking_waitlist_entries,
  public.resource_booking_tasks,
  public.resource_booking_events
TO authenticated;

-- RLS limits rows, while this explicit column allowlist prevents browser roles
-- from selecting free-text, identifiers used for replay, actor metadata, or
-- internal payment/access truth. Rich projections stay behind command/workspace
-- RPCs, which revalidate the actor on every call.
GRANT SELECT (
  id,
  company_id,
  site_id,
  unit_id,
  resource_name,
  check_in_at,
  check_out_at,
  status,
  approval_status,
  created_at,
  updated_at
) ON public.reservations TO authenticated;

REVOKE ALL ON FUNCTION public.booking_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_reject_history_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_resource_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_sync_capacity_units() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_capacity_allocation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_buffer_snapshot() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_reservation_resource() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_actor_can_request(UUID, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_resource_window_is_open(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_validate_window(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_command_replay(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_store_receipt(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_record_change(UUID, TEXT, TEXT, UUID, JSONB, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_add_event(UUID, UUID, UUID, UUID, TEXT, TEXT, TEXT, INTEGER, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_try_allocate_capacity(UUID, TEXT, UUID, TSTZRANGE, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_expire_holds(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_offer_waitlist_internal(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_party_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_staff_assignment_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_task_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_event_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_receipt_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_opening_interval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_assert_waitlist_offer() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_booking_hold_command(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decide_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_resource_booking_finance_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_resource_booking_command(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reschedule_resource_booking_command(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_booking_blackout_command(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_booking_blackout_command(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.promote_booking_waitlist_command(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_lifecycle_workspace(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_booking_hold_command(UUID, UUID, UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.commit_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_resource_booking_finance_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_resource_booking_command(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_resource_booking_command(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_resource_booking_command(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_booking_blackout_command(UUID, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking_blackout_command(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_booking_waitlist_command(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.booking_lifecycle_workspace(UUID) TO authenticated;

COMMENT ON FUNCTION public.booking_lifecycle_workspace(UUID) IS
  'UC18 resident booking workspace. Accountant execution is denied; finance reporting requires a separately approved redacted aggregate contract. All writes use idempotent command RPCs.';
