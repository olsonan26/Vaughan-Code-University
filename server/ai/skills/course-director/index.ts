import type { SkillRequest } from '../types.js';
import {
  courseDirectorOutputSchema,
  type CourseDirectorOutput,
} from './schema.js';
import {
  COURSE_DIRECTOR_SYSTEM_PROMPT,
  buildCourseDirectorUserContent,
  type CourseDirectorInput,
} from './prompt.js';

export * from './schema.js';
export * from './prompt.js';

export function buildCourseDirectorRequest(
  input: CourseDirectorInput
): SkillRequest<CourseDirectorOutput> {
  return {
    skill: 'course-director',
    promptVersion: 'course-director-v1',
    tier: 'MAX',
    system: COURSE_DIRECTOR_SYSTEM_PROMPT,
    userContent: buildCourseDirectorUserContent(input),
    schema: courseDirectorOutputSchema,
  };
}

export function sanitizeChangeset(
  output: CourseDirectorOutput,
  allowedIds: Set<string>
): CourseDirectorOutput {
  if (!output.changeset) {
    return output;
  }

  const sanitizedItems = output.changeset.items.filter((item) => {
    if (item.targetId === null) {
      return true;
    }
    return allowedIds.has(item.targetId);
  });

  return {
    ...output,
    changeset: {
      ...output.changeset,
      items: sanitizedItems,
    },
  };
}
