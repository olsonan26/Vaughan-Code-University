export interface ObjectiveInput {
  id: string;
  text: string;
}

export interface QuestionInput {
  objectiveIds?: string[];
}

export interface ObjectiveCoverageResult {
  objectiveId: string;
  text: string;
  questionCount: number;
}

export function objectiveCoverage(
  objectives: ObjectiveInput[],
  questions: QuestionInput[]
): ObjectiveCoverageResult[] {
  return objectives.map((obj) => {
    let count = 0;
    for (const q of questions) {
      if (Array.isArray(q.objectiveIds) && q.objectiveIds.includes(obj.id)) {
        count++;
      }
    }
    return {
      objectiveId: obj.id,
      text: obj.text,
      questionCount: count,
    };
  });
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/!\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/^\s*#+\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .trim();
}

function countSyllablesInWord(word: string): number {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  if (cleanWord.length === 0) return 0;
  if (cleanWord.length <= 3) return 1;

  const w = cleanWord
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/i, '')
    .replace(/^y/i, '');

  const matches = w.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

export function fleschKincaidGrade(rawText: string): number {
  const plainText = stripMarkdown(rawText);
  if (!plainText.trim()) {
    return 0;
  }

  const sentences = plainText
    .split(/[.!?]+(?:\s+|$)/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  const words = plainText
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, ''))
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    return 0;
  }

  const wordCount = words.length;
  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllablesInWord(w);
  }

  const grade =
    0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;

  return Math.max(0, Math.round(grade * 10) / 10);
}

export interface VisualSlotInput {
  need: string;
  status: string;
}

export interface VisualCoverageResult {
  total: number;
  completed: number;
  essentialMissing: number;
  helpfulMissing: number;
}

export function visualCoverage(slots: VisualSlotInput[]): VisualCoverageResult {
  let completed = 0;
  let essentialMissing = 0;
  let helpfulMissing = 0;

  for (const slot of slots) {
    const isCompleted = slot.status === 'approved' || slot.status === 'uploaded';
    if (isCompleted) {
      completed++;
    } else {
      const needLower = (slot.need || '').toLowerCase();
      if (needLower === 'essential') {
        essentialMissing++;
      } else if (needLower === 'helpful') {
        helpfulMissing++;
      }
    }
  }

  return {
    total: slots.length,
    completed,
    essentialMissing,
    helpfulMissing,
  };
}

export interface PublishReadinessInput {
  moduleCount: number;
  lessonsTotal: number;
  lessonsWithContent: number;
  unresolvedCriticalFindings: number;
  openCanonicalConflicts: number;
  certification: boolean;
  objectivesUnassessed: number;
  essentialVisualsMissing: number;
  curriculumApproved: boolean;
}

export interface ReadinessCheck {
  label: string;
  ok: boolean;
  detail: string;
}

export interface PublishReadinessResult {
  blockers: string[];
  warnings: string[];
  checks: ReadinessCheck[];
}

export function publishReadiness(i: PublishReadinessInput): PublishReadinessResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const checks: ReadinessCheck[] = [];

  // Check 1: Module structure
  const hasModules = i.moduleCount > 0;
  if (!hasModules) {
    blockers.push('No modules in course');
  }
  checks.push({
    label: 'Module Structure',
    ok: hasModules,
    detail: hasModules ? `${i.moduleCount} module(s) present` : 'Course has no modules',
  });

  // Check 2: Lesson content
  const contentComplete = i.lessonsTotal > 0 && i.lessonsWithContent === i.lessonsTotal;
  if (!contentComplete) {
    blockers.push('Missing lesson content');
  }
  checks.push({
    label: 'Lesson Content',
    ok: contentComplete,
    detail: contentComplete
      ? `All ${i.lessonsTotal} lesson(s) have content`
      : `${i.lessonsTotal - i.lessonsWithContent} of ${i.lessonsTotal} lesson(s) missing content`,
  });

  // Check 3: Canonical conflicts
  const noConflicts = i.openCanonicalConflicts === 0;
  if (!noConflicts) {
    blockers.push('Unresolved canonical conflict');
  }
  checks.push({
    label: 'Canonical Conflicts',
    ok: noConflicts,
    detail: noConflicts
      ? 'No open canonical conflicts'
      : `${i.openCanonicalConflicts} open canonical conflict(s)`,
  });

  // Check 4: Critical findings
  const noCritical = i.unresolvedCriticalFindings === 0;
  if (!noCritical) {
    blockers.push('Critical unsupported claim');
  }
  checks.push({
    label: 'Critical Findings',
    ok: noCritical,
    detail: noCritical
      ? 'No unresolved critical findings'
      : `${i.unresolvedCriticalFindings} unresolved critical finding(s)`,
  });

  // Check 5: Certification objectives
  const certObjectivesOk = !i.certification || i.objectivesUnassessed === 0;
  if (!certObjectivesOk) {
    blockers.push('Certification with unassessed objectives');
  }
  checks.push({
    label: 'Objective Assessment',
    ok: certObjectivesOk,
    detail: certObjectivesOk
      ? i.certification
        ? 'All objectives assessed for certification'
        : 'Non-certification course or objectives assessed'
      : `${i.objectivesUnassessed} unassessed objective(s) for certification course`,
  });

  // Check 6: Curriculum approval
  const approved = i.curriculumApproved;
  if (!approved) {
    blockers.push('Curriculum not approved');
  }
  checks.push({
    label: 'Curriculum Approval',
    ok: approved,
    detail: approved ? 'Curriculum is approved' : 'Curriculum is not approved',
  });

  // Check 7: Essential visuals (warning)
  const visualsOk = i.essentialVisualsMissing === 0;
  if (!visualsOk) {
    warnings.push('Essential visuals missing');
  }
  checks.push({
    label: 'Essential Visuals',
    ok: visualsOk,
    detail: visualsOk
      ? 'No essential visuals missing'
      : `${i.essentialVisualsMissing} essential visual(s) missing`,
  });

  return {
    blockers,
    warnings,
    checks,
  };
}
