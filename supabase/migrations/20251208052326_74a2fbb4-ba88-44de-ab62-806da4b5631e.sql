-- Fix 1: Remove legacy storage policy for proofs bucket
DROP POLICY IF EXISTS "Anyone can view proof files" ON storage.objects;

-- Fix 2: Restrict task_applications SELECT to task owner and applicant only
DROP POLICY IF EXISTS "Authenticated users can view applications" ON public.task_applications;

CREATE POLICY "Task owners and applicants can view applications"
ON public.task_applications FOR SELECT
USING (
  -- Applicant can see their own applications
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u 
    WHERE u.id = task_applications.doer_id
  )
  OR
  -- Task owner can see applications to their tasks
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN tasks t ON t.client_id = u.id
    WHERE t.id = task_applications.task_id
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);

-- Fix 3: Restrict proof_submissions SELECT to task participants only
DROP POLICY IF EXISTS "Authenticated users can view proofs" ON public.proof_submissions;

CREATE POLICY "Task participants can view proof submissions"
ON public.proof_submissions FOR SELECT
USING (
  auth.uid() IN (
    SELECT u.auth_user_id FROM users u
    JOIN tasks t ON (t.client_id = u.id OR t.doer_id = u.id)
    WHERE t.id = proof_submissions.task_id
  )
  OR has_role(auth.uid(), 'admin'::user_role)
);