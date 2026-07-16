-- Owner finance visibility hardening.
--
-- Owners receive a read-only ledger projection for units where an active,
-- verified owner relationship exists. Tenants and staff receive no finance
-- rows. Internal finance roles keep their existing organization/site scope.
-- No insert, update, delete, payment-provider or posting capability is added.

BEGIN;

ALTER TABLE public.finance_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- A permissive legacy company-member SELECT policy would OR together with a
-- new owner policy and expose every company ledger row. Replace every policy
-- that can grant SELECT on these two tables before installing the canonical
-- read boundary. Existing INSERT/UPDATE policies are intentionally untouched.
DO $$
DECLARE
  v_table_name TEXT;
  v_policy RECORD;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'finance_ledger_entries',
    'payment_transactions'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table_name
        AND cmd IN ('SELECT', 'ALL')
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname,
        v_table_name
      );
    END LOOP;
  END LOOP;
END;
$$;

CREATE POLICY finance_ledger_read_by_role_and_relationship
  ON public.finance_ledger_entries
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND public.current_user_can_manage_site(site_id)
        )
      )
    )
  );

-- Provider references and raw payment payloads remain internal. Owners obtain
-- payment history from the minimal finance_ledger_entries projection instead.
CREATE POLICY payment_transactions_read_internal_roles
  ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (
    (SELECT public.is_platform_super_admin())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (
        (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
        OR (
          (SELECT public.current_user_profile_role()) = 'manager'
          AND ledger_entry_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM public.finance_ledger_entries ledger
            WHERE ledger.id = payment_transactions.ledger_entry_id
              AND ledger.company_id = payment_transactions.company_id
              AND public.current_user_can_manage_site(ledger.site_id)
          )
        )
      )
    )
  );

CREATE INDEX IF NOT EXISTS idx_finance_ledger_owner_statement
  ON public.finance_ledger_entries(unit_id, created_at DESC, id DESC)
  WHERE unit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_finance_ledger_owner_payments
  ON public.finance_ledger_entries(unit_id, paid_at DESC)
  WHERE unit_id IS NOT NULL AND entry_type = 'payment';

COMMENT ON POLICY finance_ledger_read_by_role_and_relationship
  ON public.finance_ledger_entries IS
  'Only internal organization/site finance roles can query base ledger rows. Owners, tenants and staff are denied direct access; owners consume owner_finance_workspace safe projections.';

COMMENT ON POLICY payment_transactions_read_internal_roles
  ON public.payment_transactions IS
  'Raw payment/provider transaction rows are restricted to platform, organization finance, and assigned site-management roles; owners consume the safe ledger projection.';

DROP FUNCTION IF EXISTS public.owner_finance_workspace(TEXT, INTEGER, INTEGER);

CREATE OR REPLACE FUNCTION public.owner_finance_workspace(
  p_unit_no TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 40,
  p_snapshot_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
  p_cursor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_company_id UUID := public.current_user_company_id();
  v_unit_no TEXT := NULLIF(BTRIM(p_unit_no), '');
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 100);
  v_snapshot_at TIMESTAMPTZ := COALESCE(p_snapshot_at, CURRENT_TIMESTAMP);
  v_units JSONB;
  v_entries JSONB;
  v_aggregates JSONB;
  v_next_cursor JSONB := NULL;
  v_has_more BOOLEAN := FALSE;
  v_total_entries BIGINT := 0;
