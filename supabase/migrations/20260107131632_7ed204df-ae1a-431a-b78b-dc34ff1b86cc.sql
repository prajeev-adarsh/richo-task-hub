-- Create a trigger function to notify doer when task is cancelled
CREATE OR REPLACE FUNCTION public.notify_task_cancellation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  client_name TEXT;
BEGIN
  -- Only trigger when status changes to 'cancelled' and there's an assigned doer
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' AND NEW.doer_id IS NOT NULL THEN
    -- Get client name
    SELECT name INTO client_name
    FROM users
    WHERE id = NEW.client_id;
    
    -- Notify the doer about the cancellation
    PERFORM create_notification(
      NEW.doer_id,
      'task_assigned'::notification_type, -- Using existing type for task-related notifications
      'Task Cancelled',
      client_name || ' cancelled the task "' || NEW.title || '"',
      jsonb_build_object('task_id', NEW.id, 'cancelled', true)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_notify_task_cancellation ON tasks;
CREATE TRIGGER trigger_notify_task_cancellation
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_cancellation();

-- Revoke public access to create_notification function
-- This ensures only triggers (which run as SECURITY DEFINER) can call it
REVOKE EXECUTE ON FUNCTION create_notification(uuid, notification_type, text, text, jsonb) FROM authenticated, anon, public;