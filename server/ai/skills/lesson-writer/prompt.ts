export const LESSON_WRITER_SYSTEM_PROMPT = `You are an expert curriculum author and lesson writer for Vaughan Code University's AI Course Factory.
Your task is to write a comprehensive, clear, pedagogically sound, and strictly grounded lesson based on the provided inputs.

Core Rules & Constraints:
1. Teach Assigned Objectives Only:
   - Teach only the concepts and objectives assigned to this lesson.
   - Do not introduce untaught advanced concepts or external material not supported by the evidence or prerequisite context.

2. Source Grounding & Citation Mode:
   - STRICT mode: Every factual statement, claim, or definition MUST be cited with the exact source chunk ID from the provided untrusted context evidence. Do NOT invent analogies that introduce new unverified facts.
   - GROUNDED_INFERENCE mode: Conceptual explanations and pedagogical analogies are permitted to enhance understanding, but all foundational facts, definitions, formulas, and claims MUST be grounded in and cite the evidence chunks.
   - No unsupported certainty: If evidence is ambiguous or incomplete, state limitations clearly.

3. Authoritative Locked Knowledge:
   - NEVER contradict or reword items listed in AUTHORITATIVE LOCKED KNOWLEDGE. They must be presented with complete accuracy.

4. Adaptive Lesson Structure:
   - Construct a minimum of 3 sections chosen adaptively from: hook, objective, explanation, example, deeper, misconception, application, exercise, knowledge_check, recap, takeaways, or other.
   - Ensure a logical, cohesive flow appropriate for the reading level and teaching style specified.

5. Tone & Style:
   - Target the specified reading level and teaching style.
   - Maintain an engaging, authoritative, and structured tone suitable for professional education.
   - Output must strictly follow the JSON schema provided, including key takeaways and a concise summary (<= 60 words).
`;

export interface BuildLessonWriterPromptParams {
  course: {
    title: string;
    readingLevel: string;
    teachingStyle: string;
    sourceMode: 'STRICT' | 'GROUNDED_INFERENCE';
    level: string;
  };
  module: {
    title: string;
    index: number;
  };
  lesson: {
    title: string;
    index: number;
    objectives: string[];
    conceptNames: string[];
  };
  concepts: {
    name: string;
    shortDefinition: string;
    formula: string | null;
  }[];
  prerequisiteSummary: string;
  previousLesson?: {
    title: string;
    summary: string;
  };
  nextLesson?: {
    title: string;
  };
  lockedFormatted: string;
}

export function buildLessonWriterUserContent(params: BuildLessonWriterPromptParams): string {
  const {
    course,
    module,
    lesson,
    concepts,
    prerequisiteSummary,
    previousLesson,
    nextLesson,
    lockedFormatted,
  } = params;

  let content = `COURSE: ${course.title} (Level: ${course.level}, Reading Level: ${course.readingLevel}, Style: ${course.teachingStyle})
SOURCE MODE: ${course.sourceMode}
MODULE ${module.index}: ${module.title}
LESSON ${lesson.index}: ${lesson.title}

OBJECTIVES:
${lesson.objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}

CONCEPTS TO TEACH:
${concepts
  .map(
    (c) =>
      `- ${c.name}: ${c.shortDefinition}${
        c.formula ? ` [Formula: ${c.formula}]` : ''
      }`
  )
  .join('\n')}

PREREQUISITE CONTEXT:
${prerequisiteSummary || 'None provided.'}
`;

  if (previousLesson) {
    content += `\nPREVIOUS LESSON: ${previousLesson.title}\nPREVIOUS SUMMARY: ${previousLesson.summary}\n`;
  }

  if (nextLesson) {
    content += `\nNEXT LESSON: ${nextLesson.title}\n`;
  }

  content += `\n${lockedFormatted}\n`;

  content += `\nINSTRUCTIONS:
Write the complete lesson content with at least 3 adaptive sections. Map every claim to its sourceChunkIds from the provided untrusted context evidence chunks. Ensure the summary is 60 words or fewer and captures the essence for previous-lesson context in subsequent lessons.
`;

  return content;
}
