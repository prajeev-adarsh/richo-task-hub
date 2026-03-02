
-- Drop if exists to avoid conflicts
DROP TRIGGER IF EXISTS on_user_created_add_role ON public.users;
DROP TRIGGER IF EXISTS check_task_rate_limit_trigger ON public.tasks;
DROP TRIGGER IF EXISTS check_comment_rate_limit_trigger ON public.task_comments;
DROP TRIGGER IF EXISTS on_new_application ON public.task_applications;
DROP TRIGGER IF EXISTS on_application_status_change ON public.task_applications;
DROP TRIGGER IF EXISTS on_task_assignment ON public.tasks;
DROP TRIGGER IF EXISTS on_task_cancellation ON public.tasks;
DROP TRIGGER IF EXISTS on_task_status_change ON public.tasks;
DROP TRIGGER IF EXISTS on_proof_submission ON public.proof_submissions;
DROP TRIGGER IF EXISTS on_new_comment ON public.task_comments;
DROP TRIGGER IF EXISTS on_new_message ON public.messages;
DROP TRIGGER IF EXISTS on_new_task_posted ON public.tasks;
DROP TRIGGER IF EXISTS on_rating_received ON public.ratings;
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;

-- 1. AUTO ROLE CREATION
CREATE TRIGGER on_user_created_add_role
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- 2. RATE LIMITING
CREATE TRIGGER check_task_rate_limit_trigger
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.check_task_rate_limit();

CREATE TRIGGER check_comment_rate_limit_trigger
  BEFORE INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.check_comment_rate_limit();

-- 3. NOTIFICATIONS
CREATE TRIGGER on_new_application
  AFTER INSERT ON public.task_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_application();

CREATE TRIGGER on_application_status_change
  AFTER UPDATE ON public.task_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_application_status_change();

CREATE TRIGGER on_task_assignment
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assignment();

CREATE TRIGGER on_task_cancellation
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_cancellation();

CREATE TRIGGER on_task_status_change
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_status_change();

CREATE TRIGGER on_proof_submission
  AFTER INSERT ON public.proof_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_proof_submission();

CREATE TRIGGER on_new_comment
  AFTER INSERT ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_comment();

CREATE TRIGGER on_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_new_message();

CREATE TRIGGER on_new_task_posted
  AFTER INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_matching_doers();

CREATE TRIGGER on_rating_received
  AFTER INSERT ON public.ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_rating_received();

CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
