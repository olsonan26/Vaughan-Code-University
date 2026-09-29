# KATE: the Studio's AI teaching assistant (spec v1, 2026-09-28)

Kate is one assistant to the instructor, backed by a team of models via OpenRouter (single key `OPENROUTER_API_KEY`).

| Role | Model (default) | Why |
|---|---|---|
| Kate (chat, planning, tool use) | deepseek/deepseek-v4.1-flash | cheap, 1M context |
| Writer (lessons, rewrites, quizzes) | deepseek/deepseek-v4.1-flash, escalate to deepseek-v4-pro | quality/cost |
| Eyes, primary (PDF images, diagrams, charts) | qwen/qwen3.7-flash (reasoning disabled) | $0.03/M in, $0.13/M out |
| Eyes, cross-check | qwen/qwen3.8-flash | independent second read; any disagreement -> human verify queue |
| Ears (MP3/WAV/M4A/MP4/MOV) | qwen/qwen3.8-omni-flash (audio+video input) | timestamped transcript |
| Checker (source-fidelity audit) | qwen/qwen3.8-flash | different family than the writer |

**No Gemini** (owner decision 2026-09-28). qwen/qwen3.8-27b:free is not used in production (rate-limited upstream, returned 429 in testing).

Verified 2026-09-28 on a rendered numerology chart (table, small red note, rotated purple label, faint "Soul" label): qwen3.7-flash, qwen3.8-flash and qwen3.8-omni-flash each transcribed every character correctly. Cost per image about $0.00006 (3.7 Flash) to $0.00035 (3.8 Flash). qwen3.7-flash must be called with reasoning disabled, otherwise it can spend the whole token budget thinking and return empty content.

## Flow
1. **Ingest** any file: PDF, DOCX, TXT, MD, CSV, MP3, WAV, M4A, MP4, MOV, images. Text extracted, images extracted per page and read by Eyes, audio/video transcribed by Ears. Originals never modified.
2. **"What should I do with this?"** Kate reads the whole source and returns a checklist:
   - From your source: build quiz, flashcards, worksheet, lesson(s), whole module, rewrite (grammar + clarity, meaning unchanged), lesson plan, transcript cleanup.
   - Beyond your source (off by default, clearly labelled): enrichment ideas (e.g. "explain the amygdala's role"), each shown with its reason. Approved additions are tagged `instructor_approved_addition` and visible as such to the auditor.
3. **Placement**: every output asks where it goes: Course -> Module -> Lesson (or new) -> slot (main video, audio+transcript, lesson PDF, reading, image in section, quiz, resource, flashcards) or "knowledge only".
4. **Lock prompt**: every new item asks: unlocked, locked until previous item complete, until quiz X passed (score), until level N, until date, or manually locked. Instructors can lock/unlock ANY course, module, lesson, quiz or resource from the Classroom.
5. **Live chat**: Kate's tools create change sets (preview diff). Instructor clicks Apply (or enables auto-apply for small edits). Every change is versioned with one-click undo. Examples: "Kate, create an interactive quiz for Module 1 'The Numbers' in the Classroom."

## Source fidelity rules (non-negotiable)
- Source-only mode is the default for every course. Writer may use only retrieved passages from selected sources; every paragraph carries citations (source, page/timestamp).
- Missing information becomes a visible GAP, never invented.
- Checker re-verifies every claim before an item can be published; unsupported claims block publishing.
- Rewrites must preserve meaning; Checker compares rewrite vs original.

## Build milestones
M1 Classroom catalog in DB (import INITIAL_COURSES via legacy_id) + Classroom reads DB + lock rules + instructor lock/unlock UI.
M2 Kate chat panel + tools (read source, propose checklist, create quiz/lesson/module as change set, place, lock) + apply/undo.
M3 Eyes: PDF image extraction + dual-model read + verify queue.
M4 Ears: audio/video upload + transcription as source.
M5 PDF -> whole course/module map, source-only lesson writing, checker gate, publish to Classroom.
