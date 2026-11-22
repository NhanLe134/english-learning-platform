CREATE TABLE IF NOT EXISTS public.teacher_activation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS teacher_activation_tokens_user_idx
  ON public.teacher_activation_tokens (user_id);
CREATE INDEX IF NOT EXISTS teacher_activation_tokens_expiry_idx
  ON public.teacher_activation_tokens (expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx
  ON public.password_reset_tokens (expires_at)
  WHERE used_at IS NULL;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'locked', 'pending', 'deactivated'));

ALTER TABLE public.teacher_activation_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.teacher_activation_tokens FROM PUBLIC, anon, authenticated;
