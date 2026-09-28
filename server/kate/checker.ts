import type { GeneratorDeps } from './generators/types.js';
import type { ChangeSetDraft, ChangeOp } from '../../shared/kate/types.js';
import type { EvidenceChunk } from '../ai/skills/types.js';
import { KATE_MODELS, parseJsonLoose } from '../ai/providers/openrouter.js';
import { wrapUntrusted } from '../ai/untrusted.js';

export interface AuditResult {
  passed: boolean;
  unsupportedClaims: { text: string; reason: string }[];
  gaps: string[];
}

export async function auditDraft(
  deps: GeneratorDeps,
  draft: ChangeSetDraft,
  evidence: EvidenceChunk[]
): Promise<AuditResult> {
  const validChunkIds = new Set(evidence.map((e) => e.id));
  const deterministicUnsupported: { text: string; reason: string }[] = [];

  // Deterministic step: check and drop fabricated chunkIds
  for (const op of draft.ops) {
    if (op.op === 'create_item' || op.op === 'update_item') {
      if (op.sourceRefs && op.sourceRefs.length > 0) {
        const validRefs = [];
        for (const ref of op.sourceRefs) {
          if (ref.chunkId && !validChunkIds.has(ref.chunkId)) {
            deterministicUnsupported.push({
              text: op.title || 'Item sourceRef',
              reason: `Referenced chunkId ${ref.chunkId} is not in retrieved evidence`,
            });
          } else {
            validRefs.push(ref);
          }
        }
        op.sourceRefs = validRefs;
      }

      // Check payload internal sourceRefs
      if (op.payload) {
        if (op.payload.kind === 'quiz' && Array.isArray(op.payload.questions)) {
          for (const q of op.payload.questions) {
            if (q.sourceRefs && q.sourceRefs.length > 0) {
              const validQRefs = [];
              for (const ref of q.sourceRefs) {
                if (ref.chunkId && !validChunkIds.has(ref.chunkId)) {
                  deterministicUnsupported.push({
                    text: q.prompt || 'Quiz question sourceRef',
                    reason: `Referenced chunkId ${ref.chunkId} is not in retrieved evidence`,
                  });
                } else {
                  validQRefs.push(ref);
                }
              }
              q.sourceRefs = validQRefs;
            }
          }
        } else if (op.payload.kind === 'flashcards' && Array.isArray(op.payload.cards)) {
          for (const card of op.payload.cards) {
            if (card.sourceRefs && card.sourceRefs.length > 0) {
              const validCardRefs = [];
              for (const ref of card.sourceRefs) {
                if (ref.chunkId && !validChunkIds.has(ref.chunkId)) {
                  deterministicUnsupported.push({
                    text: card.front || 'Flashcard sourceRef',
                    reason: `Referenced chunkId ${ref.chunkId} is not in retrieved evidence`,
                  });
                } else {
                  validCardRefs.push(ref);
                }
              }
              card.sourceRefs = validCardRefs;
            }
          }
        }
      }
    }
  }

  // AI audit step using qwen/qwen3.8-flash
  let aiUnsupported: { text: string; reason: string }[] = [];
  let gaps: string[] = [];

  try {
    const evidenceBlocks = evidence.map((e) => ({
      label: `chunk:${e.id} | ${e.sourceTitle}${e.pageNumber ? ` p.${e.pageNumber}` : ''}`,
      text: e.content,
    }));
    const untrustedEvidence = wrapUntrusted(evidenceBlocks);

    const draftSummary = JSON.stringify({
      title: draft.title,
      summary: draft.summary,
      ops: draft.ops.map((o) => {
        if (o.op === 'create_item') {
          return { op: o.op, title: o.title, kind: o.kind, payload: o.payload, provenance: o.provenance };
        }
        if (o.op === 'update_item') {
          return { op: o.op, title: o.title, payload: o.payload };
        }
        return { op: o.op };
      }),
    });

    const res = await deps.chat({
      model: KATE_MODELS.checker,
      json: true,
      messages: [
        {
          role: 'system',
          content:
            'You are a strict source-fidelity audit checker for an educational platform. Your job is to verify that all claims, questions, answers, and explanations in the proposed draft content are strictly supported by the provided evidence. Approved additions (marked provenance: ai_with_approved_additions) are allowed to go beyond the source but should still be noted in unsupportedClaims if not present in evidence. Return a JSON object with keys "unsupportedClaims" (array of {text, reason}) and "gaps" (array of strings).',
        },
        {
          role: 'user',
          content: `${untrustedEvidence}\n\nDRAFT CONTENT TO AUDIT:\n${draftSummary}`,
        },
      ],
    });

    if (res.text) {
      const parsed = parseJsonLoose<{
        unsupportedClaims?: { text: string; reason: string }[];
        gaps?: string[];
      }>(res.text);

      if (Array.isArray(parsed.unsupportedClaims)) {
        aiUnsupported = parsed.unsupportedClaims;
      }
      if (Array.isArray(parsed.gaps)) {
        gaps = parsed.gaps;
      }
    }
  } catch (err: any) {
    // If AI checker fails, log or fall back
    if (deps.logger) {
      deps.logger.error('Checker AI error', { error: err?.message || String(err) });
    }
  }

  const allUnsupported = [...deterministicUnsupported, ...aiUnsupported];

  // Approved additions reported but don't fail:
  // Check if any unsupported claim belongs to an op with 'ai_with_approved_additions' or if all unsupported claims are approved additions.
  const hasApprovedAdditionsOps = draft.ops.some(
    (o) => o.op === 'create_item' && o.provenance === 'ai_with_approved_additions'
  );

  // If there are unsupported claims not covered by approved additions or deterministic drops, passed is false.
  // Deterministic drops (fabricated refs) ALWAYS fail.
  const passed = deterministicUnsupported.length === 0 && (allUnsupported.length === 0 || hasApprovedAdditionsOps);

  return {
    passed,
    unsupportedClaims: allUnsupported,
    gaps,
  };
}
