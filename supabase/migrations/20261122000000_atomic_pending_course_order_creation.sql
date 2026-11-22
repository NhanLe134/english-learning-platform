-- Serialize create-or-reuse for a student/course pair without rewriting or
-- deleting historical orders. A transaction-scoped advisory lock prevents
-- concurrent requests from inserting two active pending SePay orders.
CREATE OR REPLACE FUNCTION public.create_or_reuse_pending_course_order(
  p_order_id UUID,
  p_student_id UUID,
  p_course_id UUID,
  p_amount NUMERIC,
  p_transfer_content TEXT,
  p_expired_at TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
DECLARE
  v_order public.course_orders%ROWTYPE;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Course order amount must be greater than zero';
  END IF;
  IF p_transfer_content IS NULL OR btrim(p_transfer_content) = '' THEN
    RAISE EXCEPTION 'Course order transfer content is required';
  END IF;
  IF p_expired_at IS NULL OR p_expired_at <= now() THEN
    RAISE EXCEPTION 'Course order expiry must be in the future';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended('course-order:' || p_student_id::TEXT || ':' || p_course_id::TEXT, 0)
  );

  SELECT * INTO v_order
  FROM public.course_orders
  WHERE student_id = p_student_id
    AND course_id = p_course_id
    AND provider = 'sepay'
    AND status = 'pending'
    AND expired_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.course_orders (
      id, student_id, course_id, amount, currency, status,
      transfer_content, provider, expired_at, updated_at
    ) VALUES (
      p_order_id, p_student_id, p_course_id, p_amount, 'VND', 'pending',
      p_transfer_content, 'sepay', p_expired_at, now()
    )
    RETURNING * INTO v_order;
  END IF;

  RETURN jsonb_build_object('order', to_jsonb(v_order));
END;
$function$;

-- Route all order creation through the serialized backend RPC. Direct client
-- inserts would bypass the create-or-reuse lock.
DROP POLICY IF EXISTS course_orders_insert_own ON public.course_orders;

REVOKE ALL ON FUNCTION public.create_or_reuse_pending_course_order(UUID, UUID, UUID, NUMERIC, TEXT, TIMESTAMPTZ) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_or_reuse_pending_course_order(UUID, UUID, UUID, NUMERIC, TEXT, TIMESTAMPTZ) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_or_reuse_pending_course_order(UUID, UUID, UUID, NUMERIC, TEXT, TIMESTAMPTZ) TO service_role;
