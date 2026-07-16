-- Manual received-payment posting, immutable journal and reversal workflow.
--
-- This migration intentionally does not connect a bank or card provider.
-- A finance operator records money reported as received into an unreconciled
-- clearing account. Only a later, separately approved reconciliation may
-- assert that an external statement agrees with the manual record.

BEGIN;

CREATE TABLE IF NOT EXISTS public.finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  unit_id UUID REFERENCES public.units(id) ON DELETE RESTRICT,
  resident_id UUID REFERENCES public.residents(id) ON DELETE RESTRICT,
  account_type TEXT NOT NULL CHECK (
    account_type IN ('resident_receivable', 'manual_payment_clearing')
  ),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 3 AND 180),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS finance_accounts_resident_receivable_unique
  ON public.finance_accounts(company_id, unit_id, resident_id, currency)
  WHERE account_type = 'resident_receivable';

CREATE UNIQUE INDEX IF NOT EXISTS finance_accounts_manual_clearing_unique
  ON public.finance_accounts(company_id, site_id, currency)
  WHERE account_type = 'manual_payment_clearing';

CREATE TABLE IF NOT EXISTS public.finance_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  journal_type TEXT NOT NULL CHECK (
    journal_type IN ('manual_payment', 'manual_payment_reversal')
  ),
  reference TEXT NOT NULL CHECK (char_length(btrim(reference)) BETWEEN 3 AND 100),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  posted_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reversal_of UUID REFERENCES public.finance_journal_entries(id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.finance_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  journal_entry_id UUID NOT NULL REFERENCES public.finance_journal_entries(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.finance_accounts(id) ON DELETE RESTRICT,
  debit_cents BIGINT NOT NULL DEFAULT 0 CHECK (debit_cents >= 0),
  credit_cents BIGINT NOT NULL DEFAULT 0 CHECK (credit_cents >= 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  memo TEXT NOT NULL CHECK (char_length(btrim(memo)) BETWEEN 3 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (debit_cents > 0 AND credit_cents = 0)
    OR (credit_cents > 0 AND debit_cents = 0)
  )
);

CREATE INDEX IF NOT EXISTS finance_journal_lines_journal_idx
  ON public.finance_journal_lines(journal_entry_id, created_at);
CREATE INDEX IF NOT EXISTS finance_journal_lines_account_idx
  ON public.finance_journal_lines(account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manual_payment_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE RESTRICT,
  owner_resident_id UUID NOT NULL REFERENCES public.residents(id) ON DELETE RESTRICT,
  ledger_entry_id UUID NOT NULL UNIQUE REFERENCES public.finance_ledger_entries(id) ON DELETE RESTRICT,
  payment_transaction_id UUID NOT NULL UNIQUE REFERENCES public.payment_transactions(id) ON DELETE RESTRICT,
  journal_entry_id UUID NOT NULL UNIQUE REFERENCES public.finance_journal_entries(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  received_at TIMESTAMPTZ NOT NULL,
  reference TEXT NOT NULL CHECK (char_length(btrim(reference)) BETWEEN 3 AND 100),
  method TEXT NOT NULL CHECK (
    method IN ('bank_transfer', 'cash', 'card_terminal', 'other')
  ),
  business_note TEXT NOT NULL CHECK (
    char_length(btrim(business_note)) BETWEEN 10 AND 1000
  ),
  reconciliation_status TEXT NOT NULL DEFAULT 'unreconciled' CHECK (
    reconciliation_status IN ('unreconciled', 'reconciled')
  ),
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('posted', 'reversed')),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  idempotency_key TEXT NOT NULL CHECK (
    char_length(btrim(idempotency_key)) BETWEEN 8 AND 200
  ),
  request_fingerprint TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reversed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reversed_at TIMESTAMPTZ,
  reversal_journal_entry_id UUID REFERENCES public.finance_journal_entries(id) ON DELETE RESTRICT,
  reversal_ledger_entry_id UUID REFERENCES public.finance_ledger_entries(id) ON DELETE RESTRICT,
  UNIQUE (company_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS manual_payment_receipts_reference_unique
  ON public.manual_payment_receipts(company_id, method, lower(reference));
CREATE INDEX IF NOT EXISTS manual_payment_receipts_workspace_idx
  ON public.manual_payment_receipts(company_id, site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS manual_payment_receipts_owner_history_idx
  ON public.manual_payment_receipts(unit_id, owner_resident_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.manual_payment_reversals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE RESTRICT,
  payment_id UUID NOT NULL UNIQUE REFERENCES public.manual_payment_receipts(id) ON DELETE RESTRICT,
  journal_entry_id UUID NOT NULL UNIQUE REFERENCES public.finance_journal_entries(id) ON DELETE RESTRICT,
  ledger_entry_id UUID NOT NULL UNIQUE REFERENCES public.finance_ledger_entries(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 1000),
  idempotency_key TEXT NOT NULL CHECK (
    char_length(btrim(idempotency_key)) BETWEEN 8 AND 200
  ),
  request_fingerprint TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key)
);

CREATE OR REPLACE FUNCTION public.prevent_finance_journal_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'Posted journal records are immutable; create a reversal instead.';
END;
$$;

DROP TRIGGER IF EXISTS prevent_finance_journal_entry_mutation
  ON public.finance_journal_entries;
CREATE TRIGGER prevent_finance_journal_entry_mutation
  BEFORE UPDATE OR DELETE ON public.finance_journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_journal_mutation();

DROP TRIGGER IF EXISTS prevent_finance_journal_line_mutation
  ON public.finance_journal_lines;
CREATE TRIGGER prevent_finance_journal_line_mutation
  BEFORE UPDATE OR DELETE ON public.finance_journal_lines
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_journal_mutation();

DROP TRIGGER IF EXISTS prevent_manual_payment_reversal_mutation
  ON public.manual_payment_reversals;
CREATE TRIGGER prevent_manual_payment_reversal_mutation
  BEFORE UPDATE OR DELETE ON public.manual_payment_reversals
  FOR EACH ROW EXECUTE FUNCTION public.prevent_finance_journal_mutation();

CREATE OR REPLACE FUNCTION public.protect_manual_payment_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Manual payment receipts cannot be deleted; create a reversal instead.';
  END IF;

  IF current_setting('app.manual_payment_command', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'Manual payment receipts may only change through the reversal command.';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.site_id IS DISTINCT FROM OLD.site_id
     OR NEW.unit_id IS DISTINCT FROM OLD.unit_id
     OR NEW.owner_resident_id IS DISTINCT FROM OLD.owner_resident_id
     OR NEW.ledger_entry_id IS DISTINCT FROM OLD.ledger_entry_id
     OR NEW.payment_transaction_id IS DISTINCT FROM OLD.payment_transaction_id
     OR NEW.journal_entry_id IS DISTINCT FROM OLD.journal_entry_id
     OR NEW.amount_cents IS DISTINCT FROM OLD.amount_cents
     OR NEW.currency IS DISTINCT FROM OLD.currency
     OR NEW.received_at IS DISTINCT FROM OLD.received_at
     OR NEW.reference IS DISTINCT FROM OLD.reference
     OR NEW.method IS DISTINCT FROM OLD.method
     OR NEW.business_note IS DISTINCT FROM OLD.business_note
     OR NEW.reconciliation_status IS DISTINCT FROM OLD.reconciliation_status
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Posted manual payment facts are immutable.';
  END IF;

  IF OLD.status <> 'posted'
     OR NEW.status <> 'reversed'
     OR NEW.version <> OLD.version + 1
     OR NEW.reversed_by IS NULL
     OR NEW.reversed_at IS NULL
     OR NEW.reversal_journal_entry_id IS NULL
     OR NEW.reversal_ledger_entry_id IS NULL
  THEN
    RAISE EXCEPTION 'Invalid manual payment reversal projection.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_manual_payment_receipt
  ON public.manual_payment_receipts;
CREATE TRIGGER protect_manual_payment_receipt
  BEFORE UPDATE OR DELETE ON public.manual_payment_receipts
  FOR EACH ROW EXECUTE FUNCTION public.protect_manual_payment_receipt();

CREATE OR REPLACE FUNCTION public.protect_manual_ledger_and_transaction_rows()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_manual BOOLEAN;
BEGIN
  IF TG_TABLE_NAME = 'finance_ledger_entries' THEN
    v_is_manual := COALESCE(OLD.metadata->>'source', '') IN (
      'manual_payment', 'manual_payment_reversal'
    );
  ELSE
    v_is_manual := OLD.provider = 'manual';
  END IF;

  IF v_is_manual THEN
    RAISE EXCEPTION 'Manual finance source rows are immutable; create a reversal instead.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_manual_finance_ledger_rows
  ON public.finance_ledger_entries;
CREATE TRIGGER protect_manual_finance_ledger_rows
  BEFORE UPDATE OR DELETE ON public.finance_ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.protect_manual_ledger_and_transaction_rows();

DROP TRIGGER IF EXISTS protect_manual_payment_transaction_rows
  ON public.payment_transactions;
CREATE TRIGGER protect_manual_payment_transaction_rows
  BEFORE UPDATE OR DELETE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.protect_manual_ledger_and_transaction_rows();

CREATE OR REPLACE FUNCTION public.ensure_finance_journal_balanced()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_journal_id UUID := COALESCE(NEW.journal_entry_id, OLD.journal_entry_id);
  v_unbalanced INTEGER;
BEGIN
  SELECT count(*) INTO v_unbalanced
  FROM (
    SELECT l.currency
    FROM public.finance_journal_lines l
    WHERE l.journal_entry_id = v_journal_id
    GROUP BY l.currency
    HAVING sum(l.debit_cents) <> sum(l.credit_cents)
       OR sum(l.debit_cents) <= 0
  ) unbalanced;

  IF v_unbalanced > 0 OR NOT EXISTS (
    SELECT 1
    FROM public.finance_journal_lines l
    WHERE l.journal_entry_id = v_journal_id
  ) THEN
    RAISE EXCEPTION 'Journal entry % is not balanced.', v_journal_id;
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS ensure_finance_journal_balanced
  ON public.finance_journal_lines;
CREATE CONSTRAINT TRIGGER ensure_finance_journal_balanced
  AFTER INSERT ON public.finance_journal_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION public.ensure_finance_journal_balanced();

CREATE OR REPLACE FUNCTION public.manual_payment_json(
  p_payment_id UUID,
  p_replayed BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'id', p.id,
    'unitId', p.unit_id,
    'unitNo', u.unit_no,
    'ownerResidentId', p.owner_resident_id,
    'ownerName', r.full_name,
    'amountCents', p.amount_cents,
    'currency', p.currency,
    'receivedAt', p.received_at,
    'reference', p.reference,
    'method', p.method,
    'businessNote', p.business_note,
    'reconciliationStatus', p.reconciliation_status,
    'status', p.status,
    'version', p.version,
    'createdAt', p.created_at,
    'reversedAt', p.reversed_at,
    'reversalReason', reversal.reason,
    'replayed', p_replayed,
    'source', 'supabase'
  )
  FROM public.manual_payment_receipts p
  JOIN public.units u ON u.id = p.unit_id AND u.company_id = p.company_id
  JOIN public.residents r
    ON r.id = p.owner_resident_id AND r.company_id = p.company_id
  LEFT JOIN public.manual_payment_reversals reversal
    ON reversal.payment_id = p.id
  WHERE p.id = p_payment_id;
$$;

CREATE OR REPLACE FUNCTION public.post_manual_payment_command(
  p_unit_id UUID,
  p_owner_resident_id UUID,
  p_amount_cents BIGINT,
  p_currency TEXT,
  p_received_at TIMESTAMPTZ,
  p_reference TEXT,
  p_method TEXT,
  p_business_note TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_site_id UUID;
  v_unit_no TEXT;
  v_owner_name TEXT;
  v_company_currency TEXT;
  v_currency TEXT := upper(btrim(p_currency));
  v_reference TEXT := btrim(p_reference);
  v_note TEXT := btrim(p_business_note);
  v_fingerprint TEXT;
  v_existing public.manual_payment_receipts%ROWTYPE;
  v_receivable_account_id UUID;
  v_clearing_account_id UUID;
  v_journal_entry_id UUID;
  v_ledger_entry_id UUID;
  v_transaction_id UUID;
  v_payment_id UUID := gen_random_uuid();
BEGIN
  IF v_actor_id IS NULL OR v_company_id IS NULL
     OR v_actor_role NOT IN ('admin', 'accountant')
  THEN
    RAISE EXCEPTION 'Only an authenticated organization admin or accountant may post a manual payment.'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents < 1 OR p_amount_cents > 1000000000000 THEN
    RAISE EXCEPTION 'Payment amount must be between 0.01 and 10,000,000,000.00.';
  END IF;
  IF v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Currency must be a three-letter ISO code.';
  END IF;
  IF p_received_at IS NULL
     OR p_received_at > NOW() + INTERVAL '5 minutes'
     OR p_received_at < NOW() - INTERVAL '10 years'
  THEN
    RAISE EXCEPTION 'Received date is outside the allowed range.';
  END IF;
  IF char_length(v_reference) NOT BETWEEN 3 AND 100 THEN
    RAISE EXCEPTION 'Reference must contain 3 to 100 characters.';
  END IF;
  IF p_method NOT IN ('bank_transfer', 'cash', 'card_terminal', 'other') THEN
    RAISE EXCEPTION 'Unsupported manual payment method.';
  END IF;
  IF char_length(v_note) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Business note must contain 10 to 1000 characters.';
  END IF;
  IF char_length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain 8 to 200 characters.';
  END IF;

  SELECT u.site_id, u.unit_no, r.full_name, upper(btrim(c.currency))
    INTO v_site_id, v_unit_no, v_owner_name, v_company_currency
  FROM public.units u
  JOIN public.companies c
    ON c.id = u.company_id
  JOIN public.unit_residents ur
    ON ur.company_id = u.company_id
   AND ur.unit_id = u.id
   AND ur.relationship = 'owner'
   AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
   AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
  JOIN public.residents r
    ON r.company_id = u.company_id
   AND r.id = ur.resident_id
   AND r.status = 'active'
  WHERE u.id = p_unit_id
    AND u.company_id = v_company_id
    AND r.id = p_owner_resident_id
  LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'The selected unit and owner account are outside your organization or no longer active.'
      USING ERRCODE = '42501';
  END IF;
  IF v_company_currency !~ '^[A-Z]{3}$'
     OR v_currency IS DISTINCT FROM v_company_currency
  THEN
    RAISE EXCEPTION 'Payment currency must match the selected account currency.';
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(concat_ws(
    chr(31), p_unit_id::TEXT, p_owner_resident_id::TEXT,
    p_amount_cents::TEXT, v_currency, p_received_at::TEXT,
    lower(v_reference), p_method, v_note
  ), 'UTF8'), 'sha256'), 'hex');

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::TEXT || ':' || btrim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
  FROM public.manual_payment_receipts p
  WHERE p.company_id = v_company_id
    AND p.idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    IF v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint THEN
      RAISE EXCEPTION 'Idempotency key was already used with different payment facts.'
        USING ERRCODE = '23505';
    END IF;
    RETURN public.manual_payment_json(v_existing.id, TRUE);
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.manual_payment_receipts p
    WHERE p.company_id = v_company_id
      AND p.method = p_method
      AND lower(p.reference) = lower(v_reference)
  ) THEN
    RAISE EXCEPTION 'This manual payment reference is already recorded.'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.finance_accounts (
    company_id, site_id, unit_id, resident_id, account_type, currency, name
  ) VALUES (
    v_company_id, v_site_id, p_unit_id, p_owner_resident_id,
    'resident_receivable', v_currency,
    left(v_unit_no || ' / ' || v_owner_name || ' receivable', 180)
  )
  ON CONFLICT (company_id, unit_id, resident_id, currency)
    WHERE account_type = 'resident_receivable'
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_receivable_account_id;

  INSERT INTO public.finance_accounts (
    company_id, site_id, account_type, currency, name
  ) VALUES (
    v_company_id, v_site_id, 'manual_payment_clearing', v_currency,
    'Manual payment clearing / ' || v_currency
  )
  ON CONFLICT (company_id, site_id, currency)
    WHERE account_type = 'manual_payment_clearing'
  DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_clearing_account_id;

  INSERT INTO public.finance_journal_entries (
    company_id, site_id, journal_type, reference, idempotency_key,
    posted_at, created_by, metadata
  ) VALUES (
    v_company_id, v_site_id, 'manual_payment', v_reference,
    'manual-payment-journal:' || btrim(p_idempotency_key),
    p_received_at, v_actor_id,
    jsonb_build_object(
      'source', 'manual_payment',
      'method', p_method,
      'reconciliationStatus', 'unreconciled'
    )
  ) RETURNING id INTO v_journal_entry_id;

  INSERT INTO public.finance_ledger_entries (
    company_id, site_id, unit_id, resident_id, entry_type,
    paid_at, status, amount_cents, currency, description,
    posted_at, idempotency_key, metadata
  ) VALUES (
    v_company_id, v_site_id, p_unit_id, p_owner_resident_id, 'payment',
    p_received_at, 'paid', p_amount_cents, v_currency, v_note,
    p_received_at, 'manual-payment:' || btrim(p_idempotency_key),
    jsonb_build_object(
      'source', 'manual_payment',
      'direction', 'receipt',
      'manualPaymentId', v_payment_id,
      'reference', v_reference,
      'method', p_method,
      'reconciliationStatus', 'unreconciled',
      'journalEntryId', v_journal_entry_id
    )
  ) RETURNING id INTO v_ledger_entry_id;

  INSERT INTO public.payment_transactions (
    company_id, ledger_entry_id, provider, provider_reference, status,
    amount_cents, currency, paid_at, raw_payload
  ) VALUES (
    v_company_id, v_ledger_entry_id, 'manual', v_reference, 'pending',
    p_amount_cents, v_currency, p_received_at,
    jsonb_build_object(
      'source', 'operator_entry',
      'method', p_method,
      'reconciliationStatus', 'unreconciled'
    )
  ) RETURNING id INTO v_transaction_id;

  INSERT INTO public.manual_payment_receipts (
    id,
    company_id, site_id, unit_id, owner_resident_id,
    ledger_entry_id, payment_transaction_id, journal_entry_id,
    amount_cents, currency, received_at, reference, method, business_note,
    idempotency_key, request_fingerprint, created_by
  ) VALUES (
    v_payment_id,
    v_company_id, v_site_id, p_unit_id, p_owner_resident_id,
    v_ledger_entry_id, v_transaction_id, v_journal_entry_id,
    p_amount_cents, v_currency, p_received_at, v_reference, p_method, v_note,
    btrim(p_idempotency_key), v_fingerprint, v_actor_id
  );

  INSERT INTO public.finance_journal_lines (
    company_id, journal_entry_id, account_id, debit_cents, credit_cents,
    currency, memo
  ) VALUES
    (
      v_company_id, v_journal_entry_id, v_clearing_account_id,
      p_amount_cents, 0, v_currency, 'Manual receipt awaiting reconciliation'
    ),
    (
      v_company_id, v_journal_entry_id, v_receivable_account_id,
      0, p_amount_cents, v_currency, 'Owner receivable credited by manual receipt'
    );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, v_actor_id, 'manual_payment.posted',
    'manual_payment_receipts', v_payment_id,
    jsonb_build_object(
      'unitId', p_unit_id,
      'ownerResidentId', p_owner_resident_id,
      'amountCents', p_amount_cents,
      'currency', v_currency,
      'receivedAt', p_received_at,
      'reference', v_reference,
      'method', p_method,
      'reconciliationStatus', 'unreconciled',
      'version', 1
    )
  );

  RETURN public.manual_payment_json(v_payment_id, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_manual_payment_command(
  p_payment_id UUID,
  p_expected_version INTEGER,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_actor_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_payment public.manual_payment_receipts%ROWTYPE;
  v_original_journal public.finance_journal_entries%ROWTYPE;
  v_existing public.manual_payment_reversals%ROWTYPE;
  v_reason TEXT := btrim(p_reason);
  v_fingerprint TEXT;
  v_receivable_account_id UUID;
  v_clearing_account_id UUID;
  v_journal_entry_id UUID;
  v_ledger_entry_id UUID;
  v_reversal_id UUID;
  v_updated_rows INTEGER := 0;
BEGIN
  IF v_actor_id IS NULL OR v_company_id IS NULL
     OR v_actor_role NOT IN ('admin', 'accountant')
  THEN
    RAISE EXCEPTION 'Only an authenticated organization admin or accountant may reverse a manual payment.'
      USING ERRCODE = '42501';
  END IF;
  IF p_expected_version IS NULL OR p_expected_version < 1 THEN
    RAISE EXCEPTION 'A positive expected version is required.';
  END IF;
  IF char_length(v_reason) NOT BETWEEN 10 AND 1000 THEN
    RAISE EXCEPTION 'Reversal reason must contain 10 to 1000 characters.';
  END IF;
  IF char_length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain 8 to 200 characters.';
  END IF;

  v_fingerprint := encode(extensions.digest(convert_to(concat_ws(
    chr(31), p_payment_id::TEXT, p_expected_version::TEXT, v_reason
  ), 'UTF8'), 'sha256'), 'hex');

  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_company_id::TEXT || ':' || btrim(p_idempotency_key), 0)
  );

  SELECT * INTO v_existing
  FROM public.manual_payment_reversals r
  WHERE r.company_id = v_company_id
    AND r.idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    IF v_existing.payment_id IS DISTINCT FROM p_payment_id
       OR v_existing.request_fingerprint IS DISTINCT FROM v_fingerprint
    THEN
      RAISE EXCEPTION 'Idempotency key was already used for a different reversal.'
        USING ERRCODE = '23505';
    END IF;
    RETURN public.manual_payment_json(v_existing.payment_id, TRUE);
  END IF;

  SELECT * INTO v_payment
  FROM public.manual_payment_receipts p
  WHERE p.id = p_payment_id
    AND p.company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Manual payment was not found in your organization.'
      USING ERRCODE = '42501';
  END IF;
  IF v_payment.version <> p_expected_version OR v_payment.status <> 'posted' THEN
    RAISE EXCEPTION 'Manual payment reversal conflict; refresh the record and retry.'
      USING ERRCODE = '40001';
  END IF;

  SELECT * INTO v_original_journal
  FROM public.finance_journal_entries j
  WHERE j.id = v_payment.journal_entry_id
    AND j.company_id = v_company_id;

  SELECT l.account_id INTO v_clearing_account_id
  FROM public.finance_journal_lines l
  JOIN public.finance_accounts a ON a.id = l.account_id
  WHERE l.journal_entry_id = v_payment.journal_entry_id
    AND a.account_type = 'manual_payment_clearing';

  SELECT l.account_id INTO v_receivable_account_id
  FROM public.finance_journal_lines l
  JOIN public.finance_accounts a ON a.id = l.account_id
  WHERE l.journal_entry_id = v_payment.journal_entry_id
    AND a.account_type = 'resident_receivable';

  IF v_original_journal.id IS NULL
     OR v_clearing_account_id IS NULL
     OR v_receivable_account_id IS NULL
  THEN
    RAISE EXCEPTION 'Original journal evidence is incomplete; reversal was stopped.';
  END IF;

  INSERT INTO public.finance_journal_entries (
    company_id, site_id, journal_type, reference, idempotency_key,
    posted_at, created_by, reversal_of, metadata
  ) VALUES (
    v_company_id, v_payment.site_id, 'manual_payment_reversal',
    left('REV-' || v_payment.reference, 100),
    'manual-payment-reversal-journal:' || btrim(p_idempotency_key),
    NOW(), v_actor_id, v_payment.journal_entry_id,
    jsonb_build_object(
      'source', 'manual_payment_reversal',
      'manualPaymentId', v_payment.id,
      'reason', v_reason
    )
  ) RETURNING id INTO v_journal_entry_id;

  INSERT INTO public.finance_ledger_entries (
    company_id, site_id, unit_id, resident_id, entry_type,
    paid_at, status, amount_cents, currency, description,
    posted_at, reversal_of, idempotency_key, metadata
  ) VALUES (
    v_company_id, v_payment.site_id, v_payment.unit_id,
    v_payment.owner_resident_id, 'adjustment', NOW(), 'paid',
    v_payment.amount_cents, v_payment.currency, v_reason,
    NOW(), v_payment.ledger_entry_id,
    'manual-payment-reversal:' || btrim(p_idempotency_key),
    jsonb_build_object(
      'source', 'manual_payment_reversal',
      'direction', 'reversal',
      'reversesManualPaymentId', v_payment.id,
      'reference', v_payment.reference,
      'journalEntryId', v_journal_entry_id
    )
  ) RETURNING id INTO v_ledger_entry_id;

  INSERT INTO public.finance_journal_lines (
    company_id, journal_entry_id, account_id, debit_cents, credit_cents,
    currency, memo
  ) VALUES
    (
      v_company_id, v_journal_entry_id, v_receivable_account_id,
      v_payment.amount_cents, 0, v_payment.currency,
      'Restore owner receivable after manual payment reversal'
    ),
    (
      v_company_id, v_journal_entry_id, v_clearing_account_id,
      0, v_payment.amount_cents, v_payment.currency,
      'Reverse unreconciled manual receipt clearing'
    );

  INSERT INTO public.manual_payment_reversals (
    company_id, site_id, payment_id, journal_entry_id, ledger_entry_id,
    reason, idempotency_key, request_fingerprint, created_by
  ) VALUES (
    v_company_id, v_payment.site_id, v_payment.id, v_journal_entry_id,
    v_ledger_entry_id, v_reason, btrim(p_idempotency_key),
    v_fingerprint, v_actor_id
  ) RETURNING id INTO v_reversal_id;

  PERFORM set_config('app.manual_payment_command', 'on', TRUE);
  UPDATE public.manual_payment_receipts
  SET status = 'reversed',
      version = version + 1,
      reversed_by = v_actor_id,
      reversed_at = NOW(),
      reversal_journal_entry_id = v_journal_entry_id,
      reversal_ledger_entry_id = v_ledger_entry_id
  WHERE id = v_payment.id
    AND version = p_expected_version
    AND status = 'posted';
  GET DIAGNOSTICS v_updated_rows = ROW_COUNT;
  PERFORM set_config('app.manual_payment_command', 'off', TRUE);

  IF v_updated_rows <> 1 THEN
    RAISE EXCEPTION 'Manual payment reversal conflict; refresh the record and retry.'
      USING ERRCODE = '40001';
  END IF;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    before_data, after_data
  ) VALUES (
    v_company_id, v_actor_id, 'manual_payment.reversed',
    'manual_payment_receipts', v_payment.id,
    jsonb_build_object('status', 'posted', 'version', p_expected_version),
    jsonb_build_object(
      'status', 'reversed',
      'version', p_expected_version + 1,
      'reason', v_reason,
      'reversalId', v_reversal_id,
      'reversalLedgerEntryId', v_ledger_entry_id
    )
  );

  RETURN public.manual_payment_json(v_payment.id, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.manual_payment_workspace(
  p_limit INTEGER DEFAULT 50
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 100);
BEGIN
  IF v_company_id IS NULL OR v_role NOT IN ('admin', 'manager', 'accountant') THEN
    RAISE EXCEPTION 'The current role cannot view the manual payment workspace.'
      USING ERRCODE = '42501';
  END IF;

  RETURN jsonb_build_object(
    'contractVersion', 'manual-payments.v1',
    'source', 'supabase',
    'generatedAt', NOW(),
    'truth', 'manual_unreconciled_no_provider_confirmation',
    'capabilities', jsonb_build_object(
      'canPost', v_role IN ('admin', 'accountant'),
      'canReverse', v_role IN ('admin', 'accountant'),
      'readOnly', v_role = 'manager'
    ),
    'accounts', COALESCE((
      SELECT jsonb_agg(account_record ORDER BY account_record->>'unitNo')
      FROM (
        SELECT jsonb_build_object(
          'id', u.id::TEXT || ':' || r.id::TEXT,
          'unitId', u.id,
          'unitNo', u.unit_no,
          'ownerResidentId', r.id,
          'ownerName', r.full_name,
          'currency', c.currency
        ) AS account_record
        FROM public.units u
        JOIN public.companies c ON c.id = u.company_id
        JOIN public.unit_residents ur
          ON ur.company_id = u.company_id
         AND ur.unit_id = u.id
         AND ur.relationship = 'owner'
         AND (ur.start_date IS NULL OR ur.start_date <= CURRENT_DATE)
         AND (ur.end_date IS NULL OR ur.end_date >= CURRENT_DATE)
        JOIN public.residents r
          ON r.company_id = u.company_id
         AND r.id = ur.resident_id
         AND r.status = 'active'
        WHERE u.company_id = v_company_id
          AND (
            v_role <> 'manager'
            OR public.current_user_can_manage_site(u.site_id)
          )
        ORDER BY u.unit_no, r.full_name
        LIMIT 500
      ) accounts
    ), '[]'::JSONB),
    'payments', COALESCE((
      SELECT jsonb_agg(public.manual_payment_json(payment_row.id, FALSE)
                       ORDER BY payment_row.created_at DESC)
      FROM (
        SELECT p.id, p.created_at
        FROM public.manual_payment_receipts p
        WHERE p.company_id = v_company_id
          AND (
            v_role <> 'manager'
            OR public.current_user_can_manage_site(p.site_id)
          )
        ORDER BY p.created_at DESC
        LIMIT v_limit
      ) payment_row
    ), '[]'::JSONB)
  );
END;
$$;

ALTER TABLE public.finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manual_payment_reversals ENABLE ROW LEVEL SECURITY;

CREATE POLICY finance_accounts_internal_read
  ON public.finance_accounts FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.current_user_company_id())
    AND (
      (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
      OR (
        (SELECT public.current_user_profile_role()) = 'manager'
        AND public.current_user_can_manage_site(site_id)
      )
    )
  );

CREATE POLICY finance_journal_entries_internal_read
  ON public.finance_journal_entries FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.current_user_company_id())
    AND (
      (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
      OR (
        (SELECT public.current_user_profile_role()) = 'manager'
        AND public.current_user_can_manage_site(site_id)
      )
    )
  );

