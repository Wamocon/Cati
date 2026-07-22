-- Phase-2 of the guest / vendor / guardianship role expansion: the wallet /
-- credit ledger.
--
-- Money here is DEMO credit and provider-swappable. Top-up is a simulated
-- funding step (a real payment provider drops in later behind the same RPC).
-- Amounts are integer minor units (kurus / cents). Currency is single per
-- wallet; the app renders dual TRY / EUR at the display layer (lib/currency.ts)
-- with no FX in the ledger.
--
-- Design (append-only double-entry ledger + a cached balance per wallet):
--   * wallets            - one stored-value account per (owner, currency), plus a
--                          company-level settlement + revenue wallet.
--   * wallet_transactions - the business event (topup / spend / transfer / refund
--                          / offset). idempotency_key is UNIQUE so a retried call
--                          returns the original transaction instead of duplicating.
--   * wallet_ledger_entries - the immutable double-entry legs. credit raises a
--                          wallet's balance, debit lowers it; every transaction's
--                          legs net to zero. A BEFORE UPDATE/DELETE trigger makes
--                          them append-only (mirrors prevent_posted_ledger_mutation).
--
-- Security model (mirrors migrations 39 and 41):
--   * All mutation goes through SECURITY DEFINER, search_path='' RPCs. Direct
--     INSERT/UPDATE/DELETE is REVOKEd from `authenticated`; only SELECT is granted
--     and further constrained by RLS. Internal helper functions have EXECUTE
--     revoked from `authenticated`; only the caller-facing RPCs are granted.
--   * RPCs lock the wallet row(s) FOR UPDATE, re-read the balance, reject an
--     overdraft, update the cached balance, and write an audit_events row in the
--     same transaction. Transfers lock both wallets ordered by id (deadlock-safe).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  -- User wallets own a profile; company-level (settlement / revenue) wallets do
  -- not, so owner_profile_id is nullable and its shape is enforced by the CHECK.
  owner_profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'user'
    CHECK (kind IN ('user', 'settlement', 'revenue')),
  currency text NOT NULL DEFAULT 'TRY'
    CHECK (currency IN ('TRY', 'EUR')),
  balance_cents bigint NOT NULL DEFAULT 0,
  low_balance_threshold_cents bigint NOT NULL DEFAULT 0
    CHECK (low_balance_threshold_cents >= 0),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'frozen', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A person holds at most one wallet per currency; company wallets have a NULL
  -- owner (NULLs are distinct, so this does not constrain them -- see the partial
  -- unique index below for one settlement + one revenue wallet per company).
  UNIQUE (owner_profile_id, currency),
  CONSTRAINT wallets_owner_kind_check CHECK (
    (kind = 'user' AND owner_profile_id IS NOT NULL)
    OR (kind IN ('settlement', 'revenue')
        AND owner_profile_id IS NULL
        AND company_id IS NOT NULL)
  )
);

