-- Minor security hardening for the guest / vendor / guardianship + wallet
-- feature set (migrations 43-44). Four fixes from an adversarial review, all
-- delivered as CREATE OR REPLACE of the existing functions plus one backstop
-- index. No table shape changes; no app code changes required.
--
-- Each function body below is reproduced verbatim from its current definition
-- (wallet_* from migration 44; prevent_profile_privilege_escalation from its
-- latest definition in migration 25 -- NOT migration 10, which was long ago
-- superseded by the tenant-invitation / registration-activation redemption
-- branches). Only the lines each fix requires are changed; every existing
-- check, side-effect, signature, SECURITY DEFINER and SET search_path = '' is
-- preserved. CREATE OR REPLACE keeps the grants and the trigger binding intact.
--
--   FIX 1 (MEDIUM) wallet_refund double-refund TOCTOU: lock the original
--                  transaction FOR UPDATE before the already-refunded check, and
--                  add a partial unique index so a second refund can never post.
--   FIX 2 (MEDIUM) wallet_topup child self-funding: a child role topping up its
--                  own wallet now raises (children are funded via a guardian's
--                  wallet_transfer only).
--   FIX 3 (LOW)    wallet_transaction_json leaked the company settlement / revenue
--                  wallet balances to any caller; the wallets array now excludes
--                  those internal accounts.
--   FIX 4 (LOW)    is_minor / date_of_birth / age_band were self-writable; they
--                  now join role / company_id / office_id under the same authority
--                  gate, so only the super-admin / service-role / reasoned admin
--                  command path (used by addManagedChild) may change them.

BEGIN;

-- ---------------------------------------------------------------------------
-- FIX 3 (LOW). wallet_transaction_json: exclude company settlement / revenue
-- wallets (internal accounts) from the returned `wallets` array. This function
-- is SECURITY DEFINER and bypasses RLS, so before this change any caller of a
-- top-up / spend RPC received the settlement / revenue wallet id + balance via
-- the command payload. The caller's own user wallet (kind = 'user') is kept, so
-- every RPC still returns a sensible payload from the actor's perspective.
-- Reproduced verbatim from migration 44; the only change is the added
-- `AND w.kind NOT IN ('settlement', 'revenue')` filter on the wallets subquery.
-- ---------------------------------------------------------------------------
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
      -- Never expose the internal company settlement / revenue accounts.
      AND w.kind NOT IN ('settlement', 'revenue')
    ), '[]'::jsonb),
    'source', 'supabase'
  )
  FROM public.wallet_transactions t
  WHERE t.id = p_txn_id;
$$;

-- ---------------------------------------------------------------------------
-- FIX 2 (MEDIUM). wallet_topup: children hold only wallet:view in rbac, but the
-- RPC is EXECUTE-granted to `authenticated` and is the real boundary. A child
-- topping up its OWN wallet would self-fund and bypass the parental allowance.
-- Reproduced verbatim from migration 44; the only change is the added child-role
-- guard right after the wallet-ownership authorization check. Admins /
-- accountants / guardians topping up another wallet are unaffected (their
-- v_wallet.owner_profile_id <> v_actor).
-- ---------------------------------------------------------------------------
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
  -- A child cannot self-fund its own wallet: that would bypass the parental
  -- allowance boundary (children hold only wallet:view). Managed children are
  -- funded exclusively via a guardian's wallet_transfer, which re-enforces the
  -- guardianship. Admins / accountants / guardians topping up are unaffected.
  IF v_wallet.owner_profile_id = v_actor
     AND v_role IN ('child_owner', 'child_tenant', 'child_guest')
  THEN
    RAISE EXCEPTION
      'Child accounts are funded by a guardian allowance, not a direct top-up.'
      USING ERRCODE = '42501';
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

-- ---------------------------------------------------------------------------
-- FIX 1 (MEDIUM). wallet_refund double-refund TOCTOU: the original was read
-- WITHOUT a lock and the already-refunded EXISTS check ran before the wallets
-- were locked, so two concurrent refunds with different idempotency keys could
-- each post a full reversal (over-crediting the user, over-debiting company
-- revenue). Reproduced verbatim from migration 44; the only change is that the
-- original-transaction SELECT now takes `FOR UPDATE`, serializing concurrent
-- refunds of the same transaction so the second one sees the first refund in
-- the already-refunded check (which still runs AFTER that lock) and aborts.
-- ---------------------------------------------------------------------------
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

  -- Lock the original transaction row FIRST so two concurrent refunds with
  -- different idempotency keys serialize here; the already-refunded check below
  -- then reliably observes any refund committed by the winner.
  SELECT * INTO v_original
  FROM public.wallet_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
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

-- FIX 1 backstop: even if two refunds somehow race past the row lock, at most
-- one refund can exist per original transaction. The refund path stores the
-- original id at metadata->>'refundOfTransactionId' (see the INSERT above and
-- the already-refunded EXISTS check), so a partial unique index over that key,
-- restricted to refund rows, makes a duplicate refund a unique_violation.
CREATE UNIQUE INDEX IF NOT EXISTS ux_wallet_refund_once
  ON public.wallet_transactions ((metadata->>'refundOfTransactionId'))
  WHERE type = 'refund';

