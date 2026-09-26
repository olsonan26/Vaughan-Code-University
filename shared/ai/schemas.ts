import { z } from 'zod';

// ==========================================
// 1. Knowledge Analyst Schemas
// ==========================================
export const extractedRelationshipSchema = z.object({
  targetName: z.string(),
  type: z.enum([
    'prerequisite_of',
    'part_of',
    'related_to',
    'contrasts_with',
    'supports',
    'derived_from',
    'example_of',
    'contradicts',
  ]),
});

export const extractedSourceRefSchema = z.object({
  chunkId: z.string(),
  quote: z.string(),
  page: z.number().optional(),
});

export const extractedConceptSchema = z.object({
  name: z.string(),
  shortDefinition: z.string(),
  extendedExplanation: z.string(),
  category: z.string(),
  formula: z.string().optional(),
  examples: z.array(z.string()),
  warnings: z.array(z.string()),
  isRule: z.boolean(),
  isExample: z.boolean(),
  isOfficialMethodology: z.boolean(),
  opinion: z.boolean(),
  uncertainty: z.string().optional(),
  sourceRefs: z.array(extractedSourceRefSchema),
  relationships: z.array(extractedRelationshipSchema),
  possibleDuplicates: z.array(z.string()).optional(),
  contradictions: z.array(z.string()).optional(),
});

export const knowledgeExtractionOutputSchema = z.object({
  concepts: z.array(extractedConceptSchema),
});

export type ExtractedConcept = z.infer<typeof extractedConceptSchema>;
export type KnowledgeExtractionOutput = z.infer<typeof knowledgeExtractionOutputSchema>;

// ==========================================
// 2. Course Architect Schemas
// ==========================================
export const blueprintLessonSchema = z.object({
  title: z.string(),
  objectives: z.array(z.string()),
  conceptNames: z.array(z.string()),
  estimatedMinutes: z.number(),
});

export const blueprintModuleSchema = z.object({
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  lessons: z.array(blueprintLessonSchema),
});

export const courseBlueprintSchema = z.object({
  course: z.object({
    description: z.string(),
    promise: z.string(),
    prerequisites: z.array(z.string()),
  }),
  modules: z.array(blueprintModuleSchema),
  assessmentStrategy: z.string(),
  visualStrategy: z.string(),
  coverageNotes: z.string(),
});

export type CourseBlueprint = z.infer<typeof courseBlueprintSchema>;

// ==========================================
// 3. Prerequisite Validator Schemas
// ==========================================
export const prerequisiteWarningSchema = z.object({
  type: z.enum([
    'missing_prerequisite',
    'duplicate_concept',
    'unintroduced_concept',
    'dense_module',
    'missing_foundation',
  ]),
  lessonRef: z.string(),
  concept: z.string(),
  requiredPrerequisite: z.string().optional(),
  message: z.string(),
  suggestedFix: z.string(),
});

export const prerequisiteValidationOutputSchema = z.object({
  warnings: z.array(prerequisiteWarningSchema),
});

export type PrerequisiteWarning = z.infer<typeof prerequisiteWarningSchema>;
export type PrerequisiteValidationOutput = z.infer<typeof prerequisiteValidationOutputSchema>;

// ==========================================
// 4. Lesson Writer Schemas
// ==========================================
export const claimRefSchema = z.object({
  text: z.string(),
  sourceRefs: z.array(z.string()),
});

export const lessonSectionSchema = z.object({
  kind: z.string(),
  heading: z.string(),
  bodyMarkdown: z.string(),
  claims: z.array(claimRefSchema),
});

export const lessonOutputSchema = z.object({
  sections: z.array(lessonSectionSchema),
  keyTakeaways: z.array(z.string()),
  visualOpportunities: z.array(z.string()).optional(),
});

export type LessonOutput = z.infer<typeof lessonOutputSchema>;

// ==========================================
// 5. Section Editor Schemas
// ==========================================
export const sectionTransformOutputSchema = z.object({
  bodyMarkdown: z.string(),
  changeSummary: z.string(),
});

