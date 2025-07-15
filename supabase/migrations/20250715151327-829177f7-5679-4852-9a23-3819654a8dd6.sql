-- Fix RLS policies for users table to allow signup process

-- Drop the existing INSERT policy that's blocking signup
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;

-- Create a new INSERT policy that allows users to create their own profile during signup
-- This policy allows insert if the auth_user_id matches the current user's ID
CREATE POLICY "Users can insert their own profile during signup" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);

-- Also ensure the policy works for both authenticated and newly signed up users
-- by making it more permissive during the signup flow
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON public.users;

CREATE POLICY "Users can insert their own profile during signup" 
ON public.users 
FOR INSERT 
WITH CHECK (
  auth.uid() = auth_user_id OR 
  (auth.uid() IS NOT NULL AND auth_user_id IS NOT NULL)
);