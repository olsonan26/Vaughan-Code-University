import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import { SECTION_EDITOR_SYSTEM_PROMPT, buildSectionEditorUserContent } from './prompt.js';
import {
  sectionEditorOutputSchema,
  type SectionEditorAction,
  type SectionEditorOutput,
} from './schema.js';

export interface SectionEditorInput {
  action: SectionEditorAction;
  targetReadingLevel?: string;
  instruction?: string;
  section: {
    heading: string;
    bodyMarkdown: string;
  };
  selection?: string;
  lessonContext: {
    title: string;
    objectives: string[];
  };
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
  sourceMode?: 'STRICT' | 'GROUNDED_INFERENCE';
}

export function buildSectionEditorRequest(input: SectionEditorInput): SkillRequest<SectionEditorOutput> {
  const lockedFormatted = formatLocked(input.locked);
  const userContent = buildSectionEditorUserContent({
    action: input.action,
    targetReadingLevel: input.targetReadingLevel,
    instruction: input.instruction,
    section: input.section,
    selection: input.selection,
    lessonContext: input.lessonContext,
    lockedFormatted,
    sourceMode: input.sourceMode,
  });

  const untrustedContext = input.evidence.map((chunk) => ({
    label: chunkLabel(chunk),
    text: chunk.content,
  }));

  return {
    skill: 'section-editor',
    promptVersion: 'section-editor-v1',
    tier: 'LIGHT',
    system: SECTION_EDITOR_SYSTEM_PROMPT,
    userContent,
    untrustedContext,
    schema: sectionEditorOutputSchema,
    metadata: {
      action: input.action,
      heading: input.section.heading,
      lessonTitle: input.lessonContext.title,
    },
  };
}

export * from './schema.js';
export * from './prompt.js';
