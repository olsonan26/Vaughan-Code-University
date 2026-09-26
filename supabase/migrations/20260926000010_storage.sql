-- 20260926000010_storage.sql
-- Storage Buckets and Objects RLS Policies

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'knowledge-sources',
    'knowledge-sources',
    false,
    52428800,
    ARRAY[
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/csv'
    ]
  ),
  (
    'course-media',
    'course-media',
    false,
    15728640,
    ARRAY[
      'image/png',
      'image/jpeg',
      'image/webp',
      'image/gif'
    ]
  )
ON CONFLICT (id) DO NOTHING;

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_media_select_policy" ON storage.objects;
CREATE POLICY "course_media_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'course-media'
  AND public.has_permission(((storage.foldername(name))[1])::uuid, 'studio.access')
);

DROP POLICY IF EXISTS "knowledge_sources_select_policy" ON storage.objects;
CREATE POLICY "knowledge_sources_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-sources'
  AND (
    EXISTS (
      SELECT 1 FROM public.knowledge_sources ks
      WHERE ks.id = ((storage.foldername(name))[2])::uuid
        AND ks.created_by = auth.uid()
    )
    OR public.has_permission(((storage.foldername(name))[1])::uuid, 'knowledge.manage_all')
  )
);
