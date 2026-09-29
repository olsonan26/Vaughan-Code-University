import type { SkillRequest } from '../types.js';
import {
  consistencyAuditorOutputSchema,
  type ConsistencyAuditorOutput,
} from './schema.js';
import {
  CONSISTENCY_AUDITOR_SYSTEM_PROMPT,
  buildConsistencyAuditorUserContent,
  type ConsistencyAuditorInput,
} from './prompt.js';

export * from './schema.js';
export * from './prompt.js';

export function buildConsistencyAuditorRequest(
  input: ConsistencyAuditorInput
): SkillRequest<ConsistencyAuditorOutput> {
  return {
    skill: 'consistency-auditor',
    promptVersion: 'course-consistency-v1',
    tier: 'HIGH',
    system: CONSISTENCY_AUDITOR_SYSTEM_PROMPT,
    userContent: buildConsistencyAuditorUserContent(input),
    schema: consistencyAuditorOutputSchema,
  };
}

export function sanitizeFindings(
  output: ConsistencyAuditorOutput,
  allowedIds: Set<string>
): ConsistencyAuditorOutput {
  const rawFindings = output.findings || [];
  const validFindings = rawFindings
    .map((f) => {
      const validTargets = (f.targets || []).filter((t) => allowedIds.has(t.id));
      if (validTargets.length === 0) {
        return null;
      }
      return {
        ...f,
        targets: validTargets,
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return { findings: validFindings };
}
