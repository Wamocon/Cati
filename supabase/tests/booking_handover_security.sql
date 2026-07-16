-- Window 3 / UC18 booking and move-handover security release contract.
--
-- Run only after a clean database has applied migrations in repository order,
-- including 22, 32, 33, 34 and 35. The catalog assertions deliberately inspect
-- the final state so a later migration cannot silently restore broad privileges
-- or legacy write policies.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(68);

-- ---------------------------------------------------------------------------
-- RLS must remain enabled on every browser-readable Window-3 truth table.
-- ---------------------------------------------------------------------------

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'reservations'
  ),
  'reservations keeps row-level security enabled'
);

SELECT is(
  ARRAY(
    SELECT c.relname::TEXT
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname IN (
        'turnover_work_items',
        'access_handoff_requests',
        'deposit_settlements'
      )
      AND c.relrowsecurity
    ORDER BY c.relname
  ),
  ARRAY[
    'access_handoff_requests',
    'deposit_settlements',
    'turnover_work_items'
  ]::TEXT[],
  'all three legacy handover truth tables keep row-level security enabled'
);

-- ---------------------------------------------------------------------------
-- Reservations: exact row policy plus an explicit resident-safe column grant.
-- Internal replay, free-text and actor metadata must never be browser-readable.
-- ---------------------------------------------------------------------------

SELECT is(
  has_table_privilege('authenticated', 'public.reservations', 'SELECT'),
  FALSE,
  'authenticated has no table-wide SELECT on reservations'
);

SELECT is(
  has_column_privilege(
    'authenticated', 'public.reservations', 'request_fingerprint', 'SELECT'
  ),
  FALSE,
  'authenticated cannot select reservations.request_fingerprint'
);

SELECT is(
  has_column_privilege(
    'authenticated', 'public.reservations', 'idempotency_key', 'SELECT'
  ),
  FALSE,
  'authenticated cannot select reservations.idempotency_key'
);

SELECT is(
  has_column_privilege(
    'authenticated', 'public.reservations', 'notes', 'SELECT'
  ),
  FALSE,
  'authenticated cannot select reservations.notes'
);

SELECT is(
  has_column_privilege(
    'authenticated', 'public.reservations', 'created_by', 'SELECT'
  ),
  FALSE,
  'authenticated cannot select reservations.created_by'
);

SELECT is(
  ARRAY(
    SELECT DISTINCT cp.column_name::TEXT
    FROM information_schema.column_privileges cp
    WHERE cp.grantee = 'authenticated'
      AND cp.table_schema = 'public'
      AND cp.table_name = 'reservations'
      AND cp.privilege_type = 'SELECT'
    ORDER BY cp.column_name
  ),
  ARRAY[
    'approval_status',
    'check_in_at',
    'check_out_at',
    'company_id',
    'created_at',
    'id',
    'resource_name',
    'site_id',
    'status',
    'unit_id',
    'updated_at'
  ]::TEXT[],
  'reservations exposes exactly the approved browser SELECT column allowlist'
);

SELECT is(
  has_table_privilege('authenticated', 'public.reservations', 'INSERT'),
  FALSE,
  'authenticated has no direct INSERT privilege on reservations'
);

SELECT is(
  has_table_privilege('authenticated', 'public.reservations', 'UPDATE'),
  FALSE,
  'authenticated has no direct UPDATE privilege on reservations'
);

SELECT is(
  has_table_privilege('authenticated', 'public.reservations', 'DELETE'),
  FALSE,
  'authenticated has no direct DELETE privilege on reservations'
);

SELECT is(
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  ),
  1::BIGINT,
  'reservations has exactly one policy after the final migration order'
);

SELECT is(
  (
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  ),
  'reservations_booking_exact_select',
  'the sole reservation policy is the Window-3 exact-read policy'
);

SELECT is(
  (
    SELECT cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  ),
  'SELECT',
  'the sole reservation policy is SELECT-only'
);

SELECT is(
  (
    SELECT roles::TEXT
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  ),
  '{authenticated}',
  'the reservation SELECT policy targets only authenticated'
);

