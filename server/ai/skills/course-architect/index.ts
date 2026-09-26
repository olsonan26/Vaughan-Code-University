import { formatLocked, type LockedKnowledge, type SkillRequest } from '../types.js';
import { COURSE_ARCHITECT_SYSTEM_PROMPT } from './prompt.js';
import {
  courseArchitectOutputSchema,
  type CourseArchitectOutput,
} from './schema.js';

export * from './prompt.js';
export * from './schema.js';

export interface CourseArchitectSettings {
  title: string;
  audience: string;
  outcome: string;
  level: string;
  courseType: string;
  length: string;
  customModuleRange?: { min: number; max: number };
  readingLevel: string;
  teachingStyle: string;
  assessmentDifficulty: string;
  visualDensity: string;
  sourceMode: string;
}

export interface CourseArchitectConceptInput {
  name: string;
  shortDefinition: string;
  prerequisites: string[];
  authority: number;
}

export interface CourseArchitectSourceSummary {
  title: string;
  authority: number;
}

export interface BuildCourseArchitectInput {
  settings: CourseArchitectSettings;
  concepts: CourseArchitectConceptInput[];
  sourceSummaries: CourseArchitectSourceSummary[];
  locked: LockedKnowledge[];
}

export function buildCourseArchitectRequest(
  input: BuildCourseArchitectInput
): SkillRequest<CourseArchitectOutput> {
  const { settings, concepts, sourceSummaries, locked } = input;

  const rangeStr = settings.customModuleRange
    ? `\nCustom Module Range: ${settings.customModuleRange.min} - ${settings.customModuleRange.max}`
    : '';

  const sourcesStr =
    sourceSummaries.length > 0
      ? sourceSummaries.map((s) => `- ${s.title} (Authority: ${s.authority}/5)`).join('\n')
      : '(none)';

  const conceptsStr =
    concepts.length > 0
      ? concepts
          .map((c) => {
            const prereqs =
              c.prerequisites.length > 0 ? ` [Prereqs: ${c.prerequisites.join(', ')}]` : '';
            return `- ${c.name} (Authority ${c.authority}/5)${prereqs}: ${c.shortDefinition}`;
          })
          .join('\n')
      : '(none)';

  const userContent = `Design a course blueprint based on the following course settings, canonical concepts, and source material.

COURSE SETTINGS:
Title: ${settings.title}
Audience: ${settings.audience}
Desired Outcome: ${settings.outcome}
Level: ${settings.level}
Course Type: ${settings.courseType}
Length: ${settings.length}${rangeStr}
Reading Level: ${settings.readingLevel}
Teaching Style: ${settings.teachingStyle}
Assessment Difficulty: ${settings.assessmentDifficulty}
Visual Density: ${settings.visualDensity}
Source Mode: ${settings.sourceMode}

${formatLocked(locked)}

APPROVED SOURCE SUMMARIES:
${sourcesStr}

AVAILABLE CANONICAL CONCEPTS:
${conceptsStr}

Please create the full course blueprint adhering strictly to all prerequisites and architectural guidelines.`;

  return {
    skill: 'course-architect',
    promptVersion: 'course-architect-v1',
    tier: 'HIGH',
    system: COURSE_ARCHITECT_SYSTEM_PROMPT,
    userContent,
    schema: courseArchitectOutputSchema,
  };
}
