-- Create the knowledge-files bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Create policies for knowledge-files bucket
DROP POLICY IF EXISTS "Allow users to upload knowledge files" ON storage.objects;
CREATE POLICY "Allow users to upload knowledge files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to read own knowledge files" ON storage.objects;
CREATE POLICY "Allow users to read own knowledge files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'knowledge-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to update own knowledge files" ON storage.objects;
CREATE POLICY "Allow users to update own knowledge files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'knowledge-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Allow users to delete own knowledge files" ON storage.objects;
CREATE POLICY "Allow users to delete own knowledge files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'knowledge-files' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
