-- 20260926000009_rls.sql
-- Enable RLS and Define RLS Policies Across All Tables

-- Helper function to check if user is a member of course team (collaborator or owner)
CREATE OR REPLACE FUNCTION public.is_course_team(p_course_id uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.courses c
    WHERE c.id = p_course_id AND c.created_by = auth.uid()
    UNION ALL
    SELECT 1 FROM public.course_collaborators cc
    WHERE cc.course_id = p_course_id AND cc.user_id = auth.uid()
  );
$$;

-- Helper function to check if user is in org
CREATE OR REPLACE FUNCTION public.is_org_member(p_org uuid)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = p_org AND user_id = auth.uid()
  );
$$;

--------------------------------------------------------------------------------
-- 1. Core Platform Tables
--------------------------------------------------------------------------------
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_select" ON public.organizations FOR SELECT
  USING (public.is_org_member(id));
CREATE POLICY "org_admin" ON public.organizations FOR ALL
  USING (public.has_permission(id, 'admin.users'));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_members_select" ON public.organization_members FOR SELECT
  USING (public.is_org_member(organization_id));
CREATE POLICY "org_members_admin" ON public.organization_members FOR ALL
  USING (public.has_permission(organization_id, 'admin.users'));

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT
  USING (user_id = auth.uid() OR public.has_permission(organization_id, 'admin.roles'));
CREATE POLICY "user_roles_admin" ON public.user_roles FOR ALL
  USING (public.has_permission(organization_id, 'admin.roles'));

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "role_permissions_select" ON public.role_permissions FOR SELECT
  USING (auth.uid() IS NOT NULL);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_log_select" ON public.activity_log FOR SELECT
  USING (public.has_permission(organization_id, 'admin.audit_log'));

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings_select" ON public.app_settings FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "app_settings_write" ON public.app_settings FOR ALL
  USING (public.has_permission(organization_id, 'ai.configure'));

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- Managed via hit_rate_limit SECURITY DEFINER function

--------------------------------------------------------------------------------
-- 2. Knowledge Vault Domain
--------------------------------------------------------------------------------
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ks_select" ON public.knowledge_sources FOR SELECT
  USING (
    created_by = auth.uid()
    OR (visibility IN ('organization', 'canonical_shared') AND public.has_permission(organization_id, 'knowledge.read_shared'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );
CREATE POLICY "ks_insert" ON public.knowledge_sources FOR INSERT
  WITH CHECK (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'knowledge.upload'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );
CREATE POLICY "ks_update" ON public.knowledge_sources FOR UPDATE
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'knowledge.upload'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );
CREATE POLICY "ks_delete" ON public.knowledge_sources FOR DELETE
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'knowledge.upload'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );

ALTER TABLE public.source_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_versions_select" ON public.source_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.knowledge_sources ks WHERE ks.id = source_id));

ALTER TABLE public.source_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_chunks_select" ON public.source_chunks FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.knowledge_sources ks WHERE ks.id = source_id));

ALTER TABLE public.source_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sc_select" ON public.source_collections FOR SELECT
  USING (
    created_by = auth.uid()
    OR (visibility IN ('organization', 'canonical_shared') AND public.has_permission(organization_id, 'knowledge.read_shared'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );
CREATE POLICY "sc_write" ON public.source_collections FOR ALL
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'knowledge.upload'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );

ALTER TABLE public.source_collection_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scm_select" ON public.source_collection_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.source_collections sc WHERE sc.id = collection_id));
CREATE POLICY "scm_write" ON public.source_collection_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.source_collections sc WHERE sc.id = collection_id));

ALTER TABLE public.concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concepts_select" ON public.concepts FOR SELECT
  USING (
    created_by = auth.uid()
    OR (visibility IN ('organization', 'canonical_shared') AND public.has_permission(organization_id, 'knowledge.read_shared'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );
CREATE POLICY "concepts_write" ON public.concepts FOR ALL
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'knowledge.upload'))
    OR public.has_permission(organization_id, 'knowledge.manage_all')
  );

ALTER TABLE public.concept_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cv_select" ON public.concept_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = concept_id));

ALTER TABLE public.concept_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_select" ON public.concept_sources FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = concept_id));
CREATE POLICY "cs_write" ON public.concept_sources FOR ALL
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = concept_id));

ALTER TABLE public.concept_relationships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_select" ON public.concept_relationships FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = concept_id));
CREATE POLICY "cr_write" ON public.concept_relationships FOR ALL
  USING (EXISTS (SELECT 1 FROM public.concepts c WHERE c.id = concept_id));

ALTER TABLE public.concept_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "concept_locks_select" ON public.concept_locks FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "concept_locks_write" ON public.concept_locks FOR ALL
  USING (public.has_permission(organization_id, 'knowledge.lock'));

