-- Drop the overly permissive policy that exposes all user data
DROP POLICY IF EXISTS "Require authentication to view users" ON public.users;

-- Create a public_profiles view with only non-sensitive fields
-- This allows other users to see names/photos without exposing PII
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  id,
  name,
  photo_url,
  active_role
FROM public.users;

-- Grant authenticated users access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- Add comment explaining the security purpose
COMMENT ON VIEW public.public_profiles IS 'Public-safe user profile data. Use this view instead of users table when displaying other users info.';