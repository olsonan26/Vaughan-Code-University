import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import { FLASHCARD_WRITER_SYSTEM_PROMPT, buildFlashcardWriterUserContent } from './prompt.js';
import { createFlashcardWriterOutputSchema, type FlashcardWriterOutput } from './schema.js';

export interface FlashcardWriterInput {
  lessonTitle: string;
  objectives: string[];
  concepts: {
    name: string;
    shortDefinition: string;
    formula: string | null;
  }[];
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
  maxCards?: number; // default 12
}

export function buildFlashcardWriterRequest(input: FlashcardWriterInput): SkillRequest<FlashcardWriterOutput> {
  const maxCards = Math.min(input.maxCards ?? 12, 30);
  const lockedFormatted = formatLocked(input.locked);
  const userContent = buildFlashcardWriterUserContent({
    lessonTitle: input.lessonTitle,
    objectives: input.objectives,
    concepts: input.concepts,
    lockedFormatted,
    maxCards,
  });

  const untrustedContext = input.evidence.map((chunk) => ({
    label: chunkLabel(chunk),
    text: chunk.content,
  }));

  const schema = createFlashcardWriterOutputSchema(maxCards);

  return {
    skill: 'flashcard-writer',
    promptVersion: 'flashcard-writer-v1',
    tier: 'LIGHT',
    system: FLASHCARD_WRITER_SYSTEM_PROMPT,
    userContent,
    untrustedContext,
    schema,
    metadata: {
      lessonTitle: input.lessonTitle,
      maxCards,
    },
  };
}

export * from './schema.js';
export * from './prompt.js';
