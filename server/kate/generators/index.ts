/** Static generator map (static imports so the serverless bundle includes every writer). */
import type { GeneratorFn } from './types.js';
import { generate as quiz } from './quiz.js';
import { generate as reading } from './reading.js';
import { generate as flashcards } from './flashcards.js';
import { generate as worksheet } from './worksheet.js';
import { generate as lesson_plan } from './lesson_plan.js';
import { generate as transcript_cleanup } from './transcript_cleanup.js';
import { generate as lesson } from './lesson.js';
import { generate as module } from './module.js';
import { generate as course_map } from './course_map.js';
import { generate as rewrite } from './rewrite.js';
import { generate as enrichment } from './enrichment.js';
export { buildChecklist } from './checklist.js';
export const GENERATORS: Record<string, GeneratorFn> = { quiz, reading, flashcards, worksheet, lesson_plan, transcript_cleanup, lesson, module, course_map, rewrite, enrichment };
