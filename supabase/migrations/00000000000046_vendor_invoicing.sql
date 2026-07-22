-- Phase-5 of the guest / vendor / guardianship role expansion: service-provider
-- (vendor) self-service invoicing.
--
-- A linked service provider issues an invoice for completed work from inside the
-- portal. The invoice is "internal now, e-Fatura ready later": it posts as a real
-- service_provider_invoices row the accountant subsystem already understands, and
-- carries an external_ref column reserved for the Turkish e-Fatura ETTN (null
-- until an e-Fatura provider drops in behind the same RPC).
--
-- CRITICAL invariant kept intact: the accountant offset engine (mig 39/44) reads
-- service_provider_invoices.status (open/partially_offset/paid/void). This
-- migration NEVER writes that column from the vendor flow. The vendor lifecycle is
-- a SEPARATE submission_status (draft/submitted/in_review/approved/declined). A new
-- invoice posts with status='open' (so the existing offset views/RPC keep working)
-- and submission_status='submitted'.
--
-- Security model (mirrors migs 39 / 41 / 44):
--   * A vendor row is mapped to a service_provider user via vendors.profile_id.
--   * All vendor-side mutation goes through SECURITY DEFINER, search_path='' RPCs.
--     Direct INSERT/UPDATE/DELETE on the invoice + line tables is REVOKEd from
--     `authenticated`; only SELECT is granted and further constrained by RLS.
--   * RLS ADDS a vendor read policy (a vendor sees only its own invoices); the
--     mig-39 admin/accountant/manager accounting read policy is left untouched.
--   * Internal helper functions have EXECUTE revoked from `authenticated`; only the
--     caller-facing RPCs are granted. anon gets nothing.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Map a vendor row to a service_provider user + extend the invoice header.
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS profile_id uuid REFERENCES public.profiles(id);

CREATE INDEX IF NOT EXISTS idx_vendors_profile ON public.vendors(profile_id);

ALTER TABLE public.service_provider_invoices
  ADD COLUMN IF NOT EXISTS submission_status text NOT NULL DEFAULT 'draft'
    CHECK (submission_status IN ('draft', 'submitted', 'in_review', 'approved', 'declined')),
  ADD COLUMN IF NOT EXISTS issued_by uuid,
  ADD COLUMN IF NOT EXISTS service_order_id uuid,
  ADD COLUMN IF NOT EXISTS subtotal_cents bigint,
  ADD COLUMN IF NOT EXISTS tax_cents bigint,
  ADD COLUMN IF NOT EXISTS total_cents bigint,
  -- e-Fatura ETTN, null now (internal invoice); populated when an e-Fatura
  -- provider is wired in behind submit_vendor_invoice.
  ADD COLUMN IF NOT EXISTS external_ref text,
  -- Idempotency guard for submit_vendor_invoice (a retried submit returns the
  -- original invoice instead of duplicating).
  ADD COLUMN IF NOT EXISTS submission_idempotency_key text;

-- Vendor natural key (idempotent re-submit) + fast lookups the task requires.
CREATE UNIQUE INDEX IF NOT EXISTS ux_service_provider_invoices_vendor_no
  ON public.service_provider_invoices(vendor_id, invoice_no)
  WHERE vendor_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_service_provider_invoices_submission_key
  ON public.service_provider_invoices(submission_idempotency_key)
  WHERE submission_idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_service_provider_invoices_vendor
  ON public.service_provider_invoices(vendor_id);
CREATE INDEX IF NOT EXISTS idx_service_provider_invoices_issued_by
  ON public.service_provider_invoices(issued_by);

-- ---------------------------------------------------------------------------
-- 2. Invoice line items.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_provider_invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES public.service_provider_invoices(id) ON DELETE CASCADE,
  description text,
  quantity numeric NOT NULL DEFAULT 1,
  unit_price_cents bigint NOT NULL DEFAULT 0,
  -- Percentage rate (0-100), e.g. 20 for Turkish KDV; the line tax is
  -- round(line_total_cents * tax_rate / 100), computed in submit_vendor_invoice.
  tax_rate numeric NOT NULL DEFAULT 0,
  -- Net line total (quantity * unit_price_cents); tax is aggregated on the header.
  line_total_cents bigint NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_provider_invoice_lines_invoice
  ON public.service_provider_invoice_lines(invoice_id);

