# Instructor Studio / AI Course Factory: Architecture Contract

Authoritative spec: the Master PRD (see conversation / `docs/MASTER_PRD_SUMMARY.md` once written).
This file is the **engineering contract** every contributor builds against. Change it only via the coordinator.

## 1. Stack decisions

| Concern | Decision | Why |
|---|---|---|
| Frontend | Existing React 19 + Vite 6 SPA (no Next.js) | PRD §3, §12 |
| API | **Hono** app in `server/`, exposed on Vercel through ONE catch-all function `api/[[...route]].ts` | Portable (Node, Vercel, Bun, Supabase Edge); avoids Vercel Hobby 12-function cap |
| Local API | `server/dev.ts` via `@hono/node-server` on :8787, Vite proxies `/api` | Runs without Vercel or Base44 |
| DB | Supabase Postgres; SQL migrations in `supabase/migrations/` (reproducible) | PRD §110 |
| Auth | Supabase Auth (email+password, magic link). Server verifies JWT, loads roles from `user_roles` | PRD §8, §81 |
| Authorization | `shared/auth/permissions.ts` matrix (server authoritative) + SQL RLS helpers mirroring it | PRD §82 |
| Files | Supabase Storage private buckets; browser uploads via server-issued **signed upload URLs** | Vercel 4.5 MB body limit; PRD §80 |
| AI | `server/ai/` gateway; provider adapters; DeepSeek default (OpenAI-compatible Chat Completions, JSON mode) | PRD §6-7 |
| Embeddings | `server/ai/embeddings/` provider interface. `openai` (text-embedding-3-small, 1536d) if `OPENAI_API_KEY`, else `none` -> Postgres full-text search fallback. DeepSeek has **no embeddings API**. | PRD §71 |
| Jobs | **Database-backed durable queue**: `generation_jobs` + `generation_job_steps`, atomic claim RPC (`FOR UPDATE SKIP LOCKED`), one small step per worker invocation | PRD §26-29, §144-146 |
| Validation | `zod` for all request bodies and all AI structured output | PRD §74 |
| Tests | `vitest` (server + shared units, mocked AI), SQL/RLS tests against local Postgres+pgvector, Playwright smoke | PRD §111 |

## 2. Directory layout

```
api/[[...route]].ts        Vercel entry -> server/app.ts (only file in api/)
server/
  app.ts                   createApp(): Hono basePath('/api'), error handler, registerRoutes
  context.ts               AppEnv, AuthContext
  env.ts                   serverEnv (server-only secrets)
  dev.ts                   local node server
  lib/                     supabase admin client, errors, validation, activity log, rate limit, storage
  middleware/              requestId, requireAuth, requirePermission, rateLimit
  routes/<feature>.ts      one Hono sub-app per feature; mounted in routes/index.ts
  ai/
    gateway.ts             the ONLY entry point features call
    providers/deepseek.ts  provider adapter(s); providers/types.ts
    embeddings/            embedding providers
    images/                ImageGenerationProvider interface ONLY (no V1 implementation)
    prompts/registry.ts    versioned system prompts (course-architect-v1, ...)
    skills/<skill>/        knowledge-analyst, course-architect, lesson-writer, assessment-designer,
                           visual-director, source-auditor, course-director (prompt + zod schema + fn)
    tiers.ts               LIGHT / STANDARD / HIGH / MAX presets
  jobs/                    queue.ts (enqueue, claim, complete, fail, retry, cancel), worker.ts, handlers registry
  knowledge/ courses/ visuals/ quality/ publishing/   domain services (server-side)
shared/                    isomorphic types + zod schemas + permissions (NO secrets, NO node-only imports)
src/
  services/supabase/client.ts   browser Supabase client (anon key only)
  services/api/client.ts        apiFetch(): adds Bearer token, parses ApiErrorBody
  features/auth/                AuthProvider, useAuth, sign-in UI, route guards
  features/instructor/          Studio shell + pages (dashboard, knowledge, courses, curriculum, lessons,
                                assessments, visuals, quality, publishing, jobs, admin)
  components/shared/            design system (Card, Badge, StatusBadge, Dialog, Dropzone, ProgressSteps, ...)
supabase/
  migrations/*.sql         ordered, idempotent-safe where practical
  seed.sql                 default organization, dev-only seed
  tests/*.sql              RLS tests (run by scripts/db/test.sh against local Postgres)
scripts/db/                local Postgres harness with Supabase auth/storage stubs
```

