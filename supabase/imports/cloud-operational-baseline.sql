-- Cloud operational baseline for the New Level Premium ERP.
-- Scope: Ataberk Estate / NLP-AVS only. Safe to re-run.

DELETE FROM public.client_action_requests a
USING public.companies c
WHERE a.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND a.metadata->>'source' = 'cloud-operational-baseline';

DELETE FROM public.service_ticket_events e
USING public.service_tickets t, public.companies c
WHERE e.ticket_id = t.id
  AND t.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND t.ticket_no LIKE 'NLP-OPS-%';

DELETE FROM public.payment_transactions pt
USING public.companies c
WHERE pt.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND pt.provider_reference LIKE 'nlp-phase6-%';

DELETE FROM public.finance_ledger_entries fle
USING public.companies c
WHERE fle.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND fle.idempotency_key LIKE 'nlp-phase6-%';

DELETE FROM public.reservations r
USING public.companies c
WHERE r.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND r.guest_name IN ('Irina Volkov', 'Aylin Kaya', 'Anna Kuznetsova');

DELETE FROM public.service_tickets t
USING public.companies c
WHERE t.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND t.ticket_no LIKE 'NLP-OPS-%';

DELETE FROM public.unit_residents ur
USING public.residents r, public.companies c
WHERE ur.resident_id = r.id
  AND r.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND r.email LIKE 'nlp-%@ataberkestate.internal';

DELETE FROM public.residents r
USING public.companies c
WHERE r.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND r.email LIKE 'nlp-%@ataberkestate.internal';

DELETE FROM public.staff_members sm
USING public.companies c
WHERE sm.company_id = c.id
  AND c.slug = 'ataberk-estate'
  AND sm.phone IN (
    '+90 532 110 1001',
    '+90 532 110 1002',
    '+90 532 110 1003',
    '+90 532 110 1004',
    '+90 532 110 1005',
    '+90 532 110 1006',
    '+90 532 110 1007',
    '+90 532 110 1008',
    '+90 532 110 1009',
    '+90 532 110 1010',
    '+90 532 110 1011',
    '+90 532 110 1012',
    '+90 532 110 1013',
    '+90 532 110 1014'
  );

WITH company AS (
  SELECT id
  FROM public.companies
  WHERE slug = 'ataberk-estate'
  LIMIT 1
)
INSERT INTO public.staff_members (
  company_id,
  name,
  role,
  team,
  phone,
  language,
  active_tasks,
  approval_limit_cents,
  access_scope,
  status
)
SELECT
  company.id,
  staff.name,
  staff.role,
  staff.team,
  staff.phone,
  staff.language,
  staff.active_tasks,
  staff.approval_limit_cents,
  staff.access_scope,
  staff.status
FROM company
CROSS JOIN (
  VALUES
    ('Selin Yonetici', 'manager', 'Site Yonetimi', '+90 532 110 1001', 'tr', 9, 15000000::BIGINT, 'all_site', 'active'),
    ('Can Operasyon', 'admin', 'Operasyon', '+90 532 110 1002', 'en', 7, 10000000::BIGINT, 'all_site', 'active'),
    ('Merve Muhasebe', 'accountant', 'Finans', '+90 532 110 1003', 'tr', 14, 7500000::BIGINT, 'finance_only', 'active'),
    ('Deniz Tahsilat', 'accountant', 'Tahsilat', '+90 532 110 1004', 'tr', 16, 3500000::BIGINT, 'finance_only', 'active'),
    ('Daria Destek', 'staff', 'Sakin Destek', '+90 532 110 1005', 'ru', 18, 500000::BIGINT, 'resident_only', 'training'),
    ('Oksana Misafir', 'staff', 'Misafir Iliskileri', '+90 532 110 1006', 'ru', 12, 500000::BIGINT, 'resident_only', 'active'),
    ('Ahmet Teknik', 'staff', 'Teknik', '+90 532 110 1007', 'tr', 11, 1200000::BIGINT, 'field_only', 'active'),
    ('Eren Elektrik', 'staff', 'Teknik', '+90 532 110 1008', 'tr', 8, 1500000::BIGINT, 'field_only', 'active'),
    ('Burak Havuz Spa', 'staff', 'Havuz ve Spa', '+90 532 110 1009', 'tr', 10, 1500000::BIGINT, 'field_only', 'active'),
    ('Zeynep Kat Hizmetleri', 'staff', 'Temizlik', '+90 532 110 1010', 'tr', 13, 900000::BIGINT, 'field_only', 'active'),
    ('Fatma Temizlik', 'staff', 'Temizlik', '+90 532 110 1011', 'tr', 9, 600000::BIGINT, 'field_only', 'active'),
    ('Selim Guvenlik', 'staff', 'Guvenlik', '+90 532 110 1012', 'tr', 6, 0::BIGINT, 'field_only', 'active'),
    ('Murat Gece Guvenlik', 'staff', 'Guvenlik', '+90 532 110 1013', 'tr', 5, 0::BIGINT, 'field_only', 'active'),
    ('Yusuf Vale Bariyer', 'staff', 'Otopark ve Bariyer', '+90 532 110 1014', 'tr', 7, 0::BIGINT, 'field_only', 'active')
) AS staff(name, role, team, phone, language, active_tasks, approval_limit_cents, access_scope, status);