CREATE POLICY finance_journal_lines_internal_read
  ON public.finance_journal_lines FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.current_user_company_id())
    AND EXISTS (
      SELECT 1
      FROM public.finance_journal_entries j
      WHERE j.id = finance_journal_lines.journal_entry_id
        AND j.company_id = finance_journal_lines.company_id
        AND (
          (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
          OR (
            (SELECT public.current_user_profile_role()) = 'manager'
            AND public.current_user_can_manage_site(j.site_id)
          )
        )
    )
  );

CREATE POLICY manual_payment_receipts_internal_read
  ON public.manual_payment_receipts FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.current_user_company_id())
    AND (
      (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
      OR (
        (SELECT public.current_user_profile_role()) = 'manager'
        AND public.current_user_can_manage_site(site_id)
      )
    )
  );

CREATE POLICY manual_payment_reversals_internal_read
  ON public.manual_payment_reversals FOR SELECT TO authenticated
  USING (
    company_id = (SELECT public.current_user_company_id())
    AND (
      (SELECT public.current_user_profile_role()) IN ('admin', 'accountant')
      OR (
        (SELECT public.current_user_profile_role()) = 'manager'
        AND public.current_user_can_manage_site(site_id)
      )
    )
  );

-- Remove every legacy direct finance-write policy. Finance operators use the
-- transaction-safe commands above; managers stay read-only.
DO $$
DECLARE
  v_table_name TEXT;
  v_policy RECORD;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'finance_ledger_entries', 'payment_transactions'
  ]
  LOOP
    FOR v_policy IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = v_table_name
        AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    LOOP
      EXECUTE format(
        'DROP POLICY IF EXISTS %I ON public.%I',
        v_policy.policyname, v_table_name
      );
    END LOOP;
  END LOOP;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON public.finance_ledger_entries
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.finance_accounts
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.finance_journal_entries
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.finance_journal_lines
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.manual_payment_receipts
  FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.manual_payment_reversals
  FROM authenticated;

