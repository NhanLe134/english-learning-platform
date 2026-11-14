-- Apply a verified gateway payment and grant the corresponding course access
-- in one PostgreSQL transaction. The service-role-only function is called only
-- after the backend validates the signed/authenticated gateway notification.
CREATE OR REPLACE FUNCTION public.confirm_course_order_payment(
  p_order_id UUID,
  p_provider_order_id TEXT,
  p_provider_transaction_id TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_order public.course_orders%ROWTYPE;
  v_previous_status TEXT;
  v_newly_paid BOOLEAN := false;
BEGIN
  IF p_provider_transaction_id IS NULL OR btrim(p_provider_transaction_id) = '' THEN
    RAISE EXCEPTION 'Verified provider transaction ID is required';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Verified payment amount must be greater than zero';
  END IF;
  IF p_provider_order_id IS NOT NULL AND btrim(p_provider_order_id) = '' THEN
    RAISE EXCEPTION 'Provider order reference must not be empty';
  END IF;

  SELECT * INTO v_order
  FROM public.course_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Course order not found';
  END IF;
  IF v_order.currency <> 'VND' OR v_order.amount <> p_amount THEN
    RAISE EXCEPTION 'Verified payment amount or currency does not match the order';
  END IF;
  IF v_order.provider_order_id IS NOT NULL
     AND p_provider_order_id IS DISTINCT FROM v_order.provider_order_id THEN
    RAISE EXCEPTION 'Provider order reference does not match';
  END IF;
  IF v_order.provider_transaction_id IS NOT NULL
     AND p_provider_transaction_id IS DISTINCT FROM v_order.provider_transaction_id THEN
    RAISE EXCEPTION 'A different transaction already paid this order';
  END IF;

  IF v_order.status = 'paid' THEN
    -- A duplicate verified notification may repair an enrollment left missing
    -- by an older non-atomic handler. Preserve the original paid_at timestamp.
    UPDATE public.course_orders
    SET provider_order_id = COALESCE(provider_order_id, p_provider_order_id),
        provider_transaction_id = COALESCE(provider_transaction_id, p_provider_transaction_id)
    WHERE id = p_order_id
    RETURNING * INTO v_order;
  ELSIF v_order.status IN ('pending', 'expired', 'failed', 'cancelled') THEN
    -- A delayed but verified capture supersedes a local hold/terminal state.
    -- Unverified or unsuccessful webhook events never reach this function.
    v_previous_status := v_order.status;
    UPDATE public.course_orders
    SET status = 'paid',
        provider_order_id = COALESCE(p_provider_order_id, provider_order_id),
        provider_transaction_id = p_provider_transaction_id,
        paid_at = now(),
        updated_at = now()
    WHERE id = p_order_id
      AND status = v_previous_status
    RETURNING * INTO v_order;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Course order changed while applying verified payment';
    END IF;
    v_newly_paid := true;
  ELSE
    RAISE EXCEPTION 'Course order cannot accept a verified payment in its current status';
  END IF;

  INSERT INTO public.course_enrollments (student_id, course_id, status)
  VALUES (v_order.student_id, v_order.course_id, 'active')
  ON CONFLICT (course_id, student_id) DO UPDATE
    SET status = CASE
      WHEN public.course_enrollments.status = 'cancelled' THEN 'active'
      ELSE public.course_enrollments.status
    END;

  UPDATE public.profiles
  SET status = 'active'
  WHERE id = v_order.student_id
    AND status = 'pending';

  RETURN jsonb_build_object(
    'order', to_jsonb(v_order),
    'isNewlyPaid', v_newly_paid
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.confirm_course_order_payment(UUID, TEXT, TEXT, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_course_order_payment(UUID, TEXT, TEXT, NUMERIC) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_course_order_payment(UUID, TEXT, TEXT, NUMERIC) TO service_role;
