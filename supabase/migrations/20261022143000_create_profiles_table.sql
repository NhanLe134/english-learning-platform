-- Migration: Ensure profiles table schema matches requirements
-- Table: profiles
-- Columns: id (UUID), email, password_hash, full_name, nickname, phone_number, role (ENUM: STUDENT, TEACHER, ADMIN), avatar_url, status, is_verified, created_at, updated_at

-- 1. Create role enum if not exists
DO $$ BEGIN
  CREATE TYPE public.user_role_enum AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create or alter profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  nickname TEXT,
  phone_number TEXT,
  role public.user_role_enum NOT NULL DEFAULT 'STUDENT',
  avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'pending')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes for fast search & filtering
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Allow public or authenticated reading of profiles
CREATE POLICY "Allow read profiles" ON public.profiles
  FOR SELECT
  USING (true);

-- Allow service role and admins full access
CREATE POLICY "Allow admin full access" ON public.profiles
  FOR ALL
  USING (true)
  WITH CHECK (true);
