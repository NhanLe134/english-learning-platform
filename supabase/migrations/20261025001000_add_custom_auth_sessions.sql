ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles AS profile
SET email = auth_user.email
FROM auth.users AS auth_user
WHERE profile.id = auth_user.id
  AND profile.email IS NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'phone'
  ) THEN
    UPDATE public.profiles
    SET phone_number = phone
    WHERE phone_number IS NULL
      AND phone IS NOT NULL;
  END IF;
END;
$migration$;

DO $migration$
DECLARE
  role_type TEXT;
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    SELECT format_type(attribute.atttypid, attribute.atttypmod)
    INTO role_type
    FROM pg_attribute AS attribute
    WHERE attribute.attrelid = 'public.profiles'::regclass
      AND attribute.attname = 'role'
      AND NOT attribute.attisdropped;

    EXECUTE format(
      'UPDATE public.profiles AS profile
       SET role = upper(user_role.role::text)::%s
       FROM public.user_roles AS user_role
       WHERE user_role.user_id = profile.id
         AND upper(user_role.role::text) IN (''STUDENT'', ''TEACHER'', ''ADMIN'')
         AND (
           upper(user_role.role::text) = ''ADMIN''
           OR (upper(user_role.role::text) = ''TEACHER'' AND profile.role::text <> ''ADMIN'')
           OR (upper(user_role.role::text) = ''STUDENT'' AND profile.role::text = ''STUDENT'')
         )',
      role_type
    );
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END;
$migration$;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT lower(email)
    FROM public.profiles
    WHERE email IS NOT NULL
    GROUP BY lower(email)
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'profiles contains case-insensitive duplicate emails; resolve them before applying the auth migration';
  END IF;
END;
$migration$;

UPDATE public.profiles
SET email = lower(email)
WHERE email IS NOT NULL
  AND email <> lower(email);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_case_insensitive_uidx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, is_verified)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(NEW.email, ''),
      'Learner'
    ),
    NEW.email,
    'STUDENT',
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER TABLE public.auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.auth_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.password_reset_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.auth_sessions TO service_role;
GRANT ALL ON TABLE public.password_reset_tokens TO service_role;

CREATE OR REPLACE FUNCTION public.rotate_auth_session(
  p_session_id UUID,
  p_previous_hash TEXT,
  p_next_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  changed_rows INTEGER;
BEGIN
  UPDATE public.auth_sessions
  SET refresh_token_hash = p_next_hash,
      expires_at = p_expires_at,
      last_used_at = now()
  WHERE id = p_session_id
    AND refresh_token_hash = p_previous_hash
    AND revoked_at IS NULL
    AND expires_at > now();

  GET DIAGNOSTICS changed_rows = ROW_COUNT;
  RETURN changed_rows > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_auth_session(p_session_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.auth_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE id = p_session_id;
$function$;

CREATE OR REPLACE FUNCTION public.issue_password_reset_token(
  p_user_id UUID,
  p_token_hash TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  PERFORM 1
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cannot issue reset token for a missing user';
  END IF;

  UPDATE public.password_reset_tokens
  SET used_at = COALESCE(used_at, now())
  WHERE user_id = p_user_id
    AND used_at IS NULL;

  INSERT INTO public.password_reset_tokens (user_id, token_hash, expires_at)
  VALUES (p_user_id, p_token_hash, p_expires_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_password_reset_token(p_token_hash TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  target_user_id UUID;
BEGIN
  UPDATE public.password_reset_tokens
  SET used_at = now()
  WHERE token_hash = p_token_hash
    AND used_at IS NULL
    AND expires_at > now()
  RETURNING user_id INTO target_user_id;

  IF target_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN target_user_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.revoke_user_auth_sessions(p_user_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $function$
  UPDATE public.auth_sessions
  SET revoked_at = COALESCE(revoked_at, now())
  WHERE user_id = p_user_id
    AND revoked_at IS NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.rotate_auth_session(UUID, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_auth_session(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_password_reset_token(UUID, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_password_reset_token(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.revoke_user_auth_sessions(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_auth_session(UUID, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_auth_session(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_password_reset_token(UUID, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_password_reset_token(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.revoke_user_auth_sessions(UUID)
  TO service_role;