-- Exactly one settlement and one revenue wallet per (company, currency).
CREATE UNIQUE INDEX IF NOT EXISTS ux_wallets_company_level
  ON public.wallets (company_id, kind, currency)
  WHERE owner_profile_id IS NULL;

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL
    CHECK (type IN ('topup', 'spend', 'transfer', 'refund', 'offset')),
  idempotency_key text UNIQUE NOT NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'posted'
    CHECK (status IN ('posted', 'reversed', 'void')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL
    REFERENCES public.wallet_transactions(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  debit_cents bigint NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents bigint NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  currency text NOT NULL CHECK (currency IN ('TRY', 'EUR')),
  operation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Exactly one side of every leg is non-zero.
  CONSTRAINT wallet_ledger_entries_single_sided CHECK (
    (debit_cents > 0 AND credit_cents = 0)
    OR (debit_cents = 0 AND credit_cents > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_wallets_owner_profile
  ON public.wallets (owner_profile_id);
CREATE INDEX IF NOT EXISTS idx_wallets_company
  ON public.wallets (company_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_company
  ON public.wallet_transactions (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_actor
  ON public.wallet_transactions (actor_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_entries_wallet
  ON public.wallet_ledger_entries (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_entries_transaction
  ON public.wallet_ledger_entries (transaction_id);

DROP TRIGGER IF EXISTS set_wallets_updated_at ON public.wallets;
CREATE TRIGGER set_wallets_updated_at
  BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Append-only ledger: legs are never edited or deleted; corrections are posted
-- as a compensating reversal. Mirrors prevent_posted_ledger_mutation (mig 3).
CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'Wallet ledger entries are immutable; post a compensating reversal instead.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_wallet_ledger_mutation ON public.wallet_ledger_entries;
CREATE TRIGGER prevent_wallet_ledger_mutation
  BEFORE UPDATE OR DELETE ON public.wallet_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

-- ---------------------------------------------------------------------------
-- 2. Internal helper functions (EXECUTE revoked from authenticated at the end).
-- ---------------------------------------------------------------------------

-- Read-only JSON projection of a wallet. Used as the return payload of
-- ensure_user_wallet.
CREATE OR REPLACE FUNCTION public.wallet_json(p_wallet_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'wallet', jsonb_build_object(
      'id', w.id,
      'kind', w.kind,
      'currency', w.currency,
      'balanceCents', w.balance_cents,
      'lowBalanceThresholdCents', w.low_balance_threshold_cents,
      'status', w.status,
      'companyId', w.company_id,
      'ownerProfileId', w.owner_profile_id
    ),
    'source', 'supabase'
  )
  FROM public.wallets w
  WHERE w.id = p_wallet_id;
$$;

-- Read-only JSON projection of a posted transaction, its ledger legs and the
-- refreshed balances of every wallet it touched. The command return payload.
CREATE OR REPLACE FUNCTION public.wallet_transaction_json(p_txn_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'transaction', jsonb_build_object(
      'id', t.id,
      'type', t.type,
      'status', t.status,
      'reason', t.reason,
      'idempotencyKey', t.idempotency_key,
      'actorProfileId', t.actor_profile_id,
      'companyId', t.company_id,
      'metadata', t.metadata,
      'createdAt', t.created_at
    ),
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'transactionId', e.transaction_id,
        'walletId', e.wallet_id,
        'debitCents', e.debit_cents,
        'creditCents', e.credit_cents,
        'currency', e.currency,
        'operation', e.operation
      ) ORDER BY e.created_at)
      FROM public.wallet_ledger_entries e
      WHERE e.transaction_id = t.id
    ), '[]'::jsonb),
    'wallets', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', w.id,
        'kind', w.kind,
        'currency', w.currency,
        'balanceCents', w.balance_cents,
        'lowBalanceThresholdCents', w.low_balance_threshold_cents,
        'status', w.status,
        'ownerProfileId', w.owner_profile_id
      ))
      FROM public.wallets w
      WHERE w.id IN (
        SELECT DISTINCT e.wallet_id
        FROM public.wallet_ledger_entries e
        WHERE e.transaction_id = t.id
      )
    ), '[]'::jsonb),
    'source', 'supabase'
  )
  FROM public.wallet_transactions t
  WHERE t.id = p_txn_id;
$$;

