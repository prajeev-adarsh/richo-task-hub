-- Fix chat-attachments storage policy to only allow room participants
-- First drop the overly permissive policy
DROP POLICY IF EXISTS "Room participants can view attachments" ON storage.objects;

-- Create a more restrictive policy that checks room membership
-- Files should be stored with folder structure: {room_id}/{filename}
CREATE POLICY "Room participants can view chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IN (
    SELECT u.auth_user_id 
    FROM public.users u
    JOIN public.chat_rooms cr ON (u.id = cr.client_id OR u.id = cr.doer_id)
    WHERE cr.id::text = (storage.foldername(name))[1]
  )
);

-- Also fix the upload policy to ensure proper structure
DROP POLICY IF EXISTS "Room participants can upload attachments" ON storage.objects;

CREATE POLICY "Room participants can upload chat attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  auth.uid() IN (
    SELECT u.auth_user_id 
    FROM public.users u
    JOIN public.chat_rooms cr ON (u.id = cr.client_id OR u.id = cr.doer_id)
    WHERE cr.id::text = (storage.foldername(name))[1]
  )
);

-- Add delete policy for participants to manage their uploads
DROP POLICY IF EXISTS "Room participants can delete attachments" ON storage.objects;

CREATE POLICY "Room participants can delete chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments' AND
  auth.uid() IN (
    SELECT u.auth_user_id 
    FROM public.users u
    JOIN public.chat_rooms cr ON (u.id = cr.client_id OR u.id = cr.doer_id)
    WHERE cr.id::text = (storage.foldername(name))[1]
  )
);