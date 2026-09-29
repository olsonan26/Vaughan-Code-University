import { z } from 'zod';

export const findingSeveritySchema = z.enum(['critical', 'warning', 'suggestion']);
export type FindingSeverity = z.infer<typeof findingSeveritySchema>;

export const directorFindingSchema = z.object({
  title: z.string(),
  detail: z.string(),
  severity: findingSeveritySchema,
});
export type DirectorFinding = z.infer<typeof directorFindingSchema>;

export const targetTypeSchema = z.enum([
  'module',
  'lesson',
  'section',
  'question',
  'visual',
  'concept',
]);
export type TargetType = z.infer<typeof targetTypeSchema>;

export const operationSchema = z.enum(['update', 'insert', 'delete', 'move']);
export type Operation = z.infer<typeof operationSchema>;

export const changesetItemSchema = z.object({
  targetType: targetTypeSchema,
  targetId: z.string().nullable(),
  operation: operationSchema,
  field: z.string().nullable(),
  before: z.string().nullable(),
  after: z.string().nullable(),
  reason: z.string(),
});
export type ChangesetItem = z.infer<typeof changesetItemSchema>;

export const changesetAffectedSchema = z.object({
  lessons: z.array(z.string()),
  quizzes: z.array(z.string()),
  visuals: z.array(z.string()),
  concepts: z.array(z.string()),
});
export type ChangesetAffected = z.infer<typeof changesetAffectedSchema>;

export const changesetSchema = z.object({
  title: z.string(),
  rationale: z.string(),
  items: z.array(changesetItemSchema),
  affected: changesetAffectedSchema,
});
export type Changeset = z.infer<typeof changesetSchema>;

export const courseDirectorOutputSchema = z.object({
  analysis: z.string(),
  findings: z.array(directorFindingSchema),
  changeset: changesetSchema.nullable(),
});
export type CourseDirectorOutput = z.infer<typeof courseDirectorOutputSchema>;
