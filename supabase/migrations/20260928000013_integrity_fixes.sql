-- 0013: integrity + performance fixes found in the schema review (supabase/README.md).
-- 1) updated_at maintained automatically on every table that has the column
-- 2) course slugs unique per organization
-- 3) missing foreign-key / lookup indexes; drop redundant ones
-- 4) organizations.updated_at

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.table_name FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'updated_at'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I', r.table_name);
    EXECUTE format('CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', r.table_name);
  END LOOP;
END $$;

-- de-duplicate any existing slugs before adding the constraint (append short id)
UPDATE public.courses c SET slug = c.slug || '-' || left(c.id::text, 6)
WHERE EXISTS (SELECT 1 FROM public.courses d WHERE d.organization_id = c.organization_id AND d.slug = c.slug AND d.id < c.id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_courses_org_slug ON public.courses (organization_id, slug);

-- helper: create an index only if the table and all columns exist (keeps this migration safe to re-run)
CREATE OR REPLACE FUNCTION pg_temp.ensure_index(tbl text, cols text[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE missing int;
BEGIN
  SELECT count(*) INTO missing FROM unnest(cols) col
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=tbl AND column_name=col);
  IF missing = 0 THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (%s)', 'idx_' || tbl || '_' || array_to_string(cols, '_'), tbl,
      (SELECT string_agg(quote_ident(c), ', ') FROM unnest(cols) c));
  END IF;
END $$;

SELECT pg_temp.ensure_index('organization_members', ARRAY['user_id']);
SELECT pg_temp.ensure_index('source_collection_members', ARRAY['source_id']);
SELECT pg_temp.ensure_index('concept_sources', ARRAY['source_id']);
SELECT pg_temp.ensure_index('concept_relationships', ARRAY['concept_id']);
SELECT pg_temp.ensure_index('concept_relationships', ARRAY['related_concept_id']);
SELECT pg_temp.ensure_index('course_collaborators', ARRAY['user_id']);
SELECT pg_temp.ensure_index('course_sources', ARRAY['source_id']);
SELECT pg_temp.ensure_index('course_concepts', ARRAY['concept_id']);
SELECT pg_temp.ensure_index('learning_objectives', ARRAY['entity_type', 'entity_id']);
SELECT pg_temp.ensure_index('question_objectives', ARRAY['objective_id']);
SELECT pg_temp.ensure_index('flashcard_sets', ARRAY['course_id']);
SELECT pg_temp.ensure_index('flashcard_sets', ARRAY['lesson_id']);
SELECT pg_temp.ensure_index('flashcards', ARRAY['set_id']);
SELECT pg_temp.ensure_index('worksheets', ARRAY['course_id']);
SELECT pg_temp.ensure_index('worksheets', ARRAY['lesson_id']);
SELECT pg_temp.ensure_index('worksheet_sections', ARRAY['worksheet_id']);
SELECT pg_temp.ensure_index('visual_assets', ARRAY['organization_id']);
SELECT pg_temp.ensure_index('visual_assets', ARRAY['course_id']);
SELECT pg_temp.ensure_index('visual_assets', ARRAY['module_id']);
SELECT pg_temp.ensure_index('visual_assets', ARRAY['lesson_id']);
SELECT pg_temp.ensure_index('change_set_items', ARRAY['change_set_id']);
SELECT pg_temp.ensure_index('change_set_items', ARRAY['entity_type', 'entity_id']);
SELECT pg_temp.ensure_index('generation_job_steps', ARRAY['job_id']);
SELECT pg_temp.ensure_index('ai_requests', ARRAY['user_id']);

DROP INDEX IF EXISTS public.idx_user_roles_user_org;
DROP INDEX IF EXISTS public.idx_enrollments_user_course;
DROP INDEX IF EXISTS public.idx_lesson_progress_user_lesson;
