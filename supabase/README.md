# Supabase Database Documentation

This document describes the Supabase database schema, Row Level Security (RLS) model, RPC functions, storage buckets, search strategy, migration process, testing, and post-setup configuration.

---

## 1. Table Groups per Migration

### `20260926000001_extensions_core.sql` — Extensions & Core Platform
- `organizations`: Multi-tenant organization definitions (default org ID `00000000-0000-0000-0000-000000000001`).
- `profiles`: User profiles linked to `auth.users` with display, bio, gamification XP/level, and subscription tier.
- `organization_members`: Junction table mapping users to organizations.
- `user_roles`: Multi-role assignments (`public.app_role`) per user and organization.
- `role_permissions`: Role permission matrix generated from TypeScript auth definitions.
- `activity_log`: Audit trail of user and system events across entities and organizations.
- `app_settings`: Organization-scoped key-value JSON configurations.
- `rate_limits`: Sliding-window request rate counters.

### `20260926000002_knowledge.sql` — Knowledge Vault
- `knowledge_sources`: Source documents uploaded or registered in the vault with authority level and visibility.
- `source_versions`: Historical revisions of raw source content.
- `source_chunks`: Chunked text segments with pgvector embeddings and English tsvector search columns.
- `source_collections`: Named groupings and collections of knowledge sources.
- `source_collection_members`: Junction table mapping knowledge sources to source collections.
- `concepts`: Extracted domain concepts with authority level (1–5) and visibility controls.
- `concept_versions`: Historical revisions of domain concepts.
- `concept_sources`: Junction table linking concepts to grounding knowledge sources with relevance scores.
- `concept_relationships`: Graph edges connecting concepts with relationship classifications.
- `concept_locks`: Administrative lock records for canonical concepts.
- `source_conflicts`: Tracked contradictions or conflicts between sources or concepts.

### `20260926000003_courses.sql` — Course Authoring
- `courses`: High-level course metadata, strategy settings, workflow state, and active version reference.
- `course_versions`: Immutable or draft structural version snapshots (blueprints) of courses.
- `course_collaborators`: Co-authors and assigned team members for courses.
- `course_sources`: Junction table mapping knowledge sources to courses.
- `course_concepts`: Junction table mapping concepts to courses.

### `20260926000004_content.sql` — Content & Curriculum
- `modules`: High-level structural units within a course.
- `module_versions`: Revision history for course modules.
- `lessons`: Individual learning units (articles, quizzes, videos, etc.) within modules.
- `lesson_versions`: Revision history for individual lessons.
- `lesson_sections`: Content blocks (markdown/media) within a lesson, with provenance metadata.
- `learning_objectives`: Polymorphic outcome statements attached to courses, modules, or lessons.
- `assessments`: Quizzes and tests linked to courses or lessons.
- `assessment_questions`: Questions inside assessments with type, choices, correct answers, and concept references.
- `question_objectives`: Junction table mapping assessment questions to learning objectives.
- `flashcard_sets`: Container sets for study flashcards linked to courses or lessons.
- `flashcards`: Front/back flashcard study cards within a set.
- `worksheets`: Practical exercise worksheets attached to courses or lessons.
- `worksheet_sections`: Structured content sections within a worksheet.

### `20260926000005_visuals.sql` — Visual Identity & Assets
- `visual_identities`: Design system parameters (color palettes, typography, layout) for orgs/courses.
- `visual_slots`: Image/diagram placeholders embedded in lessons with necessity, purpose, and quality settings.
- `visual_prompts`: Generated AI prompts for visual slots with model and version parameters.
- `visual_assets`: Storage metadata and links for uploaded or generated image files.

### `20260926000006_quality_publishing.sql` — Quality & Publishing
- `quality_audits`: Automated and manual quality evaluation audit runs for courses.
- `quality_findings`: Specific findings and flags raised during quality audits.
- `change_sets`: Groupings of proposed updates across course entities.
- `change_set_items`: Granular before/after entity snapshots within a change set.
- `publication_records`: Audit log of course publication events.
- `published_courses`: Published snapshot of course data for student/classroom delivery.
- `enrollments`: Student course enrollment records.
- `lesson_progress`: Student progress tracking per lesson.
- `assessment_attempts`: Student quiz attempts with scores, pass/fail status, and answers.
- `instructor_notes`: Internal non-student-visible notes attached to any entity.
- `artifact_concept_refs`: Dependency links connecting system artifacts to domain concepts.

