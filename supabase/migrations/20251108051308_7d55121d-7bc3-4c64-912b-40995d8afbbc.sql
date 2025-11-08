-- Restrict public access to business data - require authentication for viewing

-- Update tasks table SELECT policy
DROP POLICY IF EXISTS "Users can view all tasks" ON public.tasks;
CREATE POLICY "Authenticated users can view tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update task_applications table SELECT policy
DROP POLICY IF EXISTS "Users can view all task applications" ON public.task_applications;
CREATE POLICY "Authenticated users can view applications" 
ON public.task_applications 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update ratings table SELECT policy
DROP POLICY IF EXISTS "Users can view all ratings" ON public.ratings;
CREATE POLICY "Authenticated users can view ratings" 
ON public.ratings 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Update proof_submissions table SELECT policy
DROP POLICY IF EXISTS "Users can view all proof submissions" ON public.proof_submissions;
CREATE POLICY "Authenticated users can view proofs" 
ON public.proof_submissions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);