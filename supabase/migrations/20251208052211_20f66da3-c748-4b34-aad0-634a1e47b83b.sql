-- Fix 1: Remove overly permissive users SELECT policy
-- Drop the policy that allows any authenticated user to view all users
DROP POLICY IF EXISTS "Authenticated users can view users for app functionality" ON public.users;

-- The remaining policies are sufficient:
-- - "Users can view their own profile" (auth.uid() = auth_user_id)
-- - "Admins can view all users" (has_role check)
-- Application code should use public_profiles view for other user lookups

-- Fix 2: Remove overly permissive notifications INSERT policy
-- Drop the policy that allows any user to insert notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Notifications are created by SECURITY DEFINER triggers (notify_new_application, 
-- notify_task_assignment, etc.) which bypass RLS, so no INSERT policy is needed.
-- This prevents users from creating fake notifications for phishing/spam.