### `20260926000007_jobs_ai.sql` — Jobs & AI Auditing
- `generation_jobs`: Asynchronous AI generation job queue entries with idempotency and token/cost tracking.
- `generation_job_steps`: Granular workflow steps within a generation job, supporting concurrency locks and retries.
- `ai_requests`: Comprehensive audit log of raw LLM/AI provider API calls (latency, tokens, cost).

### `20260926000008_functions.sql` — Database Functions & Triggers
- Helper functions (`user_org_roles`, `has_org_role`, `has_permission`, `create_default_visual_identity`, `set_updated_at`).
- RPC procedures (`claim_next_job_step`, `match_source_chunks`, `search_source_chunks_fts`, `hit_rate_limit`).
- Auth triggers (`handle_new_user` on `auth.users`).

### `20260926000009_rls.sql` — Row Level Security
- Row Level Security (RLS) enabled and security policies defined across all public schema tables.

### `20260926000010_storage.sql` — Storage Buckets & Policies
- Storage buckets (`knowledge-sources`, `course-media`) and object RLS policies.

### `20260926000011_role_permissions_seed.sql` — Role Permissions Seed
- Seed SQL populating `public.role_permissions` from `shared/auth/permissions.ts`.

---

## 2. Enums

- `public.app_role`: `'student'`, `'moderator'`, `'instructor'`, `'senior_instructor'`, `'admin'`, `'headmaster'`
- `public.source_processing_state`: `'pending'`, `'extracting'`, `'extracted'`, `'chunking'`, `'chunked'`, `'analyzing'`, `'analyzed'`, `'failed'`, `'ready'`
- `public.knowledge_visibility`: `'private'`, `'course_team'`, `'organization'`, `'canonical_shared'`
- `public.concept_relationship_type`: `'prerequisite'`, `'extends'`, `'contrasts'`, `'related'`, `'part_of'`, `'example_of'`
- `public.conflict_status`: `'open'`, `'resolved'`, `'ignored'`
- `public.course_state`: `'draft'`, `'generating'`, `'in_review'`, `'approved'`, `'published'`, `'archived'`
- `public.lesson_type`: `'video'`, `'audio'`, `'pdf'`, `'quiz'`, `'article'`
- `public.section_provenance`: `'ai_generated'`, `'human_written'`, `'ai_edited'`
- `public.question_type`: `'multiple_choice'`, `'multiple_select'`, `'true_false'`, `'short_answer'`, `'code_prompt'`
- `public.visual_necessity`: `'essential'`, `'helpful'`, `'decorative'`, `'none'`
- `public.visual_purpose`: `'concept_illustration'`, `'diagram'`, `'infographic'`, `'screenshot_mock'`, `'header'`, `'summary_card'`
- `public.visual_quality`: `'standard'`, `'premium'`, `'signature'`
- `public.visual_render_mode`: `'chatgpt_image'`, `'programmatic_diagram'`
- `public.visual_slot_status`: `'missing'`, `'prompt_ready'`, `'uploaded'`, `'needs_revision'`, `'approved'`
- `public.finding_severity`: `'critical'`, `'warning'`, `'suggestion'`
- `public.finding_status`: `'open'`, `'accepted'`, `'fixed'`, `'ignored'`, `'false_positive'`
- `public.change_set_status`: `'proposed'`, `'applied'`, `'rejected'`, `'partially_applied'`
- `public.job_state`: `'queued'`, `'running'`, `'paused'`, `'retrying'`, `'completed'`, `'failed'`, `'cancelled'`
- `public.job_step_state`: `'pending'`, `'running'`, `'completed'`, `'failed'`, `'skipped'`, `'cancelled'`

---

## 3. RLS Model & Helpers

Row Level Security is enabled across all platform tables in `20260926000009_rls.sql`. Security checks rely on the following helper functions:

- `has_permission(p_org uuid, p_permission text)`: Checks if the calling user (`auth.uid()`) holds a role in `p_org` that grants `p_permission` by querying `public.user_roles` joined with `public.role_permissions`.
- `has_org_role(p_org uuid, p_roles public.app_role[])`: Checks if `auth.uid()` possesses any of `p_roles` in `p_org`.
- `user_org_roles(p_org uuid)`: Returns an array of `public.app_role` assigned to `auth.uid()` in `p_org`.
- `is_course_team(p_course_id uuid)`: Evaluates if `auth.uid()` is either the course creator (`courses.created_by`) or listed in `public.course_collaborators`.
- `is_org_member(p_org uuid)`: Evaluates if `auth.uid()` exists in `public.organization_members` for `p_org`.