WITH company AS (
  SELECT id
  FROM public.companies
  WHERE slug = 'ataberk-estate'
  LIMIT 1
)
INSERT INTO public.role_coverage (
  company_id,
  role_label,
  users_count,
  can_approve_finance,
  can_restrict_access,
  can_manage_users,
  can_export_data
)
SELECT
  company.id,
  role_matrix.role_label,
  role_matrix.users_count,
  role_matrix.can_approve_finance,
  role_matrix.can_restrict_access,
  role_matrix.can_manage_users,
  role_matrix.can_export_data
FROM company
CROSS JOIN (
  VALUES
    ('Yonetim', 2, TRUE, TRUE, TRUE, TRUE),
    ('Sorumlu', 4, FALSE, TRUE, FALSE, TRUE),
    ('Muhasebe', 4, TRUE, FALSE, FALSE, TRUE),
    ('Personel', 24, FALSE, FALSE, FALSE, FALSE),
    ('Malik', 511, FALSE, FALSE, FALSE, TRUE),
    ('Kiraci', 184, FALSE, FALSE, FALSE, FALSE)
) AS role_matrix(role_label, users_count, can_approve_finance, can_restrict_access, can_manage_users, can_export_data)
ON CONFLICT (company_id, role_label) DO UPDATE SET
  users_count = EXCLUDED.users_count,
  can_approve_finance = EXCLUDED.can_approve_finance,
  can_restrict_access = EXCLUDED.can_restrict_access,
  can_manage_users = EXCLUDED.can_manage_users,
  can_export_data = EXCLUDED.can_export_data,
  updated_at = NOW();

WITH company AS (
  SELECT id
  FROM public.companies
  WHERE slug = 'ataberk-estate'
  LIMIT 1
)
INSERT INTO public.residents (
  company_id,
  full_name,
  phone,
  email,
  preferred_language,
  preferred_channel,
  identity_status,
  risk_score,
  status
)
SELECT
  company.id,
  resident.full_name,
  resident.phone,
  resident.email,
  resident.preferred_language,
  resident.preferred_channel,
  resident.identity_status,
  resident.risk_score,
  resident.status
FROM company
CROSS JOIN (
  VALUES
    ('Irina Volkov', '+90 532 210 2001', 'nlp-a001-owner@ataberkestate.internal', 'ru', 'whatsapp', 'verified', 12, 'active'),
    ('Mehmet Yilmaz', '+90 532 210 2002', 'nlp-a019-owner@ataberkestate.internal', 'tr', 'phone', 'verified', 0, 'active'),
    ('Elena Sokolova', '+90 532 210 2003', 'nlp-c078-owner@ataberkestate.internal', 'ru', 'whatsapp', 'verified', 24, 'active'),
    ('Sergey Petrov', '+90 532 210 2004', 'nlp-f096-owner@ataberkestate.internal', 'ru', 'email', 'pending', 72, 'active'),
    ('Aylin Kaya', '+90 532 210 2005', 'nlp-a001-tenant@ataberkestate.internal', 'tr', 'portal', 'verified', 8, 'active'),
    ('Anna Kuznetsova', '+90 532 210 2006', 'nlp-c078-guest@ataberkestate.internal', 'ru', 'whatsapp', 'pending', 41, 'active'),
    ('Ozan Demir', '+90 532 210 2007', 'nlp-e096-tenant@ataberkestate.internal', 'tr', 'sms', 'verified', 19, 'active'),
    ('Leyla Arslan', '+90 532 210 2008', 'nlp-g074-owner@ataberkestate.internal', 'en', 'email', 'verified', 6, 'active')
) AS resident(full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status);