SELECT ok(
  (
    SELECT POSITION('current_user_can_view_reservation(id)' IN qual) > 0
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reservations'
  ),
  'the reservation SELECT policy delegates every row to current_user_can_view_reservation(id)'
);

-- ---------------------------------------------------------------------------
-- Legacy handover tables: SELECT-only RLS and no browser DML privilege.
-- ---------------------------------------------------------------------------

SELECT is(
  (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'turnover_work_items',
        'access_handoff_requests',
        'deposit_settlements'
      )
      AND cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  ),
  0::BIGINT,
  'legacy handover tables have no ALL, INSERT, UPDATE or DELETE policies'
);

SELECT is(
  ARRAY(
    SELECT CONCAT(tablename, ':', policyname, ':', cmd, ':', roles::TEXT)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'turnover_work_items',
        'access_handoff_requests',
        'deposit_settlements'
      )
    ORDER BY tablename
  ),
  ARRAY[
    'access_handoff_requests:access_handoff_requests_exact_select:SELECT:{authenticated}',
    'deposit_settlements:deposit_settlements_exact_select:SELECT:{authenticated}',
    'turnover_work_items:turnover_work_items_exact_select:SELECT:{authenticated}'
  ]::TEXT[],
  'legacy handover tables retain exactly one authenticated SELECT policy each'
);

SELECT is(
  has_table_privilege('authenticated', 'public.turnover_work_items', 'INSERT'),
  FALSE,
  'authenticated has no INSERT privilege on turnover_work_items'
);

SELECT is(
  has_table_privilege('authenticated', 'public.turnover_work_items', 'UPDATE'),
  FALSE,
  'authenticated has no UPDATE privilege on turnover_work_items'
);

SELECT is(
  has_table_privilege('authenticated', 'public.turnover_work_items', 'DELETE'),
  FALSE,
  'authenticated has no DELETE privilege on turnover_work_items'
);

SELECT is(
  has_table_privilege('authenticated', 'public.access_handoff_requests', 'INSERT'),
  FALSE,
  'authenticated has no INSERT privilege on access_handoff_requests'
);

SELECT is(
  has_table_privilege('authenticated', 'public.access_handoff_requests', 'UPDATE'),
  FALSE,
  'authenticated has no UPDATE privilege on access_handoff_requests'
);

SELECT is(
  has_table_privilege('authenticated', 'public.access_handoff_requests', 'DELETE'),
  FALSE,
  'authenticated has no DELETE privilege on access_handoff_requests'
);

SELECT is(
  has_table_privilege('authenticated', 'public.deposit_settlements', 'INSERT'),
  FALSE,
  'authenticated has no INSERT privilege on deposit_settlements'
);

SELECT is(
  has_table_privilege('authenticated', 'public.deposit_settlements', 'UPDATE'),
  FALSE,
  'authenticated has no UPDATE privilege on deposit_settlements'
);

SELECT is(
  has_table_privilege('authenticated', 'public.deposit_settlements', 'DELETE'),
  FALSE,
  'authenticated has no DELETE privilege on deposit_settlements'
);

-- ---------------------------------------------------------------------------
-- Supported SECURITY DEFINER entry points stay executable by authenticated.
-- A missing/renamed signature fails rather than being mistaken for a revoke.
-- ---------------------------------------------------------------------------

SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.create_booking_hold_command(uuid,uuid,uuid,integer,timestamptz,timestamptz,boolean,text)'), 'EXECUTE'), FALSE), 'authenticated can execute create_booking_hold_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.commit_resource_booking_command(uuid,integer,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute commit_resource_booking_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.decide_resource_booking_command(uuid,integer,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute decide_resource_booking_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.update_resource_booking_finance_command(uuid,integer,text,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute update_resource_booking_finance_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.transition_resource_booking_command(uuid,integer,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute transition_resource_booking_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.cancel_resource_booking_command(uuid,integer,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute cancel_resource_booking_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.reschedule_resource_booking_command(uuid,integer,timestamptz,timestamptz,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute reschedule_resource_booking_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.create_booking_blackout_command(uuid,timestamptz,timestamptz,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute create_booking_blackout_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.cancel_booking_blackout_command(uuid,integer,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute cancel_booking_blackout_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.promote_booking_waitlist_command(uuid,text)'), 'EXECUTE'), FALSE), 'authenticated can execute promote_booking_waitlist_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.booking_lifecycle_workspace(uuid)'), 'EXECUTE'), FALSE), 'authenticated can execute booking_lifecycle_workspace');

SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.create_move_handover_command(uuid,uuid,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute create_move_handover_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.reschedule_move_handover_command(uuid,integer,timestamptz,timestamptz,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute reschedule_move_handover_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.cancel_move_handover_command(uuid,integer,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute cancel_move_handover_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.transition_move_handover_command(uuid,integer,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute transition_move_handover_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.update_move_handover_checklist_command(uuid,integer,text,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute update_move_handover_checklist_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.add_move_handover_evidence_command(uuid,integer,uuid,text,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute add_move_handover_evidence_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.record_move_handover_meter_command(uuid,integer,text,numeric,text,timestamptz,uuid,text)'), 'EXECUTE'), FALSE), 'authenticated can execute record_move_handover_meter_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.record_move_handover_condition_command(uuid,integer,text,text,text,uuid,text)'), 'EXECUTE'), FALSE), 'authenticated can execute record_move_handover_condition_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.prepare_move_handover_access_command(uuid,integer,text,text,boolean,text,text)'), 'EXECUTE'), FALSE), 'authenticated can execute prepare_move_handover_access_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.create_move_handover_turnover_command(uuid,integer,text,uuid,timestamptz,text)'), 'EXECUTE'), FALSE), 'authenticated can execute create_move_handover_turnover_command');
SELECT ok(COALESCE(has_function_privilege('authenticated', to_regprocedure('public.link_move_handover_deposit_command(uuid,integer,uuid,text)'), 'EXECUTE'), FALSE), 'authenticated can execute link_move_handover_deposit_command');
SELECT ok(
  COALESCE(has_function_privilege('authenticated', to_regprocedure('public.move_handover_workspace(uuid)'), 'EXECUTE'), FALSE)
  AND COALESCE(has_function_privilege('authenticated', to_regprocedure('public.current_user_can_view_move_handover(uuid)'), 'EXECUTE'), FALSE),
  'authenticated can execute move_handover_workspace and its exact RLS view helper'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM UNNEST(ARRAY[
      'public.create_booking_hold_command(uuid,uuid,uuid,integer,timestamptz,timestamptz,boolean,text)',
      'public.commit_resource_booking_command(uuid,integer,text,text,text)',
      'public.decide_resource_booking_command(uuid,integer,text,text,text)',
      'public.update_resource_booking_finance_command(uuid,integer,text,text,text,text)',
      'public.transition_resource_booking_command(uuid,integer,text,text,text)',
      'public.cancel_resource_booking_command(uuid,integer,text,text)',
      'public.reschedule_resource_booking_command(uuid,integer,timestamptz,timestamptz,text,text)',
      'public.create_booking_blackout_command(uuid,timestamptz,timestamptz,text,text,text)',
      'public.cancel_booking_blackout_command(uuid,integer,text,text)',
      'public.promote_booking_waitlist_command(uuid,text)',
      'public.booking_lifecycle_workspace(uuid)'
    ]::TEXT[]) AS expected(signature)
    WHERE COALESCE(
      has_function_privilege('anon', to_regprocedure(expected.signature), 'EXECUTE'),
      FALSE
    )
  ),
  'anon cannot execute any supported booking command or workspace function'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM UNNEST(ARRAY[
      'public.create_move_handover_command(uuid,uuid,text,text)',
      'public.reschedule_move_handover_command(uuid,integer,timestamptz,timestamptz,text,text)',
      'public.cancel_move_handover_command(uuid,integer,text,text)',
      'public.transition_move_handover_command(uuid,integer,text,text,text)',
      'public.update_move_handover_checklist_command(uuid,integer,text,text,text,text)',
      'public.add_move_handover_evidence_command(uuid,integer,uuid,text,text,text)',
      'public.record_move_handover_meter_command(uuid,integer,text,numeric,text,timestamptz,uuid,text)',
      'public.record_move_handover_condition_command(uuid,integer,text,text,text,uuid,text)',
      'public.prepare_move_handover_access_command(uuid,integer,text,text,boolean,text,text)',
      'public.create_move_handover_turnover_command(uuid,integer,text,uuid,timestamptz,text)',
      'public.link_move_handover_deposit_command(uuid,integer,uuid,text)',
      'public.move_handover_workspace(uuid)',
      'public.current_user_can_view_move_handover(uuid)'
    ]::TEXT[]) AS expected(signature)
    WHERE COALESCE(
      has_function_privilege('anon', to_regprocedure(expected.signature), 'EXECUTE'),
      FALSE
    )
  ),
  'anon cannot execute any supported move-handover command or workspace function'
);

-- PUBLIC EXECUTE would also make has_function_privilege true for anon and
-- authenticated. These assertions therefore detect direct grants to either
-- browser role and accidental PUBLIC exposure, while also requiring every
-- expected helper signature to exist.
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM UNNEST(ARRAY[
      'public.booking_touch_updated_at()',
      'public.booking_reject_history_mutation()',
      'public.booking_assert_resource_scope()',
      'public.booking_sync_capacity_units()',
      'public.booking_assert_capacity_allocation()',
      'public.booking_assert_buffer_snapshot()',
      'public.booking_assert_reservation_resource()',
      'public.booking_actor_can_request(uuid,uuid,uuid)',
      'public.booking_resource_window_is_open(uuid,timestamptz,timestamptz)',
      'public.booking_validate_window(uuid,timestamptz,timestamptz)',
      'public.booking_command_replay(uuid,text,text,text)',
      'public.booking_store_receipt(uuid,text,text,text,jsonb)',
      'public.booking_record_change(uuid,text,text,uuid,jsonb,jsonb,text)',
      'public.booking_add_event(uuid,uuid,uuid,uuid,text,text,text,integer,text,jsonb)',
      'public.booking_try_allocate_capacity(uuid,text,uuid,tstzrange,integer)',
      'public.booking_expire_holds(uuid)',
      'public.booking_offer_waitlist_internal(uuid,integer)',
      'public.booking_assert_party_scope()',
      'public.booking_assert_staff_assignment_scope()',
      'public.booking_assert_task_scope()',
      'public.booking_assert_event_scope()',
      'public.booking_assert_receipt_scope()',
      'public.booking_assert_opening_interval()',
      'public.booking_assert_waitlist_offer()'
    ]::TEXT[]) AS expected(signature)
    WHERE to_regprocedure(expected.signature) IS NULL
       OR COALESCE(
            has_function_privilege(
              'authenticated', to_regprocedure(expected.signature), 'EXECUTE'
            ),
            FALSE
          )
       OR COALESCE(
            has_function_privilege(
              'anon', to_regprocedure(expected.signature), 'EXECUTE'
            ),
            FALSE
          )
  ),
  'all booking internals exist and remain revoked from browser roles and PUBLIC'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM UNNEST(ARRAY[
      'public.move_handover_touch_updated_at()',
      'public.move_handover_reject_history_mutation()',
      'public.move_handover_assert_appointment_scope()',
      'public.move_handover_assert_detail_scope()',
      'public.move_handover_assert_supersession()',
      'public.current_user_can_manage_move_handover(uuid)',
      'public.current_user_can_use_move_handover_document(uuid,uuid)',
      'public.move_handover_command_replay(uuid,text,text,text)',
      'public.move_handover_store_receipt(uuid,text,text,text,jsonb)',
      'public.move_handover_add_event(public.move_handover_appointments,text,text,text,jsonb)',
      'public.move_handover_record_change(public.move_handover_appointments,text,jsonb,text)',
      'public.move_handover_invalidate_access(uuid,text)',
      'public.sync_move_handover_from_reservation()',
      'public.move_handover_response(text,public.move_handover_appointments)'
    ]::TEXT[]) AS expected(signature)
    WHERE to_regprocedure(expected.signature) IS NULL
       OR COALESCE(
            has_function_privilege(
              'authenticated', to_regprocedure(expected.signature), 'EXECUTE'
            ),
            FALSE
          )
       OR COALESCE(
            has_function_privilege(
              'anon', to_regprocedure(expected.signature), 'EXECUTE'
            ),
            FALSE
          )
  ),
  'all move-handover internals exist and remain revoked from browser roles and PUBLIC'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_trigger trigger
    JOIN pg_class relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'reservations'
      AND trigger.tgname = 'reservations_sync_move_handover'
      AND NOT trigger.tgisinternal
      AND trigger.tgenabled = 'O'
  ),
  'the canonical reservation-to-handover synchronization trigger is enabled'
);

SELECT like(
  (
    SELECT pg_get_triggerdef(trigger.oid)
    FROM pg_trigger trigger
    JOIN pg_class relation ON relation.oid = trigger.tgrelid
    JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
    WHERE namespace.nspname = 'public'
      AND relation.relname = 'reservations'
      AND trigger.tgname = 'reservations_sync_move_handover'
      AND NOT trigger.tgisinternal
  ),
  '%access_preparation_state%',
  'reservation access revocation participates in handover synchronization'
);

-- ---------------------------------------------------------------------------
-- Direct exploit probes. Exact error text distinguishes a privilege revoke
-- from an RLS-only denial (inert write policies are not considered safe).
-- ---------------------------------------------------------------------------

SET LOCAL ROLE authenticated;

SELECT throws_ok(
  $$INSERT INTO public.reservations DEFAULT VALUES$$,
  '42501',
  'permission denied for table reservations',
  'authenticated direct INSERT on reservations raises 42501 at the privilege boundary'
);

SELECT throws_ok(
  $$UPDATE public.reservations SET status = status WHERE FALSE$$,
  '42501',
  'permission denied for table reservations',
  'authenticated direct UPDATE on reservations raises 42501 at the privilege boundary'
);

SELECT throws_ok(
  $$DELETE FROM public.reservations WHERE FALSE$$,
  '42501',
  'permission denied for table reservations',
  'authenticated direct DELETE on reservations raises 42501 at the privilege boundary'
);

SELECT throws_ok(
  $$INSERT INTO public.turnover_work_items DEFAULT VALUES$$,
  '42501',
  'permission denied for table turnover_work_items',
  'authenticated direct INSERT on turnover_work_items raises 42501'
);

SELECT throws_ok(
  $$UPDATE public.turnover_work_items SET status = status WHERE FALSE$$,
  '42501',
  'permission denied for table turnover_work_items',
  'authenticated direct UPDATE on turnover_work_items raises 42501'
);

SELECT throws_ok(
  $$DELETE FROM public.turnover_work_items WHERE FALSE$$,
  '42501',
  'permission denied for table turnover_work_items',
  'authenticated direct DELETE on turnover_work_items raises 42501'
);

SELECT throws_ok(
  $$INSERT INTO public.access_handoff_requests DEFAULT VALUES$$,
  '42501',
  'permission denied for table access_handoff_requests',
  'authenticated direct INSERT on access_handoff_requests raises 42501'
);

SELECT throws_ok(
  $$UPDATE public.access_handoff_requests SET status = status WHERE FALSE$$,
  '42501',
  'permission denied for table access_handoff_requests',
  'authenticated direct UPDATE on access_handoff_requests raises 42501'
);

SELECT throws_ok(
  $$DELETE FROM public.access_handoff_requests WHERE FALSE$$,
  '42501',
  'permission denied for table access_handoff_requests',
  'authenticated direct DELETE on access_handoff_requests raises 42501'
);

SELECT throws_ok(
  $$INSERT INTO public.deposit_settlements DEFAULT VALUES$$,
  '42501',
  'permission denied for table deposit_settlements',
  'authenticated direct INSERT on deposit_settlements raises 42501'
);

SELECT throws_ok(
  $$UPDATE public.deposit_settlements SET status = status WHERE FALSE$$,
  '42501',
  'permission denied for table deposit_settlements',
  'authenticated direct UPDATE on deposit_settlements raises 42501'
);

SELECT throws_ok(
  $$DELETE FROM public.deposit_settlements WHERE FALSE$$,
  '42501',
  'permission denied for table deposit_settlements',
  'authenticated direct DELETE on deposit_settlements raises 42501'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
