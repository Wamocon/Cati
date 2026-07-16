-- UC18 move-in, move-out and handover workflow.
-- The appointment is anchored to the canonical reservation created by
-- migration 32. Operational work, access preparation and deposit settlement
-- stay in their existing phase-10/11 tables.

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE public.move_handover_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  unit_resident_id UUID NOT NULL REFERENCES public.unit_residents(id) ON DELETE RESTRICT,
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE RESTRICT,
  appointment_kind TEXT NOT NULL
    CHECK (appointment_kind IN ('move_in', 'move_out', 'handover')),
  relationship_snapshot TEXT NOT NULL
    CHECK (relationship_snapshot IN ('owner', 'tenant', 'guest', 'family', 'authorized_contact')),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  scheduled_range TSTZRANGE GENERATED ALWAYS AS
    (tstzrange(starts_at, ends_at, '[)')) STORED,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'preparing', 'ready', 'in_progress', 'completed', 'cancelled')),
  coordinator_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  cancelled_at TIMESTAMPTZ,
  rescheduled_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at),
  CHECK ((status = 'cancelled') = (cancelled_at IS NOT NULL)),
  UNIQUE (reservation_id),
  UNIQUE (id, company_id, site_id)
);

ALTER TABLE public.move_handover_appointments
  ADD CONSTRAINT move_handover_no_unit_overlap
  EXCLUDE USING gist (
    unit_id WITH =,
    scheduled_range WITH &&
  ) WHERE (status IN ('scheduled', 'preparing', 'ready', 'in_progress'));

CREATE TABLE public.move_handover_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.move_handover_appointments(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL CHECK (item_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  label_key TEXT NOT NULL CHECK (length(label_key) BETWEEN 3 AND 160),
  required BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'blocked', 'not_applicable')),
  notes TEXT,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'completed') = (completed_at IS NOT NULL)),
  UNIQUE (appointment_id, item_code)
);

CREATE TABLE public.move_handover_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.move_handover_appointments(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE RESTRICT,
  evidence_type TEXT NOT NULL
    CHECK (evidence_type IN ('identity', 'condition', 'meter', 'key_handover', 'signature', 'other')),
  notes TEXT,
  added_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, document_id, evidence_type)
);

CREATE TABLE public.move_handover_meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.move_handover_appointments(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL
    CHECK (meter_type IN ('electricity', 'water', 'gas', 'heat', 'other')),
  reading_numeric NUMERIC(20, 6) NOT NULL CHECK (reading_numeric >= 0),
  reading_unit TEXT NOT NULL CHECK (length(reading_unit) BETWEEN 1 AND 24),
  read_at TIMESTAMPTZ NOT NULL,
  evidence_document_id UUID REFERENCES public.documents(id) ON DELETE RESTRICT,
  supersedes_id UUID REFERENCES public.move_handover_meter_readings(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (supersedes_id IS NULL OR supersedes_id <> id)
);

CREATE TABLE public.move_handover_condition_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.move_handover_appointments(id) ON DELETE CASCADE,
  area_code TEXT NOT NULL CHECK (area_code ~ '^[a-z0-9][a-z0-9_-]{1,63}$'),
  condition_state TEXT NOT NULL
    CHECK (condition_state IN ('good', 'fair', 'damaged', 'not_inspected')),
  notes TEXT,
  evidence_document_id UUID REFERENCES public.documents(id) ON DELETE RESTRICT,
  supersedes_id UUID REFERENCES public.move_handover_condition_observations(id) ON DELETE RESTRICT,
  recorded_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT
    DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (supersedes_id IS NULL OR supersedes_id <> id)
);

CREATE TABLE public.move_handover_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.move_handover_appointments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT,
  appointment_version INTEGER NOT NULL CHECK (appointment_version > 0),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (appointment_id, appointment_version)
);

CREATE TABLE public.move_handover_command_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  command_name TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  stable_response JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

ALTER TABLE public.turnover_work_items
  ADD COLUMN IF NOT EXISTS move_handover_appointment_id UUID
    REFERENCES public.move_handover_appointments(id) ON DELETE SET NULL;
ALTER TABLE public.access_handoff_requests
  ADD COLUMN IF NOT EXISTS move_handover_appointment_id UUID
    REFERENCES public.move_handover_appointments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preparation_truth TEXT NOT NULL DEFAULT 'blocked'
    CHECK (preparation_truth IN ('blocked', 'manual_ready', 'provider_ready', 'revoked')),
  ADD COLUMN IF NOT EXISTS human_approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS human_approved_at TIMESTAMPTZ;
ALTER TABLE public.deposit_settlements
  ADD COLUMN IF NOT EXISTS move_handover_appointment_id UUID
    REFERENCES public.move_handover_appointments(id) ON DELETE SET NULL;

-- Every active site gets an explicit, human-controlled move slot and handover
-- resource.  This is configuration only: it never fabricates a resident,
-- reservation, approval, payment, deposit, or provider execution result.
INSERT INTO public.bookable_resources (
  company_id, site_id, resource_type_id, code, name, description,
  commissioning_state, capacity_mode, capacity, default_duration_minutes,
  min_duration_minutes, max_duration_minutes, slot_increment_minutes,
  maximum_advance_days, approval_requirement, price_truth, deposit_truth,
  access_requirement
)
SELECT
  s.company_id, s.id, rt.id, seed.code, seed.name,
  'UC18 managed move/handover resource; physical access remains human-controlled.',
  'active', 'exclusive', 1, 60, 30, 720, 15, 730, 'manager', 'free',
  'not_required', 'manual'
FROM public.sites s
JOIN public.booking_resource_types rt
  ON rt.company_id = s.company_id
JOIN (
  VALUES
    ('move-loading-slot', 'Taşınma yükleme alanı', 'move_loading_slot'),
    ('handover-appointment', 'Konut teslim randevusu', 'handover_appointment')
) AS seed(code, name, category)
  ON seed.category = rt.category
WHERE rt.status = 'active'
ON CONFLICT (site_id, code) DO NOTHING;

INSERT INTO public.booking_resource_opening_hours (
  company_id, site_id, resource_id, iso_weekday, interval_no,
  local_start, local_end, spans_next_day, is_closed
)
SELECT br.company_id, br.site_id, br.id, weekday, 1,
       TIME '00:00:00', TIME '23:59:59.999999', FALSE, FALSE
FROM public.bookable_resources br
CROSS JOIN generate_series(1, 7) AS weekday
JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
WHERE rt.category IN ('move_loading_slot', 'handover_appointment')
ON CONFLICT (resource_id, iso_weekday, interval_no) DO NOTHING;

INSERT INTO public.booking_resource_entitlements (
  company_id, site_id, resource_id, role, relationship,
  requires_unit_relationship
)
SELECT br.company_id, br.site_id, br.id, entitlement.role,
       entitlement.relationship, entitlement.requires_unit_relationship
FROM public.bookable_resources br
JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
CROSS JOIN (
  VALUES
    ('owner', 'owner', TRUE),
    ('tenant', 'tenant', TRUE),
    ('staff', NULL::TEXT, FALSE)
) AS entitlement(role, relationship, requires_unit_relationship)
WHERE rt.category IN ('move_loading_slot', 'handover_appointment')
ON CONFLICT (resource_id, role) DO NOTHING;

CREATE UNIQUE INDEX turnover_work_items_appointment_work_type_active
  ON public.turnover_work_items(
    move_handover_appointment_id,
    ((metadata->>'moveHandoverWorkType'))
  )
  WHERE move_handover_appointment_id IS NOT NULL
    AND status <> 'ready';
CREATE UNIQUE INDEX access_handoff_appointment_active
  ON public.access_handoff_requests(
    move_handover_appointment_id, credential_type
  )
  WHERE move_handover_appointment_id IS NOT NULL
    AND status NOT IN ('succeeded', 'failed');
CREATE UNIQUE INDEX deposit_settlements_appointment_unique
  ON public.deposit_settlements(move_handover_appointment_id)
  WHERE move_handover_appointment_id IS NOT NULL;

CREATE INDEX move_handover_scope_schedule_idx
  ON public.move_handover_appointments(company_id, site_id, starts_at, status);
CREATE INDEX move_handover_checklist_idx
  ON public.move_handover_checklist_items(appointment_id, required, status);
CREATE INDEX move_handover_evidence_idx
  ON public.move_handover_evidence(appointment_id, evidence_type, created_at);
CREATE INDEX move_handover_meter_idx
  ON public.move_handover_meter_readings(appointment_id, meter_type, read_at DESC);
CREATE INDEX move_handover_condition_idx
  ON public.move_handover_condition_observations(appointment_id, area_code, created_at DESC);

CREATE OR REPLACE FUNCTION public.move_handover_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_reject_history_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'move/handover history is append-only' USING ERRCODE = '42501';
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_assert_appointment_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_relation public.unit_residents%ROWTYPE;
  v_category TEXT;
BEGIN
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = NEW.reservation_id;
  SELECT ur.* INTO v_relation
  FROM public.unit_residents ur WHERE ur.id = NEW.unit_resident_id;
  SELECT rt.category INTO v_category
  FROM public.bookable_resources br
  JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
  WHERE br.id = v_reservation.bookable_resource_id;

  IF v_reservation.id IS NULL
     OR v_reservation.company_id IS DISTINCT FROM NEW.company_id
     OR v_reservation.site_id IS DISTINCT FROM NEW.site_id
     OR v_reservation.unit_id IS DISTINCT FROM NEW.unit_id
     OR v_reservation.resident_id IS DISTINCT FROM NEW.resident_id
     OR v_reservation.check_in_at IS DISTINCT FROM NEW.starts_at
     OR v_reservation.check_out_at IS DISTINCT FROM NEW.ends_at THEN
    RAISE EXCEPTION 'appointment does not match its canonical reservation'
      USING ERRCODE = '23514';
  END IF;

  IF v_category NOT IN ('move_loading_slot', 'handover_appointment') THEN
    RAISE EXCEPTION 'reservation resource is not a move/handover resource'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.appointment_kind = 'handover' AND v_category <> 'handover_appointment' THEN
    RAISE EXCEPTION 'handover requires a handover appointment resource'
      USING ERRCODE = '23514';
  END IF;

  IF v_relation.id IS NULL
     OR v_relation.company_id IS DISTINCT FROM NEW.company_id
     OR v_relation.unit_id IS DISTINCT FROM NEW.unit_id
     OR v_relation.resident_id IS DISTINCT FROM NEW.resident_id
     OR v_relation.relationship IS DISTINCT FROM NEW.relationship_snapshot
     OR (v_relation.start_date IS NOT NULL
       AND v_relation.start_date > (NEW.starts_at AT TIME ZONE 'Europe/Istanbul')::DATE)
     OR (v_relation.end_date IS NOT NULL
       AND v_relation.end_date < (NEW.starts_at AT TIME ZONE 'Europe/Istanbul')::DATE) THEN
    RAISE EXCEPTION 'appointment resident relationship is not valid for the scheduled date'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.coordinator_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = NEW.coordinator_profile_id AND p.company_id = NEW.company_id
  ) THEN
    RAISE EXCEPTION 'appointment coordinator crosses company scope'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_assert_detail_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.move_handover_appointments a
    WHERE a.id = NEW.appointment_id
      AND a.company_id = NEW.company_id
      AND a.site_id = NEW.site_id
  ) THEN
    RAISE EXCEPTION 'move/handover detail crosses appointment scope'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_assert_supersession()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.supersedes_id IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'move_handover_meter_readings' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.move_handover_meter_readings prior
      WHERE prior.id = NEW.supersedes_id
        AND prior.appointment_id = NEW.appointment_id
        AND prior.meter_type = NEW.meter_type
    ) THEN
      RAISE EXCEPTION 'meter supersession must reference the same appointment and meter type'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM public.move_handover_condition_observations prior
      WHERE prior.id = NEW.supersedes_id
        AND prior.appointment_id = NEW.appointment_id
        AND prior.area_code = NEW.area_code
    ) THEN
      RAISE EXCEPTION 'condition supersession must reference the same appointment and area'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER move_handover_appointment_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, unit_id, resident_id,
  unit_resident_id, reservation_id, appointment_kind, relationship_snapshot,
  starts_at, ends_at, coordinator_profile_id
