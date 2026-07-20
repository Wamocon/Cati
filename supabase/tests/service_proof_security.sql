-- Window 1 / UC20 exact-task evidence security and completion contract.
--
-- Run only after a clean database has applied migrations through 27. The test
-- is transaction-scoped and rolls every fixture back. It intentionally uses
-- two staff assignees and two media-required tasks on one ticket so a future
-- ticket-level shortcut cannot satisfy either authorization or completion.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions, pg_temp;

SELECT plan(9);

SELECT ok(
  (
    SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'storage'
       AND c.relname = 'objects'
  ),
  'storage.objects keeps row-level security enabled'
);

-- storage.objects is owned by supabase_storage_admin on hosted Supabase (and on
-- the local stack), so the postgres migration role cannot attach a policy to it:
-- migration 27 raises insufficient_privilege and skips by design, and the guard
-- is applied out-of-band via supabase/cloud-privileged-setup.sql.
--
-- Assert the contract exactly where the migration layer owns it. Where it does
-- not, report a real TAP SKIP (visible in the output) rather than silently
-- passing -- the guard is defense-in-depth over an already-private bucket.
SELECT CASE
  WHEN pg_catalog.pg_has_role(
         current_user,
         (
           SELECT c.relowner
             FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'storage'
              AND c.relname = 'objects'
         ),
         'MEMBER'
       )
  THEN ok(
    EXISTS (
      SELECT 1
        FROM pg_policies
       WHERE schemaname = 'storage'
         AND tablename = 'objects'
         AND policyname = 'service_evidence_object_direct_access_guard'
         AND permissive = 'RESTRICTIVE'
         AND cmd = 'ALL'
         AND roles @> ARRAY['anon', 'authenticated']::NAME[]
         AND qual LIKE '%bucket_id <>%cati-service-evidence%'
         AND with_check LIKE '%bucket_id <>%cati-service-evidence%'
    ),
    'service-evidence objects have a restrictive anon/authenticated direct-CRUD guard'
  )
  ELSE skip(
    'storage.objects is owned by supabase_storage_admin; the migration role cannot attach the guard here. Applied out-of-band via supabase/cloud-privileged-setup.sql.'
  )
END;

SELECT ok(
  EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'realtime'
       AND tablename = 'messages'
       AND policyname = 'service_evidence_private_broadcast_insert_guard'
       AND permissive = 'RESTRICTIVE'
       AND cmd = 'INSERT'
       AND roles @> ARRAY['anon', 'authenticated']::NAME[]
       AND with_check LIKE '%service-proof:%'
  ),
  'browser roles cannot forge service-proof private Broadcast invalidations'
);

INSERT INTO public.companies (id, name, slug)
VALUES (
  'a7000000-0000-4000-8000-000000000001',
  'Service Proof Contract Company',
  'service-proof-contract-company'
);

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
VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    'a7000000-0000-4000-8000-000000000011',
    'authenticated',
    'authenticated',
    'service-proof-staff-a@example.invalid',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    '{"full_name":"Service Proof Staff A"}'::JSONB,
    NOW(),
    NOW(),
    FALSE,
    FALSE
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'a7000000-0000-4000-8000-000000000012',
    'authenticated',
    'authenticated',
    'service-proof-staff-b@example.invalid',
    '',
    NOW(),
    '{"provider":"email","providers":["email"]}'::JSONB,
    '{"full_name":"Service Proof Staff B"}'::JSONB,
    NOW(),
    NOW(),
    FALSE,
    FALSE
  );

-- The signup trigger creates tenant profiles. Reinsert the exact staff fixture
-- instead of exercising the privilege-escalation update trigger.
DELETE FROM public.profiles
 WHERE id IN (
   'a7000000-0000-4000-8000-000000000011',
   'a7000000-0000-4000-8000-000000000012'
 );

INSERT INTO public.profiles (id, full_name, role, company_id, language)
VALUES
  (
    'a7000000-0000-4000-8000-000000000011',
    'Service Proof Staff A',
    'staff',
    'a7000000-0000-4000-8000-000000000001',
    'en'
  ),
  (
    'a7000000-0000-4000-8000-000000000012',
    'Service Proof Staff B',
    'staff',
    'a7000000-0000-4000-8000-000000000001',
    'en'
  );

INSERT INTO public.sites (id, company_id, name, code)
VALUES (
  'a7000000-0000-4000-8000-000000000002',
  'a7000000-0000-4000-8000-000000000001',
  'Service Proof Contract Site',
  'SP-CONTRACT'
);

INSERT INTO public.staff_members (
  id, company_id, profile_id, name, role, team, status
)
VALUES
  (
    'a7000000-0000-4000-8000-000000000021',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000011',
    'Service Proof Staff A',
    'technician',
    'Technical',
    'active'
  ),
  (
    'a7000000-0000-4000-8000-000000000022',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000012',
    'Service Proof Staff B',
    'technician',
    'Technical',
    'active'
  );

