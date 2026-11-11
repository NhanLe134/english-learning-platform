CREATE TABLE IF NOT EXISTS public.registration_email_otps (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  otp_hash CHAR(64) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempt_count SMALLINT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_sent_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS registration_email_otps_expiry_idx
  ON public.registration_email_otps (expires_at)
  WHERE consumed_at IS NULL;

ALTER TABLE public.registration_email_otps ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.registration_email_otps FROM PUBLIC, anon, authenticated;
