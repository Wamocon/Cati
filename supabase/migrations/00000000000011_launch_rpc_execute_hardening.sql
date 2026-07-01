-- Phase 15 forward hardening for already-applied databases.
-- Removes implicit PUBLIC execution and replaces the later Phase 5 RPC body that
-- previously fell back to the first company when no user company existed.

REVOKE EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_operational_records(TEXT, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_site_dashboard_snapshot() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_phase4_site_data(
  p_query TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 80
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_company_id UUID;
  v_site_id UUID;
  v_query TEXT;
  v_limit INTEGER;
  v_payload JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required for phase 4 site data.';
  END IF;

  v_company_id := public.current_user_company_id();

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'No company context for phase 4 site data.';
  END IF;

  SELECT id INTO v_site_id
  FROM public.sites
  WHERE company_id = v_company_id
  ORDER BY created_at
  LIMIT 1;

  v_query := NULLIF(trim(COALESCE(p_query, '')), '');
  v_limit := LEAST(GREATEST(COALESCE(p_limit, 200), 1), 1000);

  SELECT jsonb_build_object(
    'source', 'supabase',
    'generatedAt', NOW(),
    'site', (
      SELECT jsonb_build_object(
        'id', s.id,
        'name', s.name,
        'code', s.code,
        'city', s.city,
        'district', s.district,
        'totalUnits', s.total_units
      )
      FROM public.sites s
      WHERE s.id = v_site_id
    ),
    'summary', jsonb_build_object(
      'totalUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND u.site_id = v_site_id),
      'occupiedUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND u.site_id = v_site_id AND u.occupancy_status = 'occupied'),
      'reservedUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND u.site_id = v_site_id AND u.occupancy_status = 'reserved'),
      'vacantUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND u.site_id = v_site_id AND u.occupancy_status = 'vacant'),
      'blockedUnits', (SELECT count(*) FROM public.units u WHERE u.company_id = v_company_id AND u.site_id = v_site_id AND u.occupancy_status = 'blocked'),
      'blockCount', (SELECT count(*) FROM public.site_blocks b WHERE b.company_id = v_company_id AND b.site_id = v_site_id),
      'floorCount', (SELECT count(*) FROM public.site_floors f WHERE f.company_id = v_company_id AND f.site_id = v_site_id)
    ),
    'blocks', COALESCE((
      SELECT jsonb_agg(row_to_json(blocks))
      FROM (
        SELECT
          b.name,
          b.sort_order,
          count(u.id) AS total_units,
          count(u.id) FILTER (WHERE u.occupancy_status = 'occupied') AS occupied_units,
          count(u.id) FILTER (WHERE u.occupancy_status = 'reserved') AS reserved_units,
          count(u.id) FILTER (WHERE u.occupancy_status = 'vacant') AS vacant_units,
          count(u.id) FILTER (WHERE u.occupancy_status = 'blocked') AS blocked_units,
          count(u.id) FILTER (WHERE u.sale_status = 'available') AS available_for_sale,
          count(u.id) FILTER (WHERE u.sale_status = 'sold') AS sold_units,
          count(u.id) FILTER (WHERE u.sale_status = 'source_missing') AS source_missing_units,
          min(u.list_price_eur_cents) FILTER (
            WHERE u.sale_status = 'available' AND u.list_price_eur_cents IS NOT NULL
          ) AS min_buy_now_eur_cents,
          max(u.list_price_eur_cents) FILTER (
            WHERE u.sale_status = 'available' AND u.list_price_eur_cents IS NOT NULL
          ) AS max_buy_now_eur_cents,
          CASE
            WHEN count(u.id) FILTER (WHERE u.price_source IS NOT NULL) > 0 THEN 'parsed'
            ELSE 'missing'
          END AS price_source_status,
          min(u.numbering_source) FILTER (WHERE u.numbering_source IS NOT NULL) AS numbering_source
        FROM public.site_blocks b
        LEFT JOIN public.units u ON u.block_id = b.id
        WHERE b.company_id = v_company_id AND b.site_id = v_site_id
        GROUP BY b.id, b.name, b.sort_order
        ORDER BY b.sort_order, b.name
      ) blocks
    ), '[]'::jsonb),
    'units', COALESCE((
      SELECT jsonb_agg(row_to_json(units))
      FROM (
        SELECT
          u.id,
          u.unit_no,
          u.unit_type,
          u.occupancy_status,
          u.ownership_status,
          u.size_sqm,
          u.bedrooms,
          b.name AS block_name,
          f.label AS floor_label,
          f.level AS floor_level,
          u.sale_status,
          u.list_price_eur_cents,
          u.next_price_eur_cents,
          u.price_source,
          u.numbering_source,
          u.source_notes,
          u.source_metadata,
          COALESCE(ledger.balance_cents, 0) AS balance_cents,
          COALESCE(ledger.open_entries, 0) AS open_finance_entries,
          COALESCE(tickets.open_ticket_count, 0) AS open_ticket_count,
          CASE
            WHEN COALESCE(ledger.balance_cents, 0) > 0 THEN 'restricted'
            ELSE 'active'
          END AS access_status,
          CASE
            WHEN COALESCE(ledger.overdue_entries, 0) > 0 THEN 'overdue'
            WHEN COALESCE(ledger.balance_cents, 0) > 0 THEN 'minor_debt'
            ELSE 'clear'
          END AS payment_status,
          (
            SELECT r.full_name
            FROM public.unit_residents ur
            JOIN public.residents r ON r.id = ur.resident_id
            WHERE ur.unit_id = u.id AND ur.relationship = 'owner'
            ORDER BY ur.is_primary DESC, ur.start_date DESC NULLS LAST, ur.created_at DESC
            LIMIT 1
          ) AS owner_name,
          (
            SELECT r.full_name
            FROM public.unit_residents ur
            JOIN public.residents r ON r.id = ur.resident_id
            WHERE ur.unit_id = u.id AND ur.relationship IN ('tenant', 'guest', 'family')
            ORDER BY ur.is_primary DESC, ur.start_date DESC NULLS LAST, ur.created_at DESC
            LIMIT 1
          ) AS resident_name
        FROM public.units u
        LEFT JOIN public.site_blocks b ON b.id = u.block_id
        LEFT JOIN public.site_floors f ON f.id = u.floor_id
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(
              SUM(fle.amount_cents) FILTER (
                WHERE fle.status IN ('open', 'partially_paid', 'overdue')
                  AND fle.entry_type <> 'payment'
              ),
              0
            ) AS balance_cents,
            count(*) FILTER (
              WHERE fle.status IN ('open', 'partially_paid', 'overdue')
                AND fle.entry_type <> 'payment'
            ) AS open_entries,
            count(*) FILTER (
              WHERE fle.status = 'overdue'
                AND fle.entry_type <> 'payment'
            ) AS overdue_entries
          FROM public.finance_ledger_entries fle
          WHERE fle.unit_id = u.id
            AND fle.company_id = v_company_id
            AND fle.site_id = v_site_id
        ) ledger ON TRUE
        LEFT JOIN LATERAL (
          SELECT count(*) AS open_ticket_count
          FROM public.service_tickets st
          WHERE st.unit_id = u.id
            AND st.company_id = v_company_id
            AND st.site_id = v_site_id
            AND st.status NOT IN ('resolved', 'closed', 'cancelled')
        ) tickets ON TRUE
        WHERE
          u.company_id = v_company_id
          AND u.site_id = v_site_id
          AND (
            v_query IS NULL
            OR u.unit_no ILIKE '%' || v_query || '%'
            OR u.sale_status ILIKE '%' || v_query || '%'
            OR u.price_source ILIKE '%' || v_query || '%'
            OR u.source_notes ILIKE '%' || v_query || '%'
            OR u.source_metadata->>'displayNumber' ILIKE '%' || v_query || '%'
            OR u.source_metadata->>'areaText' ILIKE '%' || v_query || '%'
            OR b.name ILIKE '%' || v_query || '%'
            OR EXISTS (
              SELECT 1
              FROM public.unit_residents ur
              JOIN public.residents r ON r.id = ur.resident_id
              WHERE ur.unit_id = u.id AND r.full_name ILIKE '%' || v_query || '%'
            )
          )
        ORDER BY u.unit_no
        LIMIT v_limit
      ) units
    ), '[]'::jsonb),
    'importSummary', jsonb_build_object(
      'totalRows', COALESCE((SELECT sum(total_rows) FROM public.import_batches WHERE company_id = v_company_id), 0),
      'validRows', COALESCE((SELECT sum(valid_rows) FROM public.import_batches WHERE company_id = v_company_id), 0),
      'warningRows', COALESCE((SELECT sum(warning_rows) FROM public.import_batches WHERE company_id = v_company_id), 0),
      'rejectedRows', COALESCE((SELECT sum(rejected_rows) FROM public.import_batches WHERE company_id = v_company_id), 0),
      'readyBatches', COALESCE((SELECT count(*) FROM public.import_batches WHERE company_id = v_company_id AND status IN ('validated', 'ready_to_apply', 'applied')), 0)
    ),
    'importBatches', COALESCE((
      SELECT jsonb_agg(row_to_json(batches))
      FROM (
        SELECT
          b.id,
          b.source_name,
          b.entity_type,
          b.total_rows,
          b.valid_rows,
          b.warning_rows,
          b.rejected_rows,
          b.status,
          b.checked_at,
          b.applied_at
        FROM public.import_batches b
        WHERE b.company_id = v_company_id
        ORDER BY b.checked_at DESC, b.created_at DESC
      ) batches
    ), '[]'::jsonb),
    'importFindings', COALESCE((
      SELECT jsonb_agg(row_to_json(findings))
      FROM (
        SELECT
          f.id,
          f.import_batch_id,
          f.severity,
          f.area,
          f.affected_rows,
          f.message,
          f.recommended_action,
          f.created_at
        FROM public.import_findings f
        WHERE f.company_id = v_company_id
        ORDER BY
          CASE f.severity WHEN 'error' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
          f.created_at DESC
        LIMIT 12
      ) findings
    ), '[]'::jsonb),
    'recentActions', COALESCE((
      SELECT jsonb_agg(row_to_json(actions))
      FROM (
        SELECT
          a.id,
          a.action_type,
          a.entity_table,
          a.entity_external_id,
          a.title,
          a.status,
          a.created_at
        FROM public.client_action_requests a
        WHERE a.company_id = v_company_id AND a.entity_table IN ('import_batches', 'units')
        ORDER BY a.created_at DESC
        LIMIT 8
      ) actions
    ), '[]'::jsonb)
  ) INTO v_payload;

  RETURN v_payload;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_phase4_site_data(TEXT, INTEGER) TO authenticated;
