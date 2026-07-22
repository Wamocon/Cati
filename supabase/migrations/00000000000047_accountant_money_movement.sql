-- Phase-7 of the guest / vendor / guardianship role expansion: connect the money
-- the new roles move (wallet credit, wallet top-ups, activity bookings and
-- vendor-submitted invoices) back into the accountant's finance subsystem.
--
-- This migration adds a SINGLE read-only SECURITY DEFINER aggregation helper. It
-- exists for exactly one reason: an accountant can already read every company
-- wallet (mig 44 wallets_read RLS), but the profiles RLS
-- (profiles_select_role_relationship_scope, mig 20) does NOT let an accountant
-- read the role of an arbitrary company member, so an accountant cannot GROUP the
-- wallet balances BY the owner's role from a client-side embed. This helper does
-- that grouping server-side for the caller's own company only.
--
-- It NEVER mutates anything and it changes NO existing table, RLS policy or RPC.
-- Activity bookings and vendor-submitted invoices are read directly by the app
-- through the RLS that already grants same-company admin / accountant / manager
-- SELECT (migs 45 / 39), so they need no helper here.
--
-- Security model (mirrors migs 39 / 41 / 44):
--   * SECURITY DEFINER, search_path = '' so it never resolves an unqualified name.
--   * Company + role gated INSIDE the function: only a same-company admin /
--     accountant / manager may call it; everyone else is refused with 42501.
--   * EXECUTE revoked from PUBLIC / anon; granted to authenticated only.

BEGIN;

-- Wallet money picture for the caller's company: user-wallet credit grouped by the
-- owner's role, the same figures totalled per currency, and the gross top-ups
-- posted since p_period_start (default: the start of the current month). All money
-- is integer minor units; the app renders dual TRY / EUR at the display layer.
CREATE OR REPLACE FUNCTION public.accountant_wallet_money_summary(
  p_period_start timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role text := public.current_user_profile_role();
  v_company uuid := public.current_user_company_id();
  v_period timestamptz := COALESCE(p_period_start, date_trunc('month', now()));
BEGIN
  IF v_company IS NULL OR v_role NOT IN ('admin', 'accountant', 'manager') THEN
    RAISE EXCEPTION
      'Only a same-company admin, accountant or manager may read the wallet money summary.'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    -- User-wallet credit grouped by the owner's business role (+ currency).
    'byRole', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'role', r.role,
        'currency', r.currency,
        'balanceCents', r.balance_cents,
        'walletCount', r.wallet_count
      ) ORDER BY r.role, r.currency)
      FROM (
        SELECT COALESCE(p.role, 'unknown') AS role,
               w.currency AS currency,
               SUM(w.balance_cents) AS balance_cents,
               COUNT(*) AS wallet_count
        FROM public.wallets w
        LEFT JOIN public.profiles p ON p.id = w.owner_profile_id
        WHERE w.company_id = v_company
          AND w.kind = 'user'
        GROUP BY COALESCE(p.role, 'unknown'), w.currency
      ) r
    ), '[]'::jsonb),
    -- The same user-wallet credit totalled per currency.
    'totalsByCurrency', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'currency', t.currency,
        'balanceCents', t.balance_cents,
        'walletCount', t.wallet_count
      ) ORDER BY t.currency)
      FROM (
        SELECT w.currency AS currency,
               SUM(w.balance_cents) AS balance_cents,
               COUNT(*) AS wallet_count
        FROM public.wallets w
        WHERE w.company_id = v_company
          AND w.kind = 'user'
        GROUP BY w.currency
      ) t
    ), '[]'::jsonb),
    -- Gross top-ups posted this period (credit legs landing on user wallets).
    'topUpsByCurrency', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'currency', u.currency,
        'amountCents', u.amount_cents,
        'count', u.txn_count
      ) ORDER BY u.currency)
      FROM (
        SELECT e.currency AS currency,
               SUM(e.credit_cents) AS amount_cents,
               COUNT(DISTINCT t.id) AS txn_count
        FROM public.wallet_transactions t
        JOIN public.wallet_ledger_entries e ON e.transaction_id = t.id
        JOIN public.wallets w ON w.id = e.wallet_id AND w.kind = 'user'
        WHERE t.company_id = v_company
          AND t.type = 'topup'
          AND t.created_at >= v_period
          AND e.credit_cents > 0
        GROUP BY e.currency
      ) u
    ), '[]'::jsonb),
    'periodStart', v_period,
    'source', 'supabase'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.accountant_wallet_money_summary(timestamptz)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accountant_wallet_money_summary(timestamptz)
  TO authenticated;

COMMENT ON FUNCTION public.accountant_wallet_money_summary(timestamptz) IS
  'Read-only company-scoped wallet money picture for the accountant subsystem: user-wallet credit grouped by the owner role (+ per currency), the per-currency totals and gross top-ups since p_period_start. Same-company admin/accountant/manager only; never mutates.';

COMMIT;
