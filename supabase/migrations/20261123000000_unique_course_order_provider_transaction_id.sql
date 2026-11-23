-- Prevent a single verified provider transaction from paying multiple course orders.
CREATE UNIQUE INDEX IF NOT EXISTS course_orders_provider_transaction_id_idx
  ON public.course_orders (provider_transaction_id)
  WHERE provider_transaction_id IS NOT NULL;
