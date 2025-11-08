-- Add active_role column to users table to track currently selected role
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS active_role user_role;

-- Update existing users to set active_role to their current role
UPDATE public.users 
SET active_role = role 
WHERE active_role IS NULL;

-- Make active_role required going forward
ALTER TABLE public.users ALTER COLUMN active_role SET NOT NULL;

-- Create function to get user's available roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role user_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.role
  FROM public.user_roles ur
  WHERE ur.user_id = _user_id
  ORDER BY 
    CASE ur.role
      WHEN 'admin' THEN 1
      WHEN 'client' THEN 2
      WHEN 'doer' THEN 3
    END;
$$;

-- Create function to switch active role (user can only switch to roles they have)
CREATE OR REPLACE FUNCTION public.switch_user_role(_new_role user_role)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid;
  _has_role boolean;
BEGIN
  -- Get authenticated user ID
  _user_id := auth.uid();
  
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user has the role they're trying to switch to
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _new_role
  ) INTO _has_role;
  
  IF NOT _has_role THEN
    RAISE EXCEPTION 'User does not have the requested role';
  END IF;
  
  -- Update active_role in users table
  UPDATE public.users
  SET active_role = _new_role
  WHERE auth_user_id = _user_id;
  
  RETURN true;
END;
$$;

-- Update RLS policies to use active_role instead of role
-- Note: We keep the role column for backward compatibility but use active_role for access control

-- Comment: The active_role determines what the user can currently do
-- The user_roles table determines what roles they can switch to