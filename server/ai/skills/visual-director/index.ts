import type { SkillRequest, EvidenceChunk, LockedKnowledge } from '../types.js';
import { chunkLabel, formatLocked } from '../types.js';
import type { VisualIdentity } from './identity.js';
import { DEFAULT_VISUAL_IDENTITY } from './identity.js';
import { VISUAL_DIRECTOR_SYSTEM, VISUAL_NEEDS_SYSTEM } from './prompt.js';
import {
  visualNeedsOutputSchema,
  visualPromptOutputSchema,
  type VisualNeedsOutput,
  type VisualPromptOutput,
  type VisualSlotNeed,
  type VisualBriefDetails,
} from './schema.js';

export * from './identity.js';
export * from './prompt.js';
export * from './schema.js';

export interface BuildVisualNeedsInput {
  lessonTitle: string;
  sections: { index: number; heading: string; bodyMarkdown: string }[];
  identity?: VisualIdentity;
  density?: 'minimal' | 'balanced' | 'highly_visual';
  courseLevel?: string;
  readingLevel?: string;
}

export function buildVisualNeedsRequest(
  input: BuildVisualNeedsInput
): SkillRequest<VisualNeedsOutput> {
  const activeIdentity = input.identity ?? DEFAULT_VISUAL_IDENTITY;
  const density = input.density ?? 'balanced';

  const userContent = [
    `COURSE VISUAL IDENTITY:`,
    JSON.stringify(activeIdentity, null, 2),
    ``,
    `LESSON TITLE: ${input.lessonTitle}`,
    `DENSITY POLICY: ${density}`,
    input.courseLevel ? `COURSE LEVEL: ${input.courseLevel}` : null,
    input.readingLevel ? `TARGET READING LEVEL: ${input.readingLevel}` : null,
    ``,
    `LESSON SECTIONS:`,
    ...input.sections.map(
      (s) => `--- Section [${s.index}]: ${s.heading} ---\n${s.bodyMarkdown}`
    ),
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    skill: 'visual-director',
    promptVersion: 'visual-director-v1',
    tier: 'STANDARD',
    system: VISUAL_NEEDS_SYSTEM,
    userContent,
    schema: visualNeedsOutputSchema,
    metadata: {
      action: 'identify_visual_needs',
      density,
    },
  };
}

export interface BuildVisualPromptInput {
  slot: VisualSlotNeed;
  lessonTitle: string;
  objective: string;
  sectionText: string;
  conceptFacts: string[];
  locked: LockedKnowledge[];
  identity?: VisualIdentity;
  evidence?: EvidenceChunk[];
}

export function buildVisualPromptRequest(
  input: BuildVisualPromptInput
): SkillRequest<VisualPromptOutput> {
  const activeIdentity = input.identity ?? DEFAULT_VISUAL_IDENTITY;
  const lockedText = formatLocked(input.locked);

  const userContent = [
    `COURSE VISUAL IDENTITY:`,
    JSON.stringify(activeIdentity, null, 2),
    ``,
    lockedText,
    ``,
    `LESSON TITLE: ${input.lessonTitle}`,
    `TEACHING OBJECTIVE: ${input.objective}`,
    ``,
    `TARGET VISUAL SLOT SPECIFICATION:`,
    JSON.stringify(input.slot, null, 2),
    ``,
    `CONCEPT FACTS & CANONICAL RULES:`,
    ...input.conceptFacts.map((f) => `- ${f}`),
    ``,
    `SECTION CONTENT TEXT:`,
    input.sectionText,
  ].join('\n');

  const untrustedContext = input.evidence?.map((c) => ({
    label: chunkLabel(c),
    text: c.content,
  }));

  return {
    skill: 'visual-director',
    promptVersion: 'visual-director-v1',
    tier: 'HIGH',
    system: VISUAL_DIRECTOR_SYSTEM,
    userContent,
    untrustedContext,
    schema: visualPromptOutputSchema,
    metadata: {
      action: 'generate_visual_prompt',
      slotTitle: input.slot.title,
    },
  };
}

export interface BuildVisualPromptRevisionInput {
  previous: {
    brief: VisualBriefDetails;
    chatgptPrompt: string | null;
  };
  instruction: string;
  identity?: VisualIdentity;
  lessonContext?: string;
}

export function buildVisualPromptRevisionRequest(
  input: BuildVisualPromptRevisionInput
): SkillRequest<VisualPromptOutput> {
  const activeIdentity = input.identity ?? DEFAULT_VISUAL_IDENTITY;

  const userContent = [
    `COURSE VISUAL IDENTITY:`,
    JSON.stringify(activeIdentity, null, 2),
    ``,
    `PREVIOUS VISUAL BRIEF:`,
    JSON.stringify(input.previous.brief, null, 2),
    ``,
    `PREVIOUS CHATGPT PROMPT:`,
    input.previous.chatgptPrompt || '(none)',
    ``,
    `REVISION INSTRUCTION FROM INSTRUCTOR:`,
    input.instruction,
    ``,
    input.lessonContext ? `LESSON CONTEXT:\n${input.lessonContext}` : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');

  return {
    skill: 'visual-director',
    promptVersion: 'visual-director-v1',
    tier: 'HIGH',
    system: VISUAL_DIRECTOR_SYSTEM,
    userContent,
    schema: visualPromptOutputSchema,
    metadata: {
      action: 'revise_visual_prompt',
    },
  };
}