GRANT SELECT ON public.finance_accounts TO authenticated;
GRANT SELECT ON public.finance_journal_entries TO authenticated;
GRANT SELECT ON public.finance_journal_lines TO authenticated;
GRANT SELECT ON public.manual_payment_receipts TO authenticated;
GRANT SELECT ON public.manual_payment_reversals TO authenticated;

REVOKE ALL ON FUNCTION public.manual_payment_json(UUID, BOOLEAN)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.post_manual_payment_command(
  UUID, UUID, BIGINT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reverse_manual_payment_command(
  UUID, INTEGER, TEXT, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manual_payment_workspace(INTEGER)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.post_manual_payment_command(
  UUID, UUID, BIGINT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reverse_manual_payment_command(
  UUID, INTEGER, TEXT, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manual_payment_workspace(INTEGER)
  TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'manual_payment_receipts'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payment_receipts;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'manual_payment_reversals'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.manual_payment_reversals;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.post_manual_payment_command(
  UUID, UUID, BIGINT, TEXT, TIMESTAMPTZ, TEXT, TEXT, TEXT, TEXT
) IS 'Posts a human-entered, explicitly unreconciled payment into a balanced clearing/receivable journal; admin/accountant only and idempotent.';

COMMENT ON FUNCTION public.reverse_manual_payment_command(
  UUID, INTEGER, TEXT, TEXT
) IS 'Creates immutable counter-journal and owner-statement evidence; never edits or deletes the original posted payment facts.';

COMMIT;