ON public.move_handover_appointments
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_appointment_scope();
CREATE TRIGGER move_handover_appointment_touch
BEFORE UPDATE ON public.move_handover_appointments
FOR EACH ROW EXECUTE FUNCTION public.move_handover_touch_updated_at();
CREATE TRIGGER move_handover_checklist_scope_guard
BEFORE INSERT OR UPDATE OF company_id, site_id, appointment_id
ON public.move_handover_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_detail_scope();
CREATE TRIGGER move_handover_checklist_touch
BEFORE UPDATE ON public.move_handover_checklist_items
FOR EACH ROW EXECUTE FUNCTION public.move_handover_touch_updated_at();
CREATE TRIGGER move_handover_evidence_scope_guard
BEFORE INSERT ON public.move_handover_evidence
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_detail_scope();
CREATE TRIGGER move_handover_meter_scope_guard
BEFORE INSERT ON public.move_handover_meter_readings
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_detail_scope();
CREATE TRIGGER move_handover_condition_scope_guard
BEFORE INSERT ON public.move_handover_condition_observations
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_detail_scope();
CREATE TRIGGER move_handover_meter_supersession_guard
BEFORE INSERT ON public.move_handover_meter_readings
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_supersession();
CREATE TRIGGER move_handover_condition_supersession_guard
BEFORE INSERT ON public.move_handover_condition_observations
FOR EACH ROW EXECUTE FUNCTION public.move_handover_assert_supersession();
CREATE TRIGGER move_handover_evidence_append_only
BEFORE UPDATE OR DELETE ON public.move_handover_evidence
FOR EACH ROW EXECUTE FUNCTION public.move_handover_reject_history_mutation();
CREATE TRIGGER move_handover_meter_append_only
BEFORE UPDATE OR DELETE ON public.move_handover_meter_readings
FOR EACH ROW EXECUTE FUNCTION public.move_handover_reject_history_mutation();
CREATE TRIGGER move_handover_condition_append_only
BEFORE UPDATE OR DELETE ON public.move_handover_condition_observations
FOR EACH ROW EXECUTE FUNCTION public.move_handover_reject_history_mutation();
CREATE TRIGGER move_handover_events_append_only
BEFORE UPDATE OR DELETE ON public.move_handover_events
FOR EACH ROW EXECUTE FUNCTION public.move_handover_reject_history_mutation();
CREATE TRIGGER move_handover_receipts_append_only
BEFORE UPDATE OR DELETE ON public.move_handover_command_receipts
FOR EACH ROW EXECUTE FUNCTION public.move_handover_reject_history_mutation();

ALTER TABLE public.access_handoff_requests
  ADD CONSTRAINT access_handoff_human_truth_check CHECK (
    preparation_truth IN ('blocked', 'revoked')
    OR (human_approved_by IS NOT NULL AND human_approved_at IS NOT NULL)
  ) NOT VALID;
ALTER TABLE public.access_handoff_requests
  VALIDATE CONSTRAINT access_handoff_human_truth_check;