### Role Permissions Generation
The `public.role_permissions` table is **GENERATED** directly from `shared/auth/permissions.ts`.

- **Regenerate seed**: `npx tsx scripts/db/generate-role-permissions.ts`
- **CI check**: `npx tsx scripts/db/generate-role-permissions.ts --check` (exits 1 if stale)

---

## 4. RPC Signatures

Exact function and RPC signatures defined in `20260926000008_functions.sql`:

```sql
public.user_org_roles(
  p_org uuid
) RETURNS public.app_role[]

public.has_org_role(
  p_org uuid,
  p_roles public.app_role[]
) RETURNS boolean

public.has_permission(
  p_org uuid,
  p_permission text
) RETURNS boolean

public.claim_next_job_step(
  p_worker text,
  p_lock_seconds integer DEFAULT 300
) RETURNS SETOF public.generation_job_steps

public.match_source_chunks(
  p_org uuid,
  p_source_ids uuid[],
  p_query_embedding vector(1536),
  p_match_count integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity double precision,
  authority_level integer
)

public.search_source_chunks_fts(
  p_org uuid,
  p_source_ids uuid[],
  p_query text,
  p_match_count integer DEFAULT 10
) RETURNS TABLE (
  id uuid,
  source_id uuid,
  chunk_index integer,
  content text,
  metadata jsonb,
  rank real,
  authority_level integer
)

public.hit_rate_limit(
  p_key text,
  p_window_seconds integer,
  p_max integer
) RETURNS boolean

public.create_default_visual_identity(
  p_org uuid,
  p_course_id uuid DEFAULT NULL
) RETURNS public.visual_identities
```

---

## 5. Storage Buckets

Configured in `20260926000010_storage.sql`:

1. `knowledge-sources`: Private (`public = false`), max file size 50 MB (52,428,800 bytes).
   - Allowed MIME types: `application/pdf`, `text/plain`, `text/markdown`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `application/msword`, `text/csv`.
2. `course-media`: Private (`public = false`), max file size 15 MB (15,728,640 bytes).
   - Allowed MIME types: `image/png`, `image/jpeg`, `image/webp`, `image/gif`.

### Path Convention & Access
- Path format: `<org_id>/<entity_id>/<file>` (e.g. `<org_id>/<source_id>/document.pdf` or `<org_id>/<slot_id>/diagram.png`).
- Storage RLS policies inspect the first path token `(storage.foldername(name))[1]` as `<org_id>` and verify `has_permission(org_id, ...)` or creator ownership.
- Signed URLs: Because both buckets are private, the server must issue time-limited signed URLs (via Supabase Storage API) for browser downloading and previewing.

---

## 6. Vector Search & FTS Fallback

Hybrid search on `public.source_chunks` supports semantic and keyword querying:

- **pgvector Search**: Column `embedding vector(1536)` with an `ivfflat` index (`vector_cosine_ops`, `lists = 100`). Quereid via `match_source_chunks()` using cosine distance (`1 - (sc.embedding <=> p_query_embedding)`).
- **Full-Text Search (FTS)**: Stored generated column `fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED` indexed with GIN (`idx_source_chunks_fts`). Queried via `search_source_chunks_fts()` using `websearch_to_tsquery('english', p_query)` and `ts_rank_cd`.
- **Fallback Strategy**: When embeddings are not available or exact term matching is required, full-text search serves as a fallback search mechanism.

---

## 7. Applying Migrations to Supabase

### Option A: Supabase CLI
```bash
supabase link --project-ref <project-ref>
supabase db push
```

### Option B: Direct `psql` Execution
```bash
for f in supabase/migrations/*.sql; do
  psql "$SUPABASE_DB_URL" -f "$f"
done
```

---

## 8. Local Testing

Database tests reside in `supabase/tests/`.

### Run local tests
```bash
bun run db:test
```

### Requirements
- Local Postgres 15+ instance with `pgvector` extension installed.
- Spin up local Postgres via provided helper script:
  ```bash
  bash scripts/db/pg-local.sh
  ```

---

## 9. Post-Setup Checklist

1. **Auth > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (or production site URL).
   - **Additional Redirect URLs**: `<site>/auth/reset` (e.g. `http://localhost:3000/auth/reset`).
