-- 1. Revoke SELECT from anon on all public tables/views (no policy allows anon anyway)
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT c.relname FROM pg_class c
    WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','v','m','f')
  LOOP
    EXECUTE format('REVOKE SELECT, INSERT, UPDATE, DELETE ON public.%I FROM anon', r.relname);
  END LOOP;
END $$;

-- 2. Revoke EXECUTE on internal trigger/helper functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.check_task_rate_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.check_comment_rate_limit() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_application_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_application() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_matching_doers() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_task_cancellation() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_proof_submission() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_comment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_new_message() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_payment_released() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_rating_received() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_task_assignment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_task_status_change() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, notification_type, text, text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sanitize_notification_text(text) FROM anon, authenticated, public;

-- Also revoke anon execute on RPCs that require authentication; keep authenticated
REVOKE EXECUTE ON FUNCTION public.get_public_profile(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_doer_profile(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_experts(text, text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.release_payment(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.soft_delete_user(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.send_contact_message(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.switch_user_role(user_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_roles(uuid) FROM anon, public;

-- 3. Drop the broad portfolio listing policy (public URLs still work for public buckets)
DROP POLICY IF EXISTS "Anyone can view portfolio images" ON storage.objects;

-- Add a narrower policy: authenticated users can list portfolio files only inside their own folder
CREATE POLICY "Users can list their own portfolio folder"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'portfolio' AND (auth.uid())::text = (storage.foldername(name))[1]);