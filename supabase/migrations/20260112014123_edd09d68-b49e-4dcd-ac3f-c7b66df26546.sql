-- Add availability column to users table for expert availability
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS availability text CHECK (availability IN ('full_time', 'part_time', 'weekends', 'flexible'));

-- Add bio column if not exists for expert profile
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS bio text;

-- Add hourly_rate column for experts
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hourly_rate integer;