import { z } from 'zod';

export const flashcardKindSchema = z.enum([
  'term_definition',
  'concept_explanation',
  'formula_meaning',
  'question_answer',
  'scenario_interpretation',
]);

export type FlashcardKind = z.infer<typeof flashcardKindSchema>;

export const flashcardSchema = z.object({
  kind: flashcardKindSchema,
  front: z.string(),
  back: z.string(),
  conceptName: z.string(),
  sourceChunkIds: z.array(z.string()),
});

export type Flashcard = z.infer<typeof flashcardSchema>;

export function createFlashcardWriterOutputSchema(maxCards: number = 12) {
  const effectiveMax = Math.min(Math.max(maxCards, 1), 30);
  return z.object({
    cards: z.array(flashcardSchema).max(effectiveMax, {
      message: `Maximum ${effectiveMax} cards allowed`,
    }),
  });
}

export const flashcardWriterOutputSchema = createFlashcardWriterOutputSchema(30);

export type FlashcardWriterOutput = z.infer<typeof flashcardWriterOutputSchema>;
