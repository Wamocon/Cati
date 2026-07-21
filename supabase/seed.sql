-- Fixture seed data for the 1Cati Supabase schema.
-- Cloud runtime uses migrations/import scripts; do not run local reset workflows for production.

-- Declare the seed's provisioning identity.
--
-- public.prevent_profile_privilege_escalation() (BEFORE UPDATE ON profiles)
-- rejects any role/company change that does not come from an authorized admin
-- command or a verified invitation redemption. Seeding IS platform/service
-- provisioning, and the guard recognises the service role for exactly this case
-- (it audit-logs the change as 'profile.platform_authority_provisioned' with
-- reason 'platform/service provisioning').
--
-- Without this, the profile upsert below resolves to an UPDATE -- the
-- on_auth_user_created trigger has already inserted the row -- the guard raises
-- P0001, and `supabase db reset` / `supabase start` fails outright.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', false);

DO $$
DECLARE
  v_company_id UUID := '11111111-1111-4111-8111-111111111111';
BEGIN
  DELETE FROM public.operational_search_documents WHERE company_id = v_company_id;
  DELETE FROM public.client_action_requests WHERE company_id = v_company_id;
  DELETE FROM public.integration_outbox WHERE company_id = v_company_id;
  DELETE FROM public.import_findings WHERE company_id = v_company_id;
  DELETE FROM public.import_batches WHERE company_id = v_company_id;
  DELETE FROM public.staff_members WHERE company_id = v_company_id;
  DELETE FROM public.role_coverage WHERE company_id = v_company_id;
END;
$$;

-- Migration 14 provisions the default 'ataberk-estate' company with a GENERATED
-- id. Every fixture below references the canonical fixture UUID, and
-- "ON CONFLICT (slug) DO UPDATE" cannot change a primary key -- so without this
-- the seed would attach its fixtures to a company id that does not exist and
-- fail with profiles_company_id_fkey (23503).
--
-- Dropping the generated row first lets the fixture company be created with its
-- canonical id. This is safe in the only flow that runs this file: `supabase db
-- reset` starts from an empty database, so migration 14's row has no dependents
-- yet (its own profile backfill matches nothing -- there are no profiles).
DELETE FROM public.companies
WHERE slug = 'ataberk-estate'
  AND id <> '11111111-1111-4111-8111-111111111111';

INSERT INTO public.companies (id, name, slug, status, primary_locale, timezone, currency)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'Ataberk Estate',
  'ataberk-estate',
  'active',
  'tr',
  'Europe/Istanbul',
  'TRY'
)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  status = EXCLUDED.status,
  primary_locale = EXCLUDED.primary_locale,
  timezone = EXCLUDED.timezone,
  currency = EXCLUDED.currency,
  updated_at = NOW();

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  '77777777-7777-4777-8777-777777777777',
  'authenticated',
  'authenticated',
  'manager@cati.local',
  crypt('CatiLocal!2026', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"full_name":"Local Manager","role":"manager","language":"tr","company_id":"11111111-1111-4111-8111-111111111111"}'::jsonb,
  NOW(),
  NOW(),
  FALSE,
  FALSE
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  encrypted_password = EXCLUDED.encrypted_password,
  email_confirmed_at = EXCLUDED.email_confirmed_at,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  updated_at = NOW();

UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0)
WHERE id = '77777777-7777-4777-8777-777777777777';

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '88888888-8888-4888-8888-888888888888',
  'manager@cati.local',
  '77777777-7777-4777-8777-777777777777',
  '{"sub":"77777777-7777-4777-8777-777777777777","email":"manager@cati.local","email_verified":true,"phone_verified":false}'::jsonb,
  'email',
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (provider_id, provider) DO UPDATE
SET
  user_id = EXCLUDED.user_id,
  identity_data = EXCLUDED.identity_data,
  updated_at = NOW();