ALTER TABLE public.source_conflicts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "source_conflicts_select" ON public.source_conflicts FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "source_conflicts_write" ON public.source_conflicts FOR ALL
  USING (public.has_permission(organization_id, 'knowledge.upload') OR public.has_permission(organization_id, 'knowledge.manage_all'));

--------------------------------------------------------------------------------
-- 3. Course Authoring Domain
--------------------------------------------------------------------------------
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "courses_select" ON public.courses FOR SELECT
  USING (
    created_by = auth.uid()
    OR public.is_course_team(id)
    OR public.has_permission(organization_id, 'course.edit_all')
    OR public.has_permission(organization_id, 'course.review')
  );
CREATE POLICY "courses_insert" ON public.courses FOR INSERT
  WITH CHECK (
    public.has_permission(organization_id, 'course.create')
  );
CREATE POLICY "courses_update" ON public.courses FOR UPDATE
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'course.edit_own'))
    OR public.is_course_team(id)
    OR public.has_permission(organization_id, 'course.edit_all')
  );
CREATE POLICY "courses_delete" ON public.courses FOR DELETE
  USING (
    (created_by = auth.uid() AND public.has_permission(organization_id, 'course.archive'))
    OR public.has_permission(organization_id, 'course.edit_all')
  );

ALTER TABLE public.course_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_versions_select" ON public.course_versions FOR SELECT
  USING (public.is_course_team(course_id) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.has_permission(c.organization_id, 'course.edit_all')));
CREATE POLICY "course_versions_write" ON public.course_versions FOR ALL
  USING (public.is_course_team(course_id) OR EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND public.has_permission(c.organization_id, 'course.edit_all')));

ALTER TABLE public.course_collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaborators_select" ON public.course_collaborators FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "collaborators_write" ON public.course_collaborators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.created_by = auth.uid() OR public.has_permission(c.organization_id, 'course.edit_all'))));

ALTER TABLE public.course_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_sources_select" ON public.course_sources FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "course_sources_write" ON public.course_sources FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.course_concepts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "course_concepts_select" ON public.course_concepts FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "course_concepts_write" ON public.course_concepts FOR ALL
  USING (public.is_course_team(course_id));

--------------------------------------------------------------------------------
-- 4. Content & Curriculum Domain
--------------------------------------------------------------------------------
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "modules_select" ON public.modules FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "modules_write" ON public.modules FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.module_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mv_select" ON public.module_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.modules m WHERE m.id = module_id AND public.is_course_team(m.course_id)));

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "lessons_write" ON public.lessons FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.lesson_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lv_select" ON public.lesson_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND public.is_course_team(l.course_id)));

ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections_select" ON public.lesson_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND public.is_course_team(l.course_id)));
CREATE POLICY "sections_write" ON public.lesson_sections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = lesson_id AND public.is_course_team(l.course_id)));

ALTER TABLE public.learning_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lo_select" ON public.learning_objectives FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "lo_write" ON public.learning_objectives FOR ALL
  USING (public.has_permission(organization_id, 'course.edit_own'));

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessments_select" ON public.assessments FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "assessments_write" ON public.assessments FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aq_select" ON public.assessment_questions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_course_team(a.course_id)));
CREATE POLICY "aq_write" ON public.assessment_questions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND public.is_course_team(a.course_id)));

ALTER TABLE public.question_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qo_select" ON public.question_objectives FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.assessment_questions q JOIN public.assessments a ON q.assessment_id = a.id WHERE q.id = question_id AND public.is_course_team(a.course_id)));
CREATE POLICY "qo_write" ON public.question_objectives FOR ALL
  USING (EXISTS (SELECT 1 FROM public.assessment_questions q JOIN public.assessments a ON q.assessment_id = a.id WHERE q.id = question_id AND public.is_course_team(a.course_id)));

ALTER TABLE public.flashcard_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcard_sets_select" ON public.flashcard_sets FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "flashcard_sets_write" ON public.flashcard_sets FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "flashcards_select" ON public.flashcards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.flashcard_sets fs WHERE fs.id = set_id AND public.is_course_team(fs.course_id)));
CREATE POLICY "flashcards_write" ON public.flashcards FOR ALL
  USING (EXISTS (SELECT 1 FROM public.flashcard_sets fs WHERE fs.id = set_id AND public.is_course_team(fs.course_id)));

ALTER TABLE public.worksheets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worksheets_select" ON public.worksheets FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "worksheets_write" ON public.worksheets FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.worksheet_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ws_select" ON public.worksheet_sections FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id = worksheet_id AND public.is_course_team(w.course_id)));
CREATE POLICY "ws_write" ON public.worksheet_sections FOR ALL
  USING (EXISTS (SELECT 1 FROM public.worksheets w WHERE w.id = worksheet_id AND public.is_course_team(w.course_id)));

