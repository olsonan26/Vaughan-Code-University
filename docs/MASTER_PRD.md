# Master PRD (condensed, authoritative for engineering) - Vaughan Code University AI Instructor Studio & Course Factory

Mission: KNOWLEDGE -> STRUCTURED SCHOOL (not PROMPT -> RANDOM AI COURSE). Authorized instructors upload proprietary
sources; AI turns them into complete, source-grounded curricula; humans review/approve; publish into the existing
University Classroom. Preserve the instructor's teachings; AI must not silently invent or alter the system.

## Non-negotiables
- Extend existing repo; do not rebuild/remove Classroom, Community, Calendar, Members, Profile, Gamification, Admin, Subscription, Navigation.
- NO FAKE FUNCTIONALITY: no fake uploads, hardcoded AI output, fake analytics/progress/DB writes/auth/publishing, dead buttons,
  fake citations, invented scores, state lost on refresh. If not implementable, show an honest limitation.
- NO video generation in V1. Image generation is MANUAL in V1: Visual Director writes ChatGPT-ready prompts; instructor generates
  externally, drags image into the exact slot; app stores image + prompt history. Keep an ImageGenerationProvider interface for later.
- Portable: GitHub source of truth, Vercel deploy, Supabase data. No Base44 runtime dependency.
- Server-side AI only; key never in browser; server verifies user, role, org, course access, vault access before AI calls.

## Roles (§8)
Student: enrolled courses, lessons, quizzes, own progress; no Studio. Instructor: Studio, create courses, upload own sources,
generate, edit own/assigned courses, prompts, images, quizzes, QC, submit for publishing. Senior Instructor: + approved shared
knowledge, review/approve drafts. Admin: users, roles, course ownership, shared knowledge, jobs, failures, publishing perms, AI
settings. Headmaster/Owner: canonical knowledge, locks, authoritative approval, AI model config, publish override, full audit.
Moderator: community only (no Studio). Navigation: UNIVERSITY / INSTRUCTOR / ADMIN sections by role.

## Workflow
Login -> Instructor Dashboard -> Upload knowledge -> AI analyzes -> Knowledge Vault -> Create course -> Course Architect ->
Blueprint -> approve -> lesson generation -> assessments -> visual slots + ChatGPT prompts -> instructor uploads images ->
quality audit -> review -> publish -> students.

## Dashboard (§11, §118)
Hero "AI COURSE STUDIO - Turn your source material into a complete, source-grounded professional curriculum" [Create Course]
[Upload Knowledge]. My Courses cards (cover, status, module/lesson counts, % complete, unresolved QA issues, missing visuals,
last edited), Recent Knowledge, Generation Jobs (real state), Attention Required (real counts), Quick Actions.

## Knowledge Vault (§12-19)
Types: PDF, TXT, MD, DOCX, pasted text, transcripts, CSV, existing University content (URLs later). Source record: id,
filename, title, type, owner, org, uploaded_at, size, mime, storage path, status, page_count, extracted text, authority,
description, author, publication date, version, error, sha256 checksum (duplicate detection).
States: UPLOADED, QUEUED, EXTRACTING, CHUNKING, ANALYZING, INDEXING, READY, FAILED, NEEDS_REVIEW.
Raw sources immutable (Layer A: file, text, page/section refs). Layer B structured knowledge: concepts, definitions, examples,
principles, methods, formulas, warnings, relationships, prerequisites, contradictions, teaching examples.
Authority: 5 CANONICAL, 4 APPROVED CURRICULUM, 3 TRUSTED RESEARCH, 2 WORKING NOTES, 1 EXTERNAL/UNVERIFIED. Conflicts create
conflict records (concept, sources, values, recommended treatment); AI never silently chooses.
Locking (Headmaster/Admin): formulas, terminology, foundational teaching, definitions, rules, methodology. Locked items are never
altered by AI; conflicting output is flagged.
Concept fields: id, name, short definition, extended explanation, category, authority, source refs, related, prerequisites,
examples, formula, warnings, lock status, review status, created_by ai/human, approved_by, timestamps.
Concept graph relations: prerequisite_of, part_of, related_to, contrasts_with, supports, derived_from, example_of, contradicts.
Privacy (§66): Private, Course Team, Organization, Canonical Shared Library. Instructor A cannot read B's private sources.
Deletion warns with impact counts; prefer archive (§115).

