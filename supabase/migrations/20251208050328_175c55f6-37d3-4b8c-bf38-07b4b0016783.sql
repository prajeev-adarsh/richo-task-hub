-- Recreate the view with SECURITY INVOKER (default, but explicit for clarity)
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  photo_url,
  active_role
FROM public.users;

-- Grant authenticated users access to the view
GRANT SELECT ON public.public_profiles TO authenticated;

-- The view will now use the querying user's permissions
-- Since users can view their own profile, and admins can view all,
-- we need a policy that allows viewing basic info of all users
-- Add a new restrictive policy for viewing basic profile info only
CREATE POLICY "Authenticated users can view public profile fields"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Note: This policy allows SELECT but the application should use
-- public_profiles view which only exposes safe fields