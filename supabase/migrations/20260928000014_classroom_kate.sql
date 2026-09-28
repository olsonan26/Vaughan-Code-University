-- 0014: Classroom content in DB, placement slots, universal locks, Kate chat, figure reads, media sources.
-- Additive only. Contract: docs/CLASSROOM_CONTRACT.md

-- Legacy ids (import of src/data/initialData.ts INITIAL_COURSES) + classroom display fields
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS course_code text;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS required_tier text NOT NULL DEFAULT 'free';
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS required_level int NOT NULL DEFAULT 1;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS classroom_visible boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS courses_org_legacy_uniq ON public.courses (organization_id, legacy_id) WHERE legacy_id IS NOT NULL;

ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS legacy_id text;
ALTER TABLE public.modules ADD COLUMN IF NOT EXISTS archived_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS modules_course_legacy_uniq ON public.modules (course_id, legacy_id) WHERE legacy_id IS NOT NULL;

ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS legacy_id text;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_pro_only boolean NOT NULL DEFAULT false;
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS locked_level int;
CREATE UNIQUE INDEX IF NOT EXISTS lessons_course_legacy_uniq ON public.lessons (course_id, legacy_id) WHERE legacy_id IS NOT NULL;

-- Placed material: every video/audio/pdf/reading/image/quiz/resource in a lesson is one row.
CREATE TABLE IF NOT EXISTS public.lesson_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('video','audio','pdf','reading','image','quiz','resource','flashcards','worksheet','lesson_plan')),
  slot text NOT NULL DEFAULT 'main' CHECK (slot IN ('main','section','resource')),
  position int NOT NULL DEFAULT 0,
  title text,
  -- kind-specific payload, see contract (e.g. video {youtubeId,url}, audio {url,transcript}, reading {markdown}, quiz {questions[]})
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_ids uuid[] NOT NULL DEFAULT '{}',
  source_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  provenance text NOT NULL DEFAULT 'instructor' CHECK (provenance IN ('instructor','ai_source_only','ai_with_approved_additions','imported')),
  published boolean NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);
CREATE INDEX IF NOT EXISTS lesson_items_lesson_idx ON public.lesson_items (lesson_id, position) WHERE archived_at IS NULL;

-- Universal locks: course | module | lesson | lesson_item
CREATE TABLE IF NOT EXISTS public.content_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  entity_type text NOT NULL CHECK (entity_type IN ('course','module','lesson','lesson_item')),
  entity_id uuid NOT NULL,
  -- rule: {"type":"manual"} | {"type":"after_previous"} | {"type":"after_lesson","lessonId":uuid}
  --     | {"type":"after_quiz","itemId":uuid,"minScore":80} | {"type":"min_level","level":3} | {"type":"date","at":iso}
  rule jsonb NOT NULL DEFAULT '{"type":"manual"}'::jsonb,
  message text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS content_locks_course_idx ON public.content_locks (course_id);

-- Quiz results for classroom quizzes stored as lesson_items
CREATE TABLE IF NOT EXISTS public.item_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.lesson_items(id) ON DELETE CASCADE,
  score_percent int NOT NULL,
  passed boolean NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS item_attempts_user_idx ON public.item_attempts (user_id, item_id);

-- Kate
CREATE TABLE IF NOT EXISTS public.kate_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  title text,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.kate_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.kate_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','tool')),
  content text NOT NULL DEFAULT '',
  -- structured attachments: {"checklist":[...]} | {"changeSetId":uuid} | {"placementRequest":{...}} | {"toolCalls":[...]}
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS kate_messages_thread_idx ON public.kate_messages (thread_id, created_at);

-- change sets: allow Kate change sets and undo
ALTER TABLE public.change_sets ADD COLUMN IF NOT EXISTS thread_id uuid REFERENCES public.kate_threads(id) ON DELETE SET NULL;
ALTER TABLE public.change_sets ADD COLUMN IF NOT EXISTS applied_at timestamptz;
ALTER TABLE public.change_sets ADD COLUMN IF NOT EXISTS reverted_at timestamptz;
ALTER TABLE public.change_set_items ADD COLUMN IF NOT EXISTS operation text NOT NULL DEFAULT 'update' CHECK (operation IN ('create','update','delete','lock','unlock'));
ALTER TABLE public.change_set_items ADD COLUMN IF NOT EXISTS position int NOT NULL DEFAULT 0;
ALTER TABLE public.change_set_items ADD COLUMN IF NOT EXISTS summary text;

-- Kate's eyes: each image / page figure read twice
CREATE TABLE IF NOT EXISTS public.source_figures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  page_number int,
  figure_index int NOT NULL DEFAULT 0,
  image_path text NOT NULL,
  width int,
  height int,
  primary_model text,
  primary_read jsonb,
  check_model text,
  check_read jsonb,
  agreement numeric,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reading','agreed','needs_verification','verified','rejected','failed')),
  verified_text text,
  verified_description text,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at timestamptz,
  chunk_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, page_number, figure_index)
);

-- Kate's ears: media metadata on sources
ALTER TABLE public.knowledge_sources ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.knowledge_sources ADD COLUMN IF NOT EXISTS duration_seconds int;
ALTER TABLE public.source_chunks ADD COLUMN IF NOT EXISTS start_seconds numeric;
ALTER TABLE public.source_chunks ADD COLUMN IF NOT EXISTS end_seconds numeric;
ALTER TABLE public.source_chunks ADD COLUMN IF NOT EXISTS figure_id uuid;

-- updated_at triggers
DO $$ BEGIN
  CREATE TRIGGER lesson_items_updated BEFORE UPDATE ON public.lesson_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER content_locks_updated BEFORE UPDATE ON public.content_locks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER kate_threads_updated BEFORE UPDATE ON public.kate_threads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  CREATE TRIGGER source_figures_updated BEFORE UPDATE ON public.source_figures FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- RLS: API uses service role; these policies guard direct client access.
ALTER TABLE public.lesson_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_items_team" ON public.lesson_items FOR ALL USING (public.is_course_team(course_id)) WITH CHECK (public.is_course_team(course_id));
ALTER TABLE public.content_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_locks_team" ON public.content_locks FOR ALL USING (public.is_course_team(course_id)) WITH CHECK (public.is_course_team(course_id));
ALTER TABLE public.item_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "item_attempts_own" ON public.item_attempts FOR SELECT USING (user_id = auth.uid());
ALTER TABLE public.kate_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kate_threads_own" ON public.kate_threads FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
ALTER TABLE public.kate_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kate_messages_own" ON public.kate_messages FOR SELECT USING (EXISTS (SELECT 1 FROM public.kate_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
ALTER TABLE public.source_figures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_figures_select" ON public.source_figures FOR SELECT USING (EXISTS (SELECT 1 FROM public.knowledge_sources s WHERE s.id = source_id AND (s.created_by = auth.uid() OR public.has_permission(s.organization_id, 'knowledge.manage_all'))));

-- permissions
INSERT INTO public.role_permissions (role, permission)
SELECT r::public.app_role, p FROM (VALUES
  ('owner','classroom.manage'),('super_admin','classroom.manage'),('instructor','classroom.manage'),
  ('owner','kate.use'),('super_admin','kate.use'),('instructor','kate.use'),('assistant_instructor','kate.use'),
  ('owner','content.lock'),('super_admin','content.lock'),('instructor','content.lock')
) v(r,p)
WHERE EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='app_role' AND e.enumlabel=v.r)
ON CONFLICT DO NOTHING;
