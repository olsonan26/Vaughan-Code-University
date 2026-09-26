import type { AssessmentDifficulty, QuestionType } from './schema.js';

export const ASSESSMENT_DESIGNER_SYSTEM_PROMPT = `You are a master educational assessment designer for Vaughan Code University's AI Course Factory.
Your job is to generate rigorous, fair, and pedagogically targeted assessment questions grounded in course content and objectives.

Assessment Rules (§52 / §98):
1. Alignment & Coverage:
   - Each question MUST map to at least one valid objective ID (in objectiveIds), at least one lessonId, and relevant conceptNames.
   - Ground every question in evidence chunks (sourceChunkIds) and authoritative locked knowledge.

2. Quality & Rigor:
   - Avoid obviously wrong distractors, trick questions, or off-objective trivia.
   - For choice-based questions, provide 2 to 6 plausible options.
   - Provide a clear, educational rationale for why the answer is correct and why distractors are incorrect.

3. Question Types & Format Rules:
   - multiple_choice: options array (2-6), correct.indices MUST have exactly 1 item.
   - true_false: options MUST be ['True', 'False'], correct.indices MUST have exactly 1 item.
   - multi_select: options array (2-6), correct.indices has 1 or more items.
   - scenario / application: scenario-based assessment; if choice-based, include options and indices.
   - matching: correct.pairs array with { left, right } pairs.
   - calculation / written_response / case_study / certification: provide clear stem and detailed rubric/solution in correct.text or rationale.

4. Difficulty Level:
   - Align question complexity with the requested difficulty level: basic, standard, challenging, act_reasoning, or professional_certification.
`;

export interface BuildAssessmentDesignerPromptParams {
  difficulty: AssessmentDifficulty;
  questionCount: number;
  objectives: { id: string; text: string; lessonId: string }[];
  lessons: { id: string; title: string; summary: string }[];
  concepts: { name: string; shortDefinition: string }[];
  allowedTypes?: QuestionType[];
  lockedFormatted: string;
}

export function buildAssessmentDesignerUserContent(params: BuildAssessmentDesignerPromptParams): string {
  const {
    difficulty,
    questionCount,
    objectives,
    lessons,
    concepts,
    allowedTypes,
    lockedFormatted,
  } = params;

  let content = `DIFFICULTY: ${difficulty}
QUESTION COUNT REQUESTED: ${questionCount}
${allowedTypes && allowedTypes.length > 0 ? `ALLOWED QUESTION TYPES: ${allowedTypes.join(', ')}\n` : ''}

LESSONS:
${lessons.map((l) => `- [Lesson ID: ${l.id}] ${l.title}: ${l.summary}`).join('\n')}

OBJECTIVES (Each question must reference at least one objective ID):
${objectives.map((o) => `- [Objective ID: ${o.id}] (Lesson ${o.lessonId}): ${o.text}`).join('\n')}

CONCEPTS:
${concepts.map((c) => `- ${c.name}: ${c.shortDefinition}`).join('\n')}

${lockedFormatted}

INSTRUCTIONS:
Generate exactly ${questionCount} assessment questions adhering to the difficulty level '${difficulty}' and constraints.
Map each question to objectiveIds (min 1 required), lessonId, conceptNames, and sourceChunkIds from untrusted context.
Ensure choice questions have options (2-6 items) and valid correct.indices in range.
`;

  return content;
}
