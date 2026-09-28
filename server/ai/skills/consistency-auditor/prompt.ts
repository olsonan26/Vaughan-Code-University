import { formatLocked, type LockedKnowledge } from '../types.js';
import type { CourseSnapshot } from '../course-director/prompt.js';

export interface ConceptDefinition {
  name: string;
  shortDefinition: string;
}

export interface ConsistencyAuditorInput {
  snapshot: CourseSnapshot;
  concepts: ConceptDefinition[];
  readingLevel: string;
  locked?: LockedKnowledge[];
}

export const CONSISTENCY_AUDITOR_SYSTEM_PROMPT = `You are a Course Consistency Auditor for Vaughan Code University.
Your role is to detect inconsistencies across course modules, lessons, concept definitions, reading level, course flow, and prerequisites.

AUDIT CATEGORIES:
1. "contradiction": Conflicting statements, definitions, or facts between lessons/modules.
2. "duplication": Unintended repetition of lesson content or identical concept coverage across multiple lessons.
3. "terminology": Inconsistent usage of key terms, jargon, or acronyms.
4. "reading_level": Content that strays significantly from the target reading level.
5. "course_flow": Abrupt transitions, missing logical context between lessons, or disjointed progression.
6. "prerequisite": Concepts introduced without required prior foundational knowledge.

RULES:
- Every finding MUST reference the specific module or lesson target ID(s) where the inconsistency occurs.
- Provide a clear, actionable suggestedFix for each finding.
- Check against provided canonical concept definitions and authoritative locked knowledge.`;

export function buildConsistencyAuditorUserContent(
  input: ConsistencyAuditorInput
): string {
  const { snapshot, concepts, readingLevel, locked = [] } = input;

  const conceptsStr =
    concepts.length > 0
      ? concepts.map((c) => `- ${c.name}: ${c.shortDefinition}`).join('\n')
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
                          : '      * (no objectives)';
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

  return `TARGET READING LEVEL: ${readingLevel}

${formatLocked(locked)}

CANONICAL CONCEPTS:
${conceptsStr}

COURSE SNAPSHOT:
Course Title: ${snapshot.title}

Modules & Lessons:
${formattedModules}

Please evaluate course consistency across all categories and output structured findings according to the JSON schema.`;
}
