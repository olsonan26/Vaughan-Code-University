# Classroom + Kate contract (v1, 2026-09-28)

Types: `shared/classroom/types.ts`, `shared/kate/types.ts`. DB: `supabase/migrations/20260928000014_classroom_kate.sql` (already applied to live Supabase). Product spec: `docs/KATE.md`.

## Ownership (one agent per area, do not edit other areas' files)
| Area | Files |
|---|---|
| classroom-api | `server/classroom/**`, `server/routes/classroom.ts`, `server/routes/studioClassroom.ts`, `shared/classroom/locks.ts`, `scripts/classroom/**` |
| classroom-ui | `src/components/classroom/**`, `src/features/classroom/**`, `src/features/placement/**` |
| kate-core | `server/kate/*.ts` (not generators/), `server/routes/kate.ts`, `server/ai/providers/openrouter.ts` |
| kate-generators | `server/kate/generators/**`, `server/kate/checker.ts` |
| kate-ui | `src/features/kate/**` |
| eyes | `server/knowledge/figures/**`, figure additions in `server/knowledge/processor.ts` (append-only), `src/features/knowledge/figures/**` |
| ears | `server/knowledge/media/**`, media additions in `server/routes/knowledge.ts` + `server/knowledge/extract.ts` (append-only) |
Shared registration files (`server/routes/index.ts`, `src/features/instructor/InstructorStudio.tsx`, `server/env.ts`): add ONE line each, nothing else; coordinator resolves conflicts.

## Models (OpenRouter, env `OPENROUTER_API_KEY`; NO Gemini)
- Kate chat + writing: `deepseek/deepseek-v4.1-flash`
- Eyes primary: `qwen/qwen3.7-flash` with `reasoning: {enabled:false}`; cross-check `qwen/qwen3.8-flash`
- Ears: `qwen/qwen3.8-omni-flash` (input_audio)
- Checker: `qwen/qwen3.8-flash`
OpenRouter chat endpoint `https://openrouter.ai/api/v1/chat/completions`, OpenAI-compatible (tools, response_format json_object, image_url data URLs, input_audio {data(base64), format}). Always send `usage: {include: true}` and log cost through the existing AI logger.

## Classroom API (classroom-api owns)
Student / public (optional auth; anonymous = level 1, no progress):
- `GET /api/classroom/courses` -> `ClassroomResponse` (only `classroom_visible` courses; items with `published`; locks evaluated for viewer; instructors (permission `classroom.manage`) see everything plus unpublished items, never blocked)
- `POST /api/classroom/lessons/:id/complete` -> `{ ok }` (auth; 403 `locked` if locked)
- `POST /api/classroom/items/:id/attempt` `{ answers: Record<questionId, optionId[]> }` -> `{ scorePercent, passed, results: {questionId, correct, correctOptionIds, explanation}[] }` (server-side grading; answer keys NEVER sent to students in GET)
Instructor (permission `classroom.manage`):
- `GET /api/studio/classroom/tree` -> `{ courses: {id,title,courseCode, modules:{id,title,position, lessons:{id,title,position,itemCount}[]}[]}[] }` (for Placement Picker)
- `POST /api/studio/classroom/items` `{ target: PlacementTarget, title, payload, sourceRefs?, provenance? }` -> `{ item, createdModuleId?, createdLessonId? }` (creates module/lesson when 'new', optional lock)
- `PATCH /api/studio/classroom/items/:id` `{ expectedVersion, title?, payload?, published?, position? }`; `DELETE` = archive
- `POST /api/studio/classroom/modules`, `POST /api/studio/classroom/lessons`, `PATCH` both (title, description, position)
- `PUT /api/studio/classroom/locks` `{ entityType, entityId, rule, message? }` (permission `content.lock`) ; `DELETE /api/studio/classroom/locks?entityType=&entityId=`
- `POST /api/studio/classroom/import` (owner/super_admin) imports `INITIAL_COURSES` from `src/data/initialData.ts` idempotently via `legacy_id` (courses, modules, lessons; lesson contentMarkdown -> `reading` item, videoUrl -> `video` item (parse YouTube id), audioUrl/transcript -> `audio`, pdfUrl -> `pdf`, quiz -> `quiz` item, resources -> `resource` items; lockedLevel -> `min_level` lock; sets `classroom_visible=true`, `state='published'`). Also a CLI `scripts/classroom/import.ts`.
Lock evaluation: pure function in `shared/classroom/locks.ts` `evaluateLock(rule, ctx) -> {locked, reason}` where ctx has viewer level, completed lesson ids, best quiz scores, now, ordered lesson list. Parent lock blocks children. Unit tested.

