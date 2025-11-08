-- Populate user_roles table for existing users who don't have entries
-- This ensures all existing users have at least their current role in user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT auth_user_id, role
FROM public.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles
  WHERE user_id = users.auth_user_id
);

-- Update get_user_role function to use active_role from users table
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT active_role
  FROM public.users
  WHERE auth_user_id = _user_id
  LIMIT 1
$$;