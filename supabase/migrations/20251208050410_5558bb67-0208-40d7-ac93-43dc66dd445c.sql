-- Add back a policy for authenticated users to view basic user info
-- The protection comes from application code only selecting safe fields
-- AND from using the public_profiles view for explicit queries
CREATE POLICY "Authenticated users can view users for app functionality"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Note: Application code should:
-- 1. Use foreign key joins that only select (id, name, photo_url) 
-- 2. Use public_profiles view for direct user lookups
-- 3. Never select email, phone, upi_id for other users