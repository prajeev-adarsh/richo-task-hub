-- Remove the overly permissive policy we just added
DROP POLICY IF EXISTS "Authenticated users can view public profile fields" ON public.users;

-- The users table now only allows:
-- 1. Users viewing their own profile (existing policy)
-- 2. Admins viewing all users (existing policy)

-- The public_profiles view is accessible to all authenticated users
-- and only exposes safe fields (id, name, photo_url, active_role)