CREATE OR REPLACE FUNCTION public.current_user_can_view_move_handover(
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.move_handover_appointments a
    JOIN public.reservations r ON r.id = a.reservation_id
    WHERE a.id = p_appointment_id
      AND a.company_id = public.current_user_company_id()
      AND public.current_user_profile_role() <> 'accountant'
      AND (
        public.is_platform_super_admin()
        OR public.current_user_can_manage_site(a.site_id)
        OR a.created_by = (SELECT auth.uid())
        OR a.coordinator_profile_id = (SELECT auth.uid())
        OR public.current_user_has_booking_resource_assignment(r.bookable_resource_id)
        OR (
          public.current_user_profile_role() = 'owner'
          AND public.current_user_has_unit_relationship(a.unit_id, ARRAY['owner'])
        )
        OR (
          public.current_user_profile_role() = 'tenant'
          AND public.current_user_has_unit_relationship(a.unit_id, ARRAY['tenant'])
          AND public.current_user_has_tenant_module_access(a.unit_id, 'calendar')
        )
        OR public.current_user_is_linked_resident(a.resident_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_move_handover(
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.move_handover_appointments a
    JOIN public.reservations r ON r.id = a.reservation_id
    WHERE a.id = p_appointment_id
      AND a.company_id = public.current_user_company_id()
      AND public.current_user_profile_role() IN ('admin', 'manager', 'staff')
      AND (
        public.is_platform_super_admin()
        OR public.current_user_can_manage_site(a.site_id)
        OR a.coordinator_profile_id = (SELECT auth.uid())
        OR public.current_user_has_booking_resource_assignment(r.bookable_resource_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_use_move_handover_document(
  p_document_id UUID,
  p_appointment_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.documents d
    JOIN public.move_handover_appointments a ON a.id = p_appointment_id
    WHERE d.id = p_document_id
      AND d.company_id = a.company_id
      AND d.status = 'active'
      AND d.review_status = 'approved'
      AND (d.site_id IS NULL OR d.site_id = a.site_id)
      AND (d.unit_id IS NULL OR d.unit_id = a.unit_id)
      AND (d.resident_id IS NULL OR d.resident_id = a.resident_id)
      AND public.current_user_can_view_move_handover(a.id)
      AND (
        public.is_platform_super_admin()
        OR CASE public.current_user_profile_role()
          WHEN 'admin' THEN public.current_user_is_organization_admin(d.company_id)
          WHEN 'manager' THEN d.site_id IS NOT NULL
            AND public.current_user_can_manage_site(d.site_id)
          WHEN 'staff' THEN d.uploaded_by = (SELECT auth.uid())
          WHEN 'owner' THEN d.unit_id IS NOT NULL
            AND public.current_user_has_unit_relationship(d.unit_id, ARRAY['owner'])
            AND (
              d.uploaded_by = (SELECT auth.uid())
              OR (
                d.visibility = 'unit'
                AND d.retention_class <> 'identity'
                AND (d.resident_id IS NULL
                  OR public.current_user_is_linked_resident(d.resident_id))
              )
            )
          WHEN 'tenant' THEN d.unit_id IS NOT NULL
            AND public.current_user_has_tenant_module_access(d.unit_id, 'documents')
            AND (
              d.uploaded_by = (SELECT auth.uid())
              OR (
                d.visibility = 'unit'
                AND d.retention_class <> 'identity'
                AND (d.resident_id IS NULL
                  OR public.current_user_is_linked_resident(d.resident_id))
              )
            )
          ELSE FALSE
        END
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.move_handover_command_replay(
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
  v_receipt public.move_handover_command_receipts%ROWTYPE;
  v_actor UUID := (SELECT auth.uid());
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'authenticated profile required' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR length(p_idempotency_key) NOT BETWEEN 8 AND 180 THEN
    RAISE EXCEPTION 'idempotency key must contain 8 to 180 characters'
      USING ERRCODE = 'P0001';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(
    p_company_id::TEXT || ':' || v_actor::TEXT || ':' || p_idempotency_key, 0
  ));
  SELECT * INTO v_receipt
  FROM public.move_handover_command_receipts
  WHERE company_id = p_company_id
    AND actor_profile_id = v_actor
    AND idempotency_key = p_idempotency_key;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF v_receipt.command_name IS DISTINCT FROM p_command_name
     OR v_receipt.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
    RAISE EXCEPTION 'idempotency key was already used with different semantics'
      USING ERRCODE = '23505';
  END IF;
  RETURN jsonb_set(v_receipt.stable_response, '{replayed}', 'true'::JSONB, TRUE);
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_store_receipt(
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
  INSERT INTO public.move_handover_command_receipts (
    company_id, actor_profile_id, command_name, idempotency_key,
    request_fingerprint, stable_response
  ) VALUES (
    p_company_id, (SELECT auth.uid()), p_command_name, p_idempotency_key,
    p_request_fingerprint, p_response
  );
  RETURN p_response;
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_add_event(
  p_appointment public.move_handover_appointments,
  p_event_type TEXT,
  p_from_state TEXT,
  p_reason TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.move_handover_events (
    company_id, appointment_id, event_type, from_state, to_state,
    appointment_version, actor_profile_id, actor_role, reason, metadata
  ) VALUES (
    p_appointment.company_id, p_appointment.id, p_event_type, p_from_state,
    p_appointment.status, p_appointment.version, (SELECT auth.uid()),
    public.current_user_profile_role(), p_reason, COALESCE(p_metadata, '{}'::JSONB)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_record_change(
  p_appointment public.move_handover_appointments,
  p_command_name TEXT,
  p_before JSONB,
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
    p_appointment.company_id, (SELECT auth.uid()), p_command_name,
    'move_handover_appointments', p_appointment.id, p_before,
    to_jsonb(p_appointment), 'move:' || p_idempotency_key
  );
  INSERT INTO public.integration_outbox (
    company_id, integration_key, action_type, entity_table, entity_id,
    payload, status, deduplication_key
  ) VALUES (
    p_appointment.company_id, 'move-handover', p_command_name,
    'move_handover_appointments', p_appointment.id,
    jsonb_build_object(
      'appointmentId', p_appointment.id,
      'reservationId', p_appointment.reservation_id,
      'state', p_appointment.status,
      'providerExecutionTruth', 'not_executed'
    ),
    'pending', p_command_name || ':' || p_idempotency_key
  ) ON CONFLICT DO NOTHING;
END;
$$;

-- Collapse access to one current non-terminal truth per credential while
-- preserving terminal provider rows as immutable history. Automatic booking
-- closure never claims that a disconnected provider actually revoked access;
-- it creates a manual-required revocation truth instead.
CREATE OR REPLACE FUNCTION public.move_handover_invalidate_access(
  p_appointment_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.access_handoff_requests
  SET action = 'revoke',
      status = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND status = 'approved'
          AND human_approved_by IS NOT NULL
          AND human_approved_at IS NOT NULL
          THEN 'approved'
        ELSE 'manual_required'
      END,
      provider_code = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND human_approved_by IS NOT NULL
          THEN provider_code
        ELSE 'manual-operator'
      END,
      approval_required = TRUE,
      approved_by = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND human_approved_by IS NOT NULL
          THEN approved_by
      END,
      approved_at = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND human_approved_by IS NOT NULL
          THEN approved_at
      END,
      preparation_truth = 'revoked',
      human_approved_by = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND human_approved_by IS NOT NULL
          THEN human_approved_by
      END,
      human_approved_at = CASE
        WHEN action = 'revoke'
          AND preparation_truth = 'revoked'
          AND human_approved_by IS NOT NULL
          THEN human_approved_at
      END,
      provider_response = COALESCE(provider_response, '{}'::JSONB)
        || jsonb_build_object(
          'executionTruth', 'not_executed',
          'preparationTruth', 'revoked',
          'invalidationReason', p_reason,
          'invalidatedAt', NOW()
        ),
      updated_at = NOW()
  WHERE move_handover_appointment_id = p_appointment_id
    AND status NOT IN ('succeeded', 'failed');

  INSERT INTO public.access_handoff_requests (
    company_id, site_id, reservation_id, unit_id, credential_type,
    provider_code, action, status, valid_from, valid_until,
    approval_required, approved_by, approved_at, provider_response,
    move_handover_appointment_id, preparation_truth,
    human_approved_by, human_approved_at
  )
  SELECT
    latest.company_id, latest.site_id, latest.reservation_id, latest.unit_id,
    latest.credential_type, 'manual-operator', 'revoke', 'manual_required',
    latest.valid_from, latest.valid_until, TRUE, NULL, NULL,
    jsonb_build_object(
      'executionTruth', 'not_executed',
      'preparationTruth', 'revoked',
      'invalidationReason', p_reason,
      'previousRequestId', latest.id,
      'invalidatedAt', NOW()
    ),
    p_appointment_id, 'revoked', NULL, NULL
  FROM (
    SELECT DISTINCT ON (ar.credential_type) ar.*
    FROM public.access_handoff_requests ar
    WHERE ar.move_handover_appointment_id = p_appointment_id
    ORDER BY ar.credential_type, ar.updated_at DESC, ar.created_at DESC, ar.id DESC
  ) AS latest
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.access_handoff_requests current_request
    WHERE current_request.move_handover_appointment_id = p_appointment_id
      AND current_request.credential_type = latest.credential_type
      AND current_request.status NOT IN ('succeeded', 'failed')
  )
    AND NOT (
      latest.action = 'revoke'
      AND latest.preparation_truth = 'revoked'
      AND latest.status = 'succeeded'
    );
END;
$$;

-- Keep a linked appointment aligned when an authorized booking command is
-- invoked directly. Handover start/complete commands set a transaction-local
-- source marker because those transitions perform their own guarded mutation;
-- reschedule/cancel deliberately flow through this single synchronization path.
CREATE OR REPLACE FUNCTION public.sync_move_handover_from_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_event_type TEXT;
  v_target_status TEXT;
  v_schedule_changed BOOLEAN;
  v_access_revoked BOOLEAN;
  v_access_invalidated BOOLEAN;
  v_sync_reason TEXT;
BEGIN
  IF current_setting('app.move_handover_sync_source', TRUE) = 'handover_command' THEN
    RETURN NEW;
  END IF;
  v_sync_reason := NULLIF(
    current_setting('app.move_handover_cancellation_reason', TRUE), ''
  );

  SELECT * INTO v_appointment
  FROM public.move_handover_appointments
  WHERE reservation_id = NEW.id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN NEW; END IF;

  v_schedule_changed := NEW.check_in_at IS DISTINCT FROM OLD.check_in_at
    OR NEW.check_out_at IS DISTINCT FROM OLD.check_out_at;
  v_access_revoked := NEW.access_preparation_state = 'revoked'
    AND NEW.access_preparation_state IS DISTINCT FROM OLD.access_preparation_state;
  v_access_invalidated := v_schedule_changed OR v_access_revoked;

  IF v_appointment.status IN ('completed', 'cancelled') THEN
    RETURN NEW;
  END IF;

  -- A direct booking transition may drive the linked appointment only after
  -- the handover workflow has reached the same guarded state. This prevents
  -- the generic booking command from bypassing checklist/access controls.
  IF NEW.lifecycle_status = 'checked_in'
     AND NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status
     AND v_appointment.status <> 'ready' THEN
    RAISE EXCEPTION 'linked move/handover appointment is not ready for check-in'
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.lifecycle_status = 'checked_in'
     AND NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status
     AND EXISTS (
       SELECT 1 FROM public.move_handover_checklist_items c
       WHERE c.appointment_id = v_appointment.id
         AND c.required
         AND c.status <> 'completed'
         AND c.item_code NOT IN (
           'meter_readings', 'condition_recorded', 'keys_handed_over'
         )
     ) THEN
    RAISE EXCEPTION 'required move/handover preparation checklist is incomplete'
      USING ERRCODE = 'P0001';
  END IF;
  IF NEW.lifecycle_status = 'completed'
     AND NEW.lifecycle_status IS DISTINCT FROM OLD.lifecycle_status THEN
    IF v_appointment.status <> 'in_progress' THEN
      RAISE EXCEPTION 'linked move/handover appointment is not in progress'
        USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.move_handover_checklist_items c
      WHERE c.appointment_id = v_appointment.id
        AND c.required
        AND c.status <> 'completed'
    ) THEN
      RAISE EXCEPTION 'required move/handover checklist is incomplete'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_appointment.appointment_kind = 'move_out' AND (
      NOT EXISTS (
        SELECT 1 FROM public.move_handover_meter_readings m
        WHERE m.appointment_id = v_appointment.id
      )
      OR NOT EXISTS (
        SELECT 1 FROM public.move_handover_condition_observations o
        WHERE o.appointment_id = v_appointment.id
      )
      OR NOT COALESCE((
        SELECT COUNT(*) > 0
          AND bool_and(
            current_access.action = 'revoke'
            AND current_access.preparation_truth = 'revoked'
            AND current_access.status IN ('approved', 'succeeded')
            AND current_access.human_approved_by IS NOT NULL
            AND current_access.human_approved_at IS NOT NULL
          )
        FROM (
          SELECT DISTINCT ON (request.credential_type) request.*
          FROM public.access_handoff_requests request
          WHERE request.move_handover_appointment_id = v_appointment.id
          ORDER BY request.credential_type, request.updated_at DESC,
            request.created_at DESC, request.id DESC
        ) AS current_access
      ), FALSE)
      OR NOT EXISTS (
        SELECT 1 FROM public.turnover_work_items tw
        WHERE tw.move_handover_appointment_id = v_appointment.id
      )
    ) THEN
      RAISE EXCEPTION 'move-out completion evidence is incomplete'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_target_status := CASE
    WHEN NEW.lifecycle_status IN ('cancelled', 'no_show') THEN 'cancelled'
    WHEN NEW.lifecycle_status = 'completed' THEN 'completed'
    WHEN NEW.lifecycle_status = 'checked_in' THEN 'in_progress'
    WHEN NEW.lifecycle_status <> 'confirmed'
      AND v_appointment.status IN ('preparing', 'ready') THEN 'scheduled'
    WHEN v_access_invalidated AND v_appointment.status = 'ready' THEN 'preparing'
    ELSE v_appointment.status
  END;

  IF NOT v_schedule_changed
     AND NOT v_access_invalidated
     AND v_target_status IS NOT DISTINCT FROM v_appointment.status THEN
    RETURN NEW;
  END IF;

  v_before := to_jsonb(v_appointment);
  UPDATE public.move_handover_appointments
  SET starts_at = CASE WHEN v_schedule_changed THEN NEW.check_in_at ELSE starts_at END,
      ends_at = CASE WHEN v_schedule_changed THEN NEW.check_out_at ELSE ends_at END,
      rescheduled_at = CASE WHEN v_schedule_changed THEN NOW() ELSE rescheduled_at END,
      status = v_target_status,
      cancellation_reason = CASE
        WHEN v_target_status = 'cancelled'
          THEN COALESCE(
            v_sync_reason, 'Canonical booking ' || NEW.lifecycle_status
          )
        ELSE cancellation_reason
      END,
      cancelled_by = CASE
        WHEN v_target_status = 'cancelled' THEN (SELECT auth.uid())
        ELSE cancelled_by
      END,
      cancelled_at = CASE
        WHEN v_target_status = 'cancelled' THEN NOW()
        ELSE cancelled_at
      END,
      version = version + 1
  WHERE id = v_appointment.id
  RETURNING * INTO v_appointment;

  IF v_target_status = 'cancelled' THEN
    UPDATE public.turnover_work_items
    SET status = CASE WHEN status = 'ready' THEN status ELSE 'blocked' END,
        dependency = 'booking_cancelled', updated_at = NOW()
    WHERE move_handover_appointment_id = v_appointment.id
      AND dependency IS DISTINCT FROM 'booking_cancelled';
    PERFORM public.move_handover_invalidate_access(
      v_appointment.id, 'booking_cancelled'
    );
    UPDATE public.move_handover_checklist_items
    SET status = CASE WHEN item_code = 'keys_handed_over' THEN status ELSE 'blocked' END,
        notes = COALESCE(v_sync_reason, 'Canonical booking cancelled'),
        version = version + 1
    WHERE appointment_id = v_appointment.id
      AND status <> 'completed';
  ELSIF v_access_revoked THEN
    PERFORM public.move_handover_invalidate_access(
      v_appointment.id, 'booking_access_revoked'
    );
    IF v_target_status <> 'completed' THEN
      UPDATE public.move_handover_checklist_items
      SET status = 'blocked', notes = 'Booking access was revoked',
          completed_by = NULL, completed_at = NULL, version = version + 1
      WHERE appointment_id = v_appointment.id
        AND item_code = 'access_prepared';
    END IF;
  ELSIF v_schedule_changed THEN
    -- Access approval and validity are time-bound. Preserve terminal provider
    -- evidence but require a new human approval for the new appointment time.
    UPDATE public.access_handoff_requests
    SET preparation_truth = 'blocked',
        status = 'manual_required',
        valid_from = NEW.check_in_at,
        valid_until = NEW.check_out_at,
        approval_required = TRUE,
        approved_by = NULL, approved_at = NULL,
        human_approved_by = NULL, human_approved_at = NULL,
        provider_response = COALESCE(provider_response, '{}'::JSONB)
          || jsonb_build_object(
            'executionTruth', 'not_executed',
            'invalidationReason', 'booking_rescheduled',
            'invalidatedAt', NOW()
          ),
        updated_at = NOW()
    WHERE move_handover_appointment_id = v_appointment.id
      AND status NOT IN ('succeeded', 'failed');
    INSERT INTO public.access_handoff_requests (
      company_id, site_id, reservation_id, unit_id, credential_type,
      provider_code, action, status, valid_from, valid_until,
      approval_required, approved_by, approved_at, provider_response,
      move_handover_appointment_id, preparation_truth,
      human_approved_by, human_approved_at
    )
    SELECT
      latest.company_id, latest.site_id, latest.reservation_id, latest.unit_id,
      latest.credential_type, 'manual-operator', 'activate', 'manual_required',
      NEW.check_in_at, NEW.check_out_at, TRUE, NULL, NULL,
      jsonb_build_object(
        'executionTruth', 'not_executed',
        'preparationTruth', 'blocked',
        'invalidationReason', 'booking_rescheduled',
        'previousRequestId', latest.id,
        'invalidatedAt', NOW()
      ),
      v_appointment.id, 'blocked', NULL, NULL
    FROM (
      SELECT DISTINCT ON (ar.credential_type) ar.*
      FROM public.access_handoff_requests ar
      WHERE ar.move_handover_appointment_id = v_appointment.id
      ORDER BY ar.credential_type, ar.updated_at DESC, ar.created_at DESC, ar.id DESC
    ) AS latest
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.access_handoff_requests current_request
      WHERE current_request.move_handover_appointment_id = v_appointment.id
        AND current_request.credential_type = latest.credential_type
        AND current_request.status NOT IN ('succeeded', 'failed')
    );
    UPDATE public.move_handover_checklist_items
    SET status = 'pending', notes = 'Booking rescheduled; access approval required',
        completed_by = NULL, completed_at = NULL, version = version + 1
    WHERE appointment_id = v_appointment.id
      AND item_code = 'access_prepared';

    -- Requeue one current turnover item per work type at the new end time;
    -- terminal ready rows remain as historical evidence rather than being
    -- silently rewritten or deleted.
    WITH selected AS (
      SELECT DISTINCT ON (
        COALESCE(tw.metadata->>'moveHandoverWorkType', tw.id::TEXT)
      ) tw.id
      FROM public.turnover_work_items tw
      WHERE tw.move_handover_appointment_id = v_appointment.id
        AND tw.status <> 'ready'
      ORDER BY
        COALESCE(tw.metadata->>'moveHandoverWorkType', tw.id::TEXT),
        tw.updated_at DESC,
        tw.id
    )
    UPDATE public.turnover_work_items tw
    SET status = 'queued', due_at = NEW.check_out_at, progress = 0,
        dependency = NULL, updated_at = NOW()
    WHERE tw.id IN (SELECT selected.id FROM selected);

    INSERT INTO public.turnover_work_items (
      company_id, site_id, reservation_id, title, owner_team, status,
      priority, due_at, progress, checklist, evidence_required, dependency,
      metadata, move_handover_appointment_id
    )
    SELECT
      historical.company_id, historical.site_id, historical.reservation_id,
      historical.title, historical.owner_team, 'queued', historical.priority,
      NEW.check_out_at, 0, '[]'::JSONB, historical.evidence_required, NULL,
      COALESCE(historical.metadata, '{}'::JSONB) || jsonb_build_object(
        'rescheduledFromTurnoverId', historical.id,
        'rescheduledAt', NOW()
      ),
      v_appointment.id
    FROM (
      SELECT DISTINCT ON (
        COALESCE(tw.metadata->>'moveHandoverWorkType', tw.id::TEXT)
      ) tw.*
      FROM public.turnover_work_items tw
      WHERE tw.move_handover_appointment_id = v_appointment.id
        AND tw.status = 'ready'
      ORDER BY
        COALESCE(tw.metadata->>'moveHandoverWorkType', tw.id::TEXT),
        tw.updated_at DESC,
        tw.id
    ) AS historical
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.turnover_work_items current_work
      WHERE current_work.move_handover_appointment_id = v_appointment.id
        AND current_work.status <> 'ready'
        AND COALESCE(
          current_work.metadata->>'moveHandoverWorkType', current_work.id::TEXT
        ) = COALESCE(
          historical.metadata->>'moveHandoverWorkType', historical.id::TEXT
        )
    );
  END IF;

  v_event_type := CASE
    WHEN v_target_status = 'cancelled' THEN 'appointment_cancelled_from_booking'
    WHEN v_target_status = 'completed' THEN 'appointment_completed_from_booking'
    WHEN v_target_status = 'in_progress' THEN 'appointment_started_from_booking'
    WHEN v_access_revoked THEN 'appointment_access_revoked_from_booking'
    WHEN v_target_status = 'scheduled'
      AND v_target_status IS DISTINCT FROM v_before->>'status'
      THEN 'appointment_regressed_from_booking'
    ELSE 'appointment_rescheduled_from_booking'
  END;
  PERFORM public.move_handover_add_event(
    v_appointment, v_event_type, v_before->>'status',
    CASE
      WHEN v_target_status = 'cancelled'
        THEN COALESCE(v_sync_reason, 'Canonical booking synchronization')
      ELSE 'Canonical booking synchronization'
    END,
    jsonb_build_object(
      'reservationId', NEW.id,
      'bookingFromState', OLD.lifecycle_status,
      'bookingToState', NEW.lifecycle_status,
      'scheduleChanged', v_schedule_changed,
      'accessInvalidated', v_access_invalidated,
      'source', 'reservation_trigger'
    )
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'sync_move_handover_from_booking', v_before,
    'booking-sync:' || NEW.id::TEXT || ':' || NEW.workflow_version::TEXT
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER reservations_sync_move_handover
AFTER UPDATE OF check_in_at, check_out_at, lifecycle_status, access_preparation_state
ON public.reservations
FOR EACH ROW
WHEN (
  OLD.check_in_at IS DISTINCT FROM NEW.check_in_at
  OR OLD.check_out_at IS DISTINCT FROM NEW.check_out_at
  OR OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status
  OR OLD.access_preparation_state IS DISTINCT FROM NEW.access_preparation_state
)
EXECUTE FUNCTION public.sync_move_handover_from_reservation();

CREATE OR REPLACE FUNCTION public.move_handover_response(
  p_command TEXT,
  p_appointment public.move_handover_appointments
)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'contractVersion', 'move-handover.v1',
    'command', p_command,
    'entityType', 'appointment',
    'entityId', p_appointment.id,
    'appointmentId', p_appointment.id,
    'version', p_appointment.version,
    'state', p_appointment.status,
    'replayed', FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.create_move_handover_command(
  p_reservation_id UUID,
  p_relationship_id UUID,
  p_appointment_kind TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reservation public.reservations%ROWTYPE;
  v_relation public.unit_residents%ROWTYPE;
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_coordinator UUID;
BEGIN
  SELECT * INTO v_reservation FROM public.reservations WHERE id = p_reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'reservationId', p_reservation_id, 'relationshipId', p_relationship_id,
    'appointmentKind', p_appointment_kind
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_reservation.company_id, 'create_move_handover', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.unit_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = p_reservation_id FOR UPDATE;
  IF v_reservation.lifecycle_status <> 'confirmed' THEN
    RAISE EXCEPTION 'move/handover appointment requires a confirmed booking'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_appointment_kind NOT IN ('move_in', 'move_out', 'handover') THEN
    RAISE EXCEPTION 'invalid move/handover appointment kind' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.current_user_can_view_reservation(v_reservation.id) THEN
    RAISE EXCEPTION 'reservation is outside actor scope' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_relation
  FROM public.unit_residents
  WHERE id = p_relationship_id
    AND company_id = v_reservation.company_id
    AND unit_id = v_reservation.unit_id
    AND resident_id = v_reservation.resident_id
    AND (start_date IS NULL OR start_date <= (v_reservation.check_in_at AT TIME ZONE 'Europe/Istanbul')::DATE)
    AND (end_date IS NULL OR end_date >= (v_reservation.check_in_at AT TIME ZONE 'Europe/Istanbul')::DATE);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'resident relationship is not valid for the booking window'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT a.profile_id INTO v_coordinator
  FROM public.booking_resource_staff_assignments a
  WHERE a.resource_id = v_reservation.bookable_resource_id
    AND a.status = 'active'
    AND a.valid_from <= v_reservation.check_in_at
    AND (a.valid_until IS NULL OR a.valid_until > v_reservation.check_in_at)
  ORDER BY a.valid_from, a.id LIMIT 1;

  INSERT INTO public.move_handover_appointments (
    company_id, site_id, unit_id, resident_id, unit_resident_id,
    reservation_id, appointment_kind, relationship_snapshot,
    starts_at, ends_at, status, coordinator_profile_id, created_by
  ) VALUES (
    v_reservation.company_id, v_reservation.site_id, v_reservation.unit_id,
    v_reservation.resident_id, v_relation.id, v_reservation.id,
    p_appointment_kind, v_relation.relationship, v_reservation.check_in_at,
    v_reservation.check_out_at, 'scheduled', v_coordinator, (SELECT auth.uid())
  ) RETURNING * INTO v_appointment;

  INSERT INTO public.move_handover_checklist_items (
    company_id, site_id, appointment_id, item_code, label_key, required
  )
  SELECT v_appointment.company_id, v_appointment.site_id, v_appointment.id,
         seed.item_code, seed.label_key, seed.required
  FROM (
    VALUES
      ('identity_confirmed', 'moveHandover.checklist.identityConfirmed', TRUE),
      ('documents_reviewed', 'moveHandover.checklist.documentsReviewed', TRUE),
      ('access_prepared', 'moveHandover.checklist.accessPrepared', TRUE),
      ('meter_readings', 'moveHandover.checklist.meterReadings', p_appointment_kind <> 'handover'),
      ('condition_recorded', 'moveHandover.checklist.conditionRecorded', p_appointment_kind = 'move_out'),
      ('keys_handed_over', 'moveHandover.checklist.keysHandedOver', TRUE),
      ('turnover_scheduled', 'moveHandover.checklist.turnoverScheduled', p_appointment_kind = 'move_out')
  ) AS seed(item_code, label_key, required);

  PERFORM public.move_handover_add_event(
    v_appointment, 'appointment_created', NULL, NULL,
    jsonb_build_object('reservationId', v_reservation.id)
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'create_move_handover', NULL, p_idempotency_key
  );
  v_response := public.move_handover_response('create_move_handover', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'create_move_handover', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reschedule_move_handover_command(
  p_appointment_id UUID,
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
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'startsAt', p_starts_at, 'endsAt', p_ends_at, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'reschedule_move_handover',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_appointment.reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;

  -- Global mutation order: unit advisory -> resource advisory -> reservation
  -- row -> appointment row. Direct M32 commands use the same suffix before
  -- their synchronization trigger reaches the appointment.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.unit_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_reservation.id FOR UPDATE;
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT (
    public.current_user_can_manage_move_handover(v_appointment.id)
    OR v_appointment.created_by = (SELECT auth.uid())
    OR public.current_user_has_unit_relationship(v_appointment.unit_id, ARRAY['owner'])
    OR (
      public.current_user_has_unit_relationship(v_appointment.unit_id, ARRAY['tenant'])
      AND public.current_user_has_tenant_module_access(v_appointment.unit_id, 'calendar')
    )
  ) THEN
    RAISE EXCEPTION 'appointment reschedule is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status NOT IN ('scheduled', 'preparing', 'ready') THEN
    RAISE EXCEPTION 'appointment cannot be rescheduled in its current state'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'reschedule reason is required' USING ERRCODE = 'P0001';
  END IF;

  -- Let the reservation trigger own the linked appointment update and the
  -- invalidation of time-bound access/turnover readiness. This keeps direct
  -- booking and handover reschedules behaviorally identical.
  PERFORM public.reschedule_resource_booking_command(
    v_reservation.id, v_reservation.workflow_version, p_starts_at, p_ends_at,
    trim(p_reason), left(p_idempotency_key || ':booking-reschedule', 200)
  );

  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  v_response := public.move_handover_response('reschedule_move_handover', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'reschedule_move_handover', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_move_handover_command(
  p_appointment_id UUID,
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
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'cancel_move_handover', p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_appointment.reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.unit_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_reservation.id FOR UPDATE;
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT (
    public.current_user_can_manage_move_handover(v_appointment.id)
    OR v_appointment.created_by = (SELECT auth.uid())
    OR public.current_user_has_unit_relationship(v_appointment.unit_id, ARRAY['owner'])
    OR (
      public.current_user_has_unit_relationship(v_appointment.unit_id, ARRAY['tenant'])
      AND public.current_user_has_tenant_module_access(v_appointment.unit_id, 'calendar')
    )
  ) THEN
    RAISE EXCEPTION 'appointment cancellation is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status NOT IN ('scheduled', 'preparing', 'ready') THEN
    RAISE EXCEPTION 'appointment cannot be cancelled in its current state'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'cancellation reason is required' USING ERRCODE = 'P0001';
  END IF;

  PERFORM set_config(
    'app.move_handover_cancellation_reason', trim(p_reason), TRUE
  );
  PERFORM public.cancel_resource_booking_command(
    v_reservation.id, v_reservation.workflow_version, trim(p_reason),
    left(p_idempotency_key || ':booking-cancel', 200)
  );
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  v_response := public.move_handover_response('cancel_move_handover', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'cancel_move_handover', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_move_handover_command(
  p_appointment_id UUID,
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
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_reservation public.reservations%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_target_status TEXT;
  v_expected_status TEXT;
  v_deposit_ready BOOLEAN;
  v_access_ready BOOLEAN;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'transition', p_transition, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'transition_move_handover',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_appointment.reservation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'reservation not found' USING ERRCODE = 'P0002'; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.unit_id::TEXT, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended(v_reservation.bookable_resource_id::TEXT, 0));
  SELECT * INTO v_reservation
  FROM public.reservations WHERE id = v_reservation.id FOR UPDATE;
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'appointment transition is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;

  SELECT expected_status, target_status
    INTO v_expected_status, v_target_status
  FROM (VALUES
    ('prepare', 'scheduled', 'preparing'),
    ('mark_ready', 'preparing', 'ready'),
    ('start', 'ready', 'in_progress'),
    ('complete', 'in_progress', 'completed')
  ) AS transitions(command, expected_status, target_status)
  WHERE transitions.command = p_transition;
  IF v_target_status IS NULL THEN
    RAISE EXCEPTION 'unsupported move/handover transition' USING ERRCODE = 'P0001';
  END IF;
  IF v_appointment.status <> v_expected_status THEN
    RAISE EXCEPTION 'appointment transition is invalid from current state'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_transition IN ('mark_ready', 'start') AND EXISTS (
    SELECT 1 FROM public.move_handover_checklist_items c
    WHERE c.appointment_id = v_appointment.id
      AND c.required
      AND c.status <> 'completed'
      AND c.item_code NOT IN (
        'meter_readings', 'condition_recorded', 'keys_handed_over'
      )
  ) THEN
    RAISE EXCEPTION 'required preparation checklist is incomplete'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_transition = 'complete' AND EXISTS (
    SELECT 1 FROM public.move_handover_checklist_items c
    WHERE c.appointment_id = v_appointment.id
      AND c.required
      AND c.status <> 'completed'
  ) THEN
    RAISE EXCEPTION 'required move/handover checklist is incomplete'
      USING ERRCODE = 'P0001';
  END IF;

  IF p_transition IN ('mark_ready', 'start') THEN
    v_access_ready := v_reservation.access_preparation_state = 'not_required'
      OR EXISTS (
        SELECT 1
        FROM (
          SELECT DISTINCT ON (request.credential_type) request.*
          FROM public.access_handoff_requests request
          WHERE request.move_handover_appointment_id = v_appointment.id
          ORDER BY request.credential_type, request.updated_at DESC,
            request.created_at DESC, request.id DESC
        ) AS ar
        WHERE ar.action = 'activate'
          AND ar.preparation_truth IN ('manual_ready', 'provider_ready')
          AND ar.status IN ('approved', 'succeeded')
          AND ar.human_approved_by IS NOT NULL
          AND ar.human_approved_at IS NOT NULL
          AND ar.valid_from <= v_appointment.starts_at
          AND ar.valid_until >= v_appointment.ends_at
      );
    IF NOT v_access_ready THEN
      RAISE EXCEPTION 'human-approved access preparation is incomplete'
        USING ERRCODE = 'P0001';
    END IF;

    v_deposit_ready := v_reservation.deposit_truth_state
        IN ('not_required', 'manual_verified', 'waived')
      OR EXISTS (
        SELECT 1 FROM public.deposit_settlements ds
        WHERE ds.move_handover_appointment_id = v_appointment.id
          AND ds.status IN ('finance_ready', 'closed')
      );
    IF NOT v_deposit_ready THEN
      RAISE EXCEPTION 'deposit settlement truth is not ready'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  IF p_transition = 'complete' AND v_appointment.appointment_kind = 'move_out' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.move_handover_meter_readings m
      WHERE m.appointment_id = v_appointment.id
    ) OR NOT EXISTS (
      SELECT 1 FROM public.move_handover_condition_observations o
      WHERE o.appointment_id = v_appointment.id
    ) THEN
      RAISE EXCEPTION 'move-out requires meter and condition evidence'
        USING ERRCODE = 'P0001';
    END IF;
    IF NOT COALESCE((
      SELECT COUNT(*) > 0
        AND bool_and(
          current_access.action = 'revoke'
          AND current_access.preparation_truth = 'revoked'
          AND current_access.status IN ('approved', 'succeeded')
          AND current_access.human_approved_by IS NOT NULL
          AND current_access.human_approved_at IS NOT NULL
        )
      FROM (
        SELECT DISTINCT ON (request.credential_type) request.*
        FROM public.access_handoff_requests request
        WHERE request.move_handover_appointment_id = v_appointment.id
        ORDER BY request.credential_type, request.updated_at DESC,
          request.created_at DESC, request.id DESC
      ) AS current_access
    ), FALSE) THEN
      RAISE EXCEPTION 'move-out access revocation is not prepared'
        USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.turnover_work_items tw
      WHERE tw.move_handover_appointment_id = v_appointment.id
    ) THEN
      RAISE EXCEPTION 'move-out turnover work is not scheduled'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_before := to_jsonb(v_appointment);
  IF p_transition = 'start' THEN
    PERFORM set_config(
      'app.move_handover_sync_source', 'handover_command', TRUE
    );
    PERFORM public.transition_resource_booking_command(
      v_reservation.id, v_reservation.workflow_version, 'check_in',
      NULLIF(trim(p_reason), ''), left(p_idempotency_key || ':booking-start', 200)
    );
  ELSIF p_transition = 'complete' THEN
    PERFORM set_config(
      'app.move_handover_sync_source', 'handover_command', TRUE
    );
    PERFORM public.transition_resource_booking_command(
      v_reservation.id, v_reservation.workflow_version, 'complete',
      NULLIF(trim(p_reason), ''), left(p_idempotency_key || ':booking-complete', 200)
    );
    PERFORM public.move_handover_invalidate_access(
      v_appointment.id, 'booking_completed'
    );
  END IF;

  UPDATE public.move_handover_appointments
  SET status = v_target_status, version = version + 1
  WHERE id = p_appointment_id
  RETURNING * INTO v_appointment;
  PERFORM public.move_handover_add_event(
    v_appointment, 'appointment_' || p_transition, v_expected_status,
    NULLIF(trim(p_reason), '')
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'transition_move_handover', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('transition_move_handover', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'transition_move_handover', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_move_handover_checklist_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_item_code TEXT,
  p_status TEXT,
  p_notes TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'itemCode', p_item_code, 'status', p_status, 'notes', NULLIF(trim(p_notes), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'update_move_handover_checklist',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'checklist update is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'checklist is immutable after appointment closure'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_status NOT IN ('pending', 'completed', 'blocked', 'not_applicable') THEN
    RAISE EXCEPTION 'invalid checklist status' USING ERRCODE = 'P0001';
  END IF;
  IF p_status = 'blocked' AND NULLIF(trim(p_notes), '') IS NULL THEN
    RAISE EXCEPTION 'blocked checklist item requires notes' USING ERRCODE = 'P0001';
  END IF;
  IF p_item_code = 'keys_handed_over'
     AND p_status = 'completed'
     AND v_appointment.status <> 'in_progress' THEN
    RAISE EXCEPTION 'keys can only be handed over during an in-progress appointment'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_appointment);
  UPDATE public.move_handover_checklist_items
  SET status = p_status,
      notes = NULLIF(trim(p_notes), ''),
      completed_by = CASE WHEN p_status = 'completed' THEN (SELECT auth.uid()) END,
      completed_at = CASE WHEN p_status = 'completed' THEN NOW() END,
      version = version + 1
  WHERE appointment_id = p_appointment_id AND item_code = p_item_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'checklist item not found' USING ERRCODE = 'P0002';
  END IF;
  UPDATE public.move_handover_appointments
  SET status = CASE
        WHEN status = 'ready'
          AND EXISTS (
            SELECT 1
            FROM public.move_handover_checklist_items c
            WHERE c.appointment_id = p_appointment_id
              AND c.required
              AND c.status <> 'completed'
              AND c.item_code NOT IN (
                'meter_readings', 'condition_recorded', 'keys_handed_over'
              )
          )
          THEN 'preparing'
        ELSE status
      END,
      version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;

  PERFORM public.move_handover_add_event(
    v_appointment, 'checklist_updated', v_before->>'status', NULL,
    jsonb_build_object('itemCode', p_item_code, 'itemStatus', p_status)
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'update_move_handover_checklist', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('update_move_handover_checklist', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'update_move_handover_checklist', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.add_move_handover_evidence_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_document_id UUID,
  p_evidence_type TEXT,
  p_notes TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'documentId', p_document_id, 'evidenceType', p_evidence_type,
    'notes', NULLIF(trim(p_notes), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'add_move_handover_evidence',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'evidence upload is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'evidence is immutable after appointment closure'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_evidence_type NOT IN ('identity', 'condition', 'meter', 'key_handover', 'signature', 'other') THEN
    RAISE EXCEPTION 'invalid evidence type' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.current_user_can_use_move_handover_document(
    p_document_id, v_appointment.id
  ) THEN
    RAISE EXCEPTION 'approved evidence document is outside appointment scope'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_appointment);
  INSERT INTO public.move_handover_evidence (
    company_id, site_id, appointment_id, document_id, evidence_type,
    notes, added_by
  ) VALUES (
    v_appointment.company_id, v_appointment.site_id, v_appointment.id,
    p_document_id, p_evidence_type, NULLIF(trim(p_notes), ''), (SELECT auth.uid())
  );
  UPDATE public.move_handover_appointments
  SET version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;

  PERFORM public.move_handover_add_event(
    v_appointment, 'evidence_added', v_before->>'status', NULL,
    jsonb_build_object('documentId', p_document_id, 'evidenceType', p_evidence_type)
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'add_move_handover_evidence', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('add_move_handover_evidence', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'add_move_handover_evidence', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_move_handover_meter_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_meter_type TEXT,
  p_reading_numeric NUMERIC,
  p_reading_unit TEXT,
  p_read_at TIMESTAMPTZ,
  p_evidence_document_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_supersedes UUID;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'meterType', p_meter_type, 'readingNumeric', p_reading_numeric,
    'readingUnit', p_reading_unit, 'readAt', p_read_at,
    'evidenceDocumentId', p_evidence_document_id
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'record_move_handover_meter',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'meter recording is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status NOT IN ('preparing', 'ready', 'in_progress') THEN
    RAISE EXCEPTION 'meter reading is not allowed in current appointment state'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_meter_type NOT IN ('electricity', 'water', 'gas', 'heat', 'other')
     OR p_reading_numeric IS NULL OR p_reading_numeric < 0
     OR length(trim(COALESCE(p_reading_unit, ''))) NOT BETWEEN 1 AND 24 THEN
    RAISE EXCEPTION 'invalid meter reading' USING ERRCODE = 'P0001';
  END IF;
  IF p_evidence_document_id IS NOT NULL
     AND NOT public.current_user_can_use_move_handover_document(
       p_evidence_document_id, v_appointment.id
     ) THEN
    RAISE EXCEPTION 'meter evidence document is outside appointment scope'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_supersedes
  FROM public.move_handover_meter_readings
  WHERE appointment_id = p_appointment_id AND meter_type = p_meter_type
  ORDER BY created_at DESC, id DESC LIMIT 1;
  v_before := to_jsonb(v_appointment);
  INSERT INTO public.move_handover_meter_readings (
    company_id, site_id, appointment_id, meter_type, reading_numeric,
    reading_unit, read_at, evidence_document_id, supersedes_id, recorded_by
  ) VALUES (
    v_appointment.company_id, v_appointment.site_id, v_appointment.id,
    p_meter_type, p_reading_numeric, trim(p_reading_unit), p_read_at,
    p_evidence_document_id, v_supersedes, (SELECT auth.uid())
  );
  UPDATE public.move_handover_checklist_items
  SET status = 'completed', notes = NULL,
      completed_by = (SELECT auth.uid()), completed_at = NOW(),
      version = version + 1
  WHERE appointment_id = p_appointment_id AND item_code = 'meter_readings';
  UPDATE public.move_handover_appointments
  SET version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;
  PERFORM public.move_handover_add_event(
    v_appointment, 'meter_reading_recorded', v_before->>'status', NULL,
    jsonb_build_object('meterType', p_meter_type, 'supersedesId', v_supersedes)
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'record_move_handover_meter', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('record_move_handover_meter', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'record_move_handover_meter', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_move_handover_condition_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_area_code TEXT,
  p_condition_state TEXT,
  p_notes TEXT,
  p_evidence_document_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_supersedes UUID;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'areaCode', p_area_code, 'conditionState', p_condition_state,
    'notes', NULLIF(trim(p_notes), ''), 'evidenceDocumentId', p_evidence_document_id
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'record_move_handover_condition',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'condition recording is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status NOT IN ('preparing', 'ready', 'in_progress') THEN
    RAISE EXCEPTION 'condition recording is not allowed in current appointment state'
      USING ERRCODE = 'P0001';
  END IF;
  IF p_area_code !~ '^[a-z0-9][a-z0-9_-]{1,63}$'
     OR p_condition_state NOT IN ('good', 'fair', 'damaged', 'not_inspected') THEN
    RAISE EXCEPTION 'invalid condition observation' USING ERRCODE = 'P0001';
  END IF;
  IF p_condition_state = 'damaged' AND NULLIF(trim(p_notes), '') IS NULL THEN
    RAISE EXCEPTION 'damaged condition requires notes' USING ERRCODE = 'P0001';
  END IF;
  IF p_evidence_document_id IS NOT NULL
     AND NOT public.current_user_can_use_move_handover_document(
       p_evidence_document_id, v_appointment.id
     ) THEN
    RAISE EXCEPTION 'condition evidence document is outside appointment scope'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT id INTO v_supersedes
  FROM public.move_handover_condition_observations
  WHERE appointment_id = p_appointment_id AND area_code = p_area_code
  ORDER BY created_at DESC, id DESC LIMIT 1;
  v_before := to_jsonb(v_appointment);
  INSERT INTO public.move_handover_condition_observations (
    company_id, site_id, appointment_id, area_code, condition_state,
    notes, evidence_document_id, supersedes_id, recorded_by
  ) VALUES (
    v_appointment.company_id, v_appointment.site_id, v_appointment.id,
    p_area_code, p_condition_state, NULLIF(trim(p_notes), ''),
    p_evidence_document_id, v_supersedes, (SELECT auth.uid())
  );
  UPDATE public.move_handover_checklist_items
  SET status = 'completed', notes = NULL,
      completed_by = (SELECT auth.uid()), completed_at = NOW(),
      version = version + 1
  WHERE appointment_id = p_appointment_id AND item_code = 'condition_recorded';
  UPDATE public.move_handover_appointments
  SET version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;
  PERFORM public.move_handover_add_event(
    v_appointment, 'condition_recorded', v_before->>'status', NULL,
    jsonb_build_object('areaCode', p_area_code, 'conditionState', p_condition_state,
      'supersedesId', v_supersedes)
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'record_move_handover_condition', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('record_move_handover_condition', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'record_move_handover_condition', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_move_handover_access_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_access_type TEXT,
  p_truth_state TEXT,
  p_human_approved BOOLEAN,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_action TEXT;
  v_status TEXT;
  v_can_approve BOOLEAN;
  v_checklist_complete BOOLEAN;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'accessType', p_access_type, 'truthState', p_truth_state,
    'humanApproved', p_human_approved, 'reason', NULLIF(trim(p_reason), '')
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'prepare_move_handover_access',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'access preparation is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'access preparation is closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_access_type NOT IN ('mobile_code', 'card', 'plate', 'qr') THEN
    RAISE EXCEPTION 'invalid access credential type' USING ERRCODE = 'P0001';
  END IF;
  IF p_truth_state NOT IN ('blocked', 'manual_ready', 'provider_ready', 'revoked') THEN
    RAISE EXCEPTION 'invalid access preparation truth' USING ERRCODE = 'P0001';
  END IF;
  v_can_approve := public.is_platform_super_admin()
    OR public.current_user_can_manage_site(v_appointment.site_id);
  IF COALESCE(p_human_approved, FALSE) AND NOT v_can_approve THEN
    RAISE EXCEPTION 'assigned staff cannot approve their own access preparation'
      USING ERRCODE = '42501';
  END IF;
  IF p_truth_state <> 'blocked'
     AND (NOT COALESCE(p_human_approved, FALSE) OR NOT v_can_approve) THEN
    RAISE EXCEPTION 'human approval is required for access preparation'
      USING ERRCODE = 'P0001';
  END IF;
  IF NULLIF(trim(p_reason), '') IS NULL THEN
    RAISE EXCEPTION 'access preparation reason is required'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_appointment);
  v_action := CASE WHEN p_truth_state = 'revoked' THEN 'revoke' ELSE 'activate' END;
  v_status := CASE WHEN p_truth_state = 'blocked' THEN 'manual_required' ELSE 'approved' END;
  v_checklist_complete := p_truth_state IN ('manual_ready', 'provider_ready')
    OR (p_truth_state = 'revoked' AND v_appointment.status = 'in_progress');

  UPDATE public.access_handoff_requests
  SET action = v_action,
      preparation_truth = p_truth_state,
      status = v_status,
      provider_code = CASE
        WHEN p_truth_state = 'provider_ready' THEN 'provider-ready-unexecuted'
        ELSE 'manual-operator'
      END,
      approval_required = p_truth_state <> 'blocked',
      approved_by = CASE WHEN p_truth_state <> 'blocked' THEN (SELECT auth.uid()) END,
      approved_at = CASE WHEN p_truth_state <> 'blocked' THEN NOW() END,
      human_approved_by = CASE WHEN p_truth_state <> 'blocked' THEN (SELECT auth.uid()) END,
      human_approved_at = CASE WHEN p_truth_state <> 'blocked' THEN NOW() END,
      provider_response = jsonb_build_object(
        'executionTruth', 'not_executed',
        'preparationTruth', p_truth_state,
        'reason', NULLIF(trim(p_reason), '')
      ),
      updated_at = NOW()
  WHERE move_handover_appointment_id = p_appointment_id
    AND credential_type = p_access_type
    AND status NOT IN ('succeeded', 'failed');

  IF NOT FOUND THEN
    INSERT INTO public.access_handoff_requests (
      company_id, site_id, reservation_id, unit_id, credential_type,
      provider_code, action, status, valid_from, valid_until,
      approval_required, approved_by, approved_at, provider_response,
      move_handover_appointment_id, preparation_truth,
      human_approved_by, human_approved_at
    ) VALUES (
      v_appointment.company_id, v_appointment.site_id,
      v_appointment.reservation_id, v_appointment.unit_id, p_access_type,
      CASE WHEN p_truth_state = 'provider_ready'
        THEN 'provider-ready-unexecuted' ELSE 'manual-operator' END,
      v_action, v_status, v_appointment.starts_at, v_appointment.ends_at,
      p_truth_state <> 'blocked',
      CASE WHEN p_truth_state <> 'blocked' THEN (SELECT auth.uid()) END,
      CASE WHEN p_truth_state <> 'blocked' THEN NOW() END,
      jsonb_build_object(
        'executionTruth', 'not_executed',
        'preparationTruth', p_truth_state,
        'reason', NULLIF(trim(p_reason), '')
      ),
      v_appointment.id, p_truth_state,
      CASE WHEN p_truth_state <> 'blocked' THEN (SELECT auth.uid()) END,
      CASE WHEN p_truth_state <> 'blocked' THEN NOW() END
    );
  END IF;

  UPDATE public.move_handover_checklist_items
  SET status = CASE WHEN v_checklist_complete THEN 'completed' ELSE 'blocked' END,
      notes = trim(p_reason),
      completed_by = CASE WHEN v_checklist_complete THEN (SELECT auth.uid()) END,
      completed_at = CASE WHEN v_checklist_complete THEN NOW() END,
      version = version + 1
  WHERE appointment_id = p_appointment_id AND item_code = 'access_prepared';

  UPDATE public.move_handover_appointments
  SET status = CASE
        WHEN status = 'ready' AND p_truth_state IN ('blocked', 'revoked')
          THEN 'preparing'
        ELSE status
      END,
      version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;
  PERFORM public.move_handover_add_event(
    v_appointment, 'access_preparation_updated', v_before->>'status',
    NULLIF(trim(p_reason), ''),
    jsonb_build_object(
      'credentialType', p_access_type,
      'preparationTruth', p_truth_state,
      'providerExecutionTruth', 'not_executed'
    )
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'prepare_move_handover_access', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('prepare_move_handover_access', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'prepare_move_handover_access', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.create_move_handover_turnover_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_work_type TEXT,
  p_assigned_profile_id UUID,
  p_due_at TIMESTAMPTZ,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'workType', p_work_type, 'assignedProfileId', p_assigned_profile_id,
    'dueAt', p_due_at
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'create_move_handover_turnover',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT public.current_user_can_manage_move_handover(v_appointment.id) THEN
    RAISE EXCEPTION 'turnover scheduling is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF v_appointment.status IN ('completed', 'cancelled') THEN
    RAISE EXCEPTION 'turnover scheduling is closed' USING ERRCODE = 'P0001';
  END IF;
  IF p_work_type NOT IN ('cleaning', 'inspection', 'repair', 'key_return', 'access_revocation', 'other') THEN
    RAISE EXCEPTION 'invalid turnover work type' USING ERRCODE = 'P0001';
  END IF;
  IF p_assigned_profile_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_assigned_profile_id AND p.company_id = v_appointment.company_id
  ) THEN
    RAISE EXCEPTION 'requested turnover assignee crosses company scope'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_appointment);
  INSERT INTO public.turnover_work_items (
    company_id, site_id, reservation_id, title, owner_team, status,
    priority, due_at, progress, checklist, evidence_required, metadata,
    move_handover_appointment_id
  ) VALUES (
    v_appointment.company_id, v_appointment.site_id, v_appointment.reservation_id,
    'moveHandover.turnover.' || p_work_type, 'site_operations', 'queued',
    CASE WHEN p_work_type IN ('repair', 'access_revocation') THEN 'high' ELSE 'medium' END,
    p_due_at, 0, '[]'::JSONB,
    p_work_type IN ('inspection', 'repair', 'key_return'),
    jsonb_build_object(
      'moveHandoverWorkType', p_work_type,
      'requestedAssignedProfileId', p_assigned_profile_id,
      'assignmentTruth', CASE WHEN p_assigned_profile_id IS NULL
        THEN 'unassigned' ELSE 'profile_requested_not_workforce_assigned' END
    ),
    v_appointment.id
  );

  UPDATE public.move_handover_checklist_items
  SET status = 'completed', notes = NULL,
      completed_by = (SELECT auth.uid()), completed_at = NOW(),
      version = version + 1
  WHERE appointment_id = p_appointment_id AND item_code = 'turnover_scheduled';

  UPDATE public.move_handover_appointments
  SET version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;
  PERFORM public.move_handover_add_event(
    v_appointment, 'turnover_work_scheduled', v_before->>'status', NULL,
    jsonb_build_object('workType', p_work_type,
      'assignmentTruth', 'provider_or_workforce_assignment_pending')
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'create_move_handover_turnover', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('create_move_handover_turnover', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'create_move_handover_turnover', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.link_move_handover_deposit_command(
  p_appointment_id UUID,
  p_expected_version INTEGER,
  p_deposit_settlement_id UUID,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment public.move_handover_appointments%ROWTYPE;
  v_before JSONB;
  v_fingerprint TEXT;
  v_replay JSONB;
  v_response JSONB;
  v_role TEXT := public.current_user_profile_role();
BEGIN
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'move/handover appointment not found' USING ERRCODE = 'P0002'; END IF;
  v_fingerprint := md5(jsonb_build_object(
    'appointmentId', p_appointment_id, 'expectedVersion', p_expected_version,
    'depositSettlementId', p_deposit_settlement_id
  )::TEXT);
  v_replay := public.move_handover_command_replay(
    v_appointment.company_id, 'link_move_handover_deposit',
    p_idempotency_key, v_fingerprint
  );
  IF v_replay IS NOT NULL THEN RETURN v_replay; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(v_appointment.id::TEXT, 0));
  SELECT * INTO v_appointment
  FROM public.move_handover_appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT (
    public.current_user_can_manage_move_handover(v_appointment.id)
    OR (v_role = 'accountant'
      AND v_appointment.company_id = public.current_user_company_id())
  ) THEN
    RAISE EXCEPTION 'deposit link is outside actor scope' USING ERRCODE = '42501';
  END IF;
  IF v_appointment.version <> p_expected_version THEN
    RAISE EXCEPTION 'stale move/handover appointment version' USING ERRCODE = '40001';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.deposit_settlements ds
    WHERE ds.id = p_deposit_settlement_id
      AND ds.company_id = v_appointment.company_id
      AND ds.site_id = v_appointment.site_id
      AND ds.reservation_id = v_appointment.reservation_id
      AND (ds.move_handover_appointment_id IS NULL
        OR ds.move_handover_appointment_id = v_appointment.id)
  ) THEN
    RAISE EXCEPTION 'deposit settlement does not match appointment reservation'
      USING ERRCODE = 'P0001';
  END IF;

  v_before := to_jsonb(v_appointment);
  UPDATE public.deposit_settlements
  SET move_handover_appointment_id = v_appointment.id,
      updated_at = NOW()
  WHERE id = p_deposit_settlement_id;
  UPDATE public.move_handover_appointments
  SET version = version + 1
  WHERE id = p_appointment_id RETURNING * INTO v_appointment;

  PERFORM public.move_handover_add_event(
    v_appointment, 'deposit_settlement_linked', v_before->>'status', NULL,
    jsonb_build_object(
      'depositSettlementId', p_deposit_settlement_id,
      'settlementTruth', 'existing_record_linked_no_status_change'
    )
  );
  PERFORM public.move_handover_record_change(
    v_appointment, 'link_move_handover_deposit', v_before, p_idempotency_key
  );
  v_response := public.move_handover_response('link_move_handover_deposit', v_appointment);
  RETURN public.move_handover_store_receipt(
    v_appointment.company_id, 'link_move_handover_deposit', p_idempotency_key,
    v_fingerprint, v_response
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.move_handover_workspace(
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
  v_finance_only BOOLEAN := public.current_user_profile_role() = 'accountant';
  v_appointments JSONB := '[]'::JSONB;
  v_checklist JSONB := '[]'::JSONB;
  v_evidence JSONB := '[]'::JSONB;
  v_meters JSONB := '[]'::JSONB;
  v_conditions JSONB := '[]'::JSONB;
  v_turnover JSONB := '[]'::JSONB;
  v_access JSONB := '[]'::JSONB;
  v_deposits JSONB := '[]'::JSONB;
  v_events JSONB := '[]'::JSONB;
  v_relationship_candidates JSONB := '[]'::JSONB;
  v_reservation_candidates JSONB := '[]'::JSONB;
  v_document_candidates JSONB := '[]'::JSONB;
BEGIN
  IF (SELECT auth.uid()) IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'authenticated profile required' USING ERRCODE = '42501';
  END IF;
  IF p_site_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sites s
    WHERE s.id = p_site_id AND s.company_id = v_company_id
  ) THEN
    RAISE EXCEPTION 'site is outside actor company' USING ERRCODE = '42501';
  END IF;

  IF v_finance_only THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'siteId', a.site_id,
      'reservationId', a.reservation_id,
      'appointmentKind', a.appointment_kind,
      'startsAt', a.starts_at,
      'endsAt', a.ends_at,
      'status', a.status,
      'version', a.version
    ) ORDER BY a.starts_at, a.id), '[]'::JSONB)
    INTO v_appointments
    FROM public.move_handover_appointments a
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND EXISTS (
        SELECT 1 FROM public.deposit_settlements ds
        WHERE ds.reservation_id = a.reservation_id
          AND (ds.move_handover_appointment_id IS NULL
            OR ds.move_handover_appointment_id = a.id)
      );

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ds.id,
      'appointmentId', ds.move_handover_appointment_id,
      'eligibleAppointmentId', a.id,
      'reservationId', ds.reservation_id,
      'depositAmountCents', ds.deposit_amount_cents,
      'proposedDeductionCents', ds.proposed_deduction_cents,
      'refundAmountCents', ds.refund_amount_cents,
      'status', ds.status,
      'evidenceCount', ds.evidence_count,
      'approvalOwner', ds.approval_owner,
      'approvedBy', ds.approved_by,
      'approvedAt', ds.approved_at,
      'updatedAt', ds.updated_at
    ) ORDER BY ds.updated_at DESC, ds.id), '[]'::JSONB)
    INTO v_deposits
    FROM public.deposit_settlements ds
    JOIN public.move_handover_appointments a
      ON a.reservation_id = ds.reservation_id
     AND (ds.move_handover_appointment_id IS NULL
       OR ds.move_handover_appointment_id = a.id)
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id);
  ELSE
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', a.id,
      'siteId', a.site_id,
      'unitId', a.unit_id,
      'residentId', a.resident_id,
      'relationshipId', a.unit_resident_id,
      'reservationId', a.reservation_id,
      'appointmentKind', a.appointment_kind,
      'relationshipSnapshot', a.relationship_snapshot,
      'startsAt', a.starts_at,
      'endsAt', a.ends_at,
      'status', a.status,
      'coordinatorProfileId', a.coordinator_profile_id,
      'cancellationReason', a.cancellation_reason,
      'cancelledAt', a.cancelled_at,
      'rescheduledAt', a.rescheduled_at,
      'version', a.version,
      'createdAt', a.created_at,
      'updatedAt', a.updated_at
    ) ORDER BY a.starts_at, a.id), '[]'::JSONB)
    INTO v_appointments
    FROM public.move_handover_appointments a
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', c.id,
      'appointmentId', c.appointment_id,
      'itemCode', c.item_code,
      'labelKey', c.label_key,
      'required', c.required,
      'status', c.status,
      'notes', c.notes,
      'completedBy', c.completed_by,
      'completedAt', c.completed_at,
      'version', c.version
    ) ORDER BY c.appointment_id, c.item_code), '[]'::JSONB)
    INTO v_checklist
    FROM public.move_handover_checklist_items c
    JOIN public.move_handover_appointments a ON a.id = c.appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', e.id,
      'appointmentId', e.appointment_id,
      'documentId', e.document_id,
      'evidenceType', e.evidence_type,
      'notes', e.notes,
      'addedBy', e.added_by,
      'createdAt', e.created_at
    ) ORDER BY e.created_at, e.id), '[]'::JSONB)
    INTO v_evidence
    FROM public.move_handover_evidence e
    JOIN public.move_handover_appointments a ON a.id = e.appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', m.id,
      'appointmentId', m.appointment_id,
      'meterType', m.meter_type,
      'readingNumeric', m.reading_numeric,
      'readingUnit', m.reading_unit,
      'readAt', m.read_at,
      'evidenceDocumentId', m.evidence_document_id,
      'supersedesId', m.supersedes_id,
      'recordedBy', m.recorded_by,
      'createdAt', m.created_at
    ) ORDER BY m.read_at, m.id), '[]'::JSONB)
    INTO v_meters
    FROM public.move_handover_meter_readings m
    JOIN public.move_handover_appointments a ON a.id = m.appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'appointmentId', o.appointment_id,
      'areaCode', o.area_code,
      'conditionState', o.condition_state,
      'notes', o.notes,
      'evidenceDocumentId', o.evidence_document_id,
      'supersedesId', o.supersedes_id,
      'recordedBy', o.recorded_by,
      'createdAt', o.created_at
    ) ORDER BY o.created_at, o.id), '[]'::JSONB)
    INTO v_conditions
    FROM public.move_handover_condition_observations o
    JOIN public.move_handover_appointments a ON a.id = o.appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', tw.id,
      'appointmentId', tw.move_handover_appointment_id,
      'reservationId', tw.reservation_id,
      'title', tw.title,
      'workType', tw.metadata->>'moveHandoverWorkType',
      'ownerTeam', tw.owner_team,
      'status', tw.status,
      'priority', tw.priority,
      'dueAt', tw.due_at,
      'progress', tw.progress,
      'evidenceRequired', tw.evidence_required,
      'dependency', tw.dependency,
      'metadata', tw.metadata
    ) ORDER BY tw.due_at NULLS LAST, tw.id), '[]'::JSONB)
    INTO v_turnover
    FROM public.turnover_work_items tw
    JOIN public.move_handover_appointments a
      ON a.id = tw.move_handover_appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ar.id,
      'appointmentId', ar.move_handover_appointment_id,
      'reservationId', ar.reservation_id,
      'unitId', ar.unit_id,
      'credentialType', ar.credential_type,
      'providerCode', ar.provider_code,
      'action', ar.action,
      'status', ar.status,
      'preparationTruth', ar.preparation_truth,
      'humanApprovedBy', ar.human_approved_by,
      'humanApprovedAt', ar.human_approved_at,
      'validFrom', ar.valid_from,
      'validUntil', ar.valid_until,
      'providerExecutionTruth', CASE
        WHEN ar.status = 'succeeded' THEN 'provider_reported_succeeded'
        ELSE 'not_executed_or_unconfirmed'
      END
    ) ORDER BY ar.created_at, ar.id), '[]'::JSONB)
    INTO v_access
    FROM public.access_handoff_requests ar
    JOIN public.move_handover_appointments a
      ON a.id = ar.move_handover_appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ds.id,
      'appointmentId', ds.move_handover_appointment_id,
      'eligibleAppointmentId', a.id,
      'reservationId', ds.reservation_id,
      'depositAmountCents', ds.deposit_amount_cents,
      'proposedDeductionCents', ds.proposed_deduction_cents,
      'refundAmountCents', ds.refund_amount_cents,
      'status', ds.status,
      'evidenceCount', ds.evidence_count,
      'approvalOwner', ds.approval_owner,
      'approvedBy', ds.approved_by,
      'approvedAt', ds.approved_at,
      'updatedAt', ds.updated_at
    ) ORDER BY ds.updated_at DESC, ds.id), '[]'::JSONB)
    INTO v_deposits
    FROM public.deposit_settlements ds
    JOIN public.move_handover_appointments a
      ON a.reservation_id = ds.reservation_id
     AND (ds.move_handover_appointment_id IS NULL
       OR ds.move_handover_appointment_id = a.id)
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', ev.id,
      'appointmentId', ev.appointment_id,
      'eventType', ev.event_type,
      'fromState', ev.from_state,
      'toState', ev.to_state,
      'appointmentVersion', ev.appointment_version,
      'actorProfileId', ev.actor_profile_id,
      'actorRole', ev.actor_role,
      'reason', ev.reason,
      'metadata', ev.metadata,
      'createdAt', ev.created_at
    ) ORDER BY ev.created_at, ev.id), '[]'::JSONB)
    INTO v_events
    FROM public.move_handover_events ev
    JOIN public.move_handover_appointments a ON a.id = ev.appointment_id
    WHERE a.company_id = v_company_id
      AND (p_site_id IS NULL OR a.site_id = p_site_id)
      AND public.current_user_can_view_move_handover(a.id);

    SELECT COALESCE(jsonb_agg(candidate.payload ORDER BY candidate.starts_at, candidate.id), '[]'::JSONB)
    INTO v_reservation_candidates
    FROM (
      SELECT r.id, r.check_in_at AS starts_at,
        jsonb_build_object(
          'id', r.id,
          'siteId', r.site_id,
          'unitId', r.unit_id,
          'residentId', r.resident_id,
          'resourceId', r.bookable_resource_id,
          'resourceName', r.resource_name,
          'startsAt', r.check_in_at,
          'endsAt', r.check_out_at,
          'lifecycleStatus', r.lifecycle_status,
          'version', r.workflow_version
        ) AS payload
      FROM public.reservations r
      JOIN public.bookable_resources br ON br.id = r.bookable_resource_id
      JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
      WHERE r.company_id = v_company_id
        AND (p_site_id IS NULL OR r.site_id = p_site_id)
        AND r.lifecycle_status = 'confirmed'
        AND r.resident_id IS NOT NULL
        AND rt.category IN ('move_loading_slot', 'handover_appointment')
        AND public.current_user_can_view_reservation(r.id)
        AND NOT EXISTS (
          SELECT 1 FROM public.move_handover_appointments a
          WHERE a.reservation_id = r.id
        )
      ORDER BY r.check_in_at, r.id
      LIMIT 200
    ) AS candidate;

    SELECT COALESCE(jsonb_agg(candidate.payload ORDER BY candidate.id), '[]'::JSONB)
    INTO v_relationship_candidates
    FROM (
      SELECT DISTINCT ON (ur.id) ur.id,
        jsonb_build_object(
          'id', ur.id,
          'unitId', ur.unit_id,
          'residentId', ur.resident_id,
          'relationship', ur.relationship,
          'label', res.full_name || ' · ' || u.unit_no || ' · ' || ur.relationship,
          'startDate', ur.start_date,
          'endDate', ur.end_date
        ) AS payload
      FROM public.unit_residents ur
      JOIN public.residents res ON res.id = ur.resident_id
      JOIN public.units u ON u.id = ur.unit_id
      JOIN public.reservations r
        ON r.company_id = ur.company_id
       AND r.unit_id = ur.unit_id
       AND r.resident_id = ur.resident_id
      JOIN public.bookable_resources br ON br.id = r.bookable_resource_id
      JOIN public.booking_resource_types rt ON rt.id = br.resource_type_id
      WHERE ur.company_id = v_company_id
        AND (p_site_id IS NULL OR r.site_id = p_site_id)
        AND r.lifecycle_status = 'confirmed'
        AND rt.category IN ('move_loading_slot', 'handover_appointment')
        AND (ur.start_date IS NULL OR ur.start_date <= (r.check_in_at AT TIME ZONE 'Europe/Istanbul')::DATE)
        AND (ur.end_date IS NULL OR ur.end_date >= (r.check_in_at AT TIME ZONE 'Europe/Istanbul')::DATE)
        AND public.current_user_can_view_reservation(r.id)
        AND NOT EXISTS (
          SELECT 1 FROM public.move_handover_appointments a
          WHERE a.reservation_id = r.id
        )
      ORDER BY ur.id
      LIMIT 200
    ) AS candidate;

    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'siteId', d.site_id,
      'unitId', d.unit_id,
      'residentId', d.resident_id,
      'title', d.title,
      'category', d.category
    ) ORDER BY d.updated_at DESC, d.id), '[]'::JSONB)
    INTO v_document_candidates
    FROM public.documents d
    WHERE d.company_id = v_company_id
      AND d.status = 'active'
      AND d.review_status = 'approved'
      AND EXISTS (
        SELECT 1
        FROM public.move_handover_appointments a
        WHERE a.company_id = v_company_id
          AND (p_site_id IS NULL OR a.site_id = p_site_id)
          AND public.current_user_can_use_move_handover_document(d.id, a.id)
      );
  END IF;

  RETURN jsonb_build_object(
    'contractVersion', 'move-handover.v1',
    'generatedAt', NOW(),
    'scope', jsonb_build_object(
      'siteId', p_site_id,
      'role', v_role,
      'financeOnly', v_finance_only,
      'capabilities', jsonb_build_object(
        'canCreate', v_role IN ('admin', 'manager', 'staff', 'owner', 'tenant'),
        'canReschedule', v_role IN ('admin', 'manager', 'staff', 'owner', 'tenant'),
        'canCancel', v_role IN ('admin', 'manager', 'staff', 'owner', 'tenant'),
        'canOperate', v_role IN ('admin', 'manager', 'staff'),
        'canPrepareAccess', v_role IN ('admin', 'manager', 'staff'),
        'canApproveAccess', v_role IN ('admin', 'manager'),
        'canLinkDeposit', v_role IN ('admin', 'accountant')
      )
    ),
    'candidates', jsonb_build_object(
      'relationships', v_relationship_candidates,
      'reservations', v_reservation_candidates,
      'documents', v_document_candidates
    ),
    'appointments', v_appointments,
    'checklistItems', v_checklist,
    'evidence', v_evidence,
    'meterReadings', v_meters,
    'conditionItems', v_conditions,
    'turnoverWorkItems', v_turnover,
    'accessRequests', v_access,
    'depositSettlements', v_deposits,
    'events', v_events
  );
