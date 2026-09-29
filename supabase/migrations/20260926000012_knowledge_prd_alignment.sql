-- Aligns the Knowledge Vault schema with Master PRD sections 12-19.
ALTER TYPE public.source_processing_state ADD VALUE IF NOT EXISTS 'uploaded';
ALTER TYPE public.source_processing_state ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE public.source_processing_state ADD VALUE IF NOT EXISTS 'indexing';
ALTER TYPE public.source_processing_state ADD VALUE IF NOT EXISTS 'needs_review';

ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'prerequisite_of';
ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'related_to';
ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'contrasts_with';
ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'supports';
ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'derived_from';
ALTER TYPE public.concept_relationship_type ADD VALUE IF NOT EXISTS 'contradicts';

-- Source record fields (PRD §13)
ALTER TABLE public.knowledge_sources
  ADD COLUMN IF NOT EXISTS checksum_sha256 text,
  ADD COLUMN IF NOT EXISTS page_count int,
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS publication_date date,
  ADD COLUMN IF NOT EXISTS source_version_label text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS concept_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chunk_count int NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS knowledge_sources_checksum_uniq
  ON public.knowledge_sources (organization_id, created_by, checksum_sha256)
  WHERE checksum_sha256 IS NOT NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS knowledge_sources_state_idx ON public.knowledge_sources (organization_id, processing_state);

-- Chunk location for citations (PRD §33)
ALTER TABLE public.source_chunks
  ADD COLUMN IF NOT EXISTS page_number int,
  ADD COLUMN IF NOT EXISTS section_title text;
CREATE UNIQUE INDEX IF NOT EXISTS source_chunks_source_idx_uniq ON public.source_chunks (source_id, chunk_index);

-- Concept fields (PRD §18)
ALTER TABLE public.concepts
  ADD COLUMN IF NOT EXISTS short_definition text,
  ADD COLUMN IF NOT EXISTS extended_explanation text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS formula text,
  ADD COLUMN IF NOT EXISTS examples jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS is_official_methodology boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS uncertainty text,
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'unreviewed'
    CHECK (review_status IN ('unreviewed','approved','rejected','needs_review')),
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'ai' CHECK (origin IN ('ai','human')),
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by_source_id uuid REFERENCES public.knowledge_sources(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS concepts_org_owner_name_uniq
  ON public.concepts (organization_id, created_by, lower(name)) WHERE archived_at IS NULL;

-- Evidence per concept/source (exact chunk + quote)
ALTER TABLE public.concept_sources
  ADD COLUMN IF NOT EXISTS chunk_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS quote text,
  ADD COLUMN IF NOT EXISTS page_number int;

-- Conflict records (PRD §16)
ALTER TABLE public.source_conflicts
  ADD COLUMN IF NOT EXISTS statement_a text,
  ADD COLUMN IF NOT EXISTS statement_b text,
  ADD COLUMN IF NOT EXISTS chunk_a_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS chunk_b_id uuid REFERENCES public.source_chunks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS recommended_treatment text;

CREATE UNIQUE INDEX IF NOT EXISTS concept_relationships_uniq
  ON public.concept_relationships (concept_id, related_concept_id, relationship_type);
CREATE UNIQUE INDEX IF NOT EXISTS concept_locks_concept_uniq ON public.concept_locks (concept_id);
