-- Revert security_invoker on users_public view - it should bypass RLS since it only exposes safe columns
ALTER VIEW public.users_public SET (security_invoker = off);