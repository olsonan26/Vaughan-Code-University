import type { SkillRequest } from '../types.js';
import {
  sourceAuditorOutputSchema,
  type SourceAuditorOutput,
  type ClaimAuditResult,
  type AuditVerdict,
} from './schema.js';
import {
  SOURCE_AUDITOR_SYSTEM_PROMPT,
  buildSourceAuditorUserContent,
  buildSourceAuditorUntrustedContext,
  type SourceAuditorInput,
} from './prompt.js';

export * from './schema.js';
export * from './prompt.js';

export function buildSourceAuditorRequest(
  input: SourceAuditorInput
): SkillRequest<SourceAuditorOutput> {
  return {
    skill: 'source-auditor',
    promptVersion: 'source-auditor-v1',
    tier: 'HIGH',
    system: SOURCE_AUDITOR_SYSTEM_PROMPT,
    userContent: buildSourceAuditorUserContent(input),
    untrustedContext: buildSourceAuditorUntrustedContext(input.evidence),
    schema: sourceAuditorOutputSchema,
  };
}

export function sanitizeAuditResults(
  output: SourceAuditorOutput | { results: ClaimAuditResult[] },
  allowedChunkIds: Set<string>,
  claimIds: Set<string>
): SourceAuditorOutput {
  const rawResults = 'results' in output ? output.results : [];
  const validResults: ClaimAuditResult[] = [];
  const seenClaimIds = new Set<string>();

  for (const res of rawResults) {
    if (!claimIds.has(res.claimId)) {
      continue; // drop unknown claim
    }

    seenClaimIds.add(res.claimId);

    let verdict: AuditVerdict = res.verdict;
    let explanation = res.explanation;
    let evidenceChunkIds = [...(res.evidenceChunkIds || [])];

    if (verdict === 'supported' || verdict === 'partially_supported') {
      const hasNoCitations = evidenceChunkIds.length === 0;
      const hasInvalidCitation = evidenceChunkIds.some((id) => !allowedChunkIds.has(id));

      if (hasNoCitations || hasInvalidCitation) {
        verdict = 'unsupported';
        explanation = 'Cited evidence was not among the provided sources.';
        evidenceChunkIds = [];
      }
    }

    validResults.push({
      claimId: res.claimId,
      verdict,
      evidenceChunkIds,
      explanation,
      suggestedFix: res.suggestedFix ?? null,
      conflictsWithLocked: res.conflictsWithLocked ?? null,
    });
  }

  // Add missing claims omitted by model
  for (const cid of claimIds) {
    if (!seenClaimIds.has(cid)) {
      validResults.push({
        claimId: cid,
        verdict: 'unsupported',
        evidenceChunkIds: [],
        explanation: 'Not evaluated by the auditor.',
        suggestedFix: null,
        conflictsWithLocked: null,
      });
    }
  }

  return { results: validResults };
}

export function summarizeAudit(
  input: SourceAuditorOutput | { results: ClaimAuditResult[] } | ClaimAuditResult[]
): Record<AuditVerdict, number> {
  const results = Array.isArray(input)
    ? input
    : 'results' in input
    ? input.results
    : [];

  const counts: Record<AuditVerdict, number> = {
    supported: 0,
    partially_supported: 0,
    unsupported: 0,
    conflict: 0,
    ambiguous: 0,
  };

  for (const r of results) {
    if (r.verdict in counts) {
      counts[r.verdict as AuditVerdict]++;
    }
  }

  return counts;
}