2. **Promote First Headmaster User**:
   Run SQL after the user registers to grant administrative headmaster permissions:
   ```sql
   INSERT INTO public.user_roles (user_id, organization_id, role)
   VALUES ('<auth-user-uuid>', '00000000-0000-0000-0000-000000000001', 'headmaster');
   ```
3. **Environment Variables**:
   - `VITE_SUPABASE_URL`: Browser/client API endpoint.
   - `VITE_SUPABASE_ANON_KEY`: Browser/client anonymous key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Server-only secret key (Vercel environment).
   - `SUPABASE_DB_URL`: Postgres database connection string (migrations / admin tools only).

---

## 10. Schema Inconsistencies & Recommendations

The following inconsistencies and potential gaps were identified across `supabase/migrations/*.sql`:

1. **Missing `updated_at` Triggers**:
   - Function `public.set_updated_at()` is created in `20260926000008_functions.sql`, but **no `CREATE TRIGGER` statements exist** to automatically invoke it on updates.
   - Affected tables with an `updated_at` column: `profiles`, `app_settings`, `knowledge_sources`, `source_collections`, `concepts`, `source_conflicts`, `courses`, `modules`, `lessons`, `lesson_sections`, `assessments`, `assessment_questions`, `flashcard_sets`, `flashcards`, `worksheets`, `worksheet_sections`, `visual_identities`, `visual_slots`, `quality_findings`, `change_sets`, `instructor_notes`, `generation_jobs`, and `generation_job_steps`.

2. **Missing `updated_at` Column on `organizations`**:
   - Unlike other core entities, `public.organizations` lacks an `updated_at` column and corresponding trigger.

3. **Foreign Key Index Gaps (Potential Performance Bottlenecks)**:
   - `organization_members`: Primary key is `(organization_id, user_id)`. Missing index on `user_id` alone for user org lookups.
   - `source_collection_members`: PK is `(collection_id, source_id)`. Missing index on `source_id`.
   - `concept_sources`: PK is `(concept_id, source_id)`. Missing index on `source_id`.
   - `concept_relationships`: No indexes on `concept_id` or `related_concept_id`.
   - `course_collaborators`: PK is `(course_id, user_id)`. Missing index on `user_id`.
   - `course_sources`: PK is `(course_id, source_id)`. Missing index on `source_id`.
   - `course_concepts`: PK is `(course_id, concept_id)`. Missing index on `concept_id`.
   - `learning_objectives`: Polymorphic lookup `(entity_type, entity_id)` has no index.
   - `question_objectives`: PK is `(question_id, objective_id)`. Missing index on `objective_id`.
   - `flashcard_sets`: Foreign keys `course_id` and `lesson_id` lack indexes.
   - `flashcards`: Foreign key `set_id` lacks index.
   - `worksheets`: Foreign keys `course_id` and `lesson_id` lack indexes.
   - `worksheet_sections`: Foreign key `worksheet_id` lacks index.
   - `visual_assets`: Foreign keys `organization_id`, `course_id`, `module_id`, and `lesson_id` lack indexes.
   - `change_set_items`: Foreign keys `change_set_id` and `(entity_type, entity_id)` lack indexes.
   - `generation_job_steps`: Missing direct index on `(job_id)` (currently 3rd column in `idx_generation_job_steps_claim`), impacting CASCADE deletes on `generation_jobs`.
   - `ai_requests`: Foreign key `user_id` lacks index.

4. **Redundant Indexes**:
   - `idx_user_roles_user_org` on `public.user_roles (user_id, organization_id)` is redundant because the UNIQUE constraint `(user_id, organization_id, role)` automatically indexes `(user_id, organization_id, role)`.
   - `idx_enrollments_user_course` on `public.enrollments (user_id, course_id)` is redundant with UNIQUE constraint `(user_id, course_id)`.
   - `idx_lesson_progress_user_lesson` on `public.lesson_progress (user_id, lesson_id)` is redundant with UNIQUE constraint `(user_id, lesson_id)`.

5. **Missing Uniqueness Constraints**:
   - `courses`: `slug` (or `(organization_id, slug)`) lacks a UNIQUE constraint, permitting duplicate course slugs within an organization.

6. **Circular Foreign Key Reference**:
   - `courses.current_version_id` references `course_versions.id` while `course_versions.course_id` references `courses.id`, requiring deferrable constraints or two-step insertion logic.