-- ---------------------------------------------------------------------------
-- FIX 4 (LOW). prevent_profile_privilege_escalation: the minor / consent columns
-- added in migration 43 (is_minor, date_of_birth, age_band) were self-writable,
-- so a profile flagged is_minor could clear the flag and defeat the book_activity
-- adult age-gate. Reproduced verbatim from its current definition (migration 25);
-- the only change is that those three columns now join role / company_id /
-- office_id in the v_sensitive_change test, subjecting a change to them to the
-- exact same authority gate. The super-admin / service-role branch
-- (is_platform_super_admin(), true for auth.role() = 'service_role') keeps
-- addManagedChild working; the reasoned admin-command and verified invitation /
-- activation redemption branches are all preserved unchanged.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_company UUID := public.current_user_company_id();
  v_actor_role TEXT := public.current_user_profile_role();
  v_sensitive_change BOOLEAN;
  v_office_company UUID;
  v_command_guard BOOLEAN := current_setting('app.authority_change_command', TRUE) = 'on';
  v_tenant_invitation_id UUID := NULLIF(current_setting('app.tenant_invitation_redeem_id', TRUE), '')::UUID;
  v_tenant_code_digest_hex TEXT := NULLIF(current_setting('app.tenant_invitation_code_digest', TRUE), '');
  v_registration_activation_id UUID := NULLIF(current_setting('app.registration_activation_redeem_id', TRUE), '')::UUID;
  v_registration_token_digest_hex TEXT := NULLIF(current_setting('app.registration_activation_token_digest', TRUE), '');
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'Profile identity is immutable.'; END IF;
  v_sensitive_change := NEW.role IS DISTINCT FROM OLD.role
    OR NEW.company_id IS DISTINCT FROM OLD.company_id
    OR NEW.office_id IS DISTINCT FROM OLD.office_id
    OR NEW.is_minor IS DISTINCT FROM OLD.is_minor
    OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
    OR NEW.age_band IS DISTINCT FROM OLD.age_band;
  IF NOT v_sensitive_change THEN RETURN NEW; END IF;

  IF NEW.office_id IS NOT NULL THEN
    SELECT o.company_id INTO v_office_company FROM public.offices o WHERE o.id = NEW.office_id;
    IF v_office_company IS NULL OR NEW.company_id IS DISTINCT FROM v_office_company THEN
      RAISE EXCEPTION 'Profile office must belong to the profile company.';
    END IF;
  END IF;

  IF public.is_platform_super_admin() THEN
    IF NOT v_command_guard THEN
      INSERT INTO public.audit_events (
        company_id, actor_profile_id, action, entity_table, entity_id, before_data, after_data
      ) VALUES (
        COALESCE(NEW.company_id, OLD.company_id), v_actor_id,
        'profile.platform_authority_provisioned', 'profiles', NEW.id,
        jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
        jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'reason', 'platform/service provisioning')
      );
    END IF;
  ELSIF v_command_guard
        AND v_actor_role = 'admin'
        AND v_actor_company IS NOT NULL
        AND OLD.company_id = v_actor_company
        AND NEW.company_id = v_actor_company
        AND NEW.id IS DISTINCT FROM v_actor_id
  THEN NULL;
  ELSIF OLD.company_id IS NULL
        AND NEW.company_id IS NOT NULL
        AND OLD.role = 'tenant'
        AND NEW.role = 'tenant'
        AND NEW.office_id IS NOT DISTINCT FROM OLD.office_id
        AND NEW.id = v_actor_id
        AND v_tenant_invitation_id IS NOT NULL
        AND v_tenant_code_digest_hex IS NOT NULL
        AND public.tenant_invitation_profile_binding_allowed(
          v_tenant_invitation_id, NEW.id, NEW.company_id, v_tenant_code_digest_hex
        )
  THEN
    INSERT INTO public.audit_events (
      company_id, actor_profile_id, action, entity_table, entity_id,
      before_data, after_data, idempotency_key
    ) VALUES (
      NEW.company_id, v_actor_id, 'tenant_invitation.profile_company_bound', 'profiles', NEW.id,
      jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
      jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'invitationId', v_tenant_invitation_id),
      'tenant-invite:profile-bind:' || v_tenant_invitation_id::TEXT
    );
  ELSIF OLD.company_id IS NULL
        AND NEW.company_id IS NOT NULL
        AND OLD.role = 'tenant'
        AND NEW.role IN ('owner', 'tenant', 'staff')
        AND NEW.office_id IS NOT DISTINCT FROM OLD.office_id
        AND NEW.id = v_actor_id
        AND v_registration_activation_id IS NOT NULL
        AND v_registration_token_digest_hex IS NOT NULL
        AND public.registration_activation_profile_binding_allowed(
          v_registration_activation_id, NEW.id, NEW.company_id, NEW.role,
          v_registration_token_digest_hex
        )
  THEN
    INSERT INTO public.audit_events (
      company_id, actor_profile_id, action, entity_table, entity_id,
      before_data, after_data, idempotency_key
    ) VALUES (
      NEW.company_id, v_actor_id, 'registration_activation.profile_bound', 'profiles', NEW.id,
      jsonb_build_object('role', OLD.role, 'companyId', OLD.company_id, 'officeId', OLD.office_id),
      jsonb_build_object('role', NEW.role, 'companyId', NEW.company_id, 'officeId', NEW.office_id, 'activationId', v_registration_activation_id),
      'registration-activation:profile-bind:' || v_registration_activation_id::TEXT
    );
  ELSE
    RAISE EXCEPTION 'Sensitive profile authority changes require an authorized admin command or verified invitation redemption.';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
