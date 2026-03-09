-- Fix portfolio storage INSERT policy to enforce folder ownership
DROP POLICY IF EXISTS "Authenticated users can upload portfolio images" ON storage.objects;

CREATE POLICY "Users can upload to their own portfolio folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'portfolio'
  AND auth.uid()::text = (storage.foldername(name))[1]
);