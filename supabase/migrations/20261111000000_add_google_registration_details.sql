ALTER TABLE public.auth_registration_details
  ALTER COLUMN date_of_birth DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS google_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS auth_registration_details_google_id_uidx
  ON public.auth_registration_details (google_id)
  WHERE google_id IS NOT NULL;
