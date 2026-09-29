export interface PrereqWarning {
  type: 'prerequisite_after' | 'prerequisite_missing' | 'duplicate_concept' | 'dense_lesson';
  moduleIndex: number;
  lessonIndex: number;
  concept: string;
  requiredPrerequisite?: string;
  message: string;
  suggestedFix: string;
}

export interface ValidatePrerequisitesBlueprint {
  modules: {
    title: string;
    lessons: {
      title: string;
      conceptNames: string[];
    }[];
  }[];
}

export interface ValidatePrerequisitesGraph {
  concepts: {
    name: string;
    prerequisites: string[];
  }[];
}

export interface ValidatePrerequisitesOptions {
  maxNewConceptsPerLesson?: number; // default 6
}

export function validatePrerequisites(
  blueprint: ValidatePrerequisitesBlueprint,
  graph: ValidatePrerequisitesGraph,
  opts?: ValidatePrerequisitesOptions
): PrereqWarning[] {
  const maxNewConceptsPerLesson = opts?.maxNewConceptsPerLesson ?? 6;
  const warnings: PrereqWarning[] = [];

  // Map graph concepts case-insensitively
  const graphMap = new Map<string, { name: string; prerequisites: string[] }>();
  for (const c of graph.concepts) {
    graphMap.set(c.name.trim().toLowerCase(), c);
  }

  // Record all occurrences of concepts across the course
  interface ConceptOccurrence {
    moduleIndex: number;
    lessonIndex: number;
    originalName: string;
  }
  const conceptMap = new Map<string, ConceptOccurrence[]>();

  blueprint.modules.forEach((mod, m) => {
    mod.lessons.forEach((lesson, l) => {
      for (const conceptName of lesson.conceptNames) {
        const key = conceptName.trim().toLowerCase();
        if (!conceptMap.has(key)) {
          conceptMap.set(key, []);
        }
        conceptMap.get(key)!.push({
          moduleIndex: m,
          lessonIndex: l,
          originalName: conceptName,
        });
      }
    });
  });

  // Validate each module and lesson
  blueprint.modules.forEach((mod, m) => {
    mod.lessons.forEach((lesson, l) => {
      const lessonConcepts = lesson.conceptNames || [];

      // Check dense lesson
      if (lessonConcepts.length > maxNewConceptsPerLesson) {
        warnings.push({
          type: 'dense_lesson',
          moduleIndex: m,
          lessonIndex: l,
          concept: lessonConcepts.join(', '),
          message: `Lesson ${m + 1}.${l + 1} teaches ${lessonConcepts.length} concepts, which exceeds maximum of ${maxNewConceptsPerLesson}.`,
          suggestedFix: `Split Lesson ${m + 1}.${l + 1} into multiple lessons or reduce concepts per lesson.`,
        });
      }

      for (const conceptName of lessonConcepts) {
        const conceptKey = conceptName.trim().toLowerCase();
        const occurrences = conceptMap.get(conceptKey) || [];

        // Check duplicate concept (taught in 2+ lessons, flag on occurrences after the first)
        if (occurrences.length > 1) {
          const firstOcc = occurrences[0];
          if (m > firstOcc.moduleIndex || (m === firstOcc.moduleIndex && l > firstOcc.lessonIndex)) {
            warnings.push({
              type: 'duplicate_concept',
              moduleIndex: m,
              lessonIndex: l,
              concept: conceptName,
              message: `Lesson ${m + 1}.${l + 1} teaches ${conceptName}, which is primarily taught in Lesson ${firstOcc.moduleIndex + 1}.${firstOcc.lessonIndex + 1}.`,
              suggestedFix: `Remove ${conceptName} from Lesson ${m + 1}.${l + 1} or consolidate teaching.`,
            });
          }
        }

        // Check prerequisites from graph
        const graphConcept = graphMap.get(conceptKey);
        if (graphConcept && graphConcept.prerequisites) {
          for (const req of graphConcept.prerequisites) {
            const reqKey = req.trim().toLowerCase();
            const reqOccurrences = conceptMap.get(reqKey);

            if (!reqOccurrences || reqOccurrences.length === 0) {
              // Prerequisite missing
              warnings.push({
                type: 'prerequisite_missing',
                moduleIndex: m,
                lessonIndex: l,
                concept: conceptName,
                requiredPrerequisite: req,
                message: `Lesson ${m + 1}.${l + 1} teaches ${conceptName}. Required prerequisite: ${req}. That concept is not taught anywhere in this course.`,
                suggestedFix: `Add a lesson for ${req} before Lesson ${m + 1}.${l + 1}.`,
              });
            } else {
              // Check if prerequisite is introduced after or in same lesson
              const firstReqOcc = reqOccurrences[0];
              const reqM = firstReqOcc.moduleIndex;
              const reqL = firstReqOcc.lessonIndex;

              const isReqAfter = reqM > m || (reqM === m && reqL >= l);

              if (isReqAfter) {
                let locationMsg = `until Module ${reqM + 1}.`;
                if (reqM === m && reqL > l) {
                  locationMsg = `until Lesson ${reqM + 1}.${reqL + 1}.`;
                } else if (reqM === m && reqL === l) {
                  locationMsg = `in the same lesson (Lesson ${m + 1}.${l + 1}).`;
                }

                warnings.push({
                  type: 'prerequisite_after',
                  moduleIndex: m,
                  lessonIndex: l,
                  concept: conceptName,
                  requiredPrerequisite: req,
                  message: `Lesson ${m + 1}.${l + 1} teaches ${conceptName}. Required prerequisite: ${req}. That concept is currently not introduced ${locationMsg}`,
                  suggestedFix: `Move ${req} to Module ${m + 1} or earlier, or move this lesson later.`,
                });
              }
            }
          }
        }
      }
    });
  });

  return warnings;
}
