-- Fix public_profiles view issue by converting to a security definer function approach
-- First drop the view
DROP VIEW IF EXISTS public.public_profiles;

-- Create a security definer function to get public profile info (only for authenticated users)
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  photo_url text,
  active_role user_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.name, u.photo_url, u.active_role
  FROM public.users u
  WHERE u.id = _user_id
  AND auth.uid() IS NOT NULL
$$;

-- Create a function to get multiple public profiles (for lists)
CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE (
  id uuid,
  name text,
  photo_url text,
  active_role user_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id, u.name, u.photo_url, u.active_role
  FROM public.users u
  WHERE u.id = ANY(_user_ids)
  AND auth.uid() IS NOT NULL
$$;