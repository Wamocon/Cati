-- Accountant finance subsystem for 1Cati.
--
-- Adds the accounting-role workspace the client asked for: service-provider
-- invoices, credit balances (from providers and for every role), bank
-- statements, and a manual invoice/credit offset with a full audit record.
--
-- Security model (mirrors the manual-payment posting migration):
--   * Read is limited to admin, accountant and manager of the same company.
--     Owner, tenant and staff never see these tables.
--   * Direct INSERT/UPDATE/DELETE are revoked from authenticated. The only
--     mutation is the SECURITY DEFINER offset command, so posted offset facts
--     cannot be tampered with from the client.
--   * Costs by block and by role are DERIVED in the repository from these
--     invoices and from finance_ledger_entries; there is no redundant costs
--     table.

BEGIN;

CREATE TABLE IF NOT EXISTS public.service_provider_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  block TEXT,
  invoice_no TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  offset_cents BIGINT NOT NULL DEFAULT 0
    CHECK (offset_cents >= 0 AND offset_cents <= amount_cents),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EUR')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'partially_offset', 'paid', 'void')),
  issued_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, invoice_no)
);

CREATE TABLE IF NOT EXISTS public.credit_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subject_type TEXT NOT NULL CHECK (
    subject_type IN (
      'service_provider', 'owner', 'tenant', 'manager',
      'accountant', 'staff', 'admin', 'company'
    )
  ),
  subject_ref TEXT NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  block TEXT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EUR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  bank_name TEXT NOT NULL,
  reference TEXT NOT NULL,
  opening_balance_cents BIGINT NOT NULL DEFAULT 0,
  closing_balance_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EUR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bank_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  booked_at DATE NOT NULL,
  description TEXT NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_credit_offsets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL
    REFERENCES public.service_provider_invoices(id) ON DELETE RESTRICT,
  credit_balance_id UUID NOT NULL
    REFERENCES public.credit_balances(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency IN ('TRY', 'EUR')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_provider_invoices_company_status
  ON public.service_provider_invoices(company_id, status);
CREATE INDEX IF NOT EXISTS idx_service_provider_invoices_block
  ON public.service_provider_invoices(company_id, block);
CREATE INDEX IF NOT EXISTS idx_credit_balances_company_subject
  ON public.credit_balances(company_id, subject_type);
CREATE INDEX IF NOT EXISTS idx_credit_balances_block
  ON public.credit_balances(company_id, block);
CREATE INDEX IF NOT EXISTS idx_bank_statements_company_date
  ON public.bank_statements(company_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_statement_lines_statement
  ON public.bank_statement_lines(statement_id, booked_at);
CREATE INDEX IF NOT EXISTS idx_invoice_credit_offsets_invoice
  ON public.invoice_credit_offsets(invoice_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoice_credit_offsets_credit
  ON public.invoice_credit_offsets(credit_balance_id, created_at DESC);

DROP TRIGGER IF EXISTS set_service_provider_invoices_updated_at
  ON public.service_provider_invoices;
CREATE TRIGGER set_service_provider_invoices_updated_at
  BEFORE UPDATE ON public.service_provider_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_credit_balances_updated_at ON public.credit_balances;
CREATE TRIGGER set_credit_balances_updated_at
  BEFORE UPDATE ON public.credit_balances
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Read-only JSON projection of a single applied offset with its refreshed
-- invoice and credit balance. Used as the command return payload.
CREATE OR REPLACE FUNCTION public.accountant_finance_offset_json(p_offset_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'offset', jsonb_build_object(
      'id', o.id,
      'invoiceId', o.invoice_id,
      'invoiceNo', i.invoice_no,
      'creditBalanceId', o.credit_balance_id,
      'amountCents', o.amount_cents,
      'currency', o.currency,
      'reason', o.reason,
      'createdAt', o.created_at
    ),
    'invoice', jsonb_build_object(
      'id', i.id,
      'vendorId', i.vendor_id,
      'providerName', v.name,
      'block', i.block,
      'invoiceNo', i.invoice_no,
      'amountCents', i.amount_cents,
      'offsetCents', i.offset_cents,
      'openCents', i.amount_cents - i.offset_cents,
      'currency', i.currency,
      'status', i.status,
      'issuedAt', i.issued_at,
      'dueAt', i.due_at,
      'notes', i.notes
    ),
    'creditBalance', jsonb_build_object(
      'id', c.id,
      'subjectType', c.subject_type,
      'subjectRef', c.subject_ref,
      'vendorId', c.vendor_id,
      'block', c.block,
      'amountCents', c.amount_cents,
      'currency', c.currency
    ),
    'source', 'supabase'
  )
  FROM public.invoice_credit_offsets o
  JOIN public.service_provider_invoices i ON i.id = o.invoice_id
  LEFT JOIN public.vendors v ON v.id = i.vendor_id
  JOIN public.credit_balances c ON c.id = o.credit_balance_id
  WHERE o.id = p_offset_id;
$$;

-- Manually offset an open invoice against a matching credit balance. Records
-- the offset, decrements the credit balance, and advances the invoice status
-- (open -> partially_offset -> paid) in a single transaction. Admin/accountant
-- of the invoice company only.
CREATE OR REPLACE FUNCTION public.apply_invoice_credit_offset(
  p_invoice_id UUID,
  p_credit_id UUID,
  p_amount_cents BIGINT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_role TEXT := public.current_user_profile_role();
  v_company_id UUID := public.current_user_company_id();
  v_invoice public.service_provider_invoices%ROWTYPE;
  v_credit public.credit_balances%ROWTYPE;
  v_open BIGINT;
  v_max BIGINT;
  v_offset_id UUID;
  v_new_status TEXT;
  v_reason TEXT := NULLIF(btrim(p_reason), '');
BEGIN
  IF v_actor_id IS NULL OR v_company_id IS NULL
     OR v_role NOT IN ('admin', 'accountant')
  THEN
    RAISE EXCEPTION
      'Only an authenticated organization admin or accountant may offset an invoice.'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount_cents IS NULL
     OR p_amount_cents < 1
     OR p_amount_cents > 1000000000000
  THEN
    RAISE EXCEPTION 'Offset amount must be between 0.01 and 10,000,000,000.00.';
  END IF;

  SELECT * INTO v_invoice
  FROM public.service_provider_invoices
  WHERE id = p_invoice_id AND company_id = v_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The invoice was not found in your organization.'
      USING ERRCODE = '42501';
  END IF;
  IF v_invoice.status NOT IN ('open', 'partially_offset') THEN
    RAISE EXCEPTION 'This invoice can no longer be offset.';
  END IF;

  SELECT * INTO v_credit
  FROM public.credit_balances
  WHERE id = p_credit_id AND company_id = v_company_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The credit balance was not found in your organization.'
      USING ERRCODE = '42501';
  END IF;
  IF v_credit.currency IS DISTINCT FROM v_invoice.currency THEN
    RAISE EXCEPTION 'The credit balance currency must match the invoice currency.';
  END IF;

  v_open := v_invoice.amount_cents - v_invoice.offset_cents;
  v_max := LEAST(v_open, v_credit.amount_cents);
  IF p_amount_cents > v_max THEN
    RAISE EXCEPTION
      'Offset amount exceeds the open invoice amount or the available credit balance.';
  END IF;

  INSERT INTO public.invoice_credit_offsets (
    company_id, invoice_id, credit_balance_id,
    amount_cents, currency, created_by, reason
  ) VALUES (
    v_company_id, v_invoice.id, v_credit.id,
    p_amount_cents, v_invoice.currency, v_actor_id, v_reason
  ) RETURNING id INTO v_offset_id;

  UPDATE public.credit_balances
  SET amount_cents = amount_cents - p_amount_cents
  WHERE id = v_credit.id;

  v_new_status := CASE
    WHEN v_invoice.offset_cents + p_amount_cents >= v_invoice.amount_cents
      THEN 'paid'
    ELSE 'partially_offset'
  END;

  UPDATE public.service_provider_invoices
  SET offset_cents = offset_cents + p_amount_cents,
      status = v_new_status
  WHERE id = v_invoice.id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company_id, v_actor_id, 'accountant_finance.offset_applied',
    'invoice_credit_offsets', v_offset_id,
    jsonb_build_object(
      'invoiceId', v_invoice.id,
      'invoiceNo', v_invoice.invoice_no,
      'creditBalanceId', v_credit.id,
      'amountCents', p_amount_cents,
      'currency', v_invoice.currency,
      'invoiceStatus', v_new_status
    )
  );

  RETURN public.accountant_finance_offset_json(v_offset_id);
END;
$$;

ALTER TABLE public.service_provider_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statement_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_credit_offsets ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'service_provider_invoices',
    'credit_balances',
    'bank_statements',
    'bank_statement_lines',
    'invoice_credit_offsets'
  ]
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON public.%I',
      v_table_name || '_accounting_read', v_table_name
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
         company_id = (SELECT public.current_user_company_id())
         AND (SELECT public.current_user_profile_role())
             IN (''admin'', ''accountant'', ''manager'')
       )',
      v_table_name || '_accounting_read', v_table_name
    );

    EXECUTE format(
      'REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated',
      v_table_name
    );
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', v_table_name);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.accountant_finance_offset_json(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_invoice_credit_offset(
  UUID, UUID, BIGINT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_invoice_credit_offset(
  UUID, UUID, BIGINT, TEXT
) TO authenticated;

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RETURN;
  END IF;
  FOREACH v_table_name IN ARRAY ARRAY[
    'service_provider_invoices',
    'credit_balances',
    'invoice_credit_offsets'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table_name
    ) THEN
      EXECUTE format(
        'ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',
        v_table_name
      );
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION public.apply_invoice_credit_offset(UUID, UUID, BIGINT, TEXT)
  IS 'Offsets an open service-provider invoice against a matching credit balance; records the offset, decrements the credit, advances invoice status; admin/accountant only.';

COMMIT;