-- ---------------------------------------------------------------------------
-- 3. Internal JSON projection (EXECUTE revoked from authenticated at the end).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.vendor_invoice_json(p_invoice_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'invoice', jsonb_build_object(
      'id', i.id,
      'vendorId', i.vendor_id,
      'invoiceNo', i.invoice_no,
      'submissionStatus', i.submission_status,
      'status', i.status,
      'subtotalCents', i.subtotal_cents,
      'taxCents', i.tax_cents,
      'totalCents', i.total_cents,
      'amountCents', i.amount_cents,
      'offsetCents', i.offset_cents,
      'currency', i.currency,
      'serviceOrderId', i.service_order_id,
      'externalRef', i.external_ref,
      'issuedAt', i.issued_at,
      'dueAt', i.due_at
    ),
    'lines', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', l.id,
        'description', l.description,
        'quantity', l.quantity,
        'unitPriceCents', l.unit_price_cents,
        'taxRate', l.tax_rate,
        'lineTotalCents', l.line_total_cents
      ) ORDER BY l.created_at)
      FROM public.service_provider_invoice_lines l
      WHERE l.invoice_id = i.id
    ), '[]'::jsonb),
    'source', 'supabase'
  )
  FROM public.service_provider_invoices i
  WHERE i.id = p_invoice_id;
$$;

-- ---------------------------------------------------------------------------
-- 4. Caller-facing RPCs (GRANT EXECUTE to authenticated at the end).
-- ---------------------------------------------------------------------------