INSERT INTO public.service_tickets (
  id, company_id, site_id, ticket_no, title, workflow_state
)
VALUES (
  'a7000000-0000-4000-8000-000000000003',
  'a7000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000002',
  'SP-CONTRACT-1',
  'Two-assignee service-proof contract',
  'submitted'
);

INSERT INTO public.workforce_tasks (
  id,
  company_id,
  site_id,
  ticket_id,
  assigned_staff_member_id,
  task_no,
  title,
  team,
  status,
  requires_media
)
VALUES
  (
    'a7000000-0000-4000-8000-000000000031',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000002',
    'a7000000-0000-4000-8000-000000000003',
    'a7000000-0000-4000-8000-000000000021',
    'SP-TASK-A',
    'Task assigned to staff A',
    'Technical',
    'assigned',
    TRUE
  ),
  (
    'a7000000-0000-4000-8000-000000000032',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000002',
    'a7000000-0000-4000-8000-000000000003',
    'a7000000-0000-4000-8000-000000000022',
    'SP-TASK-B',
    'Task assigned to staff B',
    'Technical',
    'assigned',
    TRUE
  );

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"a7000000-0000-4000-8000-000000000011","role":"authenticated"}',
  TRUE
);
SELECT set_config(
  'request.jwt.claim.sub',
  'a7000000-0000-4000-8000-000000000011',
  TRUE
);

SELECT ok(
  public.current_user_is_exact_task_assignee(
    'a7000000-0000-4000-8000-000000000031'
  ),
  'staff A is authorized for their exact task'
);

SELECT is(
  public.current_user_is_exact_task_assignee(
    'a7000000-0000-4000-8000-000000000032'
  ),
  FALSE,
  'staff A is denied the coworker task on the same ticket'
);

INSERT INTO public.media_reports (
  id,
  company_id,
  site_id,
  ticket_id,
  workforce_task_id,
  media_type,
  caption,
  verification_status,
  upload_status,
  virus_scan_status
)
VALUES (
  'a7000000-0000-4000-8000-000000000041',
  'a7000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000002',
  'a7000000-0000-4000-8000-000000000003',
  'a7000000-0000-4000-8000-000000000031',
  'note',
  'Pending proof for task A only.',
  'pending',
  'not_required',
  'not_applicable'
);

SELECT throws_ok(
  $$
    UPDATE public.service_tickets
       SET workflow_state = 'manager_review'
     WHERE id = 'a7000000-0000-4000-8000-000000000003'
  $$,
  'P0001',
  'Every active media-required task needs stored, malware-cleared evidence or a field note before manager review.',
  'task A proof cannot release task B into manager review'
);

INSERT INTO public.media_reports (
  id,
  company_id,
  site_id,
  ticket_id,
  workforce_task_id,
  media_type,
  caption,
  verification_status,
  upload_status,
  virus_scan_status
)
VALUES (
  'a7000000-0000-4000-8000-000000000042',
  'a7000000-0000-4000-8000-000000000001',
  'a7000000-0000-4000-8000-000000000002',
  'a7000000-0000-4000-8000-000000000003',
  'a7000000-0000-4000-8000-000000000032',
  'note',
  'Pending proof for task B.',
  'pending',
  'not_required',
  'not_applicable'
);

SELECT lives_ok(
  $$
    UPDATE public.service_tickets
       SET workflow_state = 'manager_review'
     WHERE id = 'a7000000-0000-4000-8000-000000000003'
  $$,
  'each active task having a pending qualifying proof permits manager review'
);

SELECT throws_ok(
  $$
    UPDATE public.service_tickets
       SET workflow_state = 'resolved'
     WHERE id = 'a7000000-0000-4000-8000-000000000003'
  $$,
  'P0001',
  'Every active media-required task needs human-accepted service evidence before resolution.',
  'pending task proofs cannot resolve the ticket'
);

INSERT INTO public.media_reports (
  id,
  company_id,
  site_id,
  ticket_id,
  workforce_task_id,
  media_type,
  caption,
  verification_status,
  upload_status,
  virus_scan_status
)
VALUES
  (
    'a7000000-0000-4000-8000-000000000043',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000002',
    'a7000000-0000-4000-8000-000000000003',
    'a7000000-0000-4000-8000-000000000031',
    'note',
    'Accepted proof for task A.',
    'accepted',
    'not_required',
    'not_applicable'
  ),
  (
    'a7000000-0000-4000-8000-000000000044',
    'a7000000-0000-4000-8000-000000000001',
    'a7000000-0000-4000-8000-000000000002',
    'a7000000-0000-4000-8000-000000000003',
    'a7000000-0000-4000-8000-000000000032',
    'note',
    'Accepted proof for task B.',
    'accepted',
    'not_required',
    'not_applicable'
  );

SELECT lives_ok(
  $$
    UPDATE public.service_tickets
       SET workflow_state = 'resolved'
     WHERE id = 'a7000000-0000-4000-8000-000000000003'
  $$,
  'one accepted qualifying proof per active task permits resolution'
);

SELECT * FROM finish();
ROLLBACK;
