-- Admin payment management: audit log for admin reconciliation actions
-- Tracks when admins view, reconcile, or export payment orders.
CREATE TABLE public.admin_payment_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.course_orders (id) ON DELETE CASCADE,
  action TEXT NOT NULL
    CHECK (action IN ('view', 'reconcile_enrollment', 'export')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX admin_payment_actions_order_id_idx ON public.admin_payment_actions (order_id);
CREATE INDEX admin_payment_actions_admin_id_idx ON public.admin_payment_actions (admin_id);
CREATE INDEX admin_payment_actions_created_at_idx ON public.admin_payment_actions (created_at);

-- Enable Row Level Security (service-role bypasses RLS; backend uses service-role client)
ALTER TABLE public.admin_payment_actions ENABLE ROW LEVEL SECURITY;

-- Keep updated_at semantics consistent with other tables via set_updated_at() trigger
CREATE TRIGGER admin_payment_actions_set_updated_at
  BEFORE UPDATE ON public.admin_payment_actions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.admin_payment_actions IS 'Audit log for admin payment order actions (view, reconcile enrollment, export).';
COMMENT ON COLUMN public.admin_payment_actions.action IS 'Type of admin action performed on a payment order.';
COMMENT ON COLUMN public.admin_payment_actions.details IS 'Optional structured details about the action (e.g., previous enrollment status, new enrollment status).';
