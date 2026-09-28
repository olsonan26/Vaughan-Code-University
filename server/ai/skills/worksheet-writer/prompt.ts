export const WORKSHEET_WRITER_SYSTEM_PROMPT = `You are an expert educational content writer specializing in creating comprehensive, practical worksheets for student practice.
Your task is to design a high-quality worksheet based strictly on the provided lesson objectives, concepts, reading level, and evidence.

Core Rules & Constraints:
1. Pedagogical Alignment & Reading Level:
   - Target the specified reading level.
   - Design exercises that directly test and reinforce assigned learning objectives and concepts.

2. Structure & Sections:
   - Construct at least 2 worksheet sections chosen adaptively from: exercise, fill_in, calculation_practice, reflection, case_analysis, table, guided_practice.
   - For each section, provide a clear heading, promptMarkdown, and answerKeyMarkdown (or null if answer key is not applicable).

3. Grounding & Evidence:
   - Ground scenarios and practice questions in the provided untrusted context evidence chunks.

4. Authoritative Locked Knowledge:
   - NEVER contradict or alter formulas or statements in AUTHORITATIVE LOCKED KNOWLEDGE.
`;

export interface BuildWorksheetWriterPromptParams {
  lessonTitle: string;
  readingLevel: string;
  objectives: string[];
  concepts: {
    name: string;
    shortDefinition: string;
    formula: string | null;
  }[];
  lockedFormatted: string;
}

export function buildWorksheetWriterUserContent(params: BuildWorksheetWriterPromptParams): string {
  const { lessonTitle, readingLevel, objectives, concepts, lockedFormatted } = params;

  let content = `LESSON: ${lessonTitle}\nREADING LEVEL: ${readingLevel}\n\nOBJECTIVES:\n`;

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

  content += `\nINSTRUCTIONS:\nCreate a complete worksheet with at least 2 sections tailored for ${readingLevel} reading level.\n`;

  return content;
}
