import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import { ASSESSMENT_DESIGNER_SYSTEM_PROMPT, buildAssessmentDesignerUserContent } from './prompt.js';
import {
  assessmentDesignerOutputSchema,
  type AssessmentDifficulty,
  type QuestionType,
  type AssessmentDesignerOutput,
} from './schema.js';

export interface AssessmentDesignerInput {
  difficulty: AssessmentDifficulty;
  objectives: {
    id: string;
    text: string;
    lessonId: string;
  }[];
  lessons: {
    id: string;
    title: string;
    summary: string;
  }[];
  concepts: {
    name: string;
    shortDefinition: string;
  }[];
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
  questionCount: number;
  allowedTypes?: QuestionType[];
}

export function buildAssessmentDesignerRequest(
  input: AssessmentDesignerInput
): SkillRequest<AssessmentDesignerOutput> {
  const lockedFormatted = formatLocked(input.locked);
  const userContent = buildAssessmentDesignerUserContent({
    difficulty: input.difficulty,
    questionCount: input.questionCount,
    objectives: input.objectives,
    lessons: input.lessons,
    concepts: input.concepts,
    allowedTypes: input.allowedTypes,
    lockedFormatted,
  });

  const untrustedContext = input.evidence.map((chunk) => ({
    label: chunkLabel(chunk),
    text: chunk.content,
  }));

  return {
    skill: 'assessment-designer',
    promptVersion: 'assessment-engine-v1',
    tier: 'STANDARD',
    system: ASSESSMENT_DESIGNER_SYSTEM_PROMPT,
    userContent,
    untrustedContext,
    schema: assessmentDesignerOutputSchema,
    metadata: {
      difficulty: input.difficulty,
      questionCount: input.questionCount,
      allowedTypes: input.allowedTypes,
    },
  };
}

export * from './schema.js';
export * from './prompt.js';