-- Submit an invoice for the caller's linked vendor. Computes subtotal / tax /
-- total from the line array, posts one service_provider_invoices row with
-- status='open' (accountant-owned) + submission_status='submitted' (vendor-owned)
-- plus its line items, and is idempotent on the request key AND the vendor's
-- (vendor_id, invoice_no) natural key.
CREATE OR REPLACE FUNCTION public.submit_vendor_invoice(
  p_invoice_no text,
  p_lines jsonb,
  p_service_order_id uuid,
  p_due_at timestamptz,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor uuid := (SELECT auth.uid());
  v_vendor public.vendors%ROWTYPE;
  v_existing public.service_provider_invoices%ROWTYPE;
  v_invoice_id uuid;
  v_invoice_no text := btrim(p_invoice_no);
  v_currency text := 'TRY';
  v_subtotal bigint := 0;
  v_tax bigint := 0;
  v_total bigint := 0;
  v_line jsonb;
  v_qty numeric;
  v_unit bigint;
  v_rate numeric;
  v_net bigint;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.' USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;
  IF v_invoice_no IS NULL OR v_invoice_no = '' THEN
    RAISE EXCEPTION 'An invoice number is required.';
  END IF;
  IF length(v_invoice_no) > 120 THEN
    RAISE EXCEPTION 'The invoice number is too long.';
  END IF;

  -- Resolve the caller's vendor. A service_provider account with no linked
  -- vendor row cannot issue invoices.
  SELECT * INTO v_vendor
  FROM public.vendors
  WHERE profile_id = v_actor
  ORDER BY created_at, id
  LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No vendor is linked to your account.' USING ERRCODE = '42501';
  END IF;

  -- Idempotent replay: the same request key already produced an invoice.
  SELECT * INTO v_existing
  FROM public.service_provider_invoices
  WHERE submission_idempotency_key = p_idempotency_key
    AND vendor_id = v_vendor.id;
  IF FOUND THEN
    RETURN public.vendor_invoice_json(v_existing.id);
  END IF;

  -- Idempotent by natural key: this vendor already submitted this invoice number.
  SELECT * INTO v_existing
  FROM public.service_provider_invoices
  WHERE vendor_id = v_vendor.id AND invoice_no = v_invoice_no;
  IF FOUND THEN
    RETURN public.vendor_invoice_json(v_existing.id);
  END IF;

  IF p_lines IS NULL
     OR jsonb_typeof(p_lines) <> 'array'
     OR jsonb_array_length(p_lines) = 0
  THEN
    RAISE EXCEPTION 'At least one invoice line is required.';
  END IF;
  IF jsonb_array_length(p_lines) > 200 THEN
    RAISE EXCEPTION 'An invoice may not exceed 200 lines.';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty := COALESCE(NULLIF(v_line ->> 'quantity', '')::numeric, 1);
    v_unit := COALESCE(NULLIF(v_line ->> 'unitPriceCents', '')::bigint, 0);
    v_rate := COALESCE(NULLIF(v_line ->> 'taxRate', '')::numeric, 0);
    IF v_qty <= 0 OR v_qty > 1000000 THEN
      RAISE EXCEPTION 'A line quantity is out of range.';
    END IF;
    IF v_unit < 0 OR v_unit > 1000000000000 THEN
      RAISE EXCEPTION 'A line unit price is out of range.';
    END IF;
    IF v_rate < 0 OR v_rate > 100 THEN
      RAISE EXCEPTION 'A line tax rate must be between 0 and 100.';
    END IF;
    v_net := round(v_qty * v_unit);
    v_subtotal := v_subtotal + v_net;
    v_tax := v_tax + round(v_net * v_rate / 100);
  END LOOP;

  v_total := v_subtotal + v_tax;
  IF v_subtotal < 1 THEN
    RAISE EXCEPTION 'The invoice total must be greater than zero.';
  END IF;
  IF v_total > 1000000000000 THEN
    RAISE EXCEPTION 'The invoice total is out of range.';
  END IF;

  INSERT INTO public.service_provider_invoices (
    company_id, vendor_id, invoice_no, amount_cents, offset_cents, currency,
    status, submission_status, issued_by, service_order_id,
    subtotal_cents, tax_cents, total_cents, external_ref,
    submission_idempotency_key, issued_at, due_at
  ) VALUES (
    v_vendor.company_id, v_vendor.id, v_invoice_no, v_total, 0, v_currency,
    'open', 'submitted', v_actor, p_service_order_id,
    v_subtotal, v_tax, v_total, NULL,
    p_idempotency_key, CURRENT_DATE,
    CASE WHEN p_due_at IS NULL THEN NULL ELSE p_due_at::date END
  ) RETURNING id INTO v_invoice_id;

  INSERT INTO public.service_provider_invoice_lines (
    invoice_id, description, quantity, unit_price_cents, tax_rate, line_total_cents
  )
  SELECT
    v_invoice_id,
    NULLIF(btrim(elem ->> 'description'), ''),
    COALESCE(NULLIF(elem ->> 'quantity', '')::numeric, 1),
    COALESCE(NULLIF(elem ->> 'unitPriceCents', '')::bigint, 0),
    COALESCE(NULLIF(elem ->> 'taxRate', '')::numeric, 0),
    round(
      COALESCE(NULLIF(elem ->> 'quantity', '')::numeric, 1)
      * COALESCE(NULLIF(elem ->> 'unitPriceCents', '')::bigint, 0)
    )
  FROM jsonb_array_elements(p_lines) AS elem;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_vendor.company_id, v_actor, 'vendor_invoice.submitted',
    'service_provider_invoices', v_invoice_id,
    jsonb_build_object(
      'vendorId', v_vendor.id,
      'invoiceNo', v_invoice_no,
      'subtotalCents', v_subtotal,
      'taxCents', v_tax,
      'totalCents', v_total,
      'currency', v_currency,
      'serviceOrderId', p_service_order_id
    )
  );

  RETURN public.vendor_invoice_json(v_invoice_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent duplicate (same key or same vendor invoice number): the winning
    -- insert already posted it, so just return it.
    SELECT * INTO v_existing
    FROM public.service_provider_invoices
    WHERE vendor_id = v_vendor.id
      AND (submission_idempotency_key = p_idempotency_key
           OR invoice_no = v_invoice_no)
    ORDER BY created_at DESC
    LIMIT 1;
    IF FOUND THEN
      RETURN public.vendor_invoice_json(v_existing.id);
    END IF;
    RAISE;
END;
$$;

-- Review a submitted vendor invoice. Admin / accountant only. Moves the
-- vendor-owned submission_status to approved / declined / in_review; NEVER touches
-- the accountant-owned status column. Idempotent (re-applying the same decision is
-- a no-op returning current state).
CREATE OR REPLACE FUNCTION public.review_vendor_invoice(
  p_invoice_id uuid,
  p_decision text,
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
  v_invoice public.service_provider_invoices%ROWTYPE;
  v_decision text := lower(btrim(COALESCE(p_decision, '')));
  v_new text;
  v_reason text := NULLIF(btrim(p_reason), '');
BEGIN
  IF v_actor IS NULL OR v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Only an admin or accountant may review a vendor invoice.'
      USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'An idempotency key is required.';
  END IF;

  v_new := CASE v_decision
    WHEN 'approve' THEN 'approved'
    WHEN 'approved' THEN 'approved'
    WHEN 'decline' THEN 'declined'
    WHEN 'declined' THEN 'declined'
    WHEN 'review' THEN 'in_review'
    WHEN 'in_review' THEN 'in_review'
    ELSE NULL
  END;
  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Choose a decision: approve, decline or review.';
  END IF;

  SELECT * INTO v_invoice
  FROM public.service_provider_invoices
  WHERE id = p_invoice_id AND company_id = v_company
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The invoice was not found in your organization.'
      USING ERRCODE = '42501';
  END IF;

  IF v_invoice.submission_status = v_new THEN
    RETURN public.vendor_invoice_json(v_invoice.id);
  END IF;

  UPDATE public.service_provider_invoices
  SET submission_status = v_new
  WHERE id = v_invoice.id;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id, after_data
  ) VALUES (
    v_company, v_actor, 'vendor_invoice.reviewed',
    'service_provider_invoices', v_invoice.id,
    jsonb_build_object(
      'from', v_invoice.submission_status,
      'to', v_new,
      'reason', v_reason,
      'idempotencyKey', p_idempotency_key
    )
  );

  RETURN public.vendor_invoice_json(v_invoice.id);
END;
$$;

-- ---------------------------------------------------------------------------
-- 5. Optional / guarded seed: link one vendor per company to a service_provider
--    profile so a demo vendor account can issue invoices. No-op where no
--    service_provider profile exists (e.g. the base seed), so it is fully safe.
-- ---------------------------------------------------------------------------
WITH sp AS (
  SELECT DISTINCT ON (p.company_id) p.company_id, p.id AS profile_id
  FROM public.profiles p
  WHERE p.role = 'service_provider' AND p.company_id IS NOT NULL
  ORDER BY p.company_id, p.created_at NULLS LAST, p.id
),
target AS (
  SELECT DISTINCT ON (v.company_id) v.id AS vendor_id, v.company_id
  FROM public.vendors v
  WHERE v.profile_id IS NULL
  ORDER BY v.company_id, v.created_at NULLS LAST, v.id
)
UPDATE public.vendors v
SET profile_id = sp.profile_id
FROM target t
JOIN sp ON sp.company_id = t.company_id
WHERE v.id = t.vendor_id;

-- ---------------------------------------------------------------------------
-- 6. RLS. SELECT only; every mutation goes through the RPCs above.
--    service_provider_invoices: ADD a vendor read policy (its own invoices). The
--      mig-39 accounting read policy for admin/accountant/manager is untouched.
--    service_provider_invoice_lines: readable by the parent invoice's vendor and
--      by same-company admin/accountant/manager.
-- ---------------------------------------------------------------------------
ALTER TABLE public.service_provider_invoice_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_provider_invoices_vendor_read
  ON public.service_provider_invoices;
CREATE POLICY service_provider_invoices_vendor_read
  ON public.service_provider_invoices FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendors v
      WHERE v.id = service_provider_invoices.vendor_id
        AND v.profile_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS service_provider_invoice_lines_read
  ON public.service_provider_invoice_lines;
CREATE POLICY service_provider_invoice_lines_read
  ON public.service_provider_invoice_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.service_provider_invoices i
      WHERE i.id = service_provider_invoice_lines.invoice_id
        AND (
          (
            i.company_id = (SELECT public.current_user_company_id())
            AND (SELECT public.current_user_profile_role())
                IN ('admin', 'accountant', 'manager')
          )
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = i.vendor_id AND v.profile_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Grant hardening (mirrors migs 39 / 41 / 44). Strip write access from
--    `authenticated`; expose only SELECT + the caller-facing RPCs. anon gets
--    nothing; internal helpers are never client-callable.
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.service_provider_invoice_lines FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.service_provider_invoices FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.service_provider_invoice_lines FROM authenticated;
GRANT SELECT ON public.service_provider_invoices TO authenticated;
GRANT SELECT ON public.service_provider_invoice_lines TO authenticated;

REVOKE ALL ON FUNCTION public.vendor_invoice_json(uuid)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.submit_vendor_invoice(text, jsonb, uuid, timestamptz, text)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_vendor_invoice(uuid, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_vendor_invoice(text, jsonb, uuid, timestamptz, text)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_vendor_invoice(uuid, text, text, text)
  TO authenticated;

COMMENT ON COLUMN public.service_provider_invoices.submission_status IS
  'Vendor-side lifecycle (draft/submitted/in_review/approved/declined). SEPARATE from status, which is the accountant offset lifecycle (open/partially_offset/paid/void) and must never be written by the vendor flow.';
COMMENT ON COLUMN public.service_provider_invoices.external_ref IS
  'Reserved for the Turkish e-Fatura ETTN; null while the invoice is internal-only.';
COMMENT ON FUNCTION public.submit_vendor_invoice(text, jsonb, uuid, timestamptz, text) IS
  'Post an invoice for the caller''s linked vendor: totals the lines, writes status=open + submission_status=submitted plus line items, idempotent on the request key and the vendor (vendor_id, invoice_no).';
COMMENT ON FUNCTION public.review_vendor_invoice(uuid, text, text, text) IS
  'Admin/accountant review of a vendor invoice: advances submission_status only (never the accountant-owned status column); idempotent.';

-- ---------------------------------------------------------------------------
-- 8. Realtime publication (guarded / optional; matches migs 4 / 39 / 43 / 44 / 45).
--    service_provider_invoices is already published (mig 39); add the lines.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_table_name text;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY['service_provider_invoice_lines']
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
