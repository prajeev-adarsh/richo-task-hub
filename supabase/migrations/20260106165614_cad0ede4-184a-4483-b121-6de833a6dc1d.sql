-- Create function to notify doers when application status changes
CREATE OR REPLACE FUNCTION public.notify_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  task_title TEXT;
  client_name TEXT;
  notification_type notification_type;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only trigger when status changes from pending to accepted or rejected
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    -- Get task details
    SELECT t.title INTO task_title
    FROM tasks t
    WHERE t.id = NEW.task_id;
    
    -- Get client name
    SELECT u.name INTO client_name
    FROM tasks t
    JOIN users u ON u.id = t.client_id
    WHERE t.id = NEW.task_id;
    
    -- Set notification details based on status
    IF NEW.status = 'accepted' THEN
      notification_type := 'application_accepted';
      notification_title := 'Application Accepted! 🎉';
      notification_message := client_name || ' accepted your application for "' || task_title || '"';
    ELSE
      notification_type := 'application_rejected';
      notification_title := 'Application Update';
      notification_message := 'Your application for "' || task_title || '" was not selected';
    END IF;
    
    -- Create notification for the doer
    PERFORM create_notification(
      NEW.doer_id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object('task_id', NEW.task_id, 'application_id', NEW.id, 'status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for application status changes
DROP TRIGGER IF EXISTS trigger_notify_application_status_change ON task_applications;
CREATE TRIGGER trigger_notify_application_status_change
  AFTER UPDATE ON task_applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();