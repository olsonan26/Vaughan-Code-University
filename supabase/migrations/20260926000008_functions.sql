-- 20260926000008_functions.sql
-- Security Definer Functions, RPC Helpers, and Triggers

-- 1. Helper: user_org_roles
CREATE OR REPLACE FUNCTION public.user_org_roles(p_org uuid)
RETURNS public.app_role[]
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT coalesce(
    array_agg(role),
    '{}'::public.app_role[]
  )
  FROM public.user_roles
  WHERE user_id = auth.uid()
    AND organization_id = p_org;
$$;

-- 2. Helper: has_org_role
CREATE OR REPLACE FUNCTION public.has_org_role(p_org uuid, p_roles public.app_role[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND organization_id = p_org
      AND role = ANY(p_roles)
  );
$$;

-- 3. Helper: has_permission
CREATE OR REPLACE FUNCTION public.has_permission(p_org uuid, p_permission text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = auth.uid()
      AND ur.organization_id = p_org
      AND rp.permission = p_permission
  );
$$;

-- 4. RPC: claim_next_job_step
CREATE OR REPLACE FUNCTION public.claim_next_job_step(
  p_worker text,
  p_lock_seconds int DEFAULT 300
)
RETURNS SETOF public.generation_job_steps
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_step public.generation_job_steps;
  v_now timestamptz := now();
BEGIN
  WITH runnable_steps AS (
    SELECT s.id
    FROM public.generation_job_steps s
    JOIN public.generation_jobs j ON s.job_id = j.id
    WHERE j.state IN ('queued', 'running', 'retrying')
      AND s.next_attempt_at <= v_now
      AND (
        s.state = 'pending'
        OR (
          s.state IN ('failed', 'running')
          AND s.attempt_count < s.max_attempts
          AND (s.locked_at IS NULL OR s.locked_at < v_now - (p_lock_seconds || ' seconds')::interval)
        )
      )
      AND NOT EXISTS (
        SELECT 1
        FROM unnest(s.depends_on) dep_key
        JOIN public.generation_job_steps dep_step ON dep_step.job_id = s.job_id AND dep_step.key = dep_key
        WHERE dep_step.state != 'completed'
      )
    ORDER BY j.created_at ASC, s.seq ASC
    LIMIT 1
    FOR UPDATE OF s SKIP LOCKED
  )
  UPDATE public.generation_job_steps s
  SET state = 'running',
      attempt_count = s.attempt_count + 1,
      locked_at = v_now,
      locked_by = p_worker,
      started_at = coalesce(s.started_at, v_now),
      updated_at = v_now
  FROM runnable_steps rs
  WHERE s.id = rs.id
  RETURNING s.* INTO v_step;

  IF v_step.id IS NOT NULL THEN
    UPDATE public.generation_jobs
    SET state = 'running',
        started_at = coalesce(started_at, v_now),
        updated_at = v_now
    WHERE id = v_step.job_id;

    RETURN NEXT v_step;
  END IF;

  RETURN;
END;
$$;

-- 5. RPC: match_source_chunks
CREATE OR REPLACE FUNCTION public.match_source_chunks(
  p_org uuid,
  p_source_ids uuid[],
  p_query_embedding vector(1536),
  p_match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity double precision,
  authority_level int
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    sc.id,
    sc.source_id,
    sc.chunk_index,
    sc.content,
    sc.metadata,
    1 - (sc.embedding <=> p_query_embedding) AS similarity,
    ks.authority_level
  FROM public.source_chunks sc
  JOIN public.knowledge_sources ks ON sc.source_id = ks.id
  WHERE sc.organization_id = p_org
    AND (p_source_ids IS NULL OR cardinality(p_source_ids) = 0 OR sc.source_id = ANY(p_source_ids))
    AND sc.embedding IS NOT NULL
  ORDER BY sc.embedding <=> p_query_embedding ASC
  LIMIT p_match_count;
$$;

-- 6. RPC: search_source_chunks_fts
CREATE OR REPLACE FUNCTION public.search_source_chunks_fts(
  p_org uuid,
  p_source_ids uuid[],
  p_query text,
  p_match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index int,
  content text,
  metadata jsonb,
  rank real,
  authority_level int
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT
    sc.id,
    sc.source_id,
    sc.chunk_index,
    sc.content,
    sc.metadata,
    ts_rank_cd(sc.fts, websearch_to_tsquery('english', p_query)) AS rank,
    ks.authority_level
  FROM public.source_chunks sc
  JOIN public.knowledge_sources ks ON sc.source_id = ks.id
  WHERE sc.organization_id = p_org
    AND (p_source_ids IS NULL OR cardinality(p_source_ids) = 0 OR sc.source_id = ANY(p_source_ids))
    AND sc.fts @@ websearch_to_tsquery('english', p_query)
  ORDER BY rank DESC
  LIMIT p_match_count;
$$;

-- 7. RPC: hit_rate_limit
CREATE OR REPLACE FUNCTION public.hit_rate_limit(
  p_key text,
  p_window_seconds int,
  p_max int
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_current_count int;
BEGIN
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  INSERT INTO public.rate_limits (key, window_start, count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET count = rate_limits.count + 1
  RETURNING count INTO v_current_count;

  RETURN v_current_count <= p_max;
END;
$$;

-- 8. Helper: create_default_visual_identity
CREATE OR REPLACE FUNCTION public.create_default_visual_identity(
  p_org uuid,
  p_course_id uuid DEFAULT NULL
)
RETURNS public.visual_identities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_identity public.visual_identities;
BEGIN
  INSERT INTO public.visual_identities (
    organization_id,
    course_id,
    palette,
    typography,
    layout_style,
    tone,
    default_aspect_ratio
  ) VALUES (
    p_org,
    p_course_id,
    '{"primary": "#1E3A8A", "secondary": "#3B82F6", "accent": "#F59E0B", "background": "#F8FAFC", "surface": "#FFFFFF", "text": "#0F172A"}'::jsonb,
    '{"fontFamily": "Inter, sans-serif", "headingFont": "Cal Sans, Inter, sans-serif"}'::jsonb,
    'modern_clean',
    'authoritative_accessible',
    '16:9'
  )
  RETURNING * INTO v_identity;

  RETURN v_identity;
END;
$$;

-- 9. Trigger: handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    coalesce(NEW.email, ''),
    coalesce(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(coalesce(NEW.email, ''), '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = coalesce(public.profiles.display_name, EXCLUDED.display_name),
    avatar_url = coalesce(public.profiles.avatar_url, EXCLUDED.avatar_url);

  INSERT INTO public.organization_members (organization_id, user_id)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.user_roles (organization_id, user_id, role)
  VALUES ('00000000-0000-0000-0000-000000000001', NEW.id, 'student')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. Helper: set_updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
