-- Course orders for SePay VietQR payment integration
-- Tracks pending/paid course registration orders and links them to enrollments

CREATE TABLE public.course_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses (id) ON DELETE CASCADE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'VND',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  transfer_content TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'sepay'
    CHECK (provider IN ('sepay')),
  provider_transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX course_orders_student_id_idx ON public.course_orders (student_id);
CREATE INDEX course_orders_course_id_idx ON public.course_orders (course_id);
CREATE INDEX course_orders_status_idx ON public.course_orders (status);
CREATE INDEX course_orders_transfer_content_idx ON public.course_orders (transfer_content);

-- Enable Row Level Security
ALTER TABLE public.course_orders ENABLE ROW LEVEL SECURITY;

-- Students can read their own orders
CREATE POLICY course_orders_select_own
  ON public.course_orders FOR SELECT
  USING (auth.uid() = student_id);

-- Students can insert their own orders
CREATE POLICY course_orders_insert_own
  ON public.course_orders FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Service role can manage all orders (bypasses RLS)

-- Keep updated_at current
CREATE TRIGGER course_orders_set_updated_at
  BEFORE UPDATE ON public.course_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();