-- Post one immutable double-entry leg and move the cached balance in the same
-- transaction. Assumes the wallet row is already locked FOR UPDATE by the caller.
CREATE OR REPLACE FUNCTION public.wallet_apply_entry(
  p_transaction_id uuid,
  p_wallet_id uuid,
  p_debit_cents bigint,
  p_credit_cents bigint,
  p_currency text,
  p_operation text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.wallet_ledger_entries (
    transaction_id, wallet_id, debit_cents, credit_cents, currency, operation
  ) VALUES (
    p_transaction_id, p_wallet_id, p_debit_cents, p_credit_cents,
    p_currency, p_operation
  );

  UPDATE public.wallets
  SET balance_cents = balance_cents + p_credit_cents - p_debit_cents
  WHERE id = p_wallet_id;
END;
$$;

-- Ensure a company has its settlement + revenue wallets for a currency. Idempotent.
CREATE OR REPLACE FUNCTION public.ensure_company_wallets(
  p_company_id uuid,
  p_currency text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_company_id IS NULL THEN
    RETURN;
  END IF;
  INSERT INTO public.wallets (company_id, owner_profile_id, kind, currency)
  SELECT p_company_id, NULL, k.kind,
         CASE WHEN p_currency IN ('TRY', 'EUR') THEN p_currency ELSE 'TRY' END
  FROM (VALUES ('settlement'::text), ('revenue'::text)) AS k(kind)
  ON CONFLICT (company_id, kind, currency) WHERE owner_profile_id IS NULL
  DO NOTHING;
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Caller-facing RPCs (GRANT EXECUTE to authenticated at the end).
-- ---------------------------------------------------------------------------

-- Auto-provision the caller's own wallet on first access; return its projection.
CREATE OR REPLACE FUNCTION public.ensure_user_wallet(p_currency text DEFAULT 'TRY')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_company uuid := public.current_user_company_id();
  v_currency text := CASE WHEN p_currency IN ('TRY', 'EUR') THEN p_currency ELSE 'TRY' END;
  v_wallet_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;

  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE owner_profile_id = v_actor AND currency = v_currency;

  IF NOT FOUND THEN
    INSERT INTO public.wallets (company_id, owner_profile_id, kind, currency)
    VALUES (v_company, v_actor, 'user', v_currency)
    ON CONFLICT (owner_profile_id, currency) DO NOTHING
    RETURNING id INTO v_wallet_id;

    IF v_wallet_id IS NULL THEN
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE owner_profile_id = v_actor AND currency = v_currency;
    END IF;
  END IF;

  PERFORM public.ensure_company_wallets(v_company, v_currency);

  RETURN public.wallet_json(v_wallet_id);
END;
$$;

-- Demo funding: debit the company settlement wallet, credit the target wallet.
CREATE OR REPLACE FUNCTION public.wallet_topup(
  p_wallet_id uuid,
  p_amount_cents bigint,
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
  v_wallet public.wallets%ROWTYPE;
  v_settlement public.wallets%ROWTYPE;
  v_existing public.wallet_transactions%ROWTYPE;
  v_txn_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  -- Idempotent replay: return the original transaction to the same actor
  -- (or a same-company admin / accountant) before doing anything else.
  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.actor_profile_id = v_actor
       OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE EXCEPTION 'This idempotency key belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents < 1
     OR p_amount_cents > 1000000000000
  THEN
    RAISE EXCEPTION 'The amount must be between 0.01 and 10,000,000,000.00.';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The wallet was not found.' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    v_wallet.owner_profile_id = v_actor
    OR (v_role IN ('admin', 'accountant') AND v_wallet.company_id = v_company)
  ) THEN
    RAISE EXCEPTION 'You cannot top up this wallet.' USING ERRCODE = '42501';
  END IF;
  IF v_wallet.status <> 'active' THEN
    RAISE EXCEPTION 'This wallet is not active.';
  END IF;
  IF v_wallet.company_id IS NULL THEN
    RAISE EXCEPTION 'This wallet has no company settlement account to fund it.';
  END IF;

  PERFORM public.ensure_company_wallets(v_wallet.company_id, v_wallet.currency);
  SELECT * INTO v_settlement
  FROM public.wallets
  WHERE company_id = v_wallet.company_id
    AND kind = 'settlement'
    AND currency = v_wallet.currency
    AND owner_profile_id IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The company settlement wallet is unavailable.';
  END IF;

  INSERT INTO public.wallet_transactions (
    company_id, type, idempotency_key, actor_profile_id, status, reason, metadata
  ) VALUES (
    v_wallet.company_id, 'topup', p_idempotency_key, v_actor, 'posted', NULL,
    jsonb_build_object('walletId', v_wallet.id, 'amountCents', p_amount_cents,
                       'funding', 'demo-settlement')
  ) RETURNING id INTO v_txn_id;

  PERFORM public.wallet_apply_entry(
    v_txn_id, v_settlement.id, p_amount_cents, 0, v_wallet.currency, 'topup');
  PERFORM public.wallet_apply_entry(
    v_txn_id, v_wallet.id, 0, p_amount_cents, v_wallet.currency, 'topup');

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_wallet.company_id, v_actor, 'wallet.topup', 'wallet_transactions', v_txn_id,
    jsonb_build_object('walletId', v_wallet.id, 'amountCents', p_amount_cents,
                       'currency', v_wallet.currency)
  );

  RETURN public.wallet_transaction_json(v_txn_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND AND (
      v_existing.actor_profile_id = v_actor
      OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    ) THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- Spend from a wallet: lock, reject overdraft, debit the wallet + credit the
-- company revenue wallet. Emits a wallet.balance_low outbox event when the new
-- balance falls to or below the threshold.
CREATE OR REPLACE FUNCTION public.wallet_spend(
  p_wallet_id uuid,
  p_amount_cents bigint,
  p_operation text,
  p_reason text,
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
  v_wallet public.wallets%ROWTYPE;
  v_revenue public.wallets%ROWTYPE;
  v_existing public.wallet_transactions%ROWTYPE;
  v_txn_id uuid;
  v_reason text := NULLIF(btrim(p_reason), '');
  v_operation text := COALESCE(NULLIF(btrim(p_operation), ''), 'spend');
  v_new_balance bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.actor_profile_id = v_actor
       OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE EXCEPTION 'This idempotency key belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents < 1
     OR p_amount_cents > 1000000000000
  THEN
    RAISE EXCEPTION 'The amount must be between 0.01 and 10,000,000,000.00.';
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The wallet was not found.' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    v_wallet.owner_profile_id = v_actor
    OR (v_role IN ('admin', 'accountant') AND v_wallet.company_id = v_company)
  ) THEN
    RAISE EXCEPTION 'You cannot spend from this wallet.' USING ERRCODE = '42501';
  END IF;
  IF v_wallet.status <> 'active' THEN
    RAISE EXCEPTION 'This wallet is not active.';
  END IF;
  IF v_wallet.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient wallet balance.' USING ERRCODE = '23514';
  END IF;

  IF v_wallet.company_id IS NOT NULL THEN
    PERFORM public.ensure_company_wallets(v_wallet.company_id, v_wallet.currency);
    SELECT * INTO v_revenue
    FROM public.wallets
    WHERE company_id = v_wallet.company_id
      AND kind = 'revenue'
      AND currency = v_wallet.currency
      AND owner_profile_id IS NULL
    FOR UPDATE;
  END IF;

  INSERT INTO public.wallet_transactions (
    company_id, type, idempotency_key, actor_profile_id, status, reason, metadata
  ) VALUES (
    v_wallet.company_id, 'spend', p_idempotency_key, v_actor, 'posted', v_reason,
    jsonb_build_object('walletId', v_wallet.id, 'amountCents', p_amount_cents,
                       'operation', v_operation)
  ) RETURNING id INTO v_txn_id;

  PERFORM public.wallet_apply_entry(
    v_txn_id, v_wallet.id, p_amount_cents, 0, v_wallet.currency, v_operation);
  IF v_revenue.id IS NOT NULL THEN
    PERFORM public.wallet_apply_entry(
      v_txn_id, v_revenue.id, 0, p_amount_cents, v_wallet.currency, v_operation);
  END IF;

  SELECT balance_cents INTO v_new_balance
  FROM public.wallets WHERE id = v_wallet.id;

  IF v_new_balance <= v_wallet.low_balance_threshold_cents
     AND v_wallet.company_id IS NOT NULL
  THEN
    INSERT INTO public.integration_outbox (
      company_id, integration_key, action_type, entity_table, entity_id, payload
    ) VALUES (
      v_wallet.company_id, 'wallet.balance_low', 'notify', 'wallets', v_wallet.id,
      jsonb_build_object(
        'walletId', v_wallet.id,
        'ownerProfileId', v_wallet.owner_profile_id,
        'balanceCents', v_new_balance,
        'thresholdCents', v_wallet.low_balance_threshold_cents,
        'currency', v_wallet.currency
      )
    );
  END IF;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_wallet.company_id, v_actor, 'wallet.spend', 'wallet_transactions', v_txn_id,
    jsonb_build_object('walletId', v_wallet.id, 'amountCents', p_amount_cents,
                       'operation', v_operation, 'balanceCents', v_new_balance,
                       'currency', v_wallet.currency)
  );

  RETURN public.wallet_transaction_json(v_txn_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND AND (
      v_existing.actor_profile_id = v_actor
      OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    ) THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- Parent -> child allowance transfer. Lock both wallets ordered by id
-- (deadlock-safe); the caller must be the active guardian of the destination
-- wallet's owner (or an admin), and must own the source wallet (or be admin).
CREATE OR REPLACE FUNCTION public.wallet_transfer(
  p_from_wallet uuid,
  p_to_wallet uuid,
  p_amount_cents bigint,
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
  v_from public.wallets%ROWTYPE;
  v_to public.wallets%ROWTYPE;
  v_existing public.wallet_transactions%ROWTYPE;
  v_txn_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.actor_profile_id = v_actor
       OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE EXCEPTION 'This idempotency key belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  IF p_from_wallet IS NULL OR p_to_wallet IS NULL OR p_from_wallet = p_to_wallet THEN
    RAISE EXCEPTION 'Choose two different wallets for the transfer.';
  END IF;
  IF p_amount_cents IS NULL OR p_amount_cents < 1
     OR p_amount_cents > 1000000000000
  THEN
    RAISE EXCEPTION 'The amount must be between 0.01 and 10,000,000,000.00.';
  END IF;

  -- Lock both rows in a stable order to avoid deadlocks between opposing transfers.
  PERFORM 1 FROM public.wallets
  WHERE id IN (p_from_wallet, p_to_wallet)
  ORDER BY id
  FOR UPDATE;

  SELECT * INTO v_from FROM public.wallets WHERE id = p_from_wallet;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The source wallet was not found.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_to FROM public.wallets WHERE id = p_to_wallet;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The destination wallet was not found.' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    v_role = 'admin'
    OR (
      v_from.owner_profile_id = v_actor
      AND v_to.owner_profile_id IS NOT NULL
      AND public.is_active_guardian_of(v_to.owner_profile_id)
    )
  ) THEN
    RAISE EXCEPTION
      'Only an admin or the destination owner''s active guardian may transfer this allowance.'
      USING ERRCODE = '42501';
  END IF;

  IF v_from.status <> 'active' OR v_to.status <> 'active' THEN
    RAISE EXCEPTION 'Both wallets must be active.';
  END IF;
  IF v_from.currency IS DISTINCT FROM v_to.currency THEN
    RAISE EXCEPTION 'Both wallets must use the same currency.';
  END IF;
  IF v_from.balance_cents < p_amount_cents THEN
    RAISE EXCEPTION 'Insufficient wallet balance.' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.wallet_transactions (
    company_id, type, idempotency_key, actor_profile_id, status, reason, metadata
  ) VALUES (
    COALESCE(v_from.company_id, v_to.company_id), 'transfer', p_idempotency_key,
    v_actor, 'posted', NULL,
    jsonb_build_object('fromWalletId', v_from.id, 'toWalletId', v_to.id,
                       'amountCents', p_amount_cents)
  ) RETURNING id INTO v_txn_id;

  PERFORM public.wallet_apply_entry(
    v_txn_id, v_from.id, p_amount_cents, 0, v_from.currency, 'transfer');
  PERFORM public.wallet_apply_entry(
    v_txn_id, v_to.id, 0, p_amount_cents, v_to.currency, 'transfer');

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    COALESCE(v_from.company_id, v_to.company_id), v_actor, 'wallet.transfer',
    'wallet_transactions', v_txn_id,
    jsonb_build_object('fromWalletId', v_from.id, 'toWalletId', v_to.id,
                       'amountCents', p_amount_cents, 'currency', v_from.currency)
  );

  RETURN public.wallet_transaction_json(v_txn_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND AND (
      v_existing.actor_profile_id = v_actor
      OR (v_role IN ('admin', 'accountant') AND v_existing.company_id = v_company)
    ) THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- Refund a prior transaction by posting a compensating reversal pair (never edits
-- the originals). Admin / accountant only. Refuses to overdraw a user wallet.
CREATE OR REPLACE FUNCTION public.wallet_refund(
  p_transaction_id uuid,
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
  v_original public.wallet_transactions%ROWTYPE;
  v_existing public.wallet_transactions%ROWTYPE;
  v_entry public.wallet_ledger_entries%ROWTYPE;
  v_txn_id uuid;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Only an admin or accountant may refund a transaction.'
      USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  SELECT * INTO v_existing
  FROM public.wallet_transactions
  WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.company_id = v_company
       OR v_existing.actor_profile_id = v_actor
    THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE EXCEPTION 'This idempotency key belongs to another actor.'
      USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_original
  FROM public.wallet_transactions
  WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The transaction was not found.' USING ERRCODE = '42501';
  END IF;
  IF v_original.company_id IS DISTINCT FROM v_company THEN
    RAISE EXCEPTION 'The transaction was not found in your organization.'
      USING ERRCODE = '42501';
  END IF;
  IF v_original.type NOT IN ('topup', 'spend', 'transfer') THEN
    RAISE EXCEPTION 'This transaction type cannot be refunded.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.wallet_transactions
    WHERE type = 'refund'
      AND metadata ->> 'refundOfTransactionId' = p_transaction_id::text
  ) THEN
    RAISE EXCEPTION 'This transaction has already been refunded.';
  END IF;

  -- Lock every wallet the original transaction touched, ordered by id.
  PERFORM 1 FROM public.wallets
  WHERE id IN (
    SELECT wallet_id FROM public.wallet_ledger_entries
    WHERE transaction_id = p_transaction_id
  )
  ORDER BY id
  FOR UPDATE;

  INSERT INTO public.wallet_transactions (
    company_id, type, idempotency_key, actor_profile_id, status, reason, metadata
  ) VALUES (
    v_original.company_id, 'refund', p_idempotency_key, v_actor, 'posted', NULL,
    jsonb_build_object('refundOfTransactionId', v_original.id,
                       'refundOfType', v_original.type)
  ) RETURNING id INTO v_txn_id;

  -- Reverse each original leg (swap debit and credit).
  FOR v_entry IN
    SELECT * FROM public.wallet_ledger_entries
    WHERE transaction_id = p_transaction_id
    ORDER BY created_at
  LOOP
    PERFORM public.wallet_apply_entry(
      v_txn_id, v_entry.wallet_id, v_entry.credit_cents, v_entry.debit_cents,
      v_entry.currency, 'refund');
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id IN (
      SELECT wallet_id FROM public.wallet_ledger_entries
      WHERE transaction_id = p_transaction_id
    )
    AND w.kind = 'user'
    AND w.balance_cents < 0
  ) THEN
    RAISE EXCEPTION 'The refund would overdraw a user wallet.'
      USING ERRCODE = '23514';
  END IF;

  UPDATE public.wallet_transactions
  SET status = 'reversed'
  WHERE id = v_original.id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_original.company_id, v_actor, 'wallet.refund', 'wallet_transactions', v_txn_id,
    jsonb_build_object('refundOfTransactionId', v_original.id,
                       'refundOfType', v_original.type)
  );

  RETURN public.wallet_transaction_json(v_txn_id);
