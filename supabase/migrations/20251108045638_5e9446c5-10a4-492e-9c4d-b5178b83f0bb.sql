-- Fix critical RLS security issues

-- 1. Block anonymous access to users table (requires authentication to view)
CREATE POLICY "Require authentication to view users" 
ON public.users 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Drop the overly permissive payment update policy
DROP POLICY IF EXISTS "System can update payment status" ON public.payments;

-- 3. Create admin-only payment update policy
CREATE POLICY "Only admins can update payments" 
ON public.payments 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::user_role));

-- 4. Allow edge functions with service role to update payments
CREATE POLICY "Service role can update payments" 
ON public.payments 
FOR UPDATE 
USING (auth.jwt()->>'role' = 'service_role');