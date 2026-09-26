-- Core authorization tests. Each block raises an exception on failure (psql ON_ERROR_STOP).
\set ON_ERROR_STOP 1
BEGIN;
-- Users (profile trigger should create profile + org membership + student role)
INSERT INTO auth.users (id, email) VALUES
 ('10000000-0000-0000-0000-000000000001','student@test'),
 ('10000000-0000-0000-0000-000000000002','instA@test'),
 ('10000000-0000-0000-0000-000000000003','instB@test'),
 ('10000000-0000-0000-0000-000000000004','senior@test'),
 ('10000000-0000-0000-0000-000000000005','mod@test'),
 ('10000000-0000-0000-0000-000000000006','head@test');
INSERT INTO public.user_roles (user_id, organization_id, role) VALUES
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001','instructor'),
 ('10000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000001','instructor'),
 ('10000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000001','senior_instructor'),
 ('10000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000001','moderator'),
 ('10000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000001','headmaster');

DO $$ BEGIN
  IF (SELECT count(*) FROM public.profiles WHERE id::text LIKE '10000000-%') <> 6 THEN RAISE EXCEPTION 'FAIL: signup trigger did not create profiles'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id='10000000-0000-0000-0000-000000000001' AND role='student') THEN RAISE EXCEPTION 'FAIL: new user not granted student role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE user_id='10000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'FAIL: new user not added to default org'; END IF;
END $$;

-- Fixtures (as table owner)
INSERT INTO public.knowledge_sources (id, organization_id, title, type, created_by, visibility) VALUES
 ('20000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000001','A private','pdf','10000000-0000-0000-0000-000000000002','private'),
 ('20000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000001','B private','pdf','10000000-0000-0000-0000-000000000003','private'),
 ('20000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-000000000001','Org shared','pdf','10000000-0000-0000-0000-000000000003','organization');
INSERT INTO public.source_chunks (organization_id, source_id, chunk_index, content) VALUES
 ('00000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-00000000000b',0,'B secret chunk');
INSERT INTO public.courses (id, organization_id, title, slug, created_by) VALUES
 ('30000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000001','A draft','a-draft','10000000-0000-0000-0000-000000000002');
INSERT INTO public.course_versions (id, course_id, version_number) VALUES
 ('31000000-0000-0000-0000-00000000000a','30000000-0000-0000-0000-00000000000a',1);
INSERT INTO public.published_courses (organization_id, course_id, course_version_id, version_label, snapshot) VALUES
 ('00000000-0000-0000-0000-000000000001','30000000-0000-0000-0000-00000000000a','31000000-0000-0000-0000-00000000000a','v1.0','{"title":"A"}');
INSERT INTO public.concepts (id, organization_id, name, created_by) VALUES
 ('40000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000001','Number Reduction','10000000-0000-0000-0000-000000000006');

CREATE OR REPLACE FUNCTION pg_temp.act_as(uid text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
END $$;

-- Student
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000001');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.knowledge_sources) <> 0 THEN RAISE EXCEPTION 'FAIL: student can read knowledge sources'; END IF;
  IF (SELECT count(*) FROM public.courses) <> 0 THEN RAISE EXCEPTION 'FAIL: student can read draft courses'; END IF;
  IF (SELECT count(*) FROM public.published_courses) <> 1 THEN RAISE EXCEPTION 'FAIL: student cannot read published course'; END IF;
END $$;
RESET ROLE;

-- Instructor A
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000002');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_sources WHERE title='A private') THEN RAISE EXCEPTION 'FAIL: instructor cannot read own source'; END IF;
  IF EXISTS (SELECT 1 FROM public.knowledge_sources WHERE title='B private') THEN RAISE EXCEPTION 'FAIL: instructor A can read instructor B private source'; END IF;
  IF EXISTS (SELECT 1 FROM public.source_chunks WHERE content='B secret chunk') THEN RAISE EXCEPTION 'FAIL: instructor A can read B chunks'; END IF;
  IF EXISTS (SELECT 1 FROM public.knowledge_sources WHERE title='Org shared') THEN RAISE EXCEPTION 'FAIL: plain instructor reads org-shared source without knowledge.read_shared'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courses WHERE title='A draft') THEN RAISE EXCEPTION 'FAIL: instructor cannot read own course'; END IF;
END $$;
DO $$ BEGIN
  BEGIN
    INSERT INTO public.concept_locks (organization_id, concept_id, locked_by) VALUES ('00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000002');
    RAISE EXCEPTION 'FAIL: instructor could lock a concept';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

-- Instructor B cannot see A's course
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000003');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.courses WHERE title='A draft') THEN RAISE EXCEPTION 'FAIL: instructor B can read instructor A course'; END IF;
END $$;
RESET ROLE;

-- Senior instructor reads org-shared, not private
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000004');
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.knowledge_sources WHERE title='Org shared') THEN RAISE EXCEPTION 'FAIL: senior instructor cannot read org-shared source'; END IF;
  IF EXISTS (SELECT 1 FROM public.knowledge_sources WHERE title='B private') THEN RAISE EXCEPTION 'FAIL: senior instructor reads private source'; END IF;
END $$;
RESET ROLE;

-- Moderator has no studio data
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000005');
DO $$ BEGIN
  IF (SELECT count(*) FROM public.knowledge_sources) + (SELECT count(*) FROM public.courses) <> 0 THEN RAISE EXCEPTION 'FAIL: moderator sees studio data'; END IF;
END $$;
RESET ROLE;

-- Headmaster can lock
SELECT pg_temp.act_as('10000000-0000-0000-0000-000000000006');
INSERT INTO public.concept_locks (organization_id, concept_id, locked_by) VALUES ('00000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-00000000000a','10000000-0000-0000-0000-000000000006');
RESET ROLE;

-- Rate limiter
DO $$ BEGIN
  IF NOT public.hit_rate_limit('t:1', 60, 2) OR NOT public.hit_rate_limit('t:1', 60, 2) THEN RAISE EXCEPTION 'FAIL: rate limit blocked early'; END IF;
  IF public.hit_rate_limit('t:1', 60, 2) THEN RAISE EXCEPTION 'FAIL: rate limit did not block after max'; END IF;
END $$;

SELECT 'all core RLS tests passed' AS result;
ROLLBACK;
