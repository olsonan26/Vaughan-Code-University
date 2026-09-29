import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import { WORKSHEET_WRITER_SYSTEM_PROMPT, buildWorksheetWriterUserContent } from './prompt.js';
import { worksheetWriterOutputSchema, type WorksheetWriterOutput } from './schema.js';

export interface WorksheetWriterInput {
  lessonTitle: string;
  readingLevel: string;
  objectives: string[];
  concepts: { name: string; shortDefinition: string; formula: string | null }[];
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
}

export function buildWorksheetWriterRequest(input: WorksheetWriterInput): SkillRequest<WorksheetWriterOutput> {
  return {
    skill: 'worksheet-writer',
    promptVersion: 'worksheet-writer-v1',
    tier: 'STANDARD',
    system: WORKSHEET_WRITER_SYSTEM_PROMPT,
    userContent: buildWorksheetWriterUserContent({
      lessonTitle: input.lessonTitle,
      readingLevel: input.readingLevel,
      objectives: input.objectives,
      concepts: input.concepts,
      lockedFormatted: formatLocked(input.locked),
    }),
    untrustedContext: input.evidence.map((c) => ({ label: chunkLabel(c), text: c.content })),
    schema: worksheetWriterOutputSchema,
    metadata: { lessonTitle: input.lessonTitle },
  };
}

export * from './schema.js';
export * from './prompt.js';
