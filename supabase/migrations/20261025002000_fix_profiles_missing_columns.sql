-- Migration: Ensure profiles table has all columns required by the application
-- Safe to run multiple times (all DDL guarded with IF NOT EXISTS / IF EXISTS).
-- Fixes schema gap when 20261021235100 ran before 20261025001000, leaving
-- profiles without email, nickname, phone_number, role, and is_verified columns.
-- Also makes password_hash nullable (hash lives in auth.users, not profiles).

-- 1. Add missing columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email        TEXT,
  ADD COLUMN IF NOT EXISTS nickname     TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS role         TEXT NOT NULL DEFAULT 'STUDENT',
  ADD COLUMN IF NOT EXISTS is_verified  BOOLEAN NOT NULL DEFAULT false;

-- 2. Drop NOT NULL from password_hash if it exists
DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.profiles ALTER COLUMN password_hash DROP NOT NULL;
  END IF;
END;
$migration$;

-- 3. Back-fill email from auth.users for rows with NULL email
UPDATE public.profiles AS p
SET email = u.email
FROM auth.users AS u
WHERE p.id = u.id AND p.email IS NULL;

-- 4. Normalise email to lowercase
UPDATE public.profiles
SET email = lower(email)
WHERE email IS NOT NULL AND email <> lower(email);

-- 5. Unique index on lower(email)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_case_insensitive_uidx
  ON public.profiles (lower(email))
  WHERE email IS NOT NULL;

-- 6. Replace handle_new_user() to insert all required columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 7. Ensure the on_auth_user_created trigger exists
DO $migration$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
  END IF;
END;
$migration$;
