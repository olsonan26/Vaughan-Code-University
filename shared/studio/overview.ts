/** GET /api/studio/overview response (isomorphic). All numbers come from real database queries. */
export interface StudioOverview {
  courses: {
    id: string;
    title: string;
    coverUrl: string | null;
    status: 'draft' | 'generating' | 'in_review' | 'approved' | 'published' | 'archived';
    moduleCount: number;
    lessonCount: number;
    /** lessons with content / total lessons; null when the course has no lessons yet */
    percentComplete: number | null;
    openIssues: number;
    missingVisuals: number;
    updatedAt: string;
  }[];
  recentSources: { id: string; title: string; status: string; authority: number; createdAt: string }[];
  activeJobs: { id: string; type: string; state: string; progress: number; currentStage: string | null; courseTitle: string | null }[];
  attention: { kind: string; label: string; count: number; href: string }[];
  missingVisuals: { total: number; nextHref: string | null };
}
