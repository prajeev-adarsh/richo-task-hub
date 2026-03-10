-- Fix: Restrict admin_audit_log INSERT to only admin users or service role
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

CREATE POLICY "Only admins and system can insert audit logs"
ON public.admin_audit_log FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::user_role)
  OR ((auth.jwt() ->> 'role') = 'service_role')
);