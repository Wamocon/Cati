-- Publish dashboard-changing operational tables to Supabase Realtime.
-- The UI still polls as a fallback, but these publications allow immediate
-- refreshes when units, finance, tickets, reservations, AI actions, imports,
-- or client action requests change.

DO $$
DECLARE
  v_table_name TEXT;
BEGIN
  FOREACH v_table_name IN ARRAY ARRAY[
    'units',
    'service_tickets',
    'finance_ledger_entries',
    'reservations',
    'ai_action_logs',
    'client_action_requests',
    'import_batches',
    'import_findings'
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.tables AS t
      WHERE t.table_schema = 'public'
        AND t.table_name = v_table_name
    )
    AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table_name);
    END IF;
  END LOOP;
EXCEPTION
  WHEN undefined_object THEN
    RAISE NOTICE 'Skipping realtime publication setup; supabase_realtime publication is unavailable.';
END;
$$;
