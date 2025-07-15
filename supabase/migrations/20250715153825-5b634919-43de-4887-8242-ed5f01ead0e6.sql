-- Fix RLS policies for users table to allow signup process properly
-- The current policy is too restrictive as auth.uid() is not available during signup

-- Drop the existing INSERT policy that's blocking signup
DROP POLICY IF EXISTS "Users can insert their own profile during signup" ON public.users;

-- Create a new INSERT policy that allows users to create their profile during signup
-- This policy allows insert when auth_user_id is a valid UUID that doesn't already exist
CREATE POLICY "Allow profile creation during signup" 
ON public.users 
FOR INSERT 
WITH CHECK (
  auth_user_id IS NOT NULL AND
  NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE auth_user_id = NEW.auth_user_id
  )
);

-- Also add a policy to allow insertion when the user is authenticated and inserting their own profile
CREATE POLICY "Authenticated users can insert their own profile" 
ON public.users 
FOR INSERT 
WITH CHECK (auth.uid() = auth_user_id);