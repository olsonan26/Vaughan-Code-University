-- 20260926000005_visuals.sql
-- Visual Identities, Slots, Prompts, and Assets

DO $$ BEGIN
  CREATE TYPE public.visual_necessity AS ENUM (
    'essential',
    'helpful',
    'decorative',
    'none'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visual_purpose AS ENUM (
    'concept_illustration',
    'diagram',
    'infographic',
    'screenshot_mock',
    'header',
    'summary_card'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visual_quality AS ENUM (
    'standard',
    'premium',
    'signature'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visual_render_mode AS ENUM (
    'chatgpt_image',
    'programmatic_diagram'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.visual_slot_status AS ENUM (
    'missing',
    'prompt_ready',
    'uploaded',
    'needs_revision',
    'approved'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Visual Identities
CREATE TABLE IF NOT EXISTS public.visual_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  palette jsonb NOT NULL DEFAULT '{"primary": "#1E3A8A", "secondary": "#3B82F6", "accent": "#F59E0B", "background": "#F8FAFC", "surface": "#FFFFFF", "text": "#0F172A"}'::jsonb,
  typography jsonb NOT NULL DEFAULT '{"fontFamily": "Inter, sans-serif", "headingFont": "Cal Sans, Inter, sans-serif"}'::jsonb,
  layout_style text DEFAULT 'modern_clean',
  tone text DEFAULT 'authoritative_accessible',
  default_aspect_ratio text NOT NULL DEFAULT '16:9',
  logo_url text,
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Visual Slots
CREATE TABLE IF NOT EXISTS public.visual_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  lesson_section_id uuid REFERENCES public.lesson_sections(id) ON DELETE SET NULL,
  necessity public.visual_necessity NOT NULL DEFAULT 'helpful',
  purpose public.visual_purpose NOT NULL DEFAULT 'concept_illustration',
  type text,
  quality public.visual_quality NOT NULL DEFAULT 'standard',
  render_mode public.visual_render_mode NOT NULL DEFAULT 'chatgpt_image',
  aspect_ratio text NOT NULL DEFAULT '16:9',
  order_in_section int NOT NULL DEFAULT 0,
  status public.visual_slot_status NOT NULL DEFAULT 'missing',
  version int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Visual Prompts
CREATE TABLE IF NOT EXISTS public.visual_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.visual_slots(id) ON DELETE CASCADE,
  brief jsonb NOT NULL DEFAULT '{}'::jsonb,
  prompt_text text NOT NULL,
  prompt_version text NOT NULL DEFAULT 'visual-director-v1',
  model text,
  revision_instruction text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_current boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Visual Assets
CREATE TABLE IF NOT EXISTS public.visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  slot_id uuid NOT NULL REFERENCES public.visual_slots(id) ON DELETE CASCADE,
  prompt_id uuid REFERENCES public.visual_prompts(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  module_id uuid REFERENCES public.modules(id) ON DELETE SET NULL,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  storage_bucket text NOT NULL DEFAULT 'course-media',
  storage_path text NOT NULL,
  public_url text,
  mime_type text NOT NULL,
  file_size_bytes bigint,
  width int,
  height int,
  sha256 text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  replaced_by_id uuid REFERENCES public.visual_assets(id) ON DELETE SET NULL,
  superseded_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for Visuals domain
CREATE INDEX IF NOT EXISTS idx_visual_identities_course ON public.visual_identities (course_id);
CREATE INDEX IF NOT EXISTS idx_visual_slots_course_lesson ON public.visual_slots (course_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_visual_slots_section ON public.visual_slots (lesson_section_id);
CREATE INDEX IF NOT EXISTS idx_visual_prompts_slot ON public.visual_prompts (slot_id, is_current);
CREATE INDEX IF NOT EXISTS idx_visual_assets_slot ON public.visual_assets (slot_id);
