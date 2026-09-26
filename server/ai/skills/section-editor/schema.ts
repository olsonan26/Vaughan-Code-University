import { z } from 'zod';

export const sectionEditorActionSchema = z.enum([
  'rewrite',
  'simplify',
  'expand',
  'add_example',
  'add_analogy',
  'more_practical',
  'more_professional',
  'more_conversational',
  'reduce_words',
  'increase_depth',
  'adjust_reading_level',
]);

export type SectionEditorAction = z.infer<typeof sectionEditorActionSchema>;

export const sectionEditorClaimSchema = z.object({
  text: z.string(),
  sourceChunkIds: z.array(z.string()),
});

export type SectionEditorClaim = z.infer<typeof sectionEditorClaimSchema>;

export const sectionEditorOutputSchema = z.object({
  bodyMarkdown: z.string(),
  changeSummary: z.string(),
  claims: z.array(sectionEditorClaimSchema),
});

export type SectionEditorOutput = z.infer<typeof sectionEditorOutputSchema>;
