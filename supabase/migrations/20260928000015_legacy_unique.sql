-- 0015: PostgREST upserts need real unique constraints (partial indexes can't be ON CONFLICT targets). NULL legacy ids stay unrestricted.
DROP INDEX IF EXISTS public.courses_org_legacy_uniq;
DROP INDEX IF EXISTS public.modules_course_legacy_uniq;
DROP INDEX IF EXISTS public.lessons_course_legacy_uniq;
DO $$ BEGIN
  ALTER TABLE public.courses ADD CONSTRAINT courses_org_legacy_key UNIQUE (organization_id, legacy_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE public.modules ADD CONSTRAINT modules_course_legacy_key UNIQUE (course_id, legacy_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null; END $$;
DO $$ BEGIN
  ALTER TABLE public.lessons ADD CONSTRAINT lessons_course_legacy_key UNIQUE (course_id, legacy_id);
EXCEPTION WHEN duplicate_object OR duplicate_table THEN null; END $$;
