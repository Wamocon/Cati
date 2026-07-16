-- Keep P0 response operationally visible and impossible to misread as a
-- finance/debt queue. Priced work is reviewed only after containment; work
-- with no charge has no finance workflow at all.

CREATE OR REPLACE FUNCTION public.enforce_p0_service_order_semantics()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_is_p0 BOOLEAN := FALSE;
BEGIN
  IF NEW.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT t.emergency_classification = 'rule_matched_p0'
    INTO v_is_p0
    FROM public.service_tickets AS t
   WHERE t.id = NEW.ticket_id;

  IF NOT COALESCE(v_is_p0, FALSE) THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('debt_check', 'payment_pending', 'blocked') THEN
    NEW.status := 'draft';
  END IF;

  NEW.debt_check_status := 'clear';
  NEW.payment_decision := CASE
    WHEN NEW.quoted_price_cents = 0 THEN 'no_charge'
    ELSE 'post_emergency_review'
  END;
  NEW.next_action := CASE
    WHEN NEW.status = 'completed'
      THEN 'Include completed work in service reporting.'
    WHEN NEW.quoted_price_cents = 0
      THEN 'Continue emergency containment and complete the field safety checklist.'
    ELSE 'Continue emergency containment; complete finance review afterwards.'
  END;
  NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', NEW.quoted_price_cents > 0
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_p0_service_order_semantics()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS service_orders_p0_semantics_guard
  ON public.service_orders;
CREATE TRIGGER service_orders_p0_semantics_guard
BEFORE INSERT OR UPDATE OF
  ticket_id,
  status,
  debt_check_status,
  payment_decision,
  quoted_price_cents,
  next_action,
  metadata
ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_p0_service_order_semantics();

CREATE OR REPLACE FUNCTION public.enforce_p0_workforce_finance_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_quoted_price_cents BIGINT;
BEGIN
  IF NEW.ticket_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT o.quoted_price_cents
    INTO v_quoted_price_cents
    FROM public.service_tickets AS t
    JOIN public.service_orders AS o ON o.ticket_id = t.id
   WHERE t.id = NEW.ticket_id
     AND t.emergency_classification = 'rule_matched_p0';

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  NEW.metadata := COALESCE(NEW.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', v_quoted_price_cents > 0
  );
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_p0_workforce_finance_metadata()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS workforce_tasks_p0_finance_metadata_guard
  ON public.workforce_tasks;
CREATE TRIGGER workforce_tasks_p0_finance_metadata_guard
BEFORE INSERT OR UPDATE OF ticket_id, metadata
ON public.workforce_tasks
FOR EACH ROW
EXECUTE FUNCTION public.enforce_p0_workforce_finance_metadata();

UPDATE public.service_orders AS o
SET
  status = CASE
    WHEN o.status IN ('debt_check', 'payment_pending', 'blocked') THEN 'draft'
    ELSE o.status
  END,
  debt_check_status = 'clear',
  payment_decision = CASE
    WHEN o.quoted_price_cents = 0 THEN 'no_charge'
    ELSE 'post_emergency_review'
  END,
  next_action = CASE
    WHEN o.status = 'completed'
      THEN 'Include completed work in service reporting.'
    WHEN o.quoted_price_cents = 0
      THEN 'Continue emergency containment and complete the field safety checklist.'
    ELSE 'Continue emergency containment; complete finance review afterwards.'
  END,
  metadata = COALESCE(o.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', o.quoted_price_cents > 0
  ),
  updated_at = clock_timestamp()
FROM public.service_tickets AS t
WHERE o.ticket_id = t.id
  AND t.emergency_classification = 'rule_matched_p0';

UPDATE public.workforce_tasks AS w
SET
  metadata = COALESCE(w.metadata, '{}'::JSONB) || jsonb_build_object(
    'emergencyContainment', TRUE,
    'financeBlocksDispatch', FALSE,
    'postEmergencyFinanceReviewRequired', o.quoted_price_cents > 0
  ),
  updated_at = clock_timestamp()
FROM public.service_tickets AS t
JOIN public.service_orders AS o ON o.ticket_id = t.id
WHERE w.ticket_id = t.id
  AND t.emergency_classification = 'rule_matched_p0';
