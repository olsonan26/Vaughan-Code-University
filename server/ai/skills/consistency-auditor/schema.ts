import { z } from 'zod';

export const consistencyCategorySchema = z.enum([
  'contradiction',
  'duplication',
  'terminology',
  'reading_level',
  'course_flow',
  'prerequisite',
]);
export type ConsistencyCategory = z.infer<typeof consistencyCategorySchema>;

export const consistencySeveritySchema = z.enum(['critical', 'warning', 'suggestion']);
export type ConsistencySeverity = z.infer<typeof consistencySeveritySchema>;

export const targetRefSchema = z.object({
  type: z.enum(['module', 'lesson']),
  id: z.string(),
});
export type TargetRef = z.infer<typeof targetRefSchema>;

export const consistencyFindingSchema = z.object({
  category: consistencyCategorySchema,
  severity: consistencySeveritySchema,
  title: z.string(),
  detail: z.string(),
  targets: z.array(targetRefSchema),
  suggestedFix: z.string().nullable(),
});
export type ConsistencyFinding = z.infer<typeof consistencyFindingSchema>;

export const consistencyAuditorOutputSchema = z.object({
  findings: z.array(consistencyFindingSchema),
});
export type ConsistencyAuditorOutput = z.infer<typeof consistencyAuditorOutputSchema>;
