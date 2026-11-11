ALTER TABLE public.payment_confirmation_email_outbox
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS date_of_birth DATE,
  ADD COLUMN IF NOT EXISTS course_description TEXT,
  ADD COLUMN IF NOT EXISTS course_level TEXT,
  ADD COLUMN IF NOT EXISTS course_lesson_count INTEGER,
  ADD COLUMN IF NOT EXISTS course_count INTEGER NOT NULL DEFAULT 1
    CHECK (course_count > 0);

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
    phone_number,
    date_of_birth,
    course_title,
    course_slug,
    course_description,
    course_level,
    course_lesson_count,
    course_count,
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
    profile.phone_number,
    registration.date_of_birth,
    course.title,
    course.slug,
    course.description,
    course.level,
    course.total_lessons,
    1,
    NEW.amount,
    NEW.currency,
    'BANK_TRANSFER',
    NEW.paid_at,
    'waiting_for_enrollment'
  FROM public.profiles AS profile
  JOIN public.courses AS course ON course.id = NEW.course_id
  LEFT JOIN public.auth_registration_details AS registration ON registration.user_id = profile.id
  WHERE profile.id = NEW.student_id
  ON CONFLICT (order_id) DO NOTHING;

  RETURN NEW;
END;
$function$;
