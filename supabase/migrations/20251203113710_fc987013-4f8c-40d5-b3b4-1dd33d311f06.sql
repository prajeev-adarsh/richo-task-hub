-- Make proofs storage bucket private and update policies
UPDATE storage.buckets 
SET public = false 
WHERE id = 'proofs';

-- Drop existing policies on proofs bucket
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Proofs are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view proofs" ON storage.objects;

-- Create proper RLS policies for proofs bucket
-- Task participants can view proofs (client or assigned doer)
CREATE POLICY "Task participants can view proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proofs' AND
  (
    -- Doer can view their own proofs
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Check if user is client or doer for this task's proof
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id::text = (storage.foldername(name))[2]
      AND (t.client_id::text = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid())
           OR t.doer_id::text = (SELECT id::text FROM public.users WHERE auth_user_id = auth.uid()))
    )
    OR
    -- Admins can view all proofs
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_user_id = auth.uid() AND u.active_role = 'admin'
    )
  )
);

-- Doers can upload proofs for their assigned tasks
CREATE POLICY "Doers can upload proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Doers can update their own proofs
CREATE POLICY "Doers can update their own proofs"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Doers can delete their own proofs
CREATE POLICY "Doers can delete their own proofs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'proofs' AND
  auth.uid()::text = (storage.foldername(name))[1]
);