-- 20260926000002_knowledge.sql
-- Knowledge Vault Tables and Enums

DO $$ BEGIN
  CREATE TYPE public.source_processing_state AS ENUM (
    'pending',
    'extracting',
    'extracted',
    'chunking',
    'chunked',
    'analyzing',
    'analyzed',
    'failed',
    'ready'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.knowledge_visibility AS ENUM (
    'private',
    'course_team',
    'organization',
    'canonical_shared'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.concept_relationship_type AS ENUM (
    'prerequisite',
    'extends',
    'contrasts',
    'related',
    'part_of',
    'example_of'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.conflict_status AS ENUM (
    'open',
    'resolved',
    'ignored'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Knowledge Sources
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  original_filename text,
  file_path text,
  file_size_bytes bigint,
  mime_type text,
  url text,
  raw_content text,
  processing_state public.source_processing_state NOT NULL DEFAULT 'pending',
  processing_error text,
  authority_level int NOT NULL DEFAULT 1 CHECK (authority_level >= 1 AND authority_level <= 5),
  visibility public.knowledge_visibility NOT NULL DEFAULT 'private',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Source Versions
CREATE TABLE IF NOT EXISTS public.source_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  title text,
  raw_content text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Source Chunks
CREATE TABLE IF NOT EXISTS public.source_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  token_count int,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  embedding vector(1536),
  fts tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Source Collections
CREATE TABLE IF NOT EXISTS public.source_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  visibility public.knowledge_visibility NOT NULL DEFAULT 'private',
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Source Collection Members
CREATE TABLE IF NOT EXISTS public.source_collection_members (
  collection_id uuid REFERENCES public.source_collections(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, source_id)
);

-- Concepts
CREATE TABLE IF NOT EXISTS public.concepts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text,
  summary text,
  description text,
  domain text,
  authority_level int NOT NULL DEFAULT 1 CHECK (authority_level >= 1 AND authority_level <= 5),
  visibility public.knowledge_visibility NOT NULL DEFAULT 'private',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  version int NOT NULL DEFAULT 1,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

-- Concept Versions
CREATE TABLE IF NOT EXISTS public.concept_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  name text,
  summary text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Concept Sources
CREATE TABLE IF NOT EXISTS public.concept_sources (
  concept_id uuid REFERENCES public.concepts(id) ON DELETE CASCADE,
  source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  relevance_score numeric(3,2),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (concept_id, source_id)
);

-- Concept Relationships
CREATE TABLE IF NOT EXISTS public.concept_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  related_concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  relationship_type public.concept_relationship_type NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Concept Locks
CREATE TABLE IF NOT EXISTS public.concept_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  concept_id uuid NOT NULL REFERENCES public.concepts(id) ON DELETE CASCADE,
  locked_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  reason text,
  lock_level text NOT NULL DEFAULT 'canonical'
);

-- Source Conflicts
CREATE TABLE IF NOT EXISTS public.source_conflicts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_a_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  source_b_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL,
  concept_id uuid REFERENCES public.concepts(id) ON DELETE SET NULL,
  description text NOT NULL,
  status public.conflict_status NOT NULL DEFAULT 'open',
  resolution_notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Knowledge domain
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_org_vis ON public.knowledge_sources (organization_id, visibility, authority_level);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_creator ON public.knowledge_sources (created_by);
CREATE INDEX IF NOT EXISTS idx_source_chunks_source ON public.source_chunks (source_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_source_chunks_fts ON public.source_chunks USING gin (fts);
CREATE INDEX IF NOT EXISTS idx_source_chunks_embedding ON public.source_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_concepts_org_vis ON public.concepts (organization_id, visibility, authority_level);
CREATE INDEX IF NOT EXISTS idx_concept_locks_concept ON public.concept_locks (concept_id);
