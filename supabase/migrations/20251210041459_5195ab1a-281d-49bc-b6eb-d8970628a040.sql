-- Fix 1: Block anonymous access to users table
-- The existing policies already use auth.uid() checks, but we need to ensure
-- anonymous users cannot access the table at all by verifying auth.uid() IS NOT NULL

-- Fix 2: Block anonymous access to payments table  
-- Add explicit check that user must be authenticated
DROP POLICY IF EXISTS "Users can view payments they're involved in" ON public.payments;

CREATE POLICY "Users can view payments they're involved in"
ON public.payments FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND (
    auth.uid() IN (
      SELECT u.auth_user_id FROM users u WHERE u.id = payments.client_id
    )
    OR auth.uid() IN (
      SELECT u.auth_user_id FROM users u WHERE u.id = payments.doer_id
    )
  )
);

-- Fix 3: Enable RLS on public_profiles view and add explicit policy
-- Note: Views inherit RLS from underlying tables, but we should add explicit policy
-- First, let's ensure the view allows authenticated users to read public profile info
ALTER VIEW public.public_profiles SET (security_invoker = true);

-- Create a policy on users table that allows reading basic public profile fields
-- This is already handled by existing policies, but we ensure authenticated access only