-- Authoritative receipt layer for the IndexedDB offline queue.
--
-- The browser owns encrypted-at-rest-by-platform queue storage, tab leasing,
-- replay timing and logout purge. PostgreSQL owns the final allowlist,
-- authorization revalidation, strict sequence cursor, idempotency and conflict
-- receipts. Raw command payloads, note bodies and ticket descriptions are
-- deliberately not persisted in these tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.offline_sync_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_instance_id UUID NOT NULL,
  role_snapshot TEXT NOT NULL CHECK (
    role_snapshot IN ('admin', 'manager', 'staff', 'owner', 'tenant')
  ),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_terminal_sequence INTEGER NOT NULL DEFAULT 0 CHECK (last_terminal_sequence >= 0),
  blocked_sequence INTEGER CHECK (blocked_sequence IS NULL OR blocked_sequence > 0),
  last_sync_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT CHECK (
    revocation_reason IS NULL OR LENGTH(revocation_reason) <= 200
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (status = 'active' AND revoked_at IS NULL)
    OR (status = 'revoked' AND revoked_at IS NOT NULL)
  ),
  UNIQUE (actor_profile_id, client_instance_id)
);

CREATE TABLE IF NOT EXISTS public.offline_sync_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sync_client_id UUID NOT NULL REFERENCES public.offline_sync_clients(id) ON DELETE CASCADE,
  client_sequence INTEGER NOT NULL CHECK (client_sequence > 0),
  idempotency_key TEXT NOT NULL CHECK (LENGTH(idempotency_key) BETWEEN 8 AND 200),
  command_type TEXT NOT NULL CHECK (
    command_type IN ('ticket.create', 'ticket.field_note.append')
  ),
  expected_version INTEGER CHECK (expected_version IS NULL OR expected_version > 0),
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  payload_content_digest TEXT NOT NULL CHECK (payload_content_digest ~ '^[0-9a-f]{64}$'),
  client_payload_digest TEXT NOT NULL CHECK (client_payload_digest ~ '^[0-9a-f]{64}$'),
  payload_bytes INTEGER NOT NULL CHECK (payload_bytes BETWEEN 1 AND 8192),
  target_entity_id UUID,
  status TEXT NOT NULL DEFAULT 'received' CHECK (
    status IN ('received', 'applied', 'conflict', 'retryable', 'rejected', 'discarded')
  ),
  attempt_count INTEGER NOT NULL DEFAULT 1 CHECK (attempt_count BETWEEN 1 AND 8),
  result_entity_id UUID,
  result_version INTEGER CHECK (result_version IS NULL OR result_version > 0),
  server_version INTEGER CHECK (server_version IS NULL OR server_version > 0),
  error_code TEXT CHECK (error_code IS NULL OR LENGTH(error_code) <= 120),
  next_retry_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > created_at AND expires_at <= created_at + INTERVAL '72 hours'),
  CHECK (
    (status = 'retryable' AND next_retry_at IS NOT NULL)
    OR (status <> 'retryable' AND next_retry_at IS NULL)
  ),
  UNIQUE (sync_client_id, client_sequence),
  UNIQUE (company_id, actor_profile_id, idempotency_key)
);

COMMENT ON TABLE public.offline_sync_commands IS
  'Payload-free offline command receipts. Only digests, bounded metadata and entity identifiers are retained for at most seven days.';

CREATE TABLE IF NOT EXISTS public.offline_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sync_client_id UUID NOT NULL REFERENCES public.offline_sync_clients(id) ON DELETE CASCADE,
  command_id UUID REFERENCES public.offline_sync_commands(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'received', 'applied', 'conflict', 'retry_scheduled',
      'rejected', 'discarded', 'conflict_resolved', 'client_revoked'
    )
  ),
  event_key TEXT NOT NULL CHECK (LENGTH(event_key) BETWEEN 8 AND 240),
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB CHECK (
    jsonb_typeof(metadata) = 'object' AND OCTET_LENGTH(metadata::TEXT) <= 4000
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, event_key)
);

CREATE TABLE IF NOT EXISTS public.offline_sync_conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  command_id UUID NOT NULL REFERENCES public.offline_sync_commands(id) ON DELETE CASCADE,
  resolution TEXT NOT NULL CHECK (resolution IN ('discard', 'retry_with_current')),
  prior_server_version INTEGER,
  resolved_server_version INTEGER,
  actor_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  idempotency_key TEXT NOT NULL CHECK (LENGTH(idempotency_key) BETWEEN 8 AND 200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (company_id, idempotency_key),
  UNIQUE (command_id)
);

