import { chunkLabel, formatLocked, type EvidenceChunk, type LockedKnowledge } from '../types.js';

export interface AuditClaimInput {
  id: string;
  text: string;
  lessonId: string;
  sectionId: string;
}

export interface SourceAuditorInput {
  claims: AuditClaimInput[];
  evidence: EvidenceChunk[];
  locked: LockedKnowledge[];
}

export const SOURCE_AUDITOR_SYSTEM_PROMPT = `You are a meticulous Source Auditor for Vaughan Code University.
Your job is to audit claims made in course lessons strictly against provided evidence chunks and authoritative locked knowledge.

RULES:
1. Evaluate each claim ONLY against the provided evidence chunks in context and the authoritative locked knowledge.
2. Assign one of these verdicts for each claim:
   - "supported": The provided evidence explicitly supports the claim. MUST cite supporting evidenceChunkIds.
   - "partially_supported": The provided evidence partially supports the claim, but some aspects are unverified or extrapolated.
   - "unsupported": The claim is not backed by any provided evidence chunks or locked knowledge.
   - "conflict": The claim directly contradicts provided evidence or authoritative locked knowledge.
   - "ambiguous": The claim is unclear or evidence is contradictory/inconclusive.
3. NEVER claim "supported" or "partially_supported" without citing exact evidence chunk IDs from the provided set.
4. If a claim contradicts authoritative locked knowledge, set "verdict" to "conflict" and set "conflictsWithLocked" to the locked statement or concept it violates.
5. Provide a brief explanation for your verdict and a suggestedFix if the claim is unsupported, partially supported, ambiguous, or in conflict.
6. Evaluate every single claim listed in the input.`;

export function buildSourceAuditorUserContent(input: SourceAuditorInput): string {
  const lockedFormatted = formatLocked(input.locked);
  const claimsFormatted = input.claims
    .map(
      (c) =>
        `- Claim ID: ${c.id} (Lesson: ${c.lessonId}, Section: ${c.sectionId})\n  Text: "${c.text}"`
    )
    .join('\n');

  return `${lockedFormatted}

CLAIMS TO AUDIT:
${claimsFormatted || '(No claims provided)'}`;
}

export function buildSourceAuditorUntrustedContext(
  evidence: EvidenceChunk[]
): { label: string; text: string }[] {
  return evidence.map((chunk) => ({
    label: chunkLabel(chunk),
    text: `Content: ${chunk.content}`,
  }));
}
