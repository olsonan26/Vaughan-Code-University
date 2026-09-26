/**
 * Vaughan Code University - Database Types & Schema Definitions
 * Auto-generated type definitions mirroring Supabase public schema migrations.
 */

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

// Enums & Const Arrays

export const APP_ROLE_VALUES = [
  'student',
  'moderator',
  'instructor',
  'senior_instructor',
  'admin',
  'headmaster',
] as const;
export type AppRole = (typeof APP_ROLE_VALUES)[number];

export const SOURCE_PROCESSING_STATE_VALUES = [
  'pending',
  'extracting',
  'extracted',
  'chunking',
  'chunked',
  'analyzing',
  'analyzed',
  'failed',
  'ready',
] as const;
export type SourceProcessingState = (typeof SOURCE_PROCESSING_STATE_VALUES)[number];

export const KNOWLEDGE_VISIBILITY_VALUES = [
  'private',
  'course_team',
  'organization',
  'canonical_shared',
] as const;
export type KnowledgeVisibility = (typeof KNOWLEDGE_VISIBILITY_VALUES)[number];

export const CONCEPT_RELATIONSHIP_TYPE_VALUES = [
  'prerequisite',
  'extends',
  'contrasts',
  'related',
  'part_of',
  'example_of',
] as const;
export type ConceptRelationshipType = (typeof CONCEPT_RELATIONSHIP_TYPE_VALUES)[number];

export const CONFLICT_STATUS_VALUES = ['open', 'resolved', 'ignored'] as const;
export type ConflictStatus = (typeof CONFLICT_STATUS_VALUES)[number];

export const COURSE_STATE_VALUES = [
  'draft',
  'generating',
  'in_review',
  'approved',
  'published',
  'archived',
] as const;
export type CourseState = (typeof COURSE_STATE_VALUES)[number];

export const LESSON_TYPE_VALUES = ['video', 'audio', 'pdf', 'quiz', 'article'] as const;
export type LessonType = (typeof LESSON_TYPE_VALUES)[number];

export const SECTION_PROVENANCE_VALUES = [
  'ai_generated',
  'human_written',
  'ai_edited',
] as const;
export type SectionProvenance = (typeof SECTION_PROVENANCE_VALUES)[number];

export const QUESTION_TYPE_VALUES = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'short_answer',
  'code_prompt',
] as const;
export type QuestionType = (typeof QUESTION_TYPE_VALUES)[number];

export const VISUAL_NECESSITY_VALUES = [
  'essential',
  'helpful',
  'decorative',
  'none',
] as const;
export type VisualNecessity = (typeof VISUAL_NECESSITY_VALUES)[number];

export const VISUAL_PURPOSE_VALUES = [
  'concept_illustration',
  'diagram',
  'infographic',
  'screenshot_mock',
  'header',
  'summary_card',
] as const;
export type VisualPurpose = (typeof VISUAL_PURPOSE_VALUES)[number];

export const VISUAL_QUALITY_VALUES = ['standard', 'premium', 'signature'] as const;
export type VisualQuality = (typeof VISUAL_QUALITY_VALUES)[number];

export const VISUAL_RENDER_MODE_VALUES = [
  'chatgpt_image',
  'programmatic_diagram',
] as const;
export type VisualRenderMode = (typeof VISUAL_RENDER_MODE_VALUES)[number];

export const VISUAL_SLOT_STATUS_VALUES = [
  'missing',
  'prompt_ready',
  'uploaded',
  'needs_revision',
  'approved',
] as const;
export type VisualSlotStatus = (typeof VISUAL_SLOT_STATUS_VALUES)[number];

export const FINDING_SEVERITY_VALUES = ['critical', 'warning', 'suggestion'] as const;
export type FindingSeverity = (typeof FINDING_SEVERITY_VALUES)[number];

export const FINDING_STATUS_VALUES = [
  'open',
  'accepted',
  'fixed',
  'ignored',
  'false_positive',
] as const;
export type FindingStatus = (typeof FINDING_STATUS_VALUES)[number];

export const CHANGE_SET_STATUS_VALUES = [
  'proposed',
  'applied',
  'rejected',
  'partially_applied',
] as const;
export type ChangeSetStatus = (typeof CHANGE_SET_STATUS_VALUES)[number];

export const JOB_STATE_VALUES = [
  'queued',
  'running',
  'paused',
  'retrying',
  'completed',
  'failed',
  'cancelled',
] as const;
export type JobState = (typeof JOB_STATE_VALUES)[number];