## 3. Conventions (MUST follow)

1. **ESM `.js` import extensions** in `server/`, `shared/`, `api/`: `import { x } from './lib/errors.js'` (TypeScript resolves to `.ts`). Required for Node ESM on Vercel (`"type": "module"`).
2. **Never** import `server/*` from `src/*`. `src/` may import `shared/*`.
3. Secrets only via `server/env.ts`. Only `VITE_*` values reach the browser.
4. Every mutating route: `requireAuth()` -> `requirePermission(p)` -> zod-validate body -> ownership/org check -> DB write -> `logActivity()`.
5. Server uses the **service-role** client for writes *after* explicit authorization checks, OR a user-scoped client (`createUserClient(accessToken)`) so RLS applies. RLS must be correct regardless (defense in depth).
6. Errors: throw `new HttpError(status, code, message, { details, retryable })`; the app error handler returns `ApiErrorBody` (`shared/api.ts`). Never "Something went wrong".
7. All IDs are UUIDs. No titles/filenames as identifiers.
8. Soft delete (`archived_at` / `deleted_at`) for important records.
9. Optimistic locking: editable artifacts carry `version int`; updates send `expectedVersion`; mismatch -> 409 `conflict`.
10. AI output that feeds the DB must be zod-validated; invalid -> one repair retry -> fail step with clear error.
11. Retrieved source text is **untrusted data**: wrap in delimiters, never concatenate into system prompts (PRD §73).
12. No fake UI: unimplemented features show an honest "not available yet" state, never simulated success.
13. Heavy commands on the shared 1-CPU/1 GB sandbox: wrap with `flock /tmp/vcu-heavy.lock <cmd>` (tsc, vite build, vitest).

## 4. Core platform tables (exact names; full schema lives in migrations)

- `organizations(id uuid pk, slug text unique, name, created_at)`; default org id `00000000-0000-0000-0000-000000000001`.
- `profiles(id uuid pk = auth.users.id, email, display_name, avatar_url, bio, legacy_user_id text null, xp int, level int, subscription_tier text default 'free', created_at, updated_at)`
- `organization_members(organization_id, user_id, created_at, pk(org,user))`
- `user_roles(id, user_id, organization_id, role public.app_role, granted_by, created_at, unique(user_id, organization_id, role))`
- enum `public.app_role`: student, moderator, instructor, senior_instructor, admin, headmaster
- `activity_log(id, organization_id, actor_id, action text, entity_type text, entity_id uuid null, metadata jsonb, created_at)`
- `ai_requests(id, organization_id, user_id, job_id, job_step_id, skill, prompt_version, provider, model, tier, status 'success'|'error', error, input_tokens, output_tokens, cached_tokens, latency_ms, estimated_cost_usd numeric(12,6), course_id, lesson_id, metadata jsonb, created_at)` (no prompt bodies by default)
- `app_settings(organization_id, key text, value jsonb, updated_by, updated_at, pk(org,key))` (AI config etc.; never secrets)
- `rate_limits(key text, window_start timestamptz, count int, pk(key, window_start))` + rpc `hit_rate_limit(p_key text, p_window_seconds int, p_max int) returns boolean` (true = allowed)
- enum `job_state`: queued, running, paused, retrying, completed, failed, cancelled
- enum `job_step_state`: pending, running, completed, failed, skipped, cancelled
- `generation_jobs(id, organization_id, created_by, type text, state job_state, course_id, module_id, lesson_id, source_id, progress numeric(5,2), current_stage text, idempotency_key text, input jsonb, result jsonb, error text, attempt_count int, max_attempts int, model text, input_tokens int, output_tokens int, estimated_cost_usd numeric, started_at, completed_at, cancelled_at, created_at, updated_at, unique(organization_id, idempotency_key))`
- `generation_job_steps(id, job_id, seq int, key text, label text, state job_step_state, attempt_count int, max_attempts int, depends_on text[] default '{}', locked_at, locked_by text, next_attempt_at, input jsonb, output jsonb, error text, started_at, completed_at, created_at, updated_at, unique(job_id, key))`
- rpc `claim_next_job_step(p_worker text, p_lock_seconds int default 300) returns setof generation_job_steps` (service role only; claims one runnable step whose deps are completed, `FOR UPDATE SKIP LOCKED`, reclaims expired locks)

