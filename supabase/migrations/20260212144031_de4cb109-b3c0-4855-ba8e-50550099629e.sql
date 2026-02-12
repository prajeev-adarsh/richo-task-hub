-- Fix the notify_task_status_change trigger that uses invalid enum value 'task_status_changed'
-- Replace with 'task_assigned' which is a valid notification_type enum value

CREATE OR REPLACE FUNCTION public.notify_task_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_title TEXT;
  client_name TEXT;
BEGIN
  -- Only trigger when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT title INTO task_title FROM tasks WHERE id = NEW.id;
    SELECT u.name INTO client_name FROM users u WHERE u.id = NEW.client_id;
    
    -- Notify doer if assigned (use 'task_assigned' as the closest valid type)
    IF NEW.doer_id IS NOT NULL THEN
      PERFORM create_notification(
        NEW.doer_id,
        'task_assigned',
        'Task Status Updated',
        'Task "' || task_title || '" status changed to ' || NEW.status,
        jsonb_build_object('task_id', NEW.id, 'new_status', NEW.status)
      );
    END IF;
    
    -- Notify client (use 'task_assigned' as the closest valid type)
    PERFORM create_notification(
      NEW.client_id,
      'task_assigned',
      'Task Status Updated',
      'Your task "' || task_title || '" status changed to ' || NEW.status,
      jsonb_build_object('task_id', NEW.id, 'new_status', NEW.status)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;