WITH resident_links(unit_no, email, relationship, is_primary, start_date) AS (
  VALUES
    ('A-001', 'nlp-a001-owner@ataberkestate.internal', 'owner', TRUE, CURRENT_DATE - 460),
    ('A-001', 'nlp-a001-tenant@ataberkestate.internal', 'tenant', TRUE, CURRENT_DATE - 60),
    ('A-019', 'nlp-a019-owner@ataberkestate.internal', 'owner', TRUE, CURRENT_DATE - 410),
    ('C-078', 'nlp-c078-owner@ataberkestate.internal', 'owner', TRUE, CURRENT_DATE - 300),
    ('C-078', 'nlp-c078-guest@ataberkestate.internal', 'guest', FALSE, CURRENT_DATE - 5),
    ('F-096', 'nlp-f096-owner@ataberkestate.internal', 'owner', TRUE, CURRENT_DATE - 220),
    ('E-096', 'nlp-e096-tenant@ataberkestate.internal', 'tenant', TRUE, CURRENT_DATE - 120),
    ('G-074', 'nlp-g074-owner@ataberkestate.internal', 'owner', TRUE, CURRENT_DATE - 180)
),
target AS (
  SELECT c.id AS company_id, s.id AS site_id
  FROM public.companies c
  JOIN public.sites s ON s.company_id = c.id
  WHERE c.slug = 'ataberk-estate'
    AND s.code = 'NLP-AVS'
  LIMIT 1
)
INSERT INTO public.unit_residents (
  company_id,
  unit_id,
  resident_id,
  relationship,
  is_primary,
  start_date
)
SELECT
  target.company_id,
  u.id,
  r.id,
  resident_links.relationship,
  resident_links.is_primary,
  resident_links.start_date
FROM target
JOIN resident_links ON TRUE
JOIN public.units u ON u.site_id = target.site_id AND u.unit_no = resident_links.unit_no
JOIN public.residents r ON r.company_id = target.company_id AND r.email = resident_links.email
ON CONFLICT (unit_id, resident_id, relationship) DO UPDATE SET
  is_primary = EXCLUDED.is_primary,
  start_date = EXCLUDED.start_date;

