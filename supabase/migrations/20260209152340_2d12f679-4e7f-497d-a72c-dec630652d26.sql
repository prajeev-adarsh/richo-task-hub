-- Allow all authenticated users to read the users_public view (contains only non-sensitive fields)
ALTER VIEW public.users_public SET (security_invoker = on);

CREATE POLICY "Authenticated users can view public profiles"
ON public.users
FOR SELECT
USING (
  -- Own profile
  auth.uid() = auth_user_id
  -- OR admin
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Drop the old self-only policy since the new one covers it
DROP POLICY IF EXISTS "Users can view their own full profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;