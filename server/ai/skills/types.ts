import type { ZodType } from 'zod';

import type { AiTier } from '../tiers.js';
export type { AiTier };

/**
 * Every AI skill exports PURE builders: build<Skill>Request(input) -> SkillRequest<Output>.
 * Features execute them with: gateway.generateStructured({ ...buildXRequest(input), context }).
 * Retrieved source text MUST go in untrustedContext (never in `system`).
 * Locked/canonical knowledge goes in userContent, clearly labelled AUTHORITATIVE.
 */
export interface SkillRequest<T> {
  skill: string;
  promptVersion: string;
  tier: AiTier;
  system: string;
  userContent: string;
  untrustedContext?: { label: string; text: string }[];
  schema: ZodType<T>;
  metadata?: Record<string, unknown>;
}

/** Chunk passed to skills as evidence. `id` is the source_chunks UUID used for citations. */
export interface EvidenceChunk {
  id: string;
  sourceTitle: string;
  pageNumber: number | null;
  sectionTitle: string | null;
  authority: number; // 1-5
  content: string;
}

export interface LockedKnowledge {
  conceptName: string;
  statement: string; // exact locked wording / formula
}

/** Standard label for untrusted evidence blocks. */
export const chunkLabel = (c: EvidenceChunk) =>
  `chunk:${c.id} | ${c.sourceTitle}${c.pageNumber != null ? ` p.${c.pageNumber}` : ''} | authority ${c.authority}`;

export const formatLocked = (items: LockedKnowledge[]) =>
  items.length === 0
    ? 'AUTHORITATIVE LOCKED KNOWLEDGE: (none)'
    : `AUTHORITATIVE LOCKED KNOWLEDGE (must never be contradicted or reworded; report conflicts instead):\n${items
        .map((k) => `- ${k.conceptName}: ${k.statement}`)
        .join('\n')}`;
