-- Durable, idempotent delivery state for verified payment confirmation emails.
CREATE TABLE public.payment_confirmation_email_outbox (
  order_id UUID PRIMARY KEY REFERENCES public.course_orders (id) ON DELETE CASCADE,
  email_to TEXT,
  customer_name TEXT NOT NULL DEFAULT '',
  course_title TEXT NOT NULL,
  course_slug TEXT,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting_for_enrollment'
    CHECK (status IN ('waiting_for_enrollment', 'pending', 'sending', 'sent', 'failed', 'needs_review')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  first_attempt_at TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX payment_confirmation_email_outbox_due_idx
  ON public.payment_confirmation_email_outbox (next_attempt_at)
  WHERE status IN ('pending', 'failed');

ALTER TABLE public.payment_confirmation_email_outbox ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER payment_confirmation_email_outbox_set_updated_at
  BEFORE UPDATE ON public.payment_confirmation_email_outbox
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Create the outbox row in the same transaction as the verified paid transition.
-- It remains blocked until the payment service has completed/retried enrollment.
CREATE OR REPLACE FUNCTION public.queue_payment_confirmation_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.payment_confirmation_email_outbox (
    order_id,
    email_to,
    customer_name,
    course_title,
    course_slug,
    amount,
    currency,
    payment_method,
    paid_at,
    status
  )
  SELECT
    NEW.id,
    profile.email,
    COALESCE(profile.full_name, ''),
    course.title,
    course.slug,
    NEW.amount,
    NEW.currency,
    'BANK_TRANSFER',
    NEW.paid_at,
    'waiting_for_enrollment'
  FROM public.profiles AS profile
  JOIN public.courses AS course ON course.id = NEW.course_id
  WHERE profile.id = NEW.student_id
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER course_orders_queue_payment_confirmation_email
  AFTER UPDATE OF status ON public.course_orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'paid')
  EXECUTE FUNCTION public.queue_payment_confirmation_email();
