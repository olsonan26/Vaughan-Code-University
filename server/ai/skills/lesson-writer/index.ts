import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import { LESSON_WRITER_SYSTEM_PROMPT, buildLessonWriterUserContent } from './prompt.js';
import { lessonWriterOutputSchema, type LessonWriterOutput } from './schema.js';

export interface LessonWriterInput {
  course: {
    title: string;
    readingLevel: string;
    teachingStyle: string;
    sourceMode: 'STRICT' | 'GROUNDED_INFERENCE';
    level: string;
  };
  module: {
    title: string;
    index: number;
  };
  lesson: {
    title: string;
    index: number;
    objectives: string[];
    conceptNames: string[];
  };
  concepts: {
    name: string;
    shortDefinition: string;
    formula: string | null;
  }[];
  prerequisiteSummary: string;
  previousLesson?: {
    title: string;
    summary: string;
  };
  nextLesson?: {
    title: string;
  };
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
}

export function buildLessonWriterRequest(input: LessonWriterInput): SkillRequest<LessonWriterOutput> {
  const lockedFormatted = formatLocked(input.locked);
  const userContent = buildLessonWriterUserContent({
    course: input.course,
    module: input.module,
    lesson: input.lesson,
    concepts: input.concepts,
    prerequisiteSummary: input.prerequisiteSummary,
    previousLesson: input.previousLesson,
    nextLesson: input.nextLesson,
    lockedFormatted,
  });

  const untrustedContext = input.evidence.map((chunk) => ({
    label: chunkLabel(chunk),
    text: chunk.content,
  }));

  return {
    skill: 'lesson-writer',
    promptVersion: 'lesson-writer-v1',
    tier: 'STANDARD',
    system: LESSON_WRITER_SYSTEM_PROMPT,
    userContent,
    untrustedContext,
    schema: lessonWriterOutputSchema,
    metadata: {
      courseTitle: input.course.title,
      lessonTitle: input.lesson.title,
      sourceMode: input.course.sourceMode,
    },
  };
}

export * from './schema.js';
export * from './prompt.js';
