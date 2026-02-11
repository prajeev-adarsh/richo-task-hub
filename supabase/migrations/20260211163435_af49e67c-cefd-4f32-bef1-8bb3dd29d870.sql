
-- Recreate users_public view with security_invoker=on instead of security_definer
DROP VIEW IF EXISTS public.users_public;

CREATE VIEW public.users_public
WITH (security_invoker=on) AS
  SELECT id, name, photo_url, active_role, onboarding_completed, created_at
  FROM public.users
  WHERE deleted_at IS NULL;
