-- Persist SePay's generated order.order_id separately from the merchant invoice
-- (transfer_content) and the payment transaction ID.
ALTER TABLE public.course_orders
  ADD COLUMN provider_order_id TEXT;

CREATE UNIQUE INDEX course_orders_provider_order_id_idx
  ON public.course_orders (provider_order_id)
  WHERE provider_order_id IS NOT NULL;
