CREATE TABLE IF NOT EXISTS public.auth_registration_details (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  date_of_birth DATE NOT NULL,
  selected_course_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.auth_registration_details ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_registration_details FROM PUBLIC, anon, authenticated;
