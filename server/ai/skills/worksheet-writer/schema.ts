import { z } from 'zod';

export const worksheetSectionKindSchema = z.enum(['exercise', 'fill_in', 'calculation_practice', 'reflection', 'case_analysis', 'table', 'guided_practice']);

export const worksheetWriterOutputSchema = z.object({
  title: z.string().min(1),
  instructions: z.string().min(1),
  sections: z
    .array(
      z.object({
        kind: worksheetSectionKindSchema,
        heading: z.string().min(1),
        promptMarkdown: z.string().min(1),
        answerKeyMarkdown: z.string().nullable(),
      }),
    )
    .min(2),
});

export type WorksheetWriterOutput = z.infer<typeof worksheetWriterOutputSchema>;
