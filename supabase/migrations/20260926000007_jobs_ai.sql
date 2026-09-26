-- 20260926000007_jobs_ai.sql
-- Database-Backed Job Queue and AI Request Auditing

DO $$ BEGIN
  CREATE TYPE public.job_state AS ENUM (
    'queued',
    'running',
    'paused',
    'retrying',
    'completed',
    'failed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.job_step_state AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'skipped',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Generation Jobs
CREATE TABLE IF NOT EXISTS public.generation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  state public.job_state NOT NULL DEFAULT 'queued',
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  progress numeric(5,2) NOT NULL DEFAULT 0.00,
  current_stage text,
  idempotency_key text,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  model text,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0.000000,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, idempotency_key)
);

-- Generation Job Steps
CREATE TABLE IF NOT EXISTS public.generation_job_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.generation_jobs(id) ON DELETE CASCADE,
  seq int NOT NULL,
  key text NOT NULL,
  label text,
  state public.job_step_state NOT NULL DEFAULT 'pending',
  attempt_count int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 3,
  depends_on text[] NOT NULL DEFAULT '{}',
  locked_at timestamptz,
  locked_by text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, key)
);

-- AI Requests Audit Log
CREATE TABLE IF NOT EXISTS public.ai_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  job_step_id uuid REFERENCES public.generation_job_steps(id) ON DELETE SET NULL,
  skill text,
  prompt_version text,
  provider text,
  model text,
  tier text,
  status text CHECK (status IN ('success', 'error')),
  error text,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  cached_tokens int NOT NULL DEFAULT 0,
  latency_ms int NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12,6) NOT NULL DEFAULT 0.000000,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Jobs and AI domain
CREATE INDEX IF NOT EXISTS idx_generation_jobs_org_state ON public.generation_jobs (organization_id, state);
CREATE INDEX IF NOT EXISTS idx_generation_jobs_creator ON public.generation_jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_generation_job_steps_claim ON public.generation_job_steps (state, next_attempt_at, job_id);
CREATE INDEX IF NOT EXISTS idx_ai_requests_org_created ON public.ai_requests (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_requests_job ON public.ai_requests (job_id, job_step_id);
