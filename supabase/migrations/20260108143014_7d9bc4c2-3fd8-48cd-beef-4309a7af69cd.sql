-- 1. Make proofs bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'proofs';

-- 2. Drop the overly permissive public access policy for proofs
DROP POLICY IF EXISTS "Anyone can view proof files" ON storage.objects;

-- 3. Create restrictive policy for proofs - only task participants can view
CREATE POLICY "Task participants can view proof files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'proofs' AND
  auth.uid() IS NOT NULL AND
  (
    -- User who uploaded the file (folder structure: user_id/...)
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Client or doer of the related task (extracts task_id from path)
    EXISTS (
      SELECT 1 FROM tasks t
      JOIN users u ON (u.id = t.client_id OR u.id = t.doer_id)
      WHERE u.auth_user_id = auth.uid()
      AND (
        name LIKE '%' || t.id::text || '%'
        OR name LIKE 'payments/%' || t.id::text || '%'
      )
    )
    OR
    -- Admins can view all proofs
    has_role(auth.uid(), 'admin'::user_role)
  )
);

-- 4. Create RPC function for secure payment release with validation
CREATE OR REPLACE FUNCTION public.release_payment(
  p_task_id UUID,
  p_payment_proof_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task RECORD;
  v_user_id UUID;
  v_payment_id UUID;
  v_proof_accepted BOOLEAN;
BEGIN
  -- Get the authenticated user's public.users.id
  SELECT id INTO v_user_id
  FROM users
  WHERE auth_user_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated or not found';
  END IF;

  -- Get task details with lock to prevent race conditions
  SELECT t.id, t.client_id, t.doer_id, t.status, t.budget, t.proof_required, t.payment_status
  INTO v_task
  FROM tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;
  
  IF v_task IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;
  
  -- Validate client ownership
  IF v_task.client_id != v_user_id THEN
    RAISE EXCEPTION 'Only the task client can release payment';
  END IF;
  
  -- Check if task is completed
  IF v_task.status != 'completed' THEN
    RAISE EXCEPTION 'Payment can only be released for completed tasks. Current status: %', v_task.status;
  END IF;
  
  -- Check if doer is assigned
  IF v_task.doer_id IS NULL THEN
    RAISE EXCEPTION 'No doer assigned to this task';
  END IF;
  
  -- Check if payment already exists for this task
  IF EXISTS (SELECT 1 FROM payments WHERE task_id = p_task_id AND payment_status = 'paid') THEN
    RAISE EXCEPTION 'Payment has already been released for this task';
  END IF;
  
  -- Check if proof is required and accepted
  IF v_task.proof_required THEN
    SELECT EXISTS (
      SELECT 1 FROM proof_submissions 
      WHERE task_id = p_task_id 
      AND doer_id = v_task.doer_id 
      AND status = 'accepted'
    ) INTO v_proof_accepted;
    
    IF NOT v_proof_accepted THEN
      RAISE EXCEPTION 'Proof of completion must be accepted before releasing payment';
    END IF;
  END IF;
  
  -- Insert payment record
  INSERT INTO payments (
    task_id,
    client_id,
    doer_id,
    amount,
    payment_mode,
    payment_status,
    uploaded_proof
  ) VALUES (
    p_task_id,
    v_user_id,
    v_task.doer_id,
    v_task.budget,
    'upi_manual',
    'paid',
    p_payment_proof_url
  )
  RETURNING id INTO v_payment_id;
  
  -- Update task payment status
  UPDATE tasks 
  SET payment_status = 'paid' 
  WHERE id = p_task_id;
  
  RETURN v_payment_id;
END;
$$;

-- 5. Add RLS policy for payments INSERT that validates task completion
-- First drop existing permissive policy
DROP POLICY IF EXISTS "Clients can create payments for their tasks" ON payments;

-- Create new restrictive policy that requires task completion
CREATE POLICY "Clients can create payments for completed tasks only"
ON payments
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT u.auth_user_id
    FROM users u
    WHERE u.id = payments.client_id
  )
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = payments.task_id
    AND t.status = 'completed'
  )
);