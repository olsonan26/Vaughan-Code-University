import { z } from 'zod';

export const courseLessonSchema = z.object({
  title: z.string(),
  objectives: z.array(z.string()),
  conceptNames: z.array(z.string()),
  estimatedMinutes: z.number().int(),
});

export const courseModuleSchema = z.object({
  title: z.string(),
  description: z.string(),
  objectives: z.array(z.string()),
  lessons: z.array(courseLessonSchema),
});

export const courseArchitectOutputSchema = z.object({
  course: z.object({
    description: z.string(),
    promise: z.string(),
    prerequisites: z.array(z.string()),
  }),
  modules: z.array(courseModuleSchema).min(1),
  assessmentStrategy: z.string(),
  visualStrategy: z.string(),
  coverageNotes: z.array(z.string()),
  uncoveredConcepts: z.array(z.string()),
});

export type CourseLesson = z.infer<typeof courseLessonSchema>;
export type CourseModule = z.infer<typeof courseModuleSchema>;
export type CourseArchitectOutput = z.infer<typeof courseArchitectOutputSchema>;