WITH ledger_rows(unit_no, resident_email, entry_type, period, due_offset_days, paid_offset_days, status, amount_cents, description, idempotency_key) AS (
  VALUES
    ('A-001', 'nlp-a001-owner@ataberkestate.internal', 'dues', to_char(CURRENT_DATE, 'YYYY-MM'), -18, NULL::INTEGER, 'overdue', 420000::BIGINT, 'Monthly common-area dues overdue', 'nlp-phase6-a001-dues-current'),
    ('A-001', 'nlp-a001-tenant@ataberkestate.internal', 'service_charge', to_char(CURRENT_DATE, 'YYYY-MM'), -9, NULL::INTEGER, 'open', 185000::BIGINT, 'Private transfer and reception service charge', 'nlp-phase6-a001-service-current'),
    ('A-019', 'nlp-a019-owner@ataberkestate.internal', 'dues', to_char(CURRENT_DATE, 'YYYY-MM'), 12, NULL::INTEGER, 'open', 365000::BIGINT, 'Monthly common-area dues', 'nlp-phase6-a019-dues-current'),
    ('C-078', 'nlp-c078-owner@ataberkestate.internal', 'deposit', to_char(CURRENT_DATE, 'YYYY-MM'), -3, NULL::INTEGER, 'partially_paid', 750000::BIGINT, 'Reservation deposit balance after checkout inspection', 'nlp-phase6-c078-deposit-current'),
    ('F-096', 'nlp-f096-owner@ataberkestate.internal', 'dues', to_char(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM'), -48, NULL::INTEGER, 'overdue', 920000::BIGINT, 'Aged dues pending legal review', 'nlp-phase6-f096-dues-aged'),
    ('E-096', 'nlp-e096-tenant@ataberkestate.internal', 'penalty', to_char(CURRENT_DATE, 'YYYY-MM'), -6, NULL::INTEGER, 'overdue', 210000::BIGINT, 'Late checkout and access-card penalty', 'nlp-phase6-e096-penalty-current'),
    ('G-074', 'nlp-g074-owner@ataberkestate.internal', 'dues', to_char(CURRENT_DATE, 'YYYY-MM'), 20, NULL::INTEGER, 'open', 395000::BIGINT, 'Monthly common-area dues', 'nlp-phase6-g074-dues-current'),
    ('A-019', 'nlp-a019-owner@ataberkestate.internal', 'payment', to_char(CURRENT_DATE, 'YYYY-MM'), -2, -2, 'paid', 365000::BIGINT, 'Card collection matched to current dues', 'nlp-phase6-a019-payment-current'),
    ('C-078', 'nlp-c078-owner@ataberkestate.internal', 'payment', to_char(CURRENT_DATE, 'YYYY-MM'), -1, -1, 'paid', 250000::BIGINT, 'Partial deposit collection', 'nlp-phase6-c078-payment-partial'),
    ('A-001', 'nlp-a001-owner@ataberkestate.internal', 'adjustment', to_char(CURRENT_DATE, 'YYYY-MM'), -14, NULL::INTEGER, 'open', 95000::BIGINT, 'Meter reading correction pending approval', 'nlp-phase6-a001-adjustment-current'),
    ('F-096', 'nlp-f096-owner@ataberkestate.internal', 'service_charge', to_char(CURRENT_DATE - INTERVAL '2 months', 'YYYY-MM'), -76, NULL::INTEGER, 'overdue', 680000::BIGINT, 'Pool maintenance recharge pending owner response', 'nlp-phase6-f096-service-aged'),
    ('E-096', 'nlp-e096-tenant@ataberkestate.internal', 'payment', to_char(CURRENT_DATE, 'YYYY-MM'), -4, -4, 'paid', 100000::BIGINT, 'Partial payment against access-card penalty', 'nlp-phase6-e096-payment-partial'),
    ('B-001', NULL::TEXT, 'dues', to_char(CURRENT_DATE, 'YYYY-MM'), 15, NULL::INTEGER, 'open', 420000::BIGINT, 'Demo monthly aidat for copied Block B unit', 'nlp-phase6-b001-dues-demo'),
    ('B-001', NULL::TEXT, 'deposit', to_char(CURRENT_DATE, 'YYYY-MM'), 2, NULL::INTEGER, 'open', 500000::BIGINT, 'Demo short-stay deposit hold before access issue', 'nlp-phase6-b001-deposit-demo'),
    ('D-045', NULL::TEXT, 'service_charge', to_char(CURRENT_DATE, 'YYYY-MM'), 5, NULL::INTEGER, 'open', 250000::BIGINT, 'Demo airport transfer service charge', 'nlp-phase6-d045-transfer-demo'),
    ('D-045', NULL::TEXT, 'payment', to_char(CURRENT_DATE, 'YYYY-MM'), -1, -1, 'paid', 125000::BIGINT, 'Demo partial bank transfer matched to service charge', 'nlp-phase6-d045-payment-demo'),
    ('C-078', 'nlp-c078-owner@ataberkestate.internal', 'refund', to_char(CURRENT_DATE, 'YYYY-MM'), 3, NULL::INTEGER, 'open', 150000::BIGINT, 'Demo refundable deposit release after checkout inspection', 'nlp-phase6-c078-refund-demo')
),
target AS (
  SELECT c.id AS company_id, s.id AS site_id
  FROM public.companies c
  JOIN public.sites s ON s.company_id = c.id
  WHERE c.slug = 'ataberk-estate'
    AND s.code = 'NLP-AVS'
  LIMIT 1
)
INSERT INTO public.finance_ledger_entries (
  company_id,
  site_id,
  unit_id,
  resident_id,
  entry_type,
  period,
  due_date,
  paid_at,
  status,
  amount_cents,
  currency,
  description,
  posted_at,
  idempotency_key,
  metadata
)
SELECT
  target.company_id,
  target.site_id,
  u.id,
  r.id,
  ledger_rows.entry_type,
  ledger_rows.period,
  CURRENT_DATE + ledger_rows.due_offset_days,
  CASE
    WHEN ledger_rows.paid_offset_days IS NULL THEN NULL
    ELSE NOW() + (ledger_rows.paid_offset_days || ' days')::INTERVAL
  END,
  ledger_rows.status,
  ledger_rows.amount_cents,
  'TRY',
  ledger_rows.description,
  NOW(),
  ledger_rows.idempotency_key,
  jsonb_build_object('source', 'cloud-operational-baseline', 'unitNo', ledger_rows.unit_no)
FROM target
JOIN ledger_rows ON TRUE
JOIN public.units u ON u.site_id = target.site_id AND u.unit_no = ledger_rows.unit_no
LEFT JOIN public.residents r ON r.company_id = target.company_id AND r.email = ledger_rows.resident_email;

WITH target AS (
  SELECT c.id AS company_id
  FROM public.companies c
  WHERE c.slug = 'ataberk-estate'
  LIMIT 1
),
payment_rows(idempotency_key, provider, provider_reference, status, amount_cents, paid_offset_days) AS (
  VALUES
    ('nlp-phase6-a019-payment-current', 'iyzico', 'nlp-phase6-iyzico-a019-current', 'captured', 365000::BIGINT, -2),
    ('nlp-phase6-c078-payment-partial', 'paytr', 'nlp-phase6-paytr-c078-partial', 'captured', 250000::BIGINT, -1),
    ('nlp-phase6-e096-payment-partial', 'bank-transfer', 'nlp-phase6-bank-e096-partial', 'pending', 100000::BIGINT, NULL::INTEGER),
    ('nlp-phase6-f096-dues-aged', 'iyzico', 'nlp-phase6-iyzico-f096-failed', 'failed', 920000::BIGINT, NULL::INTEGER),
    ('nlp-phase6-b001-deposit-demo', 'iyzico', 'nlp-phase6-iyzico-b001-auth', 'authorized', 500000::BIGINT, NULL::INTEGER),
    ('nlp-phase6-d045-payment-demo', 'bank-transfer', 'nlp-phase6-bank-d045-partial', 'captured', 125000::BIGINT, -1)
)
INSERT INTO public.payment_transactions (
  company_id,
  ledger_entry_id,
  provider,
  provider_reference,
  status,
  amount_cents,
  currency,
  paid_at,
  raw_payload
)
SELECT
  target.company_id,
  fle.id,
  payment_rows.provider,
  payment_rows.provider_reference,
  payment_rows.status,
  payment_rows.amount_cents,
  'TRY',
  CASE
    WHEN payment_rows.paid_offset_days IS NULL THEN NULL
    ELSE NOW() + (payment_rows.paid_offset_days || ' days')::INTERVAL
  END,
  jsonb_build_object('source', 'cloud-operational-baseline', 'providerStatus', payment_rows.status)
FROM target
JOIN payment_rows ON TRUE
JOIN public.finance_ledger_entries fle
  ON fle.company_id = target.company_id
  AND fle.idempotency_key = payment_rows.idempotency_key;

WITH ticket_rows(ticket_no, unit_no, resident_email, title, description, category, priority, status, sla_offset_hours, estimated_cost_cents, requires_finance_approval) AS (
  VALUES
    ('NLP-OPS-001', 'A-001', 'nlp-a001-tenant@ataberkestate.internal', 'Access card replacement requires debt check', 'Tenant reported a lost card. Finance balance and identity status must be checked before card issue.', 'access', 'high', 'triage', -8, 250000::BIGINT, TRUE),
    ('NLP-OPS-002', 'C-078', 'nlp-c078-guest@ataberkestate.internal', 'Checkout cleaning evidence package', 'Guest checkout needs cleaning photos and deposit decision before release.', 'cleaning', 'normal', 'assigned', 20, 450000::BIGINT, FALSE),
    ('NLP-OPS-003', 'F-096', 'nlp-f096-owner@ataberkestate.internal', 'Pool-side maintenance recharge approval', 'Maintenance recharge is overdue and should stay blocked until finance approval.', 'maintenance', 'urgent', 'waiting_approval', -26, 680000::BIGINT, TRUE),
    ('NLP-OPS-004', 'G-074', 'nlp-g074-owner@ataberkestate.internal', 'Owner document update request', 'Owner requested updated settlement statement and site service summary.', 'documents', 'low', 'open', 48, 0::BIGINT, FALSE),
    ('NLP-OPS-005', 'B-001', NULL::TEXT, 'Demo pre-arrival deep cleaning', 'Assign housekeeping, upload before/after photos and close only after supervisor approval.', 'cleaning', 'normal', 'assigned', 24, 350000::BIGINT, FALSE),
    ('NLP-OPS-006', 'B-001', NULL::TEXT, 'Deposit hold before guest access', 'Issue guest access only after deposit authorization and identity check are visible in finance.', 'finance', 'high', 'waiting_approval', 6, 0::BIGINT, TRUE),
    ('NLP-OPS-007', 'D-045', NULL::TEXT, 'Airport transfer booking', 'Demo paid transfer request; operations should confirm driver, pickup time and payment match.', 'concierge', 'normal', 'open', 12, 250000::BIGINT, FALSE),
    ('NLP-OPS-008', 'D-045', NULL::TEXT, 'Barrier remote not opening parking gate', 'Security must verify active stay, debt status and access-card provider log before replacement.', 'access', 'high', 'triage', 4, 75000::BIGINT, TRUE),
    ('NLP-OPS-009', 'A-019', 'nlp-a019-owner@ataberkestate.internal', 'Monthly meter reading dispute', 'Owner disputes electricity recharge; attach meter photo and recalculate before finance approval.', 'utilities', 'normal', 'open', 30, 0::BIGINT, FALSE),
    ('NLP-OPS-010', 'C-078', 'nlp-c078-owner@ataberkestate.internal', 'Checkout damage inspection', 'Inspect kitchen inventory, towels, access cards and balcony furniture before deposit release.', 'checkout', 'high', 'assigned', 10, 0::BIGINT, FALSE),
    ('NLP-OPS-011', 'E-096', 'nlp-e096-tenant@ataberkestate.internal', 'Camera incident lookup request', 'Security should log NVR time window and export reference only after manager approval.', 'security', 'urgent', 'waiting_approval', 2, 0::BIGINT, FALSE),
    ('NLP-OPS-012', 'G-074', 'nlp-g074-owner@ataberkestate.internal', 'Pool pump preventive maintenance', 'Typical weekly preventive task for pool/spa team with photo proof and chemical reading.', 'maintenance', 'normal', 'in_progress', 18, 120000::BIGINT, FALSE)
),
target AS (
  SELECT c.id AS company_id, s.id AS site_id
  FROM public.companies c
  JOIN public.sites s ON s.company_id = c.id
  WHERE c.slug = 'ataberk-estate'
    AND s.code = 'NLP-AVS'
  LIMIT 1
)
INSERT INTO public.service_tickets (
  company_id,
  site_id,
  unit_id,
  resident_id,
  ticket_no,
  title,
  description,
  category,
  priority,
  status,
  sla_due_at,
  estimated_cost_cents,
  requires_finance_approval
)
SELECT
  target.company_id,
  target.site_id,
  u.id,
  r.id,
  ticket_rows.ticket_no,
  ticket_rows.title,
  ticket_rows.description,
  ticket_rows.category,
  ticket_rows.priority,
  ticket_rows.status,
  NOW() + (ticket_rows.sla_offset_hours || ' hours')::INTERVAL,
  ticket_rows.estimated_cost_cents,
  ticket_rows.requires_finance_approval
FROM target
JOIN ticket_rows ON TRUE
JOIN public.units u ON u.site_id = target.site_id AND u.unit_no = ticket_rows.unit_no
LEFT JOIN public.residents r ON r.company_id = target.company_id AND r.email = ticket_rows.resident_email
ON CONFLICT (company_id, ticket_no) DO UPDATE SET
  unit_id = EXCLUDED.unit_id,
  resident_id = EXCLUDED.resident_id,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  priority = EXCLUDED.priority,
  status = EXCLUDED.status,
  sla_due_at = EXCLUDED.sla_due_at,
  estimated_cost_cents = EXCLUDED.estimated_cost_cents,
  requires_finance_approval = EXCLUDED.requires_finance_approval,
  updated_at = NOW();

WITH target AS (
  SELECT c.id AS company_id
  FROM public.companies c
  WHERE c.slug = 'ataberk-estate'
  LIMIT 1
)
INSERT INTO public.service_ticket_events (
  company_id,
  ticket_id,
  event_type,
  body,
  metadata
)
SELECT
  target.company_id,
  t.id,
  'system_note',
  'Operational baseline created for cloud QA and UAT handoff.',
  jsonb_build_object('source', 'cloud-operational-baseline')
FROM target
JOIN public.service_tickets t ON t.company_id = target.company_id AND t.ticket_no LIKE 'NLP-OPS-%';

WITH reservation_rows(unit_no, resident_email, guest_name, check_in_offset_days, check_out_offset_days, status, access_code_status, cleaning_status, deposit_status) AS (
  VALUES
    ('C-078', 'nlp-c078-guest@ataberkestate.internal', 'Anna Kuznetsova', -1, 1, 'checked_in', 'issued', 'blocked', 'held'),
    ('A-001', 'nlp-a001-tenant@ataberkestate.internal', 'Aylin Kaya', 3, 8, 'scheduled', 'pending', 'assigned', 'pending'),
    ('F-096', 'nlp-f096-owner@ataberkestate.internal', 'Irina Volkov', -6, -1, 'checked_out', 'revoked', 'pending', 'deducted')
),
target AS (
  SELECT c.id AS company_id, s.id AS site_id
  FROM public.companies c
  JOIN public.sites s ON s.company_id = c.id
  WHERE c.slug = 'ataberk-estate'
    AND s.code = 'NLP-AVS'
  LIMIT 1
)
INSERT INTO public.reservations (
  company_id,
  site_id,
  unit_id,
  resident_id,
  guest_name,
  check_in_at,
  check_out_at,
  status,
  access_code_status,
  cleaning_status,
  deposit_status
)
SELECT
  target.company_id,
  target.site_id,
  u.id,
  r.id,
  reservation_rows.guest_name,
  NOW() + (reservation_rows.check_in_offset_days || ' days')::INTERVAL,
  NOW() + (reservation_rows.check_out_offset_days || ' days')::INTERVAL,
  reservation_rows.status,
  reservation_rows.access_code_status,
  reservation_rows.cleaning_status,
  reservation_rows.deposit_status
FROM target
JOIN reservation_rows ON TRUE
JOIN public.units u ON u.site_id = target.site_id AND u.unit_no = reservation_rows.unit_no
LEFT JOIN public.residents r ON r.company_id = target.company_id AND r.email = reservation_rows.resident_email;

WITH action_rows(action_type, entity_table, entity_external_id, title, status, metadata) AS (
  VALUES
    (
      'users.directory.review',
      'staff_members',
      'NLP-STAFF',
      'Review New Level Premium staff and role coverage',
      'logged',
      jsonb_build_object(
        'demoPolicy', 'Comparable 769-unit resort staffing sample; replace with client HR roster before production.',
        'minimumCoverage', jsonb_build_array('site manager', 'operations/admin', 'finance/collections', 'resident support TR/RU', 'technical', 'pool/spa', 'housekeeping', 'security/barrier')
      )
    ),
    (
      'finance.ledger.review',
      'finance_ledger_entries',
      'NLP-FINANCE',
      'Review open ledger and overdue access restrictions',
      'queued',
      jsonb_build_object(
        'demoPolicy', 'Opening balances, aidat, payments, debts and deposits are generated test data.',
        'currency', 'TRY',
        'approvalNeeded', 'Client must confirm real aidat formula, penalty rates, legal collection timing and bank accounts.'
      )
    ),
    (
      'tickets.sla.review',
      'service_tickets',
      'NLP-OPS',
      'Review typical service tickets and finance approvals',
      'queued',
      jsonb_build_object(
        'demoPolicy', 'Typical Alanya resort tasks generated for workflow testing.',
        'taskTypes', jsonb_build_array('access card', 'deep cleaning', 'checkout inspection', 'airport transfer', 'meter dispute', 'camera lookup', 'barrier remote', 'pool/spa maintenance')
      )
    ),
    (
      'reservations.deposit.review',
      'reservations',
      'NLP-BOOKING',
      'Review deposit decisions before checkout closure',
      'logged',
      jsonb_build_object(
        'demoPolicy', 'Current real bookings are not required for demo; sample records exercise check-in, check-out, cleaning and deposit states.',
        'approvalNeeded', 'Client must approve deposit hold amount, refund SLA and damage deduction authority.'
      )
    ),
    (
      'operations.service_catalog.demo',
      'client_action_requests',
      'NLP-SERVICE-CATALOG',
      'Approve demo service catalog, prices and SLA',
      'queued',
      jsonb_build_object(
        'approvalState', 'pending_client_approval',
        'marketAssumption', 'Alanya resort demo baseline, June 2026; values are test data, not client tariffs.',
        'catalog', jsonb_build_array(
          jsonb_build_object('code', 'AIDAT-1P1', 'name', 'Monthly aidat 1+1', 'priceTry', 4200, 'sla', 'monthly ledger cycle'),
          jsonb_build_object('code', 'AIDAT-2P1', 'name', 'Monthly aidat 2+1', 'priceTry', 5600, 'sla', 'monthly ledger cycle'),
          jsonb_build_object('code', 'ACCESS-CARD', 'name', 'Access card or barrier remote replacement', 'priceTry', 750, 'sla', '4 business hours after identity and debt check'),
          jsonb_build_object('code', 'DEEP-CLEAN-1P1', 'name', 'Deep cleaning 1+1', 'priceTry', 2500, 'sla', '24 hours with before/after photos'),
          jsonb_build_object('code', 'DEEP-CLEAN-2P1', 'name', 'Deep cleaning 2+1', 'priceTry', 3500, 'sla', '24 hours with before/after photos'),
          jsonb_build_object('code', 'TRANSFER-ALANYA-GZP', 'name', 'Airport transfer Gazipasa-Alanya', 'priceTry', 2500, 'sla', '12 hours booking confirmation'),
          jsonb_build_object('code', 'TECH-CALLOUT', 'name', 'Technical callout excluding materials', 'priceTry', 1000, 'sla', 'urgent 2 hours, normal 24 hours'),
          jsonb_build_object('code', 'CHECKOUT-INSPECTION', 'name', 'Checkout inspection and deposit decision', 'priceTry', 0, 'sla', 'same day, deposit decision within 3 business days')
        )
      )
    ),
    (
      'finance.debt_restriction.rules.demo',
      'client_action_requests',
      'NLP-DEBT-RULES',
      'Approve demo debt restriction rules',
      'queued',
      jsonb_build_object(
        'approvalState', 'pending_client_approval',
        'rules', jsonb_build_array(
          '0-14 days overdue: reminder only, no access restriction.',
          '15-30 days overdue: manager review and payment-plan offer.',
          '31-60 days overdue or more than two monthly aidat unpaid: block new paid services and new guest cards until finance approval.',
          '60+ days overdue: restrict discretionary amenities and parking/barrier additions after written notice.',
          '90+ days overdue: legal/management review before any stronger action.',
          'Emergency access, safety repairs, legal fire exits and essential residence access are never blocked by automation.'
        )
      )
    ),
    (
      'operations.checkout_deposit.rules.demo',
      'client_action_requests',
      'NLP-CHECKOUT-DEPOSIT-RULES',
      'Approve demo checkout and deposit rules',
      'queued',
      jsonb_build_object(
        'approvalState', 'pending_client_approval',
        'rules', jsonb_build_array(
          'Hold TRY 5,000 demo deposit before guest access for short stays.',
          'Checkout requires photos, meter reading if applicable, key/card count and damage checklist.',
          'Deposit release target is within 3 business days after checkout if no debt, damage or missing access media exists.',
          'Any deduction requires manager approval and resident-facing note with evidence.',
          'Late checkout penalty is generated as finance ledger entry before deposit release.'
        )
      )
    ),
    (
      'access.barrier.rules.demo',
      'client_action_requests',
      'NLP-ACCESS-RULES',
      'Approve demo access barrier rules',
      'queued',
      jsonb_build_object(
        'approvalState', 'pending_client_approval',
        'rules', jsonb_build_array(
          'Access cards and barrier remotes require identity/guest verification and finance status check.',
          'Lost card replacement creates a paid service ticket and disables the old card where provider integration allows.',
          'Debt restrictions apply to new cards, amenities and parking additions; they do not block emergency routes.',
          'Security override is logged and reviewed by manager within 24 hours.'
        )
      )
    ),
    (
      'integrations.provider_shortlist.demo',
      'client_action_requests',
      'NLP-PROVIDERS',
      'Review Turkey provider shortlist for payments, banking, access and cameras',
      'queued',
      jsonb_build_object(
        'approvalState', 'pending_client_approval',
        'paymentProviders', jsonb_build_array('iyzico primary card/3DS candidate', 'PayTR backup virtual POS candidate', 'Param alternative Turkish PSP candidate', 'Sipay alternative Turkish PSP candidate', 'Paycell wallet/payment candidate if client wants telecom wallet coverage', 'bank transfer reconciliation via client bank statements'),
        'communicationProviders', jsonb_build_array('Netgsm SMS candidate', 'Ileti Merkezi SMS candidate', 'Related Digital/euro.message email and marketing automation candidate', 'Brevo or SendGrid international email fallback', 'Twilio international SMS/WhatsApp fallback', 'WhatsApp Business provider TBD by client'),
        'ticketingProviders', jsonb_build_array('Internal 1Cati service_tickets as operational system of record', 'Twenty CRM for contact/company/deal context, not SLA ticket replacement', 'Jira Service Management only for internal IT escalation if needed', 'Zendesk/Freshdesk only if the client later needs public multi-channel helpdesk'),
        'accessProviders', jsonb_build_array('ZKTeco card/access control candidate', 'Hikvision/Dahua camera and NVR candidate', 'local Alanya integrator for barrier hardware/API availability'),
        'integrationPolicy', 'Use provider-neutral adapter/outbox first; no direct production integration until client confirms contracts, API access, KVKK responsibilities and support owner.',
        'referenceUrls', jsonb_build_object(
          'azuraWorldBenchmark', 'https://azuraworld.net/de',
          'apsiyon', 'https://www.apsiyon.com',
          'senyonet', 'https://www.senyonet.com.tr',
          'iyzico', 'https://www.iyzico.com',
          'paytr', 'https://www.paytr.com',
          'param', 'https://param.com.tr',
          'sipay', 'https://www.sipay.com.tr',
          'paycell', 'https://www.paycell.com.tr',
          'netgsm', 'https://www.netgsm.com.tr',
          'iletiMerkezi', 'https://www.iletimerkezi.com',
          'relatedDigitalEuroMsg', 'https://www.euromsg.com',
          'brevo', 'https://www.brevo.com',
          'sendgrid', 'https://sendgrid.com',
          'twilio', 'https://twilio.com',
          'twentyCrm', 'https://twenty.com',
          'zendesk', 'https://www.zendesk.com',
          'jiraServiceManagement', 'https://www.atlassian.com/software/jira/service-management',
          'zkteco', 'https://www.zkteco.com/en',
          'hikvisionTurkey', 'https://www.hikvision.com/tr/',
          'dahua', 'https://www.dahuasecurity.com'
        )
      )
    )
),
target AS (
  SELECT c.id AS company_id
  FROM public.companies c
  WHERE c.slug = 'ataberk-estate'
  LIMIT 1
)
INSERT INTO public.client_action_requests (
  company_id,
  action_type,
  entity_table,
  entity_external_id,
  title,
  status,
  metadata
)
SELECT
  target.company_id,
  action_rows.action_type,
  action_rows.entity_table,
  action_rows.entity_external_id,
  action_rows.title,
  action_rows.status,
  jsonb_build_object('source', 'cloud-operational-baseline') || action_rows.metadata
FROM target
JOIN action_rows ON TRUE;