BEGIN
  IF v_actor_id IS NULL
     OR public.current_user_profile_role() IS DISTINCT FROM 'owner'
     OR v_company_id IS NULL
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only an authenticated owner can view an owner finance statement';
  END IF;

  IF v_unit_no IS NOT NULL AND LENGTH(v_unit_no) > 32 THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid unit reference';
  END IF;

  IF (p_cursor_created_at IS NULL) IS DISTINCT FROM (p_cursor_id IS NULL)
     OR (p_snapshot_at IS NULL) IS DISTINCT FROM (p_cursor_id IS NULL)
     OR v_snapshot_at > CURRENT_TIMESTAMP + INTERVAL '5 seconds'
     OR (p_cursor_created_at IS NOT NULL AND p_cursor_created_at > v_snapshot_at)
  THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid owner finance pagination cursor or snapshot';
  END IF;

  IF v_unit_no IS NOT NULL AND NOT EXISTS (
    SELECT 1
      FROM public.units u
     WHERE u.company_id = v_company_id
       AND u.unit_no = v_unit_no
       AND public.current_user_has_unit_relationship(
         u.id,
         ARRAY['owner']::TEXT[]
       )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'The requested unit is outside the authenticated owner scope';
  END IF;

  -- A cursor is accepted only when it identifies an exact row in this
  -- authenticated owner's current unit scope and the same immutable snapshot.
  -- This makes altered, cross-owner and stale cursor pairs fail closed.
  IF p_cursor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.finance_ledger_entries l
    JOIN public.units u
      ON u.id = l.unit_id
     AND u.company_id = l.company_id
    WHERE l.id = p_cursor_id
      AND l.created_at = p_cursor_created_at
      AND l.created_at <= v_snapshot_at
      AND l.company_id = v_company_id
      AND (v_unit_no IS NULL OR u.unit_no = v_unit_no)
      AND public.current_user_has_unit_relationship(
        u.id,
        ARRAY['owner']::TEXT[]
      )
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid owner finance pagination cursor or snapshot';
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id', u.id, 'unit_no', u.unit_no)
      ORDER BY u.unit_no
    ),
    '[]'::JSONB
  )
    INTO v_units
    FROM public.units u
   WHERE u.company_id = v_company_id
     AND (v_unit_no IS NULL OR u.unit_no = v_unit_no)
     AND public.current_user_has_unit_relationship(
       u.id,
       ARRAY['owner']::TEXT[]
      );

  -- Totals are calculated over the complete authorized ledger, never over
  -- the bounded history page returned below. Reversed manual receipts are
  -- excluded from effective payment totals while both immutable facts remain
  -- available in paged history.
  WITH authorized_entries AS MATERIALIZED (
    SELECT l.*
    FROM public.finance_ledger_entries l
    JOIN public.units u
      ON u.id = l.unit_id
     AND u.company_id = l.company_id
    WHERE l.company_id = v_company_id
      AND l.created_at <= v_snapshot_at
      AND (v_unit_no IS NULL OR u.unit_no = v_unit_no)
      AND public.current_user_has_unit_relationship(
        u.id,
        ARRAY['owner']::TEXT[]
      )
  ),
  reversed_manual_payments AS MATERIALIZED (
    SELECT DISTINCT
      e.unit_id,
      e.metadata->>'reversesManualPaymentId' AS manual_payment_id
    FROM authorized_entries e
    WHERE e.metadata->>'source' = 'manual_payment_reversal'
      AND e.metadata->>'direction' = 'reversal'
      AND e.metadata->>'reversesManualPaymentId' IS NOT NULL
  ),
  per_unit AS (
    SELECT
      e.unit_id,
      CASE
        WHEN count(DISTINCT e.currency) = 1 THEN min(e.currency)
        ELSE 'MIXED'
      END AS currency,
      GREATEST(
        0,
        COALESCE(sum(e.amount_cents) FILTER (
          WHERE e.entry_type NOT IN ('payment', 'refund')
            AND e.status IN ('open', 'partially_paid', 'overdue')
        ), 0)
        - COALESCE(sum(e.amount_cents) FILTER (
          WHERE e.entry_type = 'payment'
            AND e.metadata->>'source' = 'manual_payment'
            AND e.metadata->>'direction' = 'receipt'
            AND reversed.manual_payment_id IS NULL
        ), 0)
      ) AS open_balance_cents,
      GREATEST(
        0,
        COALESCE(sum(e.amount_cents) FILTER (
          WHERE e.entry_type NOT IN ('payment', 'refund')
            AND e.status = 'overdue'
        ), 0)
        - COALESCE(sum(e.amount_cents) FILTER (
          WHERE e.entry_type = 'payment'
            AND e.metadata->>'source' = 'manual_payment'
            AND e.metadata->>'direction' = 'receipt'
            AND reversed.manual_payment_id IS NULL
        ), 0)
      ) AS overdue_balance_cents,
      COALESCE(sum(e.amount_cents) FILTER (
        WHERE e.entry_type = 'payment'
          AND (
            e.metadata->>'source' IS DISTINCT FROM 'manual_payment'
            OR reversed.manual_payment_id IS NULL
          )
      ), 0) AS recorded_payments_cents,
      max(COALESCE(e.paid_at, e.created_at)) FILTER (
        WHERE e.entry_type = 'payment'
          AND (
            e.metadata->>'source' IS DISTINCT FROM 'manual_payment'
            OR reversed.manual_payment_id IS NULL
          )
      ) AS last_payment_at,
      count(*)::BIGINT AS entry_count
    FROM authorized_entries e
    LEFT JOIN reversed_manual_payments reversed
      ON reversed.unit_id = e.unit_id
     AND reversed.manual_payment_id = e.metadata->>'manualPaymentId'
    GROUP BY e.unit_id
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'unit_id', aggregate_row.unit_id,
      'currency', aggregate_row.currency,
      'open_balance_cents', aggregate_row.open_balance_cents,
      'overdue_balance_cents', aggregate_row.overdue_balance_cents,
      'recorded_payments_cents', aggregate_row.recorded_payments_cents,
      'last_payment_at', aggregate_row.last_payment_at,
      'entry_count', aggregate_row.entry_count
    ) ORDER BY aggregate_row.unit_id), '[]'::JSONB),
    COALESCE(sum(aggregate_row.entry_count), 0)::BIGINT
  INTO v_aggregates, v_total_entries
  FROM per_unit aggregate_row;

  SELECT
    COALESCE(
      jsonb_agg(
        entry.safe_row
        ORDER BY entry.created_at DESC, entry.entry_id DESC
      ) FILTER (WHERE entry.page_rank <= v_limit),
      '[]'::JSONB
    ),
    COALESCE(max(entry.page_rank), 0) > v_limit
  INTO v_entries, v_has_more
  FROM (
      SELECT
        l.created_at,
        l.id AS entry_id,
        row_number() OVER (ORDER BY l.created_at DESC, l.id DESC) AS page_rank,
        jsonb_build_object(
          'id', l.id,
          'unit_id', l.unit_id,
          'entry_type', l.entry_type,
          'period', l.period,
          'due_date', l.due_date,
          'paid_at', l.paid_at,
          'posted_at', l.posted_at,
          'status', l.status,
          'amount_cents', l.amount_cents,
          'currency', l.currency,
          'description', l.description,
          'created_at', l.created_at,
          'metadata', CASE
            WHEN l.metadata->>'source' IN (
              'manual_payment',
              'manual_payment_reversal'
            ) THEN jsonb_strip_nulls(jsonb_build_object(
              'source', l.metadata->>'source',
              'direction', l.metadata->>'direction',
              'reconciliationStatus', l.metadata->>'reconciliationStatus',
              'manualPaymentId', l.metadata->>'manualPaymentId',
              'reversesManualPaymentId', l.metadata->>'reversesManualPaymentId'
            ))
            ELSE '{}'::JSONB
          END
        ) AS safe_row
      FROM public.finance_ledger_entries l
      JOIN public.units u
        ON u.id = l.unit_id
       AND u.company_id = l.company_id
     WHERE l.company_id = v_company_id
       AND l.created_at <= v_snapshot_at
       AND (v_unit_no IS NULL OR u.unit_no = v_unit_no)
       AND public.current_user_has_unit_relationship(
         u.id,
         ARRAY['owner']::TEXT[]
       )
       AND (
         p_cursor_id IS NULL
         OR (l.created_at, l.id) < (p_cursor_created_at, p_cursor_id)
       )
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT v_limit + 1
    ) entry;

  IF v_has_more AND jsonb_array_length(v_entries) > 0 THEN
    v_next_cursor := jsonb_build_object(
      'createdAt', v_entries->(jsonb_array_length(v_entries) - 1)->>'created_at',
      'id', v_entries->(jsonb_array_length(v_entries) - 1)->>'id'
    );
  END IF;

  RETURN jsonb_build_object(
    'contractVersion', 'owner-finance.v2',
    'scope', 'verified-owner-units',
    'generatedAt', NOW(),
    'units', v_units,
    'aggregates', v_aggregates,
    'entries', v_entries,
    'pagination', jsonb_build_object(
      'limit', v_limit,
      'returnedEntryCount', jsonb_array_length(v_entries),
      'totalEntryCount', v_total_entries,
      'hasMore', v_has_more,
      'nextCursor', v_next_cursor,
      'snapshotAt', v_snapshot_at
    )
  );
END;
$$;

COMMENT ON FUNCTION public.owner_finance_workspace(TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID) IS
  'Returns full-scope owner aggregates plus minimal snapshot-consistent keyset history for active verified owner units; raw ledger metadata and all payment-provider rows remain inaccessible.';

REVOKE ALL ON FUNCTION public.owner_finance_workspace(TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.owner_finance_workspace(TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID)
  TO authenticated;

COMMIT;