## Course creation (§20-22, §119)
Wizard steps: 1 Choose Knowledge, 2 Define Students, 3 Define Outcome, 4 Preferences, 5 Build Curriculum.
Fields: name, target audience, desired outcome, level (Beginner/Intermediate/Advanced/Beginner->Professional), type (Mini,
Standard, Certification, Workshop, Instructor Training, Reference Program), length (AI decide/Short/Medium/Extensive/custom
module range), reading level (Grade 6/8/High school/College/Professional), teaching style (conversational, example-heavy,
academic, evidence-focused, practical, story-driven, certification/professional), assessment difficulty (Basic, Standard,
Challenging, ACT-style reasoning, Professional certification), visual density (Minimal/Balanced/Highly Visual; default Highly
Visual for certification), source mode STRICT | GROUNDED_INFERENCE (default) | RESEARCH_ENABLED (future, disabled).
Source selection: all approved, collection, manual, course library. Never draw from unselected sources.

## Course Architect & blueprint (§23-25)
Inputs: selected sources, concept graph, prerequisites, audience, outcome, length, reading level, style, difficulty.
Outputs: description, promise, prerequisites, ordered modules (description, objectives), lessons (title, objectives, concept
assignments, est. time), assessment strategy, visual strategy. Blueprint editable BEFORE heavy generation: rename/reorder/
add/delete modules & lessons (drag-and-drop), edit objectives, inspect source coverage & concepts, approve.
Prerequisite validation: concept before prerequisite, duplicates, unintroduced concepts, overly dense modules, missing
foundations -> warnings with suggested fix; accept fix / ignore / manual.

## Pipeline & jobs (§26-29, §120, §144-146)
Stages: 01 Validate Sources, 02 Analyze Knowledge, 03 Build Blueprint, 04 Validate Prerequisites, 05 Module Metadata,
06 Lessons, 07 Examples, 08 Exercises, 09 Assessments, 10 Flashcards, 11 Worksheets, 12 Identify Visual Needs, 13 Visual
Prompts, 14 Source Accuracy Audit, 15 Consistency Audit, 16 Ready for Review. Each stage own state. Jobs persisted with type,
user, course/module/lesson, state (QUEUED RUNNING PAUSED RETRYING COMPLETED FAILED CANCELLED), progress, stage, timestamps,
attempts, error, model, tokens, cost. UI shows real pipeline, survives refresh, allows leaving. Retry only failed step/lesson;
cancel; inspect error; regenerate one artifact; idempotent; duplicate clicks do not create duplicates.

## Lessons (§30-35)
Built from objective, assigned concepts, selected sources, prerequisite context, reading level, style, previous/next lesson.
Adaptive structure (hook, objective, explanation, examples, deeper, misunderstanding, application, exercise, knowledge check,
recap, takeaways, sources). Traceability: claims -> source, page, section, chunk/passage id (instructor view).
Lesson Studio: LEFT course structure, CENTER editor, RIGHT AI/Sources/Quality panel. Edit, add/delete/reorder sections,
regenerate selected section, simplify, expand, add example/analogy, adjust reading level, more practical/evidence, check
against sources, generate assessment, add visual slot. Selective AI edits on selection: Rewrite, Simplify, Expand, Add Example,
Add Analogy, More Practical, More Professional, More Conversational, Reduce Words, Increase Depth, Check Accuracy, Find Source,
Create Visual; preview/diff before overwrite. Never regenerate whole lesson unless asked.
Versioning for courses, blueprints, lessons, canonical concepts, image prompts, assessments: version no., timestamp, author,
human/AI, model, change summary, previous ref; restore. Dependency tracking: concept change -> list affected lessons, quizzes,
flashcards, prompts, worksheets; "Review Affected Content"; never auto-rewrite published.
Autosave (Saving/Saved/Save failed). Optimistic locking & conflict notice (§78-79).