CREATE INDEX IF NOT EXISTS idx_offline_sync_client_cursor
  ON public.offline_sync_clients(actor_profile_id, client_instance_id, status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_command_replay
  ON public.offline_sync_commands(sync_client_id, client_sequence, status);
CREATE INDEX IF NOT EXISTS idx_offline_sync_command_expiry
  ON public.offline_sync_commands(expires_at);

CREATE OR REPLACE FUNCTION public.offline_sync_request_fingerprint(
  p_command_type TEXT,
  p_expected_version INTEGER,
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ENCODE(
    extensions.digest(
      CONVERT_TO(
        jsonb_build_object(
          'commandType', p_command_type,
          'expectedVersion', p_expected_version,
          'payload', p_payload
        )::TEXT,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.offline_sync_canonical_jsonb(p_value JSONB)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_result TEXT;
BEGIN
  CASE jsonb_typeof(p_value)
    WHEN 'object' THEN
      SELECT '{' || COALESCE(
        string_agg(
          TO_JSONB(entry.key)::TEXT || ':' ||
            public.offline_sync_canonical_jsonb(entry.value),
          ',' ORDER BY entry.key COLLATE "C"
        ),
        ''
      ) || '}'
      INTO v_result
      FROM jsonb_each(p_value) AS entry;
      RETURN v_result;
    WHEN 'array' THEN
      SELECT '[' || COALESCE(
        string_agg(
          public.offline_sync_canonical_jsonb(item.value),
          ',' ORDER BY item.ordinality
        ),
        ''
      ) || ']'
      INTO v_result
      FROM jsonb_array_elements(p_value)
        WITH ORDINALITY AS item(value, ordinality);
      RETURN v_result;
    ELSE
      RETURN p_value::TEXT;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.offline_sync_payload_content_digest(
  p_payload JSONB
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT ENCODE(
    extensions.digest(
      CONVERT_TO(public.offline_sync_canonical_jsonb(p_payload), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.offline_sync_domain_key(
  p_actor_id UUID,
  p_client_instance_id UUID,
  p_idempotency_key TEXT
)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT 'offline:' || ENCODE(
    extensions.digest(
      CONVERT_TO(
        p_actor_id::TEXT || ':' || p_client_instance_id::TEXT || ':' || p_idempotency_key,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

CREATE OR REPLACE FUNCTION public.execute_offline_sync_command(
  p_client_instance_id UUID,
  p_client_sequence INTEGER,
  p_idempotency_key TEXT,
  p_command_type TEXT,
  p_expected_version INTEGER,
  p_payload JSONB,
  p_payload_digest TEXT,
  p_payload_bytes INTEGER
)
RETURNS TABLE (
  command_id UUID,
  status TEXT,
  command_type TEXT,
  client_sequence INTEGER,
  result_entity_id UUID,
  result_version INTEGER,
  server_version INTEGER,
  error_code TEXT,
  next_retry_at TIMESTAMPTZ,
  replayed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_company_id UUID;
  v_role TEXT;
  v_client public.offline_sync_clients%ROWTYPE;
  v_command public.offline_sync_commands%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
  v_event_id UUID;
  v_request_fingerprint TEXT;
  v_content_digest TEXT;
  v_server_payload_bytes INTEGER;
  v_domain_key TEXT;
  v_target_id UUID;
  v_sqlstate TEXT;
  v_is_retryable BOOLEAN;
  v_retry_seconds INTEGER;
BEGIN
  SELECT p.company_id, p.role
  INTO v_company_id, v_role
  FROM public.profiles p
  WHERE p.id = v_actor_id;

  IF v_actor_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and an active company profile are required.';
  END IF;
  IF p_client_instance_id IS NULL OR p_client_sequence IS NULL OR p_client_sequence < 1 THEN
    RAISE EXCEPTION 'Offline client identity and positive sequence are required.';
  END IF;
  IF COALESCE(p_idempotency_key, '') !~ '^[A-Za-z0-9._:-]{8,200}$' THEN
    RAISE EXCEPTION 'Offline idempotency key format is invalid.';
  END IF;
  IF p_command_type NOT IN ('ticket.create', 'ticket.field_note.append') THEN
    RAISE EXCEPTION 'This action requires an online authoritative check.';
  END IF;
  IF p_payload IS NULL
     OR jsonb_typeof(p_payload) <> 'object'
     OR OCTET_LENGTH(p_payload::TEXT) > 8192
     OR p_payload_bytes IS NULL
     OR p_payload_bytes NOT BETWEEN 1 AND 8192
  THEN
    RAISE EXCEPTION 'Offline payload is invalid or exceeds 8192 bytes.';
  END IF;
  IF p_payload_digest IS NULL
     OR p_payload_digest <> LOWER(p_payload_digest)
     OR p_payload_digest !~ '^[0-9a-f]{64}$'
  THEN
    RAISE EXCEPTION 'Offline payload digest must be lowercase SHA-256 hex.';
  END IF;

  IF p_command_type = 'ticket.create' THEN
    IF v_role NOT IN ('admin', 'manager', 'owner', 'tenant') OR p_expected_version IS NOT NULL THEN
      RAISE EXCEPTION 'Ticket creation is not offline-safe for the current role or version.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_payload) AS key_name
      WHERE key_name NOT IN (
        'siteId', 'unitId', 'title', 'description', 'category', 'priority'
      )
    ) THEN
      RAISE EXCEPTION 'Ticket payload contains an online-only or unknown field.';
    END IF;
    IF jsonb_typeof(p_payload -> 'siteId') <> 'string'
       OR COALESCE(p_payload ->> 'siteId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR jsonb_typeof(p_payload -> 'unitId') <> 'string'
       OR COALESCE(p_payload ->> 'unitId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR NULLIF(BTRIM(p_payload ->> 'title'), '') IS NULL
       OR LENGTH(p_payload ->> 'title') > 160
       OR NULLIF(BTRIM(p_payload ->> 'category'), '') IS NULL
       OR LENGTH(p_payload ->> 'category') > 100
       OR COALESCE(p_payload ->> 'priority', '') NOT IN ('low', 'normal', 'high')
       OR (
         p_payload ? 'description'
         AND (
           jsonb_typeof(p_payload -> 'description') <> 'string'
           OR LENGTH(p_payload ->> 'description') > 1200
         )
       )
    THEN
      RAISE EXCEPTION 'Ticket payload is invalid or requests urgent/emergency handling.';
    END IF;
  ELSE
    IF v_role NOT IN ('admin', 'manager', 'staff')
       OR p_expected_version IS NULL
       OR p_expected_version < 1
    THEN
      RAISE EXCEPTION 'Field notes require assigned staff/manager and an observed ticket version.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_payload) AS key_name
      WHERE key_name NOT IN ('ticketId', 'body', 'visibility')
    ) THEN
      RAISE EXCEPTION 'Field-note payload contains an online-only or unknown field.';
    END IF;
    IF jsonb_typeof(p_payload -> 'ticketId') <> 'string'
       OR COALESCE(p_payload ->> 'ticketId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR NULLIF(BTRIM(p_payload ->> 'body'), '') IS NULL
       OR LENGTH(p_payload ->> 'body') > 1000
       OR p_payload ->> 'visibility' <> 'internal'
    THEN
      RAISE EXCEPTION 'Offline field-note payload is invalid.';
    END IF;
    v_target_id := (p_payload ->> 'ticketId')::UUID;
  END IF;

  v_request_fingerprint := public.offline_sync_request_fingerprint(
    p_command_type, p_expected_version, p_payload
  );
  v_content_digest := public.offline_sync_payload_content_digest(p_payload);
  v_server_payload_bytes := OCTET_LENGTH(CONVERT_TO(p_payload::TEXT, 'UTF8'));
  IF p_payload_digest IS DISTINCT FROM v_content_digest THEN
    RAISE EXCEPTION 'Offline payload digest does not match the submitted payload.';
  END IF;
  v_domain_key := public.offline_sync_domain_key(
    v_actor_id, p_client_instance_id, p_idempotency_key
  );

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      v_actor_id::TEXT || ':' || p_client_instance_id::TEXT,
      0
    )
  );

  INSERT INTO public.offline_sync_clients (
    company_id, actor_profile_id, client_instance_id, role_snapshot
  ) VALUES (
    v_company_id, v_actor_id, p_client_instance_id, v_role
  )
  ON CONFLICT (actor_profile_id, client_instance_id) DO NOTHING;

  SELECT c.* INTO v_client
  FROM public.offline_sync_clients c
  WHERE c.actor_profile_id = v_actor_id
    AND c.client_instance_id = p_client_instance_id
  FOR UPDATE;

  IF v_client.status <> 'active'
     OR v_client.company_id IS DISTINCT FROM v_company_id
     OR v_client.role_snapshot IS DISTINCT FROM v_role
  THEN
    RAISE EXCEPTION 'OFFLINE_SCOPE_CHANGED: purge queued commands before continuing.';
  END IF;

  SELECT c.* INTO v_command
  FROM public.offline_sync_commands c
  WHERE c.sync_client_id = v_client.id
    AND (
      c.client_sequence = p_client_sequence
      OR c.idempotency_key = p_idempotency_key
    )
  ORDER BY
    CASE WHEN c.client_sequence = p_client_sequence THEN 0 ELSE 1 END
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_command.client_sequence IS DISTINCT FROM p_client_sequence
       OR v_command.idempotency_key IS DISTINCT FROM p_idempotency_key
       OR v_command.command_type IS DISTINCT FROM p_command_type
       OR v_command.request_fingerprint IS DISTINCT FROM v_request_fingerprint
    THEN
      RAISE EXCEPTION 'Offline sequence or idempotency key was reused for a different command.';
    END IF;

    IF v_command.status <> 'retryable'
       OR v_command.next_retry_at > NOW()
       OR v_command.attempt_count >= 8
    THEN
      RETURN QUERY SELECT
        v_command.id, v_command.status, v_command.command_type,
        v_command.client_sequence, v_command.result_entity_id,
        v_command.result_version, v_command.server_version,
        v_command.error_code, v_command.next_retry_at, TRUE;
      RETURN;
    END IF;

    IF v_client.blocked_sequence IS NOT NULL
       OR p_client_sequence <> v_client.last_terminal_sequence + 1
    THEN
      RAISE EXCEPTION 'Offline replay is blocked by an earlier command.';
    END IF;

    UPDATE public.offline_sync_commands c
    SET
      status = 'received',
      attempt_count = c.attempt_count + 1,
      next_retry_at = NULL,
      error_code = NULL,
      updated_at = NOW()
    WHERE c.id = v_command.id
    RETURNING * INTO v_command;
  ELSE
    IF v_client.blocked_sequence IS NOT NULL THEN
      RAISE EXCEPTION 'Offline replay is blocked by an unresolved conflict.';
    END IF;
    IF p_client_sequence <> v_client.last_terminal_sequence + 1 THEN
      RAISE EXCEPTION 'Offline commands must replay in strict sequence order.';
    END IF;
    IF (
      SELECT COUNT(*)
      FROM public.offline_sync_commands pending
      WHERE pending.sync_client_id = v_client.id
        AND pending.status IN ('received', 'retryable', 'conflict')
        AND pending.expires_at > NOW()
    ) >= 50 THEN
      RAISE EXCEPTION 'Offline server receipt queue is full.';
    END IF;

    INSERT INTO public.offline_sync_commands (
      company_id, actor_profile_id, sync_client_id, client_sequence,
      idempotency_key, command_type, expected_version, request_fingerprint,
      payload_content_digest, client_payload_digest, payload_bytes,
      target_entity_id
    ) VALUES (
      v_company_id, v_actor_id, v_client.id, p_client_sequence,
      p_idempotency_key, p_command_type, p_expected_version,
      v_request_fingerprint, v_content_digest, p_payload_digest,
      v_server_payload_bytes, v_target_id
    )
    RETURNING * INTO v_command;
  END IF;

  INSERT INTO public.offline_sync_events (
    company_id, sync_client_id, command_id, event_type, event_key,
    actor_profile_id, metadata
  ) VALUES (
    v_company_id, v_client.id, v_command.id, 'received',
    'received:' || v_command.id::TEXT || ':' || v_command.attempt_count::TEXT,
    v_actor_id,
    jsonb_build_object(
      'commandType', v_command.command_type,
      'clientSequence', v_command.client_sequence,
      'attemptCount', v_command.attempt_count
    )
  ) ON CONFLICT (company_id, event_key) DO NOTHING;

  BEGIN
    IF p_command_type = 'ticket.create' THEN
      v_ticket := public.create_service_ticket_command(
        v_domain_key,
        (p_payload ->> 'siteId')::UUID,
        (p_payload ->> 'unitId')::UUID,
        BTRIM(p_payload ->> 'title'),
        NULLIF(BTRIM(p_payload ->> 'description'), ''),
        BTRIM(p_payload ->> 'category'),
        p_payload ->> 'priority',
        NULL,
        NULL,
        NULL,
        NULL,
        v_request_fingerprint
      );
      v_target_id := v_ticket.id;
      UPDATE public.offline_sync_commands c
      SET target_entity_id = v_ticket.id
      WHERE c.id = v_command.id;
    ELSE
      v_event_id := public.append_service_ticket_event_command(
        (p_payload ->> 'ticketId')::UUID,
        p_expected_version,
        'evidence_note',
        BTRIM(p_payload ->> 'body'),
        'internal',
        v_domain_key,
        jsonb_build_object('source', 'offline_sync')
      );
      SELECT t.* INTO v_ticket
      FROM public.service_tickets t
      WHERE t.id = (p_payload ->> 'ticketId')::UUID;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
      v_is_retryable :=
        v_sqlstate LIKE '08%'
        OR v_sqlstate IN ('40P01', '55P03', '57014', '57P01', '53300');

      IF v_sqlstate = '40001' THEN
        IF v_target_id IS NOT NULL THEN
          SELECT t.workflow_version INTO v_command.server_version
          FROM public.service_tickets t
          WHERE t.id = v_target_id;
        END IF;
        UPDATE public.offline_sync_commands c
        SET
          status = 'conflict',
          server_version = v_command.server_version,
          error_code = 'OFFLINE_VERSION_CONFLICT',
          next_retry_at = NULL,
          updated_at = NOW()
        WHERE c.id = v_command.id
        RETURNING * INTO v_command;
        UPDATE public.offline_sync_clients c
        SET
          blocked_sequence = v_command.client_sequence,
          last_seen_at = NOW(),
          updated_at = NOW()
        WHERE c.id = v_client.id;
        INSERT INTO public.offline_sync_events (
          company_id, sync_client_id, command_id, event_type, event_key,
          actor_profile_id, metadata
        ) VALUES (
          v_company_id, v_client.id, v_command.id, 'conflict',
          'conflict:' || v_command.id::TEXT,
          v_actor_id,
          jsonb_build_object(
            'clientSequence', v_command.client_sequence,
            'serverVersion', v_command.server_version
          )
        ) ON CONFLICT (company_id, event_key) DO NOTHING;
      ELSIF v_is_retryable AND v_command.attempt_count < 8 THEN
        v_retry_seconds := LEAST(
          300,
          (2 * POWER(2, v_command.attempt_count - 1))::INTEGER
        );
        UPDATE public.offline_sync_commands c
        SET
          status = 'retryable',
          error_code = 'OFFLINE_TRANSIENT_FAILURE',
          next_retry_at = NOW() + make_interval(secs => v_retry_seconds),
          updated_at = NOW()
        WHERE c.id = v_command.id
        RETURNING * INTO v_command;
        INSERT INTO public.offline_sync_events (
          company_id, sync_client_id, command_id, event_type, event_key,
          actor_profile_id, metadata
        ) VALUES (
          v_company_id, v_client.id, v_command.id, 'retry_scheduled',
          'retry:' || v_command.id::TEXT || ':' || v_command.attempt_count::TEXT,
          v_actor_id,
          jsonb_build_object(
            'attemptCount', v_command.attempt_count,
            'retryAfterSeconds', v_retry_seconds
          )
        ) ON CONFLICT (company_id, event_key) DO NOTHING;
      ELSE
        UPDATE public.offline_sync_commands c
        SET
          status = 'rejected',
          error_code = CASE
            WHEN v_is_retryable THEN 'OFFLINE_RETRY_EXHAUSTED'
            ELSE 'OFFLINE_COMMAND_REJECTED'
          END,
          next_retry_at = NULL,
          updated_at = NOW()
        WHERE c.id = v_command.id
        RETURNING * INTO v_command;
        UPDATE public.offline_sync_clients c
        SET
          last_terminal_sequence = v_command.client_sequence,
          last_sync_at = NOW(),
          last_seen_at = NOW(),
          updated_at = NOW()
        WHERE c.id = v_client.id;
        INSERT INTO public.offline_sync_events (
          company_id, sync_client_id, command_id, event_type, event_key,
          actor_profile_id, metadata
        ) VALUES (
          v_company_id, v_client.id, v_command.id, 'rejected',
          'rejected:' || v_command.id::TEXT,
          v_actor_id,
          jsonb_build_object(
            'clientSequence', v_command.client_sequence,
            'errorCode', v_command.error_code
          )
        ) ON CONFLICT (company_id, event_key) DO NOTHING;
      END IF;

      RETURN QUERY SELECT
        v_command.id, v_command.status, v_command.command_type,
        v_command.client_sequence, v_command.result_entity_id,
        v_command.result_version, v_command.server_version,
        v_command.error_code, v_command.next_retry_at, FALSE;
      RETURN;
  END;

  UPDATE public.offline_sync_commands c
  SET
    status = 'applied',
    target_entity_id = COALESCE(c.target_entity_id, v_target_id),
    result_entity_id = CASE
      WHEN p_command_type = 'ticket.create' THEN v_ticket.id
      ELSE v_event_id
    END,
    result_version = v_ticket.workflow_version,
    server_version = v_ticket.workflow_version,
    error_code = NULL,
    next_retry_at = NULL,
    applied_at = NOW(),
    updated_at = NOW()
  WHERE c.id = v_command.id
  RETURNING * INTO v_command;

  UPDATE public.offline_sync_clients c
  SET
    last_terminal_sequence = v_command.client_sequence,
    last_sync_at = NOW(),
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE c.id = v_client.id;

  INSERT INTO public.offline_sync_events (
    company_id, sync_client_id, command_id, event_type, event_key,
    actor_profile_id, metadata
  ) VALUES (
    v_company_id, v_client.id, v_command.id, 'applied',
    'applied:' || v_command.id::TEXT,
    v_actor_id,
    jsonb_build_object(
      'commandType', v_command.command_type,
      'clientSequence', v_command.client_sequence,
      'resultVersion', v_command.result_version
    )
  ) ON CONFLICT (company_id, event_key) DO NOTHING;

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    after_data, idempotency_key
  ) VALUES (
    v_company_id, v_actor_id, 'offline_sync.command_applied',
    'offline_sync_commands', v_command.id,
    jsonb_build_object(
      'commandType', v_command.command_type,
      'clientSequence', v_command.client_sequence,
      'resultEntityId', v_command.result_entity_id,
      'resultVersion', v_command.result_version
    ),
    'offline-sync:applied:' || p_idempotency_key
  );

  RETURN QUERY SELECT
    v_command.id, v_command.status, v_command.command_type,
    v_command.client_sequence, v_command.result_entity_id,
    v_command.result_version, v_command.server_version,
    v_command.error_code, v_command.next_retry_at, FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_offline_sync_conflict_command(
  p_command_id UUID,
  p_resolution TEXT,
  p_new_expected_version INTEGER,
  p_payload JSONB,
  p_payload_digest TEXT,
  p_payload_bytes INTEGER,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  command_id UUID,
  status TEXT,
  command_type TEXT,
  client_sequence INTEGER,
  result_entity_id UUID,
  result_version INTEGER,
  server_version INTEGER,
  error_code TEXT,
  next_retry_at TIMESTAMPTZ,
  replayed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_company_id UUID;
  v_role TEXT;
  v_client public.offline_sync_clients%ROWTYPE;
  v_command public.offline_sync_commands%ROWTYPE;
  v_existing public.offline_sync_conflict_resolutions%ROWTYPE;
  v_ticket public.service_tickets%ROWTYPE;
  v_event_id UUID;
  v_domain_key TEXT;
  v_sqlstate TEXT;
  v_prior_server_version INTEGER;
  v_server_payload_bytes INTEGER;
BEGIN
  SELECT p.company_id, p.role
  INTO v_company_id, v_role
  FROM public.profiles p
  WHERE p.id = v_actor_id;

  IF v_actor_id IS NULL OR v_company_id IS NULL THEN
    RAISE EXCEPTION 'Authentication and an active company profile are required.';
  END IF;
  IF p_resolution NOT IN ('discard', 'retry_with_current') THEN
    RAISE EXCEPTION 'Conflict resolution must discard or retry_with_current.';
  END IF;
  IF COALESCE(p_idempotency_key, '') !~ '^[A-Za-z0-9._:-]{8,200}$' THEN
    RAISE EXCEPTION 'Conflict-resolution idempotency key format is invalid.';
  END IF;

  SELECT c.* INTO v_command
  FROM public.offline_sync_commands c
  WHERE c.id = p_command_id
    AND c.actor_profile_id = v_actor_id
    AND c.company_id = v_company_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offline conflict not found.';
  END IF;

  SELECT c.* INTO v_client
  FROM public.offline_sync_clients c
  WHERE c.id = v_command.sync_client_id
  FOR UPDATE;

  SELECT r.* INTO v_existing
  FROM public.offline_sync_conflict_resolutions r
  WHERE r.company_id = v_company_id
    AND (
      r.command_id = v_command.id
      OR r.idempotency_key = p_idempotency_key
    );
  IF FOUND THEN
    IF v_existing.command_id <> v_command.id
       OR v_existing.idempotency_key <> p_idempotency_key
       OR v_existing.resolution <> p_resolution
    THEN
      RAISE EXCEPTION 'Conflict-resolution idempotency key was already used.';
    END IF;
    RETURN QUERY SELECT
      v_command.id, v_command.status, v_command.command_type,
      v_command.client_sequence, v_command.result_entity_id,
      v_command.result_version, v_command.server_version,
      v_command.error_code, v_command.next_retry_at, TRUE;
    RETURN;
  END IF;

  IF v_command.status <> 'conflict'
     OR v_client.status <> 'active'
     OR v_client.blocked_sequence IS DISTINCT FROM v_command.client_sequence
     OR v_client.company_id IS DISTINCT FROM v_company_id
     OR v_client.role_snapshot IS DISTINCT FROM v_role
  THEN
    RAISE EXCEPTION 'Offline conflict is no longer resolvable in this authorization scope.';
  END IF;

  IF p_resolution = 'discard' THEN
    v_prior_server_version := v_command.server_version;
    UPDATE public.offline_sync_commands c
    SET
      status = 'discarded',
      error_code = 'OFFLINE_CONFLICT_DISCARDED',
      next_retry_at = NULL,
      updated_at = NOW()
    WHERE c.id = v_command.id
    RETURNING * INTO v_command;
  ELSE
    v_prior_server_version := v_command.server_version;
    IF v_command.command_type <> 'ticket.field_note.append'
       OR v_role NOT IN ('admin', 'manager', 'staff')
       OR p_new_expected_version IS NULL
       OR p_new_expected_version < 1
       OR p_payload IS NULL
       OR jsonb_typeof(p_payload) <> 'object'
       OR OCTET_LENGTH(p_payload::TEXT) > 8192
       OR p_payload_bytes IS NULL
       OR p_payload_bytes NOT BETWEEN 1 AND 8192
       OR p_payload_digest IS NULL
       OR p_payload_digest <> LOWER(p_payload_digest)
       OR p_payload_digest !~ '^[0-9a-f]{64}$'
    THEN
      RAISE EXCEPTION 'This conflict cannot be retried with the supplied current state.';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM jsonb_object_keys(p_payload) AS key_name
      WHERE key_name NOT IN ('ticketId', 'body', 'visibility')
    ) OR jsonb_typeof(p_payload -> 'ticketId') <> 'string'
       OR COALESCE(p_payload ->> 'ticketId', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       OR NULLIF(BTRIM(p_payload ->> 'body'), '') IS NULL
       OR LENGTH(p_payload ->> 'body') > 1000
       OR p_payload ->> 'visibility' <> 'internal'
    THEN
      RAISE EXCEPTION 'Conflict retry field-note payload is invalid.';
    END IF;
    v_server_payload_bytes := OCTET_LENGTH(CONVERT_TO(p_payload::TEXT, 'UTF8'));
    IF (p_payload ->> 'ticketId')::UUID IS DISTINCT FROM v_command.target_entity_id
       OR public.offline_sync_payload_content_digest(p_payload)
          IS DISTINCT FROM v_command.payload_content_digest
       OR p_payload_digest IS DISTINCT FROM v_command.payload_content_digest
    THEN
      RAISE EXCEPTION 'Conflict retry payload differs from the original queued field note.';
    END IF;

    SELECT t.* INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = v_command.target_entity_id;
    IF NOT FOUND OR v_ticket.workflow_version IS DISTINCT FROM p_new_expected_version THEN
      RAISE EXCEPTION 'The supplied current ticket version is already stale.';
    END IF;

    v_domain_key := public.offline_sync_domain_key(
      v_actor_id, v_client.client_instance_id, v_command.idempotency_key
    );
    BEGIN
      v_event_id := public.append_service_ticket_event_command(
        v_command.target_entity_id,
        p_new_expected_version,
        'evidence_note',
        BTRIM(p_payload ->> 'body'),
        'internal',
        v_domain_key,
        jsonb_build_object('source', 'offline_sync_conflict_resolution')
      );
    EXCEPTION
      WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_sqlstate = RETURNED_SQLSTATE;
        IF v_sqlstate = '40001' THEN
          SELECT t.workflow_version INTO v_command.server_version
          FROM public.service_tickets t
          WHERE t.id = v_command.target_entity_id;
          UPDATE public.offline_sync_commands c
          SET
            server_version = v_command.server_version,
            error_code = 'OFFLINE_VERSION_CONFLICT',
            updated_at = NOW()
          WHERE c.id = v_command.id
          RETURNING * INTO v_command;
          RETURN QUERY SELECT
            v_command.id, v_command.status, v_command.command_type,
            v_command.client_sequence, v_command.result_entity_id,
            v_command.result_version, v_command.server_version,
            v_command.error_code, v_command.next_retry_at, FALSE;
          RETURN;
        END IF;
        RAISE;
    END;

    SELECT t.* INTO v_ticket
    FROM public.service_tickets t
    WHERE t.id = v_command.target_entity_id;

    UPDATE public.offline_sync_commands c
    SET
      status = 'applied',
      expected_version = p_new_expected_version,
      request_fingerprint = public.offline_sync_request_fingerprint(
        c.command_type, p_new_expected_version, p_payload
      ),
      client_payload_digest = p_payload_digest,
      payload_bytes = v_server_payload_bytes,
      result_entity_id = v_event_id,
      result_version = v_ticket.workflow_version,
      server_version = v_ticket.workflow_version,
      error_code = NULL,
      next_retry_at = NULL,
      applied_at = NOW(),
      updated_at = NOW()
    WHERE c.id = v_command.id
    RETURNING * INTO v_command;
  END IF;

  UPDATE public.offline_sync_clients c
  SET
    last_terminal_sequence = v_command.client_sequence,
    blocked_sequence = NULL,
    last_sync_at = NOW(),
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE c.id = v_client.id;

  INSERT INTO public.offline_sync_conflict_resolutions (
    company_id, command_id, resolution, prior_server_version,
    resolved_server_version, actor_profile_id, idempotency_key
  ) VALUES (
    v_company_id, v_command.id, p_resolution, v_prior_server_version,
    CASE WHEN p_resolution = 'retry_with_current' THEN v_command.result_version ELSE NULL END,
    v_actor_id, p_idempotency_key
  );

  INSERT INTO public.offline_sync_events (
    company_id, sync_client_id, command_id, event_type, event_key,
    actor_profile_id, metadata
  ) VALUES (
    v_company_id, v_client.id, v_command.id, 'conflict_resolved',
    'conflict-resolved:' || v_command.id::TEXT,
    v_actor_id,
    jsonb_build_object(
      'resolution', p_resolution,
      'clientSequence', v_command.client_sequence,
      'resolvedVersion', v_command.result_version
    )
  );

  INSERT INTO public.audit_events (
    company_id, actor_profile_id, action, entity_table, entity_id,
    after_data, idempotency_key
  ) VALUES (
    v_company_id, v_actor_id, 'offline_sync.conflict_resolved',
    'offline_sync_commands', v_command.id,
    jsonb_build_object(
      'resolution', p_resolution,
      'clientSequence', v_command.client_sequence,
      'resolvedVersion', v_command.result_version
    ),
    'offline-sync:resolve:' || p_idempotency_key
  );

  RETURN QUERY SELECT
    v_command.id, v_command.status, v_command.command_type,
    v_command.client_sequence, v_command.result_entity_id,
    v_command.result_version, v_command.server_version,
    v_command.error_code, v_command.next_retry_at, FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_offline_sync_receipts(
  p_client_instance_id UUID,
  p_after_sequence INTEGER DEFAULT 0
)
RETURNS TABLE (
  command_id UUID,
  status TEXT,
  command_type TEXT,
  client_sequence INTEGER,
  result_entity_id UUID,
  result_version INTEGER,
  server_version INTEGER,
  error_code TEXT,
  next_retry_at TIMESTAMPTZ,
  replayed BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.id,
    c.status,
    c.command_type,
    c.client_sequence,
    c.result_entity_id,
    c.result_version,
    c.server_version,
    c.error_code,
    c.next_retry_at,
    TRUE
  FROM public.offline_sync_commands c
  JOIN public.offline_sync_clients client ON client.id = c.sync_client_id
  WHERE client.actor_profile_id = (SELECT auth.uid())
    AND client.client_instance_id = p_client_instance_id
    AND c.client_sequence > GREATEST(COALESCE(p_after_sequence, 0), 0)
    AND c.expires_at > NOW()
  ORDER BY c.client_sequence
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_my_offline_sync_client_state(
  p_client_instance_id UUID
)
RETURNS TABLE (
  client_instance_id UUID,
  status TEXT,
  role_snapshot TEXT,
  last_terminal_sequence INTEGER,
  blocked_sequence INTEGER,
  last_sync_at TIMESTAMPTZ,
  scope_is_current BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    c.client_instance_id,
    c.status,
    c.role_snapshot,
    c.last_terminal_sequence,
    c.blocked_sequence,
    c.last_sync_at,
    (
      c.status = 'active'
      AND c.company_id = public.current_user_company_id()
      AND c.role_snapshot = public.current_user_profile_role()
    )
  FROM public.offline_sync_clients c
  WHERE c.actor_profile_id = (SELECT auth.uid())
    AND c.client_instance_id = p_client_instance_id;
$$;

CREATE OR REPLACE FUNCTION public.revoke_offline_sync_client_command(
  p_client_instance_id UUID,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID := (SELECT auth.uid());
  v_client public.offline_sync_clients%ROWTYPE;
BEGIN
  IF NULLIF(BTRIM(p_reason), '') IS NULL OR LENGTH(BTRIM(p_reason)) > 200 THEN
    RAISE EXCEPTION 'Offline-client revocation reason must contain 1 to 200 characters.';
  END IF;
  IF COALESCE(p_idempotency_key, '') !~ '^[A-Za-z0-9._:-]{8,200}$' THEN
    RAISE EXCEPTION 'Revocation idempotency key format is invalid.';
  END IF;

  SELECT c.* INTO v_client
  FROM public.offline_sync_clients c
  WHERE c.actor_profile_id = v_actor_id
    AND c.client_instance_id = p_client_instance_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;
  IF v_client.status = 'revoked' THEN
    RETURN TRUE;
  END IF;

  UPDATE public.offline_sync_clients c
  SET
    status = 'revoked',
    revoked_at = NOW(),
    revocation_reason = BTRIM(p_reason),
    last_seen_at = NOW(),
    updated_at = NOW()
  WHERE c.id = v_client.id
  RETURNING * INTO v_client;

  UPDATE public.offline_sync_commands c
  SET
    status = 'discarded',
    error_code = 'OFFLINE_CLIENT_REVOKED',
    next_retry_at = NULL,
    updated_at = NOW()
  WHERE c.sync_client_id = v_client.id
    AND c.status IN ('received', 'retryable', 'conflict');

  INSERT INTO public.offline_sync_events (
    company_id, sync_client_id, command_id, event_type, event_key,
    actor_profile_id, metadata
  ) VALUES (
    v_client.company_id, v_client.id, NULL, 'client_revoked',
    'client-revoked:' || p_idempotency_key,
    v_actor_id,
    jsonb_build_object('reason', BTRIM(p_reason))
  ) ON CONFLICT (company_id, event_key) DO NOTHING;

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_expired_offline_sync_receipts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  PERFORM pg_catalog.set_config(
    'app.allow_append_only_mutation',
    'on',
    TRUE
  );
  DELETE FROM public.offline_sync_commands c
  WHERE c.expires_at <= NOW();
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  PERFORM pg_catalog.set_config(
    'app.allow_append_only_mutation',
    'off',
    TRUE
  );
  RETURN v_deleted;
END;
$$;

DROP TRIGGER IF EXISTS protect_offline_sync_events
  ON public.offline_sync_events;
CREATE TRIGGER protect_offline_sync_events
  BEFORE UPDATE OR DELETE ON public.offline_sync_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

DROP TRIGGER IF EXISTS protect_offline_conflict_resolutions
  ON public.offline_sync_conflict_resolutions;
CREATE TRIGGER protect_offline_conflict_resolutions
  BEFORE UPDATE OR DELETE ON public.offline_sync_conflict_resolutions
  FOR EACH ROW EXECUTE FUNCTION public.reject_append_only_mutation();

ALTER TABLE public.offline_sync_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_sync_conflict_resolutions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.offline_sync_clients,
  public.offline_sync_commands,
  public.offline_sync_events,
  public.offline_sync_conflict_resolutions
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.offline_sync_request_fingerprint(TEXT, INTEGER, JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offline_sync_canonical_jsonb(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offline_sync_payload_content_digest(JSONB)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.offline_sync_domain_key(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.execute_offline_sync_command(
  UUID, INTEGER, TEXT, TEXT, INTEGER, JSONB, TEXT, INTEGER
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resolve_offline_sync_conflict_command(
  UUID, TEXT, INTEGER, JSONB, TEXT, INTEGER, TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_my_offline_sync_receipts(UUID, INTEGER)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_offline_sync_client_state(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revoke_offline_sync_client_command(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.purge_expired_offline_sync_receipts()
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.execute_offline_sync_command(
  UUID, INTEGER, TEXT, TEXT, INTEGER, JSONB, TEXT, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_offline_sync_conflict_command(
  UUID, TEXT, INTEGER, JSONB, TEXT, INTEGER, TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_offline_sync_receipts(UUID, INTEGER)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_offline_sync_client_state(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_offline_sync_client_command(UUID, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_offline_sync_receipts()
  TO service_role;

COMMENT ON FUNCTION public.execute_offline_sync_command(
  UUID, INTEGER, TEXT, TEXT, INTEGER, JSONB, TEXT, INTEGER
) IS
  'Strictly ordered, idempotent replay for ticket.create and ticket.field_note.append only. Payload is validated in-transaction and never persisted.';
COMMENT ON FUNCTION public.resolve_offline_sync_conflict_command(
  UUID, TEXT, INTEGER, JSONB, TEXT, INTEGER, TEXT
) IS
  'Visible manual resolution: discard, or revalidate the unchanged field-note payload against an explicitly current ticket version.';
