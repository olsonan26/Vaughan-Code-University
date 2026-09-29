-- Supabase Auth and Storage Stubs for Local Testing Harness

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  ELSE
    ALTER ROLE service_role BYPASSRLS;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id uuid,
  email text UNIQUE,
  encrypted_password text,
  email_confirmed_at timestamptz DEFAULT now(),
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data jsonb DEFAULT '{}'::jsonb,
  is_super_admin boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text DEFAULT NULL,
  phone_confirmed_at timestamptz,
  phone_change text DEFAULT '',
  phone_change_token text DEFAULT '',
  phone_change_sent_at timestamptz,
  email_change_token_current text DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0,
  banned_until timestamptz,
  reauthentication_token text DEFAULT '',
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false NOT NULL,
  deleted_at timestamptz
);

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'sub', '')::uuid,
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'user_id', '')::uuid
  );
$$;

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS jsonb
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true)::jsonb->>'role', ''),
    current_user
  );
$$;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/')) STORED,
  version text,
  owner_id text
);

CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql IMMUTABLE
AS $$
  SELECT string_to_array(name, '/');
$$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT (string_to_array(name, '/'))[cardinality(string_to_array(name, '/'))];
$$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT split_part(storage.filename(name), '.', 2);
$$;

GRANT USAGE ON SCHEMA public, auth, storage TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public, auth, storage TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth, storage TO authenticated, anon;
GRANT ALL ON storage.objects, storage.buckets TO authenticated;