EXCEPTION
  WHEN unique_violation THEN
    SELECT * INTO v_existing
    FROM public.wallet_transactions
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND AND (
      v_existing.company_id = v_company
      OR v_existing.actor_profile_id = v_actor
    ) THEN
      RETURN public.wallet_transaction_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Seed the company-level settlement + revenue wallets for existing companies.
-- ---------------------------------------------------------------------------
INSERT INTO public.wallets (company_id, owner_profile_id, kind, currency)
SELECT c.id, NULL, k.kind, 'TRY'
FROM public.companies c
CROSS JOIN (VALUES ('settlement'::text), ('revenue'::text)) AS k(kind)
ON CONFLICT (company_id, kind, currency) WHERE owner_profile_id IS NULL
DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. RLS. SELECT only; every mutation goes through the RPCs above.
--    A wallet is visible to its owner, an active guardian of the owner, and to a
--    same-company admin / accountant. Company settlement / revenue wallets have a
--    NULL owner, so only the admin / accountant branch can see them.
-- ---------------------------------------------------------------------------
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wallets_read ON public.wallets;
CREATE POLICY wallets_read
  ON public.wallets FOR SELECT TO authenticated
  USING (
    owner_profile_id = (SELECT auth.uid())
    OR (owner_profile_id IS NOT NULL
        AND public.is_active_guardian_of(owner_profile_id))
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
    )
  );