## Visual Director (§36-50, §101-103, §124-129) MISSION-CRITICAL
Never lazy prompts. Dedicated locked skill. Steps: understand teaching; decide pedagogical value; choose type; define what the
student must understand; design composition; apply course visual identity; produce ChatGPT-optimized prompt.
Need: ESSENTIAL | HELPFUL | DECORATIVE | NONE. Density: Minimal (essential), Balanced (+selected helpful), Highly Visual
(+helpful +premium supporting); never quota-stuff. Purpose: instructional, explanatory, structural, mnemonic, emotional,
inspirational, cover, divider, example, comparison, process, reference. Types: module cover, lesson header, premium concept
illustration, realistic cinematic educational scene, diagram, infographic, process graphic, flowchart, timeline, concept map,
calculation breakdown, annotated example, comparison, data visualization, symbolic illustration, mnemonic, reference chart,
worksheet visual, premium chapter divider.
Render mode: CHATGPT_IMAGE (cinematic, metaphor, realistic, symbolic, module art, covers) vs PROGRAMMATIC_DIAGRAM (exact
formulas, dense tables, text-heavy flowcharts, calculations, charts, matrices, timelines, data viz, many exact words).
Course visual identity (editable): style name, mood, realism, sophistication, lighting, texture, color tendencies, typography,
background, diagram style, preferred metaphors, forbidden cliches, brand elements. All prompts inherit it.
DEFAULT IDENTITY: premium, sophisticated, cinematic, elegant, educational, visually memorable; high-end certification course
feel; polished, refined, intelligent, high production value, premium editorial aesthetic, strong composition & hierarchy,
believable materials, rich depth, subtle dimensionality, controlled lighting, tasteful contrast, beautiful negative space,
emotionally resonant when appropriate, clear for teaching, coherent across a module. AVOID: generic AI art, cheap stock photo,
cartoon clip-art, low-quality infographic templates, excessive neon, random glowing symbols, clutter, cheesy mystical cliches,
overdone fantasy, irrelevant decoration, excessive text in images, cheap social-graphic look, inconsistent language,
oversaturation, bad anatomy, inaccurate formulas, invented educational content.
Quality levels: STANDARD, PREMIUM, SIGNATURE (module covers, key concepts, emotional lessons, major artwork).
Brief fields: id, lesson, section, title, purpose, importance, type, quality, teaching objective, concept, placement, required
elements, optional elements, composition, camera/perspective, lighting, material/texture, mood, brand style, color direction,
text requirements, accuracy requirements, aspect ratio, negative requirements, source context, status.
Final prompt: standalone, paste-ready; what to create, why, subject, exact concept, educational meaning, spatial composition,
focal hierarchy, metaphor, realistic details, materials, lighting, perspective, depth, environment, typography safe space, text
restrictions, style, premium expectations, aspect ratio, what must stay accurate, what must not appear. NO internal IDs.
Directive: "You are the Visual Director for a premium professional educational platform. Your job is not merely to request an
image; design a visual learning artifact. First determine what the learner must understand or feel. Then the best visual form.
Specific enough for a world-class artist. Educational clarity first, beauty second, aim for both. Avoid generic AI phrasing and
cliche symbolism unless clearest. Module artwork: think like a cinematic art director + editorial designer + educational visual
storyteller. Instructional graphics: world-class information designer. Maintain course identity. If exact text/math/formulas are
critical, recommend programmatic rendering. Never invent educational facts. Faithfully represent lesson content."
Think-before-prompting checklist (§125): what must student understand; is image useful; best form; does exact text matter;
programmatic instead?; main focal element; what must NOT be implied; identity rules; aspect ratio; what makes it premium.
Example STRONG prompt (§124): "Create a premium educational visual explaining the relationship between the compound number 41
and its reduced value 5. The learner must understand that 41 retains interpretive significance before reduction. Make 41 the
dominant visual element, separate the digits 4 and 1 clearly, then guide the eye through 4 + 1 = 5 as a secondary reduction
path. Use refined dimensional typography, subtle depth, disciplined negative space and an elegant professional
certification-course aesthetic. Avoid mystical cliches, neon numerology graphics, decorative zodiac imagery or cheap infographic
styling. Maintain strong visual hierarchy and make the relationship understandable at a glance to an eighth-grade learner while
remaining sophisticated enough for professional adult education. Landscape 16:9 composition with generous safe margins. Do not
introduce any additional numbers or interpretations." Weak: "Create a diagram about compound numbers." (unacceptable)
Module covers (§126): exceptional, clear conceptual symbolism, dramatic but controlled, hierarchy, negative space,
sophisticated lighting, depth, series consistency, no cheap AI-fantasy poster. Infographics (§127): understanding, order,
hierarchy, limited complexity. Text policy (§128): small labels only; large text -> programmatic. Revision (§129): "not dramatic
enough" / "clearer" / "more premium" -> regenerate preserving purpose, new prompt version.
Slot UI (§47): inline in lesson at exact spot: title, importance, purpose, aspect; View prompt, Copy prompt, drag image here or
Upload. After upload (§48): storage, associate slot, keep original + current prompt version, metadata, timestamp, uploader,
mark complete, progress, display, replace (keeps history, §102), download, view/revise prompt, remove, approve.
Asset record (§49): id, slot, course, module, lesson, uploaded_by, original file, current file, mime, width, height, prompt id,
prompt version, status, approved, approved_by, uploaded_at, notes. Visual Production dashboard (§50): totals completed/missing/
needs revision/approved/progress; filters all, missing, essential, helpful, module, lesson, awaiting approval, revision;
"Next Missing Visual". Badges: Missing, Prompt Ready, Uploaded, Needs Revision, Approved.