export const JOB_STEP_STATE_VALUES = [
  'pending',
  'running',
  'completed',
  'failed',
  'skipped',
  'cancelled',
] as const;
export type JobStepState = (typeof JOB_STEP_STATE_VALUES)[number];

// Table Row Interfaces

export interface OrganizationRow {
  id: string;
  slug: string;
  name: string;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  legacy_user_id: string | null;
  xp: number;
  level: number;
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMemberRow {
  organization_id: string;
  user_id: string;
  created_at: string;
}

export interface UserRoleRow {
  id: string;
  user_id: string;
  organization_id: string;
  role: AppRole;
  granted_by: string | null;
  created_at: string;
}

export interface RolePermissionRow {
  role: AppRole;
  permission: string;
}

export interface ActivityLogRow {
  id: string;
  organization_id: string | null;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  created_at: string;
}

export interface AppSettingRow {
  organization_id: string;
  key: string;
  value: Json;
  updated_by: string | null;
  updated_at: string;
}

export interface RateLimitRow {
  key: string;
  window_start: string;
  count: number;
}

export interface KnowledgeSourceRow {
  id: string;
  organization_id: string;
  title: string;
  type: string;
  original_filename: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  url: string | null;
  raw_content: string | null;
  processing_state: SourceProcessingState;
  processing_error: string | null;
  authority_level: number;
  visibility: KnowledgeVisibility;
  metadata: Json;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface SourceVersionRow {
  id: string;
  source_id: string;
  version_number: number;
  title: string | null;
  raw_content: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
}

export interface SourceChunkRow {
  id: string;
  organization_id: string;
  source_id: string;
  chunk_index: number;
  content: string;
  token_count: number | null;
  metadata: Json;
  embedding: number[] | string | null;
  fts?: string | null;
  created_at: string;
}

export interface SourceCollectionRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  visibility: KnowledgeVisibility;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface SourceCollectionMemberRow {
  collection_id: string;
  source_id: string;
  added_at: string;
}

export interface ConceptRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string | null;
  summary: string | null;
  description: string | null;
  domain: string | null;
  authority_level: number;
  visibility: KnowledgeVisibility;
  metadata: Json;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface ConceptVersionRow {
  id: string;
  concept_id: string;
  version_number: number;
  name: string | null;
  summary: string | null;
  description: string | null;
  metadata: Json;
  created_by: string | null;
  created_at: string;
}

export interface ConceptSourceRow {
  concept_id: string;
  source_id: string;
  relevance_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface ConceptRelationshipRow {
  id: string;
  concept_id: string;
  related_concept_id: string;
  relationship_type: ConceptRelationshipType;
  metadata: Json;
  created_at: string;
}

export interface ConceptLockRow {
  id: string;
  organization_id: string;
  concept_id: string;
  locked_by: string;
  locked_at: string;
  reason: string | null;
  lock_level: string;
}

export interface SourceConflictRow {
  id: string;
  organization_id: string;
  source_a_id: string | null;
  source_b_id: string | null;
  concept_id: string | null;
  description: string;
  status: ConflictStatus;
  resolution_notes: string | null;
  created_by: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseRow {
  id: string;
  organization_id: string;
  title: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  thumbnail_url: string | null;
  badge: string | null;
  category: string | null;
  legacy_id: string | null;
  state: CourseState;
  target_audience: string | null;
  learning_outcome: string | null;
  level: string | null;
  type: string | null;
  length: string | null;
  reading_level: string | null;
  style: string | null;
  difficulty: string | null;
  visual_density: string | null;
  source_mode: string | null;
  settings: Json;
  current_version_id: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface CourseVersionRow {
  id: string;
  course_id: string;
  version_number: number;
  parent_version_id: string | null;
  status: string;
  blueprint: Json;
  created_by: string | null;
  created_at: string;
}

export interface CourseCollaboratorRow {
  course_id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export interface CourseSourceRow {
  course_id: string;
  source_id: string;
  is_primary: boolean;
  added_at: string;
}

export interface CourseConceptRow {
  course_id: string;
  concept_id: string;
  added_at: string;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  course_version_id: string | null;
  title: string;
  description: string | null;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleVersionRow {
  id: string;
  module_id: string;
  version_number: number;
  title: string | null;
  description: string | null;
  created_at: string;
}

export interface LessonRow {
  id: string;
  course_id: string;
  module_id: string;
  title: string;
  slug: string | null;
  description: string | null;
  type: LessonType;
  duration_minutes: number;
  xp_reward: number;
  position: number;
  objectives: string[];
  version: number;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

export interface LessonVersionRow {
  id: string;
  lesson_id: string;
  version_number: number;
  title: string | null;
  description: string | null;
  type: LessonType | null;
  duration_minutes: number | null;
  xp_reward: number | null;
  objectives: string[] | null;
  created_at: string;
}

export interface LessonSectionRow {
  id: string;
  lesson_id: string;
  kind: string;
  heading: string | null;
  body_markdown: string | null;
  position: number;
  provenance: SectionProvenance;
  approved: boolean;
  source_refs: Json;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface LearningObjectiveRow {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  objective: string;
  position: number;
  bloom_level: string | null;
  created_at: string;
}

export interface AssessmentRow {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  passing_score_percentage: number;
  xp_reward: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionRow {
  id: string;
  assessment_id: string;
  question_type: QuestionType;
  question: string;
  options: Json;
  correct_answer: Json;
  explanation: string | null;
  rationale: string | null;
  difficulty: string;
  position: number;
  concept_ref_id: string | null;
  lesson_id: string | null;
  source_ref_id: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionObjectiveRow {
  question_id: string;
  objective_id: string;
}

export interface FlashcardSetRow {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardRow {
  id: string;
  set_id: string;
  front: string;
  back: string;
  hint: string | null;
  position: number;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorksheetRow {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  description: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface WorksheetSectionRow {
  id: string;
  worksheet_id: string;
  heading: string;
  instructions: string | null;
  content_markdown: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface VisualIdentityRow {
  id: string;
  organization_id: string;
  course_id: string | null;
  palette: Json;
  typography: Json;
  layout_style: string | null;
  tone: string | null;
  default_aspect_ratio: string;
  logo_url: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface VisualSlotRow {
  id: string;
  organization_id: string;
  course_id: string;
  lesson_id: string;
  lesson_section_id: string | null;
  necessity: VisualNecessity;
  purpose: VisualPurpose;
  type: string | null;
  quality: VisualQuality;
  render_mode: VisualRenderMode;
  aspect_ratio: string;
  order_in_section: number;
  status: VisualSlotStatus;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface VisualPromptRow {
  id: string;
  slot_id: string;
  brief: Json;
  prompt_text: string;
  prompt_version: string;
  model: string | null;
  revision_instruction: string | null;
  created_by: string | null;
  is_current: boolean;
  created_at: string;
}

export interface VisualAssetRow {
  id: string;
  organization_id: string;
  slot_id: string;
  prompt_id: string | null;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  storage_bucket: string;
  storage_path: string;
  public_url: string | null;
  mime_type: string;
  file_size_bytes: number | null;
  width: number | null;
  height: number | null;
  sha256: string | null;
  metadata: Json;
  replaced_by_id: string | null;
  superseded_at: string | null;
  created_by: string | null;
  created_at: string;
}

export interface QualityAuditRow {
  id: string;
  organization_id: string;
  course_id: string;
  course_version_id: string | null;
  audited_by: string | null;
  overall_score: number | null;
  status: string;
  summary: string | null;
  created_at: string;
}

export interface QualityFindingRow {
  id: string;
  audit_id: string;
  category: string;
  severity: FindingSeverity;
  status: FindingStatus;
  claim: string | null;
  evidence_refs: Json;
  suggested_fix: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeSetRow {
  id: string;
  organization_id: string;
  course_id: string;
  title: string;
  description: string | null;
  status: ChangeSetStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChangeSetItemRow {
  id: string;
  change_set_id: string;
  entity_type: string;
  entity_id: string;
  before_snapshot: Json | null;
  after_snapshot: Json | null;
  status: string;
  applied_at: string | null;
}

export interface PublicationRecordRow {
  id: string;
  organization_id: string;
  course_id: string;
  course_version_id: string;
  version_label: string;
  published_by: string | null;
  published_at: string;
  notes: string | null;
}

export interface PublishedCourseRow {
  id: string;
  organization_id: string;
  course_id: string;
  course_version_id: string;
  version_label: string;
  snapshot: Json;
  published_by: string | null;
  published_at: string;
  is_current: boolean;
}

export interface EnrollmentRow {
  id: string;
  organization_id: string;
  user_id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
}

export interface LessonProgressRow {
  id: string;
  organization_id: string;
  user_id: string;
  course_id: string;
  lesson_id: string;
  status: string;
  last_accessed_at: string;
  completed_at: string | null;
}

export interface AssessmentAttemptRow {
  id: string;
  organization_id: string;
  user_id: string;
  assessment_id: string;
  score_percentage: number | null;
  passed: boolean | null;
  answers: Json;
  started_at: string;
  completed_at: string | null;
}

export interface InstructorNoteRow {
  id: string;
  organization_id: string;
  author_id: string;
  entity_type: string;
  entity_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface ArtifactConceptRefRow {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  concept_id: string;
  created_at: string;
}

export interface GenerationJobRow {
  id: string;
  organization_id: string;
  created_by: string | null;
  type: string;
  state: JobState;
  course_id: string | null;
  module_id: string | null;
  lesson_id: string | null;
  source_id: string | null;
  progress: number;
  current_stage: string | null;
  idempotency_key: string | null;
  input: Json;
  result: Json;
  error: string | null;
  attempt_count: number;
  max_attempts: number;
  model: string | null;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationJobStepRow {
  id: string;
  job_id: string;
  seq: number;
  key: string;
  label: string | null;
  state: JobStepState;
  attempt_count: number;
  max_attempts: number;
  depends_on: string[];
  locked_at: string | null;
  locked_by: string | null;
  next_attempt_at: string;
  input: Json;
  output: Json;
  error: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AiRequestRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  job_id: string | null;
  job_step_id: string | null;
  skill: string | null;
  prompt_version: string | null;
  provider: string | null;
  model: string | null;
  tier: string | null;
  status: string | null;
  error: string | null;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  latency_ms: number;
  estimated_cost_usd: number;
  course_id: string | null;
  lesson_id: string | null;
  metadata: Json;
  created_at: string;
}

// Database Tables Map

export interface Tables {
  organizations: OrganizationRow;
  profiles: ProfileRow;
  organization_members: OrganizationMemberRow;
  user_roles: UserRoleRow;
  role_permissions: RolePermissionRow;
  activity_log: ActivityLogRow;
  app_settings: AppSettingRow;
  rate_limits: RateLimitRow;
  knowledge_sources: KnowledgeSourceRow;
  source_versions: SourceVersionRow;
  source_chunks: SourceChunkRow;
  source_collections: SourceCollectionRow;
  source_collection_members: SourceCollectionMemberRow;
  concepts: ConceptRow;
  concept_versions: ConceptVersionRow;
  concept_sources: ConceptSourceRow;
  concept_relationships: ConceptRelationshipRow;
  concept_locks: ConceptLockRow;
  source_conflicts: SourceConflictRow;
  courses: CourseRow;
  course_versions: CourseVersionRow;
  course_collaborators: CourseCollaboratorRow;
  course_sources: CourseSourceRow;
  course_concepts: CourseConceptRow;
  modules: ModuleRow;
  module_versions: ModuleVersionRow;
  lessons: LessonRow;
  lesson_versions: LessonVersionRow;
  lesson_sections: LessonSectionRow;
  learning_objectives: LearningObjectiveRow;
  assessments: AssessmentRow;
  assessment_questions: AssessmentQuestionRow;
  question_objectives: QuestionObjectiveRow;
  flashcard_sets: FlashcardSetRow;
  flashcards: FlashcardRow;
  worksheets: WorksheetRow;
  worksheet_sections: WorksheetSectionRow;
  visual_identities: VisualIdentityRow;
  visual_slots: VisualSlotRow;
  visual_prompts: VisualPromptRow;
  visual_assets: VisualAssetRow;
  quality_audits: QualityAuditRow;
  quality_findings: QualityFindingRow;
  change_sets: ChangeSetRow;
  change_set_items: ChangeSetItemRow;
  publication_records: PublicationRecordRow;
  published_courses: PublishedCourseRow;
  enrollments: EnrollmentRow;
  lesson_progress: LessonProgressRow;
  assessment_attempts: AssessmentAttemptRow;
  instructor_notes: InstructorNoteRow;
  artifact_concept_refs: ArtifactConceptRefRow;
  generation_jobs: GenerationJobRow;
  generation_job_steps: GenerationJobStepRow;
  ai_requests: AiRequestRow;
}

export type TableName = keyof Tables;
