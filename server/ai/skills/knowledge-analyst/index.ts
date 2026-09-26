import {
  chunkLabel,
  formatLocked,
  type EvidenceChunk,
  type LockedKnowledge,
  type SkillRequest,
} from '../types.js';
import { KNOWLEDGE_ANALYST_SYSTEM_PROMPT } from './prompt.js';
import {
  knowledgeAnalystOutputSchema,
  type KnowledgeAnalystOutput,
} from './schema.js';

export * from './prompt.js';
export * from './schema.js';

export interface BuildKnowledgeAnalystInput {
  source: {
    title: string;
    authority: number;
    author?: string;
  };
  chunks: EvidenceChunk[];
  existingConceptNames: string[];
  locked: LockedKnowledge[];
}

export function sanitizeConceptRefs(
  output: KnowledgeAnalystOutput,
  allowedChunkIds: string[] | Set<string>
): {
  output: KnowledgeAnalystOutput;
  dropped: { concepts: string[]; refsCount: number };
} {
  const allowedSet =
    allowedChunkIds instanceof Set ? allowedChunkIds : new Set(allowedChunkIds);

  const droppedConcepts: string[] = [];
  let droppedRefsCount = 0;

  const sanitizedConcepts = output.concepts
    .map((concept) => {
      const validRefs = concept.sourceRefs.filter((ref) => {
        const isValid = allowedSet.has(ref.chunkId);
        if (!isValid) {
          droppedRefsCount++;
        }
        return isValid;
      });

      if (validRefs.length === 0) {
        droppedConcepts.push(concept.name);
        return null;
      }

      return {
        ...concept,
        sourceRefs: validRefs,
      };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const sanitizedContradictions = output.contradictions.filter(
    (c) => allowedSet.has(c.chunkIdA) && allowedSet.has(c.chunkIdB)
  );

  return {
    output: {
      concepts: sanitizedConcepts,
      contradictions: sanitizedContradictions,
    },
    dropped: {
      concepts: droppedConcepts,
      refsCount: droppedRefsCount,
    },
  };
}

export function buildKnowledgeAnalystRequest(
  input: BuildKnowledgeAnalystInput
): SkillRequest<KnowledgeAnalystOutput> {
  const sourceAuthorStr = input.source.author ? `\nSource Author: ${input.source.author}` : '';
  const existingConceptsStr =
    input.existingConceptNames.length > 0
      ? input.existingConceptNames.map((n) => `- ${n}`).join('\n')
      : '(none)';

  const userContent = `Analyze the provided untrusted source chunks and extract concepts and contradictions according to the system rules.

SOURCE METADATA:
Title: ${input.source.title}
Authority: ${input.source.authority}/5${sourceAuthorStr}

${formatLocked(input.locked)}

EXISTING VAULT CONCEPT NAMES (check for potential duplicates):
${existingConceptsStr}

Please process the chunks provided in untrustedContext and return the structured JSON output matching the required schema.`;

  return {
    skill: 'knowledge-analyst',
    promptVersion: 'knowledge-analyst-v1',
    tier: 'HIGH',
    system: KNOWLEDGE_ANALYST_SYSTEM_PROMPT,
    userContent,
    untrustedContext: input.chunks.map((c) => ({
      label: chunkLabel(c),
      text: c.content,
    })),
    schema: knowledgeAnalystOutputSchema,
  };
}