## Assessments, flashcards, worksheets (§51-55)
Types: multiple choice, multi-select, true/false, scenario reasoning, application, matching, calculation, written response,
case study, certification. No obviously wrong distractors, off-objective trivia, untaught material, ambiguity, repetition, or
easy questions at high difficulty. Map objective -> question -> difficulty -> concept -> lesson -> source; correct answer +
rationale. Coverage report per objective (0 questions flagged; certification mode must cover all). Flashcards: term->definition,
concept->explanation, formula->meaning, Q->A, scenario->interpretation; quality over quantity. Worksheets: exercises,
fill-ins, calculation practice, reflection, case analysis, tables, guided practice (structured content; PDF optional).

## Quality (§56-58, §153-156)
Categories: source grounding (supported/partial/unsupported), contradictions (lesson vs canonical, source vs source, lesson vs
lesson), prerequisites, duplication, terminology, reading level, objective coverage (taught/assessed), course flow, visual
coverage. Lesson accuracy view: counts from real checks; click issue -> claim, supporting source, why flagged, suggested fix;
actions Remove, Rewrite, Find Evidence, Accept, Mark Approved. NEVER invent precision; if no real basis, show descriptive
status. Full Course Audit grouped Critical/Warning/Suggestion. Finding status: Open, Accepted, Fixed, Ignored, False Positive
(+notes). Readiness derived only from real checks, explained.

## Course Director & changesets (§59-60)
Conversational instructor assistant with course data access: review, confusion points, repetition, "make Module 3 easier without
changing 1-2", untested concepts, canonical contradictions, reading level. REQUEST -> ANALYSIS -> PROPOSED CHANGESET -> REVIEW ->
APPLY. Changeset: what, why, affected lessons/quizzes/visuals/concepts; apply all / selected / reject.

## Publishing (§61-65, §147-149, §156)
Course states DRAFT, GENERATING, IN_REVIEW, APPROVED, PUBLISHED, ARCHIVED. Only authorized roles publish. Readiness checklist:
curriculum approved, lessons complete, assessment coverage, unsupported claims, essential visuals missing, audit. Blockers: no
modules, missing lesson content, unresolved canonical conflict, critical unsupported claim, missing assessment when
certification requires; missing visuals warn or block by importance; override for authorized. Direct integration: published
version feeds the existing Classroom, no export/re-entry. Draft vs published: students keep v1.0 while v1.1 is drafted.
Students see cover, modules, lessons, visuals, text, exercises, quizzes, flashcards, progress. NEVER expose prompts, AI
metadata, source internals/chunks/private files, drafts, QA flags, confidence fields, private notes. Preview-as-student without
publishing, marked PREVIEW MODE.

