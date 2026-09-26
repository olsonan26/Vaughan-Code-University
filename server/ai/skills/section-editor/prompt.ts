import type { SectionEditorAction } from './schema.js';

export const SECTION_EDITOR_SYSTEM_PROMPT = `You are a precision educational content editor for Vaughan Code University's AI Course Factory.
Your job is to transform or refine a single section (or highlighted selection within a section) of a lesson according to the requested action.

Core Editing Principles:
1. Preserve Facts, Formulas, & Terminology:
   - You MUST preserve all factual claims, mathematical formulas, and technical terminology from the original section unless explicitly instructed otherwise based on authoritative sources.
   - Do NOT introduce facts or claims contradicted by the evidence or locked knowledge.

2. Scope Limitation:
   - Modify ONLY the target section (or the highlighted selection if provided).
   - Maintain consistency with the lesson context and objectives.

3. Grounding & Citations:
   - Every factual claim in the modified content MUST cite source chunk IDs from the provided evidence chunks.

4. Output Format:
   - Return the updated bodyMarkdown, a brief changeSummary describing what was transformed, and the claim citations.
`;

export interface BuildSectionEditorPromptParams {
  action: SectionEditorAction;
  targetReadingLevel?: string;
  instruction?: string;
  section: {
    heading: string;
    bodyMarkdown: string;
  };
  selection?: string;
  lessonContext: {
    title: string;
    objectives: string[];
  };
  lockedFormatted: string;
  sourceMode?: 'STRICT' | 'GROUNDED_INFERENCE';
}

export function buildSectionEditorUserContent(params: BuildSectionEditorPromptParams): string {
  const {
    action,
    targetReadingLevel,
    instruction,
    section,
    selection,
    lessonContext,
    lockedFormatted,
    sourceMode,
  } = params;

  let content = `LESSON TITLE: ${lessonContext.title}
LESSON OBJECTIVES:
${lessonContext.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

${sourceMode ? `SOURCE MODE: ${sourceMode}\n` : ''}
EDIT ACTION: ${action}
${targetReadingLevel ? `TARGET READING LEVEL: ${targetReadingLevel}\n` : ''}
${instruction ? `CUSTOM INSTRUCTION: ${instruction}\n` : ''}

SECTION HEADING: ${section.heading}
SECTION BODY:
\`\`\`markdown
${section.bodyMarkdown}
\`\`\`
`;

  if (selection) {
    content += `\nHIGHLIGHTED SELECTION TO EDIT:
\`\`\`markdown
${selection}
\`\`\`
Modify only this selection within the context of the section.
`;
  }

  content += `\n${lockedFormatted}\n`;

  content += `\nINSTRUCTIONS:
Apply the requested action "${action}" to the section${selection ? ' selection' : ''}. Preserve all core facts, formulas, and terminology. Provide updated bodyMarkdown, a concise changeSummary, and list claim citations with sourceChunkIds from untrusted context.
`;

  return content;
}
