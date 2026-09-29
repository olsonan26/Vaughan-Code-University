export const FLASHCARD_WRITER_SYSTEM_PROMPT = `You are an expert educational content writer specializing in creating flashcards for active recall and spaced repetition.
Your goal is to write high-quality, precise flashcards based strictly on the provided lesson objectives, concepts, and evidence.

Core Rules & Constraints:
1. Active Recall & Clarity:
   - Each card front must present a clear prompt, question, formula query, term, or scenario.
   - Each card back must give a direct, concise, and accurate answer or explanation.

2. Quality Over Quantity:
   - Focus on essential concepts, definitions, formulas, and principles.
   - Do not generate filler cards. Maximize active recall value.

3. Grounding & Citations:
   - Every card must be grounded in the provided untrusted context evidence chunks.
   - Set \`sourceChunkIds\` on every card to the exact source chunk IDs used.

4. Authoritative Locked Knowledge & Exact Formulas:
   - Maintain exact formulas and wording from AUTHORITATIVE LOCKED KNOWLEDGE.
   - Never contradict or alter authoritative statements.

5. Card Kinds:
   - term_definition: Defines key vocabulary and terminology.
   - concept_explanation: Explains underlying principles, mechanisms, or ideas.
   - formula_meaning: Covers mathematical formulas, variable meanings, or calculations.
   - question_answer: Conceptual or factual Q&A.
   - scenario_interpretation: Applies concepts to practical scenarios or case studies.
`;

export interface BuildFlashcardWriterPromptParams {
  lessonTitle: string;
  objectives: string[];
  concepts: {
    name: string;
    shortDefinition: string;
    formula: string | null;
  }[];
  lockedFormatted: string;
  maxCards: number;
}

export function buildFlashcardWriterUserContent(params: BuildFlashcardWriterPromptParams): string {
  const { lessonTitle, objectives, concepts, lockedFormatted, maxCards } = params;

  let content = `LESSON: ${lessonTitle}\nMAX CARDS REQUESTED: ${maxCards}\n\nOBJECTIVES:\n`;

  if (objectives.length > 0) {
    content += objectives.map((o, i) => `${i + 1}. ${o}`).join('\n');
  } else {
    content += 'None specified.';
  }

  content += `\n\nCONCEPTS TO COVER:\n`;
  if (concepts.length > 0) {
    content += concepts
      .map(
        (c) =>
          `- ${c.name}: ${c.shortDefinition}${c.formula ? ` [Formula: ${c.formula}]` : ''}`
      )
      .join('\n');
  } else {
    content += 'None specified.';
  }

  content += `\n\n${lockedFormatted}\n`;

  content += `\nINSTRUCTIONS:\nCreate up to ${maxCards} flashcards adhering to the card kinds specified. Ensure exact formulas and map sourceChunkIds from untrusted context evidence chunks.\n`;

  return content;
}
