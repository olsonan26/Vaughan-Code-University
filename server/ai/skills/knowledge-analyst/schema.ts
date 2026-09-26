import { z } from 'zod';

export const sourceRefSchema = z.object({
  chunkId: z.string(),
  quote: z.string(),
  page: z.number().nullable(),
});

export const relationshipTypeSchema = z.enum([
  'prerequisite_of',
  'part_of',
  'related_to',
  'contrasts_with',
  'supports',
  'derived_from',
  'example_of',
  'contradicts',
]);

export const relationshipSchema = z.object({
  targetName: z.string(),
  type: relationshipTypeSchema,
});

export const conceptKindSchema = z.enum([
  'rule',
  'definition',
  'principle',
  'method',
  'formula',
  'example',
  'warning',
  'term',
]);

export const conceptSchema = z.object({
  name: z.string(),
  shortDefinition: z.string(),
  extendedExplanation: z.string(),
  category: z.string(),
  formula: z.string().nullable(),
  examples: z.array(z.string()),
  warnings: z.array(z.string()),
  kind: conceptKindSchema,
  isOfficialMethodology: z.boolean(),
  uncertainty: z.enum(['low', 'medium', 'high']),
  sourceRefs: z.array(sourceRefSchema).min(1),
  relationships: z.array(relationshipSchema),
  possibleDuplicateOf: z.string().nullable(),
});

export const contradictionSchema = z.object({
  conceptName: z.string(),
  statementA: z.string(),
  chunkIdA: z.string(),
  statementB: z.string(),
  chunkIdB: z.string(),
  note: z.string(),
});

export const knowledgeAnalystOutputSchema = z.object({
  concepts: z.array(conceptSchema),
  contradictions: z.array(contradictionSchema),
});

export type SourceRef = z.infer<typeof sourceRefSchema>;
export type Relationship = z.infer<typeof relationshipSchema>;
export type Concept = z.infer<typeof conceptSchema>;
export type Contradiction = z.infer<typeof contradictionSchema>;
export type KnowledgeAnalystOutput = z.infer<typeof knowledgeAnalystOutputSchema>;
