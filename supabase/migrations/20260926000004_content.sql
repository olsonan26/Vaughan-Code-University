-- 20260926000004_content.sql
-- Modules, Lessons, Sections, Objectives, Assessments, Flashcards, and Worksheets

DO $$ BEGIN
  CREATE TYPE public.lesson_type AS ENUM (
    'video',
    'audio',
    'pdf',
    'quiz',
    'article'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.section_provenance AS ENUM (
    'ai_generated',
    'human_written',
    'ai_edited'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.question_type AS ENUM (
    'multiple_choice',
    'multiple_select',
    'true_false',
    'short_answer',
    'code_prompt'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Modules
CREATE TABLE IF NOT EXISTS public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  course_version_id uuid REFERENCES public.course_versions(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  position int NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Module Versions
CREATE TABLE IF NOT EXISTS public.module_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  title text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lessons
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text,
  description text,
  type public.lesson_type NOT NULL DEFAULT 'article',
  duration_minutes int NOT NULL DEFAULT 10,
  xp_reward int NOT NULL DEFAULT 20,
  position int NOT NULL DEFAULT 0,
  objectives text[] NOT NULL DEFAULT '{}',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Lesson Versions
CREATE TABLE IF NOT EXISTS public.lesson_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  title text,
  description text,
  type public.lesson_type,
  duration_minutes int,
  xp_reward int,
  objectives text[],
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lesson Sections
CREATE TABLE IF NOT EXISTS public.lesson_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'markdown',
  heading text,
  body_markdown text,
  position int NOT NULL DEFAULT 0,
  provenance public.section_provenance NOT NULL DEFAULT 'ai_generated',
  approved boolean NOT NULL DEFAULT false,
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Learning Objectives
CREATE TABLE IF NOT EXISTS public.learning_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('course', 'module', 'lesson')),
  entity_id uuid NOT NULL,
  objective text NOT NULL,
  position int NOT NULL DEFAULT 0,
  bloom_level text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Assessments
CREATE TABLE IF NOT EXISTS public.assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  passing_score_percentage int NOT NULL DEFAULT 70,
  xp_reward int NOT NULL DEFAULT 50,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Assessment Questions
CREATE TABLE IF NOT EXISTS public.assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_type public.question_type NOT NULL DEFAULT 'multiple_choice',
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_answer jsonb NOT NULL,
  explanation text,
  rationale text,
  difficulty text NOT NULL DEFAULT 'intermediate',
  position int NOT NULL DEFAULT 0,
  concept_ref_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  source_ref_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Question Objectives
CREATE TABLE IF NOT EXISTS public.question_objectives (
  question_id uuid REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
  objective_id uuid REFERENCES public.learning_objectives(id) ON DELETE CASCADE,
  PRIMARY KEY (question_id, objective_id)
);

-- Flashcard Sets
CREATE TABLE IF NOT EXISTS public.flashcard_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Flashcards
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  front text NOT NULL,
  back text NOT NULL,
  hint text,
  position int NOT NULL DEFAULT 0,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Worksheets
CREATE TABLE IF NOT EXISTS public.worksheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Worksheet Sections
CREATE TABLE IF NOT EXISTS public.worksheet_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worksheet_id uuid NOT NULL REFERENCES public.worksheets(id) ON DELETE CASCADE,
  heading text NOT NULL,
  instructions text,
  content_markdown text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Content domain
CREATE INDEX IF NOT EXISTS idx_modules_course_pos ON public.modules (course_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_module_pos ON public.lessons (module_id, position);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons (course_id);
CREATE INDEX IF NOT EXISTS idx_lesson_sections_lesson_pos ON public.lesson_sections (lesson_id, position);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_assessment_pos ON public.assessment_questions (assessment_id, position);
