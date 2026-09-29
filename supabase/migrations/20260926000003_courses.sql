-- 20260926000003_courses.sql
-- Course Header, Versions, Collaborators, and Relationships

DO $$ BEGIN
  CREATE TYPE public.course_state AS ENUM (
    'draft',
    'generating',
    'in_review',
    'approved',
    'published',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  tagline text,
  description text,
  thumbnail_url text,
  badge text,
  category text,
  legacy_id text,
  state public.course_state NOT NULL DEFAULT 'draft',
  
  -- Course Settings / Strategy
  target_audience text,
  learning_outcome text,
  level text,
  type text,
  length text,
  reading_level text,
  style text,
  difficulty text,
  visual_density text,
  source_mode text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  current_version_id uuid,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.course_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  parent_version_id uuid REFERENCES public.course_versions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',
  blueprint jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add current_version_id foreign key to courses
ALTER TABLE public.courses
  ADD CONSTRAINT fk_courses_current_version
  FOREIGN KEY (current_version_id) REFERENCES public.course_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.course_collaborators (
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'co_author',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.course_sources (
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, source_id)
);

CREATE TABLE IF NOT EXISTS public.course_concepts (
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  concept_id uuid REFERENCES public.concepts(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (course_id, concept_id)
);

-- Indexes for Courses domain
CREATE INDEX IF NOT EXISTS idx_courses_org_state ON public.courses (organization_id, state);
CREATE INDEX IF NOT EXISTS idx_courses_created_by ON public.courses (created_by);
CREATE INDEX IF NOT EXISTS idx_course_versions_course ON public.course_versions (course_id, version_number);
