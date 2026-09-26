import { z } from 'zod';

export const visualNeedEnum = z.enum(['ESSENTIAL', 'HELPFUL', 'DECORATIVE', 'NONE']);
export type VisualNeed = z.infer<typeof visualNeedEnum>;

export const visualPurposeEnum = z.enum([
  'instructional',
  'explanatory',
  'structural',
  'mnemonic',
  'emotional',
  'inspirational',
  'cover',
  'divider',
  'example',
  'comparison',
  'process',
  'reference',
]);
export type VisualPurpose = z.infer<typeof visualPurposeEnum>;

export const visualQualityEnum = z.enum(['STANDARD', 'PREMIUM', 'SIGNATURE']);
export type VisualQuality = z.infer<typeof visualQualityEnum>;

export const renderModeEnum = z.enum(['CHATGPT_IMAGE', 'PROGRAMMATIC_DIAGRAM']);
export type RenderMode = z.infer<typeof renderModeEnum>;

export const visualSlotNeedSchema = z.object({
  anchorSectionIndex: z.number().int().min(0),
  need: visualNeedEnum,
  purpose: visualPurposeEnum,
  type: z.string(),
  quality: visualQualityEnum,
  renderMode: renderModeEnum,
  title: z.string(),
  rationale: z.string(),
  aspectRatio: z.string(),
});
export type VisualSlotNeed = z.infer<typeof visualSlotNeedSchema>;

export const visualNeedsOutputSchema = z.object({
  slots: z.array(visualSlotNeedSchema),
});
export type VisualNeedsOutput = z.infer<typeof visualNeedsOutputSchema>;

export const visualBriefDetailsSchema = z.object({
  title: z.string(),
  purpose: z.string(),
  importance: z.string(),
  visualType: z.string(),
  promptQuality: visualQualityEnum,
  teachingObjective: z.string(),
  conceptCommunicated: z.string(),
  placement: z.string(),
  requiredElements: z.array(z.string()),
  optionalElements: z.array(z.string()).optional(),
  composition: z.string(),
  cameraPerspective: z.string().optional(),
  lighting: z.string().optional(),
  materialTexture: z.string().optional(),
  mood: z.string(),
  brandStyle: z.string(),
  colorDirection: z.string(),
  textRequirements: z.string(),
  accuracyRequirements: z.string(),
  aspectRatio: z.string(),
  negativeRequirements: z.array(z.string()),
  sourceContext: z.string().optional(),
});
export type VisualBriefDetails = z.infer<typeof visualBriefDetailsSchema>;

export const programmaticSpecSchema = z.object({
  kind: z.enum(['table', 'flow', 'timeline', 'comparison', 'calculation', 'chart']),
  title: z.string(),
  data: z.unknown(),
});
export type ProgrammaticSpec = z.infer<typeof programmaticSpecSchema>;

export const visualPromptOutputSchema = z
  .object({
    brief: visualBriefDetailsSchema,
    renderMode: renderModeEnum,
    chatgptPrompt: z.string().nullable(),
    programmaticSpec: programmaticSpecSchema.nullable(),
    altTextSuggestion: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.renderMode === 'CHATGPT_IMAGE') {
      if (!data.chatgptPrompt || data.chatgptPrompt.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: 'chatgptPrompt is required when renderMode is CHATGPT_IMAGE',
        });
        return;
      }

      const prompt = data.chatgptPrompt;

      // Reject UUIDs
      if (/[0-9a-f]{8}-[0-9a-f]{4}-/i.test(prompt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: 'chatgptPrompt must not contain system UUIDs',
        });
      }

      // Reject chunk:
      if (/chunk:/i.test(prompt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: 'chatgptPrompt must not contain raw chunk: references',
        });
      }

      // Quality length check for PREMIUM/SIGNATURE
      if (
        (data.brief.promptQuality === 'PREMIUM' || data.brief.promptQuality === 'SIGNATURE') &&
        prompt.length < 600
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: `chatgptPrompt must be at least 600 characters for ${data.brief.promptQuality} quality (got ${prompt.length})`,
        });
      }

      // Must mention brief.aspectRatio
      if (data.brief.aspectRatio && !prompt.includes(data.brief.aspectRatio)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: `chatgptPrompt must mention the brief aspect ratio (${data.brief.aspectRatio})`,
        });
      }

      // Must contain an avoid/do-not clause
      if (!/\b(avoid|do not|don't|never|no )\b/i.test(prompt) && !/\b(avoid|do not|don't|never|no )/i.test(prompt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['chatgptPrompt'],
          message: 'chatgptPrompt must contain an explicit avoid or negative requirement clause (e.g. Avoid, Do not, Never)',
        });
      }
    }

    if (data.renderMode === 'PROGRAMMATIC_DIAGRAM') {
      if (!data.programmaticSpec) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['programmaticSpec'],
          message: 'programmaticSpec is required when renderMode is PROGRAMMATIC_DIAGRAM',
        });
      }
    }
  });

export type VisualPromptOutput = z.infer<typeof visualPromptOutputSchema>;