END;
$$;

ALTER TABLE public.move_handover_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_condition_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_handover_command_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.turnover_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_handoff_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_settlements ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'turnover_work_items', 'access_handoff_requests', 'deposit_settlements'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I',
      v_policy.policyname, v_policy.tablename);
  END LOOP;
END;
$$;

CREATE POLICY move_handover_appointments_exact_select
ON public.move_handover_appointments
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(id));

CREATE POLICY move_handover_checklist_exact_select
ON public.move_handover_checklist_items
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(appointment_id));
CREATE POLICY move_handover_evidence_exact_select
ON public.move_handover_evidence
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(appointment_id));
CREATE POLICY move_handover_meter_exact_select
ON public.move_handover_meter_readings
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(appointment_id));
CREATE POLICY move_handover_condition_exact_select
ON public.move_handover_condition_observations
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(appointment_id));
CREATE POLICY move_handover_events_exact_select
ON public.move_handover_events
FOR SELECT TO authenticated
USING (public.current_user_can_view_move_handover(appointment_id));

CREATE POLICY turnover_work_items_exact_select
ON public.turnover_work_items
FOR SELECT TO authenticated
USING (
  (
    move_handover_appointment_id IS NOT NULL
    AND public.current_user_can_view_move_handover(move_handover_appointment_id)
  )
  OR (
    move_handover_appointment_id IS NULL
    AND (
      public.is_platform_super_admin()
      OR public.current_user_can_manage_site(site_id)
      OR (reservation_id IS NOT NULL
        AND public.current_user_can_view_reservation(reservation_id))
    )
  )
);
CREATE POLICY access_handoff_requests_exact_select
ON public.access_handoff_requests
FOR SELECT TO authenticated
USING (
  (
    move_handover_appointment_id IS NOT NULL
    AND public.current_user_can_view_move_handover(move_handover_appointment_id)
  )
  OR (
    move_handover_appointment_id IS NULL
    AND (
      public.is_platform_super_admin()
      OR public.current_user_can_manage_site(site_id)
      OR (reservation_id IS NOT NULL
        AND public.current_user_can_view_reservation(reservation_id))
    )
  )
);
CREATE POLICY deposit_settlements_exact_select
ON public.deposit_settlements
FOR SELECT TO authenticated
USING (
  (
    move_handover_appointment_id IS NOT NULL
    AND (
      public.current_user_can_view_move_handover(move_handover_appointment_id)
      OR (
        public.current_user_profile_role() = 'accountant'
        AND company_id = public.current_user_company_id()
      )
    )
  )
  OR (
    move_handover_appointment_id IS NULL
    AND (
      public.is_platform_super_admin()
      OR public.current_user_can_manage_site(site_id)
      OR (
        public.current_user_profile_role() = 'accountant'
        AND company_id = public.current_user_company_id()
      )
      OR (reservation_id IS NOT NULL
        AND public.current_user_can_view_reservation(reservation_id))
    )
  )
);
REVOKE ALL ON TABLE
  public.move_handover_appointments,
  public.move_handover_checklist_items,
  public.move_handover_evidence,
  public.move_handover_meter_readings,
  public.move_handover_condition_observations,
  public.move_handover_events,
  public.move_handover_command_receipts
