import { z } from 'zod';

export const auditVerdictSchema = z.enum([
  'supported',
  'partially_supported',
  'unsupported',
  'conflict',
  'ambiguous',
]);

export type AuditVerdict = z.infer<typeof auditVerdictSchema>;

export const claimAuditResultSchema = z.object({
  claimId: z.string(),
  verdict: auditVerdictSchema,
  evidenceChunkIds: z.array(z.string()),
  explanation: z.string(),
  suggestedFix: z.string().nullable(),
  conflictsWithLocked: z.string().nullable(),
});

export type ClaimAuditResult = z.infer<typeof claimAuditResultSchema>;

export const sourceAuditorOutputSchema = z.object({
  results: z.array(claimAuditResultSchema),
});

export type SourceAuditorOutput = z.infer<typeof sourceAuditorOutputSchema>;
