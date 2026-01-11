-- Add a helper function to sanitize text for notification messages
-- This removes HTML tags and encodes special characters for defense-in-depth

CREATE OR REPLACE FUNCTION public.sanitize_notification_text(p_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
BEGIN
  IF p_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Remove HTML tags
  -- Encode HTML special characters: < > & " '
  -- Remove control characters
  RETURN REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(p_text, '<[^>]*>', '', 'g'),  -- Remove HTML tags
            '&', '&amp;', 'g'),  -- Encode ampersand
          '<', '&lt;', 'g'),  -- Encode less than
        '>', '&gt;', 'g'),  -- Encode greater than
      '"', '&quot;', 'g'),  -- Encode double quote
    E'[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F]', '', 'g'  -- Remove control characters
  );
END;
$function$;

-- Update create_notification to sanitize title and message
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid, 
  p_type notification_type, 
  p_title text, 
  p_message text, 
  p_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  notification_id UUID;
  v_safe_title TEXT;
  v_safe_message TEXT;
BEGIN
  -- Sanitize inputs for defense-in-depth
  v_safe_title := sanitize_notification_text(p_title);
  v_safe_message := sanitize_notification_text(p_message);
  
  INSERT INTO notifications (user_id, type, title, message, payload)
  VALUES (p_user_id, p_type, v_safe_title, v_safe_message, p_payload)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$function$;

-- Update notify_new_application to sanitize user-provided content
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  task_title TEXT;
  task_client_id UUID;
  doer_name TEXT;
BEGIN
  -- Get task details
  SELECT sanitize_notification_text(t.title), t.client_id INTO task_title, task_client_id
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get doer name (sanitized)
  SELECT sanitize_notification_text(u.name) INTO doer_name
  FROM users u
  WHERE u.id = NEW.doer_id;
  
  -- Notify client
  PERFORM create_notification(
    task_client_id,
    'application_received',
    'New Application',
    doer_name || ' applied for "' || task_title || '"',
    jsonb_build_object('task_id', NEW.task_id, 'application_id', NEW.id)
  );
  
  RETURN NEW;
END;
$function$;

-- Update notify_matching_doers to sanitize user-provided content
CREATE OR REPLACE FUNCTION public.notify_matching_doers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matching_doer RECORD;
  client_name TEXT;
  safe_title TEXT;
BEGIN
  -- Get client name (sanitized)
  SELECT sanitize_notification_text(name) INTO client_name FROM users WHERE id = NEW.client_id;
  
  -- Sanitize task title
  safe_title := sanitize_notification_text(NEW.title);
  
  -- Find doers with matching skills (by category)
  FOR matching_doer IN
    SELECT DISTINCT ds.user_id
    FROM doer_skills ds
    JOIN users u ON u.id = ds.user_id
    WHERE ds.category = NEW.category
    AND u.id != NEW.client_id
    AND (
      NEW.is_remote = true 
      OR NEW.location ILIKE '%' || COALESCE(u.phone, '') || '%'
      OR true -- For now, notify all matching doers regardless of location
    )
  LOOP
    PERFORM create_notification(
      matching_doer.user_id,
      'new_task_posted',
      'New Task Matching Your Skills',
      client_name || ' posted "' || safe_title || '" - ₹' || NEW.budget,
      jsonb_build_object('task_id', NEW.id)
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Update notify_application_status_change to sanitize content
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
    -- Get task details (sanitized)
    SELECT sanitize_notification_text(t.title) INTO task_title
    FROM tasks t
    WHERE t.id = NEW.task_id;
    
    -- Get client name (sanitized)
    SELECT sanitize_notification_text(u.name) INTO client_name
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

-- Update notify_task_cancellation to sanitize content
CREATE OR REPLACE FUNCTION public.notify_task_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_name TEXT;
  safe_title TEXT;
BEGIN
  -- Only trigger when status changes to 'cancelled' and there's an assigned doer
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' AND NEW.doer_id IS NOT NULL THEN
    -- Get client name (sanitized)
    SELECT sanitize_notification_text(name) INTO client_name
    FROM users
    WHERE id = NEW.client_id;
    
    -- Sanitize task title
    safe_title := sanitize_notification_text(NEW.title);
    
    -- Notify the doer about the cancellation
    PERFORM create_notification(
      NEW.doer_id,
      'task_assigned'::notification_type,
      'Task Cancelled',
      client_name || ' cancelled the task "' || safe_title || '"',
      jsonb_build_object('task_id', NEW.id, 'cancelled', true)
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Update notify_proof_submission to sanitize content
CREATE OR REPLACE FUNCTION public.notify_proof_submission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  task_title TEXT;
  task_client_id UUID;
  doer_name TEXT;
BEGIN
  -- Get task details (sanitized)
  SELECT sanitize_notification_text(t.title), t.client_id INTO task_title, task_client_id
  FROM tasks t
  WHERE t.id = NEW.task_id;
  
  -- Get doer name (sanitized)
  SELECT sanitize_notification_text(u.name) INTO doer_name
  FROM users u
  WHERE u.id = NEW.doer_id;
  
  -- Notify client
  PERFORM create_notification(
    task_client_id,
    'proof_submitted',
    'Proof Submitted',
    doer_name || ' submitted proof for "' || task_title || '"',
    jsonb_build_object('task_id', NEW.task_id, 'proof_id', NEW.id)
  );
  
  RETURN NEW;
END;
$function$;

-- Add comment for documentation
COMMENT ON FUNCTION public.sanitize_notification_text IS 'Sanitizes user-provided text for notification messages by removing HTML tags, encoding special characters, and stripping control characters';