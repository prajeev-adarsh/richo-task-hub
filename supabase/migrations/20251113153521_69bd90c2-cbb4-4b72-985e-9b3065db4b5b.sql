-- Create trigger for new task applications
DROP TRIGGER IF EXISTS trigger_notify_new_application ON task_applications;
CREATE TRIGGER trigger_notify_new_application
  AFTER INSERT ON task_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_application();

-- Create trigger for task assignments
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON tasks;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- Create trigger for proof submissions
DROP TRIGGER IF EXISTS trigger_notify_proof_submission ON proof_submissions;
CREATE TRIGGER trigger_notify_proof_submission
  AFTER INSERT ON proof_submissions
  FOR EACH ROW
  EXECUTE FUNCTION notify_proof_submission();

-- Create trigger for new messages
DROP TRIGGER IF EXISTS trigger_notify_new_message ON messages;
CREATE TRIGGER trigger_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

-- Create trigger for new comments
DROP TRIGGER IF EXISTS trigger_notify_new_comment ON task_comments;
CREATE TRIGGER trigger_notify_new_comment
  AFTER INSERT ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_comment();

-- Create trigger for payment releases
DROP TRIGGER IF EXISTS trigger_notify_payment_released ON payments;
CREATE TRIGGER trigger_notify_payment_released
  AFTER UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION notify_payment_released();

-- Create trigger for ratings received
DROP TRIGGER IF EXISTS trigger_notify_rating_received ON ratings;
CREATE TRIGGER trigger_notify_rating_received
  AFTER INSERT ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_rating_received();

-- Create function for task status changes
CREATE OR REPLACE FUNCTION notify_task_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  task_title TEXT;
  client_name TEXT;
BEGIN
  -- Only trigger when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO task_title FROM tasks WHERE id = NEW.id;
    SELECT u.name INTO client_name FROM users u WHERE u.id = NEW.client_id;
    
    -- Notify doer if assigned
    IF NEW.doer_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.doer_id,
        'task_status_changed',
        'Task Status Updated',
        'Task "' || task_title || '" status changed to ' || NEW.status,
        jsonb_build_object('task_id', NEW.id, 'new_status', NEW.status)
      );
    END IF;
    
    -- Notify client
    PERFORM create_notification(
      NEW.client_id,
      'task_status_changed',
      'Task Status Updated',
      'Your task "' || task_title || '" status changed to ' || NEW.status,
      jsonb_build_object('task_id', NEW.id, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for task status changes
DROP TRIGGER IF EXISTS trigger_notify_task_status_change ON tasks;
CREATE TRIGGER trigger_notify_task_status_change
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_status_change();