## Kate API (kate-core owns)
- `POST /api/kate/threads` `{ courseId?, sourceId?, context? }` -> `{ thread }`; `GET /api/kate/threads/:id` -> `{ thread, messages: KateMessageView[] }`
- `POST /api/kate/threads/:id/messages` `{ content, context?: { courseId?, lessonId?, moduleId?, sourceIds? } }` -> `{ messages: KateMessageView[] }` (the new user msg + assistant reply). Kate runs a DeepSeek tool loop (max 6 steps). Tools: `list_classroom`, `list_sources`, `read_source(sourceId, query?)`, `propose_checklist(sourceIds)`, `generate(action, sourceIds, placement, instruction, allowBeyondSource)` (calls kate-generators, returns ChangeSetDraft saved as change set), `edit_item(itemId, instruction)`, `set_lock(...)`, `ask_placement(action)`. Kate NEVER applies changes herself; she proposes a change set and the instructor clicks Apply.
- `POST /api/kate/checklist` `{ sourceIds }` -> `KateChecklist` (also posted into thread when threadId given)
- `POST /api/kate/generate` `{ action, input: GeneratorInput, threadId? }` -> `{ changeSet: ChangeSetView }` (runs as a job when long: returns `{ jobId }` and the change set id arrives in job result)
- `GET /api/kate/change-sets/:id` -> `ChangeSetView`; `POST /api/kate/change-sets/:id/apply` `{ overrideAudit?: boolean }` -> `{ changeSet, created: Record<tempId, realId> }` ; `POST /api/kate/change-sets/:id/revert` -> `{ changeSet }` (restores before_snapshots; deletes created rows)
Apply is transactional-ish: apply ops in order, record before/after snapshots in change_set_items; on failure revert already-applied ops.

## Generators (kate-generators owns): `server/kate/generators/<action>.ts` each `export async function generate(input: GeneratorInput, deps): Promise<ChangeSetDraft>`
Rules: retrieve only chunks (incl. verified figure chunks and transcript chunks) of `input.sourceIds`; every paragraph / question carries `sourceRefs`; gaps listed not invented; `allowBeyondSource=false` default; approved additions are wrapped and tagged `provenance: 'ai_with_approved_additions'`; run `checker.ts` (qwen3.8-flash) against retrieved evidence and attach `audit`. Actions: quiz, flashcards, worksheet, lesson_plan, reading, lesson (reading + quiz + optional flashcards), module (several lessons), course_map (chapters->modules/lessons proposal as create ops), rewrite (existing item -> grammar/clarity/depth, meaning preserved, checker compares), transcript_cleanup. Checklist builder `server/kate/generators/checklist.ts` `buildChecklist(sourceIds, deps): Promise<KateChecklist>`.

## UI
- Placement Picker (`src/features/placement/PlacementPicker.tsx`, classroom-ui owns): dialog Course -> Module (or new) -> Lesson (or new) -> spot (kind/slot) -> optional lock rule; props `{ isOpen, onClose, defaultTarget?, allowedKinds?, onConfirm(target: PlacementTarget) }`. Also used by Kate UI.
- Lock editor (`src/features/placement/LockEditor.tsx`): rule chooser; props `{ value, onChange, lessonsForSelect }`.
- Classroom instructor mode: every course/module/lesson/item shows lock/unlock + "Add material" (opens PlacementPicker preset to that spot) + "Ask Kate" (dispatches `window.dispatchEvent(new CustomEvent('kate:open', { detail: { courseId, moduleId, lessonId } }))`).
- Kate panel (`src/features/kate/KatePanel.tsx`): slide-over chat mounted once in the Studio layout and the Classroom (instructors only), listens to `kate:open`. Renders checklists (two groups: From your source / Beyond your source, unchecked), placement requests (opens PlacementPicker), change-set cards (op list, audit warnings, Apply / Undo), lock question after apply.
