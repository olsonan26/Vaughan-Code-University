import { z } from 'zod';

export const lessonSectionKindSchema = z.enum([
  'hook',
  'objective',
  'explanation',
  'example',
  'deeper',
  'misconception',
  'application',
  'exercise',
  'knowledge_check',
  'recap',
  'takeaways',
  'other',
]);

export type LessonSectionKind = z.infer<typeof lessonSectionKindSchema>;

export const lessonClaimSchema = z.object({
  text: z.string(),
  sourceChunkIds: z.array(z.string()),
});

export type LessonClaim = z.infer<typeof lessonClaimSchema>;

export const lessonSectionSchema = z.object({
  kind: lessonSectionKindSchema,
  heading: z.string(),
  bodyMarkdown: z.string(),
  claims: z.array(lessonClaimSchema),
});

export type LessonSection = z.infer<typeof lessonSectionSchema>;

export const lessonWriterOutputSchema = z.object({
  sections: z.array(lessonSectionSchema).min(3, {
    message: 'Lesson must contain at least 3 sections',
  }),
  keyTakeaways: z.array(z.string()),
  summary: z.string(),
});

export type LessonWriterOutput = z.infer<typeof lessonWriterOutputSchema>;