FROM anon, authenticated;

-- Defense in depth for legacy Phase-10/11 tables. Migration 22 already
-- removed browser DML; repeat the revoke here so later policy changes cannot
-- accidentally turn these tables back into a direct-write path.
REVOKE INSERT, UPDATE, DELETE ON TABLE
  public.turnover_work_items,
  public.access_handoff_requests,
  public.deposit_settlements
FROM anon, authenticated;

GRANT SELECT ON TABLE
  public.move_handover_appointments,
  public.move_handover_checklist_items,
  public.move_handover_evidence,
  public.move_handover_meter_readings,
  public.move_handover_condition_observations,
  public.move_handover_events
TO authenticated;

REVOKE ALL ON FUNCTION public.move_handover_touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_reject_history_mutation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_assert_appointment_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_assert_detail_scope() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_assert_supersession() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_view_move_handover(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_manage_move_handover(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.current_user_can_use_move_handover_document(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_command_replay(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_store_receipt(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_add_event(public.move_handover_appointments, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_record_change(public.move_handover_appointments, TEXT, JSONB, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_invalidate_access(UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_move_handover_from_reservation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_response(TEXT, public.move_handover_appointments) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_move_handover_command(UUID, UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reschedule_move_handover_command(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_move_handover_command(UUID, INTEGER, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_move_handover_command(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_move_handover_checklist_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_move_handover_evidence_command(UUID, INTEGER, UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_move_handover_meter_command(UUID, INTEGER, TEXT, NUMERIC, TEXT, TIMESTAMPTZ, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_move_handover_condition_command(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prepare_move_handover_access_command(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_move_handover_turnover_command(UUID, INTEGER, TEXT, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.link_move_handover_deposit_command(UUID, INTEGER, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.move_handover_workspace(UUID) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_can_view_move_handover(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_move_handover_command(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_move_handover_command(UUID, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_move_handover_command(UUID, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_move_handover_command(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_move_handover_checklist_command(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_move_handover_evidence_command(UUID, INTEGER, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_move_handover_meter_command(UUID, INTEGER, TEXT, NUMERIC, TEXT, TIMESTAMPTZ, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_move_handover_condition_command(UUID, INTEGER, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_move_handover_access_command(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_move_handover_turnover_command(UUID, INTEGER, TEXT, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.link_move_handover_deposit_command(UUID, INTEGER, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.move_handover_workspace(UUID) TO authenticated;

COMMENT ON FUNCTION public.move_handover_workspace(UUID) IS
  'UC18 move/handover workspace with exact resident/unit scope and finance-only accountant projection.';
