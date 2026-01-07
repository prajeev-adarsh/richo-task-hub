-- Fix remaining security issues with proper DROP IF EXISTS

-- ============================================
-- FIX 1: Users table - Remove relationship-based PII exposure
-- ============================================

-- Drop the overly permissive relationship policy that exposes full user data
DROP POLICY IF EXISTS "Authenticated users can view public user data via relationships" ON public.users;

-- Drop duplicate policies that may have been partially created
DROP POLICY IF EXISTS "Users can view own full profile" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

-- Create single policy for own profile access
CREATE POLICY "Users can view their own full profile"
ON public.users
FOR SELECT
USING (auth.uid() = auth_user_id);

-- Admins policy already exists, so we don't recreate it

-- ============================================
-- FIX 2: Payments table - Tighten to task-specific access only
-- ============================================

-- Drop the existing overly broad policy
DROP POLICY IF EXISTS "Users can view payments they're involved in" ON public.payments;

-- Create strict policy - users can only see payments where they are directly involved
-- in THIS SPECIFIC payment record (not all payments across all tasks)
CREATE POLICY "Users can view their specific payments"
ON public.payments
FOR SELECT
USING (
  -- Get the current user's ID and check direct involvement in this payment
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid() 
    AND (u.id = payments.client_id OR u.id = payments.doer_id)
  )
  OR
  -- Admins can view all
  has_role(auth.uid(), 'admin'::user_role)
);