--------------------------------------------------------------------------------
-- 5. Visual Identity & Assets Domain
--------------------------------------------------------------------------------
ALTER TABLE public.visual_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vi_select" ON public.visual_identities FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "vi_write" ON public.visual_identities FOR ALL
  USING (public.has_permission(organization_id, 'course.edit_own'));

ALTER TABLE public.visual_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vs_select" ON public.visual_slots FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "vs_write" ON public.visual_slots FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.visual_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vp_select" ON public.visual_prompts FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.visual_slots s WHERE s.id = slot_id AND public.is_course_team(s.course_id)));
CREATE POLICY "vp_write" ON public.visual_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.visual_slots s WHERE s.id = slot_id AND public.is_course_team(s.course_id)));

ALTER TABLE public.visual_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "va_select" ON public.visual_assets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.visual_slots s WHERE s.id = slot_id AND public.is_course_team(s.course_id)));
CREATE POLICY "va_write" ON public.visual_assets FOR ALL
  USING (EXISTS (SELECT 1 FROM public.visual_slots s WHERE s.id = slot_id AND public.is_course_team(s.course_id)));

--------------------------------------------------------------------------------
-- 6. Quality & Publishing Domain
--------------------------------------------------------------------------------
ALTER TABLE public.quality_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qa_select" ON public.quality_audits FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "qa_write" ON public.quality_audits FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.quality_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qf_select" ON public.quality_findings FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.quality_audits a WHERE a.id = audit_id AND public.is_course_team(a.course_id)));
CREATE POLICY "qf_write" ON public.quality_findings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.quality_audits a WHERE a.id = audit_id AND public.is_course_team(a.course_id)));

ALTER TABLE public.change_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_sets_select" ON public.change_sets FOR SELECT
  USING (public.is_course_team(course_id));
CREATE POLICY "cs_sets_write" ON public.change_sets FOR ALL
  USING (public.is_course_team(course_id));

ALTER TABLE public.change_set_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csi_select" ON public.change_set_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.change_sets cs WHERE cs.id = change_set_id AND public.is_course_team(cs.course_id)));
CREATE POLICY "csi_write" ON public.change_set_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.change_sets cs WHERE cs.id = change_set_id AND public.is_course_team(cs.course_id)));

ALTER TABLE public.publication_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_select" ON public.publication_records FOR SELECT
  USING (public.is_course_team(course_id) OR public.has_permission(organization_id, 'course.publish'));
CREATE POLICY "pr_write" ON public.publication_records FOR ALL
  USING (public.has_permission(organization_id, 'course.publish'));

ALTER TABLE public.published_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "published_courses_select" ON public.published_courses FOR SELECT
  USING (is_current = true AND public.is_org_member(organization_id));
CREATE POLICY "published_courses_write" ON public.published_courses FOR ALL
  USING (public.has_permission(organization_id, 'course.publish'));

ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enrollments_select" ON public.enrollments FOR SELECT
  USING (user_id = auth.uid() OR public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "enrollments_write" ON public.enrollments FOR ALL
  USING (user_id = auth.uid() OR public.has_permission(organization_id, 'admin.users'));

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lesson_progress_own" ON public.lesson_progress FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE public.assessment_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "assessment_attempts_own" ON public.assessment_attempts FOR ALL
  USING (user_id = auth.uid());

ALTER TABLE public.instructor_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "instructor_notes_select" ON public.instructor_notes FOR SELECT
  USING (
    public.has_permission(organization_id, 'studio.access')
    AND (author_id = auth.uid() OR public.has_permission(organization_id, 'course.edit_all'))
  );
CREATE POLICY "instructor_notes_write" ON public.instructor_notes FOR ALL
  USING (
    public.has_permission(organization_id, 'studio.access')
    AND author_id = auth.uid()
  );

ALTER TABLE public.artifact_concept_refs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "acr_select" ON public.artifact_concept_refs FOR SELECT
  USING (public.has_permission(organization_id, 'studio.access'));
CREATE POLICY "acr_write" ON public.artifact_concept_refs FOR ALL
  USING (public.has_permission(organization_id, 'course.edit_own'));

--------------------------------------------------------------------------------
-- 7. Jobs & AI Domain
--------------------------------------------------------------------------------
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jobs_select" ON public.generation_jobs FOR SELECT
  USING (created_by = auth.uid() OR public.has_permission(organization_id, 'admin.jobs'));

ALTER TABLE public.generation_job_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "job_steps_select" ON public.generation_job_steps FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.generation_jobs j WHERE j.id = job_id AND (j.created_by = auth.uid() OR public.has_permission(j.organization_id, 'admin.jobs'))));

ALTER TABLE public.ai_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_requests_select" ON public.ai_requests FOR SELECT
  USING (user_id = auth.uid() OR public.has_permission(organization_id, 'admin.jobs'));
