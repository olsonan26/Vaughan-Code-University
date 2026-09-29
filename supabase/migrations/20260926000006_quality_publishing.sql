-- 20260926000006_quality_publishing.sql
-- Quality Audits, Findings, Change Sets, Publishing, Enrollments, Progress, Attempts, Notes, and Dependency Refs

DO $$ BEGIN
  CREATE TYPE public.finding_severity AS ENUM (
    'critical',
    'warning',
    'suggestion'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finding_status AS ENUM (
    'open',
    'accepted',
    'fixed',
    'ignored',
    'false_positive'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.change_set_status AS ENUM (
    'proposed',
    'applied',
    'rejected',
    'partially_applied'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Quality Audits
CREATE TABLE IF NOT EXISTS public.quality_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_version_id uuid REFERENCES public.course_versions(id) ON DELETE SET NULL,
  audited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  overall_score numeric(5,2),
  status text NOT NULL DEFAULT 'pending',
  summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Quality Findings
CREATE TABLE IF NOT EXISTS public.quality_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.quality_audits(id) ON DELETE CASCADE,
  category text NOT NULL,
  severity public.finding_severity NOT NULL DEFAULT 'warning',
  status public.finding_status NOT NULL DEFAULT 'open',
  claim text,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_fix text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Change Sets
CREATE TABLE IF NOT EXISTS public.change_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status public.change_set_status NOT NULL DEFAULT 'proposed',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Change Set Items
CREATE TABLE IF NOT EXISTS public.change_set_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_set_id uuid NOT NULL REFERENCES public.change_sets(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  before_snapshot jsonb,
  after_snapshot jsonb,
  status text NOT NULL DEFAULT 'proposed',
  applied_at timestamptz
);

-- Publication Records
CREATE TABLE IF NOT EXISTS public.publication_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_version_id uuid NOT NULL REFERENCES public.course_versions(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

-- Published Courses (sanitized snapshot in legacy Classroom Course shape)
CREATE TABLE IF NOT EXISTS public.published_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_version_id uuid NOT NULL REFERENCES public.course_versions(id) ON DELETE CASCADE,
  version_label text NOT NULL,
  snapshot jsonb NOT NULL,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz NOT NULL DEFAULT now(),
  is_current boolean NOT NULL DEFAULT true
);

-- Enrollments
CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

-- Lesson Progress
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  last_accessed_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (user_id, lesson_id)
);

-- Assessment Attempts
CREATE TABLE IF NOT EXISTS public.assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  score_percentage numeric(5,2),
  passed boolean,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

-- Instructor Notes (NEVER student visible)
CREATE TABLE IF NOT EXISTS public.instructor_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Artifact Concept Refs ("what is affected" dependency queries)
CREATE TABLE IF NOT EXISTS public.artifact_concept_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Quality & Publishing domain
CREATE INDEX IF NOT EXISTS idx_quality_audits_course ON public.quality_audits (course_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quality_findings_audit ON public.quality_findings (audit_id, severity, status);
CREATE INDEX IF NOT EXISTS idx_published_courses_org_current ON public.published_courses (organization_id, is_current);
CREATE INDEX IF NOT EXISTS idx_published_courses_course ON public.published_courses (course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user_course ON public.enrollments (user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user_lesson ON public.lesson_progress (user_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_assessment_attempts_user_assessment ON public.assessment_attempts (user_id, assessment_id);
CREATE INDEX IF NOT EXISTS idx_instructor_notes_entity ON public.instructor_notes (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_artifact_concept_refs_entity ON public.artifact_concept_refs (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_artifact_concept_refs_concept ON public.artifact_concept_refs (concept_id);
