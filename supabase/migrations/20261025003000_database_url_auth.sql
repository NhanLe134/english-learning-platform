ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT 'Learner',
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.profiles
  ALTER COLUMN password_hash DROP NOT NULL;

DO $migration$
DECLARE
  constraint_name TEXT;
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    FOR constraint_name IN
      SELECT constraint_row.conname
      FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid = 'public.profiles'::regclass
        AND constraint_row.confrelid = 'auth.users'::regclass
        AND constraint_row.contype = 'f'
        AND constraint_row.conkey = ARRAY[
          (SELECT attribute.attnum
           FROM pg_attribute AS attribute
           WHERE attribute.attrelid = 'public.profiles'::regclass
             AND attribute.attname = 'id')
        ]::SMALLINT[]
        AND constraint_row.confkey = ARRAY[
          (SELECT attribute.attnum
           FROM pg_attribute AS attribute
           WHERE attribute.attrelid = 'auth.users'::regclass
             AND attribute.attname = 'id')
        ]::SMALLINT[]
    LOOP
      EXECUTE format(
        'ALTER TABLE public.profiles DROP CONSTRAINT %I',
        constraint_name
      );
    END LOOP;
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    UPDATE public.profiles AS profile
    SET email = auth_user.email
    FROM auth.users AS auth_user
    WHERE profile.id = auth_user.id
      AND profile.email IS NULL;
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT lower(trim(email))
    FROM public.profiles
    WHERE email IS NOT NULL
    GROUP BY lower(trim(email))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'profiles contains case-insensitive duplicate emails; resolve them before applying the auth migration';
  END IF;
END;
$migration$;

UPDATE public.profiles
SET email = lower(trim(email))
WHERE email IS NOT NULL
  AND email <> lower(trim(email));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_case_insensitive_uidx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.auth_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.auth_credentials (user_id, password_hash)
SELECT id, password_hash
FROM public.profiles
WHERE password_hash IS NOT NULL
  AND length(password_hash) = 60
  AND left(password_hash, 4) IN ('$2a$', '$2b$', '$2y$')
ON CONFLICT (user_id) DO NOTHING;

UPDATE public.profiles
SET password_hash = NULL
WHERE password_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx
  ON public.auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_active_expiry_idx
  ON public.auth_sessions (expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx
  ON public.password_reset_tokens (user_id);

ALTER TABLE public.auth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.auth_credentials FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.auth_sessions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM PUBLIC, anon, authenticated;