## Data, AI, security (§67-83, §91-94)
Normalized Postgres; UUIDs. Vector retrieval, never dump whole library; priority: locked canonical, highest-authority selected
sources, related concepts, prerequisites, lower-authority selected. Prompt-injection resistance: source text is content, not
instructions. Structured schema output validated before insert. AI request logging (type, model, user, course, lesson, times,
success, retry, tokens, latency, cost; no secrets). Cost controls: no needless full regeneration, cache analysis, reuse
concepts/embeddings, regenerate sections, show scope before expensive ops ("This will regenerate 1 module, 7 lessons, 3 quizzes,
11 visual prompts. Continue?"). Tiers LIGHT/STANDARD/HIGH/MAX configurable centrally. Security: server authz, ownership,
RLS, signed private file access, rate limiting for AI, input validation, upload size/type validation, safe filenames. Audit
trail (activity_log). Admin AI settings: provider, model id, defaults, tiers, limits, rate limits, external research flag,
prompt version, Visual Director version; never show key. Prompt versions (course-architect-v1, lesson-writer-v1,
assessment-engine-v1, source-auditor-v1, visual-director-v1). Distinct AI roles: Knowledge Analyst (extract not invent, cite,
uncertainty, duplicates, contradictions, formulas exact, terminology, example vs rule, opinion vs methodology), Course Architect
(prereqs, no repetition, audience, outcome, concept->objective, coherent, grounded, no internet), Lesson Writer (objectives,
approved sources, locked knowledge, clear, examples, no unsupported certainty, no untaught advanced, reading level, style),
Assessment Designer (taught content, objectives, plausible distractors, no tricks, varied demand, difficulty, answer, rationale,
concept ref), Visual Director, Source Auditor (vs locked, selected sources, concepts: supported/partial/unsupported/conflict/
ambiguous; no support without evidence), Course Director (sequence, prereqs, clarity, repetition, density, coverage,
terminology, visuals, integrity; recommend not silently apply).

## UX (§86-90, §117, §130-132, §149-152)
Premium, calm, powerful, not cluttered; cards, progress states, contextual sidebars, tabs, command menu, drag-and-drop,
expandable source refs, inline AI actions. Desktop-first; tablet usable; mobile: monitor jobs, review, approve, light edits,
upload images. Real loading states everywhere. Specific errors ("Lesson 4.2 generation failed after the DeepSeek request timed
out. Lessons 1-4.1 are safe. Retry Lesson 4.2."). Empty states ("Upload your first source to begin building the University's AI
knowledge base." / "This course currently has no visual slots." / "Create your first AI-assisted curriculum."). Private instructor
notes on course/module/lesson/concept/visual/source. Search across courses, lessons, concepts, sources, prompts. Jump to source
evidence (source, page, [VIEW SOURCE]). Course badges Draft, Generating, Needs Review, Ready, Published, Archived. Source badges
Processing, Ready, Failed, Needs Review, Canonical, Locked. AI transparency: AI generated / human written / AI edited / approved.
Accessibility: semantic buttons, keyboard, labels, contrast, alt text (AI-suggested, instructor-approved), accessible dialogs.
Routes: /instructor, /instructor/knowledge, /instructor/courses, /instructor/course/:id, .../curriculum, .../lesson/:lessonId,
.../visuals, .../quality, /instructor/jobs (+ admin areas).

## Out of scope V1 (§104)
Video, avatars, narration, video hosting, marketplace, payouts, white-label SaaS, big billing, social network, native apps,
external research crawling, automated OpenAI image generation, Stripe.

## Definition of done (§105, §163)
Instructor signs in -> Studio -> uploads real PDF/doc -> processed -> concepts shown -> creates certification -> selects sources
-> DeepSeek blueprint -> edits & approves -> lessons -> assessments & flashcards -> visual slots -> exceptional ChatGPT prompts
-> image created externally, dragged into slot, saved permanently, displayed in the right place -> quality audit finds genuine
issues -> resolve/approve -> publish -> student logs in and uses it in the existing Classroom. Clean clone from GitHub + env vars
-> install -> dev -> build works without Base44. First real test case: Lettrology material (terminology, formulas, compound
concepts, proprietary definitions, conflicts).
