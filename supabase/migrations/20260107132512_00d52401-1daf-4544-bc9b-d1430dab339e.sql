-- Fix the security definer view issue by explicitly setting SECURITY INVOKER
-- This ensures the view respects the RLS policies of the querying user

-- Drop and recreate the view with proper security settings
DROP VIEW IF EXISTS public.users_public;

CREATE VIEW public.users_public 
WITH (security_invoker = true)
AS
SELECT 
  id, 
  name, 
  photo_url, 
  active_role,
  onboarding_completed,
  created_at
FROM public.users;

-- Re-grant SELECT on the public view to authenticated users
GRANT SELECT ON public.users_public TO authenticated;