export type SectionTransformOutput = z.infer<typeof sectionTransformOutputSchema>;

// ==========================================
// 6. Assessment Designer Schemas
// ==========================================
export const assessmentQuestionSchema = z.object({
  type: z.enum([
    'multiple_choice',
    'multi_select',
    'true_false',
    'scenario_reasoning',
    'application',
    'matching',
    'calculation',
    'written_response',
    'case_study',
    'certification',
  ]),
  stem: z.string(),
  options: z.array(z.string()).optional(),
  correct: z.union([z.string(), z.array(z.string())]),
  rationale: z.string(),
  difficulty: z.enum(['Basic', 'Standard', 'Challenging', 'ACT_style', 'Professional']),
  objectiveRefs: z.array(z.string()),
  conceptNames: z.array(z.string()),
  lessonRef: z.string(),
  sourceRefs: z.array(z.string()),
});

export const assessmentOutputSchema = z.object({
  questions: z.array(assessmentQuestionSchema),
});

export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;
export type AssessmentOutput = z.infer<typeof assessmentOutputSchema>;

// ==========================================
// 7. Flashcard Writer Schemas
// ==========================================
export const flashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  conceptName: z.string(),
  cardType: z.enum([
    'term_definition',
    'concept_explanation',
    'formula_meaning',
    'question_answer',
    'scenario_interpretation',
  ]),
});

export const flashcardsOutputSchema = z.object({
  flashcards: z.array(flashcardSchema),
});

export type Flashcard = z.infer<typeof flashcardSchema>;
export type FlashcardsOutput = z.infer<typeof flashcardsOutputSchema>;

// ==========================================
// 8. Worksheet Writer Schemas
// ==========================================
export const worksheetSectionSchema = z.object({
  title: z.string(),
  exerciseType: z.enum([
    'exercise',
    'fill_in',
    'calculation_practice',
    'reflection',
    'case_analysis',
    'table_completion',
    'guided_practice',
  ]),
  prompt: z.string(),
  sampleAnswer: z.string().optional(),
});

export const worksheetOutputSchema = z.object({
  title: z.string(),
  instructions: z.string(),
  sections: z.array(worksheetSectionSchema),
});

export type WorksheetOutput = z.infer<typeof worksheetOutputSchema>;

// ==========================================
// 9. Visual Director Schemas
// ==========================================
export const visualSlotSchema = z.object({
  anchorSectionIndex: z.number(),
  need: z.enum(['ESSENTIAL', 'HELPFUL', 'DECORATIVE', 'NONE']),
  purpose: z.string(),
  type: z.string(),
  quality: z.enum(['STANDARD', 'PREMIUM', 'SIGNATURE']),
  renderMode: z.enum(['CHATGPT_IMAGE', 'PROGRAMMATIC_DIAGRAM']),
  title: z.string(),
  rationale: z.string(),
});

export const visualNeedsOutputSchema = z.object({
  slots: z.array(visualSlotSchema),
});

export const visualBriefSchema = z.object({
  id: z.string().optional(),
  lesson: z.string().optional(),
  section: z.string().optional(),
  title: z.string(),
  purpose: z.string(),
  importance: z.string(),
  type: z.string(),
  quality: z.string(),
  teachingObjective: z.string(),
  concept: z.string(),
  placement: z.string(),
  requiredElements: z.array(z.string()),
  optionalElements: z.array(z.string()).optional(),
  composition: z.string(),
  cameraPerspective: z.string(),
  lighting: z.string(),
  materialTexture: z.string(),
  mood: z.string(),
  brandStyle: z.string(),
  colorDirection: z.string(),
  textRequirements: z.string(),
  accuracyRequirements: z.string(),
  aspectRatio: z.string(),
  negativeRequirements: z.string(),
  sourceContext: z.string().optional(),
  status: z.string().optional(),
});

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const ASPECT_RATIO_REGEX = /\b(16:9|1:1|4:3|9:16|21:9|3:2|2:3)\b/i;
const AVOID_CLAUSE_REGEX = /\b(avoid|do not|no |never|exclude|without)\b/i;

