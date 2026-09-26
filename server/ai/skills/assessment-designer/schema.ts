import { z } from 'zod';

export const questionTypeSchema = z.enum([
  'multiple_choice',
  'multi_select',
  'true_false',
  'scenario',
  'application',
  'matching',
  'calculation',
  'written_response',
  'case_study',
  'certification',
]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

export const assessmentDifficultySchema = z.enum([
  'basic',
  'standard',
  'challenging',
  'act_reasoning',
  'professional_certification',
]);

export type AssessmentDifficulty = z.infer<typeof assessmentDifficultySchema>;

export const correctPairSchema = z.object({
  left: z.string(),
  right: z.string(),
});

export const correctAnswerSchema = z.object({
  indices: z.array(z.number().int()).optional(),
  text: z.string().optional(),
  pairs: z.array(correctPairSchema).optional(),
});

export type CorrectAnswer = z.infer<typeof correctAnswerSchema>;

export const CHOICE_TYPES = ['multiple_choice', 'multi_select', 'true_false', 'scenario'] as const;

export const assessmentQuestionSchema = z
  .object({
    type: questionTypeSchema,
    stem: z.string(),
    options: z.array(z.string()).optional(),
    correct: correctAnswerSchema,
    rationale: z.string(),
    difficulty: z.string(),
    objectiveIds: z.array(z.string()).min(1, {
      message: 'Question must map to at least one objective ID',
    }),
    conceptNames: z.array(z.string()),
    lessonId: z.string(),
    sourceChunkIds: z.array(z.string()),
  })
  .superRefine((q, ctx) => {
    // 1. Choice types require options (2 to 6 items)
    const isChoiceType = CHOICE_TYPES.includes(q.type as any);
    if (isChoiceType) {
      if (!q.options || q.options.length < 2 || q.options.length > 6) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: `Choice question type '${q.type}' requires between 2 and 6 options`,
        });
      }

      if (!q.correct.indices || q.correct.indices.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct', 'indices'],
          message: `Choice question type '${q.type}' requires correct.indices`,
        });
      } else if (q.options) {
        for (let i = 0; i < q.correct.indices.length; i++) {
          const idx = q.correct.indices[i];
          if (idx < 0 || idx >= q.options.length) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['correct', 'indices', i],
              message: `Index ${idx} is out of bounds for options length ${q.options.length}`,
            });
          }
        }
      }
    }

    // 2. multiple_choice requires exactly 1 correct index
    if (q.type === 'multiple_choice') {
      if (q.correct.indices && q.correct.indices.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct', 'indices'],
          message: `multiple_choice questions must have exactly 1 correct index, got ${q.correct.indices.length}`,
        });
      }
    }

    // 3. true_false requires options to be ['True', 'False'] and exactly 1 correct index
    if (q.type === 'true_false') {
      if (
        !q.options ||
        q.options.length !== 2 ||
        q.options[0] !== 'True' ||
        q.options[1] !== 'False'
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['options'],
          message: `true_false options must be exactly ['True', 'False']`,
        });
      }
      if (q.correct.indices && q.correct.indices.length !== 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['correct', 'indices'],
          message: `true_false questions must have exactly 1 correct index`,
        });
      }
    }
  });

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;

export const assessmentDesignerOutputSchema = z.object({
  questions: z.array(assessmentQuestionSchema),
});

export type AssessmentDesignerOutput = z.infer<typeof assessmentDesignerOutputSchema>;
