-- 20260926000001_extensions_core.sql
-- Extensions and Core Platform Tables

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Enum: public.app_role
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'student',
    'moderator',
    'instructor',
    'senior_instructor',
    'admin',
    'headmaster'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Default organization
INSERT INTO public.organizations (id, slug, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'vaughan-code-university', 'Vaughan Code University')
ON CONFLICT (id) DO NOTHING;

-- Profiles (mirrors auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  bio text,
  legacy_user_id text,
  xp int NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  subscription_tier text NOT NULL DEFAULT 'free',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

-- User Roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  granted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);

-- Role Permissions Mapping (populated via seed from shared/auth/permissions.ts)
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role public.app_role NOT NULL,
  permission text NOT NULL,
  PRIMARY KEY (role, permission)
);

-- Activity Log
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- App Settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, key)
);

-- Rate Limits
CREATE TABLE IF NOT EXISTS public.rate_limits (
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  count int NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

-- Indexes for core tables
CREATE INDEX IF NOT EXISTS idx_user_roles_user_org ON public.user_roles (user_id, organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_org ON public.activity_log (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_actor ON public.activity_log (actor_id);
