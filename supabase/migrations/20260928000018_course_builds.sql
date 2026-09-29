-- 0018: Course Builder. Turns whole uploaded sources (e.g. a book PDF) into a complete course.
-- Flow: outline (Kate reads everything) -> instructor edits/approves the blueprint -> every lesson
-- is written from ITS OWN source passages -> each lesson is fact-checked by a second model and
-- auto-revised if anything is unsupported -> one reviewable change set -> instructor applies.

CREATE TABLE IF NOT EXISTS public.course_builds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source_ids      uuid[] NOT NULL,
  target          text NOT NULL DEFAULT 'new' CHECK (target IN ('new','existing')),
  course_id       uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  new_course      jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { title, code, tier } when target = 'new'
  options         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- { quizzes, flashcards, worksheets, lockInOrder, instruction }
  status          text NOT NULL DEFAULT 'outlining'
                  CHECK (status IN ('outlining','awaiting_approval','writing','assembling','ready','applied','failed','cancelled')),
  blueprint       jsonb,                                -- { courseTitle, description, outcomes[], modules[{ key, title, description, lessons[{ key, title, focus, objectives[], keyTerms[], chunkIds[] }] }], uncovered[], gaps[] }
  outline_job_id  uuid,
  write_job_id    uuid,
  change_set_id   uuid,
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS course_builds_org_idx ON public.course_builds (organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.course_build_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id        uuid NOT NULL REFERENCES public.course_builds(id) ON DELETE CASCADE,
  lesson_key      text NOT NULL,
  module_key      text NOT NULL,
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued','writing','practice','checking','revising','done','failed')),
  reading         jsonb,     -- { markdown, refs[] }
  practice        jsonb,     -- { questions[], cards[], worksheet }
  audit           jsonb,     -- { passed, unsupportedClaims[], gaps[], revised }
  instructor_note text,      -- extra instruction when the instructor asks for a rewrite
  error           text,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (build_id, lesson_key)
);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.course_builds;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.course_builds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.course_build_lessons;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.course_build_lessons FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- API-only (service role) after permission checks; no direct client access.
ALTER TABLE public.course_builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_build_lessons ENABLE ROW LEVEL SECURITY;