DROP POLICY IF EXISTS wallet_transactions_read ON public.wallet_transactions;
CREATE POLICY wallet_transactions_read
  ON public.wallet_transactions FOR SELECT TO authenticated
  USING (
    actor_profile_id = (SELECT auth.uid())
    OR (
      company_id = (SELECT public.current_user_company_id())
      AND (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
    )
    OR EXISTS (
      SELECT 1
      FROM public.wallet_ledger_entries e
      JOIN public.wallets w ON w.id = e.wallet_id
      WHERE e.transaction_id = wallet_transactions.id
        AND (
          w.owner_profile_id = (SELECT auth.uid())
          OR (w.owner_profile_id IS NOT NULL
              AND public.is_active_guardian_of(w.owner_profile_id))
        )
    )
  );

DROP POLICY IF EXISTS wallet_ledger_entries_read ON public.wallet_ledger_entries;
CREATE POLICY wallet_ledger_entries_read
  ON public.wallet_ledger_entries FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.wallets w
      WHERE w.id = wallet_ledger_entries.wallet_id
        AND (
          w.owner_profile_id = (SELECT auth.uid())
          OR (w.owner_profile_id IS NOT NULL
              AND public.is_active_guardian_of(w.owner_profile_id))
          OR (
            w.company_id = (SELECT public.current_user_company_id())
            AND (SELECT public.current_user_profile_role())
                IN ('admin', 'accountant')
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Grant hardening (mirrors migs 39 / 41). Strip write access and internal
--    helper EXECUTE from `authenticated`; expose only SELECT and the caller-facing
--    RPCs. anon gets nothing.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.wallets FROM anon;
REVOKE ALL ON public.wallet_transactions FROM anon;
REVOKE ALL ON public.wallet_ledger_entries FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.wallets FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_transactions FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_ledger_entries FROM authenticated;
GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT ON public.wallet_ledger_entries TO authenticated;

-- Internal helpers: never callable directly by clients (they bypass RLS).
REVOKE ALL ON FUNCTION public.wallet_json(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_transaction_json(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.wallet_apply_entry(uuid, uuid, bigint, bigint, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_company_wallets(uuid, text)
  FROM PUBLIC, anon, authenticated;

-- Caller-facing RPCs: authenticated only (never anon / public).
REVOKE ALL ON FUNCTION public.ensure_user_wallet(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_topup(uuid, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_spend(uuid, bigint, text, text, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.wallet_refund(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_topup(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_spend(uuid, bigint, text, text, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_transfer(uuid, uuid, bigint, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_refund(uuid, text) TO authenticated;

COMMENT ON TABLE public.wallets IS
  'Stored-value credit accounts (one per owner+currency, plus company settlement/revenue). Balance is a cache maintained by the wallet_* RPCs; writes are RPC-only, SELECT is RLS-limited to the owner, the owner''s active guardian and same-company admin/accountant.';
COMMENT ON TABLE public.wallet_transactions IS
  'Wallet business events (topup/spend/transfer/refund/offset). idempotency_key is unique so a retried RPC returns the original transaction.';
COMMENT ON TABLE public.wallet_ledger_entries IS
  'Immutable double-entry legs. credit raises a wallet balance, debit lowers it; each transaction nets to zero. Append-only via prevent_wallet_ledger_mutation.';
COMMENT ON FUNCTION public.wallet_spend(uuid, bigint, text, text, text) IS
  'Spend from a wallet: locks the row, rejects overdraft, debits the wallet and credits company revenue, emits a low-balance outbox event, idempotent on p_idempotency_key.';

-- ---------------------------------------------------------------------------
-- 7. Realtime publication (guarded / optional; matches migs 4 / 43).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'wallets', 'wallet_transactions', 'wallet_ledger_entries'
  ]
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
