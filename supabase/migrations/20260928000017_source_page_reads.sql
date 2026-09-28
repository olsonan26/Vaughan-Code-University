-- 0017: Kate "eyes". Image/visual pages of PDFs (and uploaded images) are read by two
-- independent vision models. A reading is NEVER used as knowledge until an instructor
-- verifies it (status = 'verified'). Originals are never modified; rendered page images
-- are stored alongside the source in the knowledge-sources bucket.

CREATE TABLE IF NOT EXISTS public.source_page_reads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  source_id       uuid NOT NULL REFERENCES public.knowledge_sources(id) ON DELETE CASCADE,
  page_number     integer NOT NULL CHECK (page_number >= 1),
  reason          text NOT NULL DEFAULT 'image',            -- why vision was needed: image | low_text | graphics | image_file
  image_path      text,                                     -- rendered PNG in storage
  primary_model   text,
  primary_result  jsonb,                                    -- { text, visuals[], uncertain[] }
  check_model     text,
  check_result    jsonb,
  agreement       numeric(4,3),                             -- 0..1 similarity of the two readings
  differences     jsonb NOT NULL DEFAULT '[]'::jsonb,       -- tokens/numbers that differ
  status          text NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','agreed','needs_review','verified','excluded','error')),
  final_text      text,                                     -- text the instructor approved (editable)
  included_in_knowledge boolean NOT NULL DEFAULT false,     -- true once chunked into source_chunks
  error           text,
  verified_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, page_number)
);
CREATE INDEX IF NOT EXISTS source_page_reads_source_idx ON public.source_page_reads (source_id, status);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.source_page_reads;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.source_page_reads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Same visibility as the parent source (reads go through the knowledge_sources SELECT policy).
ALTER TABLE public.source_page_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spr_select" ON public.source_page_reads;
CREATE POLICY "spr_select" ON public.source_page_reads FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.knowledge_sources s WHERE s.id = source_id));
-- Writes happen only through the API (service role) after permission checks.

-- Allow images and caption files in the knowledge bucket.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf','text/plain','text/markdown','text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword',
  'image/png','image/jpeg','image/webp','text/vtt','application/x-subrip'
]
WHERE id = 'knowledge-sources';