export const visualBriefAndPromptSchema = z
  .object({
    brief: visualBriefSchema,
    chatgptPrompt: z
      .string()
      .refine((val) => !UUID_REGEX.test(val), {
        message: 'chatgptPrompt must not contain UUIDs',
      })
      .refine((val) => ASPECT_RATIO_REGEX.test(val), {
        message: 'chatgptPrompt must mention an aspect ratio (e.g. 16:9, 1:1, 4:3, 9:16)',
      })
      .refine((val) => AVOID_CLAUSE_REGEX.test(val), {
        message: 'chatgptPrompt must include an explicit avoid clause',
      }),
    altTextSuggestion: z.string(),
    programmaticSpec: z.record(z.string(), z.unknown()).optional(),
    renderMode: z.enum(['CHATGPT_IMAGE', 'PROGRAMMATIC_DIAGRAM']).optional(),
    quality: z.enum(['STANDARD', 'PREMIUM', 'SIGNATURE']).optional(),
  })
  .superRefine((data, ctx) => {
    // Quality check for premium/signature
    const quality = data.quality || data.brief.quality;
    if ((quality === 'PREMIUM' || quality === 'SIGNATURE') && data.chatgptPrompt.length < 600) {
      ctx.addIssue({
        code: 'custom',
        path: ['chatgptPrompt'],
        message: `chatgptPrompt must be at least 600 characters for ${quality} quality (got ${data.chatgptPrompt.length})`,
      });
    }

    // Programmatic diagram check
    const renderMode = data.renderMode || (data.brief as any).renderMode;
    if (renderMode === 'PROGRAMMATIC_DIAGRAM' && (!data.programmaticSpec || Object.keys(data.programmaticSpec).length === 0)) {
      ctx.addIssue({
        code: 'custom',
        path: ['programmaticSpec'],
        message: 'programmatic_diagram renderMode requires programmaticSpec',
      });
    }
  });

export type VisualSlot = z.infer<typeof visualSlotSchema>;
export type VisualNeedsOutput = z.infer<typeof visualNeedsOutputSchema>;
export type VisualBriefAndPrompt = z.infer<typeof visualBriefAndPromptSchema>;

// ==========================================
// 10. Source Auditor Schemas
// ==========================================
export const auditResultItemSchema = z.object({
  claim: z.string(),
  verdict: z.enum(['supported', 'partially_supported', 'unsupported', 'conflict', 'ambiguous']),
  evidenceChunkIds: z.array(z.string()),
  explanation: z.string(),
  suggestedFix: z.string().optional(),
});

export const sourceAuditOutputSchema = z.object({
  results: z.array(auditResultItemSchema),
});

export type AuditResultItem = z.infer<typeof auditResultItemSchema>;
export type SourceAuditOutput = z.infer<typeof sourceAuditOutputSchema>;

// ==========================================
// 11. Course Director Schemas
// ==========================================
export const changesetItemSchema = z.object({
  targetType: z.enum(['module', 'lesson', 'section', 'quiz', 'visual']),
  targetId: z.string(),
  operation: z.enum(['add', 'update', 'delete', 'reorder']),
  before: z.unknown().optional(),
  after: z.unknown(),
  reason: z.string(),
});

export const courseDirectorAnalysisSchema = z.object({
  analysis: z.string(),
  changeset: z.object({
    title: z.string(),
    rationale: z.string(),
    items: z.array(changesetItemSchema),
    affected: z.object({
      lessons: z.array(z.string()),
      quizzes: z.array(z.string()),
      visuals: z.array(z.string()),
      concepts: z.array(z.string()),
    }),
  }),
});

export type ChangesetItem = z.infer<typeof changesetItemSchema>;
export type CourseDirectorAnalysis = z.infer<typeof courseDirectorAnalysisSchema>;
