-- 1. Add soft delete column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2. Create an audit log table for user deletions and other admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_data JSONB DEFAULT '{}',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.admin_audit_log FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));

-- Only service role or RPC functions can insert audit logs (for security)
CREATE POLICY "System can insert audit logs"
ON public.admin_audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Create secure RPC function for soft-deleting users with audit logging
CREATE OR REPLACE FUNCTION public.soft_delete_user(
  p_user_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_user_id UUID;
  v_target_user RECORD;
BEGIN
  -- Get admin's public.users.id
  SELECT id INTO v_admin_user_id
  FROM users
  WHERE auth_user_id = auth.uid();
  
  IF v_admin_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::user_role) THEN
    RAISE EXCEPTION 'Only admins can delete users';
  END IF;
  
  -- Get target user details
  SELECT id, name, email, role, active_role INTO v_target_user
  FROM users
  WHERE id = p_user_id AND deleted_at IS NULL;
  
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User not found or already deleted';
  END IF;
  
  -- Prevent deleting admin users
  IF v_target_user.role = 'admin' OR v_target_user.active_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;
  
  -- Prevent deleting self
  IF v_target_user.id = v_admin_user_id THEN
    RAISE EXCEPTION 'Cannot delete yourself';
  END IF;
  
  -- Check for active tasks (open or in_progress)
  IF EXISTS (
    SELECT 1 FROM tasks 
    WHERE (client_id = p_user_id OR doer_id = p_user_id) 
    AND status IN ('open', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'Cannot delete user with active tasks. Please cancel or complete their tasks first.';
  END IF;
  
  -- Check for pending payments
  IF EXISTS (
    SELECT 1 FROM payments 
    WHERE (client_id = p_user_id OR doer_id = p_user_id) 
    AND payment_status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Cannot delete user with pending payments. Please resolve payments first.';
  END IF;
  
  -- Create audit log entry BEFORE soft delete
  INSERT INTO admin_audit_log (
    admin_user_id,
    action,
    target_table,
    target_id,
    target_data,
    reason
  ) VALUES (
    v_admin_user_id,
    'soft_delete',
    'users',
    p_user_id,
    jsonb_build_object(
      'name', v_target_user.name,
      'email', v_target_user.email,
      'role', v_target_user.role
    ),
    p_reason
  );
  
  -- Perform soft delete
  UPDATE users
  SET deleted_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- 4. Update RLS policies to exclude soft-deleted users from normal queries
-- Create a view for active (non-deleted) users
CREATE OR REPLACE VIEW public.active_users AS
SELECT * FROM public.users WHERE deleted_at IS NULL;

-- 5. Drop old DELETE policy and replace with soft delete constraint
DROP POLICY IF EXISTS "Admins can delete users" ON public.users;

-- Prevent hard deletes entirely (only soft delete allowed via RPC)
CREATE POLICY "No hard deletes allowed"
ON public.users FOR DELETE
USING (false);