INSERT INTO public.profiles (id, full_name, role, language, company_id)
VALUES (
  '77777777-7777-4777-8777-777777777777',
  'Local Manager',
  'manager',
  'tr',
  '11111111-1111-4111-8111-111111111111'
)
ON CONFLICT (id) DO UPDATE
SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  language = EXCLUDED.language,
  company_id = EXCLUDED.company_id,
  updated_at = NOW();

INSERT INTO public.offices (id, company_id, name, city, address, phone, status)
VALUES (
  '22222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Ataberk Avsallar Office',
  'Alanya',
  'Avsallar, Alanya, Antalya',
  '+90 549 557 7557',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, city = EXCLUDED.city, address = EXCLUDED.address, phone = EXCLUDED.phone, updated_at = NOW();

INSERT INTO public.sites (id, company_id, office_id, name, code, city, district, address, status, total_units)
VALUES (
  '33333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'New Level Premium Avsallar',
  'NLP-AVS',
  'Alanya',
  'Avsallar',
  'Avsallar, Alanya, Antalya',
  'active',
  769
)
ON CONFLICT (company_id, code) DO UPDATE
SET name = EXCLUDED.name, city = EXCLUDED.city, district = EXCLUDED.district, address = EXCLUDED.address, total_units = EXCLUDED.total_units, updated_at = NOW();

WITH block_source AS (
  SELECT
    '11111111-1111-4111-8111-111111111111'::uuid AS company_id,
    '33333333-3333-4333-8333-333333333333'::uuid AS site_id,
    chr(64 + generate_series(1, 8)) AS name,
    generate_series(1, 8) AS sort_order
)
INSERT INTO public.site_blocks (company_id, site_id, name, sort_order)
SELECT company_id, site_id, name, sort_order
FROM block_source
ON CONFLICT (site_id, name) DO UPDATE
SET sort_order = EXCLUDED.sort_order, updated_at = NOW();

WITH floor_source AS (
  SELECT
    b.company_id,
    b.site_id,
    b.id AS block_id,
    lpad(gs::text, 2, '0') AS label,
    gs AS level
  FROM public.site_blocks b
  CROSS JOIN generate_series(1, 13) gs
  WHERE b.site_id = '33333333-3333-4333-8333-333333333333'
)
INSERT INTO public.site_floors (company_id, site_id, block_id, label, level)
SELECT company_id, site_id, block_id, label, level
FROM floor_source
ON CONFLICT (site_id, block_id, label) DO UPDATE
SET level = EXCLUDED.level, updated_at = NOW();

WITH numbered AS (
  SELECT generate_series(1, 769) AS n
),
computed AS (
  SELECT
    n,
    CASE WHEN n = 769 THEN 7 ELSE ((n - 1) / 96)::int END AS block_index,
    CASE WHEN n = 769 THEN 96 ELSE ((n - 1) % 96)::int END AS within_block
  FROM numbered
),
unit_source AS (
  SELECT
    '11111111-1111-4111-8111-111111111111'::uuid AS company_id,
    '33333333-3333-4333-8333-333333333333'::uuid AS site_id,
    chr(65 + block_index) AS block_name,
    ((within_block / 8) + 1)::int AS floor_no,
    ((within_block % 8) + 1)::int AS door_no,
    n
  FROM computed
)
INSERT INTO public.units (
  company_id,
  site_id,
  block_id,
  floor_id,
  unit_no,
  unit_type,
  size_sqm,
  bedrooms,
  occupancy_status,
  ownership_status
)
SELECT
  u.company_id,
  u.site_id,
  b.id,
  f.id,
  u.block_name || '-' || lpad(u.floor_no::text, 2, '0') || lpad(u.door_no::text, 2, '0') AS unit_no,
  CASE
    WHEN u.floor_no > 10 THEN 'apartment'
    WHEN u.door_no = 8 THEN 'commercial'
    ELSE 'apartment'
  END,
  CASE WHEN u.floor_no > 10 THEN 142 ELSE 58 + (u.door_no * 8) + (u.floor_no * 1.5) END,
  CASE WHEN u.floor_no > 10 THEN 3 WHEN u.door_no IN (3, 6) THEN 1 ELSE 2 END,
  CASE
    WHEN u.n % 53 = 0 THEN 'blocked'
    WHEN u.n % 37 = 0 THEN 'unknown'
    WHEN u.n % 29 = 0 THEN 'reserved'
    WHEN u.n % 19 = 0 THEN 'vacant'
    ELSE 'occupied'
  END,
  CASE
    WHEN u.n % 7 = 0 THEN 'tenant_occupied'
    WHEN u.n % 11 = 0 THEN 'company_owned'
    ELSE 'owner_occupied'
  END
FROM unit_source u
JOIN public.site_blocks b ON b.site_id = u.site_id AND b.name = u.block_name
JOIN public.site_floors f ON f.site_id = u.site_id AND f.block_id = b.id AND f.label = lpad(u.floor_no::text, 2, '0')
ON CONFLICT (site_id, unit_no) DO UPDATE
SET
  block_id = EXCLUDED.block_id,
  floor_id = EXCLUDED.floor_id,
  unit_type = EXCLUDED.unit_type,
  size_sqm = EXCLUDED.size_sqm,
  bedrooms = EXCLUDED.bedrooms,
  occupancy_status = EXCLUDED.occupancy_status,
  ownership_status = EXCLUDED.ownership_status,
  updated_at = NOW();

UPDATE public.sites
SET total_units = (
  SELECT count(*)
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
)
WHERE id = '33333333-3333-4333-8333-333333333333';

WITH resident_source AS (
  SELECT
    '11111111-1111-4111-8111-111111111111'::uuid AS company_id,
    gs,
    (ARRAY['Ayse Kaya','Mehmet Yilmaz','Elena Sokolova','Fatma Sahin','Sergey Petrov','Murat Demir','Olga Ivanova','Deniz Arslan','Mustafa Aydin','Anna Kuznetsova'])[1 + ((gs - 1) % 10)] AS full_name,
    (ARRAY['tr','tr','ru','tr','ru','tr','ru','tr','tr','ru'])[1 + ((gs - 1) % 10)] AS preferred_language
  FROM generate_series(1, 40) gs
)
INSERT INTO public.residents (company_id, full_name, phone, email, preferred_language, preferred_channel, identity_status, risk_score, status)
SELECT
  company_id,
  full_name,
  '+90 549 55' || lpad((7000 + gs)::text, 4, '0'),
  lower(replace(full_name, ' ', '.')) || '@example.local',
  preferred_language,
  CASE WHEN gs % 5 = 0 THEN 'email' ELSE 'whatsapp' END,
  CASE WHEN gs % 9 = 0 THEN 'pending' ELSE 'verified' END,
  CASE WHEN gs % 8 = 0 THEN 82 WHEN gs % 5 = 0 THEN 57 ELSE 18 END,
  'active'
FROM resident_source
ON CONFLICT DO NOTHING;

WITH ranked_units AS (
  SELECT id, company_id, row_number() OVER (ORDER BY unit_no) AS rn
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
  LIMIT 40
),
ranked_residents AS (
  SELECT id, company_id, row_number() OVER (ORDER BY created_at, full_name) AS rn
  FROM public.residents
  WHERE company_id = '11111111-1111-4111-8111-111111111111'
  LIMIT 40
)
INSERT INTO public.unit_residents (company_id, unit_id, resident_id, relationship, is_primary, start_date)
SELECT
  u.company_id,
  u.id,
  r.id,
  CASE WHEN u.rn % 6 = 0 THEN 'tenant' ELSE 'owner' END,
  TRUE,
  CURRENT_DATE - ((u.rn * 17)::integer)
FROM ranked_units u
JOIN ranked_residents r ON r.rn = u.rn
ON CONFLICT (unit_id, resident_id, relationship) DO NOTHING;

INSERT INTO public.vendors (id, company_id, name, category, phone, email, status)
VALUES
  ('44444444-4444-4444-8444-444444444401', '11111111-1111-4111-8111-111111111111', 'Akdeniz Teknik Servis', 'Tesisat', '+90 532 100 0101', 'teknik@example.local', 'active'),
  ('44444444-4444-4444-8444-444444444402', '11111111-1111-4111-8111-111111111111', 'Avsallar Temizlik', 'Temizlik', '+90 532 100 0102', 'temizlik@example.local', 'active'),
  ('44444444-4444-4444-8444-444444444403', '11111111-1111-4111-8111-111111111111', 'Giris Kontrol Partneri', 'Erisim', '+90 532 100 0103', 'erisim@example.local', 'active')
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name, category = EXCLUDED.category, phone = EXCLUDED.phone, email = EXCLUDED.email, updated_at = NOW();

WITH selected_units AS (
  SELECT id, company_id, site_id, unit_no, row_number() OVER (ORDER BY unit_no) AS rn
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
  AND unit_no IN ('A-0101', 'A-0108', 'A-0202', 'B-0303', 'C-0504', 'D-0706', 'F-1001')
),
ticket_source AS (
  SELECT *
  FROM (
    VALUES
      (1, 'SRV-2401', 'Asansor kapisi arizasi', 'Asansor', 'urgent', 'assigned', -6, 820000),
      (2, 'SRV-2402', 'Daire ici su kacagi', 'Tesisat', 'urgent', 'in_progress', -5, 1240000),
      (3, 'SRV-2403', 'Klima drenaj kontrolu', 'Iklimlendirme', 'normal', 'open', 18, 210000),
      (4, 'SRV-2404', 'Aidat borcu nedeniyle hizmet bekliyor', 'Finans onayi', 'high', 'waiting_approval', -12, 460000),
      (5, 'SRV-2405', 'Ortak alan kamera kontrolu', 'Guvenlik', 'high', 'assigned', 11, 680000)
  ) AS t(rn, ticket_no, title, category, priority, status, sla_offset_hours, cost_cents)
)
INSERT INTO public.service_tickets (
  company_id,
  site_id,
  unit_id,
  vendor_id,
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
  u.company_id,
  u.site_id,
  u.id,
  CASE WHEN t.category = 'Tesisat' THEN '44444444-4444-4444-8444-444444444401'::uuid ELSE NULL END,
  t.ticket_no,
  t.title,
  'Local seed ticket for end-to-end workflow testing.',
  t.category,
  t.priority,
  t.status,
  NOW() + (t.sla_offset_hours || ' hours')::interval,
  t.cost_cents,
  t.ticket_no = 'SRV-2404'
FROM ticket_source t
JOIN selected_units u ON u.rn = t.rn
ON CONFLICT (company_id, ticket_no) DO UPDATE
SET title = EXCLUDED.title, status = EXCLUDED.status, priority = EXCLUDED.priority, sla_due_at = EXCLUDED.sla_due_at, updated_at = NOW();

WITH ledger_units AS (
  SELECT id, company_id, site_id, unit_no, row_number() OVER (ORDER BY unit_no) AS rn
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
  LIMIT 64
)
INSERT INTO public.finance_ledger_entries (
  company_id,
  site_id,
  unit_id,
  entry_type,
  period,
  due_date,
  status,
  amount_cents,
  currency,
  description,
  posted_at,
  idempotency_key
)
SELECT
  company_id,
  site_id,
  id,
  'dues',
  '2026-06',
  CURRENT_DATE - ((rn % 45) || ' days')::interval,
  CASE WHEN rn % 8 = 0 THEN 'overdue' WHEN rn % 3 = 0 THEN 'open' ELSE 'paid' END,
  (165000 + (rn % 5) * 45000)::bigint,
  'TRY',
  'June site dues opening balance',
  NOW() - interval '1 day',
  'seed-dues-2026-06-' || unit_no
FROM ledger_units
ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL DO NOTHING;

-- Ensure the booking-resource infrastructure exists for the reservation demo
-- site. Migration 00000000000032 seeds resource types/resources from companies,
-- but on a fresh database the companies are created by THIS seed (which runs
-- after migrations), so the migration found none. Re-create the minimum here,
-- then reference it: reservations.bookable_resource_id is NOT NULL since #32.
INSERT INTO public.booking_resource_types (company_id, code, name, category)
SELECT s.company_id, 'shared-facility', 'Shared facility', 'shared_facility'
FROM public.sites s
WHERE s.id = '33333333-3333-4333-8333-333333333333'
ON CONFLICT (company_id, code) DO NOTHING;

INSERT INTO public.bookable_resources (
  company_id, site_id, resource_type_id, code, name,
  commissioning_state, capacity_mode, capacity,
  min_duration_minutes, default_duration_minutes, max_duration_minutes,
  maximum_advance_days, approval_requirement, price_truth, deposit_truth, access_requirement
)
SELECT s.company_id, s.id, rt.id, 'seed-amenity', 'Amenity',
       'active', 'exclusive', 1, 5, 60, 2880, 730, 'none', 'free', 'not_required', 'manual'
FROM public.sites s
JOIN public.booking_resource_types rt
  ON rt.company_id = s.company_id AND rt.code = 'shared-facility'
WHERE s.id = '33333333-3333-4333-8333-333333333333'
ON CONFLICT (site_id, code) DO NOTHING;

WITH reservation_units AS (
  SELECT id, company_id, site_id, unit_no, row_number() OVER (ORDER BY unit_no) AS rn
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
  AND unit_no IN ('A-0301', 'B-0502', 'C-0703', 'D-0904')
)
INSERT INTO public.reservations (
  company_id,
  site_id,
  unit_id,
  bookable_resource_id,
  resource_name,
  guest_name,
  check_in_at,
  check_out_at,
  buffer_before_minutes,
  buffer_after_minutes,
  buffered_start_at,
  buffered_end_at,
  status,
  access_code_status,
  cleaning_status,
  deposit_status,
  request_fingerprint
)
SELECT
  ru.company_id,
  ru.site_id,
  ru.id,
  br.id,
  'Amenity',
  (ARRAY['Murat A.', 'Nina Volkova', 'Corporate Group', 'Olga Ivanova'])[ru.rn],
  NOW() + ((ru.rn - 2) || ' days')::interval,
  NOW() + ((ru.rn + 3) || ' days')::interval,
  -- Zero buffers so buffered_* equals check_in/out, satisfying the immutable
  -- buffer-snapshot guard (booking_assert_buffer_snapshot, migration 32).
  0,
  0,
  NOW() + ((ru.rn - 2) || ' days')::interval,
  NOW() + ((ru.rn + 3) || ' days')::interval,
  CASE WHEN ru.rn = 1 THEN 'checked_in' WHEN ru.rn = 2 THEN 'scheduled' ELSE 'scheduled' END,
  CASE WHEN ru.rn = 2 THEN 'pending' ELSE 'issued' END,
  CASE WHEN ru.rn = 1 THEN 'done' ELSE 'pending' END,
  CASE WHEN ru.rn = 2 THEN 'held' ELSE 'pending' END,
  md5('seed-reservation:' || ru.id::text)
FROM reservation_units ru
JOIN public.bookable_resources br
  ON br.site_id = ru.site_id AND br.code = 'seed-amenity'
ON CONFLICT DO NOTHING;

WITH document_units AS (
  SELECT id, company_id, site_id, unit_no, row_number() OVER (ORDER BY unit_no) AS rn
  FROM public.units
  WHERE site_id = '33333333-3333-4333-8333-333333333333'
  LIMIT 6
)
INSERT INTO public.documents (company_id, site_id, unit_id, title, category, file_path, status, expires_at)
SELECT
  company_id,
  site_id,
  id,
  'DOC-900' || rn || ' ' || unit_no || ' compliance file',
  CASE WHEN rn % 3 = 0 THEN 'KYC' WHEN rn % 2 = 0 THEN 'TAPU' ELSE 'Service' END,
  'local-seed/doc-900' || rn || '.pdf',
  CASE WHEN rn = 5 THEN 'expired' WHEN rn = 4 THEN 'draft' ELSE 'active' END,
  CASE WHEN rn = 5 THEN NOW() - interval '2 days' ELSE NOW() + interval '180 days' END
FROM document_units
ON CONFLICT DO NOTHING;

WITH batch AS (
  INSERT INTO public.import_batches (
    id,
    company_id,
    source_name,
    entity_type,
    total_rows,
    valid_rows,
    warning_rows,
    rejected_rows,
    status,
    metadata
  )
  VALUES
    ('55555555-5555-4555-8555-555555555501', '11111111-1111-4111-8111-111111111111', 'Client master flat list', 'units', 769, 752, 17, 0, 'ready_to_apply', '{"source":"local-seed"}'),
    ('55555555-5555-4555-8555-555555555502', '11111111-1111-4111-8111-111111111111', 'Owner and resident contact list', 'residents', 618, 603, 15, 0, 'review_required', '{"source":"local-seed"}'),
    ('55555555-5555-4555-8555-555555555503', '11111111-1111-4111-8111-111111111111', 'Opening balance ledger', 'finance_ledger_entries', 769, 769, 0, 0, 'validated', '{"source":"local-seed"}')
  ON CONFLICT (id) DO UPDATE
  SET valid_rows = EXCLUDED.valid_rows, warning_rows = EXCLUDED.warning_rows, rejected_rows = EXCLUDED.rejected_rows, status = EXCLUDED.status, updated_at = NOW()
  RETURNING id, company_id
)
INSERT INTO public.import_findings (company_id, import_batch_id, severity, area, affected_rows, message, recommended_action)
SELECT company_id, id, 'warning', 'Resident phone', 9, 'Some phone numbers need WhatsApp country-code normalization.', 'Normalize to +90 before final import.'
FROM batch
WHERE id = '55555555-5555-4555-8555-555555555502'
ON CONFLICT DO NOTHING;

INSERT INTO public.staff_members (id, company_id, name, role, team, phone, language, active_tasks, approval_limit_cents, access_scope, status)
VALUES
  ('66666666-6666-4666-8666-666666666601', '11111111-1111-4111-8111-111111111111', 'Selin Yonetici', 'manager', 'Site Yonetimi', '+90 532 110 1001', 'tr', 9, 15000000, 'all_site', 'active'),
  ('66666666-6666-4666-8666-666666666602', '11111111-1111-4111-8111-111111111111', 'Merve Muhasebe', 'accountant', 'Finans', '+90 532 110 1002', 'tr', 14, 7500000, 'finance_only', 'active'),
  ('66666666-6666-4666-8666-666666666603', '11111111-1111-4111-8111-111111111111', 'Ahmet Teknik', 'staff', 'Teknik', '+90 532 110 1003', 'tr', 11, 1200000, 'field_only', 'active')
ON CONFLICT (id) DO UPDATE
SET active_tasks = EXCLUDED.active_tasks, approval_limit_cents = EXCLUDED.approval_limit_cents, status = EXCLUDED.status, updated_at = NOW();

INSERT INTO public.role_coverage (company_id, role_label, users_count, can_approve_finance, can_restrict_access, can_manage_users, can_export_data)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'Yonetim', 1, TRUE, TRUE, TRUE, TRUE),
  ('11111111-1111-4111-8111-111111111111', 'Sorumlu', 2, FALSE, TRUE, FALSE, TRUE),
  ('11111111-1111-4111-8111-111111111111', 'Muhasebe', 3, TRUE, FALSE, FALSE, TRUE),
  ('11111111-1111-4111-8111-111111111111', 'Personel', 17, FALSE, FALSE, FALSE, FALSE),
  ('11111111-1111-4111-8111-111111111111', 'Malik', 511, FALSE, FALSE, FALSE, TRUE),
  ('11111111-1111-4111-8111-111111111111', 'Kiraci', 184, FALSE, FALSE, FALSE, FALSE)
ON CONFLICT (company_id, role_label) DO UPDATE
SET
  users_count = EXCLUDED.users_count,
  can_approve_finance = EXCLUDED.can_approve_finance,
  can_restrict_access = EXCLUDED.can_restrict_access,
  can_manage_users = EXCLUDED.can_manage_users,
  can_export_data = EXCLUDED.can_export_data,
  updated_at = NOW();

INSERT INTO public.ai_action_logs (company_id, site_id, module, entity_table, recommendation, confidence, status, sources)
VALUES
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'finance', 'finance_ledger_entries', 'Prioritize overdue dues before approving non-urgent service work.', 0.8400, 'suggested', '[{"table":"finance_ledger_entries","reason":"overdue balance"}]'),
  ('11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'service', 'service_tickets', 'Escalate urgent tickets with negative SLA to manager review.', 0.9100, 'suggested', '[{"table":"service_tickets","reason":"negative SLA"}]')
ON CONFLICT DO NOTHING;

INSERT INTO public.operational_search_documents (
  company_id,
  site_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT
  company_id,
  id,
  'sites',
  id,
  code,
  name,
  city || ' ' || district || ' ' || address,
  'tr',
  jsonb_build_object('site_code', code, 'total_units', total_units)
FROM public.sites
WHERE id = '33333333-3333-4333-8333-333333333333'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

INSERT INTO public.operational_search_documents (
  company_id,
  site_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT company_id, site_id, 'units', id, unit_no, unit_no || ' unit record', unit_type || ' ' || occupancy_status || ' ' || ownership_status, 'tr', jsonb_build_object('unit_no', unit_no)
FROM public.units
WHERE site_id = '33333333-3333-4333-8333-333333333333'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

INSERT INTO public.operational_search_documents (
  company_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT company_id, 'residents', id, id::text, full_name, coalesce(phone, '') || ' ' || preferred_language || ' risk ' || risk_score, 'tr', jsonb_build_object('email', email)
FROM public.residents
WHERE company_id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

INSERT INTO public.operational_search_documents (
  company_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT
  company_id,
  'vendors',
  id,
  name,
  name,
  category || ' ' || status || ' ' || COALESCE(phone, '') || ' ' || COALESCE(email, ''),
  'tr',
  jsonb_build_object('category', category, 'phone', phone, 'email', email)
FROM public.vendors
WHERE company_id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

INSERT INTO public.operational_search_documents (
  company_id,
  site_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT company_id, site_id, 'service_tickets', id, ticket_no, ticket_no || ' ' || title, category || ' ' || priority || ' ' || status, 'tr', jsonb_build_object('ticket_no', ticket_no)
FROM public.service_tickets
WHERE company_id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

INSERT INTO public.operational_search_documents (
  company_id,
  site_id,
  entity_table,
  entity_id,
  entity_external_id,
  title,
  summary,
  language,
  metadata
)
SELECT company_id, site_id, 'documents', id, file_path, title, category || ' ' || status, 'tr', jsonb_build_object('file_path', file_path)
FROM public.documents
WHERE company_id = '11111111-1111-4111-8111-111111111111'
ON CONFLICT (company_id, entity_table, entity_external_id) WHERE entity_external_id IS NOT NULL DO UPDATE
SET title = EXCLUDED.title, summary = EXCLUDED.summary, metadata = EXCLUDED.metadata, updated_at = NOW();

-- Reconcile role assignments to each seeded profile's current role (multi-role
-- model). The seed creates users as tenant via the signup trigger, then elevates
-- profiles.role directly, so drop the stale assignment and make the current role
-- the single primary assignment.
DELETE FROM public.profile_role_assignments a
USING public.profiles p
WHERE a.profile_id = p.id AND a.role <> p.role;

INSERT INTO public.profile_role_assignments (profile_id, role, is_primary, granted_by)
SELECT id, role, TRUE, id FROM public.profiles
ON CONFLICT (profile_id, role) DO UPDATE SET is_primary = TRUE;

-- Drop the provisioning identity again so nothing else inherits it.
SELECT set_config('request.jwt.claims', '', false);
