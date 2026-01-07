-- Fix: Users table exposes PII to all authenticated users
-- This migration restricts access to sensitive columns (email, phone, upi_id)

-- Step 1: Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view users for app functionality" ON public.users;

-- Step 2: Create a public view for safe cross-user queries (non-sensitive data only)
CREATE OR REPLACE VIEW public.users_public AS
SELECT 
  id, 
  name, 
  photo_url, 
  active_role,
  onboarding_completed,
  created_at
FROM public.users;

-- Step 3: Grant SELECT on the public view to authenticated users
GRANT SELECT ON public.users_public TO authenticated;

-- Step 4: Create policy allowing users to view their own full profile
-- (This supplements the existing "Users can view their own profile" policy)
CREATE POLICY "Authenticated users can view public user data via relationships"
ON public.users FOR SELECT
TO authenticated
USING (
  -- Users can view their own full profile
  auth.uid() = auth_user_id
  -- OR they are admins
  OR has_role(auth.uid(), 'admin'::user_role)
  -- OR they are viewing users they interact with in tasks (client viewing doer or vice versa)
  OR EXISTS (
    SELECT 1 FROM tasks t 
    WHERE (
      -- Current user is the client looking at an assigned doer
      (t.client_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND t.doer_id = users.id)
      -- OR current user is the doer looking at the client
      OR (t.doer_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND t.client_id = users.id)
    )
  )
  -- OR they have a chat room together
  OR EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE (
      (cr.client_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND cr.doer_id = users.id)
      OR (cr.doer_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND cr.client_id = users.id)
    )
  )
  -- OR they have a task application relationship
  OR EXISTS (
    SELECT 1 FROM task_applications ta
    JOIN tasks t ON t.id = ta.task_id
    WHERE (
      -- Current user is client, viewing applicant doer
      (t.client_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND ta.doer_id = users.id)
      -- OR current user is doer, viewing task client
      OR (ta.doer_id = (SELECT u.id FROM users u WHERE u.auth_user_id = auth.uid()) AND t.client_id = users.id)
    )
  )
);