SQL helpers (security definer, stable): `public.user_org_roles(p_org uuid) returns app_role[]`, `public.has_org_role(p_org uuid, p_roles app_role[]) returns boolean`, `public.has_permission(p_org uuid, p_permission text) returns boolean` (mirrors the TS matrix).

## 5. Domain tables (owned by the DB migration; names fixed by PRD §68)

courses, course_versions, course_collaborators, modules, module_versions, lessons, lesson_versions, lesson_sections,
knowledge_sources, source_versions, source_chunks (embedding vector(1536), fts tsvector), source_collections,
concepts, concept_sources, concept_relationships, concept_locks, concept_versions, source_conflicts,
course_sources, course_concepts, learning_objectives, assessments, assessment_questions, question_objectives,
flashcard_sets, flashcards, worksheets, worksheet_sections, visual_identities, visual_slots, visual_prompts, visual_assets,
quality_audits, quality_findings, change_sets, change_set_items, publication_records, published_courses (sanitized
student snapshot), enrollments, lesson_progress, assessment_attempts, instructor_notes, activity_log.

## 6. Job model

A job = ordered DAG of small steps (e.g. one lesson = one step). Worker endpoint `POST /api/jobs/worker` (secret or
authenticated pump) claims and runs ONE step, then returns. Pumps: (a) enqueue kicks the worker (`waitUntil` on Vercel),
(b) `GET /api/jobs/:id` polling by the UI pumps one step if runnable, (c) optional scheduler (Vercel Cron / Supabase
pg_cron + pg_net) calling the worker. Steps are idempotent (upsert by stable keys); retry re-runs only failed steps.
State survives refresh/logout because it lives in Postgres.

## 7. Publishing model

Authoring: courses -> course_versions -> modules -> lessons -> lesson_sections (+ visual_slots, assessments, sources).
Publishing snapshots an APPROVED course_version into `published_courses` as a **sanitized** JSON document in the
legacy Classroom `Course` shape (`src/types.ts`) plus visual asset storage paths. Students read only
`published_courses` (RLS). Draft edits create/modify a newer version; the published snapshot never changes until the
next publish. Classroom shows seeded local courses + published courses.

## 8. Ownership map for parallel work (wave 1)

| Agent | Owns (may create/modify) |
|---|---|
| db | `supabase/**`, `scripts/db/**`, `shared/db/**` |
| platform | `server/lib/**`, `server/middleware/**`, `server/dev.ts`, `api/**`, `server/routes/{me,admin}.ts`, `vite.config.ts` (proxy only), `vitest.config.ts`, package.json scripts |
| ai | `server/ai/**`, `shared/ai/**` |
| jobs | `server/jobs/**`, `server/routes/jobs.ts`, `shared/jobs/**`, `src/features/jobs/**` |
| auth-ui | `src/features/auth/**`, `src/services/supabase/**`, `src/context/AppContext.tsx` (auth parts), `src/components/auth/**`, `src/lib/permissions.ts`, `src/components/Navbar.tsx`, `src/main.tsx` |
| studio-shell | `src/features/instructor/**` (shell + routing + dashboard frame), `src/components/shared/**`, `src/services/api/**`, `src/App.tsx` (creator mount line only) |

Coordinator owns: `server/routes/index.ts`, `server/app.ts`, this document, merges.
