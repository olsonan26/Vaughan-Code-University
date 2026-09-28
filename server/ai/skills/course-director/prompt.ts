import { formatLocked, type LockedKnowledge } from '../types.js';

export interface LessonSnapshot {
  id: string;
  title: string;
  objectives: string[];
  summary: string;
}

export interface ModuleSnapshot {
  id: string;
  title: string;
  lessons: LessonSnapshot[];
}

export interface CourseSnapshot {
  title: string;
  modules: ModuleSnapshot[];
}

export interface CourseDirectorInput {
  request: string;
  snapshot: CourseSnapshot;
  constraints: string[];
  locked: LockedKnowledge[];
}

export const COURSE_DIRECTOR_SYSTEM_PROMPT = `You are a Senior Curriculum Director for Vaughan Code University.
Your role is to evaluate course structure, pedagogical flow, sequence, prerequisites, clarity, repetition, cognitive density, assessment coverage, and terminology consistency.

RULES:
1. PROPOSE CHANGES, NEVER APPLY THEM DIRECTLY: You generate architectural findings and an optional actionable changeset for review.
2. RESPECT CONSTRAINTS STRICTLY: Honor all constraints provided in the input (e.g. "do not change Modules 1-2"). Never propose changeset operations that violate explicit constraints.
3. REFERENCE ONLY GIVEN IDS: Always reference existing target IDs provided in the snapshot. Never fabricate target IDs. For newly inserted items without an existing ID, set targetId to null.
4. ANALYZE THOROUGHLY:
   - Sequence & Prerequisites: Are foundational concepts taught before dependent concepts?
   - Clarity & Repetition: Is material clear and free of redundant lessons or overlapping concepts?
   - Cognitive Density & Pace: Is the depth and volume of content manageable per lesson?
   - Assessment Coverage: Do objectives align with planned content and quizzes?
   - Terminology: Is terminology used consistently throughout all modules and lessons?
5. NEVER CONTRADICT AUTHORITATIVE LOCKED KNOWLEDGE: Respect all locked knowledge statements.`;

export function buildCourseDirectorUserContent(input: CourseDirectorInput): string {
  const { request, snapshot, constraints, locked } = input;

  const formattedConstraints =
    constraints.length > 0
      ? constraints.map((c) => `- ${c}`).join('\n')
      : '(none)';

  const formattedModules =
    snapshot.modules.length > 0
      ? snapshot.modules
          .map((m) => {
            const lessonsStr =
              m.lessons.length > 0
                ? m.lessons
                    .map((l) => {
                      const objs =
                        l.objectives.length > 0
                          ? l.objectives.map((o) => `      * ${o}`).join('\n')
                          : '      * (no objectives listed)';
                      return `    - Lesson [ID: ${l.id}] "${l.title}"\n      Summary: ${
                        l.summary || '(none)'
                      }\n      Objectives:\n${objs}`;
                    })
                    .join('\n')
                : '    (no lessons)';
            return `  - Module [ID: ${m.id}] "${m.title}"\n${lessonsStr}`;
          })
          .join('\n\n')
      : '  (no modules)';

  return `DIRECTOR REQUEST:
${request}

CONSTRAINTS:
${formattedConstraints}

${formatLocked(locked)}

COURSE SNAPSHOT:
Course Title: ${snapshot.title}

Modules & Lessons:
${formattedModules}

Please provide your curriculum evaluation, findings, and proposed changeset following the required JSON schema.`;
}
